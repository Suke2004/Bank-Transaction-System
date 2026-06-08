require('dotenv').config();
const nodemailer = require('nodemailer');

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
transporter.verify((error, success) => {
  if (error) {
    console.error('Error connecting to email server:', error);
  } else {
    console.log('Email server is ready to send messages');
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

    console.log('Message sent: %s', info.messageId);
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

const sendRegistrationEmail = async (userEmail, name) => {
    const subject = 'Welcome to Banking Ledger!';
    const text = `Hi ${name},\n\nThank you for registering with Banking Ledger! We're excited to have you on board.\n\nBest regards,\nThe Banking Ledger Team`;
    const html = `<p>Hi ${name},</p><p>Thank you for registering with <b>Banking Ledger</b>! We're excited to have you on board.</p><p>Best regards,<br>The Banking Ledger Team</p>`;
    
    await sendEmail(userEmail, subject, text, html);
}

const sendLoginEmail = async (userEmail, name) => {
  const subject = "Welcome to Banking Ledger!";
  const text = `Hi ${name},\n\nYou have successfully logged in to your Banking Ledger account.\n\nBest regards,\nThe Banking Ledger Team`;
  const html = `<p>Hi ${name},</p><p>You have successfully logged in to your <b>Banking Ledger</b> account.</p><p>Best regards,<br>The Banking Ledger Team</p>`;
  await sendEmail(userEmail, subject, text, html);
};

module.exports = {
  sendRegistrationEmail,
  sendLoginEmail
};