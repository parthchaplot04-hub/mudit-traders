import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { Expense } from "../models/Expense";
import { createExpenseSchema } from "../validators/expenseValidators";
import { rupeesToPaise } from "../utils/money";

export async function listExpenses(req: AuthedRequest, res: Response) {
  // Can add pagination/filtering later, simple list for now
  const expenses = await Expense.find()
    .sort({ expenseDate: -1, createdAt: -1 })
    .populate("userId", "name role")
    .limit(200); // safety limit
  return res.json({ items: expenses });
}

export async function createExpense(req: AuthedRequest, res: Response) {
  const parsed = createExpenseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }

  const expense = await Expense.create({
    title: parsed.data.title,
    amountPaise: rupeesToPaise(parsed.data.amountRupees),
    description: parsed.data.description,
    paymentMode: parsed.data.paymentMode,
    expenseDate: parsed.data.expenseDate ? new Date(parsed.data.expenseDate) : new Date(),
    userId: req.user!.userId,
  });

  return res.status(201).json({ expense });
}
