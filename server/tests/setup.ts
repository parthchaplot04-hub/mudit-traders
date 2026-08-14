import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";

/**
 * Integration tests spin up an in-memory MongoDB REPLICA SET (a single-node
 * one, via mongodb-memory-server) because MongoDB transactions - which
 * purchaseService/saleService/wastageService rely on - require a replica
 * set; a standalone mongod cannot run session.withTransaction(). NOTE: the
 * first run needs network access once to download the mongod binary -
 * after that it's cached locally. In a fully offline environment, point
 * MONGODB_URI at a real local/dev MongoDB replica set instead.
 */
let mongod: MongoMemoryReplSet;

export async function connect() {
  mongod = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  await mongoose.connect(mongod.getUri());
}

export async function closeDatabase() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
}

export async function clearDatabase() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}
