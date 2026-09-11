(function attachDatedPeriodUi(root) {
  'use strict';

  const StatsPeriod = root.GitbragStatsPeriod;
  if (!StatsPeriod) throw new Error('GitbragStatsPeriod must load before dated-period.js.');

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const SENTINEL_MONTH = '__gitbrag_specific_month__';
  const SENTINEL_YEAR = '__gitbrag_specific_year__';

  const mainButton = $('[data-period-picker="dated"]');
  const mainPanel = $('#datedPeriodPanel');
  const mainMonthMode = $('#datedModeMonth');
  const mainYearMode = $('#datedModeYear');
  const mainMonthField = $('#datedMonthField');
  const mainFields = $('.dated-period-fields', mainPanel);
  const mainMonthSelect = $('#datedMonthSelect');
  const mainYearSelect = $('#datedYearSelect');
  const shareModal = $('#shareModal');
  const pngModal = $('#pngModal');

  let mainMode = 'month';

  const baseApp = root.GitbragApp;
  const baseSharePage = root.GitbragSharePage;

  function dateKeyFromDate(date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }

  function dateFromKey(key) {
    const [year, month, day] = String(key).split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  function addDays(key, days) {
    const date = dateFromKey(key);
    date.setUTCDate(date.getUTCDate() + days);
    return dateKeyFromDate(date);
  }

  function exactCalendar(model, period) {
    if (!model?.calendar || !StatsPeriod.isDated(period)) return model?.calendar || null;
    const selection = StatsPeriod.range(period);
    if (!selection.start || !selection.end) return model.calendar;

    const source = new Map((model.calendar.days || []).map((day) => [day.date, day]));
    const first = dateFromKey(selection.start);
    first.setUTCDate(first.getUTCDate() - first.getUTCDay());

    const days = [];
    let total = 0;
    for (let key = dateKeyFromDate(first); key <= selection.end; key = addDays(key, 1)) {
      const item = source.get(key) || { date: key, count: 0, level: 0 };
      const count = Number(item.count) || 0;
      if (key >= selection.start && key <= selection.end) total += count;
      days.push({
        date: key,
        count,
        level: Math.min(4, Math.max(0, Number(item.level) || 0)),
      });
    }

    return {
      label: selection.label.toUpperCase(),
      days,
      weeks: Math.max(1, Math.ceil(days.length / 7)),
      total,
    };
  }

  function modelForPeriod(period, config = null) {
    if (!baseApp?.createRenderModel) return null;
    const context = baseApp.getShareBuilderContext?.();
    const baseConfig = config || context?.defaultConfig;
    if (!baseConfig) return null;

    const dated = StatsPeriod.isDated(period);
    const request = {
      ...baseConfig,
      statsPeriod: period,
      calendarRange: dated ? 'all' : '1y',
    };
    const model = baseApp.createRenderModel(request);
    if (model && dated) model.calendar = exactCalendar(model, period);
    return model;
  }

  function redrawMainCalendar(period) {
    const graph = $('#contributionGraph');
    const total = $('#calendarTotal');
    const scroll = $('.calendar-scroll');
    const header = $('#calendarPeriodLabel')
      || graph?.closest('.calendar-card')?.previousElementSibling?.querySelector('span:last-child');
    if (!graph || !total) return;

    const model = modelForPeriod(period);
    if (!model) return;
    const dated = StatsPeriod.isDated(period);
    const calendar = model.calendar;
    const readableLabel = dated ? StatsPeriod.label(period) : 'the last year';

    graph.innerHTML = '';
    graph.classList.remove('is-unavailable');
    if (header) header.textContent = dated ? StatsPeriod.label(period).toUpperCase() : 'LAST YEAR';

    if (model.contributionError || !calendar) {
      graph.classList.add('is-unavailable');
      graph.textContent = 'Contribution calendar unavailable.';
      graph.removeAttribute('style');
      graph.setAttribute('aria-label', 'Contribution calendar unavailable');
      total.textContent = '';
      return;
    }

    const width = calendar.weeks * 10 + Math.max(0, calendar.weeks - 1) * 4;
    graph.style.gridTemplateColumns = `repeat(${calendar.weeks}, 10px)`;
    graph.style.width = `${width}px`;
    graph.style.minWidth = `${width}px`;
    graph.setAttribute('aria-label', `GitHub contribution calendar for ${readableLabel}. ${Number(calendar.total || 0).toLocaleString()} contributions.`);

    calendar.days.forEach((item) => {
      const cell = document.createElement('span');
      cell.className = `contrib-cell level-${item.level}`;
      cell.title = `${item.count} contribution${item.count === 1 ? '' : 's'} · ${item.date}`;
      graph.appendChild(cell);
    });

    total.textContent = `${Number(calendar.total || 0).toLocaleString()} contributions in ${readableLabel}`;
    requestAnimationFrame(() => {
      if (scroll) scroll.scrollLeft = scroll.scrollWidth;
    });
  }

  function installAppWrapper() {
    if (!baseApp) return;
    root.GitbragApp = Object.freeze({
      ...baseApp,
      createRenderModel(config) {
        const period = config?.statsPeriod;
        if (!StatsPeriod.isDated(period)) return baseApp.createRenderModel(config);
        const model = baseApp.createRenderModel({ ...config, calendarRange: 'all' });
        if (model) model.calendar = exactCalendar(model, period);
        return model;
      },
      setStatsPeriod(period) {
        const changed = baseApp.setStatsPeriod(period);
        if (changed) {
          redrawMainCalendar(period);
          document.dispatchEvent(new CustomEvent('gitbrag:stats-period', { detail: { period } }));
        }
        return changed;
      },
    });
  }

  function installSharePageWrapper() {
    if (!baseSharePage) return;
    root.GitbragSharePage = Object.freeze({
      ...baseSharePage,
      render(model, config) {
        if (StatsPeriod.isDated(config?.statsPeriod)) {
          const exactModel = root.GitbragApp?.createRenderModel?.(config);
          if (exactModel?.calendar) model = { ...model, calendar: exactModel.calendar };
        }
        return baseSharePage.render(model, config);
      },
    });
  }

  installAppWrapper();
  installSharePageWrapper();

  function currentContext() {
    return root.GitbragApp?.getShareBuilderContext?.() || null;
  }

  function availableOptions() {
    return currentContext()?.datedPeriods || { months: [], years: [] };
  }

  function parsedYear(value) {
    return StatsPeriod.parse(value)?.year || null;
  }

  function yearItems(options) {
    return (options?.years || []).map((item) => {
      const parsed = StatsPeriod.parse(item.value);
      return parsed ? { value: String(parsed.year), label: String(parsed.year) } : null;
    }).filter(Boolean);
  }

  function monthItems(options, year) {
    return (options?.months || []).map((item) => {
      const parsed = StatsPeriod.parse(item.value);
      if (!parsed || parsed.year !== Number(year)) return null;
      return { value: String(parsed.month), label: StatsPeriod.MONTHS[parsed.month - 1] };
    }).filter(Boolean);
  }

  function replaceOptions(select, items, preferredValue = null) {
    if (!select) return;
    select.innerHTML = '';
    items.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.value;
      option.textContent = item.label;
      select.appendChild(option);
    });

    if (preferredValue !== null && [...select.options].some((option) => option.value === String(preferredValue))) {
      select.value = String(preferredValue);
    }
  }

  function defaultDatedSelection(mode, options) {
    const item = mode === 'year' ? options?.years?.[0] : options?.months?.[0];
    return item?.value || null;
  }

  function setMainMode(mode, { apply = false } = {}) {
    mainMode = mode === 'year' ? 'year' : 'month';
    mainMonthMode?.classList.toggle('active', mainMode === 'month');
    mainYearMode?.classList.toggle('active', mainMode === 'year');
    mainMonthMode?.setAttribute('aria-pressed', String(mainMode === 'month'));
    mainYearMode?.setAttribute('aria-pressed', String(mainMode === 'year'));
    mainMonthField?.classList.toggle('hidden', mainMode === 'year');
    mainFields?.classList.toggle('year-only', mainMode === 'year');
    if (apply) applyMainSelection();
  }

  function populateMainPanel(period = root.GitbragApp?.getCurrentStatsPeriod?.()) {
    const options = availableOptions();
    if (!options.months.length && !options.years.length) return;

    const parsed = StatsPeriod.parse(period);
    const fallback = StatsPeriod.parse(defaultDatedSelection('month', options));
    const selectedYear = parsed?.year || fallback?.year || new Date().getUTCFullYear();
    const selectedMonth = parsed?.month || fallback?.month || new Date().getUTCMonth() + 1;

    replaceOptions(mainYearSelect, yearItems(options), selectedYear);
    replaceOptions(mainMonthSelect, monthItems(options, mainYearSelect?.value || selectedYear), selectedMonth);
    setMainMode(parsed?.type === 'calendar-year' ? 'year' : 'month');
  }

  function applyMainSelection() {
    const year = Number(mainYearSelect?.value);
    if (!year) return;

    const value = mainMode === 'year'
      ? StatsPeriod.valueForYear(year)
      : StatsPeriod.valueForMonth(year, Number(mainMonthSelect?.value));

    if (!value) return;
    root.GitbragApp?.setStatsPeriod?.(value);
  }

  function syncMainState(period) {
    const dated = StatsPeriod.isDated(period);
    mainButton?.classList.toggle('active', dated);
    mainButton?.setAttribute('aria-pressed', String(dated));

    if (!dated) {
      mainPanel?.classList.add('hidden');
      mainButton?.setAttribute('aria-expanded', 'false');
      return;
    }

    if (mainPanel && !mainPanel.classList.contains('hidden')) populateMainPanel(period);
  }

  mainButton?.addEventListener('click', () => {
    populateMainPanel();
    mainPanel?.classList.toggle('hidden');
    const open = !mainPanel?.classList.contains('hidden');
    mainButton?.setAttribute('aria-expanded', String(open));
    if (open) (mainMode === 'year' ? mainYearSelect : mainMonthSelect)?.focus();
  });

  mainMonthMode?.addEventListener('click', () => setMainMode('month', { apply: true }));
  mainYearMode?.addEventListener('click', () => setMainMode('year', { apply: true }));

  mainYearSelect?.addEventListener('change', () => {
    if (mainMode === 'month') {
      const currentMonth = mainMonthSelect?.value;
      replaceOptions(mainMonthSelect, monthItems(availableOptions(), mainYearSelect.value), currentMonth);
    }
    applyMainSelection();
  });

  mainMonthSelect?.addEventListener('change', applyMainSelection);

  document.querySelector('.periods')?.addEventListener('click', (event) => {
    if (event.target.closest('button[data-period]')) {
      mainPanel?.classList.add('hidden');
      mainButton?.setAttribute('aria-expanded', 'false');
      requestAnimationFrame(() => {
        const period = root.GitbragApp?.getCurrentStatsPeriod?.();
        syncMainState(period);
        redrawMainCalendar(period);
      });
    }
  });

  document.addEventListener('gitbrag:stats-period', (event) => {
    syncMainState(event.detail?.period);
  });

  function clearLegacyDatedOptions(select) {
    if (!select) return;
    select.querySelectorAll('optgroup[data-dated-options], option[data-dated-option]').forEach((node) => node.remove());
  }

  function ensureSentinelOptions(select) {
    if (!select) return;
    clearLegacyDatedOptions(select);

    if (!select.querySelector(`option[value="${SENTINEL_MONTH}"]`)) {
      const month = document.createElement('option');
      month.value = SENTINEL_MONTH;
      month.textContent = 'Specific month…';
      month.dataset.datedSentinel = 'month';
      select.appendChild(month);
    }

    if (!select.querySelector(`option[value="${SENTINEL_YEAR}"]`)) {
      const year = document.createElement('option');
      year.value = SENTINEL_YEAR;
      year.textContent = 'Specific year…';
      year.dataset.datedSentinel = 'year';
      select.appendChild(year);
    }
  }

  function setCurrentDatedOption(select, value) {
    if (!select || !StatsPeriod.isDated(value)) return;
    select.querySelectorAll('option[data-dated-current]').forEach((option) => option.remove());

    const option = document.createElement('option');
    option.value = value;
    option.textContent = StatsPeriod.label(value);
    option.dataset.datedCurrent = 'true';

    const sentinel = select.querySelector('option[data-dated-sentinel]');
    select.insertBefore(option, sentinel || null);
    select.value = value;
  }

  function createBuilderControls(select) {
    const statsLabel = select?.closest('label');
    if (!statsLabel) return null;

    const existing = statsLabel.parentElement?.querySelector(`[data-dated-builder-for="${select.id}"]`);
    if (existing) return existing;

    const controls = document.createElement('div');
    controls.className = 'dated-builder-controls hidden';
    controls.dataset.datedBuilderFor = select.id;
    controls.innerHTML = `
      <label class="dated-builder-field" data-dated-builder-month-field>
        <span>Month</span>
        <select data-dated-builder-month aria-label="Specific calendar month"></select>
      </label>
      <label class="dated-builder-field">
        <span>Year</span>
        <select data-dated-builder-year aria-label="Specific calendar year"></select>
      </label>
      <small>Contribution calendar follows this exact period.</small>
    `;
    statsLabel.insertAdjacentElement('afterend', controls);
    return controls;
  }

  function showCalendarRange(calendarRange, show) {
    calendarRange?.closest('label')?.classList.toggle('hidden', !show);
  }

  function builderParts(select) {
    const controls = createBuilderControls(select);
    return {
      controls,
      monthField: controls?.querySelector('[data-dated-builder-month-field]'),
      monthSelect: controls?.querySelector('[data-dated-builder-month]'),
      yearSelect: controls?.querySelector('[data-dated-builder-year]'),
    };
  }

  function populateBuilderControls(select, calendarRange, value) {
    const options = availableOptions();
    const parsed = StatsPeriod.parse(value);
    const mode = parsed?.type === 'calendar-year' ? 'year' : 'month';
    const fallback = StatsPeriod.parse(defaultDatedSelection(mode, options));
    const year = parsed?.year || fallback?.year || new Date().getUTCFullYear();
    const month = parsed?.month || fallback?.month || new Date().getUTCMonth() + 1;
    const parts = builderParts(select);

    replaceOptions(parts.yearSelect, yearItems(options), year);
    replaceOptions(parts.monthSelect, monthItems(options, parts.yearSelect?.value || year), month);
    parts.monthField?.classList.toggle('hidden', mode === 'year');
    parts.controls?.classList.toggle('year-only', mode === 'year');
    parts.controls?.classList.remove('hidden');
    if (parts.controls) parts.controls.dataset.mode = mode;
    showCalendarRange(calendarRange, false);

    return parts;
  }

  function hideBuilderControls(select, calendarRange) {
    const parts = builderParts(select);
    parts.controls?.classList.add('hidden');
    select?.querySelectorAll('option[data-dated-current]').forEach((option) => option.remove());
    showCalendarRange(calendarRange, true);
  }

  function builderDatedValue(parts) {
    const year = Number(parts.yearSelect?.value);
    if (!year) return null;
    return parts.controls?.dataset.mode === 'year'
      ? StatsPeriod.valueForYear(year)
      : StatsPeriod.valueForMonth(year, Number(parts.monthSelect?.value));
  }

  function commitBuilderDated(select, calendarRange, parts, { dispatch = true } = {}) {
    const value = builderDatedValue(parts);
    if (!value) return;
    setCurrentDatedOption(select, value);
    showCalendarRange(calendarRange, false);
    if (dispatch) select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function syncBuilder(select, calendarRange, preferredValue = null) {
    if (!select) return;
    ensureSentinelOptions(select);

    const value = StatsPeriod.isDated(preferredValue) ? preferredValue : select.value;
    if (StatsPeriod.isDated(value)) {
      setCurrentDatedOption(select, value);
      populateBuilderControls(select, calendarRange, value);
    } else {
      hideBuilderControls(select, calendarRange);
    }
  }

  function setupBuilder(select, calendarRange) {
    if (!select || select.dataset.datedSetup === 'true') return;
    select.dataset.datedSetup = 'true';
    ensureSentinelOptions(select);
    const parts = builderParts(select);

    select.addEventListener('change', () => {
      if (select.value === SENTINEL_MONTH || select.value === SENTINEL_YEAR) {
        const mode = select.value === SENTINEL_YEAR ? 'year' : 'month';
        const fallback = defaultDatedSelection(mode, availableOptions());
        if (!fallback) return;
        const nextParts = populateBuilderControls(select, calendarRange, fallback);
        if (nextParts.controls) nextParts.controls.dataset.mode = mode;
        commitBuilderDated(select, calendarRange, nextParts, { dispatch: false });
        return;
      }

      if (StatsPeriod.isDated(select.value)) {
        populateBuilderControls(select, calendarRange, select.value);
      } else {
        hideBuilderControls(select, calendarRange);
      }
    });

    parts.yearSelect?.addEventListener('change', () => {
      if (parts.controls?.dataset.mode === 'month') {
        const previousMonth = parts.monthSelect?.value;
        replaceOptions(parts.monthSelect, monthItems(availableOptions(), parts.yearSelect.value), previousMonth);
      }
      commitBuilderDated(select, calendarRange, parts);
    });

    parts.monthSelect?.addEventListener('change', () => commitBuilderDated(select, calendarRange, parts));
  }

  function preferredShareConfig() {
    return root.GitbragSharePage?.getActiveConfig?.() || currentContext()?.defaultConfig || null;
  }

  function observeDialog(dialog, select, calendarRange, configGetter, afterPopulate = null) {
    if (!dialog || !select) return;
    setupBuilder(select, calendarRange);

    const populate = () => {
      if (!dialog.open) return;
      const preferred = configGetter?.();
      syncBuilder(select, calendarRange, preferred?.statsPeriod || null);
      afterPopulate?.();
    };

    const observer = new MutationObserver(populate);
    observer.observe(dialog, { attributes: true, attributeFilter: ['open'] });
    populate();
  }

  observeDialog(shareModal, $('#shareStatsPeriod'), $('#shareCalendarRange'), preferredShareConfig);
  observeDialog(
    pngModal,
    $('#pngStatsPeriod'),
    $('#pngCalendarRange'),
    () => currentContext()?.defaultConfig || null,
    () => requestAnimationFrame(() => root.GitbragPng?.renderPreview?.()),
  );

  syncMainState(root.GitbragApp?.getCurrentStatsPeriod?.());
})(window);
