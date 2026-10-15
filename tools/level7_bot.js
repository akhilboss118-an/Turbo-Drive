// Level 7 verification bot: drives full throttle (optionally nitro) through SKY CLIMB for several cars, with and without air control, and reports lip speed, climb speed, finish time and the summit landing.
// Run: node tools/level7_bot.js
const Phys = require(require('path').join(__dirname, '../game/js/physics.js')); const DT = 1/240;
const scen = { plain: {}, nitroClimb: { nitro: (c) => c.x > 360 && c.x < 830 && c.grounded }, nitroAll: { nitro: (c) => c.x > 360 && c.x < 957 }, van: { car: 'van' }, jeep: { car: 'jeep' }, vanNitroAll: { car: 'van', nitro: (c) => c.x > 360 && c.x < 957 }, jeepNitroClimb: { car: 'jeep', nitro: (c) => c.x > 360 && c.x < 830 && c.grounded } };
const rows = [];
for (const air of [true, false]) for (const k in scen) {
  const sc = scen[k], track = Phys.buildTrack(7), ground = Phys.makeGround(track), car = new Phys.Car(ground); car.setStats(Phys.statsFor(sc.car || 'night', {})); car.pads = track.boosts; car.spawn(8, 0);
  for (let i = 0; i < 300; i++) car.step(DT, { gas: false }); car.vx = car.vy = car.w = 0; car.events.length = 0;
  let t = 0, lip = null, traj = [], minClimb = 99, res = { crash: null, land: [] }, hairV = {};
  while (t < 120) {
    const inp = { gas: true, nitro: sc.nitro ? sc.nitro(car) : false, brake: false, tiltUp: false, tiltDown: false };
    if (air && !car.grounded && car.x > 957) { let x = car.x, y = car.y, vx = car.vx, vy = car.vy; for (let q = 0; q < 3000; q++) { x += vx * 0.01; y += vy * 0.01; vy -= 20 * 0.01; const gg = ground(x); if (gg !== null && y < gg) break; } const e = Math.atan(Phys.slopeAt(ground, x)) - car.th; if (e > 0.08) inp.tiltUp = true; else if (e < -0.08) inp.tiltDown = true; }
    car.step(DT, inp); t += DT;
    if (lip === null && car.x >= 957) lip = car.vx;
    if (car.x > 360 && car.x < 925 && car.grounded) minClimb = Math.min(minClimb, car.vx);
    if (air && k !== 'x' && car.x > 957 && car.x < 1070 && !car.grounded) traj.push([car.x, car.y]);
    for (const e of car.events) { if (e.type === 'land' && car.x > 960) res.land.push(car.x.toFixed(0) + ' ' + e.quality.split(' ')[0]); if (e.type === 'crash') res.crash = e.reason + '@' + car.x.toFixed(0); } car.events.length = 0;
    if (car.crashed || car.x > 1130) break;
  }
  rows.push({ air, k, lip: lip.toFixed(1), pct: (100 * lip / (34 * (Phys.statsFor(sc.car || 'night', {}).vmax))).toFixed(0) + '%', minClimb: minClimb.toFixed(1), t: t.toFixed(1), crash: res.crash, land: res.land.join(), traj });
}
for (const r of rows) console.log((r.air ? 'ctrl ' : 'none ') + r.k.padEnd(15), 'lip', r.lip, '(' + r.pct + ' of vmax) minClimb', r.minClimb, 'finish t', r.t, r.crash ? 'CRASH ' + r.crash : 'landed ' + r.land);
// hoop helper: y at given x across the air-controlled runs
const at = (tr, x) => { let b = null; for (const p of tr) if (p[0] >= x) { b = p; break; } return b ? b[1] : null; };
for (const x of [962, 968, 974, 980, 986, 992, 1000, 1010]) console.log('x', x, rows.filter((r) => r.air).map((r) => { const y = at(r.traj, x); return y === null ? '-' : y.toFixed(1); }).join(' '));
