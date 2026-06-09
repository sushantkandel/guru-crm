const express = require('express');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { authMiddleware, roleGuard } = require('../middleware/auth');
const { tenantMiddleware } = require('../middleware/tenant');
const { companyAddressSchema } = require('../schemas/companyAddress');

const router = express.Router();

const updateCompanySchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  address: companyAddressSchema.optional(),
});

router.use(authMiddleware, tenantMiddleware);

const companySelect = {
  id: true,
  name: true,
  slug: true,
  phone: true,
  country: true,
  province: true,
  district: true,
  municipality: true,
  street: true,
  createdAt: true,
};

router.get('/', async (req, res, next) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.companyId },
      select: companySelect,
    });
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json(company);
  } catch (err) {
    next(err);
  }
});

router.put('/', roleGuard('owner'), async (req, res, next) => {
  try {
    const data = updateCompanySchema.parse(req.body);
    const updateData = { name: data.name, phone: data.phone };
    if (data.address) {
      updateData.country = data.address.country || 'Nepal';
      updateData.province = data.address.province;
      updateData.district = data.address.district;
      updateData.municipality = data.address.municipality;
      updateData.street = data.address.street;
    }

    const company = await prisma.company.update({
      where: { id: req.companyId },
      data: updateData,
      select: companySelect,
    });
    res.json(company);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
