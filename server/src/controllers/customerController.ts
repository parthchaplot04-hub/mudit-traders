import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { Customer, CustomerLedgerEntry } from "../models/Customer";
import { z } from "zod";
import { rupeesToPaise } from "../utils/money";

const createCustomerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  aadharNumber: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export async function listCustomers(_req: AuthedRequest, res: Response) {
  const items = await Customer.find({ active: true }).sort({ name: 1 });
  return res.json({ items });
}

export async function createCustomer(req: AuthedRequest, res: Response) {
  const parsed = createCustomerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }
  const customer = await Customer.create(parsed.data);
  return res.status(201).json({ customer });
}

export async function getCustomer(req: AuthedRequest, res: Response) {
  const customer = await Customer.findById(req.params.id);
  if (!customer) return res.status(404).json({ error: "Customer not found" });
  return res.json({ customer });
}

export async function getCustomerLedger(req: AuthedRequest, res: Response) {
  const items = await CustomerLedgerEntry.find({ customerId: req.params.id }).sort({ createdAt: -1 });
  return res.json({ items });
}

const paymentSchema = z.object({ amountRupees: z.number().positive(), notes: z.string().optional() });

export async function recordCustomerPayment(req: AuthedRequest, res: Response) {
  const parsed = paymentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const customer = await Customer.findById(req.params.id);
  if (!customer) return res.status(404).json({ error: "Customer not found" });

  const amountPaise = rupeesToPaise(parsed.data.amountRupees);
  customer.outstandingPaise -= amountPaise;
  await customer.save();

  const entry = await CustomerLedgerEntry.create({
    customerId: customer._id,
    type: "PAYMENT",
    amountPaise: -amountPaise,
    balanceAfterPaise: customer.outstandingPaise,
    notes: parsed.data.notes,
    userId: req.user!.userId,
  });

  return res.status(201).json({ customer, entry });
}
