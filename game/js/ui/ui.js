/* eslint-disable */
'use strict';
/* Menus, level cards, garage and settings wiring */
/* ================= UI wiring ================= */
const svg = (n, cls) => '<svg class="ico ' + (cls || '') + '"><use href="#i-' + n + '"/></svg>';
const totalStars = () => { let t = 0; for (let n = 1; n < LEVELS.length; n++) t += starsBy[n] || 0; return t; };
function refreshMenu() {
  refreshCoins();
  const b = bests[level];
  $('bestTime').innerHTML = b === undefined ? '' : svg('time') + 'Best ' + fmt(b);
  const ts = totalStars(); $('starTotal').innerHTML = svg('star', 'fill') + ts + '/' + (LEVELS.length - 1) * 3;
  $('playSub').textContent = LEVELS[level].name.replace('  ', ' \u00B7 ');
  $('lvlSub').textContent = WORLDS[worldOf(level)].name + ' \u00B7 ' + unlocked + '/' + (LEVELS.length - 1) + ' open';
  $('kicker').innerHTML = '<span></span>Stage 0' + (worldOf(level) + 1) + ' &middot; ' + WORLDS[worldOf(level)].name;
  $('garSub').textContent = vehicleById(vehicleId).name;
}
const hexs = (c) => '#' + (0x1000000 + c).toString(16).slice(1);
// a little side-on postcard of each level, painted from the level's own sky and glow colors
function drawPreview(cv, L, n) {
  const w = cv.width = 320, h = cv.height = 190, g = cv.getContext('2d');
  const sk = g.createLinearGradient(0, 0, 0, h); L.sky.forEach((c, i) => sk.addColorStop(i / (L.sky.length - 1), c)); g.fillStyle = sk; g.fillRect(0, 0, w, h);
  let q = n * 977 + 13; const r = () => { q = (q * 16807) % 2147483647; return q / 2147483647; };
  for (let i = 0; i < 46; i++) { const y = r() * h * 0.55; g.globalAlpha = (1 - y / (h * 0.55)) * 0.85; g.fillStyle = '#fff'; g.fillRect(r() * w, y, 1.6, 1.6); } g.globalAlpha = 1;
  const sx = w * (0.6 + (n % 2) * 0.14), sy = h * 0.5, gl = g.createRadialGradient(sx, sy, 2, sx, sy, h * 0.55);
  gl.addColorStop(0, 'rgba(255,244,214,.95)'); gl.addColorStop(0.16, 'rgba(255,214,160,.55)'); gl.addColorStop(1, 'rgba(255,170,110,0)'); g.fillStyle = gl; g.fillRect(0, 0, w, h);
  if (L.biome === 'moon') { g.fillStyle = '#2a78d8'; g.beginPath(); g.arc(w * 0.2, h * 0.2, 15, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(w * 0.2 - 2, h * 0.2 + 1, 9, 2.5, -0.4, 0, 7); g.fill(); g.fillStyle = 'rgba(90,94,108,.7)'; for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse((i + 0.5) * w / 5, h * 0.7, 40 + r() * 30, 7, 0, 3.14, 6.28); g.fill(); } }
  for (let i = 0; i < (L.biome === 'moon' ? 0 : 4); i++) {            // floating islands
    const ix = (i + 0.3 + r() * 0.4) * w / 4, iy = h * (0.34 + r() * 0.2), iw = 26 + r() * 30, col = hexs(L.island[i % 3]);
    g.fillStyle = 'rgba(8,6,36,.62)'; g.beginPath(); g.moveTo(ix - iw, iy); g.lineTo(ix + iw, iy); g.lineTo(ix + iw * 0.2, iy + iw * 0.7); g.lineTo(ix - iw * 0.3, iy + iw * 0.55); g.closePath(); g.fill();
    g.fillStyle = col; g.globalAlpha = 0.75; g.beginPath(); g.ellipse(ix, iy, iw, 4.5, 0, 0, 7); g.fill(); g.globalAlpha = 1;
  }
  const gs = 0.36 + (n % 3) * 0.03, ge = 0.6 + (n % 2) * 0.04, y1 = h * 0.76, y2 = h * 0.7;
  const slab = (x0, x1, y) => {
    const sg = g.createLinearGradient(0, y, 0, h); sg.addColorStop(0, hexs(L.topB)); sg.addColorStop(1, '#0a0828'); g.fillStyle = sg; g.fillRect(x0, y, x1 - x0, h - y);
    g.fillStyle = hexs(L.glow[0]); g.fillRect(x0, y - 2, x1 - x0, 3.5);
    g.fillStyle = 'rgba(255,241,220,.85)'; for (let x = x0 + 8; x < x1 - 10; x += 26) g.fillRect(x, y + 10, 13, 2.5);
  };
  slab(0, w * gs, y1); slab(w * ge, w, y2);
  g.fillStyle = hexs(L.topB); g.beginPath(); g.moveTo(w * gs - 46, y1); g.lineTo(w * gs, y1 - 20); g.lineTo(w * gs, y1); g.closePath(); g.fill();
  g.strokeStyle = hexs(L.glow[0]); g.lineWidth = 3; g.beginPath(); g.moveTo(w * gs - 46, y1 - 1); g.lineTo(w * gs, y1 - 21); g.stroke();
  const hx = w * (gs + ge) / 2, hy = h * 0.5;   // hoop
  g.save(); g.shadowColor = hexs(L.glow[1]); g.shadowBlur = 14; g.strokeStyle = hexs(L.glow[1]); g.lineWidth = 5; g.beginPath(); g.ellipse(hx, hy, 11, 30, 0, 0, 7); g.stroke(); g.restore();
  g.save(); g.translate(hx - 4, hy - 4); g.rotate(-0.22); g.fillStyle = '#fff1dc'; g.beginPath(); g.roundRect ? g.roundRect(-18, -6, 36, 11, 4) : g.rect(-18, -6, 36, 11); g.fill();
  g.fillStyle = '#35e6ff'; g.fillRect(-4, -11, 14, 6); g.fillStyle = '#fff1dc'; g.fillRect(-9, -10, 22, 5);
  g.fillStyle = '#150c3a'; for (const wx of [-10, 10]) { g.beginPath(); g.arc(wx, 5, 4.4, 0, 7); g.fill(); } g.restore();
  const vg = g.createLinearGradient(0, h * 0.55, 0, h); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(6,3,24,.45)'); g.fillStyle = vg; g.fillRect(0, h * 0.55, w, h * 0.45);
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
const worldOpen = (i) => WORLDS[i].first <= unlocked;
const worldNext = (i) => { const W = WORLDS[i]; for (let n = W.first; n <= W.last; n++) if (!starsBy[n]) return n; return W.last; };
function buildStages() {
  const box = $('worlds'); box.innerHTML = '';
  $('stStars').innerHTML = svg('star', 'fill') + totalStars() + '/' + (LEVELS.length - 1) * 3;
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
  const box = $('cards'); box.innerHTML = ''; const W = WORLDS[viewWorld];
  $('lvTitle').textContent = W.name + ' \u00B7 Select Level'; $('lvBlurb').textContent = W.blurb + ' \u00B7 gravity ' + W.gravity; $('levels').dataset.world = W.id;
  $('lvStars').innerHTML = svg('star', 'fill') + worldStars(viewWorld) + '/' + W.count * 3;
  for (let n = W.first; n <= W.last; n++) {
    const L = LEVELS[n], locked = n > unlocked, st = starsBy[n] || 0, ln = n - W.first + 1;
    const c = document.createElement('button'); c.className = 'card' + (locked ? ' locked' : '') + (n === level ? ' cur' : '');
    c.setAttribute('data-testid', 'level-card-' + n); c.setAttribute('aria-label', 'Level ' + ln + ' ' + L.name.split('  ')[1] + (locked ? ', locked' : ''));
    const pv = document.createElement('div'); pv.className = 'pv';
    const cv = document.createElement('canvas'); drawPreview(cv, L, n); pv.appendChild(cv);
    const num = document.createElement('span'); num.className = 'num'; num.textContent = ln; pv.appendChild(num);
    if (!locked && n === level) { const tg = document.createElement('span'); tg.className = 'tag'; tg.textContent = 'NEXT UP'; pv.appendChild(tg); }
    const go = document.createElement('span'); go.className = 'go'; go.innerHTML = svg('play', 'fill'); if (!locked) pv.appendChild(go);
    const lk = document.createElement('div'); lk.className = 'lk'; lk.innerHTML = '<i>' + svg('lock') + '</i>'; pv.appendChild(lk);
    const nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = L.name.split('  ')[1] + (L.gravity ? (L.gravity < Phys.MARS_G ? '' : ' \u00B7 LOW G') : '') + (L.meteors ? ' \u00B7 METEORS' : '') + (n > 16 && HAZARDS[n] && HAZARDS[n].length ? ' \u00B7 HAZARDS' : '') + (L.cold ? ' \u00B7 FREEZE' : '') + (L.needHover ? ' \u00B7 HOVER ONLY' : '');
    const sr = document.createElement('div'); sr.className = 'st'; sr.innerHTML = [0, 1, 2].map((i) => svg('star', 'fill' + (i < st ? '' : ' off')).replace('class="ico fill off"', 'class="ico fill off"')).join('').replace(/<svg class="ico fill off">/g, '<svg class="ico fill off" style="color:rgba(160,180,230,.38)">');
    const bt = document.createElement('div'); bt.className = 'bt'; bt.textContent = locked ? (n === W.first ? 'Clear ' + WORLDS[viewWorld - 1].name : 'Finish level ' + (ln - 1)) : (bests[n] !== undefined ? 'Best ' + fmt(bests[n]) : 'Not played');
    c.append(pv, nm, sr, bt);
    c.addEventListener('click', (e) => { e.preventDefault(); Snd.init(); pickLevel(n); });
    box.appendChild(c);
  }
}
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
    const b = document.createElement('button'); b.className = 'gcard'; b.dataset.id = v.id; b.setAttribute('aria-label', v.name);
    b.classList.toggle('lk', owned.indexOf(v.id) < 0);
    b.innerHTML = '<img alt="" src="' + THUMBS[v.id] + '"><span class="gn">' + v.name + '</span><span class="ck">' + svg('check') + '</span>' + (owned.indexOf(v.id) < 0 ? '<span class="pr">' + svg('coin', 'coin') + v.price + '</span>' : '');
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
  $('gKind').textContent = v.kind; $('gName').textContent = v.name; $('gTag').textContent = v.tag;
  const own = owned.indexOf(v.id) >= 0, need = v.price - coins;
  renderPane();
  $('gChips').innerHTML = (v.id === 'hover' && trophy ? '<span class="chip trophy">\u2605 Gold Hover</span>' : '') + (eq ? '<span class="chip eq">Equipped</span>' : own ? '' : '<span class="chip">' + svg('lock') + 'Locked</span>');
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
on('btnNext', () => { if (level < LEVELS.length - 1) { const nx = level + 1; if (hoverBlock(nx)) return; stageTravel(nx, () => { loadLevel(nx); save(); startRun(); }); } });
on('btnSettings', () => { setState('settings'); Snd.click(); });
on('btnBack', () => { if (settingsFromPause) { closePauseSettings(); return; } setState('menu'); Snd.click(); });
on('btnPauseSettings', () => { if (state !== 'paused') return; settingsFromPause = true; show(['hud', 'settings']); Snd.click(); });
on('btnMenu3', toMenu);
on('btnPause', () => { Snd.click(); pause(); });
on('btnResume', resume);
on('btnRestartCp', () => { if (state !== 'paused') return; car.spawn(CPS[cpIndex].x, cpIndex === 0 ? 0 : 8); if (cpIndex === 0) { settle(300); } clearInput(); snapCamera(); setState('playing'); Snd.click(); });
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
