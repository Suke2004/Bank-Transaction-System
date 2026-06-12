const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const accountModel = require("../models/account.model");
const systemConfigModel = require("../models/systemConfig.model");
const pinService = require("../services/pin.service");
const otpService = require("../services/otp.service");
const notificationService = require("../services/notification.service");
const csvExportService = require("../services/csvExport.service");
const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const logAudit = require("../utils/audit");
const logger = require("../utils/logger");
const { paiseToRupees, formatRupees } = require("../utils/currency");

/**
 * Serialise a transaction document for API responses.
 * Converts the internal paise amount back to rupees for the client.
 */
function serializeTransaction(tx) {
  if (!tx) return null;
  const obj = tx.toObject ? tx.toObject() : { ...tx };
  return { ...obj, amount: paiseToRupees(obj.amount) };
}

/**
 * Helper to fetch a system configuration value or fallback to default
 */
const getConfigValue = async (key, fallback) => {
  try {
    const config = await systemConfigModel.findOne({ key });
    return config ? config.value : fallback;
  } catch (err) {
    return fallback;
  }
};

/**
 * POST /api/v1/transaction
 * Processes a transfer from one account to another, protecting with PIN and high-value OTP.
 */
const createTransaction = asyncHandler(async (req, res) => {
  const { fromAccount, toAccount, amount: amountPaise, idempotencyKey, pin, description, otpToken } = req.body;
  const userId = req.user._id;

  // 1. Verify transaction PIN
  const isPinValid = await pinService.verifyPin(userId, pin);
  if (!isPinValid) {
    return res.status(400).json({ message: "Incorrect transaction PIN" });
  }

  // 2. Load accounts and verify existence
  const [fromUserAccount, toUserAccount] = await Promise.all([
    accountModel.findOne({ _id: fromAccount, user: userId }), // sender account must belong to user
    accountModel.findOne({ _id: toAccount }),
  ]);

  if (!fromUserAccount) {
    return res.status(400).json({ message: "Sender account not found or access denied" });
  }
  if (!toUserAccount) {
    return res.status(400).json({ message: "Beneficiary account not found" });
  }

  // Prevent transferring to self account (same ID)
  if (fromAccount.toString() === toAccount.toString()) {
    return res.status(400).json({ message: "Sender and receiver accounts must be different" });
  }

  // 3. Verify accounts status
  if (fromUserAccount.status !== "ACTIVE") {
    return res.status(400).json({ message: "Sender account is not ACTIVE" });
  }
  if (toUserAccount.status !== "ACTIVE") {
    return res.status(400).json({ message: "Recipient account is not ACTIVE" });
  }

  // Check if sender account or receiver account is flagged for fraud
  if (fromUserAccount.isFlaggedFraud || toUserAccount.isFlaggedFraud) {
    return res.status(403).json({ message: "Transaction blocked due to potential security risks" });
  }

  // 4. Check daily transfer limit
  const dailyLimit = fromUserAccount.dailyLimit !== null
    ? fromUserAccount.dailyLimit
    : await getConfigValue("MAX_DAILY_TRANSFER_PAISE", 10000000); // Default ₹1,00,000

  // Calculate user's transfers today from this account
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const todayTransfers = await transactionModel.aggregate([
    {
      $match: {
        fromAccount: fromUserAccount._id,
        status: "COMPLETED",
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      },
    },
    {
      $group: {
        _id: null,
        totalSent: { $sum: "$amount" },
      },
    },
  ]);
  const totalSentToday = todayTransfers[0]?.totalSent || 0;
  if (totalSentToday + amountPaise > dailyLimit) {
    return res.status(400).json({
      message: `Transaction exceeds daily limit of ₹${(dailyLimit / 100).toFixed(2)}. Sent today: ₹${(totalSentToday / 100).toFixed(2)}, requesting: ₹${(amountPaise / 100).toFixed(2)}`,
    });
  }

  // 5. Check high-value OTP verification
  const highValueThreshold = await getConfigValue("HIGH_VALUE_THRESHOLD_PAISE", 1000000); // Default ₹10,000

  if (amountPaise >= highValueThreshold) {
    if (!otpToken) {
      // Send OTP for confirmation
      await otpService.sendOtpEmail(userId, "HIGH_VALUE_TRANSFER");
      return res.status(200).json({
        pendingOtp: true,
        message: "High-value transfer requires OTP verification. An OTP has been sent to your email.",
      });
    }

    // Verify provided OTP
    const isOtpValid = await otpService.verifyOtp(userId, "HIGH_VALUE_TRANSFER", otpToken);
    if (!isOtpValid) {
      return res.status(401).json({ message: "Invalid or expired high-value transfer OTP" });
    }
  }

  // 6. Check sender balance
  const balancePaise = await fromUserAccount.getBalance();
  if (balancePaise < amountPaise) {
    return res.status(400).json({
      message: `Insufficient balance. Current balance is ${formatRupees(balancePaise)}, requested amount is ${formatRupees(amountPaise)}`,
    });
  }

  // 7. Check idempotency
  const existing = await transactionModel.findOne({ idempotencyKey });
  if (existing) {
    if (existing.status === "COMPLETED") {
      return res.status(200).json({
        message: "Transaction already processed",
        transaction: serializeTransaction(existing),
      });
    }
    if (existing.status === "PENDING") {
      return res.status(200).json({ message: "Transaction is still processing" });
    }
    if (existing.status === "FAILED") {
      return res.status(500).json({ message: "Transaction processing failed, please retry" });
    }
  }

  // 8. Execute Double-Entry bookkeeping transaction inside Mongo Session
  let transaction;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    transaction = (
      await transactionModel.create(
        [
          {
            fromAccount,
            toAccount,
            amount: amountPaise,
            idempotencyKey,
            description: description || "",
            status: "PENDING",
          },
        ],
        { session },
      )
    )[0];

    await ledgerModel.create(
      [{ account: fromAccount, amount: amountPaise, transaction: transaction._id, type: "DEBIT" }],
      { session },
    );

    await ledgerModel.create(
      [{ account: toAccount, amount: amountPaise, transaction: transaction._id, type: "CREDIT" }],
      { session },
    );

    await transactionModel.findOneAndUpdate(
      { _id: transaction._id },
      { status: "COMPLETED" },
      { session },
    );

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();

    logger.error("Transaction failed — session aborted", {
      idempotencyKey,
      fromAccount,
      toAccount,
      amountPaise,
      error: error.message,
    });

    if (transaction?._id) {
      await transactionModel
        .findOneAndUpdate({ _id: transaction._id }, { status: "FAILED" })
        .catch((markErr) =>
          logger.error("Failed to mark transaction as FAILED", {
            transactionId: transaction._id,
            error: markErr.message,
          }),
        );
    }

    logAudit(req, "TRANSACTION_FAILED", {
      idempotencyKey,
      fromAccount,
      toAccount,
      amountPaise,
      error: error.message,
    });

    return res.status(500).json({
      message: "Transaction processing failed, please retry after some time",
    });
  } finally {
    session.endSession();
  }

  // 9. Post-commit side effects: log audit + trigger notifications (in-app + emails)
  logAudit(req, "TRANSACTION_COMPLETED", {
    transactionId: transaction._id,
    fromAccount,
    toAccount,
    amountPaise,
  });

  // Notify sender
  notificationService.notifyTransferSent(userId, amountPaise, toAccount, transaction._id).catch((err) => {
    logger.error("Failed to send transfer sent notification", { error: err.message });
  });

  // Notify receiver
  notificationService.notifyTransferReceived(toUserAccount.user, amountPaise, fromAccount, transaction._id).catch((err) => {
    logger.error("Failed to send transfer received notification", { error: err.message });
  });

  return res.status(201).json({
    message: "Transaction completed successfully",
    transaction: serializeTransaction(transaction),
  });
});

