/**
 * audit.js — Fire-and-forget audit logging helper
 *
 * Usage in controllers:
 *   logAudit(req, "USER_LOGIN", { email: user.email });
 *
 * Errors are swallowed and logged via Winston — an audit failure must NEVER
 * fail the main request. In a production system this would be a queue write
 * (BullMQ/SQS) so audit logs survive even if MongoDB is temporarily down.
 */
const { AuditLogModel } = require("../models/auditLog.model");
const logger = require("./logger");

/**
 * @param {import('express').Request} req
 * @param {string} action   One of AUDIT_ACTIONS
 * @param {object} metadata Additional context specific to the action
 */
function logAudit(req, action, metadata = {}) {
  const entry = {
    userId: req.user?._id || null,
    action,
    metadata,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers["user-agent"],
    requestId: req.id,
  };

  AuditLogModel.create(entry).catch((err) => {
    logger.error("Failed to write audit log", {
      action,
      requestId: req.id,
      error: err.message,
    });
  });
}

module.exports = logAudit;
