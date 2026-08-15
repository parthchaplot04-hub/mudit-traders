import mongoose from "mongoose";
import { Product } from "../models/Product";
import { Purchase, IPurchaseItem } from "../models/Purchase";
import { Supplier, SupplierLedgerEntry } from "../models/Supplier";
import { StockTransaction } from "../models/StockTransaction";
import { convertPurchaseToStock } from "../utils/conversion";
import { rupeesToPaise, applyPercentage } from "../utils/money";

export class PurchaseError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

interface CreatePurchaseItemInput {
  productId: string;
  purchaseQuantity: number;
  rateBeforeGstRupees: number;
}

interface CreatePurchaseInput {
  supplierId: string;
  invoiceNumber?: string;
  invoiceDate: string;
  items: CreatePurchaseItemInput[];
  paymentType: "CASH" | "UPI" | "CHEQUE" | "CREDIT";
  location?: "Godown" | "In Shop" | "Out Shop";
  offloadedBy?: "Owner" | "Ramesh" | "Radhe shyam" | "others";
  dueDate?: string;
  notes?: string;
}

/**
 * Creates a purchase and, in the SAME MongoDB transaction:
 *  - builds line items (converting purchase qty -> stock qty, computing GST)
 *  - creates one StockTransaction per line item and increases Product.currentStock
 *  - if paymentType is CREDIT, increases the supplier's outstanding balance
 *    and writes a SupplierLedgerEntry
 * If any step fails, everything rolls back - there is no code path that
 * leaves a purchase saved without matching stock/ledger updates, or vice
 * versa (see spec section 8 / 25).
 */
export async function createPurchase(input: CreatePurchaseInput, userId: string) {
  const supplier = await Supplier.findById(input.supplierId);
  if (!supplier) throw new PurchaseError("Supplier not found", 404);

  const session = await mongoose.startSession();
  try {
    let purchaseDoc;
    // Pre-generate the id so StockTransaction.referenceId can point at it
    // without a fragile after-the-fact lookup/backfill.
    const purchaseId = new mongoose.Types.ObjectId();

    await session.withTransaction(async () => {
      const items: IPurchaseItem[] = [];
      let taxableValuePaise = 0;
      let totalGstPaise = 0;
      let totalAmountPaise = 0;

      for (const line of input.items) {
        const product = await Product.findById(line.productId).session(session);
        if (!product) {
          throw new PurchaseError(`Product ${line.productId} not found`, 404);
        }

        const stockQuantity = convertPurchaseToStock({
          purchaseQuantity: line.purchaseQuantity,
          conversionFactor: product.conversionFactor,
        });

        const rateBeforeGstPaise = rupeesToPaise(line.rateBeforeGstRupees);
        const lineTaxableValuePaise = Math.round(rateBeforeGstPaise * line.purchaseQuantity);
        const lineGstPaise = applyPercentage(lineTaxableValuePaise, product.gstRate);
        // Intra-state assumption for CGST/SGST split; IGST used if supplier
        // is flagged inter-state in future - kept at 0 for V1 (documented
        // as a simplification in README, matches spec section 34 note that
        // this system is not a substitute for a CA).
        const cgstPaise = Math.round(lineGstPaise / 2);
        const sgstPaise = lineGstPaise - cgstPaise;
        const lineTotalPaise = lineTaxableValuePaise + lineGstPaise;

        items.push({
          productId: product._id,
          productName: product.productName,
          purchaseUnit: product.purchaseUnit,
          purchaseQuantity: line.purchaseQuantity,
          conversionFactor: product.conversionFactor,
          stockQuantity,
          rateBeforeGstPaise,
          gstRate: product.gstRate,
          taxableValuePaise: lineTaxableValuePaise,
          cgstPaise,
          sgstPaise,
          igstPaise: 0,
          totalPaise: lineTotalPaise,
        });

        taxableValuePaise += lineTaxableValuePaise;
        totalGstPaise += lineGstPaise;
        totalAmountPaise += lineTotalPaise;

        // --- Stock increase + audit trail (same transaction) ---
        const stockBefore = product.currentStock;
        const stockAfter = stockBefore + stockQuantity;
        product.currentStock = stockAfter;
        // Effective purchase cost per stock unit, for margin reporting.
        product.purchaseCostPaise = Math.round(rateBeforeGstPaise / product.conversionFactor);
        await product.save({ session });

        await StockTransaction.create(
          [
            {
              productId: product._id,
              transactionType: "PURCHASE",
              quantity: stockQuantity,
              unit: product.stockUnit,
              stockBeforeQty: stockBefore,
              stockAfterQty: product.currentStock,
              referenceId: purchaseId,
              referenceType: "Purchase",
              location: input.location || "Godown",
              userId,
            },
          ],
          { session }
        );
      }

      const [created] = await Purchase.create(
        [
          {
            _id: purchaseId,
            supplierId: supplier._id,
            invoiceNumber: input.invoiceNumber || "",
            invoiceDate: new Date(input.invoiceDate),
            items,
            taxableValuePaise,
            totalGstPaise,
            totalAmountPaise,
            paymentType: input.paymentType,
            location: input.location || "Godown",
            offloadedBy: input.offloadedBy || "Owner",
            dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
            notes: input.notes,
            createdBy: userId,
          },
        ],
        { session }
      );
      purchaseDoc = created;

      // --- Supplier outstanding (credit purchases only) ---
      if (input.paymentType === "CREDIT") {
        supplier.currentOutstandingPaise += totalAmountPaise;
        await supplier.save({ session });

        await SupplierLedgerEntry.create(
          [
            {
              supplierId: supplier._id,
              type: "PURCHASE",
              amountPaise: totalAmountPaise,
              referenceId: created._id,
              balanceAfterPaise: supplier.currentOutstandingPaise,
              userId,
            },
          ],
          { session }
        );
      }
    });

    return purchaseDoc;
  } finally {
    await session.endSession();
  }
}

