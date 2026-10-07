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

(function attachPngUnifiedPeriod(root) {
  'use strict';

  const StatsPeriod = root.GitbragStatsPeriod;
  if (!StatsPeriod) return;

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const modal = $('#pngModal');
  const statsSelect = $('#pngStatsPeriod');
  const calendarSelect = $('#pngCalendarRange');
  if (!modal || !statsSelect) return;

  const baseApp = root.GitbragApp;

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
    if (!model?.calendar) return model?.calendar || null;
    const selection = StatsPeriod.range(period);
    if (selection.type === 'lifetime' || !selection.start || !selection.end) {
      return { ...model.calendar, label: '' };
    }

    const source = new Map((model.calendar.days || []).map((day) => [day.date, day]));
    const first = dateFromKey(selection.start);
    first.setUTCDate(first.getUTCDate() - first.getUTCDay());
    const days = [];
    let total = 0;

    for (let key = dateKeyFromDate(first); key <= selection.end; key = addDays(key, 1)) {
      const item = source.get(key) || { date: key, count: 0, level: 0 };
      const count = Number(item.count) || 0;
      if (key >= selection.start) total += count;
      days.push({
        date: key,
        count,
        level: Math.min(4, Math.max(0, Number(item.level) || 0)),
      });
    }

    return {
      label: '',
      days,
      weeks: Math.max(1, Math.ceil(days.length / 7)),
      total,
    };
  }

  if (baseApp?.createRenderModel && !baseApp.pngUnifiedPeriod) {
    root.GitbragApp = Object.freeze({
      ...baseApp,
      pngUnifiedPeriod: true,
      createRenderModel(config) {
        const period = StatsPeriod.normalize(
          config?.statsPeriod || baseApp.getCurrentStatsPeriod?.() || StatsPeriod.currentMonthValue(),
          StatsPeriod.currentMonthValue(),
        );
        const model = baseApp.createRenderModel({ ...config, statsPeriod: period, calendarRange: 'all' });
        if (model) model.calendar = exactCalendar(model, period);
        return model;
      },
    });
  }

  const statsLabel = statsSelect.closest('label');
  const calendarLabel = calendarSelect?.closest('label');
  statsLabel?.classList.add('png-period-legacy-control');
  calendarLabel?.classList.add('png-period-legacy-control');

  const fieldset = statsLabel?.closest('.png-fieldset');
  if (!fieldset || fieldset.querySelector('[data-png-unified-period]')) return;

  const periodUi = document.createElement('div');
  periodUi.className = 'png-unified-period';
  periodUi.dataset.pngUnifiedPeriod = 'true';
  periodUi.innerHTML = `
    <div class="png-unified-period-head">
      <span>Activity period</span>
      <small>Stats + calendar</small>
    </div>
    <div class="png-unified-period-control" role="group" aria-label="Image activity period">
      <button type="button" data-png-period-prev aria-label="Previous calendar month">‹</button>
      <button type="button" class="png-unified-period-current" data-png-period-current aria-haspopup="true" aria-expanded="false">Current month</button>
      <button type="button" data-png-period-next aria-label="Next calendar month">›</button>
    </div>
    <div class="png-unified-period-panel hidden" data-png-period-panel>
      <div class="png-unified-period-quick">
        <button type="button" data-png-period-shortcut="current-month">This month</button>
        <button type="button" data-png-period-shortcut="previous-month">Previous month</button>
        <button type="button" data-png-period-shortcut="current-year">This year</button>
      </div>
      <div class="png-unified-period-row">
        <span>Month</span>
        <select data-png-month aria-label="Calendar month"></select>
        <select data-png-month-year aria-label="Calendar month year"></select>
        <button type="button" data-png-view-month>View</button>
      </div>
      <div class="png-unified-period-row png-unified-period-row-year">
        <span>Year</span>
        <select data-png-year aria-label="Calendar year"></select>
        <button type="button" data-png-view-year>View</button>
      </div>
      <div class="png-unified-period-heading">Rolling</div>
      <div class="png-unified-period-rolling">
        <button type="button" data-png-rolling="day">24H</button>
        <button type="button" data-png-rolling="week">7D</button>
        <button type="button" data-png-rolling="month">30D</button>
        <button type="button" data-png-rolling="twomonths">60D</button>
        <button type="button" data-png-rolling="sixmonths">6M</button>
        <button type="button" data-png-rolling="year">1Y</button>
        <button type="button" data-png-rolling="lifetime">ALL TIME</button>
      </div>
    </div>`;
  statsLabel.insertAdjacentElement('beforebegin', periodUi);

  const currentButton = $('[data-png-period-current]', periodUi);
  const previousButton = $('[data-png-period-prev]', periodUi);
  const nextButton = $('[data-png-period-next]', periodUi);
  const panel = $('[data-png-period-panel]', periodUi);
  const monthSelect = $('[data-png-month]', periodUi);
  const monthYearSelect = $('[data-png-month-year]', periodUi);
  const yearSelect = $('[data-png-year]', periodUi);

  function app() { return root.GitbragApp || null; }
  function options() { return app()?.getStatsPeriodOptions?.() || { months: [], years: [] }; }
  function monthValues() { return (options().months || []).map((item) => item.value); }

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

  function replaceOptions(select, items, preferred = null) {
    if (!select) return;
    select.replaceChildren();
    items.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.value;
      option.textContent = item.label;
      select.append(option);
    });
    if (preferred !== null && [...select.options].some((option) => option.value === String(preferred))) {
      select.value = String(preferred);
    }
  }

  function conciseLabel(period) {
    const parsed = StatsPeriod.parse(period);
    if (parsed?.type === 'calendar-month') return `${StatsPeriod.MONTHS[parsed.month - 1]} ${parsed.year}`;
    if (parsed?.type === 'calendar-year') return String(parsed.year);
    return StatsPeriod.ROLLING[period]?.label || StatsPeriod.label(period);
  }

  function selectedPeriod() {
    if (StatsPeriod.isValid(statsSelect.value)) return statsSelect.value;
    const dashboard = app()?.getCurrentStatsPeriod?.();
    if (StatsPeriod.isValid(dashboard)) return dashboard;
    return StatsPeriod.currentMonthValue();
  }

  function ensureSelectValue(value) {
    if (![...statsSelect.options].some((option) => option.value === value)) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = StatsPeriod.label(value);
      option.dataset.pngUnifiedPeriodOption = 'true';
      statsSelect.append(option);
    }
    statsSelect.value = value;
  }

  function populateSelectors(period) {
    const parsed = StatsPeriod.parse(period);
    const fallbackMonth = StatsPeriod.parse(StatsPeriod.currentMonthValue());
    const fallbackYear = StatsPeriod.parse(StatsPeriod.currentYearValue());
    const monthYear = parsed?.type === 'calendar-month' ? parsed.year : fallbackMonth?.year;
    const month = parsed?.type === 'calendar-month' ? parsed.month : fallbackMonth?.month;
    const year = parsed?.type === 'calendar-year' ? parsed.year : (parsed?.year || fallbackYear?.year);
    replaceOptions(monthYearSelect, yearItems(), monthYear);
    replaceOptions(monthSelect, monthItems(monthYearSelect?.value || monthYear), month);
    replaceOptions(yearSelect, yearItems(), year);
  }

  function sync(period = selectedPeriod()) {
    if (!StatsPeriod.isValid(period)) period = StatsPeriod.currentMonthValue();
    currentButton.textContent = conciseLabel(period);
    currentButton.setAttribute('aria-label', `Image activity period: ${conciseLabel(period)}. Open period picker.`);

    const values = monthValues();
    const parsed = StatsPeriod.parse(period);
    const index = parsed?.type === 'calendar-month' ? values.indexOf(period) : -1;
    previousButton.disabled = index < 0 || index >= values.length - 1;
    nextButton.disabled = index <= 0;

    $$('[data-png-rolling]', periodUi).forEach((button) => {
      button.classList.toggle('active', parsed?.type === 'rolling' && button.dataset.pngRolling === period);
    });
    populateSelectors(period);
  }

  function setPeriod(period) {
    if (!StatsPeriod.isValid(period)) return;
    ensureSelectValue(period);
    if (calendarSelect && [...calendarSelect.options].some((option) => option.value === 'all')) {
      calendarSelect.value = 'all';
    }
    statsSelect.dispatchEvent(new Event('change', { bubbles: true }));
    calendarSelect?.dispatchEvent(new Event('change', { bubbles: true }));
    sync(period);
    panel.classList.add('hidden');
    currentButton.setAttribute('aria-expanded', 'false');
  }

  function shiftMonth(direction) {
    const values = monthValues();
    const index = values.indexOf(selectedPeriod());
    if (index < 0) return;
    const target = values[index + direction];
    if (target) setPeriod(target);
  }

  previousButton.addEventListener('click', () => shiftMonth(1));
  nextButton.addEventListener('click', () => shiftMonth(-1));
  currentButton.addEventListener('click', () => {
    const opening = panel.classList.contains('hidden');
    panel.classList.toggle('hidden', !opening);
    currentButton.setAttribute('aria-expanded', String(opening));
    if (opening) sync();
  });

  periodUi.addEventListener('click', (event) => {
    const shortcut = event.target.closest('[data-png-period-shortcut]');
    if (shortcut) {
      const type = shortcut.dataset.pngPeriodShortcut;
      if (type === 'current-month') setPeriod(StatsPeriod.currentMonthValue());
      else if (type === 'previous-month') setPeriod(monthValues()[1] || null);
      else if (type === 'current-year') setPeriod(StatsPeriod.currentYearValue());
      return;
    }

    const rolling = event.target.closest('[data-png-rolling]');
    if (rolling) {
      setPeriod(rolling.dataset.pngRolling);
      return;
    }

    if (event.target.closest('[data-png-view-month]')) {
      const value = StatsPeriod.valueForMonth(Number(monthYearSelect.value), Number(monthSelect.value));
      if (monthValues().includes(value)) setPeriod(value);
      return;
    }

    if (event.target.closest('[data-png-view-year]')) {
      const value = StatsPeriod.valueForYear(Number(yearSelect.value));
      if (options().years?.some((item) => item.value === value)) setPeriod(value);
    }
  });

  monthYearSelect.addEventListener('change', () => {
    replaceOptions(monthSelect, monthItems(monthYearSelect.value), monthSelect.value);
  });

  document.addEventListener('pointerdown', (event) => {
    if (panel.classList.contains('hidden') || periodUi.contains(event.target)) return;
    panel.classList.add('hidden');
    currentButton.setAttribute('aria-expanded', 'false');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || panel.classList.contains('hidden')) return;
    panel.classList.add('hidden');
    currentButton.setAttribute('aria-expanded', 'false');
    currentButton.focus();
  });

  const refreshFromBuilder = () => {
    if (!modal.open) return;
    requestAnimationFrame(() => {
      const value = selectedPeriod();
      ensureSelectValue(value);
      if (calendarSelect && [...calendarSelect.options].some((option) => option.value === 'all')) {
        calendarSelect.value = 'all';
      }
      sync(value);
      root.GitbragPng?.renderPreview?.();
    });
  };

  new MutationObserver(refreshFromBuilder).observe(modal, { attributes: true, attributeFilter: ['open'] });
  $('#generateImageAction')?.addEventListener('click', () => setTimeout(refreshFromBuilder, 0));
})(window);
