export class InputManager {
    constructor() {
        this.keys = {};
        this.justPressed = {};
        this.prevKeys = {};
        this.touch = {
            steering: 0,
            accelerate: false,
            brake: false,
            handbrake: false,
            nitro: false,
            cameraSwap: false
        };
        this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        this.bindKeyboard();
        if (this.isMobile) this.bindTouch();
    }

    bindKeyboard() {
        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();
            this.keys[key] = true;
            if (key === ' ') this.keys['space'] = true;
            if (!this.justPressed[key]) this.justPressed[key] = true;
        });

        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            this.keys[key] = false;
            if (key === ' ') this.keys['space'] = false;
        });

        window.addEventListener('blur', () => {
            this.keys = {};
        });
    }

    bindTouch() {
        const steering = document.getElementById('steering-wheel');
        const accel = document.getElementById('touch-pedal-accel');
        const brake = document.getElementById('touch-pedal-brake');
        const nitro = document.getElementById('touch-nitro');
        const hb = document.getElementById('touch-handbrake');
        const cam = document.getElementById('touch-camera');

        if (!steering) return;

        let steeringTouchId = null;
        let startX = 0;

        steering.addEventListener('touchstart', (e) => {
            e.preventDefault();
            steeringTouchId = e.changedTouches[0].identifier;
            startX = e.changedTouches[0].clientX;
        });

        steering.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (const touch of e.changedTouches) {
                if (touch.identifier === steeringTouchId) {
                    const delta = (touch.clientX - startX) / steering.offsetWidth;
                    this.touch.steering = Math.max(-1, Math.min(1, delta * 2));
                }
            }
        });

        steering.addEventListener('touchend', (e) => {
            for (const touch of e.changedTouches) {
                if (touch.identifier === steeringTouchId) {
                    steeringTouchId = null;
                    this.touch.steering = 0;
                }
            }
        });

        steering.addEventListener('touchcancel', () => {
            steeringTouchId = null;
            this.touch.steering = 0;
        });

        if (accel) {
            accel.addEventListener('touchstart', (e) => { e.preventDefault(); this.touch.accelerate = true; });
            accel.addEventListener('touchend', () => { this.touch.accelerate = false; });
            accel.addEventListener('touchcancel', () => { this.touch.accelerate = false; });
        }

        if (brake) {
            brake.addEventListener('touchstart', (e) => { e.preventDefault(); this.touch.brake = true; });
            brake.addEventListener('touchend', () => { this.touch.brake = false; });
            brake.addEventListener('touchcancel', () => { this.touch.brake = false; });
        }

        if (nitro) {
            nitro.addEventListener('touchstart', (e) => { e.preventDefault(); this.touch.nitro = true; });
            nitro.addEventListener('touchend', () => { this.touch.nitro = false; });
            nitro.addEventListener('touchcancel', () => { this.touch.nitro = false; });
        }

        if (hb) {
            hb.addEventListener('touchstart', (e) => { e.preventDefault(); this.touch.handbrake = true; });
            hb.addEventListener('touchend', () => { this.touch.handbrake = false; });
            hb.addEventListener('touchcancel', () => { this.touch.handbrake = false; });
        }

        if (cam) {
            cam.addEventListener('touchstart', (e) => { e.preventDefault(); this.touch.cameraSwap = true; });
        }
    }

    isKeyDown(key) {
        return !!this.keys[key];
    }

    wasKeyPressed(key) {
        return !!this.justPressed[key];
    }

    getSteering() {
        if (this.isMobile) return this.touch.steering;
        let val = 0;
        if (this.keys['a'] || this.keys['arrowleft']) val -= 1;
        if (this.keys['d'] || this.keys['arrowright']) val += 1;
        return val;
    }

    isAccelerating() {
        if (this.isMobile) return this.touch.accelerate;
        return !!(this.keys['w'] || this.keys['arrowup']);
    }

    isBraking() {
        if (this.isMobile) return this.touch.brake;
        return !!(this.keys['s'] || this.keys['arrowdown']);
    }

    isHandbraking() {
        if (this.isMobile) return this.touch.handbrake;
        return !!this.keys['space'];
    }

    isNitro() {
        if (this.isMobile) return this.touch.nitro;
        return !!(this.keys['shift']);
    }

    getCameraSwap() {
        const val = this.wasKeyPressed('c') || this.touch.cameraSwap;
        if (this.touch.cameraSwap) this.touch.cameraSwap = false;
        return val;
    }

    getPausePressed() {
        return this.wasKeyPressed('escape') || this.wasKeyPressed('p');
    }

    endFrame() {
        this.justPressed = {};
    }
}
