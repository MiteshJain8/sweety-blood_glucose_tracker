import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reportRanges } from '../src/report-ranges.js';
test('report boundaries include selected day and whole previous month', () => {
  assert.deepEqual(reportRanges('2026-10-15'), {
    daily: { start: '2026-10-15', end: '2026-10-15' },
    monthToDate: { start: '2026-10-01', end: '2026-10-15' },
    monthly: { start: '2026-09-01', end: '2026-09-30' }
  });
  assert.deepEqual(reportRanges('2024-03-01').monthly, { start: '2024-02-01', end: '2024-02-29' });
  assert.equal(reportRanges('2023-03-31').monthly.end, '2023-02-28');
  assert.deepEqual(reportRanges('2026-01-01').monthly, { start: '2025-12-01', end: '2025-12-31' });
});
