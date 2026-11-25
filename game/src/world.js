// world.js — the whole state of one day at The Copper Pan and the rules
// that change it: tickets arriving and walking out, patties cooking and
// burning on the grill, chopping on the board, the plate being built,
// serving at the pass and the combo scoring. The world never touches the
// canvas or the speakers; it queues sound names in world.events and the
// boot file plays them, which keeps the rules testable on their own.

import { BALANCE, INGREDIENT_BY_ID, LAYOUT, RECIPES, RECIPE_BY_ID, ticketRect } from './config.js';
import { makeRng, pickRandom, randRange } from './random.js';

export function createWorld(seed) {
  return {
    phase: 'title', // 'title' | 'playing' | 'paused' | 'over'
    rng: makeRng(seed),
    elapsed: 0,
    timeLeft: BALANCE.dayLength,
    coins: 0,
    served: 0,
    lost: 0,
    combo: 0,
    bestCombo: 0,
    stars: BALANCE.startStars,
    tickets: [],
    grill: Array.from({ length: BALANCE.grillSlots }, () => null),
    board: null,
    plate: [],
    pass: [],
    popups: [],
    events: [],
    spawnTimer: BALANCE.firstTicketDelay,
    nextTicketId: 1,
    shake: 0,
    rating: '',
  };
}

export function startDay(world) {
  const fresh = createWorld((Math.random() * 1e9) | 0);
  Object.assign(world, fresh, { phase: 'playing' });
  spawnTicket(world);
  world.spawnTimer = 2.2;
}

// How far through the day we are, 0..1: drives the difficulty ramp.
export function dayProgress(world) {
  return Math.min(1, world.elapsed / BALANCE.dayLength);
}

export function spawnInterval(world) {
  const p = dayProgress(world);
  return BALANCE.spawnStart + (BALANCE.spawnEnd - BALANCE.spawnStart) * p;
}

export function ticketPatience(world) {
  const p = dayProgress(world);
  return BALANCE.patienceStart + (BALANCE.patienceEnd - BALANCE.patienceStart) * p;
}

export function unlockedRecipes(world) {
  return RECIPES.filter((r) => world.elapsed >= r.unlockAt);
}

export function spawnTicket(world) {
  if (world.tickets.length >= BALANCE.maxTickets) return null;
  const recipe = pickRandom(world.rng, unlockedRecipes(world));
  const patience = ticketPatience(world) * randRange(world.rng, 0.9, 1.1);
  const ticket = {
    id: world.nextTicketId++,
    recipeId: recipe.id,
    patience,
    patienceMax: patience,
    warned: false,
  };
  world.tickets.push(ticket);
  return ticket;
}

function plateIsClean(world) {
  return world.plate.every((layer) => !layer.burnt);
}

function layersMatch(world, recipe) {
  return (
    world.plate.length === recipe.layers.length &&
    world.plate.every((layer, i) => layer.ing === recipe.layers[i])
  );
}

// What the plate currently is: an exact dish, a prefix of one (with the
// next layer it wants), or off every recipe's track.
export function plateStatus(world) {
  if (world.plate.length === 0) return { kind: 'empty' };
  if (plateIsClean(world)) {
    const exact = RECIPES.find((r) => layersMatch(world, r));
    if (exact) return { kind: 'match', recipe: exact };
    const building = RECIPES.find(
      (r) =>
        r.layers.length > world.plate.length &&
        world.plate.every((layer, i) => layer.ing === r.layers[i]),
    );
    if (building) {
      return { kind: 'building', recipe: building, next: building.layers[world.plate.length] };
    }
  }
  return { kind: 'offtrack' };
}

function addPopup(world, x, y, text, color, life = 1.2) {
  world.popups.push({ x, y, text, color, t: 0, life });
}

function refuse(world, message) {
  world.events.push('error');
  world.shake = 0.25;
  if (message) {
    addPopup(world, LAYOUT.plateCx, LAYOUT.plate.y + 24, message, '#e4572e', 0.9);
  }
}

// The player picked an ingredient bin: route it to its station.
export function addFromBin(world, ingId) {
  if (world.phase !== 'playing') return;
  const ing = INGREDIENT_BY_ID[ingId];
  if (!ing) return;
  if (ing.station === 'plate') {
    if (world.plate.length >= BALANCE.maxPlateLayers) return refuse(world, 'Plate is full!');
    world.plate.push({ ing: ingId, burnt: false });
    world.events.push('pop');
  } else if (ing.station === 'grill') {
    const slot = world.grill.findIndex((s) => s === null);
    if (slot < 0) return refuse(world, 'Grill is full!');
    world.grill[slot] = { ing: ingId, t: 0, state: 'cooking', pinged: false };
    world.events.push('sizzle');
  } else if (ing.station === 'board') {
    if (world.board) return refuse(world, 'Board is busy!');
    world.board = { ing: ingId, chopsLeft: ing.chopClicks };
    world.events.push('pop');
  }
}

// Clicking a grill slot collects what is done; raw food keeps cooking.
export function clickGrillSlot(world, index) {
  if (world.phase !== 'playing') return;
  const slot = world.grill[index];
  if (!slot) return;
  if (slot.state === 'cooking') return refuse(world, 'Still cooking…');
  if (world.plate.length >= BALANCE.maxPlateLayers) return refuse(world, 'Plate is full!');
  world.plate.push({ ing: slot.ing, burnt: slot.state === 'burnt' });
  world.grill[index] = null;
  world.events.push('pop');
}

