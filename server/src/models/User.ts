import { Schema, model, Document, Types } from "mongoose";
import bcrypt from "bcryptjs";

export type UserRole = "OWNER" | "STAFF" | "ADMIN";

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["OWNER", "STAFF", "ADMIN"],
      required: true,
      default: "STAFF",
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.statics.hashPassword = async function (plain: string) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
};

export const User = model<IUser>("User", userSchema);
