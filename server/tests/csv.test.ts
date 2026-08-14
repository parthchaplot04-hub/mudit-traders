import { connect, closeDatabase, clearDatabase } from "./setup";
import { Product } from "../src/models/Product";
import { Supplier } from "../src/models/Supplier";
import * as csvService from "../src/services/csvService";
import { parseCsv, toCsv } from "../src/utils/csv";

beforeAll(async () => connect());
afterEach(async () => clearDatabase());
afterAll(async () => closeDatabase());

const VALID_PRODUCT_CSV = `productCode,productName,category,stockUnit,purchaseUnit,salesUnit,conversionFactor,sellingPriceRupees,purchaseCostRupees,gstRate,reorderLevel,reorderQuantity,hindiName,brand,notes
BESAN-1,Besan,Besan,kg,bag,kg,25,55,48,0,20,2,,,
MAIDA-1,Maida,Maida,kg,bag,kg,25,40,34,0,20,2,,,`;

const INVALID_PRODUCT_CSV = `productCode,productName,category,stockUnit,purchaseUnit,salesUnit,conversionFactor,sellingPriceRupees,purchaseCostRupees,gstRate,reorderLevel,reorderQuantity
BESAN-1,Besan,Besan,kg,bag,kg,25,55,48,0,20,2
,Maida,Maida,kg,bag,kg,-5,40,34,0,20,2`; // row 2: missing productCode, negative conversionFactor

describe("CSV parsing utility", () => {
  test("round-trips a simple table", () => {
    const csv = toCsv([{ a: "1", b: "hello, world" }], ["a", "b"]);
    const rows = parseCsv(csv);
    expect(rows[0]).toEqual(["a", "b"]);
    expect(rows[1]).toEqual(["1", "hello, world"]);
  });

  test("handles quoted fields containing commas", () => {
    const rows = parseCsv('name,note\n"Rice, 5kg","has a "" quote"');
    expect(rows[1][0]).toBe("Rice, 5kg");
    expect(rows[1][1]).toBe('has a " quote');
  });
});

describe("CSV product import", () => {
  test("imports valid rows and upserts by productCode", async () => {
    const result = await csvService.importProductsCsv(VALID_PRODUCT_CSV);
    expect(result.importedCount).toBe(2);

    const products = await Product.find().sort({ productCode: 1 });
    expect(products).toHaveLength(2);
    expect(products[0].productCode).toBe("BESAN-1");
    expect(products[0].sellingPricePaise).toBe(5500);
  });

  test("re-importing the same productCode updates rather than duplicates", async () => {
    await csvService.importProductsCsv(VALID_PRODUCT_CSV);
    await csvService.importProductsCsv(VALID_PRODUCT_CSV.replace("55,48", "60,50"));

    const products = await Product.find();
    expect(products).toHaveLength(2);
    const besan = products.find((p) => p.productCode === "BESAN-1")!;
    expect(besan.sellingPricePaise).toBe(6000);
  });

  test("rejects the WHOLE import if any row is invalid - no partial import", async () => {
    await expect(csvService.importProductsCsv(INVALID_PRODUCT_CSV)).rejects.toMatchObject({
      rowErrors: expect.arrayContaining([expect.objectContaining({ row: 3 })]),
    });

    // Nothing should have been imported, including the otherwise-valid first row.
    const products = await Product.find();
    expect(products).toHaveLength(0);
  });
});

describe("CSV supplier import", () => {
  test("imports suppliers and computes opening = current outstanding", async () => {
    const csv = `supplierName,phone,openingOutstandingRupees\nAtal Agency,9000000009,1500`;
    const result = await csvService.importSuppliersCsv(csv);
    expect(result.importedCount).toBe(1);

    const supplier = await Supplier.findOne({ supplierName: "Atal Agency" });
    expect(supplier!.openingOutstandingPaise).toBe(150000);
    expect(supplier!.currentOutstandingPaise).toBe(150000);
  });
});

describe("CSV export", () => {
  test("exports products as CSV reflecting live DB state", async () => {
    await csvService.importProductsCsv(VALID_PRODUCT_CSV);
    const csv = await csvService.exportProductsCsv();
    expect(csv).toContain("BESAN-1");
    expect(csv).toContain("MAIDA-1");
    const rows = parseCsv(csv);
    expect(rows.length).toBe(3); // header + 2 products
  });
});
