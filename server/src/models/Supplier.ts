import { Schema, model, Document, Types } from "mongoose";

export interface ISupplier extends Document {
  _id: Types.ObjectId;
  supplierName: string;
  contactPerson?: string;
  phone?: string;
  whatsapp?: string;
  gstin?: string;
  address?: string;
  creditLimitPaise?: number;
  paymentTerms?: string;
  openingOutstandingPaise: number;
  currentOutstandingPaise: number;
  active: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const supplierSchema = new Schema<ISupplier>(
  {
    supplierName: { type: String, required: true, trim: true, index: true },
    contactPerson: String,
    phone: String,
    whatsapp: String,
    gstin: String,
    address: String,
    creditLimitPaise: { type: Number, min: 0 },
    paymentTerms: String,
    openingOutstandingPaise: { type: Number, default: 0 },
    currentOutstandingPaise: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    notes: String,
  },
  { timestamps: true }
);

export const Supplier = model<ISupplier>("Supplier", supplierSchema);

/** Every purchase, payment, or manual adjustment against a supplier
 * creates one immutable ledger entry. currentOutstanding on Supplier is a
 * cached running total; this collection is the source of truth / audit
 * trail behind it. */
export type SupplierLedgerEntryType = "PURCHASE" | "PAYMENT" | "ADJUSTMENT";

export interface ISupplierLedgerEntry extends Document {
  _id: Types.ObjectId;
  supplierId: Types.ObjectId;
  type: SupplierLedgerEntryType;
  amountPaise: number; // positive = increases outstanding, negative = decreases
  referenceId?: Types.ObjectId; // Purchase._id or SupplierPayment._id
  paymentMode?: string; // CASH, UPI, NEFT, CHEQUE, OTHER
  balanceAfterPaise: number;
  notes?: string;
  userId: Types.ObjectId;
  createdAt: Date;
}

const supplierLedgerEntrySchema = new Schema<ISupplierLedgerEntry>(
  {
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
    type: { type: String, enum: ["PURCHASE", "PAYMENT", "ADJUSTMENT"], required: true },
    amountPaise: { type: Number, required: true },
    referenceId: { type: Schema.Types.ObjectId },
    paymentMode: { type: String },
    balanceAfterPaise: { type: Number, required: true },
    notes: String,
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

supplierLedgerEntrySchema.index({ supplierId: 1, createdAt: -1 });

export const SupplierLedgerEntry = model<ISupplierLedgerEntry>(
  "SupplierLedgerEntry",
  supplierLedgerEntrySchema
);
