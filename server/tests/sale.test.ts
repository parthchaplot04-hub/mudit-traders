import { connect, closeDatabase, clearDatabase } from "./setup";
import { User } from "../src/models/User";
import { Product } from "../src/models/Product";
import { Supplier } from "../src/models/Supplier";
import { hashPassword } from "../src/services/authService";
import * as saleService from "../src/services/saleService";
import * as wastageService from "../src/services/wastageService";
import * as supplierService from "../src/services/supplierService";

beforeAll(async () => connect());
afterEach(async () => clearDatabase());
afterAll(async () => closeDatabase());

async function makeUser() {
  return User.create({
    name: "Test Staff",
    phone: "9000000001",
    passwordHash: await hashPassword("password123"),
    role: "STAFF",
  });
}

async function makeOilProduct(startingStock: number) {
  return Product.create({
    productCode: "OIL-15KG",
    productName: "MK Refined Oil 15kg Tin",
    category: "Oil",
    stockUnit: "kg",
    purchaseUnit: "tin",
    salesUnit: "kg",
    conversionFactor: 15,
    sellingPricePaise: 14000, // ₹140/kg
    purchaseCostPaise: 12000,
    gstRate: 5,
    reorderLevel: 30,
    reorderQuantity: 5,
    currentStock: startingStock,
  });
}

describe("Sale / POS flow (integration, real MongoDB transactions)", () => {
  // TEST 2 — Starting stock 750kg, sale of 2kg -> 748kg
  test("TEST 2: selling 2kg reduces stock from 750kg to 748kg", async () => {
    const user = await makeUser();
    const product = await makeOilProduct(750);

    await saleService.createSale(
      { items: [{ productId: product._id.toString(), quantity: 2 }], discountRupees: 0, paymentType: "CASH" },
      user._id.toString()
    );

    const updated = await Product.findById(product._id);
    expect(updated!.currentStock).toBe(748);
  });

  test("rejects a sale when stock is insufficient (no partial sale)", async () => {
    const user = await makeUser();
    const product = await makeOilProduct(1);

    await expect(
      saleService.createSale(
        { items: [{ productId: product._id.toString(), quantity: 5 }], discountRupees: 0, paymentType: "CASH" },
        user._id.toString()
      )
    ).rejects.toThrow();

    const updated = await Product.findById(product._id);
    expect(updated!.currentStock).toBe(1); // unchanged
    const { Sale } = await import("../src/models/Sale");
    expect(await Sale.countDocuments({})).toBe(0);
  });

  // TEST 7 — Cancelled sale must restore stock correctly
  test("TEST 7: cancelling a sale restores the sold stock", async () => {
    const user = await makeUser();
    const product = await makeOilProduct(750);

    const sale = await saleService.createSale(
      { items: [{ productId: product._id.toString(), quantity: 10 }], discountRupees: 0, paymentType: "CASH" },
      user._id.toString()
    );
    expect((await Product.findById(product._id))!.currentStock).toBe(740);

    await saleService.cancelSale(sale!._id.toString(), "Customer changed mind", user._id.toString());

    const restored = await Product.findById(product._id);
    expect(restored!.currentStock).toBe(750);
  });

  // TEST 8 — Mixed bill: loose product + packets + pieces + discount
  test("TEST 8: mixed bill (loose kg + packaged pcs) with discount totals correctly", async () => {
    const user = await makeUser();
    const oil = await makeOilProduct(100); // ₹140/kg, 5% GST
    const soap = await Product.create({
      productCode: "SOAP-1",
      productName: "Soap",
      category: "Soap",
      stockUnit: "pcs",
      purchaseUnit: "carton",
      salesUnit: "pcs",
      conversionFactor: 72,
      sellingPricePaise: 3500, // ₹35
      purchaseCostPaise: 2800,
      gstRate: 18,
      reorderLevel: 48,
      reorderQuantity: 1,
      currentStock: 50,
    });

    const sale = await saleService.createSale(
      {
        items: [
          { productId: oil._id.toString(), quantity: 5 }, // 5kg x 140 = 700
          { productId: soap._id.toString(), quantity: 2 }, // 2 x 35 = 70
        ],
        discountRupees: 10,
        paymentType: "CASH",
      },
      user._id.toString()
    );

    // Subtotal (taxable): 700 + 70 = 770 rupees = 77000 paise
    expect(sale!.subtotalPaise).toBe(77000);
    // GST: oil 5% of 70000 = 3500; soap 18% of 7000 = 1260 -> total 4760
    expect(sale!.totalGstPaise).toBe(4760);
    // discount 10 rupees = 1000 paise
    expect(sale!.discountPaise).toBe(1000);
    // total = 77000 + 4760 - 1000 = 80760 paise = ₹807.60
    expect(sale!.totalPaise).toBe(80760);
  });

  // TEST 9 — GST calculation
  test("TEST 9: taxable value + configured GST rate calculates correctly", async () => {
    const user = await makeUser();
    const product = await Product.create({
      productCode: "DET-1",
      productName: "Detergent 1kg",
      category: "Detergent",
      stockUnit: "pcs",
      purchaseUnit: "carton",
      salesUnit: "pcs",
      conversionFactor: 12,
      sellingPricePaise: 11000, // ₹110
      purchaseCostPaise: 9200,
      gstRate: 18,
      reorderLevel: 12,
      reorderQuantity: 1,
      currentStock: 20,
    });

    const sale = await saleService.createSale(
      { items: [{ productId: product._id.toString(), quantity: 1 }], discountRupees: 0, paymentType: "CASH" },
      user._id.toString()
    );

    expect(sale!.items[0].taxableValuePaise).toBe(11000);
    expect(sale!.items[0].gstPaise).toBe(1980); // 18% of 11000
    expect(sale!.items[0].totalPaise).toBe(12980);
  });

  test("credit sale increases customer outstanding, cancellation reverses it", async () => {
    const user = await makeUser();
    const product = await makeOilProduct(100);
    const { Customer } = await import("../src/models/Customer");
    const customer = await Customer.create({ name: "Regular Customer" });

    const sale = await saleService.createSale(
      {
        customerId: customer._id.toString(),
        items: [{ productId: product._id.toString(), quantity: 3 }],
        discountRupees: 0,
        paymentType: "CREDIT",
      },
      user._id.toString()
    );

    let updatedCustomer = await Customer.findById(customer._id);
    expect(updatedCustomer!.outstandingPaise).toBe(sale!.totalPaise);

    await saleService.cancelSale(sale!._id.toString(), "Wrong item", user._id.toString());

    updatedCustomer = await Customer.findById(customer._id);
    expect(updatedCustomer!.outstandingPaise).toBe(0);
  });
});

