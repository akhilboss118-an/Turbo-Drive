import { Menu } from './Menu.js';
import { HUD } from './HUD.js';

export class UIManager {
    constructor() {
        this.menu = new Menu();
        this.hud = new HUD();
        this.active = false;
    }

    setupCallbacks(game) {
        this.menu.on('start', () => {
            this.active = true;
            this.hud.show();
            if (game) game.startRace();
        });

        this.menu.on('resume', () => {
            if (game) game.resume();
        });

        this.menu.on('restart', () => {
            this.hud.show();
            this.menu.hideResults();
            this.active = true;
            if (game) game.startRace();
        });

        this.menu.on('quit', () => {
            this.active = false;
            this.hud.hide();
            this.menu.hideResults();
            if (game) game.quitToMenu();
        });

        this.menu.on('masterVolume', (v) => {
            if (game && game.audio) game.audio.setMasterVolume(v);
        });

        this.menu.on('sfxVolume', (v) => {
            if (game && game.audio) game.audio.setSFXVolume(v);
        });

        this.menu.on('gfxQuality', (v) => {
            if (game && game.postProcessing) game.postProcessing.setQuality(v);
            if (game) game.quality = v;
        });

        this.menu.on('aiDifficulty', (v) => {
            if (game) game.aiDifficulty = v;
        });

        this.menu.on('lapCount', (v) => {
            if (game) game.lapCount = v;
        });

        this.menu.on('cameraShake', (v) => {
            if (game) game.cameraShakeEnabled = v;
        });
    }

    showLoading(progress) {
        this.menu.updateLoading(progress);
        if (progress >= 1) {
            setTimeout(() => this.hideLoading(), 300);
        }
    }

    hideLoading() {
        this.menu.hideLoading();
    }

    update(playerCar, raceState, allCars, track, fps, dt) {
        if (!this.active) return;

        const speedKMH = playerCar.getSpeedKMH();
        this.hud.updateSpeed(speedKMH);
        this.hud.updateGear(playerCar.getGearString());
        this.hud.updateRPM(playerCar.rpm);

        if (raceState) {
            this.hud.updateLap(raceState.currentLap, raceState.totalLaps);
            this.hud.updatePosition(raceState.playerPosition, raceState.totalCars);
            this.hud.updateTimer(raceState.raceTime);
        }

        this.hud.updateBoost(playerCar.getNitroPercent());
        this.hud.updateFPS(fps);

        // Drift indicator
        this.hud.showDriftIndicator(playerCar.isDrifting && playerCar.driftFactor > 0.5);

        // Minimap
        this.hud.updateMinimap(
            playerCar.position,
            playerCar.rotation,
            track.waypoints,
            allCars
        );
    }

    showCountdown(number) {
        this.hud.showCountdown(number);
    }

    hideCountdown() {
        this.hud.hideCountdown();
    }

    showResults(data) {
        this.active = false;
        this.hud.hide();
        this.menu.showResults(data);
    }

    showPause() {
        this.menu.showPause();
    }

    hidePause() {
        this.menu.hidePause();
    }

    isPaused() {
        return this.menu.isPaused();
    }

    getSettings() {
        return this.menu.getSettings();
    }

    isMobile() {
        return this.hud.isMobile;
    }
}