// Clicking the board chops; the last chop sends the food to the plate.
export function clickBoard(world) {
  if (world.phase !== 'playing' || !world.board) return;
  if (world.board.chopsLeft > 0) {
    world.board.chopsLeft -= 1;
    world.events.push('chop');
  }
  if (world.board.chopsLeft === 0) {
    if (world.plate.length >= BALANCE.maxPlateLayers) return refuse(world, 'Plate is full!');
    world.plate.push({ ing: world.board.ing, burnt: false });
    world.board = null;
    world.events.push('pop');
  }
}

// Ring the bell: if the plate is exactly a dish some ticket wants, serve
// the most impatient such ticket and pay price + tip, times the combo.
export function serveDish(world) {
  if (world.phase !== 'playing') return;
  const status = plateStatus(world);
  if (status.kind !== 'match') return refuse(world, 'No matching dish!');
  const waiting = world.tickets
    .filter((t) => t.recipeId === status.recipe.id)
    .sort((a, b) => a.patience - b.patience);
  if (waiting.length === 0) return refuse(world, 'No ticket wants this!');
  const ticket = waiting[0];
  const recipe = status.recipe;
  const patienceFrac = Math.max(0, ticket.patience / ticket.patienceMax);
  const tip = Math.round(recipe.price * BALANCE.tipFraction * patienceFrac);
  const multiplier = 1 + BALANCE.comboStep * Math.min(world.combo, BALANCE.comboCap);
  const paid = Math.round((recipe.price + tip) * multiplier);
  world.coins += paid;
  world.served += 1;
  world.combo += 1;
  world.bestCombo = Math.max(world.bestCombo, world.combo);
  world.tickets = world.tickets.filter((t) => t.id !== ticket.id);
  world.plate = [];
  if (world.pass.length < BALANCE.passSlots) {
    world.pass.push({ recipeId: recipe.id, t: 0 });
  }
  const passCx = LAYOUT.pass.x + LAYOUT.pass.w / 2;
  addPopup(world, passCx, LAYOUT.pass.y + 6, `+${paid} coins`, '#e8b34b', 1.4);
  if (world.combo >= 2) {
    addPopup(world, passCx, LAYOUT.pass.y + 34, `COMBO x${world.combo}`, '#eda96a', 1.4);
  }
  world.events.push('ding', 'coin');
  world.spawnTimer = Math.min(world.spawnTimer, 1.4);
}

// Scrap the plate into the trash: the stack is lost, the combo survives.
export function scrapPlate(world) {
  if (world.phase !== 'playing' || world.plate.length === 0) return;
  world.plate = [];
  world.events.push('scrap');
}

function endDay(world) {
  world.phase = 'over';
  if (world.stars <= 0) world.rating = 'The rush got the better of us.';
  else if (world.coins >= 240) world.rating = 'Legendary grill master!';
  else if (world.coins >= 170) world.rating = 'The street is talking about this place.';
  else if (world.coins >= 110) world.rating = 'A solid day on the grill.';
  else if (world.coins >= 60) world.rating = 'The regulars will give us another chance.';
  else world.rating = 'Every master chef starts somewhere.';
}

export function updateWorld(world, dt) {
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt);
  for (const popup of world.popups) popup.t += dt;
  world.popups = world.popups.filter((p) => p.t < p.life);
  if (world.phase !== 'playing') return;

  world.elapsed += dt;
  world.timeLeft = Math.max(0, BALANCE.dayLength - world.elapsed);
  if (world.timeLeft <= 0) return endDay(world);

  // Tickets arrive.
  world.spawnTimer -= dt;
  if (world.spawnTimer <= 0 && world.tickets.length < BALANCE.maxTickets) {
    spawnTicket(world);
    world.spawnTimer = spawnInterval(world) * randRange(world.rng, 0.85, 1.15);
  }

  // Tickets wait, then walk.
  for (const ticket of [...world.tickets]) {
    ticket.patience -= dt;
    if (ticket.patience < ticket.patienceMax * 0.25) ticket.warned = true;
    if (ticket.patience <= 0) {
      world.tickets = world.tickets.filter((t) => t.id !== ticket.id);
      world.stars -= 1;
      world.lost += 1;
      world.combo = 0;
      world.events.push('walkout');
      const idx = world.tickets.length;
      const rect = ticketRect(Math.min(idx, 3));
      addPopup(world, rect.x + rect.w / 2, rect.y + 30, 'Walked out!', '#e4572e', 1.4);
      if (world.stars <= 0) return endDay(world);
    }
  }

  // The grill cooks, finishes, then burns.
  for (const slot of world.grill) {
    if (!slot) continue;
    const ing = INGREDIENT_BY_ID[slot.ing];
    slot.t += dt;
    if (slot.t < ing.cookTime) slot.state = 'cooking';
    else if (slot.t < ing.cookTime + ing.burnTime) {
      slot.state = 'done';
      if (!slot.pinged) {
        slot.pinged = true;
        world.events.push('ready');
      }
    } else slot.state = 'burnt';
  }

  // Served plates rest at the pass, then are carried away.
  for (const plate of world.pass) plate.t += dt;
  world.pass = world.pass.filter((p) => p.t < BALANCE.passHoldTime);
}
