const express = require('express');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { authMiddleware, roleGuard } = require('../middleware/auth');
const { tenantMiddleware, ownerOnlyDelete } = require('../middleware/tenant');
const { getCustomerBalance, getOrderBalance } = require('../services/balanceService');
const { auditInclude, auditOnCreate, auditOnUpdate } = require('../utils/audit');

const router = express.Router();

const orderItemSchema = z.object({
  productId: z.string().uuid().optional().nullable(),
  productName: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.enum(['packet', 'bundle', 'bag']),
  unitPrice: z.number().nonnegative(),
});

const createOrderSchema = z.object({
  customerId: z.string().uuid(),
  orderDate: z.string(),
  notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1),
});

const updateOrderSchema = z.object({
  orderDate: z.string(),
  notes: z.string().optional().nullable(),
  items: z.array(orderItemSchema).min(1),
});

const statusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'delivered', 'cancelled']),
});

router.use(authMiddleware, tenantMiddleware);

async function verifyCustomerAccess(user, companyId, customerId) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, companyId },
  });
  if (!customer) return { error: 'Customer not found', status: 404 };
  if (user.role === 'staff' && customer.assignedTo !== user.id) {
    return { error: 'Access denied', status: 403 };
  }
  return { customer };
}

router.get('/', async (req, res, next) => {
  try {
    const { customer_id, status } = req.query;
    const where = { companyId: req.companyId, AND: [] };

    if (customer_id) where.AND.push({ customerId: customer_id });
    if (status) where.AND.push({ status });
    if (req.user.role === 'staff') {
      where.AND.push({ customer: { assignedTo: req.user.id } });
    }
    if (where.AND.length === 0) delete where.AND;

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, shopName: true } },
        items: true,
        ...auditInclude,
      },
      orderBy: { orderDate: 'desc' },
    });

    res.json(orders);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/balance', async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: { customer: { select: { assignedTo: true } } },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (req.user.role === 'staff' && order.customer.assignedTo !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const balance = await getOrderBalance(order.id);
    if (!balance) return res.status(400).json({ error: 'Order is cancelled' });
    res.json(balance);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: {
        customer: true,
        items: true,
        payments: {
          include: {
            customer: { select: { id: true, name: true, shopName: true, phone: true } },
          },
        },
        ...auditInclude,
      },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (req.user.role === 'staff' && order.customer.assignedTo !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(order);
  } catch (err) {
    next(err);
  }
});

router.post('/', roleGuard('owner', 'staff'), async (req, res, next) => {
  try {
    const data = createOrderSchema.parse(req.body);
    const access = await verifyCustomerAccess(req.user, req.companyId, data.customerId);
    if (access.error) return res.status(access.status).json({ error: access.error });

    const items = data.items.map((item) => ({
      productId: item.productId || null,
      productName: item.productName,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      lineTotal: item.quantity * item.unitPrice,
    }));

    const totalAmount = items.reduce((sum, i) => sum + i.lineTotal, 0);

    const order = await prisma.order.create({
      data: {
        companyId: req.companyId,
        customerId: data.customerId,
        orderDate: new Date(data.orderDate),
        notes: data.notes,
        totalAmount,
        ...auditOnCreate(req.user.id),
        items: { create: items },
      },
      include: {
        items: true,
        customer: { select: { id: true, name: true, shopName: true } },
        ...auditInclude,
      },
    });

    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', roleGuard('owner', 'staff'), async (req, res, next) => {
  try {
    const data = updateOrderSchema.parse(req.body);
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: { customer: true },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (req.user.role === 'staff' && order.customer.assignedTo !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (order.status === 'delivered') {
      return res.status(400).json({ error: 'Cannot edit a delivered order' });
    }

    const items = data.items.map((item) => ({
      productId: item.productId || null,
      productName: item.productName,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      lineTotal: item.quantity * item.unitPrice,
    }));
    const totalAmount = items.reduce((sum, i) => sum + i.lineTotal, 0);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.orderItem.deleteMany({ where: { orderId: order.id } });
      return tx.order.update({
        where: { id: order.id },
        data: {
          orderDate: new Date(data.orderDate),
          notes: data.notes,
          totalAmount,
          ...auditOnUpdate(req.user.id),
          items: { create: items },
        },
        include: {
          items: true,
          customer: { select: { id: true, name: true, shopName: true } },
          ...auditInclude,
        },
      });
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', ownerOnlyDelete, async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: { customer: true, payments: true },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.status === 'delivered') {
      return res.status(400).json({ error: 'Cannot delete a delivered order' });
    }
    if (order.payments.length > 0) {
      return res.status(400).json({
        error: 'Cannot delete order with linked payments. Delete payments first.',
      });
    }

    const balance = await getCustomerBalance(order.customerId);
    if (balance.remaining > 0) {
      return res.status(400).json({
        error: 'Cannot delete order while customer has outstanding balance. Collect remaining payment first.',
      });
    }

    await prisma.order.delete({ where: { id: order.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/status', roleGuard('owner', 'staff'), async (req, res, next) => {
  try {
    const { status } = statusSchema.parse(req.body);
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: { customer: true },
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (req.user.role === 'staff' && order.customer.assignedTo !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (status === 'delivered') {
      const orderPaid = await prisma.payment.aggregate({
        where: { orderId: order.id, status: 'completed' },
        _sum: { amount: true },
      });
      const paidOnOrder = Number(orderPaid._sum.amount || 0);
      const orderRemaining = Number(order.totalAmount) - paidOnOrder;
      if (orderRemaining > 0) {
        return res.status(400).json({
          error: `Cannot deliver: Rs ${orderRemaining.toFixed(2)} remaining on this order`,
        });
      }
    }

    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: { status, ...auditOnUpdate(req.user.id) },
      include: {
        items: true,
        customer: { select: { id: true, name: true, shopName: true } },
        ...auditInclude,
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
