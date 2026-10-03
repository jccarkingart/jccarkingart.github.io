(() => {
  const gallery = document.getElementById('project-gallery');
  if (!gallery || !window.createPortfolioStrip) return;
  const preview = window.PORTFOLIO_PREVIEW === true;
  const detail = document.getElementById('view-project');
  const strip = window.createPortfolioStrip({
    gallery, viewport: document.getElementById('project-gallery-viewport'),
    track: document.getElementById('project-gallery-track'),
    previous: document.getElementById('previous'), next: document.getElementById('next'), activeId: 'modeling-image',
    onSelect(entry, index, count) {
      const project = entry.project;
      document.getElementById('slide-title').textContent = project.title;
      document.getElementById('slide-caption').textContent = project.description || '';
      const counter = `${String(index + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}`;
      document.getElementById('slide-number').textContent = `3D MODELING · PROJECT ${counter}`;
      document.getElementById('counter').textContent = counter;
      detail.href = `${preview ? '/preview/project' : 'jessica-cui-project.html'}?project=${encodeURIComponent(project.id)}`;
    },
  });
  fetch(`${preview ? '/api/admin/preview/projects' : '/api/public/projects'}?category=3d-modeling`, { credentials: 'same-origin', cache: 'no-store' })
    .then((response) => response.ok ? response.json() : Promise.reject())
    .then(({ projects }) => {
      const entries = projects.map((project) => {
        const cover = project.images.find((image) => image.id === project.coverImageId || image.url === project.coverUrl) || project.images[0];
        return { ...cover, url: project.coverUrl || cover?.url, title: project.title, project };
      });
      if (!entries.length) { document.getElementById('slide-title').textContent = 'New work is coming soon.'; detail.hidden = true; }
      strip.setItems(entries);
    })
    .catch(() => { document.getElementById('slide-title').textContent = 'Projects are temporarily unavailable.'; detail.hidden = true; });
})();
