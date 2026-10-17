/* eslint-disable */
'use strict';
/* 1v1 online shooting duel: side-view arena, players start at opposite ends, first to 40 kills wins */
const SH = { ws: null, role: '', code: '', room: null, wantClose: false, running: false, raf: 0, lastT: 0, sendT: 0, phase: 'idle', countT: 0, target: 40, shotId: 0 };
const SW = 1600, SHH = 720, SGY = 640, SPW = 18, SPH = 62, SPEED = 340, JUMP = 830, GRAV = 2200, BSPEED = 1150, BDMG = 25, SHOOT_FIRE_CD = 0.2, RESPAWN = 1.6, INV = 1.5;
const SPLAT = [{ x: 90, y: 450, w: 230 }, { x: 1280, y: 450, w: 230 }, { x: 690, y: 500, w: 220 }, { x: 420, y: 330, w: 220 }, { x: 960, y: 330, w: 220 }];
const mkP = (x, face) => ({ x, y: SGY, vx: 0, vy: 0, hp: 100, alive: true, face, aim: face > 0 ? 0 : Math.PI, ground: true, inv: 0, resp: 0, cd: 0, spawnX: x });
let sMe = null, sOps = {}, sBul = [], sPart = [], sFeed = [], sKeys = {}, sMouse = { x: 0, y: 0, used: false, down: false }, sTouch = { l: false, r: false, j: false, f: false };
const sCv = $('shootCv'), sCx = sCv.getContext('2d');
let sView = { s: 1, ox: 0, oy: 0, w: 0, h: 0, dpr: 1 }, sStars = [], sShake = 0, sLastHud = '';
for (let i = 0; i < 90; i++) sStars.push({ x: Math.random() * SW, y: Math.random() * SGY, r: Math.random() * 1.6 + 0.4, a: Math.random() * 0.6 + 0.3 });
const SCOL = { host: '#35e6ff', guest: '#ff8a3d', guest2: '#7dff6a' }, SSPAWN = { host: [120, 1], guest: [SW - 120, -1], guest2: [SW / 2, 1] };
const shOthers = () => SH.room ? SH.room.players.filter((p) => p.role !== SH.role) : [];
const shAlive = () => Object.values(sOps).filter((o) => o.alive);
const shMe = () => SH.room && SH.room.players.find((p) => p.role === SH.role) || null;
const shSend = (o) => { if (SH.ws && SH.ws.readyState === 1) { SH.ws.send(JSON.stringify(o)); return true; } return false; };

