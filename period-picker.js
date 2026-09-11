(function attachPeriodPicker(root) {
  'use strict';

  const StatsPeriod = root.GitbragStatsPeriod;
  if (!StatsPeriod) throw new Error('GitbragStatsPeriod must load before period-picker.js.');

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const wrap = $('.period-picker-wrap');
  const button = $('#periodPickerButton');
  const label = $('#periodPickerLabel');
  const panel = $('#periodPickerPanel');
  const previousButton = $('#periodPrev');
  const nextButton = $('#periodNext');
  const thisMonthLabel = $('#periodThisMonthLabel');
  const previousMonthLabel = $('#periodPreviousMonthLabel');
  const currentYearLabel = $('#periodCurrentYearLabel');
  const chooseMonthToggle = $('#chooseMonthToggle');
  const chooseYearToggle = $('#chooseYearToggle');
  const customMonthPanel = $('#customMonthPanel');
  const customYearPanel = $('#customYearPanel');
  const customMonthSelect = $('#customMonthSelect');
  const customMonthYearSelect = $('#customMonthYearSelect');
  const customYearSelect = $('#customYearSelect');
  const applyCustomMonth = $('#applyCustomMonth');
  const applyCustomYear = $('#applyCustomYear');

  let defaultedRoute = null;

  function app() { return root.GitbragApp || null; }
  function options() { return app()?.getStatsPeriodOptions?.() || { months: [], years: [] }; }

  function yearItems() {
    return (options().years || []).map((item) => {
      const parsed = StatsPeriod.parse(item.value);
      return parsed ? { value: String(parsed.year), label: String(parsed.year) } : null;
    }).filter(Boolean);
  }

  function monthItems(year) {
    return (options().months || []).map((item) => {
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

  function conciseLabel(period) {
    const parsed = StatsPeriod.parse(period);
    if (parsed?.type === 'calendar-month') return `${StatsPeriod.MONTHS[parsed.month - 1]} ${parsed.year}`;
    if (parsed?.type === 'calendar-year') return String(parsed.year);
    return StatsPeriod.ROLLING[period]?.label || StatsPeriod.label(period);
  }

  function monthValues() {
    return (options().months || []).map((item) => item.value);
  }

  function closeCustomPanels() {
    customMonthPanel?.classList.add('hidden');
    customYearPanel?.classList.add('hidden');
    chooseMonthToggle?.setAttribute('aria-expanded', 'false');
    chooseYearToggle?.setAttribute('aria-expanded', 'false');
  }

  function closePicker() {
    panel?.classList.add('hidden');
    button?.setAttribute('aria-expanded', 'false');
    closeCustomPanels();
  }

  function populateCustomMonth(period = app()?.getCurrentStatsPeriod?.()) {
    const parsed = StatsPeriod.parse(period);
    const fallback = StatsPeriod.parse(StatsPeriod.currentMonthValue());
    const year = parsed?.type === 'calendar-month' ? parsed.year : fallback?.year;
    const month = parsed?.type === 'calendar-month' ? parsed.month : fallback?.month;
    replaceOptions(customMonthYearSelect, yearItems(), year);
    replaceOptions(customMonthSelect, monthItems(customMonthYearSelect?.value || year), month);
  }

  function populateCustomYear(period = app()?.getCurrentStatsPeriod?.()) {
    const parsed = StatsPeriod.parse(period);
    const fallback = StatsPeriod.parse(StatsPeriod.currentYearValue());
    const year = parsed?.type === 'calendar-year' ? parsed.year : fallback?.year;
    replaceOptions(customYearSelect, yearItems(), year);
  }

  function syncShortcutLabels() {
    const currentMonth = StatsPeriod.currentMonthValue();
    const previousMonth = options().months?.find((item) => item.value !== currentMonth)?.value || null;
    const currentYear = StatsPeriod.currentYearValue();

    if (thisMonthLabel) thisMonthLabel.textContent = conciseLabel(currentMonth);
    if (previousMonthLabel) previousMonthLabel.textContent = previousMonth ? conciseLabel(previousMonth) : 'Unavailable';
    if (currentYearLabel) currentYearLabel.textContent = conciseLabel(currentYear);

    const previousShortcut = panel?.querySelector('[data-period-shortcut="previous-month"]');
    if (previousShortcut) {
      previousShortcut.disabled = !previousMonth;
      previousShortcut.dataset.periodValue = previousMonth || '';
    }
  }

  function syncArrowState(period) {
    const values = monthValues();
    const parsed = StatsPeriod.parse(period);
    const index = parsed?.type === 'calendar-month' ? values.indexOf(period) : -1;
    if (previousButton) previousButton.disabled = index < 0 || index >= values.length - 1;
    if (nextButton) nextButton.disabled = index <= 0;
  }

  function sync(period) {
    if (!period || !StatsPeriod.isValid(period)) return;
    const display = conciseLabel(period);
    if (label) label.textContent = display;
    if (button) button.setAttribute('aria-label', `Activity period: ${display}. Open period picker.`);
    syncArrowState(period);
    syncShortcutLabels();

    // The picker is the dashboard's single period label. Shared/PNG output still
    // carries its own one-time period label because it has no interactive picker.
    const dashboardPeriodLabel = $('#periodLabel');
    if (dashboardPeriodLabel) dashboardPeriodLabel.textContent = '';

    panel?.querySelectorAll('[data-rolling-period]').forEach((rollingButton) => {
      rollingButton.classList.toggle('active', rollingButton.dataset.rollingPeriod === period);
    });

    panel?.querySelectorAll('[data-period-shortcut]').forEach((shortcut) => {
      let value = '';
      if (shortcut.dataset.periodShortcut === 'current-month') value = StatsPeriod.currentMonthValue();
      else if (shortcut.dataset.periodShortcut === 'previous-month') value = shortcut.dataset.periodValue || '';
      else if (shortcut.dataset.periodShortcut === 'current-year') value = StatsPeriod.currentYearValue();
      shortcut.classList.toggle('active', value === period);
    });
  }

  function openPicker() {
    sync(app()?.getCurrentStatsPeriod?.());
    panel?.classList.remove('hidden');
    button?.setAttribute('aria-expanded', 'true');
  }

  function selectPeriod(period) {
    if (!period || !StatsPeriod.isValid(period)) return;
    app()?.setStatsPeriod?.(period);
    closePicker();
  }

  function shiftCalendarMonth(direction) {
    const period = app()?.getCurrentStatsPeriod?.();
    const values = monthValues();
    const index = values.indexOf(period);
    if (index < 0) return;
    const target = values[index + direction];
    if (target) app()?.setStatsPeriod?.(target);
  }

  button?.addEventListener('click', () => {
    if (panel?.classList.contains('hidden')) openPicker();
    else closePicker();
  });
  previousButton?.addEventListener('click', () => shiftCalendarMonth(1));
  nextButton?.addEventListener('click', () => shiftCalendarMonth(-1));

  panel?.addEventListener('click', (event) => {
    const shortcut = event.target.closest('[data-period-shortcut]');
    if (shortcut) {
      if (shortcut.dataset.periodShortcut === 'current-month') selectPeriod(StatsPeriod.currentMonthValue());
      else if (shortcut.dataset.periodShortcut === 'previous-month') selectPeriod(shortcut.dataset.periodValue || null);
      else if (shortcut.dataset.periodShortcut === 'current-year') selectPeriod(StatsPeriod.currentYearValue());
      return;
    }

    const rolling = event.target.closest('[data-rolling-period]');
    if (rolling && StatsPeriod.ROLLING[rolling.dataset.rollingPeriod]) {
      selectPeriod(rolling.dataset.rollingPeriod);
    }
  });

  chooseMonthToggle?.addEventListener('click', () => {
    const opening = customMonthPanel?.classList.contains('hidden');
    closeCustomPanels();
    if (!opening) return;
    populateCustomMonth();
    customMonthPanel?.classList.remove('hidden');
    chooseMonthToggle.setAttribute('aria-expanded', 'true');
    customMonthSelect?.focus();
  });

  chooseYearToggle?.addEventListener('click', () => {
    const opening = customYearPanel?.classList.contains('hidden');
    closeCustomPanels();
    if (!opening) return;
    populateCustomYear();
    customYearPanel?.classList.remove('hidden');
    chooseYearToggle.setAttribute('aria-expanded', 'true');
    customYearSelect?.focus();
  });

  customMonthYearSelect?.addEventListener('change', () => {
    replaceOptions(customMonthSelect, monthItems(customMonthYearSelect.value), customMonthSelect?.value);
  });

  applyCustomMonth?.addEventListener('click', () => {
    const value = StatsPeriod.valueForMonth(Number(customMonthYearSelect?.value), Number(customMonthSelect?.value));
    if (value && monthValues().includes(value)) selectPeriod(value);
  });

  applyCustomYear?.addEventListener('click', () => {
    const value = StatsPeriod.valueForYear(Number(customYearSelect?.value));
    if (value && options().years?.some((item) => item.value === value)) selectPeriod(value);
  });

  document.addEventListener('pointerdown', (event) => {
    if (!panel || panel.classList.contains('hidden')) return;
    if (!wrap?.contains(event.target)) closePicker();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || panel?.classList.contains('hidden')) return;
    closePicker();
    button?.focus();
  });

  document.addEventListener('gitbrag:stats-period', (event) => {
    const period = event.detail?.period;
    const context = app()?.getShareBuilderContext?.();
    const routeKey = location.hash.split('?')[0] || location.pathname;
    // dated-period.js converts the first rolling default to current month on a
    // new profile. Mirror that once per profile, but do not mask a later 30D choice.
    if (context && defaultedRoute !== routeKey && period === StatsPeriod.DEFAULT_PERIOD) {
      defaultedRoute = routeKey;
      sync(StatsPeriod.currentMonthValue());
      return;
    }
    sync(period);
  });
})(window);
