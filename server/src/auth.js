import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import { pool } from './db.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must contain at least 32 characters.');
}
const options = { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/' };
export const auth = Router();
auth.use(cookieParser());
auth.use((req, res, next) => {
  if (req.method !== 'GET' && req.get('origin') && req.get('origin') !== process.env.APP_ORIGIN) {
    return res.status(403).json({ message: 'Request origin is not allowed.' });
  }
  next();
});
function session(res, user) {
  const token = jwt.sign({}, process.env.JWT_SECRET, { subject: String(user.id), expiresIn: '1d', algorithm: 'HS256' });
  res.cookie('session', token, { ...options, maxAge: 86400000 });
  return res.json({ user });
}
export async function requireUser(req, res, next) {
  try {
    const payload = jwt.verify(req.cookies?.session, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    const { rows } = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [payload.sub]);
    if (!rows[0]) return res.status(401).json({ message: 'Please log in.' });
    req.user = rows[0];
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) return res.status(401).json({ message: 'Please log in.' });
    next(error);
  }
}
auth.post('/register', async (req, res, next) => {
  const { name, email, password } = req.body || {};
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) return res.status(400).json({ message: 'Enter a name of 1–100 characters.' });
  if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return res.status(400).json({ message: 'Enter a valid email address.' });
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72) return res.status(400).json({ message: 'Password must be at least 8 characters and at most 72 bytes.' });
  try {
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query('INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email', [name.trim(), email.trim().toLowerCase(), hash]);
    res.status(201);
    session(res, rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'An account with this email already exists.' });
    next(error);
  }
});
auth.post('/login', async (req, res, next) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password || Buffer.byteLength(password) > 72) return res.status(400).json({ message: 'Enter your email and password.' });
  try {
    const { rows } = await pool.query('SELECT id, name, email, password_hash FROM users WHERE email = $1', [email.trim().toLowerCase()]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ message: 'Invalid email or password.' });
    session(res, { id: user.id, name: user.name, email: user.email });
  } catch (error) { next(error); }
});
auth.get('/me', requireUser, (req, res) => res.json({ user: req.user }));
auth.post('/logout', (req, res) => { res.clearCookie('session', options); res.json({ message: 'Logged out.' }); });
