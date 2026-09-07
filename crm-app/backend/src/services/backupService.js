const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const AdmZip = require('adm-zip');
const prisma = require('../config/prisma');

const BACKUP_FORMAT_VERSION = 1;
const APP_NAME = 'sales-guru';

const REQUIRED_CSV_FILES = [
  'company.csv',
  'users.csv',
  'products.csv',
  'customers.csv',
  'addresses.csv',
  'orders.csv',
  'order_items.csv',
  'payments.csv',
];

const restoreCooldown = new Map();
const RESTORE_COOLDOWN_MS = 5 * 60 * 1000;

function checkRestoreCooldown(companyId) {
  const last = restoreCooldown.get(companyId);
  if (last && Date.now() - last < RESTORE_COOLDOWN_MS) {
    const waitSec = Math.ceil((RESTORE_COOLDOWN_MS - (Date.now() - last)) / 1000);
    const err = new Error(`Please wait ${waitSec} seconds before restoring again.`);
    err.status = 429;
    throw err;
  }
}

function markRestoreCooldown(companyId) {
  restoreCooldown.set(companyId, Date.now());
}

function toCsv(rows, columns) {
  return stringify(rows, {
    header: true,
    columns,
    quoted_string: true,
  });
}

function parseCsv(text, columns) {
  if (!text || !text.trim()) return [];
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });
  return records.map((row) => {
    const out = {};
    for (const col of columns) {
      const val = row[col];
      out[col] = val === '' || val === undefined ? null : val;
    }
    return out;
  });
}

function boolVal(v) {
  if (v === null || v === undefined || v === '') return false;
  return String(v).toLowerCase() === 'true' || v === '1';
}

