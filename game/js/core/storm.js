/* eslint-disable */
'use strict';
/* Meteor storm logic (no rendering): a storm front chases the car; meteors rain around it. Outrun it with nitro. */
const Storm = (function () {
  const FALL_H = 46, FALL_T = 0.8, DRIFT = 7, ROAD_Z = 3.6, HIT_X = 2.1, HIT_Y = 1.7, HIT_Z = 1.6;
  const DEFAULT = { v: 32, gapMax: 30, maxBoost: 8, rate: 15, back: 24, ahead: 8, amb: 6, start: 60, grace: 3, slow: 0.66, air: 0.85, inv: 1.3, fuelLoss: 0.22 };
  function calmZones(pieces) {   // meteors stay harmless around every jump so a hit can never ruin a launch or landing
    const z = []; (pieces || []).forEach((p, i) => { if (p.type === 'kicker') z.push([p.x0 - 50, (pieces[i + 1] ? pieces[i + 1].x0 : p.x1) + 55]); }); return z;
  }
  class StormSim {
    constructor(cfg, rand, pieces) { this.calm = calmZones(pieces); this.cfg = Object.assign({}, DEFAULT, cfg || {}); this.rand = rand || Math.random; this.list = []; this.events = []; this.reset(0); }
    reset(x) { this.front = x - this.cfg.start; this.list.length = 0; this.acc = 0; this.amb = 0; this.inv = 0; this.hits = 0; this.t = 0; }
    gap(carX) { return carX - this.front; }
    inCalm(x) { for (const k of this.calm) if (x >= k[0] && x <= k[1]) return true; return false; }
    spawn(ix, z, harmless, ground) {
      const iy = ground(ix); if (iy === null) return;
      if (!harmless && this.inCalm(ix)) { harmless = true; z = (z < 0 ? -1 : 1) * (2.8 + Math.abs(z) * 0.4); }
      this.list.push({ ix, iy, z, x: ix - DRIFT * FALL_T, y: iy + FALL_H, t: 0, harmless, r: 0.5 + this.rand() * 0.55 });
    }
    update(dt, car, ground) {
      const c = this.cfg, R = this.rand; this.t += dt; this.inv = Math.max(0, this.inv - dt);
      if (this.t > c.grace) { const gap = car.x - this.front; this.front += (c.v + Math.min(c.maxBoost, Math.max(0, gap - c.gapMax) * 0.5)) * dt; this.front = Math.min(this.front, car.x + 2); }
      this.acc += c.rate * dt; this.amb += c.amb * dt;
      while (this.acc >= 1) { this.acc -= 1; this.spawn(this.front + c.v * FALL_T - c.back + R() * (c.back + c.ahead), (R() * 2 - 1) * ROAD_Z, false, ground); }
      while (this.amb >= 1) { this.amb -= 1; this.spawn(car.x - 8 + R() * 70, (R() < 0.5 ? -1 : 1) * (2.8 + R() * 6), true, ground); }
      const n = Math.max(1, Math.ceil(dt / 0.016)), h = dt / n;
      for (let s = 0; s < n; s++) {
        for (let i = this.list.length - 1; i >= 0; i--) {
          const m = this.list[i]; m.t += h; m.x += DRIFT * h; m.y -= (FALL_H / FALL_T) * h;
          if (m.t >= FALL_T) { this.events.push({ type: 'impact', x: m.ix, y: m.iy, z: m.z, harmless: m.harmless }); this.list.splice(i, 1); continue; }
          if (!m.harmless && this.inv <= 0 && !this.inCalm(car.x) && !car.crashed && Math.abs(m.x - car.x) < HIT_X + m.r && Math.abs(m.z) < HIT_Z + m.r * 0.5 && Math.abs(m.y - (car.y + 0.3)) < HIT_Y + m.r) {
            this.inv = c.inv; this.hits++; car.vx *= 1 - (1 - (car.grounded ? c.slow : c.air)) * (1 - (car.p.meteorGuard || 0)); if (car.grounded) car.vy = Math.max(car.vy, 0) + 2.5;
            this.events.push({ type: 'hit', x: m.x, y: m.y, z: m.z }); this.list.splice(i, 1);
          }
        }
      }
    }
  }
  return { StormSim, DEFAULT, FALL_H, FALL_T, DRIFT, ROAD_Z };
})();
if (typeof module !== 'undefined') module.exports = Storm;
