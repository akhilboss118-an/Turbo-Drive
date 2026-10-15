/* eslint-disable */
'use strict';
/* Collapsing-ground wall (levels with LEVELS[n].chasm): a black void with a glowing edge chases the car; touching it ends the run. Outrun it with nitro. */
const CHASM = { v: 18, start: 70, grace: 4, catchGap: 2, boostFrom: 110, boostK: 0.25 };
let chasm = null;
const _carSpawn2 = car.spawn.bind(car);
car.spawn = function (x, v) { _carSpawn2(x, v); chasmReset(x); };
const ZERO_M = new THREE.Matrix4().makeScale(0, 0, 0), _cm = new THREE.Matrix4(), _cq = new THREE.Quaternion(), _ce = new THREE.Euler(), _cp = new THREE.Vector3(), _cs = new THREE.Vector3();
function chasmReset(x) {
  if (!chasm) return; chasm.front = x - CHASM.start; chasm.t = 0; chasm.txt = ''; chasm.spawnT = 0; placeChasm();
  for (let i = 0; i < chasm.cd.length; i++) { chasm.cd[i].on = false; chasm.chunks.setMatrixAt(i, ZERO_M); } chasm.chunks.instanceMatrix.needsUpdate = true;
  for (const k of chasm.cracks) { k.x = -1e9; k.c.visible = false; }
}
function updateRoadBreak(dt, live) {
  const C = chasm, f = C.front;
  if (live) {   // glowing cracks spread over the road just ahead of the wall
    for (const k of C.cracks) {
      if (k.x < f) { const x = f + 6 + Math.random() * 24, gh = ground(x); if (gh === null) { k.c.visible = false; k.x = -1e9; continue; } k.x = x; k.c.position.set(x, gh + 0.1, (Math.random() - 0.5) * 3.2); k.c.rotation.y = (Math.random() - 0.5) * 1.1; k.c.visible = true; }
      k.m.opacity = Math.max(0, Math.min(1, 1.15 - (k.x - f) / 26));
    }
    C.spawnT -= dt;
    while (C.spawnT <= 0) {   // road slabs break off the edge and tumble into the void
      C.spawnT += 0.07; const x = f + 1 + Math.random() * 7, gh = ground(x); if (gh === null) continue;
      const d = C.cd.find((q) => !q.on); if (!d) break;
      d.on = true; d.x = x; d.y = gh; d.z = (Math.random() - 0.5) * 2 * (W - 0.6); d.vx = -2 - Math.random() * 6; d.vy = Math.random() * 2; d.rx = d.rz = 0; d.wx = (Math.random() - 0.5) * 5; d.wz = (Math.random() - 0.5) * 5; d.s = 1.4 + Math.random() * 2.4;
    }
  }
  for (let i = 0; i < C.cd.length; i++) {
    const d = C.cd[i]; if (!d.on) continue;
    d.vy -= 16 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.rx += d.wx * dt; d.rz += d.wz * dt;
    if (d.y < -45 || d.x < f - 3) { d.on = false; C.chunks.setMatrixAt(i, ZERO_M); continue; }
    _ce.set(d.rx, 0, d.rz); _cq.setFromEuler(_ce); _cp.set(d.x, d.y, d.z); _cs.set(d.s, 1, d.s); _cm.compose(_cp, _cq, _cs); C.chunks.setMatrixAt(i, _cm);
  }
  C.chunks.instanceMatrix.needsUpdate = true;
}
function placeChasm() { chasm.slab.position.set(chasm.front - 250, 20, 0); chasm.face.position.set(chasm.front + 0.2, 8, 0); chasm.embers.position.x = chasm.front; }
function buildChasm() {
  chasm = null; const box = $('chasmBox'); box.classList.add('hidden');
  if (!LEVELS[level].chasm) return;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(500, 160, 420), new THREE.MeshBasicMaterial({ color: 0x0c0202, fog: false }));
  const c = document.createElement('canvas'); c.width = 8; c.height = 128; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, 'rgba(255,60,20,0)'); gr.addColorStop(0.45, 'rgba(255,90,30,.55)'); gr.addColorStop(1, 'rgba(255,200,80,.95)'); g.fillStyle = gr; g.fillRect(0, 0, 8, 128);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(420, 70), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  face.rotation.y = Math.PI / 2; face.userData.base = true;
  const n = 140, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { p[i * 3] = Math.random() * 14 - 4; p[i * 3 + 1] = Math.random() * 40 - 8; p[i * 3 + 2] = (Math.random() - 0.5) * 60; }
  const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const embers = new THREE.Points(eg, new THREE.PointsMaterial({ color: 0xffa040, size: 3, sizeAttenuation: false, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); embers.frustumCulled = false;
  slab.frustumCulled = face.frustumCulled = false; levelGroup.add(slab, face, embers);
  const NC = 24, chunks = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.28, 1), new THREE.MeshLambertMaterial({ color: 0x8d909c, emissive: 0xff3a10, emissiveIntensity: 0.55 }), NC); chunks.frustumCulled = false; levelGroup.add(chunks);
  const cd = []; for (let i = 0; i < NC; i++) { cd.push({ on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, rx: 0, rz: 0, wx: 0, wz: 0, s: 1 }); chunks.setMatrixAt(i, ZERO_M); }
  const crackMat = [], cracks = [], crackGeo = new THREE.BoxGeometry(1, 0.12, 0.35);
  for (let i = 0; i < 12; i++) { const m = new THREE.MeshBasicMaterial({ color: 0xff5a1a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }); const c = new THREE.Mesh(crackGeo, m); c.scale.x = 4 + Math.random() * 3.6; c.visible = false; levelGroup.add(c); cracks.push({ c, x: -1e9, m }); }
  chasm = { slab, face, embers, chunks, cd, cracks, spawnT: 0, front: 0, t: 0, txt: '' }; chasmReset(car.x); box.classList.remove('hidden');
}
function updateChasm(dt) {
  if (!chasm) return;
  const vis = state !== 'cutscene' && state !== 'results'; chasm.slab.visible = chasm.face.visible = chasm.embers.visible = chasm.chunks.visible = vis; if (!vis) for (const k of chasm.cracks) k.c.visible = false;
  if (state === 'playing') {
    chasm.t += dt;
    if (chasm.t > CHASM.grace) { const gap = car.x - chasm.front; chasm.front += (CHASM.v + Math.max(0, gap - CHASM.boostFrom) * CHASM.boostK) * dt; }
    const gap = car.x - chasm.front;
    if (gap < 60) shake = Math.max(shake, 0.3 * (1 - gap / 60));
    if (gap < CHASM.catchGap && !car.crashed) { chasm.front = car.x - 20; onCrash('The collapsing Moon swallowed you'); }
    placeChasm();
    const txt = gap < 25 ? 'COLLAPSE ' + Math.max(0, Math.round(gap)) + ' m  -  NITRO!' : 'COLLAPSE ' + Math.round(gap) + ' m BEHIND';
    if (txt !== chasm.txt) { chasm.txt = txt; $('chasmTxt').textContent = txt; }
    const b = $('chasmBox'); b.classList.toggle('danger', gap < 25); b.classList.toggle('warn', gap >= 25 && gap < 50);
    $('chasmBar').style.setProperty('--g', Math.max(0, Math.min(1, gap / 80)).toFixed(3));
  }
  if (vis) updateRoadBreak(dt, state === 'playing' && chasm.t > CHASM.grace - 1.5);
  const a = chasm.embers.geometry.attributes.position.array; for (let i = 1; i < a.length; i += 3) { a[i] += dt * 14; if (a[i] > 34) a[i] = -8; } chasm.embers.geometry.attributes.position.needsUpdate = true;
  chasm.face.material.opacity = 0.8 + 0.2 * Math.sin(performance.now() * 0.01);
}
