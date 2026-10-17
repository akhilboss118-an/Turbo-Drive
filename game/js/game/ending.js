/* eslint-disable */
'use strict';
/* v43 - Space Battle ending: VICTORY (explosion + slow-mo) -> CREDITS -> CINEMATIC (Earth) -> END -> Main Menu. All timing is wall-clock based. */
const EN_CREDITS_S = 16, EN_CIN_S = 16, EN_SKIP_CREDITS = 2, EN_SKIP_CIN = 1.5, EN_FADE_MS = 480, EN_R = 400, EN_ACC = 26;
const EN_E = new THREE.Vector3(60, -70, -1700), EN_TG = new THREE.Vector3(760, 40, -1280);
const EN = { active: false, phase: '', t0: 0, lock: false, exiting: false, timers: [], earth: null, slow: 1, sunS: null, sunPos: new THREE.Vector3(), p0: new THREE.Vector3(), c0: new THREE.Vector3(), dir: new THREE.Vector3() };
const _enA = new THREE.Vector3(), _enB = new THREE.Vector3(), _enC = new THREE.Vector3(), _enM = new THREE.Matrix4();
const enNow = () => performance.now() / 1000;
const enAge = () => enNow() - EN.t0;

/* ---------- DOM ---------- */
const enEl = document.createElement('div'); enEl.id = 'enOverlay'; enEl.setAttribute('data-testid', 'ending-overlay');
enEl.innerHTML = '<div id="enCredits" data-testid="ending-credits"><div id="enCol">'
  + '<div class="enMsg" data-testid="ending-message"><p>You successfully defeated the alien.</p><p class="gold">You saved Earth.</p></div>'
  + '<div class="enBlock enTitle"><small>A LITTLE HEARTS PRODUCTION</small><h1>TURBO DRIVE</h1><h3>SPACE BATTLE</h3></div>'
  + '<div class="enBlock"><small>PILOT</small><b>YOU</b></div><div class="enBlock"><small>VEHICLE</small><b>YOUR HOVER</b></div>'
  + '<div class="enBlock"><small>VILLAIN</small><b>THE ALIEN UFO</b></div><div class="enBlock"><small>ENGINE</small><b>THREE.JS</b></div>'
  + '<div class="enBlock"><b>THE END</b></div></div></div>'
  + '<div id="enCap" data-testid="cinematic-caption">Home.</div>'
  + '<div id="enEnd" data-testid="end-screen"><small>TURBO DRIVE &middot; SPACE BATTLE</small><h1 data-testid="end-title">Thank you for playing</h1><p>Earth is safe, pilot.</p>'
  + '<button class="btn primary" id="enMenuBtn" data-testid="end-main-menu-btn" aria-label="Main Menu">Main Menu</button></div>'
  + '<button class="btn" id="enSkip" data-testid="ending-skip-btn" aria-label="Skip">Skip</button>'
  + '<div id="enFade" data-testid="ending-fade"></div>';
document.body.appendChild(enEl);
const enFade = $('enFade'), enSkipBtn = $('enSkip'), enMenuBtn = $('enMenuBtn');

