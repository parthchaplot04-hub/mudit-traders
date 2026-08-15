import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import * as purchaseController from "../controllers/purchaseController";

const router = Router();
router.use(requireAuth);

router.get("/", purchaseController.listPurchases);
router.get("/:id", purchaseController.getPurchase);
router.post("/", requireRole("OWNER", "ADMIN"), purchaseController.createPurchase);
router.put("/:id", requireRole("OWNER", "ADMIN"), purchaseController.updatePurchase);
router.delete("/:id", requireRole("OWNER", "ADMIN"), purchaseController.cancelPurchase);

export default router;
