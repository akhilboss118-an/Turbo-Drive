import * as THREE from 'three';

export class AICar {
    constructor(scene, track, physics, difficulty = 'medium') {
        this.scene = scene;
        this.track = track;
        this.physics = physics;
        this.group = new THREE.Group();

        this.position = new THREE.Vector3(0, 0.3, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotation = 0;
        this.speed = 0;
        this.currentWaypoint = 0;
        this.angularVelocity = 0;
        this.difficulty = difficulty;
        this.pathOffset = 0;
        this.offsetSmooth = 0;

        const diffSettings = { easy: 0.6, medium: 0.85, hard: 1.0 };
        this.skill = diffSettings[difficulty] || 0.85;

        this.specs = {
            maxSpeed: 140 + this.skill * 40,
            acceleration: 25 + this.skill * 15,
            turnSpeed: 2 + this.skill * 1,
            friction: 0.96 + this.skill * 0.01,
        };

        this.buildCar();
        this.scene.add(this.group);
        this.pathOffset = (Math.random() - 0.5) * 2;
    }

    buildCar() {
        const colors = [0x2244cc, 0x44aa44, 0xcc8800, 0x8844cc, 0xcccccc, 0xff66aa];
        const color = colors[Math.floor(Math.random() * colors.length)];

        const bodyMat = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.4,
            metalness: 0.7,
        });

