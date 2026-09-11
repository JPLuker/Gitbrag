(function attachGitbragExtensionStats(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GitbragExtensionStats = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createStatsApi() {
  'use strict';

  const MONTHS = Object.freeze([
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]);

  const ROLLING = Object.freeze({
    day: Object.freeze({ days: 1, label: 'Last 24 hours', short: '24H' }),
    week: Object.freeze({ days: 7, label: 'Last 7 days', short: '7D' }),
    month: Object.freeze({ days: 30, label: 'Last 30 days', short: '30D' }),
    twomonths: Object.freeze({ days: 60, label: 'Last 60 days', short: '60D' }),
    sixmonths: Object.freeze({ days: 182, label: 'Last 6 months', short: '6M' }),
    year: Object.freeze({ days: 365, label: 'Last year', short: '1Y' }),
    lifetime: Object.freeze({ days: null, label: 'All time', short: 'ALL' }),
  });

  const PREFERENCE_VALUES = Object.freeze(['current-month', ...Object.keys(ROLLING)]);
  const CALENDAR_MONTH_PATTERN = /^calendar-month:(\d{4})-(0[1-9]|1[0-2])$/;
  const CALENDAR_YEAR_PATTERN = /^calendar-year:(\d{4})$/;

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

  function valueForMonth(year, month) {
    const y = Number(year);
    const m = Number(month);
    if (!Number.isInteger(y) || y < 1970 || y > 9999 || !Number.isInteger(m) || m < 1 || m > 12) return null;
    return `calendar-month:${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}`;
  }

  function valueForYear(year) {
    const y = Number(year);
    if (!Number.isInteger(y) || y < 1970 || y > 9999) return null;
    return `calendar-year:${String(y).padStart(4, '0')}`;
  }

  function currentMonthValue(now = new Date()) {
    return valueForMonth(now.getUTCFullYear(), now.getUTCMonth() + 1);
  }

  function currentYearValue(now = new Date()) {
    return valueForYear(now.getUTCFullYear());
  }

  function parse(value) {
    if (ROLLING[value]) return { type: 'rolling', value };
    const monthMatch = CALENDAR_MONTH_PATTERN.exec(String(value || ''));
    if (monthMatch) return { type: 'calendar-month', value, year: Number(monthMatch[1]), month: Number(monthMatch[2]) };
    const yearMatch = CALENDAR_YEAR_PATTERN.exec(String(value || ''));
    if (yearMatch) return { type: 'calendar-year', value, year: Number(yearMatch[1]) };
    return null;
  }

  function isValid(value) {
    return Boolean(parse(value));
  }

  function isPreference(value) {
    return PREFERENCE_VALUES.includes(value);
  }

  function resolvePreference(value, now = new Date()) {
    if (value === 'current-month') return currentMonthValue(now);
    return ROLLING[value] ? value : currentMonthValue(now);
  }

  function monthEndKey(year, month) {
    return dateKeyFromDate(new Date(Date.UTC(year, month, 0)));
  }

  function range(value, now = new Date(), records = null) {
    const parsed = parse(value) || parse(currentMonthValue(now));
    const today = todayKey(now);

    if (parsed.type === 'rolling') {
      const setting = ROLLING[parsed.value];
      if (!setting.days) {
        const first = Array.isArray(records)
          ? records.map((item) => item?.date).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(String(date))).sort()[0]
          : null;
        return { value: parsed.value, type: 'lifetime', start: first || null, end: today, label: setting.label, partial: false };
      }
      return {
        value: parsed.value,
        type: 'rolling',
        start: addDays(today, -setting.days + 1),
        end: today,
        label: setting.label,
        partial: false,
      };
    }

    if (parsed.type === 'calendar-month') {
      const start = `${String(parsed.year).padStart(4, '0')}-${String(parsed.month).padStart(2, '0')}-01`;
      const naturalEnd = monthEndKey(parsed.year, parsed.month);
      const end = naturalEnd < today ? naturalEnd : today;
      const current = parsed.year === now.getUTCFullYear() && parsed.month === now.getUTCMonth() + 1;
      return {
        value: parsed.value,
        type: parsed.type,
        start,
        end,
        label: `${MONTHS[parsed.month - 1]} ${parsed.year}`,
        partial: current && today < naturalEnd,
      };
    }

    const start = `${String(parsed.year).padStart(4, '0')}-01-01`;
    const naturalEnd = `${String(parsed.year).padStart(4, '0')}-12-31`;
    const end = naturalEnd < today ? naturalEnd : today;
    const current = parsed.year === now.getUTCFullYear();
    return {
      value: parsed.value,
      type: parsed.type,
      start,
      end,
      label: String(parsed.year),
      partial: current && today < naturalEnd,
    };
  }

  function label(value, now = new Date(), records = null) {
    return range(value, now, records).label;
  }

  function recordsForPeriod(records, value, now = new Date()) {
    if (!Array.isArray(records)) return null;
    const selection = range(value, now, records);
    if (!selection.start || !selection.end || selection.start > selection.end) return [];
    return records
      .filter((record) => typeof record?.date === 'string' && record.date >= selection.start && record.date <= selection.end)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  function summarize(records, value, now = new Date()) {
    const scoped = recordsForPeriod(records, value, now);
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
      const contiguous = previousDate && addDays(previousDate, 1) === record.date;
      run = count > 0 ? (contiguous ? run + 1 : 1) : 0;
      if (count > 0) activeDays += 1;
      bestDay = Math.max(bestDay, count);
      longestStreak = Math.max(longestStreak, run);
      previousDate = record.date;
    }

    return { contributions, activeDays, bestDay, longestStreak };
  }

  function calendar(records, value, now = new Date()) {
    if (!Array.isArray(records)) return null;
    const selection = range(value, now, records);
    if (!selection.end) return null;
    let exactStart = selection.start;
    if (!exactStart) exactStart = records.map((item) => item?.date).filter(Boolean).sort()[0] || selection.end;
    if (exactStart > selection.end) return { days: [], weeks: 0, total: 0, label: selection.label };

    const source = new Map(records.map((item) => [item.date, item]));
    const first = dateFromKey(exactStart);
    first.setUTCDate(first.getUTCDate() - first.getUTCDay());

    const days = [];
    let total = 0;
    for (let key = dateKeyFromDate(first); key <= selection.end; key = addDays(key, 1)) {
      const item = source.get(key) || { count: 0, level: 0 };
      const count = Math.max(0, Number(item.count) || 0);
      if (key >= exactStart) total += count;
      days.push({
        date: key,
        count,
        level: Math.min(4, Math.max(0, Number(item.level) || 0)),
      });
    }

    return { days, weeks: Math.max(1, Math.ceil(days.length / 7)), total, label: selection.label };
  }

  function safeCreatedAt(createdAt, now) {
    const created = new Date(createdAt);
    if (Number.isNaN(created.getTime()) || created > now) return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    return created;
  }

  function datedOptions(createdAt, now = new Date()) {
    const created = safeCreatedAt(createdAt, now);
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth() + 1;
    const startYear = Math.max(1970, created.getUTCFullYear());
    const startMonth = created.getUTCMonth() + 1;
    const months = [];
    const years = [];

    for (let year = currentYear; year >= startYear; year -= 1) {
      const minMonth = year === startYear ? startMonth : 1;
      const maxMonth = year === currentYear ? currentMonth : 12;
      for (let month = maxMonth; month >= minMonth; month -= 1) {
        const value = valueForMonth(year, month);
        months.push({ value, label: `${MONTHS[month - 1]} ${year}`, year, month });
      }
      years.push({ value: valueForYear(year), label: String(year), year });
    }

    return { months, years };
  }

  function stepMonth(value, delta, createdAt, now = new Date()) {
    const parsed = parse(value);
    if (parsed?.type !== 'calendar-month') return null;
    const options = datedOptions(createdAt, now).months;
    const index = options.findIndex((item) => item.value === value);
    if (index < 0) return null;
    const nextIndex = index - Number(delta || 0);
    return options[nextIndex]?.value || null;
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

  return Object.freeze({
    MONTHS,
    ROLLING,
    PREFERENCE_VALUES,
    parse,
    isValid,
    isPreference,
    resolvePreference,
    valueForMonth,
    valueForYear,
    currentMonthValue,
    currentYearValue,
    range,
    label,
    recordsForPeriod,
    summarize,
    calendar,
    datedOptions,
    stepMonth,
    accountAge,
  });
});
