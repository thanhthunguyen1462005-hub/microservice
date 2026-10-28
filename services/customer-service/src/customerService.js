import pool from './db.js';

export async function getCustomer({ uid }) {
  const result = await pool.query(
    'SELECT uid, fullname, mid FROM customers WHERE uid = $1',
    [uid]
  );
  if (result.rows.length === 0) {
    const error = new Error(`Customer with uid ${uid} not found`);
    error.code = 'NOT_FOUND';
    throw error;
  }
  return result.rows[0];
}

export async function updateCustomer({ uid, fullname, mid }) {
  const existing = await pool.query('SELECT uid, fullname, mid FROM customers WHERE uid = $1', [uid]);
  if (existing.rows.length === 0) {
    const defaultMid = (mid && Number(mid) > 0) ? Number(mid) : 1;
    const result = await pool.query(
      'INSERT INTO customers (uid, fullname, mid) VALUES ($1, $2, $3) RETURNING uid, fullname, mid',
      [uid, fullname || 'User ' + uid, defaultMid]
    );
    return result.rows[0];
  }

  const current = existing.rows[0];
  const newFullname = (fullname && fullname.trim()) ? fullname.trim() : current.fullname;
  const newMid = (mid && Number(mid) > 0) ? Number(mid) : current.mid;

  const result = await pool.query(
    'UPDATE customers SET fullname = $1, mid = $2 WHERE uid = $3 RETURNING uid, fullname, mid',
    [newFullname, newMid, uid]
  );
  return result.rows[0];
}

export async function getMembership({ mid }) {
  const result = await pool.query(
    'SELECT mid, mname, score FROM memberships WHERE mid = $1',
    [mid]
  );
  if (result.rows.length === 0) {
    const error = new Error(`Membership with mid ${mid} not found`);
    error.code = 'NOT_FOUND';
    throw error;
  }
  return result.rows[0];
}