/* ---------- network ---------- */
function shootOpen() {
  return new Promise((resolve, reject) => {
    let ws, opened = false;
    try { ws = new WebSocket(window.TD_SHOOT_SERVER.replace(/^http/, 'ws') + '/api/ws/shoot'); } catch (e) { reject(e); return; }
    const to = setTimeout(() => { if (!opened) { try { ws.close(); } catch (e) {} reject(new Error('timeout')); } }, 8000);
    ws.onopen = () => { opened = true; clearTimeout(to); SH.ws = ws; resolve(ws); };
    ws.onmessage = (ev) => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } shootOnMsg(m); };
    ws.onclose = () => { clearTimeout(to); if (!opened) { reject(new Error('closed')); return; } if (SH.ws === ws) { SH.ws = null; shootOnClose(); } };
    ws.onerror = () => {};
  });
}
async function shootConnect(msgFn, busyTxt) {
  const nick = duelNick(); if (!nick) return;
  duelHomeErr(''); duelBusy(true, busyTxt); SH.wantClose = false; SH.code = '';
  if (SH.ws) { try { SH.ws.close(); } catch (e) {} SH.ws = null; }
  try { await shootOpen(); } catch (e) { duelBusy(false); duelHomeErr('Could not reach the shooting server. Check your internet connection.'); return; }
  shSend(msgFn(nick));
}
function shootCreate() { shootConnect((nick) => ({ t: 'create', nick }), 'Creating shooting room\u2026'); }
function shootJoin() {
  const c = $('duelCode').value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (c.length !== 5) { duelHomeErr('Enter the 5-character room code.'); return; }
  shootConnect((nick) => ({ t: 'join', code: c, nick }), 'Joining shooting room\u2026');
}
function shootOnClose() {
  if (SH.wantClose || !duelOn) return;
  if (state === 'shootgame') { shootFinishLocal('disconnect', false); return; }
  if (state === 'duel') { duelBusy(false); duelHomeErr('Connection lost. Try again.'); return; }
  if (state !== 'shootresult') duelEnd('Connection lost');
}
function shootOnMsg(m) {
  if (m.t === 'joined') { SH.role = m.role; SH.code = m.code; SH.room = m.room; DUEL.code = m.code; duelBusy(false); duelHomeErr(''); setState('shootlobby'); shootRenderLobby(); }
  else if (m.t === 'room') { SH.room = m.room; if (state === 'shootlobby') shootRenderLobby(); if (state === 'shootresult') shootRenderResult(); }
  else if (m.t === 'error') { duelBusy(false); duelHomeErr(m.msg); if (SH.ws && !SH.code) { SH.wantClose = true; try { SH.ws.close(); } catch (e) {} SH.ws = null; } }
  else if (m.t === 'start') shootStart(m);
  else if (m.t === 'opp') shootOppState(m);
  else if (m.t === 'oshot') shootOppShot(m);
  else if (m.t === 'score') shootOnScore(m);
  else if (m.t === 'over') { SH.room = m.room; shootOver(m); }
  else if (m.t === 'opp_left') { if (m.room) SH.room = m.room; if (m.r) delete sOps[m.r]; toast('PLAYER LEFT', null, 'warn'); if (state === 'shootresult') shootRenderResult(); shootHud(true); }
  else if (m.t === 'room_closed') { duelEnd('The host closed the room'); }
}

/* ---------- lobby ---------- */
function shootRenderLobby() {
  const r = SH.room; if (!r) return;
  $('shCode').innerHTML = r.code.split('').map((c) => '<span>' + c + '</span>').join('');
  const mine = shMe(), full = r.players.length >= r.cap, isHost = SH.role === 'host', roles = r.cap === 3 ? ['host', 'guest', 'guest2'] : ['host', 'guest'];
  $('shCards').innerHTML = roles.map((ro) => shCard(r.players.find((p) => p.role === ro), ro)).join('');
  $('btnShoot2').classList.toggle('on', r.cap === 2); $('btnShoot3').classList.toggle('on', r.cap === 3);
  $('btnShoot2').classList.toggle('off', !isHost || r.players.length > 2); $('btnShoot3').classList.toggle('off', !isHost);
  $('shModeLab').textContent = isHost ? 'Mode' : 'Mode picked by host';
  const btn = $('btnShootReady'); btn.classList.toggle('off', !full); btn.classList.toggle('on', !!(mine && mine.ready));
  btn.textContent = !full ? 'Waiting for players\u2026 (' + r.players.length + '/' + r.cap + ')' : mine && mine.ready ? 'Ready \u2713 (tap to cancel)' : 'Ready';
  $('shHint').textContent = !full ? 'Share the code to fill the room.' : 'Everyone taps Ready to start. First to ' + r.target + ' kills wins \u00B7 everyone can shoot everyone.';
}
function shCard(p, role) {
  if (!p) return '<div class="pCard panel empty" data-testid="shoot-' + role + '-card"><div class="role">' + (role === 'guest2' ? 'guest 2' : role) + '</div><div class="nick">Waiting\u2026</div><div class="carNm">Share the code</div></div>';
  return '<div class="pCard panel' + (p.ready ? ' rdy' : '') + '" data-testid="shoot-' + role + '-card"><div class="role">' + (role === 'guest2' ? 'guest 2' : role) + (p.role === SH.role ? ' \u00B7 you' : '') + '</div><div class="nick" data-testid="shoot-' + role + '-nick">' + dEsc(p.nick) + '</div><div class="shSide" style="color:' + SCOL[role] + '">' + (role === 'host' ? 'Left side \u25B6' : role === 'guest' ? '\u25C0 Right side' : 'Center') + '</div><span class="st ' + (p.connected ? '' : 'dc') + '" data-testid="shoot-' + role + '-status">' + (!p.connected ? 'OFFLINE' : p.ready ? 'READY' : 'NOT READY') + '</span></div>';
}

