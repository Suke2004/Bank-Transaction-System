const express = require("express");
const { authMiddleware } = require("../middleware/auth.middleware");
const accountController = require("../controllers/account.controller");
const {
  validateAccountId,
  validateAccountNickname,
  validateOtp,
} = require("../middleware/validate.middleware");

const router = express.Router();

// Enforce authMiddleware globally for all account routes
router.use(authMiddleware);

/* POST /api/v1/accounts - Create new account */
router.post("/", accountController.createAccountController);

/* GET /api/v1/accounts - List user's active accounts */
router.get("/", accountController.getUserAccountsController);

/* GET /api/v1/accounts/summary - Total balance summary and list */
router.get("/summary", accountController.getAccountSummaryController);

/* GET /api/v1/accounts/balance/:accountId - Fetch balance only */
router.get("/balance/:accountId", validateAccountId, accountController.getAccountBalanceController);

/* GET /api/v1/accounts/:accountId - Get specific account details */
router.get("/:accountId", validateAccountId, accountController.getAccountDetailController);

/* PATCH /api/v1/accounts/:accountId/nickname - Update account label */
router.patch(
  "/:accountId/nickname",
  validateAccountId,
  validateAccountNickname,
  accountController.updateNicknameController
);

/* GET /api/v1/accounts/:accountId/statement - Paginated entries list */
router.get("/:accountId/statement", validateAccountId, accountController.getAccountStatementController);

/* GET /api/v1/accounts/:accountId/statement/csv - Download statement CSV */
router.get("/:accountId/statement/csv", validateAccountId, accountController.downloadStatementCsvController);

/* POST /api/v1/accounts/:accountId/close - Close account */
router.post("/:accountId/close", validateAccountId, validateOtp, accountController.closeAccountController);

module.exports = router;