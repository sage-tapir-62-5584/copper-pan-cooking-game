// shots.js — deterministic staging for the entry's screenshots. Each
// scene writes a complete, representative moment of a day directly into
// the world (tickets with set patience, a patty mid-cook with its ring, a
// dish mid-assembly, a plate resting at the pass), and main.js renders a
// single frame of it at a fixed animation time. The scenes are staged,
// but every pixel is the game's own renderer drawing its own state.

import { LAYOUT } from './config.js';

// The fixed animation instant every staged frame is drawn at.
export const SHOT_NOW = 1.35;

function ticket(id, recipeId, patience, patienceMax) {
  return { id, recipeId, patience, patienceMax, warned: patience / patienceMax < 0.25 };
}

// The shared mid-rush kitchen: three tickets up, food on every station.
function stageRushKitchen(world) {
  world.phase = 'playing';
  world.elapsed = 47;
  world.timeLeft = 73;
  world.coins = 86;
  world.served = 5;
  world.combo = 2;
  world.bestCombo = 3;
  world.stars = 3;
  world.tickets = [
    ticket(1, 'classic', 25, 40),
    ticket(2, 'garden', 18, 40),
    ticket(3, 'melt', 31, 40),
  ];
  world.grill = [
    { ing: 'patty', t: 3.8, state: 'cooking', pinged: false },
    { ing: 'bacon', t: 5.4, state: 'done', pinged: true },
    null,
  ];
  world.board = { ing: 'tomato', chopsLeft: 1 };
  world.plate = [
    { ing: 'bun', burnt: false },
    { ing: 'patty', burnt: false },
  ];
  world.pass = [{ recipeId: 'salad', t: 0.4 }];
  world.popups = [];
}

const SCENES = {
  // The cover: the full mid-rush scene.
  rush(world) {
    stageRushKitchen(world);
  },

  // The title screen over the same busy kitchen.
  title(world) {
    stageRushKitchen(world);
    world.phase = 'title';
  },

  // Later in the day: pressure up, a ticket about to walk, bacon burnt.
  action(world) {
    world.phase = 'playing';
    world.elapsed = 88;
    world.timeLeft = 32;
    world.coins = 132;
    world.served = 8;
    world.combo = 3;
    world.bestCombo = 4;
    world.stars = 2;
    world.tickets = [
      ticket(1, 'double', 5.4, 30),
      ticket(2, 'breakfast', 16.5, 30),
      ticket(3, 'sunrise', 21, 30),
      ticket(4, 'classic', 27, 30),
    ];
    world.grill = [
      { ing: 'patty', t: 6.3, state: 'done', pinged: true },
      { ing: 'egg', t: 2, state: 'cooking', pinged: false },
      { ing: 'bacon', t: 10.6, state: 'burnt', pinged: true },
    ];
    world.board = { ing: 'lettuce', chopsLeft: 2 };
    world.plate = [
      { ing: 'bun', burnt: false },
      { ing: 'patty', burnt: false },
      { ing: 'cheese', burnt: false },
      { ing: 'patty', burnt: false },
    ];
    world.pass = [];
    world.popups = [];
  },

  // The serving moment: a finished burger on the plate, the bell just
  // rung for the salad before it, coins still floating at the pass.
  serve(world) {
    stageRushKitchen(world);
    world.coins = 148;
    world.served = 7;
    world.combo = 3;
    world.plate = [
      { ing: 'bun', burnt: false },
      { ing: 'patty', burnt: false },
      { ing: 'cheese', burnt: false },
      { ing: 'bun', burnt: false },
    ];
    world.board = null;
    world.grill = [
      { ing: 'bacon', t: 2.6, state: 'cooking', pinged: false },
      null,
      { ing: 'patty', t: 6.2, state: 'done', pinged: true },
    ];
    const passCx = LAYOUT.pass.x + LAYOUT.pass.w / 2;
    world.popups = [
      { x: passCx, y: LAYOUT.pass.y + 6, text: '+18 coins', color: '#e8b34b', t: 0.25, life: 1.4 },
      { x: passCx, y: LAYOUT.pass.y + 34, text: 'COMBO x3', color: '#eda96a', t: 0.25, life: 1.4 },
    ];
  },
};

export const SHOT_NAMES = Object.keys(SCENES);

export function stageShot(world, name) {
  const scene = SCENES[name] ?? SCENES.rush;
  scene(world);
  return world;
}
