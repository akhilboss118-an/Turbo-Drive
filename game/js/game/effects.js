/* eslint-disable */
'use strict';
/* Coins, nitro, smoke, flames and screen effects */
/* ================= coins, nitro & juice ================= */
const LV_MULT = [0, 1, 1.5, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 12, 13, 14, 15, 16, 17], STAR_COINS = [0, 20, 50, 100];
let run = { stars: 0, style: 0, flips: 0, flipPts: 0 }, combo = 0, liveFlips = 0, fuel = 1, boostAmt = 0, wasBoost = false, squash = 0, kick = 0;
/* Haptics: native app (WebView) -> expo-haptics via postMessage; browsers -> navigator.vibrate */
const VIBE_PAT = { light: 15, medium: 35, heavy: [70, 40, 110], nitro: [25, 20, 45] };
const vibe = (ms, kind) => {
  try {
    if (!settings.shake) return;
    const k = kind || (ms >= 60 ? 'heavy' : ms >= 30 ? 'medium' : 'light');
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ haptic: k }));
    else if (navigator.vibrate) navigator.vibrate(VIBE_PAT[k] || ms);
  } catch (e) {}
};
function refreshCoins() {
  const h = svg('coin', 'coin') + '<span>' + coins + '</span>';
  $('coinTotal').innerHTML = h; $('garCoins').innerHTML = h; $('hudCoins').innerHTML = svg('coin', 'coin') + coins;
}
function pop(html, cls, ms) { const el = document.createElement('div'); el.className = 'pp ' + cls; el.innerHTML = html; $('pops').appendChild(el); setTimeout(() => el.remove(), ms || 1000); }
function addCoins(n, why) {
  n = Math.round(n); if (n <= 0) return; coins += n; run[why] += n; save(); refreshCoins();
  pop(svg('coin', 'coin') + '+' + n, 'cn', 1000); Snd.coin(combo);
}
function setCombo(n) { const el = $('combo'); combo = n; if (n < 2) { el.classList.add('hidden'); return; } el.textContent = 'COMBO \u00D7' + n; el.classList.remove('hidden', 'pop'); void el.offsetWidth; el.classList.add('pop'); }
// soft billboard particles with per-particle size / alpha / color (smoke, flame, dust)
function makePuffs(max, additive) {
  const g = new THREE.BufferGeometry(), P = new Float32Array(max * 3), Sz = new Float32Array(max), A = new Float32Array(max), C = new Float32Array(max * 3);
  for (let i = 0; i < max; i++) P[i * 3 + 1] = -9999;
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('psize', new THREE.BufferAttribute(Sz, 1)); g.setAttribute('palpha', new THREE.BufferAttribute(A, 1)); g.setAttribute('pcol', new THREE.BufferAttribute(C, 3));
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, uniforms: { k: { value: 500 } },
    vertexShader: 'attribute float psize;attribute float palpha;attribute vec3 pcol;varying float a;varying vec3 c;uniform float k;void main(){a=palpha;c=pcol;vec4 m=modelViewMatrix*vec4(position,1.);gl_PointSize=psize*k/-m.z;gl_Position=projectionMatrix*m;}',
    fragmentShader: 'varying float a;varying vec3 c;void main(){float d=length(gl_PointCoord-.5)*2.;gl_FragColor=vec4(c,a*smoothstep(1.,.15,d));}' });
  const pts = new THREE.Points(g, mat); pts.frustumCulled = false; scene.add(pts);
  const V = new Float32Array(max * 3), L = new Float32Array(max), ML = new Float32Array(max), S0 = new Float32Array(max), S1 = new Float32Array(max), A0 = new Float32Array(max); let head = 0;
  return {
    mat,
    emit(x, y, z, vx, vy, vz, life, s0, s1, a0, col) { const i = head; head = (head + 1) % max; P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = z; V[i * 3] = vx; V[i * 3 + 1] = vy; V[i * 3 + 2] = vz; L[i] = ML[i] = life; S0[i] = s0; S1[i] = s1; A0[i] = a0; C[i * 3] = col[0]; C[i * 3 + 1] = col[1]; C[i * 3 + 2] = col[2]; },
    update(dt) {
      for (let i = 0; i < max; i++) {
        if (L[i] <= 0) continue; L[i] -= dt;
        if (L[i] <= 0) { P[i * 3 + 1] = -9999; A[i] = 0; continue; }
        const f = 1 - L[i] / ML[i]; P[i * 3] += V[i * 3] * dt; P[i * 3 + 1] += V[i * 3 + 1] * dt; P[i * 3 + 2] += V[i * 3 + 2] * dt;
        V[i * 3] *= 1 - dt * 1.6; V[i * 3 + 1] *= 1 - dt * 1.2; Sz[i] = S0[i] + (S1[i] - S0[i]) * f; A[i] = A0[i] * (1 - f) * (1 - f);
      }
      for (const n of ['position', 'psize', 'palpha', 'pcol']) g.attributes[n].needsUpdate = true;
      mat.uniforms.k.value = renderer.domElement.height / (2 * Math.tan(camera.fov * Math.PI / 360));
    },
  };
}
const smoke = makePuffs(160, false), flame = makePuffs(520, true);
wrapEmit(smoke); wrapEmit(flame);
// expanding ground rings for landings
const rings = [], ringGeo = new THREE.RingGeometry(0.85, 1, 40);
for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x35e6ff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m); rings.push({ m, t: 9 }); }
let ringI = 0;
const _qFlat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
function ring(x, y, hexc, size) { const r = rings[ringI++ % rings.length]; if (track.path) { toWorld(x, y + 0.08, 0, r.m.position, y); frameQuat(x, r.m.quaternion).multiply(_qFlat); } else { r.m.position.set(x, y + 0.08, 0); r.m.rotation.set(-Math.PI / 2, 0, 0); } r.m.material.color.setHex(hexc); r.t = 0; r.size = size; r.m.visible = true; }
const TAIL = { car: -2.3, van: -1.85, jeep: -2.0, car5: -1.95, hover: -2.4 };
function landFx(e) {
  const gh = ground(car.x) || 0, hard = e.quality === 'HARD LANDING', big = Math.min(1, e.impact / 16);
  ring(car.x, gh, hard ? 0xff8a3d : e.quality === 'PERFECT LANDING' ? 0xffe066 : 0x35e6ff, 2.5 + big * 4);
  const n = 8 + Math.round(big * 14);
  for (let i = 0; i < n; i++) { const d = i % 2 ? 1 : -1, sp = 3 + Math.random() * 7 * (0.5 + big); smoke.emit(car.x + d * 0.8, gh + 0.15, (Math.random() - 0.5) * 2.4, d * sp + car.vx * 0.3, 0.6 + Math.random() * 1.4, (Math.random() - 0.5) * 3, 0.7 + Math.random() * 0.5, 0.8, 2.4 + big * 1.6, 0.5, [0.86, 0.84, 0.92]); }
  if (e.quality === 'PERFECT LANDING') for (let i = 0; i < 18; i++) sparks.emit(car.x, car.y + 0.2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 12, 4 + Math.random() * 8, (Math.random() - 0.5) * 4, 0.8);
  if (typeof cosLand === 'function') cosLand(big);
  squash = Math.max(squash, 0.35 + big * 0.65); kick = Math.max(kick, 0.12 + big * 0.5); vibe(hard ? 40 : 15, hard ? 'medium' : 'light');
}
const sl = []; for (let i = 0; i < 60; i++) sl.push({ x: Math.random(), y: Math.random(), l: 0.08 + Math.random() * 0.22, s: 1.2 + Math.random() * 1.8 });
const slc = $('speedfx'), slg = slc.getContext('2d'), vig = $('vig');
function fxUpdate(dt) {
  const live = state === 'playing' || state === 'finishing', mfx = settings.shake ? 1 : 0;
  // nitro fuel + button
  const wantN = live && state === 'playing' && input.nitro && fuel > 0.02;
  if (wantN) fuel = Math.max(0, fuel - 0.42 * dt / car.p.nitroCap); else if (state === 'playing') fuel = Math.min(1, fuel + 0.05 * dt * (car.grounded ? 1 : 0.5));
  input.nitro = wantN;
  if (wantN && !wasBoost) { shake = Math.max(shake, 0.4); Snd.nitro(); vibe(25, 'nitro'); }
  wasBoost = wantN; boostAmt += ((wantN ? 1 : 0) - boostAmt) * (1 - Math.exp(-dt * 7));
  if (boostAmt > 0.3) shake = Math.max(shake, 0.1 * boostAmt);
  const nb = $('nitro'); nb.style.setProperty('--f', fuel.toFixed(3)); nb.classList.toggle('empty', fuel < 0.05);
  // live flip counter
  if (state === 'playing' && !car.grounded) { const f = Math.floor(Math.abs(car.spin) / (Math.PI * 2) + 0.15); if (f > liveFlips) { liveFlips = f; pop('FLIP ' + f + '!', 'flip', 900); Snd.flip(f); } } else liveFlips = 0;
  // smoke from the rear tyres: burnout on launch, skid on brake; flame while boosting
  const sp = car.speed();
  if (live && car.grounded) {
    const burn = (input.gas && sp < 9) || (input.brake && car.vx > 8);
    if (burn && input.brake) Snd.screech();
    if (burn && Math.random() < dt * 70) { const p = car.local(-1.28, -0.3), z = Math.random() < 0.5 ? -0.7 : 0.7; smoke.emit(p[0], p[1], z, -car.vx * 0.2 - 1, 0.8 + Math.random(), (Math.random() - 0.5) * 1.5, 0.9, 0.7, 2.6, 0.5, [0.9, 0.9, 0.95]); }
  }
  if (wantN) for (let i = 0; i < 2; i++) { const p = car.local(TAIL[vehicleById(vehicleId).model] || -2.2, 0.15), c = Math.random() < 0.5 ? [1, 0.62, 0.2] : [0.45, 0.9, 1]; flame.emit(p[0], p[1], (Math.random() - 0.5) * 0.6, car.vx - Math.cos(car.th) * 16, car.vy - Math.sin(car.th) * 16 + (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 1.5, 0.3, 0.9, 0.15, 0.9, c); }
  smoke.update(dt); flame.update(dt);
  for (const r of rings) if (r.t < 1) { r.t += dt * 2.2; const s = r.size * (0.2 + r.t); r.m.scale.set(s, s, s); r.m.material.opacity = Math.max(0, 0.9 * (1 - r.t)); if (r.t >= 1) r.m.visible = false; }
  squash *= Math.exp(-dt * 7); kick *= Math.exp(-dt * 8);
  // speed lines (horizontal streaks flowing past, side-scroller style) + edge glow
  const I = mfx * Math.max(boostAmt, live ? Math.max(0, (sp - 25) / 20) * 0.35 : 0), w = slc.width, h = slc.height;
  slg.clearRect(0, 0, w, h); vig.style.opacity = (mfx * boostAmt).toFixed(2);
  if (I > 0.03) {
    slg.lineCap = 'round'; const n = Math.round(sl.length * (settings.quality === 'low' ? 0.5 : 1) * Math.min(1, I + 0.2));
    for (let i = 0; i < n; i++) {
      const q = sl[i]; q.x -= q.s * dt * (0.6 + I * 1.6); if (q.x < -q.l) { q.x = 1.05; q.y = Math.random(); }
      if (Math.abs(q.y - 0.55) < 0.14) continue;
      slg.strokeStyle = 'rgba(' + (boostAmt > 0.2 ? '170,245,255' : '255,255,255') + ',' + (0.18 + 0.5 * I).toFixed(2) + ')'; slg.lineWidth = 1 + I * 2.2;
      slg.beginPath(); slg.moveTo(q.x * w, q.y * h); slg.lineTo((q.x + q.l * (0.6 + I)) * w, q.y * h); slg.stroke();
    }
  }
}
const fitFx = () => { slc.width = window.innerWidth; slc.height = window.innerHeight; };
window.addEventListener('resize', fitFx); fitFx();
