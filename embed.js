(function attachGitbragEmbed(root) {
  'use strict';

  const EMBED_PARAM = 'embed';
  const RESIZE_MESSAGE = 'gitbrag:resize';
  const MIN_HEIGHT = 320;
  const DEFAULT_HEIGHT = 760;

  let resizeObserver = null;
  let mutationObserver = null;
  let resizeFrame = 0;

  function parseHashParams() {
    const raw = root.location.hash.replace(/^#\/?/, '');
    const queryIndex = raw.indexOf('?');
    if (queryIndex < 0) return new URLSearchParams();
    return new URLSearchParams(raw.slice(queryIndex + 1));
  }

  function isEmbedRoute() {
    const params = parseHashParams();
    return params.get(EMBED_PARAM) === '1' && (params.has('s') || params.has('share'));
  }

  function setEmbedClass(active) {
    document.documentElement.classList.toggle('gitbrag-embed', active);
    document.body?.classList.toggle('gitbrag-embed', active);
  }

  function measuredHeight() {
    const sharedView = document.querySelector('#sharedView');
    const sharedPage = document.querySelector('#sharedPage');
    return Math.ceil(Math.max(
      MIN_HEIGHT,
      sharedView?.scrollHeight || 0,
      sharedPage?.scrollHeight || 0,
      document.body?.scrollHeight || 0,
      document.documentElement?.scrollHeight || 0,
    ));
  }

  function reportHeight() {
    resizeFrame = 0;
    if (!isEmbedRoute() || root.parent === root) return;
    root.parent.postMessage({ type: RESIZE_MESSAGE, height: measuredHeight() }, '*');
  }

  function scheduleHeightReport() {
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(reportHeight);
  }

  function observeEmbedSize() {
    resizeObserver?.disconnect();
    mutationObserver?.disconnect();
    resizeObserver = null;
    mutationObserver = null;

    const sharedView = document.querySelector('#sharedView');
    const sharedPage = document.querySelector('#sharedPage');

    if ('ResizeObserver' in root && sharedView) {
      resizeObserver = new ResizeObserver(scheduleHeightReport);
      resizeObserver.observe(sharedView);
      if (sharedPage) resizeObserver.observe(sharedPage);
    }

    if ('MutationObserver' in root && sharedView) {
      mutationObserver = new MutationObserver(scheduleHeightReport);
      mutationObserver.observe(sharedView, { childList: true, subtree: true, attributes: true });
    }
  }

  function syncEmbedMode() {
    const active = isEmbedRoute();
    setEmbedClass(active);
    if (active) {
      observeEmbedSize();
      scheduleHeightReport();
    } else {
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    }
  }

  function createUrl(config) {
    const shareUrl = root.GitbragApp?.createShareUrl?.(config);
    if (!shareUrl) return '';

    const url = new URL(shareUrl);
    const hash = url.hash || '';
    const queryIndex = hash.indexOf('?');
    const route = queryIndex >= 0 ? hash.slice(0, queryIndex) : hash;
    const params = new URLSearchParams(queryIndex >= 0 ? hash.slice(queryIndex + 1) : '');
    params.set(EMBED_PARAM, '1');
    url.hash = `${route}?${params.toString()}`;
    return url.toString();
  }

  function htmlAttribute(value) {
    return String(value).replace(/[&"<>]/g, (character) => ({
      '&': '&amp;',
      '"': '&quot;',
      '<': '&lt;',
      '>': '&gt;',
    })[character]);
  }

  function embedIdentity(url) {
    const parsed = new URL(url);
    const match = parsed.hash.match(/^#\/([^?]+)/);
    let username = 'Gitbrag profile';
    try {
      username = match?.[1] ? decodeURIComponent(match[1]) : username;
    } catch {
      // Keep the safe fallback.
    }
    const params = new URLSearchParams((parsed.hash.split('?')[1] || ''));
    const token = params.get('s') || params.get('share') || 'profile';
    const safeUser = username.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'profile';
    const safeToken = token.replace(/[^A-Za-z0-9_-]+/g, '').slice(0, 8) || 'embed';
    return { username, frameId: `gitbrag-${safeUser}-${safeToken}` };
  }

  function createCode(config) {
    const url = createUrl(config);
    if (!url) return '';
    const { username, frameId } = embedIdentity(url);
    const safeId = htmlAttribute(frameId);
    const safeUrl = htmlAttribute(url);
    const safeTitle = htmlAttribute(`${username} on Gitbrag`);

    return `<iframe id="${safeId}" src="${safeUrl}" title="${safeTitle}" loading="lazy" style="width:100%;height:${DEFAULT_HEIGHT}px;border:0;border-radius:16px;overflow:hidden"></iframe>\n<script>\n(() => {\n  const frame = document.getElementById('${frameId}');\n  if (!frame) return;\n  const origin = new URL(frame.src).origin;\n  window.addEventListener('message', (event) => {\n    if (event.source !== frame.contentWindow || event.origin !== origin) return;\n    if (event.data?.type !== '${RESIZE_MESSAGE}') return;\n    const height = Number(event.data.height);\n    if (Number.isFinite(height)) frame.style.height = Math.max(${MIN_HEIGHT}, Math.ceil(height)) + 'px';\n  });\n})();\n</script>`;
  }

  function preview(config) {
    const url = createUrl(config);
    if (!url) return false;
    root.open(url, '_blank', 'noopener,noreferrer');
    return true;
  }

  root.addEventListener('hashchange', syncEmbedMode);
  root.addEventListener('popstate', syncEmbedMode);
  root.addEventListener('resize', scheduleHeightReport, { passive: true });
  root.addEventListener('load', scheduleHeightReport);
  document.addEventListener('DOMContentLoaded', syncEmbedMode, { once: true });

  root.GitbragEmbed = Object.freeze({
    createUrl,
    createCode,
    preview,
    isEmbedRoute,
    reportHeight: scheduleHeightReport,
  });

  if (document.readyState !== 'loading') syncEmbedMode();
})(window);
