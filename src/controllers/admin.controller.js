const userModel = require("../models/user.model");
const accountModel = require("../models/account.model");
const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const systemConfigModel = require("../models/systemConfig.model");
const RefreshTokenModel = require("../models/refreshToken.model");
const { AuditLogModel } = require("../models/auditLog.model");
const notificationService = require("../services/notification.service");
const csvExportService = require("../services/csvExport.service");
const mongoose = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const logAudit = require("../utils/audit");
const logger = require("../utils/logger");
const os = require("os");
const { paiseToRupees, rupeesToPaise } = require("../utils/currency");

/* ─── 1. USER MANAGEMENT ────────────────────────────────────────────── */

/**
 * GET /api/v1/admin/users
 * Search and list users. Min privilege: teller.
 */
const searchUsers = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  let query = {};
  if (search) {
    query = {
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ],
    };
  }

  const [users, total] = await Promise.all([
    userModel.find(query).skip(skip).limit(limitNum).lean(),
    userModel.countDocuments(query),
  ]);

  res.status(200).json({
    users,
    pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
  });
});

/**
 * GET /api/v1/admin/users/:id
 * Fetch detailed profile of a user. Min privilege: teller.
 */
const getUserDetail = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  const user = await userModel.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const [accounts, sessions] = await Promise.all([
    accountModel.find({ user: userId }).lean(),
    RefreshTokenModel.find({ user: userId }).select("_id deviceInfo ipAddress lastUsedAt createdAt").lean(),
  ]);

  // Fetch balances for accounts
  const accountsWithBalances = await Promise.all(
    accounts.map(async (acc) => {
      const balancePaise = await accountModel.findById(acc._id).then((a) => a.getBalance());
      return {
        ...acc,
        balance: paiseToRupees(balancePaise),
      };
    }),
  );

  res.status(200).json({
    user: {
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      suspendedAt: user.suspendedAt,
      suspendReason: user.suspendReason,
      loginAttempts: user.loginAttempts,
      lockedUntil: user.lockedUntil,
      createdAt: user.createdAt,
    },
    accounts: accountsWithBalances,
    sessions,
  });
});

/**
 * PATCH /api/v1/admin/users/:id/suspend
 * Suspends a user account. Min privilege: admin.
 */
const suspendUser = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({ message: "Suspension reason is required" });
  }

  const user = await userModel.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  user.isActive = false;
  user.suspendedAt = new Date();
  user.suspendReason = reason;
  await user.save();

  // Forcefully revoke all user sessions
  await RefreshTokenModel.deleteMany({ user: userId });

  logAudit(req, "USER_SUSPENDED", { suspendedUserId: userId, reason });

  res.status(200).json({ message: "User account suspended successfully", user });
});

/**
 * PATCH /api/v1/admin/users/:id/unsuspend
 * Restores a suspended user account. Min privilege: admin.
 */
const unsuspendUser = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  const user = await userModel.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  user.isActive = true;
  user.suspendedAt = null;
  user.suspendReason = "";
  await user.save();

  logAudit(req, "USER_UNSUSPENDED", { unsuspendedUserId: userId });

  res.status(200).json({ message: "User account restored successfully", user });
});

/**
 * PATCH /api/v1/admin/users/:id/role
 * Changes user privilege role. Min privilege: superAdmin.
 */
const changeUserRole = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const { role } = req.body;

  if (!["customer", "teller", "manager", "admin", "superAdmin"].includes(role)) {
    return res.status(400).json({ message: "Invalid role value" });
  }

  const user = await userModel.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const oldRole = user.role;
  user.role = role;

  // Set systemUser flag to maintain backward compatibility with old code
  user.systemUser = ["admin", "superAdmin"].includes(role);
  await user.save();

  logAudit(req, "USER_ROLE_CHANGED", { roleChangedUserId: userId, oldRole, newRole: role });

  res.status(200).json({ message: `Role changed to ${role} successfully`, user });
});

