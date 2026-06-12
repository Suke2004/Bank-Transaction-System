const express = require("express");
const analyticsController = require("../controllers/analytics.controller");
const { authMiddleware } = require("../middleware/auth.middleware");

const router = express.Router();

// Enforce authMiddleware for all analytics routes
router.use(authMiddleware);

/* GET /api/v1/analytics/monthly - Monthly deposits vs withdrawals breakdown */
router.get("/monthly", analyticsController.getMonthlyAnalytics);

/* GET /api/v1/analytics/trend - Past N months savings trend */
router.get("/trend", analyticsController.getTrend);

module.exports = router;
