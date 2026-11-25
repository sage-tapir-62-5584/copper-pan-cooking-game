// main.js — boots The Copper Pan: sizes the canvas, creates the world,
// wires input and sound, and runs the frame loop. With a ?shot=<scene>
// query it instead stages that scene (see shots.js), draws one frame at
// a fixed instant and flags window.__shotReady — that is how the entry's
// screenshots are taken, with no change to the game itself.

import { VIEW_W, VIEW_H } from './config.js';
import { SoundKit } from './audio.js';
import { attachInput } from './input.js';
import { draw } from './render.js';
import { SHOT_NOW, stageShot } from './shots.js';
import { createWorld, startDay, updateWorld } from './world.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

// Keep the canvas as large as possible without distorting the picture.
function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
  canvas.style.width = `${Math.floor(VIEW_W * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW_H * scale)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

const params = new URLSearchParams(window.location.search);
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const world = createWorld(Number.isFinite(seedParam) ? seedParam : (Math.random() * 1e9) | 0);
const sound = new SoundKit();

function playQueuedSounds() {
  for (const name of world.events) {
    if (typeof sound[name] === 'function') sound[name]();
  }
  world.events.length = 0;
}

const shotName = params.get('shot');
if (shotName) {
  stageShot(world, shotName);
  draw(ctx, world, SHOT_NOW);
  window.__shotReady = true;
} else {
  attachInput(canvas, world, {
    onStart: () => startDay(world),
    onGesture: () => sound.unlock(),
  });
  let last = performance.now();
  function frame(nowMs) {
    const dt = Math.min(0.05, (nowMs - last) / 1000);
    last = nowMs;
    updateWorld(world, dt);
    playQueuedSounds();
    draw(ctx, world, nowMs / 1000);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
