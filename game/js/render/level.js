/* eslint-disable */
'use strict';
/* Level loader */
/* ================= level loader ================= */
function disposeGroup(g) {
  g.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    for (const m of (Array.isArray(o.material) ? o.material : [o.material])) if (m && !m.isShared) { if (m.map && m.map.dispose) m.map.dispose(); m.dispose(); }
  });
}
function loadLevel(n) {
  level = n; const L = LEVELS[n]; levelGroup.position.set(0, 0, 0);
  for (const c of levelGroup.children.slice()) { levelGroup.remove(c); disposeGroup(c); }
  track = Phys.buildTrack(baseOf(n)); if (L.sideCam) track.path = null; ground = Phys.makeGround(track); car.ground = ground; car.pads = track.boosts || null; car.g = L.gravity || Phys.G; CPS = track.checkpoints;
  document.body.classList.toggle('lowg', !!L.gravity);
  setSky(L);
  levelGroup.add(trackGroup2());
  buildTrackMesh(L); buildScenery(L); buildEnvironment(L); buildGates(); buildHazards(); buildBoostPads();
  if (L.world === 1 && !L.noTint) marsTint(levelGroup);
  buildStorm(); buildCold(); buildChasm();
  $('lvlName').textContent = L.name + (L.gravity ? '  \u00B7  LOW GRAVITY ' + Math.round(L.gravity / Phys.G * 100) + '%' : '') + (L.meteors ? '  \u00B7  METEOR STORM' : '') + (L.cold ? '  \u00B7  MARS COLD' : '');
  refreshMenu();
}
function marsTint(g) {
  const T = new THREE.Color(0xc4501e), seen = new Set();
  g.traverse((o) => {
    for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
      if (!m || seen.has(m) || m.isShared) continue; seen.add(m);
      if (m.isSpriteMaterial || m.isPointsMaterial) continue;
      if (m.isMeshBasicMaterial) { if (m.color && m.color.g > m.color.r * 1.05 && m.color.g > m.color.b) m.color.lerp(T, 0.5); continue; }
      if (m.color) m.color.lerp(T, 0.4); if (m.emissive) m.emissive.lerp(T, 0.4);
    }
  });
}
function trackGroup2() { const g = new THREE.Group(); trackGroupRef = g; return g; }
let trackGroupRef = null;
