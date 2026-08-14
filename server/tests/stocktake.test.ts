import { connect, closeDatabase, clearDatabase } from "./setup";
import { User } from "../src/models/User";
import { Product } from "../src/models/Product";
import { hashPassword } from "../src/services/authService";
import * as stocktakeService from "../src/services/stocktakeService";

beforeAll(async () => connect());
afterEach(async () => clearDatabase());
afterAll(async () => closeDatabase());

async function makeUser() {
  return User.create({
    name: "Test Owner",
    phone: "9444444444",
    passwordHash: await hashPassword("password123"),
    role: "OWNER",
  });
}

describe("Stocktake (physical count reconciliation)", () => {
  test("spec scenario: system stock 50kg, actual count 48kg -> difference -2kg, product stock updated", async () => {
    const user = await makeUser();
    const product = await Product.create({
      productCode: "STOCKTAKE-1",
      productName: "Sugar Loose",
      category: "Sugar",
      stockUnit: "kg",
      purchaseUnit: "bag",
      salesUnit: "kg",
      conversionFactor: 50,
      sellingPricePaise: 4500,
      purchaseCostPaise: 4000,
      gstRate: 0,
      reorderLevel: 20,
      reorderQuantity: 2,
      currentStock: 50,
    });

    const stocktake = await stocktakeService.recordStocktake(
      { productId: product._id.toString(), actualStockQty: 48, reason: "counting error" },
      user._id.toString()
    );

    expect(stocktake!.systemStockQty).toBe(50);
    expect(stocktake!.actualStockQty).toBe(48);
    expect(stocktake!.differenceQty).toBe(-2);

    const updated = await Product.findById(product._id);
    expect(updated!.currentStock).toBe(48);

    const { StockTransaction } = await import("../src/models/StockTransaction");
    const txn = await StockTransaction.findOne({ productId: product._id, transactionType: "NEGATIVE_ADJUSTMENT" });
    expect(txn).not.toBeNull();
    expect(txn!.quantity).toBe(2);

    const { AuditLog } = await import("../src/models/AuditLog");
    const log = await AuditLog.findOne({ entityId: product._id, action: "STOCK_ADJUSTMENT" });
    expect(log).not.toBeNull();
  });

  test("a positive difference creates a POSITIVE_ADJUSTMENT stock transaction", async () => {
    const user = await makeUser();
    const product = await Product.create({
      productCode: "STOCKTAKE-2",
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
      currentStock: 20,
    });

    await stocktakeService.recordStocktake(
      { productId: product._id.toString(), actualStockQty: 23, reason: "unknown" },
      user._id.toString()
    );

    const updated = await Product.findById(product._id);
    expect(updated!.currentStock).toBe(23);

    const { StockTransaction } = await import("../src/models/StockTransaction");
    const txn = await StockTransaction.findOne({ productId: product._id, transactionType: "POSITIVE_ADJUSTMENT" });
    expect(txn).not.toBeNull();
    expect(txn!.quantity).toBe(3);
  });

  test("rejects a stocktake with no actual difference", async () => {
    const user = await makeUser();
    const product = await Product.create({
      productCode: "STOCKTAKE-3",
      productName: "Toor Dal Loose",
      category: "Dal",
      stockUnit: "kg",
      purchaseUnit: "bag",
      salesUnit: "kg",
      conversionFactor: 30,
      sellingPricePaise: 13000,
      purchaseCostPaise: 11200,
      gstRate: 0,
      reorderLevel: 20,
      reorderQuantity: 2,
      currentStock: 10,
    });

    await expect(
      stocktakeService.recordStocktake(
        { productId: product._id.toString(), actualStockQty: 10, reason: "counting error" },
        user._id.toString()
      )
    ).rejects.toThrow(/no adjustment needed/i);
  });
});
