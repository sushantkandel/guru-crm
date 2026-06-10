/**
 * Verify SMTP settings (uses DATABASE_URL / .env from crm-app/backend).
 *
 * Usage:
 *   node scripts/test-smtp.js your-email@example.com
 */
require('dotenv').config();
const { getTransporter, isSmtpConfigured } = require('../src/services/emailService');

async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error('Usage: node scripts/test-smtp.js <recipient-email>');
    process.exit(1);
  }

  if (!isSmtpConfigured()) {
    console.error('SMTP is not configured. Set these in .env or Render:');
    console.error('  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS');
    console.error('  Optional: SMTP_FROM');
    process.exit(1);
  }

  const transport = getTransporter();
  await transport.verify();
  console.log('SMTP connection OK');

  await transport.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: 'Sales Guru SMTP test',
    text: 'If you received this, SMTP is working.',
  });

  console.log(`Test email sent to ${to}`);
}

main().catch((err) => {
  console.error('SMTP test failed:', err.message);
  process.exit(1);
});
