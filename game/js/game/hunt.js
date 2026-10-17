/* eslint-disable */
'use strict';
/* Level 27 - ALIEN HUNT (on foot): 12 minor aliens shoot lasers, hide behind rocks and kill them; then the giant alien lands ("YOU CANNOT ESCAPE ME"), the astronaut panics, runs to the hover and flees through 4 gates while the boss chases and fires lasers. Reuses the Level 26 on-foot engine (onfoot.js). */
const HUNT_LIVES = 3, DOME_R = 6.4, HUNT_FOG = 0x0e0814, HUNT_FOG_RED = 0x3c0a12, HUNT_HP = 3, HUNT_RED = 0xff1a1a, HUNT_N = 12, HUNT_GROUPS = [[-20, 10], [22, 14], [-14, 36], [18, 42]], HUNT_WP = [[-38, 22], [36, 62], [-34, 104], [0, 140]];
const HT = { fx: [], spawned: 0, waveT: 2, ufoT: 0, active: false, loading: false, ready: false, failed: false, waiters: [], src: null, k: 1, clips: null, aliens: [], bolts: [], boss: null, phase: 'hunt', pt: 0, kills: 0, hideAstro: false, unseenT: 0, alerted: false, cineWait: 0, W: null, rings: [], gate: 0, h: { x: 0, z: 0, hdg: 0, v: 0, roll: 0, y: 0 }, bossCd: 0, bossAim: 0, fireT: 0, lastLabel: '', streak: 0, bestStreak: 0, streakT: 0, alert: 0, beatT: 0, aimN: 0, lt: null, camP: new THREE.Vector3(), camL: new THREE.Vector3(), land: { x: 0, z: 0 }, spoke: false, subT: 0, lives: 3, inDome: false, domeMsg: false };
const _hB = new THREE.Vector3(), _hB2 = new THREE.Vector3(), _hV = new THREE.Vector3(), _hV2 = new THREE.Vector3(), _hM = new THREE.Matrix4(), _hUp = new THREE.Vector3(0, 1, 0);
const huntOn = () => !!(typeof level !== 'undefined' && LEVELS[level] && LEVELS[level].hunt);
const huntInDome = (x, z) => Math.hypot(x - BASE_AT.x, z - BASE_AT.z) < DOME_R - 0.5;
const huntName = () => { let n = ''; try { n = (window.AuthService && AuthService.user && AuthService.user.name) || ''; } catch (e) {} n = String(n).trim().slice(0, 18); return n || 'Astronaut'; };
const huntEase = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
const huntSubEl = document.createElement('div'); huntSubEl.id = 'huntSub'; huntSubEl.setAttribute('data-testid', 'hunt-subtitle'); huntSubEl.innerHTML = '<b></b><small></small>'; $('ui').appendChild(huntSubEl);
const huntVig = document.createElement('div'); huntVig.id = 'huntVig'; huntVig.setAttribute('data-testid', 'hunt-low-health-vignette'); $('ui').appendChild(huntVig);
const huntAlertEl = document.createElement('div'); huntAlertEl.id = 'huntAlert'; huntAlertEl.setAttribute('data-testid', 'hunt-red-alert'); $('ui').appendChild(huntAlertEl);
const huntStreakEl = document.createElement('div'); huntStreakEl.id = 'huntStreak'; huntStreakEl.setAttribute('data-testid', 'hunt-streak-hud'); huntStreakEl.innerHTML = '<div class="hsScore">SCORE <b data-testid="hunt-score">0</b></div><div class="hsStreak"><span>KILL STREAK</span><b data-testid="hunt-streak">x0</b><i></i></div><div class="hsBest">BEST <b>x0</b></div>'; $('ui').appendChild(huntStreakEl);
const huntFlashEl = document.createElement('div'); huntFlashEl.id = 'huntFlash'; huntFlashEl.setAttribute('data-testid', 'hunt-launch-flash'); $('ui').appendChild(huntFlashEl);
function huntSub(main, sub, ms) { huntSubEl.querySelector('b').textContent = main; huntSubEl.querySelector('small').textContent = sub || ''; huntSubEl.classList.add('on'); HT.subT = ms || 2500; }
function huntSubHide() { huntSubEl.classList.remove('on'); HT.subT = 0; }
function huntSay(t) { try { if (!window.speechSynthesis) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.pitch = 0; u.rate = 0.55; u.volume = 1; speechSynthesis.speak(u); } catch (e) {} }

/* ---------- models ---------- */
function huntLoad(cb) {
  if (HT.ready) { cb(); return; } HT.waiters.push(cb); if (HT.loading) return; HT.loading = true;
  const flush = () => { HT.ready = true; HT.loading = false; for (const w of HT.waiters.splice(0)) w(); };
  if (!THREE.FBXLoader) { HT.failed = true; flush(); return; }
  const L = new THREE.FBXLoader(), res = {}, files = { alien: 'alien', walk: 'alien_walk', death: 'alien_death' }; let n = 0, bad = false;
  for (const k in files) L.load('game/assets/char/' + files[k] + '.fbx', (o) => { res[k] = o; if (++n === 3 && !bad) { try { huntPrep(res); } catch (e) { console.error(e); HT.failed = true; } flush(); } }, undefined, () => { if (!bad) { bad = true; HT.failed = true; flush(); } });
}
function huntHips(o) { let h = null; o.traverse((x) => { if (!h && /Hips$/.test(x.name)) h = x; }); return h; }
function huntInPlace(clip, hk, trim) {
  const c = trim ? astroTrim(clip.clone()) : clip.clone();
  for (const t of c.tracks) if (/Hips\.position$/.test(t.name)) { const v = t.values; for (let i = 0; i < v.length; i += 3) { v[i] = 0; v[i + 2] = 0; v[i + 1] *= hk; } }
  return c;
}
function huntPrep(res) {
  const src = res.alien; src.updateMatrixWorld(true); const hips = huntHips(src); if (!hips) throw new Error('no hips');
  const hy = new THREE.Vector3().setFromMatrixPosition(hips.matrixWorld).y || 100; HT.k = 1.0 / hy;
  src.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; for (const m of (Array.isArray(o.material) ? o.material : [o.material])) if (m) { m.fog = true; if (m.emissive) m.emissive.setHex(0x0a1a12); if (m.shininess !== undefined) m.shininess = 18; } } });
  const wh = huntHips(res.walk), wy = wh ? wh.position.y : hy, hk = hips.position.y && wy ? hips.position.y / wy : 1;
  HT.clips = { walk: huntInPlace(res.walk.animations[0], hk, true), death: huntInPlace(res.death.animations[0], hk, false) }; HT.src = src;
}
function huntWalkClip() {
  if (HT.wc || !(typeof ASTRO !== 'undefined' && ASTRO.acts && ASTRO.acts.walk && HT.src)) return;
  const names = new Set(); HT.src.traverse((o) => names.add(o.name)); const hips = huntHips(HT.src), c = ASTRO.acts.walk.getClip().clone(), tr = [];
  const hy0 = (c.tracks.find((t) => /Hips\.position$/.test(t.name)) || { values: [1, 1, 1] }).values[1] || 1;
  for (const t of c.tracks) {
    const nm = t.name.replace(/^mixamorig/, 'mixamorig1'), node = nm.split('.')[0]; if (!names.has(node)) continue;
    if (/\.scale$/.test(nm) || (/\.position$/.test(nm) && !/Hips\.position$/.test(nm))) continue;
    const k = t.clone(); k.name = nm; if (/Hips\.position$/.test(nm)) { const v = k.values; for (let i = 0; i < v.length; i += 3) { v[i] = 0; v[i + 2] = 0; v[i + 1] *= hips.position.y / hy0; } } tr.push(k);
  }
  if (tr.length > 10) { HT.wc = new THREE.AnimationClip('alienWalk', c.duration, tr); HT.clips.walk = HT.wc; }
}
function huntClone(src) {
  const c = src.clone(), a = [], b = []; src.traverse((o) => a.push(o)); c.traverse((o) => b.push(o));
  for (let i = 0; i < a.length; i++) if (a[i].isSkinnedMesh) { const sk = a[i].skeleton, bones = sk.bones.map((x) => b[a.indexOf(x)]); b[i].skeleton = new THREE.Skeleton(bones, sk.boneInverses); b[i].bind(b[i].skeleton, a[i].bindMatrix); }
  return c;
}
function huntFallback() {
  const g = new THREE.Group(), m = new THREE.MeshLambertMaterial({ color: 0x5aff9a, emissive: 0x104020 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.6, 8), m); body.position.y = 1.0; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), m); head.scale.set(1, 1.3, 1); head.position.y = 2.0; g.add(head); return g;
}
function huntMake(size, boss) {
  const g = new THREE.Group(); let m, mixer = null, walk = null, death = null;
  if (HT.failed || !HT.src) { m = huntFallback(); m.scale.setScalar(size); }
  else {
    huntWalkClip(); m = huntClone(HT.src); m.scale.multiplyScalar(HT.k * size);
    if (boss) m.traverse((o) => { if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map((x) => x.clone()) : o.material.clone(); });
    if (boss) m.traverse((o) => { if (o.isMesh) for (const x of (Array.isArray(o.material) ? o.material : [o.material])) { if (x.emissive) x.emissive.setHex(0x3a0610); if (x.color) x.color.multiplyScalar(0.8); } });
    mixer = new THREE.AnimationMixer(m); walk = mixer.clipAction(HT.clips.walk); walk.setLoop(THREE.LoopRepeat); death = mixer.clipAction(HT.clips.death); death.setLoop(THREE.LoopOnce); death.clampWhenFinished = true; walk.play(); walk.time = Math.random() * 1.0;
  }
  g.add(m);
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const line = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: HUNT_RED, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); line.frustumCulled = false; line.visible = false; FT.world.add(line);
  FT.world.add(g);
  return { g, m, mixer, walk, death, line, boss: !!boss, size, anim: 'walk', st: 'patrol', hp: boss ? 999 : HUNT_HP, maxhp: boss ? 999 : HUNT_HP, r: 0.75, cy: 1.1, hitT: 0, dead: 0, huntKill: true, type: 'alien', home: { x: 0, z: 0 }, tgt: { x: 0, z: 0 }, tT: 0, aimT: 0, cd: 1, burst: 0, burstT: 0, grp: 0, strafe: Math.random() < 0.5 ? -1 : 1, strT: 1, flank: (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.5), face: 0, moving: false };
}
function huntAnim(a, name, speed) {
  if (!a.mixer) return;
  if (name === 'aim') { if (a.anim !== 'death') { a.walk.setEffectiveTimeScale(0.3); a.anim = 'aim'; } }
  else if (name === 'walk') { if (a.anim !== 'death') { a.walk.setEffectiveTimeScale(speed || 1); a.anim = 'walk'; } }
  else if (name === 'death' && a.anim !== 'death') { a.anim = 'death'; a.fallT = 0; a.fallDir = Math.random() < 0.5 ? -1 : 1; a.walk.setEffectiveTimeScale(0.35); }
}

