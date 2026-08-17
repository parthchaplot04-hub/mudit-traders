import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import * as productController from "../controllers/productController";

const router = Router();

router.use(requireAuth);

router.get("/", productController.listProducts);
router.get("/:id", productController.getProduct);
router.post("/", requireRole("OWNER", "ADMIN"), productController.createProduct);
router.put("/:id", productController.updateProduct); // service enforces price-edit = owner-only
router.patch("/:id/deactivate", requireRole("OWNER", "ADMIN"), productController.deactivateProduct);
router.delete("/:id", requireRole("OWNER", "ADMIN"), productController.deleteProduct);

export default router;
