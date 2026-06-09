const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const emailService = require("../services/email.service");
const tokenBlackListModel = require("../models/blackList.model");
const asyncHandler = require("../utils/asyncHandler");
const logger = require("../utils/logger");

/**
 * Secure cookie options.
 *
 * Original: res.cookie("token", token) — NO flags set.
 * This means the cookie is readable by JavaScript (XSS risk) and
 * sent over plain HTTP connections.
 *
 * Fixed:
 *  - httpOnly: true  → JavaScript cannot access this cookie (XSS protection)
 *  - secure: true    → only sent over HTTPS (in production)
 *  - sameSite: strict → not sent in cross-site requests (CSRF protection)
 */
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 3 * 24 * 60 * 60 * 1000, // 3 days in ms — matches JWT expiry
};

/**
 * - user register controller
 * - POST /api/auth/register
 */
const userRegisterController = asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;

  const isExists = await userModel.findOne({
    email: email,
  });

  if (isExists) {
    return res.status(422).json({
      message: "User already exists with email.",
      status: "failed",
    });
  }

  const user = await userModel.create({
    email,
    password,
    name,
  });

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "3d",
  });

  res.cookie("token", token, COOKIE_OPTIONS);

  // Send response FIRST, then fire-and-forget the email.
  // Email errors are caught and logged — they must not fail the registration.
  res.status(201).json({
    user: {
      _id: user._id,
      email: user.email,
      name: user.name,
    },
    token,
  });

  // Fire-and-forget: email failure must not affect the HTTP response
  emailService.sendRegistrationEmail(user.email, user.name).catch((err) => {
    logger.error("Failed to send registration email", {
      userId: user._id,
      error: err.message,
    });
  });
});

/**
 * - User Login Controller
 * - POST /api/auth/login
 */
const userLoginController = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await userModel.findOne({ email }).select("+password");

  if (!user) {
    return res.status(401).json({
      message: "Email or password is INVALID",
    });
  }

  const isValidPassword = await user.comparePassword(password);

  if (!isValidPassword) {
    return res.status(401).json({
      message: "Email or password is INVALID",
    });
  }

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "3d",
  });

  res.cookie("token", token, COOKIE_OPTIONS);

  res.status(200).json({
    user: {
      _id: user._id,
      email: user.email,
      name: user.name,
    },
    token,
  });
});

/**
 * - User Logout Controller
 * - POST /api/auth/logout
 */
const userLogoutController = asyncHandler(async (req, res) => {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(200).json({
      message: "User logged out successfully",
    });
  }

  await tokenBlackListModel.create({
    token: token,
  });

  res.clearCookie("token", COOKIE_OPTIONS);

  res.status(200).json({
    message: "User logged out successfully",
  });
});

module.exports = {
  userRegisterController,
  userLoginController,
  userLogoutController,
};
