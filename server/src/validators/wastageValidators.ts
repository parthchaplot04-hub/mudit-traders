import { z } from "zod";

export const createWastageSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
  reason: z.enum(["Damaged", "Expired", "Leakage", "Spoiled", "Broken", "Other"]),
  notes: z.string().optional(),
});
