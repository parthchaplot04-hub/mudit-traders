import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { createSaleSchema, cancelSaleSchema } from "../validators/saleValidators";
import * as saleService from "../services/saleService";
import { Sale } from "../models/Sale";

export async function createSale(req: AuthedRequest, res: Response) {
  const parsed = createSaleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }
  try {
    const sale = await saleService.createSale(parsed.data, req.user!.userId);
    return res.status(201).json({ sale });
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message || "Unable to complete sale. No changes were made." });
  }
}

export async function listSales(req: AuthedRequest, res: Response) {
  const page = parseInt((req.query.page as string) || "1", 10);
  const limit = Math.min(parseInt((req.query.limit as string) || "25", 10), 100);
  const filter: any = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.paymentType) filter.paymentType = req.query.paymentType;
  
  if (req.query.q) {
    const q = req.query.q as string;
    const regex = new RegExp(q, "i");
    
    // Find matching customers first
    const mongoose = require("mongoose");
    const Customer = mongoose.model("Customer");
    const matchingCustomers = await Customer.find({ name: regex }, "_id");
    const customerIds = matchingCustomers.map((c: any) => c._id);
    
    filter.$or = [
      { billNumber: regex },
      { customerName: regex },
      { customerPhone: regex },
      { customerId: { $in: customerIds } }
    ];
  }

  const [items, total] = await Promise.all([
    Sale.find(filter)
      .populate("customerId", "name phone")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Sale.countDocuments(filter),
  ]);
  return res.json({ items, page, limit, total, totalPages: Math.ceil(total / limit) });
}

export async function getSale(req: AuthedRequest, res: Response) {
  const sale = await Sale.findById(req.params.id);
  if (!sale) return res.status(404).json({ error: "Sale not found" });
  return res.json({ sale });
}

export async function cancelSale(req: AuthedRequest, res: Response) {
  const parsed = cancelSaleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "A cancellation reason is required" });
  }
  try {
    const sale = await saleService.cancelSale(req.params.id, parsed.data.reason, req.user!.userId);
    return res.json({ sale });
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}
