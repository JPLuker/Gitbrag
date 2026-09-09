'use strict';

const assert = require('node:assert/strict');
const Stats = require('../stats.js');

const records = [
  { date: '2026-09-03', count: 1 },
  { date: '2026-09-04', count: 2 },
  { date: '2026-09-05', count: 0 },
  { date: '2026-09-06', count: 4 },
  { date: '2026-09-07', count: 3 },
  { date: '2026-09-08', count: 1 },
  { date: '2026-09-09', count: 5 },
];

assert.deepEqual(Stats.summarize(records, 'week', new Date('2026-09-09T12:00:00Z')), {
  contributions: 16,
  activeDays: 6,
  bestDay: 5,
  longestStreak: 4,
});

assert.equal(Stats.accountAge('2025-09-09T00:00:00Z', new Date('2026-09-09T12:00:00Z')), '1y');
assert.equal(Stats.accountAge('2026-08-20T00:00:00Z', new Date('2026-09-09T12:00:00Z')), '<1 mo');
assert.equal(Stats.recordsForPeriod(null, 'week'), null);

console.log('extension stats tests passed');
