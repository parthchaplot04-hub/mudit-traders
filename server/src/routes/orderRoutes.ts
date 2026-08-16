import { Router } from "express";
import {
  getOrders,
  getOrderById,
  createOrder,
  collectItem,
  packItem,
  submitToOwner,
  verifyItem,
  billOrder,
  recordPayment,
  completeHandover
} from "../controllers/orderController";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();

router.get("/", requireAuth, getOrders);
router.post("/", requireAuth, createOrder);

router.get("/:id", requireAuth, getOrderById);
router.put("/:id/items/:itemId/collect", requireAuth, collectItem);
router.put("/:id/items/:itemId/pack", requireAuth, packItem);
router.put("/:id/submit", requireAuth, submitToOwner);

router.put("/:id/items/:itemId/verify", requireAuth, requireRole("OWNER", "ADMIN"), verifyItem);
router.post("/:id/bill", requireAuth, requireRole("OWNER", "ADMIN"), billOrder);
router.put("/:id/payment", requireAuth, requireRole("OWNER", "ADMIN"), recordPayment);
router.put("/:id/handover", requireAuth, requireRole("OWNER", "ADMIN"), completeHandover);

export default router;
