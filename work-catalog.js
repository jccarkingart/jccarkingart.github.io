(() => {
  const grid = document.getElementById('work-grid');
  const message = document.getElementById('work-message');
  if (!grid) return;
  const preview = window.PORTFOLIO_PREVIEW === true;
  const endpoint = preview ? '/api/admin/preview/projects' : '/api/public/projects';
  const categoryNames = { 'character-design': 'CHARACTER DESIGN', illustration: 'ILLUSTRATION', '3d-modeling': '3D MODELING' };
  const queryCategory = new URLSearchParams(location.search || '').get('category');
  const requestedCategory = window.PORTFOLIO_PREVIEW_CATEGORY || queryCategory;
  const category = Object.hasOwn(categoryNames, requestedCategory) ? requestedCategory : '';
  const filters = [...document.querySelectorAll('.filter-pills .filter-pill')];
  const caption = document.querySelector('.submenu-caption');

  filters.forEach((filter) => {
    const filterCategory = filter.dataset.category || '';
    const isSelected = category ? filterCategory === category : !filterCategory;
    filter.classList.toggle('active', isSelected);
    if (isSelected) filter.setAttribute('aria-current', 'page');
    else filter.removeAttribute('aria-current');
  });
  if (caption) caption.textContent = category ? `${categoryNames[category]} PROJECTS` : 'ALL PROJECTS';

  function card(project, index) {
    const link = document.createElement('a');
    const projectParams = new URLSearchParams({ project: project.id });
    if (category) projectParams.set('category', category);
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
    if (project.coverUrl) {
      const image = document.createElement('img');
      image.src = project.coverUrl;
      image.alt = `${project.title} cover`;
      image.style.objectPosition = `${project.coverPosition?.x ?? 50}% ${project.coverPosition?.y ?? 50}%`;
      image.style.setProperty('--cover-zoom', String((project.coverZoom ?? 100) / 100));
      image.loading = index > 1 ? 'lazy' : 'eager';
      frame.append(image);
    }
    link.append(head, frame);
    return link;
  }

  const projectsUrl = category ? `${endpoint}?category=${encodeURIComponent(category)}` : endpoint;
  fetch(projectsUrl, { credentials: 'same-origin', cache: 'no-store' })
    .then(async (response) => {
      if (!response.ok) throw new Error('Could not load projects');
      return response.json();
    })
    .then(({ projects = [] }) => {
      const visibleProjects = category ? projects.filter((project) => project.category === category) : projects;
      grid.replaceChildren(...visibleProjects.map(card));
      message.hidden = visibleProjects.length > 0;
      if (!visibleProjects.length) {
        message.textContent = category
          ? `No ${categoryNames[category].toLowerCase()} projects yet.`
          : preview ? 'No drafts to preview yet.' : 'New work is coming soon.';
      }
    })
    .catch(() => {
      message.hidden = false;
      message.textContent = 'Projects are temporarily unavailable.';
    });
})();
