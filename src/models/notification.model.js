const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "LOGIN_ALERT",
        "TRANSFER_SENT",
        "TRANSFER_RECEIVED",
        "ACCOUNT_FROZEN",
        "ACCOUNT_UNFROZEN",
        "SUSPICIOUS_ACTIVITY",
        "OTP_SENT",
        "PIN_LOCKED",
        "ACCOUNT_LOCKED",
        "TRANSACTION_REVERSED",
        "TRANSACTION_FLAGGED",
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// TTL index to automatically remove notifications after 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Compound index for fast queries of user notifications
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

const notificationModel = mongoose.model("notification", notificationSchema);

module.exports = notificationModel;
