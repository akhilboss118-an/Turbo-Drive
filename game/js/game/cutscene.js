/* eslint-disable */
'use strict';
/* Cinematic after level 20: the hover blasts off the collapsing Moon, warps into deep space and drops into level 21. Credits mode (after level 22) just rolls the credits over the planet. Pure three.js, no video. */
const CS = { t: 0, on: false, built: false, flames: [], chunks: [], hx: 0, hy: 0, speed: 0, pitch: 0, head: 1.5, camP: new THREE.Vector3(), camL: new THREE.Vector3(), done: false, capI: -1, ground: 0 };
const CS_CAPS = [
  [0.2, 'MOON CORE UNSTABLE', 'warn'], [1.7, 'HOVER LAUNCH SEQUENCE', ''], [2.9, '3', 'big'], [3.5, '2', 'big'], [4.1, '1', 'big'],
  [4.8, 'IGNITION', 'go'], [9, 'LEAVING THE MOON', ''], [14, 'ESCAPE VELOCITY REACHED', 'go'], [19, 'THE MOON IS GONE', 'warn'], [22.4, 'ENTERING DEEP SPACE', 'go'], [26.4, '', ''],
];
const CS_SPACE_AT = 27.4, CS_CREDITS_DONE = 12.5;
const csSmooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));

function csBuild() {
  if (CS.built) return; CS.built = true;
  const mk = (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const cg = new THREE.ConeGeometry(0.42, 1, 14, 1, true); cg.translate(0, 0.5, 0);
  for (const z of [-0.62, 0.62]) for (const k of [[0xff8a2a, 1], [0xbff8ff, 0.55]]) {
    const m = new THREE.Mesh(cg, mk(k[0])); m.rotation.z = Math.PI / 2; m.position.set(-2.3, 0.45, z); m.userData.r = k[1]; m.visible = false; carRoot.add(m); CS.flames.push(m);
  }
  const rg = new THREE.DodecahedronGeometry(1, 0), n = 110;
  CS.rocks = new THREE.InstancedMesh(rg, new THREE.MeshLambertMaterial({ color: 0x8d909c, emissive: 0x4a1608, emissiveIntensity: 0.6 }), n); CS.rocks.frustumCulled = false; CS.rocks.visible = false; scene.add(CS.rocks);
  for (let i = 0; i < n; i++) CS.chunks.push({ p: new THREE.Vector3(), v: new THREE.Vector3(), s: 1, rx: 0, ry: 0, wx: 0, wy: 0 });
  CS.m = new THREE.Matrix4(); CS.q = new THREE.Quaternion(); CS.e = new THREE.Euler(); CS.sc = new THREE.Vector3();
  const N = 150, pos = new Float32Array(N * 6), g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  CS.sd = []; for (let i = 0; i < N; i++) CS.sd.push({ a: Math.random() * 6.283, r: 4 + Math.random() * 34, o: Math.random() * 120 });
  CS.streaks = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); CS.streaks.frustumCulled = false; CS.streaks.visible = false; scene.add(CS.streaks);
  CS.earth = new THREE.Mesh(new THREE.SphereGeometry(70, 32, 24), new THREE.MeshBasicMaterial({ map: earthTexture(), fog: false })); CS.earth.visible = false; scene.add(CS.earth);
  CS.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(['rgba(120,190,255,0.7)', 'rgba(60,120,255,0.25)', 'rgba(0,0,0,0)']), fog: false, depthWrite: false, transparent: true, blending: THREE.AdditiveBlending })); CS.halo.visible = false; scene.add(CS.halo);
}

function csBurst() {
  for (const c of CS.chunks) {
    c.p.set(CS.hx + (Math.random() - 0.5) * 46, CS.ground + 0.3, (Math.random() - 0.5) * 30);
    c.v.set((Math.random() - 0.5) * 12, 6 + Math.random() * 34, (Math.random() - 0.5) * 14); c.s = 0.4 + Math.random() * Math.random() * 3.2;
    c.rx = Math.random() * 6; c.ry = Math.random() * 6; c.wx = (Math.random() - 0.5) * 3; c.wy = (Math.random() - 0.5) * 3;
  }
  CS.burst = true; CS.rocks.visible = true;
}