/**
 * POST /api/v1/transaction/initial-funds (teller/manager/admin privilege only)
 */
const createInitialFundsTransaction = asyncHandler(async (req, res) => {
  const { toAccount, amount: amountPaise, idempotencyKey } = req.body;

  const toUserAccount = await accountModel.findOne({ _id: toAccount });
  if (!toUserAccount) {
    return res.status(400).json({ message: "Invalid toAccount" });
  }

  // Find system account (e.g. system config or admin's account)
  // For initial funding, we can use a system pool account or simulate from a null fromAccount.
  // In the original, it used fromUserAccount as the logged-in admin's account.
  // Let's check: we can look up an account belonging to the current admin, or if none, create a temporary pool account.
  let fromUserAccount = await accountModel.findOne({ user: req.user._id });
  if (!fromUserAccount) {
    // Proactively create an admin ledger account if not exists
    fromUserAccount = await accountModel.create({
      user: req.user._id,
      nickname: "Bank Reserve Pool",
    });
  }

  const session = await mongoose.startSession();
  let transaction;

  try {
    session.startTransaction();

    transaction = new transactionModel({
      fromAccount: fromUserAccount._id,
      toAccount,
      amount: amountPaise,
      idempotencyKey,
      description: "Initial funding from bank reserve",
      status: "PENDING",
    });

    await ledgerModel.create(
      [{ account: fromUserAccount._id, amount: amountPaise, transaction: transaction._id, type: "DEBIT" }],
      { session },
    );

    await ledgerModel.create(
      [{ account: toAccount, amount: amountPaise, transaction: transaction._id, type: "CREDIT" }],
      { session },
    );

    transaction.status = "COMPLETED";
    await transaction.save({ session });

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();

    logger.error("Initial funds transaction failed — session aborted", {
      idempotencyKey,
      toAccount,
      amountPaise,
      error: error.message,
    });

    if (transaction?._id) {
      await transactionModel
        .findOneAndUpdate({ _id: transaction._id }, { status: "FAILED" })
        .catch((markErr) =>
          logger.error("Failed to mark initial-funds transaction as FAILED", {
            transactionId: transaction._id,
            error: markErr.message,
          }),
        );
    }

    return res.status(500).json({ message: "Initial funds transaction failed, please retry" });
  } finally {
    session.endSession();
  }

  logAudit(req, "INITIAL_FUNDS_ADDED", {
    transactionId: transaction._id,
    toAccount,
    amountPaise,
  });

  // Notify recipient
  notificationService.notifyTransferReceived(toUserAccount.user, amountPaise, fromUserAccount._id, transaction._id).catch((err) => {
    logger.error("Failed to send initial funds received notification", { error: err.message });
  });

  return res.status(201).json({
    message: "Initial funds transaction completed successfully",
    transaction: serializeTransaction(transaction),
  });
});

