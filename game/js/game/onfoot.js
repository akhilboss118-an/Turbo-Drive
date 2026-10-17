/* eslint-disable */
'use strict';
/* Level 26 - PLUTO SURVIVAL (on foot): the astronaut leaves the hover, gathers crystals, builds a base, fights Pluto creatures and waits for the alien to return. Third-person shooter, Mixamo animations. */
const FB = { x0: -56, x1: 56, z0: -62, z1: 150 }, HOVER_AT = { x: 0, z: -34 }, BASE_AT = { x: 8, z: -12 }, MAG = 30, FIRE_CD = 0.13, BUILD_COST = [6, 8, 10], SIGNAL_SECS = 300;
const FT = { on: false, built: false, started: false, fogSaved: null, p: new THREE.Vector3(), yaw: 0, camYaw: 0, camPitch: 0.18, charYaw: 0, moving: false, sprint: false, firing: false, fireT: 0, aimT: 0, reloading: false, reloadT: 0, kick: 0, flashT: 0,
  hp: 100, o2: 100, ammo: MAG, reserve: 90, mats: 0, built3: 0, signal: 0, wave: 0, waveT: 0, grace: 0, kills: 0, supplyT: 0, biteT: 0, hurtT: 0, safe: false, enemies: [], pickups: [], nodes: [], cols: [], tracers: [], tj: { x: 0, y: 0 }, touch: { fire: false }, lock: false, hudT: 0, endT: 0, ending: false, pieceT: [0, 0, 0], anim: '', lastPrompt: '', warned: 0, deaths: 0, arrow: 0 };
const _ftV = new THREE.Vector3(), _ftV2 = new THREE.Vector3(), _ftD = new THREE.Vector3(), _ftR = new THREE.Vector3();
const ftSS = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const ftRnd = (() => { let s = 2626; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; })();
const footGround = (x, z) => pcHeight(x, z);
const footOn = () => !!(LEVELS[level] && LEVELS[level].onfoot);
const footLive = () => state === 'countdown' || state === 'playing' || state === 'paused' || state === 'crashed' || state === 'finishing';
function ftSnd(k) {
  try {
    if (k === 'shot') { Snd.noise(0.1, 0.45, 4200); Snd.tone(180, 0.1, 'square', 0.12, 0.4); }
    else if (k === 'empty') Snd.tone(900, 0.04, 'square', 0.08);
    else if (k === 'hit') Snd.tone(520, 0.06, 'triangle', 0.12, 1.3);
    else if (k === 'die') { Snd.noise(0.25, 0.4, 900); Snd.tone(140, 0.25, 'sawtooth', 0.12, 0.4); }
    else if (k === 'bite') { Snd.noise(0.12, 0.5, 1800); Snd.tone(90, 0.18, 'square', 0.16, 0.5); }
    else if (k === 'reload') { Snd.tone(420, 0.05, 'square', 0.1); setTimeout(() => Snd.tone(620, 0.05, 'square', 0.1), 900); setTimeout(() => Snd.tone(300, 0.08, 'square', 0.12), 1750); }
    else if (k === 'pick') Snd.coin && Snd.coin(2);
    else if (k === 'build') { Snd.nitro && Snd.nitro(); }
  } catch (e) {}
}

