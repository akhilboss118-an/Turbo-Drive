/* eslint-disable */
'use strict';
/* INFINITE LOOP circuit (LEVELS[n].biome === 'circuit'): sky, ground, trees, lamps, kerbs, bridge, grandstand + slow-down obstacles (oil, sand, mud, cones) */
const circ = { cones: [], zones: [], roadPts: [], tex: {} };
const LOOPCOL = { oil: 0x7a5cff, sand: 0xe0b862, mud: 0x6a4424, cones: 0xff7a1a };

function circNoiseTex(base, speck, n, rep, size) {
  const c = document.createElement('canvas'); c.width = c.height = size || 256; const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < n; i++) { g.fillStyle = speck[i % speck.length]; const x = Math.random() * c.width, y = Math.random() * c.height, r = 1 + Math.random() * 3; g.fillRect(x, y, r, r); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = 4; return t;
}
function circBlob(g, cx, cy, rx, ry, fill, jit) {
  g.beginPath(); const N = 40;
  for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2, j = 1 + (Math.sin(a * 3 + jit) * 0.08 + Math.sin(a * 7 + jit * 2) * 0.05 + Math.sin(a * 11 + jit * 3) * 0.03); const x = cx + Math.cos(a) * rx * j, y = cy + Math.sin(a) * ry * j; i ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.closePath(); g.fillStyle = fill; g.fill();
}
function circPatchTex(kind) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d');
  g.shadowBlur = 10; g.shadowColor = kind === 'oil' ? '#05030a' : kind === 'sand' ? '#c99a4a' : '#2a180c';
  if (kind === 'oil') {
    circBlob(g, 256, 128, 228, 112, '#0a0712', 1); circBlob(g, 130, 120, 100, 80, '#07050d', 2); circBlob(g, 390, 140, 100, 78, '#0b0816', 3);
    g.shadowBlur = 0; g.globalCompositeOperation = 'source-atop';
    const gr = g.createLinearGradient(0, 0, 512, 256); gr.addColorStop(0, 'rgba(0,255,220,.55)'); gr.addColorStop(0.35, 'rgba(160,80,255,.55)'); gr.addColorStop(0.65, 'rgba(255,60,170,.5)'); gr.addColorStop(1, 'rgba(255,220,60,.45)');
    g.globalAlpha = 0.6; g.fillStyle = gr; for (let i = 0; i < 7; i++) { g.beginPath(); g.ellipse(70 + i * 62, 128 + Math.sin(i * 1.7) * 50, 70, 22, 0.6 + i * 0.3, 0, 7); g.fill(); }
    g.globalAlpha = 0.5; g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(200, 80, 40, 9, -0.3, 0, 7); g.fill(); g.beginPath(); g.ellipse(340, 170, 30, 7, 0.2, 0, 7); g.fill();
  } else if (kind === 'sand') {
    circBlob(g, 256, 128, 232, 116, '#d9b062', 4); g.shadowBlur = 0; g.globalCompositeOperation = 'source-atop';
    g.strokeStyle = 'rgba(150,100,40,.45)'; g.lineWidth = 3; for (let y = -20; y < 300; y += 14) { g.beginPath(); for (let x = 0; x <= 512; x += 16) { const yy = y + Math.sin(x * 0.045 + y * 0.2) * 6; x ? g.lineTo(x, yy) : g.moveTo(x, yy); } g.stroke(); }
    for (let i = 0; i < 900; i++) { g.fillStyle = i % 3 ? 'rgba(255,235,170,.55)' : 'rgba(110,70,25,.5)'; g.fillRect(Math.random() * 512, Math.random() * 256, 2, 2); }
  } else {
    circBlob(g, 256, 128, 232, 114, '#3d2412', 5); g.shadowBlur = 0; g.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < 26; i++) { g.fillStyle = 'rgba(' + (60 + Math.random() * 40) + ',' + (36 + Math.random() * 20) + ',18,.55)'; g.beginPath(); g.ellipse(Math.random() * 512, Math.random() * 256, 14 + Math.random() * 34, 8 + Math.random() * 16, Math.random() * 3, 0, 7); g.fill(); }
    for (let i = 0; i < 9; i++) { const x = 40 + Math.random() * 430, y = 30 + Math.random() * 190; g.fillStyle = 'rgba(120,150,170,.55)'; g.beginPath(); g.ellipse(x, y, 26 + Math.random() * 20, 12 + Math.random() * 8, Math.random(), 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.ellipse(x - 8, y - 4, 8, 3, 0, 0, 7); g.fill(); }
  }
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}
function circSignTex(txt, sub, col) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.translate(128, 128); g.rotate(Math.PI / 4); g.fillStyle = '#16121c'; g.fillRect(-92, -92, 184, 184); g.fillStyle = col; g.fillRect(-82, -82, 164, 164); g.fillStyle = '#ffd34d'; g.fillRect(-72, -72, 144, 144);
  g.rotate(-Math.PI / 4); g.fillStyle = '#16121c'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 54px "Big Shoulders Display", Impact, sans-serif'; g.fillText(txt, 128, 112); g.font = '700 26px "Big Shoulders Display", Impact, sans-serif'; g.fillText(sub, 128, 156);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}
