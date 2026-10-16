/* eslint-disable */
'use strict';
/* Pluto finale cinematic (after level 25): the alien UFO chases the hover, the hover dives into Pluto, hides in an ice canyon under a glacier arch, lands with engines off and the UFO loses it. Pure three.js. */
const PC = { on: false, built: false, t: 0, ph: 1, capI: -1, boltT: 0, boltK: 0, ex: 0 };
const PH2 = 8.2, PEND = 34.2, PT1 = 8.2;
const PCAPS = [
  [0.3, 'THE ALIEN IS STILL ON YOUR TAIL', 'warn'], [3.2, 'HIDE ON PLUTO', 'go'], [6.2, 'DIVE!', 'big'],
  [9.8, 'PLUTO REGION AHEAD', ''], [12.6, 'STAY LOW \u2014 USE THE CANYON', ''], [15.9, 'LAND QUIETLY', ''], [18.5, 'ENGINES OFF', 'go'],
  [21.2, "THE ALIEN CAN'T FIND YOU", 'warn'], [25.8, 'IT IS LEAVING...', ''], [28.0, 'SAFE', 'big'], [30.0, 'YOU ENTERED PLUTO REGION', 'go'],
];
const pcSS = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const pcHash = (x, z) => { const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return s - Math.floor(s); };
function pcNoise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = pcHash(ix, iz), b = pcHash(ix + 1, iz), c = pcHash(ix, iz + 1), d = pcHash(ix + 1, iz + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function pcFbm(x, z, o) { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < o; i++) { s += a * pcNoise(x * f, z * f); n += a; f *= 2; a *= 0.5; } return s / n; }
function pcHeight(x, z) {
  const wall = pcSS(52, 150, Math.abs(x)), rid = 1 - Math.abs(2 * pcFbm(x * 0.012 + 7, z * 0.012, 4) - 1);
  let h = wall * (30 + 120 * (0.35 + rid)) + pcSS(-70, -190, z) * (90 + 90 * rid) + pcSS(720, 880, z) * (110 + 60 * rid);
  const flat = pcFbm(x * 0.045, z * 0.045, 3) * 1.6 + pcFbm(x * 0.2, z * 0.2, 2) * 0.25 + 0.25, pad = 1 - pcSS(14, 36, Math.hypot(x, z + 34));
  return h * (1 - pad) + flat * (1 - pad) + 0.3 * pad;
}
const _pcV = new THREE.Vector3(), _pcA = new THREE.Vector3(), _pcB = new THREE.Vector3(), _pcM = new THREE.Matrix4();