/* ---------- scene ---------- */
function footBuild() {
  if (FT.built) return;
  FT.built = true; FT.on = true; pcBuild();
  const low = settings.quality === 'low', W = FT.world = new THREE.Group(); scene.add(W);
  FT.fogSaved = scene.fog; scene.fog = new THREE.Fog(0x2a2444, 70, 430);
  if (scene.background && scene.background.dispose) scene.background.dispose(); scene.background = new THREE.Color(0x07050f);
  camera.near = 0.1; camera.far = 6000; camera.updateProjectionMatrix();
  hemi.color.setHex(0x9a90c8); hemi.groundColor.setHex(0x2a2238); hemi.intensity = 1.05; sun.color.setHex(0xffe6cc); sun.intensity = 1.5; sun.position.set(-60, 40, 90);
  levelGroup.visible = false; document.body.classList.add('foot'); PC.G.position.set(0, 0, 0); PC.G.visible = true;
  const sky = FT.sky = new THREE.Group(); scene.add(sky);
  const n = low ? 1500 : 3000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { let x, y, z; do { x = ftRnd() * 2 - 1; y = ftRnd() * 2 - 1; z = ftRnd() * 2 - 1; } while (x * x + y * y + z * z > 1 || x * x + y * y + z * z < 0.1 || y < -0.05); const l = Math.hypot(x, y, z); pos.set([x / l * 4500, y / l * 4500, z / l * 4500], i * 3); const b = 0.55 + ftRnd() * 0.45; col.set([b, b * 0.95, b * (ftRnd() < 0.3 ? 0.8 : 1)], i * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 1.8, sizeAttenuation: false, vertexColors: true, fog: false, transparent: true, depthWrite: false })); stars.frustumCulled = false; sky.add(stars);
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const g = cv.getContext('2d'); g.fillStyle = '#8f8a92'; g.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 160; i++) { g.fillStyle = 'rgba(' + (60 + ftRnd() * 90 | 0) + ',' + (55 + ftRnd() * 70 | 0) + ',' + (60 + ftRnd() * 70 | 0) + ',' + (0.2 + ftRnd() * 0.4) + ')'; g.beginPath(); g.ellipse(ftRnd() * 256, ftRnd() * 128, 3 + ftRnd() * 18, 2 + ftRnd() * 9, ftRnd() * 3, 0, 7); g.fill(); }
  g.fillStyle = 'rgba(120,70,60,.55)'; g.fillRect(0, 0, 256, 22);
  const charon = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 20), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), fog: false })); charon.position.set(-1500, 1150, 2400); charon.rotation.y = 0.8; sky.add(charon); FT.charon = charon;
  const sunS = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(['rgba(255,250,235,1)', 'rgba(255,220,170,0.35)', 'rgba(0,0,0,0)']), fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending })); sunS.position.set(2200, 520, -2600); sunS.scale.setScalar(520); sky.add(sunS);
  // boulders + collision circles
  const bm = new THREE.MeshLambertMaterial({ color: 0xc8d2e6, flatShading: true, emissive: 0x181a2c }), bg = new THREE.IcosahedronGeometry(1, 0);
  const free = (x, z, r) => Math.hypot(x - HOVER_AT.x, z - HOVER_AT.z) > 11 + r && Math.hypot(x - BASE_AT.x, z - BASE_AT.z) > 13 + r && Math.hypot(x - 3.6, z + 30) > 6;
  for (let i = 0; i < 26; i++) {
    const x = FB.x0 + 4 + ftRnd() * (FB.x1 - FB.x0 - 8), z = FB.z0 + 6 + ftRnd() * (FB.z1 - FB.z0 - 8), s = 1 + ftRnd() * 2.6; if (!free(x, z, s)) continue;
    const m = new THREE.Mesh(bg, bm); m.scale.set(s * (0.9 + ftRnd() * 0.5), s * (0.7 + ftRnd() * 0.5), s * (0.9 + ftRnd() * 0.5)); m.position.set(x, footGround(x, z) + s * 0.35, z); m.rotation.set(ftRnd() * 3, ftRnd() * 3, ftRnd() * 3); W.add(m); FT.cols.push({ x, z, r: s * 0.95 });
  }
  FT.cols.push({ x: 0, z: -35.4, r: 1.9 }, { x: 0, z: -32.6, r: 1.9 });
  // crystal nodes
  const cm = new THREE.MeshBasicMaterial({ color: 0x8af4ff, fog: true }), cg = new THREE.ConeGeometry(0.28, 1.4, 5), gl = glowTexture(['rgba(120,240,255,0.9)', 'rgba(60,170,255,0.3)', 'rgba(0,0,0,0)']);
  for (let i = 0, tries = 0; i < 20 && tries < 400; tries++) {
    const x = FB.x0 + 6 + ftRnd() * (FB.x1 - FB.x0 - 12), z = FB.z0 + 8 + ftRnd() * (FB.z1 - FB.z0 - 12); if (!free(x, z, 3) || FT.nodes.some((q) => Math.hypot(q.x - x, q.z - z) < 14)) continue; i++;
    const gr = new THREE.Group(); for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(cg, cm); c.position.set((k - 1) * 0.35, 0.6 + (k === 1 ? 0.25 : 0), (k % 2) * 0.25); c.rotation.set((ftRnd() - 0.5) * 0.5, 0, (ftRnd() - 0.5) * 0.6); c.scale.setScalar(0.8 + ftRnd() * 0.6); gr.add(c); }
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: gl, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false })); sp.scale.setScalar(3.4); sp.position.y = 0.9; gr.add(sp);
    gr.position.set(x, footGround(x, z), z); W.add(gr); FT.nodes.push({ x, z, g: gr, got: false });
  }
  // base site marker
  const ring = FT.ring = new THREE.Mesh(new THREE.RingGeometry(6.2, 6.7, 48), new THREE.MeshBasicMaterial({ color: 0x35e6ff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false, fog: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(BASE_AT.x, footGround(BASE_AT.x, BASE_AT.z) + 0.12, BASE_AT.z); W.add(ring);
  const beam = FT.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 60, 10, 1, true), new THREE.MeshBasicMaterial({ color: 0x35e6ff, transparent: true, opacity: 0.25, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); beam.position.set(BASE_AT.x, 30, BASE_AT.z); W.add(beam);
  const sup = FT.supply = new THREE.Mesh(new THREE.RingGeometry(8.2, 8.6, 48), new THREE.MeshBasicMaterial({ color: 0xffb04a, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false, fog: false })); sup.rotation.x = -Math.PI / 2; sup.position.set(HOVER_AT.x, 0.4, HOVER_AT.z); W.add(sup);
  footBuildPieces(W); footBuildEnemyAssets(); footBuildFx(W);
  footPlaceHover();
  if (huntOn()) huntBuild(W);
}
function footBuildPieces(W) {
  const P = FT.pieces = [], gy = footGround(BASE_AT.x, BASE_AT.z);
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.26, roughness: 0.1, metalness: 0.3, side: THREE.DoubleSide, depthWrite: false, emissive: 0x1a3a5a });
  const dome = new THREE.Group(); const sh = new THREE.Mesh(new THREE.SphereGeometry(6.4, 28, 14, 0, 6.283, 0, 1.5708), glass); dome.add(sh);
  const base = new THREE.Mesh(new THREE.TorusGeometry(6.4, 0.32, 8, 40), new THREE.MeshStandardMaterial({ color: 0xff7a2e, emissive: 0x4a1a00, roughness: 0.5 })); base.rotation.x = Math.PI / 2; dome.add(base);
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283, r = new THREE.Mesh(new THREE.TorusGeometry(6.4, 0.07, 6, 24, 3.1416), new THREE.MeshStandardMaterial({ color: 0xdfe8f5, roughness: 0.4 })); r.rotation.y = a; dome.add(r); }
  const bed = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 1.1), new THREE.MeshStandardMaterial({ color: 0xe9edf5, roughness: 0.6 })); bed.position.set(-2.4, 0.3, 1.5); dome.add(bed);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff0c0 })); lamp.position.set(0, 4.6, 0); dome.add(lamp);
  dome.position.set(BASE_AT.x, gy, BASE_AT.z); dome.userData.name = 'SHELTER'; P.push(dome);
  const gen = new THREE.Group(), pm = new THREE.MeshStandardMaterial({ color: 0x1c3a8a, emissive: 0x0a1a4a, roughness: 0.3, metalness: 0.6 });
  const unit = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 1.6), new THREE.MeshStandardMaterial({ color: 0xcfd6e4, roughness: 0.5 })); unit.position.y = 0.9; gen.add(unit);
  for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 1.7), pm); p.position.set((i - 1) * 2.8, 1.5, 2.4); p.rotation.x = -0.5; gen.add(p); const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.5, 6), new THREE.MeshStandardMaterial({ color: 0x888fa0 })); leg.position.set((i - 1) * 2.8, 0.75, 2.1); gen.add(leg); }
  const lt = new THREE.PointLight(0xffd9a0, 1.1, 48, 1.6); lt.position.set(0, 5, 0); gen.add(lt); const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe9b0 })); bulb.position.y = 4; gen.add(bulb);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 4, 6), new THREE.MeshStandardMaterial({ color: 0x888fa0 })); mast.position.y = 2 + 0.9; gen.add(mast);
  gen.position.set(BASE_AT.x + 9, footGround(BASE_AT.x + 9, BASE_AT.z + 3), BASE_AT.z + 3); gen.userData.name = 'POWER'; P.push(gen); FT.cols.push({ x: BASE_AT.x + 9, z: BASE_AT.z + 3, r: 1.6, piece: 1 });
  const bc = new THREE.Group(), mast2 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.4, 9, 8), new THREE.MeshStandardMaterial({ color: 0xdfe8f5, roughness: 0.4 })); mast2.position.y = 4.5; bc.add(mast2);
  const dish = new THREE.Mesh(new THREE.SphereGeometry(1.5, 14, 8, 0, 6.283, 0, 1.2), new THREE.MeshStandardMaterial({ color: 0xff7a2e, emissive: 0x3a1400, side: THREE.DoubleSide })); dish.position.y = 9; dish.rotation.x = Math.PI - 0.5; bc.add(dish);
  const bl = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff3a3a })); bl.position.y = 9.9; bc.add(bl); FT.blink = bl;
  const bm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 80, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xff6a4a, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); bm2.position.y = 49; bc.add(bm2);
  bc.position.set(BASE_AT.x - 9, footGround(BASE_AT.x - 9, BASE_AT.z + 4), BASE_AT.z + 4); bc.userData.name = 'BEACON'; P.push(bc); FT.cols.push({ x: BASE_AT.x - 9, z: BASE_AT.z + 4, r: 0.8, piece: 2 });
  for (const p of P) { p.visible = false; W.add(p); }
}
function footBuildEnemyAssets() {
  const A = FT.A = {};
  A.bodyG = new THREE.SphereGeometry(0.5, 12, 8); A.legG = new THREE.CylinderGeometry(0.035, 0.05, 0.75, 5); A.legG.translate(0, -0.375, 0); A.spikeG = new THREE.ConeGeometry(0.1, 0.4, 5); A.eyeG = new THREE.SphereGeometry(0.07, 6, 5);
  A.mats = { crawler: [new THREE.MeshLambertMaterial({ color: 0x4a3a78, emissive: 0x1a0a38 }), new THREE.MeshLambertMaterial({ color: 0xcfe6ff, emissive: 0x30445a }), new THREE.MeshBasicMaterial({ color: 0x5affd8 })], brute: [new THREE.MeshLambertMaterial({ color: 0x78303a, emissive: 0x380a14 }), new THREE.MeshLambertMaterial({ color: 0xffd0c8, emissive: 0x5a3030 }), new THREE.MeshBasicMaterial({ color: 0xff3a3a })] };
}
function footMakeEnemy(type) {
  const M = FT.A.mats[type], g = new THREE.Group(), body = new THREE.Mesh(FT.A.bodyG, M[0]); body.scale.set(0.9, 0.62, 1.3); body.position.y = 0.72; g.add(body);
  for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(FT.A.spikeG, M[1]); s.position.set((i - 1.5) * 0.18, 1.12 - Math.abs(i - 1.5) * 0.08, -0.1 + (i % 2) * 0.12); s.rotation.x = -0.3; g.add(s); }
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(FT.A.eyeG, M[2]); e.position.set(sx * 0.17, 0.82, 0.58); g.add(e); }
  const legs = []; for (let i = 0; i < 6; i++) { const side = i < 3 ? -1 : 1, k = i % 3, p = new THREE.Group(); p.position.set(side * 0.38, 0.62, (k - 1) * 0.42); const l = new THREE.Mesh(FT.A.legG, M[0]); l.rotation.z = side * 0.9; p.add(l); g.add(p); legs.push(p); }
  const brute = type === 'brute'; g.scale.setScalar(brute ? 1.9 : 1);
  const e = { g, type, legs, hp: brute ? 16 : 3, maxhp: brute ? 16 : 3, speed: brute ? 2.5 : 3.1, dmg: brute ? 16 : 7, r: brute ? 1.15 : 0.62, cy: brute ? 1.3 : 0.7, ph: ftRnd() * 6, cd: 0.5, hitT: 0, dead: 0 };
  FT.world.add(g); return e;
}
function footBuildFx(W) {
  FT.tracerMat = new THREE.LineBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  for (let i = 0; i < 8; i++) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3)); const l = new THREE.Line(g, FT.tracerMat); l.frustumCulled = false; l.visible = false; scene.add(l); FT.tracers.push({ l, t: 0 }); }
  const pg = new THREE.BoxGeometry(0.5, 0.35, 0.5); FT.ammoMat = new THREE.MeshLambertMaterial({ color: 0xffa030, emissive: 0x5a2a00 }); FT.matMat = new THREE.MeshBasicMaterial({ color: 0x8af4ff }); FT.pg = pg;
}
function footPlaceHover() {
  const gy = footGround(HOVER_AT.x, HOVER_AT.z); carRoot.position.set(HOVER_AT.x, gy + 0.95, HOVER_AT.z); carRoot.scale.set(1, 1, 1); carRoot.visible = true;
  const f = new THREE.Vector3(0, 0, -1), up = new THREE.Vector3(0, 1, 0), z = new THREE.Vector3().crossVectors(f, up).normalize(); carRoot.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f, up, z));
  if (carMesh.hover.visible) carMesh.hover.position.y = -WCY * S + HOVER_Y; if (carMesh.hover2.visible) carMesh.hover2.position.y = 0;
  carW.copy(carRoot.position); shadowHolder.visible = false;
}
function footLeave() {
  if (!FT.built) return; if (huntOn() || HT.active) huntLeave(); FT.built = false; FT.on = false; FT.started = false; footStopAll(); if (ASTRO.group && ASTRO.group.parent) ASTRO.group.parent.remove(ASTRO.group);
  for (const g of [FT.world, FT.sky]) if (g) { scene.remove(g); disposeGroup(g); }
  for (const t of FT.tracers) { scene.remove(t.l); t.l.geometry.dispose(); }
  FT.world = FT.sky = null; FT.enemies = []; FT.pickups = []; FT.nodes = []; FT.cols = []; FT.tracers = []; FT.pieces = [];
  if (PC.G) PC.G.visible = false;
  scene.fog = FT.fogSaved; camera.near = 0.1; camera.far = 900; camera.up.set(0, 1, 0); camera.updateProjectionMatrix();
  hemi.intensity = 1.2; sun.intensity = 1.1; sun.position.set(-30, 50, 40); levelGroup.visible = true; shadowHolder.visible = true; carRoot.rotation.set(0, 0, 0); carRoot.visible = true; carRoot.scale.set(1, 1, 1);
  alienRoot.visible = false; alienBeamMat.opacity = 0; alienBeam.visible = false; alienRoot.scale.setScalar(1);
  document.body.classList.remove('foot'); const h2 = $('crashMenu').querySelector('h2'); if (h2) h2.textContent = 'Crashed';
  if (document.pointerLockElement) document.exitPointerLock();
}
function footStopAll() { if (ASTRO.group) ASTRO.group.visible = false; }

