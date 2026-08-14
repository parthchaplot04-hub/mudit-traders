import { z } from "zod";

export const createStocktakeSchema = z.object({
  productId: z.string().min(1),
  actualStockQty: z.number().min(0),
  reason: z.enum(["counting error", "damage", "leakage", "unknown", "other"]),
  notes: z.string().optional(),
});
