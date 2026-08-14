import mongoose from "mongoose";

export async function connectDB(uri: string): Promise<void> {
  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Copy .env.example to .env and fill it in."
    );
  }
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  // eslint-disable-next-line no-console
  console.log(`[db] connected to MongoDB (${mongoose.connection.name})`);
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
