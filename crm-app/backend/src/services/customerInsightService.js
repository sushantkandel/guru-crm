const prisma = require('../config/prisma');

function formatInsight(insight) {
  return {
    id: insight.id,
    customerId: insight.customerId,
    productId: insight.productId,
    product: insight.product
      ? {
          id: insight.product.id,
          name: insight.product.name,
          productCode: insight.product.productCode,
        }
      : null,
    knowsProduct: insight.knowsProduct,
    isSelling: insight.isSelling,
    discontinuedReason: insight.discontinuedReason,
    notes: insight.notes,
    lastSurveyedAt: insight.lastSurveyedAt,
    vendorSources: (insight.vendorSources || [])
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((v) => ({
        id: v.id,
        vendorName: v.vendorName,
        vendorAddress: v.vendorAddress,
        vendorPhone: v.vendorPhone,
        purchasePrice: v.purchasePrice,
        isCurrent: v.isCurrent,
        sortOrder: v.sortOrder,
      })),
    updatedAt: insight.updatedAt,
  };
}

async function listCustomerProductInsights(customerId, companyId) {
  const insights = await prisma.customerProductInsight.findMany({
    where: {
      customerId,
      customer: { companyId },
    },
    include: {
      product: { select: { id: true, name: true, productCode: true } },
      vendorSources: { orderBy: { sortOrder: 'asc' } },
    },
    orderBy: { updatedAt: 'desc' },
  });
  return insights.map(formatInsight);
}

async function upsertCustomerProductInsight(customerId, productId, companyId, data) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, companyId },
    select: { id: true },
  });
  if (!customer) return null;

  const product = await prisma.product.findFirst({
    where: { id: productId, companyId },
    select: { id: true },
  });
  if (!product) return { error: 'Product not found' };

  const knowsProduct = data.knowsProduct;
  const isSelling = knowsProduct ? data.isSelling : null;
  const discontinuedReason =
    knowsProduct && isSelling === false ? data.discontinuedReason?.trim() || null : null;
  const notes = data.notes?.trim() || null;
  const vendorSources = knowsProduct ? data.vendorSources || [] : [];

  const insight = await prisma.$transaction(async (tx) => {
    const saved = await tx.customerProductInsight.upsert({
      where: {
        customerId_productId: { customerId, productId },
      },
      create: {
        customerId,
        productId,
        knowsProduct,
        isSelling,
        discontinuedReason,
        notes,
        lastSurveyedAt: new Date(),
      },
      update: {
        knowsProduct,
        isSelling,
        discontinuedReason,
        notes,
        lastSurveyedAt: new Date(),
      },
    });

    await tx.customerVendorSource.deleteMany({ where: { insightId: saved.id } });

    if (vendorSources.length > 0) {
      await tx.customerVendorSource.createMany({
        data: vendorSources.map((v, index) => ({
          insightId: saved.id,
          vendorName: v.vendorName.trim(),
          vendorAddress: v.vendorAddress?.trim() || null,
          vendorPhone: v.vendorPhone?.trim() || null,
          purchasePrice: v.purchasePrice ?? null,
          isCurrent: v.isCurrent ?? true,
          sortOrder: v.sortOrder ?? index,
        })),
      });
    }

    return tx.customerProductInsight.findUnique({
      where: { id: saved.id },
      include: {
        product: { select: { id: true, name: true, productCode: true } },
        vendorSources: { orderBy: { sortOrder: 'asc' } },
      },
    });
  });

  return formatInsight(insight);
}

async function listVendorNames(companyId, q = '') {
  const rows = await prisma.customerVendorSource.findMany({
    where: {
      insight: { customer: { companyId } },
      ...(q ? { vendorName: { contains: q, mode: 'insensitive' } } : {}),
    },
    select: { vendorName: true },
    distinct: ['vendorName'],
    orderBy: { vendorName: 'asc' },
    take: 50,
  });
  return rows.map((r) => r.vendorName);
}

module.exports = {
  listCustomerProductInsights,
  upsertCustomerProductInsight,
  listVendorNames,
  formatInsight,
};
