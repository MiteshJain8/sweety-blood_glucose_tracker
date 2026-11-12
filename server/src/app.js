import express from 'express';
import { auth } from './auth.js';
import { pool } from './db.js';

export const app = express();
app.use(express.json());
app.use('/api/auth', auth);

app.get('/api/health', async (req, res, next) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    next(error);
  }
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

app.use((error, req, res, next) => {
  console.error(error.message);
  res.status(error.status || 500).json({
    message: error.status === 400 ? 'Invalid JSON request.' : 'Something went wrong. Please try again.'
  });
});
