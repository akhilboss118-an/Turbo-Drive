export class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterVolume = 0.8;
        this.sfxVolume = 0.9;
        this.initialized = false;
        this.sounds = {};
        this.activeEngine = null;
    }

    init() {
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
            this.generateSounds();
        } catch (e) {
            console.warn('Audio not available:', e);
        }
    }

    ensureResumed() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    generateSounds() {
        this.sounds.engine = this.createEngineSound();
        this.sounds.tire = this.createTireSound();
        this.sounds.nitro = this.createNitroSound();
        this.sounds.collision = this.createCollisionSound();
        this.sounds.countdown = this.createCountdownSound();
    }

    createEngineSound() {
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            const t = i / this.ctx.sampleRate;
            data[i] = (Math.sin(2 * Math.PI * 80 * t) * 0.3 +
                       Math.sin(2 * Math.PI * 160 * t) * 0.2 +
                       Math.sin(2 * Math.PI * 240 * t) * 0.1 +
                       (Math.random() - 0.5) * 0.1) *
                      Math.exp(-t / 0.5);
        }
        return buffer;
    }

    createTireSound() {
        const bufferSize = this.ctx.sampleRate * 1;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() - 0.5) * 0.15 *
                      Math.sin(2 * Math.PI * 300 * i / this.ctx.sampleRate) * 0.5;
        }
        return buffer;
    }

    createNitroSound() {
        const bufferSize = this.ctx.sampleRate * 1;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            const t = i / this.ctx.sampleRate;
            data[i] = (Math.sin(2 * Math.PI * (200 + t * 400) * t) * 0.2 +
                       (Math.random() - 0.5) * 0.2) *
                      Math.exp(-t / 0.3);
        }
        return buffer;
    }

    createCollisionSound() {
        const bufferSize = this.ctx.sampleRate * 0.5;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            const t = i / this.ctx.sampleRate;
            data[i] = (Math.sin(2 * Math.PI * 60 * t) * 0.4 +
                       (Math.random() - 0.5) * 0.3) *
                      Math.exp(-t / 0.08);
        }
        return buffer;
    }

    createCountdownSound() {
        const bufferSize = this.ctx.sampleRate * 0.4;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            const t = i / this.ctx.sampleRate;
            data[i] = Math.sin(2 * Math.PI * 800 * t) * 0.3 * Math.exp(-t / 0.1);
        }
        return buffer;
    }

    playEngineSound() {
        if (!this.initialized || !this.ctx) return null;
        this.ensureResumed();
        const source = this.ctx.createBufferSource();
        source.buffer = this.sounds.engine;
        source.loop = true;

        const gain = this.ctx.createGain();
        gain.gain.value = 0;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        filter.Q.value = 1;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        source.start();
        return { source, gain, filter };
    }

    updateEngineSound(engine, rpm, speed) {
        if (!engine || !this.ctx) return;
        const normalizedRpm = Math.max(0, Math.min(1, rpm));
        engine.gain.gain.value = 0.08 + normalizedRpm * 0.1;
        engine.filter.frequency.value = 200 + normalizedRpm * 1800;
        engine.source.playbackRate.value = 0.8 + normalizedRpm * 0.6;
    }

    playSound(name, volume = 1, playbackRate = 1) {
        if (!this.initialized || !this.ctx || !this.sounds[name]) return null;
        this.ensureResumed();
        const source = this.ctx.createBufferSource();
        source.buffer = this.sounds[name];
        source.playbackRate.value = playbackRate;

        const gain = this.ctx.createGain();
        gain.gain.value = volume * this.sfxVolume * this.masterVolume;

        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start();
        return source;
    }

    playTireScreech(speed) {
        const normalized = Math.min(1, Math.abs(speed) / 100);
        if (normalized > 0.3 && !this._tireSource) {
            this._tireSource = this.playSound('tire', 0.3, 0.5 + normalized);
        } else if (normalized <= 0.3 && this._tireSource) {
            try { this._tireSource.stop(); } catch (e) {}
            this._tireSource = null;
        }
    }

    stopTireScreech() {
        if (this._tireSource) {
            try { this._tireSource.stop(); } catch (e) {}
            this._tireSource = null;
        }
    }

    playNitro() {
        this.playSound('nitro', 0.5, 1);
    }

    playCollision(intensity) {
        this.playSound('collision', Math.min(1, intensity), 0.8 + intensity * 0.4);
    }

    playCountdown() {
        this.playSound('countdown', 0.6, 1);
    }

    stopEngineSound(engine) {
        if (engine && engine.source) {
            try { engine.source.stop(); } catch (e) {}
        }
    }

    setMasterVolume(v) {
        this.masterVolume = v / 100;
    }

    setSFXVolume(v) {
        this.sfxVolume = v / 100;
    }
}
