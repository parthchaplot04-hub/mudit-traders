/**
 * PRODUCT CONVERSION ENGINE
 * ---------------------------------------------------------------------------
 * Converts a purchased quantity (in the supplier's purchase unit, e.g.
 * "tin", "carton") into the quantity that should be added to inventory,
 * expressed in the product's stock unit (e.g. "kg", "pcs").
 *
 * Every product stores a `conversionFactor`: how many stock units are in
 * ONE purchase unit.
 *
 *   Example: MK Refined Oil 15kg Tin
 *     purchaseUnit = "tin"
 *     stockUnit    = "kg"
 *     conversionFactor = 15
 *     Buying 50 tins -> 50 * 15 = 750 kg added to stock.
 *
 *   Example: nested pack (carton of containers)
 *     1 carton = 8 containers, 1 container = 1.6kg
 *     conversionFactor for the carton (pre-multiplied at product-setup
 *     time) = 8 * 1.6 = 12.8
 *     Buying 1 carton -> 12.8 kg added to stock.
 *
 * This function does ONE multiplication using the product's stored
 * conversionFactor - all the "how many containers per carton, how many kg
 * per container" reasoning happens once, when the product is set up
 * (productService), not at every purchase. This keeps the hot-path
 * purchase code simple and auditable.
 *
 * Quantities are floating point (kg/g/L allow decimals like 1.600kg), but
 * we round to a safe number of decimal places to avoid binary-float noise
 * (e.g. 0.1 + 0.2 problems) while still supporting gram-level precision.
 */

const QUANTITY_DECIMAL_PLACES = 3;

export function roundQuantity(qty: number): number {
  const factor = 10 ** QUANTITY_DECIMAL_PLACES;
  return Math.round(qty * factor) / factor;
}

export interface ConversionInput {
  purchaseQuantity: number; // e.g. 50 (tins)
  conversionFactor: number; // e.g. 15 (kg per tin)
}

/**
 * Converts a purchase-unit quantity into stock-unit quantity.
 * Throws on invalid (negative/zero/non-finite) inputs so bad data can
 * never silently corrupt inventory.
 */
export function convertPurchaseToStock({
  purchaseQuantity,
  conversionFactor,
}: ConversionInput): number {
  if (!Number.isFinite(purchaseQuantity) || purchaseQuantity <= 0) {
    throw new Error(
      `Invalid purchaseQuantity: ${purchaseQuantity}. Must be a positive number.`
    );
  }
  if (!Number.isFinite(conversionFactor) || conversionFactor <= 0) {
    throw new Error(
      `Invalid conversionFactor: ${conversionFactor}. Must be a positive number.`
    );
  }
  return roundQuantity(purchaseQuantity * conversionFactor);
}

/**
 * Combines two levels of packaging into a single conversion factor.
 *   Example: 1 carton = 8 containers, 1 container = 1.6kg -> 12.8
 * Use this once, when setting up a product, to compute the
 * conversionFactor to store on the Product document.
 */
export function combineConversionFactors(
  unitsPerOuterPack: number,
  stockUnitsPerInnerUnit: number
): number {
  if (unitsPerOuterPack <= 0 || stockUnitsPerInnerUnit <= 0) {
    throw new Error("Conversion components must be positive numbers.");
  }
  return roundQuantity(unitsPerOuterPack * stockUnitsPerInnerUnit);
}
