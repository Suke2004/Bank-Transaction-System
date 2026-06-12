const crypto = require("crypto");
const otpModel = require("../models/otp.model");
const userModel = require("../models/user.model");
const emailService = require("./email.service");

// Hash helper using SHA-256
const hashOtp = (otp) => {
  return crypto.createHash("sha256").update(otp).digest("hex");
};

/**
 * Generates a random 6-digit OTP, deletes any active OTPs for this user and purpose,
 * hashes the new OTP, stores it in the database, and returns the raw OTP.
 */
const generateAndStoreOtp = async (userId, purpose) => {
  // Generate 6-digit code
  const rawOtp = crypto.randomInt(100000, 999999).toString();
  const otpHash = hashOtp(rawOtp);

  // Delete previous active OTPs for the user and purpose to prevent token pile-up
  await otpModel.deleteMany({ user: userId, purpose });

  // Default TTL is 10 minutes
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await otpModel.create({
    user: userId,
    otpHash,
    purpose,
    expiresAt,
    attempts: 0,
    used: false,
  });

  return rawOtp;
};

/**
 * Verifies the raw OTP against the hashed value in the database.
 * Increments attempts. Returns boolean.
 */
const verifyOtp = async (userId, purpose, rawOtp) => {
  if (!rawOtp) return false;

  const otpDoc = await otpModel.findOne({
    user: userId,
    purpose,
    used: false,
    expiresAt: { $gt: new Date() },
  });

  if (!otpDoc) return false;

  // Increment attempts
  otpDoc.attempts += 1;
  await otpDoc.save();

  if (otpDoc.attempts > 3) {
    // Too many attempts, invalidating
    otpDoc.used = true; // effectively invalidates it
    await otpDoc.save();
    return false;
  }

  const matches = otpDoc.otpHash === hashOtp(rawOtp);
  if (matches) {
    otpDoc.used = true;
    await otpDoc.save();
    return true;
  }

  return false;
};

/**
 * Generates an OTP and sends it to the user's email
 */
const sendOtpEmail = async (userId, purpose) => {
  const user = await userModel.findById(userId);
  if (!user) throw new Error("User not found");

  const rawOtp = await generateAndStoreOtp(userId, purpose);
  await emailService.sendOtpEmail(user.email, user.name, rawOtp, purpose);
};

module.exports = {
  generateAndStoreOtp,
  verifyOtp,
  sendOtpEmail,
  hashOtp,
};
