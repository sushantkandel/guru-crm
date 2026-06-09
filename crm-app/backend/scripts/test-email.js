/**
 * Test password-reset email delivery (uses .env or Render env vars).
 *
 * Usage:
 *   node scripts/test-email.js recipient@example.com
 */
require('dotenv').config();
const { buildPasswordResetUrl } = require('../src/config/frontendUrl');
const { sendPasswordResetEmail, isEmailConfigured } = require('../src/services/emailService');

async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error('Usage: node scripts/test-email.js <recipient-email>');
    process.exit(1);
  }

  if (!isEmailConfigured()) {
    console.error('No email provider configured. Set on Render or in .env:');
    console.error('  RESEND_API_KEY (+ optional RESEND_FROM)');
    console.error('  OR SMTP_HOST, SMTP_USER, SMTP_PASS');
    process.exit(1);
  }

  const provider = process.env.RESEND_API_KEY ? 'Resend' : 'SMTP';
  console.log(`Sending test reset email via ${provider} to ${to}...`);

  await sendPasswordResetEmail(to, buildPasswordResetUrl('test-token-only'));
  console.log('Email sent successfully.');
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
