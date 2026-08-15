import { Schema, model, Document, Types } from "mongoose";

/**
 * DESIGN NOTE: PurchaseItem / SaleItem are embedded subdocuments inside
 * Purchase / Sale rather than separate top-level collections.
 * Reasoning: line items are always read and written together with their
 * parent invoice/bill, never queried independently at scale, and embedding
 * keeps the whole invoice atomic within a single document write (in
 * addition to the multi-document transaction used for stock + ledger).
 * This matches the spirit of the required "PurchaseItem"/"SaleItem"
 * models while being the more idiomatic MongoDB pattern for line items
 * that always belong to one parent.
 */

export interface IPurchaseItem {
  productId: Types.ObjectId;
  productName: string; // snapshot at time of purchase
  purchaseUnit: string;
  purchaseQuantity: number;
  conversionFactor: number;
  stockQuantity: number; // purchaseQuantity * conversionFactor
  rateBeforeGstPaise: number; // per purchase unit
  gstRate: number;
  taxableValuePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  totalPaise: number;
}

const purchaseItemSchema = new Schema<IPurchaseItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    purchaseUnit: { type: String, required: true },
    purchaseQuantity: { type: Number, required: true, min: 0.001 },
    conversionFactor: { type: Number, required: true, min: 0.0001 },
    stockQuantity: { type: Number, required: true },
    rateBeforeGstPaise: { type: Number, required: true, min: 0 },
    gstRate: { type: Number, required: true, default: 0 },
    taxableValuePaise: { type: Number, required: true },
    cgstPaise: { type: Number, required: true, default: 0 },
    sgstPaise: { type: Number, required: true, default: 0 },
    igstPaise: { type: Number, required: true, default: 0 },
    totalPaise: { type: Number, required: true },
  },
  { _id: false }
);

export type PaymentType = "CASH" | "UPI" | "CHEQUE" | "CREDIT";

export interface IPurchase extends Document {
  _id: Types.ObjectId;
  supplierId: Types.ObjectId;
  invoiceNumber: string;
  invoiceDate: Date;
  items: IPurchaseItem[];
  taxableValuePaise: number;
  totalGstPaise: number;
  totalAmountPaise: number;
  paymentType: PaymentType;
  location?: "Godown" | "In Shop" | "Out Shop";
  dueDate?: Date;
  notes?: string;
  cancelled: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const purchaseSchema = new Schema<IPurchase>(
  {
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
    invoiceNumber: { type: String, default: "" },
    invoiceDate: { type: Date, required: true },
    items: { type: [purchaseItemSchema], required: true, validate: (v: unknown[]) => v.length > 0 },
    taxableValuePaise: { type: Number, required: true },
    totalGstPaise: { type: Number, required: true },
    totalAmountPaise: { type: Number, required: true },
    paymentType: { type: String, enum: ["CASH", "UPI", "CHEQUE", "CREDIT"], required: true },
    location: { type: String, enum: ["Godown", "In Shop", "Out Shop"], default: "Godown" },
    dueDate: Date,
    notes: String,
    cancelled: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

purchaseSchema.index({ supplierId: 1, createdAt: -1 });
purchaseSchema.index({ createdAt: -1 });

export const Purchase = model<IPurchase>("Purchase", purchaseSchema);
