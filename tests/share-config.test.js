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
  statsPeriod: 'year',
  calendarRange: 'bogus',
  selectedRepos: ['123', 456, '123', '', null, '789', '1011', '1213'],
  appearance: { textSize: 'huge', accent: 'purple', cardStyle: 'glass' }
});

assert.deepEqual(normalized, {
  v: 1,
  modules: { profile: false, stats: true, calendar: true, repos: true },
  statsPeriod: 'year',
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

assert.equal(ShareConfig.tryDecode('not valid!'), null);
assert.equal(ShareConfig.tryDecode(''), null);

const unsupported = Buffer.from(JSON.stringify({ v: 2 }), 'utf8').toString('base64url');
assert.throws(
  () => ShareConfig.decode(unsupported),
  /Unsupported Gitbrag share config version: 2/
);

const copy = ShareConfig.defaults();
copy.modules.profile = false;
copy.appearance.accent = 'green';
copy.selectedRepos.push('123');
assert.deepEqual(ShareConfig.defaults(), defaults);

console.log('share-config tests passed');
