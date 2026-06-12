const notificationModel = require("../models/notification.model");
const userModel = require("../models/user.model");
const emailService = require("./email.service");
const logger = require("../utils/logger");

/**
 * Creates a notification in the database and optionally sends an email based on user preferences.
 */
const createNotification = async (userId, type, title, body, metadata = null) => {
  try {
    // 1. Create notification in database
    const notification = await notificationModel.create({
      user: userId,
      type,
      title,
      body,
      metadata,
    });

    // 2. Fetch user to check email notification preferences
    const user = await userModel.findById(userId);
    if (!user) {
      logger.warn(`Notification user not found: ${userId}`);
      return notification;
    }

    const prefs = user.notificationPreferences || {
      emailOnLogin: true,
      emailOnTransaction: true,
      emailOnSuspicious: true,
    };

    // 3. Send email according to type and user preferences
    let shouldEmail = false;
    if (type === "LOGIN_ALERT" && prefs.emailOnLogin) {
      shouldEmail = true;
    } else if (["TRANSFER_SENT", "TRANSFER_RECEIVED"].includes(type) && prefs.emailOnTransaction) {
      shouldEmail = true;
    } else if (
      [
        "ACCOUNT_FROZEN",
        "ACCOUNT_UNFROZEN",
        "SUSPICIOUS_ACTIVITY",
        "PIN_LOCKED",
        "ACCOUNT_LOCKED",
        "TRANSACTION_REVERSED",
        "TRANSACTION_FLAGGED",
      ].includes(type) &&
      prefs.emailOnSuspicious
    ) {
      shouldEmail = true;
    }

    if (shouldEmail) {
      // Fire-and-forget email sending
      (async () => {
        try {
          switch (type) {
            case "LOGIN_ALERT":
              await emailService.sendLoginAlertEmail(
                user.email,
                user.name,
                metadata?.ipAddress || "Unknown IP",
                metadata?.deviceInfo || "Unknown Device",
              );
              break;
            case "TRANSFER_SENT":
              await emailService.sendTransferSentEmail(
                user.email,
                user.name,
                metadata?.amount || 0,
                metadata?.toAccount || "Unknown",
                metadata?.txId || "Unknown",
              );
              break;
            case "TRANSFER_RECEIVED":
              await emailService.sendTransferReceivedEmail(
                user.email,
                user.name,
                metadata?.amount || 0,
                metadata?.fromAccount || "Unknown",
                metadata?.txId || "Unknown",
              );
              break;
            case "ACCOUNT_FROZEN":
              await emailService.sendAccountFrozenEmail(
                user.email,
                user.name,
                metadata?.accountId || "Unknown",
                metadata?.reason || "No reason specified",
              );
              break;
            case "ACCOUNT_LOCKED":
              await emailService.sendAccountLockedEmail(user.email, user.name, metadata?.lockMinutes || 30);
              break;
            case "TRANSACTION_REVERSED":
              await emailService.sendTransactionReversedEmail(
                user.email,
                user.name,
                metadata?.amount || 0,
                metadata?.txId || "Unknown",
              );
              break;
            default:
              // For other alerts, we can send a generic notification email
              // if required, but these cover the major requirements
              break;
          }
        } catch (mailErr) {
          logger.error("Error sending email from notification service", { error: mailErr.message });
        }
      })();
    }

    return notification;
  } catch (error) {
    logger.error("Error creating notification", { error: error.message });
    // Don't crash if notification creation fails
  }
};

// Pre-built notification helpers
const notifyTransferSent = async (userId, amount, toAccount, txId) => {
  const formattedAmount = (amount / 100).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
  });
  await createNotification(
    userId,
    "TRANSFER_SENT",
    "Transfer Sent Successfully",
    `You have successfully transferred ${formattedAmount} to account ${toAccount}.`,
    { amount, toAccount, txId },
  );
};

const notifyTransferReceived = async (userId, amount, fromAccount, txId) => {
  const formattedAmount = (amount / 100).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
  });
  await createNotification(
    userId,
    "TRANSFER_RECEIVED",
    "Funds Received",
    `You have received a transfer of ${formattedAmount} from account ${fromAccount}.`,
    { amount, fromAccount, txId },
  );
};

const notifyAccountFrozen = async (userId, accountId, reason) => {
  await createNotification(
    userId,
    "ACCOUNT_FROZEN",
    "Account Frozen",
    `Your account ID ${accountId} has been frozen. Reason: ${reason}`,
    { accountId, reason },
  );
};

const notifyLoginAlert = async (userId, ipAddress, deviceInfo) => {
  await createNotification(
    userId,
    "LOGIN_ALERT",
    "New Login Detected",
    `We detected a new login to your account from IP ${ipAddress} on ${deviceInfo}.`,
    { ipAddress, deviceInfo },
  );
};

const notifySuspiciousActivity = async (userId, txId) => {
  await createNotification(
    userId,
    "SUSPICIOUS_ACTIVITY",
    "Suspicious Activity Warning",
    `Suspicious activity warning on transaction ID ${txId}. Please review immediately.`,
    { txId },
  );
};

module.exports = {
  createNotification,
  notifyTransferSent,
  notifyTransferReceived,
  notifyAccountFrozen,
  notifyLoginAlert,
  notifySuspiciousActivity,
};
