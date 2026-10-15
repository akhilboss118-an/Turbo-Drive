/* eslint-disable */
'use strict';
/* Landscape-only guard: in portrait the "Rotate your phone" overlay covers the game and the run is paused. */
(function () {
  const isPortrait = () => window.innerHeight > window.innerWidth && (window.innerWidth <= 1100 || (window.matchMedia && matchMedia('(pointer:coarse)').matches));
  const lockLandscape = () => { try { if (screen.orientation && screen.orientation.lock) { const p = screen.orientation.lock('landscape'); if (p && p.catch) p.catch(() => {}); } } catch (e) {} };
  const check = () => {
    if (isPortrait()) { clearInput(); if (state === 'playing' || state === 'countdown') pause(); }
    else lockLandscape();
  };
  window.addEventListener('resize', check);
  window.addEventListener('orientationchange', check);
  if (screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener('change', check);
  // first touch: go fullscreen (where allowed) and lock landscape
  window.addEventListener('pointerdown', function once() {
    window.removeEventListener('pointerdown', once);
    if (!(window.matchMedia && matchMedia('(pointer:coarse)').matches)) return;
    try { const el = document.documentElement; if (el.requestFullscreen && !document.fullscreenElement) { const p = el.requestFullscreen(); if (p && p.then) p.then(lockLandscape, () => {}); } else lockLandscape(); } catch (e) {}
  });
  check();
})();
