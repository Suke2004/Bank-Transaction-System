const express = require("express");
const authController = require("../controllers/auth.controller");
const { validateRegister, validateLogin } = require("../middleware/validate.middleware");

const router = express.Router();

/* POST /api/v1/auth/register */
router.post("/register", validateRegister, authController.userRegisterController);

/* POST /api/v1/auth/login */
router.post("/login", validateLogin, authController.userLoginController);

/**
 * POST /api/v1/auth/refresh
 * Exchanges a valid refresh token cookie for a new access token.
 * No body required — reads the refreshToken cookie automatically.
 */
router.post("/refresh", authController.refreshTokenController);

/* POST /api/v1/auth/logout */
router.post("/logout", authController.userLogoutController);

module.exports = router;
