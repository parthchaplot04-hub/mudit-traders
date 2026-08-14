import { Schema, model, Document, Types } from "mongoose";

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  action: string;        // e.g. "PRICE_CHANGE", "STOCK_ADJUSTMENT", "SALE_CANCEL"
  entityType: string;     // e.g. "Product", "Sale", "Purchase"
  entityId: Types.ObjectId;
  oldValue?: unknown;
  newValue?: unknown;
  notes?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    oldValue: Schema.Types.Mixed,
    newValue: Schema.Types.Mixed,
    notes: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
auditLogSchema.index({ createdAt: -1 });

export const AuditLog = model<IAuditLog>("AuditLog", auditLogSchema);
