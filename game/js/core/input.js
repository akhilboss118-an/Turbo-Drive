/* eslint-disable */
'use strict';
/* Keyboard, touch and pointer input */
/* ================= input ================= */
const held = { spL: new Set(), spR: new Set(), gas: new Set(), brake: new Set(), tiltUp: new Set(), tiltDown: new Set(), nitro: new Set(), flipL: new Set(), flipR: new Set() }, keys = {};
const input = { steer: 0, gas: false, brake: false, tiltUp: false, tiltDown: false, nitro: false, flipL: false, flipR: false };
function readInput() {
  input.gas = held.gas.size > 0 || !!(keys.ArrowUp || keys.KeyW || keys.Space);
  input.brake = held.brake.size > 0 || !!(keys.ArrowDown || keys.KeyS);
  input.tiltUp = held.tiltUp.size > 0 || !!(keys.ArrowLeft || keys.KeyA);
  input.nitro = held.nitro.size > 0 || !!(keys.ShiftLeft || keys.ShiftRight || keys.KeyN || keys.KeyE);
  input.tiltDown = held.tiltDown.size > 0 || !!(keys.ArrowRight || keys.KeyD);
  input.steer = ((held.spR.size > 0 || keys.ArrowRight || keys.KeyD) ? 1 : 0) - ((held.spL.size > 0 || keys.ArrowLeft || keys.KeyA) ? 1 : 0);
  const lowg = !!LEVELS[level].gravity;   // in low-gravity levels, tilt buttons execute flips seamlessly
  input.flipL = lowg && (held.tiltUp.size > 0 || (held.flipL && held.flipL.size > 0) || !!keys.KeyA || !!keys.ArrowLeft || !!keys.KeyZ);
  input.flipR = lowg && (held.tiltDown.size > 0 || (held.flipR && held.flipR.size > 0) || !!keys.KeyD || !!keys.ArrowRight || !!keys.KeyC);
  for (const b of document.querySelectorAll('.ctl')) b.classList.toggle('on', held[b.dataset.act].size > 0 || (b.dataset.act === 'gas' && input.gas) || (b.dataset.act === 'brake' && input.brake));
}
for (const b of document.querySelectorAll('.ctl')) {
  const set = held[b.dataset.act];
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); set.add(e.pointerId); try { b.setPointerCapture(e.pointerId); } catch (x) {} Snd.init(); });
  const up = (e) => { set.delete(e.pointerId); };
  b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
  b.addEventListener('contextmenu', (e) => e.preventDefault());
}
for (const b of document.querySelectorAll('.sbtn')) {
  const set = held[b.dataset.act];
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); set.add(e.pointerId); b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch (x) {} Snd.init(); });
  const up = (e) => { set.delete(e.pointerId); if (!set.size) b.classList.remove('on'); };
  b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
  b.addEventListener('contextmenu', (e) => e.preventDefault());
}
const clearInput = () => { for (const k in held) held[k].clear(); for (const b of document.querySelectorAll('.sbtn')) b.classList.remove('on'); for (const k in keys) keys[k] = false; };
window.addEventListener('keydown', (e) => {
  if (document.body.classList.contains('lb-open')) return;
  if (e.target && e.target.tagName === 'INPUT') return;
  keys[e.code] = true;
  if (duelOn && e.code === 'Escape') { duelEsc(); return; }
  if (settingsFromPause && e.code === 'Escape') { closePauseSettings(); return; }
  if (e.code === 'Escape' || e.code === 'KeyP') { if (state === 'playing') pause(); else if (state === 'paused') resume(); }
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'Enter' || e.code === 'KeyR') { if (state === 'crashed') retry(); }
  if (state === 'garage') { if (e.code === 'ArrowRight' || e.code === 'KeyD') cycleVehicle(1); else if (e.code === 'ArrowLeft' || e.code === 'KeyA') cycleVehicle(-1); else if (e.code === 'Enter') equip(); else if (e.code === 'Escape') leaveGarage(); }
  else if (state === 'levels' && e.code === 'Escape') { setState('stages'); Snd.click(); }
  else if ((state === 'stages' || state === 'settings') && e.code === 'Escape') { setState('menu'); Snd.click(); }
  else if (state === 'menu' && e.code === 'Enter' && document.activeElement === document.body) { pickLevel(level); }
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('blur', () => { clearInput(); if (state === 'playing') pause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { clearInput(); if (state === 'playing') pause(); } });
document.addEventListener('touchmove', (e) => {
  if (e.target.closest && e.target.closest('.lbList, #results .modal, .duelScr, .gPane, .gList, .gInfo, #cards, .modal')) return;
  e.preventDefault();
}, { passive: false });
