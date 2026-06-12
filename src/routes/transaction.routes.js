const express = require("express");
const transactionController = require("../controllers/transaction.controller");
const { authMiddleware, authSystemUserMiddleware } = require("../middleware/auth.middleware");
const {
  validateCreateTransaction,
  validateInitialFunds,
  validateTransactionId,
} = require("../middleware/validate.middleware");

const router = express.Router();

/* GET /api/v1/transaction - List user's transaction history */
router.get(
  "/",
  authMiddleware,
  transactionController.getTransactionHistory
);

/* GET /api/v1/transaction/export/csv - Export history as CSV (defined BEFORE :id to avoid clash) */
router.get(
  "/export/csv",
  authMiddleware,
  transactionController.exportTransactionsCsv
);

/* GET /api/v1/transaction/:id - Get transaction detail */
router.get(
  "/:id",
  authMiddleware,
  validateTransactionId,
  transactionController.getTransactionById
);

/* POST /api/v1/transaction - Execute new transfer */
router.post(
  "/",
  authMiddleware,
  validateCreateTransaction,
  transactionController.createTransaction
);

/* POST /api/v1/transaction/system/initial-funds - Add bank funds (system/teller/manager/admin privilege only) */
router.post(
  "/system/initial-funds",
  authSystemUserMiddleware,
  validateInitialFunds,
  transactionController.createInitialFundsTransaction
);

module.exports = router;
