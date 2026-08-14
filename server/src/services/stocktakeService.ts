import mongoose from "mongoose";
import { Product } from "../models/Product";
import { Stocktake, StocktakeReason } from "../models/Stocktake";
import { StockTransaction } from "../models/StockTransaction";
import { AuditLog } from "../models/AuditLog";
import { roundQuantity } from "../utils/conversion";

export class StocktakeError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

interface RecordStocktakeInput {
  productId: string;
  actualStockQty: number;
  reason: StocktakeReason;
  notes?: string;
}

/**
 * Reconciles a product's system stock against a physical count.
 *   Example (spec section 28): system=50kg, actual=48kg -> difference=-2kg
 * A reason is mandatory. The reconciliation is atomic: the Stocktake
 * record, the matching StockTransaction (POSITIVE/NEGATIVE_ADJUSTMENT),
 * the Product.currentStock update, and the AuditLog entry all commit or
 * roll back together.
 */
export async function recordStocktake(input: RecordStocktakeInput, userId: string) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const product = await Product.findById(input.productId).session(session);
      if (!product) throw new StocktakeError("Product not found", 404);

      const systemStockQty = product.currentStock;
      const actualStockQty = roundQuantity(input.actualStockQty);
      const differenceQty = roundQuantity(actualStockQty - systemStockQty);

      if (differenceQty === 0) {
        throw new StocktakeError(
          "Actual stock matches system stock exactly - no adjustment needed",
          400
        );
      }

      product.currentStock = actualStockQty;
      await product.save({ session });

      const [stocktake] = await Stocktake.create(
        [
          {
            productId: product._id,
            systemStockQty,
            actualStockQty,
            differenceQty,
            reason: input.reason,
            notes: input.notes,
            userId,
          },
        ],
        { session }
      );

      await StockTransaction.create(
        [
          {
            productId: product._id,
            transactionType: differenceQty > 0 ? "POSITIVE_ADJUSTMENT" : "NEGATIVE_ADJUSTMENT",
            quantity: Math.abs(differenceQty),
            unit: product.stockUnit,
            stockBeforeQty: systemStockQty,
            stockAfterQty: actualStockQty,
            referenceId: stocktake._id,
            referenceType: "Stocktake",
            userId,
            notes: `Physical count reconciliation: ${input.reason}`,
          },
        ],
        { session }
      );

      await AuditLog.create(
        [
          {
            userId,
            action: "STOCK_ADJUSTMENT",
            entityType: "Product",
            entityId: product._id,
            oldValue: { currentStock: systemStockQty },
            newValue: { currentStock: actualStockQty },
            notes: `Stocktake: ${input.reason}`,
          },
        ],
        { session }
      );

      result = stocktake;
    });
    return result;
  } finally {
    await session.endSession();
  }
}

export async function listStocktakes(productId?: string) {
  const filter = productId ? { productId } : {};
  return Stocktake.find(filter).sort({ createdAt: -1 }).limit(200);
}
