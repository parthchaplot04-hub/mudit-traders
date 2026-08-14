import { Router, text } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import * as csvController from "../controllers/csvController";

const router = Router();
router.use(requireAuth);

// Imports accept raw CSV as the request body (Content-Type: text/csv or text/plain).
const csvTextParser = text({ type: ["text/csv", "text/plain"], limit: "5mb" });

router.post("/products/import", requireRole("OWNER", "ADMIN"), csvTextParser, csvController.importProducts);
router.post("/suppliers/import", requireRole("OWNER", "ADMIN"), csvTextParser, csvController.importSuppliers);

router.get("/products/export", csvController.exportProducts);
router.get("/suppliers/export", csvController.exportSuppliers);
router.get("/inventory/export", csvController.exportInventory);
router.get("/sales/export", csvController.exportSales);
router.get("/purchases/export", csvController.exportPurchases);
router.get("/suppliers/:id/ledger/export", csvController.exportSupplierLedger);

export default router;