function circBoardTex(txt) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 512, 0); gr.addColorStop(0, '#16102a'); gr.addColorStop(1, '#3a1650'); g.fillStyle = gr; g.fillRect(0, 0, 512, 128);
  g.strokeStyle = '#ffb347'; g.lineWidth = 6; g.strokeRect(5, 5, 502, 118); g.fillStyle = '#ffe9b0'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '800 74px "Big Shoulders Display", Impact, sans-serif'; g.fillText(txt, 256, 68);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4; return t;
}
function circFarFromRoad(x, z, d) { const P = circ.roadPts, d2 = d * d; for (let i = 0; i < P.length; i += 2) { const dx = P[i] - x, dz = P[i + 1] - z; if (dx * dx + dz * dz < d2) return false; } return true; }

/* ---------- scenery ---------- */
function buildCircuitScenery(L) {
  const T = track, lo = T.loop, TP = T.path, low = settings.quality === 'low', add = (o) => sceneryGroup.add(o);
  circ.roadPts = []; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (let s = 0; s < lo.LP; s += 3) { const f = TP.at(s); circ.roadPts.push(f.x, f.z); x0 = Math.min(x0, f.x); x1 = Math.max(x1, f.x); z0 = Math.min(z0, f.z); z1 = Math.max(z1, f.z); }
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  // ground
  const gt = circNoiseTex('#1d4a3c', ['#2a6a50', '#163a30', '#357a58', '#245a44'], 5000, 90, 256);
  const ground0 = new THREE.Mesh(new THREE.PlaneGeometry(3200, 3200), new THREE.MeshLambertMaterial({ map: gt, color: 0xb8d8c8 }));
  ground0.rotation.x = -Math.PI / 2; ground0.position.set(cx, -0.55, cz); add(ground0);
  // soft sand run-off ribbon beside the road
  { const P = [], C = [], col = new THREE.Color(0x8a7a56), col2 = new THREE.Color(0x6a6a5a);
    for (let s = 0; s < lo.LP; s += 2) for (const sd of [-1, 1]) {
      const h0 = lo.H(s), h1 = lo.H(s + 2), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), d = new THREE.Vector3();
      toWorld(s, h0 - 0.18, sd * (W + 0.8), a, h0); toWorld(s + 2, h1 - 0.18, sd * (W + 0.8), b, h1); toWorld(s + 2, -0.5, sd * (W + 5.5), c, h1); toWorld(s, -0.5, sd * (W + 5.5), d, h0);
      c.y = d.y = -0.5; P.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z);
      for (let k = 0; k < 6; k++) { const q = k % 3 === 2 || k === 5 ? col2 : col; C.push(q.r, q.g, q.b); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(C), 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })); m.frustumCulled = false; add(m); }
  // kerbs (red / white rumble strips) along both edges + concrete walls on the bridge
  { const P = [], C = [], red = new THREE.Color(0xe8283a), wht = new THREE.Color(0xf4f0e6), v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    const quad = (col) => { for (const i of [0, 1, 2, 0, 2, 3]) { P.push(v[i].x, v[i].y, v[i].z); C.push(col.r, col.g, col.b); } };
    for (let s = 0, k = 0; s < lo.LP - 2; s += 2.5, k++) for (const sd of [-1, 1]) {
      const h0 = lo.H(s), h1 = lo.H(s + 2.5), col = k % 2 ? red : wht;
      toWorld(s, h0 + 0.045, sd * W, v[0], h0); toWorld(s + 2.5, h1 + 0.045, sd * W, v[1], h1); toWorld(s + 2.5, h1 + 0.045, sd * (W + 0.95), v[2], h1); toWorld(s, h0 + 0.045, sd * (W + 0.95), v[3], h0); quad(col);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(C), 3));
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })); m.frustumCulled = false; add(m); }
  { const P = [], C = [], v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], wc = new THREE.Color(0xc8c4d4), wt = new THREE.Color(0xe8e4f0), wl = new THREE.Color(0x35e6ff);
    const quad = (col) => { for (const i of [0, 1, 2, 0, 2, 3]) { P.push(v[i].x, v[i].y, v[i].z); C.push(col.r, col.g, col.b); } };
    const a = lo.sB - lo.PLAT - lo.RAMP + 25, b = lo.sB + lo.PLAT + lo.RAMP - 25;
    for (let s = a; s < b; s += 2) for (const sd of [-1, 1]) {
      const h0 = lo.H(s), h1 = lo.H(s + 2), z0_ = sd * (W + 0.1), z1_ = sd * (W + 0.6);
      toWorld(s, h0, z0_, v[0], h0); toWorld(s + 2, h1, z0_, v[1], h1); toWorld(s + 2, h1 + 0.95, z0_, v[2], h1); toWorld(s, h0 + 0.95, z0_, v[3], h0); quad(wc);
      toWorld(s, h0 + 0.95, z0_, v[0], h0); toWorld(s + 2, h1 + 0.95, z0_, v[1], h1); toWorld(s + 2, h1 + 0.95, z1_, v[2], h1); toWorld(s, h0 + 0.95, z1_, v[3], h0); quad(wt);
      toWorld(s, h0 + 0.95, z1_, v[0], h0); toWorld(s + 2, h1 + 0.95, z1_, v[1], h1); toWorld(s + 2, h1, z1_, v[2], h1); toWorld(s, h0, z1_, v[3], h0); quad(wc);
      toWorld(s, h0 + 0.5, z0_ - sd * 0.02, v[0], h0); toWorld(s + 2, h1 + 0.5, z0_ - sd * 0.02, v[1], h1); toWorld(s + 2, h1 + 0.6, z0_ - sd * 0.02, v[2], h1); toWorld(s, h0 + 0.6, z0_ - sd * 0.02, v[3], h0); quad(wl);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(C), 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })); m.frustumCulled = false; add(m);
    // pylons under the deck
    const pm = new THREE.MeshLambertMaterial({ color: 0x8a86a0, emissive: 0x1a1830 });
    for (const ds of [-34, -18, 18, 34]) for (const sd of [-1, 1]) {
      const s = lo.sB + ds, h = lo.H(s), o = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.95, h + 0.4, 10), pm), q = new THREE.Vector3();
      toWorld(s, 0, sd * (W - 0.9), q, 0); o.position.set(q.x, (h - 2.4 - 0.5) / 2 - 0.2, q.z); o.scale.y = (h - 2.0 + 0.5) / (h + 0.4); add(o);
    }
  }
  // trees
  const nTree = low ? 260 : 620, fGeo = new THREE.ConeGeometry(1.7, 4.2, 7), tGeo = new THREE.CylinderGeometry(0.22, 0.32, 1.6, 6);
  const fol = new THREE.InstancedMesh(fGeo, new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x06241a }), nTree * 2), trk = new THREE.InstancedMesh(tGeo, new THREE.MeshLambertMaterial({ color: 0x4a2e22 }), nTree);
  const dm = new THREE.Object3D(), tc = new THREE.Color(); let nt = 0, tries = 0;
  const PAL = [0x1f6a4a, 0x2a7a50, 0x185a44, 0x358a5a, 0x2a6a6a, 0x3a7a3a];
  while (nt < nTree && tries++ < nTree * 8) {
    const x = x0 - 160 + rnd() * (x1 - x0 + 320), z = z0 - 160 + rnd() * (z1 - z0 + 320);
    if (!circFarFromRoad(x, z, 16)) continue;
    const sc = 0.8 + rnd() * 1.1; dm.rotation.set(0, rnd() * 6, 0); dm.scale.setScalar(sc);
    dm.position.set(x, -0.55 + 0.8 * sc, z); dm.updateMatrix(); trk.setMatrixAt(nt, dm.matrix);
    for (let k = 0; k < 2; k++) { dm.position.set(x, -0.55 + (2.4 + k * 1.9) * sc, z); dm.scale.setScalar(sc * (1 - k * 0.35)); dm.updateMatrix(); fol.setMatrixAt(nt * 2 + k, dm.matrix); tc.setHex(PAL[(rnd() * PAL.length) | 0]); fol.setColorAt(nt * 2 + k, tc); }
    nt++;
  }
  fol.count = nt * 2; trk.count = nt; add(fol); add(trk);
  // lamp posts (warm glow)
  const lampN = Math.floor(lo.LP / 34) * 2, pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.1, 0.14, 6.4, 6), new THREE.MeshLambertMaterial({ color: 0x35304a }), lampN);
  const arm = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, 0.14, 0.14), new THREE.MeshLambertMaterial({ color: 0x35304a }), lampN), bulb = new THREE.InstancedMesh(new THREE.SphereGeometry(0.34, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd9a0 }), lampN);
  const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(['rgba(255,214,150,0.95)', 'rgba(255,170,90,0.35)', 'rgba(255,140,60,0)']), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  let li = 0; const qv = new THREE.Vector3(), qq = new THREE.Quaternion();
  for (let s = 20, k = 0; s < lo.LP - 10 && li < lampN; s += 34, k++) for (const sd of [-1, 1]) {
    if (s > lo.sB - 120 && s < lo.sB + 120) continue;
    const h = lo.H(s); toWorld(s, h + 3.2, sd * (W + 2.2), qv, h); frameQuat(s, qq);
    dm.position.copy(qv); dm.quaternion.copy(qq); dm.scale.set(1, 1, 1); dm.updateMatrix(); pole.setMatrixAt(li, dm.matrix);
    toWorld(s, h + 6.35, sd * (W + 1.4), qv, h); dm.position.copy(qv); dm.quaternion.copy(qq); dm.rotateY(0); dm.updateMatrix(); arm.setMatrixAt(li, dm.matrix);
    dm.quaternion.identity(); toWorld(s, h + 6.25, sd * (W + 0.55), qv, h); dm.position.copy(qv); dm.updateMatrix(); bulb.setMatrixAt(li, dm.matrix);
    if (k % 2 === 0 && !low) { const sp = gl.clone(); sp.material = gl.material; sp.scale.set(9, 9, 1); sp.position.copy(qv); add(sp); }
    li++;
  }
  pole.count = arm.count = bulb.count = li; add(pole); add(arm); add(bulb);
  // trackside boards
  const texts = ['TURBO DRIVE', 'INFINITE LOOP', '5 LAPS', 'NITRO', 'DUEL RACE', 'FULL GAS'], bGeo = new THREE.PlaneGeometry(9, 2.25), pGeo = new THREE.BoxGeometry(0.25, 3.4, 0.25), pMat = new THREE.MeshLambertMaterial({ color: 0x2c2840 });
  const bTex = texts.map(circBoardTex); let bi = 0;
  for (let s = 70; s < lo.LP - 40; s += 118, bi++) {
    if (s > lo.sB - 140 && s < lo.sB + 140) continue; const sd = bi % 2 ? 1 : -1, h = lo.H(s), w = new THREE.Group();
    const b = new THREE.Mesh(bGeo, new THREE.MeshBasicMaterial({ map: bTex[bi % texts.length], side: THREE.DoubleSide })); b.position.y = 3.4; b.rotation.y = sd > 0 ? Math.PI : 0; w.add(b);
    for (const dx of [-3.8, 3.8]) { const p = new THREE.Mesh(pGeo, pMat); p.position.set(dx, 1.7, 0); w.add(p); }
    placeOnRoad(w, s, h, sd * (W + 8), h); add(w);
  }
  // grandstand beside the start straight (built in road frame: x = travel, z = away from the road on the left side)
  { const gs = new THREE.Group(), cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const g2 = cv.getContext('2d');
    g2.fillStyle = '#2a2640'; g2.fillRect(0, 0, 256, 64); const cols = ['#ff5a6a', '#ffd34d', '#35e6ff', '#9dff6a', '#ff9a3a', '#ffffff', '#c08cff'];
    for (let i = 0; i < 520; i++) { g2.fillStyle = cols[i % cols.length]; g2.fillRect(Math.random() * 256, Math.random() * 64, 3, 4); }
    const ct = new THREE.CanvasTexture(cv); ct.wrapS = ct.wrapT = THREE.RepeatWrapping; ct.repeat.set(6, 1);
    for (let i = 0; i < 4; i++) { const hh = 1.6 * (i + 1) + 0.55, st = new THREE.Mesh(new THREE.BoxGeometry(60, hh, 3), new THREE.MeshLambertMaterial({ map: ct, emissive: 0x201830 })); st.position.set(0, hh / 2 - 0.55, -i * 3); gs.add(st); }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(62, 0.4, 16), new THREE.MeshLambertMaterial({ color: 0x3a2c58, emissive: 0x1a1030 })); roof.position.set(0, 9.2, -4.5); gs.add(roof);
    for (const dx of [-29, 29]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 9.5, 0.5), new THREE.MeshLambertMaterial({ color: 0x35304a })); p.position.set(dx, 4.2, -11.5); gs.add(p); }
    placeOnRoad(gs, lo.START + 10, 0, -(W + 14), 0); add(gs); }
  // start / finish arch with banner
  { const g = new THREE.Group(), pm = new THREE.MeshLambertMaterial({ color: 0x2e2a46, emissive: 0x100c20 }), h = lo.H(lo.START);
    for (const sd of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.9, 11, 0.9), pm); p.position.set(0, 5.5, sd * (W + 1.6)); g.add(p); }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.6, 2 * (W + 1.6) + 0.9), pm); bar.position.y = 10.6; g.add(bar);
    const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const k = c.getContext('2d'); k.fillStyle = '#12101e'; k.fillRect(0, 0, 1024, 256);
    for (let i = 0; i < 64; i++) for (let j = 0; j < 2; j++) { k.fillStyle = (i + j) % 2 ? '#fff' : '#111'; k.fillRect(i * 16, j * 16, 16, 16); k.fillRect(i * 16, 224 + j * 16 - 16, 16, 16); }
    k.fillStyle = '#ffb347'; k.font = '800 120px "Big Shoulders Display", Impact, sans-serif'; k.textAlign = 'center'; k.textBaseline = 'middle'; k.fillText('INFINITE LOOP', 512, 108); k.fillStyle = '#35e6ff'; k.font = '700 46px "Big Shoulders Display", Impact, sans-serif'; k.fillText('START  \u00B7  FINISH  \u00B7  5 LAPS', 512, 190);
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(2 * (W + 1.6), (2 * (W + 1.6)) / 4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), side: THREE.DoubleSide })); sg.rotation.y = -Math.PI / 2; sg.position.set(-0.5, 10.6, 0); g.add(sg);
    placeOnRoad(g, lo.START + 14, h, 0, h); add(g); }
  buildCircuitObstacles(L);
}

