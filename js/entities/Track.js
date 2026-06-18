import * as THREE from 'three';

export class Track {
    constructor(scene) {
        this.scene = scene;
        this.trackGroup = new THREE.Group();
        this.decorGroup = new THREE.Group();
        this.checkpoints = [];
        this.startLine = null;
        this.waypoints = [];
        this.roadPoints = [];
        this.roadWidth = 14;
        this.trackLength = 0;
        this.guardRails = [];
    }

    generate() {
        this.generateTrackPath();
        this.buildRoad();
        this.buildGuardRails();
        this.buildTerrain();
        this.buildDecorations();
        this.buildCheckpoints();
        this.buildSkybox();
        this.buildLighting();
        this.scene.add(this.trackGroup);
        this.scene.add(this.decorGroup);
    }

    generateTrackPath() {
        const segments = 32;
        const radius = 100;
        const wobble = 20;

        this.roadPoints = [];
        for (let i = 0; i <= segments; i++) {
            const t = (i / segments) * Math.PI * 2;
            const r = radius + Math.sin(t * 3) * wobble * 0.3 +
                             Math.cos(t * 5) * wobble * 0.2 +
                             Math.sin(t * 7) * wobble * 0.1;
            const x = Math.cos(t) * r;
            const z = Math.sin(t) * r;
            const elevation = Math.sin(t * 4) * 3 + Math.cos(t * 6) * 2;
            this.roadPoints.push(new THREE.Vector3(x, elevation, z));
            this.waypoints.push({
                position: new THREE.Vector3(x, elevation, z),
                direction: new THREE.Vector3(0, 0, 0)
            });
        }

        for (let i = 0; i < this.waypoints.length; i++) {
            const cur = this.waypoints[i].position;
            const next = this.waypoints[(i + 1) % this.waypoints.length].position;
            const dir = new THREE.Vector3().copy(next).sub(cur).normalize();
            this.waypoints[i].direction = dir;
        }

        this.trackLength = 0;
        for (let i = 0; i < this.roadPoints.length - 1; i++) {
            this.trackLength += this.roadPoints[i].distanceTo(this.roadPoints[i + 1]);
        }
    }

