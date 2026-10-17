/* eslint-disable */
'use strict';
/* Circuit biome kit (Grand Oval, 3-lap duel race): mown grass, red/white kerbs, barrier walls, grandstand, trees, daytime sky. Uses roadSamples/roadDist from desert.js. */
const CIRCUIT_FLOOR = -0.5;
function circuitStrip(arrP, arrC, s0, s1, l0, l1, y, ca, cb, step) {
  const v = new THREE.Vector3(), pt = (s, l, yy) => { toWorld(s, yy, l, v, 0); return [v.x, v.y, v.z]; };
  let k = 0;
  for (let s = s0; s < s1; s += step, k++) {
    const e = Math.min(s1, s + step), c = k % 2 ? ca : cb;
    const a = pt(s, l0, y), b = pt(s, l1, y), d = pt(e, l1, y), f = pt(e, l0, y);
    for (const q of [a, b, d, a, d, f]) { arrP.push(q[0], q[1], q[2]); arrC.push(c[0], c[1], c[2]); }
  }
}
function circuitWall(arrP, arrC, s0, s1, lat, h, ca, cb, step) {
  const v = new THREE.Vector3(), pt = (s, yy) => { toWorld(s, yy, lat, v, 0); return [v.x, v.y, v.z]; };
  let k = 0;
  for (let s = s0; s < s1; s += step, k++) {
    const e = Math.min(s1, s + step), c = k % 2 ? ca : cb;
    const a = pt(s, 0), b = pt(s, h), d = pt(e, h), f = pt(e, 0);
    for (const q of [a, b, d, a, d, f]) { arrP.push(q[0], q[1], q[2]); arrC.push(c[0], c[1], c[2]); }
  }
}
function circuitMesh(arrP, arrC, mat) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(arrP), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(arrC), 3));
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false; sceneryGroup.add(m); return m;
}
function buildCircuitScenery(L) {
  const low = settings.quality === 'low', smp = roadSamples(3), len = track.finishX;
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of smp) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const lam = (c) => new THREE.MeshLambertMaterial({ color: c });

  // mown grass: alternating light/dark stripes
  const fg = new THREE.PlaneGeometry(2600, 2600, 130, 130); fg.rotateX(-Math.PI / 2);
  const fp = fg.attributes.position, fc = new Float32Array(fp.count * 3), gA = new THREE.Color(0x4aa04a), gB = new THREE.Color(0x3d8c3f), tc = new THREE.Color();
  for (let i = 0; i < fp.count; i++) { const X = fp.getX(i) + cx, Z = fp.getZ(i) + cz; tc.copy(Math.floor((X + Z * 0.35) / 22) % 2 ? gA : gB); fc[i * 3] = tc.r; fc[i * 3 + 1] = tc.g; fc[i * 3 + 2] = tc.b; }
  fg.setAttribute('color', new THREE.BufferAttribute(fc, 3));
  const floor = new THREE.Mesh(fg, new THREE.MeshLambertMaterial({ vertexColors: true })); floor.position.set(cx, CIRCUIT_FLOOR, cz); sceneryGroup.add(floor);

  // kerbs (red / white) hugging both road edges, and a low striped barrier wall behind them
  const red = [0.88, 0.15, 0.17], white = [0.96, 0.96, 0.96], KW = 1.3;
  const kp = [], kc = [], wp = [], wc = [];
  const S1 = track.length - 4;
  for (const sd of [-1, 1]) {
    circuitStrip(kp, kc, 0, S1, sd * 4.2, sd * (4.2 + KW), 0.03, red, white, 2.4);
    circuitWall(wp, wc, 0, S1, sd * (4.2 + KW + 3.2), 0.9, red, white, 6);
  }
  circuitMesh(kp, kc, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  circuitMesh(wp, wc, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: 0x333333 }));

  // start / finish grandstand (right of the start straight) with coloured crowd stripes
  const stand = new THREE.Group(), base = new THREE.Mesh(new THREE.BoxGeometry(46, 5, 9), lam(0x6a6e78)); base.position.y = 2.5; stand.add(base);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(48, 0.6, 11), lam(0xe0262a)); roof.position.y = 8.2; stand.add(roof);
  for (const x of [-22, 22]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.6, 8, 0.6), lam(0xdddddd)); post.position.set(x, 4, 4.2); stand.add(post); }
  const crowdCols = [0xffd34d, 0x35e6ff, 0xff6ad5, 0xffffff, 0x9dff6a];
  for (let r = 0; r < 4; r++) { const row = new THREE.Mesh(new THREE.BoxGeometry(44, 0.55, 1.4), lam(crowdCols[r % crowdCols.length])); row.position.set(0, 1.4 + r * 1.1, 2.6 - r * 1.8); stand.add(row); }
  placeOnRoad(stand, 40, 0, 4.2 + KW + 3.2 + 12, 0); stand.rotation.y += 0; sceneryGroup.add(stand);

  // trees: scattered around the circuit and on the infield, never on the road
  const trunk = new THREE.CylinderGeometry(0.25, 0.35, 1.8, 6), crown = new THREE.ConeGeometry(1.5, 4.2, 7), crown2 = new THREE.ConeGeometry(1.1, 3.2, 7);
  const trMat = lam(0x6a4a2a), cMats = [lam(0x2f7a3a), lam(0x3a8f45), lam(0x256b32)];
  const nT = low ? 45 : 120, spanX = (x1 - x0) / 2 + 150, spanZ = (z1 - z0) / 2 + 150;
  for (let i = 0, tries = 0; i < nT && tries < nT * 12; tries++) {
    const X = cx + (rnd() * 2 - 1) * spanX, Z = cz + (rnd() * 2 - 1) * spanZ;
    if (roadDist(smp, X, Z) < 22) continue;
    i++; const g = new THREE.Group(), sc = 0.8 + rnd() * 1.1;
    const t = new THREE.Mesh(trunk, trMat); t.position.y = 0.9; g.add(t);
    const c1 = new THREE.Mesh(crown, cMats[i % 3]); c1.position.y = 3.6; g.add(c1);
    const c2 = new THREE.Mesh(crown2, cMats[(i + 1) % 3]); c2.position.y = 5.6; g.add(c2);
    g.scale.setScalar(sc); g.position.set(X, CIRCUIT_FLOOR, Z); sceneryGroup.add(g);
  }

  // infield roundabout island: a small green disc ringed with kerb colours, sitting in the kink of the infield
  const mid = roadSamples(1).find((p) => p.s >= 655);
  if (mid) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 0.5, 28), lam(0xe0262a)), disc = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 5.6, 0.62, 28), lam(0x4fb35a));
    const f = track.path.at(655, {}); const nx = Math.sin(f.psi), nz = Math.cos(f.psi);
    ring.position.set(mid.x + nx * 20, CIRCUIT_FLOOR + 0.25, mid.z + nz * 20); disc.position.copy(ring.position); disc.position.y += 0.05;
    sceneryGroup.add(ring); sceneryGroup.add(disc);
  }
}
function circuitEnv(L, E, low) {
  const smp = roadSamples(6); let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of smp) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const cTex = cloudTexture(), nCl = low ? 12 : 30;
  for (let i = 0; i < nCl; i++) {
    const m = new THREE.SpriteMaterial({ map: cTex, color: 0xffffff, transparent: true, opacity: 0.55 + rnd() * 0.3, depthWrite: false });
    const sp = new THREE.Sprite(m), w = 160 + rnd() * 240, a = rnd() * 6.283, d = 250 + rnd() * 450;
    sp.scale.set(w, w * 0.32, 1); sp.position.set(cx + Math.cos(a) * d, 110 + rnd() * 90, cz + Math.sin(a) * d); envGroup.add(sp);
  }
  const mg = new THREE.ConeGeometry(1, 1, 7), mc = new THREE.Color(E.mount), n = low ? 12 : 26;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283 + rnd() * 0.15, d = 620 + rnd() * 140, h = 50 + rnd() * 90, r = 80 + rnd() * 90;
    const m = new THREE.Mesh(mg, new THREE.MeshLambertMaterial({ color: mc })); m.scale.set(r, h, r); m.position.set(cx + Math.cos(a) * d, h / 2 - 6, cz + Math.sin(a) * d); envGroup.add(m);
  }
  const p = new Float32Array(30 * 3); for (let i = 0; i < 30; i++) { p[i * 3] = cx + (rnd() - 0.5) * 300; p[i * 3 + 1] = 2 + rnd() * 20; p[i * 3 + 2] = cz + (rnd() - 0.5) * 300; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  motes = new THREE.Points(g, new THREE.PointsMaterial({ color: E.mote, size: 1.5, sizeAttenuation: false, transparent: true, opacity: 0.25, depthWrite: false }));
  motes.frustumCulled = false; envGroup.add(motes);
}