function startCutscene(mode) {
  CS.mode = mode || 'launch'; csBuild(); clearInput();
  if (CS.mode === 'credits') {
    CS.t = 0; CS.on = true; CS.done = false; CS.capI = -1; $('csCap').textContent = ''; $('csFade').style.opacity = 0; $('csCredits').classList.remove('roll'); $('btnCsDone').classList.add('hidden'); $('btnCsSkip').classList.remove('hidden');
    setState('cutscene'); Snd.engine(0, false, false); return;
  }
  CS.t = 0; CS.on = true; CS.done = false; CS.capI = -1; CS.burst = false; CS.speed = 0; CS.pitch = 0; CS.head = 1.5; CS.lit = false; CS.flash = false;
  CS.hx = car.x; CS.ground = ground(car.x) || 0; CS.hy = CS.ground; CS.hz = 0;
  CS.camP.set(CS.hx + 8, CS.hy + 1.8, 9); CS.camL.set(CS.hx, CS.hy + 0.8, 0);
  $('csCap').textContent = ''; $('csFade').style.opacity = 0; $('csCredits').classList.remove('roll'); $('btnCsDone').classList.add('hidden'); $('btnCsSkip').classList.remove('hidden');
  for (const f of CS.flames) f.visible = true;
  CS.rocks.visible = false; CS.streaks.visible = true; CS.streaks.material.opacity = 0; CS.earth.visible = false; CS.halo.visible = false;
  setState('cutscene'); Snd.engine(0, false, false); Snd.init && Snd.init(); Snd.whoosh && Snd.whoosh();
}

function endCutscene() {
  if (!CS.on) return; CS.on = false;
  for (const f of CS.flames) f.visible = false;
  CS.rocks.visible = false; CS.streaks.visible = false; CS.earth.visible = false; CS.halo.visible = false;
  levelGroup.position.set(0, 0, 0); carRoot.rotation.set(0, 0, 0);
  if (CS.mode === 'launch') { enterSpace(); return; }
  car.spawn(CPS[0].x, 0); settle(300); snapCamera(); camera.fov = 62; camera.updateProjectionMatrix();
  setState('results'); Snd.engine(0, false, false); Snd.win && Snd.win();
}

function enterSpace() {
  const f = $('spaceFade'); f.style.transition = 'none'; f.style.opacity = 1;
  unlocked = Math.max(unlocked, 21); if (vehicleById(vehicleId).rarity !== 'legendary') { vehicleId = owned.indexOf('hover2') >= 0 ? 'hover2' : 'hover'; applyStats(vehicleId); applyVehicle(vehicleId); } loadLevel(21); save(); startRun();
  setTimeout(() => { f.style.transition = 'opacity 1.8s ease'; f.style.opacity = 0; }, 80);
}
function csCaption(t) {
  let i = -1; for (let k = 0; k < CS_CAPS.length; k++) if (t >= CS_CAPS[k][0]) i = k;
  if (i === CS.capI) return; CS.capI = i; const el = $('csCap'), c = CS_CAPS[i]; if (!c) return;
  el.textContent = c[1]; el.className = c[2]; void el.offsetWidth; el.classList.add('pop');
}

