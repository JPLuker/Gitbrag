(function attachDatedPeriodUi(root) {
  'use strict';

  const StatsPeriod = root.GitbragStatsPeriod;
  if (!StatsPeriod) throw new Error('GitbragStatsPeriod must load before dated-period.js.');

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const SENTINEL_MONTH = '__gitbrag_specific_month__';
  const SENTINEL_YEAR = '__gitbrag_specific_year__';

  const modeMonth = $('#periodModeMonth');
  const modeYear = $('#periodModeYear');
  const modeRolling = $('#periodModeRolling');
  const datedPanel = $('#datedPeriodPanel');
  const rollingPanel = $('#rollingPeriodPanel');
  const monthField = $('#datedMonthField');
  const fields = $('.dated-period-fields', datedPanel);
  const monthSelect = $('#datedMonthSelect');
  const yearSelect = $('#datedYearSelect');
  const shareModal = $('#shareModal');
  const pngModal = $('#pngModal');

  let mainMode = 'month';
  let lastRollingPeriod = 'month';

  function app() { return root.GitbragApp || null; }
  function availableOptions() { return app()?.getStatsPeriodOptions?.() || { months: [], years: [] }; }

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

  function setModeButtons(mode) {
    mainMode = mode;
    [[modeMonth, 'month'], [modeYear, 'year'], [modeRolling, 'rolling']].forEach(([button, key]) => {
      const active = mode === key;
      button?.classList.toggle('active', active);
      button?.setAttribute('aria-pressed', String(active));
    });
    datedPanel?.classList.toggle('hidden', mode === 'rolling');
    rollingPanel?.classList.toggle('hidden', mode !== 'rolling');
    monthField?.classList.toggle('hidden', mode === 'year');
    fields?.classList.toggle('year-only', mode === 'year');
  }

  function populateDated(period = app()?.getCurrentStatsPeriod?.()) {
    const options = availableOptions();
    if (!options.months.length && !options.years.length) return;
    const parsed = StatsPeriod.parse(period);
    const current = StatsPeriod.parse(StatsPeriod.currentMonthValue());
    const selectedYear = parsed?.year || current?.year || new Date().getUTCFullYear();
    const selectedMonth = parsed?.month || current?.month || new Date().getUTCMonth() + 1;
    replaceOptions(yearSelect, yearItems(options), selectedYear);
    replaceOptions(monthSelect, monthItems(options, yearSelect?.value || selectedYear), selectedMonth);
  }

  function applyDated(mode = mainMode) {
    const year = Number(yearSelect?.value);
    if (!year) return;
    const value = mode === 'year'
      ? StatsPeriod.valueForYear(year)
      : StatsPeriod.valueForMonth(year, Number(monthSelect?.value));
    if (value) app()?.setStatsPeriod?.(value);
  }

  function enterMonth() {
    populateDated();
    setModeButtons('month');
    const current = StatsPeriod.parse(app()?.getCurrentStatsPeriod?.());
    if (current?.type !== 'calendar-month') {
      const now = StatsPeriod.parse(StatsPeriod.currentMonthValue());
      if (now) {
        yearSelect.value = String(now.year);
        replaceOptions(monthSelect, monthItems(availableOptions(), now.year), now.month);
      }
    }
    applyDated('month');
  }

  function enterYear() {
    populateDated();
    setModeButtons('year');
    const current = StatsPeriod.parse(app()?.getCurrentStatsPeriod?.());
    if (current?.type !== 'calendar-year') {
      const now = StatsPeriod.parse(StatsPeriod.currentYearValue());
      if (now && [...yearSelect.options].some((option) => option.value === String(now.year))) yearSelect.value = String(now.year);
    }
    applyDated('year');
  }

  function enterRolling() {
    setModeButtons('rolling');
    app()?.setStatsPeriod?.(lastRollingPeriod);
  }

  modeMonth?.addEventListener('click', enterMonth);
  modeYear?.addEventListener('click', enterYear);
  modeRolling?.addEventListener('click', enterRolling);

  yearSelect?.addEventListener('change', () => {
    if (mainMode === 'month') {
      const previous = monthSelect?.value;
      replaceOptions(monthSelect, monthItems(availableOptions(), yearSelect.value), previous);
    }
    applyDated(mainMode);
  });
  monthSelect?.addEventListener('change', () => applyDated('month'));

  rollingPanel?.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-rolling-period]');
    const period = button?.dataset.rollingPeriod;
    if (!period || !StatsPeriod.ROLLING[period]) return;
    lastRollingPeriod = period;
    app()?.setStatsPeriod?.(period);
  });

  function syncMain(period) {
    const parsed = StatsPeriod.parse(period);
    if (!parsed) return;
    if (parsed.type === 'calendar-month') {
      setModeButtons('month');
      populateDated(period);
    } else if (parsed.type === 'calendar-year') {
      setModeButtons('year');
      populateDated(period);
    } else {
      lastRollingPeriod = period;
      setModeButtons('rolling');
    }
    rollingPanel?.querySelectorAll('button[data-rolling-period]').forEach((button) => {
      button.classList.toggle('active', button.dataset.rollingPeriod === period);
    });
  }

  document.addEventListener('gitbrag:stats-period', (event) => syncMain(event.detail?.period));

  function clearLegacyDatedOptions(select) {
    select?.querySelectorAll('optgroup[data-dated-options], option[data-dated-option], option[data-dated-current]').forEach((node) => node.remove());
  }

  function ensureSentinelOptions(select) {
    if (!select) return;
    clearLegacyDatedOptions(select);
    if (!select.querySelector(`option[value="${SENTINEL_MONTH}"]`)) {
      const option = document.createElement('option');
      option.value = SENTINEL_MONTH;
      option.textContent = 'Specific month…';
      option.dataset.datedSentinel = 'month';
      select.appendChild(option);
    }
    if (!select.querySelector(`option[value="${SENTINEL_YEAR}"]`)) {
      const option = document.createElement('option');
      option.value = SENTINEL_YEAR;
      option.textContent = 'Specific year…';
      option.dataset.datedSentinel = 'year';
      select.appendChild(option);
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
      <label class="dated-builder-field" data-dated-builder-month-field><span>Month</span><select data-dated-builder-month aria-label="Specific calendar month"></select></label>
      <label class="dated-builder-field"><span>Year</span><select data-dated-builder-year aria-label="Specific calendar year"></select></label>
      <small>Contribution calendar follows this exact period.</small>`;
    statsLabel.insertAdjacentElement('afterend', controls);
    return controls;
  }

  function builderParts(select) {
    const controls = createBuilderControls(select);
    return { controls, monthField: controls?.querySelector('[data-dated-builder-month-field]'), monthSelect: controls?.querySelector('[data-dated-builder-month]'), yearSelect: controls?.querySelector('[data-dated-builder-year]') };
  }
  function showCalendarRange(calendarRange, show) { calendarRange?.closest('label')?.classList.toggle('hidden', !show); }
  function defaultDatedSelection(mode, options) { return (mode === 'year' ? options?.years?.[0] : options?.months?.[0])?.value || null; }

  function populateBuilderControls(select, calendarRange, value, forcedMode = null) {
    const options = availableOptions();
    const parsed = StatsPeriod.parse(value);
    const mode = forcedMode || (parsed?.type === 'calendar-year' ? 'year' : 'month');
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

  function builderDatedValue(parts) {
    const year = Number(parts.yearSelect?.value);
    if (!year) return null;
    return parts.controls?.dataset.mode === 'year' ? StatsPeriod.valueForYear(year) : StatsPeriod.valueForMonth(year, Number(parts.monthSelect?.value));
  }

  function commitBuilderDated(select, calendarRange, parts, dispatch = true) {
    const value = builderDatedValue(parts);
    if (!value) return;
    setCurrentDatedOption(select, value);
    showCalendarRange(calendarRange, false);
    if (dispatch) select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function hideBuilderControls(select, calendarRange) {
    builderParts(select).controls?.classList.add('hidden');
    select?.querySelectorAll('option[data-dated-current]').forEach((option) => option.remove());
    showCalendarRange(calendarRange, true);
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
        const nextParts = populateBuilderControls(select, calendarRange, fallback, mode);
        commitBuilderDated(select, calendarRange, nextParts, false);
      } else if (StatsPeriod.isDated(select.value)) {
        populateBuilderControls(select, calendarRange, select.value);
      } else {
        hideBuilderControls(select, calendarRange);
      }
    });
    parts.yearSelect?.addEventListener('change', () => {
      if (parts.controls?.dataset.mode === 'month') replaceOptions(parts.monthSelect, monthItems(availableOptions(), parts.yearSelect.value), parts.monthSelect?.value);
      commitBuilderDated(select, calendarRange, parts);
    });
    parts.monthSelect?.addEventListener('change', () => commitBuilderDated(select, calendarRange, parts));
  }

  function primeBuilderPeriod(select, period) {
    if (!select) return;
    ensureSentinelOptions(select);
    if (StatsPeriod.isDated(period)) setCurrentDatedOption(select, period);
  }

  $('#shareLinkAction')?.addEventListener('click', () => primeBuilderPeriod($('#shareStatsPeriod'), app()?.getCurrentStatsPeriod?.()), true);
  $('#embedAction')?.addEventListener('click', () => primeBuilderPeriod($('#shareStatsPeriod'), app()?.getCurrentStatsPeriod?.()), true);
  $('#generateImageAction')?.addEventListener('click', () => primeBuilderPeriod($('#pngStatsPeriod'), app()?.getCurrentStatsPeriod?.()), true);

  function preferredShareConfig() { return root.GitbragSharePage?.getActiveConfig?.() || app()?.getShareBuilderContext?.()?.defaultConfig || null; }

  function observeDialog(dialog, select, calendarRange, configGetter, afterPopulate = null) {
    if (!dialog || !select) return;
    setupBuilder(select, calendarRange);
    const populate = () => {
      if (!dialog.open) return;
      const period = configGetter?.()?.statsPeriod || null;
      if (StatsPeriod.isDated(period)) {
        setCurrentDatedOption(select, period);
        populateBuilderControls(select, calendarRange, period);
      } else {
        hideBuilderControls(select, calendarRange);
      }
      afterPopulate?.();
    };
    const observer = new MutationObserver(populate);
    observer.observe(dialog, { attributes: true, attributeFilter: ['open'] });
  }

  observeDialog(shareModal, $('#shareStatsPeriod'), $('#shareCalendarRange'), preferredShareConfig);
  observeDialog(pngModal, $('#pngStatsPeriod'), $('#pngCalendarRange'), () => app()?.getShareBuilderContext?.()?.defaultConfig || null, () => requestAnimationFrame(() => root.GitbragPng?.renderPreview?.()));

  syncMain(app()?.getCurrentStatsPeriod?.());
})(window);