/**
 * Helper to fetch transactions query with advanced filters
 */
const buildTransactionsQuery = async (userId, queryParams) => {
  const { status, direction, from, to, search } = queryParams;

  const userAccounts = await accountModel.find({ user: userId }).select("_id").lean();
  const accountIds = userAccounts.map((a) => a._id);

  if (accountIds.length === 0) {
    return { filter: null, accountIds: [] };
  }

  let filter = {};

  // 1. Filter by direction (SENT / RECEIVED / BOTH)
  if (direction === "SENT") {
    filter.fromAccount = { $in: accountIds };
  } else if (direction === "RECEIVED") {
    filter.toAccount = { $in: accountIds };
  } else {
    // Both
    filter.$or = [{ fromAccount: { $in: accountIds } }, { toAccount: { $in: accountIds } }];
  }

  // 2. Status filter
  if (status) {
    filter.status = status.toUpperCase();
  }

  // 3. Date range filter
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  // 4. Text search in description
  if (search) {
    filter.description = { $regex: search, $options: "i" };
  }

  return { filter, accountIds };
};

/**
 * GET /api/v1/transaction
 * Returns all transactions for the logged-in user, supporting pagination, status, direction, dates and description search filters.
 */
const getTransactionHistory = asyncHandler(async (req, res) => {
  const { filter } = await buildTransactionsQuery(req.user._id, req.query);

  if (!filter) {
    return res.status(200).json({
      transactions: [],
      pagination: { page: 1, limit: 20, total: 0, pages: 0 },
    });
  }

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    transactionModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "fromAccount", select: "nickname user", populate: { path: "user", select: "name email" } })
      .populate({ path: "toAccount", select: "nickname user", populate: { path: "user", select: "name email" } })
      .lean(),
    transactionModel.countDocuments(filter),
  ]);

  const serialized = transactions.map((tx) => ({
    ...tx,
    amount: paiseToRupees(tx.amount),
  }));

  res.status(200).json({
    transactions: serialized,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * GET /api/v1/transaction/export/csv
 * Exports the filtered transaction history as a CSV file
 */
const exportTransactionsCsv = asyncHandler(async (req, res) => {
  const { filter } = await buildTransactionsQuery(req.user._id, req.query);

  if (!filter) {
    return res.status(400).send("No accounts found for this user");
  }

  const transactions = await transactionModel
    .find(filter)
    .sort({ createdAt: -1 })
    .populate({ path: "fromAccount", populate: { path: "user", select: "name" } })
    .populate({ path: "toAccount", populate: { path: "user", select: "name" } });

  const csvData = await csvExportService.exportTransactionsCsv(transactions);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=transactions-${Date.now()}.csv`);
  res.status(200).send(csvData);
});

/**
 * GET /api/v1/transaction/:id
 */
const getTransactionById = asyncHandler(async (req, res) => {
  const userAccounts = await accountModel.find({ user: req.user._id }).select("_id").lean();
  const accountIds = userAccounts.map((a) => a._id);

  const transaction = await transactionModel
    .findOne({
      _id: req.params.id,
      $or: [{ fromAccount: { $in: accountIds } }, { toAccount: { $in: accountIds } }],
    })
    .populate({ path: "fromAccount", populate: { path: "user", select: "name email" } })
    .populate({ path: "toAccount", populate: { path: "user", select: "name email" } });

  if (!transaction) {
    return res.status(404).json({ message: "Transaction not found" });
  }

  res.status(200).json({ transaction: serializeTransaction(transaction) });
});

module.exports = {
  createTransaction,
  createInitialFundsTransaction,
  getTransactionHistory,
  exportTransactionsCsv,
  getTransactionById,
};
