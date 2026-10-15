/* eslint-disable */
'use strict';
/* Meteor storm: falling rocks, ground warnings, hit effects and the storm HUD (levels with LEVELS[n].meteors) */
let storm = null, stormIntro = false, stormTxt = '';
const meteorObjs = [], POOL = 56;
const _carSpawn = car.spawn.bind(car);
car.spawn = function (x, v) { _carSpawn(x, v); stormReset(x); };
function stormReset(x) { if (!storm) return; storm.reset(x); stormIntro = true; for (const o of meteorObjs) { o.g.visible = false; o.mk.visible = false; } }
function buildStorm() {
  meteorObjs.length = 0; storm = null; const box = $('stormBox'); box.classList.add('hidden');
  const L = LEVELS[level]; if (!L.meteors) return;
  storm = new Storm.StormSim(L.meteors, Math.random, track.pieces);
  const rockG = new THREE.IcosahedronGeometry(1, 0), rockM = new THREE.MeshLambertMaterial({ color: 0x4a3028, emissive: 0xff5a1a, emissiveIntensity: 0.6 });
  const trG = new THREE.ConeGeometry(0.55, 7, 8, 1, true); trG.translate(0, 3.5, 0);
  const trM = new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
  const ringG = new THREE.RingGeometry(0.95, 1.3, 28), discG = new THREE.CircleGeometry(0.95, 24);
  const vx = Storm.DRIFT / Math.hypot(Storm.DRIFT, Storm.FALL_H / Storm.FALL_T), tilt = Math.asin(vx);
  for (let i = 0; i < POOL; i++) {
    const g = new THREE.Group(), rock = new THREE.Mesh(rockG, rockM), tr = new THREE.Mesh(trG, trM); tr.rotation.z = tilt; g.add(rock, tr); g.visible = false;
    const mkM = new THREE.MeshBasicMaterial({ color: 0xff3b2a, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide, fog: false, blending: THREE.AdditiveBlending });
    const mk = new THREE.Group(), r = new THREE.Mesh(ringG, mkM), d = new THREE.Mesh(discG, mkM); r.rotation.x = d.rotation.x = -Math.PI / 2; mk.add(r, d); mk.visible = false;
    levelGroup.add(g, mk); meteorObjs.push({ g, rock, mk, mkM });
  }
  box.classList.remove('hidden'); stormTxt = '';
}
function stormHit(e) {
  shake = Math.max(shake, 0.6); burst(22, 10); Snd.land('HARD LANDING'); vibe(50); fuel = Math.max(0, fuel - (storm.cfg.fuelLoss || 0.22) * (1 - (car.p.meteorGuard || 0)));
  for (let i = 0; i < 14; i++) sparks.emit(e.x, e.y, e.z, (Math.random() - 0.3) * 10, Math.random() * 9, (Math.random() - 0.5) * 8, 0.5 + Math.random() * 0.5);
  toast('METEOR HIT', 'Big speed loss  -  hit NITRO and outrun the storm!', 'warn');
  const f = $('stormFlash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
}
function stormImpact(e) {
  if (Math.abs(e.x - car.x) > 70) return;
  const n = e.harmless ? 3 : 7;
  for (let i = 0; i < n; i++) sparks.emit(e.x, e.y + 0.2, e.z, (Math.random() - 0.5) * 6, 2 + Math.random() * 6, (Math.random() - 0.5) * 6, 0.4 + Math.random() * 0.4);
  for (let i = 0; i < 3; i++) smoke.emit(e.x, e.y + 0.3, e.z + (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 3, 1 + Math.random() * 2, (Math.random() - 0.5) * 3, 0.8 + Math.random() * 0.6, 0.8, 3, 0.5, [0.55, 0.38, 0.3]);
  if (!e.harmless && Math.abs(e.x - car.x) < 45) ring(e.x, e.y, 0xff7a2a, 3);
}
function updateStorm(dt) {
  if (!storm) return;
  if (state === 'cutscene') { for (const o of meteorObjs) { o.g.visible = false; o.mk.visible = false; } return; }
  if (state === 'playing' || state === 'finishing') {
    if (state === 'finishing') storm.inv = 9;
    if (stormIntro && state === 'playing') { stormIntro = false; toast('METEOR STORM', 'Rocks are chasing you  -  use NITRO to outrun them!', 'warn'); }
    storm.update(dt, car, ground);
    for (const e of storm.events) { if (e.type === 'hit') stormHit(e); else stormImpact(e); }
    storm.events.length = 0;
  }
  const n = Math.min(storm.list.length, POOL);
  for (let i = 0; i < POOL; i++) {
    const o = meteorObjs[i]; if (!o) break;
    if (i >= n) { o.g.visible = false; o.mk.visible = false; continue; }
    const m = storm.list[i], k = m.t / Storm.FALL_T;
    o.g.visible = true; toWorld(m.x, m.y, m.z, o.g.position); o.g.scale.setScalar(m.r * 1.5); o.rock.rotation.x += dt * 4; o.rock.rotation.z += dt * 2.5;
    if (m.harmless) o.mk.visible = false;
    else { o.mk.visible = true; placeOnRoad(o.mk, m.ix, m.iy + 0.12, m.z, m.iy); o.mk.scale.setScalar(1.3 + m.r * 1.2); o.mkM.opacity = 0.15 + 0.7 * k * k; }
  }
  const gap = storm.gap(car.x), txt = gap < 10 ? 'IN THE STORM  -  NITRO!' : 'STORM ' + Math.round(gap) + ' m BEHIND';
  if (txt !== stormTxt) { stormTxt = txt; $('stormTxt').textContent = txt; }
  const b = $('stormBox'); b.classList.toggle('danger', gap < 10); b.classList.toggle('warn', gap >= 10 && gap < 24);
  $('stormBar').style.setProperty('--g', Math.max(0, Math.min(1, gap / 40)).toFixed(3));
}