function updateCutscene(dt) {
  if (!CS.on) return;
  if (CS.mode === 'credits') { CS.t += dt; if (CS.t > 0.5 && !$('csCredits').classList.contains('roll')) $('csCredits').classList.add('roll'); if (CS.t >= CS_CREDITS_DONE && !CS.done) { CS.done = true; $('btnCsDone').classList.remove('hidden'); $('btnCsSkip').classList.add('hidden'); } return; }
  CS.t += dt; const t = CS.t, u = Math.max(0, t - 5.0), warp = csSmooth((t - 18) / 2.5);
  csCaption(t);
  // hover flight: straight up first, then a long arc toward the Earth
  const head = 1.5 - 0.62 * csSmooth(u / 11), accel = u > 0 ? 3 + 2.4 * u : 0;
  CS.speed = u > 0 ? 2 * u + 1.25 * u * u : 0; CS.head = head;
  const th = CS.pitch += ((u > 0 ? head * csSmooth(u / 2.6) : 0) - CS.pitch) * (1 - Math.exp(-dt * 6));
  if (u > 0) { CS.hx += Math.cos(head) * CS.speed * dt; CS.hy += Math.sin(head) * CS.speed * dt; }
  const idle = t < 5.0 ? Math.sin(t * 7) * 0.04 * Math.min(1, t / 3) : 0;
  carRoot.position.set(CS.hx, CS.hy + idle + (u > 0 ? 0.4 : 0), 0); carRoot.rotation.set(0, 0, th); carRoot.scale.set(1, 1, 1);
  shadowHolder.visible = u < 0.5; carW.copy(carRoot.position);
  // flames
  const thr = t < 4.8 ? 0 : Math.min(1, (t - 4.8) / 1.0), len = thr * (2.2 + Math.min(7, CS.speed * 0.025)) * (0.85 + 0.15 * Math.sin(t * 60));
  for (const f of CS.flames) { f.scale.set(f.userData.r * (0.6 + 0.5 * thr), Math.max(0.01, len * f.userData.r), f.userData.r * (0.6 + 0.5 * thr)); f.material.opacity = 0.35 + 0.6 * thr; }
  if (t > 4.8 && !CS.burst) { csBurst(); CS.flash = true; Snd.nitro && Snd.nitro(); Snd.whoosh && Snd.whoosh(); const fl = $('stormFlash'); if (fl) { fl.classList.remove('on'); void fl.offsetWidth; fl.classList.add('on'); } }
  // exhaust sparks and dust blown out under the hover
  if (thr > 0 && u < 6) for (let i = 0; i < 3; i++) { dust.emit(CS.hx - 1.5 + Math.random() * 3, CS.ground + 0.2, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 22, 1 + Math.random() * 3, (Math.random() - 0.5) * 22, 1.1); }
  // flying moon chunks (moon gravity)
  if (CS.burst) {
    for (let i = 0; i < CS.chunks.length; i++) { const c = CS.chunks[i]; c.v.y -= 3.4 * dt; c.p.addScaledVector(c.v, dt); c.rx += c.wx * dt; c.ry += c.wy * dt;
      CS.e.set(c.rx, c.ry, 0); CS.q.setFromEuler(CS.e); CS.sc.set(c.s, c.s * 0.7, c.s); CS.m.compose(c.p, CS.q, CS.sc); CS.rocks.setMatrixAt(i, CS.m); }
    CS.rocks.instanceMatrix.needsUpdate = true;
  }
  // the whole Moon crumbles away below once we are off the pad
  const fall = Math.max(0, t - 7.5); levelGroup.position.y = -(fall * fall) * 1.1;
  updateCollapse(dt);
  // camera
  const rumble = t < 5.2 ? 0.04 + 0.09 * Math.min(1, t / 4) : Math.max(0, 0.18 - u * 0.03);
  if (t < 4.8) {
    const a = t * 0.16; CS.camP.set(CS.hx + 5.5 + Math.sin(a) * 2.5, CS.hy + 1.5 + t * 0.08, 8.5 - t * 0.12); CS.camL.set(CS.hx, CS.hy + 0.8, 0);
  } else {
    const dx = Math.cos(head), dy = Math.sin(head), follow = 1 - csSmooth((t - 14) / 5), k = 1 - Math.exp(-dt * (0.2 + 2.2 * follow));
    const back = 11 + Math.min(14, u * 1.6), side = 8 + Math.min(14, u * 1.4), tx = CS.hx - dx * back, ty = CS.hy - dy * back + 1.5, tz = side;
    CS.camP.x += (tx - CS.camP.x) * k; CS.camP.y += (ty - CS.camP.y) * k; CS.camP.z += (tz - CS.camP.z) * k;
    const kl = 1 - Math.exp(-dt * 4); CS.camL.x += (CS.hx - CS.camL.x) * kl; CS.camL.y += (CS.hy - CS.camL.y) * kl;
  }
  camera.up.set(0, 1, 0); camera.fov += (58 + Math.min(18, CS.speed * 0.04) + warp * 24 - camera.fov) * 0.08; camera.updateProjectionMatrix();
  camera.position.set(CS.camP.x + (Math.random() - 0.5) * rumble, CS.camP.y + (Math.random() - 0.5) * rumble, CS.camP.z); camera.lookAt(CS.camL.x, CS.camL.y, 0);
  // speed streaks (only really visible once we are moving fast)
  const sv = Math.min(1, CS.speed / 140); CS.streaks.material.opacity = sv * 0.8;
  if (sv > 0.01) {
    const dx = Math.cos(head), dy = Math.sin(head), px = -dy, py = dx, arr = CS.streaks.geometry.attributes.position.array, span = 140, L = (3 + sv * 26) * (1 + 3.5 * warp);
    for (let i = 0; i < CS.sd.length; i++) {
      const s = CS.sd[i]; s.o -= CS.speed * dt * 0.9; const w = ((s.o % span) + span) % span - span / 2, ox = Math.cos(s.a) * s.r, oz = Math.sin(s.a) * s.r;
      const bx = CS.hx + dx * w + px * ox, by = CS.hy + dy * w + py * ox, bz = oz;
      arr[i * 6] = bx; arr[i * 6 + 1] = by; arr[i * 6 + 2] = bz; arr[i * 6 + 3] = bx - dx * L; arr[i * 6 + 4] = by - dy * L; arr[i * 6 + 5] = bz;
    }
    CS.streaks.geometry.attributes.position.needsUpdate = true;
  }
  // Earth grows ahead of us
  if (t > 12) {
    const k = csSmooth((t - 12) / 14); CS.earth.visible = CS.halo.visible = true;
    CS.earth.position.set(camera.position.x + 420, camera.position.y + 300 - k * 40, -420); CS.earth.scale.setScalar(0.5 + k * 1.1); CS.earth.rotation.y += dt * 0.05;
    CS.halo.position.copy(CS.earth.position); CS.halo.scale.setScalar(300 * (0.5 + k * 1.1));
  }
  // fade to black, credits, continue button
  $('csFade').style.opacity = Math.min(1, csSmooth((t - 20.5) / 2.5));
  if (t >= CS_SPACE_AT) endCutscene();
}

on('btnCsSkip', () => endCutscene());
on('btnCsDone', () => endCutscene());
on('btnEnding', () => { if (state === 'results') startCutscene('credits'); });
