import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import * as reportController from "../controllers/reportController";

const router = Router();

router.use(requireAuth);
router.use(requireRole("OWNER", "ADMIN"));

router.get("/summary", reportController.getSummary);
router.get("/sales", reportController.getSales);
router.get("/purchases", reportController.getPurchases);
router.get("/stock-movements", reportController.getStockMovements);
router.get("/transactions", reportController.getTransactions);
router.get("/audit", reportController.getAuditLog);

export default router;