/* ─── 2. ACCOUNT CONTROL ────────────────────────────────────────────── */

/**
 * GET /api/v1/admin/accounts
 * Lists all accounts in system. Min privilege: teller.
 */
const listAllAccounts = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const query = {};
  if (status) {
    query.status = status.toUpperCase();
  }

  const [accounts, total] = await Promise.all([
    accountModel.find(query).skip(skip).limit(limitNum).populate("user", "name email").lean(),
    accountModel.countDocuments(query),
  ]);

  const accountsWithBalances = await Promise.all(
    accounts.map(async (acc) => {
      const balancePaise = await accountModel.findById(acc._id).then((a) => a.getBalance());
      return {
        ...acc,
        balance: paiseToRupees(balancePaise),
      };
    }),
  );

  res.status(200).json({
    accounts: accountsWithBalances,
    pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
  });
});

/**
 * GET /api/v1/admin/accounts/:id
 * Retrieve specific account by ID. Min privilege: teller.
 */
const getAccountAdmin = asyncHandler(async (req, res) => {
  const accountId = req.params.id;

  const account = await accountModel.findById(accountId).populate("user", "name email role isActive");
  if (!account) {
    return res.status(404).json({ message: "Account not found" });
  }

  const balancePaise = await account.getBalance();

  res.status(200).json({
    account: {
      ...account.toObject(),
      balance: paiseToRupees(balancePaise),
      balancePaise,
    },
  });
});

/**
 * PATCH /api/v1/admin/accounts/:id/freeze
 * Freezes an account. Min privilege: manager.
 */
const freezeAccount = asyncHandler(async (req, res) => {
  const accountId = req.params.id;
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({ message: "Freeze reason is required" });
  }

  const account = await accountModel.findById(accountId);
  if (!account) {
    return res.status(404).json({ message: "Account not found" });
  }

  account.status = "FROZEN";
  await account.save();

  logAudit(req, "ACCOUNT_FROZEN", { accountId, reason });

  // Send notification
  await notificationService.createNotification(
    account.user,
    "ACCOUNT_FROZEN",
    "Account Frozen by Bank",
    `Your account ending in ...${accountId.toString().slice(-4)} has been frozen. Reason: ${reason}`,
    { accountId, reason },
  );

  res.status(200).json({ message: "Account frozen successfully", account });
});

/**
 * PATCH /api/v1/admin/accounts/:id/unfreeze
 * Unfreezes a frozen account. Min privilege: manager.
 */
const unfreezeAccount = asyncHandler(async (req, res) => {
  const accountId = req.params.id;

  const account = await accountModel.findById(accountId);
  if (!account) {
    return res.status(404).json({ message: "Account not found" });
  }

  account.status = "ACTIVE";
  await account.save();

  logAudit(req, "ACCOUNT_UNFROZEN", { accountId });

  // Send notification
  await notificationService.createNotification(
    account.user,
    "ACCOUNT_UNFROZEN",
    "Account Restored",
    `Your account ending in ...${accountId.toString().slice(-4)} is now active.`,
    { accountId },
  );

  res.status(200).json({ message: "Account unfrozen successfully", account });
});

/**
 * PATCH /api/v1/admin/accounts/:id/close
 * Administrative close account override. Min privilege: manager.
 */
const closeAccountAdmin = asyncHandler(async (req, res) => {
  const accountId = req.params.id;

  const account = await accountModel.findById(accountId);
  if (!account) {
    return res.status(404).json({ message: "Account not found" });
  }

  account.status = "CLOSED";
  await account.save();

  logAudit(req, "ACCOUNT_CLOSED_BY_ADMIN", { accountId });

  res.status(200).json({ message: "Account administratively closed", account });
});

/**
 * PATCH /api/v1/admin/accounts/:id/limit
 * Update account daily transaction limit. Min privilege: manager.
 */
