/* eslint-disable */
'use strict';
/* Mars cold (levels with LEVELS[n].cold): tyres slide, the chassis wobbles and a freeze timer runs. At zero the engine stops. Checkpoints and boost pads add time. */
let coldT = 0, coldOffT = 0, coldIntro = false, coldMax = 1, coldTxt = '';
function buildCold() {
  const L = LEVELS[level]; car.coldK = L.cold ? L.cold.k : 0; $('coldBox').classList.add('hidden'); $('coldFrost').style.opacity = 0;
  if (L.cold) { $('coldBox').classList.remove('hidden'); resetCold(true); }
}
function resetCold(full) {
  const c = LEVELS[level].cold; car.engineOff = false; coldOffT = 0; if (!c) return;
  if (full) { coldT = c.time; coldIntro = true; } else coldT = Math.max(coldT, c.retry);
  coldMax = Math.max(coldT, c.time); coldTxt = '';
}
function coldBonus(kind) {
  const c = LEVELS[level].cold; if (!c || state !== 'playing') return;
  const add = kind === 'cp' ? c.cp : c.pad; coldT += add; coldMax = Math.max(coldMax, coldT);
  if (car.engineOff && coldT > 0) { car.engineOff = false; coldOffT = 0; }
  if (kind === 'cp') toast('+' + add + 's WARMTH', 'Checkpoint heats the engine', 'good');
}
function updateCold(dt) {
  const c = LEVELS[level].cold; if (!c) return;
  if (state === 'playing') {
    if (coldIntro) { coldIntro = false; toast('MARS COLD', 'Tyres slip and the engine is freezing  -  SPEEDRUN! Checkpoints and boost pads add time', 'warn'); }
    coldT -= dt * (1 - 0.45 * (car.p.coldGuard || 0));
    if (coldT <= 0) {
      coldT = 0;
      if (!car.engineOff) { car.engineOff = true; coldOffT = 0; shake = Math.max(shake, 0.5); vibe(80); toast('ENGINE FROZEN', 'No power  -  coast and hope for a checkpoint!', 'warn'); }
      coldOffT += dt;
      if (coldOffT > 7 || (coldOffT > 2 && car.speed() < 5)) car.crash('engine frozen');
    }
  }
  const txt = car.engineOff ? 'ENGINE FROZEN!' : 'ENGINE FREEZES IN ' + Math.ceil(coldT) + 's';
  if (txt !== coldTxt) { coldTxt = txt; $('coldTxt').textContent = txt; }
  const b = $('coldBox'); b.classList.toggle('danger', car.engineOff || coldT < 10); b.classList.toggle('warn', !car.engineOff && coldT >= 10 && coldT < 20);
  $('coldBar').style.setProperty('--g', Math.max(0, Math.min(1, coldT / Math.max(30, coldMax))).toFixed(3));
  $('coldFrost').style.opacity = car.engineOff ? 0.9 : Math.max(0, Math.min(0.75, 1 - coldT / 25)).toFixed(2);
}
