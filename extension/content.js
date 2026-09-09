(function attachGitbragProfileCard(root) {
  'use strict';

  const Stats = root.GitbragExtensionStats;
  if (!Stats) return;

  const CARD_ID = 'gitbrag-extension-card';
  const SITE_URL = 'https://jpluker.github.io/Gitbrag/';
  const DEFAULT_PERIOD = 'week';
  const RESERVED_ROOTS = new Set([
    'about', 'account', 'apps', 'codespaces', 'collections', 'contact', 'copilot', 'customer-stories',
    'enterprise', 'events', 'explore', 'features', 'issues', 'join', 'login', 'marketplace', 'new',
    'notifications', 'orgs', 'organizations', 'pricing', 'pulls', 'search', 'security', 'settings',
    'site', 'sponsors', 'topics', 'trending',
  ]);

  let activeUsername = null;
  let requestSequence = 0;
  let lastLocation = location.href;

  function profileUsername() {
    const match = location.pathname.match(/^\/([A-Za-z0-9-]{1,39})\/?$/);
    if (!match) return null;
    const username = match[1];
    return RESERVED_ROOTS.has(username.toLowerCase()) ? null : username;
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
    const brand = create('strong', 'gitbrag-ext-brand');
    brand.append('GIT');
    brand.append(create('span', '', 'BRAG'));

    const open = create('a', 'gitbrag-ext-open', 'Open ↗');
    open.href = `${SITE_URL}#/${encodeURIComponent(username)}`;
    open.target = '_blank';
    open.rel = 'noopener noreferrer';

    header.append(brand, open);

    const loading = create('div', 'gitbrag-ext-loading', 'Loading Gitbrag stats…');
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
    buttons.forEach((button) => button.classList.toggle('is-active', button.dataset.gitbragPeriod === period));
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

  function renderLoaded(card, data) {
    const loading = card.querySelector('.gitbrag-ext-loading');
    loading?.remove();

    const periods = create('div', 'gitbrag-ext-periods');
    Object.entries(Stats.PERIODS).forEach(([key, setting]) => {
      const button = create('button', '', setting.label);
      button.type = 'button';
      button.dataset.gitbragPeriod = key;
      button.setAttribute('aria-pressed', key === DEFAULT_PERIOD ? 'true' : 'false');
      button.addEventListener('click', () => {
        card.querySelectorAll('[data-gitbrag-period]').forEach((item) => {
          item.setAttribute('aria-pressed', item === button ? 'true' : 'false');
        });
        renderPeriod(card, data, key);
      });
      periods.append(button);
    });

    const grid = create('div', 'gitbrag-ext-stats');
    const profile = create('div', 'gitbrag-ext-profile-stats');
    profile.append(
      statTile('Public repos', formatNumber(data.user.publicRepos)),
      statTile('Followers', formatNumber(data.user.followers)),
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
    renderPeriod(card, data, DEFAULT_PERIOD);
  }

  async function loadForCurrentPage() {
    const username = profileUsername();
    if (!username) {
      activeUsername = null;
      removeCard();
      return;
    }

    if (activeUsername?.toLowerCase() === username.toLowerCase() && document.getElementById(CARD_ID)) return;

    activeUsername = username;
    const sequence = ++requestSequence;
    const card = mountCard(username);
    if (!card) {
      setTimeout(loadForCurrentPage, 300);
      return;
    }

    let response;
    try {
      response = await chrome.runtime.sendMessage({ type: 'gitbrag:load-profile', username });
    } catch {
      response = { ok: false, error: 'Gitbrag extension could not reach its background service.' };
    }

    if (sequence !== requestSequence || profileUsername()?.toLowerCase() !== username.toLowerCase()) return;
    if (!response?.ok) {
      removeCard();
      return;
    }

    renderLoaded(card, response);
  }

  function scheduleLoad() {
    root.setTimeout(loadForCurrentPage, 80);
  }

  document.addEventListener('turbo:load', scheduleLoad);
  document.addEventListener('pjax:end', scheduleLoad);
  root.addEventListener('popstate', scheduleLoad);

  root.setInterval(() => {
    if (location.href === lastLocation) return;
    lastLocation = location.href;
    activeUsername = null;
    requestSequence += 1;
    removeCard();
    scheduleLoad();
  }, 750);

  scheduleLoad();
})(window);
