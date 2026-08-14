import { z } from "zod";

export const saleItemInputSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
  unitPriceRupees: z.number().nonnegative().optional(), // omit to use product's current price
});

export const createSaleSchema = z.object({
  customerId: z.string().optional(),
  items: z.array(saleItemInputSchema).min(1),
  discountRupees: z.number().nonnegative().default(0),
  paymentType: z.enum(["CASH", "UPI", "CHEQUE", "CREDIT"]),
});

export const cancelSaleSchema = z.object({
  reason: z.string().min(1),
});
