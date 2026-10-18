/* eslint-disable */
'use strict';
/* 3D online shooting duel: quick match with a real player inside the Level 27 arena (same on-foot engine, camera, controls and look).
   Server-authoritative health: shooters report hits, the server applies damage and decides the winner. */
const SH = { ws: null, role: '', room: null, wantClose: false, searching: false, on: false, phase: 'idle', over: null, opp: null, sendT: 0, prevVeh: null, walls: null, hitT: 0 };
const SH_ARENA = { x0: -48, x1: 48, z0: -56, z1: 56 }, SH_SPAWN = { host: [-18, -38, 0], guest: [18, 34, Math.PI] };
let SH_FB0 = null;
const shR = (v) => Math.round(v * 100) / 100;
const shMe = () => SH.room && SH.room.players.find((p) => p.role === SH.role) || null;
const shOppInfo = () => SH.room && SH.room.players.find((p) => p.role !== SH.role) || null;
const shSend = (o) => { if (SH.ws && SH.ws.readyState === 1) { SH.ws.send(JSON.stringify(o)); return true; } return false; };

/* ---------- HUD overlay ---------- */
const shHudEl = document.createElement('div'); shHudEl.id = 'd3Hud'; shHudEl.setAttribute('data-testid', 'duel3d-hud');
shHudEl.innerHTML = '<div class="d3Bar me" data-testid="duel3d-me"><span class="nm" id="d3MeNm"></span><div class="bar"><i id="d3MeHp" data-testid="duel3d-me-hp-bar"></i></div><b id="d3MeN" data-testid="duel3d-me-hp">100</b></div><div class="d3Vs" data-testid="duel3d-score"><span id="d3Sc" data-testid="duel3d-kills"><b class="k me">0</b><em>:</em><b class="k op">0</b></span><small id="d3Goal" data-testid="duel3d-goal">FIRST TO 40</small><small id="d3Clock" data-testid="duel3d-clock">00:00</small></div><div class="d3Bar opp" data-testid="duel3d-opp"><b id="d3OppN" data-testid="duel3d-opp-hp">100</b><div class="bar"><i id="d3OppHp" data-testid="duel3d-opp-hp-bar"></i></div><span class="nm" id="d3OppNm" data-testid="duel3d-opp-name"></span></div>';
$('ui').appendChild(shHudEl);
const shHitEl = document.createElement('div'); shHitEl.id = 'd3Hit'; shHitEl.setAttribute('data-testid', 'duel3d-hit-marker'); shHitEl.innerHTML = '<i></i><i></i><i></i><i></i>'; $('ui').appendChild(shHitEl);
const shExitEl = document.createElement('button'); shExitEl.id = 'd3Exit'; shExitEl.className = 'rbtn'; shExitEl.setAttribute('data-testid', 'duel3d-exit-btn'); shExitEl.setAttribute('aria-label', 'Leave match'); shExitEl.textContent = 'LEAVE'; $('ui').appendChild(shExitEl);
shExitEl.addEventListener('click', () => { Snd.click(); shootAskLeave(); });

