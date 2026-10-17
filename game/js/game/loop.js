/* eslint-disable */
'use strict';
/* Main loop and per-tick update */
/* ================= main loop ================= */
let last = 0, acc = 0, hudSlow = 0, tremorN = 0;
function handleEvents() {
  for (const e of car.events) {
    if (e.type === 'land') {
      const hard = e.quality === 'HARD LANDING';
      let pts = e.quality === 'PERFECT LANDING' ? 100 : e.quality === 'GOOD LANDING' ? 50 : 10, sub = 'Air time ' + e.air.toFixed(1) + 's', head = e.quality;
      if (e.flips > 0 && !hard) setCombo(Math.min(4, combo + 1)); else setCombo(0);
      const mult = Math.max(1, combo);
      // mega-jump bonus (levels with megaJump): 2 flips pay x1.5, 3 or more pay x2 on top of the normal flip points
      const mj = LEVELS[level].megaJump, mega = mj && e.x >= mj[0] && e.x <= mj[1] && e.flips >= 2 && !hard ? (e.flips >= 3 ? 2 : 1.5) : 1;
      if (e.flips > 0) { const fp = Math.round(e.flips * 500 * mult * mega); pts += fp; run.flipPts += fp; head = e.dir + (e.flips > 1 ? ' x' + e.flips : ''); sub = e.quality + '   +' + fp + (mult > 1 ? '   COMBO \u00D7' + mult : '') + (mega > 1 ? '   MEGA \u00D7' + mega : ''); }
      score += pts; Snd.land(e.quality); landFx(e);
      fuel = Math.min(1, fuel + (e.quality === 'PERFECT LANDING' ? 0.3 : e.quality === 'GOOD LANDING' ? 0.15 : 0) + e.flips * 0.25);
      if (hard) shake = Math.max(shake, 0.25);
      addCoins(pts - e.flips * 500 * mult * mega > 0 ? (pts - e.flips * 500 * mult * mega) / 10 : 0, 'style');
      if (e.flips > 0 && !hard) addCoins(e.flips * 20 * mult * mega, 'flips');
      toast(head, sub, hard ? 'warn' : 'good');
    } else if (e.type === 'boost') {
      fuel = Math.min(1, fuel + 0.12); coldBonus('pad'); if (state === 'playing') { Snd.whoosh(); vibe(12); }
      for (let i = 0; i < 12; i++) flame.emit(car.x - 1.6, car.y + 0.2, (Math.random() - 0.5) * 2, -car.vx * 0.3 - 3 * Math.random(), 0.6 + Math.random(), (Math.random() - 0.5) * 2, 0.45, 0.8, 0.2, 0.9, [0.4, 1, 0.8]);
    } else if (e.type === 'crash' && state === 'playing') { onCrash(e.reason); }
  }
  car.events.length = 0;
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
  tick(dt); if (typeof alienUpdate === 'function') alienUpdate(dt); renderer.render(scene, camera);
}
function tick(dt) {
  readInput();
  if (LEVELS[level].dogfight) { dfTick(dt); return; }
  if (LEVELS[level].onfoot) { footTick(dt); return; }
  if (LEVELS[level].space) { spaceTick(dt); return; }
  if (state === 'countdown' || state === 'playing' || state === 'finishing' || state === 'crashed') { hzT += dt; if (typeof updateLava === 'function') updateLava(dt); }
  updateHazards(); updateStorm(dt); updateCold(dt); updateChasm(dt);
  if (state === 'countdown') {
    countdownT -= dt; const n = Math.min(duelOn ? 3 : 99, Math.ceil(countdownT - 0.2));
    if (n !== lastCount) { lastCount = n; const el = UI.countdown; el.textContent = n > 0 ? String(n) : 'GO!'; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); if (n > 0) Snd.beep(); else Snd.go(); }
    if (n <= 0) { setState('playing'); UI.countdown.classList.remove('hidden'); setTimeout(() => UI.countdown.classList.add('hidden'), 700); }
  }
  if (state === 'playing' || state === 'finishing') {
    acc += dt; let n = 0;
    const inp = state === 'finishing' ? { gas: false, brake: true, tiltUp: false, tiltDown: false } : input;
    while (acc >= DT && n < 24) { car.step(DT, inp); acc -= DT; n++; if (car.crashed) { acc = 0; break; } }
    if (n >= 24) acc = 0;
    if (state === 'playing') timeT += dt; else { finishT += dt; if (finishT > 2.4) showResults(); }
    if (state === 'playing' && !car.crashed) { checkHazards(); announceHazards(); }
    if (state === 'playing' && hoopObjs.length) checkHoops();
    if (state === 'playing' && crateObjs.length && !duelOn) checkCrates();
    handleEvents();
    if (state === 'playing') {
      for (let i = 0; i < gates.length; i++) {
        const g = gates[i];
        if (!g.passed && car.x > g.x) {
          g.passed = true;
          if (i === gates.length - 1) { if (duelOn && cpIndex < gates.length - 1) { g.passed = false; } else if (duelOn && duelLaps() > 1) nextLap(); else onFinish(); } else { g.mat.color.setHex(0x35e6ff); gateCleared(g); cpIndex = i + 1; vibe(25); toast('CHECKPOINT CLEARED', (i + 1) + ' / ' + (gates.length - 1) + '  \u00B7  respawn saved', 'good'); Snd.cp(); coldBonus('cp'); }
        }
      }
    }
    if (car.grounded && state !== 'results') {
      if (Math.abs(car.vx) > 6 && Math.random() < dt * 40 * (input.gas ? 1 : 0.4)) { const p = car.local(-2.0, -0.2); dust.emit(p[0], p[1], (Math.random() - 0.5) * 2, -car.vx * 0.2 - 1, 0.6 + Math.random(), (Math.random() - 0.5) * 2, 0.7); }
    }
  } else if (state === 'crashed') {
    crashT += dt; if (duelOn) timeT += dt; if (crashT > 3.2) retry();
  }
  Snd.engine(car.speed(), input.gas, state === 'playing' || state === 'finishing' || state === 'countdown');
  dust.update(dt); sparks.update(dt); fxUpdate(dt);
  // visuals
  if (track.path) { toWorld(car.x, car.y, 0, carRoot.position); frameQuat(car.x, carQ); carRoot.quaternion.copy(carQ).multiply(_qz.setFromAxisAngle(_AZ, car.th)); }
  else { carRoot.position.set(car.x, car.y, 0); carRoot.rotation.set(0, 0, car.th); }
  if (carMesh.hover2.visible) carMesh.hover2.position.y = Math.sin(performance.now() * 0.005) * 0.06;
  if (carMesh.hover.visible) carMesh.hover.position.y = -WCY * S + HOVER_Y + Math.sin(performance.now() * 0.006) * 0.05;
  carW.copy(carRoot.position); carRoot.visible = true;
  popT = Math.max(0, popT - dt * 3.4); { const pp = 1 + 0.12 * Math.sin(popT * Math.PI); carRoot.scale.set(pp * (1 + 0.1 * squash), pp * (1 - 0.16 * squash), pp); }
  cosUpdate(dt); if (crateObjs.length) updateCrates(performance.now() / 1000);
  fxA += ((state === 'garage' ? 1 : 0) - fxA) * (1 - Math.exp(-dt * 7));
  if (fxA > 0.02) {
    const gg = ground(car.x);
    if (gg !== null) { garageFx.position.set(car.x, gg, 0); garageFx.rotation.z = Math.atan(Phys.slopeAt(ground, car.x)); }
    spinner.rotation.y -= dt * 0.7;
    for (const m of fxMats) m.opacity = m.userData.base * fxA;
    garageFx.visible = true;
  } else garageFx.visible = false;
  const gh = ground(car.x);
  if (gh === null) shadowHolder.visible = false; else {
    shadowHolder.visible = true;
    if (track.path) { toWorld(car.x, gh + 0.06, 0, shadowHolder.position, gh); frameQuat(car.x, carQ); shadowHolder.quaternion.copy(carQ).multiply(_qz.setFromAxisAngle(_AZ, Math.atan(Phys.slopeAt(ground, car.x)))); }
    else { shadowHolder.position.set(car.x, gh + 0.06, 0); shadowHolder.rotation.set(0, 0, Math.atan(Phys.slopeAt(ground, car.x))); }
    const hgt = Math.max(0, car.y - gh); shadow.scale.setScalar(Math.max(0.5, 1 - hgt * 0.04)); shadow.material.opacity = Math.max(0.1, 0.42 - hgt * 0.03);
  }
  startLine.group.visible = true;
  updateCamera(dt);
  if (state === 'cutscene') updateCutscene(dt);
  else if (LEVELS[level].collapse) { updateCollapse(dt); if (state === 'playing') { shake = Math.max(shake, 0.14); const b = Math.floor(timeT / 7); if (b !== tremorN) { tremorN = b; if (b > 0) { shake = 0.65; Snd.land('HARD LANDING'); } } } }
  if (starPts) starPts.position.set(camera.position.x, camera.position.y * 0.5 - levelGroup.position.y, 0);
  envUpdate(); updateRaceObjs(dt); if (padObjs.length) updatePads();
  hudSlow -= dt; if (hudSlow <= 0) {
    hudSlow = 0.05; $('timer').textContent = fmt(timeT); $('speed').textContent = Math.round(car.speed() * 3.6); $('spdbar').style.setProperty('--spd', Math.min(1, car.speed() * 3.6 / 160).toFixed(3));
    if (duelOn) { const lh = $('lapHud'); lh.classList.toggle('hidden', duelLaps() < 2); lh.textContent = 'Lap ' + lap; } { const nc = gates.length - 1; $('cp').textContent = cpIndex >= nc ? 'Next: Finish' : 'Next checkpoint ' + (cpIndex + 1) + ' / ' + nc; const bl = duelOn ? null : bests[level]; $('bestHud').textContent = 'Best lap ' + (bl === undefined || bl === null ? '--:--.-' : fmt(bl)); } $('score').textContent = score; $('flipPts').textContent = run.flipPts;
    const pr = duelProgress(car.x, lap); $('progress').style.width = (pr * 100).toFixed(1) + '%';
  }
  if (duelOn) duelTick(dt);
}
