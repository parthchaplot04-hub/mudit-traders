import { Router } from "express";
import { loginController, meController, logoutController } from "../controllers/authController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/login", loginController);
router.post("/logout", requireAuth, logoutController);
router.get("/me", requireAuth, meController);

export default router;
