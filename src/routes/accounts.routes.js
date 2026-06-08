const express = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const accountController = require("../controllers/account.controller");

const router = express.Router();

/*
    * - create new account
    * - POST /api/accounts
    * - protected route
*/
router.post("/", authMiddleware, accountController.createAccountController);

module.exports = router;