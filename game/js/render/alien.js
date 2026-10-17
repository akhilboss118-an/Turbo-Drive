/* eslint-disable */
'use strict';
/* Alien saucer that chases the player in every level. Any crash / hit = "ALIEN CAUGHT YOU". */
const ALIEN_SIZE = 3.2;
const ALIEN_MAX_HITS = 5;
const alienRoot = new THREE.Group(); alienRoot.visible = false; scene.add(alienRoot);
const alienSpin = new THREE.Group(); alienRoot.add(alienSpin);
const alienBeamMat = new THREE.MeshBasicMaterial({ color: 0x7dff6a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
const alienBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 2.6, 5, 24, 1, true), alienBeamMat); alienBeam.position.y = -2.6; alienRoot.add(alienBeam);
const alienGlowMat = new THREE.MeshBasicMaterial({ color: 0x7dff6a, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
const alienGlow = new THREE.Mesh(new THREE.CircleGeometry(1.3, 24), alienGlowMat); alienGlow.rotation.x = -Math.PI / 2; alienGlow.position.y = -0.45; alienRoot.add(alienGlow);
const boltGeo = new THREE.BufferGeometry(); boltGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(11 * 3), 3));
const alienBolt = new THREE.Line(boltGeo, new THREE.LineBasicMaterial({ color: 0xb6ff9a, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })); alienBolt.frustumCulled = false; alienBolt.visible = false; scene.add(alienBolt);
const AL = { idleT: 0, atk: 0, attacking: false, zapT: 0, boltT: 0, rel: new THREE.Vector3(), tgt: new THREE.Vector3(), f: new THREE.Vector3(), side: new THREE.Vector3(), ready: false, t: 0, caught: 0, hits: 0, close: 0, warn: 0, active: false, loaded: false, hideT: 0, bannerT: 0, lastState: '' };
const alienEl = document.createElement('div'); alienEl.id = 'alienBanner'; alienEl.className = 'hidden'; alienEl.setAttribute('data-testid', 'alien-banner');
alienEl.innerHTML = '<div class="abMain" data-testid="alien-banner-main"></div><div class="abSub" data-testid="alien-banner-sub"></div>';
$('ui').appendChild(alienEl);
const radarEl = document.createElement('div'); radarEl.id = 'alienRadar'; radarEl.className = 'hidden'; radarEl.setAttribute('data-testid', 'alien-radar');
radarEl.innerHTML = '<span class="arLab">ALIEN</span><div class="arBar"><i data-testid="alien-radar-fill"></i></div><b data-testid="alien-radar-dist"></b>';
$('ui').appendChild(radarEl);
const arFill = radarEl.querySelector('i'), arDist = radarEl.querySelector('b');
function alienBanner(main, sub, cls, ms) {
  alienEl.querySelector('.abMain').textContent = main; alienEl.querySelector('.abSub').textContent = sub || '';
  alienEl.className = cls || ''; void alienEl.offsetWidth; alienEl.classList.add('pop'); AL.bannerT = ms;
}

function alienFallback() {
  const m = new THREE.MeshStandardMaterial({ color: 0xb8c4d0, metalness: 0.8, roughness: 0.3 });
  const disc = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), m); disc.scale.set(2.3, 0.45, 2.3);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.8, 20, 12, 0, 6.283, 0, 1.57), new THREE.MeshStandardMaterial({ color: 0x66ffaa, emissive: 0x22aa55, transparent: true, opacity: 0.8 })); dome.position.y = 0.25;
  const g = new THREE.Group(); g.add(disc, dome); return g;
}
(function loadAlien() {
  const done = (obj) => { alienSpin.add(obj); AL.loaded = true; };
  if (!THREE.GLTFLoader) { done(alienFallback()); return; }
  new THREE.GLTFLoader().load('game/assets/models/ufo.glb', (g) => {
    const root = g.scene, box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const holder = new THREE.Group(); root.position.sub(c); holder.add(root);
    holder.scale.setScalar(ALIEN_SIZE / Math.max(size.x, size.z, 0.0001));
    root.traverse((o) => { if (!o.isMesh) return; o.raycast = () => {}; for (const m of (Array.isArray(o.material) ? o.material : [o.material])) { m.fog = false; if (m.metalness !== undefined) m.metalness = Math.min(m.metalness, 0.25); if (m.emissive) { m.emissive.copy(m.color).multiplyScalar(0.7); if (m.map) m.emissiveMap = m.map; } } });
    done(holder);
  }, undefined, () => done(alienFallback()));
})();

