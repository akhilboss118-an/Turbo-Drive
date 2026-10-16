/* eslint-disable */
'use strict';
/* Helpers, constants, levels, vehicles, settings and saved progress */
const $ = (id) => document.getElementById(id);
const fail = (msg) => { const l = $('loading'); if (l) { l.classList.remove('hidden'); $('loadmsg').textContent = msg; } };
if (typeof THREE === 'undefined') { fail('Could not load the 3D engine (js/lib/three.min.js).'); throw new Error('THREE missing'); }

/* ================= constants ================= */
const S = 1.4, CX = 0.285, WCY = 0.23;           // car model scale and pivot (model units)
const W = 4.2;                                   // track half width
const DT = 1 / 240;
const LEVELS = [
  null,
  { name: 'LEVEL 1  SUNSET RUN', stars: [42, 65], fog: 0x7a3a95, sky: ['#120a40', '#4a1f7c', '#b0457f', '#ff9a5a'], topA: 0x2e2088, topB: 0x3a2a9e, seed: 7, island: [0x2ad1a3, 0x6a5af0, 0xff7ab0], glow: [0x35e6ff, 0xff8a3d], hoops: [[117, 4.4], [251, 5.6], [504, 6.8], [603, 10.4]], stars_bg: false, card: ['#4a1f7c', '#ff9a5a'] },
  { name: 'LEVEL 2  NEON CANYON', stars: [62, 95], fog: 0x0f3a52, sky: ['#040b24', '#0b2a55', '#136a8a', '#5be0c8'], topA: 0x145080, topB: 0x1c6290, seed: 21, island: [0xff6ad5, 0x35e6ff, 0xffd34d], glow: [0xff6ad5, 0x9dff6a], hoops: [[112, 5.0], [345, 6.6], [520, 8.0], [773, 8.4], [938, 9.2]], stars_bg: true, card: ['#0b2a55', '#5be0c8'] },
  { name: 'LEVEL 3  SPACE BRIDGE', stars: [67, 100], fog: 0x1a1450, sky: ['#02020f', '#150a46', '#3a1a8a', '#8f6bff'], topA: 0x32208a, topB: 0x402ca6, seed: 33, island: [0x9d7bff, 0x35e6ff, 0xffffff], glow: [0xb28cff, 0x35e6ff], hoops: [[95, 4.8], [213, 4.6], [292, 7.2], [533, 6.4], [612, 8.2], [690, 9.0], [946, 8.2], [1020, 9.0]], stars_bg: true, card: ['#3a1a8a', '#9d7bff'] },
  { name: 'LEVEL 4  FINAL TRACK', stars: [84, 125], fog: 0x5a1a2e, sky: ['#1a0408', '#5a1226', '#c2432e', '#ffc04a'], topA: 0x6a1c2c, topB: 0x7e2638, seed: 47, island: [0xff5a3d, 0xffc04a, 0xff7ab0], glow: [0xff5a3d, 0xffd34d], hoops: [[107, 4.6], [338, 7.0], [420, 8.6], [690, 7.4], [840, 6.6], [918, 8.0], [1000, 8.6], [1282, 9.4]], stars_bg: false, card: ['#c2432e', '#ffc04a'] },
  { name: 'LEVEL 5  SPIRAL DESCENT', stars: [70, 100], camera: 'chase', biome: 'desert', fog: 0x7a3a2a, sky: ['#2a1040', '#7a2f5a', '#e0653f', '#ffc27a'], topA: 0xc0683a, topB: 0xd47d48, postColor: 0x8a4a2a, seed: 55, island: [0xe8a15a, 0x35e6c0, 0xff7a5a], glow: [0xffd34d, 0x35e6ff],
    hoops: (function () { const g = Phys.makeGround(Phys.buildTrack(5)), a = []; for (let k = 1; k <= 11; k++) { const s = 200 + 72 * k; a.push([s, g(s) + 2.5]); } a.push([1096, 8.6], [1109, 6.3]); return a; })(),   // 11 spiral hoops (road + 2.5 m) + 2 canyon hoops from the bot's trajectory
    hoopCoins: 5, card: ['#7a2f5a', '#ffc27a'] },
  { name: 'LEVEL 6  MEGA RAMP', stars: [50, 75], camera: 'side', biome: 'ice', fog: 0x1a3a5a, sky: ['#020818', '#0a2a55', '#1a7a9a', '#7affd0'],
    topA: 0x3a78b0, topB: 0x4a90c8, postColor: 0x2a4a78, seed: 63, island: [0xbfefff, 0x7affd0, 0x9d7bff], glow: [0x7affd0, 0x9d7bff], stars_bg: true,
    hoops: [[87, 3.7], [192, 5.4], [300, 6.9], [679, 12.5], [686, 12.6], [694, 11.0]],   // one warm-up hoop per stair at the arc peak + 3 on the mega arc (re-placed from the bot's trajectories)
    hoopCoins: 5, megaJump: [690, 900], card: ['#0a2a55', '#7affd0'] },   // megaJump = landing zone of the big ramp (flip bonus applies to landings there)
  { name: 'LEVEL 7  SKY CLIMB', stars: [50, 70], camera: 'chase', biome: 'jungle', fog: 0x1f3a2a, sky: ['#0a0a24', '#2a1a5a', '#8a3a6a', '#ff9a5a'],
    topA: 0x2a7a4a, topB: 0x358e58, postColor: 0x2a5a3a, seed: 71, island: [0x35d98a, 0xffb347, 0xff6ad5], glow: [0x9dff6a, 0xffb347],
    hoops: (function () { const g = Phys.makeGround(Phys.buildTrack(7)), a = []; for (const s of [457, 592, 727]) a.push([s, g(s) + 2.5]); a.push([968, 35.1], [976, 33.9], [984, 31.0]); return a; })(),   // 3 hairpin-apex hoops (road + 2.5 m) + 3 on the summit arc (re-placed from the bot's trajectories)
    hoopCoins: 5, card: ['#2a1a5a', '#9dff6a'] },
  { name: 'LEVEL 8  LAVA GAUNTLET', stars: [75, 110], camera: 'side', biome: 'lava', fog: 0x4a1208, sky: ['#120204', '#4a0e0a', '#c2381a', '#ff9a3a'],
    topA: 0x4a2a2a, topB: 0x5c3434, postColor: 0x6a2a1a, seed: 83, island: [0xff5a1a, 0xffc04a, 0x8a2a1a], glow: [0xff5a1a, 0xffd34d],
    hoops: [], card: ['#4a0e0a', '#ff9a3a'] },
];
/* ================= stages: Earth (1-8) and Mars (9-16, same 8 tracks re-skinned) ================= */
const WORLDS = [
  { id: 'earth', name: 'Earth', first: 1, last: 8, blurb: 'Sunset Run to Lava Gauntlet' },
  { id: 'mars', name: 'Mars', first: 9, last: 16, blurb: 'Red dust, thin air, meteors and ice', gravity: '38%', req: 'Finish all 8 Earth levels to unlock', tags: ['Low gravity', 'Meteor storms', 'Freezing cold'], diff: 2 },
  { id: 'moon', name: 'Moon', first: 17, last: 20, blurb: 'Craters, spiral ramps and the final Moon Collapse', gravity: '17%', req: 'Finish all 8 Mars levels to unlock', tags: ['Moon gravity', 'Meteors', 'Lasers & doors', 'Level 20 needs the Hover'], diff: 3 },
  { id: 'space', name: 'Deep Space', first: 22, last: 23, blurb: 'Zero-G flight to Jupiter and Saturn', gravity: '0%', req: 'Finish Moon Collapse (level 20) with a Legendary hover to unlock', tags: ['Legendary hovers only', 'Zero gravity', 'Checkpoint rings', 'Left / Right steering'], diff: 3 },
  { id: 'circuit', name: 'Loop Circuit', first: 21, last: 21, blurb: '5-Lap Grand Prix circuit with bridge crossing', gravity: '100%', req: '', tags: ['Closed circuit', '5 Laps', 'Oil slicks & mud', 'Boost pads'], diff: 2 },
];
WORLDS[0].gravity = '100%'; WORLDS[0].req = ''; WORLDS[0].tags = ['Neon tracks', 'Lasers', 'Lava']; WORLDS[0].diff = 1;
WORLDS.forEach((w) => { w.count = w.last - w.first + 1; });
const baseOf = (n) => (n === 21 ? 21 : (n >= 9 && n <= 12) || n >= 15 ? n : ((n - 1) % 8) + 1);
const worldOf = (n) => (n === 21 ? 4 : n > 21 ? 3 : n > 16 ? 2 : n > 8 ? 1 : 0);
const MARS_NAMES = ['DUST RUNNER', 'CRATER CANYON', 'SPACE ELEVATOR', 'OLYMPUS FINAL', 'VALLES SPIRAL', 'POLAR MEGA RAMP', 'RED OASIS CLIMB', 'MAGMA GAUNTLET'];
(function () {
  const mixC = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);
  const mh = (a, b, t) => mixC(a, b, t).getHex(), mc = (a, b, t) => '#' + mixC(a, b, t).getHexString();
  const SKY = ['#140806', '#4a1d12', '#a8482a', '#f2a56a'], ISL = [0xc8602e, 0xe89050, 0x8a3a22], GLOW = [0xff9a4a, 0x7fe8ff];
  for (let n = 1; n <= 8; n++) {
    const L = LEVELS[n], M = Object.assign({}, L, {
      name: 'LEVEL ' + (n + 8) + '  ' + MARS_NAMES[n - 1], base: n, world: 1, seed: L.seed + 200,
      sky: L.sky.map((c, k) => mc(c, SKY[k], 0.72)), fog: mh(L.fog, 0x5a2a1c, 0.72),
      topA: mh(L.topA, 0xa8481f, 0.65), topB: mh(L.topB, 0xc05a2a, 0.65), postColor: L.postColor !== undefined ? mh(L.postColor, 0x6a2a18, 0.6) : 0x7a3a22,
      island: L.island.map((c, k) => mh(c, ISL[k % 3], 0.72)), glow: L.glow.map((c, k) => mh(c, GLOW[k], 0.6)), card: L.card.map((c, k) => mc(c, SKY[k + 1], 0.6)),
    });
    L.base = n; L.world = 0; LEVELS.push(M);
  }
})();
Object.assign(LEVELS[9], { name: 'LEVEL 9  PHOBOS LEAP', base: 9, gravity: Phys.MARS_G, stars: [58, 85], hoops: [], hoopCoins: 0 });
Object.assign(LEVELS[10], { name: 'LEVEL 10  OLYMPUS FLOAT', base: 10, gravity: Phys.MARS_G, stars: [68, 100], hoops: [], hoopCoins: 0 });
Object.assign(LEVELS[11], { name: 'LEVEL 11  METEOR ALLEY', base: 11, gravity: Phys.MARS_G, stars: [52, 80], hoops: [], hoopCoins: 0, meteors: { v: 33, gapMax: 30, rate: 17 } });
Object.assign(LEVELS[12], { name: 'LEVEL 12  ARES STORM', base: 12, gravity: Phys.MARS_G, stars: [72, 105], hoops: [], hoopCoins: 0, meteors: { v: 34, gapMax: 28, rate: 20 } });
const MOONBASE = { noTint: true, camera: 'side', biome: 'moon', gravity: Phys.MOON_G, hoops: [], hoopCoins: 0, megaJump: undefined, world: 2, stars_bg: true, postColor: 0x4a4e5c, island: [0x8d909c, 0xa6a9b4, 0x6f727e] };
LEVELS.push(Object.assign({}, MOONBASE, { name: 'LEVEL 17  TRANQUILITY HOP', base: 17, stars: [78, 105], seed: 331, moonSigns: [[70, 'MOON'], [2040, 'LEAP']],
  fog: 0x0b0d16, sky: ['#000003', '#04050d', '#0d0f1c', '#262a3c'], topA: 0x8a8e9c, topB: 0x9a9eac, glow: [0x7fe8ff, 0xffd34d], card: ['#0d0f1c', '#9aa0b8'] }));
