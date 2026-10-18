/* eslint-disable */
'use strict';
/* Fullscreen & Landscape Manager:
   - Automatically enters full screen mode when launched in browser on initial user interaction (click, tap, key).
   - Cross-browser support with vendor prefix fallbacks (webkit, moz, ms).
   - Locks landscape orientation on mobile/tablet devices where supported.
   - Shows "Rotate your phone" overlay when device is held in portrait mode.
   - Synchronizes UI fullscreen toggle buttons and status in topbar, settings, and pause menus. */
(function () {
  const isPortrait = () => window.innerHeight > window.innerWidth && (window.innerWidth <= 1100 || (window.matchMedia && matchMedia('(pointer:coarse)').matches));

  const lockLandscape = () => {
    try {
      if (screen.orientation && screen.orientation.lock) {
        const p = screen.orientation.lock('landscape');
        if (p && p.catch) p.catch(() => {});
      }
    } catch (e) {}
  };

  const isFullscreen = () => {
    return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
  };

  const requestGameFullscreen = () => {
    if (isFullscreen()) {
      lockLandscape();
      return Promise.resolve();
    }
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
    if (!req) {
      lockLandscape();
      return Promise.resolve();
    }
    try {
      const p = req.call(el);
      if (p && p.then) {
        return p.then(() => {
          lockLandscape();
          syncFsUi();
        }).catch(() => {
          lockLandscape();
        });
      }
    } catch (e) {}
    lockLandscape();
    syncFsUi();
    return Promise.resolve();
  };

  const exitGameFullscreen = () => {
    if (!isFullscreen()) return Promise.resolve();
    const exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
    if (!exit) return Promise.resolve();
    try {
      const p = exit.call(document);
      if (p && p.then) return p.then(syncFsUi).catch(() => {});
    } catch (e) {}
    syncFsUi();
    return Promise.resolve();
  };

  const toggleGameFullscreen = () => {
    if (isFullscreen()) exitGameFullscreen();
    else requestGameFullscreen();
  };

  const syncFsUi = () => {
    const fs = isFullscreen();
    document.body.classList.toggle('is-fullscreen', fs);
    const fsIcon = document.getElementById('fsIcon');
    if (fsIcon) fsIcon.setAttribute('href', fs ? '#i-fullscreen-exit' : '#i-fullscreen');
    const btnFs = document.getElementById('btnFullscreen');
    if (btnFs) {
      btnFs.setAttribute('title', fs ? 'Exit Fullscreen (F)' : 'Fullscreen (F)');
      btnFs.setAttribute('aria-label', fs ? 'Exit Fullscreen' : 'Enter Fullscreen');
      btnFs.classList.toggle('on', fs);
    }
    const optFs = document.getElementById('optFullscreen');
    if (optFs) {
      optFs.textContent = fs ? 'On' : 'Off';
      optFs.classList.toggle('active', fs);
    }
    const pauseFs = document.getElementById('btnPauseFullscreen');
    if (pauseFs) pauseFs.textContent = fs ? 'Exit Fullscreen' : 'Enter Fullscreen';
  };

  window.requestGameFullscreen = requestGameFullscreen;
  window.exitGameFullscreen = exitGameFullscreen;
  window.toggleGameFullscreen = toggleGameFullscreen;
  window.isGameFullscreen = isFullscreen;
  window.syncFullscreenUi = syncFsUi;

  const check = () => {
    if (isPortrait()) {
      if (typeof clearInput === 'function') clearInput();
      if (typeof state !== 'undefined' && (state === 'playing' || state === 'countdown')) {
        if (typeof pause === 'function') pause();
      }
    } else {
      lockLandscape();
    }
  };

  window.addEventListener('resize', check);
  window.addEventListener('orientationchange', check);
  if (screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener('change', check);

  // Auto-fullscreen on user interaction:
  // When launching the game in browser, user touches or clicks anywhere -> enter fullscreen!
  const onUserGesture = () => {
    if (!isFullscreen()) {
      requestGameFullscreen();
    }
  };

  window.addEventListener('pointerdown', onUserGesture, { capture: true, passive: true });
  window.addEventListener('click', onUserGesture, { capture: true, passive: true });
  window.addEventListener('touchend', onUserGesture, { capture: true, passive: true });

  // Key shortcut: 'F' toggles fullscreen (unless typing in text box)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'f' || e.key === 'F') {
      const tag = e.target && e.target.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
        toggleGameFullscreen();
        return;
      }
    }
    onUserGesture();
  }, { passive: true });

  // Update UI on browser fullscreen change events
  ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach((ev) => {
    document.addEventListener(ev, syncFsUi);
  });

  check();
  syncFsUi();
})();
