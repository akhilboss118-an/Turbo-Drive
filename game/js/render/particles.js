/* eslint-disable */
'use strict';
/* Particles */
/* ================= particles ================= */
function makeParticles(max, color, size, additive, grav) {
  const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d');
  const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  const geo = new THREE.BufferGeometry(), p = new Float32Array(max * 3); for (let i = 0; i < max; i++) p[i * 3 + 1] = -9999;
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const mat = new THREE.PointsMaterial({ color, size, map: new THREE.CanvasTexture(c), transparent: true, opacity: additive ? 0.95 : 0.5, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; scene.add(pts);
  const vel = new Float32Array(max * 3), life = new Float32Array(max); let head = 0;
  return {
    emit(x, y, z, vx, vy, vz, l) { const i = head; head = (head + 1) % max; p[i * 3] = x; p[i * 3 + 1] = y; p[i * 3 + 2] = z; vel[i * 3] = vx; vel[i * 3 + 1] = vy; vel[i * 3 + 2] = vz; life[i] = l; },
    update(dt) {
      for (let i = 0; i < max; i++) {
        if (life[i] > 0) { life[i] -= dt; if (life[i] <= 0) { p[i * 3 + 1] = -9999; continue; } vel[i * 3 + 1] -= grav * dt; p[i * 3] += vel[i * 3] * dt; p[i * 3 + 1] += vel[i * 3 + 1] * dt; p[i * 3 + 2] += vel[i * 3 + 2] * dt; }
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}
const dust = makeParticles(120, 0xd8c8ff, 1.1, false, -1), sparks = makeParticles(160, 0xffa040, 0.55, true, 14);
wrapEmit(dust); wrapEmit(sparks);
const burst = (n, spd) => { for (let i = 0; i < n; i++) { const a = rnd() * 6.28, s = spd * (0.3 + rnd()); sparks.emit(car.x, car.y + 0.4, (rnd() - 0.5) * 2, Math.cos(a) * s, Math.abs(Math.sin(a)) * s + 3, (rnd() - 0.5) * s * 0.6, 0.6 + rnd() * 0.6); } };
