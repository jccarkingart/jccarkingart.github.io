(() => {
  if (!document.fonts) return;
  const root = document.documentElement;
  root.classList.add('about-fonts-pending');
  // Start in the head so fallback text cannot paint before the final layout.
  // Visibility preserves the artwork panel and footer space during loading.
  Promise.allSettled([
    document.fonts.load('900 72px Inter'),
    document.fonts.load('500 13px Inter'),
    document.fonts.load('700 11px Inter'),
    document.fonts.load('400 30px "Homemade Apple"'),
  ]).catch(() => {}).finally(() => {
    root.classList.remove('about-fonts-pending');
  });
})();
