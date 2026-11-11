import { readFile } from 'node:fs/promises';
import { pool } from '../src/db.js';

try {
  const schema = await readFile(new URL('../../database/schema.sql', import.meta.url), 'utf8');
  await pool.query(schema);
  console.log('Database tables are ready.');
} catch (error) {
  console.error(`Database setup failed: ${error.message || error.code || 'Could not connect to PostgreSQL.'}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
