import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getReorderList } from "../controllers/reorderController";

const router = Router();
router.get("/", requireAuth, getReorderList);
export default router;
