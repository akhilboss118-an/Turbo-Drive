/* eslint-disable */
'use strict';
/* Online duel race: rooms, lobby, synchronized start, live opponent tracking, result */
const DUEL = { ws: null, role: '', pid: '', code: '', room: null, off: 0, bestRtt: 1e9, pingT: 0, result: null, oppFinish: null, ghost: null, samples: [], lastPos: 0, wantClose: false, reconnecting: false, rematchOn: false, modeJoin: false, lastLevelSent: 0, raceLaps: 1 };
const DUEL_PROTO = 2;                            // v2 = lap-aware client (server refuses race mode with older clients)
let duelRs = 0;
const duelLvl = (r) => (r.mode === 'race' ? DUEL_RACE_LEVEL : r.level);   // race mode always runs the 3-lap Grand Oval; the room's own level is ignored
const DUEL_MAX_LEVEL = 19;                       // level 20 needs the Mars Hover
const serverNow = () => Date.now() + DUEL.off;
const dName = (n) => LEVELS[n].name.replace('  ', ' \u00B7 ');
const dMe = () => DUEL.room && DUEL.room.players.find((p) => p.role === DUEL.role) || null;
const dOpp = () => DUEL.room && DUEL.room.players.find((p) => p.role !== DUEL.role) || null;
const duelRacing = () => state === 'countdown' || state === 'playing' || state === 'crashed' || state === 'finishing';
const duelLaps = () => (duelOn ? DUEL.raceLaps : 1);   // locked at race start so both players always use the same lap count
const duelProgress = (x, lp) => Math.max(0, Math.min(1, ((Math.max(1, lp || 1) - 1) + x / track.finishX) / duelLaps()));   // overall race progress across all laps
function duelOnLap() { duelSend({ t: 'pos', x: 0, y: 0, th: 0, vx: 0, vy: 0, rs: duelRs, cp: 0, lp: lap }); DUEL.lastPos = performance.now(); }
const r2 = (v) => Math.round(v * 100) / 100;
const dEsc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- network ---------- */
function duelCar() {
  const v = vehicleById(vehicleId), g = cosOf(vehicleId).eq.glow, it = g ? itemOf('glow', g) : null;
  return { id: v.id, name: v.name, model: v.model, glow: it ? (it.id === 'rainbow' ? 'rainbow' : it.color) : null };
}
function duelSend(o) { if (DUEL.ws && DUEL.ws.readyState === 1) { DUEL.ws.send(JSON.stringify(o)); return true; } return false; }
function duelOpen() {
  return new Promise((resolve, reject) => {
    let ws, opened = false;
    try { ws = new WebSocket(window.TD_SERVER.replace(/^http/, 'ws') + '/api/ws/duel'); } catch (e) { reject(e); return; }
    const to = setTimeout(() => { if (!opened) { try { ws.close(); } catch (e) {} reject(new Error('timeout')); } }, 8000);
    ws.onopen = () => { opened = true; clearTimeout(to); DUEL.ws = ws; DUEL.bestRtt = 1e9; clearInterval(DUEL.pingT); for (let i = 0; i < 4; i++) setTimeout(duelPing, i * 160); DUEL.pingT = setInterval(duelPing, 3000); resolve(ws); };
    ws.onmessage = (ev) => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } duelOnMsg(m); };
    ws.onclose = () => { clearTimeout(to); if (!opened) { reject(new Error('closed')); return; } if (DUEL.ws === ws) { DUEL.ws = null; clearInterval(DUEL.pingT); duelOnClose(); } };
    ws.onerror = () => {};
  });
}
function duelPing() { duelSend({ t: 'ping', c: Date.now() }); }
function duelOnMsg(m) {
  if (m.t === 'pong') { const rtt = Date.now() - m.c; if (rtt < DUEL.bestRtt) { DUEL.bestRtt = rtt; DUEL.off = m.s - (m.c + rtt / 2); } }
  else if (m.t === 'joined') {
    DUEL.role = m.role; DUEL.pid = m.pid; DUEL.code = m.code; DUEL.room = m.room; duelBusy(false); duelNote('');
    if (m.resumed) { duelRoomUpdate(); return; }
    if (m.role === 'host') { const lv = Math.max(1, Math.min(DUEL_MAX_LEVEL, unlocked, duelPrevLevel)); duelSend({ t: 'level', level: lv }); DUEL.room.level = lv; }
    DUEL.result = null; DUEL.oppFinish = null; duelEnterLobby();
  }
  else if (m.t === 'room') { DUEL.room = m.room; duelRoomUpdate(); }
  else if (m.t === 'error') {
    duelBusy(false);
    if (state === 'duel') { duelHomeErr(m.msg); if (DUEL.ws && !DUEL.code) { DUEL.wantClose = true; try { DUEL.ws.close(); } catch (e) {} DUEL.ws = null; } }
    else { toast(m.code === 'ROOM_NOT_FOUND' ? 'ROOM CLOSED' : 'DUEL', m.msg, 'warn'); if (m.code === 'ROOM_NOT_FOUND') duelEnd(); }
  }
  else if (m.t === 'start') duelStart(m);
  else if (m.t === 'opp') duelPushSample(m);
  else if (m.t === 'finish_rejected') { if (state === 'finishing') { setState('playing'); toast('KEEP RACING', 'Lap ' + lap, 'warn'); } }
  else if (m.t === 'opp_finished') { DUEL.oppFinish = m.time; duelBannerUpdate(); }
  else if (m.t === 'result') { DUEL.result = m; DUEL.room = m.room; duelOnResult(); }
  else if (m.t === 'result_update') { DUEL.room = m.room; if (state === 'duelresult') duelRenderResult(); }
  else if (m.t === 'opp_left') { toast('OPPONENT LEFT', null, 'warn'); }
  else if (m.t === 'room_closed') {
    if (state === 'lobby' || state === 'duel') { duelEnd(m.reason === 'expired' ? 'Room expired' : 'The host closed the room'); }
    else if (state !== 'duelresult') { duelEnd('The room was closed'); }
  }
}
function duelOnClose() {
  if (DUEL.wantClose || !duelOn) return;
  if (!DUEL.code) { duelBusy(false); if (state === 'duel') duelHomeErr('Connection lost. Try again.'); return; }
  DUEL.reconnectUntil = Date.now() + 15000; duelNote('Connection lost \u2013 reconnecting\u2026'); duelReconnect();
}
async function duelReconnect() {
  if (DUEL.reconnecting) return; DUEL.reconnecting = true;
  while (Date.now() < DUEL.reconnectUntil && !DUEL.wantClose && duelOn) {
    try { await duelOpen(); duelSend({ t: 'resume', code: DUEL.code, pid: DUEL.pid }); DUEL.reconnecting = false; return; } catch (e) { await new Promise((r) => setTimeout(r, 1000)); }
  }
  DUEL.reconnecting = false;
  if (DUEL.wantClose || !duelOn) return;
  if (duelRacing()) { const o = dOpp(); DUEL.result = { winner: o ? o.role : 'x', reason: 'disconnect' }; setState('duelresult'); duelRenderResult(); }
  else if (state !== 'duelresult') duelEnd('Connection lost');
}

