/* eslint-disable */
'use strict';
/* Menus, level cards, garage and settings wiring */
/* ================= UI wiring ================= */
const svg = (n, cls) => '<svg class="ico ' + (cls || '') + '"><use href="#i-' + n + '"/></svg>';
const totalStars = () => { let t = 0; for (let n = 1; n <= CAMPAIGN_LEVELS; n++) t += starsBy[n] || 0; return t; };
function refreshMenu() {
  refreshCoins();
  const b = bests[level];
  $('bestTime').innerHTML = b === undefined ? '' : svg('time') + 'Best ' + fmt(b);
  const ts = totalStars(); $('starTotal').innerHTML = svg('star', 'fill') + ts + '/' + (CAMPAIGN_LEVELS) * 3;
  $('playSub').textContent = LEVELS[level].name.replace('  ', ' \u00B7 ');
  $('lvlSub').textContent = WORLDS[worldOf(level)].name + ' \u00B7 ' + unlocked + '/' + (CAMPAIGN_LEVELS) + ' open';
  $('kicker').innerHTML = '<span></span>Stage 0' + (worldOf(level) + 1) + ' &middot; ' + WORLDS[worldOf(level)].name;
  $('garSub').textContent = vehicleById(vehicleId).name;
}
const hexs = (c) => '#' + (0x1000000 + c).toString(16).slice(1);
// a little side-on postcard of each level, painted from the level's own sky and glow colors
function spaceBG(g, w, h, n) {
  const sk = g.createLinearGradient(0, 0, 0, h); sk.addColorStop(0, '#01020a'); sk.addColorStop(0.6, '#0b0a2c'); sk.addColorStop(1, '#2a1550'); g.fillStyle = sk; g.fillRect(0, 0, w, h);
  let q = n * 733 + 5; const r = () => { q = (q * 16807) % 2147483647; return q / 2147483647; };
  for (const nb of [['rgba(120,70,255,.35)', 0.2, 0.3], ['rgba(40,200,210,.28)', 0.8, 0.75]]) { const gr = g.createRadialGradient(w * nb[1], h * nb[2], 2, w * nb[1], h * nb[2], h * 0.7); gr.addColorStop(0, nb[0]); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
  for (let i = 0; i < 90; i++) { g.globalAlpha = 0.3 + r() * 0.7; g.fillStyle = '#fff'; g.fillRect(r() * w, r() * h, 1.5, 1.5); } g.globalAlpha = 1;
  return r;
}
function spacePlanetDraw(g, kind, cx, cy, R, ring) {
  const pal = kind === 'jupiter' ? ['#e6cfa8', '#c99a68', '#f1e4cc', '#a8643c', '#d9b384'] : ['#f0dfae', '#d9c088', '#f6ecc8', '#c8a96a'];
  if (ring) { g.save(); g.translate(cx, cy); g.rotate(-0.35); g.strokeStyle = 'rgba(230,205,150,.35)'; g.lineWidth = R * 0.5; g.beginPath(); g.ellipse(0, 0, R * 1.75, R * 0.45, 0, Math.PI, 0); g.stroke(); g.restore(); }
  g.save(); g.beginPath(); g.arc(cx, cy, R, 0, 7); g.clip();
  pal.forEach((c, i) => { g.fillStyle = c; g.fillRect(cx - R, cy - R + i * R * 2 / pal.length, R * 2, R * 2 / pal.length + 1); });
  if (kind === 'jupiter') { g.fillStyle = '#b8452a'; g.beginPath(); g.ellipse(cx - R * 0.25, cy + R * 0.3, R * 0.22, R * 0.12, 0, 0, 7); g.fill(); }
  const sh = g.createRadialGradient(cx - R * 0.4, cy - R * 0.4, R * 0.2, cx, cy, R * 1.15); sh.addColorStop(0, 'rgba(255,255,255,.18)'); sh.addColorStop(0.6, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,12,.8)'); g.fillStyle = sh; g.fillRect(cx - R, cy - R, R * 2, R * 2); g.restore();
  if (ring) { g.save(); g.translate(cx, cy); g.rotate(-0.35); g.strokeStyle = 'rgba(240,215,160,.75)'; g.lineWidth = R * 0.32; g.beginPath(); g.ellipse(0, 0, R * 1.75, R * 0.45, 0, 0, Math.PI); g.stroke(); g.restore(); }
}
function drawSpacePreview(cv, L, n) {
  const w = cv.width = 320, h = cv.height = 420, g = cv.getContext('2d'), r = spaceBG(g, w, h, n), H = h * 0.55;
  neonGrid(g, w, h, h * 0.62, '#9dffea');
  spacePlanetDraw(g, L.planet, w * 0.72, H * 0.42, H * (L.planet === 'saturn' ? 0.2 : 0.3), L.planet === 'saturn');
  for (let i = 0; i < 9; i++) { const x = w * (0.05 + r() * 0.5), y = H * (0.1 + r() * 0.75), s = 3 + r() * 7; g.fillStyle = 'rgba(120,108,100,.9)'; g.beginPath(); g.ellipse(x, y, s, s * 0.75, r() * 3, 0, 7); g.fill(); g.strokeStyle = 'rgba(157,255,234,.35)'; g.lineWidth = 1; g.stroke(); }
  for (const k of [[0.42, 0.52, 26, '#35e6ff'], [0.58, 0.47, 18, '#ff3df0']]) { g.save(); g.shadowColor = k[3]; g.shadowBlur = 16; g.strokeStyle = k[3]; g.lineWidth = 4; g.beginPath(); g.ellipse(w * k[0], H * k[1], k[2] * 0.55, k[2], 0, 0, 7); g.stroke(); g.restore(); }
  g.save(); g.translate(w * 0.27, H * 0.66); g.rotate(-0.12); const fl = g.createLinearGradient(-60, 0, -8, 0); fl.addColorStop(0, 'rgba(53,230,255,0)'); fl.addColorStop(1, 'rgba(120,240,255,.95)'); g.fillStyle = fl; g.fillRect(-60, -3, 52, 6);
  g.shadowColor = '#35e6ff'; g.shadowBlur = 14; g.fillStyle = '#eaf9ff'; g.beginPath(); g.moveTo(26, 0); g.lineTo(-10, -10); g.lineTo(-6, 0); g.lineTo(-10, 10); g.closePath(); g.fill(); g.fillStyle = '#35e6ff'; g.fillRect(-2, -2, 9, 4); g.restore();
}
function drawSpaceWorld(cv) {
  const w = cv.width = 360, h = cv.height = 220, g = cv.getContext('2d'); spaceBG(g, w, h, 99);
  spacePlanetDraw(g, 'saturn', w * 0.56, h * 0.52, h * 0.24, true);
  g.fillStyle = '#9fd8f8'; g.beginPath(); g.arc(w * 0.14, h * 0.26, 9, 0, 7); g.fill(); g.fillStyle = '#e8a060'; g.beginPath(); g.arc(w * 0.86, h * 0.8, 6, 0, 7); g.fill();
  g.save(); g.shadowColor = '#35e6ff'; g.shadowBlur = 12; g.strokeStyle = '#35e6ff'; g.lineWidth = 3; g.beginPath(); g.ellipse(w * 0.25, h * 0.7, 9, 20, 0, 0, 7); g.stroke(); g.restore();
}
// neon synthwave postcard of each level (portrait), tinted by the level's own glow colors
function neonGlow(g, col, blur, fn) { g.save(); g.shadowColor = col; g.shadowBlur = blur; fn(); g.restore(); }
function neonGrid(g, w, h, y0, col) {
  const fg = g.createLinearGradient(0, y0, 0, h); fg.addColorStop(0, 'rgba(8,4,32,.95)'); fg.addColorStop(1, 'rgba(4,2,16,1)'); g.fillStyle = fg; g.fillRect(0, y0, w, h - y0);
  g.save(); g.strokeStyle = col; g.lineWidth = 1.2; g.globalAlpha = 0.55; g.beginPath();
  for (let k = 1; k <= 11; k++) { const y = y0 + (h - y0) * Math.pow(k / 11, 2); g.moveTo(0, y); g.lineTo(w, y); }
  for (let i = -9; i <= 9; i++) { g.moveTo(w / 2 + i * 6, y0); g.lineTo(w / 2 + i * 62, h); }
  g.stroke(); g.restore();
}
function neonSun(g, w, cx, cy, R, c1, c2, yClip, h) {
  const oc = document.createElement('canvas'); oc.width = w; oc.height = h; const o = oc.getContext('2d');
  const sg = o.createLinearGradient(0, cy - R, 0, cy + R); sg.addColorStop(0, c1); sg.addColorStop(1, c2);
  o.fillStyle = sg; o.beginPath(); o.arc(cx, cy, R, 0, 7); o.fill();
  o.globalCompositeOperation = 'destination-out';
  for (let k = 0; k < 7; k++) { const y = cy + R * (0.05 + k * 0.14), t = 1.5 + k * 1.3; o.fillRect(cx - R, y, R * 2, t); }
  o.fillRect(0, yClip, w, h);
  g.save(); g.shadowColor = c2; g.shadowBlur = 36; g.drawImage(oc, 0, 0); g.restore();
}
function drawPreview(cv, L, n) {
  if (L.space) { drawSpacePreview(cv, L, n); return; }
  const w = cv.width = 320, h = cv.height = 420, g = cv.getContext('2d');
  const A = hexs(L.glow[0]), B = hexs(L.glow[1]), T = hexs(L.topB), yH = h * 0.4, moon = L.biome === 'moon';
  let q = n * 977 + 13; const r = () => { q = (q * 16807) % 2147483647; return q / 2147483647; };
  const sk = g.createLinearGradient(0, 0, 0, yH); sk.addColorStop(0, '#04010f'); sk.addColorStop(0.55, L.sky.length ? L.sky[Math.min(1, L.sky.length - 1)] : '#1a0b45'); sk.addColorStop(1, B);
  g.fillStyle = '#04010f'; g.fillRect(0, 0, w, h); g.globalAlpha = 0.9; g.fillStyle = sk; g.fillRect(0, 0, w, yH); g.globalAlpha = 1;
  const dk = g.createLinearGradient(0, 0, 0, yH); dk.addColorStop(0, 'rgba(3,1,14,.85)'); dk.addColorStop(0.7, 'rgba(3,1,14,.25)'); dk.addColorStop(1, 'rgba(3,1,14,0)'); g.fillStyle = dk; g.fillRect(0, 0, w, yH);
  for (let i = 0; i < 60; i++) { const y = r() * yH * 0.8; g.globalAlpha = (1 - y / yH) * 0.9; g.fillStyle = '#fff'; g.fillRect(r() * w, y, 1.4, 1.4); } g.globalAlpha = 1;
  const sx = w * (0.5 + ((n % 3) - 1) * 0.12);
  neonSun(g, w, sx, yH - 14, 64, '#fff3a8', B, yH, h);
  if (moon) {
    neonGlow(g, '#58a8ff', 22, () => { g.fillStyle = '#2a78d8'; g.beginPath(); g.arc(w * 0.82, h * 0.13, 17, 0, 7); g.fill(); });
    g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(w * 0.82 - 3, h * 0.13 + 1, 11, 3, -0.4, 0, 7); g.fill();
  }
  // neon wireframe ridgeline
  g.save(); g.beginPath(); g.moveTo(0, yH); let px = 0;
  while (px < w + 30) { g.lineTo(px, yH - (moon ? 6 + r() * 14 : 10 + r() * 34)); px += 16 + r() * 22; }
  g.lineTo(w, yH); g.closePath(); g.fillStyle = 'rgba(5,2,22,.92)'; g.fill(); g.strokeStyle = A; g.lineWidth = 1.6; g.shadowColor = A; g.shadowBlur = 10; g.globalAlpha = 0.9; g.stroke(); g.restore();
  neonGrid(g, w, h, yH, A);
  neonGlow(g, A, 14, () => { g.strokeStyle = A; g.lineWidth = 2; g.beginPath(); g.moveTo(0, yH); g.lineTo(w, yH); g.stroke(); });
  if (!moon) for (let i = 0; i < 3; i++) {
    const ix = (i + 0.25 + r() * 0.5) * w / 3, iy = h * (0.12 + r() * 0.14), iw = 18 + r() * 20;
    neonGlow(g, A, 10, () => { g.fillStyle = 'rgba(6,3,28,.85)'; g.strokeStyle = A; g.lineWidth = 1.5; g.beginPath(); g.moveTo(ix - iw, iy); g.lineTo(ix + iw, iy); g.lineTo(ix + iw * 0.2, iy + iw * 0.7); g.lineTo(ix - iw * 0.3, iy + iw * 0.5); g.closePath(); g.fill(); g.stroke(); });
  }
  // track: ramp -> gap with hoop -> landing deck
  const gs = 0.3 + ((n * 7) % 5) * 0.035, ge = 0.58 + ((n * 3) % 4) * 0.045, y1 = h * 0.52, y2 = h * 0.485;
  const slab = (x0, x1, y) => {
    const sg = g.createLinearGradient(0, y, 0, y + 70); sg.addColorStop(0, T); sg.addColorStop(1, 'rgba(8,4,36,0)'); g.fillStyle = sg; g.fillRect(x0, y, x1 - x0, 70);
    neonGlow(g, B, 14, () => { g.fillStyle = B; g.fillRect(x0, y - 2, x1 - x0, 3.5); });
    g.fillStyle = 'rgba(255,255,255,.75)'; for (let x = x0 + 10; x < x1 - 12; x += 28) g.fillRect(x, y + 12, 14, 2.5);
  };
  slab(-4, w * gs, y1); slab(w * ge, w + 4, y2);
  g.fillStyle = T; g.beginPath(); g.moveTo(w * gs - 56, y1); g.lineTo(w * gs, y1 - 22); g.lineTo(w * gs, y1); g.closePath(); g.fill();
  neonGlow(g, B, 12, () => { g.strokeStyle = B; g.lineWidth = 3; g.beginPath(); g.moveTo(w * gs - 56, y1 - 1); g.lineTo(w * gs, y1 - 23); g.stroke(); });
  const hx = w * (gs + ge) / 2, hy = h * 0.4;
  neonGlow(g, B, 20, () => { g.strokeStyle = B; g.lineWidth = 5; g.beginPath(); g.ellipse(hx, hy, 13, 36, 0, 0, 7); g.stroke(); });
  g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(hx, hy, 13, 36, 0, 0, 7); g.stroke();
  // car + speed trail
  g.save(); g.translate(hx - 22, hy + 10); g.rotate(-0.28);
  const tr = g.createLinearGradient(-90, 0, -14, 0); tr.addColorStop(0, 'rgba(53,230,255,0)'); tr.addColorStop(1, 'rgba(120,240,255,.9)'); g.fillStyle = tr; g.fillRect(-90, -2, 76, 4); g.fillRect(-70, 5, 56, 2);
  neonGlow(g, '#35e6ff', 12, () => { g.fillStyle = '#eaf9ff'; g.beginPath(); g.moveTo(24, 3); g.lineTo(18, -4); g.lineTo(6, -11); g.lineTo(-8, -11); g.lineTo(-18, -4); g.lineTo(-24, 0); g.lineTo(-24, 6); g.lineTo(24, 6); g.closePath(); g.fill(); });
  g.fillStyle = '#0a1646'; g.beginPath(); g.moveTo(4, -9); g.lineTo(-7, -9); g.lineTo(-13, -3); g.lineTo(10, -3); g.closePath(); g.fill();
  g.fillStyle = '#ffe066'; g.fillRect(20, -1, 5, 3);
  g.fillStyle = '#05010f'; g.strokeStyle = '#35e6ff'; g.lineWidth = 1.5; for (const wx of [-13, 14]) { g.beginPath(); g.arc(wx, 7, 5.2, 0, 7); g.fill(); g.stroke(); }
  g.restore();
  if (L.meteors) { g.lineCap = 'round'; for (let i = 0; i < 6; i++) { const mx = w * (0.1 + r() * 0.8), my = h * (0.03 + r() * 0.22), ml = 20 + r() * 24; const mg = g.createLinearGradient(mx, my, mx - ml, my - ml * 0.5); mg.addColorStop(0, 'rgba(255,220,150,1)'); mg.addColorStop(1, 'rgba(255,90,60,0)'); neonGlow(g, '#ff8a3d', 10, () => { g.strokeStyle = mg; g.lineWidth = 3; g.beginPath(); g.moveTo(mx, my); g.lineTo(mx - ml, my - ml * 0.5); g.stroke(); g.fillStyle = '#ffe9b8'; g.beginPath(); g.arc(mx, my, 3, 0, 7); g.fill(); }); } }
  if (typeof HAZARDS !== 'undefined' && n > 16 && HAZARDS[n] && HAZARDS[n].length) neonGlow(g, '#ff3a3a', 14, () => { g.strokeStyle = 'rgba(255,80,80,.95)'; g.lineWidth = 2.5; for (let i = 0; i < 2; i++) { const lx = w * (gs + 0.07 + i * 0.13); g.beginPath(); g.moveTo(lx, y1 - 110); g.lineTo(lx, y1 - 4); g.stroke(); } });
  if (L.cold) { g.fillStyle = 'rgba(150,215,255,.14)'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(235,248,255,.85)'; for (let i = 0; i < 26; i++) g.fillRect(r() * w, r() * h * 0.6, 2, 2); }
}
let viewWorld = 0;
const worldStars = (w) => { let t = 0; for (let n = WORLDS[w].first; n <= WORLDS[w].last; n++) t += starsBy[n] || 0; return t; };
const worldDone = (w) => { let t = 0; for (let n = WORLDS[w].first; n <= WORLDS[w].last; n++) if (starsBy[n]) t++; return t; };
const PLANET = {
  earth: { bg: ['#030618', '#0c1c4a'], halo: 'rgba(80,170,255,.6)', sph: ['#6fc3ff', '#1f6fd0', '#0a2260'], land: '#3fa65a', seed: 777 },
  mars: { bg: ['#1a0806', '#4a1c10'], halo: 'rgba(255,140,70,.55)', sph: ['#f0985a', '#c2501f', '#5a1c0c'], land: '#6a2410', seed: 4242 },
  moon: { bg: ['#02030a', '#161a2c'], halo: 'rgba(190,205,255,.45)', sph: ['#e8eaf2', '#9a9eac', '#3a3d4a'], land: '#6a6e7c', seed: 1969 },
};
function drawPlanet(cv, id) {
  if (id === 'space') { drawSpaceWorld(cv); return; }
  const w = cv.width = 360, h = cv.height = 220, g = cv.getContext('2d'), P = PLANET[id], mars = id === 'mars', moon = id === 'moon';
  const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, P.bg[0]); bg.addColorStop(1, P.bg[1]); g.fillStyle = bg; g.fillRect(0, 0, w, h);
  let q = P.seed; const r = () => { q = (q * 16807) % 2147483647; return q / 2147483647; };
  for (let i = 0; i < 70; i++) { g.globalAlpha = 0.3 + r() * 0.7; g.fillStyle = '#fff'; g.fillRect(r() * w, r() * h, 1.5, 1.5); } g.globalAlpha = 1;
  const cx = w * 0.5, cy = h * 0.56, R = h * 0.36;
  const halo = g.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.5); halo.addColorStop(0, P.halo); halo.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = halo; g.fillRect(0, 0, w, h);
  g.save(); g.beginPath(); g.arc(cx, cy, R, 0, 7); g.clip();
  const sph = g.createRadialGradient(cx - R * 0.4, cy - R * 0.4, R * 0.1, cx, cy, R); sph.addColorStop(0, P.sph[0]); sph.addColorStop(0.6, P.sph[1]); sph.addColorStop(1, P.sph[2]);
  g.fillStyle = sph; g.fillRect(cx - R, cy - R, R * 2, R * 2);
  if (moon) {
    for (let i = 0; i < 6; i++) { const x = cx + (r() - 0.5) * R * 1.5, y = cy + (r() - 0.5) * R * 1.4, rr = R * (0.1 + r() * 0.18); g.globalAlpha = 0.5; g.fillStyle = '#5a5e6c'; g.beginPath(); g.ellipse(x, y, rr, rr * 0.85, 0, 0, 7); g.fill(); g.globalAlpha = 0.7; g.strokeStyle = '#dfe2ee'; g.lineWidth = 1.6; g.beginPath(); g.arc(x - rr * 0.12, y - rr * 0.1, rr, 3.4, 5.6); g.stroke(); }
    for (let i = 0; i < 16; i++) { g.globalAlpha = 0.4; g.fillStyle = '#4a4e5c'; g.beginPath(); g.arc(cx + (r() - 0.5) * R * 1.8, cy + (r() - 0.5) * R * 1.7, 1.5 + r() * 3, 0, 7); g.fill(); }
  } else {
    for (let i = 0; i < (mars ? 9 : 7); i++) { const x = cx + (r() - 0.5) * R * 1.6, y = cy + (r() - 0.5) * R * 1.5, rr = R * (0.12 + r() * 0.22); g.globalAlpha = mars ? 0.4 : 0.85; g.fillStyle = P.land; g.beginPath(); g.ellipse(x, y, rr * 1.4, rr, r() * 3, 0, 7); g.fill(); }
    if (mars) { g.globalAlpha = 0.45; for (let i = 0; i < 7; i++) { const x = cx + (r() - 0.5) * R * 1.5, y = cy + (r() - 0.5) * R * 1.4, rr = 3 + r() * 6; g.strokeStyle = '#3a1208'; g.lineWidth = 1.6; g.beginPath(); g.arc(x, y, rr, 0, 7); g.stroke(); } }
    else { g.globalAlpha = 0.55; g.fillStyle = '#fff'; for (let i = 0; i < 9; i++) { g.beginPath(); g.ellipse(cx + (r() - 0.5) * R * 1.7, cy + (r() - 0.5) * R * 1.6, R * (0.14 + r() * 0.2), R * 0.05, r() - 0.5, 0, 7); g.fill(); } }
    g.globalAlpha = 0.9; g.fillStyle = '#fff'; g.beginPath(); g.ellipse(cx, cy - R * 0.97, R * 0.32, R * 0.07, 0, 0, 7); g.fill();
  }
  const sh = g.createRadialGradient(cx + R * 0.5, cy + R * 0.4, R * 0.4, cx + R * 0.5, cy + R * 0.4, R * 1.3); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,10,.7)'); g.globalAlpha = 1; g.fillStyle = sh; g.fillRect(cx - R, cy - R, R * 2, R * 2);
  g.restore();
  if (moon) {   // little blue Earth rising behind the Moon
    const ex = w * 0.84, ey = h * 0.2, eg = g.createRadialGradient(ex - 3, ey - 3, 1, ex, ey, 14); eg.addColorStop(0, '#9fd8ff'); eg.addColorStop(0.6, '#2a78d8'); eg.addColorStop(1, '#0a2a70'); g.fillStyle = eg; g.beginPath(); g.arc(ex, ey, 14, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.65)'; g.beginPath(); g.ellipse(ex - 2, ey + 1, 8, 2.2, -0.4, 0, 7); g.fill();
  } else {
    g.fillStyle = mars ? '#b09080' : '#dfe6f0'; g.beginPath(); g.arc(w * (mars ? 0.84 : 0.85), h * 0.2, mars ? 7 : 11, 0, 7); g.fill();
    if (mars) { g.fillStyle = '#9a8070'; g.beginPath(); g.arc(w * 0.14, h * 0.78, 4, 0, 7); g.fill(); }
  }
}
const UA_KEY = 'skyleap_unlockall', UA_PREV = 'skyleap_unlockall_prev';
const unlockAllOn = () => localStorage.getItem(UA_KEY) === '1';
function syncUnlockAll() {
  document.querySelectorAll('.uabtn').forEach((b) => { const on = unlockAllOn(); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.querySelector('span').textContent = 'Unlock all levels: ' + (on ? 'ON' : 'OFF'); b.querySelector('use').setAttribute('href', on ? '#i-check' : '#i-lock'); });
}
function toggleUnlockAll() {
  if (unlockAllOn()) { unlocked = Math.max(1, Math.min(CAMPAIGN_LEVELS, parseInt(localStorage.getItem(UA_PREV) || '1', 10))); localStorage.removeItem(UA_KEY); toast('UNLOCK ALL OFF', 'Normal progression restored', 'warn'); }
  else { localStorage.setItem(UA_PREV, String(unlocked)); localStorage.setItem(UA_KEY, '1'); unlocked = CAMPAIGN_LEVELS; toast('ALL LEVELS UNLOCKED', 'Test mode: levels 1-' + CAMPAIGN_LEVELS + ' are open', 'good'); }
  save(); syncUnlockAll(); refreshMenu(); buildStages(); if (state === 'levels') buildCards(); Snd.click();
}
document.querySelectorAll('.uabtn').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); toggleUnlockAll(); }));
syncUnlockAll();
const worldOpen = (i) => WORLDS[i].first <= unlocked;
const worldNext = (i) => { const W = WORLDS[i]; for (let n = W.first; n <= W.last; n++) if (!starsBy[n]) return n; return W.last; };
function buildStages() {
  const box = $('worlds'); box.innerHTML = '';
  $('stStars').innerHTML = svg('star', 'fill') + totalStars() + '/' + (CAMPAIGN_LEVELS) * 3;
  WORLDS.forEach((W, i) => {
    const locked = !worldOpen(i), done = worldDone(i), full = done === W.count, cur = worldOf(level) === i, c = document.createElement('button');
    c.className = 'wcard ' + W.id + (locked ? ' locked' : '') + (cur ? ' cur' : '') + (full ? ' full' : ''); c.dataset.id = W.id; c.style.animationDelay = (i * 0.09) + 's';
    c.setAttribute('data-testid', 'stage-card-' + W.id); c.setAttribute('aria-label', W.name + (locked ? ', locked. ' + W.req : ', ' + done + ' of ' + W.count + ' levels done'));
    const pv = document.createElement('div'); pv.className = 'wpv'; const cv = document.createElement('canvas'); drawPlanet(cv, W.id); pv.appendChild(cv);
    const num = document.createElement('span'); num.className = 'wnum'; num.textContent = 'STAGE 0' + (i + 1); pv.appendChild(num);
    if (full) { const cm = document.createElement('span'); cm.className = 'wflag done'; cm.innerHTML = svg('check') + 'COMPLETE'; pv.appendChild(cm); }
    else if (cur && !locked) { const cm = document.createElement('span'); cm.className = 'wflag'; cm.textContent = 'YOU ARE HERE'; pv.appendChild(cm); }
    const g = document.createElement('span'); g.className = 'wg'; g.innerHTML = svg('bolt', 'fill') + W.gravity + ' G'; pv.appendChild(g);
    const lk = document.createElement('div'); lk.className = 'lk'; lk.innerHTML = '<i>' + svg('lock') + '</i><b>' + W.req + '</b>'; pv.appendChild(lk);
    const nm = document.createElement('div'); nm.className = 'wnm'; nm.textContent = W.name;
    const sb = document.createElement('div'); sb.className = 'wsub'; sb.textContent = W.blurb;
    const tg = document.createElement('div'); tg.className = 'wtags'; tg.innerHTML = W.tags.map((t) => '<span>' + t + '</span>').join('') + '<em class="wdiff" title="Difficulty">' + [1, 2, 3].map((k) => '<u class="' + (k <= W.diff ? 'on' : '') + '"></u>').join('') + '</em>';
    const bar = document.createElement('div'); bar.className = 'wbar'; bar.innerHTML = '<i style="width:' + (done / W.count * 100) + '%"></i>';
    const st = document.createElement('div'); st.className = 'wst'; st.innerHTML = done + '/' + W.count + ' levels &middot; ' + svg('star', 'fill') + worldStars(i) + '/' + W.count * 3;
    const nx = document.createElement('div'); nx.className = 'wnext'; nx.textContent = locked ? 'Locked' : full ? 'Replay any level' : (done ? 'Next: ' : 'Start: ') + LEVELS[worldNext(i)].name.split('  ')[1];
    c.append(pv, nm, sb, tg, bar, st, nx);
    c.addEventListener('click', (e) => { e.preventDefault(); Snd.init(); pickWorld(i); });
    box.appendChild(c);
  });
}
function pickWorld(i) {
  if (!worldOpen(i)) { toast('STAGE LOCKED', WORLDS[i].req, 'warn'); Snd.click(); return; }
  viewWorld = i; setState('levels'); Snd.click();
}
function buildCards() {
  const box = $('cards'); box.innerHTML = ''; box.classList.remove('fits'); box.scrollLeft = 0; const dots = $('lvDots'); dots.innerHTML = ''; const W = WORLDS[viewWorld];
  $('lvTitle').textContent = W.name + ' \u00B7 Select Level'; $('lvBlurb').textContent = W.blurb + ' \u00B7 gravity ' + W.gravity; $('levels').dataset.world = W.id; $('levels').dataset.count = W.count;
  $('lvStars').innerHTML = svg('star', 'fill') + worldStars(viewWorld) + '/' + W.count * 3;
  let curIdx = 0;
  for (let n = W.first; n <= W.last; n++) {
    const L = LEVELS[n], locked = n > unlocked, st = starsBy[n] || 0, ln = n - W.first + 1, idx = ln - 1, name = L.name.split('  ')[1];
    if (n === level && !locked) curIdx = idx;
    const c = document.createElement('button'); c.className = 'card' + (locked ? ' locked' : '') + (n === level ? ' cur' : ''); c.style.setProperty('--i', idx);
    c.setAttribute('data-testid', 'level-card-' + n); c.setAttribute('role', 'option'); c.setAttribute('aria-label', 'Level ' + ln + ' ' + name + (locked ? ', locked' : ', ' + st + ' of 3 stars'));
    const pv = document.createElement('div'); pv.className = 'pv';
    const cv = document.createElement('canvas'); drawPreview(cv, L, n); pv.appendChild(cv);
    const lk = document.createElement('div'); lk.className = 'lk'; lk.innerHTML = '<i>' + svg('lock') + '</i>'; pv.appendChild(lk);
    const num = document.createElement('span'); num.className = 'num'; num.innerHTML = '<small>LVL</small>' + ln; num.setAttribute('data-testid', 'level-num-' + n);
    const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = 'NEXT UP'; tag.hidden = locked || n !== level;
    const info = document.createElement('div'); info.className = 'info';
    const nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = name; nm.title = name;
    const tg = document.createElement('div'); tg.className = 'ctags';
    [[L.gravity && L.gravity >= Phys.MARS_G, 'Low G'], [L.gravity && L.gravity < Phys.MARS_G, 'Moon G'], [L.meteors, 'Meteors'], [n > 16 && HAZARDS[n] && HAZARDS[n].length, 'Hazards'], [L.cold, 'Freeze'], [L.needHover, 'Hover only'], [L.needLegendary, 'Legendary hover']].forEach(([on, t]) => { if (on) { const e = document.createElement('span'); e.textContent = t; tg.appendChild(e); } });
    const row = document.createElement('div'); row.className = 'row';
    const sr = document.createElement('div'); sr.className = 'st'; sr.setAttribute('data-testid', 'level-stars-' + n); sr.innerHTML = [0, 1, 2].map((i) => svg('star', 'fill' + (i < st ? ' on' : ' off'))).join('');
    const bt = document.createElement('div'); bt.className = 'bt'; bt.setAttribute('data-testid', 'level-best-' + n); bt.textContent = locked ? (n === W.first ? 'Clear ' + WORLDS[viewWorld - 1].name : 'Finish level ' + (ln - 1)) : (bests[n] !== undefined ? 'Best ' + fmt(bests[n]) : 'Not played');
    row.append(sr, bt);
    const go = document.createElement('span'); go.className = 'go'; go.innerHTML = locked ? svg('lock') + '<b>Locked</b>' : svg('play', 'fill') + '<b>' + (bests[n] !== undefined ? 'Race again' : 'Race') + '</b>';
    info.append(nm, tg, row, go);
    c.append(pv, num, tag, info);
    c.addEventListener('click', (e) => { e.preventDefault(); if (lvDragged) return; Snd.init(); pickLevel(n); });
    box.appendChild(c);
    const d = document.createElement('button'); d.type = 'button'; d.className = 'dot' + (locked ? ' locked' : ''); d.setAttribute('aria-label', 'Go to level ' + ln); d.setAttribute('data-testid', 'level-dot-' + idx);
    d.addEventListener('click', () => lvGo(idx)); dots.appendChild(d);
  }
  lvCount = W.count; box.classList.remove('ready');
  lvIdx = curIdx;
  requestAnimationFrame(() => requestAnimationFrame(() => { lvFits(); lvGo(curIdx, true); box.classList.add('ready'); }));
}
let lvCount = 0, lvDragged = false, lvIdx = 0, lvRaf = 0;
function lvFocus() {
  const box = $('cards'), mid = box.scrollLeft + box.clientWidth / 2; let best = 0, bd = 1e9;
  for (let i = 0; i < box.children.length; i++) { const c = box.children[i], d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = i; } }
  return best;
}
function lvFits() {
  const box = $('cards'), n = box.children.length; if (!n) return;
  const cs = getComputedStyle(box), gap = parseFloat(cs.columnGap) || 0, tot = n * box.children[0].offsetWidth + (n - 1) * gap;
  box.classList.toggle('fits', tot <= box.clientWidth - 150);
}
function lvSync() {
  lvRaf = 0; const box = $('cards'); if (!box.children.length) return;
  lvIdx = box.classList.contains('fits') ? Math.max(0, Math.min(box.children.length - 1, lvIdx)) : lvFocus();
  for (let i = 0; i < box.children.length; i++) box.children[i].classList.toggle('focus', i === lvIdx);
  const ds = $('lvDots').children; for (let i = 0; i < ds.length; i++) ds[i].classList.toggle('on', i === lvIdx);
  $('lvPrev').disabled = lvIdx <= 0; $('lvNext').disabled = lvIdx >= box.children.length - 1;
}
function lvGo(i, instant) {
  const box = $('cards'); i = Math.max(0, Math.min(box.children.length - 1, i)); const c = box.children[i]; if (!c) return;
  if (box.classList.contains('fits')) { lvIdx = i; lvSync(); if (!instant) Snd.hover && Snd.hover(); return; }
  box.scrollTo({ left: c.offsetLeft + c.offsetWidth / 2 - box.clientWidth / 2, behavior: instant || (window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches) ? 'auto' : 'smooth' });
  lvSync(); if (!instant) Snd.hover && Snd.hover();
}
(function lvInit() {
  const box = $('cards'); let drag = null;
  box.addEventListener('scroll', () => { if (!lvRaf) lvRaf = requestAnimationFrame(lvSync); }, { passive: true });
  window.addEventListener('resize', () => { if (state === 'levels') { lvFits(); lvGo(lvIdx, true); } });
  $('lvPrev').addEventListener('click', () => { Snd.click(); lvGo(lvIdx - 1); });
  $('lvNext').addEventListener('click', () => { Snd.click(); lvGo(lvIdx + 1); });
  box.addEventListener('wheel', (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { box.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
  box.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' || e.button !== 0) return; drag = { x: e.clientX, l: box.scrollLeft, moved: false }; });
  window.addEventListener('pointermove', (e) => {
    if (!drag) return; const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 6) { drag.moved = true; box.classList.add('dragging'); }
    if (drag.moved) box.scrollLeft = drag.l - dx;
  });
  const end = () => { if (!drag) return; const m = drag.moved; drag = null; if (m) { lvDragged = true; setTimeout(() => { lvDragged = false; }, 60); box.classList.remove('dragging'); lvGo(lvFocus()); } };
  window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
  window.addEventListener('keydown', (e) => {
    if (state !== 'levels') return;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') { lvGo(lvIdx + 1); e.preventDefault(); }
    else if (e.code === 'ArrowLeft' || e.code === 'KeyA') { lvGo(lvIdx - 1); e.preventDefault(); }
    else if (e.code === 'Home') lvGo(0); else if (e.code === 'End') lvGo(1e3);
    else if ((e.code === 'Enter' || e.code === 'Space') && (document.activeElement === document.body || document.activeElement === box)) { const c = box.children[lvIdx]; if (c) { e.preventDefault(); c.click(); } }
  });
})();
let warping = false;
function stageTravel(toLevel, go) {
  const a = worldOf(level), b = worldOf(toLevel);
  if (a === b || warping || (window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches)) { go(); return; }
  warping = true; const w = $('warp');
  $('warpFrom').textContent = WORLDS[a].name.toUpperCase(); $('warpTo').textContent = WORLDS[b].name.toUpperCase(); $('warpName').textContent = 'TO ' + WORLDS[b].name.toUpperCase();
  w.dataset.to = WORLDS[b].id; w.classList.remove('hidden', 'go'); void w.offsetWidth; w.classList.add('go'); Snd.nitro && Snd.nitro();
  setTimeout(() => { go(); }, 2300);
  setTimeout(() => { w.classList.add('hidden'); w.classList.remove('go'); warping = false; }, 3000);
}
function hoverBlock(n) {
  if (unlockAllOn() && (LEVELS[n].needLegendary || LEVELS[n].needHover) && vehicleById(vehicleId).rarity !== 'legendary') { vehicleId = owned.indexOf('hover2') >= 0 ? 'hover2' : 'hover'; applyStats(vehicleId); applyVehicle(vehicleId); }
  if (LEVELS[n].needLegendary && vehicleById(vehicleId).rarity !== 'legendary') {
    const has = VEHICLES.some((v) => v.rarity === 'legendary' && owned.indexOf(v.id) >= 0);
    toast('LEGENDARY HOVER REQUIRED', has ? 'Open the Garage and SELECT the Mars Hover or Aero Hover to fly in space' : 'Buy a Legendary hover in the Garage (Mars Hover 2500 / Aero Hover 4000 coins)', 'warn'); Snd.click(); return true;
  }
  if (!LEVELS[n].needHover || vehicleId === 'hover') return false;
  toast('MARS HOVER REQUIRED', owned.indexOf('hover') < 0 ? 'Buy the Mars Hover in the Garage (2500 coins), then select it' : 'Open the Garage and SELECT the Mars Hover to start this level', 'warn'); Snd.click(); return true;
}
function pickLevel(n) {
  if (n > unlocked) { { const wi = worldOf(n), Wd = WORLDS[wi]; toast('LOCKED', n === Wd.first ? Wd.req : 'Finish level ' + (n - Wd.first) + ' first', 'warn'); }; Snd.click(); return; }
  if (hoverBlock(n)) return;
  stageTravel(n, () => { if (n !== level) loadLevel(n); save(); startRun(); });
}
/* ---- garage ---- */
let previewId = vehicleId;
function buildGarage() {
  previewId = vehicleId; for (const k in cosPrev) delete cosPrev[k]; const list = $('gList'); list.innerHTML = '';
  for (const v of VEHICLES) {
    const b = document.createElement('button'); b.className = 'gcard r-' + v.rarity; b.dataset.id = v.id; b.setAttribute('aria-label', v.name);
    b.classList.toggle('lk', owned.indexOf(v.id) < 0);
    b.innerHTML = '<img alt="" src="' + THUMBS[v.id] + '"><span class="gn">' + v.name + '</span><span class="rb" data-testid="rarity-badge-' + v.id + '">' + RARITY[v.rarity].name + '</span><span class="ck">' + svg('check') + '</span>' + (owned.indexOf(v.id) < 0 ? '<span class="pr">' + svg('coin', 'coin') + v.price + '</span>' : '');
    b.addEventListener('click', (e) => { e.preventDefault(); Snd.init(); previewVehicle(v.id); });
    list.appendChild(b);
  }
  applyVehicle(previewId); syncGarage();
}
function previewVehicle(id) {
  if (id === previewId) return; previewId = id; for (const k in cosPrev) delete cosPrev[k]; applyVehicle(id); syncGarage(); Snd.click(); popT = 1; burst(14, 5);
}
function syncGarage() {
  const v = vehicleById(previewId), eq = previewId === vehicleId;
  for (const b of $('gList').children) {
    const isSel = b.dataset.id === previewId;
    b.classList.toggle('sel', isSel);
    b.classList.toggle('eq', b.dataset.id === vehicleId);
    if (isSel) {
      try { b.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); } catch (x) {}
    }
  }
  $('gKind').textContent = RARITY[v.rarity].name + ' \u2022 ' + v.kind; $('gName').dataset.rarity = v.rarity; $('gKind').dataset.rarity = v.rarity; $('gName').textContent = v.name; $('gTag').textContent = v.tag;
  const own = owned.indexOf(v.id) >= 0, need = v.price - coins;
  renderPane();
  $('gChips').innerHTML = '<span class="chip rar r-' + v.rarity + '" data-testid="garage-rarity-chip">' + RARITY[v.rarity].name + '</span><span class="chip abil" data-testid="garage-ability-chip">' + v.ability + '</span>' + (v.id === 'hover' && trophy ? '<span class="chip trophy">\u2605 Gold Hover</span>' : '') + (eq ? '<span class="chip eq">Equipped</span>' : own ? '' : '<span class="chip">' + svg('lock') + 'Locked</span>');
  const bt = $('btnEquip'); bt.classList.toggle('done', eq); bt.classList.toggle('play', !eq); bt.classList.toggle('broke', !own && need > 0);
  $('equipLb').innerHTML = eq ? 'Equipped' : own ? 'Select' : need > 0 ? svg('coin', 'coin') + v.price + '<small style="display:block;font-size:.5em;letter-spacing:.06em">NEED ' + need + ' MORE</small>' : 'Buy ' + svg('coin', 'coin') + v.price;
  $('equipIc').innerHTML = svg(own ? 'check' : 'lock');
}
function cycleVehicle(d) { const i = VEHICLES.findIndex((v) => v.id === previewId); previewVehicle(VEHICLES[(i + d + VEHICLES.length) % VEHICLES.length].id); }
function equip() {
  const v = vehicleById(previewId);
  if (owned.indexOf(v.id) < 0) {
    if (coins < v.price) { toast('NEED ' + (v.price - coins) + ' MORE', 'Earn coins from stars, style and flips', 'warn'); Snd.click(); return; }
    coins -= v.price; owned.push(v.id); vehicleId = v.id; applyStats(vehicleId); save(); refreshMenu(); buildGarage(); Snd.win(); popT = 1; burst(30, 9); toast('NEW RIDE', v.name + ' is yours', 'good'); return;
  }
  if (previewId !== vehicleId) { vehicleId = previewId; applyStats(vehicleId); save(); Snd.cp(); } refreshMenu(); setState('menu');
}
function leaveGarage() { for (const k in cosPrev) delete cosPrev[k]; applyVehicle(vehicleId); setState('menu'); Snd.click(); }
const on = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', (e) => { e.preventDefault(); Snd.init(); fn(); }); };
on('btnPlay', () => { Snd.click(); pickLevel(level); });
on('btnLevels', () => { setState('stages'); Snd.click(); });
on('btnStBack', () => { setState('menu'); Snd.click(); });
on('btnGarage', () => { setState('garage'); Snd.click(); });
on('btnGarBack', leaveGarage);
on('btnGarPrev', () => { cycleVehicle(-1); });
on('btnGarNext', () => { cycleVehicle(1); });
on('btnEquip', equip);
let gTouchX0 = null;
const stageEl = $('gStage');
if (stageEl) {
  stageEl.addEventListener('touchstart', (e) => { if (e.touches && e.touches[0]) gTouchX0 = e.touches[0].clientX; }, { passive: true });
  stageEl.addEventListener('touchend', (e) => {
    if (gTouchX0 === null || !e.changedTouches || !e.changedTouches[0]) return;
    const dx = e.changedTouches[0].clientX - gTouchX0; gTouchX0 = null;
    if (Math.abs(dx) > 35) cycleVehicle(dx > 0 ? -1 : 1);
  }, { passive: true });
}
let gPaneTouchY = null;
const paneEl = $('gPane');
if (paneEl) {
  paneEl.addEventListener('touchstart', (e) => { if (e.touches && e.touches[0]) gPaneTouchY = e.touches[0].clientY; }, { passive: true });
  paneEl.addEventListener('touchmove', (e) => {
    if (gPaneTouchY === null || !e.touches || !e.touches[0]) return;
    const dy = gPaneTouchY - e.touches[0].clientY;
    gPaneTouchY = e.touches[0].clientY;
    paneEl.scrollTop += dy;
  }, { passive: true });
  paneEl.addEventListener('touchend', () => { gPaneTouchY = null; }, { passive: true });
  paneEl.addEventListener('touchcancel', () => { gPaneTouchY = null; }, { passive: true });
}
let gListTouchX = null;
const listEl = $('gList');
if (listEl) {
  listEl.addEventListener('touchstart', (e) => { if (e.touches && e.touches[0]) gListTouchX = e.touches[0].clientX; }, { passive: true });
  listEl.addEventListener('touchmove', (e) => {
    if (gListTouchX === null || !e.touches || !e.touches[0]) return;
    const dx = gListTouchX - e.touches[0].clientX;
    gListTouchX = e.touches[0].clientX;
    listEl.scrollLeft += dx;
  }, { passive: true });
  listEl.addEventListener('touchend', () => { gListTouchX = null; }, { passive: true });
  listEl.addEventListener('touchcancel', () => { gListTouchX = null; }, { passive: true });
}
on('btnLvBack', () => { setState('stages'); Snd.click(); });
on('btnLvl2', () => { clearInput(); viewWorld = worldOf(level); setState('levels'); Snd.click(); });
on('btnNext', () => { if (level < CAMPAIGN_LEVELS) { const nx = level + 1; if (hoverBlock(nx)) return; stageTravel(nx, () => { loadLevel(nx); save(); startRun(); }); } });
on('btnSettings', () => { setState('settings'); Snd.click(); });
on('btnBack', () => { if (settingsFromPause) { closePauseSettings(); return; } setState('menu'); Snd.click(); });
on('btnPauseSettings', () => { if (state !== 'paused') return; settingsFromPause = true; show(['hud', 'settings']); Snd.click(); });
on('btnMenu3', toMenu);
on('btnPause', () => { Snd.click(); if (duelOn) duelAskLeave(); else pause(); });
on('btnResume', resume);
on('btnRestartCp', () => { if (state !== 'paused') return; if (LEVELS[level].space) { spaceRespawn(); clearInput(); setState('playing'); Snd.click(); return; } car.spawn(CPS[cpIndex].x, cpIndex === 0 ? 0 : 8); if (cpIndex === 0) { settle(300); } clearInput(); snapCamera(); setState('playing'); Snd.click(); });
on('btnRestartLevel', () => { startRun(); });
on('btnMenu1', toMenu);
on('btnRetry', retry);
on('btnAgain', startRun);
on('btnMenu2', toMenu);
const optSound = $('optSound'), optQuality = $('optQuality'), optShake = $('optShake');
const syncOpts = () => { optSound.textContent = settings.sound ? 'On' : 'Off'; optSound.classList.toggle('active', settings.sound); optShake.textContent = settings.shake ? 'On' : 'Off'; optShake.classList.toggle('active', settings.shake); optQuality.textContent = settings.quality === 'high' ? 'High' : 'Low'; };
optSound.addEventListener('click', () => { settings.sound = !settings.sound; Snd.init(); syncOpts(); save(); Snd.click(); });
optQuality.addEventListener('click', () => { settings.quality = settings.quality === 'high' ? 'low' : 'high'; syncOpts(); resize(); save(); Snd.click(); });
optShake.addEventListener('click', () => { settings.shake = !settings.shake; syncOpts(); save(); Snd.click(); });
syncOpts();
