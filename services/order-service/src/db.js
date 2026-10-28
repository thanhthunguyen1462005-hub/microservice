import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DB_URL || 'postgres://postgres:postgrespassword@localhost:5432/order_db',
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client for order_db', err);
});

export default pool;
