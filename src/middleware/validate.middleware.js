/**
 * validate.middleware.js — Request body/param/query validation middleware.
 *
 * Uses express-validator. Each exported function is a middleware array:
 * [validationRules..., runValidation]
 *
 * In Fintech, never trust client input. Every field must be validated for:
 *  - presence (required)
 *  - type (string vs number)
 *  - range (amount > 0)
 *  - business rules (fromAccount !== toAccount)
 */

const { body, param, validationResult } = require("express-validator");
const mongoose = require("mongoose");

/**
 * Runs the accumulated validation rules and returns 422 if any fail.
 * Must be the LAST middleware in each route validation array.
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
 * Custom validator: checks if a string is a valid MongoDB ObjectId
 */
const isObjectId = (value) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new Error("Must be a valid account ID");
  }
  return true;
};

/* ─── Auth Validators ─────────────────────────────────────────────────── */

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

/* ─── Transaction Validators ──────────────────────────────────────────── */

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
  body("amount")
    .notEmpty().withMessage("amount is required")
    .isFloat({ gt: 0 }).withMessage("amount must be a positive number greater than 0")
    .toFloat(),
  body("idempotencyKey")
    .trim()
    .notEmpty().withMessage("idempotencyKey is required")
    .isLength({ min: 8, max: 128 }).withMessage("idempotencyKey must be between 8 and 128 characters"),
  runValidation,
];

const validateInitialFunds = [
  body("toAccount")
    .notEmpty().withMessage("toAccount is required")
    .custom(isObjectId),
  body("amount")
    .notEmpty().withMessage("amount is required")
    .isFloat({ gt: 0 }).withMessage("amount must be a positive number greater than 0")
    .toFloat(),
  body("idempotencyKey")
    .trim()
    .notEmpty().withMessage("idempotencyKey is required")
    .isLength({ min: 8, max: 128 }).withMessage("idempotencyKey must be between 8 and 128 characters"),
  runValidation,
];

/* ─── Account Validators ──────────────────────────────────────────────── */

const validateAccountId = [
  param("accountId")
    .notEmpty().withMessage("accountId param is required")
    .custom(isObjectId),
  runValidation,
];

module.exports = {
  validateRegister,
  validateLogin,
  validateCreateTransaction,
  validateInitialFunds,
  validateAccountId,
};
