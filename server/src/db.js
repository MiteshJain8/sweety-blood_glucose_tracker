import 'dotenv/config';
import pg from 'pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required. Copy server/.env.example to server/.env.');
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000
});

pool.on('error', (error) => {
  console.error('Database connection error:', error.message || error.code);
});