// TEST 6 — Wastage
describe("Wastage", () => {
  test("TEST 6: recording 2kg wastage decreases stock by 2kg and creates a stock transaction", async () => {
    const user = await makeUser();
    const product = await makeOilProduct(100);

    await wastageService.recordWastage(
      { productId: product._id.toString(), quantity: 2, reason: "Leakage" },
      user._id.toString()
    );

    const updated = await Product.findById(product._id);
    expect(updated!.currentStock).toBe(98);

    const { StockTransaction } = await import("../src/models/StockTransaction");
    const txn = await StockTransaction.findOne({ productId: product._id, transactionType: "DAMAGE" });
    expect(txn).not.toBeNull();
    expect(txn!.quantity).toBe(2);
  });
});

// TEST 5 — Supplier payment
describe("Supplier payment", () => {
  test("TEST 5: a ₹5,000 payment decreases outstanding by ₹5,000", async () => {
    const user = await makeUser();
    const supplier = await Supplier.create({
      supplierName: "Manohar Kirana Store",
      openingOutstandingPaise: 2000000, // ₹20,000
      currentOutstandingPaise: 2000000,
    });

    await supplierService.recordSupplierPayment(
      supplier._id.toString(),
      5000,
      "Partial payment",
      user._id.toString()
    );

    const updated = await Supplier.findById(supplier._id);
    expect(updated!.currentOutstandingPaise).toBe(1500000); // ₹15,000
  });
});
