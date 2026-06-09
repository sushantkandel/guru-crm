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
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    ...(secure ? {} : { requireTLS: true }),
  });

  return transporter;
}

const SMTP_SEND_TIMEOUT_MS = 20_000;

function buildResetMailContent(resetUrl) {
  return {
    subject: `Reset your ${APP_NAME} password`,
    html: `
      <h2>Password Reset</h2>
      <p>You requested a password reset for your ${APP_NAME} account.</p>
      <p><a href="${resetUrl}">Click here to reset your password</a></p>
      <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
      <p style="color:#666;font-size:12px;">${resetUrl}</p>
    `,
    text: `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour.`,
  };
}

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

async function sendViaResend(to, resetUrl) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || process.env.SMTP_FROM || `Guru CRM <onboarding@resend.dev>`;
  const content = buildResetMailContent(resetUrl);

  const response = await withTimeout(
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: content.subject,
        html: content.html,
        text: content.text,
      }),
    }),
    SMTP_SEND_TIMEOUT_MS,
    'Email API timed out',
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Email API failed (${response.status}): ${body}`);
  }
}

async function sendPasswordResetEmail(to, resetUrl) {
  const content = buildResetMailContent(resetUrl);

  if (process.env.RESEND_API_KEY) {
    await sendViaResend(to, resetUrl);
    return;
  }

  const transport = getTransporter();
  if (!transport) {
    throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS on the server.');
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await withTimeout(
    transport.sendMail({
      from,
      to,
      subject: content.subject,
      html: content.html,
      text: content.text,
    }),
    SMTP_SEND_TIMEOUT_MS,
    'SMTP server timed out. Gmail SMTP may be blocked from this host — try Resend (RESEND_API_KEY) instead.',
  );
}

function isEmailConfigured() {
  return isSmtpConfigured() || Boolean(process.env.RESEND_API_KEY);
}

module.exports = {
  sendPasswordResetEmail,
  getTransporter,
  isSmtpConfigured,
  isEmailConfigured,
};
