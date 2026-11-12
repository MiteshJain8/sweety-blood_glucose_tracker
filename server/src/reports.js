import { Router } from 'express';
import cookieParser from 'cookie-parser';
import { requireUser } from './auth.js';
import { pool } from './db.js';
import { dateError } from './reading-validation.js';
import { reportRanges } from './report-ranges.js';

export const reports = Router();
reports.use(cookieParser(), requireUser);
reports.get('/', async (req, res, next) => {
  const error = dateError(req.query.date);
  if (error) return res.status(400).json({ message: error });
  const ranges = reportRanges(req.query.date);
  try {
    const { rows } = await pool.query(`
      WITH ranges(kind, start_date, end_date) AS (
        VALUES ('daily', $2::date, $2::date),
               ('monthToDate', $3::date, $2::date),
               ('monthly', $4::date, $5::date)
      )
      SELECT ranges.kind, count(r.id)::int AS count,
             min(r.value) AS minimum, max(r.value) AS maximum,
             round(avg(r.value), 1)::float8 AS average
      FROM ranges LEFT JOIN readings r
        ON r.user_id=$1 AND r.date BETWEEN ranges.start_date AND ranges.end_date
      GROUP BY ranges.kind`, [req.user.id, req.query.date, ranges.monthToDate.start, ranges.monthly.start, ranges.monthly.end]);
    const result = {};
    for (const row of rows) {
      const { kind, ...summary } = row;
      result[kind] = { ...ranges[kind], ...summary };
    }
    res.json(result);
  } catch (error) { next(error); }
});
