'use strict';

importScripts('core.js');

const Core = self.GitbragExtensionCore;
const GITHUB_API = 'https://api.github.com';
const CONTRIBUTIONS_API = 'https://github-contributions-api.jogruber.de/v4';
const CACHE_KEY = 'gitbragProfileCache';
const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_CACHE_ENTRIES = 50;
const REQUEST_TIMEOUT_MS = 12000;
const MAX_REPO_PAGES = 3;
const REPOS_PER_PAGE = 100;

async function readCache() {
  const stored = await chrome.storage.local.get(CACHE_KEY);
  const original = stored[CACHE_KEY];
  const cache = Core.pruneCache(original, CACHE_TTL_MS, MAX_CACHE_ENTRIES);
  if (JSON.stringify(cache) !== JSON.stringify(original || {})) {
    await chrome.storage.local.set({ [CACHE_KEY]: cache });
  }
  return cache;
}

async function cachedProfile(username) {
  const cache = await readCache();
  return cache[username.toLowerCase()]?.data || null;
}

async function saveProfile(username, data) {
  const cache = await readCache();
  cache[username.toLowerCase()] = { savedAt: Date.now(), data };
  const trimmed = Core.pruneCache(cache, CACHE_TTL_MS, MAX_CACHE_ENTRIES);
  await chrome.storage.local.set({ [CACHE_KEY]: trimmed });
}

async function clearCache() {
  await chrome.storage.local.remove(CACHE_KEY);
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('Request timed out.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function githubHeaders() {
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function githubJson(url, notFoundMessage = 'GitHub resource not found.') {
  let response;
  try {
    response = await fetchWithTimeout(url, { headers: githubHeaders() });
  } catch (error) {
    if (error?.message === 'Request timed out.') throw error;
    throw new Error('Could not reach GitHub.');
  }

  if (!response.ok) {
    if (response.status === 404) throw new Error(notFoundMessage);
    if (response.status === 403 || response.status === 429) throw new Error('GitHub API rate limit reached.');
    throw new Error(`GitHub API error (${response.status}).`);
  }
  return response.json();
}

async function githubUser(username) {
  const user = await githubJson(`${GITHUB_API}/users/${encodeURIComponent(username)}`, 'GitHub user not found.');
  const login = Core.normalizeUsername(user?.login);
  if (!login || typeof user?.html_url !== 'string' || typeof user?.created_at !== 'string') {
    throw new Error('GitHub returned an invalid profile response.');
  }
  return user;
}

async function githubRepositories(username) {
  const repositories = [];
  for (let page = 1; page <= MAX_REPO_PAGES; page += 1) {
    const batch = await githubJson(
      `${GITHUB_API}/users/${encodeURIComponent(username)}/repos?per_page=${REPOS_PER_PAGE}&page=${page}&type=owner&sort=pushed`,
    );
    if (!Array.isArray(batch)) throw new Error('GitHub returned an invalid repository response.');
    batch.filter((repository) => !repository?.fork).forEach((repository) => {
      if (!repository || typeof repository.name !== 'string' || typeof repository.html_url !== 'string') return;
      repositories.push({
        id: String(repository.id ?? repository.name),
        name: repository.name,
        description: typeof repository.description === 'string' ? repository.description : '',
        language: typeof repository.language === 'string' ? repository.language : 'Unknown',
        stars: Math.max(0, Number(repository.stargazers_count) || 0),
        forks: Math.max(0, Number(repository.forks_count) || 0),
        openIssues: Math.max(0, Number(repository.open_issues_count) || 0),
        url: repository.html_url,
        pushedAt: repository.pushed_at || null,
      });
    });
    if (batch.length < REPOS_PER_PAGE) break;
  }
  return repositories;
}

async function contributionResult(username) {
  try {
    const response = await fetchWithTimeout(`${CONTRIBUTIONS_API}/${encodeURIComponent(username)}?y=all`);
    if (!response.ok) throw new Error(`Contribution service error (${response.status}).`);
    const data = await response.json();
    const records = Core.normalizeContributionRecords(data?.contributions);
    if (!records) throw new Error('Contribution service returned an invalid response.');
    return { records, error: null };
  } catch {
    return { records: null, error: 'Contribution history is temporarily unavailable.' };
  }
}

async function loadProfile(username, { force = false } = {}) {
  const normalized = Core.normalizeUsername(username);
  if (!normalized) return { ok: false, error: 'Invalid GitHub username.' };

  if (!force) {
    const cached = await cachedProfile(normalized);
    if (cached) return { ok: true, cached: true, ...cached };
  }

  try {
    const user = await githubUser(normalized);
    const [repositories, contributions] = await Promise.all([
      githubRepositories(user.login),
      contributionResult(user.login),
    ]);

    const data = {
      user: {
        login: user.login,
        name: user.name || user.login,
        bio: typeof user.bio === 'string' ? user.bio : '',
        avatarUrl: user.avatar_url || '',
        profileUrl: user.html_url,
        publicRepos: Number(user.public_repos) || 0,
        followers: Number(user.followers) || 0,
        following: Number(user.following) || 0,
        createdAt: user.created_at,
      },
      repositories,
      contributions,
    };

    await saveProfile(normalized, data);
    return { ok: true, cached: false, ...data };
  } catch (error) {
    return { ok: false, error: error?.message || 'Could not load Gitbrag stats.' };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'gitbrag:load-profile') {
    loadProfile(message.username, { force: message.force === true }).then(sendResponse);
    return true;
  }
  if (message?.type === 'gitbrag:clear-cache') {
    clearCache().then(() => sendResponse({ ok: true })).catch(() => sendResponse({ ok: false }));
    return true;
  }
  return false;
});
