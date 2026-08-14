import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import * as saleController from "../controllers/saleController";

const router = Router();
router.use(requireAuth);

router.get("/", saleController.listSales);
router.get("/:id", saleController.getSale);
router.post("/", requireRole("OWNER", "STAFF", "ADMIN"), saleController.createSale);
router.post("/:id/cancel", requireRole("OWNER", "ADMIN"), saleController.cancelSale);

export default router;