const ALIEN_STATES = ['countdown', 'playing', 'paused', 'crashed', 'finishing'];
function alienGap() { const d = _alV2.copy(carW).sub(camera.position).dot(AL.f); return Math.max(3, Math.min(18, d - 9)); }
function alienHeight() { return LEVELS[level].space ? 2.4 : 2.6; }
const _alV2 = new THREE.Vector3();

window.addEventListener('td:state', (e) => {
  const s = e.detail, was = AL.lastState; AL.lastState = s;
  const ok = ALIEN_STATES.indexOf(s) >= 0 && !LEVELS[level].onfoot && !LEVELS[level].dogfight && !(typeof duelOn !== 'undefined' && duelOn) && !(s === 'finishing' && LEVELS[level].space);
  if (!ok) { radarEl.classList.add('hidden'); Snd.alienHum(0); AL.active = false; alienRoot.visible = false; AL.ready = false; alienEl.classList.add('hidden'); AL.bannerT = 0; return; }
  AL.active = true; radarEl.classList.remove('hidden');
  if (s === 'countdown' && was !== 'paused') { AL.ready = false; AL.caught = 0; AL.hits = 0; AL.close = 0; AL.warn = 0; AL.idleT = 0; AL.atk = 0; AL.attacking = false; alienBolt.visible = false; alienBanner('ALIEN SHIP IS CHASING YOU', "Don't hit anything!", 'warn', 2600); }
  if (s === 'crashed' && was !== 'crashed') {
    AL.caught = 1; AL.t = 0; Snd.zap();
    $('crashMenu').querySelector('h2').textContent = 'ALIEN CAUGHT YOU!';
    $('crashReason').textContent = 'You ' + $('crashReason').textContent.toLowerCase() + '. The alien got you.';
  }
  if (s === 'playing' && was === 'crashed') { AL.idleT = 0; AL.atk = 0; AL.attacking = false; AL.caught = 0; AL.hits = 0; alienEl.classList.add('hidden'); AL.bannerT = 0; }
});

