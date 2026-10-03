(() => {
  const requestedId = window.PORTFOLIO_PREVIEW_PROJECT_ID || new URLSearchParams(location.search).get('project');
  const gallery = document.getElementById('project-gallery');
  if (!gallery || !window.createPortfolioStrip) return;
  const status = document.getElementById('project-status');
  const previous = document.getElementById('project-previous');
  const next = document.getElementById('project-next');
  const mobileImages = document.getElementById('project-mobile-images');
  const mobileQuery = window.matchMedia?.('(max-width: 720px)') || null;
  const preview = window.PORTFOLIO_PREVIEW === true;
  const categoryLabels = { 'character-design': 'CHARACTER DESIGN', illustration: 'ILLUSTRATION', '3d-modeling': '3D MODELING' };
  const returnCategory = new URLSearchParams(location.search || '').get('category') || window.PORTFOLIO_PREVIEW_CATEGORY || '';
  const backLink = document.querySelector('.project-back');
  const allFilter = document.querySelector('[data-work-filter="all"]');
  const categoryFilters = [...(document.querySelectorAll?.('.filter-pills [data-category]') || [])];
  const endpoint = `${preview ? '/api/admin/preview/projects/' : '/api/public/projects/'}${encodeURIComponent(requestedId || '')}`;
  let project;
  let galleryEntries = [];
  let strip;

  function setSubmenuCategory(category) {
    const selectedCategory = Object.hasOwn(categoryLabels, category) ? category : '';
    allFilter?.classList.toggle('active', !selectedCategory);
    if (allFilter) {
      if (selectedCategory) allFilter.removeAttribute('aria-current');
      else allFilter.setAttribute('aria-current', 'page');
    }
    categoryFilters.forEach((filter) => {
      const selected = filter.dataset.category === selectedCategory;
      filter.classList.toggle('active', selected);
      if (selected) filter.setAttribute('aria-current', 'page');
      else filter.removeAttribute('aria-current');
    });
    const caption = document.querySelector('.submenu-caption');
    if (caption) caption.textContent = selectedCategory ? `${categoryLabels[selectedCategory]} PROJECTS` : 'ALL PROJECTS';
  }

  setSubmenuCategory(returnCategory);
  if (backLink) backLink.href = returnCategory && Object.hasOwn(categoryLabels, returnCategory)
    ? `jessica-cui-work.html?category=${encodeURIComponent(returnCategory)}`
    : 'jessica-cui-work.html';

  function setText(selector, value) {
    const matches = document.querySelectorAll?.(selector);
    const elements = matches ? [...matches] : [document.querySelector(selector)].filter(Boolean);
    elements.forEach((element) => { element.textContent = value; });
  }

  function openMobileImage(image) {
    const returnScrollY = window.scrollY ?? window.pageYOffset ?? 0;
    const dialog = document.querySelector('.artwork-zoom');
    dialog?.addEventListener('close', () => window.scrollTo?.(0, returnScrollY), { once: true });
    window.openArtworkDetail?.(image);
  }

  function renderMobileImages(images) {
    if (!mobileImages) return;
    mobileImages.replaceChildren();
    if (!mobileQuery?.matches) return;
    for (const [index, image] of images.entries()) {
      const figure = document.createElement('figure');
      figure.className = 'project-mobile-figure';
      const stage = document.createElement('div');
      stage.className = 'project-image-stage project-mobile-image-stage';
      const isVideo = image.type === 'video/mp4' || /\.mp4(?:$|[?#])/i.test(image.url || '');
      const media = document.createElement(isVideo ? 'video' : 'img');
      media.src = image.url;
      if (isVideo) {
        media.controls = true;
        media.playsInline = true;
        media.preload = 'metadata';
        media.setAttribute('aria-label', `${project.title} video ${index + 1}`);
      } else {
        media.alt = image.caption || project.title;
        media.draggable = false;
        media.decoding = 'async';
        media.tabIndex = 0;
        media.setAttribute('role', 'button');
        media.setAttribute('aria-label', `${image.caption || project.title}, image ${index + 1}. Open image detail`);
        media.addEventListener('click', () => openMobileImage(media));
        media.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openMobileImage(media);
          }
        });
      }
      stage.append(media);

      const caption = document.createElement('figcaption');
      caption.className = 'project-mobile-figure-caption';
      const number = document.createElement('span');
      number.className = 'project-mobile-image-number';
      number.textContent = `${String(index + 1).padStart(2, '0')} / ${String(images.length).padStart(2, '0')}`;
      caption.append(number);
      if (image.caption) {
        const description = document.createElement('span');
        description.className = 'project-mobile-image-caption';
        description.textContent = image.caption;
        caption.append(description);
      }
      figure.append(stage, caption);
      mobileImages.append(figure);
    }
  }

  const refreshResponsiveGallery = () => {
    if (!project) return;
    if (mobileQuery?.matches && mobileImages) {
      strip?.setItems([]);
      renderMobileImages(project.images);
    } else {
      mobileImages?.replaceChildren();
      strip?.setItems(galleryEntries);
    }
  };

  strip = window.createPortfolioStrip({
    gallery, viewport: document.getElementById('project-gallery-viewport'),
    track: document.getElementById('project-gallery-track'), previous, next, activeId: 'project-image',
    onSelect(entry, index, count) {
      setText('[data-project-title]', project.title);
      setText('[data-project-category]', categoryLabels[project.category] || 'CHARACTER DESIGN');
      setSubmenuCategory(project.category);
      setText('[data-project-description]', entry.caption || project.description || '');
      setText('[data-project-overview]', project.description || '');
      setText('[data-project-index]', `${String(index + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}`);
    },
  });
  if (mobileQuery?.addEventListener) mobileQuery.addEventListener('change', refreshResponsiveGallery);
  else mobileQuery?.addListener?.(refreshResponsiveGallery);

  fetch(endpoint, { credentials: 'same-origin', cache: 'no-store' })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error('Project unavailable')))
    .then(({ project: data }) => {
      project = data;
      if (!project?.images?.length) throw new Error('This project has no images');
      galleryEntries = project.images.map((image) => ({ ...image, title: image.caption || project.title }));
      setText('[data-project-title]', project.title);
      setText('[data-project-category]', categoryLabels[project.category] || 'CHARACTER DESIGN');
      setSubmenuCategory(project.category);
      setText('[data-project-overview]', project.description || '');
      refreshResponsiveGallery();
      document.title = `${project.title} — Jessica Cui`;
      status.hidden = true;
    })
    .catch(() => {
      mobileImages?.replaceChildren();
      status.textContent = 'This project is not available.';
      status.hidden = false;
      previous.hidden = next.hidden = true;
    });
})();
