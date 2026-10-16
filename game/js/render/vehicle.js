/* eslint-disable */
'use strict';
/* Vehicle model, paint and garage turntable */
/* ================= car ================= */
const carRoot = new THREE.Group(); scene.add(carRoot);
const carMesh = {}, glowSpheres = [], HOVER_Y = 0.3;
let atlasImg = null, baseMat = null, trMat = null;
const paintMats = {}, fxRings = {};
const HOVER2_YAW = 0, POLICE_BAR = [0.05, 0.95];
(function buildCar() {
  const bytes = (s) => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  const geoOf = (D) => {
    const pos = new Float32Array(bytes(D.pos).buffer), uq = new Uint16Array(bytes(D.uv).buffer), nq = new Int8Array(bytes(D.nor).buffer);
    const uv = new Float32Array(uq.length); for (let i = 0; i < uq.length; i++) uv[i] = uq[i] / 65535;
    const a = new Uint16Array(bytes(D.groups.TransportPack).buffer), b = new Uint16Array(bytes(D.groups.TransportPack_tr).buffer);
    const idx = new Uint16Array(a.length + b.length); idx.set(a, 0); idx.set(b, a.length);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('normal', new THREE.BufferAttribute(nq, 3, true));
    geo.setIndex(new THREE.BufferAttribute(idx, 1)); geo.addGroup(0, a.length, 0); geo.addGroup(a.length, b.length, 1);
    return geo;
  };
  const D = CAR_DATA;
  const ld = new THREE.TextureLoader();
  const t1 = ld.load('data:image/png;base64,' + D.tex), t2 = ld.load('data:image/png;base64,' + D.textr);
  for (const t of [t1, t2]) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; }
  baseMat = new THREE.MeshLambertMaterial({ map: t1 }); trMat = new THREE.MeshLambertMaterial({ map: t2, transparent: true, opacity: 0.9 });
  atlasImg = new Image(); atlasImg.onload = () => { for (const k in paintMats) delete paintMats[k]; applyVehicle(vehicleId); }; atlasImg.src = 'data:image/png;base64,' + D.tex;
  // both bodies share the same palette atlas; the van is offset a touch so its axles sit on the physics wheels
  const mk = (data, cx) => { const m = new THREE.Mesh(geoOf(data), [baseMat, trMat]); m.scale.setScalar(S); m.position.set(-cx * S, -WCY * S, 0); m.frustumCulled = false; m.visible = false; carRoot.add(m); return m; };
  carMesh.car = mk(D, CX); carMesh.van = mk(VAN_DATA, 0.2075);
  const jt = ld.load('data:image/png;base64,' + JEEP_TEX);
  const jm = new THREE.Mesh(geoOf(JEEP_DATA), [new THREE.MeshLambertMaterial({ map: jt }), new THREE.MeshLambertMaterial({ map: jt, transparent: true, opacity: 0.6, depthWrite: false })]);
  jm.scale.setScalar(S); jm.position.set(0, -WCY * S, 0); jm.frustumCulled = false; jm.visible = false; carRoot.add(jm); carMesh.jeep = jm;
  const c5 = new THREE.TextureLoader(), c5a = c5.load('data:image/png;base64,' + CAR5_DATA.tex), c5b = c5.load('data:image/png;base64,' + CAR5_DATA.textr);
  for (const t of [c5a, c5b]) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; }
  const gm = new THREE.Mesh(geoOf(CAR5_DATA), [new THREE.MeshLambertMaterial({ map: c5a }), new THREE.MeshLambertMaterial({ map: c5b, transparent: true, opacity: 0.8, depthWrite: false })]);
  gm.scale.setScalar(S); gm.position.set(-0.104 * S, -WCY * S, 0); gm.frustumCulled = false; gm.visible = false; carRoot.add(gm); carMesh.car5 = gm;   // "Low poly car 5" (Sport GT), baked to the same wheelbase as the physics
  // Mars Hover ("blnk-100 concept hovering car"): flat-colour parts, floats a little above the road
  const hv = new THREE.Group();
  for (const p of HOVER_DATA.parts) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(bytes(p.pos).buffer), 3)); geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(bytes(p.nor).buffer), 3)); geo.setIndex(new THREE.BufferAttribute(new Uint16Array(bytes(p.idx).buffer), 1));
    const m = new THREE.MeshLambertMaterial({ color: new THREE.Color(p.c[0], p.c[1], p.c[2]), side: THREE.DoubleSide }); if (p.e) m.emissive = new THREE.Color(p.e[0], p.e[1], p.e[2]);
    const mesh = new THREE.Mesh(geo, m); mesh.frustumCulled = false; hv.add(mesh);
  }
  hv.position.set(0, -WCY * S + HOVER_Y, 0); hv.visible = false; carRoot.add(hv); carMesh.hover = hv;
  // Aero Hover (uploaded hover_car.glb, embedded): normalised to the physics wheelbase once loaded
  const h2 = new THREE.Group(); h2.visible = false; carRoot.add(h2); carMesh.hover2 = h2;
  if (THREE.GLTFLoader) {
    const raw = bytes(HOVER2_B64);
    new THREE.GLTFLoader().parse(raw.buffer, '', (g) => {
      const m = g.scene; m.traverse((o) => { if (o.name === 'CAR_SHADOW' || o.name === 'Object_3') o.visible = false; });
      m.traverse((o) => {
        if (!o.isMesh) return; o.frustumCulled = false; const old = o.material;
        if (old.transparent && old.map && !old.alphaTest && old.opacity < 0.01) { o.visible = false; return; }
        o.material = new THREE.MeshLambertMaterial({ map: old.map || null, color: old.map ? 0xffffff : old.color, transparent: old.transparent, opacity: old.opacity, side: THREE.DoubleSide });
      });
      m.updateMatrixWorld(true);
      const bb = new THREE.Box3(); m.traverse((o) => { if (o.isMesh && o.visible) bb.expandByObject(o); });
      const sz = bb.getSize(new THREE.Vector3()), ctr = bb.getCenter(new THREE.Vector3());
      const alongZ = sz.z > sz.x, len = alongZ ? sz.z : sz.x, k = 4.5 / len;
      const holder = new THREE.Group(); holder.add(m); m.position.set(-ctr.x, -bb.min.y, -ctr.z);
      holder.scale.setScalar(k); holder.position.y = -WCY * S + HOVER_Y + 0.05;
      const spin = new THREE.Group(); spin.add(holder); spin.rotation.y = (alongZ ? Math.PI / 2 : 0) + HOVER2_YAW;
      h2.add(spin); h2.userData.ready = true;
      if (typeof buildGarage === 'function' && typeof state !== 'undefined' && state === 'garage') buildGarage();
      makeHover2Thumb();
    }, () => {});
  }
  // police roof siren lights
  const pl = new THREE.Group(); pl.visible = false; carRoot.add(pl); carMesh.siren = pl;
  pl.userData.l = [-1, 1].map((s) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.34), new THREE.MeshBasicMaterial({ color: s < 0 ? 0xff2a2a : 0x2a6aff })); b.position.set(POLICE_BAR[0], POLICE_BAR[1], s * 0.3); pl.add(b); return b; });
  // headlight glow
  const gl = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), new THREE.MeshBasicMaterial({ color: 0xfff2c0 }));
  for (const z of [-0.5, 0.5]) { const m = gl.clone(); m.position.set(1.85, 0.12, z); carRoot.add(m); glowSpheres.push(m); }
})();
// recolor the dark body panels of the atlas; everything else (glass, tyres, lights) stays untouched
function paintMaterial(p) {
  if (!p) return baseMat;
  const key = p.join(',');
  if (paintMats[key]) return paintMats[key];
  if (!atlasImg || !atlasImg.complete || !atlasImg.naturalWidth) return baseMat;
  const c = document.createElement('canvas'); c.width = atlasImg.naturalWidth; c.height = atlasImg.naturalHeight;
  const g = c.getContext('2d'); g.drawImage(atlasImg, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), px = d.data;
  for (let i = 0; i < px.length; i += 4) {
    const R = px[i], G = px[i + 1], B = px[i + 2];
    if ((R === 18 && G === 18 && B === 18) || (R === 0 && G === 0 && B === 0)) { px[i] = p[0]; px[i + 1] = p[1]; px[i + 2] = p[2]; }
  }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  return (paintMats[key] = new THREE.MeshLambertMaterial({ map: t }));
}
function applyVehicle(id) {
  const v = vehicleById(id);
  carMesh.car.visible = v.model === 'car'; carMesh.van.visible = v.model === 'van'; carMesh.jeep.visible = v.model === 'jeep'; carMesh.car5.visible = v.model === 'car5'; carMesh.hover.visible = v.model === 'hover'; carMesh.hover2.visible = v.model === 'hover2'; carMesh.siren.visible = v.model === 'car';
  if (v.model === 'car' || v.model === 'van') carMesh[v.model].material = [paintMaterial(v.paint), trMat];
  const gp = v.model === 'van' ? [1.72, 0.3] : v.model === 'jeep' ? [1.8, 0.62] : v.model === 'car5' ? [1.9, 0.4] : (v.model === 'hover' || v.model === 'hover2') ? [2.3, 0.45] : [1.85, 0.12];
  for (const m of glowSpheres) { m.position.set(gp[0], gp[1], m.position.z); m.visible = v.model !== 'hover' && v.model !== 'hover2'; }
  const R = RARITY[v.rarity] || RARITY.normal; if (fxRings.a) { fxRings.a.material.color.setHex(R.glow); fxRings.b.material.color.setHex(R.glow2); fxRings.disc.material.color.setHex(R.glow); }
}
applyVehicle(vehicleId);
const shadowHolder = new THREE.Group(), shadow = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false }));
shadow.rotation.x = -Math.PI / 2; shadowHolder.add(shadow); scene.add(shadowHolder);
// garage turntable: glow disc, ring and spinning dashes under the car
const garageFx = new THREE.Group(); scene.add(garageFx); garageFx.visible = false;
const fxMats = [], spinner = new THREE.Group();
(function () {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, 'rgba(53,230,255,.55)'); gr.addColorStop(.6, 'rgba(53,230,255,.16)'); gr.addColorStop(1, 'rgba(53,230,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const add = (geo, mat, y, parent) => { mat.transparent = true; mat.depthWrite = false; mat.blending = THREE.AdditiveBlending; mat.userData.base = mat.opacity; fxMats.push(mat); const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.position.y = y; (parent || garageFx).add(m); return m; };
  fxRings.disc = add(new THREE.CircleGeometry(3.6, 48), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), opacity: 1 }), 0.05);
  fxRings.a = add(new THREE.RingGeometry(2.78, 2.9, 72), new THREE.MeshBasicMaterial({ color: 0x35e6ff, opacity: 0.95 }), 0.07);
  fxRings.b = add(new THREE.RingGeometry(2.2, 2.25, 72), new THREE.MeshBasicMaterial({ color: 0xff8a3d, opacity: 0.55 }), 0.07);
  garageFx.add(spinner);
  for (let i = 0; i < 10; i++) add(new THREE.RingGeometry(3.12, 3.3, 10, 1, i * Math.PI / 5, Math.PI / 8), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xff8a3d : 0x35e6ff, opacity: 0.9 }), 0.07, spinner);
})();
let fxA = 0, viewShift = 0, shiftOn = false, popT = 0;
/* garage thumbnail for the Mars Hover, drawn once with a throw-away renderer */
(function () {
  try {
    const W2 = 240, H2 = 140, r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); r.setSize(W2, H2);
    const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0x553355, 1.15)); const d = new THREE.DirectionalLight(0xffffff, 0.9); d.position.set(3, 6, 5); sc.add(d);
    const g = carMesh.hover.clone(); g.visible = true; g.position.set(0, 0, 0); sc.add(g);
    const cam = new THREE.PerspectiveCamera(30, W2 / H2, 0.1, 100); cam.position.set(6.6, 2.6, 6.2); cam.lookAt(0, 0.45, 0);
    r.render(sc, cam); THUMBS.hover = r.domElement.toDataURL('image/png'); r.dispose(); if (r.forceContextLoss) r.forceContextLoss();
  } catch (e) { THUMBS.hover = THUMBS.gt || ''; }
})();

function makeHover2Thumb() {
  try {
    const W2 = 240, H2 = 140, r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); r.setSize(W2, H2);
    const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight(0xffffff, 0x553355, 1.2)); const d = new THREE.DirectionalLight(0xffffff, 0.9); d.position.set(3, 6, 5); sc.add(d);
    const g = carMesh.hover2.clone(true); g.visible = true; g.position.set(0, 0, 0); sc.add(g);
    const cam = new THREE.PerspectiveCamera(30, W2 / H2, 0.1, 100); cam.position.set(6.6, 2.6, 6.2); cam.lookAt(0, 0.45, 0);
    r.render(sc, cam); THUMBS.hover2 = r.domElement.toDataURL('image/png'); r.dispose(); if (r.forceContextLoss) r.forceContextLoss();
    for (const im of document.querySelectorAll('.gcard[data-id="hover2"] img')) im.src = THUMBS.hover2;
  } catch (e) {}
}
if (!THUMBS.hover2) THUMBS.hover2 = THUMBS.hover;
