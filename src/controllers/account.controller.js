const accountModel = require("../models/account.model");
const ledgerModel = require("../models/ledger.model");
const otpService = require("../services/otp.service");
const csvExportService = require("../services/csvExport.service");
const asyncHandler = require("../utils/asyncHandler");
const logAudit = require("../utils/audit");
const { paiseToRupees, rupeesToPaise } = require("../utils/currency");

/**
 * Helper to get initial balance before a specific date
 */
const getInitialBalance = async (accountId, beforeDate) => {
  const result = await ledgerModel.aggregate([
    { $match: { account: accountId, createdAt: { $lt: beforeDate } } },
    {
      $group: {
        _id: null,
        totalDebit: {
          $sum: { $cond: [{ $eq: ["$type", "DEBIT"] }, "$amount", 0] },
        },
        totalCredit: {
          $sum: { $cond: [{ $eq: ["$type", "CREDIT"] }, "$amount", 0] },
        },
      },
    },
  ]);
  if (result.length === 0) return 0;
  return result[0].totalCredit - result[0].totalDebit;
};

/**
 * Helper to compute ledger entries with running balances for a date range
 */
const getStatementEntries = async (accountId, fromDate, toDate) => {
  let runningBalance = 0;
  if (fromDate) {
    runningBalance = await getInitialBalance(accountId, fromDate);
  }

  const query = { account: accountId };
  if (fromDate || toDate) {
    query.createdAt = {};
    if (fromDate) query.createdAt.$gte = fromDate;
    if (toDate) query.createdAt.$lte = toDate;
  }

  const entries = await ledgerModel
    .find(query)
    .sort({ createdAt: 1 })
    .populate({
      path: "transaction",
      select: "description fromAccount toAccount status",
      populate: [
        { path: "fromAccount", select: "_id", populate: { path: "user", select: "name email" } },
        { path: "toAccount", select: "_id", populate: { path: "user", select: "name email" } },
      ],
    });

  return entries.map((entry) => {
    if (entry.type === "CREDIT") {
      runningBalance += entry.amount;
    } else {
      runningBalance -= entry.amount;
    }
    const obj = entry.toObject();
    obj.balanceAfter = runningBalance;
    return obj;
  });
};

/**
 * POST /api/v1/accounts
 */
const createAccountController = asyncHandler(async (req, res) => {
  const user = req.user;

  // Enforce maximum accounts limit (e.g. 5)
  const count = await accountModel.countDocuments({ user: user._id, status: { $ne: "CLOSED" } });
  if (count >= 5) {
    return res.status(400).json({ message: "Maximum limit of 5 active accounts reached." });
  }

  const account = await accountModel.create({
    user: user._id,
    nickname: req.body.nickname || `Account ...${Math.random().toString().slice(-4)}`,
  });

  logAudit(req, "ACCOUNT_CREATED", { accountId: account._id });

  res.status(201).json({ account });
});

/**
 * GET /api/v1/accounts
 */
const getUserAccountsController = asyncHandler(async (req, res) => {
  const accounts = await accountModel.find({ user: req.user._id, status: { $ne: "CLOSED" } }).lean();

  // Attach real-time balances to each account
  const accountsWithBalances = await Promise.all(
    accounts.map(async (acc) => {
      const balancePaise = await accountModel.findById(acc._id).then((a) => a.getBalance());
      return {
        ...acc,
        balance: paiseToRupees(balancePaise),
        balancePaise,
      };
    }),
  );

  res.status(200).json({ accounts: accountsWithBalances });
});

/**
 * GET /api/v1/accounts/summary
 */
const getAccountSummaryController = asyncHandler(async (req, res) => {
  const accounts = await accountModel.find({ user: req.user._id, status: { $ne: "CLOSED" } }).lean();

  let totalBalancePaise = 0;
  const summaryList = await Promise.all(
    accounts.map(async (acc) => {
      const balancePaise = await accountModel.findById(acc._id).then((a) => a.getBalance());
      totalBalancePaise += balancePaise;
      return {
        accountId: acc._id,
        nickname: acc.nickname || `Account ending in ...${acc._id.toString().slice(-4)}`,
        balance: paiseToRupees(balancePaise),
        status: acc.status,
      };
    }),
  );

  res.status(200).json({
    totalBalance: paiseToRupees(totalBalancePaise),
    accounts: summaryList,
  });
});

/**
 * GET /api/v1/accounts/balance/:accountId
 */
