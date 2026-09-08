const API = 'https://api.github.com';
const CONTRIBUTIONS_API = 'https://github-contributions-api.jogruber.de/v4';
const $ = selector => document.querySelector(selector);
const views = { search: $('#searchView'), loading: $('#loadingView'), profile: $('#profileView'), error: $('#errorView') };
let data = null;
let period = 'week';
let avatarDataUrl = null;
let loadingUsername = '';
const PERIOD_DAYS = { day: 1, week: 7, month: 30, sixmonths: 182, year: 365 };
const state = { get data() { return data; }, get period() { return period; }, get avatarDataUrl() { return avatarDataUrl; } };
window.gitbragState = state;

function show(view) { Object.entries(views).forEach(([key, element]) => element.classList.toggle('hidden', key !== view)); window.scrollTo(0, 0); }
function fmt(value) { return new Intl.NumberFormat().format(Number(value) || 0); }
function esc(value) { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function parseInput(value) {
  let input = value.trim().replace(/^@/, '');
  if (/^https?:\/\//i.test(input) || /^github\.com\//i.test(input)) { const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`); if (url.hostname.toLowerCase() !== 'github.com') throw new Error('Please enter a github.com profile link.'); input = url.pathname.split('/').filter(Boolean)[0] || ''; }
  if (!/^[a-zA-Z0-9-]+$/.test(input)) throw new Error('Enter a GitHub username or profile link.');
  return input;
}
async function api(path) {
  const response = await fetch(API + path, { headers: { Accept: 'application/vnd.github+json' } });
  if (response.ok) return response.json();
  if (response.status === 404) throw new Error('GitHub user not found.');
  if (response.status === 403 || response.status === 429) throw new Error('GitHub is temporarily rate limited. Please try again shortly.');
  throw new Error(`GitHub API error (${response.status}).`);
}
async function contributions(username) { const response = await fetch(`${CONTRIBUTIONS_API}/${encodeURIComponent(username)}?y=all`); if (!response.ok) throw new Error('Could not load the GitHub contribution graph.'); return response.json(); }
function dateKeyFromDate(date) { return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`; }
function dateFromKey(key) { const [year, month, day] = key.split('-').map(Number); return new Date(Date.UTC(year, month - 1, day)); }
function addDays(key, days) { const date = dateFromKey(key); date.setUTCDate(date.getUTCDate() + days); return dateKeyFromDate(date); }
function todayKey() { return dateKeyFromDate(new Date()); }
function periodStartKey(selectedPeriod) { if (selectedPeriod === 'lifetime') return '0000-01-01'; return addDays(todayKey(), -(PERIOD_DAYS[selectedPeriod] || 7) + 1); }
function contributionMap() { return new Map((data?.contributionData?.contributions || []).map(item => [item.date, item])); }
function periodItems(selectedPeriod) { if (selectedPeriod === 'lifetime') return [...(data?.contributionData?.contributions || [])]; const start = periodStartKey(selectedPeriod); const end = todayKey(); return (data?.contributionData?.contributions || []).filter(item => item.date >= start && item.date <= end); }
function contributionCount(selectedPeriod) { return selectedPeriod === 'lifetime' ? yearlyTotal() : periodItems(selectedPeriod).reduce((sum, item) => sum + (Number(item.count) || 0), 0); }
function yearlyTotal() { return Object.values(data?.contributionData?.total || {}).reduce((sum, value) => sum + Number(value || 0), 0); }
function activeDays(selectedPeriod) { return periodItems(selectedPeriod).filter(item => Number(item.count) > 0).length; }
function bestDay(selectedPeriod) { return periodItems(selectedPeriod).reduce((best, item) => Math.max(best, Number(item.count) || 0), 0); }
function longestStreak(selectedPeriod) {
  const items = periodItems(selectedPeriod).filter(item => item.date).sort((a, b) => a.date.localeCompare(b.date));
  let best = 0, run = 0, previous = null;
  for (const item of items) { const contiguous = previous && addDays(previous, 1) === item.date; run = Number(item.count) > 0 ? (contiguous ? run + 1 : 1) : 0; best = Math.max(best, run); previous = item.date; }
  return best;
}
function sinceLabel(selectedPeriod) { return { day: 'Last 24 hours', week: 'Last 7 days', month: 'Last month', sixmonths: 'Last 6 months', year: 'Last year', lifetime: 'All time' }[selectedPeriod]; }
function lifeStats() { const repositories = (data?.repos || []).filter(repo => !repo.fork); return { repos: data.user.public_repos, followers: data.user.followers, following: data.user.following, stars: repositories.reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0) }; }
function topRepoName() { return [...(data?.repos || [])].filter(repo => !repo.fork).sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))[0]?.name || '—'; }
function age(createdAt) { return `${((Date.now() - new Date(createdAt)) / 31557600000).toFixed(1)} years`; }
async function applyTheme(avatarUrl) {
  try {
    const image = new Image(); image.crossOrigin = 'anonymous'; image.src = avatarUrl;
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; });
    const canvas = document.createElement('canvas'); const context = canvas.getContext('2d', { willReadFrequently: true }); canvas.width = 48; canvas.height = 48; context.drawImage(image, 0, 0, 48, 48);
    const pixels = context.getImageData(0, 0, 48, 48).data; const bins = new Map();
    for (let i = 0; i < pixels.length; i += 16) { const color = rgbToHsl(pixels[i], pixels[i + 1], pixels[i + 2]); if (color.l < 0.12 || color.l > 0.9 || color.s < 0.25) continue; const hue = Math.round(color.h * 24) / 24; bins.set(hue, (bins.get(hue) || 0) + color.s * (0.4 + color.l) * 100); }
    let hue = 0.25, best = -1; for (const [candidate, score] of bins) if (score > best) { best = score; hue = Number(candidate); }
    document.documentElement.style.setProperty('--accent', hsl(hue, .9, .62)); document.documentElement.style.setProperty('--accent2', hsl(hue, .75, .72)); document.documentElement.style.setProperty('--bg', hsl(hue, .22, .045)); document.documentElement.style.setProperty('--panel', hsl(hue, .18, .075)); document.documentElement.style.setProperty('--panel2', hsl(hue, .18, .105)); document.documentElement.style.setProperty('--line', hsl(hue, .16, .16)); document.documentElement.style.setProperty('--level1', hsl(hue, .48, .22)); document.documentElement.style.setProperty('--level2', hsl(hue, .62, .34)); document.documentElement.style.setProperty('--level3', hsl(hue, .72, .48));
    avatarDataUrl = await imageToDataUrl(image);
  } catch (error) { console.warn('Could not extract avatar colors; using default theme.', error); avatarDataUrl = null; }
}
function rgbToHsl(red, green, blue) { red /= 255; green /= 255; blue /= 255; const max = Math.max(red, green, blue), min = Math.min(red, green, blue); let hue = 0, saturation = 0; const lightness = (max + min) / 2; if (max !== min) { const delta = max - min; saturation = lightness > .5 ? delta / (2 - max - min) : delta / (max + min); switch (max) { case red: hue = (green - blue) / delta + (green < blue ? 6 : 0); break; case green: hue = (blue - red) / delta + 2; break; default: hue = (red - green) / delta + 4; } hue /= 6; } return { h: hue, s: saturation, l: lightness }; }
function hsl(hue, saturation, lightness) { return `hsl(${Math.round(hue * 360)}, ${Math.round(saturation * 100)}%, ${Math.round(lightness * 100)}%)`; }
async function imageToDataUrl(image) { const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth || image.width; canvas.height = image.naturalHeight || image.height; canvas.getContext('2d').drawImage(image, 0, 0); return canvas.toDataURL('image/png'); }

async function load(input) {
  const username = parseInput(input); if (loadingUsername === username && data?.user?.login === username) return; loadingUsername = username; show('loading'); $('#loadingText').textContent = 'Finding your profile...';
  try {
    const user = await api(`/users/${encodeURIComponent(username)}`); $('#loadingText').textContent = 'Loading repositories...'; const repositories = [];
    for (let page = 1; page <= 3; page += 1) { const batch = await api(`/users/${encodeURIComponent(username)}/repos?per_page=100&page=${page}&type=owner&sort=pushed`); repositories.push(...batch.filter(repo => !repo.fork)); if (batch.length < 100) break; }
    $('#loadingText').textContent = 'Loading contributions...'; let contributionData = { total: {}, contributions: [] }; try { contributionData = await contributions(user.login); } catch (error) { console.warn('Contribution service unavailable.', error); }
    data = { user, repos: repositories, contributionData }; await applyTheme(user.avatar_url); render(); show('profile'); const nextHash = `#/${encodeURIComponent(user.login)}`; if (location.hash !== nextHash) history.pushState(null, '', nextHash);
  } catch (error) { $('#errorText').textContent = error.message || 'Something went wrong while loading this profile.'; const heading = $('#errorView h2'); if (heading) heading.textContent = error.message?.includes('rate limited') ? 'GitHub is rate limited.' : 'Couldn’t load that profile.'; show('error'); }
  finally { loadingUsername = ''; }
}
function render() { if (!data) return; const user = data.user; $('#avatar').src = user.avatar_url; $('#displayName').textContent = user.name || user.login; $('#handle').textContent = `@${user.login}${user.bio ? ` · ${user.bio}` : ''}`; $('#githubProfile').href = user.html_url; renderStats(); renderCalendar(); renderRepos(); }
function renderStats() {
  const life = lifeStats(); $('#periodLabel').textContent = sinceLabel(period).toUpperCase();
  const cards = period === 'lifetime' ? [['CONTRIBUTIONS', yearlyTotal(), 'total GitHub contributions'], ['PUBLIC REPOS', life.repos, 'public repositories'], ['STARS', life.stars, 'stars in loaded repositories'], ['FOLLOWERS', life.followers, 'people following you']] : [['CONTRIBUTIONS', contributionCount(period), 'GitHub contribution activity'], ['ACTIVE DAYS', activeDays(period), 'days with activity'], ['BEST DAY', bestDay(period), 'contributions in one day'], ['LONGEST STREAK', longestStreak(period), 'consecutive active days']];
  $('#statsGrid').innerHTML = cards.map(card => `<div class="stat"><div class="label">${card[0]}</div><div class="value">${fmt(card[1])}</div><div class="note">${card[2]}</div></div>`).join('');
  const extras = period === 'lifetime' ? [['ACCOUNT AGE', age(data.user.created_at)], ['FOLLOWING', life.following], ['TOP REPO', topRepoName()]] : [['PUBLIC REPOSITORIES', life.repos], ['FOLLOWERS', life.followers], ['TOTAL CONTRIBUTIONS', yearlyTotal()]];
  $('#extraStats').innerHTML = extras.map(item => `<div class="extra"><b>${typeof item[1] === 'number' ? fmt(item[1]) : esc(item[1])}</b><span>${item[0]}</span></div>`).join('');
  document.querySelectorAll('.periods button').forEach(button => button.classList.toggle('active', button.dataset.period === period));
}
function renderCalendar() {
  const map = contributionMap(), end = todayKey(), start = addDays(end, -364), first = dateFromKey(start); first.setUTCDate(first.getUTCDate() - first.getUTCDay()); const days = [];
  for (let index = 0; index < 371; index += 1) { const key = dateKeyFromDate(new Date(first.getTime() + index * 86400000)); if (key > end) break; const item = map.get(key) || { count: 0, level: 0 }; days.push({ date: key, ...item }); }
  const graph = $('#contributionGraph'); graph.innerHTML = ''; graph.style.gridTemplateColumns = `repeat(${Math.ceil(days.length / 7)}, 1fr)`;
  days.forEach(item => { const cell = document.createElement('span'); cell.className = `contrib-cell level-${item.level}`; cell.title = `${item.count} contribution${item.count === 1 ? '' : 's'} · ${item.date}`; cell.setAttribute('aria-label', cell.title); graph.appendChild(cell); });
  $('#calendarTotal').textContent = `${fmt(contributionCount('year'))} contributions in the last year`;
}
function renderRepos() {
  const repositories = [...data.repos].filter(repo => !repo.fork).sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0)).slice(0, 6);
  $('#repos').innerHTML = repositories.length ? repositories.map(repo => `<article class="repo"><div class="repo-top"><a class="repo-name" href="${esc(repo.html_url)}" target="_blank" rel="noreferrer">${esc(repo.name)}</a><span class="repo-count">★ ${fmt(repo.stargazers_count)}</span></div><div class="repo-desc">${esc(repo.description || 'No description')}</div><div class="repo-meta"><span>${esc(repo.language || 'Unknown')}</span><span>Forks <b>${fmt(repo.forks_count)}</b></span><span>Issues <b>${fmt(repo.open_issues_count)}</b></span></div></article>`).join('') : '<div class="stats-message">No public repositories found.</div>';
}

