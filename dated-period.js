(function attachDatedPeriodUi(root) {
  'use strict';

  const StatsPeriod = root.GitbragStatsPeriod;
  if (!StatsPeriod) throw new Error('GitbragStatsPeriod must load before dated-period.js.');

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const mainButton = $('[data-period-picker="dated"]');
  const mainPanel = $('#datedPeriodPanel');
  const mainSelect = $('#datedPeriodSelect');
  const mainApply = $('#applyDatedPeriod');
  const shareModal = $('#shareModal');
  const pngModal = $('#pngModal');

  function addOptions(select, options, label) {
    if (!select || !options?.length) return;
    const group = document.createElement('optgroup');
    group.label = label;
    options.forEach((option) => {
      const element = document.createElement('option');
      element.value = option.value;
      element.textContent = option.label;
      group.appendChild(element);
    });
    select.appendChild(group);
  }

  function clearInjectedOptions(select) {
    if (!select) return;
    select.querySelectorAll('optgroup[data-dated-options]').forEach((group) => group.remove());
    select.querySelectorAll('option[data-dated-option]').forEach((option) => option.remove());
  }

  function injectDatedOptions(select, options, selectedValue = null) {
    if (!select) return;
    clearInjectedOptions(select);

    const appendGroup = (items, label) => {
      if (!items?.length) return;
      const group = document.createElement('optgroup');
      group.label = label;
      group.dataset.datedOptions = 'true';
      items.forEach((item) => {
        const option = document.createElement('option');
        option.value = item.value;
        option.textContent = item.label;
        option.dataset.datedOption = 'true';
        group.appendChild(option);
      });
      select.appendChild(group);
    };

    appendGroup(options?.months, 'Calendar months');
    appendGroup(options?.years, 'Calendar years');

    if (selectedValue && StatsPeriod.isDated(selectedValue)) {
      const exists = [...select.options].some((option) => option.value === selectedValue);
      if (!exists) {
        const option = document.createElement('option');
        option.value = selectedValue;
        option.textContent = StatsPeriod.label(selectedValue);
        option.dataset.datedOption = 'true';
        select.appendChild(option);
      }
      select.value = selectedValue;
    }
  }

  function currentContext() {
    return root.GitbragApp?.getShareBuilderContext?.() || null;
  }

  function populateMainPanel() {
    if (!mainSelect) return;
    const context = currentContext();
    const options = context?.datedPeriods;
    if (!options) return;

    mainSelect.innerHTML = '';
    addOptions(mainSelect, options.months, 'Calendar months');
    addOptions(mainSelect, options.years, 'Calendar years');

    const current = root.GitbragApp?.getCurrentStatsPeriod?.();
    if (StatsPeriod.isDated(current)) mainSelect.value = current;
  }

  function syncMainState(period) {
    const dated = StatsPeriod.isDated(period);
    if (mainButton) {
      mainButton.classList.toggle('active', dated);
      mainButton.setAttribute('aria-pressed', String(dated));
    }
    if (!dated) {
      mainPanel?.classList.add('hidden');
      mainButton?.setAttribute('aria-expanded', 'false');
    }
  }

  mainButton?.addEventListener('click', () => {
    populateMainPanel();
    mainPanel?.classList.toggle('hidden');
    const open = !mainPanel?.classList.contains('hidden');
    mainButton?.setAttribute('aria-expanded', String(open));
    if (open) mainSelect?.focus();
  });

  mainApply?.addEventListener('click', () => {
    const value = mainSelect?.value;
    if (!StatsPeriod.isDated(value)) return;
    root.GitbragApp?.setStatsPeriod?.(value);
    mainPanel?.classList.add('hidden');
    mainButton?.setAttribute('aria-expanded', 'false');
  });

  document.querySelector('.periods')?.addEventListener('click', (event) => {
    if (event.target.closest('button[data-period]')) {
      mainPanel?.classList.add('hidden');
      mainButton?.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('gitbrag:stats-period', (event) => {
    syncMainState(event.detail?.period);
  });

  function preferredShareConfig() {
    return root.GitbragSharePage?.getActiveConfig?.() || currentContext()?.defaultConfig || null;
  }

  function populateBuilder(select, preferred) {
    const context = currentContext();
    if (!context?.datedPeriods) return;
    const currentValue = preferred?.statsPeriod || select?.value || null;
    injectDatedOptions(select, context.datedPeriods, currentValue);
  }

  function observeDialog(dialog, select, configGetter, afterPopulate = null) {
    if (!dialog || !select) return;
    const observer = new MutationObserver(() => {
      if (!dialog.open) return;
      populateBuilder(select, configGetter());
      afterPopulate?.();
    });
    observer.observe(dialog, { attributes: true, attributeFilter: ['open'] });
  }

  observeDialog(shareModal, $('#shareStatsPeriod'), preferredShareConfig);
  observeDialog(
    pngModal,
    $('#pngStatsPeriod'),
    () => currentContext()?.defaultConfig || null,
    () => requestAnimationFrame(() => root.GitbragPng?.renderPreview?.()),
  );

  syncMainState(root.GitbragApp?.getCurrentStatsPeriod?.());
})(window);
