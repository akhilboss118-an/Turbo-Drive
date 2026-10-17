/* eslint-disable */
'use strict';
/* Game state machine and camera */
/* ================= game state ================= */
let lap = 1, state = 'menu', timeT = 0, crashes = 0, score = 0, cpIndex = 0, countdownT = 0, lastCount = -1, crashT = 0, finishT = 0, shake = 0, menuAngle = 0;
const camPos = { x: 0, y: 3, fy: 0 };
let zoomF = 1;                                   // camera distance factor: 1.0 normal, 0.7 on gas
const UI = { login: $('login'), stages: $('stages'), levels: $('levels'), garage: $('garage'), menu: $('menu'), settings: $('settings'), hud: $('hud'), controls: $('controls'), countdown: $('countdown'), pause: $('pauseMenu'), crash: $('crashMenu'), results: $('results'), cutscene: $('cutscene'), duel: $('duelHome'), lobby: $('duelLobby'), duelResult: $('duelResult'), shootLobby: $('shootLobby'), shootGame: $('shootGame'), shootResult: $('shootResult') };
const show = (names) => { for (const k in UI) UI[k].classList.toggle('hidden', names.indexOf(k) < 0); };
function setState(s) {
  state = s; Snd.scene(s);
  if (s === 'login') show(['login']);
  else if (s === 'menu') show(['menu']);
  else if (s === 'settings') show(['settings']);
  else if (s === 'stages') { buildStages(); show(['stages']); }
  else if (s === 'levels') { buildCards(); show(['levels']); }
  else if (s === 'garage') { buildGarage(); show(['garage']); }
  else if (s === 'countdown') show(['hud', 'controls', 'countdown']);
  else if (s === 'playing' || s === 'finishing') show(['hud', 'controls']);
  else if (s === 'paused') show(['hud', 'pause']);
  else if (s === 'crashed') show(['hud', 'controls', 'crash']);
  else if (s === 'results') show(['results']);
  else if (s === 'cutscene') show(['cutscene']);
  else if (s === 'victory' || s === 'credits' || s === 'cinematic' || s === 'end') show([]);
  else if (s === 'duel') show(['duel']);
  else if (s === 'lobby') show(['lobby']);
  else if (s === 'duelresult') show(['duelResult']);
  else if (s === 'shootlobby') show(['shootLobby']);
  else if (s === 'shootgame') show(['shootGame']);
  else if (s === 'shootresult') show(['shootResult']);
  document.body.dataset.state = s;
  window.dispatchEvent(new CustomEvent('td:state', { detail: s }));
}
const fmt = (t) => { const m = Math.floor(t / 60), s = t - m * 60; return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s.toFixed(1); };
let toastTimer = 0;
function toast(main, sub, cls) {
  const el = $('toast'); el.innerHTML = ''; const a = document.createElement('div'); a.className = 'tmain ' + (cls || ''); a.textContent = main; el.appendChild(a);
  if (sub) { const b = document.createElement('div'); b.className = 'tsub'; b.textContent = sub; el.appendChild(b); }
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); el.classList.remove('hidden'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.add('hidden'), 1700);
}
function countUp(el, to, f, ms) {
  const t0 = performance.now(), step = (now) => { const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3); el.textContent = f(to * e); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function settle(n) { for (let i = 0; i < n; i++) car.step(DT, { gas: false }); car.events.length = 0; car.vx = car.vy = car.w = 0; }
function resetGates() { resetHoops(); for (const h of hazards) h.warned = false; hzT = 0; for (const g of gates) { g.passed = false; g.mat.color.setHex(g === gates[gates.length - 1] ? 0xffffff : 0xff8a3d); } resetGateModels(); }
function applyStats(id) { car.setStats(Phys.statsFor(id, upgOf(id))); }
function startRun(cd) {
  applyStats(vehicleId);
  Snd.init(); try { const el = document.documentElement; if (el.requestFullscreen && !document.fullscreenElement) { const p = el.requestFullscreen(); if (p && p.catch) p.catch(() => {}); } if (screen.orientation && screen.orientation.lock) { const p = screen.orientation.lock('landscape'); if (p && p.catch) p.catch(() => {}); } } catch (e) {}
  timeT = 0; crashes = 0; score = 0; cpIndex = 0; lap = 1; resetGates(); resetCrates(); clearInput();
  run = { stars: 0, style: 0, flips: 0, flipPts: 0, crates: 0 }; setCombo(0); fuel = 1; resetCold(true);
  car.spawn(CPS[0].x, 0); settle(300); snapCamera(); if (LEVELS[level].onfoot) footStart(); if (LEVELS[level].dogfight) dfStart(); if (LEVELS[level].space) { spaceStart(); setTimeout(() => { if (state === 'countdown' || state === 'playing') toast('DEEP SPACE', 'Steer LEFT / RIGHT through the rings. Dodge the asteroids!', 'good'); }, 2400); }
  countdownT = cd || (LEVELS[level].onfoot ? 1.6 : 3.2); lastCount = -1; setState('countdown');
  if (LEVELS[level].collapse) setTimeout(() => { if (state === 'countdown' || state === 'playing') toast('THE MOON IS COLLAPSING', 'Reach the launch pad and escape!', 'warn'); }, 2600);
}
function retry() {
  if (state !== 'crashed') return;
  if (duelOn) duelRs++;
  if (LEVELS[level].dogfight) { dfRespawn(); clearInput(); setState('playing'); Snd.click(); return; }
  if (LEVELS[level].onfoot) { footRespawn(); clearInput(); setState('playing'); Snd.click(); return; }
  if (LEVELS[level].space) { spaceRespawn(); clearInput(); fuel = Math.max(fuel, 0.5); setState('playing'); Snd.click(); return; }
  car.spawn(CPS[cpIndex].x, 8); resetCold(false); clearInput(); snapCamera(); fuel = Math.max(fuel, 0.5); setState('playing'); Snd.click();
}
function pause() { if (duelOn) return; if (state !== 'playing' && state !== 'countdown') return; clearInput(); pausedFrom = state; setState('paused'); }
let pausedFrom = 'playing', settingsFromPause = false;
function closePauseSettings() { settingsFromPause = false; show(['hud', 'pause']); Snd.click(); }
function resume() { if (state !== 'paused') return; clearInput(); setState(pausedFrom); Snd.click(); }
function toMenu() { clearInput(); refreshMenu(); car.spawn(CPS[0].x, 0); settle(300); if (LEVELS[level].onfoot) footMenuPose(); if (LEVELS[level].dogfight) dfMenuPose(); if (LEVELS[level].space) spaceStart(); setState('menu'); Snd.click(); }
function onCrash(reason) {
  setCombo(0); vibe(60, 'heavy');
  crashes++; crashT = 0; shake = 0.7; burst(50, 12); Snd.crash();
  $('crashReason').textContent = reason.charAt(0).toUpperCase() + reason.slice(1); setState('crashed');
}
function nextLap() {
  lap++; cpIndex = 0; duelRs++; resetGates();
  car.spawn(CPS[0].x, Math.max(7, Math.min(car.speed(), 30))); snapCamera();
  toast('LAP ' + lap, 'Endless loop', 'good'); Snd.cp(); duelOnLap();
}
function onFinish() {
  if (duelOn) duelOnFinish();
  setState('finishing'); finishT = 0; Snd.win(); toast('FINISH!', null, 'good');
}
const TROPHY_COINS = 3000;
function showResults() {
  if (duelOn) { duelShowResult(); return; }
  const th = LEVELS[level].stars, stars = timeT <= th[0] ? 3 : timeT <= th[1] ? 2 : 1;
  const prev = bests[level] === undefined ? null : bests[level];
  const isBest = prev === null || timeT < prev; if (isBest) { bests[level] = timeT; best = timeT; }
  const prevStars = starsBy[level] || 0; if (!starsBy[level] || stars > starsBy[level]) starsBy[level] = stars;
  addCoins(Math.round(STAR_COINS[stars] * LV_MULT[baseOf(level)] * (level > 16 ? 2 : level > 8 ? 1.5 : 1)) + 40 * Math.max(0, stars - prevStars), 'stars');
  const hasNext = level < CAMPAIGN_LEVELS, nw = WORLDS.find((w) => w.first === level + 1), newWorld = nw && unlocked < level + 1 ? nw : null; const secretNew = hasNext && LEVELS[level + 1].secret && unlocked < level + 1; if (hasNext && unlocked < level + 1) unlocked = level + 1;
  let newTrophy = false; if (LEVELS[level].finale && stars === 3 && !trophy) { trophy = true; newTrophy = true; coins += TROPHY_COINS; refreshCoins(); Snd.win(); }
  save(); refreshMenu();
  const tr = $('resTrophy'); tr.classList.toggle('hidden', !(LEVELS[level].finale && trophy)); tr.textContent = newTrophy ? 'GOLD HOVER TROPHY  +' + TROPHY_COINS + ' COINS' : 'GOLD HOVER TROPHY';
  $('btnNext').classList.toggle('hidden', !hasNext); $('btnNext').textContent = nw ? 'Go to ' + nw.name : LEVELS[level + 1] && LEVELS[level + 1].dogfight ? 'LEVEL 28: SPACE BATTLE' : LEVELS[level + 1] && LEVELS[level + 1].hunt ? 'LEVEL 27: ALIEN HUNT' : LEVELS[level + 1] && LEVELS[level + 1].onfoot ? 'LEVEL 26: SURVIVE ON PLUTO' : LEVELS[level + 1] && LEVELS[level + 1].secret ? 'SECRET LEVEL: PLUTO' : 'Next level';
  $('resLevel').textContent = LEVELS[level].name.replace('  ', ' \u00B7 ');
  $('resStars').innerHTML = [0, 1, 2].map((i) => '<i class="' + (i < stars ? 'on' : '') + '">\u2605</i>').join('');
  $('resBadge').classList.toggle('hidden', !isBest);
  $('resLap').textContent = 'Lap time ' + fmt(timeT) + '   \u00B7   Best lap ' + fmt(bests[level]);
  $('resStats').textContent = 'Crashes ' + crashes + '   \u00B7   Style ' + score + (LEVELS[level].gravity ? '   \u00B7   Flip bonus ' + run.flipPts : '') + (isBest ? '' : '   \u00B7   Best ' + fmt(prev)) + (newWorld ? '   \u00B7   ' + newWorld.name.toUpperCase() + ' UNLOCKED' : '') + (secretNew ? '   \u00B7   SECRET LEVEL UNLOCKED' : '') + (LEVELS[level].dogfight ? '   \u00B7   UFO DESTROYED   \u00B7   Hull hits ' + DF.hits + '/3   \u00B7   EARTH IS SAFE' : LEVELS[level].hunt ? '   \u00B7   Aliens killed ' + FT.kills + '/12   \u00B7   YOU ESCAPED THE ALIEN... FOR NOW' : LEVELS[level].onfoot ? '   \u00B7   Kills ' + FT.kills + '   \u00B7   THE ALIEN IS COMING BACK... TO BE CONTINUED' : '');
  countUp($('resTime'), timeT, fmt, 900);
  window.dispatchEvent(new CustomEvent('td:result', { detail: { level, time: timeT, style: score, stars, isBest } }));
  $('resCoins').innerHTML = svg('coin', 'coin') + ' +' + (run.stars + run.style + run.flips) + ' coins<small>Stars ' + run.stars + '  \u00B7  Style ' + run.style + '  \u00B7  Flips ' + run.flips + (run.crates ? '  \u00B7  Crates ' + run.crates : '') + '</small>';
  $('btnEnding').classList.toggle('hidden', !LEVELS[level].finale2);
  if (LEVELS[level].finale) { startCutscene('launch'); return; }
  if (LEVELS[level].space && LEVELS[level].planet === 'pluto') { CS.after = null; startCutscene('pluto'); return; }
  setState('results'); Snd.engine(0, false, false);
}

/* ================= camera ================= */
let camRoll = 0, vista = 0, camLat = 0, camTight = 0, chaseReady = false;
function snapCamera() { camPos.x = car.x - (track.path ? 13 : 11); camPos.fy = car.y; camPos.y = car.y + 4; camRoll = 0; vista = 0; camLat = 0; camTight = 0; chaseReady = false; }
function updateCamera(dt) {
  if (state === 'login' || state === 'menu' || state === 'settings' || state === 'results' || state === 'levels' || state === 'stages' || state === 'garage' || state === 'duel' || state === 'lobby' || state === 'duelresult' || state === 'shootlobby' || state === 'shootgame' || state === 'shootresult') {
    menuAngle += dt * (state === 'garage' ? 0.42 : 0.25); const a = menuAngle, r = state === 'garage' ? 7.4 : 8.5;
    camera.fov = 52; camera.updateProjectionMatrix();
    // slide the car into the free part of the screen: right of the buttons in the menu, left of the info card in the garage
    const tgt = state === 'menu' || state === 'login' ? 0.24 : state === 'garage' ? -0.2 : 0;
    viewShift += (tgt - viewShift) * (1 - Math.exp(-dt * 6));
    if (Math.abs(viewShift) < 0.001 && tgt === 0) { if (shiftOn) { camera.clearViewOffset(); shiftOn = false; } }
    else { const vw = window.innerWidth, vh = window.innerHeight; camera.setViewOffset(vw, vh, -viewShift * vw, 0, vw, vh); shiftOn = true; }
    camera.up.set(0, 1, 0);
    camera.position.set(carW.x + Math.sin(a) * r + 2, carW.y + 2.2 + Math.sin(a * 0.7) * 0.5, carW.z + Math.cos(a) * r);
    camera.lookAt(carW.x + 0.4, carW.y + 0.5, carW.z); return;
  }
  if (shiftOn) { camera.clearViewOffset(); shiftOn = false; viewShift = 0; }
  if (LEVELS[level].dogfight) { dfCamera(dt); return; }
  if (LEVELS[level].onfoot) { footCamera(dt); return; }
  if (LEVELS[level].space) { spaceCamera(dt); return; }
  if (track.path) { chaseCamera(dt); return; }
  camera.up.set(0, 1, 0);
  const k = 1 - Math.exp(-dt * 5);
  camPos.x += (car.x - 11 - car.vx * 0.12 - camPos.x) * k; camPos.fy += (car.y - camPos.fy) * (1 - Math.exp(-dt * 3));
  const fov = 62 + Math.min(14, car.speed() * 0.38) + (1 - zoomF) * 8 + boostAmt * 9 * (settings.shake ? 1 : 0);
  if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * 0.1; camera.updateProjectionMatrix(); }
  const mf = settings.shake ? 1 : 0, sx = shake > 0 ? (Math.random() - 0.5) * shake * mf : 0, sy = shake > 0 ? (Math.random() - 0.5) * shake * mf : 0; shake = Math.max(0, shake - dt * 1.6);
  const zTarget = (state === 'playing' && (input.gas || input.nitro)) ? 0.7 - 0.08 * boostAmt : 1;
  zoomF += (zTarget - zoomF) * (1 - Math.exp(-dt * 4.5));
  const lx = car.x + 6 + Math.max(0, Math.min(10, car.vx * 0.32)), ly = camPos.fy + 0.7;
  const bx = camPos.x + sx, by = camPos.fy + 3.9 + sy - kick * mf, bz = 7.4;
  // pull the camera toward the look-at point: 0.7 = 30% closer to the action
  camera.position.set(lx + (bx - lx) * zoomF, ly + (by - ly) * zoomF, bz * zoomF);
  camera.lookAt(lx, ly, 0);
}

