/* eslint-disable */
/* ---- Skyline Stunt physics: 2D arcade car on a side-profile track (x forward, y up) ---- */
const Phys = (function () {
  const G = 20, R = 0.32, HALF_BASE = 1.28, XS = 0.12;
  const K = 10 / XS, C = 9.5, LMAX = R + XS;
  const INERTIA = 2.2, ENGINE = 22, VMAX = 34, BRAKE = 30, ROLL = 0.035;
  const FLIP_W = 6.2, FLIP_ACC = 34, PAD_ACC = 18, AIR_TORQUE = 15, AIR_DAMP = 0.7, GROUND_ANG_DAMP = 2.2, W_MAX = 4.5, BAD_ANGLE = 1.25;

  /* ---------- Per-car stats & upgrades: plain multipliers on the constants above ---------- */
  const NEUTRAL = { engine: 1, vmax: 1, nitroPow: 1, nitroCap: 1, inertia: 1, airTorque: 1, airDamp: 1, groundAngDamp: 1, wMax: 1, landDamp: 1, badAngle: BAD_ANGLE, landLoss: 0, landTol: 1, meteorGuard: 0, coldGuard: 0, coldBoost: 0, gScale: 1, fuelRegen: 0 };
  const CAR_STATS = {
    gt: { },                                    // Red Bug (NORMAL): the plain, balanced car
    night: { engine: 1.3, vmax: 1.1, inertia: 0.85, airTorque: 1.1, groundAngDamp: 0.75, landDamp: 0.9, badAngle: 1.15, landTol: 0.9 },   // Police Car (FAMOUS): siren + much faster acceleration
    van: { engine: 0.98, vmax: 0.98, inertia: 1.15, airTorque: 0.9, groundAngDamp: 1.1, landDamp: 1.05, badAngle: 1.3, nitroCap: 1.7, nitroPow: 1.3, fuelRegen: 0.08, meteorGuard: 0.3, coldGuard: 0.3 },   // Ambulance (FAMOUS): boost-heal - nitro tank refills while driving and boosting, and it shrugs off meteor / frost damage
    hover: { engine: 1.1, vmax: 1.08, nitroCap: 1.8, nitroPow: 1.3, inertia: 0.9, airTorque: 1.25, groundAngDamp: 1.2, landDamp: 1.3, badAngle: 1.45, landTol: 1.25, meteorGuard: 0.65, coldGuard: 0.85, coldBoost: 0.5 },   // Mars Hover (LEGENDARY): meteor runner (shield cuts meteor slowdown by 65%) and cold runner
    hover2: { engine: 1.2, vmax: 1.14, nitroCap: 1.6, nitroPow: 1.5, inertia: 0.9, airTorque: 1.3, groundAngDamp: 1.2, landDamp: 1.4, badAngle: 1.5, landTol: 1.4, gScale: 0.78, fuelRegen: 0.03, meteorGuard: 0.2 },   // Aero Hover (LEGENDARY): floats (22% less gravity = long glides), huge speed boost, soft landings
    jeep: { engine: 1.08, vmax: 1.05, nitroPow: 1.12, nitroCap: 1.3, inertia: 1.2, airTorque: 1.12, groundAngDamp: 1.35, landDamp: 1.35, badAngle: 1.55, landTol: 1.45, landLoss: 0, meteorGuard: 0.25, coldGuard: 0.25 },   // Jeep (FAMOUS): off-road grip + durability - lands almost anything, and takes less meteor / frost damage
  };
  const UPGRADES = [
    { id: 'engine', name: 'Engine', desc: 'Acceleration and top speed', costs: [150, 300, 500, 800, 1200] },
    { id: 'nitro', name: 'Nitro Tank', desc: 'Bigger tank, harder boost', costs: [120, 240, 420, 700, 1000] },
    { id: 'grip', name: 'Landing Grip', desc: 'Softer, safer, faster landings', costs: [120, 260, 480, 800] },
    { id: 'air', name: 'Air Control', desc: 'Sharper mid-air rotation', costs: [120, 260, 480, 800] },
  ];
  const UPGRADE_FX = {
    engine: (p, t) => { p.engine *= 1 + 0.06 * t; p.vmax *= 1 + 0.025 * t; },
    nitro: (p, t) => { p.nitroCap *= 1 + 0.2 * t; p.nitroPow *= 1 + 0.04 * t; },
    grip: (p, t) => { p.landDamp *= 1 + 0.08 * t; p.groundAngDamp *= 1 + 0.1 * t; p.badAngle += 0.05 * t; p.landLoss *= 1 - 0.2 * t; p.landTol *= 1 + 0.08 * t; },
    air: (p, t) => { p.airTorque *= 1 + 0.1 * t; p.airDamp *= 1 + 0.08 * t; p.wMax *= 1 + 0.04 * t; },
  };
  function statsFor(carId, tiers) {
    const p = Object.assign({}, NEUTRAL, CAR_STATS[carId] || {});
    for (const u of UPGRADES) { const t = Math.max(0, Math.min(u.costs.length, (tiers && tiers[u.id]) | 0)); if (t) UPGRADE_FX[u.id](p, t); }
    return p;
  }

  /* ---------- Track ---------- */
  const ease = {
    flat: (h0) => () => h0,
    kicker: (h0, h1, x0, x1) => (x) => { const t = (x - x0) / (x1 - x0); return h0 + (h1 - h0) * t * t; },
    drop: (h0, h1, x0, x1) => (x) => { const t = (x - x0) / (x1 - x0); return h0 + (h1 - h0) * (1 - (1 - t) * (1 - t)); },
    hills: (h0, amp, wl, x0) => (x) => h0 + amp * 0.5 * (1 - Math.cos(((x - x0) / wl) * Math.PI * 2)),
    slope: (h0, h1, x0, x1) => (x) => h0 + (h1 - h0) * ((x - x0) / (x1 - x0)),
    crater: (depth, x0, x1) => (x) => { const t = (x - x0) / (x1 - x0); return -depth * 0.5 * (1 - Math.cos(t * Math.PI * 2)); },
  };
  function buildTrack(level) {
    const T = buildTrackRaw(level);
    T.path = buildPath(T);
    return T;
  }
  function buildTrackRaw(level) {
    level = level || 1;
    const P = [];
    const add = (type, x0, x1, fn, h0, h1, extra) => P.push(Object.assign({ type, x0, x1, fn, h0, h1 }, extra || {}));
    if (level === 2) return buildLevel2(P, add);
    if (level === 3) return buildLevel3(P, add);
    if (level === 4) return buildLevel4(P, add);
    if (level === 5) return buildLevel5(P, add);
    if (level === 6) return buildLevel6(P, add);
    if (level === 7) return buildLevel7(P, add);
    if (level === 8) return buildLevel8(P, add);
    if (level === 9) return buildLevel9(P, add);
    if (level === 10) return buildLevel10(P, add);
    if (level === 11) return buildLevel11(P, add);
    if (level === 12) return buildLevel12(P, add);
    if (level === 15) return buildLevel15(P, add);
    if (level === 16) return buildLevel16(P, add);
    if (level === 17) return buildLevel17(P, add);
    if (level === 18) return buildLevel18(P, add);
    if (level === 19) return buildLevel19(P, add);
    if (level === 20) return buildLevel20(P, add);
    if (level === 21) return buildLevel21(P, add);
    if (level === 29) return buildLevel29(P, add);
    add('flat', 0, 90, ease.flat(0), 0, 0);
    add('kicker', 90, 108, ease.kicker(0, 2.4, 90, 108), 0, 2.4);               // jump 1
    add('drop', 126, 152, ease.drop(0.8, 0, 126, 152), 0.8, 0);
    add('flat', 152, 220, ease.flat(0), 0, 0);                                 // checkpoint 1 ~ 190
    add('kicker', 220, 242, ease.kicker(0, 3.4, 220, 242), 0, 3.4);             // jump 2
    add('drop', 257, 287, ease.drop(2.6, 0, 257, 287), 2.6, 0);
    add('flat', 287, 360, ease.flat(0), 0, 0);                                 // checkpoint 2 ~ 340
    add('hills', 360, 440, ease.hills(0, 1.5, 20, 360), 0, 0);                  // rolling bumps
    add('flat', 440, 470, ease.flat(0), 0, 0);
    add('kicker', 470, 494, ease.kicker(0, 4.2, 470, 494), 0, 4.2);             // jump 3 (up to platform)
    add('flat', 512, 570, ease.flat(3.2), 3.2, 3.2);                           // checkpoint 3 ~ 535
    add('kicker', 570, 592, ease.kicker(3.2, 7.2, 570, 592), 3.2, 7.2);         // jump 4 (big drop to finish)
    add('drop', 618, 658, ease.drop(4.4, 0, 618, 658), 4.4, 0);
    add('flat', 658, 760, ease.flat(0), 0, 0);
    return { pieces: P, finishX: 735, checkpoints: [{ x: 8 }, { x: 190 }, { x: 340 }, { x: 535 }], length: 760 };
  }
  function buildLevel29(P, add) {   // GRAND OVAL (3-lap duel race): closed circuit, one lap = 972 m, the path ends exactly where it starts
    const R = 45, ARC = Math.PI * R, N = 28, SL = 60;
    let s = 0;
    const seg = (len, turn, r, bank) => { add('flat', s, s + len, ease.flat(0), 0, 0, turn ? { turn, bank: bank || [0, 0], radius: [r, r] } : undefined); s += len; };
    seg(339.23); seg(ARC, 180, R, [5, 5]); seg(40);
    seg(SL, N, 60); seg(SL, -N, 60); seg(30); seg(SL, -N, 60); seg(SL, N, 60);   // infield dip (the roundabout kink)
    seg(40); seg(ARC, 180, R, [5, 5]);
    const fin = s; add('flat', fin, fin + 4, ease.flat(0), 0, 0);
    return { pieces: P, finishX: fin, checkpoints: [{ x: 8 }, { x: 410 }, { x: 660 }, { x: 900 }], length: fin + 4, boosts: [{ x0: 140, x1: 148 }, { x0: 250, x1: 258 }, { x0: 800, x1: 808 }] };
  }
  function buildLevel2(P, add) {
    add('flat', 0, 80, ease.flat(0), 0, 0);
    add('kicker', 80, 100, ease.kicker(0, 3.0, 80, 100), 0, 3.0);               // jump 1
    add('drop', 124, 150, ease.drop(1.2, 0, 124, 150), 1.2, 0);
    add('flat', 150, 200, ease.flat(0), 0, 0);                                 // checkpoint 1 ~ 180
    add('hills', 200, 290, ease.hills(0, 1.6, 22.5, 200), 0, 0);                // rolling bumps
    add('flat', 290, 310, ease.flat(0), 0, 0);
    add('kicker', 310, 334, ease.kicker(0, 4.4, 310, 334), 0, 4.4);             // jump 2
    add('drop', 356, 392, ease.drop(3.0, 0, 356, 392), 3.0, 0);
    add('flat', 392, 430, ease.flat(0), 0, 0);                                 // checkpoint 2 ~ 410
    add('kicker', 430, 452, ease.kicker(0, 3.6, 430, 452), 0, 3.6);             // jump 3 (up to platform)
    add('flat', 470, 510, ease.flat(2.4), 2.4, 2.4);
    add('kicker', 510, 530, ease.kicker(2.4, 5.2, 510, 530), 2.4, 5.2);         // jump 4 (long drop)
    add('drop', 554, 590, ease.drop(3.2, 0, 554, 590), 3.2, 0);
    add('flat', 590, 650, ease.flat(0), 0, 0);                                 // checkpoint 3 ~ 620
    add('hills', 650, 740, ease.hills(0, 2.0, 22.5, 650), 0, 0);
    add('flat', 740, 760, ease.flat(0), 0, 0);
    add('kicker', 760, 786, ease.kicker(0, 5.4, 760, 786), 0, 5.4);             // jump 5
    add('drop', 808, 852, ease.drop(3.0, 0, 808, 852), 3.0, 0);
    add('flat', 852, 900, ease.flat(0), 0, 0);                                 // checkpoint 4 ~ 880
    add('kicker', 900, 926, ease.kicker(0, 6.0, 900, 926), 0, 6.0);             // jump 6 (grand finale)
    add('drop', 950, 1000, ease.drop(3.4, 0, 950, 1000), 3.4, 0);
    add('flat', 1000, 1100, ease.flat(0), 0, 0);
    return { pieces: P, finishX: 1070, checkpoints: [{ x: 8 }, { x: 180 }, { x: 410 }, { x: 620 }, { x: 880 }], length: 1100 };
  }
  function buildLevel3(P, add) {   // SPACE BRIDGE: stepping-stone platforms
    add('flat', 0, 70, ease.flat(0), 0, 0);
    add('kicker', 70, 88, ease.kicker(0, 2.6, 70, 88), 0, 2.6);
    add('drop', 110, 136, ease.drop(1.0, 0, 110, 136), 1.0, 0);
    add('flat', 136, 180, ease.flat(0), 0, 0);                                 // cp1 ~160
    add('kicker', 180, 200, ease.kicker(0, 3.2, 180, 200), 0, 3.2);
    add('flat', 222, 262, ease.flat(2.0), 2.0, 2.0);
    add('kicker', 262, 282, ease.kicker(2.0, 4.8, 262, 282), 2.0, 4.8);
    add('drop', 304, 342, ease.drop(2.6, 0, 304, 342), 2.6, 0);
    add('flat', 342, 390, ease.flat(0), 0, 0);                                 // cp2 ~370
    add('hills', 390, 480, ease.hills(0, 1.8, 22.5, 390), 0, 0);
    add('flat', 480, 500, ease.flat(0), 0, 0);
    add('kicker', 500, 522, ease.kicker(0, 4.0, 500, 522), 0, 4.0);
    add('flat', 544, 580, ease.flat(2.6), 2.6, 2.6);
    add('kicker', 580, 600, ease.kicker(2.6, 5.4, 580, 600), 2.6, 5.4);
    add('flat', 624, 660, ease.flat(3.4), 3.4, 3.4);                           // cp3 ~640
    add('kicker', 660, 680, ease.kicker(3.4, 6.0, 660, 680), 3.4, 6.0);
    add('drop', 704, 750, ease.drop(3.2, 0, 704, 750), 3.2, 0);
    add('flat', 750, 800, ease.flat(0), 0, 0);
    add('hills', 800, 890, ease.hills(0, 2.0, 22.5, 800), 0, 0);
    add('flat', 890, 910, ease.flat(0), 0, 0);
    add('kicker', 910, 934, ease.kicker(0, 5.0, 910, 934), 0, 5.0);
    add('flat', 958, 992, ease.flat(3.0), 3.0, 3.0);                           // cp4 ~970
    add('kicker', 992, 1010, ease.kicker(3.0, 5.8, 992, 1010), 3.0, 5.8);
    add('drop', 1034, 1080, ease.drop(3.2, 0, 1034, 1080), 3.2, 0);
    add('flat', 1080, 1180, ease.flat(0), 0, 0);
    return { pieces: P, finishX: 1140, checkpoints: [{ x: 8 }, { x: 160 }, { x: 370 }, { x: 640 }, { x: 970 }], length: 1180 };
  }
  function buildLevel4(P, add) {   // FINAL TRACK: long, big gaps
    add('flat', 0, 70, ease.flat(0), 0, 0);
    add('kicker', 70, 92, ease.kicker(0, 3.4, 70, 92), 0, 3.4);
    add('drop', 112, 146, ease.drop(1.2, 0, 112, 146), 1.2, 0);
    add('flat', 146, 190, ease.flat(0), 0, 0);                                 // cp1 ~170
    add('hills', 190, 280, ease.hills(0, 2.2, 22.5, 190), 0, 0);
    add('flat', 280, 300, ease.flat(0), 0, 0);
    add('kicker', 300, 326, ease.kicker(0, 5.0, 300, 326), 0, 5.0);
    add('flat', 346, 390, ease.flat(3.0), 3.0, 3.0);
    add('kicker', 390, 412, ease.kicker(3.0, 6.0, 390, 412), 3.0, 6.0);
    add('drop', 432, 484, ease.drop(3.4, 0, 432, 484), 3.4, 0);
    add('flat', 484, 540, ease.flat(0), 0, 0);                                 // cp2 ~520
    add('hills', 540, 630, ease.hills(0, 2.0, 22.5, 540), 0, 0);
    add('flat', 630, 650, ease.flat(0), 0, 0);
    add('kicker', 650, 676, ease.kicker(0, 5.4, 650, 676), 0, 5.4);
    add('drop', 698, 744, ease.drop(3.0, 0, 698, 744), 3.0, 0);
    add('flat', 744, 800, ease.flat(0), 0, 0);                                 // cp3 ~780
    add('kicker', 800, 824, ease.kicker(0, 4.4, 800, 824), 0, 4.4);
    add('flat', 848, 880, ease.flat(3.0), 3.0, 3.0);
    add('kicker', 880, 902, ease.kicker(3.0, 5.8, 880, 902), 3.0, 5.8);
    add('flat', 922, 966, ease.flat(3.2), 3.2, 3.2);
    add('kicker', 966, 988, ease.kicker(3.2, 6.2, 966, 988), 3.2, 6.2);
    add('drop', 1014, 1070, ease.drop(3.6, 0, 1014, 1070), 3.6, 0);
    add('flat', 1070, 1130, ease.flat(0), 0, 0);                               // cp4 ~1100
    add('hills', 1130, 1220, ease.hills(0, 2.0, 22.5, 1130), 0, 0);
    add('flat', 1220, 1240, ease.flat(0), 0, 0);
    add('kicker', 1240, 1268, ease.kicker(0, 6.4, 1240, 1268), 0, 6.4);
    add('drop', 1288, 1346, ease.drop(3.4, 0, 1288, 1346), 3.4, 0);
    add('flat', 1346, 1460, ease.flat(0), 0, 0);
    return { pieces: P, finishX: 1420, checkpoints: [{ x: 8 }, { x: 170 }, { x: 520 }, { x: 780 }, { x: 1100 }], length: 1460 };
  }
  function buildLevel5(P, add) {   // SPIRAL DESCENT: a banked spiral winding down a mesa, then a canyon jump
    add('flat', 0, 90, ease.flat(30), 30, 30);                                  // mesa-top start
    add('kicker', 90, 108, ease.kicker(30, 32.4, 90, 108), 30, 32.4);            // warm-up jump
    add('drop', 124, 150, ease.drop(30.8, 30, 124, 150), 30.8, 30);              // landing (gap 108-124)
    add('flat', 150, 200, ease.flat(30), 30, 30);                              // breather, cp1 at 200
    add('slope', 200, 1000, ease.slope(30, 4, 200, 1000), 30, 4, { turn: 1000, bank: [15, 25], radius: [60, 35] });   // the spiral
    add('flat', 1000, 1060, ease.flat(4), 4, 4);                               // run-out, laser at 1018
    add('kicker', 1060, 1084, ease.kicker(4, 7, 1060, 1084), 4, 7);            // canyon launch (gap 1084-1110)
    add('drop', 1110, 1150, ease.drop(4, 0, 1110, 1150), 4, 0);                // canyon landing
    add('flat', 1150, 1220, ease.flat(0), 0, 0);
    return { pieces: P, finishX: 1200, checkpoints: [{ x: 8 }, { x: 200 }, { x: 780 }, { x: 1030 }], length: 1220 };
  }
  function buildLevel6(P, add) {   // MEGA RAMP: three stair-step jumps, a 220 m run-up with boost pads, then one giant ramp over a chasm
    add('flat', 0, 60, ease.flat(0), 0, 0);
    add('kicker', 60, 78, ease.kicker(0, 2.0, 60, 78), 0, 2.0);                // stair 1 (gap 78-94)
    add('drop', 94, 120, ease.drop(0.6, 0, 94, 120), 0.6, 0);
    add('flat', 120, 160, ease.flat(0), 0, 0);
    add('kicker', 160, 180, ease.kicker(0, 3.0, 160, 180), 0, 3.0);            // stair 2 (gap 180-198)
    add('drop', 198, 226, ease.drop(1.0, 0, 198, 226), 1.0, 0);
    add('flat', 226, 265, ease.flat(0), 0, 0);
    add('kicker', 265, 288, ease.kicker(0, 4.0, 265, 288), 0, 4.0);            // stair 3 (gap 288-308)
    add('drop', 308, 340, ease.drop(1.4, 0, 308, 340), 1.4, 0);
    add('flat', 340, 630, ease.flat(0), 0, 0);                                 // cp1 ~360, run-up 380-600 (boost pads 420/480/540), cp2 ~590
    add('kicker', 630, 670, ease.kicker(0, 9.0, 630, 670), 0, 9.0);            // THE MEGA RAMP (gap 670-690)
    add('drop', 690, 778, ease.drop(7.0, 0, 690, 778), 7.0, 0);                // long landing ramp, starts high so the fall stays survivable
    add('flat', 778, 900, ease.flat(0), 0, 0);
    return { pieces: P, finishX: 880, checkpoints: [{ x: 8 }, { x: 360 }, { x: 590 }], length: 900, boosts: [{ x0: 416, x1: 424 }, { x0: 476, x1: 484 }, { x0: 536, x1: 544 }] };
  }
  function buildLevel7(P, add) {   // SKY CLIMB: two warm-up jumps, three switchback hairpins up a mountain, then a summit launch across a valley
    add('flat', 0, 80, ease.flat(0), 0, 0);
    add('kicker', 80, 98, ease.kicker(0, 2.0, 80, 98), 0, 2.0);                // warm-up jump 1 (gap 98-113)
    add('drop', 113, 140, ease.drop(0.6, 0, 113, 140), 0.6, 0);
    add('hills', 140, 230, ease.hills(0, 1.4, 22.5, 140), 0, 0);                // rolling jungle valley
    add('flat', 230, 250, ease.flat(0), 0, 0);
    add('kicker', 250, 270, ease.kicker(0, 2.8, 250, 270), 0, 2.8);            // warm-up jump 2 (gap 270-286)
    add('drop', 286, 316, ease.drop(0.9, 0, 286, 316), 0.9, 0);
    add('flat', 316, 360, ease.flat(0), 0, 0);                                 // cp1 at 340
    add('slope', 360, 420, ease.slope(0, 8, 360, 420), 0, 8);                  // climb A
    add('flat', 420, 495, ease.flat(8), 8, 8, { turn: 180, bank: [8, 8], radius: [24, 24] });     // hairpin 1
    add('slope', 495, 555, ease.slope(8, 16, 495, 555), 8, 16);                // climb B
    add('flat', 555, 630, ease.flat(16), 16, 16, { turn: -180, bank: [8, 8], radius: [24, 24] }); // hairpin 2 (cp2 at 560)
    add('slope', 630, 690, ease.slope(16, 24, 630, 690), 16, 24);              // climb C
    add('flat', 690, 765, ease.flat(24), 24, 24, { turn: 180, bank: [8, 8], radius: [24, 24] });  // hairpin 3
    add('slope', 765, 825, ease.slope(24, 32, 765, 825), 24, 32);              // climb D
    add('flat', 825, 925, ease.flat(32), 32, 32);                              // summit platform, cp3 at 835
    // Summit jump, re-tuned by the bot (doc draft: 6 m kicker, 40 m gap, ramp 28 m below the lip -> every car crashed, nose-dived at ~1020):
    // a 2 m kicker keeps the lip speed up (plain night car ~29 m/s), the gap is 28 m (957-985) and the landing ramp starts 8 m below the lip (26 m)
    // and runs straight down to 0 over 985-1065, so the flight path and the ramp stay within ~20 deg for lip speeds from 24 to 36 m/s.
    add('kicker', 925, 957, ease.kicker(32, 34, 925, 957), 32, 34);            // summit launch
    add('slope', 985, 1065, ease.slope(26, 0, 985, 1065), 26, 0);              // long straight landing ramp
    add('flat', 1065, 1150, ease.flat(0), 0, 0);
    return { pieces: P, finishX: 1130, checkpoints: [{ x: 8 }, { x: 340 }, { x: 560 }, { x: 835 }], length: 1150, boosts: [{ x0: 482, x1: 490 }, { x0: 617, x1: 625 }, { x0: 752, x1: 760 }] };
  }
  function buildLevel8(P, add) {   // LAVA GAUNTLET: five hazard clusters (single, pair, offset, mixed, triple) with three lava hops between them
    add('flat', 0, 90, ease.flat(0), 0, 0);
    add('kicker', 90, 108, ease.kicker(0, 2.0, 90, 108), 0, 2.0);              // small hop (gap 108-124)
    add('drop', 124, 150, ease.drop(0.6, 0, 124, 150), 0.6, 0);
    add('flat', 150, 440, ease.flat(0), 0, 0);                                 // clusters 1 (laser 205) and 2 (laser 335, piston 360); cp1 ~280
    add('kicker', 440, 464, ease.kicker(0, 3.0, 440, 464), 0, 3.0);            // hop 1 (gap 464-484, bot-tuned from 24 m: the Jeep's ~26 m/s lip fell short)
    add('drop', 484, 520, ease.drop(0.6, 0, 484, 520), 0.6, 0);
    add('flat', 520, 678, ease.flat(0), 0, 0);                                 // cluster 3 (lasers 565, 610); cp2 ~530
    add('kicker', 678, 696, ease.kicker(0, 2.2, 678, 696), 0, 2.2);            // stepping stone hop 2a (gap 696-712)
    add('flat', 712, 754, ease.flat(1.0), 1.0, 1.0);                           // narrow platform
    add('kicker', 754, 772, ease.kicker(1.0, 3.2, 754, 772), 1.0, 3.2);        // hop 2b (gap 772-790)
    add('drop', 790, 820, ease.drop(1.2, 0, 790, 820), 1.2, 0);
    add('flat', 820, 1180, ease.flat(0), 0, 0);                                // clusters 4 (850, 895) and 5 (995, 1025, 1055); cp3 ~825, cp4 ~950
    add('kicker', 1180, 1204, ease.kicker(0, 3.0, 1180, 1204), 0, 3.0);        // victory hop (gap 1204-1226, bot-tuned from 26 m: the Ambulance fell short)
    add('drop', 1226, 1266, ease.drop(0.6, 0, 1226, 1266), 0.6, 0);
    add('flat', 1266, 1340, ease.flat(0), 0, 0);
    return { pieces: P, finishX: 1320, checkpoints: [{ x: 8 }, { x: 280 }, { x: 530 }, { x: 825 }, { x: 950 }], length: 1340, boosts: [{ x0: 276, x1: 284 }, { x0: 920, x1: 928 }] };
  }
  function buildLevel9(P, add) {   // PHOBOS LEAP (Mars gravity): long floaty jumps, rolling moon-hills, five big launches
    add('flat', 0, 100, ease.flat(0), 0, 0);
    add('kicker', 100, 124, ease.kicker(0, 3.0, 100, 124), 0, 3.0);              // jump 1 (gap 124-170)
    add('slope', 170, 194, ease.slope(2.4, 0, 170, 194), 2.4, 0);
    add('flat', 194, 360, ease.flat(0), 0, 0);                                  // cp1 ~300
    add('hills', 360, 450, ease.hills(0, 1.6, 30, 360), 0, 0);                  // moon hills: the car floats over every crest
    add('flat', 450, 480, ease.flat(0), 0, 0);
    add('kicker', 480, 506, ease.kicker(0, 4.4, 480, 506), 0, 4.4);              // jump 2 (gap 506-560)
    add('slope', 560, 596, ease.slope(3.4, 0, 560, 596), 3.4, 0);
    add('flat', 596, 770, ease.flat(0), 0, 0);                                  // cp2 ~700
    add('kicker', 770, 796, ease.kicker(0, 4.0, 770, 796), 0, 4.0);              // jump 3 up to a high platform (gap 796-846)
    add('flat', 846, 950, ease.flat(3.0), 3.0, 3.0);                            // platform, cp3 ~900
    add('kicker', 950, 976, ease.kicker(3.0, 7.0, 950, 976), 3.0, 7.0);          // jump 4, big (gap 976-1040)
    add('slope', 1040, 1084, ease.slope(5.6, 0, 1040, 1084), 5.6, 0);
    add('flat', 1084, 1320, ease.flat(0), 0, 0);                                // cp4 ~1250
    add('kicker', 1320, 1348, ease.kicker(0, 6.0, 1320, 1348), 0, 6.0);          // jump 5, grand finale (gap 1348-1410)
    add('slope', 1410, 1450, ease.slope(4.8, 0, 1410, 1450), 4.8, 0);
    add('flat', 1450, 1760, ease.flat(0), 0, 0);
    return { pieces: P, finishX: 1700, checkpoints: [{ x: 8 }, { x: 300 }, { x: 700 }, { x: 900 }, { x: 1250 }], length: 1760 };
  }
  function buildLevel10(P, add) {   // OLYMPUS FLOAT (Mars gravity): stepping-stone platforms, moon hills and a huge final launch
    add('flat', 0, 90, ease.flat(0), 0, 0);
    add('kicker', 90, 114, ease.kicker(0, 3.4, 90, 114), 0, 3.4);                // jump 1 up to stone A (gap 114-160)
    add('flat', 160, 240, ease.flat(2.0), 2.0, 2.0);                            // stepping stone A
    add('kicker', 240, 262, ease.kicker(2.0, 4.6, 240, 262), 2.0, 4.6);          // jump 2 (gap 262-302)
    add('slope', 302, 340, ease.slope(3.6, 0, 302, 340), 3.6, 0);
    add('flat', 340, 480, ease.flat(0), 0, 0);                                  // cp1 ~430
    add('hills', 480, 600, ease.hills(0, 1.5, 30, 480), 0, 0);
    add('flat', 600, 630, ease.flat(0), 0, 0);
    add('kicker', 630, 656, ease.kicker(0, 5.0, 630, 656), 0, 5.0);              // jump 3 up to stone B (gap 656-710)
    add('flat', 710, 820, ease.flat(3.5), 3.5, 3.5);                            // stepping stone B, cp2 ~790
    add('kicker', 820, 844, ease.kicker(3.5, 6.5, 820, 844), 3.5, 6.5);          // jump 4 (gap 844-900)
    add('flat', 900, 1000, ease.flat(4.0), 4.0, 4.0);                           // stepping stone C
    add('kicker', 1000, 1022, ease.kicker(4.0, 7.0, 1000, 1022), 4.0, 7.0);      // jump 5 (gap 1022-1072)
    add('drop', 1072, 1140, ease.drop(5.0, 0, 1072, 1140), 5.0, 0);
    add('flat', 1140, 1340, ease.flat(0), 0, 0);                                // cp3 ~1300
    add('hills', 1340, 1460, ease.hills(0, 1.6, 30, 1340), 0, 0);
    add('flat', 1460, 1500, ease.flat(0), 0, 0);                                // cp4 ~1480
    add('kicker', 1500, 1530, ease.kicker(0, 8.0, 1500, 1530), 0, 8.0);          // jump 6: the giant final launch (gap 1530-1605)
    add('drop', 1605, 1700, ease.drop(6.0, 0, 1605, 1700), 6.0, 0);
    add('flat', 1690, 1980, ease.flat(0), 0, 0);
    return { pieces: P, finishX: 1940, checkpoints: [{ x: 8 }, { x: 430 }, { x: 790 }, { x: 1300 }, { x: 1480 }], length: 1980 };
  }
  function buildLevel11(P, add) {   // METEOR ALLEY (Mars gravity + meteor storm): moon hills, four big launches and a long run-in
    add('flat', 0, 100, ease.flat(0), 0, 0);
    add('hills', 100, 190, ease.hills(0, 1.6, 30, 100), 0, 0);
    add('flat', 190, 220, ease.flat(0), 0, 0);
    add('kicker', 220, 246, ease.kicker(0, 4.4, 220, 246), 0, 4.4);              // jump 1 (gap 246-300)
    add('slope', 300, 336, ease.slope(3.4, 0, 300, 336), 3.4, 0);
    add('flat', 336, 520, ease.flat(0), 0, 0);                                  // cp1 ~420
    add('kicker', 520, 546, ease.kicker(0, 4.0, 520, 546), 0, 4.0);              // jump 2 up to a high platform (gap 546-596)
    add('flat', 596, 690, ease.flat(3.0), 3.0, 3.0);                            // platform, cp2 ~640
    add('kicker', 690, 716, ease.kicker(3.0, 7.0, 690, 716), 3.0, 7.0);          // jump 3, big (gap 716-780)
    add('slope', 780, 824, ease.slope(5.6, 0, 780, 824), 5.6, 0);
    add('flat', 824, 1000, ease.flat(0), 0, 0);                                 // cp3 ~900
    add('hills', 1000, 1090, ease.hills(0, 1.6, 30, 1000), 0, 0);
    add('flat', 1090, 1120, ease.flat(0), 0, 0);
    add('kicker', 1120, 1148, ease.kicker(0, 6.0, 1120, 1148), 0, 6.0);          // jump 4, grand finale (gap 1148-1210)
    add('slope', 1210, 1250, ease.slope(4.8, 0, 1210, 1250), 4.8, 0);
    add('flat', 1250, 1560, ease.flat(0), 0, 0);                                // cp4 ~1300
    return { pieces: P, finishX: 1500, checkpoints: [{ x: 8 }, { x: 420 }, { x: 640 }, { x: 900 }, { x: 1300 }], length: 1560, boosts: [{ x0: 430, x1: 438 }, { x0: 910, x1: 918 }, { x0: 1310, x1: 1318 }] };
  }
  function buildLevel15(P, add) {   // FROSTBITE SPIRAL (Mars cold): moon hills, a three-terrace spiral climb, a giant launch, a spiral descent and ramp jumps
    add('flat', 0, 90, ease.flat(0), 0, 0);
    add('hills', 90, 180, ease.hills(0, 1.1, 30, 90), 0, 0);
    add('flat', 180, 200, ease.flat(0), 0, 0);
    add('slope', 200, 290, ease.slope(0, 9, 200, 290), 0, 9);                    // SPIRAL CLIMB: three coils, each ends on a flat terrace
    add('flat', 290, 315, ease.flat(9), 9, 9);
    add('slope', 315, 405, ease.slope(9, 18, 315, 405), 9, 18);
    add('flat', 405, 430, ease.flat(18), 18, 18);
    add('slope', 430, 520, ease.slope(18, 27, 430, 520), 18, 27);
    add('flat', 520, 570, ease.flat(27), 27, 27);                               // cp2 ~545, tower top
    add('kicker', 570, 598, ease.kicker(27, 31, 570, 598), 27, 31);             // jump 1 off the tower (gap 598-660)
    add('drop', 660, 790, ease.drop(29, 6, 660, 790), 29, 6);
    add('slope', 790, 860, ease.slope(6, 0, 790, 860), 6, 0);                 // SPIRAL DESCENT
    add('flat', 860, 920, ease.flat(0), 0, 0);                                  // cp3 ~890
    add('kicker', 920, 946, ease.kicker(0, 4.2, 920, 946), 0, 4.2);             // jump 2 up to a stone (gap 946-996)
    add('flat', 996, 1070, ease.flat(2.0), 2.0, 2.0);
    add('kicker', 1070, 1094, ease.kicker(2.0, 6.0, 1070, 1094), 2.0, 6.0);     // jump 3 (gap 1094-1150)
    add('drop', 1150, 1220, ease.drop(4.0, 0, 1150, 1220), 4.0, 0);
    add('flat', 1220, 1330, ease.flat(0), 0, 0);                                // cp4 ~1260
    add('hills', 1330, 1420, ease.hills(0, 1.1, 30, 1330), 0, 0);
    add('flat', 1420, 1450, ease.flat(0), 0, 0);
    add('kicker', 1450, 1480, ease.kicker(0, 7.0, 1450, 1480), 0, 7.0);         // jump 4: the final launch (gap 1480-1550)
    add('drop', 1550, 1650, ease.drop(5.0, 0, 1550, 1650), 5.0, 0);
    add('flat', 1650, 1800, ease.flat(0), 0, 0);
    return { pieces: P, finishX: 1740, checkpoints: [{ x: 8 }, { x: 210 }, { x: 545 }, { x: 890 }, { x: 1260 }], length: 1800, boosts: [{ x0: 300, x1: 308 }, { x0: 415, x1: 423 }, { x0: 530, x1: 538 }, { x0: 1240, x1: 1248 }] };
  }
  function buildLevel16(P, add) {   // ABSOLUTE ZERO (Mars cold, hardest): two spiral towers, a huge launch, a spiral descent and a giant final ramp
    add('flat', 0, 90, ease.flat(0), 0, 0);
    add('kicker', 90, 116, ease.kicker(0, 4.0, 90, 116), 0, 4.0);               // jump 1 (gap 116-170)
    add('flat', 170, 250, ease.flat(2.0), 2.0, 2.0);
    add('slope', 250, 340, ease.slope(2.0, 11, 250, 340), 2.0, 11);             // SPIRAL TOWER 1
    add('flat', 340, 365, ease.flat(11), 11, 11);
    add('slope', 365, 455, ease.slope(11, 20, 365, 455), 11, 20);
    add('flat', 455, 480, ease.flat(20), 20, 20);
    add('slope', 480, 570, ease.slope(20, 29, 480, 570), 20, 29);
    add('flat', 570, 620, ease.flat(29), 29, 29);                               // cp2 ~595
    add('kicker', 620, 650, ease.kicker(29, 33, 620, 650), 29, 33);             // jump 2: huge launch off tower 1 (gap 650-695)
    add('drop', 695, 810, ease.drop(30, 5, 695, 810), 30, 5);
    add('slope', 810, 920, ease.slope(5, 0, 810, 920), 5, 0);                   // SPIRAL DESCENT
    add('flat', 920, 980, ease.flat(0), 0, 0);                                  // cp3 ~950
    add('hills', 980, 1070, ease.hills(0, 1.8, 30, 980), 0, 0);
    add('flat', 1070, 1100, ease.flat(0), 0, 0);
    add('kicker', 1100, 1126, ease.kicker(0, 4.6, 1100, 1126), 0, 4.6);         // jump 3 up to a stone (gap 1126-1180)
    add('flat', 1180, 1250, ease.flat(2.4), 2.4, 2.4);
    add('slope', 1250, 1340, ease.slope(2.4, 11, 1250, 1340), 2.4, 11);         // SPIRAL TOWER 2
    add('flat', 1340, 1365, ease.flat(11), 11, 11);
    add('slope', 1365, 1455, ease.slope(11, 20, 1365, 1455), 11, 20);
    add('flat', 1455, 1500, ease.flat(20), 20, 20);                             // cp4 ~1480
    add('kicker', 1500, 1530, ease.kicker(20, 24, 1500, 1530), 20, 24);         // jump 4 (gap 1530-1585)
    add('drop', 1585, 1700, ease.drop(21, 0, 1585, 1700), 21, 0);
    add('flat', 1700, 1740, ease.flat(0), 0, 0);
    add('kicker', 1740, 1772, ease.kicker(0, 6.0, 1740, 1772), 0, 6.0);         // jump 5: the giant final ramp (gap 1772-1835)
    add('drop', 1835, 1930, ease.drop(5.0, 0, 1835, 1930), 5.0, 0);
    add('flat', 1930, 2150, ease.flat(0), 0, 0);
    return { pieces: P, finishX: 2090, checkpoints: [{ x: 8 }, { x: 260 }, { x: 595 }, { x: 950 }, { x: 1480 }, { x: 1700 }], length: 2150, boosts: [{ x0: 350, x1: 358 }, { x0: 465, x1: 473 }, { x0: 580, x1: 588 }, { x0: 1350, x1: 1358 }, { x0: 1470, x1: 1478 }] };
  }
  function buildLevel12(P, add) {   // ARES STORM (Mars gravity + heavy meteor storm): stepping stones, hills, a giant launch and a final double jump
    add('flat', 0, 90, ease.flat(0), 0, 0);
    add('kicker', 90, 114, ease.kicker(0, 3.4, 90, 114), 0, 3.4);                // jump 1 up to stone A (gap 114-160)
    add('flat', 160, 240, ease.flat(2.0), 2.0, 2.0);
    add('kicker', 240, 262, ease.kicker(2.0, 4.6, 240, 262), 2.0, 4.6);          // jump 2 (gap 262-302)
    add('slope', 302, 340, ease.slope(3.6, 0, 302, 340), 3.6, 0);
    add('flat', 340, 440, ease.flat(0), 0, 0);                                  // cp1 ~400
    add('hills', 440, 560, ease.hills(0, 1.5, 30, 440), 0, 0);
    add('flat', 560, 590, ease.flat(0), 0, 0);
    add('kicker', 590, 616, ease.kicker(0, 5.0, 590, 616), 0, 5.0);              // jump 3 up to stone B (gap 616-670)
    add('flat', 670, 780, ease.flat(3.5), 3.5, 3.5);                            // cp2 ~740
    add('kicker', 780, 804, ease.kicker(3.5, 6.5, 780, 804), 3.5, 6.5);          // jump 4 (gap 804-860)
    add('flat', 860, 960, ease.flat(4.0), 4.0, 4.0);
    add('kicker', 960, 982, ease.kicker(4.0, 7.0, 960, 982), 4.0, 7.0);          // jump 5 (gap 982-1032)
    add('drop', 1032, 1100, ease.drop(5.0, 0, 1032, 1100), 5.0, 0);
    add('flat', 1100, 1260, ease.flat(0), 0, 0);                                // cp3 ~1180
    add('hills', 1260, 1380, ease.hills(0, 1.6, 30, 1260), 0, 0);
    add('flat', 1380, 1420, ease.flat(0), 0, 0);                                // cp4 ~1400
    add('kicker', 1420, 1450, ease.kicker(0, 8.0, 1420, 1450), 0, 8.0);          // jump 6: the giant launch (gap 1450-1525)
    add('drop', 1525, 1620, ease.drop(6.0, 0, 1525, 1620), 6.0, 0);
    add('flat', 1610, 1780, ease.flat(0), 0, 0);                                // cp5 ~1700
    add('kicker', 1780, 1804, ease.kicker(0, 5.0, 1780, 1804), 0, 5.0);          // jump 7: final jump (gap 1804-1856)
    add('slope', 1856, 1896, ease.slope(4.0, 0, 1856, 1896), 4.0, 0);
    add('flat', 1896, 2120, ease.flat(0), 0, 0);
    return { pieces: P, finishX: 2060, checkpoints: [{ x: 8 }, { x: 400 }, { x: 740 }, { x: 1180 }, { x: 1400 }, { x: 1700 }], length: 2120, boosts: [{ x0: 410, x1: 418 }, { x0: 1190, x1: 1198 }, { x0: 1710, x1: 1718 }] };
  }
  function buildLevel17(P, add) {   // TRANQUILITY HOP (Moon gravity 17%): enormous floaty jumps, crater dips and a long final launch
    add('flat', 0, 110, ease.flat(0), 0, 0);
    add('kicker', 110, 134, ease.kicker(0, 3.0, 110, 134), 0, 3.0);              // jump 1 (gap 134-234)
    add('slope', 234, 290, ease.slope(2.2, 0, 234, 290), 2.2, 0);
    add('flat', 290, 520, ease.flat(0), 0, 0);                                  // cp1 ~450
    add('hills', 520, 640, ease.hills(0, 1.4, 40, 520), 0, 0);
    add('flat', 640, 690, ease.flat(0), 0, 0);
    add('kicker', 690, 716, ease.kicker(0, 4.0, 690, 716), 0, 4.0);              // jump 2 (gap 716-836)
    add('slope', 836, 900, ease.slope(3.2, 0, 836, 900), 3.2, 0);
    add('flat', 900, 1130, ease.flat(0), 0, 0);                                 // cp2 ~1020
    add('kicker', 1130, 1156, ease.kicker(0, 4.4, 1130, 1156), 0, 4.4);          // jump 3 up to a platform (gap 1156-1270)
    add('flat', 1270, 1440, ease.flat(2.0), 2.0, 2.0);                          // platform, cp3 ~1350
    add('kicker', 1440, 1466, ease.kicker(2.0, 6.4, 1440, 1466), 2.0, 6.4);      // jump 4 (gap 1466-1590)
    add('slope', 1590, 1660, ease.slope(4.4, 0, 1590, 1660), 4.4, 0);
    add('flat', 1660, 1900, ease.flat(0), 0, 0);                                // cp4 ~1780
    add('crater', 1900, 2020, ease.crater(2.4, 1900, 2020), 0, 0);              // a shallow crater to roll through
    add('flat', 2020, 2080, ease.flat(0), 0, 0);
    add('kicker', 2080, 2112, ease.kicker(0, 6.0, 2080, 2112), 0, 6.0);          // jump 5: the grand lunar leap (gap 2112-2272)
    add('slope', 2272, 2352, ease.slope(5.0, 0, 2272, 2352), 5.0, 0);
    add('flat', 2352, 2650, ease.flat(0), 0, 0);
    return { pieces: P, finishX: 2590, checkpoints: [{ x: 8 }, { x: 450 }, { x: 1020 }, { x: 1350 }, { x: 1780 }], length: 2650, boosts: [{ x0: 440, x1: 448 }, { x0: 1010, x1: 1018 }, { x0: 1770, x1: 1778 }] };
  }
  function buildLevel18(P, add) {   // TYCHO CRATER RUN (Moon gravity 17% + micro-meteor storm): deep craters, stepping stones, a giant launch and a final hop
    add('flat', 0, 100, ease.flat(0), 0, 0);
    add('crater', 100, 190, ease.crater(3.0, 100, 190), 0, 0);
    add('flat', 190, 230, ease.flat(0), 0, 0);
    add('kicker', 230, 254, ease.kicker(0, 3.5, 230, 254), 0, 3.5);              // jump 1 (gap 254-364)
    add('slope', 364, 420, ease.slope(2.6, 0, 364, 420), 2.6, 0);
    add('flat', 420, 560, ease.flat(0), 0, 0);                                  // cp1 ~480
    add('crater', 560, 680, ease.crater(4.0, 560, 680), 0, 0);
    add('flat', 680, 720, ease.flat(0), 0, 0);
    add('kicker', 720, 746, ease.kicker(0, 5.0, 720, 746), 0, 5.0);              // jump 2 (gap 746-876)
    add('slope', 876, 936, ease.slope(4.0, 0, 876, 936), 4.0, 0);
    add('flat', 936, 1100, ease.flat(0), 0, 0);                                 // cp2 ~1010
    add('kicker', 1100, 1124, ease.kicker(0, 3.5, 1100, 1124), 0, 3.5);          // jump 3 up to a stone (gap 1124-1234)
    add('flat', 1234, 1380, ease.flat(3.0), 3.0, 3.0);                          // stone, cp3 ~1300
    add('kicker', 1380, 1406, ease.kicker(3.0, 7.4, 1380, 1406), 3.0, 7.4);      // jump 4 (gap 1406-1536)
    add('slope', 1536, 1596, ease.slope(5.0, 0, 1536, 1596), 5.0, 0);
    add('flat', 1596, 1760, ease.flat(0), 0, 0);                                // cp4 ~1680
    add('crater', 1760, 1880, ease.crater(4.5, 1760, 1880), 0, 0);
    add('flat', 1880, 1920, ease.flat(0), 0, 0);
    add('kicker', 1920, 1952, ease.kicker(0, 7.0, 1920, 1952), 0, 7.0);          // jump 5: the giant launch (gap 1952-2130)
    add('slope', 2130, 2210, ease.slope(6.0, 0, 2130, 2210), 6.0, 0);
    add('flat', 2210, 2400, ease.flat(0), 0, 0);                                // cp5 ~2300
    add('kicker', 2400, 2426, ease.kicker(0, 4.4, 2400, 2426), 0, 4.4);          // jump 6: the final hop (gap 2426-2556)
    add('slope', 2556, 2610, ease.slope(3.4, 0, 2556, 2610), 3.4, 0);
    add('flat', 2610, 2900, ease.flat(0), 0, 0);
    return { pieces: P, finishX: 2840, checkpoints: [{ x: 8 }, { x: 480 }, { x: 1010 }, { x: 1300 }, { x: 1680 }, { x: 2300 }], length: 2900, boosts: [{ x0: 470, x1: 478 }, { x0: 1000, x1: 1008 }, { x0: 1670, x1: 1678 }, { x0: 2290, x1: 2298 }] };
  }
  function buildLevel19(P, add) {   // MARE ASCENT (Moon gravity 17%, hard): ramp stairs, a spiral tower climb, a huge tower launch, a spiral descent and a giant final ramp
    add('flat', 0, 100, ease.flat(0), 0, 0);
    add('kicker', 100, 126, ease.kicker(0, 4.4, 100, 126), 0, 4.4);              // ramp 1 up to platform A (gap 126-240)
    add('flat', 240, 330, ease.flat(2.0), 2.0, 2.0);                            // cp1 ~290
    add('kicker', 330, 356, ease.kicker(2.0, 6.4, 330, 356), 2.0, 6.4);          // ramp 2 (gap 356-480)
    add('slope', 480, 550, ease.slope(4.4, 0, 480, 550), 4.4, 0);
    add('flat', 550, 640, ease.flat(0), 0, 0);
    add('slope', 640, 730, ease.slope(0, 9, 640, 730), 0, 9);                   // SPIRAL TOWER: three coils, a terrace after each
    add('flat', 730, 755, ease.flat(9), 9, 9);
    add('slope', 755, 845, ease.slope(9, 18, 755, 845), 9, 18);
    add('flat', 845, 870, ease.flat(18), 18, 18);
    add('slope', 870, 960, ease.slope(18, 27, 870, 960), 18, 27);
    add('flat', 960, 1020, ease.flat(27), 27, 27);                              // cp2 ~990, tower top
    add('kicker', 1020, 1052, ease.kicker(27, 31, 1020, 1052), 27, 31);          // launch off the tower
    add('drop', 1150, 1330, ease.drop(29, 4, 1150, 1330), 29, 4);               // long landing ramp
    add('slope', 1330, 1420, ease.slope(4, 0, 1330, 1420), 4, 0);               // SPIRAL DESCENT
    add('flat', 1420, 1520, ease.flat(0), 0, 0);                                // cp3 ~1470
    add('crater', 1520, 1640, ease.crater(3.2, 1520, 1640), 0, 0);
    add('flat', 1640, 1700, ease.flat(0), 0, 0);
    add('kicker', 1700, 1726, ease.kicker(0, 5.0, 1700, 1726), 0, 5.0);          // ramp 3 (gap 1726-1850)
    add('slope', 1850, 1910, ease.slope(4.0, 0, 1850, 1910), 4.0, 0);
    add('flat', 1910, 2000, ease.flat(0), 0, 0);                                // cp4 ~1950
    add('kicker', 2000, 2032, ease.kicker(0, 7.0, 2000, 2032), 0, 7.0);          // ramp 4: the giant ramp (gap 2032-2210)
    add('slope', 2210, 2290, ease.slope(6.0, 0, 2210, 2290), 6.0, 0);
    add('flat', 2290, 2600, ease.flat(0), 0, 0);
    return { pieces: P, finishX: 2540, checkpoints: [{ x: 8 }, { x: 290 }, { x: 990 }, { x: 1470 }, { x: 1950 }], length: 2600, boosts: [{ x0: 280, x1: 288 }, { x0: 740, x1: 748 }, { x0: 855, x1: 863 }, { x0: 980, x1: 988 }, { x0: 1940, x1: 1948 }] };
  }
  function buildLevel21(P, add) {   // SPACE ORBIT (race track, Moon gravity 17%): crater, jump, rolling hills, a spiral tower climb, a tower launch, a long descent, a crater and a final ramp (proven pieces of levels 18/19)
    add('flat', 0, 100, ease.flat(0), 0, 0);
    add('crater', 100, 190, ease.crater(3.0, 100, 190), 0, 0);
    add('flat', 190, 230, ease.flat(0), 0, 0);
    add('kicker', 230, 254, ease.kicker(0, 3.5, 230, 254), 0, 3.5);              // jump 1 (gap 254-364)
    add('slope', 364, 420, ease.slope(2.6, 0, 364, 420), 2.6, 0);
    add('flat', 420, 520, ease.flat(0), 0, 0);                                  // cp1 ~470
    add('hills', 520, 600, ease.hills(0, 1.2, 40, 520), 0, 0);
    add('flat', 600, 640, ease.flat(0), 0, 0);
    add('slope', 640, 730, ease.slope(0, 9, 640, 730), 0, 9);                   // SPIRAL TOWER: three coils, a terrace after each
    add('flat', 730, 755, ease.flat(9), 9, 9);
    add('slope', 755, 845, ease.slope(9, 18, 755, 845), 9, 18);
    add('flat', 845, 870, ease.flat(18), 18, 18);
    add('slope', 870, 960, ease.slope(18, 27, 870, 960), 18, 27);
    add('flat', 960, 1020, ease.flat(27), 27, 27);                              // cp2 ~990, tower top
    add('kicker', 1020, 1052, ease.kicker(27, 31, 1020, 1052), 27, 31);          // launch off the tower
    add('drop', 1150, 1330, ease.drop(29, 4, 1150, 1330), 29, 4);               // long landing ramp
    add('slope', 1330, 1420, ease.slope(4, 0, 1330, 1420), 4, 0);
    add('flat', 1420, 1520, ease.flat(0), 0, 0);                                // cp3 ~1470
    add('crater', 1520, 1640, ease.crater(3.2, 1520, 1640), 0, 0);
    add('flat', 1640, 1700, ease.flat(0), 0, 0);
    add('kicker', 1700, 1726, ease.kicker(0, 4.2, 1700, 1726), 0, 4.2);          // final ramp (gap 1726-1850)
    add('slope', 1850, 1950, ease.slope(3.4, 0, 1850, 1950), 3.4, 0);
    add('flat', 1950, 2050, ease.flat(0), 0, 0);
    return { pieces: P, finishX: 2000, checkpoints: [{ x: 8 }, { x: 470 }, { x: 990 }, { x: 1470 }], length: 2050, boosts: [{ x0: 460, x1: 468 }, { x0: 740, x1: 748 }, { x0: 855, x1: 863 }, { x0: 980, x1: 988 }, { x0: 1460, x1: 1468 }] };
  }
  function buildLevel20(P, add) {   // MOON COLLAPSE (Moon gravity 17% + heavy meteor storm, hardest): the Moon is breaking apart; two spiral towers, chained ramps, craters and a final giant launch to the Hover pad
    add('flat', 0, 90, ease.flat(0), 0, 0);
    add('crater', 90, 180, ease.crater(3.0, 90, 180), 0, 0);
    add('flat', 180, 220, ease.flat(0), 0, 0);
    add('kicker', 220, 246, ease.kicker(0, 4.4, 220, 246), 0, 4.4);              // ramp 1 up to platform (gap 246-360)
    add('flat', 360, 440, ease.flat(2.0), 2.0, 2.0);                            // cp1 ~400
    add('kicker', 440, 466, ease.kicker(2.0, 6.4, 440, 466), 2.0, 6.4);          // ramp 2 (gap 466-590)
    add('slope', 590, 660, ease.slope(4.4, 0, 590, 660), 4.4, 0);
    add('flat', 660, 740, ease.flat(0), 0, 0);
    add('slope', 740, 830, ease.slope(0, 9, 740, 830), 0, 9);                   // SPIRAL TOWER 1
    add('flat', 830, 855, ease.flat(9), 9, 9);
    add('slope', 855, 945, ease.slope(9, 18, 855, 945), 9, 18);
    add('flat', 945, 970, ease.flat(18), 18, 18);
    add('slope', 970, 1060, ease.slope(18, 27, 970, 1060), 18, 27);
    add('flat', 1060, 1120, ease.flat(27), 27, 27);                             // cp2 ~1090
    add('kicker', 1120, 1152, ease.kicker(27, 31, 1120, 1152), 27, 31);          // launch off tower 1
    add('drop', 1250, 1430, ease.drop(29, 4, 1250, 1430), 29, 4);
    add('slope', 1430, 1520, ease.slope(4, 0, 1430, 1520), 4, 0);               // SPIRAL DESCENT
    add('flat', 1520, 1600, ease.flat(0), 0, 0);                                // cp3 ~1560
    add('crater', 1600, 1720, ease.crater(4.5, 1600, 1720), 0, 0);
    add('flat', 1720, 1760, ease.flat(0), 0, 0);
    add('kicker', 1760, 1792, ease.kicker(0, 7.0, 1760, 1792), 0, 7.0);          // giant ramp 3 (gap 1792-1970)
    add('slope', 1970, 2050, ease.slope(6.0, 0, 1970, 2050), 6.0, 0);
    add('flat', 2050, 2150, ease.flat(0), 0, 0);                                // cp4 ~2100
    add('slope', 2150, 2240, ease.slope(0, 12, 2150, 2240), 0, 12);             // SPIRAL TOWER 2 (taller, 3 coils)
    add('flat', 2240, 2265, ease.flat(12), 12, 12);
    add('slope', 2265, 2355, ease.slope(12, 24, 2265, 2355), 12, 24);
    add('flat', 2355, 2380, ease.flat(24), 24, 24);
    add('slope', 2380, 2470, ease.slope(24, 36, 2380, 2470), 24, 36);
    add('flat', 2470, 2530, ease.flat(36), 36, 36);                             // cp5 ~2500
    add('kicker', 2530, 2562, ease.kicker(36, 40, 2530, 2562), 36, 40);          // launch off tower 2
    add('drop', 2660, 2850, ease.drop(38, 3, 2660, 2850), 38, 3);
    add('slope', 2850, 2920, ease.slope(3, 0, 2850, 2920), 3, 0);
    add('flat', 2920, 3010, ease.flat(0), 0, 0);                                // cp6 ~2960
    add('kicker', 3010, 3036, ease.kicker(0, 5.0, 3010, 3036), 0, 5.0);          // ramp 4 (gap 3036-3160)
    add('slope', 3160, 3220, ease.slope(4.0, 0, 3160, 3220), 4.0, 0);
    add('flat', 3220, 3320, ease.flat(0), 0, 0);
    add('kicker', 3320, 3352, ease.kicker(0, 7.0, 3320, 3352), 0, 7.0);          // final giant ramp 5 (gap 3352-3530)
    add('slope', 3530, 3610, ease.slope(6.0, 0, 3530, 3610), 6.0, 0);
    add('flat', 3610, 3900, ease.flat(0), 0, 0);                                // launch pad
    return { pieces: P, finishX: 3800, checkpoints: [{ x: 8 }, { x: 400 }, { x: 1090 }, { x: 1560 }, { x: 2100 }, { x: 2500 }, { x: 2960 }], length: 3900, boosts: [{ x0: 390, x1: 398 }, { x0: 840, x1: 848 }, { x0: 955, x1: 963 }, { x0: 1080, x1: 1088 }, { x0: 1550, x1: 1558 }, { x0: 2090, x1: 2098 }, { x0: 2250, x1: 2258 }, { x0: 2365, x1: 2373 }, { x0: 2490, x1: 2498 }, { x0: 2950, x1: 2958 }, { x0: 3210, x1: 3218 }] };
  }
  /* ---------- Curved road: turn / bank only bend the 3D centreline; the physics stays 2D along s ---------- */
  // Heading psi grows to the left. Curvature follows 1/R with R easing linearly from radius[0] to radius[1], faded in/out over
  // TURN_RAMP metres and rescaled so the segment turns by exactly `turn` degrees. Bank (degrees, + = inner edge low) eases in/out over BANK_RAMP.
  const PATH_DS = 0.5, TURN_RAMP = 14, BANK_RAMP = 25;
  const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  function buildPath(track) {
    const segs = track.pieces.filter((p) => p.turn || p.bank);
    if (!segs.length) return null;
    const n = Math.ceil(track.length / PATH_DS) + 1;
    const kappa = new Float64Array(n), bank = new Float64Array(n);
    for (const p of segs) {
      const sgn = p.turn < 0 ? -1 : 1, r = p.radius || [50, 50], len = p.x1 - p.x0;
      const shape = (s) => { const t = (s - p.x0) / len; return smooth((s - p.x0) / TURN_RAMP) * smooth((p.x1 - s) / TURN_RAMP) / (r[0] + (r[1] - r[0]) * t); };
      let I = 0; for (let s = p.x0; s < p.x1; s += 0.05) I += shape(s) * 0.05;
      const k = p.turn ? Math.abs(p.turn) * Math.PI / 180 / I : 0, bk = p.bank || [0, 0];
      for (let i = 0; i < n; i++) {
        const s = i * PATH_DS; if (s < p.x0 || s > p.x1) continue;
        const t = (s - p.x0) / len, fade = smooth((s - p.x0) / BANK_RAMP) * smooth((p.x1 - s) / BANK_RAMP);
        if (p.turn) kappa[i] = sgn * k * shape(s);
        bank[i] = sgn * (bk[0] + (bk[1] - bk[0]) * t) * fade * Math.PI / 180;
      }
    }
    const X = new Float64Array(n), Z = new Float64Array(n), PSI = new Float64Array(n);
    for (let i = 1; i < n; i++) {
      PSI[i] = PSI[i - 1] + kappa[i - 1] * PATH_DS;
      const pm = (PSI[i] + PSI[i - 1]) / 2;
      X[i] = X[i - 1] + Math.cos(pm) * PATH_DS; Z[i] = Z[i - 1] - Math.sin(pm) * PATH_DS;
    }
    // at(s): centreline x/z (world), heading psi and bank. Beyond the ends the road simply continues straight.
    function at(s, out) {
      out = out || {};
      if (s <= 0) { out.x = s; out.z = 0; out.psi = 0; out.bank = 0; return out; }
      const f = s / PATH_DS; let i = Math.floor(f);
      if (i >= n - 1) { const e = s - (n - 1) * PATH_DS, ps = PSI[n - 1]; out.x = X[n - 1] + Math.cos(ps) * e; out.z = Z[n - 1] - Math.sin(ps) * e; out.psi = ps; out.bank = 0; return out; }
      const u = f - i;
      out.x = X[i] + (X[i + 1] - X[i]) * u; out.z = Z[i] + (Z[i + 1] - Z[i]) * u;
      out.psi = PSI[i] + (PSI[i + 1] - PSI[i]) * u; out.bank = bank[i] + (bank[i + 1] - bank[i]) * u;
      return out;
    }
    return { at, n, ds: PATH_DS, X, Z, PSI, bank };
  }
  function makeGround(track) {
    const P = track.pieces;
    return function ground(x) {
      for (let i = 0; i < P.length; i++) if (x >= P[i].x0 && x <= P[i].x1) return P[i].fn(x);
      return null;
    };
  }
  function slopeAt(ground, x) {
    const a = ground(x - 0.12), b = ground(x + 0.12);
    if (a !== null && b !== null) return (b - a) / 0.24;
    const c = ground(x);
    if (c === null) return 0;
    if (a !== null) return (c - a) / 0.12;
    if (b !== null) return (b - c) / 0.12;
    return 0;
  }

  /* ---------- Car ---------- */
  const BODY_POINTS = [ // chassis points that must never touch the track (local, scaled units)
    [-0.55, 1.12], [0.3, 1.12], [1.1, 0.78],    // roof / windshield
    [2.0, 0.42], [-2.3, 0.4],                  // nose / tail
  ];
  class Car {
    constructor(ground) { this.ground = ground; this.g = G; this.flipT = 0; this.pads = null; this.p = Object.assign({}, NEUTRAL); this.coldK = 0; this.tw = 0; this.reset(0, 0, 0); }
    setStats(p) { this.p = Object.assign({}, NEUTRAL, p); }
    reset(x, y, vx) {
      this.x = x; this.y = y; this.vx = vx; this.vy = 0; this.th = Math.atan(slopeAt(this.ground, x)); this.w = 0;
      this.grounded = false; this.air = 0; this.spin = 0; this.engineOff = false; this.crashed = false; this.crashReason = '';
      this.surge = false; this.onPad = -1; this.events = []; this.wheelSpin = 0; this.contact = [false, false]; this.maxImpact = 0;
    }
    spawn(x, v0) {
      const h = this.ground(x) || 0, th = Math.atan(slopeAt(this.ground, x)), v = v0 === undefined ? 7 : v0;
      this.reset(x, h + R + 0.1, v); this.th = th; this.vx = v * Math.cos(th); this.vy = v * Math.sin(th);
    }
    local(lx, ly) {
      const c = Math.cos(this.th), s = Math.sin(this.th);
      return [this.x + lx * c - ly * s, this.y + lx * s + ly * c];
    }
    step(dt, inp) {
      if (this.crashed) return;
      const P = this.p, cold = this.coldK * (1 - P.coldGuard), vmax = VMAX * P.vmax * (1 + 0.15 * P.coldBoost * this.coldK), eOn = !this.engineOff;
      this.tw += dt;
      const eMul = (1 + P.coldBoost * this.coldK) * (1 - 0.3 * cold * (0.55 + 0.45 * Math.sin(this.tw * 2.1)));   // Mars cold: the engine stutters, Hover spools up faster
      let Fx = 0, Fy = -this.g * P.gScale, tau = 0, flip = 0, groundedNow = false, impact = 0, relAngle = 0;
      const cth = Math.cos(this.th), sth = Math.sin(this.th);
      const wheels = [-HALF_BASE, HALF_BASE];
      for (let i = 0; i < 2; i++) {
        this.contact[i] = false;
        const lx = wheels[i], ax = this.x + lx * cth, ay = this.y + lx * sth;
        const h = this.ground(ax);
        if (h === null) continue;
        const d = ay - h;
        if (d < -0.2) { this.crash('hit a wall'); return; }
        if (d >= LMAX) continue;
        const s = slopeAt(this.ground, ax), il = 1 / Math.sqrt(1 + s * s);
        const nx = -s * il, ny = il, tx = il, ty = s * il;
        const rx = ax - this.x, ry = ay - this.y;
        const px = this.vx - this.w * ry, py = this.vy + this.w * rx;
        const vn = px * nx + py * ny, vt = px * tx + py * ty;
        const comp = LMAX - d;
        let Fn = K * comp - C * P.landDamp * vn + 900 * Math.max(0, comp - 0.3) ** 2;
        if (Fn < 0) Fn = 0;
        let Ft = -ROLL * vt;
        const nit = (inp.nitro && eOn) ? 1 : 0, gas = ((inp.gas && eOn) || nit) ? 1 : 0, br = inp.brake ? 1 : 0;
        if (nit) this.surge = true; else if (vt < vmax) this.surge = false;
        if (gas) Ft += (ENGINE * P.engine * eMul / 2) * (nit ? 1.7 * P.nitroPow : 1) * Math.max(0, 1 - vt / (nit ? vmax * 1.25 : vmax));
        if (!nit && this.surge && vt > vmax) Ft -= 0.25 * (vt - vmax);   // nitro speed bleeds off, so it's a surge, not a new top speed
        if (br) { if (vt > 0.8) Ft -= (BRAKE / 2); else Ft -= (ENGINE / 3) * Math.max(0, 1 + vt / 9); }
        const fx = Fn * nx + Ft * tx, fy = Fn * ny + Ft * ty;
        Fx += fx; Fy += fy; tau += rx * fy - ry * fx;
        this.contact[i] = true; groundedNow = true;
        if (vn < 0) impact = Math.max(impact, -vn);
        relAngle = this.th - Math.atan(s); relAngle -= Math.PI * 2 * Math.round(relAngle / (Math.PI * 2));   // wrap so a completed flip lands as a clean landing
        this.wheelSpin += vt * dt / R * 0.5;
      }
      if (cold > 0) {   // Mars cold: the tyres slide and the chassis wobbles, so the car fights you
        if (groundedNow) { Fx += cold * 6 * Math.sin(this.tw * 1.7) * Math.sin(this.tw * 0.61 + 1); tau += cold * 3 * (Math.sin(this.tw * 2.3) + 0.6 * Math.sin(this.tw * 5.3)); }
        else tau += cold * 1.6 * Math.sin(this.tw * 1.9);
      }
      // boost pads: a short strip of extra push along the road, plus a surge flag so the speed bleeds back off like nitro
      if (groundedNow && this.pads) {
        let on = -1;
        for (let k = 0; k < this.pads.length; k++) if (this.x >= this.pads[k].x0 && this.x <= this.pads[k].x1) { on = k; break; }
        if (on >= 0) {
          Fx += PAD_ACC * cth; Fy += PAD_ACC * sth; this.surge = true;
          if (this.onPad !== on) this.events.push({ type: 'boost', pad: on });
        }
        this.onPad = on;
      }
      // air control & damping
      if (!groundedNow) {
        tau += ((inp.tiltUp ? 1 : 0) - (inp.tiltDown ? 1 : 0)) * AIR_TORQUE * P.airTorque;
        tau -= this.w * AIR_DAMP * P.airDamp;
        flip = (inp.flipL ? 1 : 0) - (inp.flipR ? 1 : 0);   // Left Flip = backflip (nose up), Right Flip = frontflip (nose down)
        if (flip) this.flipT = 0.5; else if (this.flipT > 0) { this.flipT -= dt; this.w *= Math.exp(-7 * dt); }   // letting go of a flip button brakes the spin so a flip ends in a clean rotation
        if (flip) { const dw = flip * FLIP_W - this.w, mx = FLIP_ACC * dt; this.w += Math.abs(dw) < mx ? dw : Math.sign(dw) * mx; }
      } else tau -= this.w * GROUND_ANG_DAMP * P.groundAngDamp;
      this.vx += Fx * dt; this.vy += Fy * dt; this.w += (tau / (INERTIA * P.inertia)) * dt;
      const wm = flip ? Math.max(W_MAX * P.wMax, FLIP_W) : W_MAX * P.wMax; if (this.w > wm) this.w = wm; else if (this.w < -wm) this.w = -wm;
      this.x += this.vx * dt; this.y += this.vy * dt; this.th += this.w * dt;

      // grounded/airborne transitions
      if (groundedNow) {
        if (!this.grounded && this.air > 0.35) this.land(impact, relAngle);
        else if (!this.grounded) this.spin = 0;
        this.grounded = true; this.air = 0;
        if (Math.abs(relAngle) > P.badAngle) { this.crash('bad landing'); return; }
      } else { this.grounded = false; this.air += dt; this.spin += this.w * dt; }
      // chassis vs. track
      for (const p of BODY_POINTS) {
        const q = this.local(p[0], p[1]), h = this.ground(q[0]);
        if (h !== null && q[1] < h + 0.02) { this.crash(p[1] > 0.7 ? 'landed on the roof' : 'nose-dived'); return; }
      }
      if (this.y < -25) this.crash('fell off the track');
    }
    land(impact, relAngle) {
      const a = Math.abs(relAngle) * 180 / Math.PI;
      const flips = Math.floor(Math.abs(this.spin) / (Math.PI * 2) + 0.15);
      const T = this.p.landTol; let q = 'HARD LANDING';
      if (a < 9 * T && impact < 9 * T) q = 'PERFECT LANDING'; else if (a < 22 * T && impact < 14 * T) q = 'GOOD LANDING';
      if (this.p.landLoss > 0 && impact > 5) this.vx *= 1 - this.p.landLoss * Math.min(1, impact / 12);
      this.events.push({ type: 'land', x: this.x, quality: q, air: this.air, flips, dir: this.spin > 0 ? 'BACKFLIP' : 'FRONTFLIP', impact });
      this.spin = 0;
    }
    crash(reason) { this.crashed = true; this.crashReason = reason; this.events.push({ type: 'crash', reason }); }
    speed() { return Math.hypot(this.vx, this.vy); }
  }
  return { MARS_G: G * 0.38, MOON_G: G * 0.17, Car, statsFor, CAR_STATS, UPGRADES, NEUTRAL, buildTrack, buildPath, makeGround, slopeAt, R, HALF_BASE, G, VMAX, BODY_POINTS };
})();
if (typeof module !== 'undefined') module.exports = Phys;