/* ---------- obstacles: slow-down zones + knock-over cones ---------- */
const COL_LABEL = { oil: ['OIL SLICK', 'Slippery - you slow down'], sand: ['SAND PATCH', 'Deep sand - you slow down'], mud: ['MUD PIT', 'Thick mud - you slow down'], cones: ['CONES', 'Hit them and you lose speed'] };
function makeCone() {
  const g = new THREE.Group(), o = new THREE.MeshLambertMaterial({ color: 0xff6a1a, emissive: 0x4a1400 }), w = new THREE.MeshLambertMaterial({ color: 0xf6f2ea, emissive: 0x3a3a3a });
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.07, 0.85), new THREE.MeshLambertMaterial({ color: 0x2a2a34 })); base.position.y = 0.035; g.add(base);
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.0, 12), o); body.position.y = 0.58; g.add(body);
  const s1 = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.27, 0.13, 12), w); s1.position.y = 0.4; g.add(s1);
  const s2 = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.11, 12), w); s2.position.y = 0.7; g.add(s2);
  return g;
}
function buildCircuitObstacles(L) {
  circ.cones.length = 0; circ.zones.length = 0; const lo = track.loop, add = (o) => sceneryGroup.add(o);
  const mats = {};
  const signFor = (kind, s) => {
    const h = lo.H(s), g = new THREE.Group(), lab = COL_LABEL[kind];
    const tex = circSignTex(kind === 'cones' ? 'CONES' : kind.toUpperCase(), 'SLOWS YOU', '#16121c');
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })); sg.rotation.y = -Math.PI / 2; sg.position.y = 3.4; g.add(sg);
    const pl = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.0, 0.14), new THREE.MeshLambertMaterial({ color: 0x444458 })); pl.position.y = 1.5; g.add(pl);
    placeOnRoad(g, s, h, W + 2.4, h); add(g);
  };
  for (const z of track.slow) {
    const len = z.x1 - z.x0, sm = (z.x0 + z.x1) / 2, h = lo.H(sm), g = new THREE.Group(), kind = z.kind;
    if (!circ.tex[kind]) circ.tex[kind] = circPatchTex(kind);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len + 3, 2 * W - 0.5), new THREE.MeshBasicMaterial({ map: circ.tex[kind], transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.075; g.add(m);
    if (kind !== 'oil') {   // raised lumps so sand dunes / mud heaps have some body
      const mat = new THREE.MeshLambertMaterial({ color: kind === 'sand' ? 0xcfa860 : 0x3a2412, emissive: kind === 'sand' ? 0x2a1c08 : 0x0c0604 }), geo = new THREE.SphereGeometry(1, 8, 5, 0, 6.283, 0, 1.571);
      for (let i = 0; i < 16; i++) { const b = new THREE.Mesh(geo, mat), r = 0.35 + rnd() * 0.7; b.scale.set(r * 1.6, r * (kind === 'sand' ? 0.35 : 0.5), r); b.position.set((rnd() - 0.5) * len, 0.04, (rnd() < 0.5 ? -1 : 1) * (W - 0.4 - rnd() * 1.4)); b.rotation.y = rnd() * 3; g.add(b); }
    } else {
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(len * 0.8, 2 * W - 2.4), new THREE.MeshBasicMaterial({ color: 0x8a6aff, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false })); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.09; g.add(glow); z.shimmer = glow;
    }
    placeOnRoad(g, sm, h + 0.0, 0, h); add(g); z.warned = false; z.obj = g; circ.zones.push(z); signFor(kind, z.x0 - 75);
  }
  const coneGeo = null;
  for (const c of track.cones) {
    const h = lo.H(c.x), lats = [-3.5, -2.1, -0.7, 0.7, 2.1, 3.5], list = [];
    lats.forEach((lt, i) => { const o = makeCone(), dx = (i % 2 ? 0.9 : -0.9); const e = { g: o, s: c.x + dx, lat: lt, y: h, vs: 0, vy: 0, vl: 0, spin: 0, rz: 0, rest: false, t: 0, base: [c.x + dx, lt] }; placeOnRoad(o, e.s, h, lt, h); add(o); list.push(e); });
    c.list = list; c.hit = false; c.warned = false; signFor('cones', c.x - 75); circ.cones.push(c);
  }
}
function resetObstacles() {
  for (const z of circ.zones) z.warned = false;
  for (const c of circ.cones) { c.hit = false; c.warned = false; for (const e of c.list) { e.s = e.base[0]; e.lat = e.base[1]; e.y = ground(c.x) || 0; e.vs = e.vy = e.vl = e.spin = e.rz = 0; e.rest = false; e.g.visible = true; placeOnRoad(e.g, e.s, e.y, e.lat, e.y); } }
}
function hitCones(c) {
  c.hit = true; const sp = Math.max(8, car.vx);
  for (const e of c.list) { e.vs = sp * (0.55 + Math.random() * 0.4); e.vy = 5 + Math.random() * 6; e.vl = (Math.random() - 0.5) * 9; e.spin = (Math.random() - 0.5) * 16; e.rest = false; e.t = 0; }
  car.vx *= 0.62; car.vy *= 0.62; shake = Math.max(shake, 0.4); Snd.land('HARD LANDING'); vibe(30, 'heavy');
  toast('CONES HIT', 'Speed lost!', 'warn');
}
const _cnq = new THREE.Quaternion();
function updateObstacles(dt) {
  if (!circ.cones.length && !circ.zones.length) return;
  for (const z of circ.zones) if (z.shimmer) z.shimmer.material.opacity = 0.1 + 0.08 * Math.sin(hzT * 3 + z.x0);
  for (const c of circ.cones) {
    if (!c.hit) continue;
    for (const e of c.list) {
      if (e.rest) continue; e.t += dt; e.vy -= 22 * dt; e.s += e.vs * dt; e.y += e.vy * dt; e.lat += e.vl * dt; e.vs *= Math.exp(-0.6 * dt);
      const gh = ground(e.s); const floor = (gh === null ? 0 : gh);
      if (e.y < floor) { e.y = floor; if (e.vy < -3) { e.vy *= -0.35; e.vs *= 0.6; e.vl *= 0.6; } else { e.vy = 0; e.vs *= Math.exp(-4 * dt); e.vl *= Math.exp(-4 * dt); e.spin *= Math.exp(-4 * dt); if (e.vs < 0.4) e.rest = true; } }
      e.rz -= e.spin * dt; if (e.rest) e.rz = -Math.PI / 2 * 0.92;
      placeOnRoad(e.g, e.s, e.y, e.lat, floor); e.g.quaternion.multiply(_cnq.setFromAxisAngle(_AZ, e.rz));
    }
  }
}
function checkObstacles() {
  if (!circ.cones.length) return;
  const gh = ground(car.x) || 0;
  for (const c of circ.cones) {
    if (c.hit || Math.abs(car.x - c.x) > 1.7 || car.y - gh > 1.1) continue;
    hitCones(c);
  }
}
function announceObstacles() {
  if (lap > 1) return;
  const all = circ.zones.map((z) => ({ x: z.x0, k: z.kind, o: z })).concat(circ.cones.map((c) => ({ x: c.x, k: 'cones', o: c })));
  for (const a of all) if (!a.o.warned && car.x > a.x - 70 && car.x < a.x) { a.o.warned = true; toast(COL_LABEL[a.k][0] + ' AHEAD', COL_LABEL[a.k][1], 'warn'); break; }
}
function slowFx(dt) {
  if (car.inSlow < 0 || state !== 'playing') return;
  const z = track.slow[car.inSlow], col = z.kind === 'sand' ? [0.85, 0.7, 0.4] : z.kind === 'mud' ? [0.32, 0.2, 0.1] : [0.5, 0.35, 0.9];
  if (Math.random() < dt * 70) flame.emit(car.x - 1.4, car.y + 0.1, (Math.random() - 0.5) * 3, -car.vx * 0.15 - 1 - 2 * Math.random(), 1 + Math.random() * 2.5, (Math.random() - 0.5) * 5, 0.55, z.kind === 'oil' ? 0.45 : 1.0, 0.3, 0.8, col);
}

