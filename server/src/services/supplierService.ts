import mongoose from "mongoose";
import { Supplier } from "../models/Supplier";
import { SupplierLedgerEntry } from "../models/Supplier";
import { rupeesToPaise } from "../utils/money";

export class SupplierError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function createSupplier(input: {
  supplierName: string;
  contactPerson?: string;
  phone?: string;
  whatsapp?: string;
  gstin?: string;
  address?: string;
  creditLimitRupees?: number;
  paymentTerms?: string;
  openingOutstandingRupees: number;
  notes?: string;
}) {
  const openingOutstandingPaise = rupeesToPaise(input.openingOutstandingRupees || 0);
  return Supplier.create({
    ...input,
    creditLimitPaise:
      input.creditLimitRupees !== undefined ? rupeesToPaise(input.creditLimitRupees) : undefined,
    openingOutstandingPaise,
    currentOutstandingPaise: openingOutstandingPaise,
  });
}

/**
 * Records a payment to a supplier. Atomic: decreases the supplier's
 * outstanding balance and writes a ledger entry together, or neither.
 */
export async function recordSupplierPayment(
  supplierId: string,
  amountRupees: number,
  paymentMode: string,
  notes: string | undefined,
  userId: string
) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const supplier = await Supplier.findById(supplierId).session(session);
      if (!supplier) throw new SupplierError("Supplier not found", 404);

      const amountPaise = rupeesToPaise(amountRupees);
      supplier.currentOutstandingPaise -= amountPaise;
      await supplier.save({ session });

      const [entry] = await SupplierLedgerEntry.create(
        [
          {
            supplierId: supplier._id,
            type: "PAYMENT",
            amountPaise: -amountPaise,
            paymentMode,
            balanceAfterPaise: supplier.currentOutstandingPaise,
            notes,
            userId,
          },
        ],
        { session }
      );
      result = { supplier, entry };
    });
    return result;
  } finally {
    await session.endSession();
  }
}

export async function getSupplierLedger(supplierId: string) {
  return SupplierLedgerEntry.find({ supplierId }).sort({ createdAt: -1 });
}
