(function attachSharePage(root) {
  'use strict';

  const ShareConfig = root.GitbragShareConfig;
  if (!ShareConfig) throw new Error('GitbragShareConfig must load before share-page.js.');

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  const elements = {
    shareButton: $('#shareBtn'),
    shareMenu: $('#shareMenu'),
    shareLinkAction: $('#shareLinkAction'),
    modal: $('#shareModal'),
    closeModal: $('#closeShareModal'),
    cancelModal: $('#cancelShareModal'),
    previewButton: $('#previewSharePage'),
    copyButton: $('#copyShareLink'),
    repoPicker: $('#shareRepoPicker'),
    profileToggle: $('#shareProfile'),
    statsToggle: $('#shareStats'),
    calendarToggle: $('#shareCalendar'),
    reposToggle: $('#shareRepos'),
    statsPeriod: $('#shareStatsPeriod'),
    calendarRange: $('#shareCalendarRange'),
    textSize: $('#shareTextSize'),
    accent: $('#shareAccent'),
    cardStyle: $('#shareCardStyle'),
    sharedPage: $('#sharedPage'),
    previewBar: $('#sharedPreviewBar'),
    footerActions: $('#sharedFooterActions'),
    sharedEdit: $('#sharedEdit'),
  };

  let activeConfig = null;
  let builderConfig = null;
  let repoOptions = [];
  let nextRenderIsPreview = false;
  let calendarResizeObserver = null;
  let calendarResizeFrame = 0;
  let modalReturnFocus = null;
  let restoreFocusAfterClose = true;
  let copyResetTimer = 0;

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  function formatNumber(value) {
    return new Intl.NumberFormat().format(Number(value) || 0);
  }

  function menuItems() {
    return $$('[role="menuitem"]', elements.shareMenu).filter((item) => !item.disabled);
  }

  function closeMenu({ restoreFocus = false } = {}) {
    elements.shareMenu?.classList.add('hidden');
    elements.shareButton?.setAttribute('aria-expanded', 'false');
    if (restoreFocus) elements.shareButton?.focus();
  }

  function openMenu() {
    elements.shareMenu?.classList.remove('hidden');
    elements.shareButton?.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => menuItems()[0]?.focus());
  }

  function toggleMenu() {
    if (elements.shareMenu?.classList.contains('hidden')) openMenu();
    else closeMenu({ restoreFocus: true });
  }

  function selectedRepoIds() {
    return $$('input[data-share-repo]', elements.repoPicker)
      .filter((input) => input.checked)
      .map((input) => input.dataset.shareRepo)
      .slice(0, ShareConfig.MAX_SELECTED_REPOS);
  }

  function updateRepoPickerState() {
    const checked = $$('input[data-share-repo]:checked', elements.repoPicker);
    const atLimit = checked.length >= ShareConfig.MAX_SELECTED_REPOS;
    $$('input[data-share-repo]', elements.repoPicker).forEach((input) => {
      input.disabled = atLimit && !input.checked;
    });
    const count = $('#shareRepoCount', elements.repoPicker);
    if (count) count.textContent = `${checked.length}/${ShareConfig.MAX_SELECTED_REPOS}`;
  }

  function syncDependentControls() {
    if (elements.statsPeriod) elements.statsPeriod.disabled = !elements.statsToggle.checked;
    if (elements.calendarRange) elements.calendarRange.disabled = !elements.calendarToggle.checked;

    const repoFieldset = elements.repoPicker?.closest('.share-fieldset');
    if (repoFieldset) {
      repoFieldset.disabled = !elements.reposToggle.checked;
      repoFieldset.classList.toggle('is-disabled', !elements.reposToggle.checked);
    }
  }

  function renderRepoPicker(selectedIds) {
    const selected = new Set(selectedIds.map(String));
    elements.repoPicker.innerHTML = `
      <div class="share-repo-head">
        <div>
          <b>Featured repositories</b>
          <small>Select up to ${ShareConfig.MAX_SELECTED_REPOS}.</small>
        </div>
        <span id="shareRepoCount">0/${ShareConfig.MAX_SELECTED_REPOS}</span>
      </div>
      <div class="share-repo-list">
        ${repoOptions.map((repo) => {
          const id = String(repo.id ?? repo.name);
          return `
            <label class="share-repo-choice">
              <input type="checkbox" data-share-repo="${escapeHtml(id)}" ${selected.has(id) ? 'checked' : ''}>
              <span>
                <b>${escapeHtml(repo.name)}</b>
                <small>★ ${formatNumber(repo.stargazers_count)} · ${escapeHtml(repo.language || 'Unknown')}</small>
              </span>
            </label>
          `;
        }).join('') || '<p class="share-empty">No original public repositories available.</p>'}
      </div>
    `;

    elements.repoPicker.onchange = (event) => {
      if (!event.target.matches('input[data-share-repo]')) return;
      updateRepoPickerState();
    };
    updateRepoPickerState();
    syncDependentControls();
  }

  function setBuilderValues(config) {
    builderConfig = ShareConfig.normalize(config);
    elements.profileToggle.checked = builderConfig.modules.profile;
    elements.statsToggle.checked = builderConfig.modules.stats;
    elements.calendarToggle.checked = builderConfig.modules.calendar;
    elements.reposToggle.checked = builderConfig.modules.repos;
    elements.statsPeriod.value = builderConfig.statsPeriod;
    elements.calendarRange.value = builderConfig.calendarRange;
    elements.textSize.value = builderConfig.appearance.textSize;
    elements.accent.value = builderConfig.appearance.accent;
    elements.cardStyle.value = builderConfig.appearance.cardStyle;
    renderRepoPicker(builderConfig.selectedRepos);
    syncDependentControls();
  }

  function readBuilderValues() {
    const repos = selectedRepoIds();
    return ShareConfig.normalize({
      modules: {
        profile: elements.profileToggle.checked,
        stats: elements.statsToggle.checked,
        calendar: elements.calendarToggle.checked,
        repos: elements.reposToggle.checked && repos.length > 0,
      },
      statsPeriod: elements.statsPeriod.value,
      calendarRange: elements.calendarRange.value,
      selectedRepos: repos,
      appearance: {
        textSize: elements.textSize.value,
        accent: elements.accent.value,
        cardStyle: elements.cardStyle.value,
      },
    });
  }

  function openBuilder(config = null) {
    const app = root.GitbragApp;
    if (!app?.getShareBuilderContext || !elements.modal) return;
    const context = app.getShareBuilderContext();
    if (!context) return;

    modalReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : elements.shareButton;
    restoreFocusAfterClose = true;
    repoOptions = context.repos;
    const base = config || activeConfig || context.defaultConfig;
    setBuilderValues(base);
    closeMenu();
    elements.modal.showModal();
    elements.profileToggle.focus();
  }

  function closeBuilder({ restoreFocus = true } = {}) {
    restoreFocusAfterClose = restoreFocus;
    if (elements.modal?.open) elements.modal.close();
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    if (!copied) throw new Error('Clipboard copy failed.');
  }

  async function copyShareLink() {
    const app = root.GitbragApp;
    if (!app?.createShareUrl || !elements.copyButton || elements.copyButton.disabled) return;
    const config = readBuilderValues();
    const url = app.createShareUrl(config);
    const original = elements.copyButton.textContent;

    clearTimeout(copyResetTimer);
    elements.copyButton.disabled = true;
    elements.copyButton.textContent = 'Copying…';

    try {
      await copyText(url);
      elements.copyButton.textContent = 'Copied!';
    } catch {
      elements.copyButton.textContent = original;
      window.prompt('Copy your Gitbrag share link:', url);
    } finally {
      elements.copyButton.disabled = false;
      copyResetTimer = root.setTimeout(() => {
        if (elements.copyButton) elements.copyButton.textContent = original;
      }, 1400);
    }
  }

  function previewSharePage() {
    const app = root.GitbragApp;
    if (!app?.previewShare) return;
    const config = readBuilderValues();
    nextRenderIsPreview = true;
    closeBuilder({ restoreFocus: false });
    app.previewShare(config);
  }

  function accentClass(accent) {
    return `shared-accent-${accent}`;
  }

  function renderProfile(model) {
    return `
      <section class="shared-profile-block">
        <img src="${escapeHtml(model.user.avatarUrl)}" alt="${escapeHtml(`${model.user.displayName}'s GitHub avatar`)}">
        <div>
          <h1>${escapeHtml(model.user.displayName)}</h1>
          <p>@${escapeHtml(model.user.login)}${model.user.bio ? ` · ${escapeHtml(model.user.bio)}` : ''}</p>
        </div>
      </section>
    `;
  }

  function renderStats(model) {
    if (model.contributionError) {
      return `<section class="shared-notice" role="status">${escapeHtml(model.contributionError)}</section>`;
    }

    return `
      <section class="shared-section">
        <div class="shared-section-title"><span>ACTIVITY SUMMARY</span><span>${escapeHtml(model.stats.periodLabel.toUpperCase())}</span></div>
        <div class="shared-stats-grid">
          ${model.stats.cards.map((card) => `
            <article>
              <span>${escapeHtml(card.label)}</span>
              <b>${escapeHtml(card.value)}</b>
              <small>${escapeHtml(card.note)}</small>
            </article>
          `).join('')}
        </div>
      </section>
    `;
  }

  function renderCalendar(model) {
    if (model.contributionError) {
      return `
        <section class="shared-section">
          <div class="shared-section-title"><span>CONTRIBUTION CALENDAR</span><span>${escapeHtml(model.calendar.label)}</span></div>
          <div class="shared-calendar-unavailable" role="status">Contribution calendar unavailable.</div>
        </section>
      `;
    }

    const calendarLabel = `${model.calendar.label.toLowerCase()}, ${formatNumber(model.calendar.total)} contributions`;
    return `
      <section class="shared-section">
        <div class="shared-section-title"><span>CONTRIBUTION CALENDAR</span><span>${escapeHtml(model.calendar.label)}</span></div>
        <div class="shared-calendar-scroll">
          <div class="shared-calendar" data-calendar-weeks="${model.calendar.weeks}" role="img" aria-label="${escapeHtml(calendarLabel)}">
            ${model.calendar.days.map((day) => `<i class="level-${day.level}" title="${escapeHtml(`${day.count} contribution${day.count === 1 ? '' : 's'} · ${day.date}`)}" aria-hidden="true"></i>`).join('')}
          </div>
        </div>
        <div class="shared-calendar-total">${formatNumber(model.calendar.total)} contributions in this calendar range</div>
      </section>
    `;
  }

  function renderRepos(model) {
    return `
      <section class="shared-section">
        <div class="shared-section-title"><span>FEATURED REPOSITORIES</span><span>${model.repos.length} SELECTED</span></div>
        <div class="shared-repos-grid">
          ${model.repos.map((repo) => `
            <article>
              <div class="shared-repo-top">
                <a href="${escapeHtml(repo.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(repo.name)}</a>
                <span>★ ${formatNumber(repo.stars)}</span>
              </div>
              <p>${escapeHtml(repo.description || 'No description')}</p>
              <small>${escapeHtml(repo.language || 'Unknown')}</small>
            </article>
          `).join('') || '<div class="shared-empty-card">No repositories selected.</div>'}
        </div>
      </section>
    `;
  }

  function maxCalendarCellSize(weeks) {
    if (weeks <= 6) return 44;
    if (weeks <= 14) return 24;
    if (weeks <= 28) return 16;
    return 10;
  }

  function scaleCalendars() {
    calendarResizeFrame = 0;
    $$('.shared-calendar', elements.sharedPage).forEach((calendar) => {
      const weeks = Math.max(1, Number(calendar.dataset.calendarWeeks) || 1);
      const scroller = calendar.closest('.shared-calendar-scroll');
      if (!scroller) return;

      const computed = getComputedStyle(scroller);
      const horizontalPadding = (parseFloat(computed.paddingLeft) || 0) + (parseFloat(computed.paddingRight) || 0);
      const available = Math.max(1, scroller.clientWidth - horizontalPadding);
      const gap = available <= 520 ? 3 : 4;
      const fitCell = Math.floor((available - Math.max(0, weeks - 1) * gap) / weeks);
      const cell = Math.max(7, Math.min(maxCalendarCellSize(weeks), fitCell > 0 ? fitCell : 7));
      const contentWidth = weeks * cell + Math.max(0, weeks - 1) * gap;

      calendar.style.setProperty('--calendar-cell', `${cell}px`);
      calendar.style.setProperty('--calendar-gap', `${gap}px`);
      calendar.style.width = `${contentWidth}px`;
      calendar.style.marginInline = 'auto';
    });
  }

  function scheduleCalendarScale() {
    if (calendarResizeFrame) cancelAnimationFrame(calendarResizeFrame);
    calendarResizeFrame = requestAnimationFrame(scaleCalendars);
  }

  function observeCalendarScale() {
    calendarResizeObserver?.disconnect();
    calendarResizeObserver = null;

    if ('ResizeObserver' in root && elements.sharedPage) {
      calendarResizeObserver = new ResizeObserver(scheduleCalendarScale);
      calendarResizeObserver.observe(elements.sharedPage);
    }

    scheduleCalendarScale();
  }

  function render(model, config) {
    activeConfig = ShareConfig.normalize(config);
    const appearance = activeConfig.appearance;
    const sections = [];
    const isPreview = nextRenderIsPreview;
    nextRenderIsPreview = false;

    if (activeConfig.modules.profile) sections.push(renderProfile(model));
    if (activeConfig.modules.stats) sections.push(renderStats(model));
    if (activeConfig.modules.calendar) sections.push(renderCalendar(model));
    if (activeConfig.modules.repos) sections.push(renderRepos(model));

    if (!sections.length) {
      sections.push('<div class="shared-empty-card">This shared Gitbrag has no enabled sections.</div>');
    }

    elements.previewBar?.classList.toggle('hidden', !isPreview);
    elements.footerActions?.classList.toggle('hidden', isPreview);

    elements.sharedPage.className = [
      'shared-page',
      `shared-size-${appearance.textSize}`,
      accentClass(appearance.accent),
      `shared-style-${appearance.cardStyle}`,
    ].join(' ');

    elements.sharedPage.innerHTML = `
      <div class="shared-page-inner">
        ${sections.join('')}
        <footer class="shared-brand-footer"><b>GIT<span>BRAG</span></b><span>github.com/${escapeHtml(model.user.login)}</span></footer>
      </div>
    `;

    observeCalendarScale();
  }

  function handleMenuKeydown(event) {
    if (elements.shareMenu?.classList.contains('hidden')) return;
    const items = menuItems();
    if (!items.length) return;
    const currentIndex = Math.max(0, items.indexOf(document.activeElement));

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      items[(currentIndex + 1) % items.length].focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      items[(currentIndex - 1 + items.length) % items.length].focus();
    } else if (event.key === 'Home') {
      event.preventDefault();
      items[0].focus();
    } else if (event.key === 'End') {
      event.preventDefault();
      items[items.length - 1].focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu({ restoreFocus: true });
    }
  }

  elements.shareButton?.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleMenu();
  });

  elements.shareButton?.addEventListener('keydown', (event) => {
    if ((event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') && elements.shareMenu?.classList.contains('hidden')) {
      event.preventDefault();
      openMenu();
    }
  });

  elements.shareMenu?.addEventListener('keydown', handleMenuKeydown);
  elements.shareLinkAction?.addEventListener('click', () => openBuilder());
  elements.closeModal?.addEventListener('click', () => closeBuilder());
  elements.cancelModal?.addEventListener('click', () => closeBuilder());
  elements.copyButton?.addEventListener('click', copyShareLink);
  elements.previewButton?.addEventListener('click', previewSharePage);

  [elements.statsToggle, elements.calendarToggle, elements.reposToggle].forEach((toggle) => {
    toggle?.addEventListener('change', syncDependentControls);
  });

  elements.sharedEdit?.addEventListener('click', () => openBuilder(activeConfig));

  elements.modal?.addEventListener('click', (event) => {
    if (event.target === elements.modal) closeBuilder();
  });

  elements.modal?.addEventListener('close', () => {
    if (restoreFocusAfterClose && modalReturnFocus?.isConnected) modalReturnFocus.focus();
    modalReturnFocus = null;
    restoreFocusAfterClose = true;
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.share-control')) closeMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !elements.shareMenu?.classList.contains('hidden')) {
      closeMenu({ restoreFocus: true });
    }
  });

  const closeTransientUi = () => {
    closeMenu();
    if (elements.modal?.open) closeBuilder({ restoreFocus: false });
  };

  root.addEventListener('hashchange', closeTransientUi);
  root.addEventListener('popstate', closeTransientUi);
  root.addEventListener('resize', scheduleCalendarScale, { passive: true });

  root.GitbragSharePage = Object.freeze({
    render,
    openBuilder,
    closeBuilder,
    getActiveConfig: () => activeConfig ? ShareConfig.normalize(activeConfig) : null,
  });
})(window);