LEVELS.push(Object.assign({}, MOONBASE, { name: 'LEVEL 18  TYCHO CRATER RUN', base: 18, stars: [90, 125], seed: 347, moonSigns: [[70, 'TYCHO'], [1860, 'GIANT']], meteors: { v: 33, gapMax: 30, rate: 16 },
  fog: 0x07080f, sky: ['#000002', '#07040a', '#1a0f18', '#4a2a2a'], topA: 0x777b88, topB: 0x878b98, glow: [0xff9a5a, 0x9dffea], card: ['#1a0f18', '#d28a6a'] }));
LEVELS.push(Object.assign({}, MOONBASE, { name: 'LEVEL 19  MARE ASCENT', base: 19, stars: [88, 125], seed: 359, moonSigns: [[70, 'MARE'], [600, 'SPIRAL'], [1960, 'RAMP']], spiral: [[640, 960, 0, 27]],
  fog: 0x0a0b14, sky: ['#000003', '#06060f', '#14121e', '#3a2c3c'], topA: 0x7c808e, topB: 0x8c909e, glow: [0x9dffea, 0xffb347], card: ['#14121e', '#9aa0b8'] }));
LEVELS.push(Object.assign({}, MOONBASE, { name: 'LEVEL 20  MOON COLLAPSE', base: 20, stars: [125, 175], seed: 373, moonSigns: [[70, 'ESCAPE'], [700, 'SPIRAL'], [3640, 'LAUNCH']], spiral: [[740, 1060, 0, 27], [2150, 2470, 0, 36]],
  collapse: true, chasm: true, needHover: true, finale: true, meteors: { v: 34, gapMax: 28, rate: 24 },
  fog: 0x1a0806, sky: ['#030101', '#1a0508', '#5a1410', '#d2481a'], topA: 0x6e6068, topB: 0x7e707a, glow: [0xff4a1a, 0xffd34d], card: ['#5a1410', '#ff8a3d'] }));
