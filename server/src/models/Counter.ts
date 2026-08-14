import { Schema, model, Document } from "mongoose";

export interface ICounter extends Document {
  key: string;
  sequence: number;
}

const counterSchema = new Schema<ICounter>(
  {
    key: { type: String, required: true, unique: true },
    sequence: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true }
);

export const Counter = model<ICounter>("Counter", counterSchema);
