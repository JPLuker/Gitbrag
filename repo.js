(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const periods = { '7d': 7, '30d': 30, '90d': 90, '1y': 365, 'recent': null };
  const state = { repository: null, commits: [], contributors: [], period: '30d', controller: null, sequence: 0 };
  const view = $('#repoView');
  const section = $('#repoDetails');
  const note = $('#repoStatus');
  const picker = $('#repoPeriod');
  const repoRegex = /^[A-Za-z0-9_.-]{1,100}$/;
  const ownerRegex = /^(?!-)[A-Za-z0-9-]{1,39}(?<!-)$/;

  function parse(value) {
    let input = String(value || '').trim();
    if (/^https?:\/\//i.test(input) || /^(?:www\.)?github\.com\//i.test(input)) {
      let url;
      try { url = new URL(/^https?:\/\//i.test(input) ? input : 'https://' + input); }
      catch { return null; }
      if (url.hostname.toLowerCase().replace(/^www\./, '') !== 'github.com') return null;
      input = url.pathname.replace(/^\/+|\/+$/g, '');
    }
    const segments = input.split('/');
    if (segments.length !== 2 || !ownerRegex.test(segments[0]) || !repoRegex.test(segments[1]) || segments[1] === '.' || segments[1] === '..') return null;
    return { owner: segments[0], name: segments[1] };
  }
  function route({owner, name}, period) {
    const p = Object.hasOwn(periods, period) ? period : '30d';
    return '#/repo/' + encodeURIComponent(owner) + '/' + encodeURIComponent(name) + '?p=' + encodeURIComponent(p);
  }
  function e(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = String(text);
    return el;
  }
  function fmt(value) { return value === null || value === undefined ? '—' : new Intl.NumberFormat().format(value); }
  function date(value) { return value ? new Date(value).toLocaleDateString() : '—'; }
  function safeUrl(url) {
    try { const u = new URL(url); return u.protocol === 'https:' && u.hostname === 'github.com' ? u.href : '#'; }
    catch { return '#'; }
  }
  function add(parent, tag, cls, value) { const el = e(tag, cls, value); parent.append(el); return el; }
  function stat(parent, label, value, hint) {
    const tile = add(parent, 'article', 'repo-stat');
    add(tile, 'span', '', label);
    add(tile, 'strong', '', value);
    if (hint) add(tile, 'small', '', hint);
  }
  async function request(path, signal, optional) {
    let response;
    try { response = await fetch('https://api.github.com' + path, { signal, headers: { Accept: 'application/vnd.github+json' } }); }
    catch (error) { if (error.name === 'AbortError') throw error; throw new Error('Could not connect to GitHub.'); }
    if (optional && (response.status === 404 || response.status === 409 || response.status === 204)) return [];
    if (response.status === 404) throw new Error('Public repository not found.');
    if (response.status === 403 || response.status === 429) throw new Error('GitHub API rate limit reached. Try again later.');
    if (!response.ok) throw new Error('GitHub returned HTTP ' + response.status + '.');
    return response.json();
  }
  function updateUrl() {
    const repo = state.repository;
    if (repo) history.replaceState(null, '', route({ owner: repo.owner.login, name: repo.name }, state.period));
  }
  function selectedCommits() {
    if (state.period === 'recent') return state.commits;
    const cutoff = Date.now() - periods[state.period] * 86400000;
    return state.commits.filter(c => Date.parse(c.commit?.author?.date || c.commit?.committer?.date) >= cutoff);
  }
  function render() {
    const repo = state.repository;
    if (!repo) return;
    section.replaceChildren();
    picker.value = state.period;
    const heading = add(section, 'div', 'repo-intro');
    add(heading, 'p', 'repo-eyebrow', 'PUBLIC REPOSITORY · GITBRAG');
    add(heading, 'h1', '', repo.full_name);
    add(heading, 'p', '', repo.description || 'No description provided.');
    const links = add(heading, 'div', 'repo-links');
    const gh = add(links, 'a', '', 'View on GitHub ↗');
    gh.href = safeUrl(repo.html_url); gh.target = '_blank'; gh.rel = 'noopener noreferrer';
    const owner = add(links, 'a', '', 'Owner profile ↗');
    owner.href = '#/' + encodeURIComponent(repo.owner.login);
    if (repo.archived) add(heading, 'p', 'repo-alert', 'Archived repository — read-only on GitHub.');
    const grid = add(section, 'div', 'repo-stats');
    stat(grid, 'Stars', fmt(repo.stargazers_count), 'GitHub stargazers');
    stat(grid, 'Forks', fmt(repo.forks_count), 'Public forks');
    stat(grid, 'Subscribers', fmt(repo.subscribers_count), 'GitHub subscribers');
    stat(grid, 'Open issues + PRs', fmt(repo.open_issues_count), 'GitHub API combined count');
    stat(grid, 'Recent commits', fmt(selectedCommits().length), 'Up to 100 most recent, filtered by period');
    stat(grid, 'Contributors', fmt(state.contributors.length), 'Up to 100 returned by GitHub');
    const meta = add(section, 'div', 'repo-meta');
    [['Primary language', repo.language || 'Not specified'], ['License', repo.license?.spdx_id || 'Not specified'],
     ['Default branch', repo.default_branch || '—'], ['Created', date(repo.created_at)],
     ['Last pushed', date(repo.pushed_at)], ['Last updated', date(repo.updated_at)]].forEach(([label,value]) => {
      const p = add(meta, 'div', 'repo-meta-item'); add(p, 'span', '', label); add(p, 'strong', '', value);
    });
    if (Array.isArray(repo.topics) && repo.topics.length) add(section, 'p', 'repo-topics', 'Topics: ' + repo.topics.join(' · '));
    const commits = add(section, 'section', 'repo-recent');
    add(commits, 'h2', '', 'Recent repository activity');
    add(commits, 'p', 'repo-muted', 'GitHub public commits, capped at 100 returned records. Counts are not full-history totals and may be incomplete for busy repositories.');
    const selected = selectedCommits().slice(0, 8);
    if (!selected.length) add(commits, 'p', 'repo-muted', 'No commits in the fetched sample for this period.');
    selected.forEach(c => {
      const row = add(commits, 'div', 'repo-commit');
      const link = add(row, 'a', '', (c.commit?.message || 'Commit').split('\n')[0]);
      link.href = safeUrl(c.html_url); link.target = '_blank'; link.rel = 'noopener noreferrer';
      add(row, 'small', '', (c.author?.login || c.commit?.author?.name || 'Unknown') + ' · ' + date(c.commit?.author?.date));
    });
    note.textContent = 'Public GitHub data · commit and contributor lists are API-limited samples, not lifetime totals.';
  }
  async function load(input, requestedPeriod) {
    const target = typeof input === 'string' ? parse(input) : input;
    if (!target) { showError('Enter a valid owner/repository name or GitHub repository URL.'); return; }
    state.controller?.abort();
    const controller = new AbortController();
    state.controller = controller;
    const sequence = ++state.sequence;
    state.period = Object.hasOwn(periods, requestedPeriod) ? requestedPeriod : '30d';
    document.querySelectorAll('#searchView, #profileView, #sharedView, #loadingView, #errorView').forEach(el => el.classList.add('hidden'));
    view.classList.remove('hidden');
    section.replaceChildren();
    note.textContent = 'Loading public repository information…';
    try {
      const path = '/repos/' + encodeURIComponent(target.owner) + '/' + encodeURIComponent(target.name);
      const repo = await request(path, controller.signal);
      if (sequence !== state.sequence) return;
      const [commits, contributors] = await Promise.allSettled([
        request(path + '/commits?per_page=100', controller.signal, true),
        request(path + '/contributors?per_page=100', controller.signal, true),
      ]);
      if (sequence !== state.sequence) return;
      state.repository = repo;
      state.commits = commits.status === 'fulfilled' && Array.isArray(commits.value) ? commits.value : [];
      state.contributors = contributors.status === 'fulfilled' && Array.isArray(contributors.value) ? contributors.value : [];
      updateUrl();
      render();
      if (commits.status === 'rejected' || contributors.status === 'rejected') note.textContent += ' Some optional activity data could not be loaded.';
      $('#repoTitle')?.focus();
    } catch (error) {
      if (error.name !== 'AbortError' && sequence === state.sequence) showError(error.message);
    } finally { if (sequence === state.sequence) state.controller = null; }
  }
  function showError(message) {
    section.replaceChildren();
    note.textContent = message;
    const retry = add(section, 'button', 'secondary-button', 'Back to search');
    retry.type = 'button'; retry.addEventListener('click', back);
  }
  function back() { state.controller?.abort(); state.repository = null; location.hash = ''; }
  function shareUrl() {
    const r = state.repository;
    return new URL(route({owner:r.owner.login, name:r.name}, state.period), location.href.split('#')[0]).href;
  }
  async function copy(value, label) {
    try { await navigator.clipboard.writeText(value); note.textContent = label + ' copied.'; }
    catch { prompt('Copy ' + label + ':', value); }
  }
  function embed() {
    const url = shareUrl();
    const html = '<iframe title="Gitbrag repository statistics" src="' + url.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '" width="100%" height="850" loading="lazy" style="border:0" referrerpolicy="no-referrer"></iframe>';
    copy(html, 'Embed code');
  }
  function png() {
    const repo = state.repository;
    if (!repo) return;
    const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) { note.textContent = 'Canvas export unavailable.'; return; }
    ctx.fillStyle = '#09090b'; ctx.fillRect(0,0,1080,1080);
    ctx.fillStyle = '#3da9ff'; ctx.font = 'bold 44px Inter, sans-serif'; ctx.fillText('GITBRAG', 72, 96);
    ctx.fillStyle = '#f5f5f7'; ctx.font = 'bold 50px Inter, sans-serif';
    let title = repo.full_name; while (ctx.measureText(title).width > 920 && title.length > 6) title = title.slice(0,-2) + '…';
    ctx.fillText(title,72,190);
    ctx.fillStyle = '#92929b'; ctx.font = '24px Inter, sans-serif';
    const desc = repo.description || 'Public GitHub repository';
    let text = desc; while(ctx.measureText(text).width > 920 && text.length > 6) text = text.slice(0,-2) + '…';
    ctx.fillText(text,72,246);
    const metrics = [['STARS', fmt(repo.stargazers_count)], ['FORKS', fmt(repo.forks_count)], ['SUBSCRIBERS', fmt(repo.subscribers_count)],
      ['OPEN ISSUES + PRS', fmt(repo.open_issues_count)], ['RECENT COMMITS', fmt(selectedCommits().length)], ['CONTRIBUTORS', fmt(state.contributors.length)]];
    metrics.forEach(([label, value], i) => {
      const x = 72+(i%2)*477, y=310+Math.floor(i/2)*170;
      ctx.fillStyle='#18181d';ctx.fillRect(x,y,448,148);
      ctx.fillStyle='#92929b';ctx.font='20px Inter, sans-serif';ctx.fillText(label,x+26,y+43);
      ctx.fillStyle='#f5f5f7';ctx.font='bold 50px Inter, sans-serif';ctx.fillText(value,x+26,y+105);
    });
    ctx.fillStyle='#92929b';ctx.font='21px Inter, sans-serif';
    ctx.fillText('Period: '+picker.options[picker.selectedIndex].text,72,890);
    ctx.fillText('Recent commits: up to 100 sampled · contributors: up to 100',72,928);
    ctx.fillStyle='#f5f5f7';ctx.font='22px Inter, sans-serif';ctx.fillText('github.com/'+repo.full_name,72,998);
    canvas.toBlob(blob => {
      if (!blob) { note.textContent = 'PNG export failed.'; return; }
      const url=URL.createObjectURL(blob), a=document.createElement('a');
      a.href=url;a.download='gitbrag-'+repo.owner.login+'-'+repo.name+'.png';a.click();
      setTimeout(()=>URL.revokeObjectURL(url),1500);
    },'image/png');
  }
  picker.addEventListener('change', () => { state.period = picker.value; updateUrl(); render(); });
  $('#repoBack').addEventListener('click', back);
  $('#repoShare').addEventListener('click', () => state.repository && copy(shareUrl(),'Share link'));
  $('#repoEmbed').addEventListener('click', () => state.repository && embed());
  $('#repoPng').addEventListener('click', png);
  window.GitbragRepo = Object.freeze({ parse, route, load, back });
})();