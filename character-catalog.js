(() => {
  const archive = document.getElementById('archive-list');
  const gallery = document.getElementById('project-gallery');
  if (!archive || !gallery || !window.createPortfolioStrip) return;
  const preview = window.PORTFOLIO_PREVIEW === true;
  const detail = document.getElementById('view-project');
  let projects = [], sections = new Map();
  const strip = window.createPortfolioStrip({
    gallery, viewport: document.getElementById('project-gallery-viewport'),
    track: document.getElementById('project-gallery-track'),
    previous: document.getElementById('previous'), next: document.getElementById('next'), activeId: 'slide-image',
    onSelect(entry, index, count) {
      const project = entry.project;
      if (!project) return;
      document.getElementById('slide-title').textContent = project.title;
      document.getElementById('slide-caption').textContent = entry.caption || project.description || '';
      const counter = `${String(index + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}`;
      document.getElementById('slide-number').textContent = `CHARACTER DESIGN · IMAGE ${counter}`;
      document.getElementById('counter').textContent = counter;
      detail.href = `${preview ? '/preview/project' : 'jessica-cui-project.html'}?project=${encodeURIComponent(project.id)}`;
      [...archive.children].forEach((item, index) => {
        const selected = item.dataset.sectionId === project.id;
        item.classList.toggle('is-selected', selected);
        item.setAttribute('aria-current', String(selected));
      });
    },
  });
  function selectSection(project, initialIndex = 0) {
    const sectionEntries = sections.get(project?.id) || [];
    if (!sectionEntries.length) {
      strip.setItems([], 0);
      [...archive.children].forEach((item) => {
        const selected = item.dataset.sectionId === project?.id;
        item.classList.toggle('is-selected', selected);
        item.setAttribute('aria-current', String(selected));
      });
      detail.hidden = true;
      document.getElementById('slide-title').textContent = project?.title || 'New work is coming soon.';
      document.getElementById('slide-caption').textContent = project ? 'Images for this section are not available yet.' : '';
      document.getElementById('slide-number').textContent = 'CHARACTER DESIGN · IMAGE 00 / 00';
      document.getElementById('counter').textContent = '00 / 00';
      return;
    }
    detail.hidden = false;
    strip.setItems(sectionEntries, initialIndex);
  }
  fetch(`${preview ? '/api/admin/preview/projects' : '/api/public/projects'}?category=character-design`, { credentials: 'same-origin', cache: 'no-store' })
    .then((response) => response.ok ? response.json() : Promise.reject())
    .then((data) => {
      projects = data.projects;
      sections = new Map(projects.map((project) => [project.id, (project.images || []).map((image) => ({ ...image, title: project.title, project }))]));
      archive.replaceChildren();
      projects.forEach((project, index) => {
        const item = document.createElement('button');
        item.type = 'button'; item.className = 'archive-item cms-archive-button'; item.dataset.sectionId = project.id;
        const ordinal = document.createElement('span'); ordinal.className = 'archive-number'; ordinal.textContent = String(index + 1).padStart(2, '0');
        const copy = document.createElement('span'); copy.className = 'archive-copy';
        const category = document.createElement('span'); category.className = 'archive-category'; category.textContent = `${String(index + 1).padStart(2, '0')} / CHARACTER DESIGN`;
        const name = document.createElement('span'); name.className = 'archive-title'; name.textContent = project.title;
        copy.append(category, name); item.append(ordinal, copy);
        item.addEventListener('click', () => selectSection(project, 0));
        archive.append(item);
      });
      const params = new URLSearchParams(location.search);
      const requestedProject = projects.find((project) => project.id === params.get('item')) || projects[0];
      const initialEntries = sections.get(requestedProject?.id) || [];
      const requestedIndex = params.has('photo') ? Math.max(0, Math.min(Number(params.get('photo')) || 0, initialEntries.length - 1)) : 0;
      selectSection(requestedProject, requestedIndex);
    })
    .catch(() => { document.getElementById('slide-title').textContent = 'Projects are temporarily unavailable.'; detail.hidden = true; });
})();