/* ---------- quick chat (one-tap quips, index-based so no free text) ---------- */
const SH_QUIPS = ['Nice shot!', 'Good game', 'Too easy', 'Watch out!', 'Oops, sorry', 'Rematch?'];
const shQuipEl = document.createElement('div'); shQuipEl.id = 'd3Quips'; shQuipEl.setAttribute('data-testid', 'duel-quips-panel');
shQuipEl.innerHTML = SH_QUIPS.map((q, i) => '<button class="d3QBtn" data-i="' + i + '" data-testid="duel-quip-btn-' + i + '" title="Key ' + (i + 1) + '"><kbd>' + (i + 1) + '</kbd>' + q + '</button>').join('');
$('ui').appendChild(shQuipEl);
const shQuipFeed = document.createElement('div'); shQuipFeed.id = 'd3QuipFeed'; shQuipFeed.setAttribute('data-testid', 'duel-quip-feed'); $('ui').appendChild(shQuipFeed);
function shQuipShow(i, mine) {
  const q = SH_QUIPS[i]; if (!q) return; const op = shOppInfo(), d = document.createElement('div');
  d.className = mine ? 'me' : 'opp'; d.setAttribute('data-testid', mine ? 'duel-quip-sent' : 'duel-quip-received');
  d.textContent = (mine ? 'You' : (op ? op.nick : 'Opponent')) + ': ' + q; shQuipFeed.appendChild(d);
  while (shQuipFeed.children.length > 3) shQuipFeed.removeChild(shQuipFeed.firstChild);
  setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 400); }, 2800);
  if (!mine) { try { Snd.tone(720, 0.07, 'sine', 0.08, 1); } catch (e) {} }
}
let shQuipT = 0;
function shQuipSend(i) {
  const now = Date.now(); if (!SH.on || !SH_QUIPS[i] || now - shQuipT < 900) return; shQuipT = now;
  if (shSend({ t: 'quip', i })) shQuipShow(i, true);
}
shQuipEl.addEventListener('click', (e) => { const b = e.target.closest('.d3QBtn'); if (b) { Snd.click(); shQuipSend(+b.dataset.i); } });
window.addEventListener('keydown', (e) => { if (e.repeat || !SH.on || !/^Digit[1-6]$/.test(e.code)) return; const t = e.target && e.target.tagName; if (t === 'INPUT' || t === 'TEXTAREA') return; shQuipSend(+e.code.slice(5) - 1); });

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
function shSearchUi(on) { SH.searching = on; const b = $('btnDuelCreate'); if (b) b.textContent = on ? 'Cancel search' : (DUEL.kind === 'shoot' ? 'Find Match' : 'Create Room'); }
async function shootFind() {
  if (SH.searching) { shootCancel(); return; }
  const nick = duelNick(); if (!nick) return;
  duelHomeErr('Connecting\u2026', true); SH.wantClose = false;
  if (SH.ws) { SH.wantClose = true; try { SH.ws.close(); } catch (e) {} SH.ws = null; SH.wantClose = false; }
  try { await shootOpen(); } catch (e) { duelHomeErr('Could not reach the duel server. Check your internet connection.'); return; }
  shSearchUi(true); duelHomeErr('Searching for an opponent\u2026', true); shSend({ t: 'quick', nick });
}
/* ---------- private rooms (code + kill limit) ---------- */
async function shPrivateConnect(msgFn, busyTxt) {
  const nick = duelNick(); if (!nick) return;
  duelHomeErr(busyTxt, true); duelBusy(true); SH.wantClose = true;
  if (SH.ws) { try { SH.ws.close(); } catch (e) {} SH.ws = null; }
  SH.wantClose = false;
  try { await shootOpen(); } catch (e) { duelBusy(false); duelHomeErr('Could not reach the duel server. Check your internet connection.'); return; }
  shSend(msgFn(nick));
}
function shootCreate() { shPrivateConnect((nick) => ({ t: 'create', nick }), 'Creating room\u2026'); }
function shootJoin() {
  const c = $('duelCode').value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (c.length !== 5) { duelHomeErr('Enter the 5-character room code.'); return; }
  shPrivateConnect((nick) => ({ t: 'join', code: c, nick }), 'Joining room\u2026');
}
function shLobbyOnMsg(m) {
  SH.role = m.role; SH.room = m.room; duelBusy(false); duelHomeErr('');
  if (!SH.lobbyOn) { SH.lobbyOn = true; setState('shootlobby'); }
  shLobbyRender();
}
function shLobbyRender() {
  const r = SH.room; if (!r) return; const host = SH.role === 'host', two = r.players.length === 2;
  $('shlCode').innerHTML = r.code.split('').map((c) => '<span>' + c + '</span>').join('');
  $('shlPlayers').innerHTML = ['host', 'guest'].map((role) => { const p = r.players.find((q) => q.role === role); return '<div class="drRow ' + (role === SH.role ? 'me' : 'opp') + '"><span class="nm" data-testid="shoot-lobby-' + role + '-nick">' + (p ? dEsc(p.nick) + (role === SH.role ? ' (you)' : '') : 'Waiting for friend\u2026') + '</span><span class="tm">' + (role === 'host' ? 'HOST' : '') + '</span></div>'; }).join('');
  for (const n of [10, 20, 40]) { const b = $('btnShLim' + n); b.classList.toggle('on', r.kills_to_win === n); b.classList.toggle('off', !host); }
  $('shlLimLab').textContent = host ? 'Kills to win \u00B7 you choose' : 'Kills to win \u00B7 picked by host';
  const st = $('btnShStart'); st.classList.toggle('off', !host || !two); st.style.display = host ? '' : 'none';
  $('shlHint').textContent = host ? (two ? 'Your friend is in. Press Start when ready.' : 'Send the code to your friend and wait for them to join.') : 'Waiting for the host to start the duel\u2026 First to ' + r.kills_to_win + ' kills wins.';
}
function shLobbyClosed(msg) {
  SH.wantClose = true; if (SH.ws) { try { SH.ws.close(); } catch (e) {} SH.ws = null; }
  SH.lobbyOn = false; SH.room = null; SH.role = ''; if (state === 'shootlobby') setState('duel'); duelBusy(false); duelHomeErr(msg || '');
}
function shootLobbyLeave() { shSend({ t: 'leave' }); shLobbyClosed(''); }
function shLobbyShareText() { return 'Join my Turbo Drive duel (first to ' + shGoal() + ' kills)! Room code: ' + SH.room.code; }
on('btnShootPrivate', () => { Snd.click(); shootCreate(); });
on('btnShLobbyLeave', () => { Snd.click(); shootLobbyLeave(); });
on('btnShStart', () => { Snd.click(); shSend({ t: 'begin' }); });
on('btnShCopy', () => { Snd.click(); if (SH.room && navigator.clipboard) navigator.clipboard.writeText(SH.room.code).then(() => toast('COPIED', SH.room.code, 'good')).catch(() => {}); });
on('btnShShare', () => { Snd.click(); if (!SH.room) return; if (navigator.share) navigator.share({ text: shLobbyShareText() }).catch(() => {}); else if (navigator.clipboard) navigator.clipboard.writeText(shLobbyShareText()).then(() => toast('COPIED', 'Invite text copied', 'good')).catch(() => {}); });
for (const n of [10, 20, 40]) on('btnShLim' + n, () => { Snd.click(); shSend({ t: 'limit', n }); });