const setAccountLimit = asyncHandler(async (req, res) => {
  const accountId = req.params.id;
  const { dailyLimit } = req.body; // in rupees from user input

  if (dailyLimit === undefined || dailyLimit < 0) {
    return res.status(400).json({ message: "Invalid dailyLimit amount" });
  }

  const limitPaise = dailyLimit === null ? null : rupeesToPaise(dailyLimit);

  const account = await accountModel.findByIdAndUpdate(
    accountId,
    { dailyLimit: limitPaise },
    { new: true },
  );

  if (!account) {
    return res.status(404).json({ message: "Account not found" });
  }

  logAudit(req, "ACCOUNT_LIMIT_CHANGED", { accountId, dailyLimitPaise: limitPaise });

  res.status(200).json({ message: "Daily limit updated successfully", account });
});

/**
 * POST /api/v1/admin/accounts/:id/fund
 * Injects funds directly into an account (e.g. cash deposit simulation). Min privilege: admin.
 */
const fundAccount = asyncHandler(async (req, res) => {
  const accountId = req.params.id;
  const { amount } = req.body; // in rupees

  if (!amount || amount <= 0) {
    return res.status(400).json({ message: "Funding amount must be greater than 0" });
  }

  const amountPaise = rupeesToPaise(amount);

  const targetAccount = await accountModel.findById(accountId);
  if (!targetAccount) {
    return res.status(404).json({ message: "Account not found" });
  }

  if (targetAccount.status !== "ACTIVE") {
    return res.status(400).json({ message: "Can only fund ACTIVE accounts" });
  }

  // Find or create reserve pool account for the bank
  let reserveAccount = await accountModel.findOne({ user: req.user._id });
  if (!reserveAccount) {
    reserveAccount = await accountModel.create({ user: req.user._id, nickname: "Bank Reserve Pool" });
  }

  const session = await mongoose.startSession();
  let transaction;

  try {
    session.startTransaction();

    const idempotencyKey = `fund-${accountId}-${Date.now()}`;
    transaction = await transactionModel.create(
      [
        {
          fromAccount: reserveAccount._id,
          toAccount: accountId,
          amount: amountPaise,
          idempotencyKey,
          description: "Administrative cash deposit",
          status: "PENDING",
        },
      ],
      { session },
    );
    transaction = transaction[0];

    // Ledger entries
    await ledgerModel.create(
      [{ account: reserveAccount._id, amount: amountPaise, transaction: transaction._id, type: "DEBIT" }],
      { session },
    );

    await ledgerModel.create(
      [{ account: accountId, amount: amountPaise, transaction: transaction._id, type: "CREDIT" }],
      { session },
    );

    transaction.status = "COMPLETED";
    await transaction.save({ session });

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  logAudit(req, "ACCOUNT_FUNDED", { accountId, amountPaise });

  // Notify recipient
  await notificationService.notifyTransferReceived(targetAccount.user, amountPaise, reserveAccount._id, transaction._id);

  res.status(200).json({ message: `Successfully funded account with ₹${amount.toFixed(2)}`, transaction });
});

/* ─── 3. TRANSACTION CONTROL ────────────────────────────────────────── */

/**
 * GET /api/v1/admin/transactions
 * List all transactions in system. Min privilege: teller.
 */
const listAllTransactions = asyncHandler(async (req, res) => {
  const { status, flagged, page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const query = {};
  if (status) query.status = status.toUpperCase();
  if (flagged === "true") query.flagged = true;

  const [transactions, total] = await Promise.all([
    transactionModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate({ path: "fromAccount", populate: { path: "user", select: "name email" } })
      .populate({ path: "toAccount", populate: { path: "user", select: "name email" } })
      .lean(),
    transactionModel.countDocuments(query),
  ]);

  const serialized = transactions.map((tx) => ({
    ...tx,
    amount: paiseToRupees(tx.amount),
  }));

  res.status(200).json({
    transactions: serialized,
    pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
  });
});

/**
 * GET /api/v1/admin/transactions/:id
 * Retrieve transaction details. Min privilege: teller.
 */
const getTransactionAdmin = asyncHandler(async (req, res) => {
  const txId = req.params.id;

  const transaction = await transactionModel
    .findById(txId)
    .populate({ path: "fromAccount", populate: { path: "user", select: "name email" } })
    .populate({ path: "toAccount", populate: { path: "user", select: "name email" } });

  if (!transaction) {
    return res.status(404).json({ message: "Transaction not found" });
  }

  res.status(200).json({ transaction: serializeTransaction(transaction) });
});

/**
 * PATCH /api/v1/admin/transactions/:id/flag
 * Marks a transaction as flagged (suspicious). Min privilege: manager.
 */
const flagTransaction = asyncHandler(async (req, res) => {
  const txId = req.params.id;
  const { reason } = req.body;

  if (!reason) {
    return res.status(400).json({ message: "Flag reason is required" });
  }

  const transaction = await transactionModel.findByIdAndUpdate(
    txId,
    { flagged: true, flagReason: reason, flaggedBy: req.user._id },
    { new: true },
  );

  if (!transaction) {
    return res.status(404).json({ message: "Transaction not found" });
  }

  logAudit(req, "TRANSACTION_FLAGGED", { transactionId: txId, reason });

  // Send warning alert to both parties
  const fromAcc = await accountModel.findById(transaction.fromAccount);
  const toAcc = await accountModel.findById(transaction.toAccount);

  await Promise.all([
    notificationService.createNotification(
      fromAcc.user,
      "TRANSACTION_FLAGGED",
      "Transaction Under Review",
      `Your transaction of ₹${(transaction.amount / 100).toFixed(2)} is under review. Reason: ${reason}`,
      { txId },
    ),
    notificationService.createNotification(
      toAcc.user,
      "TRANSACTION_FLAGGED",
      "Transaction Under Review",
      `Incoming transfer of ₹${(transaction.amount / 100).toFixed(2)} is under review. Reason: ${reason}`,
      { txId },
    ),
  ]);

  res.status(200).json({ message: "Transaction flagged successfully", transaction });
});

/**
 * POST /api/v1/admin/transactions/:id/reverse
 * Performs double-entry reversal: debits recipient, credits sender. Min privilege: manager.
 */
const reverseTransaction = asyncHandler(async (req, res) => {
  const txId = req.params.id;

  const transaction = await transactionModel.findById(txId);
  if (!transaction) {
    return res.status(404).json({ message: "Transaction not found" });
  }

  if (transaction.status !== "COMPLETED") {
    return res.status(400).json({ message: "Only COMPLETED transactions can be reversed" });
  }

  const recipientAcc = await accountModel.findById(transaction.toAccount);
  const senderAcc = await accountModel.findById(transaction.fromAccount);

  // Check if recipient account has sufficient balance to debit back
  const recipientBalance = await recipientAcc.getBalance();
  if (recipientBalance < transaction.amount) {
    return res.status(400).json({
      message: `Cannot reverse. Recipient has insufficient balance (Current: ₹${(recipientBalance / 100).toFixed(2)}, Reversal: ₹${(transaction.amount / 100).toFixed(2)})`,
    });
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Reverse double entry: DEBIT recipient (toAccount), CREDIT sender (fromAccount)
    await ledgerModel.create(
      [
        {
          account: transaction.toAccount,
          amount: transaction.amount,
          transaction: transaction._id,
          type: "DEBIT",
        },
      ],
      { session },
    );

    await ledgerModel.create(
      [
        {
          account: transaction.fromAccount,
          amount: transaction.amount,
          transaction: transaction._id,
          type: "CREDIT",
        },
      ],
      { session },
    );

    transaction.status = "REVERSED";
    transaction.reversedBy = req.user._id;
    transaction.reversedAt = new Date();
    await transaction.save({ session });

    await session.commitTransaction();
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }

  logAudit(req, "TRANSACTION_REVERSED", { transactionId: txId });

  // Notifications
  await Promise.all([
    notificationService.createNotification(
      senderAcc.user,
      "TRANSACTION_REVERSED",
      "Transaction Reversed",
      `Your transaction of ₹${(transaction.amount / 100).toFixed(2)} (ID: ${txId}) has been reversed. Funds returned.`,
      { txId, amount: transaction.amount },
    ),
    notificationService.createNotification(
      recipientAcc.user,
      "TRANSACTION_REVERSED",
      "Transaction Reversed",
      `Incoming transfer of ₹${(transaction.amount / 100).toFixed(2)} (ID: ${txId}) has been reversed by the bank.`,
      { txId, amount: transaction.amount },
    ),
  ]);

  res.status(200).json({ message: "Transaction reversed successfully", transaction });
});

/* ─── 4. SYSTEM CONFIGURATIONS ──────────────────────────────────────── */

/**
 * GET /api/v1/admin/system/audit-logs
 * Fetch immutable audit trail. Min privilege: admin.
 */
const getAuditLogs = asyncHandler(async (req, res) => {
  const { action, page = 1, limit = 50 } = req.query;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  const query = {};
  if (action) {
    query.action = action;
  }

  const [logs, total] = await Promise.all([
    AuditLogModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).populate("userId", "name email").lean(),
    AuditLogModel.countDocuments(query),
  ]);

  res.status(200).json({
    logs,
    pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) },
  });
});

