import { connect, closeDatabase, clearDatabase } from "./setup";
import { User } from "../src/models/User";
import { Supplier } from "../src/models/Supplier";
import { Product } from "../src/models/Product";
import { hashPassword } from "../src/services/authService";
import * as purchaseService from "../src/services/purchaseService";

beforeAll(async () => connect());
afterEach(async () => clearDatabase());
afterAll(async () => closeDatabase());

async function makeUser() {
  return User.create({
    name: "Test Owner",
    phone: "9000000000",
    passwordHash: await hashPassword("password123"),
    role: "OWNER",
  });
}

describe("Purchase flow (integration, real MongoDB transactions)", () => {
  test("TEST 1 + TEST 4: credit purchase of 50 tins (15kg each) increases stock by 750kg and supplier outstanding by the invoice total", async () => {
    const user = await makeUser();
    const supplier = await Supplier.create({ supplierName: "Shree Yash Trading Co." });
    const product = await Product.create({
      productCode: "OIL-15KG",
      productName: "MK Refined Oil 15kg Tin",
      category: "Oil",
      stockUnit: "kg",
      purchaseUnit: "tin",
      salesUnit: "kg",
      conversionFactor: 15,
      sellingPricePaise: 14000,
      purchaseCostPaise: 12000,
      gstRate: 5,
      reorderLevel: 30,
      reorderQuantity: 5,
      currentStock: 0,
    });

    const purchase = await purchaseService.createPurchase(
      {
        supplierId: supplier._id.toString(),
        invoiceNumber: "INV-001",
        invoiceDate: new Date().toISOString(),
        items: [
          { productId: product._id.toString(), purchaseQuantity: 50, rateBeforeGstRupees: 120 },
        ],
        paymentType: "CREDIT",
      },
      user._id.toString()
    );

    const updatedProduct = await Product.findById(product._id);
    expect(updatedProduct!.currentStock).toBe(750); // TEST 1

    const expectedTaxableValuePaise = 120 * 100 * 50; // rate(paise) * qty
    const expectedGstPaise = Math.round(expectedTaxableValuePaise * 0.05);
    const expectedTotalPaise = expectedTaxableValuePaise + expectedGstPaise;

    expect(purchase!.totalAmountPaise).toBe(expectedTotalPaise);

    const updatedSupplier = await Supplier.findById(supplier._id);
    expect(updatedSupplier!.currentOutstandingPaise).toBe(expectedTotalPaise); // TEST 4
  });

  test("cash purchase does NOT change supplier outstanding", async () => {
    const user = await makeUser();
    const supplier = await Supplier.create({ supplierName: "Atal Agency" });
    const product = await Product.create({
      productCode: "RICE-1",
      productName: "Rice Loose",
      category: "Rice",
      stockUnit: "kg",
      purchaseUnit: "bag",
      salesUnit: "kg",
      conversionFactor: 25,
      sellingPricePaise: 6000,
      purchaseCostPaise: 5000,
      gstRate: 0,
      reorderLevel: 50,
      reorderQuantity: 4,
      currentStock: 0,
    });

    await purchaseService.createPurchase(
      {
        supplierId: supplier._id.toString(),
        invoiceNumber: "INV-002",
        invoiceDate: new Date().toISOString(),
        items: [{ productId: product._id.toString(), purchaseQuantity: 4, rateBeforeGstRupees: 50 }],
        paymentType: "CASH",
      },
      user._id.toString()
    );

    const updatedSupplier = await Supplier.findById(supplier._id);
    expect(updatedSupplier!.currentOutstandingPaise).toBe(0);
  });

  test("purchase referencing an unknown product rolls back with no partial writes", async () => {
    const user = await makeUser();
    const supplier = await Supplier.create({ supplierName: "Aadinath Traders" });
    const fakeProductId = "64b000000000000000000000";

    await expect(
      purchaseService.createPurchase(
        {
          supplierId: supplier._id.toString(),
          invoiceNumber: "INV-003",
          invoiceDate: new Date().toISOString(),
          items: [{ productId: fakeProductId, purchaseQuantity: 1, rateBeforeGstRupees: 10 }],
          paymentType: "CASH",
        },
        user._id.toString()
      )
    ).rejects.toThrow();

    const { Purchase } = await import("../src/models/Purchase");
    expect(await Purchase.countDocuments({})).toBe(0);
  });
});
