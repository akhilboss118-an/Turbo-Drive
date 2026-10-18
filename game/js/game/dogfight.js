/* eslint-disable */
'use strict';
/* Level 28 - SPACE BATTLE: 3D dogfight. Your hover (mini guns) vs the alien UFO (telegraphed lasers). 3 hits = dead + the level resets. UFO health bar floats above it. */
const DF_HP = 160, DF_LIVES = 3, DF_UFO_Z = -72, DF_BX = 44, DF_BY = 26, DF_SPEED = 34, DF_RATE = 16, DF_SHOT_V = 260, DF_UFO_R = 8.5;
const DF = { built: false, root: null, sky: null, fogSaved: null, guns: null, gunSpin: 0, planet: null, streaks: null, rocks: [], p: new THREE.Vector3(), v: new THREE.Vector3(), fwd: new THREE.Vector3(0, 0, -1), bank: 0, hits: 0, inv: 0, hurt: 0, fireT: 0, side: 0, mouse: false, tfire: false, tj: { x: 0, y: 0 }, noteOn: false,
  shots: [], bolts: [], tele: [], beam: null, atk: null, atkT: 2.5, ut: 0, lastKind: '', cam: new THREE.Vector3(), camSnap: true, t: 0, hudT: 0, endBoom: false, sndT: 0, sub: 0, warn: false,
  ufo: { g: null, spin: null, cg: null, hg: null, pos: new THREE.Vector3(0, 0, DF_UFO_Z), vel: new THREE.Vector3(), hp: DF_HP, flash: 0, dead: false, ph: 1, ready: false }, glow: null, glowW: null };
const _dA = new THREE.Vector3(), _dB = new THREE.Vector3(), _dC = new THREE.Vector3(), _dD = new THREE.Vector3(), _dCn = new THREE.Vector3(), _dP = new THREE.Vector3(), _dM = new THREE.Matrix4(), _dQ = new THREE.Quaternion(), _dX = new THREE.Vector3(1, 0, 0), _dUp = new THREE.Vector3(0, 1, 0);
const dfOn = () => !!(typeof level !== 'undefined' && LEVELS[level] && LEVELS[level].dogfight);
const dfClamp = (x, a, b) => Math.max(a, Math.min(b, x));
const dfSS = (x) => { x = dfClamp(x, 0, 1); return x * x * (3 - 2 * x); };
let DF_CYL = null;
const dfCyl = () => { if (!DF_CYL) { DF_CYL = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true); DF_CYL.rotateX(Math.PI / 2); DF_CYL.translate(0, 0, 0.5); } return DF_CYL; };
const dfMat = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
function dfSnd(k) {
  try {
    if (k === 'shot') { Snd.noise(0.04, 0.16, 4600); }
    else if (k === 'hit') Snd.tone(620, 0.05, 'triangle', 0.07, 1.3);
    else if (k === 'warn') { Snd.tone(330, 0.16, 'square', 0.1, 1.6); setTimeout(() => Snd.tone(330, 0.16, 'square', 0.1, 1.6), 190); }
    else if (k === 'laser') { Snd.tone(1500, 0.32, 'sawtooth', 0.12, 0.2); Snd.noise(0.2, 0.2, 3000); }
    else if (k === 'beam') { Snd.tone(110, 0.9, 'sawtooth', 0.16, 1.6); Snd.noise(0.9, 0.22, 1400); }
    else if (k === 'hurt') { Snd.crash && Snd.crash(); }
    else if (k === 'boom') { Snd.noise(0.7, 0.5, 900); Snd.tone(70, 0.7, 'sawtooth', 0.2, 0.4); }
  } catch (e) {}
}

/* ---------- HUD / note DOM ---------- */
const dfEl = document.createElement('div'); dfEl.id = 'dfHud'; dfEl.setAttribute('data-testid', 'dogfight-hud');
dfEl.innerHTML = '<div id="dfLives" data-testid="df-lives"><span>HULL</span><i class="on" data-testid="df-life-1"></i><i class="on" data-testid="df-life-2"></i><i class="on" data-testid="df-life-3"></i></div>'
  + '<div id="dfBoss" data-testid="df-boss-bar"><span class="dfBn">ALIEN MOTHERSHIP</span><div class="dfBt"><b id="dfBossFill" data-testid="df-boss-bar-fill"></b></div><em id="dfBossPct" data-testid="df-boss-percent">100%</em></div>'
  + '<div id="dfLock"><i></i></div>'
  + '<div id="dfWarn" data-testid="df-laser-warning"><b>LASER INCOMING</b><small></small></div>'
  + '<div id="dfSubT" data-testid="df-subtitle"><b></b><small></small></div>'
  + '<div id="dfHint" data-testid="df-controls-hint">A / D move &middot; W / S up &amp; down &middot; HOLD SPACE or CLICK to fire the mini guns</div>'
  + '<div id="dfVigR"></div><div id="dfFlash"></div>'
  + '<div id="dfTouch"><div id="dfJoy" data-testid="df-joystick"><i id="dfKnob"></i></div><button id="dfFireBtn" data-testid="df-fire-btn" aria-label="Fire">FIRE</button></div>';
$('ui').appendChild(dfEl);
const dfNoteEl = document.createElement('div'); dfNoteEl.id = 'dfNote'; dfNoteEl.setAttribute('data-testid', 'df-note');
dfNoteEl.innerHTML = '<div class="dfPaper"><div class="dfStamp">LEVEL 28</div><h2>Note to self</h2>'
  + '<p>I can&rsquo;t defeat him on land.</p><p>His UFO is too strong down here &mdash; I tried.</p><p><b>So I will destroy him in SPACE.</b></p>'
  + '<p class="sm">My hover has <u>mini guns</u>. His UFO has <u>lasers</u>.<br>Three hits and I&rsquo;m done &mdash; the level resets.</p>'
  + '<p class="sm">Dodge the lasers. Shoot until his health bar is empty.</p><div class="sig">&mdash; the pilot</div>'
  + '<div class="dfKeys">A/D &middot; W/S or arrows: fly &nbsp;|&nbsp; SPACE / click: fire</div>'
  + '<button class="btn primary" id="dfTakeOff" data-testid="df-takeoff-btn">TAKE OFF</button></div>';
