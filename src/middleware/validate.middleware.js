/**
 * validate.middleware.js — Request validation for all routes.
 *
 * PAISE CONVERSION:
 * amount fields accept decimal rupees from the client (e.g. 100.50).
 * After validation passes, we convert to integer paise (10050) using
 * rupeesToPaise() and replace req.body.amount in-place.
 * Controllers always receive and store paise — never raw floats.
 */

const { body, param, validationResult } = require("express-validator");
const mongoose = require("mongoose");
const { rupeesToPaise } = require("../utils/currency");

/**
 * Runs accumulated validation rules and returns 422 if any fail.
 */
const runValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: "error",
      message: "Validation failed",
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

/**
 * Validates a string is a valid MongoDB ObjectId.
 */
const isObjectId = (value) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new Error("Must be a valid ID");
  }
  return true;
};

/**
 * After validating amount as a positive float (rupees),
 * convert it to integer paise in req.body for downstream use.
 */
const convertAmountToPaise = (req, res, next) => {
  if (req.body.amount !== undefined) {
    req.body.amount = rupeesToPaise(req.body.amount);
  }
  next();
};

/* ─── Auth ────────────────────────────────────────────────────────────── */

const validateRegister = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Must be a valid email address")
    .normalizeEmail(),
  body("name")
    .trim()
    .notEmpty().withMessage("Name is required")
    .isLength({ min: 2, max: 100 }).withMessage("Name must be between 2 and 100 characters"),
  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 6 }).withMessage("Password must be at least 6 characters")
    .matches(/\d/).withMessage("Password must contain at least one number"),
  runValidation,
];

const validateLogin = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Must be a valid email address")
    .normalizeEmail(),
  body("password")
    .notEmpty().withMessage("Password is required"),
  runValidation,
];

/* ─── Transactions ────────────────────────────────────────────────────── */

const amountRules = body("amount")
  .notEmpty().withMessage("amount is required")
  .isFloat({ gt: 0 }).withMessage("amount must be a positive number greater than 0")
  .custom((value) => {
    // Allow max 2 decimal places (paise precision)
    if (!/^\d+(\.\d{1,2})?$/.test(String(value))) {
      throw new Error("amount must have at most 2 decimal places");
    }
    return true;
  })
  .toFloat();

const validateCreateTransaction = [
  body("fromAccount")
    .notEmpty().withMessage("fromAccount is required")
    .custom(isObjectId),
  body("toAccount")
    .notEmpty().withMessage("toAccount is required")
    .custom(isObjectId)
    .custom((value, { req }) => {
      if (value === req.body.fromAccount) {
        throw new Error("fromAccount and toAccount must be different");
      }
      return true;
    }),
  amountRules,
  body("idempotencyKey")
    .trim()
    .notEmpty().withMessage("idempotencyKey is required")
    .isLength({ min: 8, max: 128 }).withMessage("idempotencyKey must be 8–128 characters"),
  body("pin")
    .notEmpty().withMessage("Transaction PIN is required")
    .isLength({ min: 6, max: 6 }).withMessage("PIN must be exactly 6 digits")
    .isNumeric().withMessage("PIN must contain only numbers"),
  body("description")
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage("Description cannot exceed 200 characters"),
  body("otpToken")
    .optional()
    .trim()
    .isLength({ min: 6, max: 6 }).withMessage("OTP must be exactly 6 digits")
    .isNumeric().withMessage("OTP must contain only numbers"),
  runValidation,
  convertAmountToPaise,  // runs only if validation passes
];

const validateInitialFunds = [
  body("toAccount")
    .notEmpty().withMessage("toAccount is required")
    .custom(isObjectId),
  amountRules,
  body("idempotencyKey")
    .trim()
    .notEmpty().withMessage("idempotencyKey is required")
    .isLength({ min: 8, max: 128 }).withMessage("idempotencyKey must be 8–128 characters"),
  runValidation,
  convertAmountToPaise,
];

/* ─── Params ──────────────────────────────────────────────────────────── */

const validateAccountId = [
  param("accountId")
    .notEmpty().withMessage("accountId param is required")
    .custom(isObjectId),
  runValidation,
];

const validateTransactionId = [
  param("id")
    .notEmpty().withMessage("Transaction ID is required")
    .custom(isObjectId),
  runValidation,
];

/* ─── New Security / Feature Validators ──────────────────────────────── */

const validateOtp = [
  body("otp")
    .notEmpty().withMessage("OTP is required")
    .isLength({ min: 6, max: 6 }).withMessage("OTP must be exactly 6 digits")
    .isNumeric().withMessage("OTP must contain only numbers"),
  body("purpose")
    .notEmpty().withMessage("Purpose is required")
    .isIn([
      "LOGIN",
      "REGISTER",
      "FORGOT_PASSWORD",
      "CHANGE_PASSWORD",
      "CHANGE_PIN",
      "ADD_BENEFICIARY",
      "CLOSE_ACCOUNT",
      "HIGH_VALUE_TRANSFER",
    ]).withMessage("Invalid OTP purpose"),
  runValidation,
];

const validatePin = [
  body("pin")
    .notEmpty().withMessage("PIN is required")
    .isLength({ min: 6, max: 6 }).withMessage("PIN must be exactly 6 digits")
    .isNumeric().withMessage("PIN must contain only numbers"),
  runValidation,
];

const validateChangePin = [
  body("currentPin")
    .notEmpty().withMessage("Current PIN is required")
    .isLength({ min: 6, max: 6 }).withMessage("Current PIN must be exactly 6 digits")
    .isNumeric().withMessage("Current PIN must contain only numbers"),
  body("newPin")
    .notEmpty().withMessage("New PIN is required")
    .isLength({ min: 6, max: 6 }).withMessage("New PIN must be exactly 6 digits")
    .isNumeric().withMessage("New PIN must contain only numbers"),
  runValidation,
];

const validateBeneficiary = [
  body("name")
    .trim()
    .notEmpty().withMessage("Beneficiary name is required")
    .isLength({ min: 2, max: 100 }).withMessage("Name must be between 2 and 100 characters"),
  body("accountId")
    .notEmpty().withMessage("Account ID is required")
    .custom(isObjectId),
  body("note")
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage("Note cannot exceed 200 characters"),
  runValidation,
];

const validateAccountNickname = [
  body("nickname")
    .trim()
    .notEmpty().withMessage("Nickname is required")
    .isLength({ max: 50 }).withMessage("Nickname cannot exceed 50 characters"),
  runValidation,
];

const validateDateRange = [
  body("from")
    .optional()
    .isISO8601().withMessage("From date must be a valid ISO8601 date string"),
  body("to")
    .optional()
    .isISO8601().withMessage("To date must be a valid ISO8601 date string")
    .custom((value, { req }) => {
      if (value && req.body.from && new Date(value) < new Date(req.body.from)) {
        throw new Error("To date cannot be earlier than From date");
      }
      return true;
    }),
  runValidation,
];

const validateSystemConfig = [
  body("key")
    .trim()
    .notEmpty().withMessage("Config key is required"),
  body("value")
    .notEmpty().withMessage("Config value is required"),
  runValidation,
];

module.exports = {
  validateRegister,
  validateLogin,
  validateCreateTransaction,
  validateInitialFunds,
  validateAccountId,
  validateTransactionId,
  validateOtp,
  validatePin,
  validateChangePin,
  validateBeneficiary,
  validateAccountNickname,
  validateDateRange,
  validateSystemConfig,
};
