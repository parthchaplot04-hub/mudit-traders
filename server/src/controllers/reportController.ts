import { Request, Response } from "express";
import { getLocalBounds } from "../utils/dateUtils";
import { Sale } from "../models/Sale";
import { Purchase } from "../models/Purchase";
import { StockTransaction } from "../models/StockTransaction";
import { AuditLog } from "../models/AuditLog";
import { Product } from "../models/Product";
import mongoose from "mongoose";

interface AuthedRequest extends Request {
  user?: { userId: string; role: string };
}

// --------------------------------------------------------
// 1. SUMMARY CARDS
// --------------------------------------------------------
export async function getSummary(req: AuthedRequest, res: Response) {
  try {
    const { startDate, endDate } = req.query;
    const { start, end } = getLocalBounds(startDate as string, endDate as string);
    const dateQuery = { createdAt: { $gte: start, $lte: end } };
    
    // Total Sales
    const sales = await Sale.find({ ...dateQuery, status: "COMPLETED" });
    const totalSales = sales.reduce((sum, s) => sum + s.totalPaise, 0);
    const itemsSold = sales.reduce((sum, s) => sum + s.items.reduce((s2, i) => s2 + i.quantity, 0), 0);
    
    // Total Purchases
    const purchases = await Purchase.find({ ...dateQuery, cancelled: false });
    const totalPurchases = purchases.reduce((sum, p) => sum + p.totalAmountPaise, 0);
    const itemsPurchased = purchases.reduce((sum, p) => sum + p.items.reduce((s2, i) => s2 + i.purchaseQuantity, 0), 0);
    
    // COGS for Gross Profit
    let cogsPaise = 0;
    for (const sale of sales) {
      for (const item of sale.items) {
        // Attempt to find current purchase price as a rough COGS
        const product = await Product.findById(item.productId);
        if (product) {
          cogsPaise += product.purchaseCostPaise * item.quantity;
        }
      }
    }
    const grossProfit = totalSales - cogsPaise;

    // Payment Methods Breakdown (Sales)
    let cashCollected = 0, upiCollected = 0, creditSales = 0;
    sales.forEach(s => {
      if (s.paymentType === "CASH") cashCollected += s.totalPaise;
      if (s.paymentType === "UPI") upiCollected += s.totalPaise;
      if (s.paymentType === "CREDIT") creditSales += s.totalPaise;
    });

    // Current Inventory Value
    const allProducts = await Product.find({ isActive: true });
    const currentInventoryValue = allProducts.reduce((sum, p) => sum + (p.currentStock * p.purchaseCostPaise), 0);

    // Stock Movement (just simple counts for summary)
    const stockOut = await StockTransaction.aggregate([
      { $match: { ...dateQuery, transactionType: { $in: ["SALE", "DAMAGE", "EXPIRY", "SUPPLIER_RETURN", "NEGATIVE_ADJUSTMENT", "OTHER_OUT"] } } },
      { $group: { _id: null, totalQty: { $sum: "$quantity" } } }
    ]);
    
    const stockIn = await StockTransaction.aggregate([
      { $match: { ...dateQuery, transactionType: { $in: ["PURCHASE", "CUSTOMER_RETURN", "POSITIVE_ADJUSTMENT", "OTHER_IN"] } } },
      { $group: { _id: null, totalQty: { $sum: "$quantity" } } }
    ]);

    return res.json({
      totalSales,
      totalPurchases,
      grossProfit,
      itemsSold,
      itemsPurchased,
      stockAdded: stockIn[0]?.totalQty || 0,
      stockRemoved: stockOut[0]?.totalQty || 0,
      cashCollected,
      upiCollected,
      creditSales,
      currentInventoryValue
    });
  } catch (error) {
    console.error("Error in getSummary:", error);
    res.status(500).json({ error: "Failed to fetch summary reports" });
  }
}

// --------------------------------------------------------
// 2. DETAILED TABLES
// --------------------------------------------------------
export async function getSales(req: AuthedRequest, res: Response) {
  try {
    const { startDate, endDate, page = "1", limit = "25" } = req.query;
    const { start, end } = getLocalBounds(startDate as string, endDate as string);
    const p = parseInt(page as string) || 1;
    const l = parseInt(limit as string) || 25;
    const skip = (p - 1) * l;

    const query = { createdAt: { $gte: start, $lte: end } };
    
    const items = await Sale.find(query)
      .populate("customerId", "name phone")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(l);
      
    const total = await Sale.countDocuments(query);

    return res.json({ items, total, page: p, pages: Math.ceil(total / l) });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch sales" });
  }
}

export async function getPurchases(req: AuthedRequest, res: Response) {
  try {
    const { startDate, endDate, page = "1", limit = "25" } = req.query;
    const { start, end } = getLocalBounds(startDate as string, endDate as string);
    const p = parseInt(page as string) || 1;
    const l = parseInt(limit as string) || 25;
    const skip = (p - 1) * l;

    const query = { createdAt: { $gte: start, $lte: end } };
    
    const items = await Purchase.find(query)
      .populate("supplierId", "supplierName phone")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(l);
      
    const total = await Purchase.countDocuments(query);

    return res.json({ items, total, page: p, pages: Math.ceil(total / l) });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch purchases" });
  }
}

