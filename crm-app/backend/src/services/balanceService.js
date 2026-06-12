const prisma = require('../config/prisma');

function buildBalance(totalOrders, totalPaid, pendingSettlement) {
  const orders = Number(totalOrders || 0);
  const paid = Number(totalPaid || 0);
  const pending = Number(pendingSettlement || 0);
  return {
    totalOrders: orders,
    totalPaid: paid,
    remaining: Math.max(0, orders - paid),
    pendingSettlement: pending,
  };
}

async function getCustomerBalance(customerId) {
  const [orderAgg, paymentAgg, pendingAgg] = await Promise.all([
    prisma.order.aggregate({
      where: { customerId, status: { not: 'cancelled' } },
      _sum: { totalAmount: true },
    }),
    prisma.payment.aggregate({
      where: { customerId, status: 'completed' },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: {
        customerId,
        status: 'pending',
        paymentType: { in: ['credit', 'cheque'] },
      },
      _sum: { amount: true },
    }),
  ]);

  return buildBalance(
    orderAgg._sum.totalAmount,
    paymentAgg._sum.amount,
    pendingAgg._sum.amount,
  );
}

async function getCustomerBalances(customerIds) {
  if (customerIds.length === 0) return {};

  const [orders, payments, pendingPayments] = await Promise.all([
    prisma.order.groupBy({
      by: ['customerId'],
      where: { customerId: { in: customerIds }, status: { not: 'cancelled' } },
      _sum: { totalAmount: true },
    }),
    prisma.payment.groupBy({
      by: ['customerId'],
      where: { customerId: { in: customerIds }, status: 'completed' },
      _sum: { amount: true },
    }),
    prisma.payment.groupBy({
      by: ['customerId'],
      where: {
        customerId: { in: customerIds },
        status: 'pending',
        paymentType: { in: ['credit', 'cheque'] },
      },
      _sum: { amount: true },
    }),
  ]);

  const orderMap = Object.fromEntries(
    orders.map((o) => [o.customerId, Number(o._sum.totalAmount || 0)]),
  );
  const paymentMap = Object.fromEntries(
    payments.map((p) => [p.customerId, Number(p._sum.amount || 0)]),
  );
  const pendingMap = Object.fromEntries(
    pendingPayments.map((p) => [p.customerId, Number(p._sum.amount || 0)]),
  );

  return Object.fromEntries(
    customerIds.map((id) => [
      id,
      buildBalance(orderMap[id], paymentMap[id], pendingMap[id]),
    ]),
  );
}

async function getOrderBalance(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { totalAmount: true, status: true },
  });
  if (!order || order.status === 'cancelled') return null;

  const paymentAgg = await prisma.payment.aggregate({
    where: { orderId, status: 'completed' },
    _sum: { amount: true },
  });

  const orderTotal = Number(order.totalAmount);
  const paidOnOrder = Number(paymentAgg._sum.amount || 0);
  return {
    orderTotal,
    paidOnOrder,
    remainingOnOrder: Math.max(0, orderTotal - paidOnOrder),
  };
}

module.exports = { getCustomerBalance, getCustomerBalances, getOrderBalance };
