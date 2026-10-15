/* eslint-disable */
'use strict';
/* Checkpoint gates and hazards */
/* ================= gates ================= */
const gates = [];
let startLine = null;
function makeGate(x, color, finish) {
  const g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color });
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7.5, 0.5), mat); p.position.set(0, 3.75, s * (W + 0.3)); g.add(p); }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, W * 2 + 1.1), mat); beam.position.y = 7.5; g.add(beam);
  if (finish) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 32; const k = c.getContext('2d');
    for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { k.fillStyle = (i + j) % 2 ? '#ffffff' : '#111111'; k.fillRect(i * 8, j * 8, 8, 8); }
    const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter;
    const b = new THREE.Mesh(new THREE.PlaneGeometry(W * 2, 2), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide })); b.rotation.y = Math.PI / 2; b.position.y = 6.3; g.add(b);
  }
  placeOnRoad(g, x, ground(x) || 0, 0, ground(x) || 0); levelGroup.add(g); return { group: g, mat, x, passed: false };
}
function buildGates() {
  gates.length = 0;
  for (let i = 1; i < CPS.length; i++) gates.push(makeGate(CPS[i].x, 0xff8a3d, false));
  gates.push(makeGate(track.finishX, 0xffffff, true));
  startLine = makeGate(CPS[0].x - 4, 0x35e6ff, false);
}

