/* Keep contribution loading resilient and identify Gitbrag to the public contribution API. */
(() => {
  const nativeFetch = window.fetch.bind(window);
  const base = 'https://github-contributions-api.jogruber.de/v4/';
  window.fetch = (input, init = {}) => {
    const raw = typeof input === 'string' ? input : input?.url;
    if (!raw || !raw.startsWith(base)) return nativeFetch(input, init);
    const url = new URL(raw);
    if (!url.searchParams.has('client')) url.searchParams.set('client', 'gitbrag');
    const options = {...init, cache: 'no-store'};
    return nativeFetch(url.toString(), options).then(async response => {
      if (!response.ok) return response;
      return response;
    });
  };
})();