/* ---------- sky ring, sun, mountains, fireflies ---------- */
function circuitEnv(L, E, low) {
  const lo = track.loop, TP = track.path; let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (let s = 0; s < lo.LP; s += 20) { const f = TP.at(s); x0 = Math.min(x0, f.x); x1 = Math.max(x1, f.x); z0 = Math.min(z0, f.z); z1 = Math.max(z1, f.z); }
  const geo = new THREE.ConeGeometry(1, 1, 6), n = low ? 22 : 40;
  for (let ring = 0; ring < 2; ring++) for (let i = 0; i < n; i++) {
    const a = (i + ring * 0.5) / n * Math.PI * 2 + rnd() * 0.1, R = 520 + ring * 70, h = 50 + rnd() * 90 + ring * 25, r = 60 + rnd() * 70;
    const c = new THREE.Color(ring ? 0x3a2a5a : 0x2a1f48).multiplyScalar(0.8 + rnd() * 0.5);
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.55 })); m.scale.set(r, h, r); m.position.set(Math.cos(a) * R, h / 2 - 12, Math.sin(a) * R); skyFollow.add(m);
  }
  const cTex = cloudTexture();
  for (let i = 0; i < (low ? 14 : 30); i++) {
    const a = rnd() * 6.283, R = 380 + rnd() * 120, sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cTex, color: i % 3 ? 0xff9a8a : 0xffd0a0, transparent: true, opacity: 0.35 + rnd() * 0.3, depthWrite: false, fog: false }));
    const w = 130 + rnd() * 160; sp.scale.set(w, w * 0.4, 1); sp.position.set(Math.cos(a) * R, 70 + rnd() * 90, Math.sin(a) * R); skyFollow.add(sp);
  }
  const nm = low ? 120 : 320, p = new Float32Array(nm * 3);
  for (let i = 0; i < nm; i++) { p[i * 3] = x0 - 40 + rnd() * (x1 - x0 + 80); p[i * 3 + 1] = 0.5 + rnd() * 16; p[i * 3 + 2] = z0 - 40 + rnd() * (z1 - z0 + 80); }
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(p, 3));
  motes = new THREE.Points(mg, new THREE.PointsMaterial({ color: E.mote, size: 3, sizeAttenuation: false, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending })); motes.frustumCulled = false; envGroup.add(motes);
}
