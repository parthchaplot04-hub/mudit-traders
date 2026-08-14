import mongoose from "mongoose";
import { Product } from "../models/Product";
import { Sale, ISaleItem } from "../models/Sale";
import { Customer, CustomerLedgerEntry } from "../models/Customer";
import { StockTransaction } from "../models/StockTransaction";
import { rupeesToPaise, applyPercentage } from "../utils/money";
import { Counter } from "../models/Counter";

export class SaleError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

interface CreateSaleItemInput {
  productId: string;
  quantity: number;
  unitPriceRupees?: number;
}

interface CreateSaleInput {
  customerId?: string;
  items: CreateSaleItemInput[];
  discountRupees: number;
  paymentType: "CASH" | "UPI" | "CHEQUE" | "CREDIT";
}

function getIndiaDateKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}${values.month}${values.day}`;
}

async function nextBillNumber(session: mongoose.ClientSession): Promise<string> {
  const datePart = getIndiaDateKey();
  const key = `SALE_BILL_${datePart}`;

  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, session, setDefaultsOnInsert: true }
  );

  if (!counter) throw new SaleError("Could not allocate a bill number", 500);
  return `MT-${datePart}-${String(counter.sequence).padStart(4, "0")}`;
}

/**
 * Creates a sale and, in the SAME MongoDB transaction:
 *  - validates and reserves stock (rejects the whole sale if any item is
 *    short of stock - no partial bills)
 *  - creates one StockTransaction per line item, decreasing Product.currentStock
 *  - if paymentType is CREDIT and a customer is given, increases the
 *    customer's outstanding balance and writes a CustomerLedgerEntry
 * Rolls back completely on any failure (spec section 8).
 */
export async function createSale(input: CreateSaleInput, userId: string) {
  if (input.paymentType === "CREDIT" && !input.customerId) {
    throw new SaleError("A customer must be selected for a credit sale", 400);
  }

  const session = await mongoose.startSession();
  try {
    let saleDoc;
    const saleId = new mongoose.Types.ObjectId();

    await session.withTransaction(async () => {
      const items: ISaleItem[] = [];
      let subtotalPaise = 0;
      let totalGstPaise = 0;

      for (const line of input.items) {
        const product = await Product.findById(line.productId).session(session);
        if (!product) throw new SaleError(`Product ${line.productId} not found`, 404);
        if (!product.active) throw new SaleError(`${product.productName} is not active`, 400);

        if (product.currentStock < line.quantity) {
          throw new SaleError(
            `Insufficient stock for ${product.productName}: have ${product.currentStock} ${product.stockUnit}, need ${line.quantity}`,
            409
          );
        }

        const unitPricePaise =
          line.unitPriceRupees !== undefined
            ? rupeesToPaise(line.unitPriceRupees)
            : product.sellingPricePaise;

        const lineTaxableValuePaise = Math.round(unitPricePaise * line.quantity);
        const lineGstPaise = applyPercentage(lineTaxableValuePaise, product.gstRate);
        const lineTotalPaise = lineTaxableValuePaise + lineGstPaise;

        items.push({
          productId: product._id,
          productName: product.productName,
          salesUnit: product.salesUnit,
          quantity: line.quantity,
          unitPricePaise,
          gstRate: product.gstRate,
          taxableValuePaise: lineTaxableValuePaise,
          gstPaise: lineGstPaise,
          totalPaise: lineTotalPaise,
        });

        subtotalPaise += lineTaxableValuePaise;
        totalGstPaise += lineGstPaise;

        const stockBefore = product.currentStock;
        const stockAfter = stockBefore - line.quantity;
        product.currentStock = stockAfter;
        await product.save({ session });

        await StockTransaction.create(
          [
            {
              productId: product._id,
              transactionType: "SALE",
              quantity: line.quantity,
              unit: product.stockUnit,
              stockBeforeQty: stockBefore,
              stockAfterQty: stockAfter,
              referenceId: saleId,
              referenceType: "Sale",
              userId,
            },
          ],
          { session }
        );
      }

      const discountPaise = rupeesToPaise(input.discountRupees || 0);
      if (discountPaise > subtotalPaise + totalGstPaise) {
        throw new SaleError("Discount cannot exceed the bill total", 400);
      }
      const totalPaise = subtotalPaise + totalGstPaise - discountPaise;

      const billNumber = await nextBillNumber(session);

      const [created] = await Sale.create(
        [
          {
            _id: saleId,
            billNumber,
            customerId: input.customerId,
            items,
            subtotalPaise,
            discountPaise,
            totalGstPaise,
            totalPaise,
            paymentType: input.paymentType,
            status: "COMPLETED",
            createdBy: userId,
          },
        ],
        { session }
      );
      saleDoc = created;

      if (input.paymentType === "CREDIT" && input.customerId) {
        const customer = await Customer.findById(input.customerId).session(session);
        if (!customer) throw new SaleError("Customer not found", 404);

        customer.outstandingPaise += totalPaise;
        await customer.save({ session });

        await CustomerLedgerEntry.create(
          [
            {
              customerId: customer._id,
              type: "SALE_CREDIT",
              amountPaise: totalPaise,
              referenceId: created._id,
              balanceAfterPaise: customer.outstandingPaise,
              userId,
            },
          ],
          { session }
        );
      }
    });

    return saleDoc;
  } finally {
    await session.endSession();
  }
}

/**
 * Cancels a completed sale: restores stock for every line item, reverses
 * any customer credit, and marks the sale CANCELLED. The original sale
 * document is never deleted (spec section 37 - no permanent deletion of
 * financial records); cancellation is itself an auditable state change.
 */
export async function cancelSale(saleId: string, reason: string, userId: string) {
  const session = await mongoose.startSession();
  try {
    let updated;
    await session.withTransaction(async () => {
      const sale = await Sale.findById(saleId).session(session);
      if (!sale) throw new SaleError("Sale not found", 404);
      if (sale.status === "CANCELLED") throw new SaleError("Sale is already cancelled", 400);

      for (const item of sale.items) {
        const product = await Product.findById(item.productId).session(session);
        if (!product) continue; // product may have been deactivated/removed; stock trail still records intent
        const stockBefore = product.currentStock;
        const stockAfter = stockBefore + item.quantity;
        product.currentStock = stockAfter;
        await product.save({ session });

        await StockTransaction.create(
          [
            {
              productId: product._id,
              transactionType: "CUSTOMER_RETURN",
              quantity: item.quantity,
              unit: product.stockUnit,
              stockBeforeQty: stockBefore,
              stockAfterQty: stockAfter,
              referenceId: sale._id,
              referenceType: "SaleCancellation",
              userId,
              notes: `Cancelled bill ${sale.billNumber}: ${reason}`,
            },
          ],
          { session }
        );
      }

      if (sale.paymentType === "CREDIT" && sale.customerId) {
        const customer = await Customer.findById(sale.customerId).session(session);
        if (customer) {
          customer.outstandingPaise -= sale.totalPaise;
          await customer.save({ session });
          await CustomerLedgerEntry.create(
            [
              {
                customerId: customer._id,
                type: "ADJUSTMENT",
                amountPaise: -sale.totalPaise,
                referenceId: sale._id,
                balanceAfterPaise: customer.outstandingPaise,
                userId,
                notes: `Reversal for cancelled bill ${sale.billNumber}`,
              },
            ],
            { session }
          );
        }
      }

      sale.status = "CANCELLED";
      sale.cancelledReason = reason;
      await sale.save({ session });
      updated = sale;
    });
    return updated;
  } finally {
    await session.endSession();
  }
}
