import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import * as supplierController from "../controllers/supplierController";

const router = Router();
router.use(requireAuth);

router.get("/", supplierController.listSuppliers);
router.get("/:id", supplierController.getSupplier);
router.get("/:id/ledger", supplierController.getSupplierLedger);
router.post("/", requireRole("OWNER", "ADMIN"), supplierController.createSupplier);
router.post("/:id/payments", requireRole("OWNER", "ADMIN"), supplierController.recordPayment);

export default router;
