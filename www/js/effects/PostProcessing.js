import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

export class PostProcessing {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.composer = null;
        this.bloomPass = null;
        this.effectsEnabled = true;
        this.quality = 'high';
        this.motionBlur = { samples: 0 };
    }

    init() {
        const w = window.innerWidth;
        const h = window.innerHeight;

        this.composer = new EffectComposer(this.renderer);
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // Bloom
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(w, h),
            0.3,
            0.5,
            0.1
        );
        this.composer.addPass(this.bloomPass);

        // FXAA
        const fxaaPass = new ShaderPass(FXAAShader);
        fxaaPass.uniforms['resolution'].value.set(1 / w, 1 / h);
        this.composer.addPass(fxaaPass);

        // Custom motion blur (simple lerp-based)
        this.prevFrame = new THREE.WebGLRenderTarget(w, h, {
            minFilter: THREE.LinearFilter,
            magFilter: THREE.LinearFilter,
            format: THREE.RGBAFormat,
        });

        window.addEventListener('resize', () => this.onResize());
    }

    onResize() {
        if (!this.composer) return;
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.composer.setSize(w, h);
        if (this.bloomPass) {
            this.bloomPass.resolution.set(w, h);
        }
    }

    setQuality(level) {
        this.quality = level;
        if (level === 'low') {
            this.bloomPass.strength = 0.05;
            this.bloomPass.radius = 0.1;
            this.effectsEnabled = false;
        } else if (level === 'medium') {
            this.bloomPass.strength = 0.15;
            this.bloomPass.radius = 0.3;
            this.effectsEnabled = true;
        } else if (level === 'high') {
            this.bloomPass.strength = 0.3;
            this.bloomPass.radius = 0.5;
            this.effectsEnabled = true;
        } else if (level === 'ultra') {
            this.bloomPass.strength = 0.5;
            this.bloomPass.radius = 0.8;
            this.effectsEnabled = true;
        }
    }

    render(deltaTime) {
        if (this.composer && this.effectsEnabled) {
            this.composer.render(deltaTime);
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    dispose() {
        if (this.composer) {
            this.composer.dispose();
        }
        this.prevFrame.dispose();
    }
}
