/* eslint-disable */
'use strict';
/* Ice biome kit (level 6): frozen lake floor, glacier cliffs and spikes, a lit "MEGA" gantry before the big ramp, aurora ribbons in the sky. */
const ICE_FLOOR = -9, auroraMats = [];
const ICE_COLS = [0xbfefff, 0x8fd0f0, 0x6aa8d8, 0xdff8ff, 0x7ac0e0];
function buildIceScenery(L) {
  const low = settings.quality === 'low', len = track.length;
  const lam = (c, e) => new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: e });
  const iceMats = ICE_COLS.map((c) => lam(c, 0.22)), glowMats = L.glow.map((c) => new THREE.MeshBasicMaterial({ color: c }));

  // frozen lake under the whole track (also what you see below the chasm)
  const fg = new THREE.PlaneGeometry(len + 900, 900, 48, 18); fg.rotateX(-Math.PI / 2);
  const fp = fg.attributes.position, fc = new Float32Array(fp.count * 3), a = new THREE.Color(0xcdeeff), b = new THREE.Color(0x5a98c8), tc = new THREE.Color();
  for (let i = 0; i < fp.count; i++) { const X = fp.getX(i), Z = fp.getZ(i), n = Math.sin(X * 0.05) * Math.cos(Z * 0.07) + 0.6 * Math.sin(X * 0.13 + Z * 0.09); fp.setY(i, n * 0.35); tc.copy(a).lerp(b, 0.5 + 0.5 * Math.sin(X * 0.02 + Z * 0.03 + n)); fc[i * 3] = tc.r; fc[i * 3 + 1] = tc.g; fc[i * 3 + 2] = tc.b; }
  fg.setAttribute('color', new THREE.BufferAttribute(fc, 3)); fg.computeVertexNormals();
  const floor = new THREE.Mesh(fg, new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x2a5a88, emissiveIntensity: 0.3 })); floor.position.set(len / 2, ICE_FLOOR, 0); sceneryGroup.add(floor);

  // glacier cliffs: tall faceted ice prisms along both sides, taller and closer around the mega ramp
  const cliffGeo = new THREE.CylinderGeometry(0.55, 1, 1, 6), n = low ? 34 : 80;
  for (let i = 0; i < n; i++) {
    const x = -40 + (i / n) * (len + 160) + (rnd() - 0.5) * 12, side = i % 2 ? -1 : 1, near = x > 560 && x < 800 ? 0.7 : 1;
    const r = 6 + rnd() * 12, h = 18 + rnd() * 52, zr = r * (0.7 + rnd() * 0.6), z = side * (W + 20 + zr + rnd() * 40 * near);   // keep the whole prism clear of the road and camera
    const m = new THREE.Mesh(cliffGeo, iceMats[i % ICE_COLS.length]); m.scale.set(r, h, zr); m.position.set(x, ICE_FLOOR + h / 2, z); m.rotation.y = rnd() * 3; sceneryGroup.add(m);
  }
  // ice spikes and glowing crystals close to the road
  const spikeGeo = new THREE.ConeGeometry(0.8, 1, 5), nsp = low ? 40 : 110;
  for (let i = 0; i < nsp; i++) {
    const x = rnd() * len, side = rnd() < 0.5 ? -1 : 1, z = side * (W + 3 + rnd() * 16), sc = 0.8 + rnd() * 2.2, gh = ground(x), top = (gh === null ? 0 : gh) - 2.5;
    const crystal = i % 5 === 0, m = new THREE.Mesh(spikeGeo, crystal ? glowMats[i % 2] : iceMats[i % ICE_COLS.length]);
    m.scale.set(sc, sc * (2 + rnd() * 3), sc); m.position.set(x, Math.min(top, ICE_FLOOR + 9) + sc, z); m.rotation.z = (rnd() - 0.5) * 0.3; sceneryGroup.add(m);
  }
  // "MEGA" gantry just before the ramp foot (s = 612), reusing the road-sign board from the desert kit
  if (L.megaJump) { const S0 = 612, y = refH(S0), poleMat = new THREE.MeshLambertMaterial({ color: 0x2a4a78 }), g = new THREE.Group();
    for (const sd of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6.4, 0.4), poleMat); p.position.set(0, 3.2, sd * (W + 0.7)); g.add(p); }
    const board = new THREE.Mesh(new THREE.PlaneGeometry(2 * W + 1.4, (2 * W + 1.4) / 2), new THREE.MeshBasicMaterial({ map: chevronTex('MEGA'), side: THREE.DoubleSide }));
    board.rotation.y = -Math.PI / 2; board.position.set(0, 5.2, 0); g.add(board); placeOnRoad(g, S0, y, 0, y); sceneryGroup.add(g); }
  if (L.spiral) buildSpiralTowers(L, iceMats, glowMats);
  buildRoadside(L); buildHoops(L);
  // starfield follows the camera
  { const ns = 380, p = new Float32Array(ns * 3);
    for (let i = 0; i < ns; i++) { const an = rnd() * 6.283, u = 0.15 + rnd() * 0.85, r = 380; p[i * 3] = Math.cos(an) * r * 0.9; p[i * 3 + 1] = u * r * 0.7; p[i * 3 + 2] = -Math.abs(Math.sin(an)) * r - 60; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    starPts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfeaff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 })); starPts.frustumCulled = false; sceneryGroup.add(starPts); }
}
function auroraTex(c1, c2) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
  for (let x = 0; x < 256; x += 2) {   // vertical curtain streaks: bright low edge fading upward
    const a = 0.35 + 0.65 * Math.abs(Math.sin(x * 0.05) * Math.cos(x * 0.021 + 1)), gr = g.createLinearGradient(0, 128, 0, 0);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.2, c1); gr.addColorStop(0.65, c2); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = a; g.fillStyle = gr; g.fillRect(x, 0, 2, 128);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; return t;
}
// aurora ribbons, pale far peaks and falling snow motes
function iceEnv(L, E, low) {
  const len = track.length;
  const cols = [['rgba(122,255,208,0.95)', 'rgba(120,110,255,0.55)'], ['rgba(157,123,255,0.9)', 'rgba(60,220,200,0.5)'], ['rgba(122,255,208,0.8)', 'rgba(200,120,255,0.45)']];
  for (let i = 0; i < (low ? 2 : 3); i++) {
    const tex = auroraTex(cols[i][0], cols[i][1]), geo = new THREE.PlaneGeometry(900, 150 + i * 20, 40, 1), pp = geo.attributes.position;
    for (let k = 0; k < pp.count; k++) pp.setZ(k, Math.sin(pp.getX(k) * 0.011 + i * 2) * 28);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const m = new THREE.Mesh(geo, mat); m.position.set(-60 + i * 90, 160 + i * 26, -330 - i * 70); m.rotation.y = (i - 1) * 0.12; skyFollow.add(m);
    auroraMats.push({ mat, tex, base: 0.5, speed: 0.004 + i * 0.002, ph: i * 1.7 });
  }
  const mg = new THREE.ConeGeometry(1, 1, 6), mc = new THREE.Color(E.mount);
  for (let i = 0; i < (low ? 12 : 26); i++) {
    const x = -100 + (i / 26) * (len + 300), z = (i % 2 ? -1 : 1) * (240 + rnd() * 180), h = 90 + rnd() * 150, r = 70 + rnd() * 80;
    const m = new THREE.Mesh(mg, new THREE.MeshLambertMaterial({ color: mc, emissive: mc, emissiveIntensity: 0.4 })); m.scale.set(r, h, r); m.position.set(x, ICE_FLOOR + h / 2 - 6, z); envGroup.add(m);
  }
  const nm = low ? 120 : 340, p = new Float32Array(nm * 3);
  for (let i = 0; i < nm; i++) { p[i * 3] = rnd() * len; p[i * 3 + 1] = -6 + rnd() * 36; p[i * 3 + 2] = (rnd() - 0.5) * 120; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  motes = new THREE.Points(g, new THREE.PointsMaterial({ color: E.mote, size: 2.6, sizeAttenuation: false, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
  motes.frustumCulled = false; envGroup.add(motes);
}

/* Spiral towers (levels with L.spiral = [[x0, x1, y0, y1]]): an ice pillar wrapped by a glowing helix road, standing behind the climb */
function buildSpiralTowers(L, iceMats, glowMats) {
  const low = settings.quality === 'low', slabGeo = new THREE.BoxGeometry(7, 0.7, 1), rimGeo = new THREE.BoxGeometry(0.4, 0.5, 1);
  for (const t of L.spiral) {
    const cx = (t[0] + t[1]) / 2, cz = -48, R = 15, top = t[3] + 8, turns = 3, n = low ? 54 : 108, g = new THREE.Group();
    const pil = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 7, top - ICE_FLOOR, 10), iceMats[1]); pil.position.set(cx, ICE_FLOOR + (top - ICE_FLOOR) / 2, cz); g.add(pil);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(7, 9, 10), glowMats[0]); cap.position.set(cx, top + 4.5, cz); g.add(cap);
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), a = u * turns * Math.PI * 2, y = t[2] + 4 + u * (t[3] - t[2]), arc = (turns * Math.PI * 2 * R) / n * 1.06, slope = (t[3] - t[2]) / (turns * Math.PI * 2 * R);
      const s = new THREE.Mesh(slabGeo, iceMats[3]); s.scale.z = arc; s.rotation.order = 'YXZ'; s.rotation.y = -a; s.rotation.x = -Math.atan(slope); s.position.set(cx + Math.cos(a) * R, y, cz + Math.sin(a) * R);
      const r = new THREE.Mesh(rimGeo, glowMats[i % 2]); r.scale.z = arc; r.rotation.copy(s.rotation); r.position.set(cx + Math.cos(a) * (R + 3.4), y + 0.4, cz + Math.sin(a) * (R + 3.4));
      g.add(s, r);
    }
    sceneryGroup.add(g);
  }
}
