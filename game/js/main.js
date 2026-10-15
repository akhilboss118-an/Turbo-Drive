/* eslint-disable */
'use strict';
/* Boot */
/* ================= boot ================= */
if (best !== null && bests[1] === undefined) bests[1] = best;
applyStats(vehicleId); loadLevel(Math.min(unlocked, lastLevel)); car.spawn(CPS[0].x, 0); settle(300); snapCamera(); setState('menu'); refreshMenu();
(window.introDone || Promise.resolve()).then(() => setTimeout(() => $('loading').classList.add('hidden'), 2200));
window.SkyLeap = { vehicles: VEHICLES, get coins() { return coins; }, set coins(v) { coins = v; refreshCoins(); }, get owned() { return owned; }, get fuel() { return fuel; }, addCoins, landFx, get vehicleId() { return vehicleId; }, hazards, setHz: (t) => { hzT = t; }, laserOn, pistonH, tick, startRun, car, track, get state() { return state; }, setState, input, handleEvents, get score() { return score; }, get cp() { return cpIndex; }, get time() { return timeT; } };
window.TurboDrive = { levels: LEVELS.slice(1).map((L) => L.name.split('  ')[1]), get level() { return level; }, get state() { return state; } };
requestAnimationFrame(frame);
