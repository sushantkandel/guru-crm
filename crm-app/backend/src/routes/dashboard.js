const express = require('express');
const prisma = require('../config/prisma');
const { authMiddleware } = require('../middleware/auth');
const { tenantMiddleware } = require('../middleware/tenant');
const { getCustomerBalances } = require('../services/balanceService');

const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

router.get('/stats', async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const customerWhere = { companyId };
    if (req.user.role === 'staff') {
      customerWhere.assignedTo = req.user.id;
    }

    const staffOrderFilter =
      req.user.role === 'staff' ? { customer: { assignedTo: req.user.id } } : {};

    const [pendingOrders, customers, recentOrders] = await Promise.all([
      prisma.order.count({
        where: { status: 'pending', companyId, ...staffOrderFilter },
      }),
      prisma.customer.findMany({ where: customerWhere, select: { id: true } }),
      prisma.order.findMany({
        where: { status: { not: 'cancelled' }, companyId, ...staffOrderFilter },
        select: { customerId: true, orderDate: true },
      }),
    ]);

    const balances = await getCustomerBalances(customers.map((c) => c.id));
    const totalOutstanding = Object.values(balances).reduce((sum, b) => sum + b.remaining, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const today = new Date();

    const activeCustomerIds = new Set(
      recentOrders
        .filter((o) => o.orderDate >= thirtyDaysAgo && o.orderDate <= today)
        .map((o) => o.customerId)
    );
    const inactiveCustomers = customers.filter((c) => !activeCustomerIds.has(c.id)).length;

    const totalCustomers = customers.length;
    const totalOrders = await prisma.order.count({
      where: { status: { not: 'cancelled' }, companyId, ...staffOrderFilter },
    });

    res.json({
      pendingOrders,
      totalOutstanding,
      inactiveCustomers,
      totalCustomers,
      totalOrders,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
