/* v0.3.6: preview renderer runs after png.js so the legacy renderer cannot overwrite it. */
(() => {
  const $ = id => document.getElementById(id);
  let timer = 0;

  const render = () => {
    const preview = $('sharePreview');
    const source = $('shareCard');
    if (!preview || !source || typeof window.pngBuild !== 'function') return;

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
    preview.innerHTML = '';

    const clone = source.cloneNode(true);
    clone.removeAttribute('id');
    clone.classList.remove('preview-card');
    clone.style.cssText = [
      'position:relative!important','left:0!important','top:0!important',
      `width:${layout.w}px!important`,`height:${layout.h}px!important`,
      `min-width:${layout.w}px!important`,`min-height:${layout.h}px!important`,
      'max-width:none!important','max-height:none!important','display:block!important',
      'visibility:visible!important','opacity:1!important',
      `transform:scale(${scale})!important`,'transform-origin:top left!important',
      'margin:0!important','overflow:hidden!important'
    ].join(';');
    preview.appendChild(clone);
  };

  // png.js's own event handlers run before this script's bubble handlers.
  // Delay the corrected render so it is the final render for every change.
  const refresh = () => {
    clearTimeout(timer);
    timer = setTimeout(render, 100);
  };

  window.pngPreview = render;
  window.pngRefresh = refresh;
  window.gitbragRenderPngPreview = render;

  const modal = $('pngModal');
  if (modal) {
    modal.addEventListener('change', refresh, false);
    modal.addEventListener('input', refresh, false);
    modal.addEventListener('click', event => {
      if (event.target.closest('#pngRatios, [data-module]')) refresh();
    }, false);
    new MutationObserver(() => {
      if (!modal.classList.contains('hidden')) refresh();
    }).observe(modal, {attributes:true, attributeFilter:['class']});
  }

  const preview = $('sharePreview');
  if (preview && 'ResizeObserver' in window) {
    new ResizeObserver(() => {
      if (!$('pngModal')?.classList.contains('hidden')) refresh();
    }).observe(preview);
  }
})();
