const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const accountController = require("../controllers/account.controller");
const { validateAccountId } = require("../middleware/validate.middleware");

const router = express.Router();

/*
    * - create new account
    * - POST /api/accounts
    * - protected route
*/
router.post("/", authMiddleware.authMiddleware, accountController.createAccountController);

router.get("/", authMiddleware.authMiddleware, accountController.getUserAccountsController);

/**
 * - GET api/accounts/balance/:accountId
 */
router.get(
  "/balance/:accountId",
  authMiddleware.authMiddleware,
  validateAccountId,
  accountController.getAccountBalanceController
);

module.exports = router;