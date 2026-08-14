import { Schema, model, Document, Types } from "mongoose";

export type StockTransactionType =
  | "PURCHASE" | "CUSTOMER_RETURN" | "POSITIVE_ADJUSTMENT" | "OTHER_IN"
  | "SALE" | "DAMAGE" | "EXPIRY" | "SUPPLIER_RETURN" | "NEGATIVE_ADJUSTMENT" | "OTHER_OUT";

export const STOCK_IN_TYPES: StockTransactionType[] = [
  "PURCHASE", "CUSTOMER_RETURN", "POSITIVE_ADJUSTMENT", "OTHER_IN",
];
export const STOCK_OUT_TYPES: StockTransactionType[] = [
  "SALE", "DAMAGE", "EXPIRY", "SUPPLIER_RETURN", "NEGATIVE_ADJUSTMENT", "OTHER_OUT",
];

export interface IStockTransaction extends Document {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  transactionType: StockTransactionType;
  quantity: number; // always positive; direction comes from transactionType
  unit: string;
  stockBeforeQty: number;
  stockAfterQty: number;
  referenceId?: Types.ObjectId; // Sale._id, Purchase._id, Wastage._id, etc.
  referenceType?: string;
  userId: Types.ObjectId;
  notes?: string;
  createdAt: Date;
}

const stockTransactionSchema = new Schema<IStockTransaction>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    transactionType: {
      type: String,
      enum: [...STOCK_IN_TYPES, ...STOCK_OUT_TYPES],
      required: true,
      index: true,
    },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true },
    stockBeforeQty: { type: Number, required: true },
    stockAfterQty: { type: Number, required: true },
    referenceId: { type: Schema.Types.ObjectId },
    referenceType: { type: String },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    notes: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

stockTransactionSchema.index({ productId: 1, createdAt: -1 });

export const StockTransaction = model<IStockTransaction>(
  "StockTransaction",
  stockTransactionSchema
);