// chase camera for curved levels (level 5). Smoothed so the view never whips around the spiral:
//  - the camera sits ~13 m behind the car on the road and leans toward the OUTSIDE of the bend, so the car stays in frame and you can see the road curl away
//  - the camera position and the look-at point are low-pass filtered separately (look-at is the slower one), which turns the constant spiral yaw into a gentle, lagging pan
//  - roll follows the bank only a little (max 4 deg) and the gas push-in is much milder than on straight levels
const _cpT = new THREE.Vector3(), _clT = new THREE.Vector3(), _cpS = new THREE.Vector3(), _clS = new THREE.Vector3(), _pf2 = {}, _pf3 = {};
const CAM_BACK = 13, CAM_LOOK = 16, CAM_ROLL_MAX = 4 * Math.PI / 180;
function chaseCamera(dt) {
  const mf = settings.shake ? 1 : 0;
  camPos.x += (car.x - CAM_BACK - car.vx * 0.06 - camPos.x) * (1 - Math.exp(-dt * 7)); camPos.fy += (car.y - camPos.fy) * (1 - Math.exp(-dt * 3));
  vista += ((state === 'countdown' ? 1 : 0) - vista) * (1 - Math.exp(-dt * (state === 'countdown' ? 3 : 1.8)));      // short high look-out over the course while the countdown runs
  const fov = 64 + Math.min(10, car.speed() * 0.28) + boostAmt * 6 * mf;
  if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * 0.06; camera.updateProjectionMatrix(); }
  const sx = shake > 0 ? (Math.random() - 0.5) * shake * mf : 0, sy = shake > 0 ? (Math.random() - 0.5) * shake * mf : 0; shake = Math.max(0, shake - dt * 1.6);
  const zTarget = (state === 'playing' && (input.gas || input.nitro)) ? 0.9 : 1;                                      // mild push-in only
  zoomF += (zTarget - zoomF) * (1 - Math.exp(-dt * 2.5));
  // lean to the outside of the bend (heading psi grows to the left, +lat is the right-hand side)
  const f = track.path.at(car.x, _pf2), f2 = track.path.at(car.x + 8, _pf3), curv = (f2.psi - f.psi) / 8;
  camLat += (Math.max(-2.6, Math.min(2.6, curv * 70)) - camLat) * (1 - Math.exp(-dt * 2.2));
  // very tight bends (hairpins, level 7): rise and pull back a little so more of the switchback is visible and the horizon sweeps less (gentle bends like level 5's spiral are barely affected)
  camTight += (Math.max(0, Math.min(1, (Math.abs(curv) - 0.03) / 0.03)) - camTight) * (1 - Math.exp(-dt * 2));
  const sP = camPos.x - 5 * vista - 3 * camTight, lookS = car.x + CAM_LOOK + 30 * vista;
  const by = camPos.fy + 4.2 + 5 * vista + 3.2 * camTight - kick * mf, ly = camPos.fy + 0.9 - 7 * vista;
  const lh = refH(lookS);
  toWorld(lookS, Math.max(ly, lh + 0.5 - 7 * vista), -camLat * 0.35, _clT, lh);
  toWorld(sP, by, camLat, _cpT, refH(sP));
  if (!chaseReady) { _cpS.copy(_cpT); _clS.copy(_clT); chaseReady = true; }
  else { _cpS.lerp(_cpT, 1 - Math.exp(-dt * 8)); _clS.lerp(_clT, 1 - Math.exp(-dt * 5)); }
  const zp = 1 - (1 - zoomF) * 0.6;
  camera.position.set(carW.x + (_cpS.x - carW.x) * zp + sx, carW.y + (_cpS.y - carW.y) * zp + sy, carW.z + (_cpS.z - carW.z) * zp + sx * 0.5);
  // roll: follow the bank a little, slowly, so the horizon stays readable
  const want = Math.max(-CAM_ROLL_MAX, Math.min(CAM_ROLL_MAX, f.bank * 0.2)) * mf;
  camRoll += (want - camRoll) * (1 - Math.exp(-dt * 2.5));
  const sr = Math.sin(f.psi), cr = Math.cos(f.psi);
  camera.up.set(-Math.sin(camRoll) * sr, Math.cos(camRoll), -Math.sin(camRoll) * cr);
  camera.lookAt(_clS);
}
