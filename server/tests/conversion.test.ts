import {
  convertPurchaseToStock,
  combineConversionFactors,
  roundQuantity,
} from "../src/utils/conversion";
import { getReorderStatus } from "../src/utils/reorder";

describe("Conversion engine", () => {
  // TEST 1 — Purchase conversion: 50 tins, 1 tin = 15kg -> 750kg
  test("TEST 1: 50 tins at 15kg each converts to 750kg", () => {
    const result = convertPurchaseToStock({
      purchaseQuantity: 50,
      conversionFactor: 15,
    });
    expect(result).toBe(750);
  });

  // TEST 10 — Nested conversion: 1 carton = 8 units, 1 unit = 1.6kg -> 12.8
  test("TEST 10: combining nested pack sizes (8 x 1.6kg = 12.8kg per carton)", () => {
    const factor = combineConversionFactors(8, 1.6);
    expect(factor).toBe(12.8);

    const result = convertPurchaseToStock({
      purchaseQuantity: 1,
      conversionFactor: factor,
    });
    expect(result).toBe(12.8);
  });

  test("rejects zero or negative purchase quantity", () => {
    expect(() =>
      convertPurchaseToStock({ purchaseQuantity: 0, conversionFactor: 15 })
    ).toThrow();
    expect(() =>
      convertPurchaseToStock({ purchaseQuantity: -5, conversionFactor: 15 })
    ).toThrow();
  });

  test("rejects invalid conversion factor", () => {
    expect(() =>
      convertPurchaseToStock({ purchaseQuantity: 10, conversionFactor: 0 })
    ).toThrow();
  });

  test("rounds floating point noise to 3 decimal places", () => {
    expect(roundQuantity(0.1 + 0.2)).toBe(0.3);
  });
});

describe("Reorder status", () => {
  // TEST 3 — Reorder: level = 100kg, stock = 100kg -> ORDER_REQUIRED
  test("TEST 3: stock equal to reorder level is ORDER_REQUIRED", () => {
    expect(getReorderStatus(100, 100)).toBe("ORDER_REQUIRED");
  });

  test("zero stock is OUT_OF_STOCK", () => {
    expect(getReorderStatus(0, 100)).toBe("OUT_OF_STOCK");
  });

  test("stock comfortably above reorder level is OK", () => {
    expect(getReorderStatus(500, 100)).toBe("OK");
  });

  test("stock just above reorder level is LOW", () => {
    expect(getReorderStatus(110, 100)).toBe("LOW");
  });
});
