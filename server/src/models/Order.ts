import { Schema, model, Document, Types } from "mongoose";

export type OrderStatus = 
  | "WAITING_FOR_STAFF"
  | "COLLECTING_ITEMS"
  | "PACKING"
  | "WAITING_FOR_OWNER_CHECK"
  | "OWNER_CHECKING"
  | "READY_FOR_BILLING"
  | "BILL_CREATED"
  | "PAYMENT_PENDING"
  | "READY_FOR_HANDOVER"
  | "COMPLETED"
  | "CANCELLED";

export interface IOrderItem {
  productId: Types.ObjectId;
  productName: string;
  salesUnit: string;
  orderedQuantity: number;
  pickedQuantity?: number;
  unitPricePaise: number;
  gstRate: number;
  notes?: string;
  
  // Strict workflow flags
  isCollected: boolean;
  collectedAt?: Date;
  isPacked: boolean;
  packedAt?: Date;
  isVerified: boolean;
  verifiedAt?: Date;
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
    
    isCollected: { type: Boolean, default: false },
    collectedAt: { type: Date },
    isPacked: { type: Boolean, default: false },
    packedAt: { type: Date },
    isVerified: { type: Boolean, default: false },
    verifiedAt: { type: Date },
  },
  { _id: true } // generate subdoc _id for easy toggling
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
  
  // Post-billing tracking
  invoiceId?: Types.ObjectId;
  paymentStatus: "PENDING" | "COMPLETED";
  paymentMode?: string;
  amountPaidPaise?: number;
  paymentReceivedAt?: Date;
  
  handoverStatus: "PENDING" | "COMPLETED";
  handedOverAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
    status: {
      type: String,
      enum: [
        "WAITING_FOR_STAFF",
        "COLLECTING_ITEMS",
        "PACKING",
        "WAITING_FOR_OWNER_CHECK",
        "OWNER_CHECKING",
        "READY_FOR_BILLING",
        "BILL_CREATED",
        "PAYMENT_PENDING",
        "READY_FOR_HANDOVER",
        "COMPLETED",
        "CANCELLED"
      ],
      default: "WAITING_FOR_STAFF"
    },
    items: { type: [orderItemSchema], required: true, validate: (v: unknown[]) => v.length > 0 },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    pickedBy: { type: Schema.Types.ObjectId, ref: "User" },
    
    invoiceId: { type: Schema.Types.ObjectId, ref: "Sale" },
    paymentStatus: { type: String, enum: ["PENDING", "COMPLETED"], default: "PENDING" },
    paymentMode: { type: String, enum: ["CASH", "UPI", "CREDIT", "CHEQUE", "OTHER"] },
    amountPaidPaise: { type: Number },
    paymentReceivedAt: { type: Date },
    
    handoverStatus: { type: String, enum: ["PENDING", "COMPLETED"], default: "PENDING" },
    handedOverAt: { type: Date },
  },
  { timestamps: true }
);

orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

export const Order = model<IOrder>("Order", orderSchema);
