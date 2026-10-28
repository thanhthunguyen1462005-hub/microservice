import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DB_URL || 'postgres://postgres:postgrespassword@localhost:5432/auth_db',
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client for auth_db', err);
});

export default pool;