/* ================= hazards ================= */
const hazards = []; let hzT = 0;
const laserOn = (h) => (((hzT / LASER_T) + h.ph) % 1) >= 0.6;
const laserWarn = (h) => { const v = ((hzT / LASER_T) + h.ph) % 1; return v >= 0.5 && v < 0.6; };
const doorK = (h) => { const v = ((hzT / DOOR_T) + h.ph) % 1; return v < 0.45 ? 0 : v < 0.6 ? (v - 0.45) / 0.15 : v < 0.85 ? 1 : 1 - (v - 0.85) / 0.15; };   // 0 = open, 1 = closed
const doorWarn = (h) => { const v = ((hzT / DOOR_T) + h.ph) % 1; return v >= 0.33 && v < 0.45; };
const pistonH = (h) => { const v = ((hzT / PISTON_T) + h.ph) % 1; return PISTON_H * (v < 0.4 ? 0 : v < 0.5 ? (v - 0.4) / 0.1 : v < 0.8 ? 1 : v < 0.9 ? (0.9 - v) / 0.1 : 0); };
function stripeTex(c1, c2) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.fillStyle = c1; g.fillRect(0, 0, 64, 64); g.fillStyle = c2;
  for (let i = -64; i < 128; i += 32) { g.beginPath(); g.moveTo(i, 64); g.lineTo(i + 16, 64); g.lineTo(i + 48, 0); g.lineTo(i + 32, 0); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function buildHazards() {
  hazards.length = 0;
  const list = HAZARDS[baseOf(level)] || [];
  const post = new THREE.MeshLambertMaterial({ color: 0x2a2f4a }), red = new THREE.MeshBasicMaterial({ color: 0xff3b4a });
  for (const d of list) {
    const gy = ground(d.x) || 0, g = new THREE.Group(); placeOnRoad(g, d.x, gy, 0, gy);
    const h = { t: d.t, x: d.x, ph: d.ph, y: gy, g, warned: false };
    // warning plate on the road
    const tex = stripeTex('#ffd34d', '#1a1a1a'); tex.repeat.set(1, 8);
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(2.4, W * 2 - 0.6), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.85 }));
    plate.rotation.x = -Math.PI / 2; plate.rotation.z = Math.PI / 2; plate.position.y = 0.07; g.add(plate);
    if (d.t === 'laser') {
      const big = LEVELS[level].biome === 'desert';      // desert: red-on-red-sand, so the gate is bigger, brighter and unfogged
      h.beams = []; h.halos = [];
      if (!big) {
        for (const sd of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.2, 0.4), post); p.position.set(0, 1.6, sd * (W - 0.2)); g.add(p); const e = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.5), red); e.position.set(0, 3.3, sd * (W - 0.2)); g.add(e); }
        for (const by of [0.55, 1.35]) {
          const m = new THREE.MeshBasicMaterial({ color: 0xff3b4a, transparent: true, opacity: 0.2 });
          const b = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, W * 2 - 0.4), m); b.position.set(0, by, 0); g.add(b); h.beams.push(b);
        }
      } else {
        const stripe = stripeTex('#ffe14d', '#15101c'), glowM = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
        stripe.repeat.set(1, 3);
        const poleM = new THREE.MeshBasicMaterial({ map: stripe, fog: false });
        for (const sd of [-1, 1]) {
          const p = new THREE.Mesh(new THREE.BoxGeometry(0.7, 6.2, 0.7), poleM); p.position.set(0, 3.1, sd * (W - 0.1)); g.add(p);
          const e = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.95, 0.95), glowM); e.position.set(0, 0.95, sd * (W - 0.1)); g.add(e);        // emitter at beam height
          const t = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.5, 0.95), red); t.position.set(0, 6.3, sd * (W - 0.1)); g.add(t);          // red beacon on top
        }
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, W * 2 + 0.6), poleM); bar.position.set(0, 6.2, 0); g.add(bar);
        const c = document.createElement('canvas'); c.width = 512; c.height = 128; const k = c.getContext('2d');
        k.fillStyle = '#1a0610'; k.fillRect(0, 0, 512, 128); k.strokeStyle = '#ff3b4a'; k.lineWidth = 10; k.strokeRect(6, 6, 500, 116);
        k.fillStyle = '#ff5a68'; k.font = '700 78px "Big Shoulders Display", Impact, sans-serif'; k.textAlign = 'center'; k.textBaseline = 'middle'; k.fillText('LASER GATE', 256, 66);
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(2 * W, (2 * W) / 4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), side: THREE.DoubleSide, fog: false }));
        sign.rotation.y = -Math.PI / 2; sign.position.set(0, 7.4, 0); g.add(sign);
        for (const by of [0.55, 0.95, 1.35]) {
          const m = new THREE.MeshBasicMaterial({ color: 0xff2b3c, transparent: true, opacity: 0.2, fog: false });
          const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, W * 2 - 0.4), m); b.position.set(0, by, 0); g.add(b); h.beams.push(b);
        }
        const hm = new THREE.MeshBasicMaterial({ color: 0xff5a4a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
        const halo = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.8, W * 2 - 0.4), hm); halo.position.set(0, 0.95, 0); g.add(halo); h.halos.push(halo); h.glowM = glowM;
      }
    } else if (d.t === 'door') {
      const steel = new THREE.MeshLambertMaterial({ map: stripeTex('#8a90a4', '#3a3e50'), emissive: 0x1a1c28 }), frame = new THREE.MeshLambertMaterial({ color: 0x4a4e5c, emissive: 0x14161e });
      for (const sd of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.9, DOOR_H + 1.2, 0.9), frame); p.position.set(0, (DOOR_H + 1.2) / 2, sd * (W + 0.1)); g.add(p); const hs = new THREE.Mesh(new THREE.BoxGeometry(1.1, DOOR_H, W), frame); hs.position.set(0, DOOR_H / 2, sd * (W * 1.5 + 0.7)); g.add(hs); }
      const lint = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.2, W * 2 + 1.1), frame); lint.position.set(0, DOOR_H + 0.6, 0); g.add(lint);
      const c = document.createElement('canvas'); c.width = 512; c.height = 96; const k = c.getContext('2d'); k.fillStyle = '#10121c'; k.fillRect(0, 0, 512, 96); k.strokeStyle = '#ffd34d'; k.lineWidth = 8; k.strokeRect(5, 5, 502, 86);
      k.fillStyle = '#ffd34d'; k.font = '700 62px "Big Shoulders Display", Impact, sans-serif'; k.textAlign = 'center'; k.textBaseline = 'middle'; k.fillText('AIRLOCK DOORS', 256, 50);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(2 * W, 2 * W * 96 / 512), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), side: THREE.DoubleSide, fog: false })); sign.rotation.y = -Math.PI / 2; sign.position.set(0, DOOR_H + 2.1, 0); g.add(sign);
      h.panels = []; h.lights = [];
      for (const sd of [-1, 1]) { const pn = new THREE.Mesh(new THREE.BoxGeometry(0.6, DOOR_H, W), steel); pn.position.set(0, DOOR_H / 2, sd * (W * 1.5 + 0.7)); pn.userData.sd = sd; g.add(pn); h.panels.push(pn); }
      h.lm = new THREE.MeshBasicMaterial({ color: 0x7affb0, fog: false });
      for (const sd of [-1, 1]) { const l = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.7, 0.7), h.lm); l.position.set(0, DOOR_H + 0.6, sd * (W - 0.9)); g.add(l); }
    } else {
      const tx = stripeTex('#ff7a2d', '#201020'); tx.repeat.set(3, 1);
      const m = new THREE.MeshLambertMaterial({ map: tx });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, PISTON_H, W * 2 - 0.5), m); g.add(body); h.body = body;
      for (const sd of [-1, 1]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.0, 0.5), post); rail.position.set(0, 0.5, sd * (W - 0.15)); g.add(rail); }
    }
    levelGroup.add(g); hazards.push(h);
  }
}
function updateHazards() {
  for (const h of hazards) {
    if (h.t === 'laser') {
      const on = laserOn(h), w = !on && laserWarn(h) && (Math.floor(hzT * 10) % 2 === 0);
      for (const b of h.beams) { b.material.opacity = on ? 1 : w ? 0.7 : 0.18; b.scale.y = b.scale.x = on ? 1.5 : 1; }
      if (h.halos) { for (const o of h.halos) o.material.opacity = on ? 0.5 : w ? 0.28 : 0; if (h.glowM) h.glowM.color.setHex(on ? 0xff3b4a : w ? 0xffd34d : 0x7affb0); }   // emitters: red = on, amber = about to fire, green = safe
    } else if (h.t === 'door') {
      const k = doorK(h), wn = doorWarn(h) && (Math.floor(hzT * 10) % 2 === 0);
      for (const p of h.panels) p.position.z = p.userData.sd * (W / 2 + (1 - k) * (W + 0.2) + 0.1 + (1 - k) * 0.6);
      h.lm.color.setHex(k > 0.55 ? 0xff3b4a : wn ? 0xffd34d : k > 0 ? 0xff9a3a : 0x7affb0);
    } else {
      const H = pistonH(h); h.body.scale.y = Math.max(0.001, H / PISTON_H); h.body.position.y = H / 2; h.body.visible = H > 0.02;
    }
  }
}
function checkHazards() {
  for (const h of hazards) {
    if (Math.abs(car.x - h.x) > 2.4) continue;
    const bot = car.y - 0.3, top = car.y + 0.9;
    if (h.t === 'laser') { if (laserOn(h) && top > h.y + 0.2 && bot < h.y + 1.9) { car.crash('hit a laser gate'); return; } }
    else if (h.t === 'door') { if (doorK(h) > 0.55 && bot < h.y + DOOR_H) { car.crash('crushed by a closing door'); return; } }
    else { const H = pistonH(h); if (H > 0.4 && bot < h.y + H) { car.crash('hit a barrier'); return; } }
  }
}
function announceHazards() {
  for (const h of hazards) if (!h.warned && car.x > h.x - (LEVELS[level].biome === 'desert' ? 110 : 75) && car.x < h.x) { h.warned = true; toast(h.t === 'laser' ? 'LASER GATE' : h.t === 'door' ? 'CLOSING DOORS' : 'PISTON BARRIER', h.t === 'laser' ? 'Cross when it turns off' : h.t === 'door' ? 'Cross while they are open' : 'Cross when it drops', 'warn'); break; }
}

