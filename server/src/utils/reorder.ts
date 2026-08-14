export type ReorderStatus = "OK" | "LOW" | "ORDER_REQUIRED" | "OUT_OF_STOCK";

/**
 * Determines a product's reorder status from its current stock level.
 *   currentStock === 0                      -> OUT_OF_STOCK
 *   currentStock <= reorderLevel            -> ORDER_REQUIRED
 *   currentStock <= reorderLevel * 1.2      -> LOW (approaching threshold)
 *   otherwise                               -> OK
 */
export function getReorderStatus(
  currentStock: number,
  reorderLevel: number
): ReorderStatus {
  if (currentStock <= 0) return "OUT_OF_STOCK";
  if (currentStock <= reorderLevel) return "ORDER_REQUIRED";
  if (currentStock <= reorderLevel * 1.2) return "LOW";
  return "OK";
}