/* ---------- scene ---------- */
function huntBuild(W) {
  HT.active = true; HT.W = W; HT.lt = { hc: hemi.color.getHex(), hi: hemi.intensity, sc: sun.color.getHex(), si: sun.intensity }; if (scene.fog) { scene.fog.color.setHex(HUNT_FOG); scene.fog.near = 35; scene.fog.far = 230; } document.body.classList.add('hunt'); $('ftSignal').querySelector('span').textContent = 'ALIENS KILLED'; $('ftSafe').textContent = 'DOME SHIELD \u00B7 ALIENS CAN\'T HIT YOU';
  for (const n of FT.nodes) { n.got = true; n.g.visible = false; } FT.ring.visible = false; FT.beam.visible = false;
  for (const c of FT.cols) if (c.r >= 1.7 && c.cover === undefined && c.piece === undefined) { c.cover = true; c.h = c.r * 2; }
  const pm = new THREE.MeshLambertMaterial({ color: 0xa4aecc, flatShading: true, emissive: 0x1c2040 }), placed = [];
  const okp = (x, z) => Math.hypot(x - HOVER_AT.x, z - HOVER_AT.z) > 13 && Math.hypot(x - 6, z + 4) > 6 && HUNT_WP.every((w) => Math.hypot(x - w[0], z - w[1]) > 11) && placed.every((q) => Math.hypot(x - q[0], z - q[1]) > 7) && FT.cols.every((c) => Math.hypot(x - c.x, z - c.z) > c.r + 3.2);
  const addPillar = (x, z) => { const h = 4.2 + ftRnd() * 2.6, rb = 1.5 + ftRnd() * 0.5, m = new THREE.Mesh(new THREE.CylinderGeometry(rb * 0.62, rb, h, 6), pm); m.position.set(x, footGround(x, z) + h / 2 - 0.2, z); m.rotation.y = ftRnd() * 3; m.rotation.z = (ftRnd() - 0.5) * 0.12; W.add(m); FT.cols.push({ x, z, r: rb * 0.95, cover: true, h }); placed.push([x, z]); };
  HUNT_GROUPS.forEach((gc) => { for (let i = 0, t = 0; i < 3 && t < 60; t++) { const a = ftRnd() * 6.283, r = 6 + ftRnd() * 9, x = gc[0] + Math.cos(a) * r, z = gc[1] + Math.sin(a) * r; if (x < FB.x0 + 4 || x > FB.x1 - 4 || z < FB.z0 + 4 || z > FB.z1 - 4 || !okp(x, z)) continue; addPillar(x, z); i++; } });
  for (let i = 0, t = 0; i < 12 && t < 300; t++) { const x = FB.x0 + 6 + ftRnd() * (FB.x1 - FB.x0 - 12), z = FB.z0 + 14 + ftRnd() * (FB.z1 - FB.z0 - 20); if (!okp(x, z)) continue; addPillar(x, z); i++; }
  const im = new THREE.MeshPhongMaterial({ color: 0xd6f6ff, emissive: 0x3aa6d0, specular: 0xffffff, shininess: 90, transparent: true, opacity: 0.88, flatShading: true });
  const addIceWall = (x, z) => { const th = ftRnd() * 3.14, h = 3.0 + ftRnd() * 1.0, m = new THREE.Mesh(new THREE.BoxGeometry(5.4, h, 1.3), im); m.position.set(x, footGround(x, z) + h / 2 - 0.1, z); m.rotation.y = th; W.add(m); for (const o of [-1.9, 0, 1.9]) FT.cols.push({ x: x + Math.cos(th) * o, z: z - Math.sin(th) * o, r: 1.15, cover: true, h }); placed.push([x, z]); };
  const addIceCrystal = (x, z) => { const g = new THREE.Group(); for (let k = 0; k < 4; k++) { const h = 2.6 + ftRnd() * 2.8, c = new THREE.Mesh(new THREE.ConeGeometry(0.55 + ftRnd() * 0.5, h, 5), im); c.position.set((ftRnd() - 0.5) * 1.6, h / 2 - 0.1, (ftRnd() - 0.5) * 1.6); c.rotation.z = (ftRnd() - 0.5) * 0.25; g.add(c); } g.position.set(x, footGround(x, z), z); W.add(g); FT.cols.push({ x, z, r: 1.5, cover: true, h: 4.2 }); placed.push([x, z]); };
  for (let i = 0, t = 0; i < 16 && t < 500; t++) { const x = FB.x0 + 6 + ftRnd() * (FB.x1 - FB.x0 - 12), z = FB.z0 + 10 + ftRnd() * (FB.z1 - FB.z0 - 16); if (!okp(x, z)) continue; if (i % 3 === 2) addIceCrystal(x, z); else addIceWall(x, z); i++; }
  HT.rings = HUNT_WP.map((w, i) => {
    const last = i === HUNT_WP.length - 1, p = i ? HUNT_WP[i - 1] : [HOVER_AT.x, HOVER_AT.z], R = last ? 9 : 6.5, g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R, last ? 0.7 : 0.45, 10, 44), new THREE.MeshBasicMaterial({ color: last ? 0xff3df0 : 0x35e6ff, transparent: true, opacity: 0.5, fog: false, depthWrite: false })); g.add(ring);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 70, 8, 1, true), new THREE.MeshBasicMaterial({ color: last ? 0xff3df0 : 0x7dff6a, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); beam.position.y = 30; g.add(beam);
    g.position.set(w[0], footGround(w[0], w[1]) + R * 0.8, w[1]); g.rotation.y = Math.atan2(w[0] - p[0], w[1] - p[1]); g.visible = false; W.add(g); return g;
  });
  const bg = new THREE.BoxGeometry(0.09, 0.09, 1.7);
  HT.bolts = []; for (let i = 0; i < 44; i++) { const m = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ color: HUNT_RED, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false })); m.visible = false; m.frustumCulled = false; W.add(m); HT.bolts.push({ m, v: new THREE.Vector3(), on: false, life: 0, boss: false, harm: true }); }
  huntLoad(() => {});
}
function huntLeave() {
  huntFlamesOff(); HT.active = false; HT.aliens = []; HT.bolts = []; HT.boss = null; HT.rings = []; HT.fx = []; HT.phase = 'hunt'; HT.hideAstro = false; HT.W = null; HT.cineWait = 0;
  document.body.classList.remove('hunt', 'huntNoAim'); const sp = $('ftSignal').querySelector('span'); if (sp) sp.textContent = 'ALIEN SIGNAL'; huntSubHide(); try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
  $('ftSafe').textContent = 'SAFE ZONE \u00B7 REFILLING'; HT.lives = HUNT_LIVES; HT.inDome = false;
  if (ASTRO.group) { ASTRO.group.scale.set(1, 1, 1); ASTRO.group.rotation.z = 0; }
  if (HT.lt) { hemi.color.setHex(HT.lt.hc); hemi.intensity = HT.lt.hi; sun.color.setHex(HT.lt.sc); sun.intensity = HT.lt.si; HT.lt = null; } HT.streak = 0; HT.alert = 0;
}
function huntShowBase() {
  FT.built3 = 3; FT.pieces.forEach((p, i) => { p.visible = true; p.scale.set(1, 1, 1); FT.pieceT[i] = 1; }); for (const c of FT.cols) if (c.piece !== undefined) c.off = false;
}
function huntRing(minR, maxR, i) {
  for (let t = 0; t < 30; t++) {
    const an = Math.random() * 6.283, r = minR + Math.random() * (maxR - minR), x = FT.p.x + Math.sin(an) * r, z = FT.p.z + Math.cos(an) * r;
    if (x < FB.x0 + 4 || x > FB.x1 - 4 || z < FB.z0 + 4 || z > FB.z1 - 4) continue; if (FT.cols.some((c) => Math.hypot(x - c.x, z - c.z) < c.r + 1.6)) continue; if (HT.aliens.some((o) => !o.dead && Math.hypot(x - o.g.position.x, z - o.g.position.z) < 4)) continue; return [x, z];
  }
  return [FT.p.x + (i % 2 ? 28 : -28), FT.p.z + 20 + i * 3];
}
function huntSpawnBatch() {
  const n = Math.min(4, HUNT_N - HT.spawned); if (n <= 0 || !FT.world) return; const wave = Math.floor(HT.spawned / 4) + 1;
  for (let i = 0; i < n; i++) {
    const a = huntMake(1.0, false), p = huntRing(24, 38, i); a.home.x = p[0]; a.home.z = p[1]; a.grp = 0; a.g.position.set(p[0], footGround(p[0], p[1]), p[1]); a.face = Math.atan2(FT.p.x - p[0], FT.p.z - p[1]); a.g.rotation.y = a.face;
    a.st = 'hunt'; a.cd = 1.2 + i * 0.6; a.spawnT = 0.8; a.g.scale.setScalar(0.05); HT.aliens.push(a); FT.enemies.push(a);
    const bm = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 46, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0x7dff6a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide })); bm.position.set(p[0], footGround(p[0], p[1]) + 23, p[1]); FT.world.add(bm); HT.fx.push({ m: bm, t: 0 });
    for (let k = 0; k < 12; k++) sparks.emit(p[0], footGround(p[0], p[1]) + 0.4, p[1], (Math.random() - 0.5) * 8, 1 + Math.random() * 5, (Math.random() - 0.5) * 8, 0.8);
  }
  HT.spawned += n; HT.alerted = true; HT.waveT = 26; HT.ufoT = 5; alienRoot.visible = AL.loaded; alienRoot.scale.setScalar(4.5); alienBeam.visible = false; alienBeamMat.opacity = 0;
  toast('ALIEN SCOUTS LANDING - WAVE ' + wave + '/3', 'They are coming for you! Take cover behind the rocks', 'warn'); huntSub('INCOMING!', 'Hide from the lasers - then shoot back', 2200); try { Snd.zap && Snd.zap(); Snd.tone(160, 0.5, 'sawtooth', 0.14, 0.4); } catch (e) {}
}
function huntWaves(dt) {
  for (let i = HT.fx.length - 1; i >= 0; i--) { const f = HT.fx[i]; f.t += dt; f.m.material.opacity = Math.max(0, 0.55 - f.t * 0.55); if (f.t > 1.0) { FT.world.remove(f.m); HT.fx.splice(i, 1); } }
  if (HT.ufoT > 0) { HT.ufoT -= dt; alienSpin.rotation.y += dt * 2; alienRoot.position.set(FT.p.x + 14 + Math.sin(HT.pt) * 6, FT.p.y + 58, FT.p.z + 26); if (HT.ufoT <= 0 && HT.phase === 'hunt') alienRoot.visible = false; }
  for (const a of HT.aliens) if (a.spawnT > 0) { a.spawnT -= dt; a.g.scale.setScalar(Math.max(0.05, 1 - a.spawnT / 0.8)); if (a.spawnT <= 0) a.g.scale.setScalar(1); }
  if (!HT.ready || HT.spawned >= HUNT_N || HT.cineWait > 0) return;
  const alive = HT.aliens.filter((a) => !a.dead).length; HT.waveT -= dt;
  if (HT.waveT <= 0 || (alive <= 1 && HT.waveT < 22)) huntSpawnBatch();
}
function huntReset() {
  huntFlamesOff();
  for (const a of HT.aliens) { FT.world.remove(a.g); FT.world.remove(a.line); } HT.aliens = []; FT.enemies.length = 0;
  if (HT.boss) { FT.world.remove(HT.boss.g); FT.world.remove(HT.boss.line); HT.boss = null; }
  for (const b of HT.bolts) { b.on = false; b.m.visible = false; }
  Object.assign(HT, { lives: HUNT_LIVES, inDome: false, domeMsg: false, streak: 0, streakT: 0, alert: 0, beatT: 0, aimN: 0, spawned: 0, waveT: 2.2, ufoT: 0, phase: 'hunt', pt: 0, kills: 0, hideAstro: false, unseenT: 0, alerted: false, cineWait: 0, gate: 0, spoke: false, lastLabel: '' }); FT.dieMsg = ''; FT.kills = 0;
  for (const n of FT.nodes) { n.got = true; n.g.visible = false; } for (const r of HT.rings) r.visible = false; document.body.classList.remove('huntNoAim'); huntSubHide();
  if (scene.fog) scene.fog.color.setHex(HUNT_FOG); alienRoot.visible = false; alienBeamMat.opacity = 0; alienBeam.visible = false; alienRoot.scale.setScalar(1);
  if (ASTRO.group) { ASTRO.group.scale.set(1, 1, 1); ASTRO.group.rotation.z = 0; } footPlaceHover(); HT.fx = []; huntShowBase();
  if (!SH.on) huntSub('THE ALIEN HAS RETURNED', 'His scouts are landing around the base', 3200);
}
function huntSpawnAll() {
  if (!FT.world || HT.aliens.length) return;
  HUNT_GROUPS.forEach((gc, gi) => { for (let k = 0; k < 3; k++) {
    const a = huntMake(1.0, false), an = k * 2.1 + gi, x = gc[0] + Math.cos(an) * 4.5, z = gc[1] + Math.sin(an) * 4.5;
    a.home.x = x; a.home.z = z; a.grp = gi; a.g.position.set(x, footGround(x, z), z); a.face = Math.random() * 6.28; a.g.rotation.y = a.face; a.tT = Math.random() * 3; a.tgt.x = x; a.tgt.z = z; HT.aliens.push(a); FT.enemies.push(a);
  } });
}
function huntRespawn() {
  for (const b of HT.bolts) { b.on = false; b.m.visible = false; } huntSubHide();
  if (HT.phase === 'drive') { FT.hp = 100; huntDriveInit(true); return; }
  footSpawnPlayer(); HT.unseenT = 0; huntShowBase(); let i = 0;
  for (const a of HT.aliens) { if (a.dead) continue; const p = huntRing(26, 40, i++); a.g.position.set(p[0], footGround(p[0], p[1]), p[1]); a.st = 'hunt'; a.hp = a.maxhp; a.cd = 1.5 + i * 0.4; a.aimT = 0; a.burst = 0; a.line.visible = false; }
  if (HT.spawned < HUNT_N) HT.waveT = Math.min(HT.waveT, 3);
}