LEVELS[21] = { name: 'LEVEL 21  INFINITE LOOP', stars: [300, 420], camera: 'chase', biome: 'circuit', loop: true, depth: 2.5, noTint: true, world: 4, base: 21,
  fog: 0xc07a82, sky: ['#0a1030', '#2c3a78', '#e0745e', '#ffd49a'], topA: 0x3a3e52, topB: 0x444860, postColor: 0x35304a, seed: 2121,
  island: [0x2a7a50, 0x358a5a, 0x1f6a4a], glow: [0xffe2b0, 0xff5a3a], hoops: [], hoopCoins: 0, card: ['#2c3a78', '#ffd49a'] };
const SPACE_BASE = Object.assign({}, LEVELS[1], { space: true, needLegendary: true, noTint: true, hoops: [], hoopCoins: 0, world: 3, base: 22, stars_bg: true });
LEVELS[22] = Object.assign({}, SPACE_BASE, { name: 'LEVEL 22  DEEP SPACE TO JUPITER', stars: [58, 78], planet: 'jupiter', seed: 2101, sky: ['#01020a', '#070a22', '#150f3a', '#3a1e5a'], fog: 0x070a22, glow: [0x35e6ff, 0xff8a3d], card: ['#150f3a', '#ff9a5a'] });
LEVELS[23] = Object.assign({}, SPACE_BASE, { name: 'LEVEL 23  SPACE RINGS OF SATURN', base: 23, stars: [74, 98], planet: 'saturn', seed: 2202, finale2: true, sky: ['#01020a', '#04101e', '#0a2440', '#2a5a7a'], fog: 0x04101e, glow: [0x9dffea, 0xffd88a], card: ['#0a2440', '#ffd88a'] });
const CAMPAIGN_LEVELS = 23;
const FROST = { noTint: true, camera: 'side', biome: 'ice', gravity: Phys.MARS_G, hoops: [], hoopCoins: 0, megaJump: undefined };
Object.assign(LEVELS[15], FROST, { name: 'LEVEL 15  FROSTBITE SPIRAL', base: 15, stars: [58, 72], seed: 271, cold: { k: 1, time: 46, cp: 6, pad: 2, retry: 20 }, spiral: [[200, 570, 0, 27]],
  fog: 0x2a5478, sky: ['#050a1c', '#16345c', '#6aa5c8', '#e4f4ff'], topA: 0x4a86b8, topB: 0x5a9ac8, postColor: 0x2a4a78, island: [0xbfefff, 0x8fd0f0, 0xdff8ff], glow: [0x7affd0, 0x35e6ff], card: ['#16345c', '#e4f4ff'] });
