import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { createPurchaseSchema } from "../validators/purchaseValidators";
import * as purchaseService from "../services/purchaseService";
import { Purchase } from "../models/Purchase";
import mongoose from "mongoose";

export async function createPurchase(req: AuthedRequest, res: Response) {
  const parsed = createPurchaseSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }
  try {
    const purchase = await purchaseService.createPurchase(parsed.data, req.user!.userId);
    return res.status(201).json({ purchase });
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message || "Unable to complete purchase. No changes were made." });
  }
}

export async function updatePurchase(req: AuthedRequest, res: Response) {
  const parsed = createPurchaseSchema.safeParse(req.body); // update uses same schema
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }
  try {
    const purchase = await purchaseService.updatePurchase(req.params.id, parsed.data, req.user!.userId);
    return res.json({ purchase });
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message || "Unable to update purchase. No changes were made." });
  }
}

export async function listPurchases(req: AuthedRequest, res: Response) {
  const page = parseInt((req.query.page as string) || "1", 10);
  const limit = Math.min(parseInt((req.query.limit as string) || "25", 10), 100);
  const filter: Record<string, unknown> = {};
  if (req.query.supplierId) filter.supplierId = req.query.supplierId;

  const [items, total] = await Promise.all([
    Purchase.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Purchase.countDocuments(filter),
  ]);
  return res.json({ items, page, limit, total, totalPages: Math.ceil(total / limit) });
}

export async function getPurchase(req: AuthedRequest, res: Response) {
  const purchase = await Purchase.findById(req.params.id);
  if (!purchase) return res.status(404).json({ error: "Purchase not found" });
  return res.json({ purchase });
}

export async function cancelPurchase(req: AuthedRequest, res: Response) {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!.userId);
    const purchase = await purchaseService.cancelPurchase(req.params.id, userId);
    return res.json({ message: "Purchase cancelled successfully", purchase });
  } catch (error: any) {
    if (error.name === "PurchaseError") {
      return res.status(error.statusCode || 400).json({ error: error.message });
    }
    console.error("Cancel purchase error:", error);
    return res.status(500).json({ error: "Failed to cancel purchase" });
  }
}
