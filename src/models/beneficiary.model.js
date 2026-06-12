const mongoose = require("mongoose");

const beneficiarySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, "Beneficiary name is required"],
      maxLength: [100, "Beneficiary name cannot exceed 100 characters"],
      trim: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "account",
      required: [true, "Beneficiary account is required"],
    },
    note: {
      type: String,
      maxLength: [200, "Note cannot exceed 200 characters"],
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// Compound unique constraint to avoid adding the same account multiple times for a user
beneficiarySchema.index({ user: 1, accountId: 1 }, { unique: true });

const beneficiaryModel = mongoose.model("beneficiary", beneficiarySchema);

module.exports = beneficiaryModel;
