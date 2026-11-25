// Use the same 07:00 / 19:00 local-time schedule as Resonance.
(() => {
  const key = 'franglish-theme-override';
  let override;
  let timer;
  try {
    override = JSON.parse(localStorage.getItem(key));
  } catch {}

  function nextBoundary(now) {
    const boundary = new Date(now);
    const hour = now.getHours();
    if (hour >= 19) boundary.setDate(boundary.getDate() + 1);
    boundary.setHours(hour < 7 || hour >= 19 ? 7 : 19, 0, 0, 0);
    return boundary.getTime();
  }

  function sync() {
    const now = new Date();
    const hour = now.getHours();
    const manual = override && override.expiresAt > now.getTime() && ['light', 'dark'].includes(override.theme);
    const theme = manual ? override.theme : (hour >= 7 && hour < 19 ? 'light' : 'dark');
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#141416' : '#ffffff';
    document.getElementById('theme-toggle')?.setAttribute('aria-pressed', String(theme === 'dark'));
    clearTimeout(timer);
    timer = setTimeout(sync, nextBoundary(now) - now.getTime() + 50);
  }

  sync();
  document.addEventListener('DOMContentLoaded', () => {
    sync();
    document.getElementById('theme-toggle').addEventListener('click', () => {
      override = {
        theme: document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark',
        expiresAt: nextBoundary(new Date()),
      };
      try { localStorage.setItem(key, JSON.stringify(override)); } catch {}
      sync();
    });
  });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
})();
