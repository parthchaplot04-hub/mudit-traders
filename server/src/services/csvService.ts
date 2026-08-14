import mongoose from "mongoose";
import { z } from "zod";
import { parseCsvToObjects, toCsv } from "../utils/csv";
import { Product } from "../models/Product";
import { Supplier, SupplierLedgerEntry } from "../models/Supplier";
import { Sale } from "../models/Sale";
import { Purchase } from "../models/Purchase";
import { rupeesToPaise, paiseToRupees } from "../utils/money";

export class CsvError extends Error {
  status: number;
  rowErrors?: { row: number; errors: string[] }[];
  constructor(message: string, status = 400, rowErrors?: { row: number; errors: string[] }[]) {
    super(message);
    this.status = status;
    this.rowErrors = rowErrors;
  }
}

const unitEnum = z.enum(["kg", "g", "mg", "L", "ml", "pcs", "packet", "box", "carton", "tin", "bag"]);

const productCsvRowSchema = z.object({
  productCode: z.string().min(1, "productCode is required"),
  productName: z.string().min(1, "productName is required"),
  category: z.string().min(1, "category is required"),
  stockUnit: unitEnum,
  purchaseUnit: unitEnum,
  salesUnit: unitEnum,
  conversionFactor: z.coerce.number().positive("conversionFactor must be a positive number"),
  sellingPriceRupees: z.coerce.number().nonnegative(),
  purchaseCostRupees: z.coerce.number().nonnegative(),
  gstRate: z.coerce.number().min(0).max(28),
  reorderLevel: z.coerce.number().nonnegative(),
  reorderQuantity: z.coerce.number().nonnegative(),
  hindiName: z.string().optional(),
  brand: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * Imports products from CSV. Validates EVERY row first; if any row is
 * invalid, nothing is imported and the full list of row-level errors is
 * returned (spec section 39: "Do not partially import invalid financial
 * data"). Valid rows are upserted by productCode inside one transaction.
 */
export async function importProductsCsv(csvText: string) {
  const rawRows = parseCsvToObjects(csvText);
  if (rawRows.length === 0) {
    throw new CsvError("CSV file has no data rows");
  }

  const rowErrors: { row: number; errors: string[] }[] = [];
  const validRows: z.infer<typeof productCsvRowSchema>[] = [];

  rawRows.forEach((raw, idx) => {
    const parsed = productCsvRowSchema.safeParse(raw);
    if (!parsed.success) {
      rowErrors.push({
        row: idx + 2, // +2: 1-indexed, plus header row
        errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      });
    } else {
      validRows.push(parsed.data);
    }
  });

  if (rowErrors.length > 0) {
    throw new CsvError(`${rowErrors.length} row(s) failed validation. No products were imported.`, 400, rowErrors);
  }

  const session = await mongoose.startSession();
  let importedCount = 0;
  try {
    await session.withTransaction(async () => {
      for (const row of validRows) {
        await Product.findOneAndUpdate(
          { productCode: row.productCode },
          {
            $set: {
              productName: row.productName,
              category: row.category,
              stockUnit: row.stockUnit,
              purchaseUnit: row.purchaseUnit,
              salesUnit: row.salesUnit,
              conversionFactor: row.conversionFactor,
              sellingPricePaise: rupeesToPaise(row.sellingPriceRupees),
              purchaseCostPaise: rupeesToPaise(row.purchaseCostRupees),
              gstRate: row.gstRate,
              reorderLevel: row.reorderLevel,
              reorderQuantity: row.reorderQuantity,
              hindiName: row.hindiName || undefined,
              brand: row.brand || undefined,
              notes: row.notes || undefined,
            },
            $setOnInsert: { currentStock: 0, active: true },
          },
          { upsert: true, session }
        );
        importedCount++;
      }
    });
  } finally {
    await session.endSession();
  }

  return { importedCount };
}

const supplierCsvRowSchema = z.object({
  supplierName: z.string().min(1, "supplierName is required"),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  gstin: z.string().optional(),
  address: z.string().optional(),
  creditLimitRupees: z.coerce.number().nonnegative().optional(),
  paymentTerms: z.string().optional(),
  openingOutstandingRupees: z.coerce.number().nonnegative().default(0),
  notes: z.string().optional(),
});

export async function importSuppliersCsv(csvText: string) {
  const rawRows = parseCsvToObjects(csvText);
  if (rawRows.length === 0) {
    throw new CsvError("CSV file has no data rows");
  }

  const rowErrors: { row: number; errors: string[] }[] = [];
  const validRows: z.infer<typeof supplierCsvRowSchema>[] = [];

  rawRows.forEach((raw, idx) => {
    const parsed = supplierCsvRowSchema.safeParse(raw);
    if (!parsed.success) {
      rowErrors.push({
        row: idx + 2,
        errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      });
    } else {
      validRows.push(parsed.data);
    }
  });

  if (rowErrors.length > 0) {
    throw new CsvError(`${rowErrors.length} row(s) failed validation. No suppliers were imported.`, 400, rowErrors);
  }

  const session = await mongoose.startSession();
  let importedCount = 0;
  try {
    await session.withTransaction(async () => {
      for (const row of validRows) {
        const openingOutstandingPaise = rupeesToPaise(row.openingOutstandingRupees);
        await Supplier.findOneAndUpdate(
          { supplierName: row.supplierName },
          {
            $set: {
              contactPerson: row.contactPerson || undefined,
              phone: row.phone || undefined,
              whatsapp: row.whatsapp || undefined,
              gstin: row.gstin || undefined,
              address: row.address || undefined,
              creditLimitPaise:
                row.creditLimitRupees !== undefined ? rupeesToPaise(row.creditLimitRupees) : undefined,
              paymentTerms: row.paymentTerms || undefined,
              notes: row.notes || undefined,
            },
            $setOnInsert: {
              openingOutstandingPaise,
              currentOutstandingPaise: openingOutstandingPaise,
              active: true,
            },
          },
          { upsert: true, session }
        );
        importedCount++;
      }
    });
  } finally {
    await session.endSession();
  }

  return { importedCount };
}

// ---------------------------------------------------------------------------
// EXPORTS - all pull live data from MongoDB; nothing hardcoded.
// ---------------------------------------------------------------------------

export async function exportProductsCsv(): Promise<string> {
  const products = await Product.find().sort({ productName: 1 });
  const rows = products.map((p) => ({
    productCode: p.productCode,
    productName: p.productName,
    category: p.category,
    stockUnit: p.stockUnit,
    purchaseUnit: p.purchaseUnit,
    salesUnit: p.salesUnit,
    conversionFactor: p.conversionFactor,
    sellingPriceRupees: paiseToRupees(p.sellingPricePaise),
    purchaseCostRupees: paiseToRupees(p.purchaseCostPaise),
    gstRate: p.gstRate,
    currentStock: p.currentStock,
    reorderLevel: p.reorderLevel,
    reorderQuantity: p.reorderQuantity,
    hindiName: p.hindiName || "",
    brand: p.brand || "",
    active: p.active,
  }));
  return toCsv(rows, [
    "productCode", "productName", "category", "stockUnit", "purchaseUnit", "salesUnit",
    "conversionFactor", "sellingPriceRupees", "purchaseCostRupees", "gstRate",
    "currentStock", "reorderLevel", "reorderQuantity", "hindiName", "brand", "active",
  ]);
}

export async function exportInventoryCsv(): Promise<string> {
  const products = await Product.find({ active: true }).sort({ category: 1, productName: 1 });
  const rows = products.map((p) => ({
    productCode: p.productCode,
    productName: p.productName,
    category: p.category,
    currentStock: p.currentStock,
    stockUnit: p.stockUnit,
    reorderLevel: p.reorderLevel,
    inventoryValueRupees: paiseToRupees(p.currentStock * p.sellingPricePaise),
  }));
  return toCsv(rows, [
    "productCode", "productName", "category", "currentStock", "stockUnit",
    "reorderLevel", "inventoryValueRupees",
  ]);
}

export async function exportSalesCsv(startDate?: string, endDate?: string): Promise<string> {
  const filter: Record<string, unknown> = {};
  if (startDate || endDate) {
    filter.createdAt = {
      ...(startDate ? { $gte: new Date(startDate) } : {}),
      ...(endDate ? { $lte: new Date(endDate) } : {}),
    };
  }
  const sales = await Sale.find(filter).sort({ createdAt: -1 }).limit(5000);
  const rows = sales.map((s) => ({
    billNumber: s.billNumber,
    date: s.createdAt.toISOString(),
    itemCount: s.items.length,
    subtotalRupees: paiseToRupees(s.subtotalPaise),
    discountRupees: paiseToRupees(s.discountPaise),
    gstRupees: paiseToRupees(s.totalGstPaise),
    totalRupees: paiseToRupees(s.totalPaise),
    paymentType: s.paymentType,
    status: s.status,
  }));
  return toCsv(rows, [
    "billNumber", "date", "itemCount", "subtotalRupees", "discountRupees",
    "gstRupees", "totalRupees", "paymentType", "status",
  ]);
}

export async function exportPurchasesCsv(): Promise<string> {
  const purchases = await Purchase.find().sort({ createdAt: -1 }).populate("supplierId", "supplierName").limit(5000);
  const rows = purchases.map((p: any) => ({
    invoiceNumber: p.invoiceNumber,
    invoiceDate: p.invoiceDate.toISOString().slice(0, 10),
    supplier: p.supplierId?.supplierName || "",
    itemCount: p.items.length,
    taxableValueRupees: paiseToRupees(p.taxableValuePaise),
    gstRupees: paiseToRupees(p.totalGstPaise),
    totalRupees: paiseToRupees(p.totalAmountPaise),
    paymentType: p.paymentType,
  }));
  return toCsv(rows, [
    "invoiceNumber", "invoiceDate", "supplier", "itemCount",
    "taxableValueRupees", "gstRupees", "totalRupees", "paymentType",
  ]);
}

export async function exportSuppliersCsv(): Promise<string> {
  const suppliers = await Supplier.find().sort({ supplierName: 1 });
  const rows = suppliers.map((s) => ({
    supplierName: s.supplierName,
    contactPerson: s.contactPerson || "",
    phone: s.phone || "",
    whatsapp: s.whatsapp || "",
    gstin: s.gstin || "",
    address: s.address || "",
    creditLimitRupees: s.creditLimitPaise !== undefined ? paiseToRupees(s.creditLimitPaise) : "",
    paymentTerms: s.paymentTerms || "",
    openingOutstandingRupees: paiseToRupees(s.openingOutstandingPaise),
    currentOutstandingRupees: paiseToRupees(s.currentOutstandingPaise),
    active: s.active,
  }));
  return toCsv(rows, [
    "supplierName", "contactPerson", "phone", "whatsapp", "gstin", "address",
    "creditLimitRupees", "paymentTerms", "openingOutstandingRupees",
    "currentOutstandingRupees", "active",
  ]);
}

export async function exportSupplierLedgerCsv(supplierId: string): Promise<string> {
  const entries = await SupplierLedgerEntry.find({ supplierId }).sort({ createdAt: 1 });
  const rows = entries.map((e) => ({
    date: e.createdAt.toISOString(),
    type: e.type,
    amountRupees: paiseToRupees(e.amountPaise),
    balanceAfterRupees: paiseToRupees(e.balanceAfterPaise),
    notes: e.notes || "",
  }));
  return toCsv(rows, ["date", "type", "amountRupees", "balanceAfterRupees", "notes"]);
}