/* ---------- entering / leaving ---------- */
function duelEnter() {
  duelOn = true; duelPrevLevel = level; DUEL.wantClose = false; DUEL.code = ''; DUEL.room = null; DUEL.result = null;
  document.body.classList.add('duelmode');
  const n = $('duelNick'); try { n.value = localStorage.getItem('td_nick') || ''; } catch (e) {} if (!n.value) n.value = 'Racer' + (100 + Math.floor(Math.random() * 900));
  $('duelCode').value = ''; duelHomeErr(''); duelBusy(false); $('duelJoinBox').classList.remove('open');
  duelSetKind(DUEL.kind || 'race'); setState('duel');
}
function duelEnd(msg) {
  if (typeof shootReset === 'function') shootReset();   // tear everything down and go back to the main menu (single-player progress untouched)
  DUEL.wantClose = true; clearInterval(DUEL.pingT);
  if (DUEL.ws) { try { DUEL.ws.close(); } catch (e) {} DUEL.ws = null; }
  DUEL.code = ''; DUEL.room = null; DUEL.result = null; DUEL.oppFinish = null; DUEL.samples = [];
  duelOn = false; DUEL.raceLaps = 1; lap = 1; $('lapHud').classList.add('hidden'); document.body.classList.remove('duel', 'duelmode'); duelDropGhost(); duelNote('');
  $('duelBanner').classList.add('hidden'); $('duelLeaveModal').classList.add('hidden');
  if (level !== duelPrevLevel) loadLevel(duelPrevLevel);
  applyStats(vehicleId); applyVehicle(vehicleId); toMenu(); if (msg) toast('DUEL', msg, 'warn');
}
function duelLeave() { if (SH.on || /^shoot/.test(state)) { shootLeave(); return; } duelSend({ t: 'leave' }); setTimeout(() => duelEnd(), 30); }
function duelAskLeave() { if (SH.on) { shootAskLeave(); return; } if (!duelRacing()) return; $('duelLeaveModal').classList.remove('hidden'); }
function duelEsc() { if (state === 'shootlobby') { shootLobbyLeave(); return; } if (SH.on || /^shoot/.test(state)) shootEsc(); else if (duelRacing()) { $('duelLeaveModal').classList.toggle('hidden'); } else if (state === 'duel' || state === 'lobby') duelLeave(); else if (state === 'duelresult') duelLeave(); }
function duelBusy(b, txt) { for (const id of ['btnDuelCreate', 'btnDuelJoinGo', 'btnDuelJoin', 'btnShootPrivate']) $(id).classList.toggle('off', b); if (b && txt) duelHomeErr(txt, true); }
function duelHomeErr(t, info) { const e = $('duelErr'); e.textContent = t || ''; e.style.color = info ? '#9ff4ff' : ''; }
function duelNick() {
  const v = $('duelNick').value.replace(/\s+/g, ' ').trim().slice(0, 16);
  if (!v) { duelHomeErr('Type a nickname first.'); $('duelNick').focus(); return ''; }
  try { localStorage.setItem('td_nick', v); } catch (e) {} return v;
}
async function duelConnectAnd(msgFn, busyTxt) {
  const nick = duelNick(); if (!nick) return;
  duelHomeErr(''); duelBusy(true, busyTxt); DUEL.wantClose = false; DUEL.code = '';
  if (DUEL.ws) { try { DUEL.ws.close(); } catch (e) {} DUEL.ws = null; }
  try { await duelOpen(); } catch (e) { duelBusy(false); duelHomeErr('Could not reach the game server. Check your internet connection.'); return; }
  duelSend(msgFn(nick));
}
function duelCreate() { if (DUEL.kind === 'shoot') { shootFind(); return; } duelConnectAnd((nick) => ({ t: 'create', nick, car: duelCar(), v: DUEL_PROTO }), 'Creating room\u2026'); }
function duelJoin() {
  if (DUEL.kind === 'shoot') { shootJoin(); return; }
  const c = $('duelCode').value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (c.length !== 5) { duelHomeErr('Enter the 5-character room code.'); return; }
  duelConnectAnd((nick) => ({ t: 'join', code: c, nick, car: duelCar(), v: DUEL_PROTO }), 'Joining room\u2026');
}

