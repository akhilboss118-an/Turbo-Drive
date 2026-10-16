/* eslint-disable */
'use strict';
/* Zero-g flight model, checkpoint rings, asteroid collisions, chase camera and HUD for the deep-space levels */
const SF = { s: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, fs: 0, steer: 0, roll: 0, rollV: 0, yaw: 0, yawV: 0, pitch: 0, pitchV: 0, cpS: 0, inv: 0, camX: 0, camY: 0, camRoll: 0, camSnap: true, hud: 0, ringsHit: 0, off: 0, closeN: 0 };
const _sfC = { x: 0, y: 0 }, _sfV = new THREE.Vector3();
const smooth01 = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const isSpace = () => !!(LEVELS[level] && LEVELS[level].space);
function spaceStart() {
  const c = SP.course; if (!c) return;
  spResetCourse(); spCenter(c, 0, _sfC);
  Object.assign(SF, { s: 0, x: _sfC.x, y: _sfC.y, z: 0, vx: 0, vy: 0, fs: 0, steer: 0, roll: 0, rollV: 0, yaw: 0, yawV: 0, pitch: 0, pitchV: 0, cpS: 0, inv: 0, camSnap: true, ringsHit: 0, off: 0, closeN: 0 });
  SF.camX = SF.x; SF.camY = SF.y; cpIndex = 0; carRoot.visible = true; shake = 0; boostAmt = 0; wasBoost = false;
  spPlace(0); carW.copy(carRoot.position);
}
function spaceRespawn() {
  const c = SP.course; spCenter(c, SF.cpS, _sfC);
  Object.assign(SF, { s: SF.cpS, x: _sfC.x, y: _sfC.y, vx: 0, vy: 0, fs: 60, steer: 0, roll: 0, rollV: 0, yaw: 0, yawV: 0, pitch: 0, pitchV: 0, inv: 2.2, camSnap: true });
  for (const r of SP.rings) if (r.state === 2 && r.s > SF.cpS) { r.state = 0; spRingColor(r, 0); }
  carRoot.visible = true; carW.copy(carRoot.position);
}
function spPlace(t) {
  SF.z = -SF.s;
  const idle = state !== 'playing' && state !== 'finishing', bob = idle ? Math.sin(SP.t * 1.8) * 0.18 : 0, ir = idle ? Math.sin(SP.t * 1.2) * 0.05 : 0;
  carRoot.position.set(SF.x, SF.y + bob, SF.z); carRoot.rotation.set(SF.roll + ir, SF.yaw + Math.PI / 2, SF.pitch, 'YXZ'); carRoot.scale.set(1, 1, 1);
  if (carMesh.hover.visible) carMesh.hover.position.y = -WCY * S + HOVER_Y + Math.sin(SP.t * 5) * 0.05;
  if (carMesh.hover2.visible) carMesh.hover2.position.y = Math.sin(SP.t * 5) * 0.06;
  carW.copy(carRoot.position);
}
function spCrash(reason) {
  setCombo(0); vibe(60, 'heavy'); crashes++; crashT = 0; shake = 1; Snd.crash(); carRoot.visible = false;
  const x = SF.x, y = SF.y, z = SF.z;
  for (let i = 0; i < 90; i++) { const a = Math.random() * 6.28, b = Math.random() * 3.14, sp = 8 + Math.random() * 26; sparks.emit(x, y, z, Math.cos(a) * Math.sin(b) * sp, Math.cos(b) * sp, Math.sin(a) * Math.sin(b) * sp - SF.fs * 0.3, 0.7 + Math.random() * 0.8); }
  for (let i = 0; i < 40; i++) { const a = Math.random() * 6.28, sp = 3 + Math.random() * 12; flame.emit(x, y, z, Math.cos(a) * sp, (Math.random() - 0.5) * sp, Math.sin(a) * sp - SF.fs * 0.2, 0.8 + Math.random() * 0.6, 2.5, 7, 0.8, Math.random() < 0.5 ? [1, 0.6, 0.2] : [1, 0.9, 0.5]); }
  for (let i = 0; i < 30; i++) smoke.emit(x, y, z, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12 - SF.fs * 0.2, 1.4, 1.5, 5, 0.5, [0.35, 0.33, 0.38]);
  SF.fs = 0; SF.vx = 0; SF.vy = 0;
  $('crashReason').textContent = reason.charAt(0).toUpperCase() + reason.slice(1); setState('crashed');
}
function spRingPass(r, ix, iy) {
  const d = Math.hypot(ix - r.x, iy - r.y);
  if (r.fin) { r.state = 1; r.t = 0; if (d < r.r) { score += 200; addCoins(25, 'style'); toast('PERFECT ORBIT', 'Orbit insertion +200', 'good'); } return; }
  if (d < r.r) {
    r.state = 1; r.t = 0; spRingColor(r, 1); SF.cpS = Math.max(0, r.s - 55); SF.ringsHit++; cpIndex = SF.ringsHit; score += 100; addCoins(10, 'style');
    toast('CHECKPOINT CLEARED', SF.ringsHit + ' / ' + (SP.rings.length - 1) + '  \u00B7  respawn saved', 'good'); Snd.cp(); vibe(25);
    for (let i = 0; i < 34; i++) { const a = i / 34 * 6.283; sparks.emit(r.x + Math.cos(a) * r.r, r.y + Math.sin(a) * r.r, -r.s, Math.cos(a) * 6, Math.sin(a) * 6, -SF.fs * 0.2, 0.9); }
  } else {
    r.state = 2; r.t = 0; spRingColor(r, 2); timeT += 3; toast('RING MISSED', '+3 s penalty', 'warn'); Snd.click(); vibe(30);
  }
}
function spStep(dt) {
  const c = SP.course, P = car.p, sm = 1 + (P.vmax - 1) * 0.9, wantN = input.nitro;
  const prevS = SF.s, prevX = SF.x, prevY = SF.y;
  let target = (input.brake ? 38 : input.gas ? 100 : 72) * sm; if (wantN) target = 155 * sm * (0.96 + 0.04 * P.nitroPow);
  const k = wantN ? 2.6 : input.brake ? 2.8 : target > SF.fs ? 0.9 * P.engine : 0.7, fs0 = SF.fs;
  SF.fs += (target - SF.fs) * (1 - Math.exp(-dt * k));
  const acc = (SF.fs - fs0) / dt;
  SF.steer += (input.steer - SF.steer) * (1 - Math.exp(-dt * (input.steer ? 8 : 10)));
  const lat = 85 * (0.85 + 0.3 * Math.min(1.6, SF.fs / 72));
  SF.vx += (SF.steer * lat - SF.vx * 2.5) * dt; SF.x += SF.vx * dt;
  spCenter(c, SF.s, _sfC); const dxc = SF.x - _sfC.x;
  SF.off = Math.abs(dxc) > 70 ? 1 : 0; if (Math.abs(dxc) > 80) SF.vx -= Math.sign(dxc) * (Math.abs(dxc) - 80) * 6 * dt;
  SF.vy += ((_sfC.y + Math.sin(SP.t * 0.9) * 0.5 - SF.y) * 7 - SF.vy * 3.6) * dt; SF.y += SF.vy * dt;
  SF.s += SF.fs * dt; SF.z = -SF.s;
  const rT = Math.max(-0.85, Math.min(0.85, SF.vx / 34 * 0.8 + SF.steer * 0.18)), yT = -SF.vx * 0.011, pT = Math.max(-0.3, Math.min(0.3, SF.vy * 0.025 + acc * 0.0016));
  SF.rollV += ((rT - SF.roll) * 28 - SF.rollV * 7) * dt; SF.roll += SF.rollV * dt;
  SF.yawV += ((yT - SF.yaw) * 16 - SF.yawV * 6) * dt; SF.yaw += SF.yawV * dt;
  SF.pitchV += ((pT - SF.pitch) * 20 - SF.pitchV * 6.5) * dt; SF.pitch += SF.pitchV * dt;
  if (SF.inv > 0) SF.inv -= dt;
  // rings
  for (const r of SP.rings) if (r.state === 0 && SF.s >= r.s && prevS < r.s) { const f = (r.s - prevS) / Math.max(1e-6, SF.s - prevS); spRingPass(r, prevX + (SF.x - prevX) * f, prevY + (SF.y - prevY) * f); }
  // orbs
  for (const o of SP.orbs) { if (o.got || Math.abs(o.z - SF.z) > 4) continue; if (Math.hypot(o.x - SF.x, o.y - SF.y, o.z - SF.z) < 3.6) { o.got = true; addCoins(4, 'style'); } }
  // asteroids
  const R = 1.45;
  for (const r of SP.rocks) {
    const dz = Math.abs(r.z - SF.z), lim = r.rr + R + 2.6; if (dz > lim) continue;
    const d = Math.hypot(r.x - SF.x, r.y - SF.y, r.z - SF.z);
    if (d < r.rr + R) { if (SF.inv <= 0) { spCrash('hit an asteroid'); return; } }
    else if (d < lim && !r.near) { r.near = true; score += 50; SF.closeN++; pop('CLOSE CALL +50', 'flip', 800); Snd.flip && Snd.flip(1); }
  }
  if (SF.s >= c.len) onFinish();
}
function spaceTick(dt) {
  startLine.group.visible = false; shadowHolder.visible = false; slg.clearRect(0, 0, slc.width, slc.height);
  const st = state, live = st === 'playing', mfx = settings.shake ? 1 : 0;
  if (st === 'countdown') {
    countdownT -= dt; const n = Math.min(99, Math.ceil(countdownT - 0.2));
    if (n !== lastCount) { lastCount = n; const el = UI.countdown; el.textContent = n > 0 ? String(n) : 'GO!'; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); if (n > 0) Snd.beep(); else Snd.go(); }
    if (n <= 0) { SF.fs = 45; setState('playing'); UI.countdown.classList.remove('hidden'); setTimeout(() => UI.countdown.classList.add('hidden'), 700); }
  }
  // nitro tank
  const wantN = live && input.nitro && fuel > 0.02, rg = car.p.fuelRegen || 0;
  if (wantN) fuel = Math.min(1, Math.max(0, fuel - 0.42 * dt / car.p.nitroCap + rg * dt)); else if (live) fuel = Math.min(1, fuel + (0.07 + rg) * dt);
  input.nitro = wantN;
  if (wantN && !wasBoost) { shake = Math.max(shake, 0.4); Snd.nitro(); vibe(25, 'nitro'); }
  wasBoost = wantN; boostAmt += ((wantN ? 1 : 0) - boostAmt) * (1 - Math.exp(-dt * 7)); if (boostAmt > 0.3) shake = Math.max(shake, 0.07 * boostAmt);
  const nb = $('nitro'); nb.style.setProperty('--f', fuel.toFixed(3)); nb.classList.toggle('empty', fuel < 0.05); vig.style.opacity = (mfx * boostAmt).toFixed(2);
  if (live) { timeT += dt; spStep(dt); }
  else if (st === 'finishing') {
    finishT += dt; SF.fs += (26 - SF.fs) * (1 - Math.exp(-dt * 1.4)); spCenter(SP.course, SF.s, _sfC);
    SF.vx += ((_sfC.x - SF.x) * 1.5 - SF.vx * 2.5) * dt; SF.x += SF.vx * dt; SF.vy += ((_sfC.y - SF.y) * 3 - SF.vy * 3) * dt; SF.y += SF.vy * dt; SF.s += SF.fs * dt;
    SF.roll += (0 - SF.roll) * (1 - Math.exp(-dt * 3)); SF.yaw += (0 - SF.yaw) * (1 - Math.exp(-dt * 3)); SF.pitch += (0 - SF.pitch) * (1 - Math.exp(-dt * 3));
    if (finishT > 3.6) showResults();
  } else if (st === 'crashed') { crashT += dt; if (crashT > 3.2) retry(); }
  if (st === 'garage') { fxA += (1 - fxA) * (1 - Math.exp(-dt * 7)); } else fxA += (0 - fxA) * (1 - Math.exp(-dt * 7));
  if (fxA > 0.02) { garageFx.position.set(SF.x, SF.y - 1.3, SF.z); spinner.rotation.y -= dt * 0.7; for (const m of fxMats) m.opacity = m.userData.base * fxA; garageFx.visible = true; } else garageFx.visible = false;
  if (st !== 'paused') spPlace(dt);
  if (SF.inv > 0 && st === 'playing') carRoot.visible = Math.floor(SF.inv * 12) % 2 === 0; else if (st !== 'crashed') carRoot.visible = true;
  // engine exhaust
  if ((live || st === 'finishing' || st === 'countdown') && carRoot.visible) {
    carRoot.updateMatrixWorld(true); const tail = TAIL[vehicleById(vehicleId).model] || -2.2, tr = cosView().trail, gold = vehicleById(vehicleId).goldTrail;
    const n = (live ? 2 : 1) + (wantN ? 4 : 0) + (input.gas ? 1 : 0);
    for (let i = 0; i < n; i++) {
      _sfV.set(tail, 0.05, (Math.random() - 0.5) * 0.8); carRoot.localToWorld(_sfV);
      const col = wantN ? (gold ? [1, 0.85, 0.3] : [0.5, 0.9, 1]) : tr ? colRGB(tr, SP.t, Math.random() * 0.2) : gold ? [1, 0.8, 0.3] : Math.random() < 0.5 ? [1, 0.62, 0.22] : [0.45, 0.8, 1];
      flame.emit(_sfV.x, _sfV.y, _sfV.z, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2, -SF.fs * 0.12 - 4, wantN ? 0.5 : 0.34, wantN ? 1.5 : 0.95, 0.12, 0.9, col);
    }
  }
  smoke.update(dt); flame.update(dt); dust.update(dt); sparks.update(dt); popT = Math.max(0, popT - dt * 3.4); squash *= Math.exp(-dt * 7); kick *= Math.exp(-dt * 8);
  updateCamera(dt);
  spaceVisuals(dt, SF.x, SF.y, SF.z, live || st === 'finishing' ? SF.fs : 0);
  SP.sky.position.copy(camera.position); if (st === 'cutscene') updateCutscene(dt);
  Snd.engine(Math.min(40, SF.fs * 0.5), input.gas || wantN, live || st === 'finishing' || st === 'countdown');
  SF.hud -= dt; if (SF.hud <= 0) {
    SF.hud = 0.05; const c = SP.course, nc = SP.rings.length - 1;
    $('timer').textContent = fmt(timeT); $('speed').textContent = Math.round(SF.fs * 4); $('spdbar').style.setProperty('--spd', Math.min(1, SF.fs / 160).toFixed(3));
    const nx = SP.rings.find((r) => r.state === 0 && r.s > SF.s - 6), dist = nx ? Math.max(0, Math.round(nx.s - SF.s)) : 0;
    $('cp').textContent = nx ? (nx.fin ? 'Next: Planet orbit \u00B7 ' + dist + ' m' : 'Next ring ' + (SP.rings.indexOf(nx) + 1) + ' / ' + nc + ' \u00B7 ' + dist + ' m') : 'Next: Finish';
    const bl = bests[level]; $('bestHud').textContent = 'Best ' + (bl === undefined || bl === null ? '--:--.-' : fmt(bl));
    $('score').textContent = score; $('flipPts').textContent = run.flipPts; $('progress').style.width = (Math.max(0, Math.min(1, SF.s / c.len)) * 100).toFixed(1) + '%';
    document.body.classList.toggle('offcourse', !!SF.off && live);
  }
}
function spaceCamera(dt) {
  const mf = settings.shake ? 1 : 0, st = state;
  const sx = shake > 0 ? (Math.random() - 0.5) * shake * mf : 0, sy = shake > 0 ? (Math.random() - 0.5) * shake * mf : 0; shake = Math.max(0, shake - dt * 1.6);
  let fov = 64 + Math.max(0, SF.fs - 72) * 0.1 + boostAmt * 7, px, py, pz, lx, ly, lz, roll = 0;
  if (st === 'countdown') {
    const e = smooth01(1 - countdownT / 3.2), a = (1 - e) * 2.4, rad = 12 + 6 * (1 - e);
    px = SF.x + Math.sin(a) * rad; py = SF.y + 3.4 + (1 - e) * 2.4; pz = SF.z + Math.cos(a) * rad; lx = SF.x; ly = SF.y + 0.6; lz = SF.z - 28 * e; SF.camX = SF.x; SF.camY = SF.y + 3.4; fov = 58 + 6 * e;
  } else if (st === 'finishing') {
    const e = smooth01(finishT / 3.4), a = e * 1.25, rad = 14 + e * 10;
    px = SF.x + Math.sin(a) * rad; py = SF.y + 3.4 - e * 0.8; pz = SF.z + Math.cos(a) * rad; lx = SF.x + Math.sin(a) * -4; ly = SF.y + 0.6; lz = SF.z - 6; fov = 66 - e * 8;
  } else if (st === 'cutscene') {
    const a = SP.t * 0.1 + 0.4, rad = 24; px = SF.x + Math.sin(a) * rad; py = SF.y + 5 + Math.sin(SP.t * 0.2) * 2; pz = SF.z + Math.cos(a) * rad; lx = SF.x; ly = SF.y; lz = SF.z - 40; fov = 55;
  } else {
    if (SF.camSnap) { SF.camX = SF.x; SF.camY = SF.y; SF.camSnap = false; }
    SF.camX += (SF.x - SF.camX) * (1 - Math.exp(-dt * 3.4)); SF.camY += (SF.y - SF.camY) * (1 - Math.exp(-dt * 4));
    px = SF.camX + sx; py = SF.camY + 3.3 - kick * mf + sy; pz = SF.z + 11.5 + boostAmt * 3.2 + Math.max(0, SF.fs - 72) * 0.025;
    lx = SF.camX * 0.35 + SF.x * 0.65; ly = SF.y + 0.9; lz = SF.z - 30; roll = SF.roll * 0.3 * mf;
  }
  if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * 0.08; camera.updateProjectionMatrix(); }
  SF.camRoll += (roll - SF.camRoll) * (1 - Math.exp(-dt * 6));
  camera.up.set(Math.sin(SF.camRoll), Math.cos(SF.camRoll), 0); camera.position.set(px, py, pz); camera.lookAt(lx, ly, lz);
}
