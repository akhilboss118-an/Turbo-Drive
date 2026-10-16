/* eslint-disable */
'use strict';
/* Deep space (levels 21+): procedural course (rings, asteroid rows, orbs), sky, planets and speed dust. No road. */
const SP = { on: false, course: null, group: null, sky: null, rings: [], rocks: [], orbs: [], planets: [], fogSaved: null, t: 0, rockMesh: null, orbMesh: null, streaks: null, sunSprite: null, target: null };
const SPACE_COURSES = {
  21: { len: 4600, seed: 2101, ringR: 13, ringGap: 380, firstRing: 340, rowGap: 88, rowJit: 18, gapW: 25, gapShift: 10, spacing: 11, rockMin: 3, rockVar: 4, movers: 0, planet: 'jupiter', pr: 620, pdx: 430, pdy: -70, pdz: 900,
    A1: 30, l1: 1100, A2: 9, l2: 520, Ay: 7, ly: 900, tint: [0.55, 0.47, 0.4], decor: [['rock', 150, 1400, -700, 120, 0], ['ice', 95, 2800, 560, -90, 1], ['ocean', 210, 3700, -950, 260, 0], ['saturn', 240, 2100, -1050, 160, 1]] },
  22: { len: 6000, seed: 2202, ringR: 11.5, ringGap: 400, firstRing: 340, rowGap: 70, rowJit: 14, gapW: 22, gapShift: 10, spacing: 10.5, rockMin: 3, rockVar: 4.5, movers: 1, planet: 'saturn', pr: 520, pdx: 560, pdy: -40, pdz: 1000,
    A1: 34, l1: 1000, A2: 10, l2: 470, Ay: 9, ly: 800, tint: [0.62, 0.7, 0.8], decor: [['ocean', 170, 1200, 700, 160, 0], ['rock', 120, 2600, -620, -100, 0], ['ice', 260, 4300, -1000, 280, 1], ['rock', 110, 5200, 640, 100, 0]] },
};
const SPA = { rocks: null, saturn: null, loading: false };
function spLoadAssets() {
  if (SPA.loading || !THREE.GLTFLoader) return; SPA.loading = true;
  new THREE.GLTFLoader().load('game/assets/models/asteroids_rocky.glb', (g) => {
    const list = []; g.scene.updateMatrixWorld(true);
    g.scene.traverse((o) => {
      if (!o.isMesh) return;
      const geo = o.geometry.clone(); geo.applyMatrix4(o.matrixWorld); geo.computeBoundingSphere();
      const bs = geo.boundingSphere; geo.translate(-bs.center.x, -bs.center.y, -bs.center.z); geo.scale(1 / bs.radius, 1 / bs.radius, 1 / bs.radius);
      const am = o.material; if (am.map && am.emissive) { am.emissiveMap = am.map; am.emissive.setScalar(0.5); } am.isShared = true; list.push({ geo, mat: o.material });
    });
    if (list.length) { SPA.rocks = list; spApplyModels(); }
  }, undefined, () => {});
  new THREE.GLTFLoader().load('game/assets/models/saturn_planet.glb', (g) => {
    const moons = []; g.scene.traverse((o) => { if (/^Sphere /.test(o.name)) moons.push(o); }); moons.forEach((o) => o.parent.remove(o));
    g.scene.traverse((o) => {
      if (!o.isMesh) return; o.raycast = () => {};
      const m = o.material; m.isShared = true; m.fog = false;
      if (m.map) { m.emissiveMap = m.map; m.emissive.setScalar(0.4); }
      if (/Rings/.test(o.name)) { m.side = THREE.DoubleSide; m.depthWrite = false; m.emissive.setScalar(0.55); }
    });
    SPA.saturn = g.scene; spApplyModels();
  }, undefined, () => {});
}
function spSaturnModel(R) {
  const inst = SPA.saturn.clone(true); inst.scale.setScalar(R / 500);
  const spin = new THREE.Group(), body = [];
  inst.traverse((o) => { if (o.name === 'Saturn' || o.name === 'Saturn Clouds') body.push(o); });
  body.forEach((o) => spin.add(o)); inst.add(spin);
  const tilt = new THREE.Group(); tilt.rotation.set(0.42, 0, 0.22); tilt.add(inst); tilt.userData.sph = spin; return tilt;
}
function spSaturn(R, seed, glowHex) { return SPA.saturn ? spSaturnModel(R) : spMakePlanet('saturn', R, true, seed, glowHex); }
function spApplyModels() {
  if (!SP.on) return;
  spBuildRockMeshes();
  if (!SPA.saturn) return;
  for (const p of SP.planets) {
    if (!p.sat || p.model) continue;
    const old = p.g, ng = spSaturnModel(p.sat); ng.position.copy(old.position); SP.group.add(ng); SP.group.remove(old); disposeGroup(old); p.g = ng; p.model = true;
  }
}
function spBuildRockMeshes() {
  const grp = SP.group, rocks = SP.rocks; if (!grp || !rocks.length) return;
  for (const m of SP.rockMeshes || []) { grp.remove(m); m.geometry.dispose(); }
  const vars = SPA.rocks || [{ geo: spRockGeo(), mat: new THREE.MeshLambertMaterial({ color: 0xffffff }) }], n = vars.length, counts = new Array(n).fill(0);
  rocks.forEach((r, i) => { r.v = i % n; r.k = counts[r.v]++; });
  SP.rockMeshes = vars.map((vr, vi) => { const m = new THREE.InstancedMesh(SPA.rocks ? vr.geo.clone() : vr.geo, vr.mat, Math.max(1, counts[vi])); m.frustumCulled = false; grp.add(m); return m; });
  rocks.forEach((r) => SP.rockMeshes[r.v].setColorAt(r.k, r.col));
  SP.rockMeshes.forEach((m) => { if (m.instanceColor) m.instanceColor.needsUpdate = true; });
  spUpdateRocks(0, true);
}
const spRng = (s) => () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const _spC = { x: 0, y: 0 };
function spCenter(c, s, o) {
  o = o || _spC; const ramp = Math.min(1, s / 300), T = Math.PI * 2;
  o.x = ramp * (c.A1 * Math.sin(T * s / c.l1) + c.A2 * Math.sin(T * s / c.l2 + 1.3));
  o.y = ramp * c.Ay * Math.sin(T * s / c.ly + 0.6);
  return o;
}
const spGlow = (stops) => glowTexture(stops);
function spPlanetTex(kind, rng) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const g = cv.getContext('2d');
  const PAL = { jupiter: ['#e6cfa8', '#c99a68', '#f1e4cc', '#a8643c', '#d9b384', '#8f5a3a'], saturn: ['#f0dfae', '#d9c088', '#f6ecc8', '#c8a96a', '#e5d19a'], rock: ['#b5532e', '#8a3a22', '#d27a4a', '#6a2a18'], ice: ['#bfe6ff', '#8fc8f0', '#e8f6ff', '#6aa8d8'], ocean: ['#1f6fd0', '#2a8a6a', '#3fa65a', '#1a4a9a'] };
  const pal = PAL[kind], gas = kind === 'jupiter' || kind === 'saturn';
  if (gas) {
    let y = 0; while (y < 256) { const h = 4 + rng() * (kind === 'jupiter' ? 22 : 15); g.fillStyle = pal[(rng() * pal.length) | 0]; g.fillRect(0, y, 512, h + 1); y += h; }
    g.globalAlpha = 0.35; for (let i = 0; i < 70; i++) { const yy = rng() * 256, amp = 2 + rng() * 6, ph = rng() * 6, ln = 40 + rng() * 140, x0 = rng() * 512; g.strokeStyle = pal[(rng() * pal.length) | 0]; g.lineWidth = 1 + rng() * 3; g.beginPath(); for (let x = 0; x <= ln; x += 6) { const y2 = yy + Math.sin(x * 0.08 + ph) * amp; if (x === 0) g.moveTo(x0, y2); else g.lineTo(x0 + x, y2); } g.stroke(); }
    g.globalAlpha = 1;
    if (kind === 'jupiter') { g.fillStyle = '#7a2e1c'; g.beginPath(); g.ellipse(160, 168, 44, 23, 0, 0, 7); g.fill(); g.fillStyle = '#c4572f'; g.beginPath(); g.ellipse(160, 168, 36, 17, 0, 0, 7); g.fill(); g.fillStyle = '#e08a58'; g.beginPath(); g.ellipse(158, 166, 16, 7, 0, 0, 7); g.fill(); }
  } else {
    g.fillStyle = pal[0]; g.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 90; i++) { g.globalAlpha = 0.25 + rng() * 0.45; g.fillStyle = pal[1 + ((rng() * (pal.length - 1)) | 0)]; g.beginPath(); g.ellipse(rng() * 512, rng() * 256, 8 + rng() * 46, 5 + rng() * 22, rng() * 3, 0, 7); g.fill(); }
    if (kind === 'ocean') { g.globalAlpha = 0.55; g.fillStyle = '#fff'; for (let i = 0; i < 40; i++) { g.beginPath(); g.ellipse(rng() * 512, rng() * 256, 14 + rng() * 40, 3 + rng() * 5, rng() - 0.5, 0, 7); g.fill(); } }
    g.globalAlpha = 1;
  }
  const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(0,0,0,.45)'); gr.addColorStop(0.2, 'rgba(0,0,0,0)'); gr.addColorStop(0.8, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
  const t = new THREE.CanvasTexture(cv); t.anisotropy = 4; return t;
}
function spRingTex() {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 4; const g = cv.getContext('2d');
  for (let x = 0; x < 512; x++) {
    const u = x / 512; let a = 0;
    if (u > 0.04 && u < 0.2) a = 0.22; else if (u >= 0.2 && u < 0.46) a = 0.88; else if (u >= 0.5 && u < 0.84) a = 0.7; else if (u >= 0.86 && u < 0.92) a = 0.35;
    a *= 0.72 + 0.28 * Math.sin(x * 0.9) * Math.sin(x * 0.23 + 1.7);
    g.fillStyle = 'rgba(' + (214 + (u * 30 | 0)) + ',' + (190 + (u * 20 | 0)) + ',' + (140 + (u * 20 | 0)) + ',' + Math.max(0, a).toFixed(3) + ')'; g.fillRect(x, 0, 1, 4);
  }
  return new THREE.CanvasTexture(cv);
}
function spMakePlanet(kind, R, withRing, seed, glowHex) {
  const grp = new THREE.Group(), tex = spPlanetTex(kind, spRng(seed));
  const sph = new THREE.Mesh(new THREE.SphereGeometry(R, 56, 36), new THREE.MeshLambertMaterial({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.22 })); grp.add(sph);
  const atm = new THREE.Mesh(new THREE.SphereGeometry(R * 1.1, 40, 28), new THREE.ShaderMaterial({ side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    uniforms: { c: { value: new THREE.Color(glowHex) } },
    vertexShader: 'varying vec3 n;void main(){n=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec3 n;uniform vec3 c;void main(){float i=pow(max(0.,0.74-dot(n,vec3(0.,0.,1.))),3.);gl_FragColor=vec4(c*i*1.6,i);}' })); grp.add(atm);
  grp.userData.sph = sph;
  if (withRing) {
    const inner = R * 1.28, outer = R * 2.3, rg = new THREE.RingGeometry(inner, outer, 160, 1), p = rg.attributes.position, uv = rg.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (Math.hypot(p.getX(i), p.getY(i)) - inner) / (outer - inner), 0.5);
    const ring = new THREE.Mesh(rg, new THREE.MeshLambertMaterial({ map: spRingTex(), transparent: true, side: THREE.DoubleSide, depthWrite: false, emissive: 0x6a5a3a, emissiveIntensity: 0.5 }));
    ring.rotation.x = -Math.PI / 2 + 0.38; ring.rotation.y = 0.12; grp.add(ring);
  }
  return grp;
}
function spMakeRing(r, big, pos) {
  const g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, fog: false });
  g.add(new THREE.Mesh(new THREE.TorusGeometry(r, big ? 1.0 : 0.62, 10, 80), mat));
  const outer = new THREE.Mesh(new THREE.TorusGeometry(r * 1.14, 0.12, 6, 80), mat); g.add(outer);
  const n = big ? 20 : 12; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, b = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, big ? 3.6 : 2.6), mat); b.position.set(Math.cos(a) * r * 1.14, Math.sin(a) * r * 1.14, 0); b.rotation.z = a; g.add(b); }
  const hmat = new THREE.MeshBasicMaterial({ map: spGlow(['rgba(255,255,255,0)', 'rgba(255,255,255,.05)', 'rgba(255,255,255,.55)']), color: 0xff8a3d, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  const halo = new THREE.Mesh(new THREE.CircleGeometry(r * 1.08, 48), hmat); g.add(halo);
  g.position.copy(pos); g.userData = { mat, hmat };
  return g;
}
function spRockGeo() {
  const g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = 0.8 + 0.2 * Math.sin(v.x * 5.1 + v.y * 3.7) * Math.cos(v.z * 4.3 + v.x * 2.9) + 0.07 * Math.sin(v.y * 11 + v.z * 7); p.setXYZ(i, v.x * k, v.y * k, v.z * k); }
  g.computeVertexNormals(); return g;
}
function spaceLeave() {
  if (!SP.on) return; SP.on = false;
  for (const g of [SP.group, SP.sky]) if (g) { scene.remove(g); disposeGroup(g); }
  SP.group = SP.sky = null; SP.rockMeshes = null; SP.rings = []; SP.rocks = []; SP.orbs = []; SP.planets = [];
  scene.fog = SP.fogSaved; camera.near = 0.1; camera.far = 900; camera.up.set(0, 1, 0); camera.updateProjectionMatrix();
  hemi.intensity = 1.2; sun.intensity = 1.1; sun.position.set(-30, 50, 40);
  levelGroup.visible = true; shadowHolder.visible = true; carRoot.rotation.set(0, 0, 0, 'XYZ'); carRoot.visible = true; carRoot.scale.set(1, 1, 1);
  document.body.classList.remove('space');
}
function buildSpace(L) {
  const c = SPACE_COURSES[level], R = spRng(c.seed), low = settings.quality === 'low'; SP.course = c; SP.on = true; SP.t = 0;
  SP.fogSaved = scene.fog; scene.fog = null; if (scene.background && scene.background.dispose) scene.background.dispose(); scene.background = new THREE.Color(0x01020a);
  camera.near = 0.4; camera.far = 16000; camera.updateProjectionMatrix();
  hemi.color.setHex(0x8fa0d8); hemi.groundColor.setHex(0x20182c); hemi.intensity = 0.9; sun.color.setHex(0xfff0d8); sun.intensity = 1.8; sun.position.set(-40, 80, 70);
  levelGroup.visible = false; document.body.classList.add('space');
  const grp = SP.group = new THREE.Group(); scene.add(grp);
  const sky = SP.sky = new THREE.Group(); scene.add(sky);
  /* ---- sky: stars, milky band, nebulas, sun ---- */
  const mkStars = (n, band, size) => {
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      let x, y, z; do { x = R() * 2 - 1; y = R() * 2 - 1; z = R() * 2 - 1; } while (x * x + y * y + z * z > 1 || x * x + y * y + z * z < 0.05);
      if (band) { const d = x * 0.3 + y * 0.9 + z * 0.3; x -= d * 0.3 * 0.92; y -= d * 0.9 * 0.92; z -= d * 0.3 * 0.92; }
      const l = Math.hypot(x, y, z) || 1; pos[i * 3] = x / l * 6000; pos[i * 3 + 1] = y / l * 6000; pos[i * 3 + 2] = z / l * 6000;
      const t = R(), b = 0.6 + R() * 0.4; col[i * 3] = b * (t < 0.2 ? 1 : t < 0.7 ? 0.92 : 0.7); col[i * 3 + 1] = b * (t < 0.2 ? 0.82 : t < 0.7 ? 0.94 : 0.85); col[i * 3 + 2] = b * (t < 0.2 ? 0.6 : 1);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const p = new THREE.Points(g, new THREE.PointsMaterial({ size, sizeAttenuation: false, vertexColors: true, fog: false, transparent: true, opacity: 0.95, depthWrite: false })); p.frustumCulled = false; p.renderOrder = -10; return p;
  };
  sky.add(mkStars(low ? 1800 : 3400, false, 1.8)); sky.add(mkStars(low ? 900 : 1800, true, 1.3));
  const NEB = [[0x6a3aff, -0.8, 0.2, -0.5], [0x1ac0c8, 0.7, -0.15, -0.7], [0xff4a9a, -0.2, 0.55, -0.8], [0xff9a3a, 0.9, 0.3, 0.2], [0x3a6aff, -0.5, -0.4, 0.75], [0x9a3aff, 0.1, 0.1, -1]];
  for (const n of NEB) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: spGlow(['rgba(255,255,255,.55)', 'rgba(255,255,255,.18)', 'rgba(255,255,255,0)']), color: n[0], transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    const l = Math.hypot(n[1], n[2], n[3]); s.position.set(n[1] / l * 5200, n[2] / l * 5200, n[3] / l * 5200); s.scale.setScalar(3600 + R() * 1800); sky.add(s);
  }
  const sunS = new THREE.Sprite(new THREE.SpriteMaterial({ map: spGlow(['rgba(255,255,255,1)', 'rgba(255,230,170,.7)', 'rgba(255,170,90,.25)', 'rgba(255,140,60,0)']), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  sunS.position.set(-0.75 * 5600, 0.3 * 5600, -0.6 * 5600); sunS.scale.setScalar(2100); sky.add(sunS); SP.sunSprite = sunS;
  /* ---- course geometry ---- */
  const cc = { x: 0, y: 0 }, rings = SP.rings = [], rocks = SP.rocks = [], orbs = SP.orbs = [];
  const nr = Math.floor((c.len - 220 - c.firstRing) / c.ringGap) + 1;
  for (let i = 0; i <= nr; i++) {
    const fin = i === nr, s = fin ? c.len : c.firstRing + i * c.ringGap; spCenter(c, s, cc);
    const g = spMakeRing(fin ? c.ringR * 1.9 : c.ringR, fin, new THREE.Vector3(cc.x, cc.y, -s)); grp.add(g);
    rings.push({ s, x: cc.x, y: cc.y, r: fin ? c.ringR * 1.9 : c.ringR, fin, g, mat: g.userData.mat, hmat: g.userData.hmat, state: 0, t: 0 });
  }
  const nearRing = (s) => rings.some((r) => Math.abs(r.s - s) < 75);
  let rowS = 300; const q0 = new THREE.Quaternion();
  const addRock = (x, y, z, r, mv) => {
    q0.setFromEuler(new THREE.Euler(R() * 6, R() * 6, R() * 6));
    rocks.push({ x0: x, x, y, z, r, rr: r * 0.8, sx: 0.8 + R() * 0.45, sy: 0.75 + R() * 0.4, sz: 0.8 + R() * 0.45, q0: q0.clone(), axis: new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize(), spd: (R() - 0.5) * 0.7, amp: mv ? 3.5 + R() * 1.5 : 0, ph: R() * 6.28, msp: 0.8 + R() * 0.7, near: false });
  };
  while (rowS < c.len - 260) {
    if (!nearRing(rowS)) {
      spCenter(c, rowS, cc); const gx = cc.x + (R() - 0.5) * 2 * c.gapShift, half = c.gapW / 2;
      for (let x = cc.x - 64; x <= cc.x + 64; x += c.spacing) {
        const px = x + (R() - 0.5) * 3.5, rad = c.rockMin + R() * c.rockVar, d = Math.abs(px - gx);
        if (d < half + rad) continue;
        addRock(px, cc.y + (R() - 0.5) * 7, -rowS - (R() - 0.5) * 14, rad, c.movers && d < half + rad + 9 && R() < 0.8);
      }
      for (let k = -2; k <= 2; k++) orbs.push({ x: gx, y: cc.y, z: -(rowS + k * 13), got: false, ph: R() * 6 });
    }
    rowS += c.rowGap + R() * c.rowJit;
  }
  const nd = low ? 90 : 170;
  for (let i = 0; i < nd; i++) {
    const s = R() * c.len, side = R() < 0.5 ? -1 : 1; spCenter(c, s, cc);
    addRock(cc.x + side * (80 + R() * 170), cc.y + (R() - 0.5) * 200, -s - R() * 60, 4 + R() * R() * 26, false);
  }
  for (const r of rings) for (let k = 1; k <= 4; k++) orbs.push({ x: r.x, y: r.y, z: -(r.s - 100 + k * 20 - (r.fin ? 0 : 0)), got: false, ph: R() * 6 });
  rocks.forEach((r) => { const v = 0.75 + R() * 0.5; r.col = new THREE.Color().setRGB(c.tint[0] * v * 1.7, c.tint[1] * v * 1.7, c.tint[2] * v * 1.7); });
  SP.rockMeshes = null; spBuildRockMeshes();
  const om = SP.orbMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.85, 0), new THREE.MeshBasicMaterial({ color: 0xffd34d, fog: false }), Math.max(1, orbs.length)); om.frustumCulled = false; grp.add(om);
  /* guide beacons along the centre line */
  { const pts = []; for (let s = 40; s < c.len; s += 24) { spCenter(c, s, cc); pts.push(cc.x, cc.y, -s); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const bp = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.6, map: spGlow(['rgba(255,255,255,1)', 'rgba(140,235,255,.55)', 'rgba(0,0,0,0)']), color: 0x8cebff, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })); bp.frustumCulled = false; grp.add(bp); }
  /* planets: passing decor + the destination */
  let seed = c.seed;
  for (const d of c.decor) { spCenter(c, d[2], cc); const sat = d[0] === 'saturn', p = sat ? spSaturn(d[1], seed++, 0xffd88a) : spMakePlanet(d[0], d[1], !!d[5], seed++, d[0] === 'ocean' ? 0x4aa0ff : d[0] === 'ice' ? 0x9fe0ff : 0xff8a5a); p.position.set(cc.x + d[3], cc.y + d[4], -d[2]); grp.add(p); SP.planets.push({ g: p, spin: 0.012, sat: sat ? d[1] : 0, model: sat && !!SPA.saturn }); }
  spCenter(c, c.len, cc);
  const isSat = c.planet === 'saturn', tp = SP.target = isSat ? spSaturn(c.pr, seed++, 0xffd88a) : spMakePlanet(c.planet, c.pr, false, seed++, 0xffb27a);
  tp.position.set(cc.x + c.pdx, cc.y + c.pdy, -(c.len + c.pdz)); grp.add(tp); SP.planets.push({ g: tp, spin: 0.01, sat: isSat ? c.pr : 0, model: isSat && !!SPA.saturn });
  const moon = spMakePlanet('rock', 55, false, seed++, 0xcccccc); moon.position.set(tp.position.x - c.pr * 1.5, tp.position.y + c.pr * 0.5, tp.position.z + c.pr * 1.1); grp.add(moon); SP.planets.push({ g: moon, spin: 0.03 });
  /* speed dust */
  const N = low ? 260 : 520, arr = new Float32Array(N * 6), dust2 = [];
  for (let i = 0; i < N; i++) dust2.push({ ox: R() * 160, oy: R() * 110, oz: R() * 360 });
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const st = SP.streaks = new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); st.frustumCulled = false; st.userData.d = dust2; grp.add(st);
  spResetCourse();
}
function spResetCourse() {
  const om = SP.orbMesh;
  for (const r of SP.rings) { r.state = 0; r.t = 0; spRingColor(r, 0); r.g.scale.setScalar(1); r.g.visible = true; }
  for (const o of SP.orbs) o.got = false;
  for (const r of SP.rocks) r.near = false;
  if (SP.rockMeshes) spUpdateRocks(0, true); if (om) om.instanceMatrix.needsUpdate = true;
}
function spRingColor(r, st) {
  const hex = r.fin ? 0xffe27a : st === 1 ? 0x35e6ff : st === 2 ? 0xff3a3a : 0xff8a3d;
  r.mat.color.setHex(hex); r.hmat.color.setHex(hex); r.mat.opacity = st === 1 ? 0.5 : 1; r.hmat.opacity = st === 1 ? 0.35 : 1;
}
const _spM = new THREE.Matrix4(), _spQ = new THREE.Quaternion(), _spV = new THREE.Vector3(), _spS = new THREE.Vector3();
function spUpdateRocks(shipZ, all) {
  const ms = SP.rockMeshes, t = SP.t, rocks = SP.rocks; if (!ms) return;
  for (let i = 0; i < rocks.length; i++) {
    const r = rocks[i]; if (!all && Math.abs(r.z - shipZ) > 1000) continue;
    r.x = r.amp ? r.x0 + r.amp * Math.sin(t * r.msp + r.ph) : r.x0;
    _spQ.setFromAxisAngle(r.axis, r.spd * t).multiply(r.q0);
    _spM.compose(_spV.set(r.x, r.y, r.z), _spQ, _spS.set(r.r * r.sx, r.r * r.sy, r.r * r.sz)); ms[r.v].setMatrixAt(r.k, _spM);
  }
  for (const m of ms) m.instanceMatrix.needsUpdate = true;
}
function spUpdateOrbs() {
  const om = SP.orbMesh, t = SP.t;
  for (let i = 0; i < SP.orbs.length; i++) {
    const o = SP.orbs[i], s = o.got ? 0 : 1 + 0.18 * Math.sin(t * 5 + o.ph);
    _spQ.setFromAxisAngle(_spV.set(0, 1, 0), t * 2 + o.ph); _spM.compose(_spS.set(o.x, o.y + Math.sin(t * 2 + o.ph) * 0.4, o.z), _spQ, _spV.set(s, s, s)); om.setMatrixAt(i, _spM);
  }
  om.instanceMatrix.needsUpdate = true;
}
function spaceVisuals(dt, shipX, shipY, shipZ, fs) {
  if (!SP.on) return; SP.t += dt;
  spUpdateRocks(shipZ, false); spUpdateOrbs();
  for (const p of SP.planets) p.g.userData.sph.rotation.y += dt * p.spin;
  const nextI = SP.rings.findIndex((r) => r.state === 0 && r.s > -shipZ - 8);
  SP.rings.forEach((r, i) => {
    if (r.state === 0) { const pu = i === nextI ? 1 + 0.035 * Math.sin(SP.t * 6) : 1; r.g.scale.setScalar(pu); r.hmat.opacity = i === nextI ? 0.8 + 0.2 * Math.sin(SP.t * 6) : 0.55; }
    else if (r.t < 1.2) { r.t += dt; const k = Math.min(1, r.t / 0.5); r.g.scale.setScalar(r.state === 1 ? 1 + 0.35 * Math.sin(k * Math.PI) : 1); }
    r.g.children[0].rotation.z += dt * (r.fin ? 0.3 : 0.15);
  });
  // speed dust: world-fixed motes wrapped around the ship, drawn as streaks along the flight direction
  const st = SP.streaks, arr = st.geometry.attributes.position.array, D = st.userData.d, sv = Math.min(1, fs / 150), L = 0.4 + sv * sv * 16;
  st.material.opacity = 0.2 + 0.6 * sv;
  for (let i = 0; i < D.length; i++) {
    const d = D[i], wx = (((d.ox - shipX) % 160) + 160) % 160 - 80 + shipX, wy = (((d.oy - shipY) % 110) + 110) % 110 - 55 + shipY, wz = (((d.oz - shipZ) % 360) + 360) % 360 - 300 + shipZ;
    if (Math.abs(wx - shipX) < 4 && Math.abs(wy - shipY) < 3) { arr[i * 6] = arr[i * 6 + 3] = shipX; arr[i * 6 + 1] = arr[i * 6 + 4] = -9999; arr[i * 6 + 2] = arr[i * 6 + 5] = shipZ; continue; }
    arr[i * 6] = arr[i * 6 + 3] = wx; arr[i * 6 + 1] = arr[i * 6 + 4] = wy; arr[i * 6 + 2] = wz; arr[i * 6 + 5] = wz + L;
  }
  st.geometry.attributes.position.needsUpdate = true;
}
spLoadAssets();
