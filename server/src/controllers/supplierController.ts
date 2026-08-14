import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { Supplier } from "../models/Supplier";
import { createSupplierSchema, supplierPaymentSchema } from "../validators/supplierValidators";
import * as supplierService from "../services/supplierService";

export async function listSuppliers(req: AuthedRequest, res: Response) {
  const suppliers = await Supplier.find({ active: true }).sort({ supplierName: 1 });
  return res.json({ items: suppliers });
}

export async function getSupplier(req: AuthedRequest, res: Response) {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) return res.status(404).json({ error: "Supplier not found" });
  return res.json({ supplier });
}

export async function createSupplier(req: AuthedRequest, res: Response) {
  const parsed = createSupplierSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }
  const supplier = await supplierService.createSupplier(parsed.data);
  return res.status(201).json({ supplier });
}

export async function getSupplierLedger(req: AuthedRequest, res: Response) {
  const entries = await supplierService.getSupplierLedger(req.params.id);
  return res.json({ items: entries });
}

export async function recordPayment(req: AuthedRequest, res: Response) {
  const parsed = supplierPaymentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }
  try {
    const result = await supplierService.recordSupplierPayment(
      req.params.id,
      parsed.data.amountRupees,
      parsed.data.notes,
      req.user!.userId
    );
    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}
