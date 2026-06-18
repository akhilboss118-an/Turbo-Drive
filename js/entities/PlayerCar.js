import * as THREE from 'three';

export class PlayerCar {
    constructor(scene, track, physics) {
        this.scene = scene;
        this.track = track;
        this.physics = physics;
        this.group = new THREE.Group();

        // Physics state
        this.position = new THREE.Vector3(0, 0.3, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotation = 0;
        this.angularVelocity = 0;

        // Car specs
        this.specs = {
            maxSpeed: 180,
            acceleration: 35,
            brakingForce: 50,
            reverseSpeed: 40,
            reverseAcceleration: 25,
            turnSpeed: 2.5,
            turnSpeedHigh: 1.0,
            driftTurnMultiplier: 1.5,
            friction: 0.97,
            driftFriction: 0.94,
            nitroMultiplier: 2.0,
            nitroDuration: 3,
            nitroCapacity: 100,
            nitroConsumption: 30,
            nitroRecharge: 15,
            mass: 1,
        };

        // State
        this.speed = 0;
        this.rpm = 0;
        this.gear = 0;
        this.gears = ['R', 'N', '1', '2', '3', '4', '5', '6'];
        this.isDrifting = false;
        this.driftAngle = 0;
        this.driftFactor = 0;
        this.nitro = this.specs.nitroCapacity;
        this.nitroActive = false;
        this.nitroTimer = 0;
        this.isOnGround = true;
        this.finalSteering = 0;
        this.tireSmokeTimer = 0;

        this.buildCar();
        this.group.position.copy(this.position);
        this.scene.add(this.group);
    }

    buildCar() {
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0xcc2222,
            roughness: 0.3,
            metalness: 0.8,
            envMapIntensity: 1.5,
        });

