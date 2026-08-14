import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

router.get("/", (_req, res) => {
  const dbState = mongoose.connection.readyState; // 1 = connected
  res.json({
    status: dbState === 1 ? "ok" : "degraded",
    db: dbState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

export default router;
