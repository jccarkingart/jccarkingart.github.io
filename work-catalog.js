(() => {
  const grid = document.getElementById('work-grid');
  const message = document.getElementById('work-message');
  if (!grid) return;
  const preview = window.PORTFOLIO_PREVIEW === true;
  const endpoint = preview ? '/api/admin/preview/projects' : '/api/public/projects';
  const categoryNames = { 'character-design': 'CHARACTER DESIGN', illustration: 'ILLUSTRATION', '3d-modeling': '3D MODELING' };
  const queryCategory = new URLSearchParams(location.search || '').get('category');
  const requestedCategory = preview ? window.PORTFOLIO_PREVIEW_CATEGORY : queryCategory;
  let category = Object.hasOwn(categoryNames, requestedCategory) ? requestedCategory : '';
  const categoryNav = document.querySelector('.filter-pills');
  const filters = [...document.querySelectorAll('.filter-pills .filter-pill')];
  const caption = document.querySelector('.submenu-caption');
  const projectCache = new Map();
  let renderRevision = 0;
  // Titles must use their final metrics before they determine grid row heights.
  const typographyReady = document.fonts
    ? Promise.all([document.fonts.load('900 42px Inter'), document.fonts.load('700 10px Inter')]).catch(() => {})
    : Promise.resolve();

  function updateNavigation() {
    filters.forEach((filter) => {
      const isSelected = (filter.dataset.category || '') === category;
      filter.classList.toggle('active', isSelected);
      if (isSelected) filter.setAttribute('aria-current', 'page');
      else filter.removeAttribute('aria-current');
    });
    if (caption) caption.textContent = category ? `${categoryNames[category]} PROJECTS` : 'ALL PROJECTS';
  }

  function card(project, index, activeCategory) {
    const link = document.createElement('a');
    const projectParams = new URLSearchParams({ project: project.id });
    if (activeCategory) projectParams.set('category', activeCategory);
    link.href = `${preview ? '/preview/project' : 'jessica-cui-project.html'}?${projectParams}`;
    link.className = `bento-cell project-bento-card col-span-12 ${index % 3 === 0 ? 'lg:col-span-8' : 'lg:col-span-4'} group overflow-hidden cms-work-card`;
    link.setAttribute('aria-label', `Open ${project.title}`);

    const head = document.createElement('div');
    head.className = 'cms-work-card-head';
    const number = document.createElement('span');
    number.className = 'cms-work-number';
    number.textContent = `PROJECT ${String(index + 1).padStart(2, '0')} / ${categoryNames[project.category] || 'WORK'}`;
    const title = document.createElement('h2');
    title.className = 'cms-work-title';
    title.textContent = project.title;
    head.append(number, title);

    const frame = document.createElement('div');
    frame.className = 'cms-work-cover';
    const cover = project.images?.find((image) => image.id === project.coverImageId);
    const width = project.coverWidth || cover?.width;
    const height = project.coverHeight || cover?.height;
    // The frame, rather than the asynchronously loaded image, sizes the row.
    frame.style.aspectRatio = width > 0 && height > 0 ? `${width} / ${height}` : index % 3 === 0 ? '2 / 1' : '1 / 1';
    if (project.coverUrl) {
      const image = document.createElement('img');
      image.src = project.coverUrl;
      image.alt = `${project.title} cover`;
      if (width > 0 && height > 0) {
        image.width = width;
        image.height = height;
      }
      image.style.objectPosition = `${project.coverPosition?.x ?? 50}% ${project.coverPosition?.y ?? 50}%`;
      image.style.setProperty('--cover-zoom', String((project.coverZoom ?? 100) / 100));
      image.loading = index > 1 ? 'lazy' : 'eager';
      frame.append(image);
    }
    link.append(head, frame);
    return link;
  }

  async function loadProjects(activeCategory) {
    const cacheKey = activeCategory || '__all__';
    if (projectCache.has(cacheKey)) return projectCache.get(cacheKey);
    const projectsUrl = activeCategory ? `${endpoint}?category=${encodeURIComponent(activeCategory)}` : endpoint;
    const response = await fetch(projectsUrl, { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load projects');
    const { projects = [] } = await response.json();
    projectCache.set(cacheKey, projects);
    return projects;
  }

  async function renderCategory(nextCategory, { updateLocation = false, force = false } = {}) {
    const normalized = Object.hasOwn(categoryNames, nextCategory) ? nextCategory : '';
    const changed = normalized !== category;
    category = normalized;
    updateNavigation();
    window.dispatchEvent(new CustomEvent('portfolio:work-category-change', { detail: { category } }));

    if (updateLocation) {
      if (preview) window.PORTFOLIO_PREVIEW_CATEGORY = category;
      else if (changed) {
        const nextUrl = new URL(location.href);
        if (category) nextUrl.searchParams.set('category', category);
        else nextUrl.searchParams.delete('category');
        history.pushState({ category }, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
      }
    }
    if (!changed && !force) return;

    const revision = ++renderRevision;
    grid.setAttribute('aria-busy', 'true');
    try {
      const [projects] = await Promise.all([loadProjects(category), typographyReady]);
      if (revision !== renderRevision) return;
      const visibleProjects = category ? projects.filter((project) => project.category === category) : projects;
      grid.replaceChildren(...visibleProjects.map((project, index) => card(project, index, category)));
      message.hidden = visibleProjects.length > 0;
      if (!visibleProjects.length) {
        message.textContent = category
          ? `No ${categoryNames[category].toLowerCase()} projects yet.`
          : preview ? 'No drafts to preview yet.' : 'New work is coming soon.';
      }
    } catch {
      if (revision !== renderRevision) return;
      message.hidden = false;
      message.textContent = 'Projects are temporarily unavailable.';
    } finally {
      if (revision === renderRevision) grid.removeAttribute('aria-busy');
    }
  }

  if (categoryNav) {
    categoryNav.addEventListener('click', (event) => {
      if (event.defaultPrevented) {
        event.stopPropagation();
        return;
      }
      const link = event.target.closest?.('.filter-pill');
      if (!link || event.target.closest('.category-project-menu')) return;
      event.preventDefault();
      event.stopPropagation();
      void renderCategory(link.dataset.category || '', { updateLocation: true });
    });
  }

  window.addEventListener('popstate', () => {
    if (!preview) void renderCategory(new URLSearchParams(location.search).get('category') || '', { force: true });
  });

  updateNavigation();
  void renderCategory(category, { force: true });
})();
