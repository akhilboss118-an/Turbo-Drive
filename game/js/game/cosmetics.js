/* eslint-disable */
'use strict';
/* Cosmetics rendering: neon underglow, trails and wheel sparks (per car) */
const cosPrev = {};                              // garage-only preview of items that are not bought yet
const itemOf = (k, id) => (id ? COSMETICS[k].items.find((i) => i.id === id) || null : null);
function cosView() {
  const garage = state === 'garage', c = cosOf(garage ? previewId : vehicleId), r = {};
  for (const k of COS_KEYS) r[k] = itemOf(k, garage && cosPrev[k] !== undefined ? cosPrev[k] : c.eq[k]);
  return r;
}
function hsl(h) {
  const f = (n) => { const k = (n + h * 12) % 12; return 0.58 - 0.42 * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
  return [f(0), f(8), f(4)];
}
function colRGB(it, t, off) {
  if (it.id === 'rainbow') return hsl(((t * 0.4 + (off || 0)) % 1 + 1) % 1);
  const h = it.color; return [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
}
const glowTex = (function () {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv);
})();
function mkGlow(w, h, flat) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  if (flat) m.rotation.x = -Math.PI / 2; m.visible = false; m.material.isShared = false; return m;
}
const glowSide = mkGlow(5.6, 1.6), glowBody = mkGlow(4.8, 2.8, true), glowRoad = mkGlow(8, 4, true);
glowSide.position.set(0, -0.18, 0); glowBody.position.set(0, -0.1, 0); glowRoad.position.y = 0.05;
carRoot.add(glowSide); carRoot.add(glowBody); shadowHolder.add(glowRoad);
let cosT = 0, trailAcc = 0, sparkAcc = 0;
function cosUpdate(dt) {
  cosT += dt; const v = cosView(), g = v.glow;
  if (g) {
    const c = colRGB(g, cosT), pulse = 0.82 + 0.18 * Math.sin(cosT * 3.2);
    for (const m of [glowSide, glowBody, glowRoad]) { m.visible = true; m.material.color.setRGB(c[0], c[1], c[2]); }
    glowSide.material.opacity = 0.95 * pulse; glowBody.material.opacity = 0.8 * pulse;
    const gh = ground(car.x), hgt = gh === null ? 99 : Math.max(0, car.y - gh);
    glowRoad.visible = shadowHolder.visible; glowRoad.material.opacity = Math.max(0.15, 0.95 - hgt * 0.07) * pulse;
  } else { glowSide.visible = glowBody.visible = glowRoad.visible = false; }
  const live = state === 'playing' || state === 'finishing', demo = state === 'garage';
  if (!live && !demo) { trailAcc = sparkAcc = 0; return; }
  const sp = demo ? 12 : car.speed(), tail = TAIL[vehicleById(demo ? previewId : vehicleId).model] || -2.2;
  if (v.trail && sp > 3) {
    trailAcc += dt * 80;
    while (trailAcc >= 1) {
      trailAcc--; const p = car.local(tail, 0.1);
      flame.emit(p[0], p[1], (Math.random() - 0.5) * 0.9, demo ? -3 : car.vx * 0.04, demo ? 0.2 : car.vy * 0.04, 0, 0.8, 0.6, 0.08, 0.85, colRGB(v.trail, cosT, Math.random() * 0.2));
    }
  }
  if (v.spark && sp > 5 && (car.grounded || demo)) {
    sparkAcc += dt * 110 * Math.min(1, sp / 18);
    while (sparkAcc >= 1) {
      sparkAcc--; const p = car.local(Math.random() < 0.65 ? -1.28 : 1.28, -0.28), z = Math.random() < 0.5 ? -0.6 : 0.6;
      flame.emit(p[0], p[1], z, (demo ? -4 : -car.vx * 0.3) + (Math.random() - 0.5) * 3, 1.5 + Math.random() * 4.5, (Math.random() - 0.5) * 1.6, 0.35 + Math.random() * 0.2, 0.3, 0.05, 1, colRGB(v.spark, cosT, Math.random() * 0.5));
    }
  }
}
function cosLand(big) {
  const s = cosView().spark; if (!s) return;
  const n = 14 + Math.round(big * 22);
  for (let i = 0; i < n; i++) { const p = car.local(i % 2 ? 1.28 : -1.28, -0.28), d = i % 2 ? 1 : -1; flame.emit(p[0], p[1], Math.random() < 0.5 ? -0.6 : 0.6, d * (2 + Math.random() * 7) + car.vx * 0.2, 2 + Math.random() * 7, (Math.random() - 0.5) * 3, 0.5 + Math.random() * 0.3, 0.38, 0.05, 1, colRGB(s, cosT, Math.random() * 0.5)); }
}
