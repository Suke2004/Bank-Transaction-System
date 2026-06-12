const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.EMAIL_USER,
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    refreshToken: process.env.REFRESH_TOKEN,
  },
});

// Verify the connection configuration
transporter.verify((error) => {
  if (error) {
    logger.error('Error connecting to email server', { error: error.message });
  } else {
    logger.info('Email server is ready to send messages');
  }
});

// Function to send email
const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Banking Ledger" <${process.env.EMAIL_USER}>`, // sender address
      to, // list of receivers
      subject, // Subject line
      text, // plain text body
      html, // html body
    });

    logger.info('Email sent', { messageId: info.messageId });
  } catch (error) {
    logger.error('Error sending email', { error: error.message });
    // Don't crash the server if email fails (especially in test/dev envs without credentials)
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
  }
};

const sendRegistrationEmail = async (userEmail, name) => {
  const subject = 'Welcome to Banking Ledger!';
  const text = `Hi ${name},\n\nThank you for registering with Banking Ledger! We're excited to have you on board.\n\nBest regards,\nThe Banking Ledger Team`;
  const html = `<p>Hi ${name},</p><p>Thank you for registering with <b>Banking Ledger</b>! We're excited to have you on board.</p><p>Best regards,<br>The Banking Ledger Team</p>`;
  await sendEmail(userEmail, subject, text, html);
};

const sendLoginEmail = async (userEmail, name) => {
  const subject = "Welcome to Banking Ledger!";
  const text = `Hi ${name},\n\nYou have successfully logged in to your Banking Ledger account.\n\nBest regards,\nThe Banking Ledger Team`;
  const html = `<p>Hi ${name},</p><p>You have successfully logged in to your <b>Banking Ledger</b> account.</p><p>Best regards,<br>The Banking Ledger Team</p>`;
  await sendEmail(userEmail, subject, text, html);
};

const sendOtpEmail = async (to, name, otp, purpose) => {
  const subjectMap = {
    LOGIN: "Your Bank Ledger login OTP",
    REGISTER: "Verify your Bank Ledger account",
    FORGOT_PASSWORD: "Reset your Bank Ledger password",
    CHANGE_PASSWORD: "Bank Ledger password change OTP",
    CHANGE_PIN: "Bank Ledger PIN change OTP",
    ADD_BENEFICIARY: "Confirm adding beneficiary",
    CLOSE_ACCOUNT: "Confirm account closure",
    HIGH_VALUE_TRANSFER: "Confirm high-value transfer",
  };

  const subject = subjectMap[purpose] || "Bank Ledger Verification Code";
  const text = `Hi ${name},\n\nYour 6-digit OTP for ${purpose.replace(/_/g, ' ')} is: ${otp}\n\nThis code will expire in 10 minutes. If you did not request this, please secure your account immediately.\n\nBest regards,\nThe Banking Ledger Team`;
  const html = `<p>Hi ${name},</p><p>Your 6-digit OTP for <b>${purpose.replace(/_/g, ' ')}</b> is:</p><h2 style="font-size: 24px; letter-spacing: 2px; color: #1E6FEA;">${otp}</h2><p>This code will expire in 10 minutes. If you did not request this, please secure your account immediately.</p><p>Best regards,<br>The Banking Ledger Team</p>`;
  
  await sendEmail(to, subject, text, html);
};

const sendLoginAlertEmail = async (to, name, ipAddress, device) => {
  const subject = "New login to your Bank Ledger account";
  const time = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const text = `Hi ${name},\n\nWe detected a new login to your account.\nTime: ${time}\nIP: ${ipAddress}\nDevice: ${device}\n\nIf this was not you, please contact security immediately.\n\nBest regards,\nThe Banking Ledger Team`;
  const html = `<p>Hi ${name},</p><p>We detected a new login to your account.</p><ul><li><b>Time:</b> ${time}</li><li><b>IP Address:</b> ${ipAddress}</li><li><b>Device:</b> ${device}</li></ul><p>If this was not you, please contact security immediately.</p><p>Best regards,<br>The Banking Ledger Team</p>`;
  
  await sendEmail(to, subject, text, html);
};

