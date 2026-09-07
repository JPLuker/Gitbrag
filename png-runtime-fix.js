/* v0.3.8: responsive preview plus repository typography scaled proportionally to the stats cards. */
(() => {
  const $ = id => document.getElementById(id);
  let raf = 0;

  const installRepoScaling = () => {
    if (document.getElementById('gitbrag-repo-scaling')) return;
    const style = document.createElement('style');
    style.id = 'gitbrag-repo-scaling';
    style.textContent = `
      .share-card .share-repos b{font-size:clamp(16px,3.5cqw,42px)!important}
      .share-card .share-repos p{font-size:clamp(8px,1.4cqw,16px)!important}
      .share-card .share-repos span{font-size:clamp(7px,1.05cqw,13px)!important}
      .share-card.size-compact .share-repos b{font-size:clamp(14px,3cqw,34px)!important}
      .share-card.size-balanced .share-repos b{font-size:clamp(16px,3.5cqw,42px)!important}
      .share-card.size-large .share-repos b{font-size:clamp(18px,4cqw,48px)!important}
      .share-card.size-huge .share-repos b{font-size:clamp(20px,4.5cqw,54px)!important}
      .share-card.size-compact .share-repos p{font-size:clamp(8px,1.2cqw,14px)!important}
      .share-card.size-large .share-repos p{font-size:clamp(9px,1.6cqw,18px)!important}
      .share-card.size-huge .share-repos p{font-size:clamp(10px,1.8cqw,20px)!important}
    `;
    document.head.appendChild(style);
  };

  const render = () => {
    raf = 0;
    installRepoScaling();
    const preview = $('sharePreview');
    const source = $('shareCard');
    if (!preview || !source || typeof window.pngBuild !== 'function') return;

    const layout = window.pngBuild();
    const cs = getComputedStyle(preview);
    const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    const padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    const availableWidth = Math.max(1, preview.clientWidth - padX);
    const renderedHeight = Math.ceil(availableWidth * layout.h / layout.w);

    preview.style.setProperty('aspect-ratio', 'auto', 'important');
    preview.style.setProperty('height', `${renderedHeight + padY}px`, 'important');
    preview.style.setProperty('overflow', 'hidden', 'important');
    preview.innerHTML = '';

    const clone = source.cloneNode(true);
    clone.removeAttribute('id');
    clone.classList.remove('preview-card');
    clone.style.cssText = [
      'position:relative!important',
      'left:0!important',
      'top:0!important',
      'width:100%!important',
      'height:auto!important',
      `aspect-ratio:${layout.w}/${layout.h}!important`,
      'min-width:0!important',
      'min-height:0!important',
      'max-width:none!important',
      'max-height:none!important',
      'display:block!important',
      'visibility:visible!important',
      'opacity:1!important',
      'transform:none!important',
      'transform-origin:top left!important',
      'margin:0!important',
      'overflow:hidden!important'
    ].join(';');
    preview.appendChild(clone);
  };

  const refresh = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => requestAnimationFrame(render));
  };

  window.pngPreview = render;
  window.pngRefresh = refresh;
  window.gitbragRenderPngPreview = render;

  const modal = $('pngModal');
  if (modal) {
    modal.addEventListener('change', () => refresh(), true);
    modal.addEventListener('input', () => refresh(), true);
    modal.addEventListener('click', event => {
      if (event.target.closest('#pngRatios, [data-module]')) refresh();
    }, true);
    new MutationObserver(() => {
      if (!modal.classList.contains('hidden')) refresh();
    }).observe(modal, { attributes: true, attributeFilter: ['class'] });
  }

  const preview = $('sharePreview');
  if (preview && 'ResizeObserver' in window) {
    new ResizeObserver(() => {
      if (!$('pngModal')?.classList.contains('hidden')) refresh();
    }).observe(preview);
  }
})();