/* ---------- run control ---------- */
function footReset() {
  Object.assign(FT, { hp: 100, o2: 100, ammo: MAG, reserve: 90, mats: 0, built3: 0, signal: 0, wave: 0, waveT: 0, grace: 18, kills: 0, supplyT: 0, biteT: 0, hurtT: 0, reloading: false, kick: 0, ending: false, endT: 0, warned: 0, deaths: 0, firing: false, fireT: 0, moving: false });
  for (const e of FT.enemies) FT.world.remove(e.g); FT.enemies.length = 0; for (const p of FT.pickups) FT.world.remove(p.m); FT.pickups.length = 0;
  for (const n of FT.nodes) { n.got = false; n.g.visible = true; } FT.pieces.forEach((p, i) => { p.visible = false; FT.pieceT[i] = 0; });
  for (const c of FT.cols) if (c.piece !== undefined) c.off = true;
  footSpawnPlayer(); alienRoot.visible = false; alienBeamMat.opacity = 0; alienBeam.visible = false;
  if (huntOn()) huntReset();
}
function footSpawnPlayer() {
  FT.p.set(3.4, footGround(3.4, -30), -29.5); FT.yaw = FT.camYaw = FT.charYaw = Math.PI; FT.camPitch = 0.2; FT.hp = 100; FT.o2 = 100; FT.ammo = MAG; FT.reloading = false; FT.hurtT = 0;
  if (huntOn()) { FT.p.set(6, footGround(6, -4), -4); FT.yaw = FT.camYaw = FT.charYaw = 0; FT.reserve = Math.max(FT.reserve, 90); }
}
function footStart() {
  footBuild(); footPlaceHover();
  if (vehicleById(vehicleId).rarity !== 'legendary') { vehicleId = owned.indexOf('hover2') >= 0 ? 'hover2' : 'hover'; applyStats(vehicleId); applyVehicle(vehicleId); footPlaceHover(); }
  timeT = 0; crashes = 0; score = 0; FT.started = true; footReset();
  astroOnReady(() => { if (!ASTRO.group.parent) FT.world.add(ASTRO.group); ASTRO.group.visible = true; FT.anim = ''; footAnim('idle'); });
  setTimeout(() => { if (footOn() && (state === 'countdown' || state === 'playing')) if (huntOn()) toast('ALIEN HUNT', 'Hide behind rocks from their lasers - kill all 12 aliens', 'warn'); else toast('PLUTO SURVIVAL', 'Gather crystals, build a base, hold out until the alien returns', 'good'); }, 1500);
}
function footRespawn() {
  if (huntOn() && HT.lives <= 0) { timeT = 0; crashes = 0; score = 0; footReset(); const h = $('crashMenu').querySelector('h2'); if (h) h.textContent = 'Crashed'; footAnim('idle'); return; }
  if (huntOn()) huntRespawn(); else { for (const e of FT.enemies) FT.world.remove(e.g); FT.enemies.length = 0; footSpawnPlayer(); } FT.grace = 6; FT.waveT = 0; timeT += 15; FT.deaths++;
  const h2 = $('crashMenu').querySelector('h2'); if (h2) h2.textContent = 'Crashed'; footAnim('idle');
}
function footMenuPose() { if (!FT.built) return; footPlaceHover(); if (ASTRO.group) ASTRO.group.visible = false; if (document.pointerLockElement) document.exitPointerLock(); }
function footDie() {
  if (huntOn() && state === 'crashed') return;
  if (huntOn()) HT.lives = Math.max(0, HT.lives - 1);
  crashes++; crashT = 0; shake = 0.8; Snd.crash && Snd.crash(); vibe && vibe(60, 'heavy'); FT.firing = false;
  const h2 = $('crashMenu').querySelector('h2'); if (h2) h2.textContent = 'ASTRONAUT DOWN'; $('crashReason').textContent = FT.o2 <= 0 ? 'You ran out of oxygen' : (FT.dieMsg || 'You were overwhelmed by Pluto creatures');
  if (huntOn()) { if (h2) h2.textContent = HT.lives > 0 ? 'ASTRONAUT DOWN \u00B7 ' + HT.lives + '/3 HEALTH BARS LEFT' : 'ALL 3 HEALTH BARS LOST'; if (HT.lives <= 0) $('crashReason').textContent += ' \u2014 the level restarts from the beginning'; }
  if (document.pointerLockElement) document.exitPointerLock(); setState('crashed');
}

