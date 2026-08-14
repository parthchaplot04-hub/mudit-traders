import { Schema, model, Document, Types } from "mongoose";
import type { PaymentType } from "./Purchase";

export interface ISaleItem {
  productId: Types.ObjectId;
  productName: string;
  salesUnit: string;
  quantity: number;
  unitPricePaise: number;
  gstRate: number;
  taxableValuePaise: number;
  gstPaise: number;
  totalPaise: number;
}

const saleItemSchema = new Schema<ISaleItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    salesUnit: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0.001 },
    unitPricePaise: { type: Number, required: true, min: 0 },
    gstRate: { type: Number, required: true, default: 0 },
    taxableValuePaise: { type: Number, required: true },
    gstPaise: { type: Number, required: true, default: 0 },
    totalPaise: { type: Number, required: true },
  },
  { _id: false }
);

export type SaleStatus = "COMPLETED" | "CANCELLED";

export interface ISale extends Document {
  _id: Types.ObjectId;
  billNumber: string;
  customerId?: Types.ObjectId;
  items: ISaleItem[];
  subtotalPaise: number;
  discountPaise: number;
  totalGstPaise: number;
  totalPaise: number;
  paymentType: PaymentType;
  status: SaleStatus;
  cancelledReason?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const saleSchema = new Schema<ISale>(
  {
    billNumber: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    items: { type: [saleItemSchema], required: true, validate: (v: unknown[]) => v.length > 0 },
    subtotalPaise: { type: Number, required: true },
    discountPaise: { type: Number, required: true, default: 0 },
    totalGstPaise: { type: Number, required: true, default: 0 },
    totalPaise: { type: Number, required: true },
    paymentType: { type: String, enum: ["CASH", "UPI", "CHEQUE", "CREDIT"], required: true },
    status: { type: String, enum: ["COMPLETED", "CANCELLED"], default: "COMPLETED" },
    cancelledReason: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

saleSchema.index({ createdAt: -1 });
saleSchema.index({ customerId: 1, createdAt: -1 });
saleSchema.index({ paymentType: 1, createdAt: -1 });

export const Sale = model<ISale>("Sale", saleSchema);
