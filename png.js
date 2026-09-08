const PNG_LAYOUTS = {
  square: { ratioLabel: '1:1', w: 1080, h: 1080, className: 'layout-square' },
  portrait: { ratioLabel: '4:5', w: 1080, h: 1350, className: 'layout-portrait' },
  story: { ratioLabel: '9:16', w: 1080, h: 1920, className: 'layout-story' },
  landscape: { ratioLabel: '16:9', w: 1920, h: 1080, className: 'layout-landscape' },
  socialwide: { ratioLabel: '1.91:1', w: 1200, h: 628, className: 'layout-socialwide' },
  pinterest: { ratioLabel: '2:3', w: 1000, h: 1500, className: 'layout-pinterest' }
};

let pngLayout = 'square';
let pngRepoIds = [];
let pngRepoPickerReady = false;
let pngRendering = false;
let pngSettings = {
  avatar: true, handle: true, align: 'left', contributions: true, repoCount: true,
  stars: true, streak: true, repoName: true, repoDescription: true, repoStars: true,
  language: true, repoLabel: 'selected', calendarLabel: true, calendarRange: '6m',
  size: 'balanced', accent: 'blue', cardStyle: 'solid'
};

const pngDefaults = { ...pngSettings };
const png$ = id => document.getElementById(id);

function pngData() { return window.gitbragState?.data || null; }
function pngPeriod() { return window.gitbragState?.period || 'week'; }
function pngSelected() { return Object.fromEntries([...document.querySelectorAll('[data-module]')].map(element => [element.dataset.module, element.checked])); }

function pngReadSettings() {
  const get = id => png$(id);
  pngSettings = {
    avatar: get('setAvatar')?.checked ?? pngDefaults.avatar,
    handle: get('setHandle')?.checked ?? pngDefaults.handle,
    align: get('setAlign')?.value ?? pngDefaults.align,
    contributions: get('setContributions')?.checked ?? pngDefaults.contributions,
    repoCount: get('setRepoCount')?.checked ?? pngDefaults.repoCount,
    stars: get('setStars')?.checked ?? pngDefaults.stars,
    streak: get('setStreak')?.checked ?? pngDefaults.streak,
    repoName: get('setRepoName')?.checked ?? pngDefaults.repoName,
    repoDescription: get('setRepoDescription')?.checked ?? pngDefaults.repoDescription,
    repoStars: get('setRepoStars')?.checked ?? pngDefaults.repoStars,
    language: get('setLanguage')?.checked ?? pngDefaults.language,
    repoLabel: get('setRepoLabel')?.value ?? pngDefaults.repoLabel,
    calendarLabel: get('setCalendarLabel')?.checked ?? pngDefaults.calendarLabel,
    calendarRange: get('setCalendarRange')?.value ?? pngDefaults.calendarRange,
    size: get('setSize')?.value ?? pngDefaults.size,
    accent: get('setAccent')?.value ?? pngDefaults.accent,
    cardStyle: get('setCardStyle')?.value ?? pngDefaults.cardStyle
  };
  return pngSettings;
}

function pngRepoKey(repo) { return String(repo.id ?? repo.name); }
function pngRepos() {
  return [...(pngData()?.repos || [])].filter(repo => !repo.fork).sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0));
}

function pngRepoPicker() {
  const picker = png$('repoPicker');
  if (!picker || !pngData()?.repos?.length) return;
  const ranked = pngRepos();
  const available = new Set(ranked.map(pngRepoKey));
  pngRepoIds = pngRepoIds.filter(key => available.has(key));
  if (!pngRepoPickerReady) {
    pngRepoIds = ranked.slice(0, 4).map(pngRepoKey);
    pngRepoPickerReady = true;
  }
  picker.classList.toggle('hidden', !pngSelected().repos);
  picker.innerHTML = `<div class="repo-picker-head"><div><b>Choose repositories</b><small>Select up to 4 repositories to feature.</small></div><span>${pngRepoIds.length}/4</span></div><div class="repo-picker-list">${ranked.map(repo => {
    const key = pngRepoKey(repo);
    const checked = pngRepoIds.includes(key);
    const disabled = !checked && pngRepoIds.length >= 4;
    return `<label class="repo-choice"><input type="checkbox" data-png-repo-key="${esc(key)}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}><span><b>${esc(repo.name)}</b><small>★ ${fmt(repo.stargazers_count || 0)} · ${esc(repo.language || 'Unknown')}</small></span></label>`;
  }).join('')}</div>`;
  picker.querySelectorAll('[data-png-repo-key]').forEach(box => box.addEventListener('change', () => {
    const key = box.dataset.pngRepoKey;
    if (box.checked) {
      if (pngRepoIds.length < 4 && !pngRepoIds.includes(key)) pngRepoIds.push(key);
    } else pngRepoIds = pngRepoIds.filter(item => item !== key);
    pngRepoPicker();
    pngRefresh();
  }));
}

function pngTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function pngPeriodStart(selectedPeriod) {
  const days = { day: 1, week: 7, month: 30, sixmonths: 182, year: 365 }[selectedPeriod];
  if (!days) return '0000-01-01';
  const date = new Date(`${pngTodayKey()}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days + 1);
  return date.toISOString().slice(0, 10);
}

