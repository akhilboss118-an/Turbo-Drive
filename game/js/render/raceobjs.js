/* eslint-disable */
'use strict';
/* glTF checkpoint pads (checkpoint.glb) and finish arch (finish_line.glb) dressed onto the existing gate markers */
const RACE_MODELS = { checkpoint: null, finish: null }, raceMixers = [];
const CP_DIAM = W * 1.7, FIN_WIDTH = W * 2 + 1.4, CP_IDLE = 0x7ff6ff, CP_DONE = 0x6dff8e;
let raceLoading = false, raceWaiting = [];

function prepModel(root, target, axis) {
  const holder = new THREE.Group(), box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  root.position.set(-c.x, -box.min.y, -c.z); holder.add(root);
  holder.scale.setScalar(target / size[axis]);
  root.traverse((o) => { if (o.isMesh) { o.raycast = () => {}; o.frustumCulled = false; } });
  return holder;
}
function loadRaceModels(cb) {
  if (RACE_MODELS.checkpoint && RACE_MODELS.finish) { cb(); return; }
  raceWaiting.push(cb); if (raceLoading || !THREE.GLTFLoader) return; raceLoading = true;
  let left = 2; const done = () => { if (--left) return; const w = raceWaiting; raceWaiting = []; w.forEach((f) => f()); };
  const L = new THREE.GLTFLoader();
  L.load('game/assets/models/checkpoint.glb', (g) => { RACE_MODELS.checkpoint = { tpl: prepModel(g.scene, CP_DIAM, 'x'), clips: g.animations }; done(); }, undefined, done);
  L.load('game/assets/models/finish_line.glb', (g) => { RACE_MODELS.finish = { tpl: prepModel(g.scene, FIN_WIDTH, 'x'), clips: g.animations }; done(); }, undefined, done);
}
function cloneModel(m) {
  const o = new THREE.Group(), mats = []; o.add(m.tpl.clone(true));
  o.traverse((n) => { if (!n.isMesh) return; n.material = Array.isArray(n.material) ? n.material.map((x) => x.clone()) : n.material.clone(); for (const x of [].concat(n.material)) { x.userData.base = x.color ? x.color.clone() : null; mats.push(x); } });
  if (m.clips && m.clips.length) { const mx = new THREE.AnimationMixer(o); m.clips.forEach((c) => mx.clipAction(c).play()); raceMixers.push(mx); }
  return { obj: o, mats };
}
function attachGateModels() {
  raceMixers.length = 0;
  const list = gates.slice();
  loadRaceModels(() => {
    if (gates[0] !== list[0]) return;
    list.forEach((g, i) => {
      const fin = i === list.length - 1, m = fin ? RACE_MODELS.finish : RACE_MODELS.checkpoint; if (!m) return;
      const c = cloneModel(m); if (fin) c.obj.rotation.y = Math.PI / 2;
      g.group.children.forEach((ch) => { ch.visible = false; });
      g.group.add(c.obj); g.model = c.obj; g.mats = c.mats; g.fin = fin; g.flash = 0; tintGate(g, false);
    });
  });
}
function tintGate(g, done) {
  if (!g.mats || g.fin) return;
  for (const x of g.mats) { if (!x.userData.base) continue; x.color.copy(x.userData.base); if (done) x.color.multiply(new THREE.Color(CP_DONE)); if (x.emissive) x.emissive.setHex(done ? 0x1a6a2a : 0x000000); }
}
function gateCleared(g) { g.flash = 1; tintGate(g, true); }
function resetGateModels() { for (const g of gates) { g.flash = 0; tintGate(g, false); if (g.model) g.model.scale.setScalar(1); } }
function updateRaceObjs(dt) {
  for (const mx of raceMixers) mx.update(dt);
  for (const g of gates) {
    if (!g.model || !g.flash) continue;
    g.flash = Math.max(0, g.flash - dt * 1.6);
    const k = g.flash, s = 1 + 0.45 * Math.sin((1 - k) * Math.PI) * k;
    g.model.scale.set(s, 1 + 1.4 * k, s);
  }
}