function numVal(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function dateVal(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function arrayToCsv(arr) {
  return (arr || []).join('|');
}

function csvToArray(value) {
  if (!value) return [];
  return String(value)
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
}

async function loadCompanyExportData(companyId) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new Error('Company not found');

  const users = await prisma.user.findMany({
    where: { companyId },
    select: { id: true, email: true, name: true, role: true },
    orderBy: { email: 'asc' },
  });

  const products = await prisma.product.findMany({ where: { companyId }, orderBy: { name: 'asc' } });
  const customers = await prisma.customer.findMany({ where: { companyId }, orderBy: { createdAt: 'asc' } });
  const customerIds = customers.map((c) => c.id);

  const addresses = customerIds.length
    ? await prisma.address.findMany({ where: { customerId: { in: customerIds } } })
    : [];

  const orders = await prisma.order.findMany({ where: { companyId }, orderBy: { orderDate: 'asc' } });
  const orderIds = orders.map((o) => o.id);

  const orderItems = orderIds.length
    ? await prisma.orderItem.findMany({ where: { orderId: { in: orderIds } } })
    : [];

  const payments = await prisma.payment.findMany({ where: { companyId }, orderBy: { paymentDate: 'asc' } });

  const productInsights = customerIds.length
    ? await prisma.customerProductInsight.findMany({
        where: { customerId: { in: customerIds } },
        orderBy: { updatedAt: 'asc' },
      })
    : [];

  const insightIds = productInsights.map((i) => i.id);
  const vendorSources = insightIds.length
    ? await prisma.customerVendorSource.findMany({
        where: { insightId: { in: insightIds } },
        orderBy: { sortOrder: 'asc' },
      })
    : [];

  return {
    company,
    users,
    products,
    customers,
    addresses,
    orders,
    orderItems,
    payments,
    productInsights,
    vendorSources,
  };
}

function buildCsvFiles(data) {
  const {
    company,
    users,
    products,
    customers,
    addresses,
    orders,
    orderItems,
    payments,
    productInsights,
    vendorSources,
  } = data;

  const companyRows = [
    {
      id: company.id,
      name: company.name,
      slug: company.slug,
      phone: company.phone || '',
      country: company.country,
      province: company.province,
      district: company.district,
      municipality: company.municipality,
      street: company.street,
    },
  ];

  const userRows = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
  }));

  const productRows = products.map((p) => ({
    id: p.id,
    name: p.name,
    product_code: p.productCode || '',
    default_unit: p.defaultUnit,
    default_price: p.defaultPrice,
    is_active: p.isActive,
  }));

  const customerRows = customers.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email || '',
    shop_name: c.shopName,
    pan_vat_number: c.panVatNumber || '',
    business_status: c.businessStatus,
    customer_types: arrayToCsv(c.customerTypes),
    assigned_to: c.assignedTo || '',
    created_by: c.createdBy || '',
    updated_by: c.updatedBy || '',
    created_at: c.createdAt.toISOString(),
    updated_at: c.updatedAt.toISOString(),
  }));

  const addressRows = addresses.map((a) => ({
    id: a.id,
    customer_id: a.customerId,
    province: a.province,
    district: a.district,
    municipality: a.municipality,
    ward: a.ward,
    street: a.street || '',
    latitude: a.latitude ?? '',
    longitude: a.longitude ?? '',
    is_primary: a.isPrimary,
  }));

  const orderRows = orders.map((o) => ({
    id: o.id,
    customer_id: o.customerId,
    order_date: o.orderDate.toISOString(),
    status: o.status,
    total_amount: o.totalAmount,
    notes: o.notes || '',
    created_by: o.createdBy || '',
    updated_by: o.updatedBy || '',
    created_at: o.createdAt.toISOString(),
    updated_at: o.updatedAt.toISOString(),
  }));

  const orderItemRows = orderItems.map((i) => ({
    id: i.id,
    order_id: i.orderId,
    product_id: i.productId || '',
    product_name: i.productName,
    quantity: i.quantity,
    unit: i.unit,
    unit_price: i.unitPrice,
    line_total: i.lineTotal,
  }));

  const paymentRows = payments.map((p) => ({
    id: p.id,
    customer_id: p.customerId,
    order_id: p.orderId || '',
    payment_type: p.paymentType,
    amount: p.amount,
    payment_date: p.paymentDate.toISOString(),
    status: p.status,
    cheque_number: p.chequeNumber || '',
    bank_name: p.bankName || '',
    qr_reference: p.qrReference || '',
    qr_provider: p.qrProvider || '',
    credit_due_date: p.creditDueDate ? p.creditDueDate.toISOString() : '',
    created_by: p.createdBy || '',
    updated_by: p.updatedBy || '',
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  }));

  const insightRows = productInsights.map((i) => ({
    id: i.id,
    customer_id: i.customerId,
    product_id: i.productId,
    knows_product: i.knowsProduct,
    is_selling: i.isSelling === null ? '' : i.isSelling,
    discontinued_reason: i.discontinuedReason || '',
    notes: i.notes || '',
    last_surveyed_at: i.lastSurveyedAt ? i.lastSurveyedAt.toISOString() : '',
    created_at: i.createdAt.toISOString(),
    updated_at: i.updatedAt.toISOString(),
  }));

  const vendorRows = vendorSources.map((v) => ({
    id: v.id,
    insight_id: v.insightId,
    vendor_name: v.vendorName,
    vendor_address: v.vendorAddress || '',
    vendor_phone: v.vendorPhone || '',
    purchase_price: v.purchasePrice ?? '',
    is_current: v.isCurrent,
    sort_order: v.sortOrder,
  }));

  const counts = {
    users: userRows.length,
    products: productRows.length,
    customers: customerRows.length,
    addresses: addressRows.length,
    orders: orderRows.length,
    order_items: orderItemRows.length,
    payments: paymentRows.length,
    product_insights: insightRows.length,
    vendor_sources: vendorRows.length,
  };

  const manifest = {
    formatVersion: BACKUP_FORMAT_VERSION,
    app: APP_NAME,
    companyId: company.id,
    companyName: company.name,
    companySlug: company.slug,
    exportedAt: new Date().toISOString(),
    counts,
  };

  return {
    manifest,
    files: {
      'manifest.json': JSON.stringify(manifest, null, 2),
      'company.csv': toCsv(companyRows, Object.keys(companyRows[0])),
      'users.csv': toCsv(userRows, ['id', 'email', 'name', 'role']),
      'products.csv': toCsv(productRows, [
        'id', 'name', 'product_code', 'default_unit', 'default_price', 'is_active',
      ]),
      'customers.csv': toCsv(customerRows, [
        'id', 'name', 'phone', 'email', 'shop_name', 'pan_vat_number', 'business_status',
        'customer_types', 'assigned_to', 'created_by', 'updated_by', 'created_at', 'updated_at',
      ]),
      'addresses.csv': toCsv(addressRows, [
        'id', 'customer_id', 'province', 'district', 'municipality', 'ward', 'street',
        'latitude', 'longitude', 'is_primary',
      ]),
      'orders.csv': toCsv(orderRows, [
        'id', 'customer_id', 'order_date', 'status', 'total_amount', 'notes',
        'created_by', 'updated_by', 'created_at', 'updated_at',
      ]),
      'order_items.csv': toCsv(orderItemRows, [
        'id', 'order_id', 'product_id', 'product_name', 'quantity', 'unit', 'unit_price', 'line_total',
      ]),
      'payments.csv': toCsv(paymentRows, [
        'id', 'customer_id', 'order_id', 'payment_type', 'amount', 'payment_date', 'status',
        'cheque_number', 'bank_name', 'qr_reference', 'qr_provider', 'credit_due_date',
        'created_by', 'updated_by', 'created_at', 'updated_at',
      ]),
      'customer_product_insights.csv': toCsv(insightRows, [
        'id', 'customer_id', 'product_id', 'knows_product', 'is_selling', 'discontinued_reason',
        'notes', 'last_surveyed_at', 'created_at', 'updated_at',
      ]),
      'customer_vendor_sources.csv': toCsv(vendorRows, [
        'id', 'insight_id', 'vendor_name', 'vendor_address', 'vendor_phone',
        'purchase_price', 'is_current', 'sort_order',
      ]),
    },
  };
}

