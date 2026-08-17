import { z } from "zod";

export const createExpenseSchema = z.object({
  title: z.string().min(1, "Title is required"),
  amountRupees: z.number().positive("Amount must be positive"),
  description: z.string().optional(),
  paymentMode: z.enum(["CASH", "UPI", "NEFT", "CHEQUE", "OTHER"]),
  expenseDate: z.string().datetime().optional(), // ISO string, defaults to now in controller if missing
});
