// Level 8 bot: full-throttle run through LAVA GAUNTLET; checks each hazard's arrival time against its window. Run: node tools/level8_bot.js
const Phys = require(require('path').join(__dirname, '../game/js/physics.js')); const DT = 1/240;
const LASER_T = 3.4, PISTON_T = 3.2;
const H = [[205,'laser',.02],[335,'laser',.85],[360,'piston',.24],[565,'laser',.88],[610,'laser',.88],[850,'laser',.94],[895,'piston',.82],[995,'laser',.63],[1025,'piston',.58],[1055,'laser',.08]];
const car0 = process.argv[2] || 'night';
for (const nitro of [false, true]) {
  const track = Phys.buildTrack(8), ground = Phys.makeGround(track), car = new Phys.Car(ground); car.setStats(Phys.statsFor(car0, {})); car.pads = track.boosts; car.spawn(8, 0);
  for (let i = 0; i < 300; i++) car.step(DT, { gas: false }); car.vx = car.vy = car.w = 0; car.events.length = 0;
  let t = 0; const arr = {}, crash = [];
  while (t < 150 && !car.crashed && car.x < 1320) {
    car.step(DT, { gas: true, nitro: nitro && car.x > 990 && car.x < 1060, brake: false, tiltUp: false, tiltDown: false }); t += DT;
    for (const h of H) if (arr[h[0]] === undefined && car.x >= h[0]) arr[h[0]] = t;
    for (const e of car.events) if (e.type === 'crash') crash.push(e.reason + '@' + car.x.toFixed(0)); car.events.length = 0;
  }
  console.log(car0, nitro ? 'nitro' : 'plain', 'finish', t.toFixed(1) + 's', 'x', car.x.toFixed(0), crash.join(','));
  for (const h of H) { const a = arr[h[0]]; if (a === undefined) continue; const T = h[1] === 'laser' ? LASER_T : PISTON_T; const v = ((a / T) + h[2]) % 1;
    // safe: laser off when v<0.6; piston low when v<0.4 or v>=0.9. report phase at arrival
    console.log('  ', h[1].padEnd(6), h[0], 'arrive', a.toFixed(2), 'cycle pos', v.toFixed(2), h[1] === 'laser' ? (v < 0.6 ? 'safe' : 'HIT') : (v < 0.4 || v >= 0.9 ? 'safe' : 'HIT')); }
}
