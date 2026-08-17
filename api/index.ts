import type { Request, Response } from "express";
import { createApp } from "../server/src/app";
import { connectDB } from "../server/src/config/db";
import mongoose from "mongoose";
import "../server/src/models/StockTransaction"; // Force vercel to bundle this file

let isConnected = false;
const app = createApp();

export default async function handler(req: Request, res: Response) {
  if (!isConnected && mongoose.connection.readyState !== 1) {
    try {
      const uri = process.env.MONGODB_URI;
      if (!uri) {
        throw new Error("MONGODB_URI environment variable is not set");
      }
      await connectDB(uri);
      isConnected = true;
    } catch (err) {
      console.error("[fatal] Could not connect to MongoDB:", err);
      return res.status(500).json({ error: "Database connection failed. Please check MONGODB_URI in Vercel settings." });
    }
  }
  return app(req, res);
}
