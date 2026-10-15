/* eslint-disable */
'use strict';
/* Jungle biome kit (level 7): mossy rock pillars holding the whole road up, jungle canopy (instanced trees), wide stone ledges with rails on the hairpins,
   vine gantries ("CLIMB", "SUMMIT"), a misty valley floor, and a dusk environment with far mountain silhouettes, mist and fireflies. */
const JFLOOR = -10;
const JUNGLE_GREENS = [0x1f6a3a, 0x2a8a4a, 0x358e58, 0x1a5a3a, 0x4aa05a, 0x2f7a46];
const JUNGLE_LEDGES = [[420, 495], [555, 630], [690, 765]];       // hairpin ledges (also where the boost pads sit)
// nearest road sample to (x,z): distance and road height there
function nearestRoad(smp, x, z) {
  let m = 1e9, y = 0;
  for (let i = 0; i < smp.length; i++) { const p = smp[i], d = Math.hypot(p.x - x, p.z - z); if (d < m) { m = d; y = p.y; } }
  return { d: m, y };
}
function buildJungleScenery(L) {
  const low = settings.quality === 'low', FL = JFLOOR, smp = roadSamples(3), len = track.length;
  const lam = (c, e) => new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: e });
  const mat4 = new THREE.Matrix4(), qq = new THREE.Quaternion(), pp = new THREE.Vector3(), ss = new THREE.Vector3(), vv = new THREE.Vector3(), cc = new THREE.Color(), qy = new THREE.Quaternion();
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of smp) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, spanX = (x1 - x0) / 2 + 150, spanZ = (z1 - z0) / 2 + 150;

  // misty jungle floor far below the road (also what you see under the summit gap)
  const fg = new THREE.PlaneGeometry(1800, 1800, 60, 60); fg.rotateX(-Math.PI / 2);
  const fp = fg.attributes.position, fc = new Float32Array(fp.count * 3), gA = new THREE.Color(0x2a6a3a), gB = new THREE.Color(0x14402a), tc = new THREE.Color();
  for (let i = 0; i < fp.count; i++) {
    const X = fp.getX(i) + cx, Z = fp.getZ(i) + cz, n = Math.sin(X * 0.02) * Math.cos(Z * 0.017) + 0.5 * Math.sin(X * 0.05 + Z * 0.04);
    fp.setY(i, n * 1.6); tc.copy(gA).lerp(gB, 0.5 + 0.5 * Math.sin(X * 0.03 - Z * 0.02 + n)); fc[i * 3] = tc.r; fc[i * 3 + 1] = tc.g; fc[i * 3 + 2] = tc.b;
  }
  fg.setAttribute('color', new THREE.BufferAttribute(fc, 3)); fg.computeVertexNormals();
  const floor = new THREE.Mesh(fg, new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x0e3a22, emissiveIntensity: 0.25 })); floor.position.set(cx, FL, cz); sceneryGroup.add(floor);

  // rock pillars under every stretch of road: together they read as the mountain the road is cut into
  const pilGeo = new THREE.CylinderGeometry(1, 1.5, 1, 10), step = low ? 8 : 5, pil = [];
  for (let s = 0; s <= len; s += step) { const gy = ground(s); if (gy === null) continue; pil.push([s, gy]); }
  const pilMat = lam(0x4a5a46, 0.22), pilMat2 = lam(0x3a4a3a, 0.22), pilA = new THREE.InstancedMesh(pilGeo, pilMat, pil.length), pilB = new THREE.InstancedMesh(pilGeo, pilMat2, pil.length);
  let na = 0, nb = 0;
  for (const [s, gy] of pil) {
    const H = gy - 0.7 - FL; if (H <= 0.5) continue;
    toWorld(s, gy, 0, vv, gy); const r = 7 + (Math.floor(s / step) % 3) * 0.4;
    pp.set(vv.x, FL + H / 2, vv.z); ss.set(r, H, r); qq.identity(); mat4.compose(pp, qq, ss);
    if ((Math.floor(s / step)) % 2) pilA.setMatrixAt(na++, mat4); else pilB.setMatrixAt(nb++, mat4);
  }
  pilA.count = na; pilB.count = nb; pilA.frustumCulled = pilB.frustumCulled = false; sceneryGroup.add(pilA); sceneryGroup.add(pilB);

  // jungle canopy: instanced trunks and two canopy blobs per tree, taller near the high road so the leaves reach the road level
  const nTree = low ? 110 : 280, trunkGeo = new THREE.CylinderGeometry(0.55, 1, 1, 6), blobGeo = new THREE.SphereGeometry(1, 9, 7);
  const trunks = new THREE.InstancedMesh(trunkGeo, lam(0x4a3322, 0.18), nTree), blobA = new THREE.InstancedMesh(blobGeo, lam(0xffffff, 0.3), nTree), blobB = new THREE.InstancedMesh(blobGeo, lam(0xffffff, 0.3), nTree);
  let nt = 0;
  for (let i = 0; i < nTree * 5 && nt < nTree; i++) {
    const x = cx + (rnd() - 0.5) * 2 * spanX, z = cz + (rnd() - 0.5) * 2 * spanZ, nr = nearestRoad(smp, x, z);
    if (nr.d < 14) continue;
    const top = Math.max(FL + 7, Math.min(nr.y - 2 - rnd() * 3, FL + 9 + nr.y * 0.9 * (0.55 + rnd() * 0.45) - (nr.d > 40 ? 10 : 0))), th = top - FL, r = 4 + rnd() * 3.5;
    pp.set(x, FL + th / 2, z); ss.set(0.9 + rnd() * 0.5, th, 0.9 + rnd() * 0.5); qq.setFromAxisAngle(vv.set(0, 1, 0), rnd() * 6.28); mat4.compose(pp, qq, ss); trunks.setMatrixAt(nt, mat4);
    pp.set(x, top + r * 0.25, z); ss.set(r, r * 0.55, r); mat4.compose(pp, qq.identity(), ss); blobA.setMatrixAt(nt, mat4); cc.setHex(JUNGLE_GREENS[i % JUNGLE_GREENS.length]); blobA.setColorAt(nt, cc);
    pp.set(x + (rnd() - 0.5) * r * 0.8, top + r * 0.75, z + (rnd() - 0.5) * r * 0.8); ss.set(r * 0.62, r * 0.4, r * 0.62); mat4.compose(pp, qq, ss); blobB.setMatrixAt(nt, mat4); cc.setHex(JUNGLE_GREENS[(i + 2) % JUNGLE_GREENS.length]); blobB.setColorAt(nt, cc);
    nt++;
  }
  for (const m of [trunks, blobA, blobB]) { m.count = nt; m.frustumCulled = false; sceneryGroup.add(m); }
  if (blobA.instanceColor) blobA.instanceColor.needsUpdate = true; if (blobB.instanceColor) blobB.instanceColor.needsUpdate = true;

  // small palms on the shoulders of the road (kept clear of the driving line), every ~9 m, side picked at random
  const palmN = Math.floor(len / (low ? 16 : 9)), palmT = new THREE.InstancedMesh(trunkGeo, lam(0x5a3d26, 0.2), palmN), palmL = new THREE.InstancedMesh(blobGeo, lam(0xffffff, 0.35), palmN * 2);
  let np = 0, nl = 0;
  for (let k = 0; k < palmN; k++) {
    const s = 12 + k * (low ? 16 : 9) + rnd() * 4, gy = ground(s); if (gy === null || (s > 955 && s < 990)) continue;
    const sd = rnd() < 0.5 ? -1 : 1, th = 2.6 + rnd() * 1.8, r = 1.5 + rnd() * 0.6, lat = sd * (W + 2.7);
    toWorld(s, gy - 0.5, lat, vv, gy);
    pp.set(vv.x, vv.y + th / 2, vv.z); ss.set(0.18, th, 0.18); qq.identity(); mat4.compose(pp, qq, ss); palmT.setMatrixAt(np++, mat4);
    for (let j = 0; j < 2; j++) { pp.set(vv.x + (j ? 0.5 : -0.4), vv.y + th + 0.1 * j, vv.z + (j ? -0.4 : 0.5)); ss.set(r, r * 0.34, r); mat4.compose(pp, qq, ss); palmL.setMatrixAt(nl, mat4); cc.setHex(JUNGLE_GREENS[(k + j) % JUNGLE_GREENS.length]); palmL.setColorAt(nl, cc); nl++; }
  }
  palmT.count = np; palmL.count = nl; palmT.frustumCulled = palmL.frustumCulled = false; sceneryGroup.add(palmT); sceneryGroup.add(palmL);
  if (palmL.instanceColor) palmL.instanceColor.needsUpdate = true;

  // wide stone ledges + rails on the hairpins, so the switchbacks look safe (the car cannot leave the road anyway)
  const apronGeo = new THREE.BoxGeometry(3.1, 0.45, 3.3), railGeo = new THREE.BoxGeometry(3.45, 0.13, 0.13), railPostGeo = new THREE.BoxGeometry(0.2, 1.15, 0.2);
  const aprons = [], rails = [];
  for (const [a, b] of JUNGLE_LEDGES) for (let s = a + 1.5; s < b; s += 3) { const gy = ground(s); if (gy === null) continue; aprons.push([s, gy]); }
  const apronM = new THREE.InstancedMesh(apronGeo, lam(0x6a6a52, 0.25), aprons.length * 2), railM = new THREE.InstancedMesh(railGeo, new THREE.MeshBasicMaterial({ color: L.glow[1] }), aprons.length * 4), postM = new THREE.InstancedMesh(railPostGeo, lam(0x3a2a1a, 0.2), aprons.length * 2);
  let ia = 0, ir = 0, ipo = 0;
  for (const [s, gy] of aprons) for (const sd of [-1, 1]) {
    toWorld(s, gy - 0.25, sd * (W + 1.65), pp, gy); frameQuat(s, qq); ss.set(1, 1, 1); mat4.compose(pp, qq, ss); apronM.setMatrixAt(ia++, mat4);
    for (const hh of [0.55, 1.05]) { toWorld(s, gy + hh, sd * (W + 3.2), pp, gy); frameQuat(s, qq); mat4.compose(pp, qq, ss); railM.setMatrixAt(ir++, mat4); }
    toWorld(s, gy + 0.55, sd * (W + 3.2), pp, gy); frameQuat(s, qq); mat4.compose(pp, qq, ss); postM.setMatrixAt(ipo++, mat4);
  }
  apronM.count = ia; railM.count = ir; postM.count = ipo; for (const m of [apronM, railM, postM]) { m.frustumCulled = false; sceneryGroup.add(m); }

  // vine gantries: wooden arch, sign, and vines with glowing lanterns hanging well above the roof of the car
  const vineGeo = new THREE.CylinderGeometry(0.05, 0.05, 1, 4), vineMat = lam(0x2a6a34, 0.3), lanternMat = new THREE.MeshBasicMaterial({ color: L.glow[1] }), woodMat = lam(0x5a3a22, 0.2);
  function vineGantry(S0, txt) {
    const y = refH(S0), g = new THREE.Group();
    for (const sd of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6.8, 0.5), woodMat); p.position.set(0, 3.4, sd * (W + 0.8)); g.add(p); }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 2 * W + 2.1), woodMat); beam.position.set(0, 6.9, 0); g.add(beam);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(2 * W + 1.4, (2 * W + 1.4) / 2.4), new THREE.MeshBasicMaterial({ map: chevronTex(txt), side: THREE.DoubleSide })); board.rotation.y = -Math.PI / 2; board.position.set(0, 8.9, 0); g.add(board);
    for (let i = 0; i < 12; i++) {
      const vl = 1 + rnd() * 2.3, v = new THREE.Mesh(vineGeo, vineMat); v.scale.y = vl; v.position.set((rnd() - 0.5) * 0.5, 6.65 - vl / 2, (-W + 0.6) + (i / 11) * (2 * W - 1.2)); g.add(v);
      if (i % 3 === 0) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), lanternMat); l.position.set(v.position.x, 6.65 - vl - 0.15, v.position.z); g.add(l); }
    }
    placeOnRoad(g, S0, y, 0, y); sceneryGroup.add(g);
  }
  vineGantry(352, 'CLIMB'); vineGantry(888, 'SUMMIT');
  buildRoadside(L); buildHoops(L);
}
// dusk environment: low sun (from ENV.sun), far mountain silhouettes ringing the valley, drifting mist, fireflies
function jungleEnv(L, E, low) {
  const smp = roadSamples(6); let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of smp) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const cTex = cloudTexture(), nCl = low ? 16 : 40;
  for (let i = 0; i < nCl; i++) {      // mist banks around and below the summit level
    const m = new THREE.SpriteMaterial({ map: cTex, color: i % 3 ? E.cloud : E.cloud2, transparent: true, opacity: 0.3 + rnd() * 0.25, depthWrite: false, blending: i % 2 ? THREE.NormalBlending : THREE.AdditiveBlending });
    const sp = new THREE.Sprite(m), w = 120 + rnd() * 200, a = rnd() * 6.283, d = 160 + rnd() * 420;
    sp.scale.set(w, w * 0.3, 1); sp.position.set(cx + Math.cos(a) * d, -6 + rnd() * 60, cz + Math.sin(a) * d); envGroup.add(sp);
  }
  const mg = new THREE.ConeGeometry(1, 1, 7), mc = new THREE.Color(E.mount), n = low ? 14 : 30;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283 + rnd() * 0.15, d = 430 + rnd() * 180, h = 90 + rnd() * 160, r = 80 + rnd() * 100;
    const m = new THREE.Mesh(mg, new THREE.MeshLambertMaterial({ color: mc, emissive: mc, emissiveIntensity: 0.45 })); m.scale.set(r, h, r); m.position.set(cx + Math.cos(a) * d, JFLOOR + h / 2 - 6, cz + Math.sin(a) * d); envGroup.add(m);
  }
  const nm = low ? 120 : 320, p = new Float32Array(nm * 3);        // fireflies
  for (let i = 0; i < nm; i++) { p[i * 3] = cx + (rnd() - 0.5) * 620; p[i * 3 + 1] = JFLOOR + 3 + rnd() * 52; p[i * 3 + 2] = cz + (rnd() - 0.5) * 420; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  motes = new THREE.Points(g, new THREE.PointsMaterial({ color: E.mote, size: 2.8, sizeAttenuation: false, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
  motes.frustumCulled = false; envGroup.add(motes);
}
