import { Schema, model, Document, Types } from "mongoose";

export type OrderStatus = "PENDING" | "PICKING" | "READY_FOR_CHECK" | "CHECKED" | "READY_TO_BILL" | "BILLED" | "COMPLETED" | "CANCELLED";

export interface IOrderItem {
  productId: Types.ObjectId;
  productName: string;
  salesUnit: string;
  orderedQuantity: number;
  pickedQuantity?: number;
  unitPricePaise: number;
  gstRate: number;
  notes?: string;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    salesUnit: { type: String, required: true },
    orderedQuantity: { type: Number, required: true, min: 0.001 },
    pickedQuantity: { type: Number, min: 0 },
    unitPricePaise: { type: Number, required: true, min: 0 },
    gstRate: { type: Number, required: true, default: 0 },
    notes: { type: String },
  },
  { _id: false }
);

export interface IOrder extends Document {
  _id: Types.ObjectId;
  orderNumber: string;
  customerId?: Types.ObjectId;
  status: OrderStatus;
  items: IOrderItem[];
  notes?: string;
  createdBy: Types.ObjectId;
  pickedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    status: {
      type: String,
      enum: ["PENDING", "PICKING", "READY_FOR_CHECK", "CHECKED", "READY_TO_BILL", "BILLED", "COMPLETED", "CANCELLED"],
      default: "PENDING"
    },
    items: { type: [orderItemSchema], required: true, validate: (v: unknown[]) => v.length > 0 },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    pickedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

export const Order = model<IOrder>("Order", orderSchema);
