const crypto = require("crypto");
const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const emailService = require("../services/email.service");
const tokenBlackListModel = require("../models/blackList.model");
const RefreshTokenModel = require("../models/refreshToken.model");
const transactionPinModel = require("../models/transactionPin.model");
const otpService = require("../services/otp.service");
const pinService = require("../services/pin.service");
const notificationService = require("../services/notification.service");
const otpModel = require("../models/otp.model");
const asyncHandler = require("../utils/asyncHandler");
const logAudit = require("../utils/audit");
const logger = require("../utils/logger");

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 15 * 60 * 1000, // 15 minutes
};

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: REFRESH_TOKEN_EXPIRY_MS,
};

/**
 * Generate an access JWT for a given userId.
 */
function generateAccessToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

/**
 * Generate a cryptographically random refresh token,
 * store its SHA-256 hash in DB, return the raw token for the cookie.
 */
async function generateAndStoreRefreshToken(userId, req) {
  const rawToken = crypto.randomBytes(64).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const deviceInfo = req ? req.headers["user-agent"] || "" : "Unknown Device";
  const ipAddress = req ? req.ip || req.connection?.remoteAddress || "" : "Unknown IP";

  await RefreshTokenModel.create({
    tokenHash,
    user: userId,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
    deviceInfo,
    ipAddress,
    lastUsedAt: new Date(),
  });

  return rawToken;
}

/**
 * Issue both tokens and set both cookies in one call.
 */
async function issueTokens(res, userId, req) {
  const accessToken = generateAccessToken(userId);
  const refreshToken = await generateAndStoreRefreshToken(userId, req);

  res.cookie("token", accessToken, ACCESS_COOKIE_OPTIONS);
  res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);

  return { accessToken, refreshToken };
}

/* ─── REGISTER / LOGIN FLOWS ─────────────────────────────────────────── */

/**
 * POST /api/v1/auth/register
 */
const userRegisterController = asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;

  const isExists = await userModel.findOne({ email });
  if (isExists) {
    return res.status(422).json({
      message: "User already exists with email.",
      status: "failed",
    });
  }

  // Create user as inactive initially until email is verified
  const user = await userModel.create({
    email,
    password,
    name,
    isActive: false, // Inactive until verified
  });

  // Send REGISTER OTP
  await otpService.sendOtpEmail(user._id, "REGISTER");

  logAudit(req, "USER_REGISTER_INITIATED", { userId: user._id, email: user.email });

  res.status(201).json({
    message: "Registration successful. Please verify your email using the OTP sent.",
    pendingOtp: true,
    userId: user._id,
  });
});

/**
 * POST /api/v1/auth/verify-email
 */
const verifyEmailController = asyncHandler(async (req, res) => {
  const { userId, otp } = req.body;

  const user = await userModel.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const isValid = await otpService.verifyOtp(userId, "REGISTER", otp);
  if (!isValid) {
    return res.status(401).json({ message: "Invalid or expired registration OTP" });
  }

  // Activate user
  user.isActive = true;
  await user.save();

  // Issue tokens to log them in directly after verification
  const { accessToken } = await issueTokens(res, user._id, req);

  logAudit(req, "USER_EMAIL_VERIFIED", { userId: user._id, email: user.email });

  res.status(200).json({
    message: "Email verified successfully.",
    user: { _id: user._id, email: user.email, name: user.name, role: user.role },
    token: accessToken,
  });

  // Send greeting email
  emailService.sendRegistrationEmail(user.email, user.name).catch((err) => {
    logger.error("Failed to send welcome email", { userId: user._id, error: err.message });
  });
});

/**
 * POST /api/v1/auth/login
 */
const userLoginController = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await userModel.findOne({ email }).select("+password");

  if (!user) {
    return res.status(401).json({ message: "Email or password is INVALID" });
  }

  // Check login lockout
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return res.status(423).json({
      message: `Account is temporarily locked. Try again after ${user.lockedUntil.toLocaleString()}`,
    });
  }

  const isValidPassword = await user.comparePassword(password);
  if (!isValidPassword) {
    // Increment login attempts
    user.loginAttempts += 1;
    if (user.loginAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes lockout
      await user.save();

      logAudit(req, "ACCOUNT_LOCKED_OUT", { userId: user._id, email: user.email });
      
      // Send lock notification in-app & email
      notificationService.createNotification(user._id, "ACCOUNT_LOCKED", "Account Locked", "Your account has been locked for 30 minutes due to multiple failed login attempts.", { lockMinutes: 30 });
      
      return res.status(423).json({
        message: "Account locked due to 5 failed attempts. Please try again in 30 minutes.",
      });
    }

    await user.save();
    return res.status(401).json({ message: "Email or password is INVALID" });
  }

  // If user is suspended
  if (!user.isActive) {
    return res.status(403).json({
      message: user.suspendReason ? `Account suspended: ${user.suspendReason}` : "Account suspended",
    });
  }

  // Send LOGIN OTP
  await otpService.sendOtpEmail(user._id, "LOGIN");

  logAudit(req, "USER_LOGIN_OTP_SENT", { userId: user._id, email: user.email });

  res.status(200).json({
    message: "OTP sent to your registered email.",
    pendingOtp: true,
    userId: user._id,
  });
});