/* ---------- helpers ---------- */
function huntLOS(ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-6;
  for (const c of FT.cols) { if (c.off || !c.cover) continue; let t = ((c.x - ax) * dx + (c.z - az) * dz) / l2; t = Math.max(0, Math.min(1, t)); const px = ax + dx * t - c.x, pz = az + dz * t - c.z; if (px * px + pz * pz < c.r * c.r) return false; }
  return true;
}
function huntBolt(from, to, boss, harm, spread) {
  const b = HT.bolts.find((q) => !q.on); if (!b) return; b.on = true; b.life = 3.2; b.boss = !!boss; b.harm = harm !== false; b.m.visible = true; b.m.position.copy(from);
  _hB.copy(to); if (spread) _hB.add(_hB2.set((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread * 0.5, (Math.random() - 0.5) * spread)); _hB.sub(from).normalize();
  b.v.copy(_hB).multiplyScalar(boss ? 46 : 38); b.m.lookAt(_hB2.copy(from).add(_hB)); b.m.scale.set(boss ? 2.6 : 1, boss ? 2.6 : 1, boss ? 1.6 : 1); b.m.material.color.setHex(HUNT_RED);
  try { Snd.tone(boss ? 520 : 1500, 0.16, 'sawtooth', boss ? 0.1 : 0.05, 0.25); } catch (e) {}
}
function huntImpact(p, big) { const n = big ? 18 : 7; for (let i = 0; i < n; i++) sparks.emit(p.x, p.y, p.z, (Math.random() - 0.5) * 9, 1 + Math.random() * 6, (Math.random() - 0.5) * 9, 0.5); }
function huntBolts(dt) {
  const driving = HT.phase === 'drive', hp = carRoot.position;
  for (const b of HT.bolts) {
    if (!b.on) continue; b.life -= dt; b.m.position.addScaledVector(b.v, dt); const p = b.m.position;
    let kill = b.life <= 0 || p.y < footGround(p.x, p.z) + 0.05;
    if (!kill && !driving) { const dx = p.x - BASE_AT.x, dz = p.z - BASE_AT.z, dy = p.y - footGround(BASE_AT.x, BASE_AT.z); if (dy > -0.4 && dx * dx + dz * dz + dy * dy < DOME_R * DOME_R) { kill = true; for (let i = 0; i < 8; i++) sparks.emit(p.x, p.y, p.z, (Math.random() - 0.5) * 6, 1 + Math.random() * 4, (Math.random() - 0.5) * 6, 0.5); try { Snd.tone(900, 0.07, 'sine', 0.05, 0.6); } catch (e) {} } }
    if (!kill) for (const c of FT.cols) { if (c.off || !c.cover) continue; const dx = p.x - c.x, dz = p.z - c.z; if (dx * dx + dz * dz < c.r * c.r && p.y < footGround(c.x, c.z) + c.h) { kill = true; break; } }
    if (!kill && b.harm && state === 'playing') {
      if (driving) { const dx = p.x - hp.x, dz = p.z - hp.z; if (dx * dx + dz * dz < 5.5 && Math.abs(p.y - hp.y) < 2.2) { kill = true; footHurt(18); shake = Math.max(shake, 0.6); if (FT.hp <= 0) { FT.dieMsg = 'Your hover was destroyed by the alien'; footDie(); } } }
      else if (HT.phase === 'hunt' && !HT.inDome) { const dx = p.x - FT.p.x, dz = p.z - FT.p.z; if (dx * dx + dz * dz < 0.5 && p.y > FT.p.y - 0.1 && p.y < FT.p.y + 2.0) { kill = true; footHurt(8); FT.dieMsg = 'The alien lasers burned you down'; } }
    }
    if (kill) { b.on = false; b.m.visible = false; huntImpact(p, b.boss); }
  }
}
function huntLine(a, from, to, on) {
  a.line.visible = on; if (!on) return; const at = a.line.geometry.attributes.position; at.setXYZ(0, from.x, from.y, from.z); at.setXYZ(1, to.x, to.y, to.z); at.needsUpdate = true; a.line.material.opacity = 0.45 + 0.4 * Math.sin(performance.now() * 0.03);
}
function huntSlide(g, r, dt) {
  for (const c of FT.cols) { if (c.off) continue; const dx = g.position.x - c.x, dz = g.position.z - c.z, d = Math.hypot(dx, dz), m = c.r + r; if (d < m && d > 1e-4) { g.position.x = c.x + dx / d * m; g.position.z = c.z + dz / d * m; } }
  { const dx = g.position.x - BASE_AT.x, dz = g.position.z - BASE_AT.z, d = Math.hypot(dx, dz), m = DOME_R + 0.6 + r; if (d < m) { const k = d > 1e-4 ? 1 / d : 0, ux = d > 1e-4 ? dx * k : 1, uz = d > 1e-4 ? dz * k : 0; g.position.x = BASE_AT.x + ux * m; g.position.z = BASE_AT.z + uz * m; } }
  g.position.x = Math.max(FB.x0, Math.min(FB.x1, g.position.x)); g.position.z = Math.max(FB.z0, Math.min(FB.z1, g.position.z)); g.position.y = footGround(g.position.x, g.position.z);
}
function huntAlertGroup(gi) {
  for (const o of HT.aliens) if (!o.dead && o.grp === gi && o.st === 'patrol') { o.st = 'hunt'; o.cd = 0.4 + Math.random() * 1.2; }
  if (!HT.alerted) { HT.alerted = true; toast('ALIENS ALERTED', 'Hide behind rocks from the lasers, peek out and shoot!', 'warn'); }
}

/* ---------- phase 1: the hunt ---------- */
function huntAliens(dt) {
  const P = FT.p; let seen = false, slots = 0; for (const a of HT.aliens) if (a.st === 'aim' || a.st === 'burst') slots++;
  for (const a of HT.aliens) {
    if (a.dead || a.spawnT > 0) continue; const g = a.g, dx = P.x - g.position.x, dz = P.z - g.position.z, d = Math.hypot(dx, dz) || 1; a.hitT = Math.max(0, a.hitT - dt); a.cd -= dt; a.strT -= dt;
    const los = d < 52 && huntLOS(g.position.x, g.position.z, P.x, P.z); if (los && (a.st === 'aim' || a.st === 'burst' || a.st === 'hunt')) seen = true;
    if (a.st === 'patrol') { if ((los && d < 40) || a.hitT > 0 || a.hp < a.maxhp) huntAlertGroup(a.grp); }
    let mvx = 0, mvz = 0, want = null, sp = 0;
    if (a.st === 'patrol') {
      a.tT -= dt; if (a.tT <= 0) { const an = Math.random() * 6.283, r = Math.random() * 7; a.tgt.x = a.home.x + Math.cos(an) * r; a.tgt.z = a.home.z + Math.sin(an) * r; a.tT = 3 + Math.random() * 4; }
      const tx = a.tgt.x - g.position.x, tz = a.tgt.z - g.position.z, td = Math.hypot(tx, tz); if (td > 0.8) { mvx = tx / td; mvz = tz / td; sp = 1.3; want = Math.atan2(mvx, mvz); }
    } else if (a.st === 'hunt') {
      const nx = dx / d, nz = dz / d, px = -nz, pz = nx;
      if (a.strT <= 0) { a.strafe = -a.strafe; a.strT = 1.2 + Math.random() * 2; }
      if (los && d < 50) {
        if (a.cd <= 0 && slots < 4) { a.st = 'aim'; a.aimT = 0.75 + Math.random() * 0.25; slots++; }
        else { const k = d < 15 ? -2.4 : d > 34 ? 2.4 : 0; mvx = px * a.strafe * 2.4 + nx * k; mvz = pz * a.strafe * 2.4 + nz * k; sp = 1; want = Math.atan2(dx, dz); }
      } else { const fc = Math.cos(a.flank), fs = Math.sin(a.flank), fx = nx * fc - nz * fs, fz = nx * fs + nz * fc; mvx = fx * 3.4 + px * a.strafe * 0.9; mvz = fz * 3.4 + pz * a.strafe * 0.9; sp = 1; want = Math.atan2(mvx, mvz); }
    } else if (a.st === 'aim') {
      want = Math.atan2(dx, dz); a.aimT -= dt; const mz = _hV.set(g.position.x, g.position.y + 1.5, g.position.z); huntLine(a, mz, _hV2.set(P.x, P.y + 1.2, P.z), true);
      if (!los) { a.st = 'hunt'; a.cd = 0.5; huntLine(a, mz, mz, false); } else if (a.aimT <= 0) { a.st = 'burst'; a.burst = 3; a.burstT = 0; huntLine(a, mz, mz, false); }
    } else if (a.st === 'burst') {
      want = Math.atan2(dx, dz); a.burstT -= dt;
      if (a.burstT <= 0) { if (a.burst > 0) { const f = _hV.set(Math.sin(want) * 0.7 + g.position.x, g.position.y + 1.5, Math.cos(want) * 0.7 + g.position.z); huntBolt(f, _hV2.set(P.x, P.y + 1.15, P.z), false, true, 0.5); a.burst--; a.burstT = 0.15; } else { a.st = 'hunt'; a.cd = 1.3 + Math.random() * 1.2; } }
    }
    if (sp > 0) { g.position.x += mvx / (Math.hypot(mvx, mvz) || 1) * Math.min(sp * Math.hypot(mvx, mvz), 3.6) * dt; g.position.z += mvz / (Math.hypot(mvx, mvz) || 1) * Math.min(sp * Math.hypot(mvx, mvz), 3.6) * dt; }
    for (const o of HT.aliens) if (o !== a && !o.dead) { const ox = g.position.x - o.g.position.x, oz = g.position.z - o.g.position.z, od = Math.hypot(ox, oz); if (od < 1.5 && od > 1e-3) { g.position.x += ox / od * (1.5 - od) * 0.5; g.position.z += oz / od * (1.5 - od) * 0.5; } }
    huntSlide(g, 0.6, dt); a.moving = sp > 0;
    if (want !== null) g.rotation.y += footAngDiff(g.rotation.y, want) * (1 - Math.exp(-dt * 9));
    if (a.moving) huntAnim(a, 'walk', Math.min(2.6, Math.hypot(mvx, mvz) * sp / 1.5 + 0.4)); else huntAnim(a, 'aim');
  }
  if (HT.alerted && !seen) HT.unseenT += dt; else HT.unseenT = 0;
  if (HT.unseenT > 2.5 && FT.hp < 100) FT.hp = Math.min(100, FT.hp + 7 * dt);
}
function huntKilled(e) {
  e.dead = 0.01; FT.kills++; HT.kills = FT.kills; HT.streak++; HT.streakT = 6; HT.bestStreak = Math.max(HT.bestStreak, HT.streak); score += 100 + 50 * Math.min(HT.streak - 1, 5); ftSnd('die'); addCoins(2, 'style'); huntAnim(e, 'death'); e.line.visible = false; if (e.st === 'aim' || e.st === 'burst') e.st = 'hunt';
  for (let i = 0; i < 14; i++) sparks.emit(e.g.position.x, e.g.position.y + 1.2, e.g.position.z, (Math.random() - 0.5) * 8, 2 + Math.random() * 5, (Math.random() - 0.5) * 8, 0.7);
  if (Math.random() < 0.7) footDrop(e.g.position, 'ammo');
  const left = HUNT_N - FT.kills, SN = ['', '', 'DOUBLE KILL', 'TRIPLE KILL', 'QUAD KILL', 'RAMPAGE!']; if (HT.streak >= 2) toast(SN[Math.min(HT.streak, 5)], 'Streak x' + HT.streak + '  +' + 50 * Math.min(HT.streak - 1, 5) + ' bonus', 'good'); if (left > 0) { if (HT.streak < 2) toast('ALIEN DOWN', left + ' left', 'good'); } else HT.cineWait = 1.6;
  if (!HT.alerted) huntAlertGroup(e.grp);
}
function huntWorld(dt) {
  for (let i = FT.pickups.length - 1; i >= 0; i--) { const p = FT.pickups[i]; p.life -= dt; p.m.rotation.y += dt * 2; if (Math.hypot(FT.p.x - p.m.position.x, FT.p.z - p.m.position.z) < 1.7) { FT.reserve = Math.min(150, FT.reserve + 24); toast('+24 AMMO', null, 'good'); ftSnd('pick'); FT.world.remove(p.m); FT.pickups.splice(i, 1); } else if (p.life <= 0) { FT.world.remove(p.m); FT.pickups.splice(i, 1); } }
  for (const q of FT.tracers) if (q.t > 0) { q.t -= dt; if (q.t <= 0) q.l.visible = false; }
  const t = performance.now() * 0.001; FT.supply.visible = true; FT.supply.material.opacity = FT.supplyT > 0 ? 0.15 : 0.5 + 0.2 * Math.sin(t * 3);
  if (FT.sky) { FT.sky.position.copy(camera.position); FT.charon.rotation.y += dt * 0.01; }
}
function huntAnimate(dt) {
  for (const a of HT.aliens) { if (a.mixer) a.mixer.update(dt); if (a.anim === 'death' && a.m) { a.fallT += dt; const k = Math.min(1, a.fallT / 0.8), e = k * k, b = k >= 1 ? Math.max(0, 0.05 * Math.sin((a.fallT - 0.8) * 14) * Math.exp(-(a.fallT - 0.8) * 5)) : 0; a.walk.setEffectiveTimeScale(Math.max(0, 0.35 - a.fallT)); a.m.rotation.x = -e * 1.52 - b; a.m.rotation.z = a.fallDir * e * 0.25; a.m.position.y = -e * 0.12 * a.size; } if (a.dead) { a.dead += dt; if (a.dead > 5) { a.g.position.y -= dt * 0.5; } if (a.dead > 7) a.g.visible = false; } }
  if (HT.boss && HT.boss.mixer) HT.boss.mixer.update(HT.boss.anim === 'aim' ? 0 : dt);
  if (HT.subT > 0) { HT.subT -= dt * 1000; if (HT.subT <= 0) huntSubHide(); }
}

/* ---------- boss arrival cinematic ---------- */
function huntStartCine() {
  HT.phase = 'cine'; HT.pt = 0; FT.firing = false; FT.touch.fire = false; HT.spoke = false; footAnim('idle');
  for (const a of HT.aliens) a.line.visible = false;
  let ux = HOVER_AT.x - FT.p.x, uz = HOVER_AT.z - FT.p.z; const ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul;
  let bx = FT.p.x - ux * 22, bz = FT.p.z - uz * 22; bx = Math.max(FB.x0 + 8, Math.min(FB.x1 - 8, bx)); bz = Math.max(FB.z0 + 8, Math.min(FB.z1 - 8, bz));
  if (Math.hypot(bx - FT.p.x, bz - FT.p.z) < 14) { bx = FT.p.x - uz * 20; bz = FT.p.z + ux * 20; bx = Math.max(FB.x0 + 8, Math.min(FB.x1 - 8, bx)); bz = Math.max(FB.z0 + 8, Math.min(FB.z1 - 8, bz)); }
  HT.land.x = bx; HT.land.z = bz;
  const b = HT.boss = huntMake(3.2, true); b.r = 2.2; b.g.position.set(bx, footGround(bx, bz) + 70, bz); b.g.rotation.y = Math.atan2(FT.p.x - bx, FT.p.z - bz); huntAnim(b, 'aim');
  alienRoot.visible = AL.loaded; alienRoot.scale.setScalar(6); alienRoot.position.set(bx, footGround(bx, bz) + 78, bz); alienBeamMat.opacity = 0.4; alienBeam.visible = true;
  huntSub('SOMETHING IS COMING...', '', 2200); shake = Math.max(shake, 0.4); try { Snd.alienHum && Snd.alienHum(0.08, 0.6); } catch (e) {}
}
function huntShakeAmt(dt) { const mf = settings.shake ? 1 : 0, s = shake > 0 ? shake * mf * 0.5 : 0; shake = Math.max(0, shake - dt * 1.6); return s; }
function huntCine(dt) {
  const t = HT.pt, b = HT.boss, gy = footGround(HT.land.x, HT.land.z); astroUpdate(dt);
  if (scene.fog) scene.fog.color.lerp(_hC.setHex(0x4a1030), dt * 0.6);
  if (t < 3.0) shake = Math.max(shake, 0.15);
  if (t >= 0.8 && t < 2.8) { const k = (t - 0.8) / 2.0; b.g.position.y = gy + 70 * (1 - k * k); if (!b.g.userData.beam) b.g.userData.beam = 1; }
  if (t >= 2.8 && !HT.spoke) {
    HT.spoke = true; b.g.position.y = gy; shake = 1.5; Snd.crash && Snd.crash(); try { Snd.tone(70, 1.4, 'sawtooth', 0.22, 0.5); Snd.noise(0.6, 0.5, 600); } catch (e) {} vibe && vibe(80, 'heavy');
    for (let i = 0; i < 50; i++) sparks.emit(b.g.position.x, gy + 0.3, b.g.position.z, (Math.random() - 0.5) * 18, 1 + Math.random() * 7, (Math.random() - 0.5) * 18, 0.9);
    { const nm = huntName(); huntSub('I WILL NOT LEAVE YOU, ' + nm.toUpperCase() + '!', '', 3800); huntSay('I will not leave you, ' + nm); } alienBeamMat.opacity = 0;
  }
  alienSpin.rotation.y += dt * 2; { const hl = Math.max(1, alienRoot.position.y - gy) / 6; alienBeam.scale.set(1.6, hl / 5, 1.6); alienBeam.position.y = -hl / 2; }
  if (t >= 2.8) { alienRoot.position.y += dt * 26; alienBeam.visible = false; if (t > 6) alienRoot.visible = false; }
  if (t > 3.2 && t < 5.6) { const dx = FT.p.x - b.g.position.x, dz = FT.p.z - b.g.position.z, d = Math.hypot(dx, dz); b.g.rotation.y += footAngDiff(b.g.rotation.y, Math.atan2(dx, dz)) * (1 - Math.exp(-dt * 4)); if (d > 15) { b.g.position.x += dx / d * 2.4 * dt; b.g.position.z += dz / d * 2.4 * dt; b.g.position.y = footGround(b.g.position.x, b.g.position.z); huntAnim(b, 'walk', 0.8); } else huntAnim(b, 'aim'); }
  if (t >= 2.8) {
    const bx = b.g.position.x - FT.p.x, bz = b.g.position.z - FT.p.z, ty = Math.atan2(bx, bz); FT.charYaw += footAngDiff(FT.charYaw, ty) * (1 - Math.exp(-dt * 8)); FT.yaw = FT.charYaw;
    if (ASTRO.ready) { footAnim('walk'); ASTRO.acts.walk.setEffectiveTimeScale(-0.9); const bd = Math.hypot(bx, bz) || 1; FT.p.x -= bx / bd * 1.3 * dt; FT.p.z -= bz / bd * 1.3 * dt; FT.p.y = footGround(FT.p.x, FT.p.z); }
  }
  if (ASTRO.ready) { const j = t >= 2.8 ? 1 : 0; ASTRO.group.position.set(FT.p.x + Math.sin(t * 61) * 0.025 * j, FT.p.y, FT.p.z); ASTRO.group.rotation.y = FT.charYaw; ASTRO.group.rotation.z = Math.sin(t * 47) * 0.05 * j; }
  if (t > 6.0) { HT.phase = 'flee'; HT.pt = 0; HT.bossCd = 0.6; if (ASTRO.group) ASTRO.group.rotation.z = 0; huntSubHide(); toast('RUN TO THE HOVER!', 'Get away from it!', 'warn'); FT.sprint = true; }
}

/* ---------- flee on foot + boarding ---------- */
function huntBossFollow(dt, speed, keep) {
  const b = HT.boss, tx = (HT.phase === 'drive' ? carRoot.position.x : FT.p.x) - b.g.position.x, tz = (HT.phase === 'drive' ? carRoot.position.z : FT.p.z) - b.g.position.z, d = Math.hypot(tx, tz) || 1;
  b.g.rotation.y += footAngDiff(b.g.rotation.y, Math.atan2(tx, tz)) * (1 - Math.exp(-dt * 6));
  if (d > keep) { b.g.position.x += tx / d * speed * dt; b.g.position.z += tz / d * speed * dt; }
  huntSlide(b.g, 2.0, dt); if (b.mixer) huntAnim(b, 'walk', Math.max(0.5, speed / 4.2)); return d;
}
function huntFlee(dt) {
  const T = HOVER_AT, dx = T.x - FT.p.x, dz = T.z - FT.p.z, d = Math.hypot(dx, dz) || 1; astroUpdate(dt);
  if (HT.phase === 'flee') {
    FT.p.x += dx / d * 9 * dt; FT.p.z += dz / d * 9 * dt; for (const c of FT.cols) { if (c.off) continue; const ex = FT.p.x - c.x, ez = FT.p.z - c.z, ed = Math.hypot(ex, ez), m = c.r + 0.45; if (ed < m && ed > 1e-4) { FT.p.x = c.x + ex / ed * m; FT.p.z = c.z + ez / ed * m; } }
    FT.p.y = footGround(FT.p.x, FT.p.z); FT.charYaw += footAngDiff(FT.charYaw, Math.atan2(dx, dz)) * (1 - Math.exp(-dt * 12)); FT.yaw = FT.charYaw; FT.sprint = true; FT.moving = true;
    if (ASTRO.ready) { footAnim('walk'); ASTRO.acts.walk.setEffectiveTimeScale(2.3); ASTRO.group.position.copy(FT.p); ASTRO.group.rotation.y = FT.charYaw; ASTRO.group.rotation.z = 0; }
    const bd = huntBossFollow(dt, 6.2, 12); HT.bossCd -= dt;
    if (HT.bossCd <= 0 && bd < 60) { HT.bossCd = 0.85; const b = HT.boss, f = _hV.set(b.g.position.x, b.g.position.y + 5, b.g.position.z), a = Math.random() * 6.283, tg = _hV2.set(FT.p.x + Math.cos(a) * 4 + dx / d * 3, FT.p.y + 0.2, FT.p.z + Math.sin(a) * 4 + dz / d * 3); huntBolt(f, tg, true, false, 0); }
    if (d < 4.2) { HT.phase = 'board'; HT.pt = 0; try { Snd.tone(300, 0.15, 'square', 0.1, 1.8); } catch (e) {} }
  } else {
    const k = huntEase(HT.pt / 0.8), hp = carRoot.position; FT.p.x += (hp.x - FT.p.x) * Math.min(1, dt * 7); FT.p.z += (hp.z - FT.p.z) * Math.min(1, dt * 7); const y = footGround(FT.p.x, FT.p.z) + k * 1.8;
    if (ASTRO.ready) { ASTRO.group.position.set(FT.p.x, y, FT.p.z); ASTRO.group.scale.setScalar(1 - k * 0.75); }
    huntBossFollow(dt, 5.0, 12);
    if (HT.pt >= 0.8) { HT.hideAstro = true; huntWin(); }
  }
}

/* ---------- hover escape ---------- */
function huntDriveInit(reset) {
  HT.phase = 'drive'; HT.pt = 0; HT.hideAstro = true; const w = HUNT_WP[0], H = HT.h;
  H.x = HOVER_AT.x; H.z = HOVER_AT.z; H.hdg = Math.atan2(w[0] - H.x, w[1] - H.z); H.v = 6; H.roll = 0; HT.gate = 0; HT.bossAim = 0; HT.bossCd = 1.6;
  if (ASTRO.group) { ASTRO.group.scale.set(1, 1, 1); ASTRO.group.visible = false; }
  if (reset || !HT.boss) { if (!HT.boss) HT.boss = huntMake(3.2, true); HT.boss.g.position.set(HOVER_AT.x, 0, HOVER_AT.z - 26); HT.boss.g.position.y = footGround(HOVER_AT.x, HOVER_AT.z - 26); HT.boss.st = 'follow'; HT.boss.line.visible = false; }
  FT.hp = 100; FT.p.set(H.x, 0, H.z); document.body.classList.add('huntNoAim'); huntHoverPose(true);
  for (let i = 0; i < HT.rings.length; i++) { HT.rings[i].visible = true; }
  huntRings(); toast('ESCAPE!', 'Drive through all 4 gates - A / D to steer, S to brake, Shift to boost', 'good');
}
function huntRings() { HT.rings.forEach((r, i) => { const cur = i === HT.gate, done = i < HT.gate; r.visible = !done; r.children[0].material.opacity = cur ? 0.95 : 0.3; r.children[1].material.opacity = cur ? 0.3 : 0.06; if (cur && i < HUNT_WP.length - 1) r.children[0].material.color.setHex(0x7dff6a); }); }
function huntHoverPose(snap) {
  const H = HT.h, gy = footGround(H.x, H.z), f = _hV.set(Math.sin(H.hdg), 0, Math.cos(H.hdg)), r = _hV2.crossVectors(f, _hUp).normalize(), up = new THREE.Vector3(0, 1, 0).multiplyScalar(Math.cos(H.roll)).addScaledVector(r, Math.sin(H.roll)), z = new THREE.Vector3().crossVectors(f, up);
  carRoot.position.set(H.x, snap ? gy + 0.95 : carRoot.position.y + (gy + 0.95 - carRoot.position.y) * 0.25, H.z); _hM.makeBasis(f, up, z); carRoot.quaternion.setFromRotationMatrix(_hM); carW.copy(carRoot.position);
}
const _hmi = { f: 0, s: 0, sprint: false };
function huntDrive(dt) {
  const H = HT.h; footMoveInput(_hmi); const brake = _hmi.f < -0.3, vt = brake ? 4 : _hmi.sprint ? 29 : 23;
  H.v += (vt - H.v) * (1 - Math.exp(-dt * (brake ? 3 : 1.1))); H.hdg -= _hmi.s * 1.5 * Math.min(1, H.v / 9) * dt; H.roll += (-_hmi.s * 0.4 - H.roll) * (1 - Math.exp(-dt * 6));
  H.x += Math.sin(H.hdg) * H.v * dt; H.z += Math.cos(H.hdg) * H.v * dt;
  for (const c of FT.cols) { if (c.off) continue; const dx = H.x - c.x, dz = H.z - c.z, d = Math.hypot(dx, dz), m = c.r + 2.3; if (d < m && d > 1e-4) { H.x = c.x + dx / d * m; H.z = c.z + dz / d * m; if (H.v > 8) { H.v *= 0.45; shake = Math.max(shake, 0.6); try { Snd.crash && Snd.crash(); } catch (e) {} for (let i = 0; i < 10; i++) sparks.emit(H.x, carRoot.position.y, H.z, (Math.random() - 0.5) * 9, 1 + Math.random() * 4, (Math.random() - 0.5) * 9, 0.5); } } }
  const cx = Math.max(FB.x0 + 2, Math.min(FB.x1 - 2, H.x)), cz = Math.max(FB.z0 + 2, Math.min(FB.z1 - 2, H.z)); if (cx !== H.x || cz !== H.z) { H.x = cx; H.z = cz; H.v *= 0.9; }
  huntHoverPose(false); FT.p.set(H.x, carRoot.position.y, H.z);
  if (Math.random() < dt * 40) sparks.emit(H.x - Math.sin(H.hdg) * 2, carRoot.position.y - 0.4, H.z - Math.cos(H.hdg) * 2, (Math.random() - 0.5) * 2, 0.5 + Math.random() * 1.5, (Math.random() - 0.5) * 2, 0.4);
  const w = HUNT_WP[HT.gate]; if (Math.hypot(H.x - w[0], H.z - w[1]) < (HT.gate === 3 ? 10.5 : 8.5)) { HT.gate++; ftSnd('pick'); Snd.coin && Snd.coin(2); score += 200; if (HT.gate >= HUNT_WP.length) { huntWin(); return; } huntRings(); toast('GATE ' + HT.gate + ' / ' + HUNT_WP.length, 'Keep running!', 'good'); }
  const b = HT.boss, bd = Math.hypot(b.g.position.x - H.x, b.g.position.z - H.z);
  if (b.st === 'aim') { HT.bossAim -= dt; const mz = _hV.set(b.g.position.x, b.g.position.y + 5.2, b.g.position.z); huntLine(b, mz, _hV2.set(H.x + Math.sin(H.hdg) * H.v * 0.6, carRoot.position.y + 0.5, H.z + Math.cos(H.hdg) * H.v * 0.6), true); b.g.rotation.y += footAngDiff(b.g.rotation.y, Math.atan2(H.x - b.g.position.x, H.z - b.g.position.z)) * (1 - Math.exp(-dt * 8)); huntAnim(b, 'aim');
    if (HT.bossAim <= 0) { b.st = 'follow'; huntLine(b, mz, mz, false); const fl = bd / 46, ax = H.x + Math.sin(H.hdg) * H.v * fl, az = H.z + Math.cos(H.hdg) * H.v * fl, tg = new THREE.Vector3(ax, carRoot.position.y + 0.4, az); huntBolt(mz, tg, true, true, 0); if (HT.gate >= 2) { huntBolt(mz, tg, true, true, 5); } HT.bossCd = Math.max(1.3, 2.6 - HT.gate * 0.3) + Math.random() * 0.6; }
  } else {
    huntBossFollow(dt, Math.min(21, 13.5 + Math.max(0, (bd - 28) * 0.3) + HT.gate * 0.6), 4.0); HT.bossCd -= dt;
    if (HT.bossCd <= 0 && bd > 11 && bd < 75) { b.st = 'aim'; HT.bossAim = 0.7; }
  }
  if (bd < 6.2) { FT.dieMsg = 'THE ALIEN CAUGHT YOU'; footDie(); }
}

/* ---------- ending ---------- */
const HL = { x: 0, y: 0, z: 0, v: 0, p: 0, hdg: Math.PI, bolt: 0, snd: 0, said: 0 };
function huntFlames() {
  if (HT.flames) return HT.flames; HT.flames = [];
  const cg = new THREE.ConeGeometry(0.42, 1, 14, 1, true); cg.translate(0, 0.5, 0);
  for (const z of [-0.62, 0.62]) for (const k of [[0xff8a2a, 1], [0xbff8ff, 0.55]]) { const m = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ color: k[0], transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); m.rotation.z = Math.PI / 2; m.position.set(-2.3, 0.45, z); m.userData.r = k[1]; m.visible = false; carRoot.add(m); HT.flames.push(m); }
  return HT.flames;
}
function huntFlamesOff() { if (HT.flames) for (const f of HT.flames) f.visible = false; huntFlashEl.style.opacity = 0; }
function huntLaunchPose() {
  const cp = Math.cos(HL.p), f = _hV.set(Math.sin(HL.hdg) * cp, Math.sin(HL.p), Math.cos(HL.hdg) * cp), z = _hV2.crossVectors(f, _hUp).normalize(), up = new THREE.Vector3().crossVectors(z, f);
  carRoot.position.set(HL.x, HL.y, HL.z); _hM.makeBasis(f, up, z); carRoot.quaternion.setFromRotationMatrix(_hM); carW.copy(carRoot.position);
}
/* ---------- ending: the astronaut boards, the hover launches into space ---------- */
function huntWin() {
  setState('finishing'); finishT = 0; HT.phase = 'win'; HT.pt = 0; Snd.win && Snd.win(); toast('LAUNCH!', 'Get off this planet!', 'good'); huntSub('ENGINES ONLINE', 'Hold on...', 2200);
  Object.assign(HL, { x: HOVER_AT.x, z: HOVER_AT.z, y: footGround(HOVER_AT.x, HOVER_AT.z) + 0.95, v: 0, p: 0, hdg: Math.PI, bolt: 0.8, snd: 0, said: 0 }); for (const f of huntFlames()) f.visible = true; huntFlashEl.style.opacity = 0;
  for (const b of HT.bolts) { b.on = false; b.m.visible = false; } if (HT.boss) HT.boss.line.visible = false; if (document.pointerLockElement) document.exitPointerLock();
}
function huntEnding(dt) {
  HT.pt += dt; const t = HT.pt, gy = footGround(HL.x, HL.z), lift = huntEase(t / 2.2), thr = t < 2 ? 0.3 + 0.5 * lift : 1, pit = huntEase((t - 2) / 3);
  HL.p = pit * 1.2; const vt = t < 2 ? 0 : 36 + 95 * huntEase((t - 3.5) / 4.5); HL.v += (vt - HL.v) * (1 - Math.exp(-dt * 1.3)); const cp = Math.cos(HL.p);
  if (t < 2) HL.y = gy + 0.95 + lift * 2.6 + Math.sin(t * 26) * 0.04 * lift; else { HL.x += Math.sin(HL.hdg) * cp * HL.v * dt; HL.z += Math.cos(HL.hdg) * cp * HL.v * dt; HL.y += Math.sin(HL.p) * HL.v * dt; }
  HL.y = Math.max(HL.y, footGround(HL.x, HL.z) + 2.5 * Math.min(1, lift)); huntLaunchPose(); FT.p.set(HL.x, HL.y, HL.z);
  const fl = HT.flames, len = 2.2 + 7 * thr + HL.v * 0.05; if (fl) for (const f of fl) { f.visible = true; f.scale.set(f.userData.r * (0.6 + 0.5 * thr), Math.max(0.01, len * f.userData.r), f.userData.r * (0.6 + 0.5 * thr)); f.material.opacity = 0.35 + 0.6 * thr; }
  const bx = -Math.sin(HL.hdg) * cp, bz = -Math.cos(HL.hdg) * cp;
  for (let i = 0; i < 2; i++) sparks.emit(HL.x + bx * 2.6 + (Math.random() - 0.5) * 0.8, HL.y - 0.1 + (Math.random() - 0.5) * 0.5, HL.z + bz * 2.6 + (Math.random() - 0.5) * 0.8, bx * 18 + (Math.random() - 0.5) * 4, -Math.sin(HL.p) * 18 + (Math.random() - 0.5) * 3, bz * 18 + (Math.random() - 0.5) * 4, 0.55);
  if (t < 4 && HL.y < gy + 14) for (let i = 0; i < 3; i++) sparks.emit(HL.x + (Math.random() - 0.5) * 9, gy + 0.3, HL.z + (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 14, 1 + Math.random() * 3, (Math.random() - 0.5) * 14, 0.8);
  if (t < 6) shake = Math.max(shake, 0.18 + 0.25 * thr); HL.snd -= dt; if (HL.snd <= 0) { HL.snd = 0.22; try { Snd.tone(60 + t * 22, 0.3, 'sawtooth', 0.09, 0.6); Snd.noise && Snd.noise(0.25, 0.25, 900); } catch (e) {} }
  if (HT.boss) { const bb = HT.boss; if (t < 3.2) huntBossFollow(dt, 5.5, 11); else { bb.g.rotation.y += footAngDiff(bb.g.rotation.y, Math.atan2(HL.x - bb.g.position.x, HL.z - bb.g.position.z)) * (1 - Math.exp(-dt * 4)); huntAnim(bb, 'aim'); }
    HL.bolt -= dt; if (HL.bolt <= 0 && t < 4.8) { HL.bolt = 0.5; huntBolt(_hV.set(bb.g.position.x, bb.g.position.y + 5, bb.g.position.z), _hV2.set(HL.x + (Math.random() - 0.5) * 6, HL.y + 1, HL.z + (Math.random() - 0.5) * 6), true, false, 0); } }
  if (scene.fog) { const k = huntEase((t - 3) / 4.5); scene.fog.color.lerp(_hC.setHex(0x05030c), Math.min(1, dt * 1.6)); scene.fog.far = 230 + 700 * k; scene.fog.near = 35 + 120 * k; }
  if (t > 4.4 && HL.said === 0) { HL.said = 1; huntSub('LEAVING THE PLANET', '', 2200); }
  if (t > 7.2 && HL.said === 1) { HL.said = 2; huntFlashEl.style.transition = 'none'; huntFlashEl.style.opacity = 1; void huntFlashEl.offsetWidth; huntFlashEl.style.transition = 'opacity .9s ease-out'; huntFlashEl.style.opacity = 0; huntSub('ESCAPED INTO SPACE', 'LEVEL COMPLETE', 3000); Snd.win && Snd.win(); }
  huntBolts(dt); huntAnimate(dt); for (const q of FT.tracers) q.l.visible = false;
  if (HT.pt > 10.6) { huntSubHide(); huntFlamesOff(); showResults(); }
}

/* ---------- tense mood: red alert, heartbeat, vignette, streak ---------- */
const _hC = new THREE.Color();
function huntMood(dt) {
  const hpF = Math.max(0, Math.min(1, FT.hp / 100)), low = Math.max(0, (0.65 - hpF) / 0.65), hunting = HT.phase === 'hunt'; let aimN = 0;
  if (hunting && !HT.inDome) for (const a of HT.aliens) if (!a.dead && (a.st === 'aim' || a.st === 'burst')) aimN++;
  if (aimN > HT.aimN) { try { Snd.tone(1250, 0.09, 'square', 0.06, 0.7); setTimeout(() => Snd.tone(1250, 0.09, 'square', 0.06, 0.7), 130); } catch (e) {} } HT.aimN = aimN;
  HT.alert += ((aimN > 0 ? Math.min(1, 0.5 + aimN * 0.25) : HT.alerted ? 0.15 : 0) - HT.alert) * (1 - Math.exp(-dt * 3));
  const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.008 * (1 + HT.alert));
  if (hunting && scene.fog) { scene.fog.color.setHex(HUNT_FOG).lerp(_hC.setHex(HUNT_FOG_RED), HT.alert * (0.5 + 0.5 * pulse)); hemi.color.setHex(0x6a5c8a).lerp(_hC.setHex(0xff3446), HT.alert * (0.3 + 0.4 * pulse)); hemi.intensity = 0.65 + HT.alert * 0.25; sun.color.setHex(0xff8a70); sun.intensity = 0.5; }
  huntVig.style.opacity = Math.min(1, low * (0.6 + 0.4 * pulse) + Math.min(1, FT.hurtT * 2) * 0.5).toFixed(2); huntAlertEl.style.opacity = (HT.alert * (0.35 + 0.65 * pulse)).toFixed(2);
  HT.beatT -= dt; if (HT.beatT <= 0 && (low > 0.05 || HT.alert > 0.3)) { HT.beatT = 60 / (55 + low * 95 + HT.alert * 35); try { Snd.tone(58, 0.2, 'sine', 0.14 + low * 0.25, 0.55); setTimeout(() => Snd.tone(50, 0.22, 'sine', 0.1 + low * 0.2, 0.55), 170); } catch (e) {} }
  if (HT.streakT > 0) { HT.streakT -= dt; if (HT.streakT <= 0) HT.streak = 0; }
  huntStreakEl.classList.toggle('on', hunting); huntStreakEl.classList.toggle('hot', HT.streak >= 2);
  huntStreakEl.querySelector('[data-testid=hunt-score]').textContent = Math.round(score); huntStreakEl.querySelector('[data-testid=hunt-streak]').textContent = 'x' + HT.streak; huntStreakEl.querySelector('.hsBest b').textContent = 'x' + HT.bestStreak; huntStreakEl.querySelector('i').style.width = (HT.streak ? HT.streakT / 6 * 100 : 0).toFixed(0) + '%';
}