function shootCancel() { SH.wantClose = true; shSend({ t: 'cancel' }); if (SH.ws) { try { SH.ws.close(); } catch (e) {} SH.ws = null; } shSearchUi(false); duelHomeErr(''); }
function shootOnClose() {
  if (SH.wantClose || !duelOn) return;
  if (SH.searching) { shSearchUi(false); duelHomeErr('Connection lost. Try again.'); return; }
  if (SH.lobbyOn) { shLobbyClosed('Connection lost.'); return; }
  if (SH.on && SH.phase !== 'over') { shootOver({ winner: SH.role === 'host' ? 'guest' : 'host', reason: 'disconnect', room: SH.room, local: true }); return; }
  if (SH.on) { if (SH.room) SH.room.players.forEach((p) => { if (p.role !== SH.role) p.connected = false; }); shootRenderResult(); }
}
function shootOnMsg(m) {
  if (m.t === 'queued') { duelHomeErr('Searching for an opponent\u2026 (' + m.waiting + ' waiting)', true); }
  else if (m.t === 'start') shootStart(m);
  else if (m.t === 'opp') shOppState(m);
  else if (m.t === 'rtc') TdVoice.signal(m.d);
  else if (m.t === 'quip') shQuipShow(m.i, false);
  else if (m.t === 'oshot') shOppShot(m);
  else if (m.t === 'lobby') shLobbyOnMsg(m);
  else if (m.t === 'closed') shLobbyClosed('The host closed the room.');
  else if (m.t === 'err') { try { SH.wantClose = true; if (SH.ws) SH.ws.close(); } catch (e) {} SH.ws = null; duelBusy(false); duelHomeErr(m.msg || 'Could not join.'); }
  else if (m.t === 'hp') shOnHp(m);
  else if (m.t === 'kill') shOnKill(m);
  else if (m.t === 'over') { SH.room = m.room; shootOver(m); }
  else if (m.t === 'room') { SH.room = m.room; shootRenderResult(); }
  else if (m.t === 'opp_left') { TdVoice.stop(); if (m.room) SH.room = m.room; shootRenderResult(); }
}