const searchForm = $('#searchForm');
const searchWrap = searchForm?.querySelector('.input-wrap');
const misplacedSearchButton = searchWrap?.querySelector('button[type="submit"]');
if (misplacedSearchButton) searchForm.appendChild(misplacedSearchButton);
searchForm.addEventListener('submit', event => { event.preventDefault(); const value = $('#username').value.trim(); if (value) load(value); });
$('#backBtn').onclick = () => { data = null; loadingUsername = ''; show('search'); history.pushState(null, '', location.pathname); };
$('#errorBack').onclick = () => { data = null; loadingUsername = ''; show('search'); history.pushState(null, '', location.pathname); };
$('.periods').addEventListener('click', event => { const button = event.target.closest('button[data-period]'); if (!button) return; period = button.dataset.period; renderStats(); renderCalendar(); if (window.pngRefresh) window.pngRefresh(); });
$('#shareBtn').onclick = () => { const url = `${location.href.split('#')[0]}#/${encodeURIComponent(data.user.login)}`; if (navigator.share) navigator.share({ title: `${data.user.login} on Gitbrag`, url }).catch(() => {}); else navigator.clipboard?.writeText(url); };
window.addEventListener('hashchange', () => { const match = location.hash.match(/^#\/(.+)$/); if (!match) { data = null; show('search'); return; } const username = decodeURIComponent(match[1]); if (!data || data.user.login.toLowerCase() !== username.toLowerCase()) load(username); });
const initialHash = location.hash.match(/^#\/(.+)$/); if (initialHash) load(decodeURIComponent(initialHash[1]));
