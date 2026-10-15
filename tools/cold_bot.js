// Mars-cold bot for levels 15/16: full throttle with each car, plain / nitro. Reports finish time, time left on the engine-freeze timer and crashes. Run: node tools/cold_bot.js [level] [v]
const Phys = require('../game/js/physics.js'); const DT = 1 / 240;
const lvl = +(process.argv[2] || 15), verbose = process.argv[3] === 'v';
const CFG = { 15: { k: 1, time: 46, cp: 6, pad: 2, retry: 20 }, 16: { k: 1, time: 58, cp: 6, pad: 2, retry: 20 } }[lvl];
function run(carId, mode) {
  const track = Phys.buildTrack(lvl), ground = Phys.makeGround(track), car = new Phys.Car(ground);
  car.g = Phys.MARS_G; car.setStats(Phys.statsFor(carId, {})); car.coldK = CFG.k; car.pads = track.boosts; car.spawn(8, 0);
  for (let i = 0; i < 300; i++) car.step(DT, { gas: false }); car.vx = car.vy = car.w = 0; car.events.length = 0;
  let t = 0, coldT = CFG.time, cp = 1, log = [], offT = 0, minLeft = 999;
  while (t < 240 && !car.crashed && car.x < track.finishX) {
    const inp = { gas: true, nitro: mode === 'nitro' && car.grounded && car.vx < 30, brake: false, tiltUp: false, tiltDown: false, flipL: false, flipR: false };
    if (!car.grounded && car.air > 0.3) { let th = car.th - Math.atan(Phys.slopeAt(ground, car.x + 8)); th -= 2 * Math.PI * Math.round(th / (2 * Math.PI)); if (th > 0.15) inp.tiltDown = true; else if (th < -0.15) inp.tiltUp = true; }
    car.step(DT, inp); t += DT;
    coldT -= DT * (1 - 0.45 * car.p.coldGuard); if (coldT < minLeft) minLeft = coldT;
    if (coldT <= 0) { car.engineOff = true; offT += DT; if (offT > 7 || (offT > 2 && car.speed() < 5)) car.crash('engine frozen'); }
    while (cp < track.checkpoints.length && car.x > track.checkpoints[cp].x) { coldT += CFG.cp; cp++; }
    for (const e of car.events) { if (e.type === 'boost') coldT += CFG.pad; if (e.type === 'crash') log.push('CRASH:' + e.reason + '@' + car.x.toFixed(0)); }
    car.events.length = 0;
  }
  return carId.padEnd(6) + mode.padEnd(6) + (car.crashed ? 'FAILED ' : 'FINISH ') + t.toFixed(0) + 's  timer-left ' + coldT.toFixed(0) + 's (min ' + minLeft.toFixed(0) + ')  ' + log.join(' | ');
}
for (const c of ['gt', 'night', 'van', 'jeep', 'hover']) for (const m of ['plain', 'nitro']) console.log(run(c, m));
