import { connect, closeDatabase, clearDatabase } from "./setup";
import * as authService from "../src/services/authService";
import * as productService from "../src/services/productService";
import { Product } from "../src/models/Product";

beforeAll(async () => {
  await connect();
  process.env.JWT_SECRET = "test-secret";
});
afterEach(async () => clearDatabase());
afterAll(async () => closeDatabase());

describe("Authentication", () => {
  test("creating a user then logging in with the same password succeeds", async () => {
    await authService.createUser({
      name: "Owner",
      phone: "9111111111",
      password: "correcthorse",
      role: "OWNER",
    });

    const result = await authService.login("9111111111", "correcthorse");
    expect(result.token).toBeTruthy();
    expect(result.user.role).toBe("OWNER");
  });

  test("logging in with the wrong password is rejected", async () => {
    await authService.createUser({
      name: "Staff",
      phone: "9222222222",
      password: "correcthorse",
      role: "STAFF",
    });

    await expect(authService.login("9222222222", "wrongpassword")).rejects.toThrow();
  });

  test("a JWT issued at login can be verified and yields the right role", async () => {
    await authService.createUser({
      name: "Owner2",
      phone: "9333333333",
      password: "correcthorse",
      role: "OWNER",
    });
    const { token } = await authService.login("9333333333", "correcthorse");
    const payload = authService.verifyToken(token);
    expect(payload.role).toBe("OWNER");
  });
});

describe("Role permissions on product price edits", () => {
  test("STAFF cannot change a product's selling price (service-level enforcement)", async () => {
    const product = await Product.create({
      productCode: "TEST-1",
      productName: "Test Product",
      category: "Other",
      stockUnit: "pcs",
      purchaseUnit: "pcs",
      salesUnit: "pcs",
      conversionFactor: 1,
      sellingPricePaise: 1000,
      purchaseCostPaise: 800,
      gstRate: 0,
      reorderLevel: 5,
      reorderQuantity: 5,
      currentStock: 10,
    });

    const staff = await authService.createUser({
      name: "Staff",
      phone: "9444444444",
      password: "correcthorse",
      role: "STAFF",
    });

    await expect(
      productService.updateProduct(
        product._id.toString(),
        { sellingPriceRupees: 20 },
        staff._id.toString(),
        /* isOwner */ false
      )
    ).rejects.toThrow(/owner/i);

    const unchanged = await Product.findById(product._id);
    expect(unchanged!.sellingPricePaise).toBe(1000);
  });

  test("OWNER can change a product's selling price and it is recorded in price history", async () => {
    const product = await Product.create({
      productCode: "TEST-2",
      productName: "Test Product 2",
      category: "Other",
      stockUnit: "pcs",
      purchaseUnit: "pcs",
      salesUnit: "pcs",
      conversionFactor: 1,
      sellingPricePaise: 1000,
      purchaseCostPaise: 800,
      gstRate: 0,
      reorderLevel: 5,
      reorderQuantity: 5,
      currentStock: 10,
    });

    const owner = await authService.createUser({
      name: "Owner",
      phone: "9555555555",
      password: "correcthorse",
      role: "OWNER",
    });

    await productService.updateProduct(
      product._id.toString(),
      { sellingPriceRupees: 15 },
      owner._id.toString(),
      /* isOwner */ true
    );

    const updated = await Product.findById(product._id);
    expect(updated!.sellingPricePaise).toBe(1500);

    const { PriceHistory } = await import("../src/models/PriceHistory");
    const history = await PriceHistory.findOne({ productId: product._id });
    expect(history).not.toBeNull();
    expect(history!.oldPaise).toBe(1000);
    expect(history!.newPaise).toBe(1500);
  });

  test("duplicate product codes are rejected", async () => {
    const owner = await authService.createUser({
      name: "Owner",
      phone: "9666666666",
      password: "correcthorse",
      role: "OWNER",
    });
    const ownerId = owner._id.toString();

    await productService.createProduct(
      {
        productCode: "DUP-1",
        productName: "First",
        category: "Other",
        stockUnit: "pcs",
        purchaseUnit: "pcs",
        salesUnit: "pcs",
        conversionFactor: 1,
        sellingPriceRupees: 10,
        purchaseCostRupees: 8,
        gstRate: 0,
        reorderLevel: 1,
        reorderQuantity: 1,
      },
      ownerId
    );

    await expect(
      productService.createProduct(
        {
          productCode: "DUP-1",
          productName: "Second",
          category: "Other",
          stockUnit: "pcs",
          purchaseUnit: "pcs",
          salesUnit: "pcs",
          conversionFactor: 1,
          sellingPriceRupees: 12,
          purchaseCostRupees: 9,
          gstRate: 0,
          reorderLevel: 1,
          reorderQuantity: 1,
        },
        ownerId
      )
    ).rejects.toThrow(/already exists/i);
  });
});
