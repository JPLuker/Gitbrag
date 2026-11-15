'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const listeners = {};
const elements = new Proxy({}, {
  get(target, name) {
    if (!target[name]) target[name] = { addEventListener(event, fn) { listeners[name + ':' + event] = fn; } };
    return target[name];
  },
});
const window = {};
const context = {
  window,
  document: { querySelector(selector) { return elements[selector]; }, querySelectorAll() { return []; } },
  URL,
  URLSearchParams,
  Object,
  console,
};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'repo.js'), 'utf8'), context, { filename: 'repo.js' });
const Repo = window.GitbragRepo;
assert.ok(Repo);
assert.equal(JSON.stringify(Repo.parse('JPLuker/Gitbrag')), JSON.stringify({ owner: 'JPLuker', name: 'Gitbrag' }));
assert.equal(JSON.stringify(Repo.parse('https://github.com/JPLuker/Gitbrag')), JSON.stringify({ owner: 'JPLuker', name: 'Gitbrag' }));
assert.equal(JSON.stringify(Repo.parse('github.com/octocat/Hello-World')), JSON.stringify({ owner: 'octocat', name: 'Hello-World' }));
assert.equal(Repo.parse('https://example.com/owner/repo'), null);
assert.equal(Repo.parse('https://github.com/owner/repo/issues'), null);
assert.equal(Repo.parse('settings'), null);
assert.equal(Repo.parse('bad owner/repo'), null);
assert.equal(Repo.parse('owner/repo/extra'), null);
assert.equal(Repo.route({ owner: 'JPLuker', name: 'Gitbrag' }, '7d'), '#/repo/JPLuker/Gitbrag?p=7d');
assert.equal(Repo.route({ owner: 'JPLuker', name: 'Gitbrag' }, 'unknown'), '#/repo/JPLuker/Gitbrag?p=30d');
console.log('repository routes tests passed');