function pcBuild() {
  if (PC.built) return; PC.built = true;
  const low = settings.quality === 'low', G = PC.G = new THREE.Group(); G.visible = false; scene.add(G);
  const X0 = -450, X1 = 450, Z0 = -330, Z1 = 900, nx = low ? 110 : 190, nz = low ? 130 : 230, cnt = (nx + 1) * (nz + 1);
  const pos = new Float32Array(cnt * 3), col = new Float32Array(cnt * 3), idx = [];
  const cream = new THREE.Color(0xe8dcc6), brown = new THREE.Color(0x8b6450), snow = new THREE.Color(0xf4f2ff), heart = new THREE.Color(0xfff0f0), tmp = new THREE.Color();
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const k = j * (nx + 1) + i, x = X0 + (X1 - X0) * i / nx, z = Z0 + (Z1 - Z0) * j / nz, h = pcHeight(x, z);
    pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z;
    tmp.copy(cream).lerp(brown, pcSS(0.45, 0.72, pcFbm(x * 0.018 + 3, z * 0.018 + 9, 3)) * 0.75); tmp.lerp(snow, pcSS(30, 140, h) * 0.75);
    const hx = x / 38, hz = -(z - 230) / 38 - 0.1, hf = Math.pow(hx * hx + hz * hz - 1, 3) - hx * hx * hz * hz * hz;
    if (h < 8) tmp.lerp(heart, pcSS(0.25, -0.25, hf));
    tmp.multiplyScalar(0.9 + 0.2 * pcNoise(x * 0.9, z * 0.9)); col[k * 3] = tmp.r; col[k * 3 + 1] = tmp.g; col[k * 3 + 2] = tmp.b;
    if (i < nx && j < nz) { const a = k, b = k + 1, c = k + nx + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
  G.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0x241c34 })));
  let sd = 77; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  const pk = new THREE.MeshLambertMaterial({ color: 0xe4e8f6, flatShading: true, emissive: 0x1a1a2c }), cg = new THREE.ConeGeometry(1, 1, 5);
  for (let i = 0; i < (low ? 22 : 44); i++) {
    const side = rnd() < 0.5 ? -1 : 1, x = side * (75 + rnd() * 170), z = -150 + rnd() * 940, ht = 40 + rnd() * 75, r = 18 + rnd() * 26, m = new THREE.Mesh(cg, pk);
    m.scale.set(r, ht, r); m.position.set(x, pcHeight(x, z) + ht * 0.42, z); m.rotation.y = rnd() * 3; G.add(m);
  }
  const am = new THREE.MeshLambertMaterial({ color: 0xc9d4ea, flatShading: true, emissive: 0x181a2a });
  const arch = new THREE.Mesh(new THREE.TorusGeometry(19, 6.5, 8, 26, Math.PI), am); arch.scale.set(1, 1.1, 1.8); arch.position.set(0, -1, -34); G.add(arch);
  for (const s of [-1, 1]) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(8, 0), am); b.scale.set(1, 0.9, 1.6); b.position.set(s * 19, 1, -34); G.add(b); }
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const cx = cv.getContext('2d'), gr = cx.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, 'rgba(0,0,10,0.75)'); gr.addColorStop(0.55, 'rgba(0,0,10,0.45)'); gr.addColorStop(1, 'rgba(0,0,10,0)'); cx.fillStyle = gr; cx.fillRect(0, 0, 128, 128);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  sh.rotation.x = -Math.PI / 2; sh.position.set(0, 0.5, -34); G.add(sh);
  PC.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(['rgba(255,230,190,0.95)', 'rgba(255,130,60,0.35)', 'rgba(0,0,0,0)']), fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending })); PC.glow.visible = false; scene.add(PC.glow);
  PC.curve = new THREE.CatmullRomCurve3([[2, 21, 84], [0, 55, -30], [-30, 210, -170], [-90, 230, -230], [-70, 110, -120], [-20, 55, 40], [15, 38, 110]].map((p) => new THREE.Vector3(p[0], p[1], p[2])));
}

