(() => {
  const categoryNav = document.querySelector('.filter-pills');
  if (!categoryNav) return;
  const hoverRegion = document.querySelector('.submenu') || categoryNav;

  const labels = {
    'character-design': 'CHARACTER DESIGN',
    illustration: 'ILLUSTRATION',
    '3d-modeling': '3D MODELING',
  };
  const links = [...categoryNav.querySelectorAll('[data-category]')];
  const preview = window.PORTFOLIO_PREVIEW === true;
  const cache = new Map();
  const pending = new Map();
  const menu = document.createElement('div');
  menu.className = 'category-project-menu';
  menu.id = 'category-project-menu';
  menu.setAttribute('role', 'group');
  menu.hidden = true;
  categoryNav.append(menu);
  links.forEach((link) => link.setAttribute('aria-haspopup', 'true'));

  function loadCategory(category) {
    if (cache.has(category)) return Promise.resolve(cache.get(category));
    if (pending.has(category)) return pending.get(category);
    const endpoint = preview ? '/api/admin/preview/projects' : '/api/public/projects';
    const request = fetch(`${endpoint}?category=${encodeURIComponent(category)}`, {
      credentials: 'same-origin', cache: 'no-store',
    }).then((response) => response.ok ? response.json() : Promise.reject(new Error('Projects are temporarily unavailable.')))
      .then(({ projects = [] }) => {
        const matching = projects.filter((project) => project.category === category && project.title);
        cache.set(category, matching);
        pending.delete(category);
        return matching;
      }).catch((error) => {
        pending.delete(category);
        throw error;
      });
    pending.set(category, request);
    return request;
  }

  function projectHref(category, project) {
    const path = preview ? '/preview/project' : 'jessica-cui-project.html';
    const params = new URLSearchParams({ project: project.id, category });
    return `${path}?${params}`;
  }

  let currentCategory = '';
  let renderRevision = 0;
  let touchOpenedCategory = '';
  let closeTimer = 0;
  const categoryLink = (category) => links.find((link) => link.dataset.category === category);

  function cancelClose() {
    if (closeTimer) clearTimeout(closeTimer);
    closeTimer = 0;
  }

  function scheduleClose() {
    cancelClose();
    closeTimer = setTimeout(() => {
      closeTimer = 0;
      closeMenu();
    }, 200);
  }

  function positionMenu(link) {
    const navRect = categoryNav.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    const left = Math.max(0, Math.min(linkRect.left - navRect.left, Math.max(0, navRect.width - 280)));
    menu.style.setProperty('--menu-left', `${left}px`);
  }

  async function openMenu(category, link) {
    if (!labels[category] || !link) return;
    cancelClose();
    currentCategory = category;
    const revision = ++renderRevision;
    positionMenu(link);
    menu.hidden = false;
    categoryNav.dataset.openCategory = category;
    menu.setAttribute('aria-label', `${labels[category]} projects`);
    menu.replaceChildren();
    const status = document.createElement('p');
    status.className = 'category-project-menu-status';
    status.textContent = 'Loading projects…';
    menu.append(status);
    try {
      const projects = await loadCategory(category);
      if (revision !== renderRevision || currentCategory !== category) return;
      menu.replaceChildren();
      if (!projects.length) {
        status.textContent = 'No published projects yet.';
        menu.append(status);
        return;
      }
      projects.forEach((project) => {
        const item = document.createElement('a');
        item.className = 'category-project-menu-item';
        item.href = projectHref(category, project);
        item.textContent = project.title;
        item.dataset.projectId = project.id;
        menu.append(item);
      });
    } catch {
      if (revision !== renderRevision || currentCategory !== category) return;
      status.textContent = 'Projects are temporarily unavailable.';
      menu.replaceChildren(status);
    }
  }

  function closeMenu() {
    cancelClose();
    renderRevision++;
    currentCategory = '';
    delete categoryNav.dataset.openCategory;
    menu.hidden = true;
  }

  hoverRegion.addEventListener('pointerover', (event) => {
    if (event.pointerType === 'touch') return;
    cancelClose();
    const link = event.target.closest?.('[data-category]');
    if (link && link.dataset.category !== currentCategory) {
      openMenu(link.dataset.category, link);
    }
  });
  hoverRegion.addEventListener('pointerleave', scheduleClose);
  hoverRegion.addEventListener('focusin', (event) => {
    cancelClose();
    const link = event.target.closest?.('[data-category]');
    if (link) openMenu(link.dataset.category, link);
  });
  hoverRegion.addEventListener('focusout', (event) => {
    if (!hoverRegion.contains(event.relatedTarget)) scheduleClose();
  });
  menu.addEventListener('click', (event) => {
    if (event.target.closest?.('.category-project-menu-item')) {
      touchOpenedCategory = '';
      closeMenu();
    }
  });
  categoryNav.addEventListener('click', (event) => {
    const link = event.target.closest?.('[data-category]');
    if (!link || event.target.closest('.category-project-menu')) return;
    const category = link.dataset.category;
    const touch = matchMedia('(hover: none), (pointer: coarse)').matches || navigator.maxTouchPoints > 0;
    if (!touch) return;
    if (touchOpenedCategory !== category || menu.hidden) {
      event.preventDefault();
      touchOpenedCategory = category;
      openMenu(category, link);
      return;
    }
    touchOpenedCategory = '';
    closeMenu();
  });
  document.addEventListener('pointerdown', (event) => {
    if (!hoverRegion.contains(event.target)) {
      touchOpenedCategory = '';
      closeMenu();
    }
  });
  categoryNav.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) {
      event.preventDefault();
      const category = currentCategory;
      closeMenu();
      categoryLink(category)?.focus();
      return;
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) && !menu.hidden) {
      const items = [...menu.querySelectorAll('.category-project-menu-item')];
      if (!items.length) return;
      const current = items.indexOf(document.activeElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
        : event.key === 'ArrowDown' ? (current + 1) % items.length
          : (current <= 0 ? items.length - 1 : current - 1);
      event.preventDefault();
      items[next].focus();
    }
  });
  window.addEventListener('resize', () => {
    if (menu.hidden || !currentCategory) return;
    const link = categoryLink(currentCategory);
    if (link) positionMenu(link);
  });

  const gallery = document.getElementById('project-gallery');
  if (!gallery || !window.createPortfolioStrip) return;
  const pageCategory = document.body.dataset.workCategory || links.find((link) => link.classList.contains('active'))?.dataset.category;
  if (!labels[pageCategory]) return;

  const detail = document.getElementById('view-project');
  let activeProject = null;
  const strip = window.createPortfolioStrip({
    gallery,
    viewport: document.getElementById('project-gallery-viewport'),
    track: document.getElementById('project-gallery-track'),
    previous: document.getElementById('previous'),
    next: document.getElementById('next'),
    activeId: 'slide-image',
    onSelect(entry, index, count) {
      const project = entry?.project;
      if (!project) return;
      activeProject = project;
      document.getElementById('slide-title').textContent = project.title;
      document.getElementById('slide-caption').textContent = entry.caption || entry.description || project.description || '';
      const counter = `${String(index + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}`;
      document.getElementById('slide-number').textContent = `${labels[pageCategory]} · IMAGE ${counter}`;
      document.getElementById('counter').textContent = counter;
      if (detail) {
        detail.href = `${preview ? '/preview/project' : 'jessica-cui-project.html'}?project=${encodeURIComponent(project.id)}`;
        detail.hidden = false;
      }
    },
  });

  function projectImages(project) {
    const images = (project.images || []).filter((image) => image?.url);
    if (images.length) return images;
    if (project.coverUrl) return [{ id: project.coverImageId || `${project.id}-cover`, url: project.coverUrl, type: project.coverType || 'image/webp' }];
    return [];
  }

  loadCategory(pageCategory).then((projects) => {
    const params = new URLSearchParams(location.search);
    const requestedId = params.get('item') || window.PORTFOLIO_PREVIEW_PROJECT_ID;
    const requested = projects.find((project) => project.id === requestedId);
    activeProject = requested || projects[0] || null;
    if (!activeProject) {
      strip.setItems([], 0);
      document.getElementById('slide-title').textContent = 'New work is coming soon.';
      document.getElementById('slide-caption').textContent = '';
      document.getElementById('slide-number').textContent = `${labels[pageCategory]} · IMAGE 00 / 00`;
      document.getElementById('counter').textContent = '00 / 00';
      if (detail) detail.hidden = true;
      return;
    }
    const entries = projectImages(activeProject).map((image) => ({ ...image, project: activeProject }));
    if (!entries.length) {
      strip.setItems([], 0);
      document.getElementById('slide-title').textContent = activeProject.title;
      document.getElementById('slide-caption').textContent = activeProject.description || '';
      document.getElementById('slide-number').textContent = `${labels[pageCategory]} · IMAGE 00 / 00`;
      document.getElementById('counter').textContent = '00 / 00';
      if (detail) detail.hidden = true;
      return;
    }
    strip.setItems(entries, Math.max(0, Math.min(Number(params.get('photo')) || 0, entries.length - 1)));
  }).catch(() => {
    strip.setItems([], 0);
    document.getElementById('slide-title').textContent = 'Projects are temporarily unavailable.';
    document.getElementById('slide-caption').textContent = '';
    document.getElementById('slide-number').textContent = `${labels[pageCategory]} · IMAGE 00 / 00`;
    document.getElementById('counter').textContent = '00 / 00';
    if (detail) detail.hidden = true;
  });
})();