/* ---------- match start ---------- */
function shSpawn() {
  const s = SH_SPAWN[SH.role] || SH_SPAWN.host;
  FT.p.set(s[0], footGround(s[0], s[1]), s[1]); FT.yaw = FT.camYaw = FT.charYaw = s[2]; FT.camPitch = 0.2; FT.hp = 100; FT.reserve = Math.max(FT.reserve, 90); FT.hurtT = 0;
}
function shootStart(m) {
  shSearchUi(false); duelHomeErr(''); SH.lobbyOn = false; SH.role = m.role; SH.room = m.room; SH.over = null; SH.phase = 'count'; SH.clock = 0; SH.sendT = 0; SH.on = true; SH.opp = null;
  if (SH.prevVeh === null) SH.prevVeh = vehicleId;
  if (!SH_FB0) SH_FB0 = { x0: FB.x0, x1: FB.x1, z0: FB.z0, z1: FB.z1 };
  Object.assign(FB, SH_ARENA); document.body.classList.add('d3'); $('duelLeaveModal').classList.add('hidden'); $('shootResult').classList.add('hidden');
  const me = shMe(), op = shOppInfo(); $('d3MeNm').textContent = me ? me.nick : 'You'; $('d3OppNm').textContent = op ? op.nick : 'Opponent'; shHudBars(100, 100); shScore(); SH.deadT = 0;
  if (level !== 27) loadLevel(27);
  startRun(3.4);
  astroOnReady(() => { if (ASTRO.inner) ASTRO.inner.rotation.x = 0; if (SH.on) { shMakeOpp(); shMakeWalls(); } });
  TdVoice.start(shSend, SH.role === 'host');
}
function shMakeWalls() {
  if (SH.walls && SH.walls.parent === FT.world) return;
  const g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({ color: 0x35e6ff, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }), A = SH_ARENA, cx = (A.x0 + A.x1) / 2, cz = (A.z0 + A.z1) / 2;
  const mk = (w, x, z, ry) => { const p = new THREE.Mesh(new THREE.PlaneGeometry(w, 40), mat); p.position.set(x, 12, z); p.rotation.y = ry; g.add(p); };
  mk(A.x1 - A.x0, cx, A.z0, 0); mk(A.x1 - A.x0, cx, A.z1, 0); mk(A.z1 - A.z0, A.x0, cz, Math.PI / 2); mk(A.z1 - A.z0, A.x1, cz, Math.PI / 2);
  FT.world.add(g); SH.walls = g;
}

