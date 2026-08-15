import { z } from "zod";

export const purchaseItemInputSchema = z.object({
  productId: z.string().min(1),
  purchaseQuantity: z.number().positive(),
  rateBeforeGstRupees: z.number().nonnegative(),
});

export const createPurchaseSchema = z.object({
  supplierId: z.string().min(1),
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().min(1), // ISO date string
  items: z.array(purchaseItemInputSchema).min(1),
  paymentType: z.enum(["CASH", "UPI", "CHEQUE", "CREDIT"]),
  location: z.enum(["Godown", "In Shop", "Out Shop"]).optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

export const updatePurchaseSchema = createPurchaseSchema;