        const darkMat = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.5,
            metalness: 0.3,
        });

        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x88ccff,
            roughness: 0.1,
            metalness: 0.1,
            transparent: true,
            opacity: 0.4,
        });

        const lightMat = new THREE.MeshStandardMaterial({
            color: 0xffeecc,
            roughness: 0.2,
            metalness: 0.1,
            emissive: 0xff8800,
            emissiveIntensity: 0.3,
        });

        const tailMat = new THREE.MeshStandardMaterial({
            color: 0xff2200,
            roughness: 0.2,
            metalness: 0.1,
            emissive: 0xff0000,
            emissiveIntensity: 0.2,
        });

        const chromeMat = new THREE.MeshStandardMaterial({
            color: 0xccccdd,
            roughness: 0.05,
            metalness: 0.95,
        });

        const rimMat = new THREE.MeshStandardMaterial({
            color: 0x888899,
            roughness: 0.2,
            metalness: 0.8,
        });

        const tireMat = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.9,
            metalness: 0.0,
        });

        // Main body
        const bodyGeo = new THREE.BoxGeometry(1.8, 0.5, 4.2);
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.45;
        body.castShadow = true;
        this.group.add(body);

        // Hood
        const hood = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, 0.15, 0.8),
            bodyMat
        );
        hood.position.set(0, 0.65, 1.3);
        this.group.add(hood);

        // Cabin
        const cabinGeo = new THREE.BoxGeometry(1.4, 0.4, 1.8);
        const cabin = new THREE.Mesh(cabinGeo, glassMat);
        cabin.position.set(0, 0.8, -0.2);
        this.group.add(cabin);

        // Cabin pillars / frame
        const frameMat = bodyMat;
        const frameGeo = new THREE.BoxGeometry(0.04, 0.4, 1.8);
        for (let x of [-0.7, 0.7]) {
            const pillar = new THREE.Mesh(frameGeo, frameMat);
            pillar.position.set(x, 0.8, -0.2);
            this.group.add(pillar);
        }

        // Roof
        const roof = new THREE.Mesh(
            new THREE.BoxGeometry(1.4, 0.05, 1.6),
            bodyMat
        );
        roof.position.set(0, 1.0, -0.2);
        this.group.add(roof);

        // Spoiler
        const spoilerMat = darkMat;
        const spoiler = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, 0.05, 0.3),
            spoilerMat
        );
        spoiler.position.set(0, 0.7, -2.1);
        this.group.add(spoiler);

        const spoilerLegs = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.2, 0.04),
            spoilerMat
        );
        spoilerLegs.position.set(0.5, 0.6, -2.1);
        this.group.add(spoilerLegs);

        const spoilerLegs2 = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.2, 0.04),
            spoilerMat
        );
        spoilerLegs2.position.set(-0.5, 0.6, -2.1);
        this.group.add(spoilerLegs2);

        // Headlights
        for (let x of [-0.6, 0.6]) {
            const light = new THREE.Mesh(
                new THREE.SphereGeometry(0.12, 8, 8),
                lightMat
            );
            light.position.set(x, 0.35, 2.12);
            this.group.add(light);
        }

        // Tail lights
        for (let x of [-0.5, 0.5]) {
            const tail = new THREE.Mesh(
                new THREE.BoxGeometry(0.2, 0.08, 0.05),
                tailMat
            );
            tail.position.set(x, 0.35, -2.12);
            this.group.add(tail);
        }

        // Bumpers
        const bumperMat = darkMat;
        const frontBumper = new THREE.Mesh(
            new THREE.BoxGeometry(1.4, 0.15, 0.1),
            bumperMat
        );
        frontBumper.position.set(0, 0.15, 2.15);
        this.group.add(frontBumper);

        const rearBumper = new THREE.Mesh(
            new THREE.BoxGeometry(1.4, 0.15, 0.1),
            bumperMat
        );
        rearBumper.position.set(0, 0.15, -2.15);
        this.group.add(rearBumper);

        // Undercarriage
        const under = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, 0.08, 3.8),
            darkMat
        );
        under.position.y = 0.06;
        this.group.add(under);

        // Wheels
        this.wheels = [];
        const wheelPositions = [
            { x: -0.9, z: 1.3 },
            { x: 0.9, z: 1.3 },
            { x: -0.9, z: -1.3 },
            { x: 0.9, z: -1.3 }
        ];

        this.frontWheels = [];
        this.rearWheels = [];

        for (const wp of wheelPositions) {
            const wheelGroup = new THREE.Group();

            const tire = new THREE.Mesh(
                new THREE.CylinderGeometry(0.28, 0.28, 0.18, 12),
                tireMat
            );
            tire.rotation.x = Math.PI / 2;
            wheelGroup.add(tire);

            const rim = new THREE.Mesh(
                new THREE.CylinderGeometry(0.15, 0.15, 0.19, 8),
                rimMat
            );
            rim.rotation.x = Math.PI / 2;
            wheelGroup.add(rim);

            // Spokes
            for (let s = 0; s < 5; s++) {
                const angle = (s / 5) * Math.PI * 2;
                const spoke = new THREE.Mesh(
                    new THREE.BoxGeometry(0.02, 0.19, 0.1),
                    rimMat
                );
                spoke.position.set(Math.cos(angle) * 0.08, 0, Math.sin(angle) * 0.08);
                wheelGroup.add(spoke);
            }

            wheelGroup.position.set(wp.x, 0.28, wp.z);
            this.group.add(wheelGroup);
            this.wheels.push(wheelGroup);

            if (wp.z > 0) this.frontWheels.push(wheelGroup);
            else this.rearWheels.push(wheelGroup);
        }

        // Exhaust pipes
        const exhaustMat = new THREE.MeshStandardMaterial({
            color: 0x444444,
            roughness: 0.3,
            metalness: 0.8,
        });
        for (let x of [-0.3, 0.3]) {
            const pipe = new THREE.Mesh(
                new THREE.CylinderGeometry(0.05, 0.07, 0.2, 8),
                exhaustMat
            );
            pipe.rotation.x = Math.PI / 2;
            pipe.position.set(x, 0.1, -2.2);
            this.group.add(pipe);
        }

        // Driver indicator
        const indicatorMat = new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            emissive: 0x00ff00,
            emissiveIntensity: 0.5,
        });
        this.driverIndicator = new THREE.Mesh(
            new THREE.SphereGeometry(0.04, 6, 6),
            indicatorMat
        );
        this.driverIndicator.position.set(0, 0.3, -0.5);
        this.group.add(this.driverIndicator);

        // Collision box
        this.halfExtents = new THREE.Vector3(0.9, 0.45, 2.1);
    }

    reset(position, rotation) {
        this.position.copy(position);
        this.velocity.set(0, 0, 0);
        this.rotation = rotation || 0;
        this.speed = 0;
        this.rpm = 0;
        this.gear = 1;
        this.isDrifting = false;
        this.driftAngle = 0;
        this.driftFactor = 0;
        this.nitro = this.specs.nitroCapacity;
        this.nitroActive = false;
        this.nitroTimer = 0;
        this.group.position.copy(this.position);
        this.group.rotation.y = this.rotation;
    }

    update(dt, input) {
        if (!dt || dt > 0.05) dt = 0.016;

        const steering = input.getSteering();
        const accelerating = input.isAccelerating();
        const braking = input.isBraking();
        const handbrake = input.isHandbraking();
        const nitro = input.isNitro();

        // Ground check
        const terrainY = this.track.getHeightAtPoint(this.position.x, this.position.z);
        this.isOnGround = this.position.y <= terrainY + 0.3;

        if (this.isOnGround) {
            this.position.y = terrainY + 0.3;
            this.velocity.y = 0;
        } else {
            this.velocity.y += this.physics.gravity * dt;
        }

        // Speed calculations
        this.speed = this.velocity.length();

        // Nitro
        if (nitro && this.nitro > 0 && !this.nitroActive && accelerating) {
            this.nitroActive = true;
            this.nitroTimer = this.specs.nitroDuration;
        }
        if (this.nitroActive) {
            this.nitroTimer -= dt;
            this.nitro -= this.specs.nitroConsumption * dt;
            if (this.nitroTimer <= 0 || this.nitro <= 0) {
                this.nitroActive = false;
            }
        } else {
            this.nitro += this.specs.nitroRecharge * dt;
        }
        this.nitro = Math.max(0, Math.min(this.specs.nitroCapacity, this.nitro));

        const speedFactor = this.speed / this.specs.maxSpeed;
        const maxSpeed = this.nitroActive ? this.specs.maxSpeed * this.specs.nitroMultiplier : this.specs.maxSpeed;
        const accelForce = this.nitroActive ? this.specs.acceleration * 1.5 : this.specs.acceleration;

        // Acceleration / Braking
        if (accelerating || this.nitroActive) {
            const force = accelForce * (1 - speedFactor * 0.5);
            const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation);
            this.velocity.add(forward.multiplyScalar(force * dt));
        } else if (braking && this.speed > 0.5) {
            const brakeForce = this.specs.brakingForce;
            const backward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation);
            this.velocity.add(backward.multiplyScalar(brakeForce * dt));
        } else if (braking && this.speed <= 0.5) {
            const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation);
            this.velocity.add(forward.multiplyScalar(this.specs.reverseAcceleration * dt));
        }

        // Clamp speed
        const currentMax = braking && this.speed > 0.5 ? this.specs.maxSpeed : maxSpeed;
        if (this.velocity.length() > currentMax) {
            this.velocity.normalize().multiplyScalar(currentMax);
        }

        // Steering
        const speedRatio = this.speed / this.specs.maxSpeed;
        const turnSpeed = this.specs.turnSpeed * (1 - speedRatio * 0.6);
        const steerInput = steering * turnSpeed;

        this.finalSteering += (steerInput - this.finalSteering) * Math.min(1, 10 * dt);

        // Drifting
        if (handbrake && this.speed > 15 && Math.abs(steering) > 0.3) {
            this.isDrifting = true;
            this.driftFactor = Math.min(1, this.driftFactor + dt * 3);
        } else {
            this.driftFactor *= (1 - dt * 2);
            if (this.driftFactor < 0.05) {
                this.isDrifting = false;
                this.driftFactor = 0;
            }
        }

        if (this.isDrifting) {
            const driftRotation = this.finalSteering * this.specs.driftTurnMultiplier;
            this.angularVelocity += driftRotation * dt * 3;
            // Drift angle (visual)
            this.driftAngle += (this.finalSteering * this.driftFactor * 0.3 - this.driftAngle) * dt * 5;
        } else {
            this.angularVelocity += this.finalSteering * dt * 5;
            this.driftAngle *= (1 - dt * 3);
        }

        // Apply rotation
        this.rotation += this.angularVelocity * dt;
        this.angularVelocity *= (1 - dt * 3);

        // Friction
        const friction = this.isDrifting ? this.specs.driftFriction : this.specs.friction;
        this.velocity.x *= friction;
        this.velocity.z *= friction;

        // Apply velocity in rotated direction
        const forwardDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation);
        const speedMag = this.velocity.dot(forwardDir);
        this.velocity.copy(forwardDir.multiplyScalar(speedMag));

        // Position update
        this.position.x += this.velocity.x * dt;
        this.position.z += this.velocity.z * dt;

        // Collision with track bounds (soft push back toward track)
        this.checkTrackBounds();

        // Update group transform
        this.group.position.copy(this.position);
        this.group.rotation.y = this.rotation;

        // Visual drift tilt
        this.group.rotation.z = this.driftAngle * 0.1;
        this.group.rotation.x = -speedRatio * 0.03 - Math.abs(this.driftAngle) * 0.02;

        // Wheel rotation
        const wheelRotationSpeed = this.speed * 2;
        for (const wheel of this.wheels) {
            wheel.children[0].rotation.x += wheelRotationSpeed * dt;
            wheel.children[1].rotation.x += wheelRotationSpeed * dt;
        }

        // Front wheel steering visual
        const steerVisual = this.finalSteering * 0.4;
        for (const fw of this.frontWheels) {
            fw.rotation.y = steerVisual;
        }

        // RPM calculation
        const rpmTarget = speedRatio * 0.8 + (accelerating ? 0.2 : 0);
        this.rpm += (rpmTarget - this.rpm) * dt * 5;

        // Gear calculation
        if (this.speed < 0.5 && !accelerating && !braking) {
            this.gear = 1;
        } else if (this.speed < 10) {
            this.gear = 1;
        } else if (this.speed < 30) {
            this.gear = 2;
        } else if (this.speed < 60) {
            this.gear = 3;
        } else if (this.speed < 90) {
            this.gear = 4;
        } else if (this.speed < 130) {
            this.gear = 5;
        } else {
            this.gear = 6;
        }

        // Engine effects
        this.tireSmokeTimer = this.isDrifting ? 0.05 : Math.max(0, this.tireSmokeTimer - dt);
    }

    checkTrackBounds() {
        const trackBounds = {
            outer: 150,
            inner: 10
        };
        const dist = Math.sqrt(this.position.x * this.position.x + this.position.z * this.position.z);
        if (dist > trackBounds.outer) {
            const pushDir = new THREE.Vector3(-this.position.x, 0, -this.position.z).normalize();
            this.position.x += pushDir.x * (dist - trackBounds.outer) * 0.5;
            this.position.z += pushDir.z * (dist - trackBounds.outer) * 0.5;
            this.velocity.multiplyScalar(0.5);
        }
    }

    getForward() {
        return new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation);
    }

    getSpeedKMH() {
        return Math.abs(this.speed) * 3.6;
    }

    getGearString() {
        if (this.speed < 0.5 && this.velocity.dot(this.getForward()) < -0.1) return 'R';
        return this.gears[this.gear + 1];
    }

    getNitroPercent() {
        return this.nitro / this.specs.nitroCapacity;
    }

    getDriftSmokeIntensity() {
        return this.isDrifting ? this.driftFactor : 0;
    }
}