async function exportCompanyBackupBuffer(companyId) {
  const data = await loadCompanyExportData(companyId);
  const { manifest, files } = buildCsvFiles(data);
  const zip = new AdmZip();
  for (const [name, content] of Object.entries(files)) {
    zip.addFile(name, Buffer.from(content, 'utf8'));
  }
  const slug = manifest.companySlug || 'company';
  const date = new Date().toISOString().slice(0, 10);
  const fileName = `sales-guru-backup-${slug}-${date}.zip`;
  return { buffer: zip.toBuffer(), fileName, manifest };
}

function parseBackupZip(buffer) {
  // Picking the wrong file in the Backup & Restore screen is an ordinary user mistake,
  // so surface it as a 400 instead of letting the raw ADM-ZIP error escape as a 500.
  const files = {};
  try {
    const zip = new AdmZip(buffer);
    for (const entry of zip.getEntries()) {
      if (entry.isDirectory) continue;
      files[entry.entryName.replace(/^\/+/, '')] = zip.readAsText(entry, 'utf8');
    }
  } catch {
    const err = new Error('That file is not a valid backup ZIP. Choose the .zip file exported from Sales Guru.');
    err.status = 400;
    throw err;
  }

  if (!files['manifest.json']) {
    const err = new Error('Invalid backup: manifest.json is missing');
    err.status = 400;
    throw err;
  }

  let manifest;
  try {
    manifest = JSON.parse(files['manifest.json']);
  } catch {
    const err = new Error('Invalid backup: manifest.json is not valid JSON');
    err.status = 400;
    throw err;
  }

  const parsed = { manifest, csv: {} };
  for (const name of REQUIRED_CSV_FILES) {
    if (!files[name]) {
      const err = new Error(`Invalid backup: missing ${name}`);
      err.status = 400;
      throw err;
    }
    parsed.csv[name] = files[name];
  }
  return parsed;
}

