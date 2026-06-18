import * as THREE from 'three';
import { Game } from './engine/Game.js';

class Application {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.game = null;
        this.init();
    }

    async init() {
        try {
            this.game = new Game(this.canvas);
            await this.game.initialize();
            this.game.start();
            console.log('Turbo Drive initialized successfully');
        } catch (error) {
            console.error('Failed to initialize game:', error);
            const loadingText = document.getElementById('loading-text');
            if (loadingText) {
                loadingText.textContent = 'Error loading game. Please refresh.';
                loadingText.style.color = '#ff4400';
            }
        }
    }
}

// Boot
const app = new Application();

// Export for debugging
window.__game = app;
