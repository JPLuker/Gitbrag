(function attachGitbragProfileCard(root) {
  'use strict';

  const Core = root.GitbragExtensionCore;
  const Stats = root.GitbragExtensionStats;
  if (!Core || !Stats) return;

  const CARD_ID = 'gitbrag-extension-card';
  const SITE_URL = 'https://jpluker.github.io/Gitbrag/';
  const SETTINGS_KEY = 'gitbragExtensionSettings';
  const DEFAULT_SETTINGS = Object.freeze({ enabled: true, period: 'current-month' });

  let activeUsername = null;
  let activeData = null;
  let activePeriod = null;
  let requestSequence = 0;
  let lastLocation = location.href;
  let retryTimer = 0;
  let domObserver = null;

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  function profileUsername() {
    return Core.profileUsernameFromPath(location.pathname);
  }

  async function readSettings() {
    try {
      const stored = await chrome.storage.sync.get(SETTINGS_KEY);
      const value = stored[SETTINGS_KEY] || {};
      return {
        enabled: value.enabled !== false,
        period: Stats.isPreference(value.period) ? value.period : DEFAULT_SETTINGS.period,
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

  function safeGitHubUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && url.hostname.toLowerCase().replace(/^www\./, '') === 'github.com' ? url.href : '#';
    } catch {
      return '#';
    }
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

    const open = create('a', 'gitbrag-ext-open', 'Open in Gitbrag ↗');
    open.href = `${SITE_URL}#/${encodeURIComponent(username)}`;
    open.target = '_blank';
    open.rel = 'noopener noreferrer';
    header.append(brandWrap, open);

    const loading = create('div', 'gitbrag-ext-loading');
    loading.setAttribute('role', 'status');
    loading.append(
      create('span', 'gitbrag-ext-loading-text', 'Loading Gitbrag…'),
      create('span', 'gitbrag-ext-skeleton'),
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

  function statTile(label, value, note = '') {
    const tile = create('div', 'gitbrag-ext-stat');
    tile.append(create('span', 'gitbrag-ext-stat-label', label), create('b', 'gitbrag-ext-stat-value', value));
    if (note) tile.append(create('small', 'gitbrag-ext-stat-note', note));
    return tile;
  }

  function sectionTitle(text) {
    return create('div', 'gitbrag-ext-section-title', text);
  }

  function rankedRepositories(data) {
    return [...(data?.repositories || [])].sort((a, b) => (b.stars || 0) - (a.stars || 0));
  }

  function replaceOptions(select, items, selected = null) {
    select.replaceChildren();
    items.forEach((item) => {
      const option = create('option', '', item.label);
      option.value = String(item.value);
      select.append(option);
    });
    if (selected !== null && [...select.options].some((option) => option.value === String(selected))) {
      select.value = String(selected);
    }
  }

  function monthItems(options, year) {
    return options.months
      .filter((item) => item.year === Number(year))
      .map((item) => ({ value: item.month, label: Stats.MONTHS[item.month - 1] }));
  }

  function createPeriodPicker(card, data) {
    const wrap = create('div', 'gitbrag-ext-period-wrap');
    const control = create('div', 'gitbrag-ext-period-control');
    const previous = create('button', 'gitbrag-ext-period-arrow', '‹');
    previous.type = 'button';
    previous.dataset.gitbragPeriodPrevious = 'true';
    previous.setAttribute('aria-label', 'Previous calendar month');

    const current = create('button', 'gitbrag-ext-period-current');
    current.type = 'button';
    current.dataset.gitbragPeriodCurrent = 'true';
    current.setAttribute('aria-haspopup', 'dialog');
    current.setAttribute('aria-expanded', 'false');

    const next = create('button', 'gitbrag-ext-period-arrow', '›');
    next.type = 'button';
    next.dataset.gitbragPeriodNext = 'true';
    next.setAttribute('aria-label', 'Next calendar month');
    control.append(previous, current, next);

    const panel = create('div', 'gitbrag-ext-period-picker is-hidden');
    panel.dataset.gitbragPeriodPicker = 'true';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Choose Gitbrag activity period');

    const quick = create('div', 'gitbrag-ext-picker-quick');
    [
      ['current-month', 'This month'],
      ['previous-month', 'Previous month'],
      ['current-year', 'This year'],
    ].forEach(([value, label]) => {
      const button = create('button', '', label);
      button.type = 'button';
      button.dataset.gitbragQuickPeriod = value;
      quick.append(button);
    });

    const monthRow = create('div', 'gitbrag-ext-picker-row');
    monthRow.append(create('span', 'gitbrag-ext-picker-label', 'Month'));
    const monthSelect = create('select', 'gitbrag-ext-picker-select');
    monthSelect.dataset.gitbragMonthSelect = 'true';
    monthSelect.setAttribute('aria-label', 'Calendar month');
    const monthYear = create('select', 'gitbrag-ext-picker-select');
    monthYear.dataset.gitbragMonthYearSelect = 'true';
    monthYear.setAttribute('aria-label', 'Year for calendar month');
    const monthView = create('button', 'gitbrag-ext-picker-view', 'View');
    monthView.type = 'button';
    monthView.dataset.gitbragViewMonth = 'true';
    monthRow.append(monthSelect, monthYear, monthView);

    const yearRow = create('div', 'gitbrag-ext-picker-row gitbrag-ext-picker-row--year');
    yearRow.append(create('span', 'gitbrag-ext-picker-label', 'Year'));
    const yearSelect = create('select', 'gitbrag-ext-picker-select');
    yearSelect.dataset.gitbragYearSelect = 'true';
    yearSelect.setAttribute('aria-label', 'Calendar year');
    const yearView = create('button', 'gitbrag-ext-picker-view', 'View');
    yearView.type = 'button';
    yearView.dataset.gitbragViewYear = 'true';
    yearRow.append(yearSelect, yearView);

    const rollingLabel = create('div', 'gitbrag-ext-picker-heading', 'Rolling');
    const rolling = create('div', 'gitbrag-ext-picker-rolling');
    Object.entries(Stats.ROLLING).forEach(([value, setting]) => {
      const button = create('button', '', setting.short);
      button.type = 'button';
      button.dataset.gitbragRolling = value;
      button.title = setting.label;
      rolling.append(button);
    });

    panel.append(quick, monthRow, yearRow, rollingLabel, rolling);
    wrap.append(control, panel);

    const options = Stats.datedOptions(data.user.createdAt);
    replaceOptions(monthYear, options.years.map((item) => ({ value: item.year, label: item.label })));
    replaceOptions(yearSelect, options.years.map((item) => ({ value: item.year, label: item.label })));

    function refreshMonthChoices(preferred = null) {
      const year = Number(monthYear.value);
      const items = monthItems(options, year);
      replaceOptions(monthSelect, items, preferred);
    }

    monthYear.addEventListener('change', () => refreshMonthChoices(monthSelect.value));
    refreshMonthChoices();

    function closePicker({ focus = false } = {}) {
      panel.classList.add('is-hidden');
      current.setAttribute('aria-expanded', 'false');
      if (focus) current.focus();
    }

    current.addEventListener('click', () => {
      const opening = panel.classList.contains('is-hidden');
      $$('.gitbrag-ext-period-picker', card).forEach((item) => item.classList.add('is-hidden'));
      panel.classList.toggle('is-hidden', !opening);
      current.setAttribute('aria-expanded', String(opening));
    });

    previous.addEventListener('click', () => {
      const value = Stats.stepMonth(activePeriod, -1, data.user.createdAt);
      if (value) setPeriod(card, data, value);
    });

    next.addEventListener('click', () => {
      const value = Stats.stepMonth(activePeriod, 1, data.user.createdAt);
      if (value) setPeriod(card, data, value);
    });

    quick.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-gitbrag-quick-period]');
      if (!button) return;
      let value = null;
      if (button.dataset.gitbragQuickPeriod === 'current-month') value = Stats.currentMonthValue();
      if (button.dataset.gitbragQuickPeriod === 'previous-month') value = Stats.stepMonth(Stats.currentMonthValue(), -1, data.user.createdAt);
      if (button.dataset.gitbragQuickPeriod === 'current-year') value = Stats.currentYearValue();
      if (value) setPeriod(card, data, value);
      closePicker();
    });

    monthView.addEventListener('click', () => {
      const value = Stats.valueForMonth(Number(monthYear.value), Number(monthSelect.value));
      if (value) setPeriod(card, data, value);
      closePicker();
    });

    yearView.addEventListener('click', () => {
      const value = Stats.valueForYear(Number(yearSelect.value));
      if (value) setPeriod(card, data, value);
      closePicker();
    });

    rolling.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-gitbrag-rolling]');
      const value = button?.dataset.gitbragRolling;
      if (!Stats.ROLLING[value]) return;
      setPeriod(card, data, value);
      closePicker();
    });

    panel.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      closePicker({ focus: true });
    });

    card.addEventListener('click', (event) => {
      if (wrap.contains(event.target)) return;
      closePicker();
    });

    return wrap;
  }

  function syncPeriodControl(card, data, period) {
    const parsed = Stats.parse(period);
    const current = $('[data-gitbrag-period-current]', card);
    const previous = $('[data-gitbrag-period-previous]', card);
    const next = $('[data-gitbrag-period-next]', card);
    if (current) current.textContent = Stats.label(period, new Date(), data.contributions.records || []);

    const month = parsed?.type === 'calendar-month';
    const previousValue = month ? Stats.stepMonth(period, -1, data.user.createdAt) : null;
    const nextValue = month ? Stats.stepMonth(period, 1, data.user.createdAt) : null;
    if (previous) previous.disabled = !previousValue;
    if (next) next.disabled = !nextValue;

    const options = Stats.datedOptions(data.user.createdAt);
    const monthYear = $('[data-gitbrag-month-year-select]', card);
    const monthSelect = $('[data-gitbrag-month-select]', card);
    const yearSelect = $('[data-gitbrag-year-select]', card);
    if (parsed?.year && monthYear && [...monthYear.options].some((option) => Number(option.value) === parsed.year)) {
      monthYear.value = String(parsed.year);
      replaceOptions(monthSelect, monthItems(options, parsed.year), parsed.month || null);
    }
    if (parsed?.year && yearSelect && [...yearSelect.options].some((option) => Number(option.value) === parsed.year)) {
      yearSelect.value = String(parsed.year);
    }

    $$('[data-gitbrag-rolling]', card).forEach((button) => {
      button.classList.toggle('is-active', parsed?.type === 'rolling' && button.dataset.gitbragRolling === period);
    });
  }

  function renderActivity(card, data, period) {
    const grid = $('.gitbrag-ext-stats', card);
    if (!grid) return;
    grid.replaceChildren();
    const summary = Stats.summarize(data.contributions.records, period);
    if (!summary) {
      ['Contributions', 'Active days', 'Best day', 'Longest streak'].forEach((label) => grid.append(statTile(label, '—')));
      return;
    }
    grid.append(
      statTile('Contributions', formatNumber(summary.contributions), 'in this period'),
      statTile('Active days', formatNumber(summary.activeDays), 'with activity'),
      statTile('Best day', formatNumber(summary.bestDay), 'contributions'),
      statTile('Longest streak', `${formatNumber(summary.longestStreak)}d`, 'consecutive days'),
    );
  }

  function renderCalendar(card, data, period) {
    const graph = $('.gitbrag-ext-calendar', card);
    const total = $('.gitbrag-ext-calendar-total', card);
    if (!graph || !total) return;
    graph.replaceChildren();
    graph.classList.remove('is-unavailable');

    const calendar = Stats.calendar(data.contributions.records, period);
    if (!calendar) {
      graph.classList.add('is-unavailable');
      graph.textContent = 'Contribution calendar unavailable.';
      total.textContent = '';
      graph.removeAttribute('style');
      return;
    }

    const cell = calendar.days.length <= 45 ? 9 : calendar.days.length <= 100 ? 7 : 5;
    const gap = calendar.days.length <= 100 ? 3 : 2;
    graph.style.setProperty('--gitbrag-cell', `${cell}px`);
    graph.style.setProperty('--gitbrag-gap', `${gap}px`);
    graph.style.gridTemplateColumns = `repeat(${calendar.weeks}, var(--gitbrag-cell))`;
    graph.setAttribute('aria-label', `${Stats.label(period)} contribution calendar. ${formatNumber(calendar.total)} contributions.`);

    calendar.days.forEach((item) => {
      const cellNode = create('span', `gitbrag-ext-contrib level-${item.level}`);
      cellNode.title = `${item.count} contribution${item.count === 1 ? '' : 's'} · ${item.date}`;
      graph.append(cellNode);
    });
    total.textContent = `${formatNumber(calendar.total)} contributions`;
    const scroller = graph.closest('.gitbrag-ext-calendar-scroll');
    requestAnimationFrame(() => { if (scroller) scroller.scrollLeft = scroller.scrollWidth; });
  }

  function renderProfileStats(card, data) {
    const grid = $('.gitbrag-ext-profile-stats', card);
    if (!grid) return;
    const repos = data.repositories || [];
    const stars = repos.reduce((sum, repo) => sum + (Number(repo.stars) || 0), 0);
    grid.replaceChildren(
      statTile('Public repos', formatNumber(data.user.publicRepos)),
      statTile('Stars', formatNumber(stars)),
      statTile('Followers', formatNumber(data.user.followers)),
      statTile('Following', formatNumber(data.user.following)),
      statTile('Account age', Stats.accountAge(data.user.createdAt)),
    );
  }

  function renderRepositories(card, data) {
    const list = $('.gitbrag-ext-repos', card);
    if (!list) return;
    list.replaceChildren();
    const repositories = rankedRepositories(data).slice(0, 3);
    if (!repositories.length) {
      list.append(create('div', 'gitbrag-ext-empty', 'No original public repositories found.'));
      return;
    }

    repositories.forEach((repo) => {
      const article = create('article', 'gitbrag-ext-repo');
      const top = create('div', 'gitbrag-ext-repo-top');
      const link = create('a', 'gitbrag-ext-repo-name', repo.name);
      link.href = safeGitHubUrl(repo.url);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      top.append(link, create('span', 'gitbrag-ext-repo-stars', `★ ${formatNumber(repo.stars)}`));
      article.append(top);
      if (repo.description) article.append(create('p', 'gitbrag-ext-repo-desc', repo.description));
      const meta = create('div', 'gitbrag-ext-repo-meta');
      meta.append(create('span', '', repo.language || 'Unknown'), create('span', '', `${formatNumber(repo.forks)} forks`));
      article.append(meta);
      list.append(article);
    });
  }

  function setPeriod(card, data, period) {
    if (!Stats.isValid(period)) return;
    activePeriod = period;
    syncPeriodControl(card, data, period);
    renderActivity(card, data, period);
    renderCalendar(card, data, period);
  }

  function renderError(card, username, message) {
    card.querySelector('.gitbrag-ext-loading')?.remove();
    const error = create('div', 'gitbrag-ext-error');
    error.setAttribute('role', 'status');
    error.append(create('b', '', 'Couldn’t load Gitbrag'), create('span', '', message));
    const retry = create('button', 'gitbrag-ext-retry', 'Retry');
    retry.type = 'button';
    retry.addEventListener('click', () => loadForCurrentPage({ force: true }));
    error.append(retry);
    card.append(error);
    activeUsername = username;
  }

  function renderLoaded(card, data, preference) {
    card.querySelector('.gitbrag-ext-loading')?.remove();
    const brandWrap = card.querySelector('.gitbrag-ext-brand-wrap');
    if (data.cached && brandWrap) brandWrap.append(create('span', 'gitbrag-ext-cache-badge', 'cached'));

    card.append(createPeriodPicker(card, data));
    card.append(sectionTitle('Activity summary'));
    card.append(create('div', 'gitbrag-ext-stats'));

    card.append(sectionTitle('Contribution calendar'));
    const calendarCard = create('div', 'gitbrag-ext-calendar-card');
    const scroll = create('div', 'gitbrag-ext-calendar-scroll');
    const graph = create('div', 'gitbrag-ext-calendar');
    graph.setAttribute('role', 'img');
    scroll.append(graph);
    calendarCard.append(scroll, create('div', 'gitbrag-ext-calendar-total'));
    card.append(calendarCard);

    card.append(sectionTitle('Profile summary'));
    card.append(create('div', 'gitbrag-ext-profile-stats'));

    card.append(sectionTitle('Top public repositories'));
    card.append(create('div', 'gitbrag-ext-repos'));

    if (data.contributions.error) {
      const notice = create('div', 'gitbrag-ext-notice', data.contributions.error);
      notice.setAttribute('role', 'status');
      card.append(notice);
    }

    card.append(create('div', 'gitbrag-ext-footer', 'Public GitHub data · no Gitbrag account required'));
    renderProfileStats(card, data);
    renderRepositories(card, data);
    setPeriod(card, data, Stats.resolvePreference(preference));
  }

  async function loadForCurrentPage({ force = false } = {}) {
    clearTimeout(retryTimer);
    const username = profileUsername();
    const settings = await readSettings();
    if (!username || !settings.enabled) {
      activeUsername = null;
      activeData = null;
      activePeriod = null;
      requestSequence += 1;
      removeCard();
      return;
    }

    if (!force && activeUsername?.toLowerCase() === username.toLowerCase() && document.getElementById(CARD_ID)) return;

    activeUsername = username;
    activeData = null;
    activePeriod = null;
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

    activeData = response;
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

  document.addEventListener('click', (event) => {
    const card = document.getElementById(CARD_ID);
    const panel = card?.querySelector('.gitbrag-ext-period-picker');
    if (!card || !panel || panel.classList.contains('is-hidden')) return;
    if (card.contains(event.target)) return;
    panel.classList.add('is-hidden');
    card.querySelector('[data-gitbrag-period-current]')?.setAttribute('aria-expanded', 'false');
  });

  document.addEventListener('turbo:load', scheduleLoad);
  document.addEventListener('pjax:end', scheduleLoad);
  root.addEventListener('popstate', scheduleLoad);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes[SETTINGS_KEY]) {
      activeUsername = null;
      activeData = null;
      activePeriod = null;
      requestSequence += 1;
      removeCard();
      scheduleLoad();
    }
  });

  root.setInterval(() => {
    if (location.href === lastLocation) return;
    lastLocation = location.href;
    activeUsername = null;
    activeData = null;
    activePeriod = null;
    requestSequence += 1;
    removeCard();
    scheduleLoad();
  }, 1000);

  observeDom();
  scheduleLoad();
})(window);