/* ---------- match ---------- */
function shootStart(m) {
  SH.room = m.room; SH.target = m.target || 40;
  const sp = SSPAWN[SH.role]; sMe = mkP(sp[0], sp[1]); sOps = {};
  for (const o of shOthers()) { const q = SSPAWN[o.role], P = mkP(q[0], q[1]); P.tx = P.x; P.ty = P.y; sOps[o.role] = P; }
  sBul = []; sPart = []; sFeed = []; sKeys = {}; sShake = 0; sLastHud = '';
  SH.phase = 'count'; SH.countT = 3.2; SH.lastCount = -1; SH.sendT = 0; SH.shotId = 0;
  $('duelLeaveModal').classList.add('hidden'); $('shootFeed').innerHTML = '';
  $('shTarget').textContent = SH.target;
  document.body.classList.add('shooting'); setState('shootgame'); shootResize(); shootHud(true);
  try { Snd.init(); const el = document.documentElement; if (el.requestFullscreen && !document.fullscreenElement) { const p = el.requestFullscreen(); if (p && p.catch) p.catch(() => {}); } if (screen.orientation && screen.orientation.lock) { const p = screen.orientation.lock('landscape'); if (p && p.catch) p.catch(() => {}); } } catch (e) {}
  if (!SH.running) { SH.running = true; SH.lastT = performance.now(); SH.raf = requestAnimationFrame(shootFrame); }
}
function shootOppState(m) {
  const O = sOps[m.r]; if (!O || typeof m.x !== 'number') return;
  O.tx = m.x; O.ty = m.y; O.vx = m.vx || 0; O.vy = m.vy || 0; O.face = m.f || 1; O.aim = m.a || 0; O.hp = m.hp; O.alive = !!m.al;
}
function shootOppShot(m) {
  if (!sOps[m.r]) return;
  sBul.push({ x: m.x, y: m.y, vx: Math.cos(m.a) * BSPEED, vy: Math.sin(m.a) * BSPEED, t: 0, own: false, role: m.r });
  sMuzzle(m.x, m.y, '#ffb27a'); Snd.tone(620, 0.05, 'square', 0.05);
}
function shootOnScore(m) {
  SH.room = m.room;
  const k = m.room.players.find((p) => p.role === m.killer), v = m.room.players.find((p) => p.role === m.victim);
  sFeed.push({ t: 4, txt: (k ? k.nick : '?') + '  \u2715  ' + (v ? v.nick : '?'), me: m.killer === SH.role || m.victim === SH.role });
  if (m.killer === SH.role) Snd.tone(880, 0.1, 'triangle', 0.14);
  const V = sOps[m.victim]; if (V) { V.alive = false; sBurst(V.x, V.y - 30, SCOL[m.victim], 26); }
  shootHud(true);
}
function shootOver(m) {
  SH.phase = 'over'; SH.over = m;
  setTimeout(() => { if (SH.phase === 'over' && (state === 'shootgame')) { setState('shootresult'); shootRenderResult(); } }, 900);
  const won = m.winner === SH.role; if (won) Snd.win(); else Snd.lose();
}
function shootFinishLocal(reason, won) {
  if (SH.phase === 'over') return;
  SH.over = { winner: won ? SH.role : (SH.role === 'host' ? 'guest' : 'host'), reason, room: SH.room }; SH.phase = 'over'; setState('shootresult'); shootRenderResult();
}
function shootRenderResult() {
  const m = SH.over, r = SH.room; if (!m || !r) return;
  const won = m.winner === SH.role, me = shMe() || {};
  const head = $('shRHead'); head.textContent = won ? 'YOU WIN!' : 'YOU LOST'; head.classList.toggle('lose', !won);
  const wn = r.players.find((p) => p.role === m.winner);
  $('shRSub').textContent = m.reason === 'kills' ? (won ? 'You reached ' + r.target + ' kills first' : (wn ? wn.nick : 'A player') + ' reached ' + r.target + ' kills first') : m.reason === 'disconnect' ? (won ? 'All other players left' : 'You lost the connection') : 'Match over';
  const rows = r.players.slice().sort((a, b) => b.kills - a.kills);
  $('shRRows').innerHTML = rows.map((p) => '<div class="drRow ' + (p.role === SH.role ? 'me' : 'opp') + (p.role === m.winner ? ' win' : '') + '"><span class="nm" data-testid="shoot-result-' + p.role + '-nick">' + dEsc(p.nick) + (p.role === SH.role ? ' (you)' : '') + '</span><span class="tm" data-testid="shoot-result-' + p.role + '-kills">' + p.kills + ' kills</span></div>').join('');
  const rb = $('btnShootRematch'), gone = r.players.length < 2 || !SH.ws, others = r.players.filter((p) => p.role !== SH.role);
  rb.classList.toggle('off', gone); rb.classList.toggle('on', !!me.rematch); rb.textContent = gone ? 'Opponent left' : me.rematch ? 'Waiting\u2026 (tap to cancel)' : 'Rematch';
  $('shRNote').textContent = others.some((p) => p.rematch) && !me.rematch ? 'Opponent wants a rematch!' : r.players.length < r.cap && !gone ? 'Rematch starts when all ' + r.cap + ' players are in' : '';
}
function shootRematch() { const m = shMe(); shSend({ t: 'rematch', on: !(m && m.rematch) }); Snd.click(); }