/**
 * GET /api/v1/admin/system/audit-logs/export
 * Exports audit trail to CSV format. Min privilege: admin.
 */
const exportAuditLogsCsv = asyncHandler(async (req, res) => {
  const { action } = req.query;

  const query = {};
  if (action) {
    query.action = action;
  }

  const logs = await AuditLogModel.find(query).sort({ createdAt: -1 }).populate("userId", "email name");

  // Map to format that csvExportService expects
  const formattedLogs = logs.map((l) => ({
    createdAt: l.createdAt,
    user: l.userId || "System/Anonymous",
    action: l.action,
    ipAddress: l.ip || "N/A",
    details: l.metadata,
  }));

  const csvData = await csvExportService.exportAuditLogCsv(formattedLogs);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=audit-logs-${Date.now()}.csv`);
  res.status(200).send(csvData);
});

/**
 * GET /api/v1/admin/system/health
 * Returns infrastructure health details. Min privilege: admin.
 */
const getSystemHealth = asyncHandler(async (req, res) => {
  // DB status check
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  res.status(200).json({
    status: dbState === 1 ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    db: {
      status: dbStatusMap[dbState] || "unknown",
    },
    system: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      cpuLoad: os.loadavg(),
      freeMemory: os.freemem(),
      totalMemory: os.totalmem(),
    },
  });
});

/**
 * GET /api/v1/admin/system/config
 * Retrieves all configurations. Min privilege: admin.
 */
const getSystemConfig = asyncHandler(async (req, res) => {
  const configs = await systemConfigModel.find().lean();
  res.status(200).json({ configs });
});

/**
 * PUT /api/v1/admin/system/config
 * Add/update config setting. Min privilege: admin.
 */
const updateSystemConfig = asyncHandler(async (req, res) => {
  const { key, value } = req.body;

  const config = await systemConfigModel.findOneAndUpdate(
    { key },
    { value, updatedBy: req.user._id, updatedAt: new Date() },
    { upsert: true, new: true },
  );

  logAudit(req, "CONFIG_UPDATED", { key, value });

  res.status(200).json({ message: `Config key '${key}' updated successfully`, config });
});

module.exports = {
  searchUsers,
  getUserDetail,
  suspendUser,
  unsuspendUser,
  changeUserRole,
  listAllAccounts,
  getAccountAdmin,
  freezeAccount,
  unfreezeAccount,
  closeAccountAdmin,
  setAccountLimit,
  fundAccount,
  listAllTransactions,
  getTransactionAdmin,
  flagTransaction,
  reverseTransaction,
  getAuditLogs,
  exportAuditLogsCsv,
  getSystemHealth,
  getSystemConfig,
  updateSystemConfig,
};
