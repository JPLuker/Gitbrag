/* v0.3.4: make PNG preview rendering a single authoritative path. */
(() => {
  const $ = id => document.getElementById(id);

  const render = () => {
    const preview = $('sharePreview');
    if (!preview || typeof window.pngBuild !== 'function') return;

    preview.innerHTML = '';
    const layout = window.pngBuild();
    const cs = getComputedStyle(preview);
    const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    const padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    const availableWidth = Math.max(1, preview.clientWidth - padX);
    const scale = availableWidth / layout.w;
    const height = Math.ceil(layout.h * scale);

    preview.style.setProperty('aspect-ratio', 'auto', 'important');
    preview.style.setProperty('height', `${height + padY}px`, 'important');
    preview.style.setProperty('overflow', 'hidden', 'important');

    const source = $('shareCard');
    if (!source) return;
    const clone = source.cloneNode(true);
    clone.removeAttribute('id');
    clone.classList.remove('preview-card');
    clone.style.cssText = `position:relative!important;left:0!important;top:0!important;width:${layout.w}px!important;height:${layout.h}px!important;min-width:${layout.w}px!important;min-height:${layout.h}px!important;max-width:none!important;max-height:none!important;display:block!important;visibility:visible!important;opacity:1!important;transform:scale(${scale})!important;transform-origin:top left!important;margin:0!important;overflow:hidden!important;`;
    preview.appendChild(clone);
  };

  const refresh = () => requestAnimationFrame(render);

  // Replace the old renderer/refresh path so there is exactly one preview implementation.
  window.pngPreview = render;
  window.pngRefresh = refresh;
  window.gitbragRenderPngPreview = render;

  const modal = $('pngModal');
  if (modal) {
    modal.addEventListener('change', event => {
      const target = event.target;
      if (target.matches('#setCalendarRange')) {
        refresh();
        return;
      }
      if (target.matches('[data-module], .module-settings input, .module-settings select, .png-settings input, .png-settings select')) refresh();
    }, true);
  }

  const ratios = $('pngRatios');
  if (ratios) ratios.addEventListener('click', refresh, true);
})();
