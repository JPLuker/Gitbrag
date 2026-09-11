'use strict';

const assert = require('node:assert/strict');
const ShareConfig = require('../share-config.js');

const defaults = ShareConfig.defaults();
assert.deepEqual(defaults, {
  v: 2,
  modules: { profile: true, stats: true, calendar: true, repos: true },
  statsPeriod: 'month',
  calendarRange: '6m',
  selectedRepos: [],
  appearance: { textSize: 'balanced', accent: 'auto', cardStyle: 'solid' }
});

const normalized = ShareConfig.normalize({
  modules: { profile: false, stats: 'yes' },
  statsPeriod: 'week',
  calendarRange: 'bogus',
  selectedRepos: ['123', 456, '123', '', null, '789', '1011', '1213'],
  appearance: { textSize: 'huge', accent: 'purple', cardStyle: 'glass' }
});

assert.deepEqual(normalized, {
  v: 2,
  modules: { profile: false, stats: true, calendar: true, repos: true },
  statsPeriod: 'week',
  calendarRange: '6m',
  selectedRepos: ['123', '456', '789', '1011'],
  appearance: { textSize: 'huge', accent: 'purple', cardStyle: 'glass' }
});

const roundTripSource = ShareConfig.create({
  modules: { calendar: false },
  statsPeriod: 'lifetime',
  calendarRange: 'all',
  selectedRepos: ['repo-α', '42'],
  appearance: { accent: 'cyan', textSize: 'compact', cardStyle: 'outline' }
});
const token = ShareConfig.encode(roundTripSource);
assert.match(token, /^[A-Za-z0-9_-]+$/);
assert.deepEqual(ShareConfig.decode(token), roundTripSource);

const sixtyDays = ShareConfig.create({ statsPeriod: 'twomonths' });
assert.deepEqual(ShareConfig.decode(ShareConfig.encode(sixtyDays)), sixtyDays);
assert.equal(ShareConfig.isStatsPeriod('twomonths'), true);

const datedMonth = ShareConfig.create({ statsPeriod: 'calendar-month:2026-08' });
assert.deepEqual(ShareConfig.decode(ShareConfig.encode(datedMonth)), datedMonth);
const datedYear = ShareConfig.create({ statsPeriod: 'calendar-year:2026' });
assert.deepEqual(ShareConfig.decode(ShareConfig.encode(datedYear)), datedYear);
assert.equal(ShareConfig.isStatsPeriod('calendar-month:2026-08'), true);
assert.equal(ShareConfig.isStatsPeriod('calendar-year:2026'), true);
assert.equal(ShareConfig.isStatsPeriod('calendar-month:2026-13'), false);

const zeroSelection = ShareConfig.create({ selectedRepos: [], modules: { repos: true } });
assert.deepEqual(ShareConfig.decode(ShareConfig.encode(zeroSelection)), zeroSelection);
const noModules = ShareConfig.create({ modules: { profile: false, stats: false, calendar: false, repos: false } });
assert.deepEqual(ShareConfig.decode(ShareConfig.encode(noModules)), noModules);

const legacyObject = {
  v: 1,
  modules: { profile: true, stats: true, calendar: false, repos: true },
  statsPeriod: 'lifetime',
  calendarRange: 'all',
  selectedRepos: ['repo-α', '42'],
  appearance: { accent: 'cyan', textSize: 'compact', cardStyle: 'outline' }
};
const legacyJsonToken = Buffer.from(JSON.stringify(legacyObject), 'utf8').toString('base64url');
assert.deepEqual(ShareConfig.decode(legacyJsonToken), roundTripSource);
const legacyCompact = [1, 11, 5, 5, ['repo-α', '42'], 0, 3, 1];
const legacyCompactToken = Buffer.from(JSON.stringify(legacyCompact), 'utf8').toString('base64url');
assert.deepEqual(ShareConfig.decode(legacyCompactToken), roundTripSource);
assert.ok(token.length < legacyJsonToken.length);

assert.equal(ShareConfig.tryDecode('not valid!'), null);
assert.equal(ShareConfig.tryDecode(''), null);
assert.equal(ShareConfig.tryDecode('a'.repeat(ShareConfig.MAX_TOKEN_LENGTH + 1)), null);
const unsupported = Buffer.from(JSON.stringify({ v: 3 }), 'utf8').toString('base64url');
assert.throws(() => ShareConfig.decode(unsupported), /Unsupported Gitbrag share config version: 3/);

for (const malformed of [
  [2, 15, 0, 0, []],
  [2, 16, 0, 0, [], 0, 0, 0],
  [2, 15, 99, 0, [], 0, 0, 0],
  [2, 15, 'calendar-month:2026-13', 0, [], 0, 0, 0],
  [2, 15, 0, 99, [], 0, 0, 0],
  [2, 15, 0, 0, 'not-an-array', 0, 0, 0],
  [2, 15, 0, 0, [], 99, 0, 0],
  [2, 15, 0, 0, [], 0, 99, 0],
  [2, 15, 0, 0, [], 0, 0, 99],
]) {
  const malformedToken = Buffer.from(JSON.stringify(malformed), 'utf8').toString('base64url');
  assert.throws(() => ShareConfig.decode(malformedToken), /Invalid Gitbrag share config token/);
}

const copy = ShareConfig.defaults();
copy.modules.profile = false;
copy.appearance.accent = 'green';
copy.selectedRepos.push('123');
assert.deepEqual(ShareConfig.defaults(), defaults);
console.log('share-config tests passed');
