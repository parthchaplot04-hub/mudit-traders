/**
 * DEMO DATA SEED SCRIPT
 * ---------------------------------------------------------------------------
 * Populates the database with clearly-labeled DEMO data so the app can be
 * explored end-to-end before real store data is entered. This is NOT real
 * Mudit Traders business data - every seeded record's `notes` field says
 * "DEMO DATA" and products/suppliers use the examples from the spec.
 *
 * Usage: npm run seed   (reads MONGODB_URI from .env)
 *
 * This creates:
 *  - one OWNER user   (phone: 9999900001 / password: owner123)
 *  - one STAFF user   (phone: 9999900002 / password: staff123)
 *  - 4 demo suppliers
 *  - ~14 demo products across loose / packaged / pre-packed types
 *
 * CHANGE THE DEFAULT PASSWORDS after seeding, before using this in
 * production - they are intentionally simple for local development only.
 */
import dotenv from "dotenv";
dotenv.config();

import { connectDB, disconnectDB } from "./config/db";
import { User } from "./models/User";
import { Supplier } from "./models/Supplier";
import { Product } from "./models/Product";
import { hashPassword } from "./services/authService";
import { combineConversionFactors } from "./utils/conversion";
import { rupeesToPaise } from "./utils/money";

async function seed() {
  await connectDB(process.env.MONGODB_URI || "");

  console.log("[seed] Clearing existing DEMO-labeled data...");
  await Product.deleteMany({ notes: "DEMO DATA" });
  await Supplier.deleteMany({ notes: "DEMO DATA" });

  console.log("[seed] Creating users (skips if phone already exists)...");
  const owner = await User.findOneAndUpdate(
    { phone: "9999900001" },
    {
      name: "Owner (Father)",
      phone: "9999900001",
      passwordHash: await hashPassword("owner123"),
      role: "OWNER",
      active: true,
    },
    { upsert: true, new: true }
  );
  await User.findOneAndUpdate(
    { phone: "9999900002" },
    {
      name: "Staff 1",
      phone: "9999900002",
      passwordHash: await hashPassword("staff123"),
      role: "STAFF",
      active: true,
    },
    { upsert: true, new: true }
  );

  console.log("[seed] Creating demo suppliers...");
  const suppliers = await Supplier.insertMany([
    { supplierName: "Shree Yash Trading Co.", phone: "9000000001", notes: "DEMO DATA" },
    { supplierName: "Manohar Kirana Store", phone: "9000000002", notes: "DEMO DATA" },
    { supplierName: "Atal Agency", phone: "9000000003", notes: "DEMO DATA" },
    { supplierName: "Aadinath Traders", phone: "9000000004", notes: "DEMO DATA" },
  ]);
  const [shreeYash] = suppliers;

  console.log("[seed] Creating demo products...");
  await Product.insertMany([
    {
      productCode: "OIL-MK-15KG-TIN",
      productName: "MK Refined Oil 15kg Tin",
      category: "Oil",
      stockUnit: "kg", purchaseUnit: "tin", salesUnit: "kg",
      conversionFactor: 15, // 1 tin = 15kg -> TEST 1 in spec
      sellingPricePaise: rupeesToPaise(140), purchaseCostPaise: rupeesToPaise(120),
      gstRate: 5, reorderLevel: 30, reorderQuantity: 5,
      preferredSupplier: shreeYash._id, currentStock: 0, notes: "DEMO DATA",
    },
    {
      productCode: "OIL-MK-4KG",
      productName: "MK Refined Oil 4kg",
      category: "Oil",
      stockUnit: "kg", purchaseUnit: "carton", salesUnit: "pcs",
      conversionFactor: combineConversionFactors(6, 4), // 1 carton = 6 x 4kg
      sellingPricePaise: rupeesToPaise(38), purchaseCostPaise: rupeesToPaise(33),
      gstRate: 5, reorderLevel: 24, reorderQuantity: 2, currentStock: 0, notes: "DEMO DATA",
    },
    {
      productCode: "OIL-MK-1.6KG",
      productName: "MK Refined Oil 1.600 KG",
      category: "Oil",
      stockUnit: "kg", purchaseUnit: "carton", salesUnit: "pcs",
      conversionFactor: combineConversionFactors(8, 1.6), // TEST 10 in spec -> 12.8
      sellingPricePaise: rupeesToPaise(16), purchaseCostPaise: rupeesToPaise(13.5),
      gstRate: 5, reorderLevel: 12.8, reorderQuantity: 2, currentStock: 0, notes: "DEMO DATA",
    },
    {
      productCode: "RICE-LOOSE",
      productName: "Rice Loose",
      category: "Rice",
      stockUnit: "kg", purchaseUnit: "bag", salesUnit: "kg",
      conversionFactor: 25,
      sellingPricePaise: rupeesToPaise(60), purchaseCostPaise: rupeesToPaise(50),
      gstRate: 0, reorderLevel: 50, reorderQuantity: 4, currentStock: 0, notes: "DEMO DATA",
    },
    {
      productCode: "RICE-1KG",
      productName: "Rice 1kg Pack",
      category: "Rice",
      stockUnit: "pcs", purchaseUnit: "box", salesUnit: "pcs",
      conversionFactor: 20,
      sellingPricePaise: rupeesToPaise(65), purchaseCostPaise: rupeesToPaise(55),
      gstRate: 0, reorderLevel: 20, reorderQuantity: 2, currentStock: 0, notes: "DEMO DATA",
    },
    {
      productCode: "SUGAR-LOOSE",
      productName: "Sugar Loose",
      category: "Sugar",
      stockUnit: "kg", purchaseUnit: "bag", salesUnit: "kg",
      conversionFactor: 50,
      sellingPricePaise: rupeesToPaise(45), purchaseCostPaise: rupeesToPaise(40),
      gstRate: 0, reorderLevel: 40, reorderQuantity: 2, currentStock: 0, notes: "DEMO DATA",
    },
    {
      productCode: "TOOR-DAL-LOOSE",
      productName: "Toor Dal Loose",
      category: "Dal",
      stockUnit: "kg", purchaseUnit: "bag", salesUnit: "kg",
      conversionFactor: 30,
      sellingPricePaise: rupeesToPaise(130), purchaseCostPaise: rupeesToPaise(112),
      gstRate: 0, reorderLevel: 20, reorderQuantity: 2, currentStock: 0, notes: "DEMO DATA",
    },
    {
      productCode: "MOONG-DAL-LOOSE",
      productName: "Moong Dal Loose",
      category: "Dal",
      stockUnit: "kg", purchaseUnit: "bag", salesUnit: "kg",
      conversionFactor: 30,
      sellingPricePaise: rupeesToPaise(120), purchaseCostPaise: rupeesToPaise(104),
      gstRate: 0, reorderLevel: 20, reorderQuantity: 2, currentStock: 0, notes: "DEMO DATA",
    },
    {
      productCode: "ALMOND-LOOSE",
      productName: "Almond Loose",
      category: "Dry Fruits",
      stockUnit: "kg", purchaseUnit: "box", salesUnit: "kg",
      conversionFactor: 10,
      sellingPricePaise: rupeesToPaise(750), purchaseCostPaise: rupeesToPaise(680),
      gstRate: 12, reorderLevel: 5, reorderQuantity: 1, currentStock: 0, notes: "DEMO DATA",
    },
    {
      productCode: "CASHEW-LOOSE",
      productName: "Cashew Loose",
      category: "Dry Fruits",
      stockUnit: "kg", purchaseUnit: "box", salesUnit: "kg",
      conversionFactor: 10,
      sellingPricePaise: rupeesToPaise(850), purchaseCostPaise: rupeesToPaise(770),
      gstRate: 12, reorderLevel: 5, reorderQuantity: 1, currentStock: 0, notes: "DEMO DATA",
    },
    {
      productCode: "TEA-500G",
      productName: "Tea 500g",
      category: "Tea",
      stockUnit: "pcs", purchaseUnit: "carton", salesUnit: "pcs",
      conversionFactor: 24,
      sellingPricePaise: rupeesToPaise(220), purchaseCostPaise: rupeesToPaise(195),
      gstRate: 5, reorderLevel: 24, reorderQuantity: 1, currentStock: 0, notes: "DEMO DATA",
    },
    {
      productCode: "SOAP-BAR",
      productName: "Soap",
      category: "Soap",
      stockUnit: "pcs", purchaseUnit: "carton", salesUnit: "pcs",
      conversionFactor: 72,
      sellingPricePaise: rupeesToPaise(35), purchaseCostPaise: rupeesToPaise(28),
      gstRate: 18, reorderLevel: 48, reorderQuantity: 1, currentStock: 0, notes: "DEMO DATA",
    },
    {
      productCode: "DETERGENT-1KG",
      productName: "Detergent 1kg",
      category: "Detergent",
      stockUnit: "pcs", purchaseUnit: "carton", salesUnit: "pcs",
      conversionFactor: 12,
      sellingPricePaise: rupeesToPaise(110), purchaseCostPaise: rupeesToPaise(92),
      gstRate: 18, reorderLevel: 12, reorderQuantity: 1, currentStock: 0, notes: "DEMO DATA",
    },
    {
      productCode: "SHAMPOO-SACHET",
      productName: "Shampoo Sachet",
      category: "Shampoo",
      stockUnit: "pcs", purchaseUnit: "box", salesUnit: "pcs",
      conversionFactor: 100,
      sellingPricePaise: rupeesToPaise(2), purchaseCostPaise: rupeesToPaise(1.2),
      gstRate: 18, reorderLevel: 200, reorderQuantity: 1, currentStock: 0, notes: "DEMO DATA",
    },
  ]);

  console.log("[seed] Done.");
  console.log("[seed] Owner login  -> phone: 9999900001  password: owner123");
  console.log("[seed] Staff login  -> phone: 9999900002  password: staff123");
  console.log("[seed] CHANGE THESE PASSWORDS before real use.");

  await disconnectDB();
}

seed().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
