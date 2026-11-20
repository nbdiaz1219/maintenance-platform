const { z } = require("zod");

const operationalStatusSchema = z.enum([
  "OPERATIONAL",
  "DEGRADED",
  "OFFLINE",
  "DECOMMISSIONED",
]);

const assetTypeSchema = z
  .string()
  .trim()
  .max(80)
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    return value || "Uncategorized";
  });

const createAssetSchema = z.object({
  siteId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  serialNumber: z.string().optional(),
  assetType: assetTypeSchema,
  operationalStatus: operationalStatusSchema.optional(),
  installedAt: z.coerce.date().optional(),
});

const updateAssetSchema = z
  .object({
    siteId: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    serialNumber: z.string().nullable().optional(),
    assetType: assetTypeSchema,
    operationalStatus: operationalStatusSchema.optional(),
    installedAt: z.coerce.date().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

module.exports = { createAssetSchema, updateAssetSchema };
