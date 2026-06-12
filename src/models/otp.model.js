const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: [
        "LOGIN",
        "REGISTER",
        "FORGOT_PASSWORD",
        "CHANGE_PASSWORD",
        "CHANGE_PIN",
        "ADD_BENEFICIARY",
        "CLOSE_ACCOUNT",
        "HIGH_VALUE_TRANSFER",
      ],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    used: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// TTL index to automatically remove expired documents
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for fast queries by user and purpose
otpSchema.index({ user: 1, purpose: 1 });

const otpModel = mongoose.model("otp", otpSchema);

module.exports = otpModel;
