const ledgerModel = require("../models/ledger.model");
const accountModel = require("../models/account.model");
const mongoose = require("mongoose");

/**
 * Returns total deposits (CREDIT) and withdrawals (DEBIT) for a user's accounts
 * in a specific month, along with per-account breakdowns.
 */
const getMonthlyAnalytics = async (userId, year, month) => {
  // 1. Fetch user's accounts
  const accounts = await accountModel.find({ user: userId });
  const accountIds = accounts.map((acc) => acc._id);

  if (accountIds.length === 0) {
    return {
      totalCredit: 0,
      totalDebit: 0,
      netSavings: 0,
      accountBreakdown: [],
    };
  }

  // 2. Set date boundaries
  // Note: month is 1-indexed (1 = January, 12 = December)
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1); // first day of next month is the boundary

  // 3. Aggregate globally for user
  const globalSummary = await ledgerModel.aggregate([
    {
      $match: {
        account: { $in: accountIds },
        createdAt: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: "$type",
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  let totalCredit = 0;
  let totalDebit = 0;
  let creditCount = 0;
  let debitCount = 0;

  globalSummary.forEach((group) => {
    if (group._id === "CREDIT") {
      totalCredit = group.total;
      creditCount = group.count;
    } else if (group._id === "DEBIT") {
      totalDebit = group.total;
      debitCount = group.count;
    }
  });

  // 4. Aggregate breakdown per account
  const accountBreakdown = await ledgerModel.aggregate([
    {
      $match: {
        account: { $in: accountIds },
        createdAt: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: { account: "$account", type: "$type" },
        total: { $sum: "$amount" },
      },
    },
    {
      $group: {
        _id: "$_id.account",
        credit: {
          $sum: {
            $cond: [{ $eq: ["$_id.type", "CREDIT"] }, "$total", 0],
          },
        },
        debit: {
          $sum: {
            $cond: [{ $eq: ["$_id.type", "DEBIT"] }, "$total", 0],
          },
        },
      },
    },
  ]);

  // Map account nicknames and metadata
  const breakdownWithMeta = accounts.map((acc) => {
    const stats = accountBreakdown.find((b) => b._id.toString() === acc._id.toString()) || { credit: 0, debit: 0 };
    return {
      accountId: acc._id,
      nickname: acc.nickname || `Account ending in ...${acc._id.toString().slice(-4)}`,
      status: acc.status,
      credit: stats.credit,
      debit: stats.debit,
      net: stats.credit - stats.debit,
    };
  });

  return {
    year,
    month,
    totalCredit,
    totalDebit,
    netSavings: totalCredit - totalDebit,
    creditCount,
    debitCount,
    accountBreakdown: breakdownWithMeta,
  };
};

/**
 * Returns monthly debit/credit trends over the past N months for a user's accounts.
 */
const getTrend = async (userId, monthsLimit = 6) => {
  const accounts = await accountModel.find({ user: userId });
  const accountIds = accounts.map((acc) => acc._id);

  if (accountIds.length === 0) {
    return [];
  }

  // Calculate N months ago
  const limitDate = new Date();
  limitDate.setMonth(limitDate.getMonth() - monthsLimit + 1);
  limitDate.setDate(1);
  limitDate.setHours(0, 0, 0, 0);

  const trendData = await ledgerModel.aggregate([
    {
      $match: {
        account: { $in: accountIds },
        createdAt: { $gte: limitDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          type: "$type",
        },
        total: { $sum: "$amount" },
      },
    },
    {
      $group: {
        _id: { year: "$_id.year", month: "$_id.month" },
        credit: {
          $sum: {
            $cond: [{ $eq: ["$_id.type", "CREDIT"] }, "$total", 0],
          },
        },
        debit: {
          $sum: {
            $cond: [{ $eq: ["$_id.type", "DEBIT"] }, "$total", 0],
          },
        },
      },
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1 },
    },
  ]);

  // Format response for the frontend (e.g. "Jan 2026")
  const formattedTrend = trendData.map((item) => {
    const date = new Date(item._id.year, item._id.month - 1);
    const label = date.toLocaleString("en-US", { month: "short", year: "numeric" });
    return {
      label,
      year: item._id.year,
      month: item._id.month,
      credit: item.credit,
      debit: item.debit,
      net: item.credit - item.debit,
    };
  });

  return formattedTrend;
};

module.exports = {
  getMonthlyAnalytics,
  getTrend,
};
