const express = require('express');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { authMiddleware, roleGuard } = require('../middleware/auth');
const { tenantMiddleware, ownerOnlyDelete } = require('../middleware/tenant');

const router = express.Router();

const productSchema = z.object({
  name: z.string().min(1),
  productCode: z.string().optional().nullable(),
  defaultUnit: z.enum(['packet', 'bundle', 'bag']),
  defaultPrice: z.number().nonnegative(),
  isActive: z.boolean().optional(),
});

router.use(authMiddleware, tenantMiddleware);

router.get('/', async (req, res, next) => {
  try {
    const { active_only } = req.query;
    const where = { companyId: req.companyId };
    if (active_only === 'true') {
      where.isActive = true;
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
    });
    res.json(products);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

router.post('/', roleGuard('owner', 'staff'), async (req, res, next) => {
  try {
    const data = productSchema.parse(req.body);
    const product = await prisma.product.create({
      data: {
        companyId: req.companyId,
        name: data.name,
        productCode: data.productCode,
        defaultUnit: data.defaultUnit,
        defaultPrice: data.defaultPrice,
        isActive: data.isActive ?? true,
      },
    });
    res.status(201).json(product);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Product name already exists' });
    }
    next(err);
  }
});

router.put('/:id', roleGuard('owner', 'staff'), async (req, res, next) => {
  try {
    const data = productSchema.partial().parse(req.body);
    const existing = await prisma.product.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
    });
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const product = await prisma.product.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        productCode: data.productCode,
        defaultUnit: data.defaultUnit,
        defaultPrice: data.defaultPrice,
        isActive: data.isActive,
      },
    });
    res.json(product);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Product name already exists' });
    }
    next(err);
  }
});

router.delete('/:id', ownerOnlyDelete, async (req, res, next) => {
  try {
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    await prisma.product.delete({ where: { id: product.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
