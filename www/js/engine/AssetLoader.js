import * as THREE from 'three';

export class AssetLoader {
    constructor() {
        this.manager = new THREE.LoadingManager();
        this.textureLoader = new THREE.TextureLoader(this.manager);
        this.cache = new Map();
        this.totalItems = 0;
        this.loadedItems = 0;
        this.onProgress = null;
        this.onComplete = null;

        this.manager.onProgress = (url, loaded, total) => {
            this.loadedItems = loaded;
            this.totalItems = total;
            if (this.onProgress) this.onProgress(loaded / total);
        };

        this.manager.onLoad = () => {
            if (this.onComplete) this.onComplete();
        };

        this.manager.onError = (url) => {
            console.warn(`Failed to load: ${url}`);
            this.loadedItems++;
            if (this.loadedItems >= this.totalItems && this.onComplete) {
                this.onComplete();
            }
        };
    }

    loadTexture(url) {
        if (this.cache.has(url)) return this.cache.get(url);
        const texture = this.textureLoader.load(url);
        this.cache.set(url, texture);
        return texture;
    }

    generateTexture(width, height, colorFn) {
        const size = width * height * 4;
        const data = new Uint8Array(size);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                const c = colorFn(x / width, y / height);
                data[idx] = c[0];
                data[idx + 1] = c[1];
                data[idx + 2] = c[2];
                data[idx + 3] = c[3] !== undefined ? c[3] : 255;
            }
        }
        const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
        texture.needsUpdate = true;
        return texture;
    }

    loadAll() {
        return new Promise((resolve) => {
            this.onComplete = resolve;
            setTimeout(() => {
                if (this.onComplete) this.onComplete();
            }, 2000);
        });
    }
}
