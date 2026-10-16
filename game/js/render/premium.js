/* eslint-disable */
'use strict';
/* Premium dark racing-sim look: tone mapping, shadows, reflective car paint, graded world, lights and impact effects.
   Visual only. Physics, controls and rules are untouched. Remove this file (and its <script> tag) to get the old look back. */
(function () {
  const HIGH = settings.quality !== 'low';
  const tmp = new THREE.Color(), hsl = {};

  /* ---------- renderer ---------- */
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  if (HIGH) { renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; }
  scene.fog.near = 110; scene.fog.far = 640;

  /* ---------- colour grading helper ---------- */
  function grade(c, sat, mul) {
    c.getHSL(hsl); c.setHSL(hsl.h, hsl.s * sat, Math.min(1, hsl.l * mul)); return c;
  }
  const gradeHex = (h, sat, mul) => grade(tmp.set(h), sat, mul).getHex();
  const gradeCss = (s, sat, mul) => '#' + grade(tmp.set(s), sat, mul).getHexString();

  /* ---------- sky, fog and lighting rig (wraps setSky) ---------- */
  const _setSky = setSky;
  setSky = function (L) {
    const g = Object.assign({}, L, {
      sky: L.sky.map((c, i) => gradeCss(c, 0.5, [0.8, 0.72, 0.68, 0.78][i])),
      fog: gradeHex(L.fog, 0.6, 0.62),
    });
    _setSky(g);
    hemi.intensity = 0.8; sun.intensity = 1.5;
    hemi.color.lerp(tmp.set(0x8fa0c0), 0.45); hemi.groundColor.lerp(tmp.set(0x14161e), 0.6);
    sun.color.lerp(tmp.set(0xffe2c0), 0.55);
  };

  /* ---------- soft sun shadows that follow the car ---------- */
  const SUN_OFF = new THREE.Vector3(-30, 50, 40);
  if (HIGH) {
    sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    const sc = sun.shadow.camera; sc.left = -18; sc.right = 18; sc.top = 18; sc.bottom = -18; sc.near = 5; sc.far = 140;
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04; sun.shadow.radius = 3;
    scene.add(sun.target);
    shadow.visible = false;
  }

  /* ---------- reflection environment for the car (procedural studio-at-night) ---------- */
  const envTex = (function () {
    const es = new THREE.Scene();
    const c = document.createElement('canvas'); c.width = 8; c.height = 256; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#2a3550'); gr.addColorStop(0.45, '#161b2a'); gr.addColorStop(0.5, '#0a0c12'); gr.addColorStop(1, '#050608');
    g.fillStyle = gr; g.fillRect(0, 0, 8, 256);
    es.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), side: THREE.BackSide })));
    const box = (w, h, x, y, z, col) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m); };
    box(34, 6, 0, 30, -10, 0xffffff); box(8, 26, -38, 12, 6, 0xffd9b0); box(6, 22, 40, 10, -8, 0x9fc4ff); box(30, 3, 0, 4, 44, 0xff9a60);
    const pm = new THREE.PMREMGenerator(renderer); const t = pm.fromScene(es, 0.02).texture; pm.dispose(); return t;
  })();

  /* ---------- car: reflective paint + glass ---------- */
  const conv = new Map();
  function upgradeMat(m) {
    if (!m || m.isMeshStandardMaterial || !m.isMeshLambertMaterial) return m;
    if (conv.has(m.uuid)) return conv.get(m.uuid);
    const glass = m.transparent;
    const s = new THREE.MeshStandardMaterial({
      map: m.map, color: m.color.clone(), emissive: m.emissive ? m.emissive.clone() : new THREE.Color(0), transparent: m.transparent, opacity: m.opacity,
      depthWrite: m.depthWrite, side: m.side,
      metalness: glass ? 0.9 : 0.5, roughness: glass ? 0.06 : 0.36, envMap: envTex, envMapIntensity: glass ? 1.6 : 1.15,
    });
    conv.set(m.uuid, s); return s;
  }
  function carUpgrade() {
    carRoot.traverse((o) => {
      if (!o.isMesh || o.material.isMeshBasicMaterial) return;
      o.castShadow = HIGH;
      o.material = Array.isArray(o.material) ? o.material.map(upgradeMat) : upgradeMat(o.material);
    });
  }
  const _applyVehicle = applyVehicle;
  applyVehicle = function (id) { _applyVehicle(id); carUpgrade(); };
  carUpgrade();

  /* ---------- car lights: headlights, tail glow ---------- */
  const head = new THREE.SpotLight(0xfff0d8, 0, 55, 0.55, 0.75, 1.4);
  head.position.set(1.8, 0.45, 0); const ht = new THREE.Object3D(); ht.position.set(26, -2.2, 0); carRoot.add(head, ht); head.target = ht;
  const tail = new THREE.PointLight(0xff2a10, 0, 15, 1.6); tail.position.set(-2.4, 0.5, 0); carRoot.add(tail);

  /* ---------- world grading + road (per level) ---------- */
  const noiseGLSL = 'float ph(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(ph(i),ph(i+vec2(1,0)),f.x),mix(ph(i+vec2(0,1)),ph(i+vec2(1,1)),f.x),f.y);}';
  function roadMaterial() {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, metalness: 0.12, roughness: 0.6, envMap: envTex, envMapIntensity: 0.55 });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('void main() {', 'varying vec3 vWp;\nvoid main() {\nvWp = position;');
      sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'varying vec3 vWp;\n' + noiseGLSL + '\nvoid main() {')
        .replace('#include <color_fragment>', '#include <color_fragment>\n{vec2 q=vWp.xz+vec2(vWp.y*.31,0.);float n=vn(q*5.)*.5+vn(q*21.)*.35+vn(q*83.)*.15;diffuseColor.rgb*=.78+.5*n;}');
    };
    m.customProgramCacheKey = () => 'td-road';
    return m;
  }
  function gradeRoadColors(mesh, L) {
    const col = mesh.geometry.attributes.color, a = col.array, A = new THREE.Color(L.topA), B = new THREE.Color(L.topB), asph = new THREE.Color(0.075, 0.08, 0.09);
    const c = new THREE.Color();
    for (let i = 0; i < a.length; i += 3) {
      c.setRGB(a[i], a[i + 1], a[i + 2]);
      const isTop = (Math.abs(c.r - A.r) + Math.abs(c.g - A.g) + Math.abs(c.b - A.b) < 0.02) || (Math.abs(c.r - B.r) + Math.abs(c.g - B.g) + Math.abs(c.b - B.b) < 0.02);
      if (isTop) { const alt = Math.abs(c.r - B.r) + Math.abs(c.g - B.g) + Math.abs(c.b - B.b) < 0.02 ? 1 : 0; c.lerp(asph, 0.9).multiplyScalar(alt ? 1.18 : 0.96); }
      else grade(c, 0.7, 0.72);
      a[i] = c.r; a[i + 1] = c.g; a[i + 2] = c.b;
    }
    col.needsUpdate = true;
  }
  function gradeWorld(root) {
    const seen = new Set();
    root.traverse((o) => {
      if (o.isMesh && HIGH && o.material && !Array.isArray(o.material) && !o.material.isMeshBasicMaterial) o.receiveShadow = true;
      for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
        if (!m || seen.has(m) || m.userData.pg || m.isShaderMaterial) continue; seen.add(m); m.userData.pg = 1;
        if (m.isSpriteMaterial) { if (m.color) grade(m.color, 0.35, 0.72); m.opacity *= 0.5; continue; }
        if (m.isPointsMaterial) { m.opacity *= 0.85; continue; }
        if (m.isMeshBasicMaterial) { if (m.color) grade(m.color, 0.82, 0.92); continue; }
        if (m.color) grade(m.color, 0.55, 0.74);
        if (m.emissive) { grade(m.emissive, 0.5, 0.7); if (m.emissiveIntensity !== undefined) m.emissiveIntensity *= 0.45; }
      }
    });
  }
  const _loadLevel = loadLevel;
  loadLevel = function (n) {
    _loadLevel(n);
    const L = LEVELS[n];
    const road = trackGroupRef && trackGroupRef.children[0];
    if (road && road.material.isMeshLambertMaterial) {
      road.material.dispose(); gradeRoadColors(road, L); road.material = roadMaterial(); road.receiveShadow = HIGH;
    }
    gradeWorld(levelGroup);
    const dp = scene.children.find((o) => o.isPoints && o.material.color && o.material.color.getHex() === 0xd8c8ff);
    if (dp) dp.material.color.setHex(0xa59d94);
  };

  /* ---------- calmer smoke colour ---------- */
  const _smokeEmit = smoke.emit;
  smoke.emit = function (x, y, z, vx, vy, vz, l, s0, s1, a0, col) {
    if (col) { const lum = (col[0] + col[1] + col[2]) / 3; col = [lum * 0.82 + col[0] * 0.1, lum * 0.8 + col[1] * 0.1, lum * 0.78 + col[2] * 0.1]; }
    return _smokeEmit(x, y, z, vx, vy, vz, l, s0, s1, a0, col);
  };

  /* ---------- crash impact ---------- */
  const flash = document.getElementById('impact'), cine = document.getElementById('cine');
  const _onCrash = onCrash;
  onCrash = function (reason) {
    _onCrash(reason);
    try {
      const gh = ground(car.x) || 0; ring(car.x, gh, 0xff7a30, 9);
      for (let i = 0; i < 26; i++) smoke.emit(car.x, car.y + 0.4, (Math.random() - 0.5) * 2.4, (Math.random() - 0.3) * 9, Math.random() * 6, (Math.random() - 0.5) * 6, 1.1 + Math.random() * 0.8, 1.2, 4.6, 0.6, [0.2, 0.2, 0.22]);
      for (let i = 0; i < 40; i++) flame.emit(car.x, car.y + 0.3, (Math.random() - 0.5) * 2, (Math.random() - 0.4) * 14, Math.random() * 9, (Math.random() - 0.5) * 8, 0.35 + Math.random() * 0.3, 0.6, 0.1, 0.9, [1, 0.5 + Math.random() * 0.3, 0.15]);
    } catch (e) {}
    if (flash && settings.shake) { flash.classList.remove('hit'); void flash.offsetWidth; flash.classList.add('hit'); }
  };

  /* ---------- per-frame: lights, shadow follow, speed vignette ---------- */
  let lastCine = -1;
  const _fxUpdate = fxUpdate;
  fxUpdate = function (dt) {
    _fxUpdate(dt);
    const live = state === 'playing' || state === 'finishing' || state === 'countdown' || state === 'crashed' || state === 'paused';
    const sp = car.speed(), k = Math.min(1, sp / 38);
    if (HIGH) {
      const p = carRoot.position;
      sun.target.position.set(Math.round(p.x * 2) / 2, Math.round(p.y * 2) / 2, Math.round(p.z * 2) / 2);
      sun.position.copy(sun.target.position).add(SUN_OFF);
    }
    head.intensity = live ? 2.2 : 0;
    const braking = input.brake && car.vx > 2 && state === 'playing';
    tail.intensity = live ? 0.35 + boostAmt * 2.6 + (braking ? 1.4 : 0) : 0;
    tail.color.setHex(boostAmt > 0.3 ? 0xff8a38 : 0xff2a10);
    renderer.toneMappingExposure = 1.05 + boostAmt * 0.14;
    if (cine) {
      const o = (0.78 + 0.22 * k + boostAmt * 0.1).toFixed(2);
      if (o !== lastCine) { lastCine = o; cine.style.opacity = o; }
    }
  };
})();
