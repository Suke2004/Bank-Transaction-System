const express = require('express');

const transactionController = require("../controllers/transaction.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { validateCreateTransaction, validateInitialFunds } = require("../middleware/validate.middleware");

const router = express.Router();

/**
 * - POST /api/transaction: Create a new transaction
 */
router.post(
  "/",
  authMiddleware.authMiddleware,
  validateCreateTransaction,
  transactionController.createTransaction
);

/**
 * - POST /api/transactions/system/initial-funds
 * - Create initial funds transaction from system user
 */
router.post(
  "/system/initial-funds",
  authMiddleware.authSystemUserMiddleware,
  validateInitialFunds,
  transactionController.createInitialFundsTransaction
);

module.exports = router;
