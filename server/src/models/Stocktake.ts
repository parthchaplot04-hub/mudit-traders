import { Schema, model, Document, Types } from "mongoose";

export type StocktakeReason = "counting error" | "damage" | "leakage" | "unknown" | "other";

export interface IStocktake extends Document {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  systemStockQty: number;
  actualStockQty: number;
  differenceQty: number; // actual - system (negative = shortage)
  reason: StocktakeReason;
  notes?: string;
  userId: Types.ObjectId;
  createdAt: Date;
}

const stocktakeSchema = new Schema<IStocktake>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    systemStockQty: { type: Number, required: true },
    actualStockQty: { type: Number, required: true, min: 0 },
    differenceQty: { type: Number, required: true },
    reason: {
      type: String,
      enum: ["counting error", "damage", "leakage", "unknown", "other"],
      required: true,
    },
    notes: String,
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
stocktakeSchema.index({ createdAt: -1 });

export const Stocktake = model<IStocktake>("Stocktake", stocktakeSchema);
