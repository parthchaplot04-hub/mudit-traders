import { Router } from "express";
import { loginController, meController, logoutController, setupController } from "../controllers/authController";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/login", loginController);
router.post("/logout", requireAuth, logoutController);
router.get("/me", requireAuth, meController);

// Temp setup route for seeding initial users
router.get("/setup", setupController);

export default router;
