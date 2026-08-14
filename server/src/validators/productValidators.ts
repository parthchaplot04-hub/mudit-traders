import { z } from "zod";

const unitEnum = z.enum(["kg", "g", "mg", "L", "ml", "pcs", "packet", "box", "carton", "tin", "bag"]);

export const createProductSchema = z.object({
  productCode: z.string().min(1),
  productName: z.string().min(1),
  englishName: z.string().optional(),
  hindiName: z.string().optional(),
  aliases: z.array(z.string()).optional(),
  category: z.string().min(1),
  brand: z.string().optional(),
  variant: z.string().optional(),
  packSize: z.string().optional(),
  stockUnit: unitEnum,
  purchaseUnit: unitEnum,
  salesUnit: unitEnum,
  conversionFactor: z.number().positive(),
  mrpRupees: z.number().nonnegative().optional(),
  sellingPriceRupees: z.number().nonnegative(),
  purchaseCostRupees: z.number().nonnegative(),
  gstRate: z.number().min(0).max(28),
  reorderLevel: z.number().nonnegative(),
  reorderQuantity: z.number().nonnegative(),
  notes: z.string().optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const searchProductsQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  active: z.enum(["true", "false"]).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});