/* ---------- state machine ---------- */
function enLater(fn, ms) { const id = setTimeout(() => { EN.timers = EN.timers.filter((x) => x !== id); fn(); }, ms); EN.timers.push(id); }
function enBegin() {
  if (EN.active) return false;
  EN.active = true; EN.phase = 'victory'; EN.t0 = enNow(); EN.lock = false; EN.exiting = false; EN.slow = 0.3;
  clearInput(); DF.mouse = DF.tfire = false; DF.tj.x = DF.tj.y = 0;
  try { showResults(); } catch (e) {}
  setState('victory');
  window.addEventListener('keydown', enKey);
  return true;
}
function enEnter(next) {
  EN.phase = next; EN.t0 = enNow(); setState(next);
  if (next === 'credits') { dfFlashEl.style.opacity = 0; }
  else if (next === 'cinematic') {
    enBuildEarth(); if (DF.root) DF.root.visible = false; if (DF.planet) DF.planet.visible = false;
    if (DF.sky && DF.sky.children[2]) { EN.sunS = DF.sky.children[2]; EN.sunPos.copy(EN.sunS.position); EN.sunS.position.set(-2300, 1300, -1800); }
    EN.p0.copy(carRoot.position); EN.c0.set(EN.p0.x, EN.p0.y + 3.6, EN.p0.z + 13.5); EN.dir.copy(EN_TG).sub(EN.p0).normalize();
  } else if (next === 'end') { try { enMenuBtn.focus({ preventScroll: true }); } catch (e) {} }
}
function enGo(next, minAge) {
  if (!EN.active || EN.lock || EN.exiting) return false;
  if (minAge && enAge() < minAge) return false;
  EN.lock = true; enFade.style.opacity = 1;
  enLater(() => { if (!EN.active) return; enEnter(next); enFade.style.opacity = 0; enLater(() => { EN.lock = false; }, EN_FADE_MS); }, EN_FADE_MS);
  return true;
}
function enSkip() {
  if (EN.phase === 'credits') enGo('cinematic', EN_SKIP_CREDITS);
  else if (EN.phase === 'cinematic') enGo('end', EN_SKIP_CIN);
}
function enKey(e) {
  if (e.repeat || (e.code !== 'Escape' && e.code !== 'Enter')) return;
  if (EN.phase === 'credits' || EN.phase === 'cinematic') { e.preventDefault(); enSkip(); }
}
function enUpdate() {
  if (!EN.active) return; const a = enAge();
  if (EN.phase === 'credits') { enSkipBtn.disabled = a < EN_SKIP_CREDITS; if (a >= EN_CREDITS_S) enGo('cinematic'); }
  else if (EN.phase === 'cinematic') { enSkipBtn.disabled = a < EN_SKIP_CIN; if (a >= EN_CIN_S) enGo('end'); }
}
function enCleanup() {
  for (const id of EN.timers) clearTimeout(id); EN.timers = [];
  window.removeEventListener('keydown', enKey);
  if (EN.earth) { scene.remove(EN.earth.g); disposeGroup(EN.earth.g); EN.earth = null; }
  if (DF.root) DF.root.visible = true; if (DF.planet) DF.planet.visible = true;
  if (EN.sunS) { EN.sunS.position.copy(EN.sunPos); EN.sunS = null; }
  enFade.style.transition = 'none'; enFade.style.opacity = 0; void enFade.offsetWidth; enFade.style.transition = '';
  enSkipBtn.disabled = true; dfFlashEl.style.opacity = 0;
  EN.active = false; EN.phase = ''; EN.lock = false; EN.slow = 1;
  if (carRoot) carRoot.visible = true;
}
function enMainMenu() {
  if (!EN.active || EN.phase !== 'end' || EN.exiting) return; EN.exiting = true;
  enCleanup(); score = 0; timeT = 0; crashes = 0; finishT = 0; toMenu();
}
enSkipBtn.disabled = true;
enSkipBtn.addEventListener('click', enSkip);
enMenuBtn.addEventListener('click', enMainMenu);

