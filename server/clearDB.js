const mongoose = require('mongoose');

async function clearDB() {
  try {
    await mongoose.connect('mongodb://localhost:27017/mudit-traders');
    console.log('Connected to MongoDB');

    const collectionsToClear = [
      'products',
      'sales',
      'orders',
      'suppliers',
      'purchases',
      'stocktransactions',
      'counters',
      'customers',
      'customerledgerentries',
      'auditlogs'
    ];

    const db = mongoose.connection.db;
    const existingCollections = await db.listCollections().toArray();
    const existingNames = existingCollections.map(c => c.name);

    for (const colName of collectionsToClear) {
      if (existingNames.includes(colName)) {
        await db.collection(colName).deleteMany({});
        console.log(`Cleared collection: ${colName}`);
      } else {
        console.log(`Collection not found, skipping: ${colName}`);
      }
    }

    console.log('Successfully cleared the database (preserved users).');
    process.exit(0);
  } catch (err) {
    console.error('Error clearing database:', err);
    process.exit(1);
  }
}

clearDB();