const getAccountBalanceController = asyncHandler(async (req, res) => {
  const { accountId } = req.params;

  const account = await accountModel.findOne({
    _id: accountId,
    user: req.user._id,
  });

  if (!account) {
    return res.status(404).json({ message: "Account not found" });
  }

  const balancePaise = await account.getBalance();

  res.status(200).json({
    accountId: account._id,
    balance: paiseToRupees(balancePaise),
    currency: account.currency,
  });
});

/**
 * GET /api/v1/accounts/:accountId
 */
const getAccountDetailController = asyncHandler(async (req, res) => {
  const { accountId } = req.params;

  const account = await accountModel.findOne({
    _id: accountId,
    user: req.user._id,
  });

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
 * PATCH /api/v1/accounts/:accountId/nickname
 */
const updateNicknameController = asyncHandler(async (req, res) => {
  const { accountId } = req.params;
  const { nickname } = req.body;

  const account = await accountModel.findOneAndUpdate(
    { _id: accountId, user: req.user._id },
    { nickname },
    { new: true },
  );

  if (!account) {
    return res.status(404).json({ message: "Account not found" });
  }

  logAudit(req, "ACCOUNT_NICKNAME_UPDATED", { accountId, nickname });

  res.status(200).json({ account });
});

/**
 * GET /api/v1/accounts/:accountId/statement
 */
const getAccountStatementController = asyncHandler(async (req, res) => {
  const { accountId } = req.params;
  const { from, to, page = 1, limit = 20 } = req.query;

  const account = await accountModel.findOne({ _id: accountId, user: req.user._id });
  if (!account) {
    return res.status(404).json({ message: "Account not found" });
  }

  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;

  const allStatementEntries = await getStatementEntries(accountId, fromDate, toDate);

  // Paginate the array (reverse chronological order for display is standard, but running balance was computed chronological)
  // Let's reverse it so recent entries show first
  const reversedEntries = [...allStatementEntries].reverse();

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.max(1, parseInt(limit));
  const total = reversedEntries.length;
  const paginatedEntries = reversedEntries.slice((pageNum - 1) * limitNum, pageNum * limitNum);

  res.status(200).json({
    entries: paginatedEntries,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

/**
 * GET /api/v1/accounts/:accountId/statement/csv
 */
const downloadStatementCsvController = asyncHandler(async (req, res) => {
  const { accountId } = req.params;
  const { from, to } = req.query;

  const account = await accountModel.findOne({ _id: accountId, user: req.user._id });
  if (!account) {
    return res.status(404).json({ message: "Account not found" });
  }

  const fromDate = from ? new Date(from) : null;
  const toDate = to ? new Date(to) : null;

  const entries = await getStatementEntries(accountId, fromDate, toDate);
  const csvData = await csvExportService.exportStatementCsv(entries);

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=statement-${accountId}.csv`);
  res.status(200).send(csvData);
});

/**
 * POST /api/v1/accounts/:accountId/close
 */
const closeAccountController = asyncHandler(async (req, res) => {
  const { accountId } = req.params;
  const { otp } = req.body;
  const userId = req.user._id;

  const account = await accountModel.findOne({ _id: accountId, user: userId });
  if (!account) {
    return res.status(404).json({ message: "Account not found" });
  }

  if (account.status === "CLOSED") {
    return res.status(400).json({ message: "Account is already closed" });
  }

  // 1. Verify OTP
  const isValidOtp = await otpService.verifyOtp(userId, "CLOSE_ACCOUNT", otp);
  if (!isValidOtp) {
    return res.status(401).json({ message: "Invalid or expired OTP for account closure" });
  }

  // 2. Check balance (must be zero)
  const balancePaise = await account.getBalance();
  if (balancePaise !== 0) {
    return res.status(400).json({
      message: `Cannot close account. Account has a non-zero balance of ₹${paiseToRupees(balancePaise)}. Please transfer all funds out first.`,
    });
  }

  // 3. Mark CLOSED
  account.status = "CLOSED";
  await account.save();

  logAudit(req, "ACCOUNT_CLOSED", { accountId });

  res.status(200).json({ message: "Account closed successfully", account });
});

module.exports = {
  createAccountController,
  getUserAccountsController,
  getAccountBalanceController,
  getAccountSummaryController,
  getAccountDetailController,
  updateNicknameController,
  getAccountStatementController,
  downloadStatementCsvController,
  closeAccountController,
};
