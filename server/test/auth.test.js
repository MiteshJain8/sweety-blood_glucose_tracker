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
    async function reading(path, method = 'GET', body, token = cookie) {
      return fetch(base.replace('/auth', '/readings') + path, { method, headers: { Cookie: token, ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    }
    const sample = { date: '2024-02-29', slot: 'morning', value: 40 };
    assert.equal((await reading('', 'POST', sample, '')).status, 401);
    const added = await reading('', 'POST', sample);
    assert.equal(added.status, 201);
    const { reading: saved } = await added.json();
    assert.equal((await reading('', 'POST', sample)).status, 409);
    assert.equal((await reading('/' + saved.id, 'PUT', { ...sample, value: 600 })).status, 200);
    for (const value of [39, 601, 40.5, '', null]) assert.equal((await reading('', 'POST', { ...sample, value })).status, 400);
    assert.equal((await reading('', 'POST', { ...sample, date: '2099-01-01' })).status, 400);
    const listed = await (await reading('?date=2024-02-29')).json();
    assert.equal(listed.readings.length, 1);
    assert.equal(listed.readings[0].value, 600);
    async function report(date, token = cookie) {
      return fetch(base.replace('/auth', '/reports') + '?date=' + date, { headers: { Cookie: token } });
    }
    assert.equal((await report('2024-02-29', '')).status, 401);
    assert.equal((await report('2023-02-29')).status, 400);
    for (const [date, value] of [['2024-02-01', 100], ['2024-02-28', 102], ['2024-01-01', 40], ['2024-01-31', 600], ['2024-03-01', 200]]) {
      await pool.query("INSERT INTO readings(user_id,date,slot,value) VALUES($1,$2,'morning',$3)", [user.id, date, value]);
    }
    const summary = await (await report('2024-02-29')).json();
    assert.deepEqual(summary.daily, { start: '2024-02-29', end: '2024-02-29', count: 1, minimum: 600, maximum: 600, average: 600 });
    assert.deepEqual(summary.monthToDate, { start: '2024-02-01', end: '2024-02-29', count: 3, minimum: 100, maximum: 600, average: 267.3 });
    assert.deepEqual(summary.monthly, { start: '2024-01-01', end: '2024-01-31', count: 2, minimum: 40, maximum: 600, average: 320 });
    const empty = await (await report('2022-01-01')).json();
    assert.equal(empty.daily.count, 0);
    assert.equal(empty.daily.average, null);
    assert.equal(empty.daily.minimum, null);
    assert.equal(empty.daily.maximum, null);
    const outsider = await pool.query("INSERT INTO users (name,email,password_hash) VALUES ('Other',$1,'unused') RETURNING id", ['other-' + email]);
    try {
      const jwt = (await import('jsonwebtoken')).default;
      const otherCookie = 'session=' + jwt.sign({}, process.env.JWT_SECRET, { subject: String(outsider.rows[0].id), expiresIn: '1h' });
      assert.equal((await (await report('2024-02-29', otherCookie)).json()).monthToDate.count, 0);
      assert.equal((await reading('/' + saved.id, 'PUT', sample, otherCookie)).status, 404);
      assert.equal((await reading('/' + saved.id, 'DELETE', null, otherCookie)).status, 404);
      assert.deepEqual((await (await reading('?date=2024-02-29', 'GET', null, otherCookie)).json()).readings, []);
    } finally { await pool.query('DELETE FROM users WHERE id=$1', [outsider.rows[0].id]); }
    for (const slot of ['after_breakfast', 'after_lunch', 'after_dinner']) assert.equal((await reading('', 'POST', { ...sample, slot })).status, 201);
    assert.equal((await reading('', 'POST', sample)).status, 409);
    assert.equal((await reading('/' + saved.id, 'DELETE')).status, 200);
    assert.equal((await reading('/' + saved.id, 'DELETE')).status, 404);
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
