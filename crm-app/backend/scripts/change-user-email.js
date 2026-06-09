/**
 * Change a user's login email (production Neon via DATABASE_URL in .env).
 *
 * Usage:
 *   node scripts/change-user-email.js admin@crm.com peaceandray@gmail.com
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const fromEmail = process.argv[2];
  const toEmail = process.argv[3];

  if (!fromEmail || !toEmail) {
    console.error('Usage: node scripts/change-user-email.js <current-email> <new-email>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email: fromEmail } });
  if (!user) {
    console.error(`No user found: ${fromEmail}`);
    process.exit(1);
  }

  const taken = await prisma.user.findUnique({ where: { email: toEmail } });
  if (taken) {
    console.error(`Email already in use: ${toEmail}`);
    process.exit(1);
  }

  await prisma.user.update({
    where: { email: fromEmail },
    data: { email: toEmail },
  });

  console.log(`Updated ${fromEmail} → ${toEmail}`);
  console.log('You can now sign in and use forgot-password with the new email (if it matches your Resend account).');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
