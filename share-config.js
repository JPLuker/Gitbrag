(function attachShareConfig(root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.GitbragShareConfig = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createShareConfigApi() {
  'use strict';

  const CURRENT_VERSION = 2;
  const LEGACY_VERSION = 1;
  const MAX_SELECTED_REPOS = 4;
  const MAX_TOKEN_LENGTH = 8192;
  const BASE_STATS_PERIODS = Object.freeze(['day', 'week', 'month', 'sixmonths', 'year', 'lifetime', 'twomonths']);
  const CALENDAR_MONTH_PATTERN = /^calendar-month:(\d{4})-(0[1-9]|1[0-2])$/;
  const CALENDAR_YEAR_PATTERN = /^calendar-year:(\d{4})$/;

  const ALLOWED = Object.freeze({
    statsPeriod: BASE_STATS_PERIODS,
    calendarRange: Object.freeze(['1m', '3m', '6m', '1y', '2y', 'all']),
    textSize: Object.freeze(['compact', 'balanced', 'large', 'huge']),
    accent: Object.freeze(['auto', 'blue', 'white', 'cyan', 'purple', 'green']),
    cardStyle: Object.freeze(['solid', 'outline', 'glass'])
  });

  const DEFAULTS = Object.freeze({
    v: CURRENT_VERSION,
    modules: Object.freeze({
      profile: true,
      stats: true,
      calendar: true,
      repos: true
    }),
    statsPeriod: 'month',
    calendarRange: '6m',
    selectedRepos: Object.freeze([]),
    appearance: Object.freeze({
      textSize: 'balanced',
      accent: 'auto',
      cardStyle: 'solid'
    })
  });

  const MODULE_BITS = Object.freeze({ profile: 1, stats: 2, calendar: 4, repos: 8 });

  function copyDefaults() {
    return {
      v: CURRENT_VERSION,
      modules: { ...DEFAULTS.modules },
      statsPeriod: DEFAULTS.statsPeriod,
      calendarRange: DEFAULTS.calendarRange,
      selectedRepos: [],
      appearance: { ...DEFAULTS.appearance }
    };
  }

  function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function booleanOr(value, fallback) {
    return typeof value === 'boolean' ? value : fallback;
  }

  function enumOr(value, allowed, fallback) {
    return typeof value === 'string' && allowed.includes(value) ? value : fallback;
  }

  function isCalendarStatsPeriod(value) {
    if (typeof value !== 'string') return false;
    const monthMatch = CALENDAR_MONTH_PATTERN.exec(value);
    if (monthMatch) {
      const year = Number(monthMatch[1]);
      return year >= 1970 && year <= 9999;
    }
    const yearMatch = CALENDAR_YEAR_PATTERN.exec(value);
    if (yearMatch) {
      const year = Number(yearMatch[1]);
      return year >= 1970 && year <= 9999;
    }
    return false;
  }

  function isStatsPeriod(value) {
    return typeof value === 'string' && (BASE_STATS_PERIODS.includes(value) || isCalendarStatsPeriod(value));
  }

  function normalizeStatsPeriod(value, fallback = DEFAULTS.statsPeriod) {
    return isStatsPeriod(value) ? value : fallback;
  }

  function normalizeRepoIds(value) {
    if (!Array.isArray(value)) return [];

    const seen = new Set();
    const normalized = [];

    for (const item of value) {
      if (normalized.length >= MAX_SELECTED_REPOS) break;
      if (typeof item !== 'string' && typeof item !== 'number') continue;

      const id = String(item).trim();
      if (!id || id.length > 128 || seen.has(id)) continue;

      seen.add(id);
      normalized.push(id);
    }

    return normalized;
  }

  function normalize(input = {}) {
    const source = isPlainObject(input) ? input : {};
    const modules = isPlainObject(source.modules) ? source.modules : {};
    const appearance = isPlainObject(source.appearance) ? source.appearance : {};

    return {
      v: CURRENT_VERSION,
      modules: {
        profile: booleanOr(modules.profile, DEFAULTS.modules.profile),
        stats: booleanOr(modules.stats, DEFAULTS.modules.stats),
        calendar: booleanOr(modules.calendar, DEFAULTS.modules.calendar),
        repos: booleanOr(modules.repos, DEFAULTS.modules.repos)
      },
      statsPeriod: normalizeStatsPeriod(source.statsPeriod),
      calendarRange: enumOr(source.calendarRange, ALLOWED.calendarRange, DEFAULTS.calendarRange),
      selectedRepos: normalizeRepoIds(source.selectedRepos),
      appearance: {
        textSize: enumOr(appearance.textSize, ALLOWED.textSize, DEFAULTS.appearance.textSize),
        accent: enumOr(appearance.accent, ALLOWED.accent, DEFAULTS.appearance.accent),
        cardStyle: enumOr(appearance.cardStyle, ALLOWED.cardStyle, DEFAULTS.appearance.cardStyle)
      }
    };
  }

  function versionOf(input) {
    if (!isPlainObject(input)) return null;
    const version = Number(input.v);
    return Number.isInteger(version) ? version : null;
  }

  function assertSupportedVersionNumber(version) {
    if (version !== LEGACY_VERSION && version !== CURRENT_VERSION) {
      throw new Error(`Unsupported Gitbrag share config version: ${Number.isInteger(version) ? version : 'missing'}.`);
    }
  }

  function enumIndex(value, allowed, fallback) {
    const index = allowed.indexOf(value);
    if (index >= 0) return index;
    return Math.max(0, allowed.indexOf(fallback));
  }

  function compactEnumValue(allowed, index) {
    if (!Number.isInteger(index) || allowed[index] === undefined) {
      throw new Error('Invalid Gitbrag share config token.');
    }
    return allowed[index];
  }

  function compactStatsPeriod(value) {
    const index = BASE_STATS_PERIODS.indexOf(value);
    return index >= 0 ? index : value;
  }

  function expandStatsPeriod(value, version) {
    if (version === LEGACY_VERSION) return compactEnumValue(BASE_STATS_PERIODS, value);
    if (Number.isInteger(value)) return compactEnumValue(BASE_STATS_PERIODS, value);
    if (isCalendarStatsPeriod(value)) return value;
    throw new Error('Invalid Gitbrag share config token.');
  }

  function moduleMask(modules) {
    return Object.entries(MODULE_BITS).reduce(
      (mask, [key, bit]) => mask | (modules[key] ? bit : 0),
      0
    );
  }

  function compact(normalized) {
    return [
      CURRENT_VERSION,
      moduleMask(normalized.modules),
      compactStatsPeriod(normalized.statsPeriod),
      enumIndex(normalized.calendarRange, ALLOWED.calendarRange, DEFAULTS.calendarRange),
      normalized.selectedRepos,
      enumIndex(normalized.appearance.textSize, ALLOWED.textSize, DEFAULTS.appearance.textSize),
      enumIndex(normalized.appearance.accent, ALLOWED.accent, DEFAULTS.appearance.accent),
      enumIndex(normalized.appearance.cardStyle, ALLOWED.cardStyle, DEFAULTS.appearance.cardStyle)
    ];
  }

  function expandCompact(input) {
    if (!Array.isArray(input) || input.length !== 8) {
      throw new Error('Invalid Gitbrag share config token.');
    }

    const [version, mask, periodValue, calendarIndex, repoIds, textIndex, accentIndex, cardIndex] = input;
    assertSupportedVersionNumber(version);
    if (!Number.isInteger(mask) || mask < 0 || mask > 15 || !Array.isArray(repoIds)) {
      throw new Error('Invalid Gitbrag share config token.');
    }

    return normalize({
      v: CURRENT_VERSION,
      modules: {
        profile: Boolean(mask & MODULE_BITS.profile),
        stats: Boolean(mask & MODULE_BITS.stats),
        calendar: Boolean(mask & MODULE_BITS.calendar),
        repos: Boolean(mask & MODULE_BITS.repos)
      },
      statsPeriod: expandStatsPeriod(periodValue, version),
      calendarRange: compactEnumValue(ALLOWED.calendarRange, calendarIndex),
      selectedRepos: repoIds,
      appearance: {
        textSize: compactEnumValue(ALLOWED.textSize, textIndex),
        accent: compactEnumValue(ALLOWED.accent, accentIndex),
        cardStyle: compactEnumValue(ALLOWED.cardStyle, cardIndex)
      }
    });
  }

  function bytesToBase64Url(bytes) {
    let binary = '';
    for (let index = 0; index < bytes.length; index += 1) {
      binary += String.fromCharCode(bytes[index]);
    }

    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  function base64UrlToBytes(token) {
    if (typeof token !== 'string' || !token || token.length > MAX_TOKEN_LENGTH) {
      throw new Error('Invalid Gitbrag share config token.');
    }

    if (!/^[A-Za-z0-9_-]+$/.test(token)) {
      throw new Error('Invalid Gitbrag share config token.');
    }

    let base64 = token.replace(/-/g, '+').replace(/_/g, '/');
    base64 += '='.repeat((4 - (base64.length % 4)) % 4);

    let binary;
    try {
      binary = atob(base64);
    } catch {
      throw new Error('Invalid Gitbrag share config token.');
    }

    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  }

  function encode(input = {}) {
    const normalized = normalize(input);
    const json = JSON.stringify(compact(normalized));
    return bytesToBase64Url(new TextEncoder().encode(json));
  }

  function decode(token) {
    let parsed;

    try {
      const json = new TextDecoder('utf-8', { fatal: true }).decode(base64UrlToBytes(token));
      parsed = JSON.parse(json);
    } catch (error) {
      if (/Unsupported Gitbrag share config version/.test(error?.message || '')) throw error;
      throw new Error('Invalid Gitbrag share config token.');
    }

    if (Array.isArray(parsed)) return expandCompact(parsed);

    const version = versionOf(parsed);
    assertSupportedVersionNumber(version);
    if (version === LEGACY_VERSION && !BASE_STATS_PERIODS.includes(parsed.statsPeriod || DEFAULTS.statsPeriod)) {
      throw new Error('Invalid Gitbrag share config token.');
    }
    return normalize(parsed);
  }

  function tryDecode(token) {
    try {
      return decode(token);
    } catch {
      return null;
    }
  }

  function create(overrides = {}) {
    return normalize(overrides);
  }

  return Object.freeze({
    CURRENT_VERSION,
    LEGACY_VERSION,
    MAX_SELECTED_REPOS,
    MAX_TOKEN_LENGTH,
    ALLOWED,
    isStatsPeriod,
    create,
    normalize,
    encode,
    decode,
    tryDecode,
    defaults: copyDefaults
  });
});