/* ---------- lobby ---------- */
function duelLoadLevel(n) {
  if (level !== n) loadLevel(n);
  if (state === 'lobby' || state === 'duel') { car.spawn(CPS[0].x, 0); settle(300); snapCamera(); }
}
function duelEnterLobby() { duelLoadLevel(duelLvl(DUEL.room)); setState('lobby'); duelRenderLobby(); }
function duelRoomUpdate() {
  const r = DUEL.room; if (!r) return;
  if ((state === 'lobby' || state === 'duel') && duelLvl(r) !== level) duelLoadLevel(duelLvl(r));
  if (state === 'lobby') duelRenderLobby();
  if (state === 'duelresult') duelRenderResult();
  const o = dOpp(); duelNote(o && !o.connected && (duelRacing() || state === 'lobby') ? 'Opponent connection lost \u2013 15 s to return' : '');
  duelBannerUpdate();
}
function pCard(p, role) {
  if (!p) return '<div class="pCard panel empty" data-testid="lobby-' + role + '-card"><div class="role">' + role + '</div><div class="nick">Waiting\u2026</div><div class="carNm">Share the code</div></div>';
  return '<div class="pCard panel' + (p.ready ? ' rdy' : '') + '" data-testid="lobby-' + role + '-card"><div class="role">' + role + (p.role === DUEL.role ? ' \u00B7 you' : '') + '</div><div class="nick" data-testid="lobby-' + role + '-nick">' + dEsc(p.nick) + '</div><img alt="" src="' + (THUMBS[p.car.id] || THUMBS.gt) + '"><div class="carNm" data-testid="lobby-' + role + '-car">' + dEsc(p.car.name) + '</div><span class="st ' + (p.connected ? '' : 'dc') + '" data-testid="lobby-' + role + '-status">' + (!p.connected ? 'OFFLINE' : p.ready ? 'READY' : 'NOT READY') + '</span></div>';
}
function duelRenderLobby() {
  const r = DUEL.room; if (!r) return;
  $('lobCode').innerHTML = r.code.split('').map((c) => '<span>' + c + '</span>').join('');
  const host = r.players.find((p) => p.role === 'host'), guest = r.players.find((p) => p.role === 'guest'), mine = dMe();
  $('lobCards').innerHTML = pCard(host, 'host') + pCard(guest, 'guest');
  const isHost = DUEL.role === 'host', maxL = Math.min(DUEL_MAX_LEVEL, unlocked), race = r.mode === 'race';
  $('lobLevelName').textContent = race ? dName(DUEL_RACE_LEVEL) + ' \u00B7 ' + DUEL_RACE_LAPS + ' LAPS' : dName(r.level);
  $('lobPrev').classList.toggle('hidden', !isHost || race); $('lobNext').classList.toggle('hidden', !isHost || race);
  $('btnModeDuel').classList.toggle('on', !race); $('btnModeRace').classList.toggle('on', race);
  $('btnModeDuel').classList.toggle('off', !isHost); $('btnModeRace').classList.toggle('off', !isHost);
  $('lobModeLab').textContent = isHost ? 'Mode' : 'Mode picked by host';
  $('lobLevelLab').textContent = race ? 'Track \u00B7 ' + DUEL_RACE_LAPS + ' laps, first to finish wins' : isHost ? 'Pick level (unlocked: 1\u2013' + maxL + ')' : 'Level picked by host';
  const btn = $('btnDuelReady'); btn.classList.toggle('off', !guest); btn.classList.toggle('on', !!(mine && mine.ready));
  btn.textContent = !guest ? 'Waiting for friend\u2026' : mine && mine.ready ? 'Ready \u2713 (tap to cancel)' : 'Ready';
  if (level === duelLvl(r)) dmapDraw($('lobMap'), null, null);
  $('lobHint').textContent = !guest ? 'Share the code with a friend to start.' : guest && host && host.ready && guest.ready ? 'Starting\u2026' : 'Both players tap Ready to start.';
}
function duelSetMode(mode) { const r = DUEL.room; if (!r || DUEL.role !== 'host' || r.mode === mode) return; duelSend({ t: 'mode', mode }); Snd.click(); }
function duelCycleLevel(d) {
  const r = DUEL.room; if (!r || DUEL.role !== 'host') return;
  if (r.mode === 'race') return;
  const maxL = Math.min(DUEL_MAX_LEVEL, unlocked); let n = r.level + d; if (n > maxL) n = 1; if (n < 1) n = maxL;
  duelSend({ t: 'level', level: n }); Snd.click();
}
function duelCopy() {
  const code = DUEL.code; const done = () => toast('CODE COPIED', code, 'good');
  try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(code).then(done, () => fallbackCopy(code, done)); return; } } catch (e) {}
  fallbackCopy(code, done);
}
function fallbackCopy(t, done) { try { const a = document.createElement('textarea'); a.value = t; a.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); } catch (e) {} done(); }
function duelShare() {
  const text = 'Race me in Turbo Drive! Room code: ' + DUEL.code;
  if (navigator.share) { navigator.share({ title: 'Turbo Drive duel', text }).catch(() => {}); } else { duelCopy(); }
}