function plutoStart() {
  pcBuild(); clearInput();
  const tp = SP.target.position;
  PC.S0 = new THREE.Vector3(SF.x, SF.y, SF.z); PC.tp = tp.clone();
  const n = PC.S0.clone().sub(tp).normalize(); PC.Q = tp.clone().addScaledVector(n, SP.course.pr + 60); PC.D = PC.Q.clone().sub(PC.S0);
  PC.d = PC.D.clone().normalize(); PC.r = new THREE.Vector3().crossVectors(PC.d, new THREE.Vector3(0, 1, 0)); if (PC.r.lengthSq() < 1e-4) PC.r.set(1, 0, 0); PC.r.normalize(); PC.u = new THREE.Vector3().crossVectors(PC.r, PC.d).normalize();
  PC.B = tp.clone().add(new THREE.Vector3(3500, 500, 3000));
  Object.assign(PC, { on: true, t: 0, ph: 1, capI: -1, boltT: 0, boltK: 0, ex: 0, lastDir: new THREE.Vector3(0, 0, -1), moonSave: null });
  PC.camB = PC.P1(5.9).add(PC.r.clone().multiplyScalar(16)).addScaledVector(PC.u, 5);
  Object.assign(CS, { on: true, done: false, capI: -1 }); CS.t = 0;
  $('csCap').textContent = ''; $('csFade').style.opacity = 0; $('csFade').style.background = '#dfeaff'; $('csCredits').classList.remove('roll'); $('btnCsDone').classList.add('hidden'); $('btnCsSkip').classList.remove('hidden'); $('cutscene').classList.add('pluto');
  carRoot.visible = true; shadowHolder.visible = false;
  setState('cutscene'); Snd.engine(0, false, false); Snd.whoosh && Snd.whoosh();
  alienRoot.visible = true; alienBeamMat.opacity = 0; alienBeam.visible = false; alienRoot.scale.setScalar(2.2);
}
PC.P1 = function (t) {
  const u = t / PT1, e = 0.55 * u + 0.45 * u * u, w = 1 - 0.6 * Math.max(0, Math.min(1, u));
  return PC.S0.clone().addScaledVector(PC.D, e).addScaledVector(PC.r, Math.sin(t * 1.3) * 12 * w).addScaledVector(PC.u, Math.cos(t * 0.9) * 4);
};
function plCap(t) {
  let i = -1; for (let k = 0; k < PCAPS.length; k++) if (t >= PCAPS[k][0]) i = k;
  if (i === PC.capI) return; PC.capI = i; const el = $('csCap'), c = PCAPS[i]; if (!c) return;
  el.textContent = c[1]; el.className = c[2]; void el.offsetWidth; el.classList.add('pop');
}
function plBolt(from, to) {
  const a = boltGeo.attributes.position;
  for (let i = 0; i <= 10; i++) { const k = i / 10, j = i === 0 || i === 10 ? 0 : 0.9; a.setXYZ(i, from.x + (to.x - from.x) * k + (Math.random() - 0.5) * j, from.y + (to.y - from.y) * k + (Math.random() - 0.5) * j, from.z + (to.z - from.z) * k + (Math.random() - 0.5) * j); }
  a.needsUpdate = true; alienBolt.visible = true;
}
function plPose(p, dir, bank, thr, dt) {
  carRoot.position.copy(p); carRoot.scale.set(1, 1, 1);
  const f = _pcA.copy(dir).normalize(), up = _pcB.set(0, 1, 0), side = _pcV.crossVectors(f, up).normalize();
  up.addScaledVector(side, bank).normalize(); const z = new THREE.Vector3().crossVectors(f, up).normalize(); up.crossVectors(z, f).normalize();
  carRoot.quaternion.setFromRotationMatrix(_pcM.makeBasis(f, up, z)); carRoot.updateMatrixWorld(true); carW.copy(p);
  if (carMesh.hover.visible) carMesh.hover.position.y = -WCY * S + HOVER_Y + Math.sin(SP.t * 5) * 0.05;
  if (thr > 0.05) {
    const tail = TAIL[vehicleById(vehicleId).model] || -2.4, n = 2 + (thr > 0.6 ? 2 : 0);
    for (let i = 0; i < n; i++) {
      _pcV.set(tail, 0.05, (Math.random() - 0.5) * 0.8); carRoot.localToWorld(_pcV);
      flame.emit(_pcV.x, _pcV.y, _pcV.z, -dir.x * 6 + (Math.random() - 0.5), -dir.y * 6 + (Math.random() - 0.5), -dir.z * 6 + (Math.random() - 0.5), 0.4, 1.1 * thr, 0.12, 0.9, Math.random() < 0.5 ? [1, 0.62, 0.22] : [0.45, 0.8, 1]);
    }
  }
}
function plUfoPose(p, dt, bob) {
  alienRoot.position.copy(p); alienSpin.rotation.y += dt * 2.4; alienRoot.rotation.set(Math.sin(PC.t * 1.3) * 0.06, 0, Math.sin(PC.t * 1.1) * 0.07); alienRoot.visible = AL.loaded;
  alienGlowMat.opacity = 0.55 + 0.1 * Math.sin(PC.t * 8);
}
function plShoot(dt, from, target, ground, every) {
  PC.boltK -= dt; if (PC.boltK <= 0) {
    PC.boltK = every + Math.random() * 0.2; PC.boltT = 0.2; PC.bt = target.clone(); Snd.zap && Snd.zap();
    if (ground) for (let i = 0; i < 14; i++) sparks.emit(target.x, target.y + 0.3, target.z, (Math.random() - 0.5) * 14, 4 + Math.random() * 10, (Math.random() - 0.5) * 14, 0.7);
  }
  if (PC.boltT > 0) { PC.boltT -= dt; plBolt(from, PC.bt); } else alienBolt.visible = false;
}
function plutoSwitch() {
  PC.ph = 2; PC.G.position.copy(PC.B); PC.G.visible = true; scene.fog = new THREE.Fog(0x4e5b88, 220, 2300);
  const mp = SP.planets[SP.planets.length - 1]; if (mp && mp.g) { PC.moon = mp.g; PC.moonSave = mp.g.position.clone(); mp.g.position.copy(PC.B).add(new THREE.Vector3(-260, 300, 700)); }
  PC.glow.visible = false; alienBolt.visible = false; PC.boltK = 0.4; PC.boltT = 0;
}
function plutoEnd() {
  if (PC.G) PC.G.visible = false; scene.fog = null; if (PC.moon && PC.moonSave) PC.moon.position.copy(PC.moonSave); PC.moon = null; PC.moonSave = null;
  PC.on = false; PC.glow && (PC.glow.visible = false); alienRoot.visible = false; alienBolt.visible = false; alienBeamMat.opacity = 0; alienBeam.visible = false; alienRoot.scale.setScalar(1);
  $('cutscene').classList.remove('pluto'); $('csFade').style.background = ''; $('csFade').style.opacity = 0; $('csCap').textContent = ''; Snd.alienHum(0); carRoot.visible = true;
  camera.up.set(0, 1, 0); camera.fov = 62; camera.updateProjectionMatrix();
}

