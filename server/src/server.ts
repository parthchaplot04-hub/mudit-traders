import dotenv from "dotenv";
dotenv.config();

import { createApp } from "./app";
import { connectDB } from "./config/db";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

async function main() {
  try {
    await connectDB(process.env.MONGODB_URI || "");
  } catch (err) {
    // Fail loudly and exit rather than serving requests against a broken
    // DB connection (spec section 59: gracefully handle MongoDB connection
    // failure - "graceful" here means a clear log + non-zero exit, not
    // silently pretending to work).
    // eslint-disable-next-line no-console
    console.error("[fatal] Could not connect to MongoDB:", (err as Error).message);
    process.exit(1);
  }

  const app = createApp();
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] Mudit Traders API listening on port ${PORT}`);
  });
}

main();