/* ---------- opponent (cloned astronaut, tinted) ---------- */
function shNameplate(txt) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const c = cv.getContext('2d');
  c.font = '900 italic 34px sans-serif'; c.textAlign = 'center'; c.lineWidth = 7; c.strokeStyle = 'rgba(0,0,0,.85)'; c.strokeText(txt, 128, 44); c.fillStyle = '#ff9a6a'; c.fillText(txt, 128, 44);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, fog: false, depthWrite: false })); sp.scale.set(2.4, 0.6, 1); sp.position.y = 2.35; return sp;
}
function shMakeOpp() {
  if (!ASTRO.ready || !FT.world) return;
  const src = ASTRO.inner, a = [], b = []; src.traverse((o) => a.push(o)); const c = src.clone(); c.traverse((o) => b.push(o));
  for (let i = 0; i < a.length; i++) if (a[i].isSkinnedMesh) { const sk = a[i].skeleton, bones = sk.bones.map((x) => b[a.indexOf(x)]); b[i].skeleton = new THREE.Skeleton(bones, sk.boneInverses); b[i].bind(b[i].skeleton, a[i].bindMatrix); }
  let flash = null; const tint = new THREE.Color(0xff7a4a);
  c.traverse((o) => {
    if (o.isSprite) flash = o;
    if (o.isMesh) { o.frustumCulled = false; const ms = (Array.isArray(o.material) ? o.material : [o.material]).map((x) => { const n = x.clone(); if (n.color) n.color.lerp(tint, 0.38); if (n.emissive) n.emissive.setHex(0x4a1408); return n; }); o.material = Array.isArray(o.material) ? ms : ms[0]; }
  });
  const g = new THREE.Group(); g.add(c); const op = shOppInfo(); g.add(shNameplate(op ? op.nick : 'Opponent'));
  const mixer = new THREE.AnimationMixer(c), acts = {}; for (const k in ASTRO.clips) { acts[k] = mixer.clipAction(ASTRO.clips[k]); acts[k].setLoop(THREE.LoopRepeat); }
  acts.reload.setLoop(THREE.LoopOnce); acts.reload.clampWhenFinished = true;
  const s = SH_SPAWN[SH.role === 'host' ? 'guest' : 'host'];
  const O = { g, c, mixer, acts, flash, flashT: 0, cur: '', curKey: '', x: s[0], z: s[1], tx: s[0], tz: s[1], tyaw: s[2], remote: true, cy: 1.1, r: 0.55, dead: 0, hp: 100, hitT: 0, fall: 0, sp: 0 };
  if (flash) flash.visible = false; g.position.set(O.x, footGround(O.x, O.z), O.z); g.rotation.y = s[2]; FT.world.add(g); FT.enemies.push(O); SH.opp = O; shOppPlay(O, 'idle', 0); mixer.update(0.01);
}
function shOppPlay(O, name, fast) {
  if (O.cur === name) { if (name === 'walk') O.acts.walk.setEffectiveTimeScale(fast ? 2 : 1.15); return; }
  const key = name === 'idle' ? 'fire' : name, a = O.acts[key], p = O.acts[O.curKey]; if (!a) return;
  a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.play();
  if (name === 'idle') { a.time = 1.0; a.setEffectiveTimeScale(0); } else if (name === 'walk') a.setEffectiveTimeScale(fast ? 2 : 1.15); else if (name === 'fire') { a.time = 0.8; a.setEffectiveTimeScale(1); } else { a.time = 0.2; a.setEffectiveTimeScale(1.35); }
  if (p && p !== a) p.crossFadeTo(a, 0.2, false); O.cur = name; O.curKey = key;
}
function shOppState(m) {
  const O = SH.opp; if (!O || typeof m.x !== 'number' || typeof m.z !== 'number') return;
  O.tx = m.x; O.tz = m.z; O.tyaw = m.yw || 0; O.an = m.an || 'idle'; O.sp = m.sp || 0;
}
function shTracer(f, to) {
  const tr = FT.tracers.find((q) => q.t <= 0); if (!tr) return;
  const a = tr.l.geometry.attributes.position; a.setXYZ(0, f[0], f[1], f[2]); a.setXYZ(1, to[0], to[1], to[2]); a.needsUpdate = true; tr.t = 0.06; tr.l.visible = true;
}
function shOppShot(m) {
  if (!Array.isArray(m.f) || !Array.isArray(m.to) || !SH.opp) return;
  shTracer(m.f, m.to); SH.opp.flashT = 0.06; try { Snd.noise(0.08, 0.28, 3600); Snd.tone(200, 0.08, 'square', 0.07, 0.4); } catch (e) {}
  for (let i = 0; i < 4; i++) sparks.emit(m.to[0], m.to[1], m.to[2], (Math.random() - 0.5) * 7, 2 + Math.random() * 5, (Math.random() - 0.5) * 7, 0.4);
}
function shOppUpdate(dt) {
  const O = SH.opp; if (!O) return;
  const k = 1 - Math.exp(-dt * 14); O.x += (O.tx - O.x) * k; O.z += (O.tz - O.z) * k; O.g.position.set(O.x, footGround(O.x, O.z), O.z);
  O.g.rotation.y += footAngDiff(O.g.rotation.y, O.tyaw) * k; if (O.hp > 0) shOppPlay(O, O.an || 'idle', O.sp);
  O.mixer.update(dt); O.flashT = Math.max(0, O.flashT - dt); if (O.flash) O.flash.visible = O.flashT > 0;
  if (O.hp <= 0) { O.fall = Math.min(1, O.fall + dt / 0.8); O.c.rotation.x = -O.fall * O.fall * 1.52; }
}

