/* v0.3.3: isolate PNG preview/settings from the legacy refresh path. */
(() => {
  const $ = id => document.getElementById(id);
  const render = () => {
    const preview = $('sharePreview');
    if (!preview || typeof window.pngBuild !== 'function') return;

    preview.innerHTML = '';
    const layout = window.pngBuild();
    const styles = getComputedStyle(preview);
    const padX = (parseFloat(styles.paddingLeft) || 0) + (parseFloat(styles.paddingRight) || 0);
    const padY = (parseFloat(styles.paddingTop) || 0) + (parseFloat(styles.paddingBottom) || 0);
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

    const calendar = clone.querySelector('.share-calendar');
    if (calendar) {
      const cells = calendar.children.length;
      const weeks = Math.max(1, Math.ceil(cells / 7));
      calendar.style.setProperty('grid-template-columns', `repeat(${weeks}, minmax(0, 1fr))`, 'important');
    }

    preview.appendChild(clone);
  };

  const refresh = () => requestAnimationFrame(render);

  const modal = $('pngModal');
  if (modal) {
    modal.addEventListener('change', event => {
      const target = event.target;
      if (target.matches('#setCalendarRange, #setCalendarLabel, .module-settings input, .module-settings select, .png-settings input, .png-settings select')) {
        setTimeout(refresh, 0);
      }
    });
    modal.addEventListener('input', event => {
      if (event.target.matches('.module-settings input, .module-settings select, .png-settings input, .png-settings select')) {
        refresh();
      }
    });
  }

  const ratios = $('pngRatios');
  if (ratios) ratios.addEventListener('click', () => setTimeout(refresh, 0));

  const open = $('pngBtn');
  if (open) open.addEventListener('click', () => setTimeout(refresh, 50));

  window.gitbragRenderPngPreview = render;
})();
