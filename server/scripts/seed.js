import bcrypt from 'bcrypt';
import { pool } from '../src/db.js';
import { today } from '../src/reading-validation.js';
import { reportRanges } from '../src/report-ranges.js';

const email = 'demo@sweety.example';
const password = 'SweetyDemo123!';
const client = await pool.connect();
try {
  const date = today();
  const ranges = reportRanges(date);
  const hash = await bcrypt.hash(password, 12);
  await client.query('BEGIN');
  const { rows } = await client.query(`INSERT INTO users(name,email,password_hash)
    VALUES ('Demo Patient',$1,$2) ON CONFLICT(email)
    DO UPDATE SET password_hash=EXCLUDED.password_hash RETURNING id`, [email, hash]);
  const userId = rows[0].id;
  const samples = [
    [ranges.monthly.start, 'morning', 110],
    [ranges.monthly.end, 'after_lunch', 155],
    [ranges.monthToDate.start, 'morning', 100],
    [date, 'morning', 105],
    [date, 'after_breakfast', 145],
    [date, 'after_lunch', 138]
  ];
  for (const [day, slot, value] of samples) {
    await client.query(`INSERT INTO readings(user_id,date,slot,value) VALUES($1,$2,$3,$4)
      ON CONFLICT(user_id,date,slot) DO UPDATE SET value=EXCLUDED.value`, [userId, day, slot, value]);
  }
  await client.query('COMMIT');
  console.log(`Demo ready: ${email} / ${password}. Selected date: ${date}`);
} catch (error) {
  await client.query('ROLLBACK');
  console.error('Seed failed:', error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
