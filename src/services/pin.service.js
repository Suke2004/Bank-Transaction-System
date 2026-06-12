const argon2 = require("argon2");
const transactionPinModel = require("../models/transactionPin.model");

const ARGON2_CONFIG = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

/**
 * Validates that the PIN is exactly 6 digits
 */
const validatePinFormat = (pin) => {
  return typeof pin === "string" && /^\d{6}$/.test(pin);
};

/**
 * Sets up a new 6-digit transaction PIN for a user
 */
const setupPin = async (userId, rawPin) => {
  if (!validatePinFormat(rawPin)) {
    const err = new Error("PIN must be a 6-digit numeric string");
    err.status = 400;
    throw err;
  }

  const pinHash = await argon2.hash(rawPin, ARGON2_CONFIG);

  await transactionPinModel.findOneAndUpdate(
    { user: userId },
    {
      pinHash,
      failedAttempts: 0,
      lockedUntil: null,
      lastChangedAt: new Date(),
    },
    { upsert: true, new: true },
  );
};

/**
 * Verifies a user's transaction PIN. Handles lockout logic.
 * Returns true on success, false on mismatch, or throws if locked out.
 */
const verifyPin = async (userId, rawPin) => {
  if (!rawPin) return false;

  const pinDoc = await transactionPinModel.findOne({ user: userId });
  if (!pinDoc) {
    const err = new Error("Transaction PIN not set up");
    err.status = 404;
    throw err;
  }

  // Check lockout status
  if (pinDoc.lockedUntil && pinDoc.lockedUntil > new Date()) {
    const err = new Error(
      `PIN is locked due to multiple failed attempts. Try again after ${pinDoc.lockedUntil.toLocaleString()}`,
    );
    err.status = 423; // Locked
    throw err;
  }

  try {
    const match = await argon2.verify(pinDoc.pinHash, rawPin);
    if (match) {
      // Success: Reset failed attempts
      pinDoc.failedAttempts = 0;
      pinDoc.lockedUntil = null;
      await pinDoc.save();
      return true;
    } else {
      // Failure: Increment attempts
      pinDoc.failedAttempts += 1;
      if (pinDoc.failedAttempts >= 3) {
        // Lock for 15 minutes
        pinDoc.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await pinDoc.save();
      return false;
    }
  } catch (error) {
    // If argon2 errors out, return false
    return false;
  }
};

/**
 * Changes a user's PIN after verifying the current PIN
 */
const changePin = async (userId, currentPin, newPin) => {
  const pinDoc = await transactionPinModel.findOne({ user: userId });
  if (!pinDoc) {
    const err = new Error("Transaction PIN not set up");
    err.status = 404;
    throw err;
  }

  // Verify current PIN first (this handles lockout as well)
  const isMatch = await verifyPin(userId, currentPin);
  if (!isMatch) {
    const err = new Error("Incorrect current transaction PIN");
    err.status = 400;
    throw err;
  }

  if (!validatePinFormat(newPin)) {
    const err = new Error("New PIN must be a 6-digit numeric string");
    err.status = 400;
    throw err;
  }

  const pinHash = await argon2.hash(newPin, ARGON2_CONFIG);
  pinDoc.pinHash = pinHash;
  pinDoc.failedAttempts = 0;
  pinDoc.lockedUntil = null;
  pinDoc.lastChangedAt = new Date();
  await pinDoc.save();
};

module.exports = {
  setupPin,
  verifyPin,
  changePin,
  validatePinFormat,
};
