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

  const ownerHash = await bcrypt.hash('admin123', 10);
  const owner = await prisma.user.upsert({
    where: { email: 'admin@crm.com' },
    update: { role: 'owner', companyId: company.id },
    create: {
      name: 'Owner User',
      email: 'admin@crm.com',
      passwordHash: ownerHash,
      role: 'owner',
      companyId: company.id,
    },
  });

  const staffHash = await bcrypt.hash('sales123', 10);
  const staff = await prisma.user.upsert({
    where: { email: 'sales@crm.com' },
    update: { role: 'staff', companyId: company.id },
    create: {
      name: 'Staff Rep',
      email: 'sales@crm.com',
      passwordHash: staffHash,
      role: 'staff',
      companyId: company.id,
    },
  });

  const products = [
    { name: 'Product A', defaultUnit: 'packet', defaultPrice: 500 },
    { name: 'Product B', defaultUnit: 'bundle', defaultPrice: 1000 },
    { name: 'Product C', defaultUnit: 'bag', defaultPrice: 2500 },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { companyId_name: { companyId: company.id, name: p.name } },
      update: {},
      create: { companyId: company.id, ...p },
    });
  }

  const existingCustomer = await prisma.customer.findFirst({
    where: { companyId: company.id, phone: '9800000001' },
  });

  if (!existingCustomer) {
    const productA = await prisma.product.findFirst({
      where: { companyId: company.id, name: 'Product A' },
    });
    const productB = await prisma.product.findFirst({
      where: { companyId: company.id, name: 'Product B' },
    });
    const productC = await prisma.product.findFirst({
      where: { companyId: company.id, name: 'Product C' },
    });

    const customer = await prisma.customer.create({
      data: {
        companyId: company.id,
        name: 'Ram Sharma',
        phone: '9800000001',
        email: 'ram@shop.com',
        shopName: 'Sharma General Store',
        panVatNumber: '123456789',
        businessStatus: 'converted',
        assignedTo: staff.id,
        createdBy: staff.id,
        updatedBy: staff.id,
        addresses: {
          create: {
            province: 'Bagmati Province',
            district: 'Kathmandu',
            municipality: 'Kathmandu Metropolitan City',
            ward: '5',
            street: 'Main Road 12',
            latitude: 27.6886,
            longitude: 85.3483,
            isPrimary: true,
          },
        },
      },
    });

    const order = await prisma.order.create({
      data: {
        companyId: company.id,
        customerId: customer.id,
        orderDate: new Date('2026-05-01'),
        status: 'confirmed',
        totalAmount: 15000,
        createdBy: staff.id,
        updatedBy: staff.id,
        items: {
          create: [
            {
              productId: productA?.id,
              productName: 'Product A',
              quantity: 10,
              unit: 'packet',
              unitPrice: 500,
              lineTotal: 5000,
            },
            {
              productId: productB?.id,
              productName: 'Product B',
              quantity: 5,
              unit: 'bundle',
              unitPrice: 1000,
              lineTotal: 5000,
            },
            {
              productId: productC?.id,
              productName: 'Product C',
              quantity: 2,
              unit: 'bag',
              unitPrice: 2500,
              lineTotal: 5000,
            },
          ],
        },
      },
    });

    await prisma.payment.create({
      data: {
        companyId: company.id,
        customerId: customer.id,
        orderId: order.id,
        paymentType: 'cash',
        amount: 10000,
        paymentDate: new Date('2026-05-02'),
        status: 'completed',
        createdBy: staff.id,
        updatedBy: staff.id,
      },
    });

    await prisma.payment.create({
      data: {
        companyId: company.id,
        customerId: customer.id,
        orderId: order.id,
        paymentType: 'credit',
        amount: 5000,
        paymentDate: new Date('2026-05-02'),
        status: 'pending',
        creditDueDate: new Date('2026-07-01'),
        createdBy: staff.id,
        updatedBy: staff.id,
      },
    });

    await prisma.customer.create({
      data: {
        companyId: company.id,
        name: 'Sita Thapa',
        phone: '9800000002',
        shopName: 'Thapa Mart',
        businessStatus: 'not_converted',
        assignedTo: staff.id,
        createdBy: staff.id,
        updatedBy: staff.id,
        addresses: {
          create: {
            province: 'Bagmati Province',
            district: 'Lalitpur',
            municipality: 'Lalitpur Metropolitan City',
            ward: '3',
            street: 'Ring Road',
            latitude: 27.6768,
            longitude: 85.3169,
            isPrimary: true,
          },
        },
      },
    });
  }

  console.log('Seed complete.');
  console.log('Owner: admin@crm.com / admin123');
  console.log('Staff: sales@crm.com / sales123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
