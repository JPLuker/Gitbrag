const GITHUB_API = 'https://api.github.com';
const CONTRIBUTIONS_API = 'https://github-contributions-api.jogruber.de/v4';
const MAX_REPO_PAGES = 3;
const REPOS_PER_PAGE = 100;

const PERIODS = Object.freeze({
  day: { days: 1, label: 'Last 24 hours' },
  week: { days: 7, label: 'Last 7 days' },
  month: { days: 30, label: 'Last 30 days' },
  sixmonths: { days: 182, label: 'Last 6 months' },
  year: { days: 365, label: 'Last year' },
  lifetime: { days: null, label: 'All time' },
});

const CALENDAR_RANGES = Object.freeze({
  '1m': { days: 30, label: 'LAST MONTH' },
  '3m': { days: 91, label: 'LAST 3 MONTHS' },
  '6m': { days: 182, label: 'LAST 6 MONTHS' },
  '1y': { days: 365, label: 'LAST YEAR' },
  '2y': { days: 730, label: 'LAST 2 YEARS' },
  all: { days: null, label: 'ALL AVAILABLE' },
});

const DEFAULT_PERIOD = 'month';
const qs = (selector, root = document) => root.querySelector(selector);

const elements = {
  views: {
    search: qs('#searchView'),
    loading: qs('#loadingView'),
    profile: qs('#profileView'),
    shared: qs('#sharedView'),
    error: qs('#errorView'),
  },
  searchForm: qs('#searchForm'),
  username: qs('#username'),
  loadingText: qs('#loadingText'),
  backButton: qs('#backBtn'),
  errorBackButton: qs('#errorBack'),
  errorHeading: qs('#errorView h2'),
  errorText: qs('#errorText'),
  avatar: qs('#avatar'),
  displayName: qs('#displayName'),
  handle: qs('#handle'),
  periods: qs('.periods'),
  periodLabel: qs('#periodLabel'),
  contributionNotice: qs('#contributionNotice'),
  statsGrid: qs('#statsGrid'),
  extraStats: qs('#extraStats'),
  contributionGraph: qs('#contributionGraph'),
  calendarScroll: qs('.calendar-scroll'),
  calendarTotal: qs('#calendarTotal'),
  githubProfile: qs('#githubProfile'),
  repos: qs('#repos'),
  sharedFullProfile: qs('#sharedFullProfile'),
  sharedNewUser: qs('#sharedNewUser'),
};

const state = {
  data: null,
  period: DEFAULT_PERIOD,
  contributionError: null,
  routeNotice: null,
  activeShareConfig: null,
  requestId: 0,
  controller: null,
};

