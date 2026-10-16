/* eslint-disable */
'use strict';
/* Space Crate pickups: 3 per level on flat road, collected by driving through, opened from the menu / results */
const crateObjs = []; let crateTpl = null, crateGroup = null, crateThumb = '';
const CRATE_SIZE = 1.5, CRATE_Y = 1.05;
(function loadCrateModel() {
  if (!THREE.GLTFLoader) return;
  const b = atob(CRATE_B64), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
  const dv = new DataView(u.buffer), jl = dv.getUint32(12, true), J = JSON.parse(new TextDecoder().decode(u.subarray(20, 20 + jl))), binOff = 20 + jl + 8;
  const bv = J.bufferViews[J.images[0].bufferView];
  const baseTex = new THREE.Texture(); baseTex.flipY = false; if (THREE.sRGBEncoding) baseTex.encoding = THREE.sRGBEncoding; else if (THREE.SRGBColorSpace) baseTex.colorSpace = THREE.SRGBColorSpace;
  { const im = new Image(); im.onload = () => { baseTex.image = im; baseTex.needsUpdate = true; }; im.src = URL.createObjectURL(new Blob([u.subarray(binOff + (bv.byteOffset || 0), binOff + (bv.byteOffset || 0) + bv.byteLength)], { type: 'image/png' })); }
  new THREE.GLTFLoader().parse(u.buffer, '', (g) => {
    const m = g.scene, keep = [];
    const texP = g.parser && g.parser.getDependency ? g.parser.getDependency('texture', 0) : Promise.resolve(null);
    m.traverse((o) => { if (o.isMesh) keep.push(o); });
    for (const o of keep) {
      const old = o.material; o.frustumCulled = false;
      const mp = old.map || baseTex; o.material = new THREE.MeshLambertMaterial({ map: mp, color: 0xffffff, emissive: 0x555555, emissiveMap: mp });
      o.material.isShared = true;
    }
    m.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(m), sz = bb.getSize(new THREE.Vector3()), ctr = bb.getCenter(new THREE.Vector3());
    const holder = new THREE.Group(); holder.add(m); m.position.sub(ctr);
    holder.scale.setScalar(CRATE_SIZE / Math.max(sz.x, sz.y, sz.z));
    crateTpl = new THREE.Group(); crateTpl.add(holder);
    texP.then((tex) => {
      if (tex) { tex.encoding = THREE.sRGBEncoding; tex.flipY = false; tex.needsUpdate = true; for (const o of keep) { o.material.map = tex; o.material.emissiveMap = tex; o.material.emissive.setHex(0x2a2a2a); o.material.needsUpdate = true; } }
      buildCrates(); makeCrateThumb();
    }).catch(() => { buildCrates(); makeCrateThumb(); });
  }, () => {});
})();
function makeCrateThumb() {
  try {
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); r.setSize(260, 260);
    const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0x665577, 1.3)); const d = new THREE.DirectionalLight(0xffffff, 0.9); d.position.set(3, 5, 4); sc.add(d);
    const c = crateTpl.clone(true); c.rotation.y = 0.6; sc.add(c);
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50); cam.position.set(2.6, 1.7, 3.2); cam.lookAt(0, 0, 0);
    r.render(sc, cam); crateThumb = r.domElement.toDataURL('image/png'); r.dispose(); if (r.forceContextLoss) r.forceContextLoss();
    const im = document.getElementById('crImg'); if (im) im.src = crateThumb;
  } catch (e) {}
}
function crateSpots() {
  const hz = (typeof HAZARDS !== 'undefined' && HAZARDS[level]) || [], pads = (track.boosts || []), end = track.finishX || track.length, out = [];
  const ok = (s) => {
    const h = ground(s); if (h === null || s < 40 || s > end - 40) return false;
    for (const d of [-5, 5]) { const h2 = ground(s + d); if (h2 === null || Math.abs(h2 - h) > 0.35) return false; }
    if (Math.abs(Phys.slopeAt(ground, s)) > 0.07) return false;
    for (const x of hz) if (Math.abs(x.x - s) < 22) return false;
    for (const p of pads) if (s > p.x0 - 10 && s < p.x1 + 10) return false;
    for (const o of out) if (Math.abs(o - s) < 60) return false;
    return true;
  };
  for (const f of [0.2, 0.5, 0.78]) {
    const t = end * f;
    for (let d = 0; d <= 120; d += 3) { if (ok(t + d)) { out.push(t + d); break; } if (ok(t - d)) { out.push(t - d); break; } }
  }
  return out;
}
function buildCrates() {
  crateObjs.length = 0;
  if (crateGroup && crateGroup.parent) crateGroup.parent.remove(crateGroup);
  crateGroup = new THREE.Group(); levelGroup.add(crateGroup);
  if (!crateTpl || typeof ground !== 'function') return;
  for (const s of crateSpots()) {
    const gy = refH(s), y = ground(s) + CRATE_Y, root = new THREE.Group(), mesh = crateTpl.clone(true);
    root.add(mesh);
    if (typeof glowTex !== 'undefined') {
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffc83a, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })); gl.material.isShared = true; gl.scale.set(3.4, 3.4, 1); root.add(gl);
    }
    toWorld(s, y, 0, root.position, gy); if (track.path) frameQuat(s, root.quaternion);
    crateGroup.add(root); crateObjs.push({ s, y, root, mesh, got: false, ph: s * 0.37 });
  }
}
function resetCrates() { for (const c of crateObjs) { c.got = false; c.root.visible = true; } }
function checkCrates() {
  for (const c of crateObjs) {
    if (c.got || Math.abs(car.x - c.s) > 2.4 || Math.abs(car.y - c.y) > 2.4) continue;
    c.got = true; c.root.visible = false; crates++; run.crates = (run.crates || 0) + 1; save(); refreshCoins();
    pop(svg('crate', 'coin') + 'SPACE CRATE +1', 'cn', 1400); toast('SPACE CRATE FOUND', 'Open it from the menu or the results screen', 'good'); Snd.cp(); vibe(20);
    for (let i = 0; i < 14; i++) sparks.emit(car.x, car.y + 0.8, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 8, 3 + Math.random() * 6, (Math.random() - 0.5) * 4, 0.7);
  }
}
function updateCrates(t) { for (const c of crateObjs) if (c.root.visible) { c.mesh.rotation.y = t * 1.4 + c.ph; c.mesh.position.y = Math.sin(t * 2.2 + c.ph) * 0.14; } }
