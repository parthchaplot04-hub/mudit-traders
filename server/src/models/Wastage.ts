import { Schema, model, Document, Types } from "mongoose";

export type WastageReason = "Damaged" | "Expired" | "Leakage" | "Spoiled" | "Broken" | "Other";

export interface IWastage extends Document {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  quantity: number;
  unit: string;
  reason: WastageReason;
  estimatedCostPaise: number;
  notes?: string;
  userId: Types.ObjectId;
  createdAt: Date;
}

const wastageSchema = new Schema<IWastage>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    quantity: { type: Number, required: true, min: 0.001 },
    unit: { type: String, required: true },
    reason: {
      type: String,
      enum: ["Damaged", "Expired", "Leakage", "Spoiled", "Broken", "Other"],
      required: true,
    },
    estimatedCostPaise: { type: Number, required: true, min: 0 },
    notes: String,
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
wastageSchema.index({ createdAt: -1 });

export const Wastage = model<IWastage>("Wastage", wastageSchema);
