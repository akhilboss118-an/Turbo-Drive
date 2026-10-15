/* eslint-disable */
'use strict';
/* Offline support: service worker caches the whole game; ask the browser to keep saved progress permanently. */
(function () {
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
  window.addEventListener('pagehide', () => { try { save(); } catch (e) {} });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { try { save(); } catch (e) {} } });
})();