function plPhase1(dt, t) {
  const H = PC.P1(t), H2 = PC.P1(t + 0.05), dir = H2.clone().sub(H).normalize(), d = PC.d, r = PC.r, u = PC.u;
  plPose(H, dir, Math.cos(t * 1.1) * 0.25, 1, dt);
  const U = PC.P1(t - 1.3).addScaledVector(u, 3.2 + Math.sin(t * 2) * 0.5).addScaledVector(r, Math.sin(t * 1.7) * 3).addScaledVector(d, -4);
  plUfoPose(U, dt); Snd.alienHum(0.1, 0.8);
  if (t > 1 && t < 7.4) plShoot(dt, U, H.clone().addScaledVector(d, 9).addScaledVector(r, (Math.random() - 0.5) * 9).addScaledVector(u, (Math.random() - 0.5) * 5), false, 0.5); else alienBolt.visible = false;
  let fov = 58;
  if (t < 4.6) { camera.position.copy(H).addScaledVector(d, -(24 - t * 1.5)).addScaledVector(r, -16 + t * 2.2).addScaledVector(u, 5 + t * 0.4); camera.lookAt(_pcV.copy(H).addScaledVector(d, 10)); fov = 58 + t; }
  else { camera.position.copy(PC.camB); camera.lookAt(_pcV.copy(H).addScaledVector(d, 3)); fov = 50 - pcSS(6, 8.2, t) * 12; }
  const k = 1 - Math.exp(-dt * 6); camera.fov += (fov - camera.fov) * k; camera.updateProjectionMatrix();
  const heat = pcSS(6.0, 8.0, t); PC.glow.visible = heat > 0.02; if (PC.glow.visible) { PC.glow.position.copy(H).addScaledVector(d, 2); PC.glow.scale.setScalar(6 + 26 * heat); PC.glow.material.opacity = 0.35 + 0.6 * heat; }
  if (t > 6.4) shake = Math.max(shake, 0.2 * heat);
  Snd.engine(Math.min(40, 20 + t * 2), true, true);
}