function pngLongestStreak() {
  const selectedPeriod = pngPeriod();
  if (selectedPeriod === 'lifetime') return 0;
  const start = pngPeriodStart(selectedPeriod);
  const end = pngTodayKey();
  const items = (pngData()?.contributionData?.contributions || []).filter(item => item.date >= start && item.date <= end).sort((a, b) => a.date.localeCompare(b.date));
  let best = 0;
  let run = 0;
  let previous = null;
  for (const item of items) {
    const current = new Date(`${item.date}T00:00:00Z`);
    const contiguous = previous && current.getTime() - previous.getTime() === 86400000;
    run = Number(item.count) > 0 ? (contiguous ? run + 1 : 1) : 0;
    best = Math.max(best, run);
    previous = current;
  }
  return best;
}

function pngCalendarMarkup() {
  const map = new Map((pngData()?.contributionData?.contributions || []).map(item => [item.date, item]));
  const today = pngTodayKey();
  const ranges = { '1m': 30, '3m': 91, '6m': 182, '1y': 365, '2y': 730 };
  let days = ranges[pngSettings.calendarRange] ?? 182;
  if (pngSettings.calendarRange === 'all') {
    const dates = [...map.keys()].filter(Boolean).sort();
    days = dates.length ? Math.max(30, Math.round((new Date(`${dates.at(-1)}T00:00:00Z`) - new Date(`${dates[0]}T00:00:00Z`)) / 86400000) + 1) : 182;
  }
  const end = new Date(`${today}T00:00:00Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days + 1);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());
  const total = Math.ceil((days + start.getUTCDay()) / 7) * 7;
  const cells = [];
  for (let index = 0; index < total; index += 1) {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    if (key > today) break;
    const item = map.get(key) || { level: 0 };
    cells.push(`<i class="level-${item.level}"></i>`);
  }
  return { cells: cells.join(''), weeks: Math.max(1, Math.ceil(cells.length / 7)) };
}

function pngStatsMarkup() {
  const data = pngData();
  if (!data) return '';
  const selectedPeriod = pngPeriod();
  const contributions = selectedPeriod === 'lifetime'
    ? Object.values(data.contributionData?.total || {}).reduce((sum, value) => sum + Number(value || 0), 0)
    : (data.contributionData?.contributions || []).filter(item => item.date >= pngPeriodStart(selectedPeriod) && item.date <= pngTodayKey()).reduce((sum, item) => sum + Number(item.count || 0), 0);
  const items = [];
  if (pngSettings.contributions) items.push([fmt(contributions), 'CONTRIBUTIONS']);
  if (pngSettings.repoCount) items.push([fmt(data.user.public_repos), 'PUBLIC REPOS']);
  if (pngSettings.stars) items.push([fmt(pngRepos().reduce((sum, repo) => sum + (repo.stargazers_count || 0), 0)), 'STARS']);
  if (pngSettings.streak) items.push([fmt(pngLongestStreak()), 'LONGEST STREAK']);
  return items.map(item => `<div><b>${item[0]}</b><span>${item[1]}</span></div>`).join('');
}

function pngRepoMarkup() {
  const selected = new Set(pngRepoIds);
  return pngRepos().filter(repo => selected.has(pngRepoKey(repo))).slice(0, 4).map(repo => {
    const meta = [];
    if (pngSettings.repoStars) meta.push(`★ ${fmt(repo.stargazers_count || 0)}`);
    if (pngSettings.language) meta.push(esc(repo.language || 'Unknown'));
    const description = pngSettings.repoDescription && repo.description ? `<p>${esc(repo.description)}</p>` : '';
    return `<div>${pngSettings.repoName ? `<b>${esc(repo.name)}</b>` : ''}${description}${meta.length ? `<span>${meta.join(' · ')}</span>` : ''}</div>`;
  }).join('');
}

function pngBuild() {
  const data = pngData();
  if (!data) return PNG_LAYOUTS[pngLayout];
  const modules = pngSelected();
  pngReadSettings();
  const parts = [];
  if (modules.profile) {
    const avatar = pngSettings.avatar && avatarDataUrl ? `<img src="${avatarDataUrl}" alt="">` : '';
    parts.push(`<div class="share-profile align-${pngSettings.align}">${pngSettings.avatar ? `<div class="share-avatar-ring">${avatar}</div>` : ''}<div class="share-profile-copy"><div class="share-name">${esc(data.user.name || data.user.login)}</div>${pngSettings.handle ? `<div class="share-handle">@${esc(data.user.login)}</div>` : ''}</div></div>`);
  }
  if (modules.stats) {
    const stats = pngStatsMarkup();
    if (stats) parts.push(`<div class="share-stats">${stats}</div>`);
  }
  if (modules.calendar) {
    const calendar = pngCalendarMarkup();
    const labels = { all: 'ALL AVAILABLE', '2y': 'LAST 2 YEARS', '1y': 'LAST YEAR', '3m': 'LAST 3 MONTHS', '1m': 'LAST MONTH', '6m': 'LAST 6 MONTHS' };
    parts.push(`<div class="share-section share-calendar-module"><div class="share-section-head"><span>${pngSettings.calendarLabel ? 'CONTRIBUTION ACTIVITY' : ''}</span><small>${pngSettings.calendarLabel ? labels[pngSettings.calendarRange] : ''}</small></div><div class="share-calendar" style="--calendar-cols:${calendar.weeks}">${calendar.cells}</div></div>`);
  }
  if (modules.repos) {
    const label = pngSettings.repoLabel === 'none' ? '' : pngSettings.repoLabel === 'top' ? 'TOP REPOSITORIES' : 'REPOSITORIES';
    parts.push(`<div class="share-section share-repos-module"><div class="share-section-head"><span>${label}</span><small>${pngSettings.repoLabel === 'selected' ? 'SELECTED' : ''}</small></div><div class="share-repos">${pngRepoMarkup()}</div></div>`);
  }
  parts.push(`<div class="share-brand"><strong>GIT<span>BRAG</span></strong><small>github.com/${esc(data.user.login)}</small></div>`);
  const layout = PNG_LAYOUTS[pngLayout];
  const activeModules = ['profile', 'stats', 'calendar', 'repos'].filter(key => modules[key]);
  const card = png$('shareCard');
  card.className = `share-card ${layout.className} modules-${activeModules.length} mods-${activeModules.join('-') || 'none'} size-${pngSettings.size} accent-${pngSettings.accent} card-${pngSettings.cardStyle}`;
  card.style.width = `${layout.w}px`;
  card.style.height = `${layout.h}px`;
  card.style.setProperty('--png-w', `${layout.w}px`);
  card.style.setProperty('--png-h', `${layout.h}px`);
  card.innerHTML = `<div class="share-content">${parts.join('')}</div>`;
  return layout;
}

function pngPreview() {
  const preview = png$('sharePreview');
  const source = png$('shareCard');
  if (!preview || !source || !pngData()) return;
  const layout = pngBuild();
  const availableWidth = Math.max(1, preview.clientWidth - 24);
  const scale = availableWidth / layout.w;
  preview.style.height = `${Math.ceil(layout.h * scale) + 24}px`;
  preview.style.aspectRatio = `${layout.w} / ${layout.h}`;
  preview.innerHTML = '';
  const clone = source.cloneNode(true);
  clone.removeAttribute('id');
  clone.classList.add('preview-card');
  clone.style.width = `${layout.w}px`;
  clone.style.height = `${layout.h}px`;
  clone.style.transform = `scale(${scale})`;
  clone.style.transformOrigin = 'top left';
  preview.appendChild(clone);
}

function pngRefresh() {
  if (png$('pngModal')?.classList.contains('hidden')) return;
  requestAnimationFrame(pngPreview);
}

function pngOpen() {
  pngReadSettings();
  pngRepoPicker();
  png$('pngModal').classList.remove('hidden');
  png$('pngModal').setAttribute('aria-hidden', 'false');
  requestAnimationFrame(pngPreview);
}

function pngClose() {
  const modal = png$('pngModal');
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  png$('pngBtn')?.focus();
}

async function pngDownload() {
  if (pngRendering) return;
  pngRendering = true;
  const button = png$('downloadPng');
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = 'Rendering PNG…';
  const layout = pngBuild();
  const source = png$('shareCard');
  const clone = source.cloneNode(true);
  clone.removeAttribute('id');
  clone.classList.add('export-card');
  clone.style.width = `${layout.w}px`;
  clone.style.height = `${layout.h}px`;
  clone.style.position = 'fixed';
  clone.style.left = '-100000px';
  clone.style.top = '0';
  document.body.appendChild(clone);
  try {
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (!window.modernScreenshot?.domToPng) throw new Error('PNG renderer failed to load. Refresh the page and try again.');
    const dataUrl = await window.modernScreenshot.domToPng(clone, { width: layout.w, height: layout.h, scale: 1, backgroundColor: '#09090b' });
    const link = document.createElement('a');
    link.download = `${pngData().user.login}-gitbrag-${pngLayout}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    console.error('Gitbrag PNG export failed:', error);
    alert(`Could not create the PNG. ${error?.message || 'Please try again.'}`);
  } finally {
    clone.remove();
    button.disabled = false;
    button.textContent = originalLabel;
    pngRendering = false;
  }
}

