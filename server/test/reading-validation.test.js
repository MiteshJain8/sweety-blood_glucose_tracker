import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readingError, dateError } from '../src/reading-validation.js';
test('whole-number bounds, required values, slots and calendar dates', () => {
  const base = { date: '2024-02-29', slot: 'morning', value: 40 };
  for (const value of [40, 600]) assert.equal(readingError({ ...base, value }), undefined);
  for (const value of [39, 601, 40.5, '100', null, '', undefined]) assert.ok(readingError({ ...base, value }));
  for (const slot of ['bad', '__proto__', null]) assert.ok(readingError({ ...base, slot }));
  for (const date of ['2023-02-29', '2024-04-31', '2099-01-01', '', null]) assert.ok(dateError(date));
});
