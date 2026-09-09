(function attachPngGenerator(root) {
  'use strict';

  const ShareConfig = root.GitbragShareConfig;
  if (!ShareConfig) throw new Error('GitbragShareConfig must load before png.js.');

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  const SIZE = 1080;
  const elements = {
    action: $('#generateImageAction'),
    menu: $('#shareMenu'),
    shareButton: $('#shareBtn'),
    modal: $('#pngModal'),
    close: $('#closePngModal'),
    cancel: $('#cancelPngModal'),
    download: $('#downloadPng'),
    canvas: $('#pngCanvas'),
    status: $('#pngStatus'),
    repoPicker: $('#pngRepoPicker'),
    profileToggle: $('#pngProfile'),
    statsToggle: $('#pngStats'),
    calendarToggle: $('#pngCalendar'),
    reposToggle: $('#pngRepos'),
    statsPeriod: $('#pngStatsPeriod'),
    calendarRange: $('#pngCalendarRange'),
    textSize: $('#pngTextSize'),
    accent: $('#pngAccent'),
    cardStyle: $('#pngCardStyle'),
  };

  let repoOptions = [];
  let renderSequence = 0;
  const avatarCache = new Map();

  function formatNumber(value) {
    return new Intl.NumberFormat().format(Number(value) || 0);
  }

  function selectedRepoIds() {
    return $$('input[data-png-repo]', elements.repoPicker)
      .filter((input) => input.checked)
      .map((input) => input.dataset.pngRepo)
      .slice(0, ShareConfig.MAX_SELECTED_REPOS);
  }

  function updateRepoPickerState() {
    const checked = $$('input[data-png-repo]:checked', elements.repoPicker);
    const atLimit = checked.length >= ShareConfig.MAX_SELECTED_REPOS;
    $$('input[data-png-repo]', elements.repoPicker).forEach((input) => {
      input.disabled = atLimit && !input.checked;
    });
    const count = $('#pngRepoCount', elements.repoPicker);
    if (count) count.textContent = `${checked.length}/${ShareConfig.MAX_SELECTED_REPOS}`;
  }

  function renderRepoPicker(selectedIds) {
    const selected = new Set(selectedIds.map(String));
    elements.repoPicker.innerHTML = `
      <div class="png-repo-head">
        <div><b>Featured repositories</b><small>Select up to ${ShareConfig.MAX_SELECTED_REPOS}.</small></div>
        <span id="pngRepoCount">0/${ShareConfig.MAX_SELECTED_REPOS}</span>
      </div>
      <div class="png-repo-list">
        ${repoOptions.map((repo) => {
          const id = String(repo.id ?? repo.name);
          return `
            <label class="png-repo-choice">
              <input type="checkbox" data-png-repo="${id.replace(/"/g, '&quot;')}" ${selected.has(id) ? 'checked' : ''}>
              <span><b>${escapeHtml(repo.name)}</b><small>★ ${formatNumber(repo.stargazers_count)} · ${escapeHtml(repo.language || 'Unknown')}</small></span>
            </label>`;
        }).join('') || '<p class="png-empty">No original public repositories available.</p>'}
      </div>`;

    elements.repoPicker.onchange = (event) => {
      if (!event.target.matches('input[data-png-repo]')) return;
      updateRepoPickerState();
      scheduleRender();
    };
    updateRepoPickerState();
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
  }

  function setValues(config) {
    const normalized = ShareConfig.normalize(config);
    elements.profileToggle.checked = normalized.modules.profile;
    elements.statsToggle.checked = normalized.modules.stats;
    elements.calendarToggle.checked = normalized.modules.calendar;
    elements.reposToggle.checked = normalized.modules.repos;
    elements.statsPeriod.value = normalized.statsPeriod;
    elements.calendarRange.value = normalized.calendarRange;
    elements.textSize.value = normalized.appearance.textSize;
    elements.accent.value = normalized.appearance.accent;
    elements.cardStyle.value = normalized.appearance.cardStyle;
    renderRepoPicker(normalized.selectedRepos);
    elements.repoPicker.closest('.png-fieldset')?.classList.toggle('is-disabled', !normalized.modules.repos);
  }

  function readValues() {
    return ShareConfig.normalize({
      modules: {
        profile: elements.profileToggle.checked,
        stats: elements.statsToggle.checked,
        calendar: elements.calendarToggle.checked,
        repos: elements.reposToggle.checked,
      },
      statsPeriod: elements.statsPeriod.value,
      calendarRange: elements.calendarRange.value,
      selectedRepos: selectedRepoIds(),
      appearance: {
        textSize: elements.textSize.value,
        accent: elements.accent.value,
        cardStyle: elements.cardStyle.value,
      },
    });
  }

  function closeMenu() {
    elements.menu?.classList.add('hidden');
    elements.shareButton?.setAttribute('aria-expanded', 'false');
  }

  async function openBuilder() {
    const app = root.GitbragApp;
    const context = app?.getShareBuilderContext?.();
    if (!context) return;
    repoOptions = context.repos;
    setValues(context.defaultConfig);
    closeMenu();
    elements.modal.showModal();
    elements.profileToggle.focus();
    await renderPreview();
  }

  function closeBuilder() {
    if (elements.modal?.open) elements.modal.close();
  }

  function scheduleRender() {
    const sequence = ++renderSequence;
    root.setTimeout(() => {
      if (sequence === renderSequence) renderPreview();
    }, 40);
  }

  function cssAccent(config) {
    const fixed = {
      blue: '#3da9ff',
      white: '#f5f5f7',
      cyan: '#22d3ee',
      purple: '#a78bfa',
      green: '#4ade80',
    };
    if (fixed[config.appearance.accent]) return fixed[config.appearance.accent];
    return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#3da9ff';
  }

  function palette(config) {
    const accent = cssAccent(config);
    const style = config.appearance.cardStyle;
    return {
      bg: '#09090b',
      text: '#f5f5f7',
      muted: '#92929b',
      subtle: '#686870',
      accent,
      line: '#29292f',
      panel: style === 'outline' ? '#09090b' : style === 'glass' ? '#17171d' : '#121216',
    };
  }

  function textScale(config) {
    return { compact: .9, balanced: 1, large: 1.08, huge: 1.16 }[config.appearance.textSize] || 1;
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function drawPanel(ctx, p, x, y, width, height, radius = 18) {
    roundedRect(ctx, x, y, width, height, radius);
    ctx.fillStyle = p.panel;
    ctx.fill();
    ctx.strokeStyle = p.line;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function font(ctx, size, weight = 500) {
    ctx.font = `${weight} ${Math.round(size)}px Inter, Arial, sans-serif`;
  }

  function fitText(ctx, text, maxWidth) {
    const value = String(text || '');
    if (ctx.measureText(value).width <= maxWidth) return value;
    let result = value;
    while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) result = result.slice(0, -1);
    return `${result}…`;
  }

  function wrapText(ctx, text, maxWidth, maxLines = 2) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    while (words.length && lines.length < maxLines) {
      const word = words.shift();
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth) {
        line = candidate;
      } else if (line) {
        lines.push(line);
        line = word;
      } else {
        lines.push(fitText(ctx, word, maxWidth));
      }
    }
    if (line && lines.length < maxLines) lines.push(line);
    if (words.length && lines.length) lines[lines.length - 1] = fitText(ctx, `${lines[lines.length - 1]}…`, maxWidth);
    return lines;
  }

  function drawSectionTitle(ctx, p, left, right, x, y, width, scale) {
    ctx.fillStyle = p.muted;
    font(ctx, 13 * scale, 800);
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(left, x, y);
    const rightText = String(right || '');
    ctx.fillText(rightText, x + width - ctx.measureText(rightText).width, y);
  }

  async function getAvatar(url) {
    if (!url) return null;
    if (avatarCache.has(url)) return avatarCache.get(url);
    const promise = new Promise((resolve) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = url;
    });
    avatarCache.set(url, promise);
    return promise;
  }

  function drawAvatar(ctx, image, p, x, y, size, fallbackText) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    if (image) {
      const sourceRatio = image.width / image.height;
      const targetRatio = 1;
      let sx = 0, sy = 0, sw = image.width, sh = image.height;
      if (sourceRatio > targetRatio) {
        sw = image.height;
        sx = (image.width - sw) / 2;
      } else {
        sh = image.width;
        sy = (image.height - sh) / 2;
      }
      ctx.drawImage(image, sx, sy, sw, sh, x, y, size, size);
    } else {
      ctx.fillStyle = p.accent;
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = p.bg;
      font(ctx, size * .32, 800);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(fallbackText || '?').slice(0, 2).toUpperCase(), x + size / 2, y + size / 2);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }
    ctx.restore();
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawBrand(ctx, p) {
    font(ctx, 18, 800);
    const gitWidth = ctx.measureText('GIT').width;
    const bragWidth = ctx.measureText('BRAG').width;
    const start = 1000 - gitWidth - bragWidth;
    ctx.textAlign = 'left';
    ctx.fillStyle = p.text;
    ctx.fillText('GIT', start, 76);
    ctx.fillStyle = p.accent;
    ctx.fillText('BRAG', start + gitWidth, 76);
  }

  function drawProfile(ctx, p, model, image, x, y, width, scale) {
    const avatarSize = 88;
    drawAvatar(ctx, image, p, x, y, avatarSize, model.user.displayName);
    ctx.fillStyle = p.text;
    font(ctx, 40 * scale, 800);
    const name = fitText(ctx, model.user.displayName, width - avatarSize - 28);
    ctx.fillText(name, x + avatarSize + 22, y + 42);
    ctx.fillStyle = p.muted;
    font(ctx, 18 * scale, 500);
    const handle = `@${model.user.login}${model.user.bio ? ` · ${model.user.bio}` : ''}`;
    ctx.fillText(fitText(ctx, handle, width - avatarSize - 28), x + avatarSize + 22, y + 72);
    return y + avatarSize;
  }

  function drawStats(ctx, p, model, x, y, width, scale) {
    drawSectionTitle(ctx, p, 'ACTIVITY SUMMARY', model.stats.periodLabel.toUpperCase(), x, y + 14, width, scale);
    const top = y + 34;
    const gap = 12;
    const cardWidth = (width - gap * 3) / 4;
    const cardHeight = 142;
    model.stats.cards.forEach((card, index) => {
      const cx = x + index * (cardWidth + gap);
      drawPanel(ctx, p, cx, top, cardWidth, cardHeight, 16);
      ctx.fillStyle = p.muted;
      font(ctx, 11 * scale, 800);
      ctx.fillText(card.label, cx + 16, top + 28);
      ctx.fillStyle = p.text;
      font(ctx, 34 * scale, 800);
      ctx.fillText(fitText(ctx, card.value, cardWidth - 32), cx + 16, top + 78);
      ctx.fillStyle = p.muted;
      font(ctx, 10 * scale, 500);
      const lines = wrapText(ctx, card.note, cardWidth - 32, 2);
      lines.forEach((line, lineIndex) => ctx.fillText(line, cx + 16, top + 108 + lineIndex * 15));
    });
    return top + cardHeight;
  }

  function drawCalendar(ctx, p, model, x, y, width, scale) {
    drawSectionTitle(ctx, p, 'CONTRIBUTION CALENDAR', model.calendar.label, x, y + 14, width, scale);
    const top = y + 34;
    const height = 150;
    drawPanel(ctx, p, x, top, width, height, 16);

    if (model.contributionError) {
      ctx.fillStyle = p.muted;
      font(ctx, 17 * scale, 600);
      ctx.textAlign = 'center';
      ctx.fillText('Contribution calendar unavailable.', x + width / 2, top + height / 2);
      ctx.textAlign = 'left';
      return top + height;
    }

    const weeks = Math.max(1, model.calendar.weeks);
    const innerWidth = width - 44;
    let gap = weeks > 180 ? 0 : weeks > 80 ? 1 : weeks > 32 ? 2 : 4;
    const maxCell = weeks <= 6 ? 18 : weeks <= 14 ? 14 : weeks <= 28 ? 11 : weeks <= 60 ? 8 : 5;
    const fit = Math.floor((innerWidth - Math.max(0, weeks - 1) * gap) / weeks);
    const cell = Math.max(1, Math.min(maxCell, fit > 0 ? fit : 1));
    if (weeks * cell + Math.max(0, weeks - 1) * gap > innerWidth) gap = 0;
    const graphWidth = weeks * cell + Math.max(0, weeks - 1) * gap;
    const graphHeight = 7 * cell + 6 * gap;
    const gx = x + (width - graphWidth) / 2;
    const gy = top + 24 + Math.max(0, (88 - graphHeight) / 2);

    model.calendar.days.forEach((day, index) => {
      const column = Math.floor(index / 7);
      const row = index % 7;
      const level = Math.min(4, Math.max(0, day.level));
      ctx.fillStyle = level ? p.accent : p.line;
      ctx.globalAlpha = level ? [0, .4, .6, .8, 1][level] : 1;
      roundedRect(ctx, gx + column * (cell + gap), gy + row * (cell + gap), cell, cell, Math.min(2, cell / 3));
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    ctx.fillStyle = p.muted;
    font(ctx, 11 * scale, 500);
    ctx.fillText(`${formatNumber(model.calendar.total)} contributions in this calendar range`, x + 18, top + height - 16);
    return top + height;
  }

  function drawRepos(ctx, p, model, x, y, width, availableHeight, scale) {
    drawSectionTitle(ctx, p, 'FEATURED REPOSITORIES', `${model.repos.length} SELECTED`, x, y + 14, width, scale);
    const top = y + 34;
    if (!model.repos.length) {
      drawPanel(ctx, p, x, top, width, Math.min(120, availableHeight), 16);
      ctx.fillStyle = p.muted;
      font(ctx, 16 * scale, 600);
      ctx.fillText('No repositories selected.', x + 18, top + 48);
      return top + Math.min(120, availableHeight);
    }

    const gap = 12;
    const columns = model.repos.length === 1 ? 1 : 2;
    const rows = Math.ceil(model.repos.length / columns);
    const cardWidth = (width - gap * (columns - 1)) / columns;
    const cardHeight = Math.max(112, Math.min(148, (availableHeight - gap * (rows - 1)) / rows));

    model.repos.forEach((repo, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const cx = x + column * (cardWidth + gap);
      const cy = top + row * (cardHeight + gap);
      drawPanel(ctx, p, cx, cy, cardWidth, cardHeight, 16);
      ctx.fillStyle = p.text;
      font(ctx, 18 * scale, 700);
      ctx.fillText(fitText(ctx, repo.name, cardWidth - 82), cx + 16, cy + 31);
      ctx.fillStyle = p.accent;
      font(ctx, 13 * scale, 700);
      const stars = `★ ${formatNumber(repo.stars)}`;
      ctx.fillText(stars, cx + cardWidth - 16 - ctx.measureText(stars).width, cy + 31);
      ctx.fillStyle = p.muted;
      font(ctx, 12 * scale, 500);
      const lines = wrapText(ctx, repo.description || 'No description', cardWidth - 32, 2);
      lines.forEach((line, lineIndex) => ctx.fillText(line, cx + 16, cy + 61 + lineIndex * 18));
      ctx.fillStyle = p.muted;
      font(ctx, 11 * scale, 600);
      ctx.fillText(fitText(ctx, repo.language || 'Unknown', cardWidth - 32), cx + 16, cy + cardHeight - 18);
    });

    return top + rows * cardHeight + (rows - 1) * gap;
  }

  async function draw(config, model, sequence = null) {
    const canvas = elements.canvas;
    const ctx = canvas.getContext('2d');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const p = palette(config);
    const scale = textScale(config);
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = p.bg;
    ctx.fillRect(0, 0, SIZE, SIZE);

    if (document.fonts?.ready) await document.fonts.ready;
    const avatar = config.modules.profile ? await getAvatar(model.user.avatarUrl) : null;
    if (sequence !== null && sequence !== renderSequence) return false;

    drawBrand(ctx, p);
    const x = 60;
    const width = 960;
    let y = 72;
    const gap = 24;

    if (config.modules.profile) {
      y = drawProfile(ctx, p, model, avatar, x, y, width, scale) + gap;
    } else {
      y = 105;
    }

    if (config.modules.stats) y = drawStats(ctx, p, model, x, y, width, scale) + gap;
    if (config.modules.calendar) y = drawCalendar(ctx, p, model, x, y, width, scale) + gap;

    if (config.modules.repos) {
      const footerTop = 1010;
      const available = Math.max(120, footerTop - y - 44);
      drawRepos(ctx, p, model, x, y, width, available, scale);
    }

    ctx.strokeStyle = p.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 1010);
    ctx.lineTo(1020, 1010);
    ctx.stroke();
    ctx.fillStyle = p.text;
    font(ctx, 14, 800);
    ctx.fillText('GIT', 60, 1043);
    const gitWidth = ctx.measureText('GIT').width;
    ctx.fillStyle = p.accent;
    ctx.fillText('BRAG', 60 + gitWidth, 1043);
    ctx.textAlign = 'right';
    ctx.fillStyle = p.muted;
    font(ctx, 13, 500);
    ctx.fillText(`github.com/${model.user.login}`, 1020, 1043);
    ctx.textAlign = 'left';
    return true;
  }

  async function renderPreview() {
    const app = root.GitbragApp;
    if (!app?.createRenderModel) return;
    const config = readValues();
    const model = app.createRenderModel(config);
    if (!model) return;
    const sequence = ++renderSequence;
    elements.status.textContent = 'Rendering preview…';
    try {
      const rendered = await draw(config, model, sequence);
      if (!rendered || sequence !== renderSequence) return;
      elements.status.textContent = '1080 × 1080 · preview matches export';
    } catch (error) {
      console.error('PNG preview failed.', error);
      elements.status.textContent = 'Could not render the image preview.';
    }
  }

  function canvasBlob(canvas) {
    return new Promise((resolve, reject) => {
      try {
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG export failed.')), 'image/png');
      } catch (error) {
        reject(error);
      }
    });
  }

  async function downloadPng() {
    const app = root.GitbragApp;
    if (!app?.createRenderModel) return;
    const config = readValues();
    const model = app.createRenderModel(config);
    if (!model) return;
    const original = elements.download.textContent;
    elements.download.disabled = true;
    elements.download.textContent = 'Rendering…';
    try {
      const sequence = ++renderSequence;
      const rendered = await draw(config, model, sequence);
      if (!rendered) throw new Error('PNG render was superseded.');
      const blob = await canvasBlob(elements.canvas);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `gitbrag-${model.user.login}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      elements.download.textContent = 'Downloaded!';
      setTimeout(() => { elements.download.textContent = original; }, 1200);
    } catch (error) {
      console.error('PNG export failed.', error);
      elements.status.textContent = 'PNG export failed. Try again or disable the profile avatar.';
      elements.download.textContent = original;
    } finally {
      elements.download.disabled = false;
    }
  }

  elements.action?.addEventListener('click', openBuilder);
  elements.close?.addEventListener('click', closeBuilder);
  elements.cancel?.addEventListener('click', closeBuilder);
  elements.download?.addEventListener('click', downloadPng);
  elements.reposToggle?.addEventListener('change', () => {
    elements.repoPicker.closest('.png-fieldset')?.classList.toggle('is-disabled', !elements.reposToggle.checked);
    scheduleRender();
  });
  [
    elements.profileToggle, elements.statsToggle, elements.calendarToggle,
    elements.statsPeriod, elements.calendarRange, elements.textSize,
    elements.accent, elements.cardStyle,
  ].forEach((element) => element?.addEventListener('change', scheduleRender));

  elements.modal?.addEventListener('click', (event) => {
    if (event.target === elements.modal) closeBuilder();
  });

  root.GitbragPng = Object.freeze({ openBuilder, renderPreview });
})(window);