/* ---------- combat ---------- */
function shSendShot(mz, hit, best) { shSend({ t: 'shot', f: [shR(mz.x), shR(mz.y), shR(mz.z)], to: [shR(hit.x), shR(hit.y), shR(hit.z)] }); }
function shHitOpp() {
  shSend({ t: 'hit' }); ftSnd('hit'); shHitEl.classList.remove('on'); void shHitEl.offsetWidth; shHitEl.classList.add('on');
}
function shOnHp(m) {
  SH.room = m.room; const me = shMe(), op = shOppInfo();
  if (m.victim === SH.role && me) { FT.hp = Math.max(1, me.hp); FT.hurtT = 0.35; shake = Math.max(shake, 0.3); ftSnd('bite'); vibe && vibe(25); }
  else if (op && SH.opp) { SH.opp.hp = op.hp; SH.opp.hitT = 0.12; if (op.hp <= 0) SH.opp.dead = 1; }
  shHudBars(me ? me.hp : 100, op ? op.hp : 100);
}
function shClock(dt) { SH.clock = (SH.clock || 0) + dt; const t = Math.floor(SH.clock), el = $('d3Clock'), v = String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); if (el.textContent !== v) el.textContent = v; }
function shGoal() { return (SH.room && SH.room.kills_to_win) || 40; }
function shScore() { const me = shMe(), op = shOppInfo(); $('d3Sc').innerHTML = '<b class="k me">' + (me ? me.kills : 0) + '</b><em>:</em><b class="k op">' + (op ? op.kills : 0) + '</b>'; $('d3Goal').textContent = 'FIRST TO ' + shGoal(); }
function shOnKill(m) {
  SH.room = m.room; const me = shMe(), op = shOppInfo(), O = SH.opp;
  if (m.victim === SH.role) { SH.deadT = 1.5; FT.hp = 100; FT.hurtT = 0.35; shake = Math.max(shake, 0.5); ftSnd('bite'); vibe && vibe(60); }
  else if (O) { O.hp = 0; O.dead = 1; ftSnd('hit'); setTimeout(() => { if (SH.opp === O) { O.hp = 100; O.dead = 0; O.fall = 0; O.c.rotation.x = 0; } }, 1500); }
  shHudBars(me ? me.hp : 100, op ? op.hp : 100); shScore();
}
function shHudBars(a, b) {
  $('d3MeHp').style.width = Math.max(0, a) + '%'; $('d3OppHp').style.width = Math.max(0, b) + '%'; $('d3MeN').textContent = Math.max(0, a); $('d3OppN').textContent = Math.max(0, b);
  shHudEl.querySelector('.me').classList.toggle('low', a < 30); shHudEl.querySelector('.opp').classList.toggle('low', b < 30);
}