/* ---------- race start ---------- */
function duelStart(m) {
  DUEL.room = m.room; DUEL.result = null; DUEL.oppFinish = null; DUEL.samples = []; DUEL.lastPos = 0; DUEL.oppProg = 0; DUEL.oppS = null; duelRs = 0; lap = 1; DUEL.rematchOn = false;
  DUEL.raceLaps = m.room && m.room.mode === 'race' ? DUEL_RACE_LAPS : 1;
  if (m.server_now && DUEL.bestRtt > 1e8) DUEL.off = m.server_now - Date.now();
  document.body.classList.add('duel'); $('duelBanner').classList.add('hidden'); $('duelLeaveModal').classList.add('hidden');
  const lv = m.room ? duelLvl(m.room) : m.level; if (level !== lv) loadLevel(lv);
  duelBuildGhost();
  startRun(Math.max(0.35, (m.go_at - serverNow()) / 1000 + 0.2));
  const o = dOpp(); $('dbMeNm').textContent = (dMe() || {}).nick || 'You'; $('dbOppNm').textContent = o ? o.nick : 'Opponent';
  duelUpdateBar();
}

/* ---------- track map (drawn from the real loaded track: top-down plan for curved tracks + elevation profile) ---------- */
let DMAP = { level: 0 };
function dmapBuild() {
  if (DMAP.level === level && DMAP.fx === track.finishX) return;
  const N = 220, fx = track.finishX, plan = [], elev = [], v = new THREE.Vector3(), hasPath = !!track.path;
  for (let i = 0; i <= N; i++) { const s = fx * i / N, h = refH(s); elev.push(h); if (hasPath) { toWorld(s, h, 0, v, h); plan.push([v.x, v.z]); } }
  DMAP = { level, fx, N, plan: hasPath ? plan : null, elev };
}
function dmapDraw(cv, me, opp) {
  if (!cv || !track) return; dmapBuild();
  const c = cv.getContext('2d'), W = cv.width, H = cv.height, M = DMAP, pad = 12; c.clearRect(0, 0, W, H);
  const eH = M.plan ? Math.round(H * 0.3) : H, pH = H - eH, at = (a, s) => { const f = Math.max(0, Math.min(1, s / M.fx)) * M.N, i = Math.min(M.N - 1, Math.floor(f)), k = f - i; return [a[i][0] + (a[i + 1][0] - a[i][0]) * k, a[i][1] + (a[i + 1][1] - a[i][1]) * k]; };
  let pp = null;
  if (M.plan) {
    let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9; for (const p of M.plan) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
    const sc = Math.min((W - 2 * pad) / Math.max(1, x1 - x0), (pH - 2 * pad) / Math.max(1, z1 - z0)), ox = (W - (x1 - x0) * sc) / 2 - x0 * sc, oy = (pH - (z1 - z0) * sc) / 2 - z0 * sc;
    pp = (s) => { const p = at(M.plan, s); return [p[0] * sc + ox, p[1] * sc + oy]; };
  }
  const hs = M.elev; let h0 = 1e9, h1 = -1e9; for (const h of hs) { h0 = Math.min(h0, h); h1 = Math.max(h1, h); }
  const ex = (s) => pad + Math.max(0, Math.min(1, s / M.fx)) * (W - 2 * pad), ey = (h) => pH + eH - pad - ((h - h0) / Math.max(4, h1 - h0)) * (eH - 2 * pad);
  const eAt = (s) => { const f = Math.max(0, Math.min(1, s / M.fx)) * M.N, i = Math.min(M.N - 1, Math.floor(f)); return hs[i] + (hs[i + 1] - hs[i]) * (f - i); };
  c.lineCap = 'round'; c.lineJoin = 'round';
  if (pp) {
    c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 9; c.beginPath(); for (let i = 0; i <= M.N; i++) { const q = pp(M.fx * i / M.N); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); } c.stroke();
    c.strokeStyle = '#35e6ff'; c.lineWidth = 3.5; c.beginPath(); for (let i = 0; i <= M.N; i++) { const q = pp(M.fx * i / M.N); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); } c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 1; c.beginPath(); c.moveTo(pad, pH); c.lineTo(W - pad, pH); c.stroke();
  }
  c.beginPath(); c.moveTo(ex(0), pH + eH); for (let i = 0; i <= M.N; i++) { const s = M.fx * i / M.N; c.lineTo(ex(s), ey(eAt(s))); } c.lineTo(ex(M.fx), pH + eH); c.closePath(); c.fillStyle = 'rgba(53,230,255,.16)'; c.fill();
  c.strokeStyle = '#ffb27a'; c.lineWidth = 2.5; c.beginPath(); for (let i = 0; i <= M.N; i++) { const s = M.fx * i / M.N; i ? c.lineTo(ex(s), ey(eAt(s))) : c.moveTo(ex(s), ey(eAt(s))); } c.stroke();
  const dot = (s, col, r) => { if (s === null || s === undefined) return; if (pp) { const q = pp(s); c.fillStyle = col; c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.arc(q[0], q[1], r, 0, 7); c.fill(); c.stroke(); } const y = ey(eAt(s)); c.fillStyle = col; c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.arc(ex(s), y, r * 0.85, 0, 7); c.fill(); c.stroke(); };
  for (let i = 1; i < CPS.length; i++) dot(CPS[i].x, 'rgba(255,255,255,.55)', 2.6);
  dot(0, '#6dff9a', 5.5); dot(M.fx, '#ffffff', 5.5);
  c.fillStyle = '#fff'; c.font = '900 11px sans-serif'; c.textAlign = 'left';
  if (pp) { const a = pp(0), b = pp(M.fx); c.fillText('START', a[0] + 7, a[1] - 6); c.fillText('FINISH', b[0] + 7, b[1] + 12); }
  dot(opp, '#ff8a3d', 5); dot(me, '#35e6ff', 5.5);
}

