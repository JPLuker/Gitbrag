(function attachGitbragProfileCard(root) {
  'use strict';

  const Core = root.GitbragExtensionCore;
  const Stats = root.GitbragExtensionStats;
  if (!Core || !Stats) return;

  const CARD_ID = 'gitbrag-extension-card';
  const SITE_URL = 'https://jpluker.github.io/Gitbrag/';
  const SETTINGS_KEY = 'gitbragExtensionSettings';
  const DEFAULT_SETTINGS = Object.freeze({ enabled: true, period: 'week' });

  let activeUsername = null;
  let requestSequence = 0;
  let lastLocation = location.href;
  let retryTimer = 0;
  let domObserver = null;

  function profileUsername() {
    return Core.profileUsernameFromPath(location.pathname);
  }

  async function readSettings() {
    try {
      const stored = await chrome.storage.sync.get(SETTINGS_KEY);
      const value = stored[SETTINGS_KEY] || {};
      return {
        enabled: value.enabled !== false,
        period: Stats.PERIODS[value.period] ? value.period : DEFAULT_SETTINGS.period,
      };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function removeCard() {
    document.getElementById(CARD_ID)?.remove();
  }

  function findMount() {
    const sidebar = document.querySelector('.Layout-sidebar, [class*="Layout-sidebar"]');
    if (sidebar) return { element: sidebar, sidebar: true };
    const main = document.querySelector('.Layout-main, [class*="Layout-main"], main');
    return main ? { element: main, sidebar: false } : null;
  }

  function formatNumber(value) {
    return new Intl.NumberFormat().format(Number(value) || 0);
  }

  function create(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function createCardShell(username, sidebar) {
    const card = create('section', `gitbrag-ext-card${sidebar ? '' : ' gitbrag-ext-card--wide'}`);
    card.id = CARD_ID;
    card.setAttribute('aria-label', `Gitbrag stats for ${username}`);

    const header = create('div', 'gitbrag-ext-header');
    const brandWrap = create('div', 'gitbrag-ext-brand-wrap');
    const brand = create('strong', 'gitbrag-ext-brand');
    brand.append('GIT');
    brand.append(create('span', '', 'BRAG'));
    brandWrap.append(brand);

    const open = create('a', 'gitbrag-ext-open', 'Open ↗');
    open.href = `${SITE_URL}#/${encodeURIComponent(username)}`;
    open.target = '_blank';
    open.rel = 'noopener noreferrer';
    header.append(brandWrap, open);

    const loading = create('div', 'gitbrag-ext-loading');
    loading.setAttribute('role', 'status');
    loading.append(
      create('span', 'gitbrag-ext-loading-text', 'Loading Gitbrag stats…'),
      create('span', 'gitbrag-ext-skeleton'),
      create('span', 'gitbrag-ext-skeleton gitbrag-ext-skeleton--short'),
    );
    card.append(header, loading);
    return card;
  }

  function mountCard(username) {
    const mount = findMount();
    if (!mount) return null;
    removeCard();
    const card = createCardShell(username, mount.sidebar);
    if (mount.sidebar) mount.element.append(card);
    else mount.element.prepend(card);
    return card;
  }

  function statTile(label, value) {
    const tile = create('div', 'gitbrag-ext-stat');
    tile.append(create('span', 'gitbrag-ext-stat-label', label), create('b', 'gitbrag-ext-stat-value', value));
    return tile;
  }

  function renderPeriod(card, data, period) {
    const grid = card.querySelector('.gitbrag-ext-stats');
    const buttons = card.querySelectorAll('[data-gitbrag-period]');
    buttons.forEach((button) => {
      const active = button.dataset.gitbragPeriod === period;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    if (!grid) return;

    grid.replaceChildren();
    const summary = Stats.summarize(data.contributions.records, period);
    if (!summary) {
      ['Contributions', 'Active days', 'Best day', 'Longest streak'].forEach((label) => grid.append(statTile(label, '—')));
      return;
    }

    grid.append(
      statTile('Contributions', formatNumber(summary.contributions)),
      statTile('Active days', formatNumber(summary.activeDays)),
      statTile('Best day', formatNumber(summary.bestDay)),
      statTile('Longest streak', `${formatNumber(summary.longestStreak)}d`),
    );
  }

  function renderError(card, username, message) {
    card.querySelector('.gitbrag-ext-loading')?.remove();
    const error = create('div', 'gitbrag-ext-error');
    error.setAttribute('role', 'status');
    error.append(create('b', '', 'Couldn’t load Gitbrag stats'), create('span', '', message));
    const retry = create('button', 'gitbrag-ext-retry', 'Retry');
    retry.type = 'button';
    retry.addEventListener('click', () => loadForCurrentPage({ force: true }));
    error.append(retry);
    card.append(error);
    activeUsername = username;
  }

  function renderLoaded(card, data, defaultPeriod) {
    card.querySelector('.gitbrag-ext-loading')?.remove();
    const brandWrap = card.querySelector('.gitbrag-ext-brand-wrap');
    if (data.cached && brandWrap) brandWrap.append(create('span', 'gitbrag-ext-cache-badge', 'cached'));

    const periods = create('div', 'gitbrag-ext-periods');
    Object.entries(Stats.PERIODS).forEach(([key, setting]) => {
      const button = create('button', '', setting.label);
      button.type = 'button';
      button.dataset.gitbragPeriod = key;
      button.setAttribute('aria-pressed', key === defaultPeriod ? 'true' : 'false');
      button.addEventListener('click', () => renderPeriod(card, data, key));
      periods.append(button);
    });

    const grid = create('div', 'gitbrag-ext-stats');
    const profile = create('div', 'gitbrag-ext-profile-stats');
    profile.append(
      statTile('Public repos', formatNumber(data.user.publicRepos)),
      statTile('Followers', formatNumber(data.user.followers)),
      statTile('Following', formatNumber(data.user.following)),
      statTile('Account age', Stats.accountAge(data.user.createdAt)),
    );

    card.append(periods, grid, profile);

    if (data.contributions.error) {
      const notice = create('div', 'gitbrag-ext-notice', data.contributions.error);
      notice.setAttribute('role', 'status');
      card.append(notice);
    }

    const footer = create('div', 'gitbrag-ext-footer', 'Public GitHub data · no account required');
    card.append(footer);
    renderPeriod(card, data, defaultPeriod);
  }

  async function loadForCurrentPage({ force = false } = {}) {
    clearTimeout(retryTimer);
    const username = profileUsername();
    const settings = await readSettings();
    if (!username || !settings.enabled) {
      activeUsername = null;
      requestSequence += 1;
      removeCard();
      return;
    }

    if (!force && activeUsername?.toLowerCase() === username.toLowerCase() && document.getElementById(CARD_ID)) return;

    activeUsername = username;
    const sequence = ++requestSequence;
    const card = mountCard(username);
    if (!card) {
      retryTimer = root.setTimeout(() => loadForCurrentPage({ force }), 350);
      return;
    }

    let response;
    try {
      response = await chrome.runtime.sendMessage({ type: 'gitbrag:load-profile', username, force });
    } catch {
      response = { ok: false, error: 'Gitbrag could not reach its background service.' };
    }

    if (sequence !== requestSequence || profileUsername()?.toLowerCase() !== username.toLowerCase()) return;
    if (!response?.ok) {
      renderError(card, username, response?.error || 'Could not load this profile.');
      return;
    }

    renderLoaded(card, response, settings.period);
  }

  function scheduleLoad() {
    clearTimeout(retryTimer);
    retryTimer = root.setTimeout(() => loadForCurrentPage(), 100);
  }

  function observeDom() {
    domObserver?.disconnect();
    if (!document.body || !('MutationObserver' in root)) return;
    domObserver = new MutationObserver(() => {
      const username = profileUsername();
      if (!username) return;
      if (activeUsername?.toLowerCase() === username.toLowerCase() && !document.getElementById(CARD_ID)) scheduleLoad();
    });
    domObserver.observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener('turbo:load', scheduleLoad);
  document.addEventListener('pjax:end', scheduleLoad);
  root.addEventListener('popstate', scheduleLoad);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes[SETTINGS_KEY]) {
      activeUsername = null;
      requestSequence += 1;
      removeCard();
      scheduleLoad();
    }
  });

  root.setInterval(() => {
    if (location.href === lastLocation) return;
    lastLocation = location.href;
    activeUsername = null;
    requestSequence += 1;
    removeCard();
    scheduleLoad();
  }, 1000);

  observeDom();
  scheduleLoad();
})(window);
