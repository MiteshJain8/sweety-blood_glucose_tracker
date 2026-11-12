import { Router } from 'express';
import cookieParser from 'cookie-parser';
import { requireUser } from './auth.js';
import { pool } from './db.js';
import { slots, dateError, readingError } from './reading-validation.js';

export const readings = Router();
readings.use(cookieParser(), requireUser);
readings.use((req, res, next) => {
  if (req.method !== 'GET' && req.get('origin') && req.get('origin') !== process.env.APP_ORIGIN) return res.status(403).json({ message: 'Request origin is not allowed.' });
  next();
});
const fields = 'id, date::text, slot, value';
readings.get('/', async (req, res, next) => {
  const error = dateError(req.query.date);
  if (error) return res.status(400).json({ message: error });
  try {
    const { rows } = await pool.query(`SELECT ${fields} FROM readings WHERE user_id=$1 AND date=$2 ORDER BY CASE slot WHEN 'morning' THEN 1 WHEN 'after_breakfast' THEN 2 WHEN 'after_lunch' THEN 3 ELSE 4 END`, [req.user.id, req.query.date]);
    res.json({ readings: rows });
  } catch (error) { next(error); }
});
for (const method of ['post', 'put']) {
  readings[method](method === 'post' ? '/' : '/:id', async (req, res, next) => {
    const body = req.body || {};
    const error = readingError(body);
    if (error) return res.status(400).json({ message: error });
    if (method === 'put' && !/^[1-9]\d{0,9}$/.test(req.params.id)) return res.status(404).json({ message: 'Reading not found.' });
    try {
      const args = [req.user.id, body.date, body.slot, body.value];
      let result;
      if (method === 'put') {
        args.push(req.params.id);
        result = await pool.query(`UPDATE readings SET date=$2, slot=$3, value=$4 WHERE user_id=$1 AND id=$5 RETURNING ${fields}`, args);
      } else {
        const count = await pool.query('SELECT count(*)::int AS count FROM readings WHERE user_id=$1 AND date=$2', args.slice(0, 2));
        if (count.rows[0].count >= 4) return res.status(409).json({ message: 'You can add only 4 readings per day.' });
        result = await pool.query(`INSERT INTO readings (user_id,date,slot,value) VALUES ($1,$2,$3,$4) RETURNING ${fields}`, args);
      }
      if (!result.rows[0]) return res.status(404).json({ message: 'Reading not found.' });
      res.status(method === 'post' ? 201 : 200).json({ reading: result.rows[0] });
    } catch (error) {
      if (error.code === '23505') return res.status(409).json({ message: `You already have an ${slots[body.slot]} reading for this date.` });
      next(error);
    }
  });
}
readings.delete('/:id', async (req, res, next) => {
  if (!/^[1-9]\d{0,9}$/.test(req.params.id)) return res.status(404).json({ message: 'Reading not found.' });
  try {
    const result = await pool.query('DELETE FROM readings WHERE id=$1 AND user_id=$2 RETURNING id', [req.params.id, req.user.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Reading not found.' });
    res.json({ message: 'Reading deleted.' });
  } catch (error) { next(error); }
});
