(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const state = { repository: null, contributors: [], contributorsAvailable: false, modules: ['metrics','metadata'], accent: 'blue', controller: null, sequence: 0 };
  const view = $('#repoView');
  const section = $('#repoDetails');
  const note = $('#repoStatus');
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
  function route({owner, name}) {
    return '#/repo/' + encodeURIComponent(owner) + '/' + encodeURIComponent(name);
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
  const accents = Object.freeze({ blue: '#3da9ff', purple: '#bb88ff', green: '#43c998', red: '#f47b82' });
  const moduleKeys = ['metrics','metadata'];
  function applySettings() {
    document.querySelectorAll('[data-repo-module]').forEach(control => {
      control.checked = state.modules.includes(control.dataset.repoModule);
    });
    $('#repoAccent').value = state.accent;
    view.style.setProperty('--repo-accent', accents[state.accent]);
  }
  function shareHash() {
    const repo = state.repository;
    if (!repo) return '';
    return route({owner:repo.owner.login,name:repo.name})
      + '&m=' + encodeURIComponent(state.modules.join(','))
      + '&a=' + encodeURIComponent(state.accent);
  }
  function updateUrl() {
    if (state.repository) history.replaceState(null,'',shareHash());
  }
  function render() {
    const repo = state.repository;
    if (!repo) return;
    section.replaceChildren();

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
    if (state.modules.includes('metrics')) {
    const grid = add(section, 'div', 'repo-stats');
    stat(grid, 'Stars', fmt(repo.stargazers_count), 'GitHub stargazers');
    stat(grid, 'Forks', fmt(repo.forks_count), 'Public forks');
    stat(grid, 'Subscribers', fmt(repo.subscribers_count), 'GitHub subscribers');
    stat(grid, 'Open issues + PRs', fmt(repo.open_issues_count), 'GitHub API combined count');
    stat(grid, 'Contributors', state.contributorsAvailable ? fmt(state.contributors.length) : '—', 'Up to 100 returned by GitHub');
    }
    if (state.modules.includes('metadata')) {
    const meta = add(section, 'div', 'repo-meta');
    [['Primary language', repo.language || 'Not specified'], ['License', repo.license?.spdx_id || 'Not specified'],
     ['Default branch', repo.default_branch || '—'], ['Created', date(repo.created_at)],
     ['Last pushed', date(repo.pushed_at)], ['Last updated', date(repo.updated_at)]].forEach(([label,value]) => {
      const p = add(meta, 'div', 'repo-meta-item'); add(p, 'span', '', label); add(p, 'strong', '', value);
    });
    if (Array.isArray(repo.topics) && repo.topics.length) add(section, 'p', 'repo-topics', 'Topics: ' + repo.topics.join(' · '));
    }
    note.textContent = 'Public GitHub data · contributor counts are limited to the returned API sample.';
  }
  async function load(input) {
    const target = typeof input === 'string' ? parse(input) : input;
    if (!target) { showError('Enter a valid owner/repository name or GitHub repository URL.'); return; }
    state.controller?.abort();
    const controller = new AbortController();
    state.controller = controller;
    const sequence = ++state.sequence;
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    const requestedModules = params.get('m');
    state.modules = requestedModules === null ? [...moduleKeys] : requestedModules.split(',').filter(value => moduleKeys.includes(value));
    const requestedAccent = params.get('a');
    state.accent = Object.hasOwn(accents,requestedAccent) ? requestedAccent : 'blue';
    applySettings();
    document.querySelectorAll('#searchView, #profileView, #sharedView, #loadingView, #errorView').forEach(el => el.classList.add('hidden'));
    view.classList.remove('hidden');
    section.replaceChildren();
    note.textContent = 'Loading public repository information…';
    try {
      const path = '/repos/' + encodeURIComponent(target.owner) + '/' + encodeURIComponent(target.name);
      const repo = await request(path, controller.signal);
      if (sequence !== state.sequence) return;
      const contributors = await Promise.allSettled([request(path + '/contributors?per_page=100', controller.signal, true)]);
      if (sequence !== state.sequence) return;
      state.repository = repo;
      state.contributorsAvailable = contributors[0].status === 'fulfilled' && Array.isArray(contributors[0].value);
      state.contributors = state.contributorsAvailable ? contributors[0].value : [];
      updateUrl();
      render();
      if (contributors[0].status === 'rejected') note.textContent += ' Some optional activity data could not be loaded.';
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
    return new URL(shareHash(), location.href.split('#')[0]).href;
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
    const accent = accents[state.accent];
    ctx.fillStyle = accent;ctx.font = 'bold 44px Inter, sans-serif';ctx.fillText('GITBRAG',72,96);
    function fit(input,max) {
      let text=String(input||'');
      while(ctx.measureText(text).width>max && text.length>5) text=text.slice(0,-2)+'…';
      return text;
    }
    ctx.fillStyle='#f5f5f7';ctx.font='bold 50px Inter, sans-serif';
    ctx.fillText(fit(repo.full_name,920),72,190);
    ctx.fillStyle='#92929b';ctx.font='24px Inter, sans-serif';
    ctx.fillText(fit(repo.description||'Public GitHub repository',920),72,246);

    if (state.modules.includes('metrics')) {
      const metrics = [
        ['STARS',fmt(repo.stargazers_count)],['FORKS',fmt(repo.forks_count)],['SUBSCRIBERS',fmt(repo.subscribers_count)],
        ['ISSUES + PRS',fmt(repo.open_issues_count)],
        ['CONTRIBUTORS',state.contributorsAvailable?fmt(state.contributors.length):'—'],
      ];
      metrics.forEach(([label,value],i)=>{
        const x=72+(i%3)*317,y=298+Math.floor(i/3)*148;
        ctx.fillStyle='#18181d';ctx.fillRect(x,y,298,132);
        ctx.fillStyle='#92929b';ctx.font='17px Inter, sans-serif';ctx.fillText(label,x+18,y+39);
        ctx.fillStyle='#f5f5f7';ctx.font='bold 40px Inter, sans-serif';ctx.fillText(fit(value,265),x+18,y+98);
      });
    }
    if(state.modules.includes('metadata')){
      ctx.fillStyle=accent;ctx.font='bold 23px Inter, sans-serif';ctx.fillText('REPOSITORY DETAILS',72,657);
      ctx.fillStyle='#d1d1d8';ctx.font='21px Inter, sans-serif';
      ctx.fillText(fit('Language: '+(repo.language||'—')+'   ·   License: '+(repo.license?.spdx_id||'—')+'   ·   Branch: '+(repo.default_branch||'—'),920),72,695);
    }
    ctx.fillStyle='#f5f5f7';ctx.font='21px Inter, sans-serif';ctx.fillText(fit('github.com/'+repo.full_name,920),72,1020);
    canvas.toBlob(blob => {
      if (!blob) { note.textContent = 'PNG export failed.'; return; }
      const url=URL.createObjectURL(blob), a=document.createElement('a');
      a.href=url;a.download='gitbrag-'+repo.owner.login+'-'+repo.name+'.png';a.click();
      setTimeout(()=>URL.revokeObjectURL(url),1500);
    },'image/png');
  }

  document.querySelectorAll('[data-repo-module]').forEach(control => control.addEventListener('change', () => {
    state.modules = moduleKeys.filter(key => document.querySelector('[data-repo-module="' + key + '"]').checked);
    updateUrl();
    if (state.repository) render();
  }));
  $('#repoAccent').addEventListener('change', (event) => {
    state.accent = Object.hasOwn(accents,event.target.value) ? event.target.value : 'blue';
    applySettings(); updateUrl();
  });
  $('#repoBack').addEventListener('click', back);
  $('#repoShare').addEventListener('click', () => state.repository && copy(shareUrl(),'Share link'));
  $('#repoEmbed').addEventListener('click', () => state.repository && embed());
  $('#repoPng').addEventListener('click', png);
  window.GitbragRepo = Object.freeze({ parse, route, load, back });
})();