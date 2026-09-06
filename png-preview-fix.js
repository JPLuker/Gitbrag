/* v0.3.0: render the preview at the real canvas size, then scale the whole card as one unit. */
(() => {
  window.pngPreview = function pngPreviewFixed() {
    const preview = document.getElementById('sharePreview');
    if (!preview) return;

    preview.innerHTML = '';
    const layout = window.pngBuild();
    const availableWidth = Math.max(1, preview.clientWidth);
    const availableHeight = Math.max(1, Math.round(availableWidth * layout.h / layout.w));
    const scale = availableWidth / layout.w;

    preview.style.setProperty('width', '100%', 'important');
    preview.style.setProperty('height', availableHeight + 'px', 'important');
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