/* ---------- per-frame (called from hunt.js while state === 'playing') ---------- */
function shTick(dt) {
  if (SH.phase === 'over') {
    FT.firing = false; FT.touch.fire = false; astroUpdate(dt); shOppUpdate(dt); huntWorld(dt);
    if (FT.hp <= 0 && ASTRO.inner) { SH.myFall = Math.min(1, (SH.myFall || 0) + dt / 0.8); ASTRO.inner.rotation.x = -SH.myFall * SH.myFall * 1.52; }
    return;
  }
  if (SH.deadT > 0) {
    SH.deadT -= dt; shClock(dt); FT.firing = false; FT.touch.fire = false; astroUpdate(dt); shOppUpdate(dt); huntWorld(dt);
    SH.myFall = Math.min(1, (SH.myFall || 0) + dt / 0.8); if (ASTRO.inner) ASTRO.inner.rotation.x = -SH.myFall * SH.myFall * 1.52;
    if (SH.deadT <= 0) { SH.deadT = 0; SH.myFall = 0; if (ASTRO.inner) ASTRO.inner.rotation.x = 0; shSpawn(); }
    SH.sendT -= dt; if (SH.sendT <= 0) { SH.sendT = 0.05; shSend({ t: 'st', x: shR(FT.p.x), y: shR(FT.p.y), z: shR(FT.p.z), yw: shR(FT.charYaw), an: 'idle', sp: 0 }); }
    return;
  }
  SH.phase = 'play'; SH.myFall = 0; shClock(dt);
  footPlayer(dt); FT.reserve = Math.max(FT.reserve, 90); huntWorld(dt); shOppUpdate(dt);
  SH.sendT -= dt; if (SH.sendT <= 0) { SH.sendT = 0.05; shSend({ t: 'st', x: shR(FT.p.x), y: shR(FT.p.y), z: shR(FT.p.z), yw: shR(FT.charYaw), an: FT.anim || 'idle', sp: FT.sprint ? 1 : 0 }); }
}
function shHud() {
  const o = SH.opp, me = shMe(), op = shOppInfo(); let txt = 'DUEL \u00B7 first to ' + shGoal() + ' kills', brg = 0, tgt = false;
  if (o) { const dx = o.x - FT.p.x, dz = o.z - FT.p.z; txt = (op ? op.nick : 'OPPONENT').toUpperCase() + '  \u00B7  ' + Math.round(Math.hypot(dx, dz)) + ' m'; brg = -footAngDiff(FT.camYaw, Math.atan2(dx, dz)); tgt = o.hp > 0; }
  const lab = $('ftSignal').querySelector('span'); if (lab.textContent !== 'OPPONENT') lab.textContent = 'OPPONENT';
  shScore(); const ohp = op ? op.hp : 100; $('ftSigFill').style.width = ohp + '%'; $('ftSigN').textContent = ohp + ' HP'; $('ftObj').textContent = txt; $('ftArrow').style.visibility = tgt ? 'visible' : 'hidden'; if (tgt) $('ftArrow').style.transform = 'rotate(' + (brg * 57.3).toFixed(0) + 'deg)';
  $('progress').style.width = Math.min(100, (me ? me.kills : 0) / shGoal() * 100) + '%'; $('cp').textContent = 'Kills ' + (me ? me.kills : 0) + ' / ' + shGoal(); $('ftPrompt').classList.add('hidden'); $('ftLockHint').classList.toggle('hidden', !(state === 'playing' && SH.phase === 'play' && !FT.lock && !document.body.classList.contains('touch')));
}

/* ---------- result ---------- */
function shootOver(m) {
  if (SH.phase === 'over' && !m.local) return;
  TdVoice.stop(); SH.phase = 'over'; SH.over = m; if (m.room) SH.room = m.room; FT.firing = false; FT.touch.fire = false; if (document.pointerLockElement) document.exitPointerLock();
  const won = m.winner === SH.role; try { if (won) Snd.win(); else Snd.lose(); } catch (e) {}
  const me = shMe(), op = shOppInfo(); if (me) { if (me.hp <= 0) FT.hp = 0; } if (op && SH.opp && op.hp <= 0) SH.opp.hp = 0;
  setTimeout(() => { if (SH.on && SH.phase === 'over') { $('shootResult').classList.remove('hidden'); shootRenderResult(); } }, m.local ? 200 : 1400);
}
function shootRenderResult() {
  const m = SH.over, r = SH.room; if (!m || !r || $('shootResult').classList.contains('hidden')) return;
  const won = m.winner === SH.role, me = shMe() || {}, op = shOppInfo(), nm = op ? op.nick : 'Your opponent';
  const head = $('shRHead'); head.textContent = won ? 'YOU WIN!' : 'YOU LOST'; head.classList.toggle('lose', !won);
  $('shRSub').textContent = m.reason === 'kills' ? (won ? 'You reached ' + shGoal() + ' kills!' : nm + ' reached ' + shGoal() + ' kills') : m.reason === 'disconnect' ? (won ? nm + ' disconnected \u2014 you win' : 'You lost the connection') : 'Duel over';
  const acc = (p) => p.shots > 0 ? Math.min(100, Math.round(p.hits / p.shots * 100)) + '%' : '\u2014';
  $('shRRows').innerHTML = r.players.slice().sort((a, b) => b.kills - a.kills).map((p) => '<div class="drRow ' + (p.role === SH.role ? 'me' : 'opp') + (p.role === m.winner ? ' win' : '') + '"><span class="nm" data-testid="shoot-result-' + p.role + '-nick">' + dEsc(p.nick) + (p.role === SH.role ? ' (you)' : '') + '</span><span class="st" data-testid="shoot-result-' + p.role + '-kills"><b>' + p.kills + '</b><small>/ ' + shGoal() + ' kills</small></span><span class="st" data-testid="shoot-result-' + p.role + '-accuracy"><b>' + acc(p) + '</b><small>accuracy</small></span></div>').join('');
  const dur = Math.round(r.duration || 0); $('shRTime').textContent = 'Match time ' + String(Math.floor(dur / 60)).padStart(2, '0') + ':' + String(dur % 60).padStart(2, '0');
  const rb = $('btnShootRematch'), gone = !op || !op.connected || !SH.ws;
  rb.classList.toggle('off', gone); rb.classList.toggle('on', !!me.rematch); rb.textContent = gone ? 'Opponent left' : me.rematch ? 'Waiting\u2026 (tap to cancel)' : 'Rematch';
  $('shRNote').textContent = op && op.rematch && !me.rematch ? 'Opponent wants a rematch!' : '';
}
function shootRematch() { const m = shMe(); shSend({ t: 'rematch', on: !(m && m.rematch) }); Snd.click(); }

