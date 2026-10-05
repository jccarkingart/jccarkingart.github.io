(() => {
  const hero = document.querySelector('.hero-character');
  const artworkEndpoint = window.PORTFOLIO_PREVIEW
    ? '/api/admin/home-artwork'
    : '/api/public/home-artwork';
  if (hero) {
    let activeArtwork = null;
    const scalePercent = (value) => Math.max(50, Math.min(150, Number.isFinite(Number(value)) ? Number(value) : 100));
    const applyArtworkScale = () => {
      if (!activeArtwork) return;
      const scale = scalePercent(activeArtwork.scale);
      hero.style.setProperty('--hero-artwork-scale', String(scale / 100));
      // Let the responsive stylesheet set the base dimensions; only the owner's
      // saved percentage changes the artwork scale.
      hero.style.width = '';
      hero.style.height = '';
    };
    hero.addEventListener('load', applyArtworkScale);
    window.addEventListener('resize', applyArtworkScale);
    window.addEventListener('message', (event) => {
      const request = event.data;
      if (event.source !== window.parent || request?.type !== 'studio-home-artwork-scale' || request.id !== activeArtwork?.id) return;
      activeArtwork = { ...activeArtwork, scale: scalePercent(request.scale) };
      applyArtworkScale();
    });
    fetch(artworkEndpoint, { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => {
        const byId = new Map((data.images || []).map((image) => [image.id, image]));
        const candidates = window.PORTFOLIO_PREVIEW
          ? (data.draftIds || []).map((id) => byId.get(id)).filter((image) => image?.url)
          : (data.images || []).filter((image) => image?.url);
        const unique = [...new Map(candidates.map((image) => [image.url, image])).values()];
        if (!unique.length) return;
        let previousUrl = '';
        try { previousUrl = sessionStorage.getItem('portfolio-home-artwork') || ''; } catch {}
        if (!previousUrl) {
          try { previousUrl = history.state?.portfolioHomeArtwork || ''; } catch {}
        }
        const choices = unique.length > 1 ? unique.filter((image) => image.url !== previousUrl) : unique;
        const selected = choices[Math.floor(Math.random() * choices.length)];
        if (!selected) return;
        activeArtwork = selected;
        hero.dataset.artworkId = selected.id;
        applyArtworkScale();
        hero.src = selected.url;
        if (hero.complete && hero.naturalWidth) applyArtworkScale();
        hero.alt = selected.id === 'default' ? 'Character concept artwork' : 'Homepage character artwork';
        try { sessionStorage.setItem('portfolio-home-artwork', selected.url); } catch {}
        try { history.replaceState({ ...(history.state || {}), portfolioHomeArtwork: selected.url }, ''); } catch {}
      })
      .catch(() => {});
  }

  const list = document.getElementById('home-featured-projects');
  if (!list) return;
  const categoryLabels = {
    'character-design': 'CHARACTER DESIGN',
  };
  const selectionStorageKey = 'portfolio-home-featured-projects';
  const validProjectId = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const usableImageUrl = (value) => {
    if (typeof value !== 'string' || !value.trim()) return false;
    try {
      const protocol = new URL(value, document.baseURI || window.location.href).protocol;
      return ['http:', 'https:', 'blob:', 'data:'].includes(protocol)
        || (protocol === 'file:' && window.location.protocol === 'file:');
    } catch { return false; }
  };
  const shuffled = (items) => {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const other = Math.floor(Math.random() * (index + 1));
      [result[index], result[other]] = [result[other], result[index]];
    }
    return result;
  };
  function selectProjects(projects) {
    const eligible = (Array.isArray(projects) ? projects : []).flatMap((project) => {
      const coverUrl = usableImageUrl(project?.homeCoverUrl) ? project.homeCoverUrl
        : usableImageUrl(project?.coverUrl) ? project.coverUrl : '';
      if (!validProjectId(project?.id) || !String(project?.title || '').trim() || !categoryLabels[project?.category] || !coverUrl) return [];
      return [{ project, coverUrl }];
    });
    if (!eligible.length) return [];

    const randomized = shuffled(eligible);
    const uniqueSelection = randomized.slice(0, Math.min(3, randomized.length));
    let previousIds = [];
    try {
      const saved = JSON.parse(localStorage.getItem(selectionStorageKey) || '[]');
      if (Array.isArray(saved)) previousIds = saved.filter(validProjectId);
    } catch {}
    const previousSet = [...previousIds].sort().join('|');
    const selectedSet = uniqueSelection.map(({ project }) => project.id).sort().join('|');
    if (eligible.length > 3 && selectedSet === previousSet) {
      const selectedIds = new Set(uniqueSelection.map(({ project }) => project.id));
      const alternatives = randomized.filter(({ project }) => !selectedIds.has(project.id));
      if (alternatives.length) uniqueSelection[uniqueSelection.length - 1] = alternatives[0];
    }

    // Keep all three existing homepage slots populated when the published pool is small.
    const selection = [...uniqueSelection];
    for (let index = 0; selection.length < 3; index += 1) selection.push(uniqueSelection[index % uniqueSelection.length]);
    try { localStorage.setItem(selectionStorageKey, JSON.stringify(uniqueSelection.map(({ project }) => project.id))); } catch {}
    return selection;
  }

  fetch('/api/public/projects', { cache: 'no-store' })
    .then((response) => response.ok ? response.json() : Promise.reject())
    .then(({ projects }) => {
      const selection = selectProjects(projects);
      const entries = selection.map(({ project, coverUrl }) => {
        const link = document.createElement('a');
        link.href = `jessica-cui-project.html?project=${encodeURIComponent(project.id)}`;
        link.className = 'flex items-center gap-8 group cursor-pointer no-underline';
        const frame = document.createElement('div');
        frame.className = 'home-featured-frame relative w-28 h-28 flex items-center justify-center p-2 overflow-hidden';
        const image = document.createElement('img');
        image.src = coverUrl;
        image.alt = '';
        image.className = 'w-full h-full object-cover';
        image.style.objectPosition = `${project.homeCoverPosition?.x ?? 50}% ${project.homeCoverPosition?.y ?? 50}%`;
        image.style.transform = `scale(${(project.homeCoverZoom ?? 100) / 100})`;
        frame.append(image);
        ['top-left', 'top-right', 'bottom-left', 'bottom-right'].forEach((corner) => {
          const mark = document.createElement('span');
          mark.className = `star-hollow text-black home-featured-frame-corner home-featured-frame-corner--${corner}`;
          mark.setAttribute('aria-hidden', 'true');
          frame.append(mark);
        });
        const copy = document.createElement('div');
        const title = document.createElement('span');
        title.className = 'text-[9px] font-black tracking-[0.4em] block mb-3';
        title.textContent = project.title.toUpperCase();
        const category = document.createElement('p');
        category.className = 'text-[10px] leading-relaxed tracking-[0.15em] font-medium text-black/50 uppercase';
        category.textContent = categoryLabels[project.category];
        copy.append(title, category);
        link.append(frame, copy);
        return link;
      });
      list.replaceChildren(...entries);
    })
    .catch(() => {});
})();