function showView(name) {
  Object.entries(elements.views).forEach(([key, element]) => {
    element?.classList.toggle('hidden', key !== name);
  });
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function setLoading(message) {
  if (elements.loadingText) elements.loadingText.textContent = message;
}

function showError(error) {
  const message = error?.message || 'Something went wrong while loading this profile.';
  const rateLimited = /rate limit/i.test(message);
  elements.errorHeading.textContent = rateLimited ? 'GitHub is rate limited.' : 'Couldn’t load that profile.';
  elements.errorText.textContent = message;
  showView('error');
  elements.errorBackButton?.focus();
}

function resetTheme() {
  ['--accent', '--accent-strong', '--level-1', '--level-2', '--level-3', '--level-4'].forEach((property) => {
    document.documentElement.style.removeProperty(property);
  });
}

function resetToSearch({ focus = true } = {}) {
  state.controller?.abort();
  state.controller = null;
  state.data = null;
  state.contributionError = null;
  state.routeNotice = null;
  state.activeShareConfig = null;
  state.period = DEFAULT_PERIOD;
  state.requestId += 1;
  resetTheme();
  showView('search');
  if (focus) elements.username?.focus();
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(Number(value) || 0);
}

function formatValue(value) {
  if (value === null || value === undefined) return '—';
  return typeof value === 'number' ? formatNumber(value) : String(value);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function parseUserInput(value) {
  let input = String(value || '').trim().replace(/^@/, '');
  if (!input) throw new Error('Enter a GitHub username or profile link.');

  if (/^https?:\/\//i.test(input) || /^(?:www\.)?github\.com\//i.test(input)) {
    try {
      const url = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
      if (url.hostname.toLowerCase().replace(/^www\./, '') !== 'github.com') {
        throw new Error('Please enter a github.com profile link.');
      }
      input = url.pathname.split('/').filter(Boolean)[0] || '';
    } catch (error) {
      if (error?.message === 'Please enter a github.com profile link.') throw error;
      throw new Error('Enter a valid GitHub profile URL.');
    }
  }

  if (input.length > 39 || !/^[A-Za-z0-9-]+$/.test(input)) {
    throw new Error('Enter a valid GitHub username or profile link.');
  }

  return input;
}

function routeFor(username, shareToken = null) {
  const base = `#/${encodeURIComponent(username)}`;
  return shareToken ? `${base}?s=${encodeURIComponent(shareToken)}` : base;
}

function parseRoute() {
  const raw = location.hash.replace(/^#\/?/, '');
  if (!raw) return null;
  const [rawUser, rawQuery = ''] = raw.split('?');
  const params = new URLSearchParams(rawQuery);

  try {
    return {
      username: parseUserInput(decodeURIComponent(rawUser)),
      shareToken: rawQuery ? (params.get('s') || params.get('share')) : null,
    };
  } catch {
    throw new Error('This Gitbrag URL contains an invalid GitHub username.');
  }
}

async function githubRequest(path, signal) {
  let response;
  try {
    response = await fetch(`${GITHUB_API}${path}`, {
      signal,
      headers: { Accept: 'application/vnd.github+json' },
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new Error('Could not reach GitHub. Check your connection and try again.');
  }

  if (response.ok) return response.json();
  if (response.status === 404) throw new Error('GitHub user not found.');
  if (response.status === 403 || response.status === 429) {
    throw new Error('GitHub is temporarily rate limited. Please try again shortly.');
  }
  throw new Error(`GitHub API error (${response.status}).`);
}

async function loadRepositories(username, signal) {
  const repositories = [];

  for (let page = 1; page <= MAX_REPO_PAGES; page += 1) {
    const batch = await githubRequest(
      `/users/${encodeURIComponent(username)}/repos?per_page=${REPOS_PER_PAGE}&page=${page}&type=owner&sort=pushed`,
      signal,
    );

    repositories.push(...batch.filter((repository) => !repository.fork));
    if (batch.length < REPOS_PER_PAGE) break;
  }

  return repositories;
}

async function loadContributionResult(username, signal) {
  try {
    const response = await fetch(`${CONTRIBUTIONS_API}/${encodeURIComponent(username)}?y=all`, { signal });
    if (!response.ok) throw new Error(`Contribution service error (${response.status}).`);
    const contributionData = await response.json();
    if (!contributionData || !Array.isArray(contributionData.contributions) || typeof contributionData.total !== 'object') {
      throw new Error('Contribution service returned an invalid response.');
    }
    return { contributionData, contributionError: null };
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    console.warn('Contribution history is unavailable.', error);
    return {
      contributionData: null,
      contributionError: 'Contribution history is temporarily unavailable. Profile and repository data are still shown.',
    };
  }
}

function sameLoadedUser(username) {
  return state.data?.user?.login?.toLowerCase() === String(username).toLowerCase();
}

async function loadProfile(input, { shareToken = null } = {}) {
  let username;
  try {
    username = parseUserInput(input);
  } catch (error) {
    showError(error);
    return;
  }

  if (sameLoadedUser(username) && !state.controller) {
    applyRouteAfterLoad({ username: state.data.user.login, shareToken }, { replace: true });
    return;
  }

  state.controller?.abort();
  const controller = new AbortController();
  const requestId = state.requestId + 1;
  state.controller = controller;
  state.requestId = requestId;
  state.data = null;
  state.contributionError = null;
  state.routeNotice = null;
  state.activeShareConfig = null;
  resetTheme();

  showView('loading');
  setLoading('Finding the GitHub profile…');

  try {
    const user = await githubRequest(`/users/${encodeURIComponent(username)}`, controller.signal);
    if (requestId !== state.requestId) return;

    setLoading('Loading public activity…');
    const [repositories, contributionResult] = await Promise.all([
      loadRepositories(user.login, controller.signal),
      loadContributionResult(user.login, controller.signal),
    ]);

    if (requestId !== state.requestId) return;

    state.data = {
      user,
      repos: repositories,
      contributionData: contributionResult.contributionData,
    };
    state.contributionError = contributionResult.contributionError;
    state.period = DEFAULT_PERIOD;

    render();
    applyRouteAfterLoad({ username: user.login, shareToken }, { replace: true });
    applyAccentFromAvatar(user.avatar_url, requestId);
  } catch (error) {
    if (error?.name === 'AbortError' || requestId !== state.requestId) return;
    showError(error);
  } finally {
    if (requestId === state.requestId) state.controller = null;
  }
}

function dateKeyFromDate(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function dateFromKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(key, days) {
  const date = dateFromKey(key);
  date.setUTCDate(date.getUTCDate() + days);
  return dateKeyFromDate(date);
}

function todayKey() {
  return dateKeyFromDate(new Date());
}

function hasContributionData() {
  return !state.contributionError && Array.isArray(state.data?.contributionData?.contributions);
}

function contributionRecords() {
  return hasContributionData() ? state.data.contributionData.contributions : null;
}

function periodRecords(period) {
  const records = contributionRecords();
  if (!records) return null;
  if (period === 'lifetime') return [...records];

  const days = PERIODS[period]?.days;
  if (!days) return [];
  const end = todayKey();
  const start = addDays(end, -days + 1);
  return records.filter((record) => record.date >= start && record.date <= end);
}

function allTimeContributionTotal() {
  if (!hasContributionData()) return null;
  const totals = Object.entries(state.data.contributionData?.total || {})
    .filter(([key]) => /^\d{4}$/.test(key))
    .map(([, value]) => Number(value))
    .filter(Number.isFinite);
  if (totals.length) return totals.reduce((sum, value) => sum + value, 0);
  return contributionRecords().reduce((sum, record) => sum + (Number(record.count) || 0), 0);
}

function contributionCount(period) {
  if (!hasContributionData()) return null;
  if (period === 'lifetime') return allTimeContributionTotal();
  return periodRecords(period).reduce((sum, record) => sum + (Number(record.count) || 0), 0);
}

function activeDays(period) {
  const records = periodRecords(period);
  if (!records) return null;
  return records.filter((record) => Number(record.count) > 0).length;
}

function bestDay(period) {
  const records = periodRecords(period);
  if (!records) return null;
  return records.reduce((best, record) => Math.max(best, Number(record.count) || 0), 0);
}

function longestStreak(period) {
  const records = periodRecords(period);
  if (!records) return null;

  const sorted = [...records].filter((record) => record.date).sort((a, b) => a.date.localeCompare(b.date));
  let best = 0;
  let run = 0;
  let previousDate = null;

  for (const record of sorted) {
    const contiguous = previousDate && addDays(previousDate, 1) === record.date;
    run = Number(record.count) > 0 ? (contiguous ? run + 1 : 1) : 0;
    best = Math.max(best, run);
    previousDate = record.date;
  }

  return best;
}

function profileStats() {
  const repos = state.data?.repos || [];
  return {
    publicRepos: state.data?.user?.public_repos ?? 0,
    stars: repos.reduce((sum, repository) => sum + (repository.stargazers_count || 0), 0),
    followers: state.data?.user?.followers ?? 0,
    following: state.data?.user?.following ?? 0,
    accountAge: formatAccountAge(state.data?.user?.created_at),
  };
}

function formatAccountAge(createdAt) {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return '—';

  const now = new Date();
  let months = (now.getUTCFullYear() - created.getUTCFullYear()) * 12;
  months += now.getUTCMonth() - created.getUTCMonth();
  if (now.getUTCDate() < created.getUTCDate()) months -= 1;
  months = Math.max(0, months);

  if (months < 1) return '<1 mo';
  if (months < 12) return `${months} mo`;
  const years = Math.floor(months / 12);
  const remainder = months % 12;
  return remainder ? `${years}y ${remainder}m` : `${years}y`;
}

function safeGitHubUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname.toLowerCase().replace(/^www\./, '') === 'github.com' ? url.href : '#';
  } catch {
    return '#';
  }
}

function render() {
  if (!state.data) return;
  renderProfile();
  renderStats();
  renderCalendar();
  renderRepositories();
}

function renderProfile() {
  const { user } = state.data;
  const displayName = user.name || user.login;
  elements.avatar.src = user.avatar_url;
  elements.avatar.alt = `${displayName}'s GitHub avatar`;
  elements.displayName.textContent = displayName;
  elements.handle.textContent = `@${user.login}${user.bio ? ` · ${user.bio}` : ''}`;
  elements.githubProfile.href = safeGitHubUrl(user.html_url);
}

function renderStats() {
  const period = state.period;
  const periodLabel = PERIODS[period]?.label || PERIODS[DEFAULT_PERIOD].label;
  const activityCards = [
    ['CONTRIBUTIONS', contributionCount(period), 'contributions in this period'],
    ['ACTIVE DAYS', activeDays(period), 'days with contribution activity'],
    ['BEST DAY', bestDay(period), 'most contributions in one day'],
    ['LONGEST STREAK', longestStreak(period), 'consecutive active days'],
  ];

  elements.periodLabel.textContent = periodLabel.toUpperCase();
  elements.statsGrid.innerHTML = activityCards.map(([label, value, note]) => `
    <article class="stat">
      <div class="label">${label}</div>
      <div class="value">${formatValue(value)}</div>
      <div class="note">${note}</div>
    </article>
  `).join('');

  const stats = profileStats();
  const profileItems = [
    [stats.publicRepos, 'PUBLIC REPOS'],
    [stats.stars, 'STARS'],
    [stats.followers, 'FOLLOWERS'],
    [stats.following, 'FOLLOWING'],
    [stats.accountAge, 'ACCOUNT AGE'],
  ];

  elements.extraStats.innerHTML = profileItems.map(([value, label]) => `
    <div class="extra"><b>${formatValue(value)}</b><span>${label}</span></div>
  `).join('');

  const notice = state.routeNotice || state.contributionError || '';
  elements.contributionNotice.textContent = notice;
  elements.contributionNotice.classList.toggle('hidden', !notice);

  elements.periods.querySelectorAll('button[data-period]').forEach((button) => {
    const active = button.dataset.period === period;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function renderCalendar() {
  const graph = elements.contributionGraph;
  graph.innerHTML = '';
  graph.classList.remove('is-unavailable');

  if (!hasContributionData()) {
    graph.classList.add('is-unavailable');
    graph.textContent = 'Contribution calendar unavailable.';
    graph.removeAttribute('style');
    graph.setAttribute('aria-label', 'Contribution calendar unavailable');
    elements.calendarTotal.textContent = '';
    return;
  }

  const window = buildCalendarWindow('1y');
  const graphWidth = window.weeks * 10 + Math.max(0, window.weeks - 1) * 4;
  graph.style.gridTemplateColumns = `repeat(${window.weeks}, 10px)`;
  graph.style.width = `${graphWidth}px`;
  graph.style.minWidth = `${graphWidth}px`;
  graph.setAttribute('aria-label', `GitHub contribution calendar for the last year. ${formatNumber(window.total)} contributions.`);

  window.days.forEach((item) => {
    const cell = document.createElement('span');
    cell.className = `contrib-cell level-${item.level}`;
    cell.title = `${item.count} contribution${item.count === 1 ? '' : 's'} · ${item.date}`;
    graph.appendChild(cell);
  });

  elements.calendarTotal.textContent = `${formatNumber(window.total)} contributions in the last year`;
  requestAnimationFrame(() => {
    if (elements.calendarScroll) elements.calendarScroll.scrollLeft = elements.calendarScroll.scrollWidth;
  });
}

function renderRepositories() {
  const repositories = rankedRepositories().slice(0, 6);

  if (!repositories.length) {
    elements.repos.innerHTML = '<div class="stats-message">No original public repositories found.</div>';
    return;
  }

  elements.repos.innerHTML = repositories.map((repository) => `
    <article class="repo">
      <div class="repo-top">
        <a class="repo-name" href="${escapeHtml(safeGitHubUrl(repository.html_url))}" target="_blank" rel="noreferrer">${escapeHtml(repository.name)}</a>
        <span class="repo-count">★ ${formatNumber(repository.stargazers_count)}</span>
      </div>
      <p class="repo-desc">${escapeHtml(repository.description || 'No description')}</p>
      <div class="repo-meta">
        <span>${escapeHtml(repository.language || 'Unknown')}</span>
        <span>Forks <b>${formatNumber(repository.forks_count)}</b></span>
        <span>Open <b>${formatNumber(repository.open_issues_count)}</b></span>
      </div>
    </article>
  `).join('');
}

function rankedRepositories() {
  return [...(state.data?.repos || [])].sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0));
}

function repoKey(repository) {
  return String(repository.id ?? repository.name);
}

function calendarRangeStart(range, records) {
  const end = todayKey();
  const setting = CALENDAR_RANGES[range] || CALENDAR_RANGES['6m'];

  if (setting.days) return addDays(end, -setting.days + 1);
  const dates = (records || []).map((record) => record.date).filter(Boolean).sort();
  return dates[0] || addDays(end, -181);
}

function buildCalendarWindow(range) {
  const records = contributionRecords() || [];
  const map = new Map(records.map((record) => [record.date, record]));
  const end = todayKey();
  const exactStart = calendarRangeStart(range, records);
  const first = dateFromKey(exactStart);
  first.setUTCDate(first.getUTCDate() - first.getUTCDay());

  const days = [];
  let total = 0;
  for (let key = dateKeyFromDate(first); key <= end; key = addDays(key, 1)) {
    const record = map.get(key) || { count: 0, level: 0 };
    const count = Number(record.count) || 0;
    if (key >= exactStart) total += count;
    days.push({
      date: key,
      count,
      level: Math.min(4, Math.max(0, Number(record.level) || 0)),
    });
  }

  return {
    label: (CALENDAR_RANGES[range] || CALENDAR_RANGES['6m']).label,
    days,
    weeks: Math.max(1, Math.ceil(days.length / 7)),
    total,
  };
}

function createShareModel(configInput) {
  const ShareConfig = window.GitbragShareConfig;
  if (!state.data || !ShareConfig) return null;
  const config = ShareConfig.normalize(configInput);
  const selectedIds = config.selectedRepos.length
    ? config.selectedRepos
    : rankedRepositories().slice(0, ShareConfig.MAX_SELECTED_REPOS).map(repoKey);
  const repositoryMap = new Map(rankedRepositories().map((repo) => [repoKey(repo), repo]));
  const selectedRepos = selectedIds.map((id) => repositoryMap.get(String(id))).filter(Boolean);

  return {
    user: {
      login: state.data.user.login,
      displayName: state.data.user.name || state.data.user.login,
      bio: state.data.user.bio || '',
      avatarUrl: state.data.user.avatar_url,
    },
    contributionError: state.contributionError,
    stats: {
      periodLabel: PERIODS[config.statsPeriod]?.label || PERIODS[DEFAULT_PERIOD].label,
      cards: [
        { label: 'CONTRIBUTIONS', value: formatValue(contributionCount(config.statsPeriod)), note: 'contributions in this period' },
        { label: 'ACTIVE DAYS', value: formatValue(activeDays(config.statsPeriod)), note: 'days with contribution activity' },
        { label: 'BEST DAY', value: formatValue(bestDay(config.statsPeriod)), note: 'most contributions in one day' },
        { label: 'LONGEST STREAK', value: formatValue(longestStreak(config.statsPeriod)), note: 'consecutive active days' },
      ],
    },
    calendar: buildCalendarWindow(config.calendarRange),
    repos: selectedRepos.map((repo) => ({
      id: repoKey(repo),
      name: repo.name,
      description: repo.description || '',
      language: repo.language || 'Unknown',
      stars: repo.stargazers_count || 0,
      url: safeGitHubUrl(repo.html_url),
    })),
  };
}

function defaultShareConfig() {
  const ShareConfig = window.GitbragShareConfig;
  if (!ShareConfig || !state.data) return null;
  return ShareConfig.create({
    statsPeriod: state.period,
    selectedRepos: rankedRepositories().slice(0, ShareConfig.MAX_SELECTED_REPOS).map(repoKey),
  });
}

function createShareUrl(configInput) {
  if (!state.data || !window.GitbragShareConfig) return location.href;
  const config = window.GitbragShareConfig.normalize(configInput);
  const token = window.GitbragShareConfig.encode(config);
  const base = location.href.split('#')[0];
  return `${base}${routeFor(state.data.user.login, token)}`;
}

function renderSharedConfig(configInput, { updateHistory = false } = {}) {
  if (!state.data || !window.GitbragShareConfig || !window.GitbragSharePage) return false;
  const config = window.GitbragShareConfig.normalize(configInput);
  const model = createShareModel(config);
  if (!model) return false;
  state.activeShareConfig = config;
  window.GitbragSharePage.render(model, config);
  if (updateHistory) {
    const token = window.GitbragShareConfig.encode(config);
    history.pushState(null, '', routeFor(state.data.user.login, token));
  }
  showView('shared');
  return true;
}

function applyRouteAfterLoad(route, { replace = false } = {}) {
  state.routeNotice = null;
  const method = replace ? 'replaceState' : 'pushState';

  if (route.shareToken) {
    const config = window.GitbragShareConfig?.tryDecode(route.shareToken);
    if (config) {
      state.activeShareConfig = config;
      const model = createShareModel(config);
      window.GitbragSharePage?.render(model, config);
      history[method](null, '', routeFor(route.username, route.shareToken));
      showView('shared');
      return;
    }

    state.routeNotice = 'This share link is invalid or from an unsupported version. Showing the full profile instead.';
  }

  state.activeShareConfig = null;
  history[method](null, '', routeFor(route.username));
  renderStats();
  showView('profile');
  elements.displayName?.focus();
}

function rgbToHsl(red, green, blue) {
  red /= 255;
  green /= 255;
  blue /= 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  let hue = 0;
  let saturation = 0;
  const lightness = (max + min) / 2;

  if (max !== min) {
    const delta = max - min;
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === red) hue = (green - blue) / delta + (green < blue ? 6 : 0);
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue /= 6;
  }

  return { hue, saturation, lightness };
}

async function applyAccentFromAvatar(avatarUrl, requestId) {
  try {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = avatarUrl;
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });

    if (requestId !== state.requestId) return;

    const canvas = document.createElement('canvas');
    canvas.width = 40;
    canvas.height = 40;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;

    let bestHue = null;
    let bestScore = 0;
    for (let index = 0; index < pixels.length; index += 16) {
      const { hue, saturation, lightness } = rgbToHsl(pixels[index], pixels[index + 1], pixels[index + 2]);
      if (saturation < 0.25 || lightness < 0.15 || lightness > 0.85) continue;
      const score = saturation * (1 - Math.abs(lightness - 0.55));
      if (score > bestScore) {
        bestScore = score;
        bestHue = hue;
      }
    }

    if (bestHue === null || requestId !== state.requestId) return;
    const hue = Math.round(bestHue * 360);
    document.documentElement.style.setProperty('--accent', `hsl(${hue} 90% 62%)`);
    document.documentElement.style.setProperty('--accent-strong', `hsl(${hue} 88% 72%)`);
    document.documentElement.style.setProperty('--level-1', `hsl(${hue} 48% 22%)`);
    document.documentElement.style.setProperty('--level-2', `hsl(${hue} 62% 34%)`);
    document.documentElement.style.setProperty('--level-3', `hsl(${hue} 72% 48%)`);
    document.documentElement.style.setProperty('--level-4', `hsl(${hue} 88% 62%)`);
  } catch (error) {
    console.warn('Could not derive an accent color from the GitHub avatar.', error);
  }
}

function navigateToProfile(username) {
  history.pushState(null, '', routeFor(username));
  loadProfile(username);
}

function handleCurrentRoute() {
  try {
    const route = parseRoute();
    if (!route) {
      resetToSearch({ focus: false });
      return;
    }
    loadProfile(route.username, { shareToken: route.shareToken });
  } catch (error) {
    showError(error);
  }
}

elements.searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  try {
    navigateToProfile(parseUserInput(elements.username.value));
  } catch (error) {
    showError(error);
  }
});