function pngShareLink() { return `${location.href.split('#')[0]}#/${encodeURIComponent(pngData().user.login)}`; }

function pngInitShareMenu() {
  const button = png$('shareBtn');
  const menu = png$('shareMenu');
  if (!button || !menu) return;
  const close = () => menu.classList.add('hidden');
  button.addEventListener('click', event => { event.stopPropagation(); menu.classList.toggle('hidden'); });
  png$('copyShareLink')?.addEventListener('click', async () => {
    const url = pngShareLink();
    try { await navigator.clipboard.writeText(url); png$('copyShareLink').textContent = 'Copied'; }
    catch { prompt('Copy your Gitbrag link:', url); }
    setTimeout(() => { if (png$('copyShareLink')) png$('copyShareLink').textContent = 'Copy link'; }, 1200);
    close();
  });
  png$('shareGeneratePng')?.addEventListener('click', () => { close(); pngOpen(); });
  document.addEventListener('click', event => { if (!menu.contains(event.target) && event.target !== button) close(); });
}

function pngInit() {
  const pills = png$('pngRatios');
  if (pills) {
    pills.innerHTML = Object.entries(PNG_LAYOUTS).map(([key, layout]) => `<button type="button" class="ratio-pill${key === pngLayout ? ' active' : ''}" data-ratio="${key}">${layout.ratioLabel}</button>`).join('');
    pills.querySelectorAll('.ratio-pill').forEach(button => button.addEventListener('click', () => {
      pngLayout = button.dataset.ratio;
      pills.querySelectorAll('.ratio-pill').forEach(item => item.classList.toggle('active', item === button));
      pngRefresh();
    }));
  }
  document.querySelectorAll('[data-module]').forEach(input => input.addEventListener('change', () => {
    if (input.dataset.module === 'repos') pngRepoPicker();
    pngRefresh();
  }));
  document.querySelectorAll('.module-settings input, .module-settings select, .png-settings input, .png-settings select').forEach(input => input.addEventListener('change', () => {
    pngReadSettings();
    if (input.closest('.repo-settings')) pngRepoPicker();
    pngRefresh();
  }));
  png$('pngBtn').onclick = pngOpen;
  png$('closePng').onclick = pngClose;
  document.querySelector('.modal-backdrop').onclick = pngClose;
  png$('downloadPng').onclick = pngDownload;
  const preview = png$('sharePreview');
  if (preview && 'ResizeObserver' in window) new ResizeObserver(() => pngRefresh()).observe(preview);
  pngInitShareMenu();
}

window.pngBuild = pngBuild;
window.pngPreview = pngPreview;
window.pngRefresh = pngRefresh;
window.pngOpen = pngOpen;
window.pngClose = pngClose;
pngInit();