function validateBackupData(parsed, companyId) {
  const warnings = [];
  const { manifest } = parsed;

  if (manifest.formatVersion !== BACKUP_FORMAT_VERSION) {
    const err = new Error(`Unsupported backup format version: ${manifest.formatVersion}`);
    err.status = 400;
    throw err;
  }

  if (manifest.companyId !== companyId) {
    const err = new Error(
      'This backup belongs to a different company. You can only restore backups exported from your own company.',
    );
    err.status = 400;
    throw err;
  }

  const company = parseCsv(parsed.csv['company.csv'], [
    'id', 'name', 'slug', 'phone', 'country', 'province', 'district', 'municipality', 'street',
  ]);
  if (company.length !== 1 || company[0].id !== companyId) {
    const err = new Error('Invalid backup: company.csv does not match your company');
    err.status = 400;
    throw err;
  }

  const users = parseCsv(parsed.csv['users.csv'], ['id', 'email', 'name', 'role']);
  const products = parseCsv(parsed.csv['products.csv'], [
    'id', 'name', 'product_code', 'default_unit', 'default_price', 'is_active',
  ]);
  const customers = parseCsv(parsed.csv['customers.csv'], [
    'id', 'name', 'phone', 'email', 'shop_name', 'pan_vat_number', 'business_status',
    'customer_types', 'assigned_to', 'created_by', 'updated_by', 'created_at', 'updated_at',
  ]);
  const addresses = parseCsv(parsed.csv['addresses.csv'], [
    'id', 'customer_id', 'province', 'district', 'municipality', 'ward', 'street',
    'latitude', 'longitude', 'is_primary',
  ]);
  const orders = parseCsv(parsed.csv['orders.csv'], [
    'id', 'customer_id', 'order_date', 'status', 'total_amount', 'notes',
    'created_by', 'updated_by', 'created_at', 'updated_at',
  ]);
  const orderItems = parseCsv(parsed.csv['order_items.csv'], [
    'id', 'order_id', 'product_id', 'product_name', 'quantity', 'unit', 'unit_price', 'line_total',
  ]);
  const payments = parseCsv(parsed.csv['payments.csv'], [
    'id', 'customer_id', 'order_id', 'payment_type', 'amount', 'payment_date', 'status',
    'cheque_number', 'bank_name', 'qr_reference', 'qr_provider', 'credit_due_date',
    'created_by', 'updated_by', 'created_at', 'updated_at',
  ]);

  const productInsights = parsed.csv['customer_product_insights.csv']
    ? parseCsv(parsed.csv['customer_product_insights.csv'], [
        'id', 'customer_id', 'product_id', 'knows_product', 'is_selling', 'discontinued_reason',
        'notes', 'last_surveyed_at', 'created_at', 'updated_at',
      ])
    : [];

  const vendorSources = parsed.csv['customer_vendor_sources.csv']
    ? parseCsv(parsed.csv['customer_vendor_sources.csv'], [
        'id', 'insight_id', 'vendor_name', 'vendor_address', 'vendor_phone',
        'purchase_price', 'is_current', 'sort_order',
      ])
    : [];

  const customerIds = new Set(customers.map((c) => c.id));
  for (const a of addresses) {
    if (!customerIds.has(a.customer_id)) {
      warnings.push(`Address ${a.id} references unknown customer ${a.customer_id}`);
    }
  }

  const orderIds = new Set(orders.map((o) => o.id));
  for (const item of orderItems) {
    if (!orderIds.has(item.order_id)) {
      warnings.push(`Order item ${item.id} references unknown order ${item.order_id}`);
    }
  }

  return {
    valid: true,
    manifest,
    warnings,
    tables: {
      company,
      users,
      products,
      customers,
      addresses,
      orders,
      orderItems,
      payments,
      productInsights,
      vendorSources,
    },
  };
}

