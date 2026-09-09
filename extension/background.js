'use strict';

const GITHUB_API = 'https://api.github.com';
const CONTRIBUTIONS_API = 'https://github-contributions-api.jogruber.de/v4';
const CACHE_KEY = 'gitbragProfileCache';
const CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_CACHE_ENTRIES = 50;

function normalizeUsername(value) {
  const username = String(value || '').trim();
  return /^[A-Za-z0-9-]{1,39}$/.test(username) ? username : null;
}

async function readCache() {
  const stored = await chrome.storage.local.get(CACHE_KEY);
  return stored[CACHE_KEY] && typeof stored[CACHE_KEY] === 'object' ? stored[CACHE_KEY] : {};
}

async function cachedProfile(username) {
  const cache = await readCache();
  const entry = cache[username.toLowerCase()];
  if (!entry || Date.now() - Number(entry.savedAt || 0) > CACHE_TTL_MS) return null;
  return entry.data || null;
}

async function saveProfile(username, data) {
  const cache = await readCache();
  cache[username.toLowerCase()] = { savedAt: Date.now(), data };

  const trimmed = Object.fromEntries(
    Object.entries(cache)
      .sort((a, b) => Number(b[1]?.savedAt || 0) - Number(a[1]?.savedAt || 0))
      .slice(0, MAX_CACHE_ENTRIES),
  );
  await chrome.storage.local.set({ [CACHE_KEY]: trimmed });
}

async function githubUser(username) {
  let response;
  try {
    response = await fetch(`${GITHUB_API}/users/${encodeURIComponent(username)}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
  } catch {
    throw new Error('Could not reach GitHub.');
  }

  if (response.ok) return response.json();
  if (response.status === 404) throw new Error('GitHub user not found.');
  if (response.status === 403 || response.status === 429) throw new Error('GitHub API rate limit reached.');
  throw new Error(`GitHub API error (${response.status}).`);
}

async function contributionResult(username) {
  try {
    const response = await fetch(`${CONTRIBUTIONS_API}/${encodeURIComponent(username)}?y=all`);
    if (!response.ok) throw new Error(`Contribution service error (${response.status}).`);
    const data = await response.json();
    if (!data || !Array.isArray(data.contributions)) throw new Error('Invalid contribution response.');
    return { records: data.contributions, error: null };
  } catch {
    return { records: null, error: 'Contribution history is temporarily unavailable.' };
  }
}

async function loadProfile(username) {
  const normalized = normalizeUsername(username);
  if (!normalized) return { ok: false, error: 'Invalid GitHub username.' };

  const cached = await cachedProfile(normalized);
  if (cached) return { ok: true, cached: true, ...cached };

  try {
    const [user, contributions] = await Promise.all([
      githubUser(normalized),
      contributionResult(normalized),
    ]);

    const data = {
      user: {
        login: user.login,
        name: user.name || user.login,
        avatarUrl: user.avatar_url,
        profileUrl: user.html_url,
        publicRepos: Number(user.public_repos) || 0,
        followers: Number(user.followers) || 0,
        following: Number(user.following) || 0,
        createdAt: user.created_at,
      },
      contributions,
    };

    await saveProfile(normalized, data);
    return { ok: true, cached: false, ...data };
  } catch (error) {
    return { ok: false, error: error?.message || 'Could not load Gitbrag stats.' };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'gitbrag:load-profile') return false;
  loadProfile(message.username).then(sendResponse);
  return true;
});
