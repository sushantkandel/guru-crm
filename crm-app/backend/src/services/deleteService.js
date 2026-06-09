const prisma = require('../config/prisma');

async function executeEntityDelete(companyId, entityType, entityId) {
  switch (entityType) {
    case 'customer': {
      const customer = await prisma.customer.findFirst({
        where: { id: entityId, companyId },
      });
      if (!customer) return { error: 'Customer not found', status: 404 };
      await prisma.customer.delete({ where: { id: entityId } });
      return { success: true };
    }
    case 'order': {
      const order = await prisma.order.findFirst({
        where: { id: entityId, companyId },
        include: { payments: true },
      });
      if (!order) return { error: 'Order not found', status: 404 };
      if (order.status === 'delivered') {
        return { error: 'Cannot delete a delivered order', status: 400 };
      }
      if (order.payments.length > 0) {
        return {
          error: 'Cannot delete order with linked payments. Delete payments first.',
          status: 400,
        };
      }
      await prisma.order.delete({ where: { id: entityId } });
      return { success: true };
    }
    case 'payment': {
      const payment = await prisma.payment.findFirst({
        where: { id: entityId, companyId },
      });
      if (!payment) return { error: 'Payment not found', status: 404 };
      await prisma.payment.delete({ where: { id: entityId } });
      return { success: true };
    }
    case 'product': {
      const product = await prisma.product.findFirst({
        where: { id: entityId, companyId },
      });
      if (!product) return { error: 'Product not found', status: 404 };
      await prisma.product.delete({ where: { id: entityId } });
      return { success: true };
    }
    default:
      return { error: 'Invalid entity type', status: 400 };
  }
}

module.exports = { executeEntityDelete };
