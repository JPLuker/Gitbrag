'use strict';

const assert = require('node:assert/strict');
const StatsPeriod = require('../stats-period.js');

const now = new Date('2026-09-11T12:00:00Z');

assert.equal(StatsPeriod.label('month', now), 'Last 30 days');
assert.equal(StatsPeriod.currentMonthValue(now), 'calendar-month:2026-09');
assert.equal(StatsPeriod.currentYearValue(now), 'calendar-year:2026');
assert.deepEqual(StatsPeriod.range('twomonths', now), {
  value: 'twomonths',
  type: 'rolling',
  start: '2026-07-14',
  end: '2026-09-11',
  label: 'Last 60 days',
  partial: false,
});

assert.deepEqual(StatsPeriod.range('month', now), {
  value: 'month',
  type: 'rolling',
  start: '2026-08-13',
  end: '2026-09-11',
  label: 'Last 30 days',
  partial: false,
});

assert.deepEqual(StatsPeriod.range('calendar-month:2026-08', now), {
  value: 'calendar-month:2026-08',
  type: 'calendar-month',
  start: '2026-08-01',
  end: '2026-08-31',
  label: 'August 2026',
  partial: false,
});

assert.deepEqual(StatsPeriod.range('calendar-month:2026-09', now), {
  value: 'calendar-month:2026-09',
  type: 'calendar-month',
  start: '2026-09-01',
  end: '2026-09-11',
  label: 'September 2026 · Month to date',
  partial: true,
});

assert.deepEqual(StatsPeriod.range('calendar-year:2025', now), {
  value: 'calendar-year:2025',
  type: 'calendar-year',
  start: '2025-01-01',
  end: '2025-12-31',
  label: '2025',
  partial: false,
});

assert.deepEqual(StatsPeriod.range('calendar-year:2026', now), {
  value: 'calendar-year:2026',
  type: 'calendar-year',
  start: '2026-01-01',
  end: '2026-09-11',
  label: '2026 · Year to date',
  partial: true,
});

const records = [
  { date: '2026-08-31', count: 3 },
  { date: '2026-09-01', count: 1 },
  { date: '2026-09-11', count: 4 },
  { date: '2026-09-12', count: 8 },
];
assert.deepEqual(
  StatsPeriod.filterRecords(records, 'calendar-month:2026-09', now).map((record) => record.date),
  ['2026-09-01', '2026-09-11'],
);

const options = StatsPeriod.datedOptions('2025-11-20T00:00:00Z', now);
assert.equal(options.months[0].value, 'calendar-month:2026-09');
assert.equal(options.months.at(-1).value, 'calendar-month:2025-11');
assert.deepEqual(options.years.map((option) => option.value), ['calendar-year:2026', 'calendar-year:2025']);

assert.equal(StatsPeriod.isDated('calendar-month:2026-08'), true);
assert.equal(StatsPeriod.isDated('calendar-year:2026'), true);
assert.equal(StatsPeriod.isDated('month'), false);
assert.equal(StatsPeriod.normalize('garbage'), 'month');
assert.equal(StatsPeriod.valueForMonth(2026, 13), null);
assert.equal(StatsPeriod.valueForYear(1969), null);

console.log('stats-period tests passed');