Object.assign(LEVELS[16], FROST, { name: 'LEVEL 16  ABSOLUTE ZERO', base: 16, stars: [66, 82], seed: 283, cold: { k: 1, time: 58, cp: 6, pad: 2, retry: 20 }, spiral: [[250, 620, 2, 29], [1250, 1500, 2.4, 20]],
  fog: 0x14304c, sky: ['#02040e', '#0a1a3a', '#2a5a8a', '#b0d8f0'], topA: 0x3a6a9c, topB: 0x4a7eb0, postColor: 0x1a3a68, island: [0x9fd8f8, 0x6aa8d8, 0xdff8ff], glow: [0xb28cff, 0x7affd0], card: ['#0a1a3a', '#b0d8f0'] });
Object.assign(LEVELS[13], { name: 'LEVEL 13  METEOR SPIRAL', camera: 'side', sideCam: true, gravity: Phys.MARS_G, hoops: [], hoopCoins: 0, meteors: { v: 34, gapMax: 30, rate: 19 } });
Object.assign(LEVELS[14], { name: 'LEVEL 14  POLAR METEOR RAMP', gravity: Phys.MARS_G, hoops: [], hoopCoins: 0, meteors: { v: 35, gapMax: 28, rate: 22 } });
const HAZARDS = {
  1: [],
  2: [{ t: 'laser', x: 168, ph: 0 }, { t: 'piston', x: 644, ph: 0.3 }, { t: 'laser', x: 1035, ph: 0.5 }],
  3: [{ t: 'laser', x: 150, ph: 0 }, { t: 'laser', x: 355, ph: 0.4 }, { t: 'piston', x: 778, ph: 0.2 }, { t: 'piston', x: 1100, ph: 0.6 }, { t: 'laser', x: 1122, ph: 0.1 }],
  4: [{ t: 'laser', x: 182, ph: 0 }, { t: 'laser', x: 505, ph: 0.3 }, { t: 'piston', x: 530, ph: 0.1 }, { t: 'laser', x: 636, ph: 0.6 }, { t: 'laser', x: 755, ph: 0.2 }, { t: 'piston', x: 790, ph: 0.5 }, { t: 'laser', x: 1080, ph: 0.7 }, { t: 'piston', x: 1115, ph: 0.35 }, { t: 'laser', x: 1370, ph: 0.45 }, { t: 'piston', x: 1395, ph: 0.8 }],
  5: [{ t: 'laser', x: 1018, ph: 0.5 }],   // phase 0.5 (doc draft: 0): the bot reaches s=1018 as phase 0 turns the laser on; 0.5 gives the Police car ~1.7 s of clear road
};
HAZARDS[8] = [
  { t: 'laser', x: 205, ph: 0.02 },
  { t: 'laser', x: 335, ph: 0.85 }, { t: 'piston', x: 360, ph: 0.24 },
  { t: 'laser', x: 565, ph: 0.88 }, { t: 'laser', x: 610, ph: 0.88 },
  { t: 'laser', x: 850, ph: 0.94 }, { t: 'piston', x: 895, ph: 0.82 },
  { t: 'laser', x: 995, ph: 0.63 }, { t: 'piston', x: 1025, ph: 0.58 }, { t: 'laser', x: 1055, ph: 0.08 },
];
HAZARDS[18] = [   // Tycho Crater Run: laser gates and closing airlock doors on the flat stretches (never near a take-off or landing)
  { t: 'laser', x: 445, ph: 0.1 }, { t: 'door', x: 525, ph: 0.2 },
  { t: 'door', x: 975, ph: 0.55 }, { t: 'laser', x: 1050, ph: 0.35 },
  { t: 'laser', x: 1335, ph: 0.7 },
  { t: 'door', x: 1735, ph: 0.4 },
  { t: 'door', x: 2260, ph: 0.8 }, { t: 'laser', x: 2345, ph: 0.15 },
];
HAZARDS[19] = [   // Mare Ascent: laser gates and airlock doors on the flat stretches, away from every take-off and landing
  { t: 'laser', x: 595, ph: 0.2 }, { t: 'door', x: 1505, ph: 0.45 }, { t: 'laser', x: 1975, ph: 0.65 },
];
HAZARDS[20] = [   // Moon Collapse
  { t: 'laser', x: 700, ph: 0.3 }, { t: 'door', x: 1580, ph: 0.6 }, { t: 'door', x: 2125, ph: 0.15 },
  { t: 'laser', x: 2990, ph: 0.5 }, { t: 'door', x: 3250, ph: 0.8 }, { t: 'laser', x: 3700, ph: 0.35 }, { t: 'door', x: 3745, ph: 0.9 },
];
const LASER_T = 3.4, PISTON_T = 3.2, PISTON_H = 2.2, DOOR_T = 3.0, DOOR_H = 8.2;
const RARITY = {
  normal: { name: 'Normal', color: '#c9ced8', glow: 0xc9ced8, glow2: 0x8a93a8 },
  famous: { name: 'Famous', color: '#3aa0ff', glow: 0x3aa0ff, glow2: 0x7fd0ff },
  legendary: { name: 'Legendary', color: '#ffc83a', glow: 0xffc83a, glow2: 0xff9a1a },
};
const VEHICLES = [
  { id: 'gt', name: 'Red Bug', model: 'car5', paint: null, rarity: 'normal', kind: 'Starter car', color: 'Red', hex: '#ff3b2f', ability: 'Balanced', tag: 'NORMAL. Your everyday ride. Balanced speed, normal nitro, no tricks.' },
  { id: 'night', name: 'Police Car', model: 'car', paint: null, rarity: 'famous', kind: 'Emergency vehicle', color: 'Black', hex: '#1a1a1a', ability: 'Siren + fast acceleration', tag: 'FAMOUS. Flashing siren, fastest off the line and a high top speed.' },
  { id: 'van', name: 'Ambulance', model: 'van', paint: null, rarity: 'famous', kind: 'Emergency vehicle', color: 'White', hex: '#f4f4f4', ability: 'Boost-heal', tag: 'FAMOUS. Boost-heal: nitro tank refills while you drive and boost, plus huge tank and damage resistance.' },
  { id: 'jeep', name: 'Jeep', model: 'jeep', paint: null, rarity: 'famous', kind: 'Off-roader', color: 'Rust', hex: '#b5483d', ability: 'Off-road grip + durability', tag: 'FAMOUS. Off-road grip and durability: rock-solid landings, less speed lost and tougher against meteors and frost.' },
  { id: 'hover', name: 'Mars Hover', model: 'hover', paint: null, rarity: 'legendary', goldTrail: true, kind: 'Meteor runner', color: 'Violet', hex: '#a64be0', ability: 'Meteor shield + cold grip', tag: 'LEGENDARY. Built for Mars meteor storms. Huge nitro tank, floaty air control, a shield that cuts meteor damage and a golden trail.' },
  { id: 'hover2', name: 'Aero Hover', model: 'hover2', paint: null, rarity: 'legendary', goldTrail: true, kind: 'Hover racer', color: 'Gold', hex: '#ffc83a', ability: 'Floats + speed boost + gold trail', tag: 'LEGENDARY. Floats on air (22% less gravity for long glides), monster speed boost and soft landings, leaving a golden trail.' },
];
const PRICE = { gt: 0, night: 600, van: 1000, jeep: 2000, hover: 2500, hover2: 4000 };
for (const v of VEHICLES) v.price = PRICE[v.id];
const vehicleById = (id) => VEHICLES.find((v) => v.id === id) || VEHICLES[0];
let level = 1, unlocked = 1, vehicleId = 'gt', lastLevel = 1;
let duelOn = false, duelPrevLevel = 1;   // online duel mode: no coins/stars/unlocks are written while it is on
let track = Phys.buildTrack(level), ground = Phys.makeGround(track);
const car = new Phys.Car(ground);
let CPS = track.checkpoints;
const hex = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
let seed = 7; const rnd = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

