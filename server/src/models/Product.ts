import { Schema, model, Document, Types } from "mongoose";

export type StockUnit =
  | "kg" | "g" | "mg" | "L" | "ml"
  | "pcs" | "packet" | "box" | "carton" | "tin" | "bag";

export interface IProduct extends Document {
  _id: Types.ObjectId;
  productCode: string;
  productName: string;
  englishName?: string;
  hindiName?: string;
  aliases: string[];
  category: string;
  brand?: string;
  variant?: string;
  packSize?: string;

  stockUnit: StockUnit;      // unit inventory is tracked in, e.g. "kg"
  purchaseUnit: StockUnit;   // unit supplier invoices in, e.g. "tin"
  salesUnit: StockUnit;      // unit customers buy in, e.g. "kg"
  conversionFactor: number;  // 1 purchaseUnit = conversionFactor stockUnits

  mrpPaise?: number;
  sellingPricePaise: number;   // price per 1 stockUnit
  purchaseCostPaise: number;   // effective cost per 1 stockUnit (last known)
  gstRate: number;             // e.g. 5, 12, 18, 28

  currentStock: number;   // in stockUnit
  reorderLevel: number;   // in stockUnit
  reorderQuantity: number; // suggested purchase quantity, in purchaseUnit
  preferredSupplier?: Types.ObjectId;

  active: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    productCode: { type: String, required: true, unique: true, trim: true },
    productName: { type: String, required: true, trim: true },
    englishName: { type: String, trim: true },
    hindiName: { type: String, trim: true },
    aliases: { type: [String], default: [] },
    category: { type: String, required: true, index: true },
    brand: { type: String, trim: true },
    variant: { type: String, trim: true },
    packSize: { type: String, trim: true },

    stockUnit: { type: String, required: true },
    purchaseUnit: { type: String, required: true },
    salesUnit: { type: String, required: true },
    conversionFactor: { type: Number, required: true, min: 0.0001 },

    mrpPaise: { type: Number, min: 0 },
    sellingPricePaise: { type: Number, required: true, min: 0 },
    purchaseCostPaise: { type: Number, required: true, min: 0 },
    gstRate: { type: Number, required: true, default: 0, min: 0, max: 28 },

    currentStock: { type: Number, required: true, default: 0 },
    reorderLevel: { type: Number, required: true, default: 0 },
    reorderQuantity: { type: Number, required: true, default: 0 },
    preferredSupplier: { type: Schema.Types.ObjectId, ref: "Supplier" },

    active: { type: Boolean, default: true, index: true },
    notes: { type: String },
  },
  { timestamps: true }
);

productSchema.index({ productName: "text", aliases: "text", hindiName: "text", englishName: "text" });
productSchema.index({ category: 1, active: 1 });

export const Product = model<IProduct>("Product", productSchema);
