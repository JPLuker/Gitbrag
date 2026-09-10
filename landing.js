(function attachLandingPage() {
  'use strict';

  const searchView = document.getElementById('searchView');

  function syncLandingState() {
    document.body.classList.toggle(
      'landing-active',
      Boolean(searchView && !searchView.classList.contains('hidden')),
    );
  }

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
})();
