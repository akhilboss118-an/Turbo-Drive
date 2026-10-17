/* eslint-disable */
'use strict';
/* Astronaut character: Mixamo FBX skeleton + animations (Walking, Firing Rifle, Reloading) with a procedural rigid-part suit/helmet/rifle attached to the bones. */
const ASTRO = { ready: false, failed: false, loading: false, group: null, inner: null, mixer: null, acts: {}, cur: '', clips: {}, flash: null, rifle: null, waiters: [], hipsH: 0.98 };
function astroOnReady(cb) { if (ASTRO.ready) cb(); else { ASTRO.waiters.push(cb); astroLoad(); } }
function astroLoad() {
  if (ASTRO.loading || ASTRO.ready) return; ASTRO.loading = true;
  if (!THREE.FBXLoader) { ASTRO.failed = true; return; }
  const L = new THREE.FBXLoader(), names = ['astronaut', 'walk', 'fire', 'fire2', 'reload'], res = {}; let n = 0;
  names.forEach((k) => L.load('game/assets/char/' + k + '.fbx', (o) => { res[k] = o; if (++n === names.length) astroBuild(res); }, undefined, () => { ASTRO.failed = true; ASTRO.loading = false; }));
}
function astroTrim(c) {
  let cut = Infinity;
  for (const t of c.tracks) { const n = t.times.length; if (n >= 4 && t.times[n - 1] - t.times[n - 2] > 5 * (t.times[n - 2] - t.times[n - 3])) cut = Math.min(cut, t.times[n - 2]); }
  if (cut < Infinity) for (const t of c.tracks) { let k = t.times.length; while (k > 1 && t.times[k - 1] > cut + 1e-4) k--; if (k < t.times.length) { const vs = t.getValueSize(); t.times = t.times.slice(0, k); t.values = t.values.slice(0, k * vs); } }
  c.resetDuration(); return c;
}
function astroInPlace(clip, hipsK, trim) {
  const c = trim ? astroTrim(clip.clone()) : clip.clone();
  for (const t of c.tracks) if (t.name === 'mixamorigHips.position') { const v = t.values; for (let i = 0; i < v.length; i += 3) { v[i] = 0; v[i + 2] = 0; v[i + 1] *= hipsK; } }
  return c;
}
function astroBuild(res) {
  const inner = res.astronaut, g = new THREE.Group(); g.add(inner); ASTRO.inner = inner; ASTRO.group = g;
  inner.updateMatrixWorld(true);
  const B = (n) => inner.getObjectByName('mixamorig' + n) || inner.getObjectByName('mixamorig:' + n);
  const hips = B('Hips'); if (!hips) { ASTRO.failed = true; return; }
  const hy = new THREE.Vector3().setFromMatrixPosition(hips.matrixWorld).y || 100; inner.scale.multiplyScalar(ASTRO.hipsH / hy); g.updateMatrixWorld(true);
  const ws = (b) => b.getWorldScale(new THREE.Vector3()).x;
  const M = (c, r, m, e) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m || 0, emissive: e || 0x000000, flatShading: false });
  const suit = M(0xe9edf5, 0.55), dark = M(0x2b303c, 0.7, 0.2), orange = M(0xff7a2e, 0.5, 0, 0x4a1a00), visor = M(0xffb23a, 0.15, 0.85, 0x3a2200), steel = M(0x4a505e, 0.4, 0.7);
  const rh = B('RightHand'), rk = ws(rh), rifle = new THREE.Group(); ASTRO.rifle = rifle;
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.07 / rk, 0.07 / rk, 0.62 / rk), dark); const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014 / rk, 0.014 / rk, 0.34 / rk, 8), steel);
  barrel.rotation.x = Math.PI / 2; barrel.position.z = 0.46 / rk; const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05 / rk, 0.16 / rk, 0.07 / rk), steel); mag.position.set(0, -0.11 / rk, 0.08 / rk);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.05 / rk, 0.1 / rk, 0.22 / rk), orange); stock.position.z = -0.38 / rk; const glow = new THREE.Mesh(new THREE.BoxGeometry(0.075 / rk, 0.012 / rk, 0.3 / rk), M(0x35e6ff, 0.3, 0, 0x35e6ff)); glow.position.set(0, 0.04 / rk, 0.05 / rk);
  rifle.add(body, barrel, mag, stock, glow);
  ASTRO.flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(['rgba(255,240,200,1)', 'rgba(255,170,60,0.6)', 'rgba(0,0,0,0)']), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
  ASTRO.flash.position.z = 0.66 / rk; ASTRO.flash.scale.setScalar(0.55 / rk); ASTRO.flash.visible = false; rifle.add(ASTRO.flash);
  rifle.userData.k = rk; rh.add(rifle); ASTRO.rh = rh;
  const hbl = new THREE.Vector3(); ASTRO.rifleOff = { pos: new THREE.Vector3(0.0, 0.0, 0.0), rot: new THREE.Euler(0, 0, 0) };
  g.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m) { m.fog = true; if (m.shininess !== undefined) m.shininess = 20; } }); } });
  ASTRO.mixer = new THREE.AnimationMixer(inner);
  const wh = res.walk.getObjectByName('mixamorigHips'), wy = wh ? wh.position.y : hy / inner.scale.x, hk = (hips.position.y && wy) ? hips.position.y / wy : 1;
  const cl = { walk: astroInPlace(res.walk.animations[0], hk, true), fire: astroInPlace(res.fire.animations[0], hk), fire2: astroInPlace(res.fire2.animations[0], hk), reload: astroInPlace(res.reload.animations[0], hk) };
  for (const k in cl) { ASTRO.clips[k] = cl[k]; ASTRO.acts[k] = ASTRO.mixer.clipAction(cl[k]); ASTRO.acts[k].setLoop(THREE.LoopRepeat); }
  ASTRO.acts.reload.setLoop(THREE.LoopOnce); ASTRO.acts.reload.clampWhenFinished = true;
  { const fa = ASTRO.acts.fire; fa.play(); ASTRO.mixer.update(1.0); g.updateMatrixWorld(true);
    const lh = B('LeftHand'), pr = new THREE.Vector3().setFromMatrixPosition(rh.matrixWorld), pl = new THREE.Vector3().setFromMatrixPosition(lh.matrixWorld), d = pl.clone().sub(pr).normalize();
    const hq = new THREE.Quaternion(), hs = new THREE.Vector3(), hp = new THREE.Vector3(); rh.matrixWorld.decompose(hp, hq, hs);
    const want = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d), inv = hq.clone().invert();
    rifle.quaternion.copy(inv.clone().multiply(want)); rifle.position.copy(d.clone().multiplyScalar(0.2).applyQuaternion(inv).multiplyScalar(1 / rk));
    fa.stop(); ASTRO.mixer.update(0); }
  ASTRO.ready = true; ASTRO.loading = false; for (const w of ASTRO.waiters.splice(0)) w();
}
function astroPlay(name, fade, speed) {
  if (!ASTRO.ready || ASTRO.cur === name) return; const a = ASTRO.acts[name]; if (!a) return; const p = ASTRO.acts[ASTRO.cur];
  a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.setEffectiveTimeScale(speed || 1); a.play(); if (p) p.crossFadeTo(a, fade === undefined ? 0.2 : fade, false); ASTRO.cur = name;
}
function astroUpdate(dt) { if (ASTRO.ready) ASTRO.mixer.update(dt); }
