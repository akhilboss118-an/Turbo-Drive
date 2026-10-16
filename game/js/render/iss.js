/* eslint-disable */
'use strict';
/* ISS landmark for the space levels: scenic glTF model that spins slowly and orbits in front of the race camera. No collisions. */
let issTemplate = null, issLoading = false, issPivot = null, issBody = null, issWaiting = null;
const ISS_LEVELS = [3, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]; // Space Bridge, Mars, Moon
const ISS_SIZE = 95, ISS_ORBIT_R = 130, ISS_ORBIT_SPEED = 0.05, ISS_SPIN_SPEED = 0.12;

function loadIss(cb) {
  if (issTemplate) { cb(issTemplate); return; }
  issWaiting = cb; if (issLoading || !THREE.GLTFLoader) return; issLoading = true;
  new THREE.GLTFLoader().load('game/assets/models/iss.glb', (g) => {
    const root = g.scene, box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const holder = new THREE.Group(); root.position.sub(c); holder.add(root); holder.scale.setScalar(ISS_SIZE / Math.max(size.x, size.y, size.z));
    root.traverse((o) => { if (!o.isMesh) return; o.raycast = () => {}; for (const m of (Array.isArray(o.material) ? o.material : [o.material])) { m.isShared = true; m.fog = false; } });
    issTemplate = holder; if (issWaiting) issWaiting(holder);
  }, undefined, () => { issLoading = false; });
}

function addIssLandmark(parent, center, axis) {
  issPivot = new THREE.Group(); issPivot.position.copy(center); issPivot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.clone().normalize()); parent.add(issPivot);
  const pivot = issPivot;
  loadIss((tpl) => {
    if (pivot !== issPivot) return;
    issBody = tpl.clone(); issBody.position.set(ISS_ORBIT_R, 0, 0); issBody.rotation.set(0.4, 0, 0.2); pivot.add(issBody);
  });
}

function issUpdate(dt) {
  if (!issPivot || !issPivot.parent) return;
  issPivot.rotateY(ISS_ORBIT_SPEED * dt);
  if (issBody) issBody.rotation.y += ISS_SPIN_SPEED * dt;
}
