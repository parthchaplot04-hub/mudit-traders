import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { Order, OrderStatus } from "../models/Order";
import { Product } from "../models/Product";
import { Counter } from "../models/Counter";
import { Sale } from "../models/Sale";
import { StockTransaction } from "../models/StockTransaction";
import { AuditLog } from "../models/AuditLog";

/**
 * Helper to generate the next order number.
 */
async function generateOrderNumber(): Promise<string> {
  const counter = await Counter.findOneAndUpdate(
    { key: "orderNumber" },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  );
  return `ORD-${counter.sequence.toString().padStart(5, "0")}`;
}

/**
 * Helper to generate the next bill number for Sale conversion.
 */
async function generateBillNumber(): Promise<string> {
  const counter = await Counter.findOneAndUpdate(
    { key: "billNumber" },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  );
  return `BILL-${counter.sequence.toString().padStart(6, "0")}`;
}

/**
 * Get all orders with pagination and status filters
 */
export async function getOrders(req: AuthedRequest, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as OrderStatus | undefined;
    const skip = (page - 1) * limit;

    const query: any = {};
    if (status) {
      query.status = status;
    }

    const [items, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("customerId", "name phone")
        .populate("createdBy", "name role")
        .populate("pickedBy", "name role"),
      Order.countDocuments(query),
    ]);

    res.status(200).json({
      data: items,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * Get single order details
 */
export async function getOrderById(req: AuthedRequest, res: Response): Promise<void> {
  try {
    const order = await Order.findById(req.params.id)
      .populate("customerId", "name phone address")
      .populate("createdBy", "name role")
      .populate("pickedBy", "name role");
      
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }
    res.status(200).json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * Create a new PENDING order
 */
export async function createOrder(req: AuthedRequest, res: Response): Promise<void> {
  try {
    const { customerId, items, notes } = req.body;
    
    if (!items || items.length === 0) {
      res.status(400).json({ message: "Order must have at least one item." });
      return;
    }

    // Verify products
    const productIds = items.map((i: any) => i.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    if (products.length !== productIds.length) {
      res.status(400).json({ message: "One or more products are invalid." });
      return;
    }

    const orderNumber = await generateOrderNumber();
    
    // Map items mapping current snapshotted prices
    const orderItems = items.map((item: any) => {
      const product = products.find((p) => p._id.toString() === item.productId);
      return {
        productId: product!._id,
        productName: product!.productName,
        salesUnit: product!.salesUnit,
        orderedQuantity: item.orderedQuantity,
        unitPricePaise: product!.sellingPricePaise,
        gstRate: product!.gstRate,
        notes: item.notes || ""
      };
    });

    const newOrder = new Order({
      orderNumber,
      customerId: customerId || undefined,
      items: orderItems,
      notes,
      status: "PENDING",
      createdBy: req.user!.userId,
    });

    await newOrder.save();

    await AuditLog.create({
      action: "CREATE",
      entityType: "ORDER",
      entityId: newOrder._id,
      userId: req.user!.userId,
      newValue: newOrder.toObject(),
    });

    res.status(201).json(newOrder);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * Change order status directly (e.g. PENDING -> PICKING, READY_FOR_CHECK -> CHECKED)
 */
export async function updateOrderStatus(req: AuthedRequest, res: Response): Promise<void> {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    const oldStatus = order.status;
    order.status = status;
    
    if (status === "PICKING" && oldStatus === "PENDING") {
      order.pickedBy = req.user!.userId as any; // Mark whoever started picking
    }

    await order.save();

    await AuditLog.create({
      action: "UPDATE",
      entityType: "ORDER",
      entityId: order._id,
      userId: req.user!.userId,
      oldValue: { status: oldStatus },
      newValue: { status: order.status },
      notes: `Order status changed from ${oldStatus} to ${order.status}`,
    });

    res.status(200).json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * Submit picked quantities by staff and move to READY_FOR_CHECK
 */
export async function submitPicking(req: AuthedRequest, res: Response): Promise<void> {
  try {
    const { items } = req.body; // Array of { productId, pickedQuantity }
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    if (order.status === "BILLED" || order.status === "CANCELLED") {
      res.status(400).json({ message: "Cannot modify a billed or cancelled order." });
      return;
    }

    order.items.forEach((orderItem) => {
      const match = items.find((i: any) => i.productId === orderItem.productId.toString());
      if (match) {
        orderItem.pickedQuantity = match.pickedQuantity;
      }
    });

    order.status = "READY_FOR_CHECK";
    order.pickedBy = req.user!.userId as any;
    await order.save();

    res.status(200).json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * Convert Order to Sale (Billing Step)
 * This calculates final amounts based on `pickedQuantity` or updated quantities submitted by the owner.
 */
export async function billOrder(req: AuthedRequest, res: Response): Promise<void> {
  try {
    const { paymentType, items: updatedItems, discountPaise } = req.body;
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    if (order.status === "BILLED" || order.status === "CANCELLED") {
      res.status(400).json({ message: "Order is already billed or cancelled." });
      return;
    }

    let subtotalPaise = 0;
    let totalGstPaise = 0;
    const saleItems = [];

    // The owner might have tweaked the quantities or prices at the billing stage, so we use `updatedItems` if provided,
    // otherwise fallback to what was currently on the order.
    const itemsToBill = updatedItems || order.items.map(i => ({
      productId: i.productId.toString(),
      quantity: i.pickedQuantity ?? i.orderedQuantity,
      unitPricePaise: i.unitPricePaise,
    }));

    // Re-verify products
    const productIds = itemsToBill.map((i: any) => i.productId);
    const products = await Product.find({ _id: { $in: productIds } });

    for (const item of itemsToBill) {
      const product = products.find((p) => p._id.toString() === item.productId);
      if (!product) continue;
      if (item.quantity <= 0) continue; // Skip items that were not picked at all

      const qty = item.quantity;
      const unitPrice = item.unitPricePaise;
      
      const taxableValue = Math.round(qty * unitPrice);
      const gstAmt = Math.round(taxableValue * (product.gstRate / 100));
      const totalItemAmt = taxableValue + gstAmt;

      subtotalPaise += taxableValue;
      totalGstPaise += gstAmt;

      saleItems.push({
        productId: product._id,
        productName: product.productName,
        salesUnit: product.salesUnit,
        quantity: qty,
        unitPricePaise: unitPrice,
        gstRate: product.gstRate,
        taxableValuePaise: taxableValue,
        gstPaise: gstAmt,
        totalPaise: totalItemAmt,
      });

      // Update Inventory
      product.currentStock = Math.max(0, product.currentStock - qty);
      await product.save();

      // Log Stock Transaction
      await StockTransaction.create({
        productId: product._id,
        transactionType: "SALE",
        quantity: qty,
        unit: product.salesUnit,
        stockBeforeQty: product.currentStock + qty,
        stockAfterQty: product.currentStock,
        userId: req.user!.userId,
        notes: `Sale for Order ${order.orderNumber}`,
      });
    }

    const appliedDiscount = discountPaise || 0;
    const finalTotalPaise = subtotalPaise + totalGstPaise - appliedDiscount;

    const billNumber = await generateBillNumber();

    const sale = new Sale({
      billNumber,
      customerId: order.customerId,
      items: saleItems,
      subtotalPaise,
      discountPaise: appliedDiscount,
      totalGstPaise,
      totalPaise: finalTotalPaise,
      paymentType: paymentType || "CASH",
      status: "COMPLETED",
      createdBy: req.user!.userId,
    });

    await sale.save();

    // Mark order as BILLED
    order.status = "BILLED";
    await order.save();

    res.status(201).json(sale);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}
