import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import 'dotenv/config';

if (!process.env.TEST_DATABASE_URL || process.env.TEST_DATABASE_URL === process.env.DATABASE_URL) {
  throw new Error('Set TEST_DATABASE_URL to a separate disposable test database.');
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const { app } = await import('../src/app.js');
const { pool } = await import('../src/db.js');

test('registration, session, login validation and logout', async () => {
  await pool.query(await readFile(new URL('../../database/schema.sql', import.meta.url), 'utf8'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const email = `auth-${Date.now()}@example.com`;
  const base = `http://127.0.0.1:${server.address().port}/api/auth`;
  async function call(path, body, cookie) {
    return fetch(base + path, { method: body ? 'POST' : 'GET', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  }
  try {
    assert.equal((await call('/me')).status, 401);
    assert.equal((await call('/register', { name: 'Test', email, password: 'short' })).status, 400);
    const registered = await call('/register', { name: ' Test ', email: email.toUpperCase(), password: 'password123' });
    assert.equal(registered.status, 201);
    const cookie = registered.headers.get('set-cookie').split(';')[0];
    assert.match(registered.headers.get('set-cookie'), /HttpOnly/i);
    assert.match(registered.headers.get('set-cookie'), /SameSite=Strict/i);
    const { user } = await registered.json();
    assert.equal(user.email, email);
    assert.equal(user.password_hash, undefined);
    const stored = await pool.query('SELECT password_hash FROM users WHERE email=$1', [email]);
    assert.notEqual(stored.rows[0].password_hash, 'password123');
    assert.equal((await call('/me', null, cookie)).status, 200);
    assert.equal((await call('/me', null, 'session=invalid')).status, 401);
    assert.equal((await call('/register', { name: 'Other', email, password: 'password123' })).status, 409);
    assert.equal((await call('/login', { email, password: 'wrong' })).status, 401);
    assert.equal((await call('/login', { email, password: 'password123' })).status, 200);
    const logout = await call('/logout', {}, cookie);
    assert.match(logout.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/i);
    const blocked = await fetch(base + '/logout', { method: 'POST', headers: { Origin: 'https://other.example' } });
    assert.equal(blocked.status, 403);
  } finally {
    await pool.query('DELETE FROM users WHERE email=$1', [email]);
    await new Promise(resolve => server.close(resolve));
    await pool.end();
  }
});
