const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.upsert({
    where: { slug: 'demo-company' },
    update: {
      country: 'Nepal',
      province: 'Bagmati Province',
      district: 'Kathmandu',
      municipality: 'Kathmandu Metropolitan City',
      street: 'Baneshwor Main Road',
    },
    create: {
      name: 'Demo Company',
      slug: 'demo-company',
      phone: '9800000000',
      country: 'Nepal',
      province: 'Bagmati Province',
      district: 'Kathmandu',
      municipality: 'Kathmandu Metropolitan City',
      street: 'Baneshwor Main Road',
    },
  });

  const defaultPassword = 'Andray@36616';
  const ownerHash = await bcrypt.hash(defaultPassword, 10);
  const owner = await prisma.user.upsert({
    where: { email: 'admin@crm.com' },
    update: { role: 'owner', companyId: company.id, passwordHash: ownerHash },
    create: {
      name: 'Owner User',
      email: 'admin@crm.com',
      passwordHash: ownerHash,
      role: 'owner',
      companyId: company.id,
    },
  });

  const staffHash = await bcrypt.hash(defaultPassword, 10);
  const staff = await prisma.user.upsert({
    where: { email: 'sales@crm.com' },
    update: { role: 'staff', companyId: company.id, passwordHash: staffHash },
    create: {
      name: 'Staff Rep',
      email: 'sales@crm.com',
      passwordHash: staffHash,
      role: 'staff',
      companyId: company.id,
    },
  });

  console.log('Seed complete (company + users only; no demo customers/orders).');
  console.log(`Owner: admin@crm.com / ${defaultPassword}`);
  console.log(`Staff: sales@crm.com / ${defaultPassword}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
