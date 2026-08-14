import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { getDashboard } from "../controllers/dashboardController";

const router = Router();
router.get("/", requireAuth, getDashboard);
export default router;
