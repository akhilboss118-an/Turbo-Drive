/* eslint-disable */
'use strict';
/* Track mesh and scenery */
/* ================= track mesh ================= */
const levelGroup = new THREE.Group(); scene.add(levelGroup);
function buildTrackMesh(L) {
  const P = [], C = [], GP = [], GC = [], DEPTH = 7;
  const TP = track.path, tv = new THREE.Vector3(); let curP = null;
  const put = (v, aP) => { if (TP) { toWorld(v[0], v[1], v[2], tv, curP.fn(Math.min(curP.x1, Math.max(curP.x0, v[0])))); aP.push(tv.x, tv.y, tv.z); } else aP.push(v[0], v[1], v[2]); };
  const tri = (a, b, c, ca, cb, cc, aP, aC) => { put(a, aP); put(b, aP); put(c, aP); aC.push(ca[0], ca[1], ca[2], cb[0], cb[1], cb[2], cc[0], cc[1], cc[2]); };
  const quad = (a, b, c, d, c1, c2, aP, aC) => { tri(a, b, c, c1, c1, c2, aP, aC); tri(a, c, d, c1, c2, c2, aP, aC); };
  const topA = hex(L.topA), topB = hex(L.topB);
  const tint = (c, k) => { const o = new THREE.Color(c).multiplyScalar(k); return [o.r, o.g, o.b]; };
  const sk1 = tint(L.glow[0], 0.62), sk2 = tint(L.fog, 0.35), cyan = hex(L.glow[0]), orange = hex(L.glow[1]), dash = hex(0xfff1d0), lane = tint(L.glow[0], 1), under = hex(L.glow[1]);
  for (const p of track.pieces) {
    curP = p;
    const n = Math.max(1, Math.ceil((p.x1 - p.x0) / 0.75));
    for (let i = 0; i < n; i++) {
      const xa = p.x0 + (p.x1 - p.x0) * i / n, xb = p.x0 + (p.x1 - p.x0) * (i + 1) / n, ya = p.fn(xa), yb = p.fn(xb);
      const top = (Math.floor(xa / 4) % 2 === 0) ? topA : topB;
      quad([xa, ya, -W], [xa, ya, W], [xb, yb, W], [xb, yb, -W], top, top, P, C);
      for (const s of [-1, 1]) quad([xa, ya, s * W], [xb, yb, s * W], [xb, yb - DEPTH, s * W * 0.45], [xa, ya - DEPTH, s * W * 0.45], sk1, sk2, P, C);
      for (const s of [-1, 1]) { const za = s * W * (1 - 0.55 * 0.3 / DEPTH), zb = s * W * (1 - 0.55 * 0.8 / DEPTH); quad([xa, ya - 0.3, za], [xb, yb - 0.3, za], [xb, yb - 0.8, zb], [xa, ya - 0.8, zb], under, under, GP, GC); }
      for (const z of [-(W - 1.3), W - 1.3]) quad([xa, ya + 0.035, z - 0.07], [xa, ya + 0.035, z + 0.07], [xb, yb + 0.035, z + 0.07], [xb, yb + 0.035, z - 0.07], lane, lane, GP, GC);
      const ec = (Math.floor(xa / 3) % 2 === 0) ? cyan : orange;
      quad([xa, ya + 0.04, -W], [xa, ya + 0.04, -W + 0.5], [xb, yb + 0.04, -W + 0.5], [xb, yb + 0.04, -W], ec, ec, GP, GC);
      quad([xa, ya + 0.04, W - 0.5], [xa, ya + 0.04, W], [xb, yb + 0.04, W], [xb, yb + 0.04, W - 0.5], ec, ec, GP, GC);
    }
    for (const x of [p.x0, p.x1]) { const y = p.fn(x); quad([x, y, -W], [x, y, W], [x, y - DEPTH, W * 0.45], [x, y - DEPTH, -W * 0.45], sk1, sk2, P, C); }
    for (let x = p.x0 + 2; x + 2.5 < p.x1; x += 7) {
      const y1 = p.fn(x), y2 = p.fn(x + 2.5);
      quad([x, y1 + 0.04, -0.12], [x, y1 + 0.04, 0.12], [x + 2.5, y2 + 0.04, 0.12], [x + 2.5, y2 + 0.04, -0.12], dash, dash, GP, GC);
    }
  }
  const mk = (arrP, arrC, mat) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(arrP), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(arrC), 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.frustumCulled = false; trackGroupRef.add(m);
  };
  mk(P, C, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  mk(GP, GC, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }));
}

