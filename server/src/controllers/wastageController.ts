import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { createWastageSchema } from "../validators/wastageValidators";
import * as wastageService from "../services/wastageService";
import { Wastage } from "../models/Wastage";

export async function createWastage(req: AuthedRequest, res: Response) {
  const parsed = createWastageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }
  try {
    const wastage = await wastageService.recordWastage(parsed.data, req.user!.userId);
    return res.status(201).json({ wastage });
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message });
  }
}

export async function listWastage(req: AuthedRequest, res: Response) {
  const items = await Wastage.find().sort({ createdAt: -1 }).limit(200);
  return res.json({ items });
}
