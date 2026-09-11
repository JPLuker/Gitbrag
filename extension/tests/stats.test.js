'use strict';
const assert = require('node:assert/strict');
const Stats = require('../stats.js');

const now = new Date('2026-09-11T12:00:00Z');
const records = [];
for (let day = 1; day <= 11; day += 1) {
  records.push({ date: `2026-09-${String(day).padStart(2, '0')}`, count: day % 5, level: Math.min(4, day % 5) });
}
records.push({ date: '2026-08-31', count: 7, level: 4 });
records.push({ date: '2026-08-30', count: 1, level: 1 });
records.push({ date: '2026-07-20', count: 4, level: 3 });
records.push({ date: '2026-01-02', count: 2, level: 2 });

assert.equal(Stats.currentMonthValue(now), 'calendar-month:2026-09');
assert.equal(Stats.currentYearValue(now), 'calendar-year:2026');
assert.equal(Stats.resolvePreference('current-month', now), 'calendar-month:2026-09');
assert.equal(Stats.label('calendar-month:2026-08', now), 'August 2026');
assert.equal(Stats.range('calendar-month:2026-08', now).start, '2026-08-01');
assert.equal(Stats.range('calendar-month:2026-08', now).end, '2026-08-31');
assert.equal(Stats.range('calendar-year:2026', now).end, '2026-09-11');
assert.equal(Stats.range('twomonths', now).start, '2026-07-14');
assert.equal(Stats.isPreference('current-month'), true);
assert.equal(Stats.isPreference('calendar-month:2026-08'), false);

const september = Stats.summarize(records, 'calendar-month:2026-09', now);
assert.equal(september.contributions, records.filter((record) => record.date.startsWith('2026-09')).reduce((sum, record) => sum + record.count, 0));
assert.equal(september.activeDays, 9);
assert.equal(september.bestDay, 4);

const august = Stats.summarize(records, 'calendar-month:2026-08', now);
assert.deepEqual(august, { contributions: 8, activeDays: 2, bestDay: 7, longestStreak: 2 });

const calendar = Stats.calendar(records, 'calendar-month:2026-08', now);
assert.equal(calendar.total, 8);
assert.equal(calendar.days[0].date, '2026-07-26');
assert.equal(calendar.days.at(-1).date, '2026-08-31');

const options = Stats.datedOptions('2026-07-15T00:00:00Z', now);
assert.equal(options.months[0].value, 'calendar-month:2026-09');
assert.equal(options.months.at(-1).value, 'calendar-month:2026-07');
assert.equal(Stats.stepMonth('calendar-month:2026-09', -1, '2026-07-15T00:00:00Z', now), 'calendar-month:2026-08');
assert.equal(Stats.stepMonth('calendar-month:2026-08', 1, '2026-07-15T00:00:00Z', now), 'calendar-month:2026-09');
assert.equal(Stats.stepMonth('calendar-month:2026-09', 1, '2026-07-15T00:00:00Z', now), null);

assert.equal(Stats.accountAge('2025-09-09T00:00:00Z', new Date('2026-09-09T12:00:00Z')), '1y');
assert.equal(Stats.recordsForPeriod(null, 'week'), null);
console.log('extension stats parity tests passed');
