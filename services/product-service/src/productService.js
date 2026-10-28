import { getDB } from './db.js';

export async function getProducts() {
  const db = getDB();
  const products = await db.collection('products').find({}, { projection: { _id: 0 } }).toArray();
  return { items: products };
}

export async function getProductById({ pid }) {
  const db = getDB();
  const product = await db.collection('products').findOne({ pid: Number(pid) }, { projection: { _id: 0 } });
  if (!product) {
    const error = new Error(`Product with pid ${pid} not found`);
    error.code = 'NOT_FOUND';
    throw error;
  }
  return product;
}

export async function createProduct({ pname, price, quantity }) {
  const db = getDB();
  if (!pname || price === undefined || quantity === undefined) {
    const error = new Error('Invalid product data');
    error.code = 'INVALID_ARGUMENT';
    throw error;
  }

  // Get max pid
  const lastProd = await db.collection('products').find({}).sort({ pid: -1 }).limit(1).toArray();
  const nextPid = lastProd.length > 0 ? lastProd[0].pid + 1 : 1;

  const newProduct = {
    pid: nextPid,
    pname,
    price: Number(price),
    quantity: Number(quantity),
  };

  await db.collection('products').insertOne({ ...newProduct });
  return newProduct;
}

export async function updateProduct({ pid, pname, price, quantity }) {
  const db = getDB();
  const pIdNum = Number(pid);
  const existing = await db.collection('products').findOne({ pid: pIdNum });
  if (!existing) {
    const error = new Error(`Product with pid ${pid} not found`);
    error.code = 'NOT_FOUND';
    throw error;
  }

  const updateFields = {};
  if (pname) updateFields.pname = pname;
  if (price !== undefined) updateFields.price = Number(price);
  if (quantity !== undefined) updateFields.quantity = Number(quantity);

  await db.collection('products').updateOne({ pid: pIdNum }, { $set: updateFields });

  const updated = await db.collection('products').findOne({ pid: pIdNum }, { projection: { _id: 0 } });
  return updated;
}

export async function deleteProduct({ pid }) {
  const db = getDB();
  const pIdNum = Number(pid);
  const result = await db.collection('products').deleteOne({ pid: pIdNum });
  if (result.deletedCount === 0) {
    const error = new Error(`Product with pid ${pid} not found`);
    error.code = 'NOT_FOUND';
    throw error;
  }
  return { success: true, message: 'Product deleted successfully', pid: pIdNum };
}

export async function checkAndDeductStock({ items }) {
  const db = getDB();
  const updatedItems = [];

  // Step 1: Check availability for all items first
  for (const item of items) {
    const pIdNum = Number(item.pid);
    const qty = Number(item.qty);

    const product = await db.collection('products').findOne({ pid: pIdNum });
    if (!product) {
      const error = new Error(`Product with pid ${item.pid} not found`);
      error.code = 'NOT_FOUND';
      throw error;
    }

    if (product.quantity < qty) {
      const error = new Error(`Insufficient stock for product pid ${item.pid}. Available: ${product.quantity}, Requested: ${qty}`);
      error.code = 'FAILED_PRECONDITION';
      throw error;
    }
  }

  // Step 2: Atomic update and decrement
  for (const item of items) {
    const pIdNum = Number(item.pid);
    const qty = Number(item.qty);

    const res = await db.collection('products').findOneAndUpdate(
      { pid: pIdNum, quantity: { $gte: qty } },
      { $inc: { quantity: -qty } },
      { returnDocument: 'after', projection: { _id: 0 } }
    );

    if (!res) {
      const error = new Error(`Failed to deduct stock for product pid ${item.pid} due to concurrent update`);
      error.code = 'ABORTED';
      throw error;
    }

    updatedItems.push(res);
  }

  return {
    success: true,
    message: 'Stock checked and deducted successfully',
    items: updatedItems,
  };
}