/* ---------- leaving ---------- */
function shootLeave() { shSend({ t: 'leave' }); shootReset(); setTimeout(() => duelEnd(), 30); }
function shootAskLeave() { const m = $('duelLeaveModal'); m.querySelector('h2').textContent = 'Leave match?'; m.querySelector('p').textContent = 'Leaving mid-match counts as a loss.'; $('btnDuelKeep').textContent = 'Keep playing'; $('btnDuelQuit').textContent = 'Leave match'; m.classList.remove('hidden'); }
function shootReset() {
  SH.wantClose = true; SH.running = false; cancelAnimationFrame(SH.raf); SH.phase = 'idle';
  if (SH.ws) { try { SH.ws.close(); } catch (e) {} SH.ws = null; }
  SH.code = ''; SH.room = null; SH.over = null; document.body.classList.remove('shooting');
  const m = $('duelLeaveModal'); m.querySelector('h2').textContent = 'Leave race?'; m.querySelector('p').textContent = 'Leaving mid-race counts as a loss.'; $('btnDuelKeep').textContent = 'Keep racing'; $('btnDuelQuit').textContent = 'Leave race';
}
function shootEsc() {
  if (state === 'shootgame') { const m = $('duelLeaveModal'); if (m.classList.contains('hidden')) shootAskLeave(); else m.classList.add('hidden'); }
  else shootLeave();
}

