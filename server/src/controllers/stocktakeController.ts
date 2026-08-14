import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { createStocktakeSchema } from "../validators/stocktakeValidators";
import * as stocktakeService from "../services/stocktakeService";

export async function createStocktake(req: AuthedRequest, res: Response) {
  const parsed = createStocktakeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  }
  try {
    const stocktake = await stocktakeService.recordStocktake(parsed.data, req.user!.userId);
    return res.status(201).json({ stocktake });
  } catch (err: any) {
    return res.status(err.status || 500).json({ error: err.message || "Unable to save stocktake. No changes were made." });
  }
}

export async function listStocktakes(req: AuthedRequest, res: Response) {
  const items = await stocktakeService.listStocktakes(req.query.productId as string | undefined);
  return res.json({ items });
}
