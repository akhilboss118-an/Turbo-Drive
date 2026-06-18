import * as THREE from 'three';

export class SceneManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.renderer = this.createRenderer();
        this.scene = this.createScene();
        this.camera = this.createCamera();
        this.clock = new THREE.Clock();
        this.onResize = this.onResize.bind(this);
        window.addEventListener('resize', this.onResize);
        window.addEventListener('orientationchange', () => setTimeout(this.onResize, 200));
    }

    createRenderer() {
        const renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            powerPreference: 'high-performance',
            depth: true,
            stencil: false
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        renderer.shadowMap.bias = 0.0005;
        return renderer;
    }

    createScene() {
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87ceeb);
        scene.fog = new THREE.FogExp2(0x87ceeb, 0.002);
        return scene;
    }

    createCamera() {
        const aspect = window.innerWidth / window.innerHeight;
        const camera = new THREE.PerspectiveCamera(70, aspect, 0.1, 1000);
        camera.position.set(0, 5, -8);
        camera.lookAt(0, 0, 0);
        return camera;
    }

    onResize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    setToneMapping(exposure) {
        this.renderer.toneMappingExposure = exposure;
    }

    setBackground(color) {
        this.scene.background = color;
        this.scene.fog = null;
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        window.removeEventListener('resize', this.onResize);
        this.renderer.dispose();
    }
}
