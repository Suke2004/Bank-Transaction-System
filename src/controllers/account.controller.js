const accountModel = require("../models/account.model");
const asyncHandler = require("../utils/asyncHandler");

const createAccountController = asyncHandler(async (req, res) => {
  const user = req.user;

  const account = await accountModel.create({
    user: user._id,
  });

  res.status(201).json({
    account,
  });
});

const getUserAccountsController = asyncHandler(async (req, res) => {
  // Production note: this returns ALL accounts. For users with many accounts
  // you'd add pagination (limit/skip or cursor-based). Added basic defaults here.
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const skip = (page - 1) * limit;

  const [accounts, total] = await Promise.all([
    accountModel.find({ user: req.user._id }).skip(skip).limit(limit).lean(),
    accountModel.countDocuments({ user: req.user._id }),
  ]);

  res.status(200).json({
    accounts,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

const getAccountBalanceController = asyncHandler(async (req, res) => {
  const { accountId } = req.params;

  const account = await accountModel.findOne({
    _id: accountId,
    user: req.user._id,
  });

  if (!account) {
    return res.status(404).json({
      message: "Account not found",
    });
  }

  const balance = await account.getBalance();

  res.status(200).json({
    accountId: account._id,
    balance: balance,
  });
});

module.exports = {
  createAccountController,
  getUserAccountsController,
  getAccountBalanceController,
};
