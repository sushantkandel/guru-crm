const express = require('express');
const { z } = require('zod');
const prisma = require('../config/prisma');
const { authMiddleware, roleGuard } = require('../middleware/auth');
const { tenantMiddleware } = require('../middleware/tenant');
const { executeEntityDelete, findDeletableEntity } = require('../services/deleteService');

const router = express.Router();

const createSchema = z.object({
  entityType: z.enum(['customer', 'order', 'payment', 'product']),
  entityId: z.string().uuid(),
  reason: z.string().optional(),
});

const reviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reviewNote: z.string().optional(),
});

router.use(authMiddleware, tenantMiddleware);

router.get('/', roleGuard('owner'), async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = { companyId: req.companyId };
    if (status) where.status = status;

    const requests = await prisma.deleteRequest.findMany({
      where,
      include: {
        requester: { select: { id: true, name: true, email: true } },
        reviewer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
  } catch (err) {
    next(err);
  }
});

router.post('/', roleGuard('owner', 'staff'), async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);

    const existing = await prisma.deleteRequest.findFirst({
      where: {
        companyId: req.companyId,
        entityType: data.entityType,
        entityId: data.entityId,
        status: 'pending',
      },
    });
    if (existing) {
      return res.status(409).json({ error: 'A pending delete request already exists for this item' });
    }

    // Only check the record exists — it must survive until an owner approves.
    const lookup = await findDeletableEntity(req.companyId, data.entityType, data.entityId);
    if (lookup.error) {
      return res.status(lookup.status).json({ error: lookup.error });
    }

    const request = await prisma.deleteRequest.create({
      data: {
        companyId: req.companyId,
        entityType: data.entityType,
        entityId: data.entityId,
        reason: data.reason,
        requestedBy: req.user.id,
      },
      include: {
        requester: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(201).json(request);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', roleGuard('owner'), async (req, res, next) => {
  try {
    const data = reviewSchema.parse(req.body);
    const request = await prisma.deleteRequest.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
    });
    if (!request) return res.status(404).json({ error: 'Delete request not found' });
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request has already been reviewed' });
    }

    if (data.action === 'reject') {
      const updated = await prisma.deleteRequest.update({
        where: { id: request.id },
        data: {
          status: 'rejected',
          reviewedBy: req.user.id,
          reviewedAt: new Date(),
          reviewNote: data.reviewNote,
        },
        include: {
          requester: { select: { id: true, name: true, email: true } },
          reviewer: { select: { id: true, name: true } },
        },
      });
      return res.json(updated);
    }

    const deleteResult = await executeEntityDelete(
      req.companyId,
      request.entityType,
      request.entityId
    );
    if (deleteResult.error) {
      return res.status(deleteResult.status).json({ error: deleteResult.error });
    }

    const updated = await prisma.deleteRequest.update({
      where: { id: request.id },
      data: {
        status: 'approved',
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        reviewNote: data.reviewNote,
      },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        reviewer: { select: { id: true, name: true } },
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