$('ui').appendChild(dfNoteEl);
const dfLivesEls = Array.from(dfEl.querySelectorAll('#dfLives i')), dfBossEl = $('dfBoss'), dfBossFill = $('dfBossFill'), dfBossPct = $('dfBossPct'), dfLockEl = $('dfLock'), dfWarnEl = $('dfWarn'), dfSubEl = $('dfSubT'), dfVigEl = $('dfVigR'), dfFlashEl = $('dfFlash');
function dfSub(main, sub, ms) { dfSubEl.querySelector('b').textContent = main; dfSubEl.querySelector('small').textContent = sub || ''; dfSubEl.classList.add('on'); DF.sub = ms || 2200; }
function dfLivesHud() { dfLivesEls.forEach((e, i) => e.classList.toggle('on', i < DF_LIVES - DF.hits)); }
function dfNoteClose() {
  if (!DF.noteOn) return; DF.noteOn = false; document.body.classList.remove('dfNoteOn'); countdownT = 2.6; lastCount = -1; Snd.init(); Snd.click();
  if (typeof requestGameFullscreen === 'function') requestGameFullscreen();
}
$('dfTakeOff').addEventListener('click', dfNoteClose);
window.addEventListener('keydown', (e) => { if (dfOn() && DF.noteOn && state === 'countdown' && (e.code === 'Enter' || e.code === 'Space')) { e.preventDefault(); dfNoteClose(); } });
window.addEventListener('pointerdown', (e) => { if (!dfOn() || e.pointerType === 'touch' || e.button !== 0) return; if (e.target && e.target.closest && e.target.closest('button,.modal,#dfNote')) return; DF.mouse = true; });
window.addEventListener('pointerup', () => { DF.mouse = false; });
window.addEventListener('blur', () => { DF.mouse = false; DF.tfire = false; });
(function dfTouchInit() {
  const joy = $('dfJoy'), knob = $('dfKnob'), fb = $('dfFireBtn'); let pid = null;
  const mv = (e) => { const r = joy.getBoundingClientRect(), R = r.width / 2; let x = (e.clientX - (r.left + R)) / R, y = (e.clientY - (r.top + R)) / R; const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } DF.tj.x = Math.abs(x) < 0.12 ? 0 : x; DF.tj.y = Math.abs(y) < 0.12 ? 0 : -y; knob.style.transform = 'translate(' + (x * R * 0.6).toFixed(0) + 'px,' + (y * R * 0.6).toFixed(0) + 'px)'; };
  const end = (e) => { if (e.pointerId !== pid) return; pid = null; DF.tj.x = DF.tj.y = 0; knob.style.transform = ''; };
  joy.addEventListener('pointerdown', (e) => { e.preventDefault(); pid = e.pointerId; try { joy.setPointerCapture(pid); } catch (x) {} Snd.init(); mv(e); });
  joy.addEventListener('pointermove', (e) => { if (e.pointerId === pid) mv(e); }); joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end); joy.addEventListener('lostpointercapture', end);
  fb.addEventListener('pointerdown', (e) => { e.preventDefault(); DF.tfire = true; try { fb.setPointerCapture(e.pointerId); } catch (x) {} Snd.init(); });
  const up = () => { DF.tfire = false; }; fb.addEventListener('pointerup', up); fb.addEventListener('pointercancel', up); fb.addEventListener('lostpointercapture', up); fb.addEventListener('contextmenu', (e) => e.preventDefault());
})();

