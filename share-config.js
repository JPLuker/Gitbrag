(function attachShareConfig(root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }

  root.GitbragShareConfig = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createShareConfigApi() {
  'use strict';

  const CURRENT_VERSION = 1;
  const MAX_SELECTED_REPOS = 4;
  const MAX_TOKEN_LENGTH = 8192;

  const ALLOWED = Object.freeze({
    statsPeriod: Object.freeze(['day', 'week', 'month', 'sixmonths', 'year', 'lifetime']),
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
      statsPeriod: enumOr(source.statsPeriod, ALLOWED.statsPeriod, DEFAULTS.statsPeriod),
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

  function assertSupportedVersion(input) {
    const version = versionOf(input);
    if (version !== CURRENT_VERSION) {
      throw new Error(`Unsupported Gitbrag share config version: ${version ?? 'missing'}.`);
    }
  }

  function enumIndex(value, allowed, fallback) {
    const index = allowed.indexOf(value);
    if (index >= 0) return index;
    return Math.max(0, allowed.indexOf(fallback));
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
      enumIndex(normalized.statsPeriod, ALLOWED.statsPeriod, DEFAULTS.statsPeriod),
      enumIndex(normalized.calendarRange, ALLOWED.calendarRange, DEFAULTS.calendarRange),
      normalized.selectedRepos,
      enumIndex(normalized.appearance.textSize, ALLOWED.textSize, DEFAULTS.appearance.textSize),
      enumIndex(normalized.appearance.accent, ALLOWED.accent, DEFAULTS.appearance.accent),
      enumIndex(normalized.appearance.cardStyle, ALLOWED.cardStyle, DEFAULTS.appearance.cardStyle)
    ];
  }

  function expandCompact(input) {
    if (!Array.isArray(input) || input.length < 8) {
      throw new Error('Invalid Gitbrag share config token.');
    }

    const [version, mask, periodIndex, calendarIndex, repoIds, textIndex, accentIndex, cardIndex] = input;
    if (version !== CURRENT_VERSION) {
      throw new Error(`Unsupported Gitbrag share config version: ${Number.isInteger(version) ? version : 'missing'}.`);
    }
    if (!Number.isInteger(mask) || mask < 0 || mask > 15) {
      throw new Error('Invalid Gitbrag share config token.');
    }

    const enumValue = (allowed, index, fallback) => (
      Number.isInteger(index) && allowed[index] !== undefined ? allowed[index] : fallback
    );

    return normalize({
      v: CURRENT_VERSION,
      modules: {
        profile: Boolean(mask & MODULE_BITS.profile),
        stats: Boolean(mask & MODULE_BITS.stats),
        calendar: Boolean(mask & MODULE_BITS.calendar),
        repos: Boolean(mask & MODULE_BITS.repos)
      },
      statsPeriod: enumValue(ALLOWED.statsPeriod, periodIndex, DEFAULTS.statsPeriod),
      calendarRange: enumValue(ALLOWED.calendarRange, calendarIndex, DEFAULTS.calendarRange),
      selectedRepos: repoIds,
      appearance: {
        textSize: enumValue(ALLOWED.textSize, textIndex, DEFAULTS.appearance.textSize),
        accent: enumValue(ALLOWED.accent, accentIndex, DEFAULTS.appearance.accent),
        cardStyle: enumValue(ALLOWED.cardStyle, cardIndex, DEFAULTS.appearance.cardStyle)
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
    } catch {
      throw new Error('Invalid Gitbrag share config token.');
    }

    if (Array.isArray(parsed)) return expandCompact(parsed);

    assertSupportedVersion(parsed);
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
    MAX_SELECTED_REPOS,
    ALLOWED,
    create,
    normalize,
    encode,
    decode,
    tryDecode,
    defaults: copyDefaults
  });
});