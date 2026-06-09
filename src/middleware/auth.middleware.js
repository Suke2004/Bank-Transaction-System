/**
 * auth.middleware.js — JWT authentication and role-based access control.
 *
 * Changes from original:
 *  1. Extracted shared token-verification logic into a private helper
 *     to eliminate 90% code duplication between the two middleware functions
 *  2. Wrapped with asyncHandler so DB errors propagate to the global handler
 *  3. Cookie flags on token reading remain unchanged (set on write side)
 *
 * NOTE: The original controller logic and response shapes are preserved exactly.
 */
const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const tokenBlackListModel = require("../models/blackList.model");
const asyncHandler = require("../utils/asyncHandler");

/**
 * Shared core: verifies token signature, checks blacklist, loads user.
 * Returns the user document or throws (will be caught by asyncHandler).
 *
 * @param {string} token  Raw JWT string
 * @param {object} selectExtra  Additional mongoose select options (e.g. "+systemUser")
 */
async function verifyAndLoadUser(token, selectExtra = "") {
  const isBlacklisted = await tokenBlackListModel.findOne({ token });
  if (isBlacklisted) {
    const err = new Error("Unauthorized access, token is invalid");
    err.statusCode = 401;
    throw err;
  }

  // jwt.verify throws JsonWebTokenError / TokenExpiredError on failure
  // — these are caught by the global error handler in errorHandler.middleware.js
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const query = userModel.findById(decoded.userId);
  if (selectExtra) query.select(selectExtra);

  const user = await query;
  if (!user) {
    const err = new Error("Unauthorized access, user not found");
    err.statusCode = 401;
    throw err;
  }
  return user;
}

/**
 * Standard user authentication guard.
 * Populates req.user with the authenticated user document.
 */
const authMiddleware = asyncHandler(async (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized access, token is missing",
    });
  }

  req.user = await verifyAndLoadUser(token);
  return next();
});

/**
 * System-user authentication guard.
 * Same as authMiddleware but additionally enforces the systemUser flag.
 */
const authSystemUserMiddleware = asyncHandler(async (req, res, next) => {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized access, token is missing",
    });
  }

  const user = await verifyAndLoadUser(token, "+systemUser");

  if (!user.systemUser) {
    return res.status(403).json({
      message: "Forbidden access, not a system user",
    });
  }

  req.user = user;
  return next();
});

module.exports = {
  authMiddleware,
  authSystemUserMiddleware,
};
