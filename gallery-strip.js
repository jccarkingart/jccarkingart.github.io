(() => {
  // Artwork stays mounted in one long strip; only the strip's position changes.
  window.createPortfolioStrip = ({ gallery, viewport, track, previous, next, activeId, onSelect }) => {
    let entries = [], slides = [];
    let selected = 0, physical = 0, x = 0, frame = 0, animationToken = 0;
    let moving = false, pendingLayout = false, gesture = null, suppressClick = false;
    const queuedDirections = [];
    const dimensions = new Map();
    const duration = 720;
    gallery.dataset.galleryVersion = 'section-return-first-20260927';

    const nextArrowIcon = next.querySelector?.('[data-next-arrow-icon]');
    const returnFirstIcon = next.querySelector?.('[data-return-first-icon]');
    const observer = typeof IntersectionObserver === 'function'
      ? new IntersectionObserver((records) => {
          for (const record of records) record.target.dataset.inViewport = String(record.isIntersecting);
        }, { root: viewport, threshold: 0.01 })
      : null;

    function writePosition(value) {
      x = value;
      track.style.transform = `translate3d(${value}px,0,0)`;
    }
    function targetPosition(index) {
      const slide = slides[index];
      return viewport.clientWidth / 2 - slide.left - slide.width / 2;
    }
    function sizeFor(slide) {
      const measured = dimensions.get(slide.entry.url);
      if (measured) return measured;
      const width = Number(slide.entry.width), height = Number(slide.entry.height);
      return width > 0 && height > 0 ? { width, height } : null;
    }
    function allDimensionsReady() {
      return slides.length > 0 && slides.every((slide) => sizeFor(slide));
    }
    function layout() {
      if (!slides.length || !viewport.clientWidth || !viewport.clientHeight) {
        if (!entries.length) gallery.dataset.loading = 'false';
        return;
      }
      if (moving) { pendingLayout = true; return; }
      const sizes = slides.map(sizeFor);
      if (sizes.some((size) => !size)) { gallery.dataset.loading = 'true'; return; }
      const gap = parseFloat(getComputedStyle(track).columnGap) || 16;
      const maxWidth = viewport.clientWidth * 0.9;
      const maxHeight = Math.max(1, viewport.clientHeight - 2);
      const commonHeight = Math.min(maxHeight, ...sizes.map((size) => maxWidth * size.height / size.width));
      let left = 0;
      for (const [index, slide] of slides.entries()) {
        const size = sizes[index];
        slide.height = commonHeight;
        slide.width = commonHeight * size.width / size.height;
        slide.left = left;
        slide.element.style.width = `${slide.width}px`;
        slide.stage.style.width = `${slide.width}px`;
        slide.stage.style.height = `${slide.height}px`;
        slide.media.style.width = `${slide.width}px`;
        slide.media.style.height = `${slide.height}px`;
        slide.media.style.objectFit = 'contain';
        slide.media.style.transform = 'none';
        left += slide.width + gap;
      }
      writePosition(targetPosition(physical));
      pendingLayout = false;
      gallery.dataset.loading = 'false';
      updateControls();
    }
    function updateControls() {
      const multiple = entries.length > 1;
      const atFirst = selected === 0;
      const atLast = selected === entries.length - 1;
      previous.hidden = !multiple || atFirst;
      next.hidden = !multiple;
      previous.disabled = next.disabled = !allDimensionsReady();
      next.setAttribute('aria-label', atLast ? 'Return to first image' : 'Next image');
      next.dataset.action = atLast ? 'return-first' : 'next';
      if (nextArrowIcon) nextArrowIcon.hidden = atLast;
      if (returnFirstIcon) returnFirstIcon.hidden = !atLast;
    }
    function select() {
      updateControls();
      for (const [index, slide] of slides.entries()) {
        const active = index === physical;
        slide.element.dataset.active = String(active);
        if (active) slide.element.dataset.inViewport = 'true';
        slide.element.setAttribute('aria-current', active ? 'true' : 'false');
        if (slide.image) slide.image.id = active ? activeId : '';
        slide.media.style.transform = 'none';
        if (!active && slide.isVideo) slide.media.pause?.();
        slide.element.tabIndex = active ? -1 : 0;
        if (slide.image) slide.image.tabIndex = active ? 0 : -1;
      }
      gallery.dataset.activeIndex = String(selected);
      const activeSlide = slides[physical];
      if (activeSlide?.image) window.resetArtworkFit?.(activeSlide.image);
      onSelect?.(entries[selected], selected, entries.length);
    }
    function cancelMotion() {
      animationToken++;
      cancelAnimationFrame(frame);
      moving = false;
      gallery.dataset.animating = 'false';
    }
    function complete(token) {
      if (token !== animationToken) return;
      moving = false;
      gallery.dataset.animating = 'false';
      if (pendingLayout) layout();
      else writePosition(targetPosition(physical));
      updateControls();
      if (queuedDirections.length) move(queuedDirections.shift());
    }
    function goTo(index, animate = true, physicalHint = null) {
      if (!entries.length || !allDimensionsReady()) return;
      const logical = Math.max(0, Math.min(index, entries.length - 1));
      if (logical === selected) return;

      // A new input interrupts the old motion from its current pixel position.
      cancelMotion();
      const targetPhysical = physicalHint ?? logical;

      selected = logical;
      physical = targetPhysical;
      select();
      const from = x, to = targetPosition(physical);
      if (!animate || Math.abs(to - from) < 1) { writePosition(to); complete(animationToken); return; }
      moving = true;
      gallery.dataset.animating = 'true';
      updateControls();
      const started = performance.now();
      const token = animationToken;
      const tick = (now) => {
        if (token !== animationToken) return;
        const progress = Math.min(1, Math.max(0, (now - started) / duration));
        const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
        writePosition(from + (to - from) * eased);
        if (progress < 1) frame = requestAnimationFrame(tick);
        else complete(token);
      };
      frame = requestAnimationFrame(tick);
    }
    function move(direction) {
      if (entries.length <= 1 || !allDimensionsReady()) return;
      if (moving) { queuedDirections.push(Math.sign(direction)); return; }
      if (direction < 0 && selected === 0) return;
      const returningToFirst = direction > 0 && selected === entries.length - 1;
      const logical = direction < 0 ? selected - 1 : returningToFirst ? 0 : selected + 1;
      goTo(logical, true);
    }
    function setItems(items, initialIndex = 0) {
      cancelMotion();
      queuedDirections.length = 0;
      gesture = null;
      suppressClick = false;
      const oldSlides = slides;
      entries = (items || []).filter((entry) => entry.url);
      slides = [];
      selected = entries.length ? Math.max(0, Math.min(initialIndex, entries.length - 1)) : 0;
      physical = selected;
      for (const slide of oldSlides) observer?.unobserve(slide.element);
      track.replaceChildren();
      gallery.dataset.loading = entries.length ? 'true' : 'false';
      gallery.dataset.activeIndex = String(selected);
      updateControls();
      if (!entries.length) { writePosition(0); return; }

      const rendered = entries.map((entry, logicalIndex) => ({ entry, logicalIndex }));
      rendered.forEach(({ entry, logicalIndex }, index) => {
        const element = document.createElement('article');
        element.className = 'project-gallery-slide';
        element.dataset.imageIndex = String(logicalIndex);
        element.setAttribute('aria-label', `${entry.title || 'Artwork'}, image ${logicalIndex + 1}`);
        const stage = document.createElement('div');
        stage.className = 'project-image-stage';
        const isVideo = entry.type === 'video/mp4' || /\.mp4(?:$|[?#])/i.test(entry.url);
        const media = document.createElement(isVideo ? 'video' : 'img');
        if (isVideo) {
          media.controls = true;
          media.playsInline = true;
          media.preload = 'metadata';
          media.setAttribute('aria-label', `${entry.title || 'Artwork'} video ${logicalIndex + 1}`);
        } else {
          media.alt = entry.title || `Artwork ${logicalIndex + 1}`;
          media.draggable = false;
          media.decoding = 'async';
        }
        media.style.visibility = 'hidden';
        const slide = { element, stage, media, image: isVideo ? null : media, isVideo, entry, logicalIndex, left: 0, width: 0, height: 0 };
        if (observer) {
          element.dataset.inViewport = 'false';
          observer.observe(element);
        }
        media.addEventListener(isVideo ? 'loadedmetadata' : 'load', () => {
          const naturalWidth = isVideo ? media.videoWidth : media.naturalWidth;
          const naturalHeight = isVideo ? media.videoHeight : media.naturalHeight;
          if (!naturalWidth || !naturalHeight) {
            dimensions.set(entry.url, sizeFor(slide) || { width: 1, height: 1 });
            layout();
            return;
          }
          dimensions.set(entry.url, { width: naturalWidth, height: naturalHeight });
          media.style.visibility = 'visible';
          media.dataset.fitState = 'fit';
          layout();
          if (!isVideo && slides[physical] === slide) window.resetArtworkFit?.(media);
        });
        media.addEventListener('error', () => {
          if (isVideo) media.setAttribute('aria-label', `${entry.title || 'Artwork'} — video unavailable`);
          else media.alt = `${entry.title || 'Artwork'} — image unavailable`;
          dimensions.set(entry.url, sizeFor(slide) || { width: 1, height: 1 });
          layout();
        });
        media.src = entry.url;
        stage.append(media);
        element.append(stage);
        element.addEventListener('click', (event) => {
          if (suppressClick || moving) { event.preventDefault(); return; }
          if (isVideo && event.target === media) {
            if (slides[physical] !== slide) { event.preventDefault(); goTo(slide.logicalIndex, true, index); }
            return;
          }
          if (slides[physical] === slide) { if (!isVideo) window.openArtworkDetail?.(media); }
          else goTo(slide.logicalIndex, true, index);
        });
        element.addEventListener('keydown', (event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          if (isVideo) return;
          event.preventDefault();
          if (slides[physical] === slide) window.openArtworkDetail?.(media);
          else goTo(slide.logicalIndex, true, index);
        });
        slides.push(slide);
        track.append(element);
      });
      layout();
      select();
      track.style.opacity = '1';
    }
    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    document.addEventListener('keydown', (event) => {
      if (gallery.hasAttribute?.('data-mobile-vertical-gallery') && window.matchMedia?.('(max-width: 720px)')?.matches) return;
      if (event.defaultPrevented || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      if (event.target?.isContentEditable || /^(INPUT|TEXTAREA|SELECT|VIDEO)$/.test(event.target?.tagName || '')) return;
      event.preventDefault();
      move(event.key === 'ArrowLeft' ? -1 : 1);
    });
    viewport.addEventListener('pointerdown', (event) => {
      if (event.target.closest?.('video')) { gesture = null; return; }
      if (event.button === 0) gesture = { x: event.clientX, y: event.clientY, id: event.pointerId };
    });
    viewport.addEventListener('pointerup', (event) => {
      if (!gesture || gesture.id !== event.pointerId) return;
      const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
      gesture = null;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        suppressClick = true;
        move(dx < 0 ? 1 : -1);
        setTimeout(() => { suppressClick = false; }, 0);
      }
    });
    viewport.addEventListener('pointercancel', () => { gesture = null; });
    new ResizeObserver(() => {
      if (!entries.length) return;
      gallery.dataset.loading = 'true';
      if (moving) cancelMotion();
      queuedDirections.length = 0;
      physical = selected;
      layout();
      gallery.dataset.animating = 'false';
      updateControls();
    }).observe(viewport);
    return { setItems, goTo, move };
  };
})();
