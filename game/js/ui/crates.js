/* eslint-disable */
'use strict';
/* Space Crate opening: random coins / cosmetic / free upgrade / jackpot */
(function () {
  let busy = false, last = null;
  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  function roll() {
    const r = Math.random(), v = vehicleById(vehicleId);
    if (r < 0.03) { const n = ri(1000, 2000); return { type: 'coins', n, rar: 'legendary', title: 'JACKPOT', text: '+' + n + ' coins' }; }
    if (r < 0.10) {
      const ups = Phys.UPGRADES.filter((u) => tierOf(v.id, u.id) < u.costs.length);
      if (ups.length) { const u = ups[ri(0, ups.length - 1)]; return { type: 'upgrade', u, rar: 'legendary', title: 'FREE UPGRADE', text: u.name + ' tier ' + (tierOf(v.id, u.id) + 1) + ' for ' + v.name }; }
    }
    if (r < 0.20) {
      const c = cosOf(v.id), pool = []; for (const k of COS_KEYS) for (const it of COSMETICS[k].items) if (c.own[k].indexOf(it.id) < 0) pool.push({ k, it });
      if (pool.length) { const p = pool[ri(0, pool.length - 1)]; return { type: 'cos', p, rar: 'famous', title: 'STYLE UNLOCKED', text: COSMETICS[p.k].name + ': ' + p.it.name + ' for ' + v.name }; }
    }
    if (r < 0.45) { const n = ri(200, 400); return { type: 'coins', n, rar: 'famous', title: 'NICE HAUL', text: '+' + n + ' coins' }; }
    const n = ri(50, 150); return { type: 'coins', n, rar: 'normal', title: 'COINS', text: '+' + n + ' coins' };
  }
  function apply(w) {
    const v = vehicleById(vehicleId);
    if (w.type === 'coins') coins += w.n;
    else if (w.type === 'upgrade') { upgOf(v.id)[w.u.id] = tierOf(v.id, w.u.id) + 1; applyStats(vehicleId); }
    else { const c = cosOf(v.id); c.own[w.p.k].push(w.p.it.id); if (!c.eq[w.p.k]) c.eq[w.p.k] = w.p.it.id; }
    save(); refreshCoins();
  }
  function paint() {
    $('crCount').textContent = crates > 0 ? crates + (crates === 1 ? ' crate' : ' crates') + ' left' : 'No more crates';
    $('btnCrOpen').firstChild.textContent = last ? (crates > 0 ? 'Open another' : 'Done') : 'Open crate';
    $('btnCrOpen').disabled = busy;
  }
  function openModal() {
    if (crates < 1) { toast('NO CRATES', 'Drive through Space Crates on the tracks to find them', 'warn'); Snd.click(); return; }
    Snd.init(); Snd.click(); last = null; busy = false; $('crReward').classList.add('hidden'); $('crStage').className = 'crStage'; $('crImg').classList.remove('hidden');
    if (!$('crImg').src || $('crImg').src === location.href) $('crImg').src = crateThumb; $('crateModal').classList.remove('hidden'); paint();
  }
  function closeModal() { $('crateModal').classList.add('hidden'); busy = false; Snd.click(); refreshMenu(); }
  function open() {
    if (busy) return;
    if (last) { if (crates > 0) { last = null; $('crReward').classList.add('hidden'); $('crStage').className = 'crStage'; $('crImg').classList.remove('hidden'); paint(); open(); } else closeModal(); return; }
    if (crates < 1) return;
    busy = true; crates--; const w = roll(); apply(w); paint();
    $('crStage').className = 'crStage shake'; Snd.tone && Snd.tone(220, 0.5, 'sawtooth', 0.12, 2);
    setTimeout(() => {
      $('crStage').className = 'crStage burst r-' + w.rar; $('crImg').classList.add('hidden');
      const R = $('crReward'); R.className = 'crReward r-' + w.rar;
      let ic = svg('coin', 'coin'); if (w.type === 'upgrade') ic = svg('bolt'); else if (w.type === 'cos') ic = '<i class="dot" style="background:' + (w.p.it.id === 'rainbow' ? 'conic-gradient(#ff4d4d,#ffd24a,#6dff8a,#35e6ff,#b28cff,#ff4d4d)' : w.p.it.color) + '"></i>';
      R.innerHTML = '<div class="crIc">' + ic + '</div><b data-testid="crate-reward-title">' + w.title + '</b><span data-testid="crate-reward-text">' + w.text + '</span><small>' + RARITY[w.rar].name + '</small>';
      w.rar === 'normal' ? Snd.coin(2) : Snd.win(); vibe(30); last = w; busy = false; paint(); window.dispatchEvent(new CustomEvent('td:crate', { detail: w }));
    }, 1100);
  }
  $('crateTotal').addEventListener('click', (e) => { e.preventDefault(); openModal(); });
  $('btnOpenCrate').addEventListener('click', (e) => { e.preventDefault(); openModal(); });
  $('btnCrOpen').addEventListener('click', (e) => { e.preventDefault(); open(); });
  $('btnCrClose').addEventListener('click', (e) => { e.preventDefault(); closeModal(); });
  $('crateModal').addEventListener('click', (e) => { if (e.target.id === 'crateModal' && !busy) closeModal(); });
  refreshCoins();
  window.CrateUI = { open: openModal, roll };
})();
