/* eslint-disable */
'use strict';
/* Sky decor, cloud sea, towers, volcanoes, spires and floating motes */
let envGroup = null, skyFollow = null, motes = null, envT = 0;

const ENV = {
  1: { sun: ['#fff2c0', '#ffb04a', '#ff5aa0'], sunSize: 380, sunPos: [520, 70, -220], cloud: 0xff8fc0, cloud2: 0xffc27a, spire: [0x35e6ff, 0xff5aa0], mount: 0x3a1f7a, mote: 0xffd2a0 },
  2: { sun: ['#e8ffff', '#5be0c8', '#136a8a'], sunSize: 300, sunPos: [480, 150, -200], cloud: 0x35e6ff, cloud2: 0xff6ad5, tower: [0x35e6ff, 0xff6ad5, 0xffd34d], mote: 0x9dff6a },
  3: { planet: true, cloud: 0x8f6bff, cloud2: 0x35e6ff, spire: [0xb28cff, 0x35e6ff], mote: 0xd8c8ff },
  4: { sun: ['#fff0b0', '#ff7a2a', '#c2201e'], sunSize: 460, sunPos: [500, 40, -200], cloud: 0xff5a3d, cloud2: 0xffc04a, volcano: true, mote: 0xffa040 },
  6: { sun: ['#ffffff', '#bfefff', '#2a5a8a'], sunSize: 260, sunPos: [430, 150, -320], ice: true, mount: 0x6fa8d8, mote: 0xe8ffff },
  7: { sun: ['#fff0c8', '#ff9a4a', '#8a3a6a'], sunSize: 480, sunPos: [-420, 35, -360], cloud: 0xc06a8a, cloud2: 0xffb070, mount: 0x1c3a3a, jungle: true, mote: 0xc8ff6a },
  5: { sun: ['#fff6d0', '#ffb45a', '#e0653f'], sunSize: 520, sunPos: [420, 40, -380], cloud: 0xff8a5a, cloud2: 0xffd29a, mount: 0x5a2438, desert: true, mote: 0xffd6a0 },
  8: { sun: ['#fff0b0', '#ff7a2a', '#c2201e'], sunSize: 420, sunPos: [480, 30, -240], cloud: 0x8a2a1a, cloud2: 0xff7a2a, volcano: true, mote: 0xff8a30 },
};

