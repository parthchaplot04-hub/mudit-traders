const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://parthchaplot04_db_user:m5dXab%21MXNGXZqn@mudittraders.entkruc.mongodb.net/?appName=mudittraders";

async function run() {
  const conn = await mongoose.createConnection(MONGODB_URI).asPromise();
  const admin = conn.db.admin();
  const dbs = await admin.listDatabases();
  
  for (const dbInfo of dbs.databases) {
    if (dbInfo.name === 'admin' || dbInfo.name === 'local') continue;
    const db = conn.useDb(dbInfo.name);
    const Product = db.model('Product', new mongoose.Schema({}, { strict: false }));
    const count = await Product.countDocuments();
    if (count > 0) {
      console.log(`Found ${count} products in database: ${dbInfo.name}`);
      const res = await Product.deleteMany({});
      console.log(`Deleted ${res.deletedCount} products from database ${dbInfo.name}`);
    }
  }
  await conn.close();
}

run().catch(console.error);