export async function getStockMovements(req: AuthedRequest, res: Response) {
  try {
    const { startDate, endDate, page = "1", limit = "25", productId } = req.query;
    const { start, end } = getLocalBounds(startDate as string, endDate as string);
    const p = parseInt(page as string) || 1;
    const l = parseInt(limit as string) || 25;
    const skip = (p - 1) * l;

    const query: any = { createdAt: { $gte: start, $lte: end } };
    if (productId) {
      query.productId = new mongoose.Types.ObjectId(productId as string);
    }
    
    const items = await StockTransaction.find(query)
      .populate("productId", "productName sku")
      .populate("userId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(l);
      
    const total = await StockTransaction.countDocuments(query);

    return res.json({ items, total, page: p, pages: Math.ceil(total / l) });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stock movements" });
  }
}

// --------------------------------------------------------
// 3. UNIFIED TIMELINE (ALL TRANSACTIONS)
// --------------------------------------------------------
export async function getTransactions(req: AuthedRequest, res: Response) {
  try {
    // For a unified timeline, we can merge Sales, Purchases, and Adjustments sorted by date.
    // Given the complexity of querying multiple collections and paginating, 
    // the cleanest approach is to fetch from each, merge, sort, and slice.
    // If the date range is large, this might be slow, but it's acceptable for a kirana store dashboard.
    
    const { startDate, endDate, page = "1", limit = "25" } = req.query;
    const { start, end } = getLocalBounds(startDate as string, endDate as string);
    const p = parseInt(page as string) || 1;
    const l = parseInt(limit as string) || 25;
    
    const dateQuery = { createdAt: { $gte: start, $lte: end } };
    
    const sales = await Sale.find(dateQuery).populate("createdBy", "name").lean();
    const purchases = await Purchase.find(dateQuery).populate("createdBy", "name").populate("supplierId", "supplierName").lean();
    // We could add Expense or other transactions here if they exist.
    
    const unified: any[] = [];
    
    sales.forEach(s => unified.push({
      _id: s._id,
      date: s.createdAt,
      type: "SALE",
      referenceId: s.billNumber,
      amount: s.totalPaise,
      paymentMethod: s.paymentType,
      status: s.status,
      user: (s.createdBy as any)?.name || "Unknown"
    }));
    
    purchases.forEach(p => unified.push({
      _id: p._id,
      date: p.createdAt,
      type: "PURCHASE",
      referenceId: p.invoiceNumber || "N/A",
      party: (p.supplierId as any)?.supplierName || "Unknown",
      amount: p.totalAmountPaise,
      paymentMethod: p.paymentType,
      status: p.cancelled ? "CANCELLED" : "COMPLETED",
      user: (p.createdBy as any)?.name || "Unknown"
    }));
    
    unified.sort((a, b) => b.date.getTime() - a.date.getTime());
    
    const total = unified.length;
    const paginated = unified.slice((p - 1) * l, p * l);
    
    return res.json({ items: paginated, total, page: p, pages: Math.ceil(total / l) });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
}

export async function getAuditLog(req: AuthedRequest, res: Response) {
  try {
    const { startDate, endDate, page = "1", limit = "25" } = req.query;
    const { start, end } = getLocalBounds(startDate as string, endDate as string);
    const p = parseInt(page as string) || 1;
    const l = parseInt(limit as string) || 25;
    const skip = (p - 1) * l;

    const query = { createdAt: { $gte: start, $lte: end } };
    
    const items = await AuditLog.find(query)
      .populate("userId", "name role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(l);
      
    const total = await AuditLog.countDocuments(query);

    return res.json({ items, total, page: p, pages: Math.ceil(total / l) });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch audit log" });
  }
}

export async function getProfit(req: AuthedRequest, res: Response) {
  try {
    const { startDate, endDate } = req.query;
    const { start, end } = getLocalBounds(startDate as string, endDate as string);
    const dateQuery = { createdAt: { $gte: start, $lte: end } };
    
    const sales = await Sale.find({ ...dateQuery, status: "COMPLETED" });
    let totalSales = 0;
    let totalCogs = 0;

    const productProfits: Record<string, {
      productName: string;
      qtySold: number;
      revenue: number;
      cogs: number;
      profit: number;
    }> = {};

    for (const sale of sales) {
      totalSales += sale.totalPaise;
      for (const item of sale.items) {
        const product = await Product.findById(item.productId);
        if (product) {
          const itemCogs = product.purchaseCostPaise * item.quantity;
          totalCogs += itemCogs;
          
          const pid = product._id.toString();
          if (!productProfits[pid]) {
            productProfits[pid] = { productName: product.productName, qtySold: 0, revenue: 0, cogs: 0, profit: 0 };
          }
          productProfits[pid].qtySold += item.quantity;
          productProfits[pid].revenue += item.totalPaise;
          productProfits[pid].cogs += itemCogs;
          productProfits[pid].profit += (item.totalPaise - itemCogs);
        }
      }
    }

    const grossProfit = totalSales - totalCogs;
    const grossMargin = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;

    const productArray = Object.values(productProfits).sort((a, b) => b.profit - a.profit);

    return res.json({
      totalSales,
      cogs: totalCogs,
      grossProfit,
      grossMargin,
      products: productArray
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch profit" });
  }
}
