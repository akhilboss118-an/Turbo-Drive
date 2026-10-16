/* eslint-disable */
/* INFINITE LOOP circuit: a closed figure-eight style course (one bridge crossing), built from a hand-traced centre line.
   Physics stays 2D along s; the world path wraps (s mod LP) so finish line == start line and a lap restart is seamless. */
const LoopTrack = (function () {
  const SC = 0.9;                           // metres per map unit
  const STEP = 0.5;
  // map units, y grows downwards on the minimap (x -> world x, y -> world z)
  const CTRL = [
    [160, 250], [158, 170], [158, 86], [162, 70], [174, 59], [189, 55], [204, 59], [216, 70],
    [220, 86], [221, 130], [221, 200], [223, 285], [233, 338], [252, 372], [292, 392], [335, 400],
    [385, 390], [428, 368], [454, 336], [458, 296], [442, 246], [412, 202], [378, 160], [352, 118],
    [332, 61], [326, 45], [314, 34], [298, 30], [282, 34], [270, 45], [264, 61], [262, 120],
    [268, 175], [275, 232], [270, 282], [254, 326], [243, 372], [236, 428], [218, 482], [185, 514],
    [140, 522], [85, 506], [40, 470], [22, 432], [32, 405], [62, 392], [96, 390], [128, 400],
    [156, 410], [178, 398], [188, 362], [182, 312], [168, 280],
  ];
  function catmull(P, perSeg) {
    const n = P.length, out = [];
    for (let i = 0; i < n; i++) {
      const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
      for (let k = 0; k < perSeg; k++) {
        const t = k / perSeg, t2 = t * t, t3 = t2 * t;
        out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
      }
    }
    return out;
  }
  function resample(pts, N) {   // closed polyline -> N uniform arclength samples
    const m = pts.length, cum = [0];
    for (let i = 0; i < m; i++) { const a = pts[i], b = pts[(i + 1) % m]; cum.push(cum[i] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
    const L = cum[m], out = []; let j = 0;
    for (let i = 0; i < N; i++) {
      const s = L * i / N; while (cum[j + 1] < s) j++;
      const a = pts[j], b = pts[(j + 1) % m], u = (s - cum[j]) / Math.max(1e-9, cum[j + 1] - cum[j]);
      out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
    }
    return { pts: out, L };
  }
  function smooth(pts, sigmaSamples) {
    const n = pts.length, R = Math.ceil(sigmaSamples * 3), w = [];
    let tot = 0; for (let k = -R; k <= R; k++) { const v = Math.exp(-k * k / (2 * sigmaSamples * sigmaSamples)); w.push(v); tot += v; }
    return pts.map((_, i) => { let x = 0, z = 0; for (let k = -R; k <= R; k++) { const q = pts[(i + k + n * 4) % n]; x += q[0] * w[k + R]; z += q[1] * w[k + R]; } return [x / tot, z / tot]; });
  }
  function buildCenter() {
    const P = CTRL.map((p) => [p[0] * SC, p[1] * SC]);
    let r = resample(catmull(P, 40), 6000);
    let pts = smooth(r.pts, 10 / (r.L / 6000));          // ~10 m gaussian: removes the Catmull-Rom corners
    r = resample(pts, Math.round(r.L / STEP));
    return r;
  }
  function build() {
    const r = buildCenter(), n = r.pts.length, LP = r.L, ds = LP / n;
    const X = new Float64Array(n + 1), Z = new Float64Array(n + 1), PSI = new Float64Array(n + 1);
    for (let i = 0; i <= n; i++) { const q = r.pts[i % n]; X[i] = q[0]; Z[i] = q[1]; }
    let prev = 0;
    for (let i = 0; i <= n; i++) {
      const a = r.pts[(i + n - 1) % n], b = r.pts[(i + 1) % n];
      let ps = Math.atan2(-(b[1] - a[1]), b[0] - a[0]);
      if (i) { while (ps - prev > Math.PI) ps -= 2 * Math.PI; while (ps - prev < -Math.PI) ps += 2 * Math.PI; }
      PSI[i] = prev = ps;
    }
    const bank = new Float64Array(n + 1);
    for (let i = 0; i <= n; i++) {       // gentle banking into the bends (same sign convention as the other curved levels)
      const k = (PSI[Math.min(n, i + 6)] - PSI[Math.max(0, i - 6)]) / (12 * ds);
      bank[i] = Math.max(-0.1, Math.min(0.1, k * 2.2));
    }
    for (let it = 0; it < 6; it++) { const c = bank.slice(); for (let i = 1; i < n; i++) bank[i] = (c[i - 1] + c[i] * 2 + c[i + 1]) / 4; }
    bank[0] = bank[n] = (bank[0] + bank[n]) / 2;
    function at(s, out) {
      out = out || {};
      s = ((s % LP) + LP) % LP;
      const f = s / ds; let i = Math.floor(f); if (i >= n) i = n - 1; const u = f - i;
      out.x = X[i] + (X[i + 1] - X[i]) * u; out.z = Z[i] + (Z[i + 1] - Z[i]) * u;
      out.psi = PSI[i] + (PSI[i + 1] - PSI[i]) * u; out.bank = bank[i] + (bank[i + 1] - bank[i]) * u;
      return out;
    }
    return { at, n, ds, X, Z, PSI, bank, LP, loop: true };
  }
  // where the centre line crosses itself: [sA, sB] (arclength of the two passes)
  function findCrossing(path) {
    let best = 1e9, bi = 0, bj = 0; const n = path.n, st = 4;
    for (let i = 0; i < n; i += st) for (let j = i + Math.round(300 / path.ds); j < n; j += st) {
      if (n - (j - i) < 300 / path.ds) continue;
      const d = Math.hypot(path.X[i] - path.X[j], path.Z[i] - path.Z[j]);
      if (d < best) { best = d; bi = i; bj = j; }
    }
    return { sA: bi * path.ds, sB: bj * path.ds, d: best };
  }
  const sm = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  let cache = null;
  function layout() {
    if (cache) return cache;
    const path = build(), LP = path.LP, X = findCrossing(path), sB = X.sB, sA = X.sA;
    const DECK = 6.0, PLAT = 30, RAMP = 80;
    const hillZones = [[110, 430], [560, 930], [1000, 1190], [1480, 1900]];
    const H0 = (s) => {
      let h = DECK * sm((s - (sB - PLAT - RAMP)) / RAMP) * sm(((sB + PLAT + RAMP) - s) / RAMP);
      for (const z of hillZones) { const f = sm((s - z[0]) / 40) * sm((z[1] - s) / 40); if (f > 0) h += f * 0.55 * (1 - Math.cos(((s - z[0]) / 70) * Math.PI * 2)); }
      return h;
    };
    const H = (s) => H0(((s % LP) + LP) % LP);
    const slow = [
      { kind: 'oil', x0: 100, x1: 124 }, { kind: 'sand', x0: 300, x1: 338 }, { kind: 'mud', x0: 565, x1: 597 },
      { kind: 'oil', x0: 705, x1: 729 }, { kind: 'sand', x0: 905, x1: 943 }, { kind: 'mud', x0: 1015, x1: 1047 },
      { kind: 'oil', x0: 1180, x1: 1204 }, { kind: 'sand', x0: 1590, x1: 1628 }, { kind: 'oil', x0: 1665, x1: 1689 }, { kind: 'mud', x0: 1795, x1: 1827 },
    ];
    const ZP = { oil: { vz: 19, k: 2.6 }, sand: { vz: 21, k: 2.0 }, mud: { vz: 15, k: 3.0 } };
    for (const z of slow) Object.assign(z, ZP[z.kind]);
    const cones = [165, 395, 785, 815, 1115, 1505, 1725, 1905].map((x) => ({ x }));
    const boosts = [{ x0: 436, x1: 444 }, { x0: 842, x1: 850 }, { x0: 1470, x1: 1478 }, { x0: 1955, x1: 1963 }];
    cache = { path, LP, sA, sB, H, slow, cones, boosts, START: 8, DECK, PLAT, RAMP };
    return cache;
  }
  return { build, findCrossing, layout, CTRL };
})();
if (typeof module !== 'undefined') module.exports = LoopTrack;
