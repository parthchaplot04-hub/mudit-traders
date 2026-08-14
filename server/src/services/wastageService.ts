import mongoose from "mongoose";
import { Product } from "../models/Product";
import { Wastage } from "../models/Wastage";
import { StockTransaction } from "../models/StockTransaction";

export class WastageError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * TEST 6 from spec: recording wastage of 2kg must reduce stock by 2kg and
 * create a matching stock transaction. Done atomically here.
 */
export async function recordWastage(
  input: { productId: string; quantity: number; reason: string; notes?: string },
  userId: string
) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const product = await Product.findById(input.productId).session(session);
      if (!product) throw new WastageError("Product not found", 404);
      if (product.currentStock < input.quantity) {
        throw new WastageError(
          `Cannot record wastage of ${input.quantity} ${product.stockUnit}: only ${product.currentStock} in stock`,
          409
        );
      }

      const stockBefore = product.currentStock;
      const stockAfter = stockBefore - input.quantity;
      product.currentStock = stockAfter;
      await product.save({ session });

      const estimatedCostPaise = Math.round(product.purchaseCostPaise * input.quantity);

      const [wastage] = await Wastage.create(
        [
          {
            productId: product._id,
            quantity: input.quantity,
            unit: product.stockUnit,
            reason: input.reason,
            estimatedCostPaise,
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
            transactionType: "DAMAGE",
            quantity: input.quantity,
            unit: product.stockUnit,
            stockBeforeQty: stockBefore,
            stockAfterQty: stockAfter,
            referenceId: wastage._id,
            referenceType: "Wastage",
            userId,
          },
        ],
        { session }
      );

      result = wastage;
    });
    return result;
  } finally {
    await session.endSession();
  }
}
