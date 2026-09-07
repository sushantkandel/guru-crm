const express = require('express');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { authMiddleware, roleGuard } = require('../middleware/auth');
const { tenantMiddleware, ownerOnlyDelete } = require('../middleware/tenant');
const { listCustomers } = require('../services/customerService');
const {
  listCustomerProductInsights,
  upsertCustomerProductInsight,
  listVendorNames,
} = require('../services/customerInsightService');
const { getCustomerBalance } = require('../services/balanceService');
const { shopAddressSchema } = require('../schemas/companyAddress');
const { customerTypeSchema, productInsightSchema } = require('../schemas/customerInsight');
const { auditInclude, auditOnCreate, auditOnUpdate } = require('../utils/audit');

const router = express.Router();

const emptyToNull = (value) => (value === '' || value === undefined ? null : value);

const customerFields = {
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.preprocess(emptyToNull, z.string().email().optional().nullable()),
  shopName: z.string().min(1),
  panVatNumber: z.preprocess(emptyToNull, z.string().optional().nullable()),
  businessStatus: z.enum(['converted', 'not_converted', 'just_visited']),
  customerTypes: z.array(customerTypeSchema),
  assignedTo: z.preprocess(emptyToNull, z.string().uuid().optional().nullable()),
};

const customerSchema = z.object({
  ...customerFields,
  businessStatus: customerFields.businessStatus.default('just_visited'),
  customerTypes: customerFields.customerTypes.default([]),
  address: shopAddressSchema,
});

// Update is a true patch: fields the client omits must stay untouched. Defaults are
// deliberately absent here — under `.partial()` Zod still applies them, which would
// silently reset businessStatus/customerTypes on every partial edit.
const customerUpdateSchema = z
  .object({ ...customerFields, address: shopAddressSchema.partial() })
  .partial();

router.use(authMiddleware, tenantMiddleware);

function canAccessCustomer(user, customer) {
  if (user.role === 'owner' || user.role === 'viewer') return true;
  return customer.assignedTo === user.id;
}

const paymentCustomerSelect = {
  id: true,
  name: true,
  shopName: true,
  phone: true,
};

router.get('/', async (req, res, next) => {
  try {
    const customers = await listCustomers(req.query, req.user, req.companyId);
    res.json(customers);
  } catch (err) {
    next(err);
  }
});

router.get('/vendor-names', async (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const names = await listVendorNames(req.companyId, q);
    res.json(names);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/product-insights', async (req, res, next) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    if (!canAccessCustomer(req.user, customer)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const insights = await listCustomerProductInsights(req.params.id, req.companyId);
    res.json(insights);
  } catch (err) {
    next(err);
  }
});

router.put('/:id/product-insights/:productId', roleGuard('owner', 'staff'), async (req, res, next) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    if (!canAccessCustomer(req.user, customer)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const data = productInsightSchema.parse(req.body);
    const result = await upsertCustomerProductInsight(
      req.params.id,
      req.params.productId,
      req.companyId,
      data,
    );

    if (!result) return res.status(404).json({ error: 'Customer not found' });
    if (result.error) return res.status(404).json({ error: result.error });

    await prisma.customer.update({
      where: { id: req.params.id },
      data: auditOnUpdate(req.user.id),
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/balance', async (req, res, next) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      select: { id: true, assignedTo: true },
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    if (!canAccessCustomer(req.user, customer)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const balance = await getCustomerBalance(customer.id);
    res.json(balance);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: {
        addresses: true,
        assignee: { select: { id: true, name: true, email: true } },
        ...auditInclude,
        orders: {
          include: {
            items: true,
            payments: true,
            creator: auditInclude.creator,
            updater: auditInclude.updater,
          },
          orderBy: { orderDate: 'desc' },
        },
        payments: {
          include: {
            customer: { select: paymentCustomerSelect },
            creator: auditInclude.creator,
            updater: auditInclude.updater,
          },
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    if (!canAccessCustomer(req.user, customer)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const balance = await getCustomerBalance(customer.id);
    res.json({ ...customer, balance });
  } catch (err) {
    next(err);
  }
});

router.post('/', roleGuard('owner', 'staff'), async (req, res, next) => {
  try {
    const data = customerSchema.parse(req.body);
    const assignedTo =
      req.user.role === 'staff' ? req.user.id : data.assignedTo || req.user.id;

    const customer = await prisma.customer.create({
      data: {
        companyId: req.companyId,
        name: data.name,
        phone: data.phone,
        email: data.email,
        shopName: data.shopName,
        panVatNumber: data.panVatNumber,
        businessStatus: data.businessStatus,
        customerTypes: data.customerTypes,
        assignedTo,
        ...auditOnCreate(req.user.id),
        addresses: {
          create: {
            province: data.address.province,
            district: data.address.district,
            municipality: data.address.municipality,
            ward: data.address.ward,
            street: data.address.street,
            latitude: data.address.latitude,
            longitude: data.address.longitude,
            isPrimary: data.address.isPrimary ?? true,
          },
        },
      },
      include: { addresses: true, assignee: { select: { id: true, name: true } }, ...auditInclude },
    });

    res.status(201).json(customer);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', roleGuard('owner', 'staff'), async (req, res, next) => {
  try {
    const existing = await prisma.customer.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: { addresses: true },
    });
    if (!existing) return res.status(404).json({ error: 'Customer not found' });
    if (!canAccessCustomer(req.user, existing)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const data = customerUpdateSchema.parse(req.body);

    await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        shopName: data.shopName,
        panVatNumber: data.panVatNumber,
        businessStatus: data.businessStatus,
        customerTypes: data.customerTypes,
        assignedTo:
          req.user.role === 'owner' ? data.assignedTo : existing.assignedTo,
        ...auditOnUpdate(req.user.id),
      },
    });

    if (data.address) {
      const primary = existing.addresses.find((a) => a.isPrimary) || existing.addresses[0];
      if (primary) {
        await prisma.address.update({
          where: { id: primary.id },
          data: {
            province: data.address.province ?? primary.province,
            district: data.address.district ?? primary.district,
            municipality: data.address.municipality ?? primary.municipality,
            ward: data.address.ward ?? primary.ward,
            street: data.address.street ?? primary.street,
            latitude:
              data.address.latitude !== undefined ? data.address.latitude : primary.latitude,
            longitude:
              data.address.longitude !== undefined ? data.address.longitude : primary.longitude,
          },
        });
      }
    }

    const updated = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: { addresses: true, assignee: { select: { id: true, name: true } }, ...auditInclude },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/business-status', roleGuard('owner', 'staff'), async (req, res, next) => {
  try {
    const { businessStatus } = z
      .object({ businessStatus: z.enum(['converted', 'not_converted', 'just_visited']) })
      .parse(req.body);

    const existing = await prisma.customer.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
    });
    if (!existing) return res.status(404).json({ error: 'Customer not found' });
    if (!canAccessCustomer(req.user, existing)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: { businessStatus, ...auditOnUpdate(req.user.id) },
      include: { addresses: true, assignee: { select: { id: true, name: true } }, ...auditInclude },
    });

    res.json(customer);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', ownerOnlyDelete, async (req, res, next) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const balance = await getCustomerBalance(customer.id);
    if (balance.remaining > 0) {
      return res.status(400).json({
        error: 'Cannot delete customer with outstanding balance. Collect remaining payment first.',
      });
    }

    await prisma.customer.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