    buildRoad() {
        const roadMat = new THREE.MeshStandardMaterial({
            color: 0x333340,
            roughness: 0.85,
            metalness: 0.1,
        });

        const roadMarkMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.7,
            metalness: 0.0,
        });

        const centerLineMat = new THREE.MeshStandardMaterial({
            color: 0xffff00,
            roughness: 0.7,
            metalness: 0.0,
        });

        for (let i = 0; i < this.roadPoints.length - 1; i++) {
            const p0 = this.roadPoints[i];
            const p1 = this.roadPoints[(i + 1) % this.roadPoints.length];
            const dir = new THREE.Vector3().copy(p1).sub(p0).normalize();
            const perp = new THREE.Vector3(-dir.z, 0, dir.x).normalize();

            const half = this.roadWidth / 2;
            const segLen = p0.distanceTo(p1);

            const segmentsPerPiece = 1;
            for (let s = 0; s < segmentsPerPiece; s++) {
                const t0 = s / segmentsPerPiece;
                const t1 = (s + 1) / segmentsPerPiece;
                const a = new THREE.Vector3().lerpVectors(p0, p1, t0);
                const b = new THREE.Vector3().lerpVectors(p0, p1, t1);

                // Road surface
                const geo = new THREE.BufferGeometry();
                const verts = new Float32Array([
                    a.x + perp.x * half, a.y, a.z + perp.z * half,
                    a.x - perp.x * half, a.y, a.z - perp.z * half,
                    b.x - perp.x * half, b.y, b.z - perp.z * half,
                    a.x + perp.x * half, a.y, a.z + perp.z * half,
                    b.x - perp.x * half, b.y, b.z - perp.z * half,
                    b.x + perp.x * half, b.y, b.z + perp.z * half,
                ]);
                geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
                geo.computeVertexNormals();
                const mesh = new THREE.Mesh(geo, roadMat);
                mesh.receiveShadow = true;
                mesh.castShadow = true;
                this.trackGroup.add(mesh);

                // Edge line
                for (let side = -1; side <= 1; side += 2) {
                    const eHalf = half - 0.3;
                    const eGeo = new THREE.BufferGeometry();
                    const eVerts = new Float32Array([
                        a.x + perp.x * eHalf * side, a.y + 0.02, a.z + perp.z * eHalf * side,
                        a.x + perp.x * (eHalf - 0.8) * side, a.y + 0.02, a.z + perp.z * (eHalf - 0.8) * side,
                        b.x + perp.x * (eHalf - 0.8) * side, b.y + 0.02, b.z + perp.z * (eHalf - 0.8) * side,
                        a.x + perp.x * eHalf * side, a.y + 0.02, a.z + perp.z * eHalf * side,
                        b.x + perp.x * (eHalf - 0.8) * side, b.y + 0.02, b.z + perp.z * (eHalf - 0.8) * side,
                        b.x + perp.x * eHalf * side, b.y + 0.02, b.z + perp.z * eHalf * side,
                    ]);
                    eGeo.setAttribute('position', new THREE.BufferAttribute(eVerts, 3));
                    eGeo.computeVertexNormals();
                    const eMesh = new THREE.Mesh(eGeo, roadMarkMat);
                    eMesh.receiveShadow = true;
                    this.trackGroup.add(eMesh);
                }

                // Center dashes
                if (i % 4 < 2) {
                    const cGeo = new THREE.BufferGeometry();
                    const cVerts = new Float32Array([
                        a.x + perp.x * 0.1, a.y + 0.03, a.z + perp.z * 0.1,
                        a.x - perp.x * 0.1, a.y + 0.03, a.z - perp.z * 0.1,
                        b.x - perp.x * 0.1, b.y + 0.03, b.z - perp.z * 0.1,
                        a.x + perp.x * 0.1, a.y + 0.03, a.z + perp.z * 0.1,
                        b.x - perp.x * 0.1, b.y + 0.03, b.z - perp.z * 0.1,
                        b.x + perp.x * 0.1, b.y + 0.03, b.z + perp.z * 0.1,
                    ]);
                    cGeo.setAttribute('position', new THREE.BufferAttribute(cVerts, 3));
                    cGeo.computeVertexNormals();
                    const cMesh = new THREE.Mesh(cGeo, centerLineMat);
                    cMesh.receiveShadow = true;
                    this.trackGroup.add(cMesh);
                }
            }
        }

        // Start/Finish line
        const startIdx = 0;
        const startP0 = this.roadPoints[startIdx];
        const startP1 = this.roadPoints[(startIdx + 1) % this.roadPoints.length];
        const startDir = new THREE.Vector3().copy(startP1).sub(startP0).normalize();
        const startPerp = new THREE.Vector3(-startDir.z, 0, startDir.x);

        const finishMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.3,
            metalness: 0.1,
        });

        for (let c = 0; c < 12; c++) {
            const t = c / 12;
            const pos = new THREE.Vector3().lerpVectors(
                new THREE.Vector3().copy(startP0).add(startPerp.clone().multiplyScalar(-this.roadWidth / 2)),
                new THREE.Vector3().copy(startP0).add(startPerp.clone().multiplyScalar(this.roadWidth / 2)),
                t
            );
            const color = c % 2 === 0 ? 0xffffff : 0x000000;
            const checkGeo = new THREE.BoxGeometry(0.8, 0.05, 2);
            const checkMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.1 });
            const check = new THREE.Mesh(checkGeo, checkMat);
            check.position.copy(pos);
            check.position.y += 0.03;
            check.lookAt(pos.clone().add(startDir));
            check.receiveShadow = true;
            this.trackGroup.add(check);
        }

        this.startLine = {
            position: startP0.clone(),
            direction: startDir.clone(),
            perpendicular: startPerp.clone()
        };
    }

    buildGuardRails() {
        const railMat = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            roughness: 0.5,
            metalness: 0.7,
        });

        const postMat = new THREE.MeshStandardMaterial({
            color: 0x888888,
            roughness: 0.6,
            metalness: 0.5,
        });

        for (let side = -1; side <= 1; side += 2) {
            const offset = (this.roadWidth / 2 + 0.5) * side;
            for (let i = 0; i < this.roadPoints.length - 1; i += 2) {
                const p0 = this.roadPoints[i];
                const p1 = this.roadPoints[(i + 1) % this.roadPoints.length];
                if (!p0 || !p1) continue;

                const dir = new THREE.Vector3().copy(p1).sub(p0).normalize();
                const perp = new THREE.Vector3(-dir.z, 0, dir.x);

                const a = new THREE.Vector3(p0.x + perp.x * offset, p0.y + 0.5, p0.z + perp.z * offset);
                const b = new THREE.Vector3(p1.x + perp.x * offset, p1.y + 0.5, p1.z + perp.z * offset);

                const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
                const length = a.distanceTo(b);
                const railGeo = new THREE.BoxGeometry(length, 0.08, 0.15);
                const rail = new THREE.Mesh(railGeo, railMat);
                rail.position.copy(mid);
                rail.lookAt(b);
                rail.rotateX(Math.PI / 2);
                rail.receiveShadow = true;
                rail.castShadow = true;
                this.trackGroup.add(rail);

                // Posts
                if (i % 4 === 0) {
                    for (const pt of [a, b]) {
                        const post = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.05, 0.07, 0.8, 6),
                            postMat
                        );
                        post.position.set(pt.x, pt.y - 0.3, pt.z);
                        post.receiveShadow = true;
                        post.castShadow = true;
                        this.trackGroup.add(post);
                    }
                }
            }
        }

        // Rail top bar
        for (let side = -1; side <= 1; side += 2) {
            const offset = (this.roadWidth / 2 + 0.5) * side;
            for (let i = 0; i < this.roadPoints.length - 1; i += 2) {
                const p0 = this.roadPoints[i];
                const p1 = this.roadPoints[(i + 1) % this.roadPoints.length];
                if (!p0 || !p1) continue;
                const dir = new THREE.Vector3().copy(p1).sub(p0).normalize();
                const perp = new THREE.Vector3(-dir.z, 0, dir.x);
                const a = new THREE.Vector3(p0.x + perp.x * offset, p0.y + 0.85, p0.z + perp.z * offset);
                const b = new THREE.Vector3(p1.x + perp.x * offset, p1.y + 0.85, p1.z + perp.z * offset);
                const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
                const length = a.distanceTo(b);
                const bar = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.04, 0.04, length, 4),
                    railMat
                );
                bar.position.copy(mid);
                bar.lookAt(b);
                bar.rotateX(Math.PI / 2);
                this.trackGroup.add(bar);
            }
        }
    }

    buildTerrain() {
        const terrainSize = 400;
        const segments = 80;
        const geo = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);
        geo.rotateX(-Math.PI / 2);

        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const z = pos.getZ(i);
            let y = Math.sin(x * 0.01) * Math.cos(z * 0.013) * 4 +
                    Math.sin(x * 0.02 + z * 0.015) * 2 +
                    Math.cos(x * 0.005 - z * 0.008) * 3;
            // Flatten track area
            for (const rp of this.roadPoints) {
                const d = Math.sqrt((x - rp.x) ** 2 + (z - rp.z) ** 2);
                if (d < 20) {
                    const blend = Math.max(0, Math.min(1, (d - 8) / 12));
                    y = y * blend + rp.y * (1 - blend);
                    break;
                }
            }
            pos.setY(i, y);
        }
        geo.computeVertexNormals();

        const terrainMat = new THREE.MeshStandardMaterial({
            color: 0x3a7d3a,
            roughness: 1,
            metalness: 0,
            flatShading: false,
        });
        const terrain = new THREE.Mesh(geo, terrainMat);
        terrain.position.set(0, -0.2, 0);
        terrain.receiveShadow = true;
        this.trackGroup.add(terrain);

        // Grass variation patches
        const grassMat2 = new THREE.MeshStandardMaterial({
            color: 0x4a9d4a,
            roughness: 1,
            metalness: 0,
        });
        for (let i = 0; i < 20; i++) {
            const patch = new THREE.Mesh(
                new THREE.CircleGeometry(3 + Math.random() * 5, 6),
                grassMat2
            );
            const angle = Math.random() * Math.PI * 2;
            const dist = 40 + Math.random() * 100;
            patch.position.set(
                Math.cos(angle) * dist,
                -0.1,
                Math.sin(angle) * dist
            );
            patch.rotation.x = -Math.PI / 2;
            patch.receiveShadow = true;
            this.trackGroup.add(patch);
        }
    }

    buildDecorations() {
        const treeMatBase = new THREE.MeshStandardMaterial({ color: 0x2d5a2d, roughness: 1 });
        const treeMatMid = new THREE.MeshStandardMaterial({ color: 0x3d7a3d, roughness: 1 });
        const treeMatTop = new THREE.MeshStandardMaterial({ color: 0x4d8a4d, roughness: 1 });
        const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3a2a, roughness: 1 });

        for (let i = 0; i < 80; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 25 + Math.random() * 120;
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;

            // Check if near road
            let nearRoad = false;
            for (const rp of this.roadPoints) {
                if (Math.sqrt((x - rp.x) ** 2 + (z - rp.z) ** 2) < 20) {
                    nearRoad = true;
                    break;
                }
            }
            if (nearRoad) continue;

            const treeGroup = new THREE.Group();
            const trunkH = 1.5 + Math.random() * 2;
            const trunk = new THREE.Mesh(
                new THREE.CylinderGeometry(0.15, 0.25, trunkH, 6),
                trunkMat
            );
            trunk.position.y = trunkH / 2;
            trunk.castShadow = true;
            treeGroup.add(trunk);

            const layers = [
                { y: trunkH + 0.5, r: 2.0, mat: treeMatBase },
                { y: trunkH + 1.3, r: 1.5, mat: treeMatMid },
                { y: trunkH + 2.0, r: 1.0, mat: treeMatTop }
            ];
            for (const l of layers) {
                const foliage = new THREE.Mesh(
                    new THREE.SphereGeometry(l.r, 6, 5),
                    l.mat
                );
                foliage.position.y = l.y;
                foliage.scale.y = 0.8;
                foliage.castShadow = true;
                treeGroup.add(foliage);
            }

            const yOffset = Math.sin(x * 0.01) * Math.cos(z * 0.013) * 4 +
                            Math.sin(x * 0.02 + z * 0.015) * 2 +
                            Math.cos(x * 0.005 - z * 0.008) * 3;
            treeGroup.position.set(x, yOffset, z);
            treeGroup.scale.setScalar(0.5 + Math.random() * 0.8);
            this.decorGroup.add(treeGroup);
        }

        // Rocks
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.9, metalness: 0.1 });
        for (let i = 0; i < 30; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 30 + Math.random() * 80;
            const x = Math.cos(angle) * dist;
            const z = Math.sin(angle) * dist;
            let nearRoad = false;
            for (const rp of this.roadPoints) {
                if (Math.sqrt((x - rp.x) ** 2 + (z - rp.z) ** 2) < 15) {
                    nearRoad = true;
                    break;
                }
            }
            if (nearRoad) continue;
            const rock = new THREE.Mesh(
                new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.8),
                rockMat
            );
            const y = Math.sin(x * 0.01) * Math.cos(z * 0.013) * 4 +
                      Math.sin(x * 0.02 + z * 0.015) * 2 +
                      Math.cos(x * 0.005 - z * 0.008) * 3;
            rock.position.set(x, y, z);
            rock.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
            rock.receiveShadow = true;
            rock.castShadow = true;
            this.decorGroup.add(rock);
        }
    }

    buildCheckpoints() {
        const numCheckpoints = 8;
        const step = Math.floor((this.roadPoints.length - 1) / numCheckpoints);

        for (let i = 0; i < numCheckpoints; i++) {
            const idx = (i * step) % (this.roadPoints.length - 1);
            const p0 = this.roadPoints[idx];
            const p1 = this.roadPoints[(idx + 1) % this.roadPoints.length];
            if (!p0 || !p1) continue;

            const dir = new THREE.Vector3().copy(p1).sub(p0).normalize();
            const perp = new THREE.Vector3(-dir.z, 0, dir.x);

            this.checkpoints.push({
                position: p0.clone(),
                direction: dir.clone(),
                perpendicular: perp.clone(),
                halfWidth: this.roadWidth / 2,
                passed: false
            });

            // Checkpoint pillar visuals
            for (let s = -1; s <= 1; s += 2) {
                const pillarPos = new THREE.Vector3()
                    .copy(p0)
                    .add(perp.clone().multiplyScalar(s * this.roadWidth / 2));
                const pillar = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.08, 0.1, 3, 6),
                    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.3 })
                );
                pillar.position.set(pillarPos.x, pillarPos.y + 1.5 + Math.sin(idx) * 0.5, pillarPos.z);
                pillar.castShadow = true;
                this.trackGroup.add(pillar);

                // Checkpoint flag
                const flagMat = new THREE.MeshStandardMaterial({
                    color: i === numCheckpoints - 1 ? 0x00ff00 : 0xff4444,
                    roughness: 0.5,
                    metalness: 0.1,
                    side: THREE.DoubleSide
                });
                const flag = new THREE.Mesh(
                    new THREE.PlaneGeometry(0.8, 0.5),
                    flagMat
                );
                flag.position.set(
                    pillarPos.x + dir.x * 0.4,
                    pillarPos.y + 2.5 + Math.sin(idx) * 0.5,
                    pillarPos.z + dir.z * 0.4
                );
                flag.lookAt(p0);
                this.trackGroup.add(flag);
            }
        }
    }

    buildSkybox() {
        const skyGeo = new THREE.SphereGeometry(450, 32, 32);
        const skyMat = new THREE.ShaderMaterial({
            side: THREE.BackSide,
            uniforms: {
                time: { value: 0 },
                sunDir: { value: new THREE.Vector3(0.3, 0.8, 0.3).normalize() }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 wp = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = wp.xyz;
                    gl_Position = projectionMatrix * viewMatrix * wp;
                }
            `,
            fragmentShader: `
                uniform vec3 sunDir;
                varying vec3 vWorldPosition;
                void main() {
                    vec3 dir = normalize(vWorldPosition);
                    float sunAngle = max(0.0, dot(dir, sunDir));
                    float horizonAngle = max(0.0, dir.y + 0.1);

                    vec3 dayTop = vec3(0.2, 0.4, 0.9);
                    vec3 dayHorizon = vec3(0.7, 0.8, 1.0);
                    vec3 nightTop = vec3(0.01, 0.01, 0.05);
                    vec3 nightHorizon = vec3(0.05, 0.05, 0.1);

                    float dayFactor = clamp(sunDir.y + 0.3, 0.0, 1.0);
                    vec3 topColor = mix(nightTop, dayTop, dayFactor);
                    vec3 horizonColor = mix(nightHorizon, dayHorizon, dayFactor);

                    vec3 skyColor = mix(horizonColor, topColor, horizonAngle);
                    skyColor += vec3(1.0, 0.6, 0.2) * pow(sunAngle, 8.0) * 0.5;
                    skyColor += vec3(1.0, 0.8, 0.4) * pow(sunAngle, 2.0) * 0.3 * dayFactor;
                    gl_FragColor = vec4(skyColor, 1.0);
                }
            `
        });
        this.skybox = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(this.skybox);
    }

    buildLighting() {
        this.sunDir = new THREE.Vector3(0.3, 0.8, 0.3).normalize();

        const ambient = new THREE.AmbientLight(0x404060, 0.4);
        this.scene.add(ambient);

        const hemi = new THREE.HemisphereLight(0x87ceeb, 0x3a7d3a, 0.6);
        this.scene.add(hemi);

        this.sunLight = new THREE.DirectionalLight(0xffeedd, 1.8);
        this.sunLight.position.set(100, 150, 100);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 400;
        this.sunLight.shadow.camera.left = -100;
        this.sunLight.shadow.camera.right = 100;
        this.sunLight.shadow.camera.top = 100;
        this.sunLight.shadow.camera.bottom = -100;
        this.sunLight.shadow.bias = -0.001;
        this.scene.add(this.sunLight);

        const fill = new THREE.DirectionalLight(0x4488ff, 0.3);
        fill.position.set(-50, 30, -50);
        this.scene.add(fill);

        this._ambient = ambient;
        this._hemi = hemi;
    }

    getHeightAtPoint(x, z) {
        let height = 0;
        for (const rp of this.roadPoints) {
            const d = Math.sqrt((x - rp.x) ** 2 + (z - rp.z) ** 2);
            if (d < this.roadWidth) {
                return rp.y + 0.1;
            }
        }
        height = Math.sin(x * 0.01) * Math.cos(z * 0.013) * 4 +
                 Math.sin(x * 0.02 + z * 0.015) * 2 +
                 Math.cos(x * 0.005 - z * 0.008) * 3;
        return height;
    }

    getNearestWaypoint(position) {
        let minDist = Infinity;
        let nearest = 0;
        for (let i = 0; i < this.waypoints.length; i++) {
            const d = position.distanceTo(this.waypoints[i].position);
            if (d < minDist) {
                minDist = d;
                nearest = i;
            }
        }
        return nearest;
    }

    getWaypointPosition(index) {
        return this.waypoints[index % this.waypoints.length].position.clone();
    }

    getWaypointDirection(index) {
        return this.waypoints[index % this.waypoints.length].direction.clone();
    }

    getCheckpointPosition(index) {
        if (index < this.checkpoints.length) {
            return this.checkpoints[index].position.clone();
        }
        return null;
    }

    getTrackCenter() {
        return new THREE.Vector3(0, 0, 0);
    }

    update(time, weather) {
        if (this.skybox) {
            this.skybox.material.uniforms.time.value = time;
            if (weather) {
                const cloudCover = weather.cloudCover || 0;
                this.skybox.material.uniforms.sunDir.value.y = 0.8 - cloudCover * 0.3;
            }
        }

        if (this.sunLight) {
            const sunAngle = this.sunDir.y;
            this.sunLight.intensity = Math.max(0.2, sunAngle * 2.5);
            this._ambient.intensity = 0.2 + sunAngle * 0.3;
            this._hemi.intensity = 0.3 + sunAngle * 0.4;
        }
    }
}
