/* eslint-disable */
'use strict';
/* Moon biome kit (levels 17-18): cratered regolith floor, grey boulders and cliffs, a lunar lander, signs, black sky with Earth, far crater rims. */
const MOON_FLOOR = -14, MOON_GREYS = [0x8d909c, 0x6f727e, 0xa6a9b4, 0x5a5d68, 0x7c7f8b];
let collapse = null;
function buildMoonScenery(L) {
  collapse = null;
  const low = settings.quality === 'low', len = track.length;
  const lam = (c, e) => new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: e });
  const greyMats = MOON_GREYS.map((c) => lam(c, 0.16)), glowMats = L.glow.map((c) => new THREE.MeshBasicMaterial({ color: c }));

  // cratered regolith floor (also what you see under the chasms)
  const craters = []; for (let i = 0; i < 26; i++) craters.push({ x: rnd() * len, z: (rnd() - 0.5) * 520, r: 14 + rnd() * 46 });
  const fg = new THREE.PlaneGeometry(len + 900, 900, low ? 70 : 140, low ? 22 : 36); fg.rotateX(-Math.PI / 2);
  const fp = fg.attributes.position, fc = new Float32Array(fp.count * 3), a = new THREE.Color(0xb4b7c2), b = new THREE.Color(0x50535f), tc = new THREE.Color(), ox = len / 2;
  for (let i = 0; i < fp.count; i++) {
    const X = fp.getX(i) + ox, Z = fp.getZ(i); let y = Math.sin(X * 0.031) * Math.cos(Z * 0.047) * 0.9 + 0.4 * Math.sin(X * 0.11 + Z * 0.08), shade = 0.5 + 0.25 * Math.sin(X * 0.02 + Z * 0.03);
    for (const c of craters) { const d = Math.hypot(X - c.x, Z - c.z) / c.r; if (d < 1.25) { y += d < 1 ? -3.2 * (1 - d * d) : 2.2 * Math.exp(-((d - 1) * 9) * ((d - 1) * 9)); shade -= d < 1 ? 0.28 * (1 - d) : 0; if (d >= 0.95 && d < 1.2) shade += 0.18; } }
    fp.setY(i, y); tc.copy(b).lerp(a, Math.max(0, Math.min(1, shade))); fc[i * 3] = tc.r; fc[i * 3 + 1] = tc.g; fc[i * 3 + 2] = tc.b;
  }
  fg.setAttribute('color', new THREE.BufferAttribute(fc, 3)); fg.computeVertexNormals();
  const floor = new THREE.Mesh(fg, new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x2a2c36, emissiveIntensity: 0.35 })); floor.position.set(len / 2, MOON_FLOOR, 0); sceneryGroup.add(floor);

  // basalt cliffs holding the road up, plus wider blocks further back
  const cliffGeo = new THREE.CylinderGeometry(0.62, 1, 1, 7), n = low ? 40 : 96;
  for (let i = 0; i < n; i++) {
    const x = -40 + (i / n) * (len + 160) + (rnd() - 0.5) * 14, side = i % 2 ? -1 : 1, gh = ground(Math.max(0, Math.min(len, x))), top = (gh === null ? 0 : gh) - 4 - rnd() * 8;
    const r = 5 + rnd() * 10, zr = r * (0.7 + rnd() * 0.6), z = side * (W + 6 + zr + rnd() * 50), h = top - MOON_FLOOR + rnd() * 6;
    const m = new THREE.Mesh(cliffGeo, greyMats[i % greyMats.length]); m.scale.set(r, h, zr); m.position.set(x, MOON_FLOOR + h / 2, z); m.rotation.y = rnd() * 3; sceneryGroup.add(m);
  }
  // boulders scattered on the regolith (instanced)
  const nb = low ? 90 : 260, rockGeo = new THREE.IcosahedronGeometry(1, 0), rocks = new THREE.InstancedMesh(rockGeo, lam(0xffffff, 0.14), nb), mt = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pp = new THREE.Vector3(), ss = new THREE.Vector3(), cc = new THREE.Color();
  for (let i = 0; i < nb; i++) {
    const sc = 0.8 + rnd() * rnd() * 6, side = rnd() < 0.5 ? -1 : 1, x = rnd() * len, z = side * (W + 10 + rnd() * 90);
    e.set(rnd() * 3, rnd() * 3, rnd() * 3); q.setFromEuler(e); pp.set(x, MOON_FLOOR + sc * 0.5 - 1, z); ss.set(sc * (0.8 + rnd() * 0.6), sc * (0.5 + rnd() * 0.5), sc * (0.8 + rnd() * 0.6)); mt.compose(pp, q, ss); rocks.setMatrixAt(i, mt); cc.setHex(MOON_GREYS[i % MOON_GREYS.length]); rocks.setColorAt(i, cc);
  }
  sceneryGroup.add(rocks);
  // lunar lander on a plateau beside the start
  { const plat = new THREE.Mesh(new THREE.CylinderGeometry(11, 13, MOON_FLOOR * -1 - 5, 10), greyMats[2]); plat.position.set(34, MOON_FLOOR + (-MOON_FLOOR - 5) / 2, -(W + 15)); sceneryGroup.add(plat);
    const g = new THREE.Group(), gold = lam(0xd9b45a, 0.35), foil = lam(0xe8e8ee, 0.3);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3, 2.6, 8), gold); body.position.y = 3.6; g.add(body);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.6, 1.6, 8), foil); top.position.y = 5.5; g.add(top);
    for (let k = 0; k < 4; k++) { const an = k * Math.PI / 2 + Math.PI / 4, leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 4.2, 5), foil); leg.position.set(Math.cos(an) * 2.7, 1.9, Math.sin(an) * 2.7); leg.rotation.z = Math.cos(an) * 0.45; leg.rotation.x = -Math.sin(an) * 0.45; g.add(leg); const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.12, 8), foil); pad.position.set(Math.cos(an) * 3.6, 0.1, Math.sin(an) * 3.6); g.add(pad); }
    const dish = new THREE.Mesh(new THREE.ConeGeometry(1, 0.6, 12, 1, true), foil); dish.position.set(0, 6.8, 0); dish.rotation.z = 2.5; g.add(dish);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), glowMats[1]); lamp.position.set(0, 7.3, 0); g.add(lamp);
    g.position.set(34, -4.8, -(W + 15)); sceneryGroup.add(g); }
  // road signs
  for (const sg of (L.moonSigns || [])) { const S0 = sg[0], y = refH(S0), poleMat = new THREE.MeshLambertMaterial({ color: 0x4a4e5c }), g = new THREE.Group();
    for (const sd of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6.4, 0.4), poleMat); p.position.set(0, 3.2, sd * (W + 0.7)); g.add(p); }
    const board = new THREE.Mesh(new THREE.PlaneGeometry(2 * W + 1.4, (2 * W + 1.4) / 2), new THREE.MeshBasicMaterial({ map: chevronTex(sg[1]), side: THREE.DoubleSide }));
    board.rotation.y = -Math.PI / 2; board.position.set(0, 5.2, 0); g.add(board); placeOnRoad(g, S0, y, 0, y); sceneryGroup.add(g); }
  if (L.spiral) buildMoonSpiral(L, greyMats, glowMats);
  if (L.collapse) buildMoonCollapse(L);
  buildRoadside(L); buildHoops(L);
  // dense starfield follows the camera
  { const ns = low ? 420 : 900, p = new Float32Array(ns * 3);
    for (let i = 0; i < ns; i++) { const an = rnd() * 6.283, u = 0.1 + rnd() * 0.9, r = 380; p[i * 3] = Math.cos(an) * r * 0.9; p[i * 3 + 1] = u * r * 0.7; p[i * 3 + 2] = -Math.abs(Math.sin(an)) * r - 60; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    starPts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.7, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.95 })); starPts.frustumCulled = false; sceneryGroup.add(starPts); }
}
function earthTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#1f6fd0'; g.fillRect(0, 0, 256, 128);
  g.fillStyle = '#3fa65a'; for (const k of [[40, 40, 26, 16], [90, 80, 18, 24], [160, 46, 30, 14], [210, 84, 20, 12], [130, 100, 24, 8]]) { g.beginPath(); g.ellipse(k[0], k[1], k[2], k[3], 0.4, 0, 7); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,0.7)'; for (let i = 0; i < 14; i++) { g.beginPath(); g.ellipse(Math.random() * 256, Math.random() * 128, 14 + Math.random() * 22, 3 + Math.random() * 5, Math.random() - 0.5, 0, 7); g.fill(); }
  g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 7); g.fillRect(0, 121, 256, 7);
  return new THREE.CanvasTexture(c);
}
function moonEnv(L, E, low) {
  const len = track.length;
  const earth = new THREE.Mesh(new THREE.SphereGeometry(40, 32, 24), new THREE.MeshBasicMaterial({ map: earthTexture(), fog: false }));
  earth.position.set(-300, 210, -430); skyFollow.add(earth);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(['rgba(120,190,255,0.7)', 'rgba(60,120,255,0.25)', 'rgba(0,0,0,0)']), fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending }));
  halo.scale.set(190, 190, 1); halo.position.copy(earth.position); skyFollow.add(halo);
  const mg = new THREE.ConeGeometry(1, 1, 8), mc = new THREE.Color(E.mount);
  for (let i = 0; i < (low ? 12 : 28); i++) {
    const x = -100 + (i / 28) * (len + 300), z = (i % 2 ? -1 : 1) * (260 + rnd() * 200), h = 40 + rnd() * 90, r = 90 + rnd() * 110;
    const m = new THREE.Mesh(mg, new THREE.MeshLambertMaterial({ color: mc, emissive: mc, emissiveIntensity: 0.35 })); m.scale.set(r, h, r); m.position.set(x, MOON_FLOOR + h / 2 - 4, z); envGroup.add(m);
  }
  const nm = low ? 100 : 260, p = new Float32Array(nm * 3);
  for (let i = 0; i < nm; i++) { p[i * 3] = rnd() * len; p[i * 3 + 1] = -8 + rnd() * 34; p[i * 3 + 2] = (rnd() - 0.5) * 120; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  motes = new THREE.Points(g, new THREE.PointsMaterial({ color: E.mote, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
  motes.frustumCulled = false; envGroup.add(motes);
}

/* Spiral towers (L.spiral = [[x0, x1, y0, y1]]): a grey rock pillar wrapped by a glowing helix road, standing behind the climb */
function buildMoonSpiral(L, greyMats, glowMats) {
  const low = settings.quality === 'low', slabGeo = new THREE.BoxGeometry(7, 0.7, 1), rimGeo = new THREE.BoxGeometry(0.4, 0.5, 1);
  for (const t of L.spiral) {
    const cx = (t[0] + t[1]) / 2, cz = -48, R = 15, top = t[3] + 8, turns = 3, n = low ? 54 : 108, g = new THREE.Group();
    const pil = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 7, top - MOON_FLOOR, 10), greyMats[1]); pil.position.set(cx, MOON_FLOOR + (top - MOON_FLOOR) / 2, cz); g.add(pil);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(7, 9, 10), glowMats[0]); cap.position.set(cx, top + 4.5, cz); g.add(cap);
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), a = u * turns * Math.PI * 2, y = t[2] + 4 + u * (t[3] - t[2]), arc = (turns * Math.PI * 2 * R) / n * 1.06, slope = (t[3] - t[2]) / (turns * Math.PI * 2 * R);
      const s = new THREE.Mesh(slabGeo, greyMats[3]); s.scale.z = arc; s.rotation.order = 'YXZ'; s.rotation.y = -a; s.rotation.x = -Math.atan(slope); s.position.set(cx + Math.cos(a) * R, y, cz + Math.sin(a) * R);
      const r = new THREE.Mesh(rimGeo, glowMats[i % 2]); r.scale.z = arc; r.rotation.copy(s.rotation); r.position.set(cx + Math.cos(a) * (R + 3.4), y + 0.4, cz + Math.sin(a) * (R + 3.4));
      g.add(s, r);
    }
    sceneryGroup.add(g);
  }
}
/* Moon Collapse (L.collapse): glowing cracks in the regolith and boulders drifting up off the surface as the Moon breaks apart */
function buildMoonCollapse(L) {
  const low = settings.quality === 'low', len = track.length, n = low ? 70 : 170;
  const mesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x4a1608, emissiveIntensity: 0.7 }), n);
  mesh.frustumCulled = false;
  const d = [], cc = new THREE.Color();
  for (let i = 0; i < n; i++) { d.push({ x: 0, y: 0, z: 0, vy: 0, s: 1, rx: rnd() * 6, ry: rnd() * 6, wx: (rnd() - 0.5) * 1.6, wy: (rnd() - 0.5) * 1.6 }); cc.setHex(MOON_GREYS[i % MOON_GREYS.length]); mesh.setColorAt(i, cc); }
  const crackMat = new THREE.MeshBasicMaterial({ color: 0xff5a1a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }), crackGeo = new THREE.BoxGeometry(1, 0.2, 1);
  for (let i = 0; i < (low ? 30 : 70); i++) { const c = new THREE.Mesh(crackGeo, crackMat), l = 20 + rnd() * 90; c.scale.set(l, 1, 0.5 + rnd() * 1.4); c.rotation.y = rnd() * 3.14; c.position.set(rnd() * len, MOON_FLOOR + 1.4, (rnd() - 0.5) * 300); sceneryGroup.add(c); }
  sceneryGroup.add(mesh);
  collapse = { mesh, d, n, m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), p: new THREE.Vector3(), sc: new THREE.Vector3(), init: false };
}
function updateCollapse(dt) {
  const C = collapse; if (!C) return;
  const cx = camera.position.x, R = Math.random;
  for (let i = 0; i < C.n; i++) {
    const o = C.d[i];
    if (!C.init || o.y > 75 || o.x < cx - 70) { o.x = cx - 40 + R() * 260; o.z = (R() < 0.5 ? -1 : 1) * (W + 6 + R() * 80); o.y = MOON_FLOOR + R() * (C.init ? 4 : 60); o.vy = 1.5 + R() * 7; o.s = 0.8 + R() * R() * 5; }
    o.y += o.vy * dt; o.rx += o.wx * dt; o.ry += o.wy * dt;
    C.e.set(o.rx, o.ry, 0); C.q.setFromEuler(C.e); C.p.set(o.x, o.y, o.z); C.sc.set(o.s, o.s * 0.7, o.s); C.m.compose(C.p, C.q, C.sc); C.mesh.setMatrixAt(i, C.m);
  }
  C.init = true; C.mesh.instanceMatrix.needsUpdate = true;
}
