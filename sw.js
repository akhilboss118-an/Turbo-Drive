/* Turbo Drive offline service worker */
const CACHE = 'turbo-drive-v5';
const FILES = [
 "game/assets/loading.jpg",
 "game/assets/logo.png",
 "game/css/intro.css",
 "game/js/core/intro.js",
 "game/css/cutscene.css",
 "game/css/shop.css",
 "game/css/stages.css",
 "game/css/style.css",
 "game/css/upgrade.css",
 "game/css/warp.css",
 "game/js/core/audio.js",
 "game/js/core/config.js",
 "game/js/core/input.js",
 "game/js/core/orientation.js",
 "game/js/core/storm.js",
 "game/js/data/car5.js",
 "game/js/data/hover.js",
 "game/js/data/models.js",
 "game/js/data/thumbs.js",
 "game/js/game/cosmetics.js",
 "game/js/game/cutscene.js",
 "game/js/game/effects.js",
 "game/js/game/game.js",
 "game/js/game/loop.js",
 "game/js/lib/three.min.js",
 "game/js/main.js",
 "game/js/physics.js",
 "game/js/render/chasm.js",
 "game/js/render/cold.js",
 "game/js/render/desert.js",
 "game/js/render/environment.js",
 "game/js/render/ice.js",
 "game/js/render/jungle.js",
 "game/js/render/lava.js",
 "game/js/render/level.js",
 "game/js/render/meteors.js",
 "game/js/render/moon.js",
 "game/js/render/obstacles.js",
 "game/js/render/particles.js",
 "game/js/render/path.js",
 "game/js/render/renderer.js",
 "game/js/render/track.js",
 "game/js/render/vehicle.js",
 "game/js/ui/shop.js",
 "game/js/ui/ui.js",
 "index.html",
 "manifest.webmanifest"
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(['./'].concat(FILES).map((f) => c.add(f).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).then((res) => {
    if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {}); }
    return res;
  }).catch(() => e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error())));
});
