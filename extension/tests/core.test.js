'use strict';

const assert = require('node:assert/strict');
const Core = require('../core.js');

assert.equal(Core.normalizeUsername('octocat'), 'octocat');
assert.equal(Core.normalizeUsername('JPLuker'), 'JPLuker');
assert.equal(Core.normalizeUsername('-bad'), null);
assert.equal(Core.normalizeUsername('bad-'), null);
assert.equal(Core.normalizeUsername('bad/name'), null);
assert.equal(Core.profileUsernameFromPath('/octocat'), 'octocat');
assert.equal(Core.profileUsernameFromPath('/octocat/'), 'octocat');
assert.equal(Core.profileUsernameFromPath('/settings'), null);
assert.equal(Core.profileUsernameFromPath('/orgs/openai'), null);
assert.equal(Core.profileUsernameFromPath('/search?q=test'), null);

assert.deepEqual(Core.repositoryFromPath('/JPLuker/Gitbrag'), { owner: 'JPLuker', name: 'Gitbrag' });
assert.deepEqual(Core.repositoryFromPath('/octocat/Hello-World/'), { owner: 'octocat', name: 'Hello-World' });
assert.equal(Core.repositoryFromPath('/settings/profile'), null);
assert.equal(Core.repositoryFromPath('/orgs/openai'), null);
assert.equal(Core.repositoryFromPath('/JPLuker/Gitbrag/issues'), null);
assert.equal(Core.repositoryFromPath('/octocat'), null);
assert.equal(Core.repositoryFromPath('/octocat/repo%2Fbad'), null);

const now = 100000;
assert.equal(Core.isFresh(now - 1000, 2000, now), true);
assert.equal(Core.isFresh(now - 3000, 2000, now), false);

const cache = Core.pruneCache({
  fresh: { savedAt: now - 100, data: { id: 1 } },
  old: { savedAt: now - 5000, data: { id: 2 } },
  newer: { savedAt: now - 50, data: { id: 3 } },
}, 2000, 1, now);
assert.deepEqual(Object.keys(cache), ['newer']);

assert.deepEqual(Core.normalizeContributionRecords([
  { date: '2026-09-09', count: 3, level: 2 },
  { date: '2026-09-08', count: 0, level: 99 },
]), [
  { date: '2026-09-09', count: 3, level: 2 },
  { date: '2026-09-08', count: 0, level: 4 },
]);
assert.equal(Core.normalizeContributionRecords([{ date: 'nope', count: 1 }]), null);
assert.equal(Core.normalizeContributionRecords([{ date: '2026-09-09', count: -1 }]), null);

console.log('extension core tests passed');
