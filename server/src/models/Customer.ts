import { Schema, model, Document, Types } from "mongoose";

export interface ICustomer extends Document {
  _id: Types.ObjectId;
  name: string;
  phone?: string;
  address?: string;
  outstandingPaise: number;
  active: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true, trim: true, index: true },
    phone: { type: String, trim: true },
    address: String,
    outstandingPaise: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    notes: String,
  },
  { timestamps: true }
);

export const Customer = model<ICustomer>("Customer", customerSchema);

export type CustomerLedgerEntryType = "SALE_CREDIT" | "PAYMENT" | "ADJUSTMENT";

export interface ICustomerLedgerEntry extends Document {
  _id: Types.ObjectId;
  customerId: Types.ObjectId;
  type: CustomerLedgerEntryType;
  amountPaise: number;
  referenceId?: Types.ObjectId;
  balanceAfterPaise: number;
  notes?: string;
  userId: Types.ObjectId;
  createdAt: Date;
}

const customerLedgerEntrySchema = new Schema<ICustomerLedgerEntry>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    type: { type: String, enum: ["SALE_CREDIT", "PAYMENT", "ADJUSTMENT"], required: true },
    amountPaise: { type: Number, required: true },
    referenceId: { type: Schema.Types.ObjectId },
    balanceAfterPaise: { type: Number, required: true },
    notes: String,
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
customerLedgerEntrySchema.index({ customerId: 1, createdAt: -1 });

export const CustomerLedgerEntry = model<ICustomerLedgerEntry>(
  "CustomerLedgerEntry",
  customerLedgerEntrySchema
);
