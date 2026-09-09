(function attachPngGenerator(root) {
  'use strict';

  const ShareConfig = root.GitbragShareConfig;
  if (!ShareConfig) throw new Error('GitbragShareConfig must load before png.js.');

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const SIZE = 1080;
  const AVATAR_TIMEOUT_MS = 5000;
  const CANVAS = Object.freeze({
    padding: 60,
    footerTop: 995,
    footerBaseline: 1040,
    sectionGap: 24,
    sectionTitle: 34,
    profileHeight: 92,
    statsHeight: 176,
    panelRadius: 18,
    repoGap: 12,
    brandReserve: 180,
  });

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
  let modalReturnFocus = null;
  let restoreFocusAfterClose = true;
  let exportInProgress = false;
  const avatarCache = new Map();

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function formatNumber(value) {
    return new Intl.NumberFormat().format(Number(value) || 0);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
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

  function syncDependentControls() {
    if (elements.statsPeriod) elements.statsPeriod.disabled = !elements.statsToggle.checked;
    if (elements.calendarRange) elements.calendarRange.disabled = !elements.calendarToggle.checked;
    const repoFieldset = elements.repoPicker?.closest('.png-fieldset');
    if (repoFieldset) {
      repoFieldset.disabled = !elements.reposToggle.checked;
      repoFieldset.classList.toggle('is-disabled', !elements.reposToggle.checked);
    }
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
              <input type="checkbox" data-png-repo="${escapeHtml(id)}" ${selected.has(id) ? 'checked' : ''}>
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
    syncDependentControls();
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
    syncDependentControls();
  }

  function readValues() {
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

  function closeMenu() {
    elements.menu?.classList.add('hidden');
    elements.shareButton?.setAttribute('aria-expanded', 'false');
  }

  async function openBuilder() {
    const context = root.GitbragApp?.getShareBuilderContext?.();
    if (!context || !elements.modal) return;
    modalReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : elements.shareButton;
    restoreFocusAfterClose = true;
    repoOptions = context.repos;
    setValues(context.defaultConfig);
    closeMenu();
    elements.modal.showModal();
    elements.profileToggle.focus();
    await renderPreview();
  }

  function closeBuilder({ restoreFocus = true } = {}) {
    restoreFocusAfterClose = restoreFocus;
    renderSequence += 1;
    if (elements.modal?.open) elements.modal.close();
  }

  function scheduleRender() {
    if (exportInProgress) return;
    const sequence = ++renderSequence;
    root.setTimeout(() => {
      if (sequence === renderSequence && elements.modal?.open) renderPreview();
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
    ctx.closePath();
  }

  function drawPanel(ctx, colors, x, y, width, height, radius = CANVAS.panelRadius) {
    roundedRect(ctx, x, y, width, height, radius);
    ctx.fillStyle = colors.panel;
    ctx.fill();
    ctx.strokeStyle = colors.line;
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
      if (ctx.measureText(candidate).width <= maxWidth) line = candidate;
      else if (line) {
        lines.push(line);
        line = word;
      } else lines.push(fitText(ctx, word, maxWidth));
    }
    if (line && lines.length < maxLines) lines.push(line);
    if (words.length && lines.length) lines[lines.length - 1] = fitText(ctx, `${lines[lines.length - 1]}…`, maxWidth);
    return lines;
  }

  function drawSectionTitle(ctx, colors, left, right, x, y, width, scale) {
    ctx.fillStyle = colors.muted;
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
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        image.onload = null;
        image.onerror = null;
        resolve(value);
      };
      const timeout = root.setTimeout(() => finish(null), AVATAR_TIMEOUT_MS);
      image.crossOrigin = 'anonymous';
      image.onload = () => finish(image);
      image.onerror = () => finish(null);
      image.src = url;
    });

    avatarCache.set(url, promise);
    return promise;
  }

  function drawAvatar(ctx, image, colors, x, y, size, fallbackText) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    if (image) {
      const sourceRatio = image.width / image.height;
      let sx = 0;
      let sy = 0;
      let sw = image.width;
      let sh = image.height;
      if (sourceRatio > 1) {
        sw = image.height;
        sx = (image.width - sw) / 2;
      } else {
        sh = image.width;
        sy = (image.height - sh) / 2;
      }
      ctx.drawImage(image, sx, sy, sw, sh, x, y, size, size);
    } else {
      ctx.fillStyle = colors.accent;
      ctx.fillRect(x, y, size, size);
      ctx.fillStyle = colors.bg;
      font(ctx, size * .32, 800);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(fallbackText || '?').slice(0, 2).toUpperCase(), x + size / 2, y + size / 2);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }
    ctx.restore();
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawBrand(ctx, colors) {
    font(ctx, 18, 800);
    const gitWidth = ctx.measureText('GIT').width;
    const bragWidth = ctx.measureText('BRAG').width;
    const start = 1020 - gitWidth - bragWidth;
    ctx.fillStyle = colors.text;
    ctx.fillText('GIT', start, 76);
    ctx.fillStyle = colors.accent;
    ctx.fillText('BRAG', start + gitWidth, 76);
  }

  function repoGrid(repoCount) {
    if (repoCount <= 1) return { columns: 1, rows: 1 };
    if (repoCount === 2) return { columns: 2, rows: 1 };
    return { columns: 2, rows: 2 };
  }

  function computeLayout(config, model) {
    const enabled = ['profile', 'stats', 'calendar', 'repos'].filter((key) => config.modules[key]);
    const gaps = Math.max(0, enabled.length - 1) * CANVAS.sectionGap;
    const contentTop = config.modules.profile ? 60 : 104;
    const contentBottom = CANVAS.footerTop - 22;
    const totalHeight = contentBottom - contentTop - gaps;
    const heights = { profile: 0, stats: 0, calendar: 0, repos: 0 };

    if (config.modules.profile) heights.profile = CANVAS.profileHeight;
    if (config.modules.stats) heights.stats = CANVAS.statsHeight;

    let flexibleHeight = Math.max(0, totalHeight - heights.profile - heights.stats);
    if (config.modules.calendar && config.modules.repos) {
      const { rows } = repoGrid(model.repos.length);
      const minRepos = rows === 2 ? 260 : 225;
      const targetCalendar = clamp(Math.round(flexibleHeight * .5), 280, 310);
      heights.calendar = Math.min(targetCalendar, Math.max(210, flexibleHeight - minRepos));
      heights.repos = flexibleHeight - heights.calendar;
    } else if (config.modules.calendar) {
      heights.calendar = flexibleHeight;
    } else if (config.modules.repos) {
      heights.repos = flexibleHeight;
    } else if (config.modules.stats) {
      heights.stats += flexibleHeight;
    } else if (config.modules.profile) {
      heights.profile += flexibleHeight;
    }

    const positions = {};
    let y = contentTop;
    enabled.forEach((key, index) => {
      positions[key] = { y, height: heights[key] };
      y += heights[key];
      if (index < enabled.length - 1) y += CANVAS.sectionGap;
    });

    return { x: CANVAS.padding, width: SIZE - CANVAS.padding * 2, positions };
  }

  function heatmapGap(dayCount) {
    if (dayCount <= 14) return 10;
    if (dayCount <= 42) return 8;
    if (dayCount <= 100) return 5;
    if (dayCount <= 250) return 3;
    if (dayCount <= 500) return 2;
    return 1;
  }

  function fitHeatmap(dayCount, maxWidth, maxHeight) {
    const count = Math.max(1, dayCount);
    const gap = heatmapGap(count);
    let best = null;
    const maxRows = Math.min(count, 60);

    for (let rows = 1; rows <= maxRows; rows += 1) {
      const cols = Math.ceil(count / rows);
      const cell = Math.floor(Math.min(
        (maxWidth - gap * Math.max(0, cols - 1)) / cols,
        (maxHeight - gap * Math.max(0, rows - 1)) / rows,
      ));
      if (cell < 1) continue;

      const width = cols * cell + gap * Math.max(0, cols - 1);
      const height = rows * cell + gap * Math.max(0, rows - 1);
      const edgeFill = Math.min(width / maxWidth, height / maxHeight);
      const areaFill = (width * height) / (maxWidth * maxHeight);
      const score = edgeFill * 10000 + areaFill * 1000 + cell;

      if (!best || score > best.score) {
        best = { score, cols, rows, cell, gap, width, height };
      }
    }

    return best || { cols: 1, rows: 1, cell: 1, gap: 0, width: 1, height: 1 };
  }

  function drawProfile(ctx, colors, model, image, x, y, width, height, scale) {
    const avatarSize = clamp(Math.min(height, 98), 72, 98);
    const avatarY = y + Math.max(0, (height - avatarSize) / 2);
    drawAvatar(ctx, image, colors, x, avatarY, avatarSize, model.user.displayName);
    const textX = x + avatarSize + 24;
    const textWidth = Math.max(140, width - avatarSize - CANVAS.brandReserve);

    ctx.fillStyle = colors.text;
    font(ctx, 42 * scale, 800);
    ctx.fillText(fitText(ctx, model.user.displayName, textWidth), textX, avatarY + 44);
    ctx.fillStyle = colors.muted;
    font(ctx, 18 * scale, 500);
    const handle = `@${model.user.login}${model.user.bio ? ` · ${model.user.bio}` : ''}`;
    ctx.fillText(fitText(ctx, handle, textWidth), textX, avatarY + 75);
  }

  function drawStats(ctx, colors, model, x, y, width, height, scale) {
    drawSectionTitle(ctx, colors, 'ACTIVITY SUMMARY', model.stats.periodLabel.toUpperCase(), x, y + 14, width, scale);
    const top = y + CANVAS.sectionTitle;
    const gap = 12;
    const cardWidth = (width - gap * 3) / 4;
    const cardHeight = Math.max(120, height - CANVAS.sectionTitle);

    model.stats.cards.forEach((card, index) => {
      const cx = x + index * (cardWidth + gap);
      drawPanel(ctx, colors, cx, top, cardWidth, cardHeight, 16);
      const padding = 16;
      ctx.fillStyle = colors.muted;
      font(ctx, 11 * scale, 800);
      ctx.fillText(card.label, cx + padding, top + 28);
      ctx.fillStyle = colors.text;
      font(ctx, clamp(cardHeight * .25, 32, 46) * scale, 800);
      ctx.fillText(fitText(ctx, card.value, cardWidth - padding * 2), cx + padding, top + Math.min(86, cardHeight * .53));
      ctx.fillStyle = colors.muted;
      font(ctx, 10 * scale, 500);
      wrapText(ctx, card.note, cardWidth - padding * 2, 2).forEach((line, lineIndex) => {
        ctx.fillText(line, cx + padding, top + cardHeight - 30 + lineIndex * 14);
      });
    });
  }

  function drawCalendar(ctx, colors, model, x, y, width, height, scale) {
    drawSectionTitle(ctx, colors, 'CONTRIBUTION CALENDAR', model.calendar.label, x, y + 14, width, scale);
    const top = y + CANVAS.sectionTitle;
    const panelHeight = Math.max(130, height - CANVAS.sectionTitle);
    drawPanel(ctx, colors, x, top, width, panelHeight, 16);

    if (model.contributionError) {
      ctx.fillStyle = colors.muted;
      font(ctx, 17 * scale, 600);
      ctx.textAlign = 'center';
      ctx.fillText('Contribution calendar unavailable.', x + width / 2, top + panelHeight / 2);
      ctx.textAlign = 'left';
      return;
    }

    const innerPadding = 14;
    const summaryHeight = 22;
    const graphMaxWidth = width - innerPadding * 2;
    const graphMaxHeight = Math.max(30, panelHeight - innerPadding * 2 - summaryHeight);
    const heatmap = fitHeatmap(model.calendar.days.length, graphMaxWidth, graphMaxHeight);
    const gx = x + (width - heatmap.width) / 2;
    const gy = top + innerPadding + Math.max(0, (graphMaxHeight - heatmap.height) / 2);

    model.calendar.days.forEach((day, index) => {
      const column = Math.floor(index / heatmap.rows);
      const row = index % heatmap.rows;
      const level = Math.min(4, Math.max(0, day.level));
      ctx.fillStyle = level ? colors.accent : colors.line;
      ctx.globalAlpha = level ? [0, .4, .6, .8, 1][level] : 1;
      roundedRect(
        ctx,
        gx + column * (heatmap.cell + heatmap.gap),
        gy + row * (heatmap.cell + heatmap.gap),
        heatmap.cell,
        heatmap.cell,
        Math.min(5, heatmap.cell / 5),
      );
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    ctx.fillStyle = colors.muted;
    font(ctx, 11 * scale, 500);
    ctx.fillText(`${formatNumber(model.calendar.total)} contributions in this calendar range`, x + innerPadding, top + panelHeight - 11);
  }

  function drawRepos(ctx, colors, model, x, y, width, height, scale) {
    drawSectionTitle(ctx, colors, 'FEATURED REPOSITORIES', `${model.repos.length} SELECTED`, x, y + 14, width, scale);
    const top = y + CANVAS.sectionTitle;
    const gridHeight = Math.max(100, height - CANVAS.sectionTitle);

    if (!model.repos.length) {
      drawPanel(ctx, colors, x, top, width, gridHeight, 16);
      ctx.fillStyle = colors.muted;
      font(ctx, 16 * scale, 600);
      ctx.fillText('No repositories selected.', x + 18, top + 48);
      return;
    }

    const { columns, rows } = repoGrid(model.repos.length);
    const gap = CANVAS.repoGap;
    const cardWidth = (width - gap * (columns - 1)) / columns;
    const cardHeight = (gridHeight - gap * (rows - 1)) / rows;
    const roomy = rows === 1;

    model.repos.forEach((repo, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const cx = x + column * (cardWidth + gap);
      const cy = top + row * (cardHeight + gap);
      drawPanel(ctx, colors, cx, cy, cardWidth, cardHeight, 16);
      const padding = roomy ? 20 : 16;

      const stars = `★ ${formatNumber(repo.stars)}`;
      ctx.fillStyle = colors.accent;
      font(ctx, (roomy ? 14 : 13) * scale, 700);
      const starWidth = ctx.measureText(stars).width;
      ctx.fillText(stars, cx + cardWidth - padding - starWidth, cy + (roomy ? 38 : 31));

      ctx.fillStyle = colors.text;
      font(ctx, (roomy ? 21 : 18) * scale, 700);
      ctx.fillText(fitText(ctx, repo.name, cardWidth - padding * 3 - starWidth), cx + padding, cy + (roomy ? 38 : 31));

      ctx.fillStyle = colors.muted;
      font(ctx, (roomy ? 14 : 12) * scale, 500);
      const descriptionTop = cy + (roomy ? 76 : 61);
      const maxLines = roomy && cardHeight > 210 ? 4 : 2;
      wrapText(ctx, repo.description || 'No description', cardWidth - padding * 2, maxLines).forEach((line, lineIndex) => {
        ctx.fillText(line, cx + padding, descriptionTop + lineIndex * (roomy ? 22 : 18));
      });

      ctx.fillStyle = colors.muted;
      font(ctx, (roomy ? 13 : 11) * scale, 600);
      ctx.fillText(fitText(ctx, repo.language || 'Unknown', cardWidth - padding * 2), cx + padding, cy + cardHeight - 20);
    });
  }

  function drawEmptyState(ctx, colors) {
    ctx.fillStyle = colors.muted;
    font(ctx, 24, 700);
    ctx.textAlign = 'center';
    ctx.fillText('No image sections selected.', SIZE / 2, SIZE / 2 - 4);
    font(ctx, 14, 500);
    ctx.fillText('Enable a section in the image settings to add content.', SIZE / 2, SIZE / 2 + 28);
    ctx.textAlign = 'left';
  }

  function drawFooter(ctx, colors, model) {
    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CANVAS.padding, CANVAS.footerTop);
    ctx.lineTo(SIZE - CANVAS.padding, CANVAS.footerTop);
    ctx.stroke();

    ctx.fillStyle = colors.text;
    font(ctx, 14, 800);
    ctx.fillText('GIT', CANVAS.padding, CANVAS.footerBaseline);
    const gitWidth = ctx.measureText('GIT').width;
    ctx.fillStyle = colors.accent;
    ctx.fillText('BRAG', CANVAS.padding + gitWidth, CANVAS.footerBaseline);

    ctx.textAlign = 'right';
    ctx.fillStyle = colors.muted;
    font(ctx, 13, 500);
    ctx.fillText(`github.com/${model.user.login}`, SIZE - CANVAS.padding, CANVAS.footerBaseline);
    ctx.textAlign = 'left';
  }

  async function draw(config, model, sequence = null) {
    const canvas = elements.canvas;
    const ctx = canvas?.getContext?.('2d');
    if (!canvas || !ctx) throw new Error('Canvas rendering is not available in this browser.');

    canvas.width = SIZE;
    canvas.height = SIZE;
    const colors = palette(config);
    const scale = textScale(config);

    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, SIZE, SIZE);

    if (document.fonts?.ready) await document.fonts.ready;
    const avatar = config.modules.profile ? await getAvatar(model.user.avatarUrl) : null;
    if (sequence !== null && sequence !== renderSequence) return false;

    const layout = computeLayout(config, model);
    drawBrand(ctx, colors);

    if (!Object.values(config.modules).some(Boolean)) {
      drawEmptyState(ctx, colors);
    } else {
      if (config.modules.profile) {
        const section = layout.positions.profile;
        drawProfile(ctx, colors, model, avatar, layout.x, section.y, layout.width, section.height, scale);
      }
      if (config.modules.stats) {
        const section = layout.positions.stats;
        drawStats(ctx, colors, model, layout.x, section.y, layout.width, section.height, scale);
      }
      if (config.modules.calendar) {
        const section = layout.positions.calendar;
        drawCalendar(ctx, colors, model, layout.x, section.y, layout.width, section.height, scale);
      }
      if (config.modules.repos) {
        const section = layout.positions.repos;
        drawRepos(ctx, colors, model, layout.x, section.y, layout.width, section.height, scale);
      }
    }

    drawFooter(ctx, colors, model);
    return true;
  }

  async function renderPreview() {
    const app = root.GitbragApp;
    if (!app?.createRenderModel || !elements.modal?.open || exportInProgress) return;
    const config = readValues();
    const model = app.createRenderModel(config);
    if (!model) return;
    const sequence = ++renderSequence;
    elements.status.textContent = 'Rendering preview…';

    try {
      const rendered = await draw(config, model, sequence);
      if (!rendered || sequence !== renderSequence) return;
      elements.status.textContent = '1080 × 1080 · hardened adaptive layout · preview matches export';
    } catch (error) {
      console.error('PNG preview failed.', error);
      elements.status.textContent = 'Could not render the image preview.';
    }
  }

  function canvasBlob(canvas) {
    return new Promise((resolve, reject) => {
      if (!canvas?.toBlob) {
        reject(new Error('PNG export is not supported in this browser.'));
        return;
      }
      try {
        canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('PNG export failed.')), 'image/png');
      } catch (error) {
        reject(error);
      }
    });
  }

  function lockBuilderControls(locked) {
    if (!elements.modal) return;
    $$('input, select, button', elements.modal).forEach((control) => {
      if (locked) {
        control.dataset.pngWasDisabled = control.disabled ? '1' : '0';
        control.disabled = true;
      } else {
        control.disabled = control.dataset.pngWasDisabled === '1';
        delete control.dataset.pngWasDisabled;
      }
    });
    if (!locked) syncDependentControls();
  }

  async function downloadPng() {
    const app = root.GitbragApp;
    if (!app?.createRenderModel || exportInProgress) return;
    const config = readValues();
    const model = app.createRenderModel(config);
    if (!model) return;
    const original = elements.download.textContent;

    exportInProgress = true;
    lockBuilderControls(true);
    elements.download.textContent = 'Rendering…';
    elements.status.textContent = 'Preparing PNG…';

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
      elements.status.textContent = 'PNG downloaded successfully.';
      setTimeout(() => {
        if (elements.download) elements.download.textContent = original;
      }, 1200);
    } catch (error) {
      console.error('PNG export failed.', error);
      elements.status.textContent = 'PNG export failed. Try again or turn off Profile.';
      elements.download.textContent = original;
    } finally {
      exportInProgress = false;
      lockBuilderControls(false);
    }
  }

  elements.action?.addEventListener('click', openBuilder);
  elements.close?.addEventListener('click', () => closeBuilder());
  elements.cancel?.addEventListener('click', () => closeBuilder());
  elements.download?.addEventListener('click', downloadPng);

  [elements.statsToggle, elements.calendarToggle, elements.reposToggle].forEach((toggle) => {
    toggle?.addEventListener('change', () => {
      syncDependentControls();
      scheduleRender();
    });
  });

  [
    elements.profileToggle,
    elements.statsPeriod,
    elements.calendarRange,
    elements.textSize,
    elements.accent,
    elements.cardStyle,
  ].forEach((element) => element?.addEventListener('change', scheduleRender));

  elements.modal?.addEventListener('click', (event) => {
    if (event.target === elements.modal && !exportInProgress) closeBuilder();
  });

  elements.modal?.addEventListener('close', () => {
    if (restoreFocusAfterClose && modalReturnFocus?.isConnected) modalReturnFocus.focus();
    modalReturnFocus = null;
    restoreFocusAfterClose = true;
  });

  const closeOnNavigation = () => {
    if (elements.modal?.open && !exportInProgress) closeBuilder({ restoreFocus: false });
  };
  root.addEventListener('hashchange', closeOnNavigation);
  root.addEventListener('popstate', closeOnNavigation);

  root.GitbragPng = Object.freeze({ openBuilder, closeBuilder, renderPreview });
})(window);