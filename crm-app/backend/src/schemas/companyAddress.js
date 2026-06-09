const { z } = require('zod');

const companyAddressSchema = z.object({
  country: z.string().min(1).default('Nepal'),
  province: z.string().min(1, 'Province is required'),
  district: z.string().min(1, 'District is required'),
  municipality: z.string().min(1, 'Municipality is required'),
  street: z.string().min(1, 'Street is required'),
});

const shopAddressSchema = z.object({
  province: z.string().min(1),
  district: z.string().min(1),
  municipality: z.string().min(1),
  ward: z.string().min(1),
  street: z.string().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  isPrimary: z.boolean().optional(),
});

module.exports = { companyAddressSchema, shopAddressSchema };