function mapUserId(oldId, userIdMap) {
  if (!oldId) return null;
  return userIdMap.get(oldId) || null;
}

async function restoreCompanyBackup(companyId, ownerUserId, parsed) {
  checkRestoreCooldown(companyId);
  const validation = validateBackupData(parsed, companyId);
  const { tables, warnings } = validation;

  await prisma.$transaction(async (tx) => {
    const orderIds = await tx.order.findMany({
      where: { companyId },
      select: { id: true },
    });
    const orderIdList = orderIds.map((o) => o.id);

    if (orderIdList.length) {
      await tx.orderItem.deleteMany({ where: { orderId: { in: orderIdList } } });
    }
    await tx.payment.deleteMany({ where: { companyId } });
    await tx.order.deleteMany({ where: { companyId } });

    const customerIds = await tx.customer.findMany({
      where: { companyId },
      select: { id: true },
    });
    const customerIdList = customerIds.map((c) => c.id);
    if (customerIdList.length) {
      await tx.address.deleteMany({ where: { customerId: { in: customerIdList } } });
    }
    await tx.customer.deleteMany({ where: { companyId } });
    await tx.product.deleteMany({ where: { companyId } });
    await tx.deleteRequest.deleteMany({ where: { companyId } });

    const existingUsers = await tx.user.findMany({ where: { companyId } });
    const emailToUser = new Map(existingUsers.map((u) => [u.email.toLowerCase(), u]));
    const userIdMap = new Map();

    for (const row of tables.users) {
      const email = row.email.toLowerCase();
      const existing = emailToUser.get(email);
      if (existing) {
        await tx.user.update({
          where: { id: existing.id },
          data: { name: row.name, role: row.role },
        });
        userIdMap.set(row.id, existing.id);
      } else if (row.role !== 'owner') {
        const created = await tx.user.create({
          data: {
            companyId,
            email: row.email,
            name: row.name,
            role: row.role,
            authProvider: 'local',
          },
        });
        emailToUser.set(email, created);
        userIdMap.set(row.id, created.id);
      } else {
        warnings.push(`Skipped creating owner user ${row.email} from backup`);
      }
    }

    userIdMap.set(ownerUserId, ownerUserId);

    const companyRow = tables.company[0];
    await tx.company.update({
      where: { id: companyId },
      data: {
        name: companyRow.name,
        phone: companyRow.phone || null,
        country: companyRow.country || 'Nepal',
        province: companyRow.province,
        district: companyRow.district,
        municipality: companyRow.municipality,
        street: companyRow.street,
      },
    });

    for (const row of tables.products) {
      await tx.product.create({
        data: {
          id: row.id,
          companyId,
          name: row.name,
          productCode: row.product_code || null,
          defaultUnit: row.default_unit,
          defaultPrice: numVal(row.default_price) ?? 0,
          isActive: boolVal(row.is_active),
        },
      });
    }

    for (const row of tables.customers) {
      await tx.customer.create({
        data: {
          id: row.id,
          companyId,
          name: row.name,
          phone: row.phone,
          email: row.email || null,
          shopName: row.shop_name,
          panVatNumber: row.pan_vat_number || null,
          businessStatus: row.business_status || 'just_visited',
          customerTypes: csvToArray(row.customer_types),
          assignedTo: mapUserId(row.assigned_to, userIdMap),
          createdBy: mapUserId(row.created_by, userIdMap),
          updatedBy: mapUserId(row.updated_by, userIdMap),
          createdAt: dateVal(row.created_at) || new Date(),
          updatedAt: dateVal(row.updated_at) || new Date(),
        },
      });
    }

    for (const row of tables.addresses) {
      await tx.address.create({
        data: {
          id: row.id,
          customerId: row.customer_id,
          province: row.province,
          district: row.district,
          municipality: row.municipality,
          ward: row.ward,
          street: row.street || null,
          latitude: numVal(row.latitude),
          longitude: numVal(row.longitude),
          isPrimary: boolVal(row.is_primary),
        },
      });
    }

    for (const row of tables.productInsights || []) {
      await tx.customerProductInsight.create({
        data: {
          id: row.id,
          customerId: row.customer_id,
          productId: row.product_id,
          knowsProduct: boolVal(row.knows_product),
          isSelling: row.is_selling === '' || row.is_selling === null ? null : boolVal(row.is_selling),
          discontinuedReason: row.discontinued_reason || null,
          notes: row.notes || null,
          lastSurveyedAt: dateVal(row.last_surveyed_at),
          createdAt: dateVal(row.created_at) || new Date(),
          updatedAt: dateVal(row.updated_at) || new Date(),
        },
      });
    }

    for (const row of tables.vendorSources || []) {
      await tx.customerVendorSource.create({
        data: {
          id: row.id,
          insightId: row.insight_id,
          vendorName: row.vendor_name,
          vendorAddress: row.vendor_address?.trim() || null,
          vendorPhone: row.vendor_phone?.trim() || null,
          purchasePrice: numVal(row.purchase_price),
          isCurrent: boolVal(row.is_current),
          sortOrder: numVal(row.sort_order) ?? 0,
        },
      });
    }

    for (const row of tables.orders) {
      await tx.order.create({
        data: {
          id: row.id,
          companyId,
          customerId: row.customer_id,
          orderDate: dateVal(row.order_date) || new Date(),
          status: row.status || 'pending',
          totalAmount: numVal(row.total_amount) ?? 0,
          notes: row.notes || null,
          createdBy: mapUserId(row.created_by, userIdMap),
          updatedBy: mapUserId(row.updated_by, userIdMap),
          createdAt: dateVal(row.created_at) || new Date(),
          updatedAt: dateVal(row.updated_at) || new Date(),
        },
      });
    }

    for (const row of tables.orderItems) {
      await tx.orderItem.create({
        data: {
          id: row.id,
          orderId: row.order_id,
          productId: row.product_id || null,
          productName: row.product_name,
          quantity: numVal(row.quantity) ?? 0,
          unit: row.unit,
          unitPrice: numVal(row.unit_price) ?? 0,
          lineTotal: numVal(row.line_total) ?? 0,
        },
      });
    }

    for (const row of tables.payments) {
      await tx.payment.create({
        data: {
          id: row.id,
          companyId,
          customerId: row.customer_id,
          orderId: row.order_id || null,
          paymentType: row.payment_type,
          amount: numVal(row.amount) ?? 0,
          paymentDate: dateVal(row.payment_date) || new Date(),
          status: row.status || 'completed',
          chequeNumber: row.cheque_number || null,
          bankName: row.bank_name || null,
          qrReference: row.qr_reference || null,
          qrProvider: row.qr_provider || null,
          creditDueDate: dateVal(row.credit_due_date),
          createdBy: mapUserId(row.created_by, userIdMap),
          updatedBy: mapUserId(row.updated_by, userIdMap),
          createdAt: dateVal(row.created_at) || new Date(),
          updatedAt: dateVal(row.updated_at) || new Date(),
        },
      });
    }
  }, { timeout: 120000 });

  markRestoreCooldown(companyId);

  return {
    restored: true,
    manifest: validation.manifest,
    warnings,
    counts: {
      products: tables.products.length,
      customers: tables.customers.length,
      orders: tables.orders.length,
      payments: tables.payments.length,
    },
  };
}

module.exports = {
  exportCompanyBackupBuffer,
  parseBackupZip,
  validateBackupData,
  restoreCompanyBackup,
};
