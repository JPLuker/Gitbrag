(function attachStatsPeriod(root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.GitbragStatsPeriod = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createStatsPeriodApi() {
  'use strict';

  const ROLLING = Object.freeze({
    day: Object.freeze({ days: 1, label: 'Last 24 hours' }),
    week: Object.freeze({ days: 7, label: 'Last 7 days' }),
    month: Object.freeze({ days: 30, label: 'Last 30 days' }),
    twomonths: Object.freeze({ days: 60, label: 'Last 60 days' }),
    sixmonths: Object.freeze({ days: 182, label: 'Last 6 months' }),
    year: Object.freeze({ days: 365, label: 'Last year' }),
    lifetime: Object.freeze({ days: null, label: 'All time' }),
  });

  const DEFAULT_PERIOD = 'month';
  const MONTHS = Object.freeze([
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]);
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
    if (monthMatch) {
      return { type: 'calendar-month', value, year: Number(monthMatch[1]), month: Number(monthMatch[2]) };
    }

    const yearMatch = CALENDAR_YEAR_PATTERN.exec(String(value || ''));
    if (yearMatch) {
      return { type: 'calendar-year', value, year: Number(yearMatch[1]) };
    }

    return null;
  }

  function isValid(value) {
    return Boolean(parse(value));
  }

  function isDated(value) {
    const parsed = parse(value);
    return parsed?.type === 'calendar-month' || parsed?.type === 'calendar-year';
  }

  function normalize(value, fallback = DEFAULT_PERIOD) {
    return isValid(value) ? value : (isValid(fallback) ? fallback : DEFAULT_PERIOD);
  }

  function monthEndKey(year, month) {
    return dateKeyFromDate(new Date(Date.UTC(year, month, 0)));
  }

  function minKey(a, b) {
    return a <= b ? a : b;
  }

  function range(value, now = new Date()) {
    const normalized = normalize(value);
    const parsed = parse(normalized);
    const today = todayKey(now);

    if (parsed.type === 'rolling') {
      const setting = ROLLING[normalized];
      if (!setting.days) {
        return { value: normalized, type: 'lifetime', start: null, end: today, label: setting.label, partial: false };
      }
      return {
        value: normalized,
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
      const end = minKey(naturalEnd, today);
      const current = parsed.year === now.getUTCFullYear() && parsed.month === now.getUTCMonth() + 1;
      const partial = current && today < naturalEnd;
      return {
        value: normalized,
        type: parsed.type,
        start,
        end,
        label: `${MONTHS[parsed.month - 1]} ${parsed.year}${partial ? ' · Month to date' : ''}`,
        partial,
      };
    }

    const start = `${String(parsed.year).padStart(4, '0')}-01-01`;
    const naturalEnd = `${String(parsed.year).padStart(4, '0')}-12-31`;
    const end = minKey(naturalEnd, today);
    const current = parsed.year === now.getUTCFullYear();
    const partial = current && today < naturalEnd;
    return {
      value: normalized,
      type: parsed.type,
      start,
      end,
      label: `${parsed.year}${partial ? ' · Year to date' : ''}`,
      partial,
    };
  }

  function label(value, now = new Date()) {
    return range(value, now).label;
  }

  function filterRecords(records, value, now = new Date()) {
    if (!Array.isArray(records)) return [];
    const selection = range(value, now);
    if (selection.type === 'lifetime') return [...records];
    if (!selection.start || !selection.end || selection.start > selection.end) return [];
    return records.filter((record) => record?.date >= selection.start && record.date <= selection.end);
  }

  function safeCreatedAt(createdAt, now) {
    const created = new Date(createdAt);
    if (Number.isNaN(created.getTime()) || created > now) {
      return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    }
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
        months.push({ value, label: label(value, now) });
      }
      const yearValue = valueForYear(year);
      years.push({ value: yearValue, label: label(yearValue, now) });
    }

    return { months, years };
  }

  return Object.freeze({
    ROLLING,
    DEFAULT_PERIOD,
    MONTHS,
    parse,
    isValid,
    isDated,
    normalize,
    range,
    label,
    filterRecords,
    datedOptions,
    valueForMonth,
    valueForYear,
    currentMonthValue,
    currentYearValue,
  });
});
