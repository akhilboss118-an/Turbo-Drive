/* eslint-disable */
'use strict';
/* Duel voice chat: peer-to-peer WebRTC audio between the two duelists. Signalling rides on the existing shoot WebSocket ({t:'rtc'}).
   Audio never touches the server and is never recorded. STUN/TURN servers come from the game server (GET /api/shoot/ice, configured with TURN_* env vars) or window.TD_ICE_SERVERS. */
const TdVoice = (() => {
  const V = { active: false, gen: 0, pc: null, stream: null, track: null, mic: 'idle', muted: false, oppMuted: false, vol: 1, send: null, host: false, chain: Promise.resolve(), readyP: null, audio: null, ac: null, anMe: null, anOpp: null, timer: 0, link: 'idle' };
  const STUN = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
  let iceAt = 0, iceList = null;
  async function loadIce() {
    if (window.TD_ICE_SERVERS) return window.TD_ICE_SERVERS;
    if (iceList && Date.now() - iceAt < 6 * 3600 * 1000) return iceList;
    try {
      const ac = new AbortController(), to = setTimeout(() => ac.abort(), 2500);
      const r = await fetch(window.TD_SHOOT_SERVER + '/api/shoot/ice', { signal: ac.signal }); clearTimeout(to);
      const j = await r.json(); if (j && Array.isArray(j.iceServers) && j.iceServers.length) { iceList = j.iceServers; iceAt = Date.now(); return iceList; }
    } catch (e) {}
    return iceList || STUN;
  }
  const LAB = { idle: 'MIC', asking: 'ALLOW MIC\u2026', on: 'MIC ON', muted: 'MUTED', denied: 'NO MIC ACCESS', unsupported: 'MIC UNAVAILABLE' };
  const ICO_MIC = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/><path class="sl" d="M3 3l18 18"/></svg>';
  const ICO_SPK = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path class="wv" d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/><path class="sl" d="M3 3l18 18"/></svg>';

  const el = document.createElement('div'); el.id = 'd3Voice'; el.setAttribute('data-testid', 'duel-voice-panel');
  el.innerHTML = '<button id="d3VMic" class="d3VBtn" data-testid="duel-voice-mic-btn" aria-label="Toggle microphone (M)" title="Mic on/off (M)">' + ICO_MIC + '<span id="d3VMicLab" data-testid="duel-voice-mic-label">MIC</span></button>' +
    '<div class="d3VOpp"><i id="d3VSpk" data-testid="duel-voice-speaking-indicator" title="Opponent is talking"></i><button id="d3VOppBtn" class="d3VBtn sq" data-testid="duel-voice-opp-mute-btn" aria-label="Mute opponent (V)" title="Mute opponent (V)">' + ICO_SPK + '</button>' +
    '<input id="d3VVol" type="range" min="0" max="100" value="100" data-testid="duel-voice-volume-slider" aria-label="Opponent volume"></div>' +
    '<small id="d3VStat" data-testid="duel-voice-status"></small>';
  $('ui').appendChild(el);
  const mic = $('d3VMic'), micLab = $('d3VMicLab'), oppBtn = $('d3VOppBtn'), vol = $('d3VVol'), stat = $('d3VStat'), spk = $('d3VSpk');

  function paint() {
    mic.dataset.state = V.mic; micLab.textContent = LAB[V.mic] || 'MIC';
    oppBtn.classList.toggle('mt', V.oppMuted); vol.disabled = V.oppMuted;
    const linkTxt = { idle: '', connecting: 'Connecting voice\u2026', connected: 'Voice connected', failed: 'Voice link failed', closed: 'Voice link closed' }[V.link] || '';
    let t = linkTxt;
    if (V.mic === 'unsupported') t = 'Mic needs HTTPS or localhost';
    else if (V.mic === 'denied') t = 'Allow the mic in your browser to talk';
    stat.textContent = t; stat.title = 'M: mic \u00B7 V: mute opponent';
  }
  function level(an) {
    if (!an) return 0; an.analyser.getByteTimeDomainData(an.buf); let s = 0;
    for (let i = 0; i < an.buf.length; i++) { const d = (an.buf[i] - 128) / 128; s += d * d; }
    return Math.sqrt(s / an.buf.length);
  }
  function mkAnalyser(stream) {
    try {
      if (!V.ac) V.ac = new (window.AudioContext || window.webkitAudioContext)();
      const src = V.ac.createMediaStreamSource(stream), analyser = V.ac.createAnalyser(); analyser.fftSize = 512; src.connect(analyser);
      return { analyser, src, buf: new Uint8Array(analyser.fftSize) };
    } catch (e) { return null; }
  }
  function tick() {
    const me = V.mic === 'on' && level(V.anMe) > 0.04, opp = level(V.anOpp) > 0.03;
    mic.classList.toggle('talk', me); spk.classList.toggle('on', opp);
    const ob = document.querySelector('#d3Hud .d3Bar.opp'); if (ob) ob.classList.toggle('talking', opp);
    if (V.ac && V.ac.state === 'suspended') V.ac.resume().catch(() => {});
  }
  function attach(stream) {
    if (!V.audio) { V.audio = new Audio(); V.audio.autoplay = true; }
    V.audio.srcObject = stream; V.audio.volume = V.vol; V.audio.muted = V.oppMuted;
    const p = V.audio.play(); if (p && p.catch) p.catch(() => { const r = () => { if (V.audio) V.audio.play().catch(() => {}); window.removeEventListener('pointerdown', r, true); window.removeEventListener('keydown', r, true); }; window.addEventListener('pointerdown', r, true); window.addEventListener('keydown', r, true); });
    V.anOpp = mkAnalyser(stream);
  }
  async function getMic() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.RTCPeerConnection) { V.mic = 'unsupported'; paint(); return null; }
    V.mic = 'asking'; paint();
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
      return s;
    } catch (e) { V.mic = 'denied'; paint(); return null; }
  }
  async function begin(gen) {
    V.link = 'connecting'; paint(); const ice = await loadIce(); if (V.gen !== gen) return;
    const pc = new RTCPeerConnection({ iceServers: ice }); V.pc = pc;
    pc.onicecandidate = (e) => { if (e.candidate && V.active && V.gen === gen) V.send({ t: 'rtc', d: { c: e.candidate.toJSON ? e.candidate.toJSON() : e.candidate } }); };
    pc.ontrack = (e) => { if (V.gen === gen) attach(e.streams && e.streams[0] ? e.streams[0] : new MediaStream([e.track])); };
    pc.onconnectionstatechange = () => { if (V.gen !== gen) return; const s = pc.connectionState; V.link = s === 'connected' ? 'connected' : (s === 'failed' ? 'failed' : (s === 'closed' || s === 'disconnected') ? 'closed' : 'connecting'); paint(); };
    const s = await getMic();
    if (V.gen !== gen) { if (s) s.getTracks().forEach((t) => t.stop()); return; }
    if (s) {
      V.stream = s; V.track = s.getAudioTracks()[0]; V.track.enabled = !V.muted; V.mic = V.muted ? 'muted' : 'on'; pc.addTrack(V.track, s); V.anMe = mkAnalyser(s); paint();
    } else if (V.host) pc.addTransceiver('audio', { direction: 'recvonly' });
    if (V.host) { const o = await pc.createOffer(); await pc.setLocalDescription(o); V.send({ t: 'rtc', d: { sdp: pc.localDescription.toJSON ? pc.localDescription.toJSON() : pc.localDescription } }); }
  }
  async function handle(d, gen) {
    try { await V.readyP; } catch (e) { return; }
    const pc = V.pc; if (!pc || V.gen !== gen || pc.signalingState === 'closed') return;
    if (d.sdp) {
      if (d.sdp.type === 'offer' && !V.host) { await pc.setRemoteDescription(d.sdp); const a = await pc.createAnswer(); await pc.setLocalDescription(a); V.send({ t: 'rtc', d: { sdp: pc.localDescription.toJSON ? pc.localDescription.toJSON() : pc.localDescription } }); }
      else if (d.sdp.type === 'answer' && V.host) await pc.setRemoteDescription(d.sdp);
    } else if (d.c && pc.remoteDescription) await pc.addIceCandidate(d.c);
    else if (d.c) V.pend.push(d.c);
    if (pc.remoteDescription && V.pend.length) { const l = V.pend.splice(0); for (const c of l) await pc.addIceCandidate(c).catch(() => {}); }
  }
  function start(sendFn, isHost) {
    if (V.active && V.pc && V.pc.connectionState !== 'failed' && V.pc.connectionState !== 'closed') return;
    stop(); V.active = true; V.send = sendFn; V.host = !!isHost; V.pend = []; const gen = ++V.gen; V.chain = Promise.resolve();
    V.readyP = begin(gen).catch(() => { if (V.gen === gen) { V.link = 'failed'; paint(); } throw 0; }); V.readyP.catch(() => {});
    clearInterval(V.timer); V.timer = setInterval(tick, 120); paint();
  }
  function signal(d) { if (!V.active || !d) return; const gen = V.gen; V.chain = V.chain.then(() => handle(d, gen)).catch(() => {}); }
  function stop() {
    V.gen++; V.active = false; clearInterval(V.timer); V.timer = 0;
    if (V.pc) { try { V.pc.close(); } catch (e) {} V.pc = null; }
    if (V.stream) { V.stream.getTracks().forEach((t) => t.stop()); V.stream = null; } V.track = null;
    if (V.audio) { try { V.audio.pause(); } catch (e) {} V.audio.srcObject = null; }
    if (V.ac) { try { V.ac.close(); } catch (e) {} V.ac = null; } V.anMe = V.anOpp = null;
    V.mic = 'idle'; V.link = 'idle'; mic.classList.remove('talk'); spk.classList.remove('on');
    const ob = document.querySelector('#d3Hud .d3Bar.opp'); if (ob) ob.classList.remove('talking'); paint();
  }
  function toggleMic() {
    if (V.mic === 'denied' || V.mic === 'unsupported') { try { toast('VOICE', V.mic === 'denied' ? 'Allow the microphone in your browser site settings, then rejoin the duel.' : 'Microphone needs HTTPS or localhost.', 'warn'); } catch (e) {} return; }
    if (!V.track) return;
    V.muted = !V.muted; V.track.enabled = !V.muted; V.mic = V.muted ? 'muted' : 'on'; paint();
  }
  function toggleOpp() { V.oppMuted = !V.oppMuted; if (V.audio) V.audio.muted = V.oppMuted; paint(); }
  mic.addEventListener('click', () => { try { Snd.click(); } catch (e) {} toggleMic(); });
  oppBtn.addEventListener('click', () => { try { Snd.click(); } catch (e) {} toggleOpp(); });
  vol.addEventListener('input', () => { V.vol = vol.value / 100; if (V.audio) V.audio.volume = V.vol; });
  window.addEventListener('keydown', (e) => {
    if (e.repeat || !V.active || !document.body.classList.contains('d3')) return;
    const t = e.target && e.target.tagName; if (t === 'INPUT' && e.target.type !== 'range' || t === 'TEXTAREA') return;
    if (e.code === 'KeyM') toggleMic(); else if (e.code === 'KeyV') toggleOpp();
  });
  paint();
  return { start, stop, signal, state: V };
})();
