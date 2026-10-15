// Low-gravity bot: full-throttle run of levels 9/10 with each car, plain / nitro / +flips. Run: node tools/lowg_bot.js [level]
const Phys = require(require('path').join(__dirname, '../game/js/physics.js')); const DT = 1 / 240;
const lvl = +(process.argv[2] || 9), verbose = process.argv[3] === 'v';
const FLIPSPIN = +(process.env.FS || 5.6);
const FIN = { 9: 1700, 10: 1940, 11: 1500, 12: 2060, 13: 1130, 14: 880, 17: 2590, 18: 2840, 19: 2540, 20: 3800 }, BASE = { 13: 5, 14: 6 };
function run(carId, mode) {
  const track = Phys.buildTrack(BASE[lvl] || lvl), ground = Phys.makeGround(track), car = new Phys.Car(ground);
  car.g = lvl >= 17 ? Phys.MOON_G : Phys.MARS_G; car.setStats(Phys.statsFor(carId, {})); car.pads = track.boosts; car.spawn(8, 0);
  for (let i = 0; i < 300; i++) car.step(DT, { gas: false }); car.vx = car.vy = car.w = 0; car.events.length = 0;
  let t = 0, takeoff = null, log = [], flips = 0, hard = 0;
  while (t < 200 && !car.crashed && car.x < FIN[lvl]) {
    const air = !car.grounded && car.air > 0.05;
    const inp = { gas: true, nitro: mode === 'nitro' && car.grounded && car.vx < 30, brake: false, tiltUp: false, tiltDown: false, flipL: false, flipR: false };
    if (!car.grounded && car.air > 0.3) {
      if (car.air < 0.31) car.vy0 = car.vy;
      if (mode === 'flip' && car.vy0 > 6.5 && car.spin < FLIPSPIN && car.air < 3.0) inp.flipL = true;
      else { let th = car.th - Math.atan(Phys.slopeAt(ground, car.x + 8)); th -= 2 * Math.PI * Math.round(th / (2 * Math.PI)); if (th > 0.15) inp.tiltDown = true; else if (th < -0.15) inp.tiltUp = true; }
    }
    car.step(DT, inp); t += DT;
    for (const e of car.events) { if (e.type === 'crash') log.push('CRASH:' + e.reason + '@' + car.x.toFixed(0)); if (e.type === 'land') { flips += e.flips; if (e.quality === 'HARD LANDING') hard++; if (verbose) log.push('land@' + e.x.toFixed(0) + ' air' + e.air.toFixed(1) + ' ' + e.quality + ' f' + e.flips + ' imp' + e.impact.toFixed(1)); } } car.events.length = 0;
  }
  return carId.padEnd(6) + mode.padEnd(6) + (car.crashed ? 'CRASHED' : 'FINISH ' + t.toFixed(0) + 's') + ' flips ' + flips + ' hard ' + hard + ' ' + log.join(' | ');
}
for (const c of ['gt', 'night', 'van', 'jeep', 'hover']) for (const m of ['plain', 'nitro', 'flip']) console.log(run(c, m));
