import { Response } from "express";
import { AuthedRequest } from "../middleware/auth";
import { Order, OrderStatus, IOrderItem } from "../models/Order";
import { Product } from "../models/Product";
import { Counter } from "../models/Counter";
import { Sale } from "../models/Sale";
import { StockTransaction } from "../models/StockTransaction";
import { AuditLog } from "../models/AuditLog";
import { Customer } from "../models/Customer";

async function generateOrderNumber(): Promise<string> {
  const counter = await Counter.findOneAndUpdate(
    { key: "orderNumber" },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  );
  return `MT-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${counter.sequence.toString().padStart(3, "0")}`;
}

async function generateBillNumber(): Promise<string> {
  const counter = await Counter.findOneAndUpdate(
    { key: "billNumber" },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  );
  return `INV-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${counter.sequence.toString().padStart(3, "0")}`;
}

async function logAudit(action: string, orderId: any, userId: string, notes: string = "") {
  await AuditLog.create({
    action,
    entityType: "ORDER",
    entityId: orderId,
    userId,
    notes,
  });
}

export async function getOrders(req: AuthedRequest, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as OrderStatus | undefined;
    const skip = (page - 1) * limit;

    const query: any = {};
    if (status) query.status = status;

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

    res.status(200).json({ data: items, total, page, pages: Math.ceil(total / limit) });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

export async function getOrderById(req: AuthedRequest, res: Response): Promise<void> {
  try {
    const order = await Order.findById(req.params.id)
      .populate("customerId", "name phone address")
      .populate("createdBy", "name role")
      .populate("pickedBy", "name role")
      .populate("invoiceId");
      
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }
    res.status(200).json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

export async function createOrder(req: AuthedRequest, res: Response): Promise<void> {
  try {
    const { customerId, customerName, customerPhone, customerAddress, items, notes } = req.body;
    
    if (!items || items.length === 0) {
      res.status(400).json({ message: "Order must have at least one item." });
      return;
    }

    if (!customerId && (!customerName || !customerName.trim())) {
      res.status(400).json({ message: "Customer Name is required for walk-in orders." });
      return;
    }

    let finalCustomerId = customerId;
    let finalCustomerName = customerName;
    let finalCustomerPhone = customerPhone;

    // Auto-create customer if details provided
    if (!customerId && customerName && customerName.trim()) {
      const newCustomer = await Customer.create({
        name: customerName.trim(),
        phone: customerPhone?.trim() || undefined,
        address: customerAddress?.trim() || undefined,
      });
      finalCustomerId = newCustomer._id;
      finalCustomerName = newCustomer.name;
      finalCustomerPhone = newCustomer.phone;
    }

    const productIds = items.map((i: any) => i.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    if (products.length !== productIds.length) {
      res.status(400).json({ message: "Invalid products." });
      return;
    }

    const orderNumber = await generateOrderNumber();
    
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
      customerId: finalCustomerId || undefined,
      customerName: finalCustomerName?.trim() || undefined,
      customerPhone: finalCustomerPhone?.trim() || undefined,
      items: orderItems,
      notes,
      status: "WAITING_FOR_STAFF",
      createdBy: req.user!.userId,
    });

    await newOrder.save();
    await logAudit("CREATE", newOrder._id, req.user!.userId, "Order created");

    res.status(201).json(newOrder);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

// --------------------------------------------------------------------------
// STRICT WORKFLOW ENDPOINTS
// --------------------------------------------------------------------------

/**
 * 1. Staff toggles an item as COLLECTED (saves actual weighed quantity)
 */
export async function collectItem(req: AuthedRequest, res: Response): Promise<void> {
  try {
    const { itemId } = req.params;
    const { pickedQuantity } = req.body;
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    const item = (order.items as any).id(itemId);
    if (!item) {
      res.status(404).json({ message: "Item not found" });
      return;
    }

    item.isCollected = true;
    item.collectedAt = new Date();
    if (pickedQuantity !== undefined) item.pickedQuantity = pickedQuantity;
    
    // Auto-update status to COLLECTING_ITEMS if first item
    if (order.status === "WAITING_FOR_STAFF") {
      order.status = "COLLECTING_ITEMS";
      order.pickedBy = req.user!.userId as any;
    }

    await order.save();
    await logAudit("ITEM_COLLECTED", order._id, req.user!.userId, `Collected ${item.productName} (${item.pickedQuantity || item.orderedQuantity} ${item.salesUnit})`);
    
    res.status(200).json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * 2. Staff toggles an item as PACKED
 */
export async function packItem(req: AuthedRequest, res: Response): Promise<void> {
  try {
    const { itemId } = req.params;
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    const item = (order.items as any).id(itemId);
    if (!item) {
      res.status(404).json({ message: "Item not found" });
      return;
    }
    if (!item.isCollected) {
      res.status(400).json({ message: "Cannot pack before collecting" });
      return;
    }

    item.isPacked = true;
    item.packedAt = new Date();
    
    // Auto-update status to PACKING
    if (order.status === "COLLECTING_ITEMS") {
      order.status = "PACKING";
    }

    await order.save();
    await logAudit("ITEM_PACKED", order._id, req.user!.userId, `Packed ${item.productName}`);

    res.status(200).json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * 3. Staff submits entire order to owner
 */
export async function submitToOwner(req: AuthedRequest, res: Response): Promise<void> {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    const allCollected = order.items.every(i => i.isCollected);
    const allPacked = order.items.every(i => i.isPacked);

    if (!allCollected || !allPacked) {
      res.status(400).json({ message: "All items must be collected and packed first." });
      return;
    }

    order.status = "WAITING_FOR_OWNER_CHECK";
    await order.save();
    await logAudit("SENT_TO_OWNER", order._id, req.user!.userId, "Staff submitted to owner");

    res.status(200).json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * 4. Owner toggles an item as VERIFIED
 */
export async function verifyItem(req: AuthedRequest, res: Response): Promise<void> {
  try {
    const { itemId } = req.params;
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    const item = (order.items as any).id(itemId);
    if (!item) {
      res.status(404).json({ message: "Item not found" });
      return;
    }

    item.isVerified = true;
    item.verifiedAt = new Date();

    if (order.status === "WAITING_FOR_OWNER_CHECK") {
      order.status = "OWNER_CHECKING";
    }

    await order.save();
    await logAudit("ITEM_VERIFIED", order._id, req.user!.userId, `Verified ${item.productName}`);

    // If all verified, auto-transition to READY_FOR_BILLING
    const allVerified = order.items.every(i => i.isVerified);
    if (allVerified) {
      order.status = "READY_FOR_BILLING";
      await order.save();
    }

    res.status(200).json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * 5. Owner creates Bill
 */
export async function billOrder(req: AuthedRequest, res: Response): Promise<void> {
  try {
    const { discountPaise } = req.body;
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    if (order.status !== "READY_FOR_BILLING") {
      res.status(400).json({ message: "Order not ready for billing. All items must be verified." });
      return;
    }

    let subtotalPaise = 0;
    let totalGstPaise = 0;
    const saleItems = [];

    const products = await Product.find({ _id: { $in: order.items.map(i => i.productId) } });

    for (const item of order.items) {
      const product = products.find((p) => p._id.toString() === item.productId.toString());
      if (!product) continue;
      
      const qty = item.pickedQuantity ?? item.orderedQuantity;
      if (qty <= 0) continue; 

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

      // STRICT INVENTORY DEDUCTION (Only happens once upon bill creation)
      product.currentStock = Math.max(0, product.currentStock - qty);
      await product.save();

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
      paymentType: "CASH", // Placeholder until payment is strictly recorded
      status: "COMPLETED",
      createdBy: req.user!.userId,
    });

    await sale.save();

    // Link Invoice & transition status
    order.invoiceId = sale._id;
    order.status = "PAYMENT_PENDING";
    await order.save();
    await logAudit("BILL_CREATED", order._id, req.user!.userId, `Bill ${billNumber} created`);

    res.status(201).json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * 6. Record Payment
 */
export async function recordPayment(req: AuthedRequest, res: Response): Promise<void> {
  try {
    const { payments } = req.body;
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    if (order.status !== "PAYMENT_PENDING") {
      res.status(400).json({ message: "Order not in payment pending state." });
      return;
    }
    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      res.status(400).json({ message: "Payments array required." });
      return;
    }

    order.paymentStatus = "COMPLETED";
    order.payments = payments;
    order.paymentReceivedAt = new Date();
    order.status = "READY_FOR_HANDOVER";

    // Also update the connected Sale's payment method
    if (order.invoiceId) {
      await Sale.findByIdAndUpdate(order.invoiceId, { 
        paymentType: payments[0].method, // backward compatibility
        payments: payments 
      });
    }

    await order.save();
    await logAudit("PAYMENT_RECEIVED", order._id, req.user!.userId, `Payment completed via ${payments.map((p: any) => p.method).join(", ")}`);

    res.status(200).json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

/**
 * 7. Complete Handover
 */
export async function completeHandover(req: AuthedRequest, res: Response): Promise<void> {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    if (order.status !== "READY_FOR_HANDOVER") {
      res.status(400).json({ message: "Order not ready for handover." });
      return;
    }

    order.handoverStatus = "COMPLETED";
    order.handedOverAt = new Date();
    order.status = "COMPLETED";

    await order.save();
    await logAudit("HANDOVER_COMPLETED", order._id, req.user!.userId, "Order completed and handed over");

    res.status(200).json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}