/* ---------- simulation ---------- */
function shAim() {
  if (!sMe) return 0;
  if (sMouse.used) { const wx = (sMouse.x - sView.ox) / sView.s, wy = (sMouse.y - sView.oy) / sView.s; return Math.atan2(wy - (sMe.y - 36), wx - sMe.x); }
  let o = null, bd = 1e9; for (const q of shAlive()) { const d = Math.abs(q.x - sMe.x) + Math.abs(q.y - sMe.y); if (d < bd) { bd = d; o = q; } } if (!o) return sMe.face > 0 ? 0 : Math.PI; return Math.atan2(o.y - sMe.y, o.x - sMe.x || sMe.face);
}
function shStep(dt) {
  const P = sMe, K = sKeys;
  P.cd = Math.max(0, P.cd - dt); P.inv = Math.max(0, P.inv - dt);
  if (!P.alive) { P.resp -= dt; if (P.resp <= 0) { P.alive = true; P.hp = 100; P.x = P.spawnX; P.y = SGY; P.vx = P.vy = 0; P.inv = INV; sBurst(P.x, P.y - 30, '#35e6ff', 18); } return; }
  const dir = ((K.KeyD || K.ArrowRight || sTouch.r) ? 1 : 0) - ((K.KeyA || K.ArrowLeft || sTouch.l) ? 1 : 0), fire = K.KeyF || K.KeyJ || K.KeyK || sMouse.down || sTouch.f;
  const want = dir * SPEED, acc = (P.ground ? 3600 : 2000) * dt; P.vx += Math.max(-acc, Math.min(acc, want - P.vx));
  if ((K.KeyW || K.ArrowUp || K.Space || sTouch.j) && P.ground) { P.vy = -JUMP; P.ground = false; Snd.tone(420, 0.08, 'triangle', 0.06, 1.6); }
  P.vy += GRAV * dt; const py = P.y; P.x += P.vx * dt; P.y += P.vy * dt; P.ground = false;
  if (P.y >= SGY) { P.y = SGY; P.vy = 0; P.ground = true; }
  else if (P.vy >= 0 && !(K.KeyS || K.ArrowDown)) { for (const pl of SPLAT) if (py <= pl.y + 1 && P.y >= pl.y && P.x > pl.x - 8 && P.x < pl.x + pl.w + 8) { P.y = pl.y; P.vy = 0; P.ground = true; break; } }
  P.x = Math.max(SPW, Math.min(SW - SPW, P.x));
  P.aim = shAim(); P.face = Math.cos(P.aim) >= 0 ? 1 : -1;
  if (fire && P.cd <= 0 && SH.phase === 'play') {
    P.cd = SHOOT_FIRE_CD; const gx = P.x + Math.cos(P.aim) * 30, gy = P.y - 36 + Math.sin(P.aim) * 30;
    sBul.push({ x: gx, y: gy, vx: Math.cos(P.aim) * BSPEED, vy: Math.sin(P.aim) * BSPEED, t: 0, own: true, role: SH.role }); shSend({ t: 'shot', id: ++SH.shotId, x: Math.round(gx), y: Math.round(gy), a: Math.round(P.aim * 1000) / 1000 });
    sMuzzle(gx, gy, '#9ff4ff'); Snd.tone(900, 0.05, 'square', 0.05, 0.6);
  }
}
function shBullets(dt) {
  for (let i = sBul.length - 1; i >= 0; i--) {
    const b = sBul[i]; let dead = false; b.t += dt;
    for (let s = 0; s < 4 && !dead; s++) {
      b.x += b.vx * dt / 4; b.y += b.vy * dt / 4;
      if (b.x < -20 || b.x > SW + 20 || b.y < -40 || b.y > SGY + 4) { dead = true; if (b.y > SGY && b.y < SGY + 12) sBurst(b.x, SGY, '#ffffff', 4); break; }
      const tg = b.own ? Object.values(sOps) : [sMe];
      for (const tgt of tg) {
        if (tgt.alive && Math.abs(b.x - tgt.x) < SPW + 4 && b.y > tgt.y - SPH && b.y < tgt.y) {
          dead = true; sBurst(b.x, b.y, SCOL[b.role] || '#fff', 7);
          if (!b.own && tgt.inv <= 0) shHitMe(b.role);
          break;
        }
      }
    }
    if (dead || b.t > 1.6) sBul.splice(i, 1);
  }
}
function shHitMe(by) {
  const P = sMe; P.hp -= BDMG; sShake = 0.25; Snd.tone(180, 0.1, 'sawtooth', 0.1);
  if (P.hp <= 0) { P.hp = 0; P.alive = false; P.resp = RESPAWN; sBurst(P.x, P.y - 30, '#35e6ff', 34); shSend({ t: 'dead', by }); Snd.tone(100, 0.3, 'sawtooth', 0.14, 0.3); }
}
function sBurst(x, y, c, n) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = 60 + Math.random() * 260; sPart.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, t: 0.5 + Math.random() * 0.4, m: 0.9, c }); } }
function sMuzzle(x, y, c) { for (let i = 0; i < 3; i++) sPart.push({ x, y, vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.5) * 120, t: 0.12, m: 0.12, c }); }

