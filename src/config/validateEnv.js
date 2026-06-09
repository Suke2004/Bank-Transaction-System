/**
 * validateEnv.js — Fail-fast environment variable validation.
 *
 * A production-grade application MUST refuse to start when critical
 * configuration is missing. Silent degradation in Fintech is unacceptable
 * (e.g., server starting without a JWT_SECRET would accept any token).
 *
 * Call this before the Express app boots.
 */
const logger = require("../utils/logger");

const REQUIRED_ENV = [
  "MONGO_URI",
  "JWT_SECRET",
  "REFRESH_TOKEN_SECRET",
  "PORT",
];

const JWT_MIN_SECRET_LENGTH = 32;

function validateEnv() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(", ")}`);
    logger.error("Server cannot start without these variables. Exiting.");
    process.exit(1);
    return; // Guard for test environments where process.exit is mocked
  }

  // JWT secret entropy check
  if (process.env.JWT_SECRET.length < JWT_MIN_SECRET_LENGTH) {
    logger.error(
      `JWT_SECRET is too short (${process.env.JWT_SECRET.length} chars). ` +
        `Minimum required: ${JWT_MIN_SECRET_LENGTH} characters.`
    );
    process.exit(1);
  }

  logger.info("Environment variables validated successfully.");
}

module.exports = validateEnv;
