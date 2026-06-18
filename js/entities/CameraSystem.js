import * as THREE from 'three';

export class CameraSystem {
    constructor(camera) {
        this.camera = camera;
        this.mode = 0; // 0: chase, 1: cockpit, 2: cinematic
        this.modes = ['chase', 'cockpit', 'cinematic'];
        this.target = null;
        this.smoothPosition = new THREE.Vector3();
        this.smoothLookAt = new THREE.Vector3();

        this.params = {
            chase: {
                distance: 8,
                height: 4,
                lookAhead: 3,
                smoothSpeed: 4,
                fov: 70,
            },
            cockpit: {
                offset: new THREE.Vector3(0, 0.9, 0.3),
                fov: 80,
                smoothSpeed: 8,
            },
            cinematic: {
                distance: 12,
                height: 6,
                orbitSpeed: 0.3,
                fov: 60,
                smoothSpeed: 2,
            }
        };

        this.shakeIntensity = 0;
        this.shakeDecay = 5;
        this.time = 0;
        this.cinematicAngle = 0;
        this.prevMode = 'chase';
    }

    setTarget(car) {
        this.target = car;
        if (car) {
            this.smoothPosition.copy(car.group.position);
            this.smoothPosition.y += this.params.chase.height;
            this.smoothPosition.z += this.params.chase.distance;
        }
    }

    switchMode() {
        this.mode = (this.mode + 1) % this.modes.length;
        if (this.modes[this.mode] === 'cockpit') {
            this.camera.fov = this.params.cockpit.fov;
        } else if (this.modes[this.mode] === 'cinematic') {
            this.camera.fov = this.params.cinematic.fov;
            this.cinematicAngle = this.time;
        } else {
            this.camera.fov = this.params.chase.fov;
        }
        this.camera.updateProjectionMatrix();
    }

    setMode(mode) {
        const idx = this.modes.indexOf(mode);
        if (idx >= 0) this.mode = idx;
    }

    triggerShake(intensity) {
        this.shakeIntensity = Math.min(1, this.shakeIntensity + intensity);
    }

    update(dt) {
        if (!this.target) return;
        this.time += dt;
        const carPos = this.target.group.position;
        const carRot = this.target.rotation;
        const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), carRot);

        const modeName = this.modes[this.mode];
        let targetPos = new THREE.Vector3();
        let targetLook = new THREE.Vector3();

        if (modeName === 'chase') {
            const p = this.params.chase;
            const desiredPos = carPos.clone()
                .add(forward.clone().multiplyScalar(-p.distance))
                .add(new THREE.Vector3(0, p.height, 0));
            targetPos.copy(desiredPos);
            targetLook.copy(carPos.clone().add(forward.clone().multiplyScalar(p.lookAhead)));

            this.camera.fov = this.params.chase.fov;

        } else if (modeName === 'cockpit') {
            const p = this.params.cockpit;
            targetPos.copy(carPos);
            targetPos.y += p.offset.y;
            targetPos.add(forward.clone().multiplyScalar(p.offset.z));
            targetLook.copy(carPos.clone().add(forward.clone().multiplyScalar(10)));

        } else if (modeName === 'cinematic') {
            const p = this.params.cinematic;
            this.cinematicAngle += dt * p.orbitSpeed;
            const orbitPos = carPos.clone();
            orbitPos.x += Math.cos(this.cinematicAngle) * p.distance;
            orbitPos.z += Math.sin(this.cinematicAngle) * p.distance;
            orbitPos.y += p.height;
            targetPos.copy(orbitPos);
            targetLook.copy(carPos);
        }

        // Smooth camera movement
        const smoothSpeed = this.params[modeName].smoothSpeed;
        this.smoothPosition.lerp(targetPos, Math.min(1, smoothSpeed * dt));
        this.smoothLookAt.lerp(targetLook, Math.min(1, smoothSpeed * dt));

        // Camera shake
        let shakeOffset = new THREE.Vector3();
        if (this.shakeIntensity > 0.01) {
            shakeOffset.x = (Math.random() - 0.5) * this.shakeIntensity * 0.5;
            shakeOffset.y = (Math.random() - 0.5) * this.shakeIntensity * 0.5;
            shakeOffset.z = (Math.random() - 0.5) * this.shakeIntensity * 0.3;
            this.shakeIntensity *= (1 - this.shakeDecay * dt);
        } else {
            this.shakeIntensity = 0;
        }

        this.camera.position.copy(this.smoothPosition).add(shakeOffset);
        this.camera.lookAt(this.smoothLookAt);
        this.camera.updateProjectionMatrix();
    }
}
