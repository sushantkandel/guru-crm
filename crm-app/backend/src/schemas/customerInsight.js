const { z } = require('zod');

const CUSTOMER_TYPES = ['retailer', 'wholesaler', 'supplier', 'distributor', 'dealer'];

const customerTypeSchema = z.enum(CUSTOMER_TYPES);

const vendorSourceSchema = z.object({
  vendorName: z.string().min(1),
  vendorAddress: z.string().optional().nullable(),
  vendorPhone: z.string().optional().nullable(),
  purchasePrice: z.number().nonnegative().optional().nullable(),
  isCurrent: z.boolean().default(true),
  sortOrder: z.number().int().nonnegative().optional(),
});

const productInsightSchema = z
  .object({
    knowsProduct: z.boolean(),
    isSelling: z.boolean().nullable().optional(),
    discontinuedReason: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    vendorSources: z.array(vendorSourceSchema).default([]),
  })
  .superRefine((data, ctx) => {
    if (!data.knowsProduct) {
      return;
    }
    if (data.isSelling === null || data.isSelling === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'isSelling is required when knowsProduct is true',
        path: ['isSelling'],
      });
      return;
    }
    if (data.isSelling === false) {
      if (!data.discontinuedReason?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'discontinuedReason is required when not selling',
          path: ['discontinuedReason'],
        });
      }
    }
  });

module.exports = {
  CUSTOMER_TYPES,
  customerTypeSchema,
  vendorSourceSchema,
  productInsightSchema,
};