/* ---------- ghost of the opponent ---------- */
function duelDropGhost() { const G = DUEL.ghost; if (!G) return; scene.remove(G.root); disposeGroup(G.root); DUEL.ghost = null; }
function duelBuildGhost() {
  duelDropGhost(); const o = dOpp(); if (!o) return;
  const root = new THREE.Group(), src = carMesh[o.car.model] || carMesh.car5, g = src.clone(true); g.visible = true;
  g.traverse((n) => {
    n.visible = true;
    if (n.material) {
      const ms = (Array.isArray(n.material) ? n.material : [n.material]).map((mt) => { const k = mt.clone(); k.transparent = true; k.opacity = 0.42 * (mt.transparent ? mt.opacity : 1); k.depthWrite = false; return k; });
      n.material = Array.isArray(n.material) ? ms : ms[0];
    }
  });
  root.add(g);
  let glow = null;
  if (o.car.glow) { glow = mkGlow(4.8, 2.8, true); glow.position.set(0, -0.1, 0); glow.visible = true; glow.material.opacity = 0.6; glow.material.color.set(o.car.glow === 'rainbow' ? '#ffffff' : o.car.glow); root.add(glow); }
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const c = cv.getContext('2d');
  c.font = '900 italic 34px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 7; c.strokeStyle = 'rgba(0,0,0,.85)'; c.strokeText(o.nick, 128, 32); c.fillStyle = '#ffb27a'; c.fillText(o.nick, 128, 32);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthTest: false, opacity: 0.9 })); sp.scale.set(4.4, 1.1, 1); sp.position.set(0, 2.3, 0); sp.renderOrder = 10; root.add(sp);
  root.visible = false; scene.add(root); DUEL.ghost = { root, glow, g, hover: o.car.model === 'hover' };
}
function duelPushSample(m) {
  if (typeof m.x !== 'number') return; const S = DUEL.samples;
  S.push({ t: performance.now(), x: m.x, y: m.y || 0, th: m.th || 0, vx: m.vx || 0, vy: m.vy || 0, rs: m.rs | 0, cp: m.cp | 0, lp: m.lp | 0 || 1 });
  while (S.length > 3 && S[1].t < performance.now() - 2000) S.shift();
}
const _gq = new THREE.Quaternion();
function duelUpdateGhost(t) {
  const G = DUEL.ghost, S = DUEL.samples; if (!G) return;
  if (!S.length) { G.root.visible = false; return; }
  const rt = t - 120; let a = null, b = null;
  for (let i = S.length - 1; i >= 0; i--) if (S[i].t <= rt) { a = S[i]; b = S[i + 1] || null; break; }
  let x, y, th;
  if (!a) { a = S[0]; x = a.x; y = a.y; th = a.th; }
  else if (b && b.rs === a.rs) { const k = Math.max(0, Math.min(1, (rt - a.t) / Math.max(1, b.t - a.t))); x = a.x + (b.x - a.x) * k; y = a.y + (b.y - a.y) * k; th = a.th + (b.th - a.th) * k; }
  else if (b) { x = b.x; y = b.y; th = b.th; }
  else { const d = Math.min(0.3, (rt - a.t) / 1000); x = a.x + a.vx * d; y = a.y + a.vy * d; th = a.th; }
  if (track.path) { toWorld(x, y, 0, G.root.position); frameQuat(x, _gq); G.root.quaternion.copy(_gq).multiply(_qz.setFromAxisAngle(_AZ, th)); }
  else { G.root.position.set(x, y, 0); G.root.rotation.set(0, 0, th); }
  if (G.hover) G.g.position.y = Math.sin(t * 0.006) * 0.05;
  if (G.glow) { G.glow.visible = true; if (DUEL.room) { const o = dOpp(); if (o && o.car.glow === 'rainbow') { const c = hsl(((t * 0.0004) % 1 + 1) % 1); G.glow.material.color.setRGB(c[0], c[1], c[2]); } } }
  G.root.visible = true; const ls = S[S.length - 1]; DUEL.oppProg = DUEL.oppFinish !== null ? 1 : duelProgress(ls.x, ls.lp); DUEL.oppS = ls.x;
}

