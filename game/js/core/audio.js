/* eslint-disable */
'use strict';
/* Sound engine: ElevenLabs samples (game/audio/) with synth fallback */
/* ================= audio ================= */
const Snd = (function () {
  const BASE = 'game/audio/';
  const SFX = ['engine_idle', 'engine_rev', 'nitro_boost', 'tire_screech', 'crash', 'whoosh', 'land', 'space_ambience', 'scifi_hum', 'coin', 'countdown_beep', 'countdown_go', 'checkpoint', 'flip', 'win', 'lose', 'ui_click', 'ui_hover'];
  const MUSIC = ['menu_theme', 'race_theme'];
  const VOL = { music: 0.45, amb: 0.35 };
  const buf = {}, last = {};
  let sir = null, ctx = null, master, sfxBus, musBus, eng, filt, eg, idleG, revG, idleS, revS;
  let scene = '', duck = 1, layers = {};
  function load(name, dir) {
    return fetch(BASE + dir + '/' + name + '.mp3').then((r) => { if (!r.ok || /html/.test(r.headers.get('content-type') || '')) throw 0; return r.arrayBuffer(); })
      .then((a) => ctx.decodeAudioData(a)).then((b) => { buf[name] = b; }).catch(() => {});
  }
  function loopSrc(name, bus, vol) {
    if (!buf[name]) return null;
    const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf[name]; s.loop = true; g.gain.value = vol;
    s.connect(g); g.connect(bus); s.start(); return { s, g };
  }
  function startEngine() {
    if (idleS || !buf.engine_idle || !buf.engine_rev) return;
    idleG = ctx.createGain(); revG = ctx.createGain(); idleG.gain.value = 0; revG.gain.value = 0; idleG.connect(sfxBus); revG.connect(sfxBus);
    idleS = ctx.createBufferSource(); idleS.buffer = buf.engine_idle; idleS.loop = true; idleS.connect(idleG); idleS.start();
    revS = ctx.createBufferSource(); revS.buffer = buf.engine_rev; revS.loop = true; revS.connect(revG); revS.start();
  }
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = settings.sound ? 0.8 : 0; master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.connect(master); musBus = ctx.createGain(); musBus.connect(master);
      eng = ctx.createOscillator(); eng.type = 'sawtooth'; filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 600; eg = ctx.createGain(); eg.gain.value = 0;
      eng.connect(filt); filt.connect(eg); eg.connect(sfxBus); eng.start();
      Promise.all(SFX.map((n) => load(n, 'sfx')).concat(MUSIC.map((n) => load(n, 'music')))).then(() => { startEngine(); const s = scene; scene = ''; setScene(s || state); });
    } catch (e) { ctx = null; }
  }
  function play(name, vol, rate, gap) {
    if (!ctx || !settings.sound || !buf[name]) return false;
    const now = ctx.currentTime; if (gap && last[name] && now - last[name] < gap) return true; last[name] = now;
    const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = buf[name]; s.playbackRate.value = rate || 1; g.gain.value = vol == null ? 0.8 : vol;
    s.connect(g); g.connect(sfxBus); s.start(); return true;
  }
  function tone(f, d, type, vol, slide) {
    if (!ctx || !settings.sound) return; const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + d);
    g.gain.setValueAtTime(vol || 0.2, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + d + 0.02);
  }
  function noise(d, vol, fq) {
    if (!ctx || !settings.sound) return; const n = Math.floor(ctx.sampleRate * d), b = ctx.createBuffer(1, n, ctx.sampleRate), ch = b.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = b; f.type = 'lowpass'; f.frequency.value = fq || 800; g.gain.value = vol || 0.3; s.connect(f); f.connect(g); g.connect(sfxBus); s.start();
  }
  // music + ambience layers per game state
  function setLayer(name, vol) {
    const t = ctx.currentTime, L = layers[name];
    if (vol > 0 && !L) { const n = loopSrc(name, musBus, 0); if (!n) return; layers[name] = n; n.g.gain.setTargetAtTime(vol, t, 0.6); }
    else if (L) { L.g.gain.setTargetAtTime(vol, t, 0.6); if (vol === 0) { delete layers[name]; L.s.stop(t + 3); } }
  }
  let pad = null;
  function padSet(on) {
    if (!ctx) return; const t = ctx.currentTime;
    if (on && !pad) {
      const g = ctx.createGain(), f = ctx.createBiquadFilter(), lfo = ctx.createOscillator(), lg = ctx.createGain(); g.gain.value = 0; f.type = 'lowpass'; f.frequency.value = 900; lfo.frequency.value = 0.12; lg.gain.value = 250; lfo.connect(lg); lg.connect(f.frequency);
      const os = [110, 164.81, 220, 277.18, 329.63].map((fr, i) => { const o = ctx.createOscillator(), og = ctx.createGain(); o.type = i % 2 ? 'sine' : 'triangle'; o.frequency.value = fr; o.detune.value = (i - 2) * 4; og.gain.value = 0.2 / (1 + i * 0.3); o.connect(og); og.connect(f); o.start(); return o; });
      f.connect(g); g.connect(musBus); lfo.start(); pad = { g, os, lfo }; g.gain.setTargetAtTime(0.5, t, 1.4);
    } else if (!on && pad) { const p = pad; pad = null; p.g.gain.setTargetAtTime(0, t, 0.35); setTimeout(() => { try { p.os.forEach((o) => o.stop()); p.lfo.stop(); } catch (e) {} }, 2500); }
  }
  function setScene(s) {
    const race = ['countdown', 'playing', 'finishing', 'crashed', 'paused', 'cutscene', 'victory', 'shootgame'].indexOf(s) >= 0;
    const ending = ['credits', 'cinematic', 'end'].indexOf(s) >= 0;
    duck = s === 'paused' ? 0.35 : s === 'crashed' ? 0.6 : 1;
    const want = ending ? 'ending' : race ? 'race' : 'menu';
    if (ctx) { musBus.gain.setTargetAtTime(duck, ctx.currentTime, 0.25); padSet(ending); }
    if (want === scene) return; scene = want; if (!ctx) return;
    if (ending) { setLayer('menu_theme', VOL.music * 0.3); setLayer('race_theme', 0); setLayer('space_ambience', VOL.amb); setLayer('scifi_hum', 0); return; }
    const space = race && typeof LEVELS !== 'undefined' && /SPACE/.test((LEVELS[level] || {}).name || '');
    setLayer('menu_theme', race ? 0 : VOL.music); setLayer('race_theme', race ? VOL.music : 0);
    setLayer('space_ambience', race ? (space ? VOL.amb : 0) : VOL.amb * 0.6); setLayer('scifi_hum', space ? VOL.amb * 0.5 : 0);
  }
  let hum = null;
  function alienHum(vol, k) {
    if (!ctx || !settings.sound) vol = 0;
    if (vol > 0 && !hum) {
      const g = ctx.createGain(), o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), l = ctx.createOscillator(), lg = ctx.createGain(), l2 = ctx.createOscillator(), lg2 = ctx.createGain(), f = ctx.createBiquadFilter();
      g.gain.value = 0; o1.type = 'sine'; o2.type = 'triangle'; o1.frequency.value = 130; o2.frequency.value = 134;
      l.frequency.value = 5.5; lg.gain.value = 0.35; l.connect(lg); lg.connect(g.gain);
      l2.frequency.value = 0.4; lg2.gain.value = 14; l2.connect(lg2); lg2.connect(o1.frequency); lg2.connect(o2.frequency);
      f.type = 'lowpass'; f.frequency.value = 900; o1.connect(f); o2.connect(f); f.connect(g); g.connect(sfxBus);
      o1.start(); o2.start(); l.start(); l2.start(); hum = { g, o1, o2, l, l2 };
    }
    if (!hum) return; const t = ctx.currentTime;
    hum.g.gain.setTargetAtTime(vol, t, 0.2); hum.o1.frequency.setTargetAtTime(130 + 70 * (k || 0), t, 0.3); hum.o2.frequency.setTargetAtTime(134 + 72 * (k || 0), t, 0.3);
    if (vol === 0 && hum.g.gain.value < 0.002) { try { hum.o1.stop(); hum.o2.stop(); hum.l.stop(); hum.l2.stop(); } catch (e) {} hum = null; }
  }
  return {
    init, tone, noise, alienHum,
    zap() { if (!ctx || !settings.sound) return; this.tone(1400, 0.55, 'sawtooth', 0.22, 0.04); this.tone(90, 0.7, 'square', 0.18, 2.4); this.noise(0.5, 0.45, 5000); setTimeout(() => this.tone(300, 0.4, 'triangle', 0.16, 3), 120); }, loaded: () => Object.keys(buf),
    scene(s) { if (!ctx) { scene = s; return; } setScene(s); },
    engine(speed, gas, on) {
      if (!ctx) return; const t = ctx.currentTime, live = on && settings.sound;
      master.gain.setTargetAtTime(settings.sound ? 0.8 : 0, t, 0.05);
      if (idleS) {
        const k = Math.min(1, speed / 40), r = 0.75 + k * 0.75 + (gas ? 0.08 : 0);
        idleG.gain.setTargetAtTime(live ? 0.5 * (1 - k) * (gas ? 0.7 : 1) + 0.05 : 0, t, 0.1);
        revG.gain.setTargetAtTime(live ? (0.12 + 0.5 * k) * (gas ? 1 : 0.55) : 0, t, 0.1);
        idleS.playbackRate.setTargetAtTime(0.9 + k * 0.5, t, 0.1); revS.playbackRate.setTargetAtTime(r, t, 0.1);
        return;
      }
      eg.gain.setTargetAtTime(live ? 0.05 + (gas ? 0.05 : 0) : 0, t, 0.08); eng.frequency.setTargetAtTime(48 + speed * 3.2 + (gas ? 14 : 0), t, 0.08); filt.frequency.setTargetAtTime(350 + speed * 22, t, 0.1);
    },
    click() { if (!play('ui_click', 0.6, 1, 0.04)) this.tone(520, 0.08, 'triangle', 0.12); },
    hover() { play('ui_hover', 0.35, 1, 0.08); },
    coin(n) { const k = Math.pow(1.06, Math.min(n || 0, 6)); if (play('coin', 0.55, k, 0.03)) return; const f = 988 * k; this.tone(f, 0.07, 'square', 0.08); setTimeout(() => this.tone(f * 1.34, 0.13, 'square', 0.08), 65); },
    nitro() { if (!play('nitro_boost', 0.8, 1, 0.3)) { this.noise(0.6, 0.4, 2600); this.tone(160, 0.6, 'sawtooth', 0.14, 3.2); } },
    land(q) { const hard = q === 'HARD LANDING'; if (!play('land', hard ? 0.9 : 0.55, hard ? 0.9 : 1.05, 0.15)) { this.noise(0.18, hard ? 0.6 : 0.35, 500); this.tone(90, 0.2, 'sine', 0.3, 0.5); } },
    cp() { if (!play('checkpoint', 0.6)) { this.tone(660, 0.12, 'triangle', 0.2); setTimeout(() => this.tone(990, 0.2, 'triangle', 0.2), 110); } },
    crash() { if (!play('crash', 0.9)) { this.noise(0.6, 0.7, 1400); this.tone(110, 0.5, 'sawtooth', 0.25, 0.3); } setTimeout(() => this.lose(), 450); },
    lose() { play('lose', 0.5, 1, 2); },
    go() { if (!play('countdown_go', 0.7)) this.tone(880, 0.35, 'square', 0.15); },
    beep() { if (!play('countdown_beep', 0.7)) this.tone(440, 0.15, 'square', 0.12); },
    win() { if (!play('win', 0.75, 1, 1)) [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 'triangle', 0.22), i * 120)); },
    flip(f) { if (!play('flip', 0.6, 1 + Math.min(f, 5) * 0.06)) this.tone(600 + f * 150, 0.12, 'triangle', 0.15); },
    screech() { play('tire_screech', 0.45, 1, 1.4); },
    whoosh() { play('whoosh', 0.6, 1, 0.4); },
    siren(on) {
      if (!ctx || !settings.sound) on = false;
      if (on && !sir) { const o = ctx.createOscillator(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain(), f = ctx.createBiquadFilter(); o.type = 'sawtooth'; o.frequency.value = 850; l.type = 'triangle'; l.frequency.value = 1.1; lg.gain.value = 320; f.type = 'lowpass'; f.frequency.value = 2200; g.gain.value = 0; l.connect(lg); lg.connect(o.frequency); o.connect(f); f.connect(g); g.connect(sfxBus); o.start(); l.start(); sir = { g, o, l }; }
      if (sir) { sir.g.gain.setTargetAtTime(on ? 0.05 : 0, ctx.currentTime, 0.08); if (!on && sir.g.gain.value < 0.002) { try { sir.o.stop(); sir.l.stop(); } catch (e) {} sir = null; } }
    },
  };
})();
// browsers only allow audio after a user gesture
(function () {
  const unlock = () => { Snd.init(); window.removeEventListener('pointerdown', unlock, true); window.removeEventListener('keydown', unlock, true); };
  window.addEventListener('pointerdown', unlock, true); window.addEventListener('keydown', unlock, true);
  document.addEventListener('pointerover', (e) => { if (e.pointerType === 'mouse' && e.target.closest && e.target.closest('button') && !e.target.closest('button').contains(e.relatedTarget)) Snd.hover(); });
})();
