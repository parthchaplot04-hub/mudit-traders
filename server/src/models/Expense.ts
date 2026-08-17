import { Schema, model, Document, Types } from "mongoose";

export interface IExpense extends Document {
  _id: Types.ObjectId;
  title: string;
  amountPaise: number;
  description?: string;
  paymentMode: string; // CASH, UPI, NEFT, CHEQUE, OTHER
  expenseDate: Date;
  userId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    title: { type: String, required: true, trim: true },
    amountPaise: { type: Number, required: true, min: 0 },
    description: { type: String },
    paymentMode: { type: String, enum: ["CASH", "UPI", "NEFT", "CHEQUE", "OTHER"], required: true },
    expenseDate: { type: Date, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

expenseSchema.index({ expenseDate: -1 });

export const Expense = model<IExpense>("Expense", expenseSchema);
