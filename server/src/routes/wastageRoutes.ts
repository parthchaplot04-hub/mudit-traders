import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import * as wastageController from "../controllers/wastageController";

const router = Router();
router.use(requireAuth);
router.get("/", wastageController.listWastage);
router.post("/", wastageController.createWastage);

export default router;
