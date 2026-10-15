/* eslint-disable */
'use strict';
/* Renderer, scene, camera and sky */
/* ================= renderer / scene ================= */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    antialias: settings.quality !== 'low',
    powerPreference: 'high-performance',
    precision: settings.quality === 'low' ? 'mediump' : 'highp'
  });
} catch (e) {
  try {
    renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'default' });
  } catch (e2) {
    fail('This device could not start WebGL, which the game needs.'); throw e2;
  }
}
$('stage').appendChild(renderer.domElement);
const scene = new THREE.Scene();
const FOG = 0x7a3a95;
scene.fog = new THREE.Fog(FOG, 140, 700);
const camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.1, 900);
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  const isLowMem = (typeof navigator !== 'undefined' && navigator.deviceMemory && navigator.deviceMemory <= 3);
  const maxDpr = settings.quality === 'low' || isLowMem ? 1 : Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(maxDpr);
  renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize); resize();

if (renderer.domElement) {
  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
  }, false);
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    resize();
  }, false);
}

// sky
function setSky(L) {
  const c = document.createElement('canvas'); c.width = 16; c.height = 512; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, L.sky[0]); gr.addColorStop(0.45, L.sky[1]); gr.addColorStop(0.75, L.sky[2]); gr.addColorStop(1, L.sky[3]);
  g.fillStyle = gr; g.fillRect(0, 0, 16, 512);
  if (scene.background && scene.background.dispose) scene.background.dispose();
  scene.background = new THREE.CanvasTexture(c); scene.fog.color.setHex(L.fog);
  hemi.color.set(L.sky[3]).lerp(new THREE.Color(0xffffff), 0.3); hemi.groundColor.set(L.sky[1]).lerp(new THREE.Color(0xffffff), 0.15); sun.color.set(L.sky[3]).lerp(new THREE.Color(0xffffff), 0.35);
}
const hemi = new THREE.HemisphereLight(0xb9b4ff, 0x4a2475, 1.2); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffd2a6, 1.1); sun.position.set(-30, 50, 40); scene.add(sun);
