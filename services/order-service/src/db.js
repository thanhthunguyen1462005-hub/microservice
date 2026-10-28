import pkg from 'pg';
const { Pool } = pkg;

const connectionString = process.env.DB_URL;

if (!connectionString) {
  throw new Error('DB_URL is required');
}

const pool = new Pool({ connectionString });

pool.on('error', (err) => {
  console.error('Unexpected error on idle client for order_db', err);
});

export default pool;