/* ---------- animation ---------- */
function footAnim(name) {
  if (!ASTRO.ready || FT.anim === name) return; FT.anim = name;
  if (name === 'idle') { if (ASTRO.cur !== 'fire') astroPlay('fire', 0.25); ASTRO.acts.fire.time = 1.0; ASTRO.acts.fire.setEffectiveTimeScale(0); }
  else if (name === 'walk') astroPlay('walk', 0.2, FT.sprint ? 2.0 : 1.15);
  else if (name === 'fire') { if (ASTRO.cur !== 'fire') { astroPlay('fire', 0.12, 1); ASTRO.acts.fire.time = 0.8; } ASTRO.acts.fire.setEffectiveTimeScale(1); }
  else if (name === 'reload') { astroPlay('reload', 0.15, 1.35); ASTRO.acts.reload.time = 0.2; }
}

/* ---------- combat ---------- */
function footReload() {
  if (state !== 'playing' || FT.reloading || FT.ammo >= MAG || FT.reserve <= 0) return;
  FT.reloading = true; FT.reloadT = 2.0; ftSnd('reload'); footAnim('reload');
}
function footFire() {
  if (FT.reloading || FT.fireT > 0) return;
  if (FT.ammo <= 0) { ftSnd('empty'); FT.fireT = 0.3; if (FT.reserve > 0) footReload(); return; }
  FT.ammo--; FT.fireT = FIRE_CD; FT.aimT = 0.9; FT.flashT = 0.05; FT.kick += 0.018; shake = Math.max(shake, 0.05); ftSnd('shot');
  camera.getWorldDirection(_ftD); const ro = _ftV.copy(camera.position); const tp = _ftV2.copy(FT.p).setY(FT.p.y + 1.3).sub(ro); ro.addScaledVector(_ftD, Math.max(0, tp.dot(_ftD)));
  let best = null, bt = 90;
  for (const e of FT.enemies) { if (e.dead) continue; if (e.huntKill && !huntLOS(FT.p.x, FT.p.z, e.g.position.x, e.g.position.z)) continue; _ftR.copy(e.g.position); _ftR.y += e.cy; _ftR.sub(ro); const t = _ftR.dot(_ftD); if (t < 1 || t > bt) continue; const d2 = _ftR.lengthSq() - t * t, rr = e.r + 0.3; if (d2 < rr * rr) { best = e; bt = t; } }
  const hit = ro.clone().addScaledVector(_ftD, best ? bt : 70);
  if (!best) { const gy = footGround(hit.x, hit.z); if (hit.y < gy) hit.y = gy; }
  const mz = ASTRO.flash ? ASTRO.flash.getWorldPosition(new THREE.Vector3()) : FT.p.clone().setY(FT.p.y + 1.3);
  const tr = FT.tracers.find((q) => q.t <= 0); if (tr) { const a = tr.l.geometry.attributes.position; a.setXYZ(0, mz.x, mz.y, mz.z); a.setXYZ(1, hit.x, hit.y, hit.z); a.needsUpdate = true; tr.t = 0.06; tr.l.visible = true; }
  for (let i = 0; i < 4; i++) sparks.emit(hit.x, hit.y, hit.z, (Math.random() - 0.5) * 7, 2 + Math.random() * 5, (Math.random() - 0.5) * 7, 0.4);
  if (best) { best.hp -= 1; best.hitT = 0.12; ftSnd('hit'); const dx = best.g.position.x - FT.p.x, dz = best.g.position.z - FT.p.z, l = Math.hypot(dx, dz) || 1; best.g.position.x += dx / l * 0.12; best.g.position.z += dz / l * 0.12; if (best.hp <= 0) footKill(best); }
  if (FT.ammo === 0 && FT.reserve > 0) setTimeout(() => { if (state === 'playing') footReload(); }, 250);
}
function footKill(e) {
  if (e.huntKill) { huntKilled(e); return; }
  e.dead = 0.01; FT.kills++; score += e.type === 'brute' ? 150 : 40; ftSnd('die'); addCoins(e.type === 'brute' ? 4 : 1, 'style');
  for (let i = 0; i < 16; i++) sparks.emit(e.g.position.x, e.g.position.y + e.cy, e.g.position.z, (Math.random() - 0.5) * 9, 2 + Math.random() * 6, (Math.random() - 0.5) * 9, 0.7);
  const r = Math.random(); if (e.type === 'brute' || r < 0.38) footDrop(e.g.position, 'ammo'); if (e.type === 'brute' || r > 0.55) footDrop(e.g.position, 'mat');
}
function footDrop(p, type) {
  const m = new THREE.Mesh(FT.pg, type === 'ammo' ? FT.ammoMat : FT.matMat); if (type === 'mat') m.scale.set(0.6, 1.2, 0.6); m.position.set(p.x + (Math.random() - 0.5) * 1.2, footGround(p.x, p.z) + 0.6, p.z + (Math.random() - 0.5) * 1.2); FT.world.add(m); FT.pickups.push({ m, type, life: 45 });
}
function footHurt(d) { FT.hp -= d; FT.hurtT = 0.35; shake = Math.max(shake, 0.35); ftSnd('bite'); vibe && vibe(25); }