/* ================= settings ================= */
const isLowDevice = typeof navigator !== 'undefined' && ((navigator.deviceMemory && navigator.deviceMemory <= 3) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4 && window.matchMedia && matchMedia('(pointer:coarse)').matches));
const settings = { sound: true, quality: isLowDevice ? 'low' : 'high', shake: !(window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches) };
let best = null, bests = {}, starsBy = {};
try { const s = JSON.parse(localStorage.getItem('skyleap') || '{}'); if (s.sound === false) settings.sound = false; if (s.quality === 'low') settings.quality = 'low'; else if (s.quality === 'high') settings.quality = 'high'; if (s.best) best = s.best; if (s.bests) bests = s.bests; if (s.starsBy) starsBy = s.starsBy; if (s.unlocked) unlocked = Math.max(1, Math.min(CAMPAIGN_LEVELS, s.unlocked)); if (typeof s.vehicle === 'string' && VEHICLES.some((v) => v.id === s.vehicle)) vehicleId = s.vehicle; if (s.lastLevel) lastLevel = Math.max(1, Math.min(unlocked, s.lastLevel)); } catch (e) {}
let coins = 0, crates = 0, owned = ['gt'], hasOwned = false, trophy = false;
let upg = {}, cos = {};
try { const s = JSON.parse(localStorage.getItem('skyleap') || '{}'); if (s.upg && typeof s.upg === 'object') upg = s.upg; if (s.cos && typeof s.cos === 'object') cos = s.cos; if (s.trophy === true) trophy = true; } catch (e) {}
const upgOf = (id) => (upg[id] = upg[id] || {});
const tierOf = (id, k) => Math.max(0, upgOf(id)[k] | 0);
const COSMETICS = {
  glow: { name: 'Neon Underglow', items: [
    { id: 'cyan', name: 'Cyan', color: '#35e6ff', price: 250 }, { id: 'magenta', name: 'Magenta', color: '#ff3df0', price: 250 }, { id: 'lime', name: 'Lime', color: '#9dff3a', price: 250 },
    { id: 'amber', name: 'Amber', color: '#ffb02e', price: 250 }, { id: 'rainbow', name: 'Rainbow', color: '#ffffff', price: 600 } ] },
  trail: { name: 'Trails', items: [
    { id: 'comet', name: 'Comet', color: '#6fe9ff', price: 300 }, { id: 'ember', name: 'Ember', color: '#ff7a2e', price: 300 }, { id: 'toxic', name: 'Toxic', color: '#8dff4a', price: 350 },
    { id: 'rose', name: 'Rose', color: '#ff6ad5', price: 350 }, { id: 'rainbow', name: 'Rainbow', color: '#ffffff', price: 700 } ] },
  spark: { name: 'Wheel Sparks', items: [
    { id: 'gold', name: 'Gold', color: '#ffc24a', price: 200 }, { id: 'blue', name: 'Blue', color: '#4ab8ff', price: 250 }, { id: 'green', name: 'Green', color: '#6dff8a', price: 250 },
    { id: 'pink', name: 'Pink', color: '#ff7ad9', price: 250 }, { id: 'rainbow', name: 'Rainbow', color: '#ffffff', price: 500 } ] },
};
const COS_KEYS = ['glow', 'trail', 'spark'];
const cosOf = (id) => { const c = (cos[id] = cos[id] || {}); c.own = c.own || {}; c.eq = c.eq || {}; for (const k of COS_KEYS) { c.own[k] = (c.own[k] || []).filter((x) => COSMETICS[k].items.some((i) => i.id === x)); if (c.eq[k] && c.own[k].indexOf(c.eq[k]) < 0) c.eq[k] = null; } return c; };
const save = () => { try { localStorage.setItem('skyleap', JSON.stringify({ sound: settings.sound, quality: settings.quality, best, bests, starsBy, unlocked, coins, crates, owned, shake: settings.shake, vehicle: vehicleId, lastLevel: duelOn ? duelPrevLevel : level, upg, cos, trophy, rev: 2 })); } catch (e) {} if (window.AuthService) window.AuthService.progressChanged(); };
try { const s = JSON.parse(localStorage.getItem('skyleap') || '{}'); if (typeof s.coins === 'number') coins = Math.max(0, s.coins | 0); if (typeof s.crates === 'number') crates = Math.max(0, s.crates | 0); if (Array.isArray(s.owned)) { owned = s.owned.filter((x) => typeof x === 'string'); hasOwned = true; } if (s.shake === false) settings.shake = false; else if (s.shake === true) settings.shake = true; } catch (e) {}
try { if ((JSON.parse(localStorage.getItem('skyleap') || '{}').rev | 0) < 2) { owned = ['gt']; hasOwned = true; vehicleId = 'gt'; } } catch (e) {}   // rev 2: Red Bug is the starter, every other car is bought with coins
owned = owned.filter((x) => PRICE[x] !== undefined);
if (PRICE[vehicleId] === undefined) vehicleId = 'gt';
for (const k in PRICE) if (PRICE[k] === 0 && owned.indexOf(k) < 0) owned.push(k);   // free cars are always owned
if (!hasOwned && owned.indexOf(vehicleId) < 0) owned.push(vehicleId);      // old saves keep the ride they were already driving
if (owned.indexOf(vehicleId) < 0) vehicleId = 'gt';
