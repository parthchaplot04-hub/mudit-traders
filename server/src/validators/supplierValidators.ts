import { z } from "zod";

export const createSupplierSchema = z.object({
  supplierName: z.string().min(1),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  gstin: z.string().optional(),
  address: z.string().optional(),
  creditLimitRupees: z.number().nonnegative().optional(),
  paymentTerms: z.string().optional(),
  openingOutstandingRupees: z.number().nonnegative().default(0),
  notes: z.string().optional(),
});

export const supplierPaymentSchema = z.object({
  amountRupees: z.number().positive(),
  notes: z.string().optional(),
});
