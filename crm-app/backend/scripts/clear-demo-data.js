/**
 * Remove demo business data (customers, orders, payments, products) but keep
 * companies and user accounts.
 *
 * Usage:
 *   node scripts/clear-demo-data.js --confirm
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const BUSINESS_TABLES = [
  'delete_requests',
  'order_items',
  'payments',
  'orders',
  'addresses',
  'customers',
  'products',
];

async function main() {
  if (!process.argv.includes('--confirm')) {
    console.error('This permanently deletes customers, orders, payments, and products.');
    console.error('Usage: node scripts/clear-demo-data.js --confirm');
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const host = dbUrl.replace(/:[^:@/]+@/, ':****@');
  console.log(`Clearing business data in: ${host}`);

  const quoted = BUSINESS_TABLES.map((t) => `"${t}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE;`);

  console.log('Business data cleared. Companies and users were kept.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