function alienUpdate(dt) {
  if (!AL.active || LEVELS[level].onfoot || LEVELS[level].dogfight) return;
  if (state === 'paused') { Snd.alienHum(0); return; }
  AL.t += dt;
  const prog = LEVELS[level].space ? (SP.course ? SF.s / SP.course.len : 0) : duelProgress(car.x, lap);
  const cl = Math.max(0, Math.min(1, prog * 0.75 + crashes * 0.1)); AL.close += (cl - AL.close) * (1 - Math.exp(-dt * 0.8));
  if (state === 'playing') {
    if (AL.warn < 1 && AL.close > 0.35) { AL.warn = 1; alienBanner('THE ALIEN IS GAINING!', null, 'warn', 1800); }
    else if (AL.warn < 2 && AL.close > 0.7) { AL.warn = 2; alienBanner('IT IS RIGHT BEHIND YOU!', null, 'warn', 1800); }
  }
  if (AL.bannerT > 0 && AL.bannerT < 90) { AL.bannerT -= dt * 1000; if (AL.bannerT <= 0) alienEl.classList.add('hidden'); }
  AL.f.set(1, 0, 0).applyQuaternion(carRoot.quaternion); AL.f.y = 0;
  if (AL.f.lengthSq() < 0.05) AL.f.set(1, 0, 0); AL.f.normalize();
  AL.side.set(-AL.f.z, 0, AL.f.x);
  const caught = state === 'crashed';
  const idleNow = state === 'playing' && (LEVELS[level].space ? !!input.brake : car.speed() < 2.5);
  if (idleNow) AL.idleT += dt; else AL.idleT = Math.max(0, AL.idleT - dt * 4);
  const atkOn = state === 'playing' && AL.idleT > 1.2;
  AL.atk += ((atkOn ? 1 : 0) - AL.atk) * (1 - Math.exp(-dt * (atkOn ? 1.6 : 0.9)));
  if (atkOn && !AL.attacking) { AL.attacking = true; AL.zapT = 0.6; alienBanner('ALIEN ATTACKING!', 'Move! Hit the gas!', 'warn', 99); }
  else if (!atkOn && AL.attacking) { AL.attacking = false; alienEl.classList.add('hidden'); AL.bannerT = 0; }
  if (AL.attacking && AL.atk > 0.8 && state === 'playing') {
    AL.zapT -= dt;
    if (AL.zapT <= 0) { AL.zapT = 0.8 + Math.random() * 0.5; AL.boltT = 0.22; Snd.zap(); shake = Math.max(shake, 0.6); vibe(40, 'heavy'); AL.hits += 1 - Math.min(0.9, (car.p && car.p.meteorGuard) || 0); if (AL.hits >= ALIEN_MAX_HITS - 1e-6) { AL.hits = 0; const r = 'were zapped to death by the UFO'; if (LEVELS[level].space) spCrash(r); else onCrash(r); return; } }
  }
  if (AL.boltT > 0) {
    AL.boltT -= dt; alienBolt.visible = AL.boltT > 0 && !caught;
    if (alienBolt.visible) {
      const a = boltGeo.attributes.position, x0 = alienRoot.position.x, y0 = alienRoot.position.y - 0.4, z0 = alienRoot.position.z;
      for (let i = 0; i <= 10; i++) { const k = i / 10, j = i === 0 || i === 10 ? 0 : 0.7; a.setXYZ(i, x0 + (carW.x - x0) * k + (Math.random() - 0.5) * j, y0 + (carW.y + 0.4 - y0) * k + (Math.random() - 0.5) * j, z0 + (carW.z - z0) * k + (Math.random() - 0.5) * j); }
      a.needsUpdate = true;
    }
  } else alienBolt.visible = false;
  Snd.alienHum(state === 'playing' || state === 'countdown' ? 0.035 + 0.07 * AL.close + 0.08 * AL.atk : 0, Math.max(AL.close, AL.atk));
  { const danger = caught ? 1 : Math.max(AL.close, Math.max(0, Math.min(1, 1 - (AL.rel.length() - 4) / 26)));
    arFill.style.width = (8 + danger * 92).toFixed(0) + '%'; arFill.style.background = 'hsl(' + Math.round(120 - 120 * danger) + ',90%,55%)';
    arDist.textContent = caught ? '0 m' : Math.max(1, Math.round(AL.rel.length())) + ' m'; radarEl.classList.toggle('danger', danger > 0.7); }
  const spd = LEVELS[level].space ? SF.fs * 0.4 : car.speed(), sp = Math.max(0, Math.min(1, spd / 40));
  const wob = Math.sin(AL.t * 0.9), weave = LEVELS[level].space ? 2.8 : track.path ? 1.6 : 1.4;
  let gap = (30 - 10 * AL.close + 1.5 * wob) * (1 - AL.atk) + Math.max(3, alienGap() * 0.9) * AL.atk;
  const h = alienHeight() * (1 - 0.1 * AL.atk) + Math.sin(AL.t * 2.1) * 0.35;
  if (caught) { gap = 0; AL.tgt.set(0, 4.2 + Math.sin(AL.t * 5) * 0.2, 0); }
  else AL.tgt.copy(AL.f).multiplyScalar(-gap).addScaledVector(AL.side, Math.sin(AL.t * 0.7) * weave).add(_alV.set(0, h, 0));
  if (!AL.ready) { AL.rel.copy(AL.tgt); AL.rel.addScaledVector(AL.f, -6).y += 3; AL.ready = true; }
  AL.rel.lerp(AL.tgt, 1 - Math.exp(-dt * (caught ? 4.5 : AL.attacking ? 2.4 : 1.6)));
  alienRoot.position.copy(carW).add(AL.rel);
  alienSpin.rotation.y += dt * (caught ? 5 : 1.6 + 1.2 * AL.close); alienRoot.scale.setScalar(1 + 0.25 * AL.close);
  alienRoot.rotation.set(AL.f.z * 0.18 * sp * 0 + Math.sin(AL.t * 1.3) * 0.06, 0, Math.sin(AL.t * 1.1) * 0.07);
  const pulse = 0.9 + 0.1 * Math.sin(AL.t * 8);
  alienBeamMat.opacity += ((caught ? 0.42 * pulse : AL.atk > 0.8 ? 0.28 * (0.6 + 0.4 * Math.sin(AL.t * 30)) : 0) - alienBeamMat.opacity) * (1 - Math.exp(-dt * 6));
  alienBeam.visible = alienBeamMat.opacity > 0.01;
  alienBeam.scale.set(1, Math.max(0.4, (alienRoot.position.y - carW.y) / 5), 1); alienBeam.position.y = -(alienRoot.position.y - carW.y) / 2 * 1.0;
  alienGlowMat.opacity = (caught ? 0.9 : 0.5) * pulse;
  alienRoot.visible = AL.loaded && !(state === 'finishing' && LEVELS[level].space);
}
const _alV = new THREE.Vector3();
