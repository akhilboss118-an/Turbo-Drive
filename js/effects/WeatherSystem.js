import * as THREE from 'three';

export class WeatherSystem {
    constructor(scene) {
        this.scene = scene;
        this.weather = 'clear';
        this.weathers = ['clear', 'cloudy', 'rainy', 'foggy'];
        this.transition = 0;
        this.targetWeather = 'clear';
        this.cloudCover = 0;
        this.rainIntensity = 0;
        this.fogDensity = 0;
        this.time = 0;
        this.dayTime = 0.6; // 0-1, 0.5 = noon
        this.daySpeed = 0.005; // very slow day/night cycle

        this.rainParticles = null;
        this.clouds = new THREE.Group();
        this.buildClouds();

        this.rainGeo = null;
        this.rainCount = 2000;
        this.buildRain();
    }

    buildClouds() {
        const cloudMat = new THREE.MeshStandardMaterial({
            color: 0xcccccc,
            roughness: 1,
            metalness: 0,
            transparent: true,
            opacity: 0.8,
        });

        for (let i = 0; i < 12; i++) {
            const cloudGroup = new THREE.Group();
            const numParts = 5 + Math.floor(Math.random() * 8);
            for (let j = 0; j < numParts; j++) {
                const size = 5 + Math.random() * 15;
                const part = new THREE.Mesh(
                    new THREE.SphereGeometry(size, 7, 6),
                    cloudMat
                );
                part.position.set(
                    (Math.random() - 0.5) * 30,
                    (Math.random() - 0.5) * 5,
                    (Math.random() - 0.5) * 30
                );
                part.scale.y = 0.3 + Math.random() * 0.4;
                cloudGroup.add(part);
            }
            cloudGroup.position.set(
                (Math.random() - 0.5) * 300,
                40 + Math.random() * 30,
                (Math.random() - 0.5) * 300
            );
            cloudGroup.scale.setScalar(0.5 + Math.random() * 1);
            this.clouds.add(cloudGroup);
        }
        this.scene.add(this.clouds);
    }

    buildRain() {
        const positions = new Float32Array(this.rainCount * 3);
        for (let i = 0; i < this.rainCount; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 300;
            positions[i * 3 + 1] = Math.random() * 80;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 300;
        }
        this.rainGeo = new THREE.BufferGeometry();
        this.rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const rainMat = new THREE.PointsMaterial({
            color: 0xaaccff,
            size: 0.15,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        this.rainParticles = new THREE.Points(this.rainGeo, rainMat);
        this.scene.add(this.rainParticles);
    }

    setWeather(type) {
        if (this.weathers.includes(type)) {
            this.targetWeather = type;
        }
    }

    setDayTime(value) {
        this.dayTime = Math.max(0, Math.min(1, value));
    }

    update(dt) {
        this.time += dt;
        this.dayTime += this.daySpeed * dt;
        if (this.dayTime > 1) this.dayTime -= 1;

        // Weather transition
        this.transition = Math.min(1, this.transition + dt * 0.5);
        if (this.transition >= 1) {
            this.weather = this.targetWeather;
            this.transition = 0;
        }

        // Calculate parameters based on current weather
        const targetCloud = this.weather === 'clear' ? 0 :
                            this.weather === 'cloudy' ? 0.7 :
                            this.weather === 'rainy' ? 0.9 : 0.3;
        const targetRain = this.weather === 'rainy' ? 0.6 : 0;
        const targetFog = this.weather === 'foggy' ? 0.05 : 0.002;

        this.cloudCover += (targetCloud - this.cloudCover) * dt * 0.5;
        this.rainIntensity += (targetRain - this.rainIntensity) * dt * 0.5;
        this.fogDensity += (targetFog - this.fogDensity) * dt * 0.5;

        // Update clouds
        this.clouds.visible = this.cloudCover > 0.05;
        this.clouds.children.forEach((cloud, i) => {
            cloud.position.x += dt * (0.5 + i * 0.1);
            if (cloud.position.x > 200) cloud.position.x = -200;
            cloud.material = cloud.children[0].material;
            if (cloud.material) {
                cloud.material.opacity = 0.3 + this.cloudCover * 0.7;
            }
        });

        // Update rain
        if (this.rainParticles) {
            this.rainParticles.material.opacity = this.rainIntensity * 0.4;
            const positions = this.rainGeo.attributes.position.array;
            for (let i = 0; i < this.rainCount; i++) {
                positions[i * 3 + 1] -= 40 * dt;
                positions[i * 3] += 2 * dt;
                positions[i * 3 + 2] += 1 * dt;
                if (positions[i * 3 + 1] < 0) {
                    positions[i * 3 + 1] = 80;
                    positions[i * 3] = (Math.random() - 0.5) * 300;
                    positions[i * 3 + 2] = (Math.random() - 0.5) * 300;
                }
            }
            this.rainGeo.attributes.position.needsUpdate = true;
        }

        // Update scene fog
        const fogFactor = 0.002 + this.fogDensity * 2;
        const scene = this.scene;
        if (scene.fog) {
            scene.fog.density = fogFactor;
        }
    }

    getSunDirection() {
        const angle = this.dayTime * Math.PI * 2;
        return new THREE.Vector3(
            Math.cos(angle) * 0.5,
            Math.sin(angle) * 0.8 + 0.2,
            Math.sin(angle) * 0.5
        ).normalize();
    }

    getSunIntensity() {
        const sunY = this.getSunDirection().y;
        return Math.max(0.1, Math.min(1.5, (sunY + 0.3) * 2));
    }

    getAmbientColor() {
        const t = this.dayTime;
        const night = new THREE.Color(0x080818);
        const sunrise = new THREE.Color(0xff8844);
        const day = new THREE.Color(0x8888ff);
        const sunset = new THREE.Color(0xff6644);

        if (t < 0.2) return night.clone().lerp(sunrise, t / 0.2);
        if (t < 0.4) return sunrise.clone().lerp(day, (t - 0.2) / 0.2);
        if (t < 0.6) return day;
        if (t < 0.8) return day.clone().lerp(sunset, (t - 0.6) / 0.2);
        return sunset.clone().lerp(night, (t - 0.8) / 0.2);
    }
}
