/**
 * MONEY REPRESENTATION
 * ---------------------------------------------------------------------------
 * All money in this system is stored and calculated as INTEGER PAISE
 * (1 Rupee = 100 Paise), never as JavaScript floating point rupees.
 *
 * Why integer paise instead of Decimal128 (see README "Money & Quantity
 * Representation" section for the full explanation):
 *  - Every financial operation here (bill totals, GST, discounts, ledgers)
 *    is add/subtract/simple-multiply of currency amounts. Integers give
 *    exact results with zero rounding drift.
 *  - Decimal128 also works, but requires care in every layer that touches
 *    the DB. Integer paise is simpler and equally exact for a single
 *    Node/TS backend, and sorts/indexes as a normal number.
 *  - Rule: the ONLY place rupees (decimal) appear is the UI layer,
 *    formatted for display. DB fields and all backend math use paise
 *    (suffix `Paise` on every money field, e.g. `totalPaise`).
 */

export function rupeesToPaise(rupees: number): number {
  if (!Number.isFinite(rupees)) throw new Error("Invalid rupee amount");
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function formatPaiseAsINR(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paiseToRupees(paise));
}

/** GST rates (5/12/18/28) are exact percentages, so plain math is fine as
 * long as we round the final paise value rather than any intermediate
 * rupee value. */
export function applyPercentage(paise: number, percent: number): number {
  return Math.round((paise * percent) / 100);
}
