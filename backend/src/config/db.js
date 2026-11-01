const mongoose = require("mongoose");

let mongod = null;

async function connectDB() {
  const customUri = process.env.MONGODB_URI;

  if (customUri) {
    try {
      console.log(`Attempting connection to MongoDB at: ${customUri}`);
      const conn = await mongoose.connect(customUri, {
        serverSelectionTimeoutMS: 3000,
      });
      console.log(`✓ Connected to external MongoDB: ${conn.connection.host}`);
      return;
    } catch (err) {
      console.warn(`External MongoDB unavailable (${err.message}). Initializing embedded database...`);
    }
  }

  // Fallback to local default or MongoMemoryServer for zero-friction evaluation
  try {
    const defaultLocalUri = "mongodb://127.0.0.1:27017/medrec_db";
    const conn = await mongoose.connect(defaultLocalUri, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`✓ Connected to local MongoDB: ${conn.connection.host}`);
    return;
  } catch (localErr) {
    console.log("Local MongoDB daemon not running. Launching embedded MongoMemoryServer for instant zero-config setup...");
    const { MongoMemoryServer } = require("mongodb-memory-server");
    mongod = await MongoMemoryServer.create({
      instance: {
        dbName: "medrec_db",
      },
    });
    const memoryUri = mongod.getUri();
    await mongoose.connect(memoryUri);
    console.log(`✓ Connected to Embedded MongoMemoryServer at: ${memoryUri}`);
    console.log("✓ All data will be preserved in memory during runtime.");
  }
}

async function closeDB() {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
}

module.exports = { connectDB, closeDB };