function shootFrame(now) {
  if (!SH.running) return; SH.raf = requestAnimationFrame(shootFrame);
  const dt = Math.min(0.05, (now - SH.lastT) / 1000 || 0.016); SH.lastT = now;
  if (state !== 'shootgame' || !sMe) return;
  if (SH.phase === 'count') {
    SH.countT -= dt; const n = Math.ceil(SH.countT - 0.2);
    if (n !== SH.lastCount) { SH.lastCount = n; const el = $('shCount'); el.textContent = n > 0 ? String(n) : 'FIGHT!'; el.classList.remove('hidden', 'pop'); void el.offsetWidth; el.classList.add('pop'); if (n > 0) Snd.beep(); else { Snd.go(); setTimeout(() => $('shCount').classList.add('hidden'), 700); } }
    if (n <= 0) SH.phase = 'play';
  }
  if (SH.phase === 'play' || SH.phase === 'count') shStep(dt);
  if (SH.phase === 'play') shBullets(dt);
  { const k = 1 - Math.exp(-dt * 18); for (const O of Object.values(sOps)) { O.x += (O.tx - O.x) * k; O.y += (O.ty - O.y) * k; } }
  for (let i = sPart.length - 1; i >= 0; i--) { const p = sPart[i]; p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; if (p.t <= 0) sPart.splice(i, 1); }
  for (let i = sFeed.length - 1; i >= 0; i--) { sFeed[i].t -= dt; if (sFeed[i].t <= 0) sFeed.splice(i, 1); }
  sShake = Math.max(0, sShake - dt);
  SH.sendT -= dt; if (SH.sendT <= 0 && SH.phase !== 'over') { SH.sendT = 0.05; shSend({ t: 'st', x: Math.round(sMe.x * 10) / 10, y: Math.round(sMe.y * 10) / 10, vx: Math.round(sMe.vx), vy: Math.round(sMe.vy), f: sMe.face, a: Math.round(sMe.aim * 100) / 100, hp: sMe.hp, al: sMe.alive }); }
  shootDraw(now / 1000); shootHud(false);
}

