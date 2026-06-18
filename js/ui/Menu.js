export class Menu {
    constructor() {
        this.currentScreen = 'main-menu';
        this.screens = {};
        this.callbacks = {};

        this.init();
    }

    init() {
        const menuScreens = ['main-menu', 'settings-menu', 'controls-menu', 'about-menu', 'pause-menu'];
        for (const id of menuScreens) {
            const el = document.getElementById(id);
            if (el) this.screens[id] = el;
        }

        this.resultsScreen = document.getElementById('race-results');
        this.loadingScreen = document.getElementById('loading-screen');

        document.querySelectorAll('[data-action]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleAction(action);
            });
        });

        // Settings bindings
        const masterVol = document.getElementById('master-volume');
        const sfxVol = document.getElementById('sfx-volume');
        if (masterVol) {
            masterVol.addEventListener('input', (e) => {
                document.getElementById('volume-display').textContent = `${e.target.value}%`;
                if (this.callbacks.masterVolume) this.callbacks.masterVolume(parseInt(e.target.value));
            });
        }
        if (sfxVol) {
            sfxVol.addEventListener('input', (e) => {
                document.getElementById('sfx-display').textContent = `${e.target.value}%`;
                if (this.callbacks.sfxVolume) this.callbacks.sfxVolume(parseInt(e.target.value));
            });
        }

        const gfxQuality = document.getElementById('gfx-quality');
        if (gfxQuality) {
            gfxQuality.addEventListener('change', (e) => {
                if (this.callbacks.gfxQuality) this.callbacks.gfxQuality(e.target.value);
            });
        }

        const aiDiff = document.getElementById('ai-difficulty');
        if (aiDiff) {
            aiDiff.addEventListener('change', (e) => {
                if (this.callbacks.aiDifficulty) this.callbacks.aiDifficulty(e.target.value);
            });
        }

        const lapCount = document.getElementById('lap-count');
        if (lapCount) {
            lapCount.addEventListener('change', (e) => {
                if (this.callbacks.lapCount) this.callbacks.lapCount(parseInt(e.target.value));
            });
        }

        const camShake = document.getElementById('camera-shake');
        if (camShake) {
            camShake.addEventListener('change', (e) => {
                if (this.callbacks.cameraShake) this.callbacks.cameraShake(e.target.checked);
            });
        }
    }

    on(action, callback) {
        this.callbacks[action] = callback;
    }

    handleAction(action) {
        switch (action) {
            case 'start':
                this.show('none');
                if (this.callbacks.start) this.callbacks.start();
                break;
            case 'settings':
                this.show('settings-menu');
                break;
            case 'controls':
                this.show('controls-menu');
                break;
            case 'about':
                this.show('about-menu');
                break;
            case 'back':
                this.show('main-menu');
                break;
            case 'resume':
                this.show('none');
                if (this.callbacks.resume) this.callbacks.resume();
                break;
            case 'restart':
                this.show('none');
                if (this.callbacks.restart) this.callbacks.restart();
                break;
            case 'quit':
                this.show('main-menu');
                if (this.callbacks.quit) this.callbacks.quit();
                break;
        }
    }

    show(screenId) {
        for (const [id, el] of Object.entries(this.screens)) {
            el.classList.toggle('active', id === screenId);
        }
        if (this.resultsScreen) {
            this.resultsScreen.classList.add('hidden');
        }
        this.currentScreen = screenId || 'none';

        if (screenId === 'none') {
            document.getElementById('main-menu')?.classList.remove('active');
        }
    }

    showResults(data) {
        if (!this.resultsScreen) return;
        this.resultsScreen.classList.remove('hidden');

        document.getElementById('results-title').textContent =
            data.won ? 'YOU WIN!' : 'RACE COMPLETE';

        document.getElementById('results-position').textContent =
            `${data.position}${data.position === 1 ? 'st' : data.position === 2 ? 'nd' : data.position === 3 ? 'rd' : 'th'} Place`;

        document.getElementById('results-time').textContent =
            `Time: ${data.time}`;

        document.getElementById('results-laps').textContent =
            `Best Lap: ${data.bestLap}`;
    }

    hideResults() {
        if (this.resultsScreen) {
            this.resultsScreen.classList.add('hidden');
        }
    }

    updateLoading(progress) {
        const bar = document.getElementById('loading-bar');
        const text = document.getElementById('loading-text');
        if (bar) bar.style.width = `${progress * 100}%`;
        if (text) text.textContent = `Loading assets... ${Math.round(progress * 100)}%`;
    }

    hideLoading() {
        if (this.loadingScreen) {
            this.loadingScreen.classList.add('fade-out');
            setTimeout(() => {
                this.loadingScreen.style.display = 'none';
            }, 800);
        }
    }

    showPause() {
        this.screens['pause-menu']?.classList.add('active');
    }

    hidePause() {
        this.screens['pause-menu']?.classList.remove('active');
    }

    isPaused() {
        return this.screens['pause-menu']?.classList.contains('active');
    }

    getSettings() {
        return {
            quality: document.getElementById('gfx-quality')?.value || 'medium',
            masterVolume: parseInt(document.getElementById('master-volume')?.value || '80'),
            sfxVolume: parseInt(document.getElementById('sfx-volume')?.value || '90'),
            cameraShake: document.getElementById('camera-shake')?.checked || true,
            aiDifficulty: document.getElementById('ai-difficulty')?.value || 'medium',
            lapCount: parseInt(document.getElementById('lap-count')?.value || '5'),
        };
    }
}
