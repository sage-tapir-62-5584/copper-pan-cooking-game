// input.js — mouse and keyboard for The Copper Pan. Clicks are converted
// from CSS pixels to the game's logical 1280x800 space and hit-tested
// against the same layout rectangles the renderer draws. Keys: 1-8 pick
// an ingredient bin, Space rings the bell, Backspace scraps the plate,
// P pauses, Enter starts or restarts the day.

import { BALANCE, INGREDIENTS, LAYOUT, VIEW_W, VIEW_H, binRect, grillSlotRect } from './config.js';
import { serveButtonRect, scrapButtonRect } from './render.js';
import { addFromBin, clickBoard, clickGrillSlot, scrapPlate, serveDish } from './world.js';

function inside(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function toLogical(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * VIEW_W,
    y: ((event.clientY - rect.top) / rect.height) * VIEW_H,
  };
}

export function attachInput(canvas, world, { onStart, onGesture }) {
  canvas.addEventListener('pointerdown', (event) => {
    onGesture();
    const { x, y } = toLogical(canvas, event);
    if (world.phase === 'title' || world.phase === 'over') {
      onStart();
      return;
    }
    if (world.phase === 'paused') {
      world.phase = 'playing';
      return;
    }
    if (inside(x, y, serveButtonRect())) return serveDish(world);
    if (inside(x, y, scrapButtonRect())) return scrapPlate(world);
    for (let i = 0; i < BALANCE.grillSlots; i++) {
      if (inside(x, y, grillSlotRect(i))) return clickGrillSlot(world, i);
    }
    if (inside(x, y, LAYOUT.boardStation)) return clickBoard(world);
    for (let i = 0; i < INGREDIENTS.length; i++) {
      if (inside(x, y, binRect(i))) return addFromBin(world, INGREDIENTS[i].id);
    }
    // Clicking the stack itself scraps it, for when a button feels far away.
    if (inside(x, y, LAYOUT.plate)) return scrapPlate(world);
  });

  window.addEventListener('keydown', (event) => {
    onGesture();
    if (world.phase === 'title' || world.phase === 'over') {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onStart();
      }
      return;
    }
    if (event.key === 'p' || event.key === 'P') {
      if (world.phase === 'playing') world.phase = 'paused';
      else if (world.phase === 'paused') world.phase = 'playing';
      return;
    }
    if (world.phase !== 'playing') return;
    const ing = INGREDIENTS.find((i) => i.key === event.key);
    if (ing) return addFromBin(world, ing.id);
    if (event.key === ' ') {
      event.preventDefault();
      return serveDish(world);
    }
    if (event.key === 'Backspace') {
      event.preventDefault();
      return scrapPlate(world);
    }
  });
}