/* ---------- interaction ---------- */
function footNear(a, r) { return Math.hypot(FT.p.x - a.x, FT.p.z - a.z) < r; }
function footPrompt() {
  if (!huntOn() && FT.built3 < 3 && footNear(BASE_AT, 9.5)) { const c = BUILD_COST[FT.built3], n = FT.pieces[FT.built3].userData.name; return FT.mats >= c ? '[E] BUILD ' + n + ' (' + c + ' MATERIALS)' : n + ' NEEDS ' + c + ' MATERIALS (' + FT.mats + '/' + c + ')'; }
  if (footNear(HOVER_AT, 9)) return FT.supplyT <= 0 ? '[E] RESUPPLY AMMO FROM THE HOVER' : 'HOVER SUPPLY READY IN ' + Math.ceil(FT.supplyT) + 's';
  return '';
}
function footInteract() {
  if (state !== 'playing' || !FT.built) return;
  if (!huntOn() && FT.built3 < 3 && footNear(BASE_AT, 9.5)) {
    const c = BUILD_COST[FT.built3]; if (FT.mats < c) { toast('NOT ENOUGH MATERIALS', 'Need ' + c + ' - collect glowing ice crystals', 'warn'); return; }
    FT.mats -= c; const p = FT.pieces[FT.built3]; p.visible = true; FT.pieceT[FT.built3] = 0.001; const k = FT.cols.find((q) => q.piece === FT.built3); if (k) k.off = false; FT.built3++; score += 300; ftSnd('build'); shake = Math.max(shake, 0.25);
    toast(p.userData.name + ' BUILT', FT.built3 < 3 ? 'The alien signal is getting stronger' : 'Base complete - hold out!', 'good'); addCoins(15, 'style');
    for (let i = 0; i < 26; i++) sparks.emit(p.position.x, p.position.y + 1, p.position.z, (Math.random() - 0.5) * 14, 3 + Math.random() * 8, (Math.random() - 0.5) * 14, 0.8);
    return;
  }
  if (footNear(HOVER_AT, 9)) { if (FT.supplyT > 0) return; FT.supplyT = 45; FT.reserve = Math.min(150, FT.reserve + 60); FT.o2 = 100; FT.hp = Math.min(100, FT.hp + 40); ftSnd('pick'); toast('SUPPLIES COLLECTED', '+60 ammo, oxygen and medkit', 'good'); }
}

/* ---------- input ---------- */
const FTK = (c) => !!keys[c];
function footMoveInput(o) {
  let fx = (FTK('KeyW') || FTK('ArrowUp') ? 1 : 0) - (FTK('KeyS') || FTK('ArrowDown') ? 1 : 0), sx = (FTK('KeyD') || FTK('ArrowRight') ? 1 : 0) - (FTK('KeyA') || FTK('ArrowLeft') ? 1 : 0);
  fx += -FT.tj.y; sx += FT.tj.x; const l = Math.hypot(fx, sx); if (l > 1) { fx /= l; sx /= l; } o.f = fx; o.s = sx; o.sprint = FTK('ShiftLeft') || FTK('ShiftRight') || l > 0.92 && (FT.tj.x || FT.tj.y) && Math.hypot(FT.tj.x, FT.tj.y) > 0.95;
}
function footLook(dx, dy) { FT.camYaw -= dx; FT.camPitch = Math.max(-0.55, Math.min(1.0, FT.camPitch - dy)); }
(function footBindInput() {
  const cv = renderer.domElement, canPlay = () => footOn() && state === 'playing';
  const ui = (e) => e.target && e.target.closest && e.target.closest('button, .modal, #pauseMenu, #crashMenu, #footTouch');
  window.addEventListener('mousedown', (e) => {
    if (!canPlay() || ui(e)) return; Snd.init();
    if (e.button === 0) { if (!document.pointerLockElement && cv.requestPointerLock && !document.body.classList.contains('touch')) { try { const p = cv.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (x) {} } FT.firing = true; }
    else if (e.button === 2) FT.rmb = true;
  });
  window.addEventListener('mouseup', (e) => { if (e.button === 0) FT.firing = false; if (e.button === 2) FT.rmb = false; });
  window.addEventListener('contextmenu', (e) => { if (footOn() && state === 'playing') e.preventDefault(); });
  window.addEventListener('mousemove', (e) => { if (!canPlay()) return; if (document.pointerLockElement || FT.rmb) footLook(e.movementX * 0.0024, e.movementY * 0.0024); });
  document.addEventListener('pointerlockchange', () => { FT.lock = !!document.pointerLockElement; if (!FT.lock && footOn() && state === 'playing') pause(); });
  window.addEventListener('keydown', (e) => { if (!canPlay() || e.repeat) return; if (e.code === 'KeyE') footInteract(); else if (e.code === 'KeyR') footReload(); });
  const joy = $('ftJoy'), knob = $('ftKnob'), lookZ = $('ftLook');
  let jid = null, jx = 0, jy = 0, lid = null, lx = 0, ly = 0;
  joy.addEventListener('pointerdown', (e) => { e.preventDefault(); jid = e.pointerId; const r = joy.getBoundingClientRect(); jx = r.left + r.width / 2; jy = r.top + r.height / 2; try { joy.setPointerCapture(jid); } catch (x) {} Snd.init(); mv(e); });
  const mv = (e) => { if (e.pointerId !== jid) return; let dx = e.clientX - jx, dy = e.clientY - jy; const R = joy.getBoundingClientRect().width * 0.38, l = Math.hypot(dx, dy); if (l > R) { dx = dx / l * R; dy = dy / l * R; } FT.tj.x = dx / R; FT.tj.y = dy / R; knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; };
  joy.addEventListener('pointermove', mv); const jup = (e) => { if (e.pointerId !== jid) return; jid = null; FT.tj.x = FT.tj.y = 0; knob.style.transform = ''; }; joy.addEventListener('pointerup', jup); joy.addEventListener('pointercancel', jup);
  lookZ.addEventListener('pointerdown', (e) => { e.preventDefault(); lid = e.pointerId; lx = e.clientX; ly = e.clientY; try { lookZ.setPointerCapture(lid); } catch (x) {} });
  lookZ.addEventListener('pointermove', (e) => { if (e.pointerId !== lid) return; footLook((e.clientX - lx) * 0.006, (e.clientY - ly) * 0.005); lx = e.clientX; ly = e.clientY; });
  const lup = (e) => { if (e.pointerId === lid) lid = null; }; lookZ.addEventListener('pointerup', lup); lookZ.addEventListener('pointercancel', lup);
  const hold = (id, on, off) => { const b = $(id); b.addEventListener('pointerdown', (e) => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (x) {} b.classList.add('on'); Snd.init(); on(); }); const u = () => { b.classList.remove('on'); off && off(); }; b.addEventListener('pointerup', u); b.addEventListener('pointercancel', u); b.addEventListener('contextmenu', (e) => e.preventDefault()); };
  hold('ftFire', () => { FT.touch.fire = true; }, () => { FT.touch.fire = false; }); hold('ftReload', () => footReload()); hold('ftUse', () => footInteract());
  if ((window.matchMedia && matchMedia('(pointer:coarse)').matches) || 'ontouchstart' in window || /[?&]touch=1/.test(location.search)) document.body.classList.add('touch');
})();