/**
 * POST /api/v1/auth/verify-login-otp
 */
const verifyLoginOtpController = asyncHandler(async (req, res) => {
  const { userId, otp } = req.body;

  const user = await userModel.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // Check login lockout again
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return res.status(423).json({
      message: `Account is locked. Try again after ${user.lockedUntil.toLocaleString()}`,
    });
  }

  const isValid = await otpService.verifyOtp(userId, "LOGIN", otp);
  if (!isValid) {
    return res.status(401).json({ message: "Invalid or expired login OTP" });
  }

  // Reset login lockout stats
  user.loginAttempts = 0;
  user.lockedUntil = null;
  await user.save();

  // Issue tokens
  const { accessToken } = await issueTokens(res, user._id, req);

  logAudit(req, "USER_LOGIN_SUCCESS", { userId: user._id, email: user.email });

  // Send login alert notification
  const ipAddress = req.ip || req.connection?.remoteAddress || "Unknown";
  const deviceInfo = req.headers["user-agent"] || "Unknown Device";
  await notificationService.createNotification(user._id, "LOGIN_ALERT", "New Login Detected", `Logged in from IP: ${ipAddress}`, { ipAddress, deviceInfo });

  res.status(200).json({
    user: { _id: user._id, email: user.email, name: user.name, role: user.role },
    token: accessToken,
  });
});

/* ─── GENERAL AUTH ENDPOINTS ────────────────────────────────────────── */

/**
 * GET /api/v1/auth/me
 */
const getMeController = asyncHandler(async (req, res) => {
  const user = req.user;
  const pinDoc = await transactionPinModel.findOne({ user: user._id });

  res.status(200).json({
    user: {
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      notificationPreferences: user.notificationPreferences,
    },
    hasPinSetup: !!pinDoc,
  });
});

/**
 * POST /api/v1/auth/refresh
 */
const refreshTokenController = asyncHandler(async (req, res) => {
  const rawRefreshToken = req.cookies.refreshToken;

  if (!rawRefreshToken) {
    return res.status(401).json({ message: "Refresh token is missing" });
  }

  const tokenHash = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");

  const storedToken = await RefreshTokenModel.findOne({ tokenHash }).populate("user");

  if (!storedToken) {
    return res.status(401).json({ message: "Refresh token is invalid or has expired" });
  }

  if (storedToken.expiresAt < new Date()) {
    await RefreshTokenModel.deleteOne({ _id: storedToken._id });
    return res.status(401).json({ message: "Refresh token has expired, please log in again" });
  }

  // Block refresh if user was suspended or locked in the meantime
  if (!storedToken.user.isActive) {
    return res.status(403).json({ message: "Account suspended" });
  }

  // Rotate access token
  const newAccessToken = generateAccessToken(storedToken.user._id);
  res.cookie("token", newAccessToken, ACCESS_COOKIE_OPTIONS);

  // Update lastUsedAt
  storedToken.lastUsedAt = new Date();
  storedToken.ipAddress = req.ip || req.connection?.remoteAddress || storedToken.ipAddress;
  await storedToken.save();

  logAudit(req, "TOKEN_REFRESH", { userId: storedToken.user._id });

  res.status(200).json({ token: newAccessToken });
});

/**
 * POST /api/v1/auth/logout
 */
const userLogoutController = asyncHandler(async (req, res) => {
  const accessToken = req.cookies.token || req.headers.authorization?.split(" ")[1];
  const rawRefreshToken = req.cookies.refreshToken;

  if (accessToken) {
    await tokenBlackListModel.create({ token: accessToken }).catch(() => {});
  }

  if (rawRefreshToken) {
    const tokenHash = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");
    await RefreshTokenModel.deleteOne({ tokenHash });
  }

  logAudit(req, "USER_LOGOUT", { userId: req.user?._id });

  res.clearCookie("token", ACCESS_COOKIE_OPTIONS);
  res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);

  res.status(200).json({ message: "User logged out successfully" });
});

