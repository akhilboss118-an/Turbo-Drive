export class HUD {
    constructor() {
        this.elements = {
            hud: document.getElementById('hud'),
            speed: document.getElementById('speed-display'),
            gear: document.getElementById('gear-display'),
            rpm: document.getElementById('rpm-fill'),
            lap: document.getElementById('lap-counter'),
            position: document.getElementById('position-display'),
            timer: document.getElementById('timer-display'),
            boost: document.getElementById('boost-fill'),
            fps: document.getElementById('fps-counter'),
            countdown: document.getElementById('countdown-overlay'),
            countdownText: document.getElementById('countdown-text'),
            driftIndicator: document.getElementById('drift-indicator'),
            minimap: document.getElementById('minimap-canvas'),
            mobile: document.getElementById('mobile-controls'),
        };

        this.minimapCtx = this.elements.minimap ? this.elements.minimap.getContext('2d') : null;
        this.isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

        if (this.isMobile && this.elements.mobile) {
            this.elements.mobile.classList.remove('hidden');
        }
    }

    show() {
        this.elements.hud.classList.remove('hidden');
    }

    hide() {
        this.elements.hud.classList.add('hidden');
    }

    updateSpeed(speedKMH) {
        if (this.elements.speed) {
            this.elements.speed.textContent = Math.round(speedKMH);
        }
    }

    updateGear(gear) {
        if (this.elements.gear) {
            this.elements.gear.textContent = gear;
        }
    }

    updateRPM(rpm) {
        if (this.elements.rpm) {
            this.elements.rpm.style.width = `${rpm * 100}%`;
        }
    }

    updateLap(current, total) {
        if (this.elements.lap) {
            this.elements.lap.textContent = `LAP ${current} / ${total}`;
        }
    }

    updatePosition(position, total) {
        if (this.elements.position) {
            const suffix = position === 1 ? 'st' :
                           position === 2 ? 'nd' :
                           position === 3 ? 'rd' : 'th';
            this.elements.position.textContent = `${position}${suffix}`;
        }
    }

    updateTimer(timeInSeconds) {
        if (this.elements.timer) {
            const mins = Math.floor(timeInSeconds / 60);
            const secs = timeInSeconds % 60;
            const millis = Math.floor((secs - Math.floor(secs)) * 1000);
            this.elements.timer.textContent =
                `${String(mins).padStart(2, '0')}:${String(Math.floor(secs)).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
        }
    }

    updateBoost(percent) {
        if (this.elements.boost) {
            this.elements.boost.style.width = `${percent * 100}%`;
            this.elements.boost.style.background =
                percent > 0.5
                    ? 'linear-gradient(90deg, #00aaff, #ff4400)'
                    : 'linear-gradient(90deg, #ff4400, #ff8800)';
        }
    }

    updateFPS(fps) {
        if (this.elements.fps) {
            this.elements.fps.textContent = `${Math.round(fps)} FPS`;
            this.elements.fps.style.color = fps < 30 ? '#ff4400' : fps < 50 ? '#ffaa00' : 'rgba(255,255,255,0.4)';
        }
    }

    showCountdown(number) {
        if (this.elements.countdown && this.elements.countdownText) {
            this.elements.countdown.classList.remove('hidden');
            if (number > 0) {
                this.elements.countdownText.textContent = number;
                this.elements.countdownText.style.animation = 'none';
                void this.elements.countdownText.offsetWidth;
                this.elements.countdownText.style.animation = 'countdown-pop 1s ease';
            } else {
                this.elements.countdownText.textContent = 'GO!';
                this.elements.countdownText.style.color = '#00ff00';
                this.elements.countdownText.style.animation = 'none';
                void this.elements.countdownText.offsetWidth;
                this.elements.countdownText.style.animation = 'countdown-pop 1s ease';
            }
        }
    }

    hideCountdown() {
        if (this.elements.countdown) {
            this.elements.countdown.classList.add('hidden');
        }
    }

    showDriftIndicator(show) {
        if (this.elements.driftIndicator) {
            if (show) {
                this.elements.driftIndicator.classList.remove('hidden');
            } else {
                this.elements.driftIndicator.classList.add('hidden');
            }
        }
    }

    updateMinimap(playerPos, playerRot, trackWaypoints, allCars) {
        if (!this.minimapCtx || !this.elements.minimap) return;

        const ctx = this.minimapCtx;
        const canvas = this.elements.minimap;
        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const scale = 0.8;

        ctx.clearRect(0, 0, w, h);

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.beginPath();
        ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw track waypoints
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        for (let i = 0; i < trackWaypoints.length; i++) {
            const wp = trackWaypoints[i];
            const rx = (wp.position.x - playerPos.x) * scale + cx;
            const ry = (wp.position.z - playerPos.z) * scale + cy;
            if (i === 0) ctx.moveTo(rx, ry);
            else ctx.lineTo(rx, ry);
        }
        ctx.closePath();
        ctx.stroke();

        // Draw other cars
        for (const car of allCars) {
            const rx = (car.position.x - playerPos.x) * scale + cx;
            const ry = (car.position.z - playerPos.z) * scale + cy;
            ctx.fillStyle = 'rgba(255,200,0,0.8)';
            ctx.beginPath();
            ctx.arc(rx, ry, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw player
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-playerRot);
        ctx.fillStyle = '#ff4400';
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(-3, 3);
        ctx.lineTo(3, 3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Border
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, cx - 2, 0, Math.PI * 2);
        ctx.stroke();
    }
}
