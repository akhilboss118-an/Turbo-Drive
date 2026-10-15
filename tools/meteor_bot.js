// Meteor-storm bot for levels 11/12: plain gas vs. smart nitro (burn nitro when the storm is close). Run: node tools/meteor_bot.js [level]
const Phys = require('../game/js/physics.js'), Storm = require('../game/js/core/storm.js'); const DT = 1 / 240;
const lvl = +(process.argv[2] || 11), CFG = { 11: { v: 33, gapMax: 30, rate: 17 }, 12: { v: 34, gapMax: 28, rate: 20 }, 13: { v: 34, gapMax: 30, rate: 19 }, 14: { v: 35, gapMax: 28, rate: 22 } }[lvl];
const FIN = { 11: 1500, 12: 2060, 13: 1130, 14: 880 }, BASE = { 13: 5, 14: 6 };
function run(carId, mode, seed) {
  let s = seed; const rand = () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const track = Phys.buildTrack(BASE[lvl] || lvl), ground = Phys.makeGround(track), car = new Phys.Car(ground), st = new Storm.StormSim(CFG, rand, track.pieces);
  car.g = Phys.MARS_G; car.setStats(Phys.statsFor(carId, {})); car.pads = track.boosts; car.spawn(8, 0);
  for (let i = 0; i < 300; i++) car.step(DT, { gas: false }); car.vx = car.vy = car.w = 0; car.events.length = 0; st.reset(car.x);
  let t = 0, fuel = 1, log = [], minGap = 999, FR = 1 / 60, acc = 0, nitroT = 0;
  while (t < 240 && !car.crashed && car.x < FIN[lvl]) {
    const gap = st.gap(car.x); minGap = Math.min(minGap, gap);
    let nit = false; if (mode === 'smart' && fuel > 0.05 && gap < 26 && car.grounded) nit = true;
    if (mode === 'smart' && fuel < 0.02) nit = false;
    const inp = { gas: true, nitro: nit, brake: false, tiltUp: false, tiltDown: false };
    if (!car.grounded && car.air > 0.3) { let th = car.th - Math.atan(Phys.slopeAt(ground, car.x + 8)); th -= 2 * Math.PI * Math.round(th / (2 * Math.PI)); if (th > 0.15) inp.tiltDown = true; else if (th < -0.15) inp.tiltUp = true; }
    car.step(DT, inp); t += DT; acc += DT;
    if (nit) { fuel = Math.max(0, fuel - 0.42 * DT / car.p.nitroCap); nitroT += DT; } else fuel = Math.min(1, fuel + 0.05 * DT * (car.grounded ? 1 : 0.5));
    if (acc >= FR) { st.update(acc, car, ground); acc = 0; st.events.length = 0; }
    for (const e of car.events) if (e.type === 'crash') log.push('CRASH:' + e.reason + '@' + car.x.toFixed(0)); car.events.length = 0;
  }
  return carId.padEnd(6) + mode.padEnd(6) + (car.crashed ? 'CRASHED' : 'FINISH ' + t.toFixed(0) + 's') + ' hits ' + st.hits + ' minGap ' + minGap.toFixed(0) + ' nitro ' + nitroT.toFixed(1) + 's ' + log.join(' | ');
}
for (const c of ['gt', 'night', 'van', 'jeep', 'hover']) for (const m of ['plain', 'smart']) { const r = []; for (const sd of [1, 2, 3]) r.push(run(c, m, sd)); console.log(r.join('\n')); }