/* ---------- per-frame hook (called from loop.js tick) ---------- */
function duelTick(dt) {
  if (!duelRacing()) { if (DUEL.ghost) DUEL.ghost.root.visible = false; return; }
  const t = performance.now();
  if (t - DUEL.lastPos >= 100) { DUEL.lastPos = t; duelSend({ t: 'pos', x: r2(car.x), y: r2(car.y), th: r2(car.th), vx: r2(car.vx), vy: r2(car.vy), rs: duelRs, cp: cpIndex, lp: lap }); }
  duelUpdateGhost(t); duelUpdateBar();
  if (t - (DUEL.mapT || 0) > 100) { DUEL.mapT = t; dmapDraw($('duelMap'), car.x, DUEL.oppFinish !== null ? track.finishX : DUEL.oppS); }
}
function duelUpdateBar() {
  const mine = duelProgress(car.x, lap), ox = DUEL.oppFinish !== null ? 1 : (DUEL.oppProg || 0);
  $('dbMe').style.left = (mine * 100).toFixed(1) + '%'; $('dbOpp').style.left = (ox * 100).toFixed(1) + '%';
}
function duelNote(t) { DUEL.note = t; duelBannerUpdate(); }
function duelBannerUpdate() {
  const el = $('duelBanner'), txt = $('duelBannerTxt'), btn = $('btnDuelShowRes');
  const lost = DUEL.result && DUEL.result.reason === 'finish' && DUEL.result.winner !== DUEL.role;
  let h = '';
  if (duelRacing() && (lost || (DUEL.oppFinish !== null && state !== 'finishing'))) { const o = dOpp(); h = 'Opponent finished<small>' + dEsc(o ? o.nick : '') + ' \u00B7 ' + fmt(DUEL.oppFinish || 0) + ' \u2013 keep driving to set your time</small>'; btn.classList.remove('hidden'); }
  else if (DUEL.note && (duelRacing() || state === 'lobby')) { h = DUEL.note; btn.classList.add('hidden'); }
  if (state === 'lobby') { $('lobHint').textContent = DUEL.note || $('lobHint').textContent; el.classList.add('hidden'); return; }
  txt.innerHTML = h; el.classList.toggle('hidden', !h || !duelRacing());
}

