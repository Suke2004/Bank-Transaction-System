const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const accountModel = require("../models/account.model");
const emailService = require("../services/email.service");
const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const logAudit = require("../utils/audit");
const logger = require("../utils/logger");
const { rupeesToPaise, paiseToRupees, formatRupees } = require("../utils/currency");

/* ─────────────────────────────────────────────────────────────────────────
   INTERNAL HELPERS
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Serialise a transaction document for API responses.
 * Converts the internal paise amount back to rupees for the client.
 */
function serializeTransaction(tx) {
  if (!tx) return null;
  const obj = tx.toObject ? tx.toObject() : { ...tx };
  return { ...obj, amount: paiseToRupees(obj.amount) };
}

/* ─────────────────────────────────────────────────────────────────────────
   CREATE TRANSACTION
   THE 10-STEP TRANSFER FLOW:
     1. Validate request           ← validate.middleware.js (rupees → paise conversion there)
     2. Validate idempotency key
     3. Check account status
     4. Derive sender balance from ledger (paise)
     5. Create transaction (PENDING) — amount stored in paise
     6. Create DEBIT ledger entry (paise)
     7. Create CREDIT ledger entry (paise)
     8. Mark transaction COMPLETED
     9. Commit MongoDB session
     10. Send email + audit log (fire-and-forget)
   ───────────────────────────────────────────────────────────────────────── */

const createTransaction = asyncHandler(async (req, res) => {
  // amount arrives as paise (validate.middleware converts rupees → paise)
  const { fromAccount, toAccount, amount: amountPaise, idempotencyKey } = req.body;

  const [fromUserAccount, toUserAccount] = await Promise.all([
    accountModel.findOne({ _id: fromAccount }),
    accountModel.findOne({ _id: toAccount }),
  ]);

  if (!fromUserAccount || !toUserAccount) {
    return res.status(400).json({ message: "Invalid fromAccount or toAccount" });
  }

  /**
   * 2. Validate idempotency key
   */
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
    if (existing.status === "REVERSED") {
      return res.status(500).json({ message: "Transaction was reversed, please retry" });
    }
  }

  /**
   * 3. Check account status
   */
  if (fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE") {
    return res.status(400).json({
      message: "Both fromAccount and toAccount must be ACTIVE to process transaction",
    });
  }

  /**
   * 4. Derive sender balance (returned in paise from getBalance())
   */
  const balancePaise = await fromUserAccount.getBalance();

  if (balancePaise < amountPaise) {
    return res.status(400).json({
      message: `Insufficient balance. Current balance is ${formatRupees(balancePaise)}, requested amount is ${formatRupees(amountPaise)}`,
    });
  }

  let transaction;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    /**
     * 5–8. DB operations within the ACID session
     */
    transaction = (
      await transactionModel.create(
        [{ fromAccount, toAccount, amount: amountPaise, idempotencyKey, status: "PENDING" }],
        { session }
      )
    )[0];

    await ledgerModel.create(
      [{ account: fromAccount, amount: amountPaise, transaction: transaction._id, type: "DEBIT" }],
      { session }
    );

    await ledgerModel.create(
      [{ account: toAccount, amount: amountPaise, transaction: transaction._id, type: "CREDIT" }],
      { session }
    );

    await transactionModel.findOneAndUpdate(
      { _id: transaction._id },
      { status: "COMPLETED" },
      { session }
    );

    /**
     * 9. Commit
     */
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
          })
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

  /**
   * 10. Post-commit side effects (fire-and-forget)
   */
  logAudit(req, "TRANSACTION_COMPLETED", {
    transactionId: transaction._id,
    fromAccount,
    toAccount,
    amountPaise,
  });

  emailService
    .sendTransactionEmail(
      req.user.email,
      req.user.name,
      formatRupees(amountPaise),
      toAccount
    )
    .catch((err) => {
      logger.error("Failed to send transaction email", {
        userId: req.user._id,
        transactionId: transaction._id,
        error: err.message,
      });
    });

  return res.status(201).json({
    message: "Transaction completed successfully",
    transaction: serializeTransaction(transaction),
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   INITIAL FUNDS (SYSTEM USER)
   ───────────────────────────────────────────────────────────────────────── */

const createInitialFundsTransaction = asyncHandler(async (req, res) => {
  const { toAccount, amount: amountPaise, idempotencyKey } = req.body;

  const [toUserAccount, fromUserAccount] = await Promise.all([
    accountModel.findOne({ _id: toAccount }),
    accountModel.findOne({ user: req.user._id }),
  ]);

  if (!toUserAccount) {
    return res.status(400).json({ message: "Invalid toAccount" });
  }
  if (!fromUserAccount) {
    return res.status(400).json({ message: "System user account not found" });
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
      status: "PENDING",
    });

    await ledgerModel.create(
      [{ account: fromUserAccount._id, amount: amountPaise, transaction: transaction._id, type: "DEBIT" }],
      { session }
    );

    await ledgerModel.create(
      [{ account: toAccount, amount: amountPaise, transaction: transaction._id, type: "CREDIT" }],
      { session }
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
          })
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

  return res.status(201).json({
    message: "Initial funds transaction completed successfully",
    transaction: serializeTransaction(transaction),
  });
});

/* ─────────────────────────────────────────────────────────────────────────
   TRANSACTION HISTORY
   ───────────────────────────────────────────────────────────────────────── */

/**
 * GET /api/v1/transaction
 * Returns all transactions where any of the user's accounts were sender or receiver.
 * Supports pagination (?page, ?limit) and status filter (?status).
 */
const getTransactionHistory = asyncHandler(async (req, res) => {
  // Get all accounts belonging to this user
  const userAccounts = await accountModel
    .find({ user: req.user._id })
    .select("_id")
    .lean();

  const accountIds = userAccounts.map((a) => a._id);

  if (accountIds.length === 0) {
    return res.status(200).json({
      transactions: [],
      pagination: { page: 1, limit: 20, total: 0, pages: 0 },
    });
  }

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const skip = (page - 1) * limit;

  // Optional status filter
  const filter = {
    $or: [{ fromAccount: { $in: accountIds } }, { toAccount: { $in: accountIds } }],
  };
  if (req.query.status) {
    filter.status = req.query.status.toUpperCase();
  }

  const [transactions, total] = await Promise.all([
    transactionModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("fromAccount", "currency status")
      .populate("toAccount", "currency status")
      .lean(),
    transactionModel.countDocuments(filter),
  ]);

  // Convert paise → rupees for all transactions in the response
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
 * GET /api/v1/transaction/:id
 * Returns a single transaction, but only if one of the user's accounts is involved.
 */
const getTransactionById = asyncHandler(async (req, res) => {
  const userAccounts = await accountModel
    .find({ user: req.user._id })
    .select("_id")
    .lean();

  const accountIds = userAccounts.map((a) => a._id);

  const transaction = await transactionModel
    .findOne({
      _id: req.params.id,
      $or: [
        { fromAccount: { $in: accountIds } },
        { toAccount: { $in: accountIds } },
      ],
    })
    .populate("fromAccount", "currency status")
    .populate("toAccount", "currency status");

  if (!transaction) {
    return res.status(404).json({ message: "Transaction not found" });
  }

  res.status(200).json({ transaction: serializeTransaction(transaction) });
});

module.exports = {
  createTransaction,
  createInitialFundsTransaction,
  getTransactionHistory,
  getTransactionById,
};
