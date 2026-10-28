import pool from './db.js';
import { getCustomer, getMembership } from './grpcClients/customerClient.js';
import { checkAndDeductStock } from './grpcClients/productClient.js';

export function calculateDiscount(score) {
  const numScore = Number(score) || 0;
  if (numScore >= 1000) return 20.0;
  if (numScore >= 500) return 15.0;
  if (numScore >= 100) return 10.0;
  if (numScore >= 10) return 10.0;
  return 0.0;
}

export async function createOrder({ uid, items }) {
  if (!items || items.length === 0) {
    const error = new Error('Order items cannot be empty');
    error.code = 'INVALID_ARGUMENT';
    throw error;
  }

  // Step 1: Lấy thông tin khách hàng và điểm thành viên từ Customer Service (gRPC)
  let customer;
  try {
    customer = await getCustomer(uid);
  } catch (err) {
    const error = new Error(`Customer with uid ${uid} not found`);
    error.code = 'NOT_FOUND';
    throw error;
  }

  let discountRate = 0;
  try {
    const membership = await getMembership(customer.mid);
    discountRate = calculateDiscount(membership.score);
  } catch (err) {
    discountRate = 0;
  }

  // Step 2: Kiểm tra và trừ tồn kho sản phẩm từ Product Service (gRPC)
  let stockResult;
  try {
    stockResult = await checkAndDeductStock(items);
  } catch (err) {
    // If gRPC error detail contains Insufficient stock
    const msg = err.details || err.message;
    const error = new Error(msg);
    error.code = err.code === 9 ? 'FAILED_PRECONDITION' : 'ABORTED';
    throw error;
  }

  // Calculate order details & total amount
  let totalAmount = 0;
  const orderItemsData = items.map((item) => {
    const prod = stockResult.items.find((p) => Number(p.pid) === Number(item.pid));
    const unit_price = prod ? Number(prod.price) : 0;
    const itemTotal = unit_price * Number(item.qty);
    totalAmount += itemTotal;
    return {
      pid: Number(item.pid),
      qty: Number(item.qty),
      unit_price: unit_price,
    };
  });

  const finalAmount = totalAmount * (1 - discountRate / 100);

  // Step 3: Transactional Outbox Pattern trong PostgreSQL Transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert Order
    const orderRes = await client.query(
      'INSERT INTO orders (uid, discount, total_amount) VALUES ($1, $2, $3) RETURNING oid, created_at',
      [uid, discountRate, finalAmount]
    );
    const oid = orderRes.rows[0].oid;

    // Insert OrderDetails
    for (const item of orderItemsData) {
      await client.query(
        'INSERT INTO order_details (oid, pid, qty, unit_price) VALUES ($1, $2, $3, $4)',
        [oid, item.pid, item.qty, item.unit_price]
      );
    }

    // Insert OutboxEvent (OrderCreated)
    const outboxPayload = {
      oid,
      uid,
      discount: discountRate,
      total_amount: finalAmount,
      items: orderItemsData,
      createdAt: orderRes.rows[0].created_at,
    };

    await client.query(
      `INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload, status)
       VALUES ('Order', $1, 'OrderCreated', $2, 'PENDING')`,
      [String(oid), JSON.stringify(outboxPayload)]
    );

    await client.query('COMMIT');

    return {
      oid,
      uid,
      discount: discountRate,
      total_amount: finalAmount,
      items: orderItemsData,
      shipment: {
        shipid: 5000 + oid, // ID tạm thời hoặc theo mapping
        status: 'PENDING',
      },
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getOrdersByUid({ uid }) {
  const result = await pool.query(
    'SELECT oid, uid, discount, total_amount, created_at FROM orders WHERE uid = $1 ORDER BY oid DESC',
    [uid]
  );
  return {
    items: result.rows.map((row) => ({
      oid: row.oid,
      uid: row.uid,
      discount: parseFloat(row.discount),
      total_amount: parseFloat(row.total_amount),
      created_at: row.created_at.toISOString(),
    })),
  };
}

export async function getOrderById({ oid, uid, role }) {
  const orderRes = await pool.query(
    'SELECT oid, uid, discount, total_amount, created_at FROM orders WHERE oid = $1',
    [oid]
  );

  if (orderRes.rows.length === 0) {
    const error = new Error(`Order with oid ${oid} not found`);
    error.code = 'NOT_FOUND';
    throw error;
  }

  const order = orderRes.rows[0];

  // RBAC: Customer can only view their own order
  if (role !== 'Admin' && order.uid !== Number(uid)) {
    const error = new Error('Forbidden: You can only view your own orders');
    error.code = 'PERMISSION_DENIED';
    throw error;
  }

  const detailsRes = await pool.query(
    'SELECT pid, qty, unit_price FROM order_details WHERE oid = $1',
    [oid]
  );

  return {
    oid: order.oid,
    uid: order.uid,
    discount: parseFloat(order.discount),
    total_amount: parseFloat(order.total_amount),
    items: detailsRes.rows.map((d) => ({
      pid: d.pid,
      qty: d.qty,
      unit_price: parseFloat(d.unit_price),
    })),
    created_at: order.created_at.toISOString(),
  };
}
