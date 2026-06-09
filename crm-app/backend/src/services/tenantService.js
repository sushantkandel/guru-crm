const prisma = require('../config/prisma');

function slugify(name) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${base}-${Date.now().toString(36)}`;
}

async function assertCompanyAccess(companyId, model, entityId) {
  const record = await prisma[model].findFirst({
    where: { id: entityId, companyId },
  });
  if (!record) {
    const err = new Error('Not found');
    err.status = 404;
    throw err;
  }
  return record;
}

async function assertCustomerInCompany(companyId, customerId) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, companyId },
  });
  if (!customer) {
    const err = new Error('Customer not found');
    err.status = 404;
    throw err;
  }
  return customer;
}

module.exports = { slugify, assertCompanyAccess, assertCustomerInCompany };
