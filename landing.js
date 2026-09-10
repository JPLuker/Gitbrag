(function attachLandingPage() {
  'use strict';

  const searchView = document.getElementById('searchView');

  function syncLandingState() {
    document.body.classList.toggle(
      'landing-active',
      Boolean(searchView && !searchView.classList.contains('hidden')),
    );
  }

  const observer = searchView ? new MutationObserver(syncLandingState) : null;
  observer?.observe(searchView, { attributes: true, attributeFilter: ['class'] });
  syncLandingState();
})();
