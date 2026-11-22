// Einstiegspunkt: Renderer, Ladevorgang, Hauptschleife.
import * as THREE from 'three';
import { loadSettings, resolveQuality, DEBUG } from './config.js';
import { Game } from './game.js';

loadSettings();
const canvas = document.getElementById('game');
const loadText = document.getElementById('load-text');

function fail(msg) {
  loadText.textContent = msg;
  loadText.style.color = '#ff6a5a';
}

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
} catch (e) {
  fail('WebGL wird von diesem Browser/Gerät nicht unterstützt.');
  throw e;
}
const q = resolveQuality();
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.pixelRatio));
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.info.autoReset = false;

const game = new Game(renderer, canvas);
window.__game = game;
if (DEBUG) window.THREE = THREE;

const ui = () => game.ui;
game
  .init((p, text) => ui() && ui().setLoading(p, text))
  .then(() => {
    window.addEventListener('resize', () => game.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => game.resize(), 300));
    game.resize();
    let last = performance.now();
    const loop = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      renderer.info.reset();
      game.update(dt);
      game.render(dt);
    };
    renderer.setAnimationLoop(loop);
    // Für automatisierte Tests
    game.loopStop = () => renderer.setAnimationLoop(null);
    game.loopStart = () => {
      last = performance.now();
      renderer.setAnimationLoop(loop);
    };
  })
  .catch((e) => {
    console.error(e);
    fail('Fehler beim Laden: ' + (e && e.message ? e.message : e));
  });

// iOS: Doppeltipp-Zoom und Gesten verhindern
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());
