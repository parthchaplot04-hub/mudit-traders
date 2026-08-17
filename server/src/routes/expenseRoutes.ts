import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import * as expenseController from "../controllers/expenseController";

const router = Router();
router.use(requireAuth);

router.get("/", requireRole("OWNER", "ADMIN"), expenseController.listExpenses);
router.post("/", requireRole("OWNER", "ADMIN"), expenseController.createExpense);

export default router;
