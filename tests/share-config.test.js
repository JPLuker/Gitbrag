'use strict';

const assert = require('node:assert/strict');
const ShareConfig = require('../share-config.js');

const defaults = ShareConfig.defaults();
assert.deepEqual(defaults, {
  v: 1,
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
  v: 1,
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

const zeroSelection = ShareConfig.create({ selectedRepos: [], modules: { repos: true } });
assert.deepEqual(ShareConfig.decode(ShareConfig.encode(zeroSelection)), zeroSelection);

const noModules = ShareConfig.create({ modules: { profile: false, stats: false, calendar: false, repos: false } });
assert.deepEqual(ShareConfig.decode(ShareConfig.encode(noModules)), noModules);

const legacyToken = Buffer.from(JSON.stringify(roundTripSource), 'utf8').toString('base64url');
assert.deepEqual(ShareConfig.decode(legacyToken), roundTripSource);
assert.ok(token.length < legacyToken.length, 'compact share tokens should be shorter than legacy JSON tokens');

assert.equal(ShareConfig.tryDecode('not valid!'), null);
assert.equal(ShareConfig.tryDecode(''), null);
assert.equal(ShareConfig.tryDecode('a'.repeat(ShareConfig.MAX_TOKEN_LENGTH + 1)), null);

const unsupported = Buffer.from(JSON.stringify({ v: 2 }), 'utf8').toString('base64url');
assert.throws(() => ShareConfig.decode(unsupported), /Unsupported Gitbrag share config version: 2/);

const unsupportedCompact = Buffer.from(JSON.stringify([2, 15, 0, 0, [], 0, 0, 0]), 'utf8').toString('base64url');
assert.throws(() => ShareConfig.decode(unsupportedCompact), /Unsupported Gitbrag share config version: 2/);

for (const malformed of [
  [1, 15, 0, 0, []],
  [1, 16, 0, 0, [], 0, 0, 0],
  [1, 15, 99, 0, [], 0, 0, 0],
  [1, 15, 0, 99, [], 0, 0, 0],
  [1, 15, 0, 0, 'not-an-array', 0, 0, 0],
  [1, 15, 0, 0, [], 99, 0, 0],
  [1, 15, 0, 0, [], 0, 99, 0],
  [1, 15, 0, 0, [], 0, 0, 99],
]) {
  const malformedToken = Buffer.from(JSON.stringify(malformed), 'utf8').toString('base64url');
  assert.throws(() => ShareConfig.decode(malformedToken), /Invalid Gitbrag share config token/);
}

const copy = ShareConfig.defaults();
copy.modules.profile = false;
copy.appearance.accent = 'green';
copy.selectedRepos.push('123');
assert.deepEqual(ShareConfig.defaults(), defaults);

console.log(`share-config tests passed; compact token ${token.length} chars vs legacy ${legacyToken.length}`);