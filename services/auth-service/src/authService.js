import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_123';

export async function registerUser({ username, password, email, phone }) {
  if (!username || !password) {
    const error = new Error('Username and password are required');
    error.code = 'INVALID_ARGUMENT';
    throw error;
  }

  // Check duplicate username or email
  const existing = await pool.query(
    'SELECT uid, username, email FROM users WHERE username = $1 OR (email IS NOT NULL AND email = $2)',
    [username, email || null]
  );
  if (existing.rows.length > 0) {
    const error = new Error('Username or email already exists');
    error.code = 'ALREADY_EXISTS';
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  // Default roleid 2 = Customer
  const result = await pool.query(
    'INSERT INTO users (username, password, email, phone, roleid) VALUES ($1, $2, $3, $4, 2) RETURNING uid',
    [username, hashedPassword, email || null, phone || null]
  );

  return {
    uid: result.rows[0].uid,
    message: 'User registered successfully',
  };
}

export async function loginUser({ username, password }) {
  if (!username || !password) {
    const error = new Error('Username and password are required');
    error.code = 'INVALID_ARGUMENT';
    throw error;
  }

  const result = await pool.query(
    `SELECT u.uid, u.username, u.password, r.rolename as role 
     FROM users u 
     JOIN roles r ON u.roleid = r.roleid 
     WHERE u.username = $1`,
    [username]
  );

  if (result.rows.length === 0) {
    const error = new Error('Invalid username or password');
    error.code = 'UNAUTHENTICATED';
    throw error;
  }

  const user = result.rows[0];
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    const error = new Error('Invalid username or password');
    error.code = 'UNAUTHENTICATED';
    throw error;
  }

  const token = jwt.sign(
    { sub: user.uid, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  return {
    accessToken: token,
    tokenType: 'Bearer',
    expiresIn: 3600,
    uid: user.uid,
    role: user.role,
  };
}

export async function verifyToken({ token }) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return {
      isValid: true,
      uid: decoded.sub,
      username: decoded.username,
      role: decoded.role,
    };
  } catch (err) {
    return {
      isValid: false,
      uid: 0,
      username: '',
      role: '',
    };
  }
}
