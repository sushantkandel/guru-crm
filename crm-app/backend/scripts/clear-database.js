/**
 * Delete ALL rows from every CRM table. Schema/migrations are kept.
 *
 * Usage:
 *   node scripts/clear-database.js --confirm
 *
 * Requires DATABASE_URL in .env (Neon / production).
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const TABLES = [
  'delete_requests',
  'password_reset_tokens',
  'order_items',
  'payments',
  'orders',
  'addresses',
  'customers',
  'products',
  'users',
  'companies',
];

async function main() {
  if (!process.argv.includes('--confirm')) {
    console.error('This permanently deletes all CRM data.');
    console.error('Usage: node scripts/clear-database.js --confirm');
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }

  const host = dbUrl.replace(/:[^:@/]+@/, ':****@');
  console.log(`Clearing all data in: ${host}`);

  const quoted = TABLES.map((t) => `"${t}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE;`);

  console.log('All tables cleared.');
  console.log('Tables emptied:', TABLES.join(', '));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
