import * as THREE from 'three';

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particleGroups = [];
        this.maxParticles = 500;
    }

    createSmoke(position, direction, intensity, color = 0xcccccc) {
        if (intensity < 0.1) return;
        const count = Math.floor(intensity * 8);
        const group = new THREE.Group();

        const particleGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = [];
        const lifetimes = [];
        const sizes = new Float32Array(count);
        const colors = new Float32Array(count * 3);

        const baseColor = new THREE.Color(color);

        for (let i = 0; i < count; i++) {
            positions[i * 3] = position.x + (Math.random() - 0.5) * 0.3;
            positions[i * 3 + 1] = position.y + (Math.random() - 0.5) * 0.1;
            positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.3;

            velocities.push({
                x: direction.x * (1 + Math.random() * 0.5) + (Math.random() - 0.5) * 0.5,
                y: 0.5 + Math.random() * 1,
                z: direction.z * (1 + Math.random() * 0.5) + (Math.random() - 0.5) * 0.5,
            });

            lifetimes.push(0.5 + Math.random() * 1);
            sizes[i] = 0.1 + Math.random() * 0.2;

            const c = baseColor.clone().multiplyScalar(0.5 + Math.random() * 0.5);
            colors[i * 3] = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;
        }

        particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const particleMat = new THREE.PointsMaterial({
            size: 0.3,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            vertexColors: true,
        });

        const points = new THREE.Points(particleGeo, particleMat);
        this.scene.add(points);

        this.particleGroups.push({
            mesh: points,
            geo: particleGeo,
            velocities,
            lifetimes,
            time: 0,
            maxLifetime: Math.max(...lifetimes),
            type: 'smoke',
        });

        this.cleanup();
    }

    createNitroFlame(position, direction) {
        const count = 15;
        const group = new THREE.Group();

        const particleGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = [];
        const lifetimes = [];
        const sizes = new Float32Array(count);
        const colors = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            positions[i * 3] = position.x + (Math.random() - 0.5) * 0.2;
            positions[i * 3 + 1] = position.y + (Math.random() - 0.5) * 0.1;
            positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 0.2;

            velocities.push({
                x: -direction.x * (2 + Math.random() * 3) + (Math.random() - 0.5) * 0.5,
                y: 0.3 + Math.random() * 0.5,
                z: -direction.z * (2 + Math.random() * 3) + (Math.random() - 0.5) * 0.5,
            });

            lifetimes.push(0.1 + Math.random() * 0.2);
            sizes[i] = 0.05 + Math.random() * 0.1;

            const t = Math.random();
            const c = t < 0.33 ? new THREE.Color(0x00aaff) :
                      t < 0.66 ? new THREE.Color(0xffffff) :
                                 new THREE.Color(0x88ddff);
            colors[i * 3] = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;
        }

        particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const particleMat = new THREE.PointsMaterial({
            size: 0.15,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            vertexColors: true,
        });

        const points = new THREE.Points(particleGeo, particleMat);
        this.scene.add(points);

        this.particleGroups.push({
            mesh: points,
            geo: particleGeo,
            velocities,
            lifetimes,
            time: 0,
            maxLifetime: Math.max(...lifetimes),
            type: 'nitro',
        });

        this.cleanup();
    }

    createDust(position, intensity) {
        if (intensity < 0.3) return;
        const count = Math.floor(intensity * 5);
        const particleGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = [];
        const lifetimes = [];
        const sizes = new Float32Array(count);

        for (let i = 0; i < count; i++) {
            positions[i * 3] = position.x + (Math.random() - 0.5) * 1;
            positions[i * 3 + 1] = position.y + Math.random() * 0.3;
            positions[i * 3 + 2] = position.z + (Math.random() - 0.5) * 1;

            velocities.push({
                x: (Math.random() - 0.5) * 0.5,
                y: 0.2 + Math.random() * 0.5,
                z: (Math.random() - 0.5) * 0.5,
            });

            lifetimes.push(0.5 + Math.random() * 1);
            sizes[i] = 0.1 + Math.random() * 0.3;
        }

        particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const mat = new THREE.PointsMaterial({
            size: 0.5,
            color: 0x8a7a5a,
            transparent: true,
            opacity: 0.3,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        const points = new THREE.Points(particleGeo, mat);
        this.scene.add(points);

        this.particleGroups.push({
            mesh: points,
            geo: particleGeo,
            velocities,
            lifetimes,
            time: 0,
            maxLifetime: Math.max(...lifetimes),
            type: 'dust',
        });

        this.cleanup();
    }

    update(dt) {
        for (let i = this.particleGroups.length - 1; i >= 0; i--) {
            const pg = this.particleGroups[i];
            pg.time += dt;

            if (pg.time >= pg.maxLifetime) {
                this.scene.remove(pg.mesh);
                pg.mesh.geometry.dispose();
                pg.mesh.material.dispose();
                this.particleGroups.splice(i, 1);
                continue;
            }

            const positions = pg.geo.attributes.position.array;
            const progress = pg.time / pg.maxLifetime;

            for (let j = 0; j < pg.velocities.length; j++) {
                const v = pg.velocities[j];
                positions[j * 3] += v.x * dt;
                positions[j * 3 + 1] += v.y * dt;
                positions[j * 3 + 2] += v.z * dt;
                v.y -= 0.5 * dt; // slight gravity
            }

            pg.geo.attributes.position.needsUpdate = true;
            pg.mesh.material.opacity = 0.6 * (1 - progress);

            const scale = 1 + progress * 2;
            pg.mesh.scale.setScalar(scale);
        }
    }

    cleanup() {
        while (this.particleGroups.length > this.maxParticles) {
            const pg = this.particleGroups.shift();
            this.scene.remove(pg.mesh);
            pg.mesh.geometry.dispose();
            pg.mesh.material.dispose();
        }
    }

    clear() {
        for (const pg of this.particleGroups) {
            this.scene.remove(pg.mesh);
            pg.mesh.geometry.dispose();
            pg.mesh.material.dispose();
        }
        this.particleGroups = [];
    }
}
