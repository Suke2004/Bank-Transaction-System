/**
 * errorHandler.middleware.js — Global Express error handler.
 *
 * In a production Fintech system, we MUST:
 *  1. Never leak internal error details (stack traces) to the client
 *  2. Always log the full error server-side for debugging
 *  3. Return consistent, structured error responses
 *  4. Handle known error types (Mongoose, JWT, Validation) with proper codes
 *
 * This must be registered LAST in app.js (after all routes).
 */
const logger = require("../utils/logger");

function errorHandler(err, req, res, next) {
  // Log the full error internally (never send to client)
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    requestId: req.id,
  });

  // Mongoose Validation Error (e.g. schema-level required fields)
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(422).json({
      status: "error",
      message: "Validation failed",
      errors,
    });
  }

  // Mongoose Duplicate Key Error (e.g. unique email, unique idempotency key)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      status: "error",
      message: `A record with this ${field} already exists`,
    });
  }

  // Mongoose Cast Error (e.g. invalid ObjectId format passed in a route)
  if (err.name === "CastError") {
    return res.status(400).json({
      status: "error",
      message: `Invalid value for field: ${err.path}`,
    });
  }

  // JWT errors — don't leak which check failed
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({
      status: "error",
      message: "Unauthorized access, token is invalid or expired",
    });
  }

  // Generic fallback — never expose internals in production
  const statusCode = err.statusCode || err.status || 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "An internal server error occurred"
      : err.message;

  return res.status(statusCode).json({
    status: "error",
    message,
  });
}

module.exports = errorHandler;