/* ---------- scene ---------- */
function dfMkPool(n, fn) { const a = []; for (let i = 0; i < n; i++) { const o = fn(); o.active = false; o.g.visible = false; DF.root.add(o.g); a.push(o); } return a; }
function dfBuild() {
  if (DF.built) return; DF.built = true;
  const low = settings.quality === 'low', R = spRng(2828);
  DF.fogSaved = scene.fog; scene.fog = null; if (scene.background && scene.background.dispose) scene.background.dispose(); scene.background = new THREE.Color(0x01020a);
  camera.near = 0.4; camera.far = 16000; camera.updateProjectionMatrix();
  hemi.color.setHex(0x8fa0d8); hemi.groundColor.setHex(0x20182c); hemi.intensity = 0.95; sun.color.setHex(0xfff0d8); sun.intensity = 1.9; sun.position.set(-40, 80, 70);
  levelGroup.visible = false; document.body.classList.add('dogfight');
  const root = DF.root = new THREE.Group(); scene.add(root); const sky = DF.sky = new THREE.Group(); scene.add(sky);
  const n = low ? 1800 : 3600, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { let x, y, z; do { x = R() * 2 - 1; y = R() * 2 - 1; z = R() * 2 - 1; } while (x * x + y * y + z * z > 1 || x * x + y * y + z * z < 0.05); const l = Math.hypot(x, y, z) || 1; pos.set([x / l * 6000, y / l * 6000, z / l * 6000], i * 3); const t = R(), b = 0.55 + R() * 0.45; col.set([b * (t < 0.2 ? 1 : 0.9), b * (t < 0.2 ? 0.82 : 0.94), b * (t < 0.2 ? 0.6 : 1)], i * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 1.9, sizeAttenuation: false, vertexColors: true, fog: false, transparent: true, depthWrite: false })); stars.frustumCulled = false; sky.add(stars);
  const pl = DF.planet = spMakePlanet('ocean', 1100, false, 28, 0x5aa8ff); pl.position.set(-650, -1250, -2700); sky.add(pl);
  const sunS = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(['rgba(255,250,235,1)', 'rgba(255,220,170,0.35)', 'rgba(0,0,0,0)']), fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending })); sunS.position.set(2300, 1000, -3600); sunS.scale.setScalar(900); sky.add(sunS);
  for (const k of [[-2600, 700, -3200, 0x5a2a9a, 2600], [2200, -300, -3800, 0xff3a8a, 2000], [300, 1500, -4200, 0x2a6aff, 2400]]) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(['rgba(255,255,255,0.28)', 'rgba(255,255,255,0.08)', 'rgba(0,0,0,0)']), color: k[3], fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending })); s.position.set(k[0], k[1], k[2]); s.scale.setScalar(k[4]); sky.add(s); }
  const sn = low ? 200 : 380, sp = new Float32Array(sn * 6), SD = []; for (let i = 0; i < sn; i++) SD.push({ x: (R() * 2 - 1) * 120, y: (R() * 2 - 1) * 70, z: -260 + R() * 290, s: 70 + R() * 70 });
  const stg = new THREE.BufferGeometry(); stg.setAttribute('position', new THREE.BufferAttribute(sp, 3)); const st = DF.streaks = new THREE.LineSegments(stg, new THREE.LineBasicMaterial({ color: 0xbfd8ff, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); st.frustumCulled = false; st.userData.d = SD; root.add(st);
  const rg = new THREE.IcosahedronGeometry(1, 0), rm = new THREE.MeshLambertMaterial({ color: 0x8a8294, flatShading: true, emissive: 0x14121c }); DF.rocks = [];
  for (let i = 0; i < (low ? 8 : 16); i++) { const m = new THREE.Mesh(rg, rm), sx = R() < 0.5 ? -1 : 1; const s = 3 + R() * 9; m.scale.set(s * (0.8 + R() * 0.5), s * (0.7 + R() * 0.5), s * (0.8 + R() * 0.5)); m.userData = { x: sx * (62 + R() * 70), y: (R() * 2 - 1) * 55, z: -300 + R() * 330, v: 10 + R() * 14, rx: R() * 0.6, ry: R() * 0.6 }; m.rotation.set(R() * 3, R() * 3, R() * 3); root.add(m); DF.rocks.push(m); }
  DF.glow = glowTexture(['rgba(255,255,255,1)', 'rgba(255,255,255,0.45)', 'rgba(0,0,0,0)']);
  DF.shots = dfMkPool(40, () => { const m = new THREE.Mesh(dfCyl(), dfMat(0xfff0a0, 0.95)); m.scale.set(0.1, 0.1, 3.6); return { g: m, pos: new THREE.Vector3(), prev: new THREE.Vector3(), dir: new THREE.Vector3(), life: 0 }; });
  DF.bolts = dfMkPool(30, () => {
    const g = new THREE.Group(), o = new THREE.Mesh(dfCyl(), dfMat(0xff2a3a, 0.85)), i = new THREE.Mesh(dfCyl(), dfMat(0xffffff, 0.95)); o.scale.set(0.75, 0.75, 8); o.position.z = -8; i.scale.set(0.28, 0.28, 8); i.position.z = -8;
    const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: DF.glow, color: 0xff3040, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); h.scale.setScalar(5); g.add(o, i, h);
    return { g, pos: new THREE.Vector3(), dir: new THREE.Vector3(), spd: 70, near: false };
  });
  DF.tele = dfMkPool(5, () => ({ g: new THREE.Mesh(dfCyl(), dfMat(0xff2a2a, 0.5)) }));
  const bg = new THREE.Group(), bo = new THREE.Mesh(dfCyl(), dfMat(0xff3a2a, 0.55)), bi = new THREE.Mesh(dfCyl(), dfMat(0xffe8d0, 0.95)); bo.scale.set(1.5, 1.5, 420); bi.scale.set(0.55, 0.55, 420); bg.add(bo, bi); bg.visible = false; root.add(bg); DF.beam = { g: bg };
  dfBuildGuns(); dfBuildUfo();
}
function dfBuildGuns() {
  const G = DF.guns = new THREE.Group(), metal = new THREE.MeshLambertMaterial({ color: 0x4a5062, emissive: 0x10131c }), dark = new THREE.MeshLambertMaterial({ color: 0x1c1f2a });
  for (const z of [-1.05, 1.05]) {
    const g = new THREE.Group(), body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.3), metal), spin = new THREE.Group(), muz = new THREE.Object3D();
    body.position.x = 0.3; g.add(body);
    for (let i = 0; i < 4; i++) { const a = i / 4 * 6.283, b = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.3, 6), dark); b.rotation.z = Math.PI / 2; b.position.set(1.15, Math.cos(a) * 0.1, Math.sin(a) * 0.1); spin.add(b); }
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 10), metal); cap.rotation.z = Math.PI / 2; cap.position.x = 0.95; spin.add(cap);
    g.add(spin); muz.position.set(1.85, 0, 0); g.add(muz); g.position.set(0.7, -0.12, z); g.userData = { spin, muz }; G.add(g);
  }
  carRoot.add(G);
}
function dfFit(obj, size) { const box = new THREE.Box3().setFromObject(obj), s = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3()), h = new THREE.Group(); obj.position.sub(c); h.add(obj); h.scale.setScalar(size / Math.max(s.x, s.z, 0.0001)); return h; }
function dfBuildUfo() {
  const u = DF.ufo, g = u.g = new THREE.Group(), spin = u.spin = new THREE.Group(); g.add(spin); DF.root.add(g); u.ready = false;
  const done = (o) => { spin.add(o); u.ready = true; };
  const fb = () => { const f = alienFallback(); f.scale.setScalar(4.5); const h = new THREE.Group(); h.add(f); return h; };
  if (!THREE.GLTFLoader) { done(fb()); } else new THREE.GLTFLoader().load('game/assets/models/ufo.glb', (gl) => {
    const root = gl.scene; root.traverse((o) => { if (!o.isMesh) return; for (const m of (Array.isArray(o.material) ? o.material : [o.material])) { m.fog = false; if (m.metalness !== undefined) m.metalness = Math.min(m.metalness, 0.3); if (m.emissive) { m.emissive.copy(m.color).multiplyScalar(0.6); if (m.map) m.emissiveMap = m.map; } } });
    done(dfFit(root, 20));
  }, undefined, () => done(fb()));
  const cg = u.cg = new THREE.Sprite(new THREE.SpriteMaterial({ map: DF.glow, color: 0xff2030, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); cg.position.set(0, -2.4, 0); cg.scale.setScalar(2); g.add(cg);
  const hg = u.hg = new THREE.Sprite(new THREE.SpriteMaterial({ map: DF.glow, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); hg.scale.setScalar(26); g.add(hg);
  const ug = new THREE.Sprite(new THREE.SpriteMaterial({ map: DF.glow, color: 0x7dff6a, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); ug.position.y = -1.5; ug.scale.setScalar(16); g.add(ug);
}
function dfLeave() {
  if (typeof enCleanup === 'function') enCleanup();
  if (!DF.built) return; DF.built = false;
  for (const g of [DF.root, DF.sky]) if (g) { scene.remove(g); disposeGroup(g); }
  if (DF.guns && DF.guns.parent) DF.guns.parent.remove(DF.guns); DF.root = DF.sky = DF.guns = DF.beam = null; DF.shots = []; DF.bolts = []; DF.tele = []; DF.rocks = []; DF_CYL = null; DF.ufo.g = null; DF.atk = null; DF.noteOn = false; DF.mouse = DF.tfire = false;
  scene.fog = DF.fogSaved; camera.near = 0.1; camera.far = 900; camera.up.set(0, 1, 0); camera.updateProjectionMatrix();
  hemi.intensity = 1.2; sun.intensity = 1.1; sun.position.set(-30, 50, 40); levelGroup.visible = true; shadowHolder.visible = true; carRoot.rotation.set(0, 0, 0, 'XYZ'); carRoot.visible = true; carRoot.scale.set(1, 1, 1);
  document.body.classList.remove('dogfight', 'dfNoteOn', 'dfWarn'); const h2 = $('crashMenu').querySelector('h2'); if (h2) h2.textContent = 'Crashed';
}

/* ---------- run control ---------- */
function dfClearPools() { for (const s of DF.shots) { s.active = false; s.g.visible = false; } for (const b of DF.bolts) { b.active = false; b.g.visible = false; } for (const t of DF.tele) { t.active = false; t.g.visible = false; } if (DF.beam) DF.beam.g.visible = false; DF.atk = null; document.body.classList.remove('dfWarn'); }
function dfReset() {
  if (!DF.built) return; const u = DF.ufo;
  Object.assign(DF, { hits: 0, inv: 0, hurt: 0, fireT: 0, ut: 0, atkT: 2.6, lastKind: '', endBoom: false, camSnap: true, sub: 0, warn: false }); DF.p.set(0, 0, 0); DF.v.set(0, 0, 0); DF.fwd.set(0, 0, -1); DF.bank = 0;
  Object.assign(u, { hp: DF_HP, flash: 0, dead: false, ph: 1 }); u.pos.set(0, 0, DF_UFO_Z); u.vel.set(0, 0, 0); if (u.g) { u.g.visible = true; u.g.position.copy(u.pos); u.g.rotation.set(0, 0, 0); u.spin.rotation.set(0, 0, 0); }
  dfClearPools(); dfLivesHud(); finishT = 0; carRoot.visible = true; dfFlashEl.style.opacity = 0; dfSubEl.classList.remove('on');
  const h2 = $('crashMenu').querySelector('h2'); if (h2) h2.textContent = 'Crashed';
}
function dfStart() {
  dfBuild();
  if (vehicleById(vehicleId).rarity !== 'legendary') { vehicleId = owned.indexOf('hover2') >= 0 ? 'hover2' : 'hover'; applyStats(vehicleId); applyVehicle(vehicleId); }
  dfReset(); DF.noteOn = true; document.body.classList.add('dfNoteOn'); timeT = 0; crashes = 0; score = 0; UI.countdown.textContent = '';
}
function dfRespawn() { dfReset(); timeT = 0; DF.atkT = 2.2; dfSub('LEVEL RESET', 'Destroy the UFO', 1800); }
function dfMenuPose() { if (!DF.built) return; dfReset(); DF.noteOn = false; document.body.classList.remove('dfNoteOn'); }

/* ---------- ship ---------- */
function dfPlace(dt, live) {
  const u = DF.ufo, f = DF.fwd, to = _dA.copy(u.pos).sub(DF.p).normalize(); if (u.dead) to.set(0, 0, -1);
  _dB.copy(to).multiplyScalar(0.35).add(_dC.set(0, 0, -0.65)).normalize(); _dB.y += DF.v.y * 0.012; _dB.x += DF.v.x * 0.006; _dB.normalize(); f.lerp(_dB, 1 - Math.exp(-dt * 8)).normalize();
  _dC.crossVectors(f, _dUp).normalize(); _dD.crossVectors(_dC, f).normalize(); _dM.makeBasis(f, _dD, _dC); carRoot.quaternion.setFromRotationMatrix(_dM); carRoot.quaternion.multiply(_dQ.setFromAxisAngle(_dX, DF.bank));
  const t = DF.t, bob = live ? 0 : Math.sin(t * 1.8) * 0.2; carRoot.position.set(DF.p.x, DF.p.y + bob, DF.p.z); carRoot.scale.set(1, 1, 1);
  if (carMesh.hover.visible) carMesh.hover.position.y = -WCY * S + HOVER_Y + Math.sin(t * 5) * 0.05; if (carMesh.hover2.visible) carMesh.hover2.position.y = Math.sin(t * 5) * 0.06;
  carW.copy(carRoot.position);
}
function dfMuzzle(side, out) { carRoot.updateMatrixWorld(true); DF.guns.children[side].userData.muz.getWorldPosition(out); return out; }
function dfBoom(p, n, sc, hot) {
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, b = Math.acos(2 * Math.random() - 1), sp = (3 + Math.random() * 16) * sc; flame.emit(p.x, p.y, p.z, Math.cos(a) * Math.sin(b) * sp, Math.cos(b) * sp, Math.sin(a) * Math.sin(b) * sp, 0.6 + Math.random() * 0.9, 1.6 * sc, 6 * sc, 0.9, hot && Math.random() < 0.4 ? [0.7, 1, 0.5] : Math.random() < 0.5 ? [1, 0.6, 0.2] : [1, 0.9, 0.5]); }
  for (let i = 0; i < n / 2; i++) smoke.emit(p.x, p.y, p.z, (Math.random() - 0.5) * 10 * sc, (Math.random() - 0.5) * 10 * sc, (Math.random() - 0.5) * 10 * sc, 1.4, 2 * sc, 7 * sc, 0.5, [0.3, 0.28, 0.32]);
}
function dfShoot() {
  const u = DF.ufo, side = DF.side = 1 - DF.side, m = dfMuzzle(side, _dA), s = DF.shots.find((x) => !x.active); if (!s) return;
  const dist = m.distanceTo(u.pos); _dB.copy(u.pos).addScaledVector(u.vel, dist / DF_SHOT_V).sub(m).normalize();
  _dB.x += (Math.random() - 0.5) * 0.026; _dB.y += (Math.random() - 0.5) * 0.026; _dB.normalize();
  s.active = true; s.g.visible = true; s.pos.copy(m); s.prev.copy(m); s.dir.copy(_dB); s.life = 0.85; s.g.position.copy(m); s.g.lookAt(_dC.copy(m).add(_dB));
  flame.emit(m.x, m.y, m.z, 0, 0, 0, 0.07, 0.9, 0.2, 0.9, [1, 0.9, 0.5]); DF.gunSpin += 0.9; if (DF.sndT <= 0) { dfSnd('shot'); DF.sndT = 0.055; }
}
function dfHurt() {
  if (DF.inv > 0 || state !== 'playing') return; DF.hits++; DF.inv = 1.8; DF.hurt = 1; shake = 1; vibe(60, 'heavy'); dfSnd('hurt'); dfLivesHud(); dfBoom(DF.p, 26, 0.6, false);
  if (DF.hits >= DF_LIVES) dfDie(); else dfSub(DF.hits === 1 ? 'HIT!  2 HULL LEFT' : 'HIT!  1 HULL LEFT', 'One more and you are dead', 1500);
}
function dfDie() {
  crashes++; crashT = 0; carRoot.visible = false; dfBoom(DF.p, 90, 1.4, false); dfBoom(DF.p, 40, 0.8, false); dfSnd('boom'); dfClearPools();
  const h2 = $('crashMenu').querySelector('h2'); if (h2) h2.textContent = 'SHOT DOWN'; $('crashReason').textContent = 'The UFO hit you 3 times \u2014 Level 28 restarts'; setState('crashed');
}
function dfWin() {
  if (EN.active) return; const u = DF.ufo; u.dead = true; u.hp = 0; dfClearPools(); document.body.classList.remove('dfWarn'); score += 500; addCoins(40, 'style');
  if (state === 'crashed') { crashes = Math.max(0, crashes - 1); carRoot.visible = true; const h2 = $('crashMenu').querySelector('h2'); if (h2) h2.textContent = 'Crashed'; }
  DF.endBoom = false; enBegin(); dfSnd('boom'); dfSub('UFO DESTROYED', 'The alien will never bother Earth again', 2000); dfBoom(u.pos, 40, 1.2, true);
}

/* ---------- UFO attacks ---------- */
function dfCannon(o) { return o.copy(DF.ufo.pos).add(_dP.set(0, -2.4, 0)); }
function dfAim(origin, o) { return o.copy(DF.p).addScaledVector(DF.v, 0.42).sub(origin).normalize(); }
function dfStartAtk() {
  const ph = DF.ufo.ph, r = Math.random(); let a;
  if (ph === 1) a = r < 0.65 ? { kind: 'bolt', left: 0 } : { kind: 'bolt', left: 2 };
  else if (ph === 2) a = r < 0.4 ? { kind: 'fan', n: 3 } : r < 0.7 ? { kind: 'bolt', left: 2 } : { kind: 'sweep' };
  else a = r < 0.3 ? { kind: 'fan', n: 5 } : r < 0.5 ? { kind: 'bolt', left: 3 } : { kind: 'sweep' };
  if (a.kind === 'sweep' && DF.lastKind === 'sweep') a = { kind: 'fan', n: ph === 3 ? 5 : 3 }; DF.lastKind = a.kind;
  a.T = a.kind === 'sweep' ? [1.5, 1.3, 1.1][ph - 1] : [0.95, 0.8, 0.7][ph - 1]; a.t = 0; a.phase = 'tele'; a.dirs = []; a.axis = Math.random() < 0.5 ? 0 : 1; a.base = new THREE.Vector3();
  DF.atk = a; dfSnd('warn');
  if (a.kind === 'sweep') dfSub('SWEEPING BEAM', a.axis === 0 ? 'Dodge UP or DOWN' : 'Dodge LEFT or RIGHT', 1500);
}
function dfAimDirs(a) {
  dfCannon(_dCn); dfAim(_dCn, _dA); a.dirs.length = 0;
  if (a.kind === 'bolt') a.dirs.push(_dA.clone());
  else if (a.kind === 'fan') for (let i = 0; i < a.n; i++) a.dirs.push(_dA.clone().applyAxisAngle(_dUp, (i - (a.n - 1) / 2) * 0.17));
  else { a.base.copy(_dA); const ax = a.axis === 0 ? _dUp : _dB.crossVectors(_dA, _dUp).normalize(); for (const k of [-0.2, 0, 0.2]) a.dirs.push(_dA.clone().applyAxisAngle(ax, k)); }
}
function dfSetSeg(m, o, dir, len, rad) { m.position.copy(o); m.lookAt(_dP.copy(o).add(dir)); m.scale.set(rad, rad, len); }
function dfSpawnBolt(o, dir, spd) {
  const b = DF.bolts.find((x) => !x.active); if (!b) return; b.active = true; b.near = false; b.spd = spd; b.pos.copy(o).addScaledVector(dir, 3); b.dir.copy(dir); b.g.visible = true; b.g.position.copy(b.pos); b.g.lookAt(_dP.copy(b.pos).add(dir));
}
function dfEndAtk() { const ph = DF.ufo.ph; DF.atk = null; DF.atkT = [2.1, 1.65, 1.3][ph - 1] + Math.random() * 0.7; for (const t of DF.tele) { t.active = false; t.g.visible = false; } DF.beam.g.visible = false; document.body.classList.remove('dfWarn'); DF.warn = false; }
function dfAtk(dt) {
  const a = DF.atk, ph = DF.ufo.ph; dfCannon(_dCn);
  if (a.phase === 'tele') {
    a.t += dt; const k = Math.min(1, a.t / a.T);
    if (a.t < a.T * 0.62 || !a.dirs.length) dfAimDirs(a);
    DF.ufo.cg.scale.setScalar(2 + k * 9);
    DF.tele.forEach((t, i) => { const d = a.dirs[i]; t.active = !!d; t.g.visible = !!d; if (!d) return; const mid = a.kind === 'sweep' && i === 1; dfSetSeg(t.g, _dCn, d, 190, (0.05 + 0.2 * k) * (mid ? 1.6 : 1)); t.g.material.opacity = (0.25 + 0.55 * k) * (0.7 + 0.3 * Math.sin(DF.t * 38)) * (a.kind === 'sweep' && !mid ? 0.6 : 1); });
    if (!DF.warn) { DF.warn = true; document.body.classList.add('dfWarn'); }
    if (a.t >= a.T) {
      for (const t of DF.tele) { t.active = false; t.g.visible = false; }
      if (a.kind === 'sweep') { a.phase = 'beam'; a.bt = 0; dfSnd('beam'); document.body.classList.remove('dfWarn'); DF.warn = false; return; }
      const spd = [64, 76, 90][ph - 1]; for (const d of a.dirs) dfSpawnBolt(_dCn, d, spd); dfSnd('laser'); DF.ufo.cg.scale.setScalar(2);
      document.body.classList.remove('dfWarn'); DF.warn = false;
      if (a.left > 0) { a.left--; a.t = 0; a.T = 0.5; a.dirs.length = 0; } else dfEndAtk();
    }
  } else if (a.phase === 'beam') {
    a.bt += dt; const D = 0.95, f = Math.min(1, a.bt / D), ang = -0.2 + 0.4 * f, ax = a.axis === 0 ? _dUp : _dB.crossVectors(a.base, _dUp).normalize(), dir = _dC.copy(a.base).applyAxisAngle(ax, ang);
    dfSetSeg(DF.beam.g, _dCn, dir, 1, 1); DF.beam.g.scale.set(1, 1, 1); DF.ufo.cg.scale.setScalar(11 + Math.sin(DF.t * 50));
    DF.beam.g.visible = true; const w = 0.85 + 0.15 * Math.sin(DF.t * 60); DF.beam.g.children[0].scale.set(1.5 * w, 1.5 * w, 420); DF.beam.g.children[1].scale.set(0.55, 0.55, 420);
    _dA.copy(DF.p).sub(_dCn); const along = _dA.dot(dir); if (along > 0 && _dD.crossVectors(_dA, dir).length() < 2.3) dfHurt();
    if (a.bt >= D) { DF.ufo.cg.scale.setScalar(2); dfEndAtk(); }
  }
}

/* ---------- simulation ---------- */
function dfUfoMove(dt) {
  const u = DF.ufo, m = [1, 1.3, 1.65][u.ph - 1], slow = DF.atk && DF.atk.kind === 'sweep' ? 0.35 : 1; DF.ut += dt * m * slow; const t = DF.ut;
  _dA.copy(u.pos); u.pos.set(Math.sin(t * 0.55) * 32 + Math.sin(t * 1.3) * 7 + DF.p.x * 0.3, Math.sin(t * 0.8 + 1) * 13 + Math.sin(t * 1.7) * 3, DF_UFO_Z + Math.sin(t * 0.45) * 10);
  if (dt > 0) u.vel.copy(u.pos).sub(_dA).multiplyScalar(1 / dt);
}
function dfUfoVis(dt) {
  const u = DF.ufo; if (!u.g) return; u.g.position.copy(u.pos); u.g.position.y += Math.sin(DF.t * 2) * 0.3; u.spin.rotation.y += dt * (u.dead ? 5 : 0.9);
  u.g.rotation.z += (dfClamp(-u.vel.x * 0.012, -0.35, 0.35) - u.g.rotation.z) * (1 - Math.exp(-dt * 5)); u.g.rotation.x += (dfClamp(u.vel.y * 0.01, -0.3, 0.3) - u.g.rotation.x) * (1 - Math.exp(-dt * 5));
  u.flash = Math.max(0, u.flash - dt); u.hg.material.opacity = u.flash > 0 ? 0.55 * (u.flash / 0.09) : 0; if (!DF.atk && u.cg) u.cg.scale.setScalar(2 + Math.sin(DF.t * 4) * 0.2);
}
function dfShots(dt) {
  const u = DF.ufo;
  for (const s of DF.shots) {
    if (!s.active) continue; s.prev.copy(s.pos); s.pos.addScaledVector(s.dir, DF_SHOT_V * dt); s.life -= dt; s.g.position.copy(s.pos);
    if (!u.dead) { _dA.copy(s.pos).sub(s.prev); const l2 = _dA.lengthSq() || 1e-6, t = dfClamp(_dB.copy(u.pos).sub(s.prev).dot(_dA) / l2, 0, 1); _dC.copy(s.prev).addScaledVector(_dA, t); if (_dC.distanceTo(u.pos) < DF_UFO_R) {
      s.active = false; s.g.visible = false; u.hp--; u.flash = 0.09; score += 10; flame.emit(_dC.x, _dC.y, _dC.z, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, 6 + Math.random() * 6, 0.35, 0.8, 2.8, 0.9, [1, 0.75, 0.3]);
      if (DF.sndT <= 0.02) { dfSnd('hit'); DF.sndT = 0.05; }
      const ph = u.hp / DF_HP > 0.66 ? 1 : u.hp / DF_HP > 0.33 ? 2 : 3;
      if (ph !== u.ph) { u.ph = ph; dfSub(ph === 2 ? 'UFO ENRAGED' : 'UFO CRITICAL', ph === 2 ? 'Faster, deadlier lasers' : 'Fan lasers and sweeping beams', 2300); dfBoom(u.pos, 18, 0.9, false); }
      if (u.hp <= 0) { dfWin(); return; } continue;
    } }
    if (s.life <= 0) { s.active = false; s.g.visible = false; }
  }
}
function dfBolts(dt) {
  for (const b of DF.bolts) {
    if (!b.active) continue; b.pos.addScaledVector(b.dir, b.spd * dt); b.g.position.copy(b.pos);
    _dA.copy(b.pos).addScaledVector(b.dir, -7); _dB.copy(b.pos).sub(_dA); const l2 = _dB.lengthSq(), t = dfClamp(_dC.copy(DF.p).sub(_dA).dot(_dB) / l2, 0, 1), d = _dC.copy(_dA).addScaledVector(_dB, t).distanceTo(DF.p);
    if (d < 2.1) { b.active = false; b.g.visible = false; dfHurt(); continue; }
    if (!b.near && d < 6.5 && b.pos.z > DF.p.z - 6) { b.near = true; if (DF.inv <= 0) { score += 50; pop('CLOSE CALL +50', 'flip', 800); } }
    if (b.pos.z > 40 || b.pos.distanceTo(DF.p) > 260) { b.active = false; b.g.visible = false; }
  }
}
function dfWorld(dt) {
  const D = DF.streaks.userData.d, arr = DF.streaks.geometry.attributes.position.array, cx = DF.p.x * 0.5, cy = DF.p.y * 0.5;
  for (let i = 0; i < D.length; i++) { const d = D[i]; d.z += d.s * dt; if (d.z > 30) { d.z = -260; d.x = (Math.random() * 2 - 1) * 120; d.y = (Math.random() * 2 - 1) * 70; } const L = 3 + d.s * 0.12; arr[i * 6] = arr[i * 6 + 3] = d.x + cx; arr[i * 6 + 1] = arr[i * 6 + 4] = d.y + cy; arr[i * 6 + 2] = d.z; arr[i * 6 + 5] = d.z - L; }
  DF.streaks.geometry.attributes.position.needsUpdate = true;
  for (const m of DF.rocks) { const d = m.userData; d.z += d.v * dt; if (d.z > 50) { d.z = -320; d.y = (Math.random() * 2 - 1) * 55; } m.position.set(d.x, d.y, d.z); m.rotation.x += d.rx * dt; m.rotation.y += d.ry * dt; }
  DF.planet.userData.sph.rotation.y += dt * 0.01;
}
function dfExhaust() {
  if (!carRoot.visible) return; carRoot.updateMatrixWorld(true);
  for (let i = 0; i < 2; i++) { _dA.set(-2.2, 0.05, (Math.random() - 0.5) * 0.8); carRoot.localToWorld(_dA); flame.emit(_dA.x, _dA.y, _dA.z, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2, 7, 0.32, 0.9, 0.12, 0.9, Math.random() < 0.5 ? [1, 0.62, 0.22] : [0.45, 0.8, 1]); }
}
function dfSim(dt) {
  const k = keys; let ix = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0) + DF.tj.x, iy = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) + DF.tj.y; const l = Math.hypot(ix, iy); if (l > 1) { ix /= l; iy /= l; }
  const a = 1 - Math.exp(-dt * 7); DF.v.x += (ix * DF_SPEED - DF.v.x) * a; DF.v.y += (iy * DF_SPEED - DF.v.y) * a;
  DF.p.x = dfClamp(DF.p.x + DF.v.x * dt, -DF_BX, DF_BX); DF.p.y = dfClamp(DF.p.y + DF.v.y * dt, -DF_BY, DF_BY); if (Math.abs(DF.p.x) >= DF_BX) DF.v.x = 0; if (Math.abs(DF.p.y) >= DF_BY) DF.v.y = 0;
  DF.bank += (ix * 0.55 - DF.bank) * (1 - Math.exp(-dt * 6)); if (DF.inv > 0) DF.inv -= dt; DF.hurt = Math.max(0, DF.hurt - dt * 1.6); DF.sndT -= dt;
  dfUfoMove(dt); if (!DF.atk) { DF.atkT -= dt; if (DF.atkT <= 0) dfStartAtk(); } else dfAtk(dt);
  dfPlace(dt, true);
  const firing = k.Space || DF.mouse || DF.tfire; DF.fireT -= dt;
  if (firing) { while (DF.fireT <= 0) { dfShoot(); DF.fireT += 1 / DF_RATE; } } else DF.fireT = Math.max(DF.fireT, 0);
  DF.guns.children.forEach((g) => { g.userData.spin.rotation.x = DF.gunSpin; }); if (!firing) DF.gunSpin += dt * 2;
  dfShots(dt); if (state !== 'playing') return; dfBolts(dt); dfUfoVis(dt); dfWorld(dt); dfExhaust();
  if (DF.inv > 0) carRoot.visible = Math.floor(DF.inv * 14) % 2 === 0; else carRoot.visible = true;
}
function dfIdle(dt) {
  const u = DF.ufo; dfUfoMove(dt * 0.5); dfPlace(dt, false); dfUfoVis(dt); dfWorld(dt); DF.v.set(0, 0, 0); DF.bank *= Math.exp(-dt * 4); if (state !== 'crashed') carRoot.visible = true; if (state === 'countdown' || state === 'results') dfExhaust();
  DF.guns.children.forEach((g) => { g.userData.spin.rotation.x = DF.gunSpin; });
}
function dfEnding(dt) {
  const u = DF.ufo, t = enAge(); finishT = t; EN.slow = t < 1.2 ? 0.3 : 0.3 + 0.7 * dfSS((t - 1.2) / 0.7); const sd = dt * EN.slow;
  DF.v.multiplyScalar(Math.exp(-sd * 2)); DF.p.addScaledVector(DF.v, sd); dfPlace(sd, false); dfWorld(sd); carRoot.visible = true;
  if (!DF.endBoom) {
    u.pos.y -= sd * 1.2; u.pos.x += (Math.random() - 0.5) * 0.3; dfUfoVis(sd);
    if (Math.random() < sd * 22) { _dA.copy(u.pos).add(_dB.set((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 16)); dfBoom(_dA, 12, 0.7, false); }
    if (t > 0.4 && Math.random() < sd * 5) dfSnd('boom');
    if (t >= 1.2) { DF.endBoom = true; u.g.visible = false; dfBoom(u.pos, 160, 2.6, true); dfBoom(u.pos, 80, 1.6, false); dfSnd('boom'); try { Snd.noise(1.2, 0.5, 500); } catch (e) {} dfFlashEl.style.opacity = 1; shake = 1; }
  }
  if (DF.endBoom) dfFlashEl.style.opacity = Math.max(0, +dfFlashEl.style.opacity - dt * 0.9);
  if (t >= 1.9) enGo('credits');
}
function dfTick(dt) {
  startLine.group.visible = false; shadowHolder.visible = false; slg && slg.clearRect(0, 0, slc.width, slc.height);
  enUpdate(); const st = state; if (st !== 'paused') DF.t += dt;
  if (st === 'countdown') {
    if (!DF.noteOn) {
      countdownT -= dt; const n = Math.min(99, Math.ceil(countdownT - 0.2));
      if (n !== lastCount) { lastCount = n; const el = UI.countdown; el.textContent = n > 0 ? String(n) : 'GO!'; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); if (n > 0) Snd.beep(); else Snd.go(); }
      if (n <= 0) { setState('playing'); UI.countdown.classList.remove('hidden'); setTimeout(() => UI.countdown.classList.add('hidden'), 700); dfSub('FIGHT!', 'Hold SPACE / click to fire', 1800); }
    }
    dfIdle(dt);
  } else if (st === 'playing') { timeT += dt; dfSim(dt); }
  else if (st === 'victory') dfEnding(dt);
  else if (st === 'cinematic' || st === 'end') enScene(dt);
  else if (st === 'crashed') { crashT += dt; if (crashT > 3.2) retry(); else { dfUfoMove(dt); dfUfoVis(dt); dfWorld(dt); } }
  else if (st !== 'paused') dfIdle(dt);
  if (st !== 'paused') { const pd = st === 'victory' ? dt * EN.slow : dt; smoke.update(pd); flame.update(pd); dust.update(pd); sparks.update(pd); }
  popT = Math.max(0, popT - dt * 3.4); squash *= Math.exp(-dt * 7); kick *= Math.exp(-dt * 8); fxA += (0 - fxA) * (1 - Math.exp(-dt * 7)); garageFx.visible = false;
  if (DF.sky) { DF.sky.position.copy(camera.position); }
  Snd.engine(st === 'playing' ? 18 : 6, st === 'playing', st === 'playing' || st === 'countdown');
  updateCamera(dt); dfHud(dt);
}
function dfCamera(dt) {
  if (state === 'cinematic' || state === 'end') { enCamera(dt); return; }
  const mf = settings.shake ? 1 : 0, st = state, u = DF.ufo; let px, py, pz, lx, ly, lz, fov = 66;
  if (DF.camSnap) { DF.cam.set(DF.p.x * 0.85, DF.p.y * 0.85, 0); DF.camSnap = false; }
  DF.cam.x += (DF.p.x * 0.85 - DF.cam.x) * (1 - Math.exp(-dt * 4)); DF.cam.y += (DF.p.y * 0.85 - DF.cam.y) * (1 - Math.exp(-dt * 4));
  px = DF.cam.x; py = DF.cam.y + 3.6; pz = 13.5; lx = DF.p.x * 0.7 + u.pos.x * 0.3; ly = DF.p.y * 0.6 + u.pos.y * 0.4 + 1; lz = -40;
  if (st === 'victory') { const e = dfSS(finishT / 2.4); px += (u.pos.x + 26 - px) * e; py += (u.pos.y + 7 - py) * e; pz += (u.pos.z + 52 - pz) * e; lx += (u.pos.x - lx) * e; ly += (u.pos.y - ly) * e; lz += (u.pos.z - lz) * e; fov = 66 - e * 12; }
  const sx = shake > 0 ? (Math.random() - 0.5) * shake * mf * 0.8 : 0, sy = shake > 0 ? (Math.random() - 0.5) * shake * mf * 0.8 : 0; shake = Math.max(0, shake - dt * 1.6);
  if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * 0.08; camera.updateProjectionMatrix(); }
  camera.up.set(0, 1, 0); camera.position.set(px + sx, py + sy, pz); camera.lookAt(lx, ly, lz);
}
function dfProj(v, o) { _dP.copy(v).project(camera); o.x = (_dP.x * 0.5 + 0.5) * innerWidth; o.y = (-_dP.y * 0.5 + 0.5) * innerHeight; o.on = _dP.z < 1; return o; }
const _dS = { x: 0, y: 0, on: false };
function dfHud(dt) {
  const u = DF.ufo, live = state === 'playing' || state === 'countdown' || state === 'paused' || state === 'crashed';
  if (DF.sub > 0) { DF.sub -= dt; if (DF.sub <= 0) dfSubEl.classList.remove('on'); }
  dfVigEl.style.opacity = (DF.hurt * 0.8 + (DF.hits >= 2 ? 0.25 : 0)).toFixed(2); dfWarnEl.classList.toggle('on', DF.warn && state === 'playing');
  if (DF.atk && DF.atk.kind === 'sweep') dfWarnEl.querySelector('b').textContent = 'SWEEPING BEAM'; else dfWarnEl.querySelector('b').textContent = 'LASER INCOMING';
  camera.updateMatrixWorld(); camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  const show = live && !u.dead && u.g && u.g.visible; dfBossEl.style.display = show ? 'block' : 'none'; dfLockEl.style.display = show && state === 'playing' ? 'block' : 'none';
  if (show) {
    _dA.copy(u.pos); _dA.y += 12.5; dfProj(_dA, _dS); dfBossEl.style.transform = 'translate(' + _dS.x.toFixed(1) + 'px,' + _dS.y.toFixed(1) + 'px) translate(-50%,-100%)'; dfBossEl.style.visibility = _dS.on ? 'visible' : 'hidden';
    const r = dfClamp(u.hp / DF_HP, 0, 1); dfBossFill.style.width = (r * 100).toFixed(1) + '%'; dfBossEl.classList.toggle('low', r < 0.33); dfBossPct.textContent = Math.ceil(r * 100) + '%';
    dfProj(u.pos, _dS); const sz = 70 * dfClamp(80 / Math.max(20, camera.position.distanceTo(u.pos)), 0.5, 2); dfLockEl.style.width = dfLockEl.style.height = sz.toFixed(0) + 'px'; dfLockEl.style.transform = 'translate(' + _dS.x.toFixed(1) + 'px,' + _dS.y.toFixed(1) + 'px) translate(-50%,-50%)'; dfLockEl.style.visibility = _dS.on ? 'visible' : 'hidden';
  }
  DF.hudT -= dt; if (DF.hudT > 0) return; DF.hudT = 0.05;
  if (state === 'playing' || state === 'paused') { $('timer').textContent = fmt(timeT); $('cp').textContent = 'UFO ' + Math.ceil(dfClamp(u.hp / DF_HP, 0, 1) * 100) + '%  \u00B7  Hull ' + (DF_LIVES - DF.hits) + '/' + DF_LIVES; $('score').textContent = score; const bl = bests[level]; $('bestHud').textContent = 'Best ' + (bl === undefined || bl === null ? '--:--.-' : fmt(bl)); $('progress').style.width = ((1 - dfClamp(u.hp / DF_HP, 0, 1)) * 100).toFixed(1) + '%'; }
}

/* ---------- level card preview ---------- */
function drawDogPreview(cv, L, n) {
  const w = cv.width = 320, h = cv.height = 420, g = cv.getContext('2d'), r = spaceBG(g, w, h, n), H = h * 0.62;
  spacePlanetDraw(g, 'ocean', w * 0.2, H * 1.05, H * 0.45, false);
  g.save(); g.translate(w * 0.68, H * 0.3); const sh = g.createRadialGradient(0, 14, 2, 0, 14, 70); sh.addColorStop(0, 'rgba(125,255,106,.55)'); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.fillRect(-80, -50, 160, 150);
  const bd = g.createLinearGradient(0, -8, 0, 22); bd.addColorStop(0, '#e6eef6'); bd.addColorStop(1, '#5a6678'); g.fillStyle = bd; g.beginPath(); g.ellipse(0, 6, 52, 14, 0, 0, 7); g.fill();
  g.fillStyle = 'rgba(125,255,170,.85)'; g.beginPath(); g.ellipse(0, -2, 22, 17, 0, Math.PI, 0); g.fill(); g.fillStyle = '#ff2a3a'; g.shadowColor = '#ff2a3a'; g.shadowBlur = 14; g.beginPath(); g.arc(0, 20, 5, 0, 7); g.fill(); g.restore();
  g.save(); g.strokeStyle = '#ff2a3a'; g.shadowColor = '#ff2a3a'; g.shadowBlur = 12; g.lineWidth = 3; g.beginPath(); g.moveTo(w * 0.68, H * 0.3 + 20); g.lineTo(w * 0.3, H * 0.86); g.stroke(); g.lineWidth = 2; g.beginPath(); g.moveTo(w * 0.68, H * 0.3 + 20); g.lineTo(w * 0.4, H * 0.95); g.stroke(); g.restore();
  g.save(); g.translate(w * 0.28, H * 0.9); g.rotate(-0.25); g.shadowColor = '#35e6ff'; g.shadowBlur = 14; g.fillStyle = '#eaf9ff'; g.beginPath(); g.moveTo(30, 0); g.lineTo(-12, -11); g.lineTo(-7, 0); g.lineTo(-12, 11); g.closePath(); g.fill(); g.fillStyle = '#35e6ff'; g.fillRect(-2, -2, 10, 4);
  g.strokeStyle = '#ffe9a0'; g.lineWidth = 2; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(40 + i * 22, -3 + i * 2); g.lineTo(50 + i * 22, -3 + i * 2); g.stroke(); } g.restore();
}