/* ================= scenery ================= */
let sceneryGroup = null, starPts = null;
const hoopObjs = [];
function buildScenery(L) {
  sceneryGroup = new THREE.Group(); levelGroup.add(sceneryGroup);
  seed = L.seed; hoopObjs.length = 0; starPts = null;
  const len = track.length;
  if (L.biome === 'lava') buildLavaScenery(L);   // lava plane + embers, then the standard rock islands
  if (L.biome === 'moon') { buildMoonScenery(L); return; }
  if (L.biome === 'ice') { buildIceScenery(L); return; }
  if (L.biome === 'jungle') { buildJungleScenery(L); return; }
  if (L.biome === 'desert') { buildDesertScenery(L); buildRoadside(L); buildHoops(L); return; }
  const topGeo = new THREE.CylinderGeometry(1, 1, 0.8, 9), rockGeo = new THREE.ConeGeometry(1, 1.6, 9), treeGeo = new THREE.ConeGeometry(0.5, 2, 6);
  const topMats = L.island.map((c) => new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.35 }));
  const rockC = new THREE.Color(L.card[0]).lerp(new THREE.Color(L.glow[0]), 0.25);
  const rockMat = new THREE.MeshLambertMaterial({ color: rockC, emissive: rockC, emissiveIntensity: 0.45 });
  const glowMats = L.glow.map((c) => new THREE.MeshBasicMaterial({ color: c }));
  // far floating islands (spread evenly so no stretch of track is empty)
  const nIsl = Math.round(len / 16);
  for (let i = 0; i < nIsl; i++) {
    const x = -30 + (i / nIsl) * (len + 80) + (rnd() - 0.5) * 14, side = i % 2 ? -1 : 1, z = side * (34 + rnd() * 90), y = -26 + rnd() * 40, r = 5 + rnd() * 12;
    const g = new THREE.Group(); g.position.set(x, y, z);
    const top = new THREE.Mesh(topGeo, topMats[i % 3]); top.scale.set(r, 1, r); g.add(top);
    const rock = new THREE.Mesh(rockGeo, rockMat); rock.scale.set(r, r * 1.5, r); rock.rotation.x = Math.PI; rock.position.y = -0.4 - r * 0.6; g.add(rock);
    const nt = 1 + Math.floor(rnd() * 4);
    for (let k = 0; k < nt; k++) { const t = new THREE.Mesh(treeGeo, glowMats[(i + k) % 2]); const a = rnd() * 6.28, d = rnd() * r * 0.6; t.position.set(Math.cos(a) * d, 1.4, Math.sin(a) * d); t.scale.setScalar(0.8 + rnd() * 1.4); g.add(t); }
    sceneryGroup.add(g);
  }
  // near-ground crystal clusters below the track level, just off the road (visible when the camera pulls in)
  const crysGeo = new THREE.ConeGeometry(0.7, 3.2, 5);
  for (let x = 6; x < len; x += 9 + rnd() * 7) {
    const side = rnd() < 0.5 ? -1 : 1, gh = ground(x), base = (gh === null ? 0 : gh) - 5.5 - rnd() * 4, z = side * (W + 10 + rnd() * 16);
    const n = 2 + Math.floor(rnd() * 3);
    for (let k = 0; k < n; k++) {
      const c = new THREE.Mesh(crysGeo, glowMats[(k + (x | 0)) % 2]); const sc = 0.6 + rnd() * 1.1;
      c.scale.set(sc, sc * (1 + rnd() * 0.8), sc); c.position.set(x + (rnd() - 0.5) * 5, base + sc * 1.6, z + (rnd() - 0.5) * 4); c.rotation.z = (rnd() - 0.5) * 0.4; sceneryGroup.add(c);
    }
  }
  buildRoadside(L); buildHoops(L);
  // starfield (night level) follows the camera
  starPts = null;
  if (L.stars_bg) {
    const n = 380, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const a = rnd() * 6.283, u = 0.15 + rnd() * 0.85, r = 380; p[i * 3] = Math.cos(a) * r * 0.9; p[i * 3 + 1] = u * r * 0.7; p[i * 3 + 2] = -Math.abs(Math.sin(a)) * r - 60; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    starPts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfeaff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 }));
    starPts.frustumCulled = false; sceneryGroup.add(starPts);
  }
}

function buildRoadside(L) {
  // roadside posts + light strips so the track edge reads clearly at any zoom
  const glowMats = L.glow.map((c) => new THREE.MeshBasicMaterial({ color: c }));
  const postGeo = new THREE.BoxGeometry(0.22, 1.1, 0.22), capGeo = new THREE.BoxGeometry(0.36, 0.14, 0.36);
  const postMat = new THREE.MeshLambertMaterial({ color: L.postColor !== undefined ? L.postColor : (baseOf(level) === 2 ? 0x2a4a78 : 0x4a3a9a) });
  for (const p of track.pieces) {
    for (let x = Math.ceil(p.x0 / 10) * 10; x <= p.x1; x += 10) {
      const y = p.fn(x);
      for (const sd of [-1, 1]) {
        const post = new THREE.Mesh(postGeo, postMat); placeOnRoad(post, x, y + 0.55, sd * (W + 0.25), y); sceneryGroup.add(post);
        const cap = new THREE.Mesh(capGeo, glowMats[(x / 10 + (sd > 0 ? 1 : 0)) % 2 | 0]); placeOnRoad(cap, x, y + 1.18, sd * (W + 0.25), y); sceneryGroup.add(cap);
      }
    }
  }
}
function buildHoops(L) {
  // neon hoops that mark the jump lines (on levels with hoopCoins they also pay out when you drive through)
  const ringGeo = new THREE.TorusGeometry(3.4, 0.16, 8, 40), qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
  const shared = new THREE.MeshBasicMaterial({ color: L.glow[0] });
  for (const r of L.hoops) {
    const pays = !!L.hoopCoins, mat = pays ? new THREE.MeshBasicMaterial({ color: L.glow[0], transparent: true }) : shared;
    const m = new THREE.Mesh(ringGeo, mat); const gy = refH(r[0]);
    toWorld(r[0], r[1], 0, m.position, gy); frameQuat(r[0], m.quaternion).multiply(qy);
    sceneryGroup.add(m);
    if (pays) hoopObjs.push({ s: r[0], y: r[1], mesh: m, mat, got: false });
  }
}
