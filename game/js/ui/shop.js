/* eslint-disable */
'use strict';
/* Garage tabs: Ride stats, Tune (upgrades) and Style (cosmetics) */
let gTab = 'ride';
const UPG_FX_TEXT = { engine: '+6% accel, +2.5% top speed / tier', nitro: '+20% tank, +4% boost / tier', grip: 'Tougher landings, less speed loss / tier', air: '+10% rotation, +8% damping / tier' };
const clamp01 = (x) => Math.max(0, Math.min(1, x));
function statBars(p) {
  return [
    ['Speed', (p.engine * p.vmax) / 1.5, 'speed'],
    ['Nitro', (p.nitroCap * p.nitroPow) / 4.2, 'nitro'],
    ['Landing', (p.landDamp * (p.badAngle / 1.25) * p.landTol * (1 - p.landLoss * 2)) / 2.4, 'landing'],
    ['Air control', (p.airTorque / p.inertia) / 2, 'air'],
    ['Meteor shield', p.meteorGuard / 0.8, 'shield'],
    ['Cold grip', p.coldGuard / 0.9, 'cold'],
    ['Float', (1 - p.gScale) / 0.3, 'float'],
    ['Nitro regen', p.fuelRegen / 0.1, 'regen'],
  ];
}
function ridePane(v) {
  const base = statBars(Phys.statsFor(v.id, {})), cur = statBars(Phys.statsFor(v.id, upgOf(v.id)));
  let h = '<div class="abilityBox r-' + v.rarity + '" data-testid="ability-box"><b>' + RARITY[v.rarity].name.toUpperCase() + '</b> ' + v.ability + '</div><div class="stats">';
  for (let i = 0; i < base.length; i++) {
    h += '<div class="srow" data-testid="stat-' + base[i][2] + '"><span>' + base[i][0] + '</span><div class="sbar"><i class="b" style="width:' + (clamp01(base[i][1]) * 100).toFixed(0) + '%"></i><i class="u" style="width:' + (clamp01(cur[i][1]) * 100).toFixed(0) + '%"></i></div></div>';
  }
  return h + '</div><div class="gNote">Gold part of each bar = your upgrades.</div>';
}
function tunePane(v) {
  if (owned.indexOf(v.id) < 0) return '<div class="gLock">' + svg('lock') + 'Buy the ' + v.name + ' to tune it.</div>';
  let h = '';
  for (const u of Phys.UPGRADES) {
    const t = tierOf(v.id, u.id), max = u.costs.length, cost = u.costs[t], pips = [];
    for (let i = 0; i < max; i++) pips.push('<i class="' + (i < t ? 'on' : '') + '"></i>');
    h += '<div class="urow" data-testid="upgrade-row-' + u.id + '"><div class="uh"><b>' + u.name + '</b><span class="pips" data-testid="upgrade-tier-' + u.id + '" data-tier="' + t + '">' + pips.join('') + '</span></div><div class="ud">' + u.desc + ' <em>' + UPG_FX_TEXT[u.id] + '</em></div>' +
      (t >= max ? '<button class="ubtn max" disabled data-testid="upgrade-btn-' + u.id + '">MAX</button>' : '<button class="ubtn' + (coins < cost ? ' broke' : '') + '" data-up="' + u.id + '" data-testid="upgrade-btn-' + u.id + '">Upgrade ' + svg('coin', 'coin') + cost + '</button>') + '</div>';
  }
  return h;
}
function stylePane(v) {
  if (owned.indexOf(v.id) < 0) return '<div class="gLock">' + svg('lock') + 'Buy the ' + v.name + ' to style it.</div>';
  const c = cosOf(v.id); let h = '';
  for (const k of COS_KEYS) {
    const D = COSMETICS[k], shown = cosPrev[k] !== undefined ? cosPrev[k] : c.eq[k];
    h += '<div class="csec" data-testid="cos-section-' + k + '"><div class="ch">' + D.name + '</div><div class="sw">';
    h += '<button class="swb' + (!shown ? ' sel' : '') + '" data-k="' + k + '" data-i="" data-testid="cos-' + k + '-none"><i class="dot none"></i><span>None</span></button>';
    for (const it of D.items) {
      const own = c.own[k].indexOf(it.id) >= 0, bg = it.id === 'rainbow' ? 'conic-gradient(#ff4d4d,#ffd24a,#6dff8a,#35e6ff,#b28cff,#ff4d4d)' : it.color;
      h += '<button class="swb' + (shown === it.id ? ' sel' : '') + (c.eq[k] === it.id ? ' eqp' : '') + '" data-k="' + k + '" data-i="' + it.id + '" data-testid="cos-' + k + '-' + it.id + '"><i class="dot" style="background:' + bg + '"></i><span>' + it.name + '</span>' + (own ? '' : '<small>' + svg('coin', 'coin') + it.price + '</small>') + '</button>';
    }
    h += '</div>';
    const pv = cosPrev[k] ? itemOf(k, cosPrev[k]) : null;
    if (pv && c.own[k].indexOf(pv.id) < 0) h += '<button class="ubtn buy' + (coins < pv.price ? ' broke' : '') + '" data-buy="' + k + '" data-testid="cos-buy-' + k + '">Buy ' + pv.name + ' ' + svg('coin', 'coin') + pv.price + '</button>';
    h += '</div>';
  }
  return h;
}
function renderPane() {
  const v = vehicleById(previewId), pane = $('gPane'); if (!pane) return;
  for (const b of document.querySelectorAll('.gtab')) b.classList.toggle('on', b.dataset.tab === gTab);
  const top = pane.scrollTop;
  pane.innerHTML = gTab === 'tune' ? tunePane(v) : gTab === 'style' ? stylePane(v) : ridePane(v);
  pane.scrollTop = top;
}
function setTab(t) { gTab = t; for (const k of COS_KEYS) delete cosPrev[k]; renderPane(); Snd.click(); }
function buyUpgrade(id) {
  const v = vehicleById(previewId), u = Phys.UPGRADES.find((x) => x.id === id), t = tierOf(v.id, id);
  if (!u || t >= u.costs.length || owned.indexOf(v.id) < 0) return;
  const cost = u.costs[t];
  if (coins < cost) { toast('NEED ' + (cost - coins) + ' MORE', 'Earn coins from stars, style and flips', 'warn'); Snd.click(); return; }
  coins -= cost; upgOf(v.id)[id] = t + 1; save(); refreshCoins(); applyStats(vehicleId);
  Snd.cp(); popT = 1; burst(18, 7); toast(u.name.toUpperCase() + ' ' + (t + 1) + '/' + u.costs.length, v.name + ' upgraded', 'good'); renderPane();
}
function pickCos(k, id) {
  const c = cosOf(previewId);
  if (!id) { c.eq[k] = null; delete cosPrev[k]; save(); Snd.click(); renderPane(); return; }
  if (c.own[k].indexOf(id) >= 0) { c.eq[k] = id; delete cosPrev[k]; save(); Snd.cp(); } else { cosPrev[k] = id; Snd.click(); }
  renderPane();
}
function buyCos(k) {
  const id = cosPrev[k], it = itemOf(k, id), c = cosOf(previewId); if (!it) return;
  if (coins < it.price) { toast('NEED ' + (it.price - coins) + ' MORE', 'Earn coins from stars, style and flips', 'warn'); Snd.click(); return; }
  coins -= it.price; c.own[k].push(id); c.eq[k] = id; delete cosPrev[k]; save(); refreshCoins(); Snd.win(); popT = 1; burst(20, 8); toast('NEW STYLE', COSMETICS[k].name + ': ' + it.name, 'good'); renderPane();
}
$('gPane').addEventListener('click', (e) => {
  Snd.init();
  const up = e.target.closest('[data-up]'), buy = e.target.closest('[data-buy]'), sw = e.target.closest('.swb');
  if (up) buyUpgrade(up.dataset.up); else if (buy) buyCos(buy.dataset.buy); else if (sw) pickCos(sw.dataset.k, sw.dataset.i);
});
for (const b of document.querySelectorAll('.gtab')) b.addEventListener('click', (e) => { e.preventDefault(); setTab(b.dataset.tab); });
