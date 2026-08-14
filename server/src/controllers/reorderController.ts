import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { Product } from "../models/Product";
import { getReorderStatus } from "../utils/reorder";

export async function getReorderList(_req: AuthedRequest, res: Response) {
  const products = await Product.find({ active: true }).populate("preferredSupplier", "supplierName");

  const list = products
    .map((p) => ({
      productId: p._id,
      productName: p.productName,
      currentStock: p.currentStock,
      stockUnit: p.stockUnit,
      reorderLevel: p.reorderLevel,
      suggestedOrderQuantity: p.reorderQuantity,
      purchaseUnit: p.purchaseUnit,
      supplier: p.preferredSupplier,
      status: getReorderStatus(p.currentStock, p.reorderLevel),
    }))
    .filter((p) => p.status !== "OK")
    .sort((a, b) => {
      const order = { OUT_OF_STOCK: 0, ORDER_REQUIRED: 1, LOW: 2, OK: 3 };
      return order[a.status] - order[b.status];
    });

  return res.json({ items: list });
}