        const darkMat = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.5,
            metalness: 0.3,
        });

        const glassMat = new THREE.MeshStandardMaterial({
            color: 0x6688aa,
            roughness: 0.1,
            metalness: 0.1,
            transparent: true,
            opacity: 0.35,
        });

        const tireMat = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.9,
            metalness: 0.0,
        });

        const rimMat = new THREE.MeshStandardMaterial({
            color: 0x666677,
            roughness: 0.3,
            metalness: 0.7,
        });

        const body = new THREE.Mesh(
            new THREE.BoxGeometry(1.7, 0.45, 4.0),
            bodyMat
        );
        body.position.y = 0.42;
        body.castShadow = true;
        this.group.add(body);

        const cabin = new THREE.Mesh(
            new THREE.BoxGeometry(1.3, 0.35, 1.7),
            glassMat
        );
        cabin.position.set(0, 0.75, -0.15);
        this.group.add(cabin);

        const roof = new THREE.Mesh(
            new THREE.BoxGeometry(1.3, 0.04, 1.5),
            bodyMat
        );
        roof.position.set(0, 0.92, -0.15);
        this.group.add(roof);

        const wheelPositions = [
            { x: -0.85, z: 1.2 },
            { x: 0.85, z: 1.2 },
            { x: -0.85, z: -1.2 },
            { x: 0.85, z: -1.2 }
        ];

        this.wheels = [];
        for (const wp of wheelPositions) {
            const wg = new THREE.Group();
            const tire = new THREE.Mesh(
                new THREE.CylinderGeometry(0.26, 0.26, 0.16, 10),
                tireMat
            );
            tire.rotation.x = Math.PI / 2;
            wg.add(tire);

            const rim = new THREE.Mesh(
                new THREE.CylinderGeometry(0.13, 0.13, 0.17, 6),
                rimMat
            );
            rim.rotation.x = Math.PI / 2;
            wg.add(rim);

            wg.position.set(wp.x, 0.26, wp.z);
            this.group.add(wg);
            this.wheels.push(wg);
        }

        this.halfExtents = new THREE.Vector3(0.85, 0.4, 2.0);

        // Number decal
        const num = Math.floor(Math.random() * 99) + 1;
        const numMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0xffffff,
            emissiveIntensity: 0.1,
        });
        const numPlate = new THREE.Mesh(
            new THREE.PlaneGeometry(0.3, 0.2),
            numMat
        );
        numPlate.position.set(0, 0.55, 2.02);
        numPlate.rotation.y = Math.PI;
        this.group.add(numPlate);
    }

    update(dt, allCars) {
        if (!dt || dt > 0.05) dt = 0.016;

        const target = this.track.waypoints[this.currentWaypoint];
        if (!target) return;

        const toTarget = new THREE.Vector3().copy(target.position).sub(this.position);
        toTarget.y = 0;
        const dist = toTarget.length();

        // Path offset
        const perp = new THREE.Vector3(-target.direction.z, 0, target.direction.x).normalize();
        this.offsetSmooth += (this.pathOffset - this.offsetSmooth) * dt * 2;
        const offsetPos = target.position.clone().add(perp.clone().multiplyScalar(this.offsetSmooth));

        const toOffset = new THREE.Vector3().copy(offsetPos).sub(this.position);
        toOffset.y = 0;

        // Target angle
        const targetAngle = Math.atan2(toOffset.x, toOffset.z);
        let angleDiff = targetAngle - this.rotation;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        // Steering
        const steerAmount = Math.max(-1, Math.min(1, angleDiff * 2));
        const speedFactor = this.speed / this.specs.maxSpeed;
        const turnSpeed = this.specs.turnSpeed * (1 - speedFactor * 0.5);
        this.angularVelocity += steerAmount * turnSpeed * dt * 4;
        this.rotation += this.angularVelocity * dt;
        this.angularVelocity *= (1 - dt * 3);

        // Speed control
        const angleAbs = Math.abs(angleDiff);
        let targetSpeed = this.specs.maxSpeed;

        if (angleAbs > 0.5) {
            targetSpeed *= Math.max(0.3, 1 - angleAbs * 0.5);
        }

        // Collision avoidance
        for (const other of allCars) {
            if (other === this) continue;
            const dx = this.position.x - other.position.x;
            const dz = this.position.z - other.position.z;
            const d = Math.sqrt(dx * dx + dz * dz);
            if (d < 5) {
                const avoid = (5 - d) / 5;
                targetSpeed *= (1 - avoid * 0.5);
                // Steer away
                const avoidAngle = Math.atan2(dx, dz);
                let avoidDiff = avoidAngle - this.rotation;
                while (avoidDiff > Math.PI) avoidDiff -= Math.PI * 2;
                while (avoidDiff < -Math.PI) avoidDiff += Math.PI * 2;
                this.angularVelocity += Math.sign(avoidDiff) * dt * 5 * avoid;
            }
        }

        // Acceleration
        if (this.speed < targetSpeed) {
            const force = this.specs.acceleration * (1 - speedFactor * 0.3);
            const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation);
            this.velocity.add(forward.multiplyScalar(force * dt));
        } else {
            this.velocity.multiplyScalar(this.specs.friction);
        }

        // Clamp
        if (this.velocity.length() > this.specs.maxSpeed) {
            this.velocity.normalize().multiplyScalar(this.specs.maxSpeed);
        }

        // Terrain following
        const terrainY = this.track.getHeightAtPoint(this.position.x, this.position.z);
        this.position.y = terrainY + 0.3;

        // Forward velocity
        const forwardDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation);
        const speedMag = this.velocity.dot(forwardDir);
        this.velocity.copy(forwardDir.multiplyScalar(speedMag));
        this.velocity.x *= this.specs.friction;
        this.velocity.z *= this.specs.friction;

        this.position.x += this.velocity.x * dt;
        this.position.z += this.velocity.z * dt;

        this.speed = this.velocity.length();

        this.group.position.copy(this.position);
        this.group.rotation.y = this.rotation;

        // Wheel rotation
        const wheelRot = this.speed * 2;
        for (const wheel of this.wheels) {
            wheel.children[0].rotation.x += wheelRot * dt;
            wheel.children[1].rotation.x += wheelRot * dt;
        }

        // Waypoint progression
        if (dist < 8) {
            this.currentWaypoint = (this.currentWaypoint + 1 + this.track.waypoints.length) % this.track.waypoints.length;
        }

        // Random offset change on straights
        if (dist > 20 && Math.random() < 0.002) {
            this.pathOffset = (Math.random() - 0.5) * 3;
        }
    }

    reset(position, rotation, startWaypoint) {
        this.position.copy(position);
        this.velocity.set(0, 0, 0);
        this.rotation = rotation || 0;
        this.speed = 0;
        this.currentWaypoint = startWaypoint || 0;
        this.angularVelocity = 0;
        this.group.position.copy(this.position);
        this.group.rotation.y = this.rotation;
        this.pathOffset = (Math.random() - 0.5) * 2;
    }

    getSpeedKMH() {
        return Math.abs(this.speed) * 3.6;
    }
}