/* ---------- drawing ---------- */
function shootResize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = window.innerWidth, h = window.innerHeight;
  sCv.width = Math.round(w * dpr); sCv.height = Math.round(h * dpr); sView.dpr = dpr; sView.w = w; sView.h = h;
  sView.s = Math.min(w / SW, h / SHH); sView.ox = (w - SW * sView.s) / 2; sView.oy = (h - SHH * sView.s) / 2;
}
function shootDraw(t) {
  const c = sCx, V = sView; c.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
  const g = c.createLinearGradient(0, 0, 0, V.h); g.addColorStop(0, '#0b0630'); g.addColorStop(1, '#2a1052'); c.fillStyle = g; c.fillRect(0, 0, V.w, V.h);
  const sx = sShake > 0 ? (Math.random() - 0.5) * 10 * sShake * (settings.shake ? 1 : 0) : 0, sy = sShake > 0 ? (Math.random() - 0.5) * 10 * sShake * (settings.shake ? 1 : 0) : 0;
  c.save(); c.translate(V.ox + sx, V.oy + sy); c.scale(V.s, V.s);
  for (const s of sStars) { c.globalAlpha = s.a * (0.7 + 0.3 * Math.sin(t * 2 + s.x)); c.fillStyle = '#fff'; c.fillRect(s.x, s.y, s.r, s.r); } c.globalAlpha = 1;
  c.fillStyle = '#ff8a3d'; c.globalAlpha = 0.9; c.beginPath(); c.arc(SW / 2, 230, 90, 0, 7); c.fill(); c.globalAlpha = 1; c.fillStyle = 'rgba(21,12,58,.45)'; c.beginPath(); c.arc(SW / 2 + 28, 205, 90, 0, 7); c.fill();
  c.fillStyle = '#150c3a'; c.fillRect(-100, SGY, SW + 200, SHH - SGY + 100); c.fillStyle = '#35e6ff'; c.fillRect(0, SGY, SW, 4);
  c.strokeStyle = 'rgba(53,230,255,.18)'; c.lineWidth = 1; for (let x = 0; x <= SW; x += 80) { c.beginPath(); c.moveTo(x, SGY + 4); c.lineTo(x - 40, SHH); c.stroke(); }
  for (const p of SPLAT) { c.fillStyle = '#2b1a6b'; c.fillRect(p.x, p.y, p.w, 14); c.fillStyle = '#ffb27a'; c.fillRect(p.x, p.y, p.w, 4); }
  c.strokeStyle = 'rgba(53,230,255,.5)'; c.lineWidth = 3; c.setLineDash([10, 12]); c.beginPath(); c.moveTo(SW / 2, 0); c.lineTo(SW / 2, SGY); c.stroke(); c.setLineDash([]);
  for (const ro in sOps) { const q = SH.room && SH.room.players.find((p) => p.role === ro); shDrawPlayer(sOps[ro], SCOL[ro], q ? q.nick : 'Opponent', t, false); }
  shDrawPlayer(sMe, SCOL[SH.role], (shMe() || {}).nick || 'You', t, true);
  for (const b of sBul) { c.strokeStyle = SCOL[b.role] || '#fff'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(b.x, b.y); c.lineTo(b.x - b.vx * 0.022, b.y - b.vy * 0.022); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(b.x, b.y, 3, 0, 7); c.fill(); }
  for (const p of sPart) { c.globalAlpha = Math.max(0, p.t / p.m); c.fillStyle = p.c; c.fillRect(p.x - 2, p.y - 2, 4, 4); } c.globalAlpha = 1;
  c.restore();
}
function shDrawPlayer(P, col, nick, t, me) {
  const c = sCx; if (!P.alive) return;
  if (P.inv > 0 && Math.floor(t * 14) % 2 === 0) return;
  c.save(); c.translate(P.x, P.y);
  c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(0, 2, 22, 5, 0, 0, 7); c.fill();
  const leg = P.ground ? Math.sin(t * 14 + P.x * 0.05) * Math.min(1, Math.abs(P.vx) / 200) * 8 : 6;
  c.fillStyle = '#e8e2f5'; c.fillRect(-12, -22, 10, 22 + leg * 0.2); c.fillRect(2, -22, 10, 22 - leg * 0.2);
  c.fillStyle = col; c.beginPath(); c.roundRect ? c.roundRect(-16, -54, 32, 36, 9) : c.rect(-16, -54, 32, 36); c.fill();
  c.fillStyle = '#e8e2f5'; c.beginPath(); c.arc(0, -58, 14, 0, 7); c.fill();
  c.fillStyle = '#10163d'; c.beginPath(); c.ellipse(P.face * 4, -58, 9, 7, 0, 0, 7); c.fill(); c.fillStyle = 'rgba(159,244,255,.8)'; c.fillRect(P.face * 4 - 5, -61, 5, 2);
  c.save(); c.translate(0, -36); c.rotate(P.aim); c.fillStyle = '#2a2a3a'; c.fillRect(6, -4, 30, 8); c.fillStyle = col; c.fillRect(30, -3, 8, 6); c.restore();
  c.restore();
  c.font = '900 italic 15px sans-serif'; c.textAlign = 'center'; c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,.8)'; c.strokeText(nick, P.x, P.y - 94); c.fillStyle = me ? '#ffffff' : '#ffd9b8'; c.fillText(nick, P.x, P.y - 94);
  c.fillStyle = 'rgba(0,0,0,.6)'; c.fillRect(P.x - 24, P.y - 88, 48, 6); c.fillStyle = P.hp > 50 ? '#5dff9a' : P.hp > 25 ? '#ffd24a' : '#ff5a4a'; c.fillRect(P.x - 24, P.y - 88, 48 * Math.max(0, P.hp) / 100, 6);
}
function shootHud(force) {
  const r = SH.room; if (!r) return;
  const hp = sMe ? sMe.hp : 100, feed = sFeed.map((f) => f.txt).join('|'), sc = r.players.map((p) => p.role + p.kills).join(',');
  const key = sc + ':' + hp + ':' + feed + ':' + r.players.length; if (!force && key === sLastHud) return; sLastHud = key;
  $('shScoreList').innerHTML = r.players.map((p) => '<div class="chip' + (p.role === SH.role ? ' me' : '') + '" style="--c:' + SCOL[p.role] + '" data-testid="shoot-score-' + p.role + '"><span>' + dEsc(p.nick) + '</span><b data-testid="shoot-kills-' + p.role + '">' + p.kills + '</b></div>').join('');
  $('shHpFill').style.width = hp + '%';
  $('shootFeed').innerHTML = sFeed.map((f) => '<div class="' + (f.me ? 'me' : 'opp') + '">' + dEsc(f.txt) + '</div>').join('');
}

