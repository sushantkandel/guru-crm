const nodemailer = require('nodemailer');
const { APP_NAME } = require('../config/branding');

let transporter = null;

/** Trim whitespace and optional quotes from Render / .env values */
function env(key) {
  const raw = process.env[key];
  if (raw == null || raw === '') return undefined;
  return raw.trim().replace(/^["']|["']$/g, '');
}

function isBrevoApiConfigured() {
  return Boolean(env('BREVO_API_KEY'));
}

function isSmtpConfigured() {
  return Boolean(env('SMTP_HOST') && env('SMTP_USER') && env('SMTP_PASS'));
}

function parseFromAddress(fromStr, fallbackEmail) {
  const raw = fromStr || fallbackEmail || '';
  const match = raw.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() };
  }
  if (raw.includes('@')) {
    return { name: APP_NAME, email: raw };
  }
  return { name: APP_NAME, email: fallbackEmail };
}

function getTransporter() {
  if (transporter) return transporter;

  if (!isSmtpConfigured()) {
    return null;
  }

  const port = Number(env('SMTP_PORT')) || 587;
  const secure =
    env('SMTP_SECURE') === 'true' || env('SMTP_SECURE') === '1' || port === 465;

  transporter = nodemailer.createTransport({
    host: env('SMTP_HOST'),
    port,
    secure,
    auth: {
      user: env('SMTP_USER'),
      pass: env('SMTP_PASS'),
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    ...(secure ? {} : { requireTLS: true }),
  });

  return transporter;
}

const EMAIL_SEND_TIMEOUT_MS = 20_000;

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

async function sendViaBrevoApi(to, resetUrl) {
  const apiKey = env('BREVO_API_KEY');
  const fromRaw = env('BREVO_FROM') || env('SMTP_FROM');
  const sender = parseFromAddress(fromRaw, env('SMTP_USER'));
  const content = buildResetMailContent(resetUrl);

  let response;
  try {
    response = await withTimeout(
      fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender,
          to: [{ email: to }],
          subject: content.subject,
          htmlContent: content.html,
          textContent: content.text,
        }),
      }),
      EMAIL_SEND_TIMEOUT_MS,
      'Brevo API timed out',
    );
  } catch (err) {
    const msg = err.message || '';
    if (/timed out/i.test(msg)) {
      throw new Error('Brevo API timed out. Check BREVO_API_KEY on Render.');
    }
    throw new Error(`Brevo request failed: ${msg}`);
  }

  if (!response.ok) {
    const body = await response.text();
    let detail = body;
    try {
      const parsed = JSON.parse(body);
      detail = parsed.message || parsed.error || body;
    } catch {
      // keep raw body
    }

    const hint = String(detail).toLowerCase();
    if (response.status === 401 || hint.includes('api key') || hint.includes('unauthorized')) {
      throw new Error('Brevo API key is invalid. Use the v3 API key from Brevo → SMTP & API → API keys.');
    }
    if (hint.includes('sender') || hint.includes('not verified')) {
      throw new Error(
        `Brevo sender not verified. Verify ${sender.email} in Brevo → Senders. Detail: ${detail}`,
      );
    }
    throw new Error(`Brevo error: ${detail}`);
  }
}

async function sendViaResend(to, resetUrl) {
  const apiKey = env('RESEND_API_KEY');
  if (!apiKey?.startsWith('re_')) {
    throw new Error('RESEND_API_KEY must start with re_. Check the key on Render (no quotes or spaces).');
  }

  const from = env('RESEND_FROM') || `Guru CRM <onboarding@resend.dev>`;
  const content = buildResetMailContent(resetUrl);

  let response;
  try {
    response = await withTimeout(
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
      EMAIL_SEND_TIMEOUT_MS,
      'Resend API timed out',
    );
  } catch (err) {
    throw new Error(`Resend request failed: ${err.message}`);
  }

  if (!response.ok) {
    const body = await response.text();
    let detail = body;
    try {
      const parsed = JSON.parse(body);
      detail = parsed.message || parsed.error || body;
    } catch {
      // keep raw body
    }

    const hint = String(detail).toLowerCase();
    if (hint.includes('api key') || response.status === 401) {
      throw new Error('Resend API key is invalid. Check RESEND_API_KEY on Render.');
    }
    if (hint.includes('only send') || hint.includes('testing') || hint.includes('verify a domain')) {
      throw new Error(
        `Resend rejected this recipient. Free tier only allows your Resend account email. Detail: ${detail}`,
      );
    }
    if (hint.includes('from') || hint.includes('sender')) {
      throw new Error('Invalid RESEND_FROM address. Use: Guru CRM <onboarding@resend.dev>');
    }
    throw new Error(`Resend error: ${detail}`);
  }
}

async function sendPasswordResetEmail(to, resetUrl) {
  const content = buildResetMailContent(resetUrl);

  // Brevo HTTP API — works on Render free tier (SMTP ports 587/465 are blocked there)
  if (isBrevoApiConfigured()) {
    await sendViaBrevoApi(to, resetUrl);
    return;
  }

  const transport = getTransporter();
  if (transport) {
    const from = env('SMTP_FROM') || env('SMTP_USER');
    await withTimeout(
      transport.sendMail({
        from,
        to,
        subject: content.subject,
        html: content.html,
        text: content.text,
      }),
      EMAIL_SEND_TIMEOUT_MS,
      'SMTP connection timed out. On Render free tier use BREVO_API_KEY instead of SMTP.',
    );
    return;
  }

  if (env('RESEND_API_KEY')) {
    await sendViaResend(to, resetUrl);
    return;
  }

  throw new Error(
    'Email is not configured. On Render set BREVO_API_KEY (see BREVO_SETUP.md).',
  );
}

function isEmailConfigured() {
  return isBrevoApiConfigured() || isSmtpConfigured() || Boolean(env('RESEND_API_KEY'));
}

function getEmailProvider() {
  if (isBrevoApiConfigured()) return 'brevo';
  if (isSmtpConfigured()) {
    const host = env('SMTP_HOST') || '';
    if (host.includes('brevo.com')) return 'brevo-smtp';
    return 'smtp';
  }
  if (env('RESEND_API_KEY')) return 'resend';
  return 'none';
}

module.exports = {
  sendPasswordResetEmail,
  getTransporter,
  isSmtpConfigured,
  isEmailConfigured,
  getEmailProvider,
};
