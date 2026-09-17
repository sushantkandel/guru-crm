const express = require('express');
const prisma = require('../config/prisma');
const { authMiddleware } = require('../middleware/auth');
const { tenantMiddleware } = require('../middleware/tenant');

const router = express.Router();

router.use(authMiddleware, tenantMiddleware);

const ACTIVE_WINDOW_DAYS = 30;

router.get('/stats', async (req, res, next) => {
  try {
    const companyId = req.companyId;
    const isStaff = req.user.role === 'staff';

    // Scope every count to the signed-in rep's own shops.
    const customerWhere = { companyId, ...(isStaff ? { assignedTo: req.user.id } : {}) };
    const ownScope = isStaff ? { customer: { assignedTo: req.user.id } } : {};
    const liveOrders = { companyId, status: { not: 'cancelled' }, ...ownScope };

    const activeSince = new Date();
    activeSince.setDate(activeSince.getDate() - ACTIVE_WINDOW_DAYS);

    // One round trip. Previously this ran three sequential waves and pulled every
    // order row into memory just to bucket them, which is the dominant cost against
    // a remote database where each wave is a full network round trip.
    const [pendingOrders, totalOrders, totalCustomers, orderTotals, paidTotals, activeCustomers] =
      await Promise.all([
        prisma.order.count({ where: { ...liveOrders, status: 'pending' } }),
        prisma.order.count({ where: liveOrders }),
        prisma.customer.count({ where: customerWhere }),
        prisma.order.groupBy({
          by: ['customerId'],
          where: liveOrders,
          _sum: { totalAmount: true },
        }),
        prisma.payment.groupBy({
          by: ['customerId'],
          where: { companyId, status: 'completed', ...ownScope },
          _sum: { amount: true },
        }),
        prisma.order.groupBy({
          by: ['customerId'],
          // Upper bound keeps a mistyped future date from counting a dormant shop as active.
          where: { ...liveOrders, orderDate: { gte: activeSince, lte: new Date() } },
        }),
      ]);

    const paidByCustomer = new Map(
      paidTotals.map((p) => [p.customerId, Number(p._sum.amount || 0)]),
    );

    // Sum what each customer still owes, floored at zero so an overpayment on one
    // shop cannot mask another shop's debt.
    const totalOutstanding = orderTotals.reduce((sum, row) => {
      const ordered = Number(row._sum.totalAmount || 0);
      const paid = paidByCustomer.get(row.customerId) || 0;
      return sum + Math.max(0, ordered - paid);
    }, 0);

    res.json({
      pendingOrders,
      totalOutstanding,
      inactiveCustomers: Math.max(0, totalCustomers - activeCustomers.length),
      totalCustomers,
      totalOrders,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