/* ---------- update ---------- */
function footAngDiff(a, b) { let d = b - a; while (d > Math.PI) d -= 6.2832; while (d < -Math.PI) d += 6.2832; return d; }
const _mi = { f: 0, s: 0, sprint: false };
function footPlayer(dt) {
  footMoveInput(_mi); const f = _mi.f, s = _mi.s, mag = Math.hypot(f, s), sy = Math.sin(FT.camYaw), cy = Math.cos(FT.camYaw);
  FT.moving = mag > 0.1; FT.sprint = _mi.sprint && FT.moving;
  const spd = FT.sprint ? 7.2 : 3.2 * (FT.reloading ? 0.8 : 1) * (FT.aimT > 0 ? 0.8 : 1);
  if (FT.moving) {
    const dx = sy * f + -cy * s, dz = cy * f + sy * s, l = Math.hypot(dx, dz) || 1; FT.p.x += dx / l * spd * Math.min(1, mag) * dt; FT.p.z += dz / l * spd * Math.min(1, mag) * dt;
    if (FT.aimT <= 0) FT.yaw = Math.atan2(dx, dz);
  }
  if (FT.aimT > 0) FT.yaw = FT.camYaw;
  for (const c of FT.cols) { if (c.off) continue; const dx = FT.p.x - c.x, dz = FT.p.z - c.z, d = Math.hypot(dx, dz), m = c.r + 0.45; if (d < m && d > 1e-4) { FT.p.x = c.x + dx / d * m; FT.p.z = c.z + dz / d * m; } }
  FT.p.x = Math.max(FB.x0, Math.min(FB.x1, FT.p.x)); FT.p.z = Math.max(FB.z0, Math.min(FB.z1, FT.p.z)); FT.p.y = footGround(FT.p.x, FT.p.z);
  FT.fireT = Math.max(0, FT.fireT - dt); FT.aimT = Math.max(0, FT.aimT - dt); FT.flashT = Math.max(0, FT.flashT - dt); FT.hurtT = Math.max(0, FT.hurtT - dt); FT.supplyT = Math.max(0, FT.supplyT - dt);
  if (FT.reloading) { FT.reloadT -= dt; if (FT.reloadT <= 0) { FT.reloading = false; const take = Math.min(MAG - FT.ammo, FT.reserve); FT.ammo += take; FT.reserve -= take; } }
  else if ((FT.firing || FT.touch.fire) && state === 'playing') footFire();
  FT.charYaw += footAngDiff(FT.charYaw, FT.yaw) * (1 - Math.exp(-dt * 14));
  if (ASTRO.ready) {
    const want = FT.reloading ? 'reload' : (FT.aimT > 0 && FT.firing || FT.aimT > 0.5) ? 'fire' : FT.moving ? 'walk' : 'idle';
    if (want === 'walk' && FT.anim === 'walk') ASTRO.acts.walk.setEffectiveTimeScale(FT.sprint ? 2.0 : 1.15); footAnim(want);
    const g = ASTRO.group; g.position.copy(FT.p); g.rotation.y = FT.charYaw; astroUpdate(dt);
    if (ASTRO.flash) ASTRO.flash.visible = FT.flashT > 0;
  }
  // survival: oxygen + safe zones
  FT.safe = footNear(HOVER_AT, 9) || (FT.built3 > 0 && footNear(BASE_AT, 7.5));
  if (FT.safe && !huntOn()) { FT.o2 = Math.min(100, FT.o2 + 30 * dt); FT.hp = Math.min(100, FT.hp + 4 * dt); } else if (!huntOn()) FT.o2 = Math.max(0, FT.o2 - 0.45 * dt);
  if (FT.o2 <= 0) { FT.hp -= 5 * dt; FT.hurtT = Math.max(FT.hurtT, 0.1); }
  if (FT.hp <= 0) footDie();
}
function footEnemies(dt) {
  if (FT.grace > 0) FT.grace -= dt; else {
    FT.waveT -= dt;
    if (FT.waveT <= 0) {
      FT.wave++; FT.waveT = Math.max(11, 22 - FT.wave * 0.9); const n = Math.min(12, 2 + Math.floor(FT.wave * 1.15)), alive = FT.enemies.length;
      for (let i = 0; i < n && alive + i < 18; i++) footSpawnEnemy('crawler'); if (FT.wave >= 4 && FT.wave % 4 === 0) footSpawnEnemy('brute');
      toast('WAVE ' + FT.wave, n + ' creatures incoming', 'warn'); Snd.zap && FT.wave % 3 === 0 && ftSnd('die');
    }
  }
  const px = FT.p.x, pz = FT.p.z;
  for (let i = FT.enemies.length - 1; i >= 0; i--) {
    const e = FT.enemies[i], g = e.g;
    if (e.dead) { e.dead += dt; g.scale.setScalar((e.type === 'brute' ? 1.9 : 1) * Math.max(0.01, 1 - e.dead * 2.5)); g.position.y -= dt * 0.8; if (e.dead > 0.45) { FT.world.remove(g); FT.enemies.splice(i, 1); } continue; }
    const dx = px - g.position.x, dz = pz - g.position.z, d = Math.hypot(dx, dz) || 1; e.ph += dt * (e.speed * 3.4); e.hitT = Math.max(0, e.hitT - dt); e.cd -= dt;
    if (d > 1.5 + e.r * 0.5) { const sp = e.speed * (e.hitT > 0 ? 0.3 : 1) * dt; g.position.x += dx / d * sp; g.position.z += dz / d * sp; }
    else if (e.cd <= 0 && state === 'playing') { e.cd = 0.95; footHurt(e.dmg); }
    g.position.x = Math.max(FB.x0 - 8, Math.min(FB.x1 + 8, g.position.x)); g.position.z = Math.max(FB.z0 - 8, Math.min(FB.z1 + 8, g.position.z));
    g.position.y = footGround(g.position.x, g.position.z) + Math.abs(Math.sin(e.ph * 2)) * 0.07; g.rotation.y += footAngDiff(g.rotation.y, Math.atan2(dx, dz)) * (1 - Math.exp(-dt * 9));
    for (let k = 0; k < 6; k++) e.legs[k].rotation.y = Math.sin(e.ph + (k % 2 ? 0 : 3.14) + k) * 0.55; g.children[0].scale.y = 0.62 + (e.hitT > 0 ? 0.12 : 0);
  }
}
function footSpawnEnemy(type) {
  for (let t = 0; t < 12; t++) {
    const a = Math.random() * 6.283, r = 38 + Math.random() * 28, x = FT.p.x + Math.sin(a) * r, z = FT.p.z + Math.cos(a) * r;
    if (x < FB.x0 + 3 || x > FB.x1 - 3 || z < FB.z0 + 3 || z > FB.z1 - 3 || Math.hypot(x - HOVER_AT.x, z - HOVER_AT.z) < 14) continue;
    const e = footMakeEnemy(type); e.g.position.set(x, footGround(x, z), z); e.speed *= 1 + Math.min(0.35, FT.wave * 0.025); FT.enemies.push(e); return;
  }
}
function footWorld(dt) {
  const t = performance.now() * 0.001;
  for (const n of FT.nodes) { if (n.got) continue; n.g.rotation.y += dt * 0.5; if (Math.hypot(FT.p.x - n.x, FT.p.z - n.z) < 2.1) { n.got = true; n.g.visible = false; FT.mats += 2; ftSnd('pick'); score += 20; toast('+2 MATERIALS', 'Ice crystal collected', 'good'); for (let i = 0; i < 10; i++) sparks.emit(n.x, FT.p.y + 0.8, n.z, (Math.random() - 0.5) * 6, 2 + Math.random() * 4, (Math.random() - 0.5) * 6, 0.6); } }
  for (let i = FT.pickups.length - 1; i >= 0; i--) {
    const p = FT.pickups[i]; p.life -= dt; p.m.rotation.y += dt * 2; p.m.position.y += Math.sin(t * 4 + i) * dt * 0.1;
    if (Math.hypot(FT.p.x - p.m.position.x, FT.p.z - p.m.position.z) < 1.7) { if (p.type === 'ammo') { FT.reserve = Math.min(150, FT.reserve + 24); toast('+24 AMMO', null, 'good'); } else { FT.mats += 1; toast('+1 MATERIAL', null, 'good'); } ftSnd('pick'); FT.world.remove(p.m); FT.pickups.splice(i, 1); }
    else if (p.life <= 0) { FT.world.remove(p.m); FT.pickups.splice(i, 1); }
  }
  for (const q of FT.tracers) if (q.t > 0) { q.t -= dt; if (q.t <= 0) q.l.visible = false; }
  FT.pieces.forEach((p, i) => { if (FT.pieceT[i] > 0 && FT.pieceT[i] < 1) { FT.pieceT[i] = Math.min(1, FT.pieceT[i] + dt * 1.2); const k = FT.pieceT[i], e = 1 - Math.pow(1 - k, 3); p.scale.set(e, Math.max(0.01, e), e); } });
  if (FT.blink) FT.blink.visible = Math.sin(t * 6) > 0;
  const next = FT.built3 < 3, can = next && FT.mats >= BUILD_COST[FT.built3];
  FT.ring.visible = next; FT.ring.material.opacity = can ? 0.55 + 0.4 * Math.sin(t * 6) : 0.35; FT.ring.material.color.setHex(can ? 0x7dff6a : 0x35e6ff); FT.beam.visible = can; FT.beam.material.opacity = 0.18 + 0.1 * Math.sin(t * 5);
  FT.supply.visible = true; FT.supply.material.opacity = FT.supplyT > 0 ? 0.15 : 0.5 + 0.2 * Math.sin(t * 3);
  if (FT.sky) { FT.sky.position.copy(camera.position); FT.charon.rotation.y += dt * 0.01; }
  // alien signal
  if (state === 'playing') {
    FT.signal = Math.min(1, FT.signal + dt / SIGNAL_SECS * (1 + 0.28 * FT.built3));
    if (FT.warned < 1 && FT.signal > 0.25) { FT.warned = 1; toast('SIGNAL DETECTED', 'Something is answering from deep space', 'warn'); }
    else if (FT.warned < 2 && FT.signal > 0.55) { FT.warned = 2; toast('THE SIGNAL IS GETTING CLOSER', 'Keep surviving', 'warn'); }
    else if (FT.warned < 3 && FT.signal > 0.85) { FT.warned = 3; toast('IT IS ENTERING PLUTO ORBIT', 'Almost there!', 'warn'); }
    if (FT.signal >= 1) footWin();
  }
}
function footWin() {
  setState('finishing'); finishT = 0; FT.ending = true; FT.endT = 0; FT.firing = false; FT.touch.fire = false; Snd.win && Snd.win(); toast('THE ALIEN IS RETURNING', 'You survived on Pluto', 'good');
  if (document.pointerLockElement) document.exitPointerLock();
  alienRoot.visible = AL.loaded; alienRoot.scale.setScalar(3); alienBeamMat.opacity = 0; alienBeam.visible = true; footAnim('idle');
}
function footEnding(dt) {
  FT.endT += dt; const t = FT.endT, k = ftSS(0.5, 5.5, t);
  alienRoot.position.set(BASE_AT.x - 20, 180 - k * 150, BASE_AT.z + 60); alienRoot.visible = AL.loaded; alienSpin.rotation.y += dt * 2.2; alienRoot.rotation.set(Math.sin(t) * 0.05, 0, Math.sin(t * 1.3) * 0.05);
  alienBeamMat.opacity += ((ftSS(4.5, 6, t) * 0.4) - alienBeamMat.opacity) * (1 - Math.exp(-dt * 4)); alienBeam.visible = alienBeamMat.opacity > 0.01; const hl = Math.max(1, alienRoot.position.y - footGround(alienRoot.position.x, alienRoot.position.z)); alienBeam.scale.set(3, hl / 5, 3); alienBeam.position.y = -hl / 2;
  Snd.alienHum && Snd.alienHum(0.06 * k, 0.6);
  for (const e of FT.enemies) { e.hp = 0; if (!e.dead) e.dead = 0.01; }
  if (t > 8.2) { Snd.alienHum && Snd.alienHum(0); alienRoot.visible = false; alienBeamMat.opacity = 0; alienBeam.visible = false; showResults(); }
}
function footCamera(dt) {
  if (huntOn() && huntCamera(dt)) return;
  const mf = settings.shake ? 1 : 0; FT.kick *= Math.exp(-dt * 9);
  if (state === 'finishing') {
    const t = FT.endT, a = 0.4 + t * 0.12; _ftV.set(FT.p.x + Math.sin(a + FT.yaw) * 7, FT.p.y + 2.2 + ftSS(1, 6, t) * 3, FT.p.z + Math.cos(a + FT.yaw) * 7); camera.position.lerp(_ftV, 1 - Math.exp(-dt * 3)); const k = ftSS(1.2, 5, t);
    camera.lookAt(FT.p.x + (alienRoot.position.x - FT.p.x) * k * 0.7, FT.p.y + 1.6 + (alienRoot.position.y - FT.p.y) * k * 0.5, FT.p.z + (alienRoot.position.z - FT.p.z) * k * 0.7); camera.fov += (60 - camera.fov) * 0.05; camera.updateProjectionMatrix(); return;
  }
  const yaw = FT.camYaw, pit = Math.max(-0.5, Math.min(1.0, FT.camPitch + FT.kick)), cp = Math.cos(pit), look = _ftD.set(Math.sin(yaw) * cp, Math.sin(pit), Math.cos(yaw) * cp);
  const rx = -Math.cos(yaw), rz = Math.sin(yaw), dist = FT.aimT > 0 ? 3.0 : 3.6;
  const px = FT.p.x + rx * 0.75, py = FT.p.y + 1.55, pz = FT.p.z + rz * 0.75;
  let cx = px - look.x * dist, cy = py - look.y * dist, cz = pz - look.z * dist; const gy = footGround(cx, cz) + 0.5; if (cy < gy) cy = gy;
  const sx = shake > 0 ? (Math.random() - 0.5) * shake * mf * 0.5 : 0, sy = shake > 0 ? (Math.random() - 0.5) * shake * mf * 0.5 : 0; shake = Math.max(0, shake - dt * 1.6);
  camera.up.set(0, 1, 0); camera.position.set(cx + sx, cy + sy, cz); camera.lookAt(px + look.x * 20, py + look.y * 20, pz + look.z * 20);
  const fov = 62 + (FT.sprint && FT.moving ? 6 : 0); if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * 0.08; camera.updateProjectionMatrix(); }
}
function footHud(dt) {
  FT.hudT -= dt; if (FT.hudT > 0) return; FT.hudT = 0.06;
  const pr = footPrompt(); if (pr !== FT.lastPrompt) { FT.lastPrompt = pr; const el = $('ftPrompt'); el.textContent = pr; el.classList.toggle('hidden', !pr); }
  $('ftHp').style.width = Math.max(0, FT.hp) + '%'; $('ftO2').style.width = FT.o2 + '%'; $('ftO2').parentNode.classList.toggle('low', FT.o2 < 25); $('ftHp').parentNode.classList.toggle('low', FT.hp < 30);
  $('ftAmmoN').textContent = FT.reloading ? 'RELOADING' : FT.ammo + ' / ' + FT.reserve; $('ftMatsN').textContent = FT.mats; $('ftSigFill').style.width = (FT.signal * 100).toFixed(1) + '%'; $('ftSigN').textContent = Math.floor(FT.signal * 100) + '%';
  $('ftKills').textContent = FT.kills; $('ftWave').textContent = FT.wave; $('ftVig').style.opacity = (FT.hurtT > 0 ? 0.7 : Math.max(0, (30 - FT.hp) / 40) + (FT.o2 < 20 ? 0.25 : 0)).toFixed(2); $('ftSafe').classList.toggle('hidden', !FT.safe);
  const pieces = $('ftPieces').children; for (let i = 0; i < 3; i++) pieces[i].classList.toggle('on', i < FT.built3);
  let tgt = null, txt;
  if (FT.built3 >= 3) txt = 'SURVIVE until the alien returns';
  else if (FT.mats >= BUILD_COST[FT.built3]) { tgt = BASE_AT; txt = 'Go to the BASE SITE and press E to build'; }
  else { let bd = 1e9; for (const n of FT.nodes) if (!n.got) { const d = Math.hypot(n.x - FT.p.x, n.z - FT.p.z); if (d < bd) { bd = d; tgt = n; } } txt = 'Collect ice crystals (' + FT.mats + '/' + BUILD_COST[FT.built3] + ')'; }
  if (tgt) { const dx = tgt.x - FT.p.x, dz = tgt.z - FT.p.z; txt += '  \u00B7  ' + Math.round(Math.hypot(dx, dz)) + ' m'; $('ftArrow').style.transform = 'rotate(' + (-footAngDiff(FT.camYaw, Math.atan2(dx, dz)) * 57.3).toFixed(0) + 'deg)'; }
  $('ftArrow').style.visibility = tgt ? 'visible' : 'hidden'; $('ftObj').textContent = txt;
  $('timer').textContent = fmt(timeT); $('cp').textContent = 'Kills ' + FT.kills + ' \u00B7 Wave ' + FT.wave; $('score').textContent = score; const bl = bests[level]; $('bestHud').textContent = 'Best ' + (bl === undefined || bl === null ? '--:--.-' : fmt(bl)); $('progress').style.width = (FT.signal * 100).toFixed(1) + '%';
  $('ftLockHint').classList.toggle('hidden', !(state === 'playing' && !FT.lock && !document.body.classList.contains('touch')));
}
function footTick(dt) {
  startLine.group.visible = false; shadowHolder.visible = false; slg && slg.clearRect(0, 0, slc.width, slc.height);
  const live = footLive();
  if (ASTRO.group) ASTRO.group.visible = live && FT.started && !HT.hideAstro;
  if (FT.world) for (const e of FT.enemies) e.g.visible = live;
  if (state === 'countdown') {
    countdownT -= dt; const n = Math.min(99, Math.ceil(countdownT - 0.2));
    if (n !== lastCount) { lastCount = n; const el = UI.countdown; el.textContent = n > 0 ? String(n) : 'GO!'; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); if (n > 0) Snd.beep(); else Snd.go(); }
    if (n <= 0) { setState('playing'); UI.countdown.classList.remove('hidden'); setTimeout(() => UI.countdown.classList.add('hidden'), 700); }
    if (ASTRO.ready) { astroUpdate(dt); ASTRO.group.position.copy(FT.p); ASTRO.group.rotation.y = FT.charYaw; }
    if (huntOn()) huntAnimate(dt);
  }
  if (state === 'playing') { timeT += dt; if (huntOn()) huntTick(dt); else { footPlayer(dt); footEnemies(dt); footWorld(dt); } }
  else if (state === 'finishing') { if (huntOn()) huntEnding(dt); else { footWorld(dt); if (ASTRO.ready) { astroUpdate(dt); ASTRO.group.position.copy(FT.p); } footEnding(dt); } }
  else if (state === 'crashed') { crashT += dt; if (crashT > 3.2) retry(); if (ASTRO.ready) astroUpdate(dt); }
  if (FT.world) { if (state !== 'playing' && state !== 'finishing') { FT.firing = false; if (FT.sky) FT.sky.position.copy(camera.position); } }
  smoke.update(dt); flame.update(dt); dust.update(dt); sparks.update(dt); popT = Math.max(0, popT - dt * 3.4); squash *= Math.exp(-dt * 7); kick *= Math.exp(-dt * 8);
  if (!live) { FT.firing = false; } else { footHud(dt); if (huntOn()) huntHud(); }
  fxA += (0 - fxA) * (1 - Math.exp(-dt * 7)); garageFx.visible = false;
  Snd.engine(0, false, false); carW.copy(carRoot.position);
  updateCamera(dt);
}
