const prisma = require('../config/prisma');

async function getCustomerBalance(customerId) {
  const [orderAgg, paymentAgg] = await Promise.all([
    prisma.order.aggregate({
      where: { customerId, status: { not: 'cancelled' } },
      _sum: { totalAmount: true },
    }),
    prisma.payment.aggregate({
      where: { customerId, status: 'completed' },
      _sum: { amount: true },
    }),
  ]);

  const totalOrders = Number(orderAgg._sum.totalAmount || 0);
  const totalPaid = Number(paymentAgg._sum.amount || 0);
  const remaining = Math.max(0, totalOrders - totalPaid);

  return { totalOrders, totalPaid, remaining };
}

async function getCustomerBalances(customerIds) {
  if (customerIds.length === 0) return {};

  const orders = await prisma.order.groupBy({
    by: ['customerId'],
    where: { customerId: { in: customerIds }, status: { not: 'cancelled' } },
    _sum: { totalAmount: true },
  });

  const payments = await prisma.payment.groupBy({
    by: ['customerId'],
    where: { customerId: { in: customerIds }, status: 'completed' },
    _sum: { amount: true },
  });

  const orderMap = Object.fromEntries(
    orders.map((o) => [o.customerId, Number(o._sum.totalAmount || 0)])
  );
  const paymentMap = Object.fromEntries(
    payments.map((p) => [p.customerId, Number(p._sum.amount || 0)])
  );

  return Object.fromEntries(
    customerIds.map((id) => {
      const totalOrders = orderMap[id] || 0;
      const totalPaid = paymentMap[id] || 0;
      return [id, { totalOrders, totalPaid, remaining: Math.max(0, totalOrders - totalPaid) }];
    })
  );
}

module.exports = { getCustomerBalance, getCustomerBalances };
