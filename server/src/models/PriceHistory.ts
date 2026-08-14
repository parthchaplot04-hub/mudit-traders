import { Schema, model, Document, Types } from "mongoose";

export interface IPriceHistory extends Document {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  field: "sellingPrice" | "purchaseCost" | "mrp";
  oldPaise: number;
  newPaise: number;
  userId: Types.ObjectId;
  createdAt: Date;
}

const priceHistorySchema = new Schema<IPriceHistory>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    field: { type: String, enum: ["sellingPrice", "purchaseCost", "mrp"], required: true },
    oldPaise: { type: Number, required: true },
    newPaise: { type: Number, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const PriceHistory = model<IPriceHistory>("PriceHistory", priceHistorySchema);
