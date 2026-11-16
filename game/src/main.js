// main.js — boot, the frame loop, and the wire from the browser's events to the game.

import * as THREE from 'three';
import { Game } from './game.js';
import { DebugPanel } from './debug.js';
import { Input, patchPointerLock } from './input.js';
import { AudioEngine } from './audio.js';

const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.appendChild(renderer.domElement);

patchPointerLock(renderer.domElement);
const audio = new AudioEngine();
const input = new Input(renderer.domElement, () => audio.start());
const game = new Game(THREE, renderer, renderer.domElement, input, audio);
game.botBuy = (actor, money) => buyForBot(game, actor, money);
const debugPanel = new DebugPanel(game);
window.saltworks = { game, renderer, THREE };

function resize() {
 const w = window.innerWidth;
 const h = window.innerHeight;
 game.resize(w, h, Math.min(window.devicePixelRatio || 1, 2));
}
window.addEventListener('resize', resize);
window.addEventListener('keydown', (e) => {
 if (e.code === 'Tab') {
  e.preventDefault();
  game.toggleScoreboard(true);
 }
});
window.addEventListener('keyup', (e) => {
 if (e.code === 'Tab') game.toggleScoreboard(false);
});
resize();

const splash = document.getElementById('splash');
const startButton = document.getElementById('start');
if (splash && startButton) {
 splash.style.display = 'flex';
 startButton.addEventListener('click', () => {
  splash.style.display = 'none';
  audio.start();
  try { renderer.domElement.requestPointerLock?.(); } catch {}
  game.match.goLive(game.time);
 });
} else {
 game.match.goLive(game.time);
}

function buyForBot(game, actor, money) {
 const order = ['vesper', 'bellwether', 'tidecaller'];
 if (money >= 4300 && Math.random() < 0.35) order.unshift('longspar');
 let spent = 0;
 for (const key of order) {
  if (game.buyItem(actor, key)) { spent = 1; break; }
  if (money < 3000) break;
 }
 if (spent && money - spent >= 650) game.buyItem(actor, 'armor');
 if (spent && money > 4000) {
  game.buyItem(actor, 'shard');
  if (Math.random() < 0.6) game.buyItem(actor, 'haze');
 }
 if (actor.team === 'watch' && money > 1500 && Math.random() < 0.35) game.buyItem(actor, 'kit');
}
let last = performance.now();
let frames = 0;
const fpsOut = document.getElementById('fps');
function loop(now) {
 const dt = Math.min(0.1, (now - last) / 1000);
 last = now;
 game.update(dt);
 debugPanel.update(dt);
 frames++;
 requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

window.saltworks.advance = (seconds) => {
 const steps = Math.round(seconds / (1 / 60));
 for (let i = 0; i < steps; i++) game.step(1 / 60);
};
window.saltworks.press = (code, down = true) => {
 if (down) input.keys.add(code);
 else input.keys.delete(code);
};
window.saltworks.click = (button = 0) => {
 if (button === 0) {
  input.buttons.left = true;
  input.clicks.left++;
  setTimeout(() => (input.buttons.left = false), 120);
 } else {
  input.buttons.right = true;
 }
};