/* ---------- input ---------- */
window.addEventListener('resize', () => { if (SH.running) shootResize(); });
window.addEventListener('keydown', (e) => {
  if (state !== 'shootgame' || (e.target && e.target.tagName === 'INPUT')) return;
  sKeys[e.code] = true; if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e) => { sKeys[e.code] = false; });
window.addEventListener('blur', () => { sKeys = {}; sMouse.down = false; });
sCv.addEventListener('mousemove', (e) => { sMouse.x = e.clientX; sMouse.y = e.clientY; sMouse.used = true; });
sCv.addEventListener('mousedown', (e) => { if (e.button === 0) { sMouse.down = true; sMouse.x = e.clientX; sMouse.y = e.clientY; sMouse.used = true; Snd.init(); } });
window.addEventListener('mouseup', () => { sMouse.down = false; });
sCv.addEventListener('contextmenu', (e) => e.preventDefault());
for (const b of document.querySelectorAll('.shBtn')) {
  const k = b.dataset.act, set = (v) => { sTouch[k] = v; b.classList.toggle('on', v); };
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); set(true); try { b.setPointerCapture(e.pointerId); } catch (x) {} Snd.init(); });
  const up = () => set(false); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up); b.addEventListener('contextmenu', (e) => e.preventDefault());
}

/* ---------- kind selector + wiring ---------- */
function duelSetKind(k) {
  DUEL.kind = k; const s = k === 'shoot';
  $('btnKindRace').classList.toggle('on', !s); $('btnKindShoot').classList.toggle('on', s);
  $('duelKindDesc').textContent = s ? '1v1 or 1v1v1 shooting arena \u00B7 everyone can kill everyone \u00B7 first to 40 kills wins' : 'Race a friend on the same track';
  $('duelHomeTitle').textContent = s ? 'Duel \u00B7 Shooting' : 'Duel \u00B7 Race';
  duelHomeErr('');
}
DUEL.kind = 'race';
on('btnKindRace', () => { duelSetKind('race'); Snd.click(); });
on('btnKindShoot', () => { duelSetKind('shoot'); Snd.click(); });
on('btnShoot2', () => { shSend({ t: 'cap', cap: 2 }); Snd.click(); });
on('btnShoot3', () => { shSend({ t: 'cap', cap: 3 }); Snd.click(); });
on('btnShootLeave', () => { Snd.click(); shootLeave(); });
on('btnShootCopy', () => { Snd.click(); duelCopy(); });
on('btnShootShare', () => { Snd.click(); if (navigator.share) navigator.share({ title: 'Turbo Drive shooting duel', text: 'Shoot me in Turbo Drive! Room code: ' + SH.code }).catch(() => {}); else duelCopy(); });
on('btnShootReady', () => { const m = shMe(); if (!m || !SH.room || SH.room.players.length < SH.room.cap) return; shSend({ t: 'ready', ready: !m.ready }); Snd.click(); });
on('btnShootRematch', shootRematch);
on('btnShootResLeave', () => { Snd.click(); shootLeave(); });
on('btnShootExit', () => { Snd.click(); shootAskLeave(); });