export async function updatePurchase(purchaseId: string, input: CreatePurchaseInput, userId: string) {
  const session = await mongoose.startSession();
  try {
    let updatedPurchaseDoc;

    await session.withTransaction(async () => {
      const oldPurchase = await Purchase.findById(purchaseId).session(session);
      if (!oldPurchase) throw new PurchaseError("Purchase not found", 404);

      const oldSupplier = await Supplier.findById(oldPurchase.supplierId).session(session);
      if (!oldSupplier) throw new PurchaseError("Original supplier not found", 404);

      // --- STEP 1: ROLLBACK OLD PURCHASE ---
      // Reverse stock additions
      for (const oldItem of oldPurchase.items) {
        const product = await Product.findById(oldItem.productId).session(session);
        if (product) {
          const stockBefore = product.currentStock;
          const stockAfter = stockBefore - oldItem.stockQuantity;
          product.currentStock = stockAfter;
          await product.save({ session });

          await StockTransaction.create(
            [
              {
                productId: product._id,
                transactionType: "NEGATIVE_ADJUSTMENT",
                quantity: oldItem.stockQuantity,
                unit: product.stockUnit,
                stockBeforeQty: stockBefore,
                stockAfterQty: stockAfter,
                referenceId: oldPurchase._id,
                referenceType: "PurchaseEditRollback",
                userId,
                notes: `Reversal for editing purchase ${oldPurchase.invoiceNumber}`,
              },
            ],
            { session }
          );
        }
      }

      // Reverse supplier outstanding balance if credit
      if (oldPurchase.paymentType === "CREDIT") {
        oldSupplier.currentOutstandingPaise -= oldPurchase.totalAmountPaise;
        await oldSupplier.save({ session });

        await SupplierLedgerEntry.create(
          [
            {
              supplierId: oldSupplier._id,
              type: "PAYMENT_OUT",
              amountPaise: oldPurchase.totalAmountPaise,
              referenceId: oldPurchase._id,
              balanceAfterPaise: oldSupplier.currentOutstandingPaise,
              userId,
              notes: `Reversal for editing purchase ${oldPurchase.invoiceNumber}`,
            },
          ],
          { session }
        );
      }

      // --- STEP 2: APPLY NEW PURCHASE ---
      const newSupplier = await Supplier.findById(input.supplierId).session(session);
      if (!newSupplier) throw new PurchaseError("New supplier not found", 404);

      const items: IPurchaseItem[] = [];
      let taxableValuePaise = 0;
      let totalGstPaise = 0;
      let totalAmountPaise = 0;

      for (const line of input.items) {
        const product = await Product.findById(line.productId).session(session);
        if (!product) throw new PurchaseError(`Product ${line.productId} not found`, 404);

        const stockQuantity = convertPurchaseToStock({
          purchaseQuantity: line.purchaseQuantity,
          conversionFactor: product.conversionFactor,
        });

        const rateBeforeGstPaise = rupeesToPaise(line.rateBeforeGstRupees);
        const lineTaxableValuePaise = Math.round(rateBeforeGstPaise * line.purchaseQuantity);
        const lineGstPaise = applyPercentage(lineTaxableValuePaise, product.gstRate);
        const cgstPaise = Math.round(lineGstPaise / 2);
        const sgstPaise = lineGstPaise - cgstPaise;
        const lineTotalPaise = lineTaxableValuePaise + lineGstPaise;

        items.push({
          productId: product._id,
          productName: product.productName,
          purchaseUnit: product.purchaseUnit,
          purchaseQuantity: line.purchaseQuantity,
          conversionFactor: product.conversionFactor,
          stockQuantity,
          rateBeforeGstPaise,
          gstRate: product.gstRate,
          taxableValuePaise: lineTaxableValuePaise,
          cgstPaise,
          sgstPaise,
          igstPaise: 0,
          totalPaise: lineTotalPaise,
        });

        taxableValuePaise += lineTaxableValuePaise;
        totalGstPaise += lineGstPaise;
        totalAmountPaise += lineTotalPaise;

        const stockBefore = product.currentStock;
        const stockAfter = stockBefore + stockQuantity;
        product.currentStock = stockAfter;
        product.purchaseCostPaise = Math.round(rateBeforeGstPaise / product.conversionFactor);
        await product.save({ session });

        await StockTransaction.create(
          [
            {
              productId: product._id,
              transactionType: "PURCHASE",
              quantity: stockQuantity,
              unit: product.stockUnit,
              stockBeforeQty: stockBefore,
              stockAfterQty: stockAfter,
              referenceId: oldPurchase._id,
              referenceType: "PurchaseEdit",
              location: input.location || "Godown",
              userId,
            },
          ],
          { session }
        );
      }

      // --- STEP 3: UPDATE PURCHASE DOC ---
      oldPurchase.supplierId = newSupplier._id;
      oldPurchase.invoiceNumber = input.invoiceNumber || "";
      oldPurchase.invoiceDate = new Date(input.invoiceDate);
      oldPurchase.items = items as any; // mongoose typed array handling
      oldPurchase.taxableValuePaise = taxableValuePaise;
      oldPurchase.totalGstPaise = totalGstPaise;
      oldPurchase.totalAmountPaise = totalAmountPaise;
      oldPurchase.paymentType = input.paymentType;
      oldPurchase.location = input.location || "Godown";
      oldPurchase.offloadedBy = input.offloadedBy || "Owner";
      oldPurchase.dueDate = input.dueDate ? new Date(input.dueDate) : undefined;
      oldPurchase.notes = input.notes;
      
      await oldPurchase.save({ session });
      updatedPurchaseDoc = oldPurchase;

      // --- Supplier outstanding (credit purchases only) ---
      if (input.paymentType === "CREDIT") {
        newSupplier.currentOutstandingPaise += totalAmountPaise;
        await newSupplier.save({ session });

        await SupplierLedgerEntry.create(
          [
            {
              supplierId: newSupplier._id,
              type: "PURCHASE",
              amountPaise: totalAmountPaise,
              referenceId: oldPurchase._id,
              balanceAfterPaise: newSupplier.currentOutstandingPaise,
              userId,
              notes: `Edited purchase ${oldPurchase.invoiceNumber}`,
            },
          ],
          { session }
        );
      }
    });

    return updatedPurchaseDoc;
  } finally {
    await session.endSession();
  }
}
