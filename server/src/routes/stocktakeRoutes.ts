import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import * as stocktakeController from "../controllers/stocktakeController";

const router = Router();
router.use(requireAuth);

router.get("/", stocktakeController.listStocktakes);
router.post("/", requireRole("OWNER", "ADMIN"), stocktakeController.createStocktake);

export default router;
