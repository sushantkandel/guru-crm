const prisma = require('../config/prisma');
const { getCustomerBalances } = require('./balanceService');
const { auditInclude } = require('../utils/audit');

function buildCustomerWhere(query, user, companyId) {
  const {
    q,
    province,
    district,
    municipality,
    ward,
    assigned_to,
    has_remaining_payment,
    has_pending_orders,
    not_ordered_from,
    not_ordered_to,
    business_status,
  } = query;

  const where = { AND: [{ companyId }] };

  if (user.role === 'staff') {
    where.AND.push({ assignedTo: user.id });
  } else if (assigned_to) {
    where.AND.push({ assignedTo: assigned_to });
  }

  if (q) {
    where.AND.push({
      OR: [
        { name: { contains: q } },
        { phone: { contains: q } },
        { shopName: { contains: q } },
        { email: { contains: q } },
        { panVatNumber: { contains: q } },
        {
          addresses: {
            some: {
              OR: [
                { province: { contains: q } },
                { district: { contains: q } },
                { municipality: { contains: q } },
                { street: { contains: q } },
              ],
            },
          },
        },
      ],
    });
  }

  const addressFilter = {};
  if (province) addressFilter.province = province;
  if (district) addressFilter.district = district;
  if (municipality) addressFilter.municipality = municipality;
  if (ward) addressFilter.ward = ward;
  if (Object.keys(addressFilter).length > 0) {
    where.AND.push({ addresses: { some: addressFilter } });
  }

  if (has_pending_orders === 'true') {
    where.AND.push({ orders: { some: { status: 'pending' } } });
  }

  if (['converted', 'not_converted', 'just_visited'].includes(business_status)) {
    where.AND.push({ businessStatus: business_status });
  }

  if (not_ordered_from && not_ordered_to) {
    where.AND.push({
      NOT: {
        orders: {
          some: {
            orderDate: {
              gte: new Date(not_ordered_from),
              lte: new Date(not_ordered_to),
            },
            status: { not: 'cancelled' },
          },
        },
      },
    });
  }

  return { where, hasRemainingPayment: has_remaining_payment === 'true' };
}

async function listCustomers(query, user, companyId) {
  const { where, hasRemainingPayment } = buildCustomerWhere(query, user, companyId);

  let customers = await prisma.customer.findMany({
    where,
    include: {
      addresses: { where: { isPrimary: true }, take: 1 },
      assignee: { select: { id: true, name: true, email: true } },
      ...auditInclude,
      orders: {
        where: { status: 'pending' },
        select: { id: true },
      },
      _count: { select: { orders: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const balances = await getCustomerBalances(customers.map((c) => c.id));

  let result = customers.map((c) => {
    const balance = balances[c.id] || { totalOrders: 0, totalPaid: 0, remaining: 0 };
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      shopName: c.shopName,
      panVatNumber: c.panVatNumber,
      businessStatus: c.businessStatus,
      assignedTo: c.assignedTo,
      assignee: c.assignee,
      address: c.addresses[0] || null,
      pendingOrderCount: c.orders.length,
      orderCount: c._count.orders,
      balance,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      creator: c.creator,
      updater: c.updater,
    };
  });

  if (hasRemainingPayment) {
    result = result.filter((c) => c.balance.remaining > 0);
  }

  const ids = result.map((c) => c.id);
  const lastOrders = await prisma.order.groupBy({
    by: ['customerId'],
    where: { customerId: { in: ids }, status: { not: 'cancelled' }, companyId },
    _max: { orderDate: true },
  });
  const lastOrderMap = Object.fromEntries(
    lastOrders.map((o) => [o.customerId, o._max.orderDate])
  );
  result = result.map((c) => ({
    ...c,
    lastOrderDate: lastOrderMap[c.id] || null,
  }));

  return result;
}

module.exports = { listCustomers, buildCustomerWhere };