/* ================= hoop pickups (levels with hoopCoins) ================= */
function resetHoops() { for (const h of hoopObjs) { h.got = false; h.mat.opacity = 1; h.mat.color.setHex(LEVELS[level].glow[0]); h.mesh.scale.setScalar(1); } }
function checkHoops() {
  for (const h of hoopObjs) {
    if (h.got || car.x < h.s || car.x > h.s + 3) continue;
    if (Math.abs(car.y + 0.6 - h.y) < 3.3) { h.got = true; h.mat.color.setHex(0xffffff); h.mat.opacity = 0.35; h.mesh.scale.setScalar(1.25); addCoins(LEVELS[level].hoopCoins, 'style'); }
  }
}

/* ================= boost pads (levels with track.boosts) ================= */
const padObjs = [], PAD_W = 2 * W - 2.6;
function padTex(col) {   // opaque texture: dark deck with bright chevrons (no alpha, so no dark fringes when mip-mapped)
  const c = document.createElement('canvas'); c.width = 128; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#0a3a4a'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#' + col.toString(16).padStart(6, '0'); g.lineWidth = 30; g.lineCap = 'round'; g.lineJoin = 'round';
  for (let i = 0; i < 2; i++) { const x = 12 + i * 62; g.beginPath(); g.moveTo(x, 10); g.lineTo(x + 42, 64); g.lineTo(x, 118); g.stroke(); }   // chevrons point along +u = travel direction
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.anisotropy = renderer.capabilities.getMaxAnisotropy ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1; return t;
}
function buildBoostPads() {
  padObjs.length = 0; const list = track.boosts; if (!list) return;
  const L = LEVELS[level], qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  for (const b of list) {
    const len = b.x1 - b.x0, sm = (b.x0 + b.x1) / 2, y = refH(sm), g = new THREE.Group(), tex = padTex(L.glow[0]);
    tex.repeat.set(len / 4, 1);
    const mat = new THREE.MeshBasicMaterial({ map: tex, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, PAD_W), mat); m.rotation.x = -Math.PI / 2; g.add(m);
    placeOnRoad(g, sm, y + 0.07, 0, y);
    levelGroup.add(g); padObjs.push({ mat, tex });
  }
}
function updatePads() { for (const p of padObjs) p.tex.offset.x = -(envT * 0.9) % 1; }   // chevrons stream along the pad
