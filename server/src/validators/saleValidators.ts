import { z } from "zod";

export const saleItemInputSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
  unitPriceRupees: z.number().nonnegative().optional(), // omit to use product's current price
});

export const createSaleSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  items: z.array(saleItemInputSchema).min(1),
  discountRupees: z.number().nonnegative().default(0),
  payments: z.array(
    z.object({
      method: z.enum(["CASH", "UPI", "CHEQUE", "CREDIT", "OTHER"]),
      amountPaise: z.number().nonnegative(),
    })
  ).min(1),
}).refine(data => data.customerId || (data.customerName && data.customerName.trim().length > 0), {
  message: "Customer name is mandatory for walk-in customers",
  path: ["customerName"],
});

export const cancelSaleSchema = z.object({
  reason: z.string().min(1),
});
