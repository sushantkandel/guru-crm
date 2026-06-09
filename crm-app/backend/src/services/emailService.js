const nodemailer = require('nodemailer');
const { APP_NAME } = require('../config/branding');

let transporter = null;

function isSmtpConfigured() {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  return Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

function getTransporter() {
  if (transporter) return transporter;

  if (!isSmtpConfigured()) {
    return null;
  }

  const port = Number(process.env.SMTP_PORT) || 587;
  const secure =
    process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === '1' || port === 465;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    ...(secure
      ? {}
      : {
          requireTLS: true,
        }),
  });

  return transporter;
}

async function sendPasswordResetEmail(to, resetUrl) {
  const transport = getTransporter();
  if (!transport) {
    throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS on the server.');
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await transport.sendMail({
    from,
    to,
    subject: `Reset your ${APP_NAME} password`,
    html: `
      <h2>Password Reset</h2>
      <p>You requested a password reset for your ${APP_NAME} account.</p>
      <p><a href="${resetUrl}">Click here to reset your password</a></p>
      <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
      <p style="color:#666;font-size:12px;">${resetUrl}</p>
    `,
    text: `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour.`,
  });
}

module.exports = { sendPasswordResetEmail, getTransporter, isSmtpConfigured };
