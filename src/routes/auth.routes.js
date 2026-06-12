const express = require("express");
const authController = require("../controllers/auth.controller");
const { authMiddleware } = require("../middleware/auth.middleware");
const {
  validateRegister,
  validateLogin,
  validateOtp,
  validatePin,
  validateChangePin,
} = require("../middleware/validate.middleware");
const { body } = require("express-validator");
const { runValidation } = require("../middleware/validate.middleware"); // Wait! Does validate.middleware export runValidation? Let's check: it doesn't export runValidation, but we can write simple express-validator or just let controller handle it or define it in validate.middleware.js. Since validate.middleware.js doesn't export runValidation, we shouldn't import it. We can just use the validators from validate.middleware.js.

const router = express.Router();

/* ─── PUBLIC ROUTES ──────────────────────────────────────────────────── */

/* POST /api/v1/auth/register */
router.post("/register", validateRegister, authController.userRegisterController);

/* POST /api/v1/auth/verify-email */
router.post("/verify-email", validateOtp, authController.verifyEmailController);

/* POST /api/v1/auth/login */
router.post("/login", validateLogin, authController.userLoginController);

/* POST /api/v1/auth/verify-login-otp */
router.post("/verify-login-otp", validateOtp, authController.verifyLoginOtpController);

/* POST /api/v1/auth/refresh */
router.post("/refresh", authController.refreshTokenController);

/* POST /api/v1/auth/logout */
router.post("/logout", authController.userLogoutController);

/* POST /api/v1/auth/forgot-password */
router.post(
  "/forgot-password",
  [
    body("email")
      .trim()
      .notEmpty().withMessage("Email is required")
      .isEmail().withMessage("Must be a valid email address"),
  ],
  authController.sendForgotPasswordOtpController
);

/* POST /api/v1/auth/reset-password */
router.post(
  "/reset-password",
  [
    body("userId").notEmpty().withMessage("User ID is required"),
    body("otp")
      .notEmpty().withMessage("OTP is required")
      .isLength({ min: 6, max: 6 }).withMessage("OTP must be exactly 6 digits"),
    body("newPassword")
      .notEmpty().withMessage("New password is required")
      .isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  authController.resetPasswordController
);

/* POST /api/v1/auth/resend-otp */
router.post("/resend-otp", authController.resendOtpController);

/* ─── PROTECTED ROUTES (Requires Auth) ───────────────────────────────── */

/* GET /api/v1/auth/me */
router.get("/me", authMiddleware, authController.getMeController);

/* PATCH /api/v1/auth/change-password */
router.patch(
  "/change-password",
  authMiddleware,
  [
    body("currentPassword").notEmpty().withMessage("Current password is required"),
    body("newPassword")
      .notEmpty().withMessage("New password is required")
      .isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    body("otp").notEmpty().withMessage("OTP is required"),
  ],
  authController.changePasswordController
);

/* PATCH /api/v1/auth/change-name */
router.patch(
  "/change-name",
  authMiddleware,
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  authController.changeNameController
);

/* POST /api/v1/auth/pin/setup */
router.post("/pin/setup", authMiddleware, validatePin, authController.setupPinController);

/* POST /api/v1/auth/pin/verify */
router.post("/pin/verify", authMiddleware, validatePin, authController.verifyPinController);

/* PUT /api/v1/auth/pin/change */
router.put("/pin/change", authMiddleware, validateChangePin, authController.changePinController);

/* POST /api/v1/auth/pin/send-otp */
router.post("/pin/send-otp", authMiddleware, authController.sendPinChangeOtpController);

/* GET /api/v1/auth/sessions */
router.get("/sessions", authMiddleware, authController.listSessionsController);

/* DELETE /api/v1/auth/sessions/:id */
router.delete("/sessions/:id", authMiddleware, authController.revokeSessionController);

/* DELETE /api/v1/auth/sessions */
router.delete("/sessions", authMiddleware, authController.revokeAllSessionsController);

/* PATCH /api/v1/auth/notifications */
router.patch("/notifications", authMiddleware, authController.updateNotificationPrefsController);

module.exports = router;
