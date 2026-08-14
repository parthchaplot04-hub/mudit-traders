import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { Sale } from "../models/Sale";
import { Purchase } from "../models/Purchase";
import { Product } from "../models/Product";
import { Supplier } from "../models/Supplier";
import { Wastage } from "../models/Wastage";
import { getReorderStatus } from "../utils/reorder";

/**
 * Every figure here is computed live from MongoDB - nothing is hardcoded
 * (spec section 57). If a query returns nothing, the figure is simply 0.
 */
export async function getDashboard(_req: AuthedRequest, res: Response) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const todaysSales = await Sale.find({
    status: "COMPLETED",
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });

  const todaysSalesPaise = todaysSales.reduce((sum, s) => sum + s.totalPaise, 0);
  const todaysBillCount = todaysSales.length;
  const avgBillPaise = todaysBillCount > 0 ? Math.round(todaysSalesPaise / todaysBillCount) : 0;

  const byPayment = (type: string) =>
    todaysSales.filter((s) => s.paymentType === type).reduce((sum, s) => sum + s.totalPaise, 0);

  const todaysPurchases = await Purchase.find({
    cancelled: false,
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });
  const todaysPurchasesPaise = todaysPurchases.reduce((sum, p) => sum + p.totalAmountPaise, 0);

  // Estimated gross profit = revenue - approximate cost of goods sold,
  // using each item's stored unitPricePaise vs the product's current
  // purchaseCostPaise at query time (an estimate, not exact COGS by lot).
  let estimatedCogsPaise = 0;
  for (const sale of todaysSales) {
    for (const item of sale.items) {
      const product = await Product.findById(item.productId).select("purchaseCostPaise");
      if (product) estimatedCogsPaise += product.purchaseCostPaise * item.quantity;
    }
  }
  const estimatedGrossProfitPaise = todaysSalesPaise - Math.round(estimatedCogsPaise);

  const totalProducts = await Product.countDocuments({ active: true });
  const activeProducts = await Product.find({ active: true }).select("currentStock reorderLevel sellingPricePaise");
  let lowStock = 0, outOfStock = 0, inventoryValuePaise = 0;
  for (const p of activeProducts) {
    const status = getReorderStatus(p.currentStock, p.reorderLevel);
    if (status === "OUT_OF_STOCK") outOfStock++;
    else if (status === "ORDER_REQUIRED" || status === "LOW") lowStock++;
    inventoryValuePaise += p.currentStock * p.sellingPricePaise;
  }

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthWastage = await Wastage.find({ createdAt: { $gte: monthStart } });
  const wastageValuePaise = monthWastage.reduce((sum, w) => sum + w.estimatedCostPaise, 0);

  const suppliers = await Supplier.find({ active: true }).select("supplierName currentOutstandingPaise");
  const totalOutstandingPaise = suppliers.reduce((sum, s) => sum + s.currentOutstandingPaise, 0);
  const topOutstandingSuppliers = [...suppliers]
    .sort((a, b) => b.currentOutstandingPaise - a.currentOutstandingPaise)
    .slice(0, 5)
    .map((s) => ({ supplierName: s.supplierName, outstandingPaise: s.currentOutstandingPaise }));

  return res.json({
    today: {
      salesPaise: todaysSalesPaise,
      billCount: todaysBillCount,
      averageBillPaise: avgBillPaise,
      cashSalesPaise: byPayment("CASH"),
      upiSalesPaise: byPayment("UPI"),
      creditSalesPaise: byPayment("CREDIT"),
      purchasesPaise: todaysPurchasesPaise,
      estimatedGrossProfitPaise,
    },
    inventory: {
      totalProducts,
      lowStock,
      outOfStock,
      inventoryValuePaise,
      wastageValueThisMonthPaise: wastageValuePaise,
    },
    suppliers: {
      totalOutstandingPaise,
      topOutstandingSuppliers,
    },
  });
}
