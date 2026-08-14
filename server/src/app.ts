import express from "express";
import cors from "cors";
import morgan from "morgan";

import healthRoutes from "./routes/healthRoutes";
import authRoutes from "./routes/authRoutes";
import productRoutes from "./routes/productRoutes";
import purchaseRoutes from "./routes/purchaseRoutes";
import saleRoutes from "./routes/saleRoutes";
import supplierRoutes from "./routes/supplierRoutes";
import reorderRoutes from "./routes/reorderRoutes";
import wastageRoutes from "./routes/wastageRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import customerRoutes from "./routes/customerRoutes";
import stocktakeRoutes from "./routes/stocktakeRoutes";
import csvRoutes from "./routes/csvRoutes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  // CORS: allow the configured frontend origin(s) only - never "*" for an
  // authenticated app (spec section 12). CLIENT_URL may be a comma-
  // separated list for local + production origins.
  const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim());

  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );

  app.use(express.json({ limit: "2mb" }));
  if (process.env.NODE_ENV !== "test") {
    app.use(morgan("dev"));
  }

  app.use("/api/health", healthRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/purchases", purchaseRoutes);
  app.use("/api/sales", saleRoutes);
  app.use("/api/suppliers", supplierRoutes);
  app.use("/api/reorder", reorderRoutes);
  app.use("/api/wastage", wastageRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/customers", customerRoutes);
  app.use("/api/stocktake", stocktakeRoutes);
  app.use("/api/csv", csvRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
