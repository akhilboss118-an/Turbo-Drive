/* eslint-disable */
'use strict';
/* Desert biome kit (level 5): sand floor, layered mesas, hoodoos, rocks, sparse trees and cacti, spiral entry sign, canyon cliffs. */
const DESERT_FLOOR = -6;
const STRATA = [0x9c4a2e, 0xc2693a, 0xa85634, 0xd98f4e, 0x8a3f2a];
function roadSamples(step) {
  const out = [], v = new THREE.Vector3();
  for (let s = 0; s <= track.length; s += step) { const y = refH(s); toWorld(s, y, 0, v, y); out.push({ s, x: v.x, z: v.z, y }); }
  return out;
}
// horizontal distance from (x,z) to the nearest road centreline sample (optionally ignoring samples near s0)
function roadDist(smp, x, z, s0, sGap) {
  let m = 1e9;
  for (let i = 0; i < smp.length; i++) { const p = smp[i]; if (s0 !== undefined && Math.abs(p.s - s0) < sGap) continue; const d = Math.hypot(p.x - x, p.z - z); if (d < m) m = d; }
  return m;
}
function buildDesertScenery(L) {
  const low = settings.quality === 'low', FL = DESERT_FLOOR, smp = roadSamples(3);
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of smp) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, spanX = (x1 - x0) / 2 + 300, spanZ = (z1 - z0) / 2 + 300;
  const lam = (c, e) => new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: e === undefined ? 0.14 : e });
  const strataMats = STRATA.map((c) => lam(c)), topMat = lam(0xc98a58, 0.12), rockMats = [0x7a3d2a, 0x8f4b30, 0x6a3426].map((c) => lam(c, 0.18));

  // sand floor with soft dunes (vertex colours)
  const fg = new THREE.PlaneGeometry(2400, 2400, 80, 80); fg.rotateX(-Math.PI / 2);
  const fp = fg.attributes.position, fc = new Float32Array(fp.count * 3), sandA = new THREE.Color(0xc98550), sandB = new THREE.Color(0x9a5530), tc = new THREE.Color();
  for (let i = 0; i < fp.count; i++) {
    const X = fp.getX(i) + cx, Z = fp.getZ(i) + cz, n = Math.sin(X * 0.013) * Math.cos(Z * 0.011) + 0.5 * Math.sin(X * 0.031 + Z * 0.027);
    fp.setY(i, n * 1.1); tc.copy(sandA).lerp(sandB, 0.5 + 0.5 * Math.sin(X * 0.02 - Z * 0.015 + n)); fc[i * 3] = tc.r; fc[i * 3 + 1] = tc.g; fc[i * 3 + 2] = tc.b;
  }
  fg.setAttribute('color', new THREE.BufferAttribute(fc, 3)); fg.computeVertexNormals();
  const floor = new THREE.Mesh(fg, new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x6a2a18, emissiveIntensity: 0.12 })); floor.position.set(cx, FL, cz); sceneryGroup.add(floor);

  // layered mesa: stacked, slightly inset ellipse cylinders with a pale flat top
  const mesaGeo = new THREE.CylinderGeometry(0.93, 1, 1, low ? 14 : 22);
  function mesa(x, z, rx, rz, topY, layers) {
    const g = new THREE.Group(); g.position.set(x, 0, z); const H = topY - FL;
    for (let i = 0; i < layers; i++) {
      const h = H / layers, grow = 1 - 0.05 * (layers - 1 - i) * 0.8, m = new THREE.Mesh(mesaGeo, [strataMats[(i + ((x | 0) & 3)) % STRATA.length], i === layers - 1 ? topMat : strataMats[0], strataMats[0]]);
      m.scale.set(rx * grow, h, rz * grow); m.position.y = FL + h * (i + 0.5); g.add(m);
    }
    sceneryGroup.add(g); return g;
  }
  mesa(62, 0, 100, 50, 29.6, 6);                          // the start mesa under the first 150 m of road
  const mesas = [{ x: 62, z: 0, r: 100 }];
  for (let tries = 0, n = 0; tries < 200 && n < (low ? 9 : 16); tries++) {
    const x = cx + (rnd() - 0.5) * 2 * spanX, z = cz + (rnd() - 0.5) * 2 * spanZ, r = 16 + rnd() * 34, rx = r * (0.8 + rnd() * 0.5), rz = r * (0.8 + rnd() * 0.5);
    if (roadDist(smp, x, z) < Math.max(rx, rz) + W + 12) continue;
    if (mesas.some((m) => Math.hypot(m.x - x, m.z - z) < m.r + Math.max(rx, rz) + 8)) continue;
    mesa(x, z, rx, rz, FL + 10 + rnd() * 40, 3 + Math.floor(rnd() * 3)); mesas.push({ x, z, r: Math.max(rx, rz) }); n++;
  }

  // hoodoos / rock pillars standing beside the spiral, topped just under the road
  const pillarGeo = new THREE.CylinderGeometry(0.55, 1.4, 1, 8), capGeo = new THREE.CylinderGeometry(1, 0.8, 1, 8), v = new THREE.Vector3();
  for (let s = 215, k = 0; s < 1000; s += (low ? 44 : 26) + rnd() * 20, k++) {
    const side = rnd() < 0.5 ? -1 : 1, lat = side * (W + 7 + rnd() * 14), ry = refH(s); toWorld(s, ry, lat, v, ry);
    const r = 1.8 + rnd() * 2.2, top = ry - 1.5 - rnd() * 4;
    if (roadDist(smp, v.x, v.z) < W + r * 1.6 + 3) continue;
    const h = top - FL, p = new THREE.Mesh(pillarGeo, strataMats[k % STRATA.length]); p.scale.set(r, h, r); p.position.set(v.x, FL + h / 2, v.z); sceneryGroup.add(p);
    const c = new THREE.Mesh(capGeo, topMat); c.scale.set(r * 1.25, 1.1 + rnd() * 0.8, r * 1.25); c.position.set(v.x, top + 0.4, v.z); sceneryGroup.add(c);
  }

  // boulders
  const rockGeo = new THREE.DodecahedronGeometry(1, 0), nRock = low ? 50 : 130;
  for (let i = 0, n = 0; i < nRock * 3 && n < nRock; i++) {
    const x = cx + (rnd() - 0.5) * 2 * spanX, z = cz + (rnd() - 0.5) * 2 * spanZ, r = 0.8 + rnd() * rnd() * 4;
    if (roadDist(smp, x, z) < W + r + 2 || mesas.some((m) => Math.hypot(m.x - x, m.z - z) < m.r + r)) continue;
    const m = new THREE.Mesh(rockGeo, rockMats[i % 3]); m.scale.set(r * (1 + rnd() * 0.6), r * (0.5 + rnd() * 0.5), r * (1 + rnd() * 0.6)); m.position.set(x, FL + r * 0.25, z); m.rotation.y = rnd() * 6.28; sceneryGroup.add(m); n++;
  }

  // sparse trees (flat-topped acacias) and cacti
  const trunkGeo = new THREE.CylinderGeometry(0.14, 0.26, 1, 5), canopyGeo = new THREE.SphereGeometry(1, 9, 6), trunkMat = lam(0x5a3a22, 0.1), leafMat = lam(0x6f7d3a, 0.2);
  const cactGeo = new THREE.CylinderGeometry(0.34, 0.4, 1, 7), armGeo = new THREE.CylinderGeometry(0.22, 0.22, 1, 6), cactMat = lam(0x3f8a50, 0.25);
  const nTree = low ? 14 : 34;
  for (let i = 0, n = 0; i < nTree * 4 && n < nTree; i++) {
    const x = cx + (rnd() - 0.5) * 2 * (spanX - 60), z = cz + (rnd() - 0.5) * 2 * (spanZ - 60);
    if (roadDist(smp, x, z) < W + 6 || mesas.some((m) => Math.hypot(m.x - x, m.z - z) < m.r + 3)) continue;
    const g = new THREE.Group(), th = 2.2 + rnd() * 1.6, sc = 0.9 + rnd() * 0.9; g.position.set(x, FL + 0.1, z); g.scale.setScalar(sc);
    if (i % 3) {
      const t = new THREE.Mesh(trunkGeo, trunkMat); t.scale.y = th; t.position.y = th / 2; t.rotation.z = (rnd() - 0.5) * 0.25; g.add(t);
      const c = new THREE.Mesh(canopyGeo, leafMat); c.scale.set(2.2 + rnd(), 0.55, 2.2 + rnd()); c.position.y = th + 0.15; g.add(c);
    } else {
      const t = new THREE.Mesh(cactGeo, cactMat); t.scale.y = th; t.position.y = th / 2; g.add(t);
      for (const sd of [-1, 1]) { const a = new THREE.Mesh(armGeo, cactMat); a.scale.y = th * 0.4; a.position.set(sd * 0.55, th * (0.45 + rnd() * 0.15), 0); g.add(a); const u = new THREE.Mesh(armGeo, cactMat); u.scale.set(1, th * 0.28, 1); u.position.set(sd * 0.55, th * 0.62 + th * 0.2, 0); g.add(u); }
    }
    sceneryGroup.add(g); n++;
  }

  // canyon cliffs either side of the final jump (gap 1084-1110)
  const q = frameQuat(1096), cliffMats = [strataMats[0], strataMats[1], strataMats[2]];
  for (const sd of [-1, 1]) {
    const lat = sd * (W + 3), seg = 3, top = 4.4;
    for (let i = 0; i < seg; i++) {
      const hh = (top - FL) / seg, w = 21 - i * 2.2, len = 76 - i * 7, b = new THREE.Mesh(new THREE.BoxGeometry(len, hh, w), cliffMats[(i + (sd > 0 ? 1 : 0)) % 3]);
      toWorld(1096, FL + hh * (i + 0.5), sd * (W + 3 + w / 2), b.position, 0); b.quaternion.copy(q); sceneryGroup.add(b);
    }
  }
  buildSpiralSign(L);
}
function chevronTex(txt) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#2a1040'; g.fillRect(0, 0, 256, 128); g.strokeStyle = '#ffd34d'; g.lineWidth = 6; g.strokeRect(5, 5, 246, 118);
  g.fillStyle = '#ffd34d'; g.font = '700 54px "Big Shoulders Display", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, 128, 46);
  g.strokeStyle = '#ff7a2a'; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round';
  for (let i = 0; i < 4; i++) { const x = 70 + i * 40; g.beginPath(); g.moveTo(x + 14, 84); g.lineTo(x, 100); g.lineTo(x + 14, 116); g.stroke(); }
  return new THREE.CanvasTexture(c);
}
function arrowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.strokeStyle = '#ff9a3a'; g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round'; g.globalAlpha = 0.9;
  g.beginPath(); g.moveTo(24, 78); g.lineTo(64, 34); g.lineTo(104, 78); g.stroke(); g.beginPath(); g.moveTo(24, 118); g.lineTo(64, 74); g.lineTo(104, 118); g.stroke();
  return new THREE.CanvasTexture(c);
}
// "SPIRAL" gantry sign and left-pointing road arrows at the spiral entry (s = 200)
function buildSpiralSign(L) {
  const S0 = 192, y = refH(S0), poleMat = new THREE.MeshLambertMaterial({ color: 0x4a2a1a }), g = new THREE.Group();
  for (const sd of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6.4, 0.4), poleMat); p.position.set(0, 3.2, sd * (W + 0.7)); g.add(p); }
  const board = new THREE.Mesh(new THREE.PlaneGeometry(2 * W + 1.4, (2 * W + 1.4) / 2), new THREE.MeshBasicMaterial({ map: chevronTex('SPIRAL'), side: THREE.DoubleSide }));
  board.rotation.y = -Math.PI / 2; board.position.set(0, 5.2, 0); g.add(board);
  placeOnRoad(g, S0, y, 0, y); sceneryGroup.add(g);
  const at = arrowTex(), qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  for (const s of [168, 178, 188]) {   // texture "up" lies along world -z, i.e. to the left
    const m = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 5.2), new THREE.MeshBasicMaterial({ map: at, transparent: true, depthWrite: false }));
    const yy = refH(s); toWorld(s, yy + 0.07, 0, m.position, yy); frameQuat(s, m.quaternion).multiply(qx); sceneryGroup.add(m);
  }
}
// sunrise sky furniture: high streak clouds, far mountain ring, drifting dust motes
function desertEnv(L, E, low) {
  const smp = roadSamples(6); let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of smp) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const cTex = cloudTexture(), nCl = low ? 14 : 34;
  for (let i = 0; i < nCl; i++) {
    const m = new THREE.SpriteMaterial({ map: cTex, color: i % 3 ? E.cloud : E.cloud2, transparent: true, opacity: 0.35 + rnd() * 0.3, depthWrite: false, blending: i % 2 ? THREE.NormalBlending : THREE.AdditiveBlending });
    const sp = new THREE.Sprite(m), w = 160 + rnd() * 240, a = rnd() * 6.283, d = 250 + rnd() * 450;
    sp.scale.set(w, w * 0.32, 1); sp.position.set(cx + Math.cos(a) * d, 90 + rnd() * 90, cz + Math.sin(a) * d); envGroup.add(sp);
  }
  const mg = new THREE.ConeGeometry(1, 1, 7), mc = new THREE.Color(E.mount);
  for (let i = 0; i < (low ? 14 : 30); i++) {
    const a = (i / (low ? 14 : 30)) * 6.283 + rnd() * 0.15, d = 520 + rnd() * 160, h = 50 + rnd() * 110, r = 70 + rnd() * 90;
    const m = new THREE.Mesh(mg, new THREE.MeshLambertMaterial({ color: mc, emissive: mc, emissiveIntensity: 0.5 })); m.scale.set(r, h, r); m.position.set(cx + Math.cos(a) * d, DESERT_FLOOR + h / 2 - 4, cz + Math.sin(a) * d); envGroup.add(m);
  }
  const nm = low ? 100 : 260, p = new Float32Array(nm * 3);
  for (let i = 0; i < nm; i++) { p[i * 3] = cx + (rnd() - 0.5) * 520; p[i * 3 + 1] = DESERT_FLOOR + 2 + rnd() * 50; p[i * 3 + 2] = cz + (rnd() - 0.5) * 520; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  motes = new THREE.Points(g, new THREE.PointsMaterial({ color: E.mote, size: 2.6, sizeAttenuation: false, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
  motes.frustumCulled = false; envGroup.add(motes);
}