function plHover(tau, out) {
  let z; if (tau < 3.5) z = 620 - 112 * tau; else if (tau >= 9.5) z = -34; else { const T = 6, u = (tau - 3.5) / T, u2 = u * u, u3 = u2 * u; z = (2 * u3 - 3 * u2 + 1) * 228 + (u3 - 2 * u2 + u) * (-112 * T) + (-2 * u3 + 3 * u2) * -34; }
  const x = 10 * Math.sin(tau * 1.1) * (1 - pcSS(0, 8, tau)), y35 = 14 + 3 * Math.sin(3.5 * 1.3), s = pcSS(3.5, 9.6, tau);
  const y = tau < 3.5 ? 14 + 3 * Math.sin(tau * 1.3) : y35 * (1 - s) + 1.25 * s + Math.sin(tau * 3) * 0.3 * (1 - s);
  return out.set(x, y, z);
}
function plUfo(tau, out) {
  if (tau < 5) { plHover(tau, _pcV); const hx = _pcV.x; return out.set(hx * 0.9 + Math.sin(tau * 1.9) * 5, 22 + 3 * Math.sin(tau * 1.6), 644 - 112 * tau); }
  if (tau < 12.4) return PC.curve.getPoint((tau - 5) / 7.4, out);
  const s = tau - 12.4, bump = Math.sin(Math.max(0, Math.min(1, s / 4.6)) * Math.PI);
  if (tau < 17) return out.set(15 + 45 * Math.sin(s * 1.1), 38 + Math.sin(s * 1.6) * 3, 110 - 75 * bump);
  const s2 = tau - 17, e0x = 15 + 45 * Math.sin(4.6 * 1.1), e0y = 38 + Math.sin(4.6 * 1.6) * 3;
  return out.set(e0x + 12 * s2 * s2, e0y + 36 * s2 * s2, 110 + 60 * s2 * s2);
}
function plPhase2(dt, tau) {
  const H = plHover(tau, new THREE.Vector3()), H2 = plHover(tau + 0.05, new THREE.Vector3()), ved = H2.clone().sub(H);
  if (ved.lengthSq() > 1e-6) PC.lastDir.copy(ved).normalize(); const dir = PC.lastDir;
  const thr = tau < 9.5 ? 1 : Math.max(0, 1 - (tau - 9.5) / 0.9), B = PC.B;
  if (thr > 0.4 && tau > 7.5 && H.y < 5) dust.emit(B.x + H.x + (Math.random() - 0.5) * 3, B.y + 0.6, B.z + H.z + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 12, 1 + Math.random() * 2, (Math.random() - 0.5) * 12, 1.3);
  const wH = H.clone().add(B);
  plPose(wH, tau < 9.4 ? dir : new THREE.Vector3(0, -0.02, -1), Math.cos(tau * 1.1) * 0.22 * (1 - pcSS(5, 9.5, tau)), thr, dt);
  const U = plUfo(tau, new THREE.Vector3()), wU = U.clone().add(B), ufoOn = U.lengthSq() < 9e6;
  const sc = 2.2 + 0.7 * pcSS(8, 12, tau); alienRoot.scale.setScalar(sc);
  plUfoPose(wU, dt); alienRoot.visible = AL.loaded && ufoOn;
  const search = tau > 11.5 && tau < 17.2, bo = search ? 0.34 * (0.85 + 0.15 * Math.sin(tau * 9)) * pcSS(11.5, 12.6, tau) * (1 - pcSS(16.4, 17.2, tau)) : 0;
  alienBeamMat.opacity += (bo - alienBeamMat.opacity) * (1 - Math.exp(-dt * 6)); alienBeam.visible = alienBeamMat.opacity > 0.01;
  if (alienBeam.visible) { const hl = Math.max(1, (U.y - 0.5) / sc); alienBeam.scale.set(3.4, hl / 5, 3.4); alienBeam.position.y = -hl / 2; }
  Snd.alienHum(tau < 18 ? 0.1 : Math.max(0, 0.1 - (tau - 18) * 0.04), tau < 12 ? 0.8 : 0.5);
  if (tau > 0.8 && tau < 8.3 && U.z > H.z - 40 && U.z < 700) plShoot(dt, wU, new THREE.Vector3(B.x + H.x + (Math.random() - 0.5) * 12, B.y + 0.5, B.z + H.z - 8 - Math.random() * 10), true, 0.55); else alienBolt.visible = false;
  Snd.engine(Math.min(40, 30 * thr), thr > 0.1, thr > 0.02);
  // camera
  let px, py, pz, lx, ly, lz, fov = 58, sway = 0;
  if (tau < 3.6) { const k = tau / 3.6; px = H.x - 26 + k * 5; py = H.y + 6; pz = H.z + 12; lx = H.x; ly = H.y + 5; lz = H.z + 12; fov = 62; sway = 0.12; }
  else if (tau < 7.6) { px = -16; py = 3.5; pz = 70; lx = H.x; ly = H.y + 1; lz = H.z; const w = Math.max(0, 1 - (Math.hypot(px - U.x, py - U.y, pz - U.z) - 25) / 70) * 0.85; lx += (U.x - lx) * w; ly += (U.y - ly) * w; lz += (U.z - lz) * w; fov = 62 - pcSS(3.6, 5.5, tau) * 8; sway = 0.06; }
  else if (tau < 11) { px = 13; py = 2.6; pz = 8; lx = H.x; ly = H.y + 1.5; lz = H.z; fov = 52; }
  else if (tau < 19.5) {
    px = 4 + Math.sin(tau * 0.5) * 0.4; py = 1.9 + Math.sin(tau * 0.7) * 0.15; pz = -52; const w = pcSS(16.2, 18.4, tau);
    lx = 0 + (U.x - 0) * w; ly = 14 + (U.y - 14) * w; lz = 70 + (U.z - 70) * w; fov = 54 + pcSS(17, 19.5, tau) * 6; sway = 0.02;
  } else {
    const k = pcSS(0, 1, (tau - 19.5) / 6.3), kk = (tau - 19.5) / 6.3, ky = Math.sqrt(Math.max(0, Math.min(1, kk)));
    px = 4 * (1 - k); py = 1.9 + (170 - 1.9) * ky * (0.4 + 0.6 * k); pz = -52 + 572 * k * k; lx = 0; ly = 3 + 12 * k; lz = -34 + 80 * k; fov = 60 - 8 * k;
  }
  camera.position.set(B.x + px + (Math.random() - 0.5) * sway, B.y + py + (Math.random() - 0.5) * sway, B.z + pz); camera.lookAt(B.x + lx, B.y + ly, B.z + lz);
  camera.fov += (fov - camera.fov) * (1 - Math.exp(-dt * 5)); camera.updateProjectionMatrix();
}

function plutoUpdate(dt) {
  PC.t += dt; const t = PC.t; CS.t = t; plCap(t);
  if (PC.ph === 1 && t >= PH2) plutoSwitch();
  if (PC.ph === 1) plPhase1(dt, t); else plPhase2(dt, t - PH2);
  const f = $('csFade'), white = t < PH2 + 1.4; let o;
  if (white) o = t < PH2 ? pcSS(7.0, PH2, t) : 1 - pcSS(PH2, PH2 + 1.4, t); else o = pcSS(32.4, 33.9, t);
  f.style.background = white ? '#dfeaff' : '#000'; f.style.opacity = o.toFixed(3);
  SP.sky.position.copy(camera.position);
  if (t >= PEND) endCutscene();
}
