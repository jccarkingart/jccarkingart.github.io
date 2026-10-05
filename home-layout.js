(() => {
  const root = document.documentElement;
  // Hide only the artwork until its selected image and saved scale are ready.
  root.classList.add('home-artwork-pending');
  if (!document.fonts) return;
  root.classList.add('home-fonts-pending');
  // Keep the hero's existing space while its final text metrics are prepared.
  Promise.allSettled([
    document.fonts.load('900 96px Inter'),
    document.fonts.load('700 11px Inter'),
    document.fonts.load('500 13px Inter'),
  ]).finally(() => root.classList.remove('home-fonts-pending'));
})();
