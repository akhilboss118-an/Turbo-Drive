/* eslint-disable */
'use strict';
/* Lava biome kit: animated emissive lava plane below the track + rising embers. Rock islands come from the default scenery. */
let lavaMat = null, emberPts = null;
function buildLavaScenery(L) {
  const len = track.length;
  const tex = (function () { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#c2381a'; x.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 40; i++) { x.fillStyle = Math.random() < 0.5 ? '#ff9a3a' : '#7a1608'; x.beginPath(); x.arc(Math.random() * 128, Math.random() * 128, 4 + Math.random() * 12, 0, 7); x.fill(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(len / 30, 6); return t; })();
  lavaMat = new THREE.MeshBasicMaterial({ map: tex, color: 0xffb070 }); lavaMat.isShared = false;
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(len + 400, 220), lavaMat);
  plane.rotation.x = -Math.PI / 2; plane.position.set(len / 2, -9, 0); plane.frustumCulled = false; sceneryGroup.add(plane);
  const n = 260, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = Math.random() * len; pos[i * 3 + 1] = -8 + Math.random() * 30; pos[i * 3 + 2] = (Math.random() - 0.5) * 60; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  emberPts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffa040, size: 0.7, transparent: true, opacity: 0.85, depthWrite: false }));
  emberPts.frustumCulled = false; sceneryGroup.add(emberPts);
}
function updateLava(dt) {
  if (!lavaMat || !lavaMat.map) return;
  lavaMat.map.offset.x += dt * 0.01; lavaMat.map.offset.y -= dt * 0.02;
  if (emberPts) { const a = emberPts.geometry.attributes.position; for (let i = 0; i < a.count; i++) { let y = a.getY(i) + dt * (1.5 + (i % 5) * 0.5); if (y > 24) y = -8; a.setY(i, y); } a.needsUpdate = true; }
}
