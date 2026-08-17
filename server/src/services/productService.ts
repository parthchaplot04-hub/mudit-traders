import { Product, IProduct } from "../models/Product";
import { PriceHistory } from "../models/PriceHistory";
import { AuditLog } from "../models/AuditLog";
import mongoose from "mongoose";
import { rupeesToPaise } from "../utils/money";
import { getReorderStatus } from "../utils/reorder";

export class ProductError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

interface CreateProductInput {
  productCode: string;
  productName: string;
  englishName?: string;
  hindiName?: string;
  aliases?: string[];
  category: string;
  brand?: string;
  variant?: string;
  packSize?: string;
  stockUnit: string;
  purchaseUnit: string;
  salesUnit: string;
  conversionFactor: number;
  mrpRupees?: number;
  sellingPriceRupees: number;
  purchaseCostRupees: number;
  gstRate: number;
  reorderLevel: number;
  reorderQuantity: number;
  initialStock?: number;
  notes?: string;
}

export async function createProduct(input: CreateProductInput, userId: string) {
  const existing = await Product.findOne({ productCode: input.productCode });
  if (existing) throw new ProductError("A product with this code already exists", 409);

  const product = await Product.create({
    ...input,
    mrpPaise: input.mrpRupees !== undefined ? rupeesToPaise(input.mrpRupees) : undefined,
    sellingPricePaise: rupeesToPaise(input.sellingPriceRupees),
    purchaseCostPaise: rupeesToPaise(input.purchaseCostRupees),
    currentStock: input.initialStock || 0,
  });

  await AuditLog.create({
    userId,
    action: "PRODUCT_CREATE",
    entityType: "Product",
    entityId: product._id,
    newValue: { productCode: product.productCode, productName: product.productName },
  });

  if (input.initialStock && input.initialStock > 0) {
    const StockTransaction = mongoose.model("StockTransaction");
    await StockTransaction.create({
      productId: product._id,
      transactionType: "OTHER_IN",
      quantity: input.initialStock,
      unit: product.stockUnit,
      stockBeforeQty: 0,
      stockAfterQty: input.initialStock,
      userId,
      notes: "Initial stock setting",
    });
  }

  return product;
}

export async function updateProduct(
  productId: string,
  input: Partial<CreateProductInput>,
  userId: string,
  isOwner: boolean
) {
  const product = await Product.findById(productId);
  if (!product) throw new ProductError("Product not found", 404);

  const priceFieldsTouched =
    input.sellingPriceRupees !== undefined ||
    input.purchaseCostRupees !== undefined ||
    input.mrpRupees !== undefined;

  if (priceFieldsTouched && !isOwner) {
    throw new ProductError("Only the owner can change prices", 403);
  }

  const oldValues: Record<string, unknown> = {};
  const newValues: Record<string, unknown> = {};

  if (input.sellingPriceRupees !== undefined) {
    const newPaise = rupeesToPaise(input.sellingPriceRupees);
    if (newPaise !== product.sellingPricePaise) {
      await PriceHistory.create({
        productId: product._id,
        field: "sellingPrice",
        oldPaise: product.sellingPricePaise,
        newPaise,
        userId,
      });
      oldValues.sellingPricePaise = product.sellingPricePaise;
      newValues.sellingPricePaise = newPaise;
      product.sellingPricePaise = newPaise;
    }
  }
  if (input.purchaseCostRupees !== undefined) {
    const newPaise = rupeesToPaise(input.purchaseCostRupees);
    if (newPaise !== product.purchaseCostPaise) {
      await PriceHistory.create({
        productId: product._id,
        field: "purchaseCost",
        oldPaise: product.purchaseCostPaise,
        newPaise,
        userId,
      });
      product.purchaseCostPaise = newPaise;
    }
  }
  if (input.mrpRupees !== undefined) {
    product.mrpPaise = rupeesToPaise(input.mrpRupees);
  }

  const passthroughFields: (keyof CreateProductInput)[] = [
    "productName", "englishName", "hindiName", "aliases", "category", "brand",
    "variant", "packSize", "stockUnit", "purchaseUnit", "salesUnit",
    "conversionFactor", "gstRate", "reorderLevel", "reorderQuantity", "notes",
  ];
  for (const field of passthroughFields) {
    if (input[field] !== undefined) {
      (product as unknown as Record<string, unknown>)[field] = input[field];
    }
  }

  await product.save();

  if (Object.keys(newValues).length > 0) {
    await AuditLog.create({
      userId,
      action: "PRICE_CHANGE",
      entityType: "Product",
      entityId: product._id,
      oldValue: oldValues,
      newValue: newValues,
    });
  }

  return product;
}

export async function deactivateProduct(productId: string, userId: string) {
  const product = await Product.findById(productId);
  if (!product) throw new ProductError("Product not found", 404);
  product.active = false;
  await product.save();
  await AuditLog.create({
    userId,
    action: "PRODUCT_DEACTIVATE",
    entityType: "Product",
    entityId: product._id,
  });
  return product;
}

export interface SearchProductsOptions {
  q?: string;
  category?: string;
  active?: boolean;
  page?: number;
  limit?: number;
}

export async function searchProducts(opts: SearchProductsOptions) {
  const page = opts.page && opts.page > 0 ? opts.page : 1;
  const limit = opts.limit && opts.limit > 0 && opts.limit <= 100 ? opts.limit : 25;

  const filter: Record<string, unknown> = {};
  if (opts.active !== undefined) filter.active = opts.active;
  if (opts.category) filter.category = opts.category;
  if (opts.q) {
    const regex = new RegExp(opts.q.trim(), "i");
    filter.$or = [
      { productName: regex },
      { englishName: regex },
      { hindiName: regex },
      { productCode: regex },
      { brand: regex },
      { aliases: regex },
    ];
  }

  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort({ productName: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export function withReorderStatus(product: IProduct) {
  return {
    ...product.toObject(),
    reorderStatus: getReorderStatus(product.currentStock, product.reorderLevel),
  };
}