/* ---------- main tick / camera / hud ---------- */
function huntTick(dt) {
  if (SH.on) { shTick(dt); return; }
  HT.pt += dt; huntMood(dt); FT.firing = HT.phase === 'hunt' ? FT.firing : false; if (HT.phase !== 'hunt') FT.hurtT = Math.max(0, FT.hurtT - dt);
  if (HT.phase === 'hunt') {
    footPlayer(dt); if (state !== 'playing') return; HT.inDome = huntInDome(FT.p.x, FT.p.z); FT.safe = HT.inDome; if (HT.inDome && !HT.domeMsg) { HT.domeMsg = true; toast('DOME SHIELD', 'Aliens cannot hit you inside - shoot them from here!', 'good'); } huntWaves(dt); huntAliens(dt); huntBolts(dt); huntWorld(dt); huntAnimate(dt);
    if (HT.cineWait > 0) { HT.cineWait -= dt; if (HT.cineWait <= 0 && FT.kills >= HUNT_N) huntStartCine(); }
  } else if (HT.phase === 'cine') { huntCine(dt); huntBolts(dt); huntWorld(dt); huntAnimate(dt); }
  else if (HT.phase === 'flee' || HT.phase === 'board') { huntFlee(dt); huntBolts(dt); huntWorld(dt); huntAnimate(dt); }
  else if (HT.phase === 'drive') { huntDrive(dt); if (HT.phase === 'drive') { huntBolts(dt); huntWorld(dt); huntAnimate(dt); } }
}
function huntCamSet(px, py, pz, lx, ly, lz, fov, dt, rate) {
  const s = huntShakeAmt(dt); HT.camP.set(px, py, pz); camera.up.set(0, 1, 0); camera.position.lerp(HT.camP, rate >= 1 ? 1 : 1 - Math.exp(-dt * rate)); camera.position.x += (Math.random() - 0.5) * s; camera.position.y += (Math.random() - 0.5) * s;
  HT.camL.lerp(_hV.set(lx, ly, lz), rate >= 1 ? 1 : 1 - Math.exp(-dt * rate * 1.3)); camera.lookAt(HT.camL); if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * 0.06; camera.updateProjectionMatrix(); }
}
function huntCamera(dt) {
  const ph = HT.phase; if (ph === 'hunt') return false;
  if (ph === 'cine' && HT.boss) {
    const b = HT.boss.g.position, t = HT.pt, dx = b.x - FT.p.x, dz = b.z - FT.p.z, d = Math.hypot(dx, dz) || 1, sx = -dz / d, sz = dx / d;
    const near = t < 2.8 ? 0 : 1, lgy = footGround(HT.land.x, HT.land.z); huntCamSet(FT.p.x + sx * 5 - dx / d * 4, FT.p.y + 3.6, FT.p.z + sz * 5 - dz / d * 4, b.x, near ? b.y + 4.5 : Math.min(b.y, lgy + 14), b.z, near ? 52 : 70, dt, t < 0.05 ? 99 : 4); return true;
  }
  if (ph === 'flee' || ph === 'board') {
    const dx = HOVER_AT.x - FT.p.x, dz = HOVER_AT.z - FT.p.z, d = Math.hypot(dx, dz) || 1, ux = dx / d, uz = dz / d;
    huntCamSet(FT.p.x + ux * 8 - uz * 3.2, FT.p.y + 3.0, FT.p.z + uz * 8 + ux * 3.2, FT.p.x + (HT.boss ? (HT.boss.g.position.x - FT.p.x) * 0.25 : 0), FT.p.y + 2.2, FT.p.z + (HT.boss ? (HT.boss.g.position.z - FT.p.z) * 0.25 : 0), 62, dt, 5); return true;
  }
  if (ph === 'win') {
    const t = HT.pt, cp = Math.cos(HL.p), fx = Math.sin(HL.hdg) * cp, fy = Math.sin(HL.p), fz = Math.cos(HL.hdg) * cp, rx = -Math.cos(HL.hdg), rz = Math.sin(HL.hdg), k = Math.max(0, 1 - t / 3.4), dist = 9 + huntEase(t / 8) * 17;
    const cx = HL.x - fx * dist + rx * k * 9, cz = HL.z - fz * dist + rz * k * 9, cy = Math.max(footGround(cx, cz) + 1.2, HL.y - fy * dist + 2.2 + k * 0.6);
    huntCamSet(cx, cy, cz, HL.x + fx * 4, HL.y + fy * 4, HL.z + fz * 4, 62 + 34 * huntEase((t - 3) / 5), dt, t < 0.05 ? 99 : 7); return true;
  }
  if (ph === 'drive') {
    const H = HT.h, fx = Math.sin(H.hdg), fz = Math.cos(H.hdg), win = ph === 'win', k = win ? Math.min(1, HT.pt / 3) : 0, y = carRoot.position.y;
    huntCamSet(H.x - fx * (10.5 + k * 8) , y + 4.6 + k * 3, H.z - fz * (10.5 + k * 8), H.x + fx * 12, y + 1.4 + k * 3, H.z + fz * 12, 66 + H.v * 0.28, dt, 6); return true;
  }
  return false;
}
function huntHud() {
  if (SH.on) { shHud(); return; }
  const ph = HT.phase, nc = ph !== 'hunt'; document.body.classList.toggle('huntNoAim', nc); let txt = '', tgt = null, brg = 0, fill = 0, num = '';
  const lab = ph !== 'hunt' ? 'ESCAPE' : 'ALIENS KILLED'; if (lab !== HT.lastLabel) { HT.lastLabel = lab; $('ftSignal').querySelector('span').textContent = lab; }
  if (ph === 'hunt') {
    const left = HUNT_N - FT.kills; fill = FT.kills / HUNT_N; num = FT.kills + ' / ' + HUNT_N;
    let best = 1e9; for (const a of HT.aliens) if (!a.dead) { const d = Math.hypot(a.g.position.x - FT.p.x, a.g.position.z - FT.p.z); if (d < best) { best = d; tgt = a.g.position; } }
    txt = !HT.alerted ? 'The alien scouts are landing...' : HT.unseenT > 0.5 ? 'HIDDEN - peek out and shoot (' + left + ' left)' : 'TAKE COVER from the lasers! (' + left + ' left)';
    if (tgt) { const dx = tgt.x - FT.p.x, dz = tgt.z - FT.p.z; txt += '  \u00B7  ' + Math.round(Math.hypot(dx, dz)) + ' m'; brg = -footAngDiff(FT.camYaw, Math.atan2(dx, dz)); }
    $('ftLockHint').classList.toggle('hidden', !(state === 'playing' && !FT.lock && !document.body.classList.contains('touch')));
  } else {
    $('ftLockHint').classList.add('hidden'); fill = HT.gate / HUNT_WP.length; num = HT.gate + ' / ' + HUNT_WP.length;
    if (ph === 'cine') txt = 'WARNING: UNKNOWN LIFEFORM';
    else if (ph === 'flee' || ph === 'board') { const dx = HOVER_AT.x - FT.p.x, dz = HOVER_AT.z - FT.p.z; txt = 'RUN TO THE HOVER!  \u00B7  ' + Math.round(Math.hypot(dx, dz)) + ' m'; tgt = HOVER_AT; brg = -footAngDiff(FT.camYaw, Math.atan2(dx, dz)); }
    else if (ph === 'drive') { const w = HUNT_WP[Math.min(HT.gate, 3)], dx = w[0] - HT.h.x, dz = w[1] - HT.h.z, bd = HT.boss ? Math.round(Math.hypot(HT.boss.g.position.x - HT.h.x, HT.boss.g.position.z - HT.h.z)) : 0; txt = 'GATE ' + (HT.gate + 1) + '/' + HUNT_WP.length + '  \u00B7  ' + Math.round(Math.hypot(dx, dz)) + ' m  \u00B7  ALIEN ' + bd + ' m BEHIND'; tgt = w; brg = -footAngDiff(HT.h.hdg, Math.atan2(dx, dz)); }
    else txt = 'ESCAPED!';
  }
  { const lp = $('ftLives').children; for (let i = 1; i < lp.length; i++) lp[i].classList.toggle('on', i <= HT.lives); }
  if (ph === 'cine' || ph === 'flee' || ph === 'board') { fill = ph === 'cine' ? 0 : Math.max(0, 1 - Math.hypot(HOVER_AT.x - FT.p.x, HOVER_AT.z - FT.p.z) / 60); num = ''; }
  if (ph === 'win') { fill = 1; num = 'DONE'; txt = 'LAUNCHING TO SPACE...'; }
  $('ftSigFill').style.width = (fill * 100).toFixed(1) + '%'; $('ftSigN').textContent = num; $('ftObj').textContent = txt; $('ftArrow').style.visibility = tgt ? 'visible' : 'hidden'; if (tgt) $('ftArrow').style.transform = 'rotate(' + (brg * 57.3).toFixed(0) + 'deg)';
  $('progress').style.width = (fill * 100).toFixed(1) + '%'; $('cp').textContent = ph === 'drive' ? 'Gate ' + HT.gate + '/4' : 'Aliens ' + FT.kills + '/' + HUNT_N; $('ftPrompt').classList.toggle('hidden', nc || !FT.lastPrompt);
}