/**
 * PATCH /api/v1/auth/change-password
 */
const changePasswordController = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, otp } = req.body;
  const userId = req.user._id;

  // 1. Verify OTP for password change
  const isValidOtp = await otpService.verifyOtp(userId, "CHANGE_PASSWORD", otp);
  if (!isValidOtp) {
    return res.status(401).json({ message: "Invalid or expired OTP for password change" });
  }

  // 2. Fetch user with password select
  const user = await userModel.findById(userId).select("+password");
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return res.status(400).json({ message: "Incorrect current password" });
  }

  // 3. Update password
  user.password = newPassword;
  await user.save();

  logAudit(req, "USER_PASSWORD_CHANGED", { userId });

  // Revoke all active sessions except current if required
  // For safety, let's keep current and delete others
  const rawRefreshToken = req.cookies.refreshToken;
  let tokenHash = "";
  if (rawRefreshToken) {
    tokenHash = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");
  }
  await RefreshTokenModel.deleteMany({ user: userId, tokenHash: { $ne: tokenHash } });

  res.status(200).json({ message: "Password updated successfully" });
});

/**
 * PATCH /api/v1/auth/change-name
 */
const changeNameController = asyncHandler(async (req, res) => {
  const { name, password } = req.body;
  const userId = req.user._id;

  const user = await userModel.findById(userId).select("+password");
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(400).json({ message: "Incorrect password" });
  }

  user.name = name;
  await user.save();

  logAudit(req, "USER_NAME_CHANGED", { userId, newName: name });

  res.status(200).json({
    message: "Name updated successfully",
    user: { _id: user._id, email: user.email, name: user.name, role: user.role },
  });
});

/* ─── PASSWORD RESET ENDPOINTS ──────────────────────────────────────── */

/**
 * POST /api/v1/auth/forgot-password
 */
const sendForgotPasswordOtpController = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await userModel.findOne({ email });
  if (!user) {
    // Don't leak whether user exists or not, standard security practice
    return res.status(200).json({
      message: "If email exists in our system, an OTP has been sent.",
    });
  }

  await otpService.sendOtpEmail(user._id, "FORGOT_PASSWORD");

  logAudit(req, "FORGOT_PASSWORD_REQUESTED", { userId: user._id, email });

  res.status(200).json({
    message: "OTP sent to your email address.",
    userId: user._id,
  });
});

/**
 * POST /api/v1/auth/reset-password
 */
const resetPasswordController = asyncHandler(async (req, res) => {
  const { userId, otp, newPassword } = req.body;

  const user = await userModel.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const isValid = await otpService.verifyOtp(userId, "FORGOT_PASSWORD", otp);
  if (!isValid) {
    return res.status(401).json({ message: "Invalid or expired reset OTP" });
  }

  user.password = newPassword;
  user.loginAttempts = 0;
  user.lockedUntil = null;
  await user.save();

  logAudit(req, "USER_PASSWORD_RESET_SUCCESS", { userId });

  // Revoke all sessions on password reset
  await RefreshTokenModel.deleteMany({ user: userId });

  res.status(200).json({ message: "Password has been reset successfully. Please log in." });
});

/**
 * POST /api/v1/auth/resend-otp
 */