/* ---------- finish + result ---------- */
function duelOnFinish() { duelSend({ t: 'finish', time: r2(timeT), lp: lap }); }
function duelOnResult() {
  const r = DUEL.result, won = r.winner === DUEL.role;
  if (state === 'duelresult') { duelRenderResult(); return; }
  if (r.reason !== 'finish' && duelRacing()) { setState('duelresult'); duelRenderResult(); return; }   // opponent left / dropped, or we lost the connection
  if (!won) duelBannerUpdate();
}
function duelShowResult() { setState('duelresult'); $('duelBanner').classList.add('hidden'); duelRenderResult(); }
function duelRenderResult() {
  const r = DUEL.result, room = DUEL.room, m = dMe(), o = dOpp(), won = r && r.winner === DUEL.role;
  const head = $('drHead'); head.textContent = !r ? 'FINISHED' : won ? 'WINNER!' : 'YOU LOST'; head.classList.toggle('lose', !!r && !won);
  const why = !r ? 'Waiting for the result\u2026' : r.reason === 'finish' ? (won ? (duelLaps() > 1 ? 'You completed all ' + duelLaps() + ' laps first' : 'You crossed the finish line first') : 'Opponent finished the race first') : r.reason === 'disconnect' ? (won ? 'Opponent disconnected' : 'You lost the connection') : (won ? 'Opponent left the race' : 'You left the race');
  $('drSub').textContent = why;
  const tm = (p) => (p && typeof p.time === 'number' ? fmt(p.time) : p && p.connected === false ? 'left' : 'not finished');
  $('drRows').innerHTML = '<div class="drRow me' + (won ? ' win' : '') + '"><span class="nm" data-testid="result-me-nick">' + dEsc(m ? m.nick : 'You') + ' (you)</span><span class="tm" data-testid="result-me-time">' + tm(m) + '</span></div>'
    + '<div class="drRow opp' + (r && !won ? ' win' : '') + '"><span class="nm" data-testid="result-opp-nick">' + dEsc(o ? o.nick : 'Opponent') + '</span><span class="tm" data-testid="result-opp-time">' + (o && typeof o.time === 'number' ? fmt(o.time) : o ? (o.connected === false ? 'disconnected' : r && r.reason !== 'finish' ? 'did not finish' : 'still racing\u2026') : 'left') + '</span></div>';
  const rb = $('btnDuelRematch'), gone = !o || !DUEL.ws;
  rb.classList.toggle('off', gone); rb.classList.toggle('on', !!(m && m.rematch));
  rb.textContent = gone ? 'Opponent left' : m && m.rematch ? 'Waiting\u2026 (tap to cancel)' : 'Rematch';
  $('drNote').textContent = o && o.rematch && !(m && m.rematch) ? 'Opponent wants a rematch!' : '';
}
function duelRematch() { const m = dMe(); duelSend({ t: 'rematch', on: !(m && m.rematch) }); Snd.click(); }

