const analyticsService = require("../services/analytics.service");
const asyncHandler = require("../utils/asyncHandler");
const { paiseToRupees } = require("../utils/currency");

/**
 * GET /api/v1/analytics/monthly
 * Returns total credit, debit, net savings, and per-account breakdown for the user.
 */
const getMonthlyAnalytics = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const now = new Date();
  const year = parseInt(req.query.year) || now.getFullYear();
  const month = parseInt(req.query.month) || (now.getMonth() + 1); // 1-indexed

  if (month < 1 || month > 12) {
    return res.status(400).json({ message: "Month must be between 1 and 12" });
  }

  const rawAnalytics = await analyticsService.getMonthlyAnalytics(userId, year, month);

  // Convert all aggregate paise amounts to rupees for the client response
  const serialized = {
    year: rawAnalytics.year,
    month: rawAnalytics.month,
    totalCredit: paiseToRupees(rawAnalytics.totalCredit),
    totalDebit: paiseToRupees(rawAnalytics.totalDebit),
    netSavings: paiseToRupees(rawAnalytics.netSavings),
    creditCount: rawAnalytics.creditCount,
    debitCount: rawAnalytics.debitCount,
    accountBreakdown: rawAnalytics.accountBreakdown.map((item) => ({
      ...item,
      credit: paiseToRupees(item.credit),
      debit: paiseToRupees(item.debit),
      net: paiseToRupees(item.net),
    })),
  };

  res.status(200).json({ analytics: serialized });
});

/**
 * GET /api/v1/analytics/trend
 * Returns the credit/debit monthly saving trend over past N months.
 */
const getTrend = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const limit = parseInt(req.query.months) || 6; // default 6 months

  const rawTrend = await analyticsService.getTrend(userId, limit);

  // Convert paise to rupees
  const serialized = rawTrend.map((item) => ({
    label: item.label,
    year: item.year,
    month: item.month,
    credit: paiseToRupees(item.credit),
    debit: paiseToRupees(item.debit),
    net: paiseToRupees(item.net),
  }));

  res.status(200).json({ trend: serialized });
});

module.exports = {
  getMonthlyAnalytics,
  getTrend,
};
