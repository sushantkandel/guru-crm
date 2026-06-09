const express = require('express');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { authMiddleware, roleGuard } = require('../middleware/auth');
const { tenantMiddleware, ownerOnlyDelete } = require('../middleware/tenant');
const { getCustomerBalance } = require('../services/balanceService');
const { listPayments, listOutstanding } = require('../services/paymentService');
const { auditInclude, auditOnCreate, auditOnUpdate } = require('../utils/audit');

const router = express.Router();

const paymentSchema = z.object({
  customerId: z.string().uuid(),
  orderId: z.string().uuid().optional().nullable(),
  paymentType: z.enum(['cash', 'credit', 'cheque', 'qr']),
  amount: z.number().positive(),
  paymentDate: z.string(),
  status: z.enum(['completed', 'pending', 'bounced']).default('completed'),
  chequeNumber: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  qrReference: z.string().optional().nullable(),
  qrProvider: z.string().optional().nullable(),
  creditDueDate: z.string().optional().nullable(),
});

router.use(authMiddleware, tenantMiddleware);

router.get('/', async (req, res, next) => {
  try {
    const payments = await listPayments(req.query, req.user, req.companyId);
    res.json(payments);
  } catch (err) {
    next(err);
  }
});

router.get('/outstanding', async (req, res, next) => {
  try {
    const outstanding = await listOutstanding(req.query, req.user, req.companyId);
    res.json(outstanding);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const payment = await prisma.payment.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: {
        customer: { select: { id: true, name: true, shopName: true, assignedTo: true } },
        order: { select: { id: true, totalAmount: true } },
        ...auditInclude,
      },
    });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (req.user.role === 'staff' && payment.customer.assignedTo !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(payment);
  } catch (err) {
    next(err);
  }
});

router.post('/', roleGuard('owner', 'staff'), async (req, res, next) => {
  try {
    const data = paymentSchema.parse(req.body);

    const customer = await prisma.customer.findFirst({
      where: { id: data.customerId, companyId: req.companyId },
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    if (req.user.role === 'staff' && customer.assignedTo !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (data.orderId) {
      const order = await prisma.order.findFirst({
        where: { id: data.orderId, companyId: req.companyId },
      });
      if (!order || order.customerId !== data.customerId) {
        return res.status(400).json({ error: 'Invalid order for this customer' });
      }
    }

    const payment = await prisma.payment.create({
      data: {
        companyId: req.companyId,
        customerId: data.customerId,
        orderId: data.orderId,
        paymentType: data.paymentType,
        amount: data.amount,
        paymentDate: new Date(data.paymentDate),
        status: data.status,
        chequeNumber: data.chequeNumber,
        bankName: data.bankName,
        qrReference: data.qrReference,
        qrProvider: data.qrProvider,
        creditDueDate: data.creditDueDate ? new Date(data.creditDueDate) : null,
        ...auditOnCreate(req.user.id),
      },
      include: {
        customer: { select: { id: true, name: true, shopName: true } },
        order: { select: { id: true, totalAmount: true } },
        ...auditInclude,
      },
    });

    const balance = await getCustomerBalance(data.customerId);
    res.status(201).json({ payment, balance });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', roleGuard('owner', 'staff'), async (req, res, next) => {
  try {
    const data = paymentSchema.parse(req.body);
    const payment = await prisma.payment.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: { customer: true },
    });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (req.user.role === 'staff' && payment.customer.assignedTo !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (data.orderId) {
      const order = await prisma.order.findFirst({
        where: { id: data.orderId, companyId: req.companyId },
      });
      if (!order || order.customerId !== data.customerId) {
        return res.status(400).json({ error: 'Invalid order for this customer' });
      }
    }

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        customerId: data.customerId,
        orderId: data.orderId,
        paymentType: data.paymentType,
        amount: data.amount,
        paymentDate: new Date(data.paymentDate),
        status: data.status,
        chequeNumber: data.chequeNumber,
        bankName: data.bankName,
        qrReference: data.qrReference,
        qrProvider: data.qrProvider,
        creditDueDate: data.creditDueDate ? new Date(data.creditDueDate) : null,
        ...auditOnUpdate(req.user.id),
      },
      include: {
        customer: { select: { id: true, name: true, shopName: true } },
        order: { select: { id: true, totalAmount: true } },
        ...auditInclude,
      },
    });

    const balance = await getCustomerBalance(data.customerId);
    res.json({ payment: updated, balance });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', ownerOnlyDelete, async (req, res, next) => {
  try {
    const payment = await prisma.payment.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: { customer: true },
    });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    const balance = await getCustomerBalance(payment.customerId);
    if (balance.remaining > 0) {
      return res.status(400).json({
        error: 'Cannot delete payment while customer has outstanding balance. Collect remaining payment first.',
      });
    }

    await prisma.payment.delete({ where: { id: payment.id } });
    const updatedBalance = await getCustomerBalance(payment.customerId);
    res.json({ balance: updatedBalance });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/status', roleGuard('owner', 'staff'), async (req, res, next) => {
  try {
    const { status } = z.object({ status: z.enum(['completed', 'pending', 'bounced']) }).parse(req.body);
    const payment = await prisma.payment.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: { customer: true },
    });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (req.user.role === 'staff' && payment.customer.assignedTo !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await prisma.payment.update({
      where: { id: req.params.id },
      data: { status, ...auditOnUpdate(req.user.id) },
      include: {
        customer: { select: { id: true, name: true, shopName: true } },
        order: { select: { id: true, totalAmount: true } },
        ...auditInclude,
      },
    });

    const balance = await getCustomerBalance(payment.customerId);
    res.json({ payment: updated, balance });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
