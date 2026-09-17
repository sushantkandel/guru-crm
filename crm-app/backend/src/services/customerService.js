const prisma = require('../config/prisma');
const { getCustomerBalances } = require('./balanceService');
const { auditInclude } = require('../utils/audit');
const { CUSTOMER_TYPES } = require('../schemas/customerInsight');

function normalizeQueryList(value) {
  if (value == null || value === '') return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === 'object') return Object.values(value).map(String).filter(Boolean);
  if (typeof value === 'string') {
    return value.split(',').map((part) => part.trim()).filter(Boolean);
  }
  return [String(value)];
}

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
    customer_type,
    product_id,
    knows_product,
    is_selling,
    vendor,
    vendor_current_only,
  } = query;

  const where = { AND: [{ companyId }] };

  if (user.role === 'staff') {
    where.AND.push({ assignedTo: user.id });
  } else if (assigned_to) {
    where.AND.push({ assignedTo: assigned_to });
  }

  if (q) {
    // PostgreSQL `contains` is case-sensitive unless mode is set — without this,
    // searching "ram" would not match "Ram Traders".
    const like = { contains: q, mode: 'insensitive' };
    where.AND.push({
      OR: [
        { name: like },
        { phone: { contains: q } },
        { shopName: like },
        { email: like },
        { panVatNumber: like },
        {
          addresses: {
            some: {
              OR: [
                { province: like },
                { district: like },
                { municipality: like },
                { street: like },
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

  const customerTypes = normalizeQueryList(customer_type).filter((t) => CUSTOMER_TYPES.includes(t));
  if (customerTypes.length === 1) {
    where.AND.push({ customerTypes: { has: customerTypes[0] } });
  } else if (customerTypes.length > 1) {
    where.AND.push({ OR: customerTypes.map((t) => ({ customerTypes: { has: t } })) });
  }

  const productScopedFilters = [knows_product, is_selling].some((v) => v === 'true' || v === 'false');
  const vendorScopedFilters = Boolean(vendor) || vendor_current_only === 'true';
  const hasInsightFilters = Boolean(product_id) || productScopedFilters || vendorScopedFilters;

  if (hasInsightFilters) {
    if (productScopedFilters && !product_id) {
      // knows_product / is_selling require product_id
    } else {
      const insightFilter = {};
      if (product_id) insightFilter.productId = product_id;
      if (knows_product === 'true') insightFilter.knowsProduct = true;
      if (knows_product === 'false') insightFilter.knowsProduct = false;
      if (is_selling === 'true') insightFilter.isSelling = true;
      if (is_selling === 'false') insightFilter.isSelling = false;

      if (vendorScopedFilters) {
        const vendorSourceFilter = {};
        if (vendor) {
          vendorSourceFilter.vendorName = { contains: vendor, mode: 'insensitive' };
        }
        if (vendor_current_only === 'true') {
          vendorSourceFilter.isCurrent = true;
        }
        insightFilter.vendorSources = { some: vendorSourceFilter };
      }

      where.AND.push({ productInsights: { some: insightFilter } });
    }
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

  const customerIds = customers.map((c) => c.id);

  // Balances and last-order dates are independent, so fetch them together. Running
  // them in sequence cost an extra network round trip on every page load.
  const [balances, lastOrders] = await Promise.all([
    getCustomerBalances(customerIds),
    prisma.order.groupBy({
      by: ['customerId'],
      where: { customerId: { in: customerIds }, status: { not: 'cancelled' }, companyId },
      _max: { orderDate: true },
    }),
  ]);
  const lastOrderMap = new Map(lastOrders.map((o) => [o.customerId, o._max.orderDate]));

  let result = customers.map((c) => {
    const balance = balances[c.id] || {
      totalOrders: 0,
      totalPaid: 0,
      remaining: 0,
      pendingSettlement: 0,
    };
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email,
      shopName: c.shopName,
      panVatNumber: c.panVatNumber,
      businessStatus: c.businessStatus,
      customerTypes: c.customerTypes,
      assignedTo: c.assignedTo,
      assignee: c.assignee,
      address: c.addresses[0] || null,
      pendingOrderCount: c.orders.length,
      orderCount: c._count.orders,
      balance,
      lastOrderDate: lastOrderMap.get(c.id) || null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      creator: c.creator,
      updater: c.updater,
    };
  });

  if (hasRemainingPayment) {
    result = result.filter((c) => c.balance.remaining > 0);
  }

  return result;
}

module.exports = { listCustomers, buildCustomerWhere };
