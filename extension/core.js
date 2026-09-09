(function attachGitbragExtensionCore(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GitbragExtensionCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createCoreApi() {
  'use strict';

  const RESERVED_ROOTS = new Set([
    'about', 'account', 'apps', 'codespaces', 'collections', 'contact', 'copilot', 'customer-stories',
    'enterprise', 'events', 'explore', 'features', 'issues', 'join', 'login', 'marketplace', 'new',
    'notifications', 'orgs', 'organizations', 'pricing', 'pulls', 'search', 'security', 'settings',
    'site', 'sponsors', 'topics', 'trending',
  ]);

  const USERNAME_RE = /^(?!-)[A-Za-z0-9-]{1,39}(?<!-)$/;

  function normalizeUsername(value) {
    const username = String(value || '').trim();
    return USERNAME_RE.test(username) ? username : null;
  }

  function profileUsernameFromPath(pathname) {
    const match = String(pathname || '').match(/^\/([^/]+)\/?$/);
    if (!match) return null;
    let decoded;
    try {
      decoded = decodeURIComponent(match[1]);
    } catch {
      return null;
    }
    const username = normalizeUsername(decoded);
    if (!username || RESERVED_ROOTS.has(username.toLowerCase())) return null;
    return username;
  }

  function isFresh(savedAt, ttlMs, now = Date.now()) {
    const saved = Number(savedAt);
    const ttl = Number(ttlMs);
    return Number.isFinite(saved) && Number.isFinite(ttl) && ttl >= 0 && now - saved >= 0 && now - saved <= ttl;
  }

  function pruneCache(cache, ttlMs, maxEntries, now = Date.now()) {
    if (!cache || typeof cache !== 'object' || Array.isArray(cache)) return {};
    const limit = Math.max(0, Number(maxEntries) || 0);
    return Object.fromEntries(
      Object.entries(cache)
        .filter(([, entry]) => entry && typeof entry === 'object' && isFresh(entry.savedAt, ttlMs, now) && entry.data)
        .sort((a, b) => Number(b[1].savedAt) - Number(a[1].savedAt))
        .slice(0, limit),
    );
  }

  function normalizeContributionRecords(value) {
    if (!Array.isArray(value)) return null;
    const normalized = [];
    for (const record of value) {
      if (!record || typeof record !== 'object' || !/^\d{4}-\d{2}-\d{2}$/.test(String(record.date || ''))) return null;
      const count = Number(record.count);
      if (!Number.isFinite(count) || count < 0) return null;
      normalized.push({
        date: String(record.date),
        count,
        level: Math.min(4, Math.max(0, Number(record.level) || 0)),
      });
    }
    return normalized;
  }

  return Object.freeze({
    RESERVED_ROOTS,
    normalizeUsername,
    profileUsernameFromPath,
    isFresh,
    pruneCache,
    normalizeContributionRecords,
  });
});