/* ---------- leaving ---------- */
function shootLeave() { shSend({ t: 'leave' }); shootReset(); setTimeout(() => duelEnd(), 30); }
function shootAskLeave() {
  if (document.pointerLockElement) document.exitPointerLock();
  const m = $('duelLeaveModal'); m.querySelector('h2').textContent = 'Leave duel?'; m.querySelector('p').textContent = SH.phase === 'over' ? 'Return to the menu.' : 'Leaving mid-duel counts as a loss.'; $('btnDuelKeep').textContent = 'Keep playing'; $('btnDuelQuit').textContent = 'Leave duel'; m.classList.remove('hidden');
}
function shootReset() {
  TdVoice.stop(); shQuipFeed.innerHTML = ''; const was = SH.on; SH.lobbyOn = false; SH.wantClose = true; SH.phase = 'idle'; SH.on = false; SH.opp = null; SH.walls = null; SH.over = null; SH.room = null; shSearchUi(false);
  if (SH.ws) { try { SH.ws.close(); } catch (e) {} SH.ws = null; }
  document.body.classList.remove('d3'); if (SH_FB0) Object.assign(FB, SH_FB0); $('shootResult').classList.add('hidden');
  const m = $('duelLeaveModal'); m.querySelector('h2').textContent = 'Leave race?'; m.querySelector('p').textContent = 'Leaving mid-race counts as a loss.'; $('btnDuelKeep').textContent = 'Keep racing'; $('btnDuelQuit').textContent = 'Leave race';
  if (!was) return;
  if (document.pointerLockElement) document.exitPointerLock();
  if (FT.built) { footLeave(); if (level === duelPrevLevel) level = 1; }
  if (SH.prevVeh !== null) { vehicleId = SH.prevVeh; SH.prevVeh = null; }
}
function shootEsc() {
  const m = $('duelLeaveModal'); if (m.classList.contains('hidden')) shootAskLeave(); else m.classList.add('hidden');
}

/* ---------- kind selector + wiring ---------- */
function duelSetKind(k) {
  DUEL.kind = k; const s = k === 'shoot';
  $('btnKindRace').classList.toggle('on', !s); $('btnKindShoot').classList.toggle('on', s);
  $('duelKindDesc').textContent = s ? '3D online duel \u00B7 quick match vs a stranger, or Private Room with a code (host picks 10 / 20 / 40 kills)' : 'Race a friend on the same track';
  $('duelHomeTitle').textContent = s ? 'Duel \u00B7 3D Shooting' : 'Duel \u00B7 Race';
  $('btnShootPrivate').style.display = s ? '' : 'none'; $('btnDuelJoin').style.display = '';
  if (!s && SH.searching) shootCancel();
  $('btnDuelCreate').textContent = SH.searching ? 'Cancel search' : (s ? 'Find Match' : 'Create Room');
  duelHomeErr('');
}
DUEL.kind = 'race';
on('btnKindRace', () => { duelSetKind('race'); Snd.click(); });
on('btnKindShoot', () => { duelSetKind('shoot'); Snd.click(); });
on('btnShootRematch', shootRematch);
on('btnShootResLeave', () => { Snd.click(); shootLeave(); });