/* ---------- procedural Earth ---------- */
function enHash(x, y, z) { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1274126177) | 0; h = Math.imul(h ^ (h >>> 13), 1103515245); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function enNoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a, b, t) => a + (b - a) * t;
  return l(l(l(enHash(xi, yi, zi), enHash(xi + 1, yi, zi), u), l(enHash(xi, yi + 1, zi), enHash(xi + 1, yi + 1, zi), u), v), l(l(enHash(xi, yi, zi + 1), enHash(xi + 1, yi, zi + 1), u), l(enHash(xi, yi + 1, zi + 1), enHash(xi + 1, yi + 1, zi + 1), u), v), w);
}
function enFbm(x, y, z, o) { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < o; i++) { s += a * enNoise(x * f, y * f, z * f); n += a; a *= 0.5; f *= 2.03; } return s / n; }
const enMix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const enSm = (a, b, x) => { x = Math.max(0, Math.min(1, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
function enEarthTextures() {
  const W = 640, H = 320, c = document.createElement('canvas'), k = document.createElement('canvas'); c.width = k.width = W; c.height = k.height = H;
  const g = c.getContext('2d'), gk = k.getContext('2d'), im = g.createImageData(W, H), ik = gk.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    const lat = (0.5 - (y + 0.5) / H) * Math.PI, cl = Math.cos(lat), sl = Math.sin(lat);
    for (let x = 0; x < W; x++) {
      const lon = (x + 0.5) / W * Math.PI * 2, px = cl * Math.cos(lon), pz = cl * Math.sin(lon), i = (y * W + x) * 4;
      const n = enFbm(px * 2.3 + 5, sl * 2.3, pz * 2.3, 5), m = enFbm(px * 3.1 + 40, sl * 3.1 + 7, pz * 3.1, 4);
      let col;
      if (n > 0.52) {
        const el = Math.min(1, (n - 0.52) / 0.2), dry = enSm(0.46, 0.62, m) * (1 - enSm(0.9, 1.25, Math.abs(lat)));
        col = enMix(enMix([46, 118, 58], [70, 140, 64], m), [190, 160, 96], dry); col = enMix(col, [112, 106, 92], enSm(0.55, 1, el) * 0.7);
        col = enMix(col, [238, 244, 250], enSm(1.1, 1.35, Math.abs(lat) + (n - 0.5) * 0.4));
      } else {
        col = enMix([5, 30, 84], [22, 100, 180], enSm(0.28, 0.52, n)); col = enMix(col, [225, 236, 248], enSm(1.3, 1.45, Math.abs(lat)));
      }
      im.data[i] = col[0]; im.data[i + 1] = col[1]; im.data[i + 2] = col[2]; im.data[i + 3] = 255;
      const cn = enFbm(px * 2.6 + 90, sl * 3.6, pz * 2.6 + 30, 5), a = enSm(0.5, 0.74, cn) * 0.9;
      ik.data[i] = ik.data[i + 1] = ik.data[i + 2] = 255; ik.data[i + 3] = a * 255;
    }
  }
  g.putImageData(im, 0, 0); gk.putImageData(ik, 0, 0);
  const t1 = new THREE.CanvasTexture(c), t2 = new THREE.CanvasTexture(k); return [t1, t2];
}
function enBuildEarth() {
  if (EN.earth) return;
  const [dayT, cloudT] = enEarthTextures(), g = new THREE.Group();
  const earth = new THREE.Mesh(new THREE.SphereGeometry(EN_R, 64, 48), new THREE.MeshLambertMaterial({ map: dayT, emissive: 0x040a1c }));
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(EN_R * 1.012, 56, 40), new THREE.MeshLambertMaterial({ map: cloudT, transparent: true, depthWrite: false }));
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(EN_R * 1.14, 56, 40), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'varying vec3 vN; varying vec3 vV; void main(){ float d = clamp(-dot(vN, vV) * 2.4, 0.0, 1.0); float i = d * d; gl_FragColor = vec4(vec3(0.28, 0.58, 1.0) * i * 1.5, i); }'
  }));
  g.add(earth, clouds, atmo); g.position.copy(EN_E); scene.add(g); EN.earth = { g, earth, clouds };
}

/* ---------- cinematic ---------- */
function enShip(a) {
  const s = 0.5 * EN_ACC * a * a; carRoot.position.copy(EN.p0).addScaledVector(EN.dir, s); carW.copy(carRoot.position); carRoot.scale.set(1, 1, 1);
  _enA.crossVectors(EN.dir, _dUp).normalize(); _enB.crossVectors(_enA, EN.dir).normalize(); _enM.makeBasis(EN.dir, _enB, _enA); carRoot.quaternion.setFromRotationMatrix(_enM);
  if (carMesh.hover.visible) carMesh.hover.position.y = -WCY * S + HOVER_Y; if (carMesh.hover2.visible) carMesh.hover2.position.y = 0;
}
function enScene(dt) {
  if (!EN.earth) return; const cin = EN.phase === 'cinematic';
  EN.earth.earth.rotation.y += dt * 0.012; EN.earth.clouds.rotation.y += dt * 0.02;
  if (cin) { carRoot.visible = true; enShip(enAge()); dfExhaust(); dfExhaust(); } else carRoot.visible = false;
}
function enCamera(dt) {
  const cin = EN.phase === 'cinematic', a = cin ? enAge() : EN_CIN_S;
  const w1 = dfSS((a - 4) / 7.5), wl = dfSS((a - 3.5) / 6.5), dolly = dfSS((a - 11.5) / 4.5) * -140;
  _enA.set(EN_E.x - 200, EN_E.y + 140, EN_E.z + 1250 + dolly);
  _enB.copy(EN.c0).lerp(_enA, w1); _enB.x += Math.sin(w1 * Math.PI) * -70;
  if (cin) { _enC.set(EN_E.x, EN_E.y + 30, EN_E.z); _enC.lerpVectors(carRoot.position, _enC, wl); }
  else { _enB.x += Math.sin(enNow() * 0.2) * 14; _enB.y += Math.sin(enNow() * 0.13) * 6; _enC.set(EN_E.x - EN_R * 0.9, EN_E.y + 30, EN_E.z); }
  if (Math.abs(camera.fov - 55) > 0.05) { camera.fov += (55 - camera.fov) * 0.1; camera.updateProjectionMatrix(); }
  camera.up.set(0, 1, 0); camera.position.copy(_enB); camera.lookAt(_enC);
}
