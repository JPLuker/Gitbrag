/* v0.3.1: fit the native PNG canvas inside the preview without clipping. */
(() => {
  window.pngPreview = function pngPreviewFixed() {
    const preview = document.getElementById('sharePreview');
    if (!preview || typeof window.pngBuild !== 'function') return;

    preview.innerHTML = '';
    const layout = window.pngBuild();
    const cs = getComputedStyle(preview);
    const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    const padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
    const availableWidth = Math.max(1, preview.clientWidth - padX);
    const cardHeight = Math.max(1, Math.round(availableWidth * layout.h / layout.w));
    const scale = availableWidth / layout.w;

    preview.style.setProperty('width', '100%', 'important');
    preview.style.setProperty('height', (cardHeight + padY) + 'px', 'important');
    preview.style.setProperty('aspect-ratio', 'auto', 'important');
    preview.style.setProperty('overflow', 'hidden', 'important');
    preview.style.setProperty('background', '#08080a', 'important');

    const source = document.getElementById('shareCard');
    if (!source) return;

    const clone = source.cloneNode(true);
    clone.removeAttribute('id');
    clone.classList.add('preview-card');
    clone.style.setProperty('position', 'relative', 'important');
    clone.style.setProperty('left', '0', 'important');
    clone.style.setProperty('top', '0', 'important');
    clone.style.setProperty('width', layout.w + 'px', 'important');
    clone.style.setProperty('height', layout.h + 'px', 'important');
    clone.style.setProperty('min-width', layout.w + 'px', 'important');
    clone.style.setProperty('min-height', layout.h + 'px', 'important');
    clone.style.setProperty('max-width', 'none', 'important');
    clone.style.setProperty('max-height', 'none', 'important');
    clone.style.setProperty('display', 'block', 'important');
    clone.style.setProperty('visibility', 'visible', 'important');
    clone.style.setProperty('opacity', '1', 'important');
    clone.style.setProperty('transform', `scale(${scale})`, 'important');
    clone.style.setProperty('transform-origin', 'top left', 'important');
    clone.style.setProperty('margin', '0', 'important');
    clone.style.setProperty('overflow', 'hidden', 'important');

    preview.appendChild(clone);
  };
})();