const resendOtpController = asyncHandler(async (req, res) => {
  const { userId, purpose } = req.body;
  const targetUserId = userId || req.user?._id;

  if (!targetUserId) {
    return res.status(400).json({ message: "User ID is required" });
  }

  const user = await userModel.findById(targetUserId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // 60-second cooldown check
  const lastOtp = await otpModel.findOne({ user: targetUserId, purpose }).sort({ createdAt: -1 });
  if (lastOtp && Date.now() - new Date(lastOtp.createdAt).getTime() < 60 * 1000) {
    return res.status(429).json({ message: "Please wait 60 seconds before requesting another OTP" });
  }

  await otpService.sendOtpEmail(targetUserId, purpose);

  logAudit(req, "OTP_RESENT", { userId: targetUserId, purpose });

  res.status(200).json({ message: "OTP resent successfully." });
});

/* ─── TRANSACTION PIN ENDPOINTS ─────────────────────────────────────── */

/**
 * POST /api/v1/auth/pin/setup
 */
const setupPinController = asyncHandler(async (req, res) => {
  const { pin } = req.body;
  const userId = req.user._id;

  // Check if they already have a PIN
  const existingPin = await transactionPinModel.findOne({ user: userId });
  if (existingPin) {
    return res.status(400).json({ message: "Transaction PIN is already set up" });
  }

  await pinService.setupPin(userId, pin);

  logAudit(req, "PIN_SETUP_SUCCESS", { userId });

  res.status(200).json({ message: "Transaction PIN set up successfully" });
});

/**
 * POST /api/v1/auth/pin/verify
 */
const verifyPinController = asyncHandler(async (req, res) => {
  const { pin } = req.body;
  const userId = req.user._id;

  const valid = await pinService.verifyPin(userId, pin);
  if (!valid) {
    return res.status(400).json({ message: "Incorrect transaction PIN", valid: false });
  }

  res.status(200).json({ message: "PIN is valid", valid: true });
});

/**
 * PUT /api/v1/auth/pin/change
 */
const changePinController = asyncHandler(async (req, res) => {
  const { currentPin, newPin, otp } = req.body;
  const userId = req.user._id;

  // 1. Verify OTP
  const isValidOtp = await otpService.verifyOtp(userId, "CHANGE_PIN", otp);
  if (!isValidOtp) {
    return res.status(401).json({ message: "Invalid or expired OTP for PIN change" });
  }

  // 2. Change PIN (validates current PIN)
  await pinService.changePin(userId, currentPin, newPin);

  logAudit(req, "PIN_CHANGED_SUCCESS", { userId });

  res.status(200).json({ message: "Transaction PIN changed successfully" });
});

/**
 * POST /api/v1/auth/pin/send-otp
 */
const sendPinChangeOtpController = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  await otpService.sendOtpEmail(userId, "CHANGE_PIN");

  logAudit(req, "PIN_CHANGE_OTP_SENT", { userId });

  res.status(200).json({ message: "OTP for PIN change sent to your email" });
});

/* ─── SESSION MANAGEMENT ────────────────────────────────────────────── */

/**
 * GET /api/v1/auth/sessions
 */
const listSessionsController = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const sessions = await RefreshTokenModel.find({ user: userId }).select("_id deviceInfo ipAddress lastUsedAt createdAt expiresAt");

  res.status(200).json({ sessions });
});

/**
 * DELETE /api/v1/auth/sessions/:id
 */
const revokeSessionController = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const sessionId = req.params.id;

  const result = await RefreshTokenModel.deleteOne({ _id: sessionId, user: userId });
  if (result.deletedCount === 0) {
    return res.status(404).json({ message: "Session not found or not owned by you" });
  }

  logAudit(req, "SESSION_REVOKED", { userId, revokedSessionId: sessionId });

  res.status(200).json({ message: "Session revoked successfully" });
});

/**
 * DELETE /api/v1/auth/sessions
 */
const revokeAllSessionsController = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Keep the current refresh token if it exists in request
  const rawRefreshToken = req.cookies.refreshToken;
  let tokenHash = "";
  if (rawRefreshToken) {
    tokenHash = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");
  }

  // Revoke all OTHER sessions
  await RefreshTokenModel.deleteMany({ user: userId, tokenHash: { $ne: tokenHash } });

  logAudit(req, "ALL_OTHER_SESSIONS_REVOKED", { userId });

  res.status(200).json({ message: "All other sessions revoked successfully" });
});

/* ─── NOTIFICATION PREFERENCES ──────────────────────────────────────── */

/**
 * PATCH /api/v1/auth/notifications
 */
const updateNotificationPrefsController = asyncHandler(async (req, res) => {
  const { emailOnLogin, emailOnTransaction, emailOnSuspicious } = req.body;
  const userId = req.user._id;

  const user = await userModel.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (emailOnLogin !== undefined) user.notificationPreferences.emailOnLogin = emailOnLogin;
  if (emailOnTransaction !== undefined) user.notificationPreferences.emailOnTransaction = emailOnTransaction;
  if (emailOnSuspicious !== undefined) user.notificationPreferences.emailOnSuspicious = emailOnSuspicious;

  await user.save();

  logAudit(req, "NOTIFICATION_PREFERENCES_UPDATED", { userId });

  res.status(200).json({
    message: "Notification preferences updated successfully",
    notificationPreferences: user.notificationPreferences,
  });
});

module.exports = {
  userRegisterController,
  verifyEmailController,
  userLoginController,
  verifyLoginOtpController,
  getMeController,
  refreshTokenController,
  userLogoutController,
  changePasswordController,
  changeNameController,
  sendForgotPasswordOtpController,
  resetPasswordController,
  resendOtpController,
  setupPinController,
  verifyPinController,
  changePinController,
  sendPinChangeOtpController,
  listSessionsController,
  revokeSessionController,
  revokeAllSessionsController,
  updateNotificationPrefsController,
};
