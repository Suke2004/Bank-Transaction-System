const accountModel = require("../models/account.model");
const asyncHandler = require("../utils/asyncHandler");
const logAudit = require("../utils/audit");
const { paiseToRupees } = require("../utils/currency");

const createAccountController = asyncHandler(async (req, res) => {
  const user = req.user;

  const account = await accountModel.create({ user: user._id });

  logAudit(req, "ACCOUNT_CREATED", { accountId: account._id });

  res.status(201).json({ account });
});

const getUserAccountsController = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const skip = (page - 1) * limit;

  const [accounts, total] = await Promise.all([
    accountModel.find({ user: req.user._id }).skip(skip).limit(limit).lean(),
    accountModel.countDocuments({ user: req.user._id }),
  ]);

  res.status(200).json({
    accounts,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

const getAccountBalanceController = asyncHandler(async (req, res) => {
  const { accountId } = req.params;

  const account = await accountModel.findOne({
    _id: accountId,
    user: req.user._id,
  });

  if (!account) {
    return res.status(404).json({ message: "Account not found" });
  }

  // getBalance() returns paise — convert to rupees for the response
  const balancePaise = await account.getBalance();

  res.status(200).json({
    accountId: account._id,
    balance: paiseToRupees(balancePaise),
    currency: account.currency,
  });
});

module.exports = {
  createAccountController,
  getUserAccountsController,
  getAccountBalanceController,
};
