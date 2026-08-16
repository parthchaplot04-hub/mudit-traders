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
  payments: z.array(
    z.object({
      method: z.enum(["CASH", "UPI", "CHEQUE", "CREDIT", "OTHER"]),
      amountPaise: z.number().nonnegative(),
    })
  ).min(1),
});

export const cancelSaleSchema = z.object({
  reason: z.string().min(1),
});
