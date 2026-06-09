const crypto = require("crypto");
const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const emailService = require("../services/email.service");
const tokenBlackListModel = require("../models/blackList.model");
const RefreshTokenModel = require("../models/refreshToken.model");
const asyncHandler = require("../utils/asyncHandler");
const logAudit = require("../utils/audit");
const logger = require("../utils/logger");

/* ─────────────────────────────────────────────────────────────────────────
   TOKEN CONFIGURATION
   
   Access token: 15 minutes — short enough that a stolen token has minimal window.
   Refresh token: 7 days — used only to mint new access tokens.
   
   This is the industry-standard dual-token pattern used at HSBC, Stripe, etc.
   ───────────────────────────────────────────────────────────────────────── */

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 15 * 60 * 1000, // 15 minutes in ms
};

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: REFRESH_TOKEN_EXPIRY_MS,
};

/* ─────────────────────────────────────────────────────────────────────────
   INTERNAL HELPERS
   ───────────────────────────────────────────────────────────────────────── */

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
 *
 * @param {string} userId
 * @returns {string} rawToken — put this in the httpOnly cookie
 */
async function generateAndStoreRefreshToken(userId) {
  const rawToken = crypto.randomBytes(64).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  await RefreshTokenModel.create({
    tokenHash,
    user: userId,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
  });

  return rawToken;
}

/**
 * Issue both tokens and set both cookies in one call.
 * Used by login and register.
 */
async function issueTokens(res, userId) {
  const accessToken = generateAccessToken(userId);
  const refreshToken = await generateAndStoreRefreshToken(userId);

  res.cookie("token", accessToken, ACCESS_COOKIE_OPTIONS);
  res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);

  return { accessToken, refreshToken };
}

/* ─────────────────────────────────────────────────────────────────────────
   CONTROLLERS
   ───────────────────────────────────────────────────────────────────────── */

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

  const user = await userModel.create({ email, password, name });

  const { accessToken } = await issueTokens(res, user._id);

  logAudit(req, "USER_REGISTER", { userId: user._id, email: user.email });

  res.status(201).json({
    user: { _id: user._id, email: user.email, name: user.name },
    token: accessToken,
  });

  emailService.sendRegistrationEmail(user.email, user.name).catch((err) => {
    logger.error("Failed to send registration email", {
      userId: user._id,
      error: err.message,
    });
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

  const isValidPassword = await user.comparePassword(password);
  if (!isValidPassword) {
    return res.status(401).json({ message: "Email or password is INVALID" });
  }

  const { accessToken } = await issueTokens(res, user._id);

  logAudit(req, "USER_LOGIN", { userId: user._id, email: user.email });

  res.status(200).json({
    user: { _id: user._id, email: user.email, name: user.name },
    token: accessToken,
  });
});

/**
 * POST /api/v1/auth/refresh
 *
 * Client sends the refresh token cookie → server validates → issues new access token.
 * The refresh token itself is NOT rotated here for simplicity, but in a high-security
 * system you would issue a new refresh token on each use (refresh token rotation).
 */
const refreshTokenController = asyncHandler(async (req, res) => {
  const rawRefreshToken = req.cookies.refreshToken;

  if (!rawRefreshToken) {
    return res.status(401).json({ message: "Refresh token is missing" });
  }

  // Hash the incoming raw token to look it up in DB
  const tokenHash = crypto
    .createHash("sha256")
    .update(rawRefreshToken)
    .digest("hex");

  const storedToken = await RefreshTokenModel.findOne({ tokenHash }).populate(
    "user"
  );

  if (!storedToken) {
    return res.status(401).json({
      message: "Refresh token is invalid or has expired",
    });
  }

  if (storedToken.expiresAt < new Date()) {
    await RefreshTokenModel.deleteOne({ _id: storedToken._id });
    return res.status(401).json({ message: "Refresh token has expired, please log in again" });
  }

  const newAccessToken = generateAccessToken(storedToken.user._id);
  res.cookie("token", newAccessToken, ACCESS_COOKIE_OPTIONS);

  logAudit(req, "TOKEN_REFRESH", { userId: storedToken.user._id });

  res.status(200).json({ token: newAccessToken });
});

/**
 * POST /api/v1/auth/logout
 * Blacklists the access token + deletes the refresh token from DB.
 */
const userLogoutController = asyncHandler(async (req, res) => {
  const accessToken =
    req.cookies.token || req.headers.authorization?.split(" ")[1];
  const rawRefreshToken = req.cookies.refreshToken;

  // Blacklist the access token (even if it expires in 15min, prevent reuse)
  if (accessToken) {
    await tokenBlackListModel.create({ token: accessToken }).catch(() => {
      // Already blacklisted — that's fine
    });
  }

  // Delete the refresh token from DB
  if (rawRefreshToken) {
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawRefreshToken)
      .digest("hex");
    await RefreshTokenModel.deleteOne({ tokenHash });
  }

  logAudit(req, "USER_LOGOUT", { userId: req.user?._id });

  res.clearCookie("token", ACCESS_COOKIE_OPTIONS);
  res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);

  res.status(200).json({ message: "User logged out successfully" });
});

module.exports = {
  userRegisterController,
  userLoginController,
  refreshTokenController,
  userLogoutController,
};
