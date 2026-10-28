import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/shipment_db';
const client = new MongoClient(uri);

let db = null;

export async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db('shipment_db');
    console.log('[Shipment Service] Connected to MongoDB shipment_db');
  }
  return db;
}

export function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB first.');
  }
  return db;
}
