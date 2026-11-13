// Blocking head script: resolve the saved preference before the first paint.
(() => {
  try {
    const stored = localStorage.getItem('fiuba-theme');
    const theme = ['light', 'dark', 'system'].includes(stored) ? stored : 'light';
    const palette = localStorage.getItem('fiuba-palette');
    const root = document.documentElement;
    root.dataset.theme = theme === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;
    if (['coral', 'grafito', 'esmeralda', 'indigo'].includes(palette)) root.dataset.palette = palette;
    root.style.colorScheme = root.dataset.theme;
  } catch { /* The HTML defaults are light/coral. */ }
})();
