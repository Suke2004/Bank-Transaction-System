const mongoose = require("mongoose");

const ledgerSchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: [true, "Ledger entry must be associated with an account"],
      index: true,
      immutable: true,
    },

    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [1, "Amount must be at least 1 paise (₹0.01)"],
      immutable: true,
    },

    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      required: [true, "Ledger entry must be associated with a transaction"],
      index: true,
      immutable: true,
    },

    type: {
      type: String,
      enum: {
        values: ["DEBIT", "CREDIT"],
        message: "Ledger type must be either DEBIT or CREDIT",
      },
      required: [true, "Ledger entry type is required"],
      immutable: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

/**
 * Common indexes
 */
ledgerSchema.index({ account: 1, createdAt: -1 });

ledgerSchema.index({ transaction: 1 });

ledgerSchema.index({
  account: 1,
  transaction: 1,
});

ledgerSchema.index({
  transaction: 1,
  account: 1,
  type: 1,
});

/**
 * Prevent document updates
 */
ledgerSchema.pre("save", function () {
  if (!this.isNew) {
    throw new Error("Ledger entries are immutable and cannot be modified");
  }
});

/**
 * Prevent query-based updates/deletes
 */
function preventLedgerMutation() {
  throw new Error("Ledger entries are immutable and cannot be updated or deleted");
}

ledgerSchema.pre("updateOne", preventLedgerMutation);
ledgerSchema.pre("updateMany", preventLedgerMutation);
ledgerSchema.pre("findOneAndUpdate", preventLedgerMutation);
ledgerSchema.pre("replaceOne", preventLedgerMutation);
ledgerSchema.pre("findOneAndReplace", preventLedgerMutation);

ledgerSchema.pre("deleteOne", preventLedgerMutation);
ledgerSchema.pre("deleteMany", preventLedgerMutation);
ledgerSchema.pre("findOneAndDelete", preventLedgerMutation);

/**
 * Optional helper
 */
ledgerSchema.methods.isDebit = function () {
  return this.type === "DEBIT";
};

ledgerSchema.methods.isCredit = function () {
  return this.type === "CREDIT";
};

const LedgerModel = mongoose.model("Ledger", ledgerSchema);

module.exports = LedgerModel;
