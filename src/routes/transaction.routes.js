const express = require('express');
const transactionController = require("../controllers/transaction.controller");
const authMiddleware = require("../middleware/auth.middleware");
const {
  validateCreateTransaction,
  validateInitialFunds,
  validateTransactionId,
} = require("../middleware/validate.middleware");

const router = express.Router();

/**
 * POST /api/v1/transaction
 * Transfer money between two accounts.
 */
router.post(
  "/",
  authMiddleware.authMiddleware,
  validateCreateTransaction,
  transactionController.createTransaction
);

/**
 * GET /api/v1/transaction
 * List the authenticated user's transaction history (paginated).
 * Query params: ?page=1 &limit=20 &status=COMPLETED
 */
router.get(
  "/",
  authMiddleware.authMiddleware,
  transactionController.getTransactionHistory
);

/**
 * GET /api/v1/transaction/:id
 * Get a single transaction by ID (must involve the user's account).
 */
router.get(
  "/:id",
  authMiddleware.authMiddleware,
  validateTransactionId,
  transactionController.getTransactionById
);

/**
 * POST /api/v1/transaction/system/initial-funds
 * Credit initial funds into an account (system user only).
 */
router.post(
  "/system/initial-funds",
  authMiddleware.authSystemUserMiddleware,
  validateInitialFunds,
  transactionController.createInitialFundsTransaction
);

module.exports = router;
