(function attachGitbragExtensionStats(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GitbragExtensionStats = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createStatsApi() {
  'use strict';

  const PERIODS = Object.freeze({
    week: Object.freeze({ days: 7, label: '7D' }),
    month: Object.freeze({ days: 30, label: '1M' }),
    sixmonths: Object.freeze({ days: 182, label: '6M' }),
    year: Object.freeze({ days: 365, label: '1Y' }),
  });

  function dateKeyFromDate(date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }

  function dateFromKey(key) {
    const [year, month, day] = String(key).split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  function addDays(key, days) {
    const date = dateFromKey(key);
    date.setUTCDate(date.getUTCDate() + days);
    return dateKeyFromDate(date);
  }

  function todayKey(now = new Date()) {
    return dateKeyFromDate(now);
  }

  function recordsForPeriod(records, period, now = new Date()) {
    if (!Array.isArray(records)) return null;
    const setting = PERIODS[period] || PERIODS.week;
    const end = todayKey(now);
    const start = addDays(end, -setting.days + 1);
    return records
      .filter((record) => typeof record?.date === 'string' && record.date >= start && record.date <= end)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  function summarize(records, period, now = new Date()) {
    const scoped = recordsForPeriod(records, period, now);
    if (!scoped) return null;

    let contributions = 0;
    let activeDays = 0;
    let bestDay = 0;
    let longestStreak = 0;
    let run = 0;
    let previousDate = null;

    for (const record of scoped) {
      const count = Math.max(0, Number(record.count) || 0);
      contributions += count;
      if (count > 0) {
        activeDays += 1;
        const contiguous = previousDate && addDays(previousDate, 1) === record.date;
        run = contiguous ? run + 1 : 1;
        longestStreak = Math.max(longestStreak, run);
      } else {
        run = 0;
      }
      bestDay = Math.max(bestDay, count);
      previousDate = record.date;
    }

    return { contributions, activeDays, bestDay, longestStreak };
  }

  function accountAge(createdAt, now = new Date()) {
    const created = new Date(createdAt);
    if (Number.isNaN(created.getTime())) return '—';

    let months = (now.getUTCFullYear() - created.getUTCFullYear()) * 12;
    months += now.getUTCMonth() - created.getUTCMonth();
    if (now.getUTCDate() < created.getUTCDate()) months -= 1;
    months = Math.max(0, months);

    if (months < 1) return '<1 mo';
    if (months < 12) return `${months} mo`;
    const years = Math.floor(months / 12);
    const remainder = months % 12;
    return remainder ? `${years}y ${remainder}m` : `${years}y`;
  }

  return Object.freeze({ PERIODS, recordsForPeriod, summarize, accountAge });
});
