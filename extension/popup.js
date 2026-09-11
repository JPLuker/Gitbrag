'use strict';

const SETTINGS_KEY = 'gitbragExtensionSettings';
const DEFAULTS = Object.freeze({ enabled: true, period: 'current-month' });
const PERIODS = Object.freeze(['current-month', 'day', 'week', 'month', 'twomonths', 'sixmonths', 'year', 'lifetime']);
const enabled = document.querySelector('#enabled');
const period = document.querySelector('#period');
const clearCache = document.querySelector('#clearCache');
const status = document.querySelector('#status');

async function load() {
  const stored = await chrome.storage.sync.get(SETTINGS_KEY);
  const settings = { ...DEFAULTS, ...(stored[SETTINGS_KEY] || {}) };
  enabled.checked = settings.enabled !== false;
  period.value = PERIODS.includes(settings.period) ? settings.period : DEFAULTS.period;
}

async function save() {
  await chrome.storage.sync.set({
    [SETTINGS_KEY]: {
      enabled: enabled.checked,
      period: period.value,
    },
  });
  status.textContent = 'Saved';
  setTimeout(() => { status.textContent = ''; }, 1000);
}

enabled.addEventListener('change', save);
period.addEventListener('change', save);
clearCache.addEventListener('click', async () => {
  clearCache.disabled = true;
  status.textContent = 'Clearing…';
  try {
    const response = await chrome.runtime.sendMessage({ type: 'gitbrag:clear-cache' });
    status.textContent = response?.ok ? 'Cache cleared' : 'Could not clear cache';
  } catch {
    status.textContent = 'Could not clear cache';
  } finally {
    clearCache.disabled = false;
    setTimeout(() => { status.textContent = ''; }, 1400);
  }
});

load().catch(() => { status.textContent = 'Could not load settings'; });
