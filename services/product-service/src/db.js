import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/product_db';
const client = new MongoClient(uri);

let db = null;

export async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db('product_db');
    console.log('[Product Service] Connected to MongoDB product_db');
  }
  return db;
}

export function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB first.');
  }
  return db;
}
