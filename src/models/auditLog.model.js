const mongoose = require("mongoose");

/**
 * auditLog.model.js — Immutable audit trail
 *
 * In regulated financial environments (PCI-DSS, RBI guidelines, SOX),
 * every sensitive action must be logged in an append-only, tamper-evident log.
 * This is not optional — it's required for compliance and forensic investigation.
 *
 * Design decisions:
 * - Immutable: same hooks as ledger.model.js — updates/deletes throw errors
 * - TTL: 90 days default (configurable via AUDIT_LOG_RETENTION_DAYS)
 * - metadata: Mixed type — flexible enough to store context per action type
 * - ip + userAgent: required for forensic analysis after a breach
 * - requestId: links to the Morgan/Winston HTTP log for the same request
 */

const AUDIT_ACTIONS = [
  "USER_REGISTER",
  "USER_LOGIN",
  "USER_LOGOUT",
  "TOKEN_REFRESH",
  "ACCOUNT_CREATED",
  "TRANSACTION_INITIATED",
  "TRANSACTION_COMPLETED",
  "TRANSACTION_FAILED",
  "INITIAL_FUNDS_ADDED",
];

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      index: true,
      // nullable for failed login attempts where user may not exist
    },
    action: {
      type: String,
      required: [true, "Audit action is required"],
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ip: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    requestId: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound index for efficient queries: "all transactions for user X"
auditLogSchema.index({ userId: 1, action: 1, createdAt: -1 });

// Auto-delete after retention period (default 90 days)
const RETENTION_SECONDS =
  parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || "90") * 24 * 60 * 60;
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: RETENTION_SECONDS });

auditLogSchema.pre("save", function () {
  if (!this.isNew) {
    throw new Error("Audit log entries are immutable and cannot be modified");
  }
});

function preventMutation() {
  throw new Error("Audit log entries are immutable and cannot be updated or deleted");
}

auditLogSchema.pre("updateOne", preventMutation);
auditLogSchema.pre("updateMany", preventMutation);
auditLogSchema.pre("findOneAndUpdate", preventMutation);
auditLogSchema.pre("deleteOne", preventMutation);
auditLogSchema.pre("deleteMany", preventMutation);
auditLogSchema.pre("findOneAndDelete", preventMutation);

const AuditLogModel = mongoose.model("auditLog", auditLogSchema);

module.exports = { AuditLogModel, AUDIT_ACTIONS };