for (let n = 9; n <= 16; n++) {
  const b = ENV[n - 8];
  ENV[n] = Object.assign({}, b, { mote: 0xffa070 }, b.sun ? { sun: ['#ffe6c8', '#ff9a5a', '#a8482a'] } : {}, b.cloud ? { cloud: 0xc2603a, cloud2: 0xe8a070 } : {}, b.mount ? { mount: 0x5a2418 } : {}, b.tower ? { tower: [0xff9a4a, 0xff5a2a, 0xffd34d] } : {}, b.spire ? { spire: [0xff9a4a, 0x7fe8ff] } : {}, { mars: true });
}
ENV[29] = { sun: ['#ffffff', '#fff3c0', '#ffd070'], sunSize: 420, sunPos: [420, 260, -380], cloud: 0xffffff, cloud2: 0xdfefff, mount: 0x4a7a4a, mote: 0xffffff, circuit: true };
ENV[17] = { sun: ['#ffffff', '#fff3d0', '#6a6a78'], sunSize: 300, sunPos: [480, 120, -300], mount: 0x4a4d58, mote: 0xcfd3e0, moon: true };
ENV[18] = { sun: ['#fff6e0', '#ffc890', '#8a5a4a'], sunSize: 360, sunPos: [-460, 60, -320], mount: 0x3e3a46, mote: 0xe0c8b8, moon: true };
ENV[19] = { sun: ['#fff0e0', '#ffb890', '#6a4a4a'], sunSize: 380, sunPos: [-440, 70, -330], mount: 0x44424e, mote: 0xd8c8d0, moon: true };
ENV[20] = { sun: ['#ffe0b0', '#ff5a2a', '#6a1410'], sunSize: 640, sunPos: [420, 20, -300], mount: 0x3a2a2e, mote: 0xffa070, moon: true };
function glowTexture(stops) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  stops.forEach((s, i) => r.addColorStop(i / (stops.length - 1), s));
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
function cloudTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
  for (let i = 0; i < 9; i++) {
    const x = 50 + Math.random() * 156, y = 50 + Math.random() * 28, r = 26 + Math.random() * 26;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
  }
  return new THREE.CanvasTexture(c);
}
function windowTexture(cols) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 128, 256);
  for (let y = 6; y < 250; y += 14) for (let x = 8; x < 120; x += 16) {
    if (Math.random() < 0.55) { g.fillStyle = '#' + cols[Math.floor(Math.random() * cols.length)].toString(16).padStart(6, '0'); g.fillRect(x, y, 9, 7); }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
const tintC = (hexv, k) => new THREE.Color(hexv).multiplyScalar(k);

function buildEnvironment(L) {
  envGroup = new THREE.Group(); levelGroup.add(envGroup); auroraMats.length = 0; issPivot = null; issBody = null;
  const E = ENV[level], low = settings.quality === 'low', len = track.length;
  seed = L.seed + 100; envT = 0;
  const gAt = (x) => { const v = ground(x); return v === null ? 0 : v; };

  skyFollow = new THREE.Group(); envGroup.add(skyFollow);
  if (ISS_LEVELS.includes(level)) addIssLandmark(skyFollow, new THREE.Vector3(430, 40, -190), new THREE.Vector3(0.9, 0.35, -0.39));
  if (E.sun) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(E.sun.concat(['rgba(0,0,0,0)'])), fog: false, depthWrite: false, transparent: true }));
    sp.scale.set(E.sunSize, E.sunSize, 1); sp.position.set(E.sunPos[0], E.sunPos[1], E.sunPos[2]); skyFollow.add(sp);
  }
  if (E.planet) {
    const pc = document.createElement('canvas'); pc.width = 256; pc.height = 128; const pg = pc.getContext('2d');
    const gr = pg.createLinearGradient(0, 0, 0, 128); ['#6a4ad8', '#c08cff', '#35e6ff', '#8f6bff', '#3a1a8a'].forEach((c, i, a) => gr.addColorStop(i / (a.length - 1), c));
    pg.fillStyle = gr; pg.fillRect(0, 0, 256, 128);
    const planet = new THREE.Mesh(new THREE.SphereGeometry(90, 32, 24), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(pc), fog: false }));
    planet.position.set(560, 170, -330); skyFollow.add(planet);
    const ring = new THREE.Mesh(new THREE.RingGeometry(120, 190, 64), new THREE.MeshBasicMaterial({ color: 0x9de8ff, side: THREE.DoubleSide, transparent: true, opacity: 0.55, fog: false, depthWrite: false }));
    ring.position.copy(planet.position); ring.rotation.set(1.25, 0.1, 0.35); skyFollow.add(ring);
    const moon = new THREE.Mesh(new THREE.SphereGeometry(22, 20, 16), new THREE.MeshBasicMaterial({ color: 0xffd9f0, fog: false }));
    moon.position.set(380, 250, -260); skyFollow.add(moon);
  }

  if (E.mars) {
    const potato = (r, sy, col, x, y, z) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), new THREE.MeshBasicMaterial({ color: col, fog: false })); m.scale.set(1.25, sy, 1); m.position.set(x, y, z); skyFollow.add(m); };
    potato(26, 0.8, 0xb09080, -380, 230, -420); potato(11, 0.85, 0x9a8070, 300, 270, -380);
  }
  if (E.moon) { moonEnv(L, E, low); return; }
  if (E.circuit) { circuitEnv(L, E, low); return; }
  if (E.desert) { desertEnv(L, E, low); return; }
  if (E.ice) { iceEnv(L, E, low); return; }
  if (E.jungle) { jungleEnv(L, E, low); return; }

  // sea of glowing clouds far below the track
  const cTex = cloudTexture(), nCl = low ? 36 : 90;
  for (let i = 0; i < nCl; i++) {
    const m = new THREE.SpriteMaterial({ map: cTex, color: i % 3 ? E.cloud : E.cloud2, transparent: true, opacity: 0.55 + rnd() * 0.3, depthWrite: false, blending: i % 2 ? THREE.NormalBlending : THREE.AdditiveBlending });
    const sp = new THREE.Sprite(m), w = 90 + rnd() * 160;
    sp.scale.set(w, w * 0.45, 1); sp.position.set(-60 + rnd() * (len + 260), -70 - rnd() * 40, (rnd() - 0.5) * 520); envGroup.add(sp);
  }

  // neon towers (canyon level)
  if (E.tower) {
    const winTex = windowTexture(E.tower), n = low ? 28 : 64;
    for (let i = 0; i < n; i++) {
      const x = -20 + (i / n) * (len + 60) + (rnd() - 0.5) * 12, side = i % 2 ? -1 : 1, z = side * (44 + rnd() * 70);
      const w = 7 + rnd() * 12, top = gAt(Math.max(0, Math.min(len, x))) - 14 + rnd() * 46, h = top + 100;
      const geo = new THREE.BoxGeometry(w, h, w), uv = geo.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * w / 14, uv.getY(k) * h / 36);
      const col = E.tower[i % E.tower.length];
      const mat = new THREE.MeshLambertMaterial({ color: tintC(col, 0.18), emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 0.9 });
      const t = new THREE.Mesh(geo, mat); t.position.set(x, top - h / 2, z); envGroup.add(t);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(w * 1.05, 0.7, w * 1.05), new THREE.MeshBasicMaterial({ color: col })); cap.position.set(x, top + 0.35, z); envGroup.add(cap);
    }
  }

  // glowing crystal spires rising from the clouds
  if (E.spire) {
    const n = low ? 30 : 70, geo = new THREE.ConeGeometry(1, 1, 5);
    for (let i = 0; i < n; i++) {
      const x = -20 + (i / n) * (len + 60) + (rnd() - 0.5) * 14, z = (i % 2 ? -1 : 1) * (80 + rnd() * 130), h = 50 + rnd() * 110, r = 5 + rnd() * 10;
      const col = E.spire[i % E.spire.length];
      const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: tintC(col, 0.6), emissive: col, emissiveIntensity: 0.45 }));
      m.scale.set(r, h, r); m.position.set(x, -60 + h / 2 + rnd() * 20, z); envGroup.add(m);
    }
  }
  if (E.mount) {
    const geo = new THREE.ConeGeometry(1, 1, 7), mc = new THREE.Color(E.mount);
    for (let i = 0; i < (low ? 12 : 26); i++) {
      const x = -100 + (i / 26) * (len + 300), z = (i % 2 ? -1 : 1) * (220 + rnd() * 160), h = 90 + rnd() * 160, r = 70 + rnd() * 80;
      const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: mc, emissive: mc, emissiveIntensity: 0.5 })); m.scale.set(r, h, r); m.position.set(x, -80 + h / 2, z); envGroup.add(m);
    }
  }

  // glowing volcanoes (final level)
  if (E.volcano) {
    const geo = new THREE.ConeGeometry(1, 1, 9), capGeo = new THREE.CylinderGeometry(0.3, 0.4, 0.04, 9);
    const lava = new THREE.MeshBasicMaterial({ color: 0xff8a2a }), rockC = new THREE.Color(0x4a1418);
    const glow = new THREE.SpriteMaterial({ map: glowTexture(['rgba(255,190,80,0.95)', 'rgba(255,90,30,0.45)', 'rgba(255,60,20,0)']), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    for (let i = 0; i < (low ? 10 : 22); i++) {
      const x = -60 + (i / 22) * (len + 160) + (rnd() - 0.5) * 30, z = (i % 2 ? -1 : 1) * (120 + rnd() * 160), h = 70 + rnd() * 110, r = 40 + rnd() * 50;
      const v = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: rockC, emissive: rockC, emissiveIntensity: 0.6 })); v.scale.set(r, h, r); v.position.set(x, -75 + h / 2, z); envGroup.add(v);
      const cap = new THREE.Mesh(capGeo, lava); cap.scale.set(r, 1, r); cap.position.set(x, -75 + h - 1, z); envGroup.add(cap);
      const gs = new THREE.Sprite(glow); gs.scale.set(r * 3.2, r * 2.4, 1); gs.position.set(x, -75 + h + 4, z); envGroup.add(gs);
    }
  }

  // floating motes (fireflies / embers / stardust)
  const nm = low ? 120 : 340, p = new Float32Array(nm * 3);
  for (let i = 0; i < nm; i++) { p[i * 3] = rnd() * len; p[i * 3 + 1] = -8 + rnd() * 40; p[i * 3 + 2] = (rnd() - 0.5) * 120; }
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.BufferAttribute(p, 3));
  motes = new THREE.Points(mg, new THREE.PointsMaterial({ color: E.mote, size: 3.2, sizeAttenuation: false, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
  motes.frustumCulled = false; envGroup.add(motes);
}

function envUpdate() {
  if (!envGroup) return;
  envT += 1 / 60; issUpdate(1 / 60);
  skyFollow.position.set(camera.position.x, camera.position.y * 0.5 - levelGroup.position.y, track.path ? camera.position.z : 0);
  motes.material.opacity = 0.55 + 0.3 * Math.sin(envT * 2.1);
  motes.position.y = Math.sin(envT * 0.6) * 1.2;
  for (const a of auroraMats) { a.tex.offset.x = (envT * a.speed) % 1; a.mat.opacity = a.base * (0.75 + 0.25 * Math.sin(envT * 0.7 + a.ph)); }
}
