import { Router } from "express";
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  submitPicking,
  billOrder
} from "../controllers/orderController";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

// Base routes
router.get("/", requireAuth, getOrders);
router.post("/", requireAuth, createOrder);

// Detail routes
router.get("/:id", requireAuth, getOrderById);
router.put("/:id/status", requireAuth, updateOrderStatus);
router.put("/:id/pick", requireAuth, submitPicking);
router.post("/:id/bill", requireAuth, requireRole("OWNER", "ADMIN"), billOrder);

export default router;
