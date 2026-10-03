(() => {
  const data = window.PORTFOLIO_STATIC_DATA;
  if (!data) return;
  const originalFetch = window.fetch.bind(window);

  window.fetch = (input, options) => {
    const address = typeof input === 'string' || input instanceof URL ? input : input?.url;
    let url;
    try { url = new URL(address, window.location.href); }
    catch { return originalFetch(input, options); }
    const prefix = '/api/public/';
    const start = url.pathname.indexOf(prefix);
    if (start < 0 || !['http:', 'https:', 'file:'].includes(url.protocol)
      || (url.protocol !== 'file:' && url.origin !== window.location.origin)) return originalFetch(input, options);

    const route = url.pathname.slice(start + prefix.length);
    let result;
    let status = 200;
    if (route === 'projects') {
      const category = url.searchParams.get('category');
      result = { projects: category ? data.projects.filter((project) => project.category === category) : data.projects };
    } else if (route.startsWith('projects/')) {
      const id = decodeURIComponent(route.slice('projects/'.length));
      const project = data.projects.find((item) => item.id === id);
      if (project) result = { project };
      else { result = { error: 'Project not found' }; status = 404; }
    } else if (route === 'home-artwork') {
      result = { images: data.homeArtwork };
    } else {
      result = { error: 'Not found' };
      status = 404;
    }
    return Promise.resolve(new Response(JSON.stringify(result), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }));
  };
})();
