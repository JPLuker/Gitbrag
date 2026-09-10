(function attachLandingPage(root) {
  'use strict';

  const searchView = document.getElementById('searchView');
  const primaryForm = document.getElementById('searchForm');
  const primaryInput = document.getElementById('username');
  const finalForm = document.getElementById('finalSearchForm');
  const finalInput = document.getElementById('finalUsername');

  function syncLandingState() {
    document.body.classList.toggle('landing-active', Boolean(searchView && !searchView.classList.contains('hidden')));
  }

  function submitThroughPrimary(value) {
    if (!primaryForm || !primaryInput) return;
    primaryInput.value = String(value || '').trim();
    primaryForm.requestSubmit();
  }

  finalForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    submitThroughPrimary(finalInput?.value);
  });

  document.querySelectorAll('[data-focus-gitbrag-search]').forEach((button) => {
    button.addEventListener('click', () => {
      searchView?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      root.setTimeout(() => primaryInput?.focus(), 350);
    });
  });

  document.querySelectorAll('[data-scroll-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = document.getElementById(button.dataset.scrollTarget || '');
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  const demoHeatmap = document.querySelector('.landing-demo-heatmap');
  if (demoHeatmap && !demoHeatmap.children.length) {
    const levels = [0,0,1,0,0,2,0,0,1,0,3,0,0,0,1,0,0,2,0,0,4,0,1,0,0,2,0,3,0,0,1,0,4,2,0,0,3,4,0,2,4,0];
    levels.forEach((level) => {
      const cell = document.createElement('i');
      if (level) cell.className = `level-${level}`;
      cell.setAttribute('aria-hidden', 'true');
      demoHeatmap.append(cell);
    });
  }

  const observer = searchView ? new MutationObserver(syncLandingState) : null;
  observer?.observe(searchView, { attributes: true, attributeFilter: ['class'] });
  syncLandingState();
})(window);