const sendAccountLockedEmail = async (to, name, lockMinutes) => {
  const subject = "Your Bank Ledger account has been locked";
  const text = `Hi ${name},\n\nYour account has been temporarily locked for ${lockMinutes} minutes due to multiple failed login attempts.\n\nIf you need assistance, please contact support.\n\nBest regards,\nThe Banking Ledger Team`;
  const html = `<p>Hi ${name},</p><p>Your account has been temporarily locked for <b>${lockMinutes} minutes</b> due to multiple failed login attempts.</p><p>If you need assistance, please contact support.</p><p>Best regards,<br>The Banking Ledger Team</p>`;
  
  await sendEmail(to, subject, text, html);
};

const sendAccountFrozenEmail = async (to, name, accountId, reason) => {
  const subject = "Your Bank Ledger account has been frozen";
  const text = `Hi ${name},\n\nYour account ID ${accountId} has been frozen by the bank.\nReason: ${reason}\n\nPlease contact branch support for assistance.\n\nBest regards,\nThe Banking Ledger Team`;
  const html = `<p>Hi ${name},</p><p>Your account ID <b>${accountId}</b> has been frozen by the bank.</p><p><b>Reason:</b> ${reason}</p><p>Please contact branch support for assistance.</p><p>Best regards,<br>The Banking Ledger Team</p>`;
  
  await sendEmail(to, subject, text, html);
};

const sendTransferSentEmail = async (to, name, amount, toAccount, txId) => {
  const subject = "Transaction Alert: Transfer Sent";
  const text = `Hi ${name},\n\nYou have successfully sent ₹${(amount / 100).toFixed(2)} to account ${toAccount}.\nTransaction ID: ${txId}\n\nBest regards,\nThe Banking Ledger Team`;
  const html = `<p>Hi ${name},</p><p>You have successfully sent <b>₹${(amount / 100).toFixed(2)}</b> to account <b>${toAccount}</b>.</p><p><b>Transaction ID:</b> ${txId}</p><p>Best regards,<br>The Banking Ledger Team</p>`;
  await sendEmail(to, subject, text, html);
};

const sendTransferReceivedEmail = async (to, name, amount, fromAccount, txId) => {
  const subject = "Transaction Alert: Transfer Received";
  const text = `Hi ${name},\n\nYou have received ₹${(amount / 100).toFixed(2)} from account ${fromAccount}.\nTransaction ID: ${txId}\n\nBest regards,\nThe Banking Ledger Team`;
  const html = `<p>Hi ${name},</p><p>You have received <b>₹${(amount / 100).toFixed(2)}</b> from account <b>${fromAccount}</b>.</p><p><b>Transaction ID:</b> ${txId}</p><p>Best regards,<br>The Banking Ledger Team</p>`;
  await sendEmail(to, subject, text, html);
};

const sendTransactionReversedEmail = async (to, name, amount, txId) => {
  const subject = "Transaction Alert: Reversed";
  const text = `Hi ${name},\n\nYour transaction of ₹${(amount / 100).toFixed(2)} (ID: ${txId}) has been reversed by the bank.\n\nBest regards,\nThe Banking Ledger Team`;
  const html = `<p>Hi ${name},</p><p>Your transaction of <b>₹${(amount / 100).toFixed(2)}</b> (ID: <b>${txId}</b>) has been reversed by the bank.</p><p>Best regards,<br>The Banking Ledger Team</p>`;
  await sendEmail(to, subject, text, html);
};

const sendTransactionFailureEmail = async (userEmail, name, amount, toUserAccount) => {
  const subject = "Transaction Alert: Unsuccessful";
  const text = `Hi ${name},\n\nWe regret to inform you that your transaction of amount ₹${(amount / 100).toFixed(2)} to account ${toUserAccount} was unsuccessful.\n\nBest regards,\nThe Banking Ledger Team`;
  const html = `<p>Hi ${name},</p><p>We regret to inform you that your transaction of amount <b>₹${(amount / 100).toFixed(2)}</b> to account <b>${toUserAccount}</b> was unsuccessful.</p><p>Best regards,<br>The Banking Ledger Team</p>`;
  await sendEmail(userEmail, subject, text, html);
};

module.exports = {
  sendRegistrationEmail,
  sendLoginEmail,
  sendOtpEmail,
  sendLoginAlertEmail,
  sendAccountLockedEmail,
  sendAccountFrozenEmail,
  sendTransferSentEmail,
  sendTransferReceivedEmail,
  sendTransactionReversedEmail,
  sendTransactionFailureEmail,
};