/* eslint-disable */
'use strict';
/* Interactive first-launch tour: a pointing hand + spotlight walks through the menu, stages, garage and controls. Replay with HOW TO PLAY. */
(function () {
  const KEY = 'skyleap_tutorial_done';
  const STEPS = [
    { s: 'menu', t: 'Welcome, driver!', b: '<p>Quick tour: the hand will point at each part of the game and tell you what it does. Floor it, jump the gaps and land it flat!</p>' },
    { s: 'menu', el: '#btnPlay', t: 'Play', b: 'Starts your <b>next level</b>. Finish a level to unlock the one after it.' },
    { s: 'menu', el: '#btnGarage', t: 'Garage', b: 'Pick, buy and upgrade your <b>vehicle</b>. We will look inside in a moment.' },
    { s: 'menu', el: '#btnLevels', t: 'Stages', b: 'Choose a <b>world</b> and level to play or replay: Earth, Mars, Moon and Deep Space.' },
    { s: 'menu', el: '#btnDuel', t: 'Duel Race', b: 'Race a <b>friend online</b> head to head.' },
    { s: 'menu', el: '#crateTotal', t: 'Space crates', b: 'Tap to open a <b>crate</b> for a free reward.' },
    { s: 'menu', el: '#coinTotal', t: 'Coins', b: 'Earned by driving, flipping and finishing levels. Spend them in the <b>Garage</b>.' },
    { s: 'menu', el: '#starTotal', t: 'Stars', b: 'Each level gives up to <b>3 stars</b> based on your time. Total stars are shown here.' },
    { s: 'menu', el: '#authSlot', t: 'Your profile', b: 'Your name and account. Tap it to see your stats or <b>sign out</b>.' },
    { s: 'menu', el: '#btnSettings', t: 'Settings', b: 'Turn <b>sound</b>, graphics quality and screen shake on or off.' },
    { s: 'menu', el: '#menu .hint', t: 'Controls', b: '<p><b>Keyboard:</b> <kbd>W</kbd>/<kbd>Space</kbd> gas, <kbd>S</kbd> brake, <kbd>A</kbd>/<kbd>D</kbd> tilt in the air, <kbd>Shift</kbd> nitro, <kbd>Esc</kbd> pause.</p><p><b>Touch:</b> hold GAS, and use the tilt buttons in the air so your wheels meet the road.</p>' },
    { s: 'stages', el: '#worlds', t: 'Stage select', b: 'Four worlds, <b>25 campaign levels</b>. Finish every level in a world to unlock the next one.' },
    { s: 'stages', el: '.uabtn', t: 'Unlock all levels', b: 'A <b>test button</b>: turn it ON to open every level from 1 to 25. Turn it OFF to restore your real progress.' },
    { s: 'garage', el: '#gList', t: 'Choose a vehicle', b: 'Tap a vehicle to preview it. Rarer vehicles are faster and have special abilities.' },
    { s: 'garage', el: '#btnEquip', t: 'Buy or equip', b: 'Buy with coins, or <b>equip</b> a vehicle you already own. Deep Space needs a <b>Legendary hover</b>.' },
    { s: 'menu', t: 'Deep Space tip', b: '<p>Levels 21-25 are zero-g flights to Jupiter, Saturn, Uranus, Neptune and the Pluto Finale: steer with <kbd>A</kbd>/<kbd>D</kbd> or the LEFT / RIGHT buttons, fly through every <b>ring</b> (missed = +3 s), dodge asteroids and grab gold orbs.</p><p>You are ready. Hit <b>Play</b>!</p>' },
  ];
  const HAND = '<svg viewBox="0 0 64 64"><path d="M26 6c-3 0-5 2-5 5v26l-5-5c-2-2-6-1-7 2-1 2 0 4 1 5l13 15c3 4 7 6 12 6h4c8 0 14-6 14-14V30c0-3-2-5-5-5-1 0-3 1-3 1-1-2-3-3-5-3-1 0-3 1-3 1-1-2-3-3-5-3V11c0-3-2-5-5-5z" fill="#fff" stroke="#1a1a3a" stroke-width="3" stroke-linejoin="round"/></svg>';
  let i = 0, el, spot, hand, card, active = false, ready = false, raf = 0, curTarget = null;
  const done = () => { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } };
  const mark = () => { try { localStorage.setItem(KEY, '1'); } catch (e) {} };
  const q = (id) => document.getElementById(id);
  function build() {
    if (el) return;
    el = document.createElement('div'); el.id = 'tutorial'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'How to play'); el.setAttribute('data-testid', 'tutorial-modal');
    el.innerHTML = '<div class="tshade"></div><div class="tspot"></div><div class="thand" data-testid="tutorial-hand">' + HAND + '</div><div class="tcard"><div class="tstep" id="tutStep" data-testid="tutorial-step"></div><h2 id="tutTitle" data-testid="tutorial-title"></h2><div class="tbody" id="tutBody" data-testid="tutorial-text"></div><div class="tfoot"><div class="tdots" id="tutDots"></div><button class="tskip" id="tutSkip" data-testid="tutorial-skip-btn" type="button">Skip</button><button id="tutBack" data-testid="tutorial-back-btn" type="button">Back</button><button class="tnext" id="tutNext" data-testid="tutorial-next-btn" type="button">Next</button></div></div>';
    document.body.appendChild(el); spot = el.querySelector('.tspot'); hand = el.querySelector('.thand'); card = el.querySelector('.tcard');
    q('tutSkip').onclick = close; q('tutBack').onclick = () => go(i - 1); q('tutNext').onclick = () => (i >= STEPS.length - 1 ? close() : go(i + 1));
    document.addEventListener('keydown', (e) => {
      if (!active) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); q('tutNext').click(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); q('tutBack').click(); }
    }, true);
  }
  const toScreen = (s) => {
    if (document.body.dataset.state === s) return;
    if (document.body.dataset.state === 'garage' && s === 'menu' && typeof leaveGarage === 'function') leaveGarage(); else setState(s);
  };
  function go(n) {
    i = Math.max(0, Math.min(STEPS.length - 1, n)); const S = STEPS[i];
    toScreen(S.s);
    q('tutStep').textContent = (i + 1) + ' / ' + STEPS.length; q('tutTitle').innerHTML = S.t; q('tutBody').innerHTML = S.b.charAt(0) === '<' ? S.b : '<p>' + S.b + '</p>';
    q('tutDots').innerHTML = STEPS.map((_, k) => '<i class="' + (k === i ? 'on' : '') + '"></i>').join('');
    q('tutBack').hidden = i === 0; q('tutSkip').hidden = i === STEPS.length - 1; q('tutNext').textContent = i === STEPS.length - 1 ? "Let's drive" : 'Next';
    curTarget = null; el.classList.remove('spot'); el.classList.toggle('center', !S.el);
    setTimeout(() => { if (i === STEPS.indexOf(S)) { curTarget = S.el ? document.querySelector(S.el) : null; } }, 450);
  }
  function place() {
    if (!active) return;
    const vw = innerWidth, vh = innerHeight, cw = card.offsetWidth, ch = card.offsetHeight, S = STEPS[i];
    const r = curTarget && curTarget.getBoundingClientRect(); const ok = r && r.width > 4 && r.height > 4;
    el.classList.toggle('spot', !!ok); el.classList.toggle('center', !ok);
    if (!ok) { card.style.left = Math.round((vw - cw) / 2) + 'px'; card.style.top = Math.round((vh - ch) / 2) + 'px'; }
    else {
      const pad = 8, x = r.left - pad, y = r.top - pad, w = r.width + pad * 2, h = r.height + pad * 2;
      spot.style.left = x + 'px'; spot.style.top = y + 'px'; spot.style.width = w + 'px'; spot.style.height = h + 'px';
      const px = Math.min(r.right - 14, r.left + r.width * 0.72), py = Math.min(r.bottom - 6, r.top + r.height * 0.7);
      hand.style.left = (px - 23) + 'px'; hand.style.top = (py - 5) + 'px';
      let cx, cy;
      if (y + h + 16 + ch + 70 < vh) { cx = x + w / 2 - cw / 2; cy = y + h + 62; }
      else if (y - ch - 16 > 8) { cx = x + w / 2 - cw / 2; cy = y - ch - 16; }
      else if (x + w + 16 + cw < vw) { cx = x + w + 16; cy = y + h / 2 - ch / 2; }
      else if (x - cw - 16 > 8) { cx = x - cw - 16; cy = y + h / 2 - ch / 2; }
      else { cx = (vw - cw) / 2; cy = vh - ch - 16; }
      card.style.left = Math.max(8, Math.min(vw - cw - 8, cx)) + 'px'; card.style.top = Math.max(8, Math.min(vh - ch - 8, cy)) + 'px';
    }
  }
  const loop = () => { place(); raf = active ? requestAnimationFrame(loop) : 0; };
  function open() {
    build(); active = true; toScreen('menu'); go(0); el.classList.add('show'); if (!raf) loop();
  }
  function close() {
    mark(); active = false; if (el) el.classList.remove('show', 'spot'); toScreen('menu');
  }
  function maybe() { if (ready && !active && !done() && document.body.dataset.state === 'menu') open(); }
  const btn = document.createElement('button'); btn.id = 'btnHowTo'; btn.type = 'button'; btn.setAttribute('data-testid', 'menu-howto-btn'); btn.setAttribute('aria-label', 'How to play'); btn.textContent = '? How to play';
  btn.onclick = () => { if (window.Snd && Snd.click) Snd.click(); open(); }; document.body.appendChild(btn);
  window.addEventListener('td:state', () => setTimeout(maybe, 400));
  (window.introDone || Promise.resolve()).then(() => setTimeout(() => { ready = true; maybe(); }, 2600));
  window.Tutorial = { open, reset: () => { try { localStorage.removeItem(KEY); } catch (e) {} } };
})();