/* ---------- wiring ---------- */
on('btnDuel', () => { Snd.click(); if (typeof requestGameFullscreen === 'function') requestGameFullscreen(); duelEnter(); });
on('btnDuelBack', () => { Snd.click(); duelEnd(); });
on('btnDuelCreate', () => { if (typeof requestGameFullscreen === 'function') requestGameFullscreen(); duelCreate(); });
on('btnDuelJoin', () => { if (typeof requestGameFullscreen === 'function') requestGameFullscreen(); $('duelJoinBox').classList.add('open'); $('duelCode').focus(); Snd.click(); });
on('btnDuelJoinGo', () => { if (typeof requestGameFullscreen === 'function') requestGameFullscreen(); duelJoin(); });
on('btnLobbyLeave', () => { Snd.click(); duelLeave(); });
on('btnDuelCopy', () => { Snd.click(); duelCopy(); });
on('btnDuelShare', () => { Snd.click(); duelShare(); });
on('btnModeDuel', () => duelSetMode('duel'));
on('btnModeRace', () => duelSetMode('race'));
on('lobPrev', () => duelCycleLevel(-1));
on('lobNext', () => duelCycleLevel(1));
on('btnDuelReady', () => { const m = dMe(); if (!m) return; duelSend({ t: 'ready', ready: !m.ready }); Snd.click(); });
on('btnDuelRematch', duelRematch);
on('btnDuelLeave', () => { Snd.click(); duelLeave(); });
on('btnDuelKeep', () => { $('duelLeaveModal').classList.add('hidden'); Snd.click(); });
on('btnDuelQuit', () => { Snd.click(); duelLeave(); });
on('btnDuelShowRes', () => { duelShowResult(); });
$('duelCode').addEventListener('keydown', (e) => { if (e.key === 'Enter') duelJoin(); });
$('duelNick').addEventListener('keydown', (e) => { if (e.key === 'Enter') duelCreate(); });
window.addEventListener('td:state', () => { if (!duelRacing()) $('duelLeaveModal').classList.add('hidden'); duelBannerUpdate(); });
window.addEventListener('pagehide', () => { if (duelOn && DUEL.ws && DUEL.code) { try { DUEL.ws.close(); } catch (e) {} } });
