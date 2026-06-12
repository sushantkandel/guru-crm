const prisma = require('../config/prisma');
const { getCustomerBalances } = require('./balanceService');
const { auditInclude } = require('../utils/audit');

const customerListSelect = {
  id: true,
  name: true,
  shopName: true,
  phone: true,
};

const customerPaymentSelect = {
  ...customerListSelect,
  addresses: {
    where: { isPrimary: true },
    take: 1,
    select: {
      province: true,
      district: true,
      municipality: true,
      ward: true,
    },
  },
};

function buildCustomerFilter(query, user) {
  const {
    shop_name,
    customer_name,
    phone,
    province,
    district,
    municipality,
    ward,
    product_id,
  } = query;

  const AND = [];

  if (user.role === 'staff') {
    AND.push({ assignedTo: user.id });
  }

  if (shop_name) {
    AND.push({ shopName: { contains: shop_name } });
  }

  if (customer_name) {
    AND.push({ name: { contains: customer_name } });
  }

  if (phone) {
    AND.push({ phone: { contains: phone.replace(/\s+/g, '') } });
  }

  const addressFilter = {};
  if (province) addressFilter.province = province;
  if (district) addressFilter.district = district;
  if (municipality) addressFilter.municipality = municipality;
  if (ward) addressFilter.ward = ward;
  if (Object.keys(addressFilter).length > 0) {
    AND.push({ addresses: { some: addressFilter } });
  }

  if (product_id) {
    AND.push({
      orders: {
        some: {
          status: { not: 'cancelled' },
          items: { some: { productId: product_id } },
        },
      },
    });
  }

  if (AND.length === 0) return {};
  return { AND };
}

function buildPaymentWhere(query, user, companyId) {
  const { payment_type, customer_id, status } = query;
  const where = { companyId, AND: [] };

  if (customer_id) where.AND.push({ customerId: customer_id });
  if (payment_type) where.AND.push({ paymentType: payment_type });
  if (status) where.AND.push({ status });

  const customerFilter = buildCustomerFilter(query, user);
  if (customerFilter.AND) {
    where.AND.push({ customer: customerFilter });
  }

  if (where.AND.length === 0) delete where.AND;

  return where;
}

async function listPayments(query, user, companyId) {
  const payments = await prisma.payment.findMany({
    where: buildPaymentWhere(query, user, companyId),
    include: {
      customer: { select: customerPaymentSelect },
      order: { select: { id: true, totalAmount: true } },
      ...auditInclude,
    },
    orderBy: { paymentDate: 'desc' },
  });

  return payments;
}

async function listOutstanding(query, user, companyId) {
  const customerFilter = buildCustomerFilter(query, user);
  const where = { companyId, ...customerFilter };

  const customers = await prisma.customer.findMany({
    where,
    select: customerListSelect,
  });

  const balances = await getCustomerBalances(customers.map((c) => c.id));

  return customers
    .map((c) => ({
      ...c,
      balance: balances[c.id],
    }))
    .filter((c) => c.balance.remaining > 0)
    .sort((a, b) => b.balance.remaining - a.balance.remaining);
}

module.exports = {
  buildCustomerFilter,
  buildPaymentWhere,
  listPayments,
  listOutstanding,
};