elements.backButton.addEventListener('click', () => {
  history.pushState(null, '', location.pathname + location.search);
  resetToSearch();
});

elements.errorBackButton.addEventListener('click', () => {
  history.pushState(null, '', location.pathname + location.search);
  resetToSearch();
});

elements.periods.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-period]');
  if (!button || !PERIODS[button.dataset.period]) return;
  state.period = button.dataset.period;
  renderStats();
});

elements.sharedFullProfile?.addEventListener('click', () => {
  if (!state.data) return;
  state.activeShareConfig = null;
  history.pushState(null, '', routeFor(state.data.user.login));
  showView('profile');
  elements.displayName?.focus();
});

elements.sharedNewUser?.addEventListener('click', () => {
  history.pushState(null, '', location.pathname + location.search);
  resetToSearch();
});

window.GitbragApp = Object.freeze({
  getShareBuilderContext() {
    if (!state.data) return null;
    return {
      repos: rankedRepositories(),
      defaultConfig: defaultShareConfig(),
    };
  },
  createRenderModel(config) {
    return createShareModel(config);
  },
  createShareUrl,
  previewShare(config) {
    renderSharedConfig(config, { updateHistory: true });
  },
});

window.addEventListener('hashchange', handleCurrentRoute);

handleCurrentRoute();