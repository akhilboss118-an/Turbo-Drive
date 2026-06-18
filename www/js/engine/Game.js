import * as THREE from 'three';
import { SceneManager } from './SceneManager.js';
import { Physics } from './Physics.js';
import { InputManager } from './InputManager.js';
import { AudioManager } from './AudioManager.js';
import { AssetLoader } from './AssetLoader.js';
import { PlayerCar } from '../entities/PlayerCar.js';
import { AICar } from '../entities/AICar.js';
import { Track } from '../entities/Track.js';
import { CameraSystem } from '../entities/CameraSystem.js';
import { WeatherSystem } from '../effects/WeatherSystem.js';
import { ParticleSystem } from '../effects/ParticleSystem.js';
import { PostProcessing } from '../effects/PostProcessing.js';
import { UIManager } from '../ui/UIManager.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.state = 'loading';
        this.quality = 'medium';
        this.aiDifficulty = 'medium';
        this.lapCount = 5;
        this.cameraShakeEnabled = true;

        // Core systems
        this.sceneManager = new SceneManager(canvas);
        this.physics = new Physics();
        this.input = new InputManager();
        this.audio = new AudioManager();
        this.assetLoader = new AssetLoader();
        this.ui = new UIManager();
        this.postProcessing = new PostProcessing(
            this.sceneManager.renderer,
            this.sceneManager.scene,
            this.sceneManager.camera
        );

        // Game objects
        this.track = null;
        this.playerCar = null;
        this.aiCars = [];
        this.cameraSystem = null;
        this.weather = null;
        this.particleSystem = null;

        // Race state
        this.raceState = {
            currentLap: 1,
            totalLaps: 5,
            playerPosition: 1,
            totalCars: 4,
            raceTime: 0,
            bestLapTime: Infinity,
            lastLapTime: 0,
            finished: false,
            started: false,
            countdown: 3,
            countdownTimer: 0,
            checkpoints: [],
            aiProgress: [],
            lapTimes: [],
            currentLapStart: 0,
        };

        this.paused = false;
        this.running = false;

        this.ui.setupCallbacks(this);
        this._loadingHidden = false;

        // Bind
        this.animate = this.animate.bind(this);
    }

    async initialize() {
        this.state = 'loading';

        // Init audio
        this.audio.init();

        // Init post-processing
        try {
            this.postProcessing.init();
        } catch (e) {
            console.warn('Post-processing unavailable, falling back to basic render:', e.message);
            this.postProcessing = null;
        }
        this.setQuality(this.ui.getSettings().quality);

        // Load settings
        const settings = this.ui.getSettings();
        this.quality = settings.quality;
        this.aiDifficulty = settings.aiDifficulty;
        this.lapCount = settings.lapCount;
        this.audio.setMasterVolume(settings.masterVolume);
        this.audio.setSFXVolume(settings.sfxVolume);

        // Simulate loading with progress
        this.ui.showLoading(0);
        const loadSteps = [
            { p: 0.1, msg: 'Setting up renderer...' },
            { p: 0.2, msg: 'Building track...' },
            { p: 0.4, msg: 'Creating environment...' },
            { p: 0.6, msg: 'Spawning vehicles...' },
            { p: 0.8, msg: 'Initializing systems...' },
            { p: 1.0, msg: 'Ready!' },
        ];
        for (const step of loadSteps) {
            await new Promise(r => setTimeout(r, 200));
            this.ui.showLoading(step.p);
        }

        // Build track
        this.track = new Track(this.sceneManager.scene);
        this.track.generate();

        // Weather
        this.weather = new WeatherSystem(this.sceneManager.scene);

        // Particles
        this.particleSystem = new ParticleSystem(this.sceneManager.scene);

        // Player car
        this.playerCar = new PlayerCar(
            this.sceneManager.scene,
            this.track,
            this.physics
        );

        // Position car at start line immediately so it's visible from the start
        const startPos = this.track.startLine?.position || this.track.waypoints[0]?.position || new THREE.Vector3(0, 0.3, 5);
        const startDir = this.track.startLine?.direction || this.track.waypoints[0]?.direction || new THREE.Vector3(0, 0, 1);
        const startRot = Math.atan2(startDir.x, startDir.z);
        this.playerCar.reset(startPos, startRot);

        // Camera
        this.cameraSystem = new CameraSystem(this.sceneManager.camera);
        this.cameraSystem.setTarget(this.playerCar);
        // Snap camera to car immediately
        this.cameraSystem.smoothPosition.copy(startPos.clone().add(new THREE.Vector3(0, 4, -8)));
        this.cameraSystem.smoothLookAt.copy(startPos);

        // AI cars
        this.createAICars();

        this.state = 'menu';

        // Hide loading screen
        if (!this._loadingHidden) {
            this.ui.hideLoading();
            this._loadingHidden = true;
        }
    }

    createAICars() {
        const count = 5;
        const startPositions = [];
        const startRot = this.track.waypoints[0]?.direction ?
            Math.atan2(this.track.waypoints[0].direction.x, this.track.waypoints[0].direction.z) : 0;

        const startP = this.track.waypoints[0]?.position || new THREE.Vector3(0, 0.3, 0);
        const perp = this.track.waypoints[0]?.direction ?
            new THREE.Vector3(-this.track.waypoints[0].direction.z, 0, this.track.waypoints[0].direction.x).normalize() :
            new THREE.Vector3(1, 0, 0);

        for (let i = 0; i < count; i++) {
            const offset = (i + 1) * 3;
            const pos = startP.clone().add(perp.clone().multiplyScalar(-offset));

            const difficultyLevels = ['easy', 'easy', 'medium', 'medium', 'hard'];
            const ai = new AICar(
                this.sceneManager.scene,
                this.track,
                this.physics,
                difficultyLevels[i] || 'medium'
            );
            ai.reset(pos, startRot, Math.floor(Math.random() * 3));
            this.aiCars.push(ai);
        }

        this.raceState.totalCars = 1 + this.aiCars.length;
        this.raceState.checkpoints = new Array(this.track.checkpoints.length).fill(false);
        this.raceState.aiProgress = this.aiCars.map(() => ({
            currentLap: 1,
            currentCheckpoint: 0,
            progress: 0,
            finished: false,
            finishTime: 0,
        }));
    }

    startRace() {
        this.state = 'racing';

        // Reset race state
        const startP = this.track.startLine?.position || new THREE.Vector3(0, 0.3, 5);
        const startDir = this.track.startLine?.direction || new THREE.Vector3(0, 0, 1);
        const startRot = Math.atan2(startDir.x, startDir.z);
        const perp = this.track.startLine?.perpendicular || new THREE.Vector3(1, 0, 0);

        // Reset player
        this.playerCar.reset(startP, startRot);

        // Reset AI
        for (let i = 0; i < this.aiCars.length; i++) {
            const offset = (i + 1) * 3;
            const pos = startP.clone().add(perp.clone().multiplyScalar(-offset));
            this.aiCars[i].reset(pos, startRot, Math.floor(Math.random() * 3));
        }

        // Reset race state
        this.raceState = {
            currentLap: 1,
            totalLaps: this.lapCount,
            playerPosition: 1,
            totalCars: 1 + this.aiCars.length,
            raceTime: 0,
            bestLapTime: Infinity,
            lastLapTime: 0,
            finished: false,
            started: false,
            countdown: 3,
            countdownTimer: 3,
            checkpoints: new Array(this.track.checkpoints.length).fill(false),
            aiProgress: this.aiCars.map(() => ({
                currentLap: 1,
                currentCheckpoint: 0,
                progress: 0,
                finished: false,
                finishTime: 0,
            })),
            lapTimes: [],
            currentLapStart: 0,
        };

        this.paused = false;
        this.running = true;

        // Sync camera system to current camera position for smooth transition
        if (this.cameraSystem) {
            this.cameraSystem.smoothPosition.copy(this.sceneManager.camera.position);
            this.cameraSystem.smoothLookAt.copy(startP);
        }

        this.ui.hideCountdown();
        this.ui.show();

        // Start countdown
        this.startCountdown();
    }

    startCountdown() {
        this.raceState.started = false;
        this.raceState.countdown = 3;
        this.raceState.countdownTimer = 3;

        const doCount = () => {
            if (this.state !== 'racing') return;

            this.ui.showCountdown(this.raceState.countdown);
            this.audio.playCountdown();

            this.raceState.countdown--;

            if (this.raceState.countdown >= 0) {
                setTimeout(doCount, 1000);
            } else {
                this.raceState.started = true;
                this.raceState.currentLapStart = -this.raceState.raceTime;
                setTimeout(() => {
                    this.ui.hideCountdown();
                }, 1000);
            }
        };

        setTimeout(doCount, 500);
    }

    pause() {
        this.paused = true;
        this.state = 'paused';
        this.ui.showPause();
    }

    resume() {
        this.paused = false;
        this.state = 'racing';
        this.ui.hidePause();
    }

    quitToMenu() {
        this.state = 'menu';
        this.running = false;
        this.paused = false;
        this.ui.hidePause();
        this.ui.hideCountdown();
    }

    setQuality(level) {
        this.quality = level;
        if (this.postProcessing) {
            this.postProcessing.setQuality(level);
        }
        if (this.sceneManager) {
            const pixelRatio = level === 'ultra' ? 2 :
                              level === 'high' ? 1.5 :
                              level === 'medium' ? 1 : 0.75;
            this.sceneManager.renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatio));
        }
    }

    update(dt) {
        if (this.paused || !this.running) return;

        // Race timer
        if (this.raceState.started && !this.raceState.finished) {
            this.raceState.raceTime += dt;
        }

        // Update track
        if (this.track) {
            this.track.update(this.raceState.raceTime, this.weather);
        }

        // Update weather
        if (this.weather) {
            this.weather.update(dt);
        }

        // Update player (movement only when race has started)
        if (this.playerCar) {
            if (this.raceState.started) {
                this.playerCar.update(dt, this.input);

                // Engine sound
                this.audio.updateEngineSound(
                    this._engineSound,
                    this.playerCar.rpm,
                    this.playerCar.speed
                );

                // Tire screech
                if (this.playerCar.isDrifting) {
                    this.audio.playTireScreech(this.playerCar.speed);
                } else {
                    this.audio.stopTireScreech();
                }

                // Particles
                if (this.playerCar.isDrifting && Math.random() < 0.3) {
                    const forward = this.playerCar.getForward();
                    const pos = this.playerCar.position.clone();
                    pos.x -= forward.x * 1.8;
                    pos.z -= forward.z * 1.8;
                    const smokeDir = new THREE.Vector3(-forward.x, 0, -forward.z);
                    this.particleSystem.createSmoke(
                        pos,
                        smokeDir,
                        this.playerCar.driftFactor,
                        0xcccccc
                    );
                }

                // Nitro flames
                if (this.playerCar.nitroActive && Math.random() < 0.5) {
                    const pos = this.playerCar.position.clone();
                    const forward = this.playerCar.getForward();
                    pos.x -= forward.x * 2.2;
                    pos.z -= forward.z * 2.2;
                    this.particleSystem.createNitroFlame(pos, forward);
                }

                // Dust
                if (Math.abs(this.playerCar.speed) > 30 && Math.random() < 0.1) {
                    const pos = this.playerCar.position.clone();
                    pos.y += 0.1;
                    this.particleSystem.createDust(pos, this.playerCar.speed / 200);
                }

                // Camera shake
                if (this.cameraShakeEnabled && this.cameraSystem) {
                    const speedShake = (this.playerCar.speed / 180) * 0.3;
                    if (speedShake > 0.05) {
                        this.cameraSystem.triggerShake(speedShake * dt * 2);
                    }
                }

                // Checkpoint detection
                this.checkCheckpoints();
            }

            // Camera follows car always (even during countdown)
            if (this.cameraSystem) {
                this.cameraSystem.update(dt);
            }
        }

        // Update AI
        if (this.raceState.started) {
            const allCarPositions = [this.playerCar, ...this.aiCars].filter(c => c);
            for (const ai of this.aiCars) {
                ai.update(dt, allCarPositions);
            }

            // AI checkpoint tracking
            this.updateAIProgress();

            // Calculate positions
            this.calculatePositions();
        }

        // Update particles
        if (this.particleSystem) {
            this.particleSystem.update(dt);
        }

        // Update UI
        this.ui.update(
            this.playerCar,
            this.raceState,
            [this.playerCar, ...this.aiCars],
            this.track,
            1 / (dt || 0.016),
            dt
        );
    }

    checkCheckpoints() {
        const carPos = this.playerCar.position;
        const checkpoints = this.track.checkpoints;

        for (let i = 0; i < checkpoints.length; i++) {
            const cp = checkpoints[i];
            if (!cp) continue;

            const toCar = new THREE.Vector3().copy(carPos).sub(cp.position);
            const alongTrack = Math.abs(toCar.dot(cp.direction)) < 2;
            const acrossTrack = Math.abs(toCar.dot(cp.perpendicular)) < cp.halfWidth;

            if (alongTrack && acrossTrack) {
                if (!this.raceState.checkpoints[i]) {
                    this.raceState.checkpoints[i] = true;

                    // All checkpoints passed (except finish)
                    if (i === checkpoints.length - 1 && this.raceState.checkpoints.every(c => c)) {
                        this.completeLap();
                    }
                }
            }
        }
    }

    completeLap() {
        const lapTime = this.raceState.raceTime - this.raceState.currentLapStart;
        this.raceState.lapTimes.push(lapTime);
        this.raceState.lastLapTime = lapTime;

        if (lapTime < this.raceState.bestLapTime) {
            this.raceState.bestLapTime = lapTime;
        }

        this.raceState.currentLap++;
        this.raceState.currentLapStart = this.raceState.raceTime;
        this.raceState.checkpoints = new Array(this.track.checkpoints.length).fill(false);

        if (this.raceState.currentLap > this.raceState.totalLaps) {
            this.finishRace();
        }
    }

    finishRace() {
        this.raceState.finished = true;
        this.state = 'results';

        this.audio.stopTireScreech();
        if (this._engineSound) {
            this.audio.stopEngineSound(this._engineSound);
        }

        const minutes = Math.floor(this.raceState.raceTime / 60);
        const seconds = this.raceState.raceTime % 60;
        const timeStr = `${String(minutes).padStart(2, '0')}:${String(Math.floor(seconds)).padStart(2, '0')}.${String(Math.floor((seconds % 1) * 1000)).padStart(3, '0')}`;

        const bestMinutes = Math.floor(this.raceState.bestLapTime / 60);
        const bestSeconds = this.raceState.bestLapTime % 60;
        const bestStr = bestMinutes > 0 || this.raceState.bestLapTime < Infinity ?
            `${String(bestMinutes).padStart(2, '0')}:${String(Math.floor(bestSeconds)).padStart(2, '0')}.${String(Math.floor((bestSeconds % 1) * 1000)).padStart(3, '0')}` :
            '--:--.---';

        this.ui.showResults({
            won: this.raceState.playerPosition === 1,
            position: this.raceState.playerPosition,
            time: timeStr,
            bestLap: bestStr,
        });
    }

    updateAIProgress() {
        for (let i = 0; i < this.aiCars.length; i++) {
            const ai = this.aiCars[i];
            const progress = this.raceState.aiProgress[i];
            if (progress.finished) continue;

            const wpIndex = ai.currentWaypoint;
            const totalWp = this.track.waypoints.length;
            const checkpointsPerLap = this.track.checkpoints.length;

            // AI progress based on waypoint progression
            const lapProgress = (progress.currentLap - 1) * totalWp + wpIndex;
            progress.progress = lapProgress;

            // Detect AI lap completion
            if (wpIndex < 2 && progress.currentCheckpoint >= totalWp - 2) {
                progress.currentLap++;
                progress.currentCheckpoint = 0;

                if (progress.currentLap > this.raceState.totalLaps) {
                    progress.finished = true;
                    progress.finishTime = this.raceState.raceTime;
                }
            }

            progress.currentCheckpoint = Math.max(progress.currentCheckpoint, wpIndex);
        }
    }

    calculatePositions() {
        const playerProgress = (this.raceState.currentLap - 1) * this.track.waypoints.length +
            this.track.getNearestWaypoint(this.playerCar.position);

        const allProgress = [
            { id: 'player', progress: playerProgress, finished: this.raceState.finished, time: this.raceState.raceTime },
            ...this.aiCars.map((ai, i) => ({
                id: `ai_${i}`,
                progress: this.raceState.aiProgress[i].progress || 0,
                finished: this.raceState.aiProgress[i].finished,
                time: this.raceState.aiProgress[i].finishTime || this.raceState.raceTime,
            }))
        ];

        allProgress.sort((a, b) => {
            if (a.finished && !b.finished) return -1;
            if (!a.finished && b.finished) return 1;
            if (a.finished && b.finished) return a.time - b.time;
            return b.progress - a.progress;
        });

        for (let i = 0; i < allProgress.length; i++) {
            if (allProgress[i].id === 'player') {
                this.raceState.playerPosition = i + 1;
                break;
            }
        }
    }

    render() {
        if (this.postProcessing && this.postProcessing.composer) {
            this.postProcessing.render(this.sceneManager.clock.getDelta());
        } else {
            this.sceneManager.render();
        }
    }

    animate() {
        requestAnimationFrame(this.animate);

        const dt = this.sceneManager.clock.getDelta();

        if (this.state === 'racing' && !this.paused) {
            this.update(dt);
        } else if (this.state === 'menu' || this.state === 'loading') {
            // Menu animation - orbit around the track
            if (this.sceneManager && this.sceneManager.camera && this.playerCar) {
                const time = Date.now() * 0.00015;
                const dist = 170;
                const height = 60;
                this.sceneManager.camera.position.set(
                    Math.cos(time) * dist,
                    height + Math.sin(time * 0.3) * 10,
                    Math.sin(time) * dist
                );
                this.sceneManager.camera.lookAt(0, 0, 0);
            }
        }

        this.render();

        // Handle input events
        if (this.input.getPausePressed()) {
            if (this.state === 'racing') this.pause();
            else if (this.state === 'paused') this.resume();
        }

        // Camera switching
        if (this.input.getCameraSwap() && this.cameraSystem && this.state === 'racing') {
            this.cameraSystem.switchMode();
        }

        this.input.endFrame();
    }

    start() {
        this.running = true;

        // Start engine sound (will start muted until user interacts)
        this._engineSound = this.audio.playEngineSound();

        // Resume audio context on first user interaction
        const resumeAudio = () => {
            this.audio.ensureResumed();
            window.removeEventListener('click', resumeAudio);
            window.removeEventListener('keydown', resumeAudio);
            window.removeEventListener('touchstart', resumeAudio);
        };
        window.addEventListener('click', resumeAudio);
        window.addEventListener('keydown', resumeAudio);
        window.addEventListener('touchstart', resumeAudio);

        this.animate();
    }

    setCameraMode(mode) {
        if (this.cameraSystem) {
            this.cameraSystem.setMode(mode);
        }
    }
}
