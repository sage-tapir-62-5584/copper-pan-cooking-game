// render.js — every pixel of The Copper Pan is drawn here with Canvas 2D
// shapes: the teal-and-copper kitchen, the hanging order board, the grill,
// the chopping board, the assembly plate, the pass, the ingredient bins,
// and all the food art (sesame buns with a shine, dripping cheese, a
// grill-marked patty, a glossy tomato). draw(ctx, world, now) is the only
// entry point; `now` is seconds and drives steam, flames and pulses — the
// screenshot staging passes a fixed `now` so its frames are deterministic.

import {
  BALANCE, INGREDIENTS, INGREDIENT_BY_ID, LAYOUT, PALETTE as C, RECIPE_BY_ID,
  VIEW_W, VIEW_H, binRect, grillSlotRect, ticketRect,
} from './config.js';
import { plateStatus } from './world.js';

const FONT = 'system-ui, "Segoe UI", Roboto, sans-serif';

// The two buttons under the assembly plate; input.js hit-tests these too.
export function serveButtonRect() {
  const p = LAYOUT.plate;
  return { x: p.x + 14, y: p.y + p.h - 50, w: 168, h: 40 };
}
export function scrapButtonRect() {
  const p = LAYOUT.plate;
  return { x: p.x + p.w - 182, y: p.y + p.h - 50, w: 168, h: 40 };
}

// ------------------------------------------------------------ primitives

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function fillRr(ctx, x, y, w, h, r, color) {
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = color;
  ctx.fill();
}

function ellipse(ctx, cx, cy, rx, ry, color) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

function text(ctx, str, x, y, { size = 16, color = C.ink, bold = false, align = 'left', alpha = 1 } = {}) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${bold ? '700 ' : ''}${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
  ctx.restore();
}

function star(ctx, cx, cy, r, filled, emptyStroke = 'rgba(246,234,210,0.4)') {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = C.brass;
    ctx.fill();
  } else {
    ctx.strokeStyle = emptyStroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

// ------------------------------------------------------------ food art
// One ingredient layer, centred on cx with its top at yTop and width w.
// pos matters only for buns: the bottom of the stack is a bun heel, the
// top is a sesame dome. Returns the height the layer occupies.

const LAYER_H = { bun: 17, patty: 20, cheese: 11, tomato: 13, lettuce: 13, bacon: 12, egg: 17, onion: 10 };

export function layerHeight(ing, w, pos) {
  const s = w / 170;
  if (ing === 'bun' && pos === 'top') return 34 * s;
  return (LAYER_H[ing] ?? 14) * s;
}

export function drawLayer(ctx, ing, cx, yTop, w, pos = 'mid', burnt = false) {
  const s = w / 170;
  const x = cx - w / 2;
  const h = layerHeight(ing, w, pos);
  ctx.save();
  if (burnt) ctx.filter = 'brightness(0.35) saturate(0.4)';
  if (ing === 'bun' && pos === 'top') {
    // Sesame dome with a glossy shine.
    ctx.beginPath();
    ctx.moveTo(x, yTop + h);
    ctx.quadraticCurveTo(x, yTop - 4 * s, cx, yTop);
    ctx.quadraticCurveTo(x + w, yTop - 4 * s, x + w, yTop + h);
    ctx.closePath();
    ctx.fillStyle = '#eda95e';
    ctx.fill();
    ctx.fillStyle = '#d98e3e';
    ctx.fillRect(x, yTop + h - 3 * s, w, 3 * s);
    ellipse(ctx, cx - w * 0.22, yTop + h * 0.3, w * 0.16, h * 0.16, 'rgba(255,255,255,0.35)');
    ctx.fillStyle = '#fff3cf';
    const seeds = [[-0.3, 0.42], [-0.08, 0.24], [0.16, 0.3], [0.32, 0.5], [0.02, 0.55], [-0.18, 0.66], [0.24, 0.68]];
    for (const [dx, dy] of seeds) {
      ctx.save();
      ctx.translate(cx + dx * w, yTop + dy * h);
      ctx.rotate(dx * 2);
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.4 * s, 2 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (ing === 'bun') {
    fillRr(ctx, x, yTop, w, h, 6 * s, pos === 'bottom' ? '#e09a44' : '#eaa653');
    ctx.fillStyle = 'rgba(120,66,18,0.35)';
    ctx.fillRect(x + 3 * s, yTop + h - 3.5 * s, w - 6 * s, 2.5 * s);
  } else if (ing === 'patty') {
    fillRr(ctx, x - 2 * s, yTop, w + 4 * s, h, 8 * s, '#7a4522');
    ctx.strokeStyle = 'rgba(40,20,8,0.55)';
    ctx.lineWidth = 3 * s;
    for (let i = 0; i < 3; i++) {
      const mx = x + w * (0.16 + i * 0.27);
      ctx.beginPath();
      ctx.moveTo(mx, yTop + h - 2.5 * s);
      ctx.lineTo(mx + w * 0.15, yTop + 2.5 * s);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,210,160,0.25)';
    ctx.fillRect(x + 6 * s, yTop + 2.5 * s, w - 12 * s, 2.5 * s);
  } else if (ing === 'cheese') {
    ctx.save();
    ctx.translate(cx, yTop + h / 2);
    ctx.rotate(-0.03);
    ctx.fillStyle = '#f7b731';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    // Melty drips hanging off the slice.
    for (const dx of [-0.34, -0.05, 0.28]) {
      ctx.beginPath();
      ctx.moveTo(dx * w - 5 * s, h / 2);
      ctx.lineTo(dx * w + 5 * s, h / 2);
      ctx.lineTo(dx * w, h / 2 + 8 * s);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(-w / 2 + 4 * s, -h / 2 + 1.5 * s, w - 8 * s, 2 * s);
    ctx.restore();
  } else if (ing === 'tomato') {
    fillRr(ctx, x, yTop, w, h, 6 * s, '#e2483d');
    ctx.fillStyle = '#f27166';
    const segW = w / 3.4;
    for (let i = 0; i < 3; i++) {
      ellipse(ctx, x + segW * (i + 0.65), yTop + h / 2, segW * 0.32, h * 0.3, '#f27166');
    }
    ellipse(ctx, x + w * 0.3, yTop + h * 0.32, w * 0.1, h * 0.14, 'rgba(255,255,255,0.4)');
  } else if (ing === 'lettuce') {
    ctx.beginPath();
    ctx.moveTo(x - 3 * s, yTop + h);
    const bumps = 6;
    for (let i = 0; i < bumps; i++) {
      const bx = x - 3 * s + ((w + 6 * s) / bumps) * i;
      ctx.quadraticCurveTo(bx + (w / bumps) * 0.5, yTop - 5 * s, bx + w / bumps, yTop + h * 0.55);
    }
    ctx.lineTo(x + w + 3 * s, yTop + h);
    ctx.closePath();
    ctx.fillStyle = '#7ac74f';
    ctx.fill();
    ctx.strokeStyle = 'rgba(46,110,32,0.5)';
    ctx.lineWidth = 1.6 * s;
    ctx.beginPath();
    ctx.moveTo(x + 4 * s, yTop + h - 2 * s);
    ctx.lineTo(x + w - 4 * s, yTop + h - 2 * s);
    ctx.stroke();
  } else if (ing === 'bacon') {
    for (const off of [-h * 0.28, h * 0.28]) {
      ctx.beginPath();
      ctx.moveTo(x, yTop + h / 2 + off);
      for (let i = 0; i <= 4; i++) {
        const bx = x + (w / 4) * i;
        const by = yTop + h / 2 + off + (i % 2 === 0 ? -3 : 3) * s;
        ctx.lineTo(bx, by);
      }
      ctx.strokeStyle = '#b6492f';
      ctx.lineWidth = 6.5 * s;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, yTop + h / 2 + off);
      for (let i = 0; i <= 4; i++) {
        const bx = x + (w / 4) * i;
        const by = yTop + h / 2 + off + (i % 2 === 0 ? -3 : 3) * s;
        ctx.lineTo(bx, by);
      }
      ctx.strokeStyle = '#f0c297';
      ctx.lineWidth = 2 * s;
      ctx.stroke();
    }
  } else if (ing === 'egg') {
    ellipse(ctx, cx, yTop + h / 2, w * 0.46, h * 0.52, '#fff8ec');
    ellipse(ctx, cx + w * 0.05, yTop + h / 2, w * 0.17, h * 0.36, '#f7b731');
    ellipse(ctx, cx + w * 0.01, yTop + h * 0.38, w * 0.05, h * 0.1, 'rgba(255,255,255,0.55)');
  } else if (ing === 'onion') {
    ctx.strokeStyle = 'rgba(233,221,248,0.95)';
    ctx.lineWidth = 3 * s;
    for (const dx of [-0.28, 0, 0.28]) {
      ctx.beginPath();
      ctx.arc(cx + dx * w, yTop + h * 0.62, w * 0.13, Math.PI, 0);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(150,110,200,0.6)';
    ctx.lineWidth = 1.4 * s;
    for (const dx of [-0.28, 0, 0.28]) {
      ctx.beginPath();
      ctx.arc(cx + dx * w, yTop + h * 0.62, w * 0.09, Math.PI, 0);
      ctx.stroke();
    }
  }
  ctx.restore();
  return h;
}

// The total height of a layer stack at a given width.
export function stackHeight(layers, w) {
  let total = 0;
  layers.forEach((ing, i) => {
    const pos = i === 0 ? 'bottom' : i === layers.length - 1 ? 'top' : 'mid';
    total += layerHeight(ing, w, pos) - 1.5 * (w / 170);
  });
  return total;
}

// A vertical stack of layers, bottom layer's base sitting on baseY.
export function drawStack(ctx, layers, cx, baseY, w) {
  let y = baseY;
  layers.forEach((ing, i) => {
    const pos = i === 0 ? 'bottom' : i === layers.length - 1 ? 'top' : 'mid';
    const h = layerHeight(ing, w, pos);
    y -= h;
    drawLayer(ctx, ing, cx, y, w, pos, false);
    y += 1.5 * (w / 170);
  });
  return y;
}

function drawPlateBase(ctx, cx, baseY, w) {
  ellipse(ctx, cx, baseY + 4, w * 0.62, w * 0.09, 'rgba(0,0,0,0.18)');
  ellipse(ctx, cx, baseY, w * 0.58, w * 0.085, '#fdf6e3');
  ellipse(ctx, cx, baseY - 1, w * 0.44, w * 0.055, '#e8dcc0');
}

// A whole dish as its recipe serves it: burgers stack on a plate, the
// salad mounds in a bowl, the breakfast spreads across a wide plate.
export function drawDish(ctx, recipe, cx, baseY, w) {
  if (recipe.kind === 'bowl') {
    ellipse(ctx, cx, baseY + 3, w * 0.55, w * 0.07, 'rgba(0,0,0,0.18)');
    const rimY = baseY - w * 0.24;
    // The bowl itself first, then the salad heaped above its rim.
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.52, rimY);
    ctx.quadraticCurveTo(cx, baseY + w * 0.2, cx + w * 0.52, rimY);
    ctx.closePath();
    ctx.fillStyle = '#2f8f83';
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(cx - w * 0.52, rimY - 1.5, w * 1.04, 3);
    let y = rimY + 2;
    recipe.layers.forEach((ing, i) => {
      const lw = w * (0.94 - i * 0.07);
      const hl = Math.max(layerHeight(ing, lw, 'mid'), w * 0.1);
      y -= hl;
      drawLayer(ctx, ing, cx, y, lw, 'mid', false);
    });
    return;
  }
  if (recipe.kind === 'plate') {
    drawPlateBase(ctx, cx, baseY, w * 1.3);
    const n = recipe.layers.length;
    recipe.layers.forEach((ing, i) => {
      const ix = cx + (i - (n - 1) / 2) * w * 0.44;
      drawLayer(ctx, ing, ix, baseY - layerHeight(ing, w * 0.58, 'mid') - 2, w * 0.58, 'mid', false);
    });
    return;
  }
  drawPlateBase(ctx, cx, baseY, w);
  drawStack(ctx, recipe.layers, cx, baseY - 3, w);
}

// A whole ingredient as it sits in a bin or on the chopping board.
export function drawWholeIngredient(ctx, ing, cx, cy, r) {
  ctx.save();
  if (ing === 'tomato') {
    ellipse(ctx, cx, cy, r, r * 0.92, '#e2483d');
    ellipse(ctx, cx - r * 0.3, cy - r * 0.3, r * 0.28, r * 0.18, 'rgba(255,255,255,0.4)');
    ctx.fillStyle = '#4d8f3a';
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.95);
    ctx.lineTo(cx + r * 0.16, cy - r * 0.6);
    ctx.lineTo(cx - r * 0.16, cy - r * 0.6);
    ctx.closePath();
    ctx.fill();
  } else if (ing === 'lettuce') {
    for (const [dx, dy, rr2] of [[-0.35, 0.1, 0.62], [0.35, 0.1, 0.62], [0, -0.25, 0.7], [0, 0.25, 0.66]]) {
      ellipse(ctx, cx + dx * r, cy + dy * r, rr2 * r, rr2 * r * 0.8, '#7ac74f');
    }
    ellipse(ctx, cx, cy, r * 0.4, r * 0.3, '#a5dd85');
  } else if (ing === 'onion') {
    ellipse(ctx, cx, cy, r * 0.85, r, '#efe6f7');
    ctx.strokeStyle = '#b493d8';
    ctx.lineWidth = 2;
    for (const f of [0.62, 0.4, 0.2]) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 0.85 * f + 2, r * f + 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#cbb2e8';
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 1.08);
    ctx.lineTo(cx + 3, cy - r * 0.82);
    ctx.lineTo(cx - 3, cy - r * 0.82);
    ctx.closePath();
    ctx.fill();
  } else if (ing === 'bun') {
    drawLayer(ctx, 'bun', cx, cy - 15, r * 2, 'top', false);
  } else if (ing === 'patty') {
    ellipse(ctx, cx, cy, r, r * 0.62, '#a2603c');
    ctx.fillStyle = 'rgba(60,30,12,0.35)';
    for (const dx of [-0.4, 0, 0.4]) ellipse(ctx, cx + dx * r, cy, r * 0.1, r * 0.06, 'rgba(60,30,12,0.35)');
  } else if (ing === 'cheese') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.12);
    ctx.fillStyle = '#f7b731';
    ctx.fillRect(-r, -r * 0.55, r * 2, r * 1.1);
    ctx.fillStyle = 'rgba(180,110,0,0.5)';
    for (const [dx, dy] of [[-0.5, -0.1], [0.1, 0.25], [0.55, -0.25]]) {
      ctx.beginPath();
      ctx.arc(dx * r, dy * r, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else if (ing === 'bacon') {
    drawLayer(ctx, 'bacon', cx, cy - 8, r * 2.1, 'mid', false);
    drawLayer(ctx, 'bacon', cx, cy + 2, r * 2.1, 'mid', false);
  } else if (ing === 'egg') {
    ellipse(ctx, cx, cy, r * 0.95, r * 0.8, '#fff8ec');
    ellipse(ctx, cx, cy, r * 0.42, r * 0.38, '#f7b731');
    ellipse(ctx, cx - r * 0.12, cy - r * 0.12, r * 0.12, r * 0.08, 'rgba(255,255,255,0.6)');
  }
  ctx.restore();
}

function drawSteam(ctx, cx, cy, now, seed, count = 3) {
  ctx.save();
  for (let i = 0; i < count; i++) {
    const phase = (now * 0.7 + seed + i / count) % 1;
    const sx = cx + Math.sin((now * 2 + i * 2.1 + seed * 7) ) * 6 + (i - (count - 1) / 2) * 12;
    const sy = cy - phase * 34;
    ctx.globalAlpha = 0.28 * (1 - phase);
    ellipse(ctx, sx, sy, 5 + phase * 6, 7 + phase * 8, '#ffffff');
  }
  ctx.restore();
}

// ------------------------------------------------------------ the room

function drawKitchen(ctx, now) {
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, C.wallTop);
  grad.addColorStop(0.72, C.wallBottom);
  grad.addColorStop(0.721, '#6e452a');
  grad.addColorStop(1, '#54331d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Wall tiles behind the counter line.
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= VIEW_W; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, 250); ctx.lineTo(x, 560); ctx.stroke();
  }
  for (let y = 282; y <= 560; y += 46) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(VIEW_W, y); ctx.stroke();
  }
  // Hanging copper pans in the gap under the order board.
  for (const [px, pr] of [[120, 21], [190, 16], [1090, 17], [1158, 22]]) {
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(px, 246); ctx.lineTo(px, 258); ctx.stroke();
    ellipse(ctx, px, 258 + pr, pr, pr, C.copper);
    ellipse(ctx, px, 258 + pr, pr * 0.72, pr * 0.72, C.copperDark);
  }
  // The work counter the stations sit on.
  fillRr(ctx, 16, 282, VIEW_W - 32, 262, 14, C.counterTop);
  ctx.fillStyle = C.counterEdge;
  ctx.fillRect(16, 282, VIEW_W - 32, 6);
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.fillRect(16, 530, VIEW_W - 32, 14);
  // A hanging lamp over the assembly plate, gently glowing.
  const lampX = LAYOUT.plateCx;
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(lampX, 238); ctx.lineTo(lampX, 258); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(lampX - 34, 282);
  ctx.lineTo(lampX, 256);
  ctx.lineTo(lampX + 34, 282);
  ctx.closePath();
  ctx.fillStyle = C.copperDark;
  ctx.fill();
  const glow = ctx.createRadialGradient(lampX, 300, 10, lampX, 330, 190);
  glow.addColorStop(0, 'rgba(255,196,110,0.20)');
  glow.addColorStop(1, 'rgba(255,196,110,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(lampX - 200, 250, 400, 260);
  void now;
}

// ------------------------------------------------------------ HUD

function drawHud(ctx, world) {
  ctx.fillStyle = 'rgba(10,32,40,0.92)';
  ctx.fillRect(0, 0, VIEW_W, LAYOUT.hud.h);
  ctx.fillStyle = C.copper;
  ctx.fillRect(0, LAYOUT.hud.h - 3, VIEW_W, 3);
  text(ctx, 'THE COPPER PAN', 28, 30, { size: 25, bold: true, color: C.copperLight });
  text(ctx, 'grill house', 30, 50, { size: 11, color: 'rgba(246,234,210,0.6)' });

  // The day timer, big in the middle, with the day draining under it.
  const secs = Math.ceil(world.timeLeft);
  const label = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  const urgent = world.phase === 'playing' && world.timeLeft <= 15;
  text(ctx, `⏱ ${label}`, VIEW_W / 2, 26, {
    size: 30, bold: true, align: 'center',
    color: urgent ? C.bad : C.cream,
  });
  const tw = 300;
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(VIEW_W / 2 - tw / 2, 46, tw, 6);
  ctx.fillStyle = urgent ? C.bad : C.brass;
  ctx.fillRect(VIEW_W / 2 - tw / 2, 46, tw * Math.max(0, world.timeLeft / BALANCE.dayLength), 6);

  // Stars, coins and the served count on the right.
  for (let i = 0; i < BALANCE.startStars; i++) {
    star(ctx, 872 + i * 34, 30, 13, i < world.stars);
  }
  ellipse(ctx, 992, 30, 12, 12, C.brass);
  ellipse(ctx, 992, 30, 8, 8, '#d99a26');
  text(ctx, `${world.coins}`, 1012, 31, { size: 24, bold: true, color: C.cream });
  text(ctx, `served ${world.served}`, 1096, 31, { size: 15, color: 'rgba(246,234,210,0.85)' });
  if (world.combo >= 2) {
    text(ctx, `COMBO x${world.combo}`, 1252, 31, { size: 16, bold: true, color: C.flame, align: 'right' });
  }
}

// ------------------------------------------------------------ order board

function drawOrderBoard(ctx, world, now) {
  const b = LAYOUT.board;
  // Ropes and the hanging wooden board.
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 4;
  for (const rx of [b.x + 90, b.x + b.w - 90]) {
    ctx.beginPath(); ctx.moveTo(rx, 58); ctx.lineTo(rx, b.y + 8); ctx.stroke();
  }
  fillRr(ctx, b.x, b.y, b.w, b.h, 10, C.boardWood);
  fillRr(ctx, b.x + 6, b.y + 6, b.w - 12, b.h - 12, 8, '#4c3018');
  // A little plaque riding on the board's top edge.
  fillRr(ctx, b.x + b.w / 2 - 62, b.y - 11, 124, 22, 8, '#2a1c10');
  ctx.strokeStyle = C.copper;
  ctx.lineWidth = 1.5;
  rr(ctx, b.x + b.w / 2 - 62, b.y - 11, 124, 22, 8);
  ctx.stroke();
  text(ctx, 'ORDERS', b.x + b.w / 2, b.y + 1, { size: 13, bold: true, color: C.copperLight, align: 'center' });
  for (let i = 0; i < BALANCE.maxTickets; i++) {
    const rect = ticketRect(i);
    const ticket = world.tickets[i];
    if (!ticket) {
      rr(ctx, rect.x, rect.y, rect.w, rect.h, 6);
      ctx.strokeStyle = 'rgba(246,234,210,0.18)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
      continue;
    }
    drawTicket(ctx, ticket, rect, now);
  }
}

function drawTicket(ctx, ticket, rect, now) {
  const recipe = RECIPE_BY_ID[ticket.recipeId];
  const frac = Math.max(0, ticket.patience / ticket.patienceMax);
  let dx = 0;
  if (ticket.warned) dx = Math.sin(now * 26) * 1.6;
  ctx.save();
  ctx.translate(dx, 0);
  // Pin and paper.
  fillRr(ctx, rect.x + 3, rect.y + 5, rect.w, rect.h, 6, 'rgba(0,0,0,0.3)');
  fillRr(ctx, rect.x, rect.y, rect.w, rect.h, 6, C.paper);
  ellipse(ctx, rect.x + rect.w / 2, rect.y + 7, 5, 5, C.bad);
  text(ctx, recipe.name, rect.x + 12, rect.y + 22, { size: 16, bold: true, color: C.ink });
  text(ctx, `${recipe.price}¢`, rect.x + rect.w - 12, rect.y + 22, { size: 15, bold: true, color: C.copperDark, align: 'right' });
  // The dish itself, drawn as it will be served.
  drawDish(ctx, recipe, rect.x + 52, rect.y + 112, 62);
  // The layer list beside it.
  recipe.layers.forEach((ing, i) => {
    const ly = rect.y + 48 + i * 15;
    const dotColors = { bun: '#eda95e', patty: '#7a4522', cheese: '#f7b731', tomato: '#e2483d', lettuce: '#7ac74f', bacon: '#b6492f', egg: '#f7b731', onion: '#b493d8' };
    ellipse(ctx, rect.x + 108, ly, 4.5, 4.5, dotColors[ing]);
    text(ctx, INGREDIENT_BY_ID[ing].name, rect.x + 120, ly + 1, { size: 12.5, color: C.ink });
  });
  // Patience bar along the ticket's foot.
  const barX = rect.x + 10;
  const barW = rect.w - 20;
  const barY = rect.y + rect.h - 16;
  fillRr(ctx, barX, barY, barW, 8, 4, '#d8c9a3');
  const color = frac > 0.5 ? C.good : frac > 0.25 ? C.warn : C.bad;
  fillRr(ctx, barX, barY, Math.max(6, barW * frac), 8, 4, color);
  ctx.restore();
}

// ------------------------------------------------------------ stations

function drawStationSign(ctx, x, y, label) {
  fillRr(ctx, x, y, 108, 24, 6, 'rgba(10,32,40,0.75)');
  text(ctx, label, x + 54, y + 13, { size: 13, bold: true, color: C.copperLight, align: 'center' });
}

function drawGrill(ctx, world, now) {
  const g = LAYOUT.grill;
  drawStationSign(ctx, g.x + 8, g.y + 8, 'GRILL');
  fillRr(ctx, g.x + 8, g.y + 42, g.w - 16, g.h - 54, 10, C.grillMetal);
  fillRr(ctx, g.x + 14, g.y + 48, g.w - 28, g.h - 66, 8, C.grillDark);
  // Flames licking under the grate.
  for (let i = 0; i < 12; i++) {
    const fx = g.x + 34 + i * ((g.w - 68) / 11);
    const fh = 10 + Math.sin(now * 9 + i * 1.7) * 4;
    ctx.beginPath();
    ctx.moveTo(fx - 6, g.y + g.h - 16);
    ctx.quadraticCurveTo(fx, g.y + g.h - 16 - fh, fx + 6, g.y + g.h - 16);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? 'rgba(255,154,60,0.5)' : 'rgba(255,196,80,0.65)';
    ctx.fill();
  }
  for (let i = 0; i < BALANCE.grillSlots; i++) {
    const r = grillSlotRect(i);
    // Grate bars.
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 3;
    for (let bx = 0; bx < 4; bx++) {
      ctx.beginPath();
      ctx.moveTo(r.x + 10 + bx * ((r.w - 20) / 3), r.y + 8);
      ctx.lineTo(r.x + 10 + bx * ((r.w - 20) / 3), r.y + r.h - 8);
      ctx.stroke();
    }
    const slot = world.grill[i];
    if (!slot) {
      text(ctx, 'empty', r.x + r.w / 2, r.y + r.h / 2, { size: 12, color: 'rgba(246,234,210,0.35)', align: 'center' });
      continue;
    }
    const ing = INGREDIENT_BY_ID[slot.ing];
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2 + 6;
    drawGrillFood(ctx, slot, cx, cy, now);
    if (slot.state === 'done') drawSteam(ctx, cx, cy - 26, now, i * 0.37, 2);
    if (slot.state === 'burnt') drawSteam(ctx, cx, cy - 24, now, i * 0.53, 3);
    // Progress ring around the slot.
    const ringR = 34;
    ctx.beginPath();
    ctx.arc(cx, cy - 4, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 5;
    ctx.stroke();
    let frac;
    let color;
    if (slot.state === 'cooking') {
      frac = slot.t / ing.cookTime;
      color = C.copperLight;
    } else if (slot.state === 'done') {
      frac = 1;
      color = C.good;
    } else {
      frac = 1;
      color = C.bad;
    }
    ctx.beginPath();
    ctx.arc(cx, cy - 4, ringR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, frac));
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.stroke();
    const label = slot.state === 'cooking' ? 'cooking' : slot.state === 'done' ? 'DONE!' : 'BURNT';
    text(ctx, label, cx, r.y + r.h - 12, {
      size: 12.5, bold: slot.state !== 'cooking', align: 'center',
      color: slot.state === 'cooking' ? 'rgba(246,234,210,0.75)' : color,
    });
  }
}

// Food on the grill: a patty browns, bacon crisps, an egg fries in a pan.
function drawGrillFood(ctx, slot, cx, cy, now) {
  const ing = INGREDIENT_BY_ID[slot.ing];
  const frac = Math.min(1, slot.t / ing.cookTime);
  ctx.save();
  if (slot.state === 'burnt') ctx.filter = 'brightness(0.4) saturate(0.5)';
  if (slot.ing === 'patty') {
    const raw = [168, 96, 66];
    const done = [122, 69, 34];
    const col = raw.map((v, i) => Math.round(v + (done[i] - v) * frac));
    ellipse(ctx, cx, cy, 34, 20, `rgb(${col[0]},${col[1]},${col[2]})`);
    if (frac > 0.4) {
      ctx.strokeStyle = 'rgba(40,20,8,0.5)';
      ctx.lineWidth = 3;
      for (const dx of [-14, 0, 14]) {
        ctx.beginPath();
        ctx.moveTo(cx + dx - 5, cy + 9);
        ctx.lineTo(cx + dx + 5, cy - 9);
        ctx.stroke();
      }
    }
  } else if (slot.ing === 'bacon') {
    drawLayer(ctx, 'bacon', cx, cy - 12, 74, 'mid', false);
    drawLayer(ctx, 'bacon', cx, cy + 2, 74, 'mid', false);
  } else if (slot.ing === 'egg') {
    // A small black frying pan.
    ellipse(ctx, cx, cy, 30, 24, '#191c1f');
    ellipse(ctx, cx, cy, 25, 19, '#2c3036');
    ctx.fillStyle = '#191c1f';
    ctx.fillRect(cx + 24, cy - 4, 20, 7);
    const yolk = frac < 0.3 ? '#f9c74f' : '#f7b731';
    ellipse(ctx, cx, cy, 19, 13, '#fff8ec');
    ellipse(ctx, cx + 2, cy, 8.5, 7, yolk);
  }
  ctx.restore();
  void now;
}

function drawBoardStation(ctx, world, now) {
  const b = LAYOUT.boardStation;
  drawStationSign(ctx, b.x + 8, b.y + 8, 'CHOP BOARD');
  // The wooden board.
  fillRr(ctx, b.x + 60, b.y + 40, b.w - 120, 66, 12, '#c99a63');
  fillRr(ctx, b.x + 66, b.y + 46, b.w - 132, 54, 10, '#dbb57e');
  if (!world.board) {
    text(ctx, 'chop tomato · lettuce · onion here', b.x + b.w / 2, b.y + 74, {
      size: 12.5, color: 'rgba(51,36,26,0.55)', align: 'center',
    });
  } else {
    const item = world.board;
    const ing = INGREDIENT_BY_ID[item.ing];
    const cx = b.x + b.w / 2;
    const cy = b.y + 73;
    drawWholeIngredient(ctx, item.ing, cx, cy, 26);
    // Knife cuts appear as the chops land.
    const done = ing.chopClicks - item.chopsLeft;
    ctx.strokeStyle = 'rgba(90,50,20,0.65)';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < done; i++) {
      const kx = cx - 18 + i * (36 / Math.max(1, ing.chopClicks - 1 || 1));
      ctx.beginPath();
      ctx.moveTo(kx, cy - 22);
      ctx.lineTo(kx + 5, cy + 22);
      ctx.stroke();
    }
    // The knife, resting at the board's edge.
    ctx.save();
    ctx.translate(b.x + b.w - 92, cy - 6 + Math.sin(now * 2) * 1.5);
    ctx.rotate(0.5);
    ctx.fillStyle = '#d7dde2';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(38, 5);
    ctx.lineTo(38, 13);
    ctx.lineTo(2, 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5d3d24';
    ctx.fillRect(-14, 3, 15, 8);
    ctx.restore();
    // Chop pips.
    for (let i = 0; i < ing.chopClicks; i++) {
      ellipse(ctx, b.x + b.w / 2 - (ing.chopClicks - 1) * 11 + i * 22, b.y + b.h - 8, 6, 6,
        i < done ? C.good : 'rgba(246,234,210,0.35)');
    }
    text(ctx, item.chopsLeft > 0 ? `chop! (${item.chopsLeft} to go)` : 'chopped — click to plate it', cx, b.y + 26, {
      size: 13, bold: true, color: C.cream, align: 'center',
    });
  }
}

function drawAssembly(ctx, world, now) {
  const p = LAYOUT.plate;
  drawStationSign(ctx, p.x + 8, p.y + 8, 'ASSEMBLY');
  const cx = LAYOUT.plateCx;
  const baseY = LAYOUT.plateBaseY;
  drawPlateBase(ctx, cx, baseY, 196);
  if (world.plate.length === 0) {
    text(ctx, 'build the dish here', cx, baseY - 46, { size: 14, color: 'rgba(246,234,210,0.55)', align: 'center' });
  } else {
    let y = baseY - 3;
    world.plate.forEach((layer, i) => {
      const pos = i === 0 ? 'bottom' : i === world.plate.length - 1 ? 'top' : 'mid';
      const h = layerHeight(layer.ing, 150, pos);
      y -= h;
      drawLayer(ctx, layer.ing, cx, y, 150, pos, layer.burnt);
      y += 1.5;
    });
    if (world.plate.some((l) => l.burnt)) {
      text(ctx, 'something is burnt!', cx, y - 14, { size: 13.5, bold: true, color: C.bad, align: 'center' });
    }
  }
  // Status line: what the plate is becoming and what it wants next.
  const status = plateStatus(world);
  let statusText = '';
  let statusColor = 'rgba(246,234,210,0.75)';
  if (status.kind === 'match') {
    statusText = `${status.recipe.name} — READY! Ring the bell!`;
    statusColor = C.good;
  } else if (status.kind === 'building') {
    statusText = `Building ${status.recipe.name} — next: ${INGREDIENT_BY_ID[status.next].name}`;
  } else if (status.kind === 'offtrack') {
    statusText = 'No recipe matches — scrap it and start again';
    statusColor = C.bad;
  }
  if (statusText) {
    const pulse = status.kind === 'match' ? 0.85 + Math.sin(now * 6) * 0.15 : 1;
    text(ctx, statusText, cx, p.y + 47, { size: 15, bold: status.kind !== 'building', color: statusColor, align: 'center', alpha: pulse });
  }
  // Serve and scrap buttons.
  const serve = serveButtonRect();
  const ready = status.kind === 'match';
  fillRr(ctx, serve.x, serve.y, serve.w, serve.h, 10, ready ? '#b97e2c' : 'rgba(10,32,40,0.6)');
  ctx.strokeStyle = C.brass;
  ctx.lineWidth = 2;
  rr(ctx, serve.x, serve.y, serve.w, serve.h, 10);
  ctx.stroke();
  // The little brass bell on the button.
  ctx.beginPath();
  ctx.arc(serve.x + 26, serve.y + 22, 10, Math.PI, 0);
  ctx.fillStyle = C.brass;
  ctx.fill();
  ctx.fillRect(serve.x + 14, serve.y + 22, 24, 3);
  ellipse(ctx, serve.x + 26, serve.y + 28, 3.5, 3.5, C.brass);
  text(ctx, 'SERVE', serve.x + 58, serve.y + 21, { size: 16, bold: true, color: ready ? '#fff6dd' : C.cream });
  const scrap = scrapButtonRect();
  fillRr(ctx, scrap.x, scrap.y, scrap.w, scrap.h, 10, 'rgba(10,32,40,0.6)');
  ctx.strokeStyle = 'rgba(246,234,210,0.5)';
  rr(ctx, scrap.x, scrap.y, scrap.w, scrap.h, 10);
  ctx.stroke();
  text(ctx, '🗑 SCRAP', scrap.x + scrap.w / 2, scrap.y + 21, { size: 16, bold: true, color: C.cream, align: 'center' });
}

function drawPass(ctx, world, now) {
  const p = LAYOUT.pass;
  drawStationSign(ctx, p.x + 8, p.y + 6, 'PASS');
  // A heat lamp hanging over the middle of the shelf.
  const lampX = p.x + p.w / 2;
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(lampX, p.y); ctx.lineTo(lampX, p.y + 10); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(lampX - 17, p.y + 24);
  ctx.lineTo(lampX, p.y + 9);
  ctx.lineTo(lampX + 17, p.y + 24);
  ctx.closePath();
  ctx.fillStyle = '#a03d28';
  ctx.fill();
  const glow = ctx.createRadialGradient(lampX, p.y + 30, 4, lampX, p.y + 38, 120);
  glow.addColorStop(0, 'rgba(255,120,60,0.28)');
  glow.addColorStop(1, 'rgba(255,120,60,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(p.x, p.y, p.w, p.h + 14);
  // The shelf board the finished plates rest on.
  fillRr(ctx, p.x + 10, p.y + 44, p.w - 20, 30, 8, '#8a5a3b');
  ctx.fillStyle = C.counterEdge;
  ctx.fillRect(p.x + 10, p.y + 44, p.w - 20, 4);
  if (world.pass.length === 0) {
    text(ctx, 'served plates land here', p.x + p.w / 2, p.y + 60, { size: 12.5, color: 'rgba(246,234,210,0.5)', align: 'center' });
  }
  world.pass.forEach((plate, i) => {
    const recipe = RECIPE_BY_ID[plate.recipeId];
    const px = p.x + 118 + i * 168;
    drawDish(ctx, recipe, px, p.y + 42, 74);
    text(ctx, 'READY', px, p.y + 88, { size: 11.5, bold: true, color: C.good, align: 'center' });
  });
  void now;
}

// ------------------------------------------------------------ bins

function drawBins(ctx) {
  const b = LAYOUT.bins;
  fillRr(ctx, b.x, b.y, b.w, b.h, 12, 'rgba(10,32,40,0.55)');
  text(ctx, 'INGREDIENTS — click a bin or press its number', b.x + 14, b.y - 4, { size: 12, bold: true, color: 'rgba(246,234,210,0.65)' });
  INGREDIENTS.forEach((ing, i) => {
    const r = binRect(i);
    // The bin: a teal tub with a copper rim and the ingredient heaped in it.
    fillRr(ctx, r.x, r.y, r.w, r.h, 10, '#175263');
    fillRr(ctx, r.x, r.y, r.w, 12, 10, C.copper);
    ctx.fillStyle = '#175263';
    ctx.fillRect(r.x, r.y + 8, r.w, 6);
    drawWholeIngredient(ctx, ing.id, r.x + r.w / 2, r.y + 52, 30);
    text(ctx, ing.name, r.x + r.w / 2, r.y + r.h - 24, { size: 15.5, bold: true, color: C.cream, align: 'center' });
    const stationHint = ing.station === 'grill' ? 'to grill' : ing.station === 'board' ? 'to chop' : 'to plate';
    text(ctx, stationHint, r.x + r.w / 2, r.y + r.h - 7, { size: 11, color: 'rgba(246,234,210,0.55)', align: 'center' });
    // Number key badge.
    ellipse(ctx, r.x + 17, r.y + 17, 11, 11, C.brass);
    text(ctx, ing.key, r.x + 17, r.y + 18, { size: 13, bold: true, color: '#4a2f10', align: 'center' });
  });
}

// ------------------------------------------------------------ popups & overlays

function drawPopups(ctx, world) {
  for (const popup of world.popups) {
    const frac = popup.t / popup.life;
    const y = popup.y - frac * 36;
    text(ctx, popup.text, popup.x, y, {
      size: 19, bold: true, color: popup.color, align: 'center', alpha: 1 - frac * frac,
    });
  }
}

function drawDim(ctx, alpha) {
  ctx.fillStyle = `rgba(8,24,30,${alpha})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function drawTitleOverlay(ctx, world, now) {
  drawDim(ctx, 0.62);
  const cx = VIEW_W / 2;
  text(ctx, 'THE COPPER PAN', cx, 252, { size: 64, bold: true, color: C.copperLight, align: 'center' });
  text(ctx, 'a cozy grill-house rush', cx, 300, { size: 21, color: C.cream, align: 'center' });
  const lines = [
    'Tickets land on the order board. Build each dish on the plate —',
    'grill patties, bacon and eggs (start them early!), chop the veg,',
    'stack the layers in order, then ring the bell to serve.',
    'Fast service earns tips; combos multiply your coins.',
    'A ticket that waits too long walks out and costs a star.',
  ];
  lines.forEach((line, i) => {
    text(ctx, line, cx, 368 + i * 26, { size: 17, color: 'rgba(246,234,210,0.92)', align: 'center' });
  });
  const pulse = 0.85 + Math.sin(now * 4) * 0.15;
  fillRr(ctx, cx - 170, 540, 340, 58, 12, C.copper);
  text(ctx, 'CLICK TO OPEN  ·  ENTER', cx, 570, { size: 20, bold: true, color: '#fff6dd', align: 'center', alpha: pulse });
  text(ctx, 'Keys 1–8 pick ingredients · Space serves · Backspace scraps · P pauses', cx, 640, {
    size: 14.5, color: 'rgba(246,234,210,0.7)', align: 'center',
  });
  void world;
}

function drawPauseOverlay(ctx) {
  drawDim(ctx, 0.5);
  text(ctx, 'PAUSED', VIEW_W / 2, 380, { size: 52, bold: true, color: C.cream, align: 'center' });
  text(ctx, 'press P to get back to the grill', VIEW_W / 2, 428, { size: 18, color: 'rgba(246,234,210,0.85)', align: 'center' });
}

function drawOverOverlay(ctx, world) {
  drawDim(ctx, 0.62);
  const cx = VIEW_W / 2;
  fillRr(ctx, cx - 300, 190, 600, 400, 16, C.paper);
  text(ctx, 'DAY DONE!', cx, 248, { size: 42, bold: true, color: C.ink, align: 'center' });
  for (let i = 0; i < BALANCE.startStars; i++) {
    star(ctx, cx - 34 + i * 34, 292, 14, i < world.stars, 'rgba(51,36,26,0.35)');
  }
  text(ctx, `${world.coins} coins`, cx, 348, { size: 38, bold: true, color: C.copperDark, align: 'center' });
  const rows = [
    `Dishes served: ${world.served}`,
    `Tickets lost: ${world.lost}`,
    `Best combo: x${world.bestCombo}`,
  ];
  rows.forEach((row, i) => {
    text(ctx, row, cx, 398 + i * 30, { size: 19, color: C.ink, align: 'center' });
  });
  text(ctx, world.rating, cx, 508, { size: 18, bold: true, color: C.teal, align: 'center' });
  fillRr(ctx, cx - 150, 528, 300, 46, 10, C.copper);
  text(ctx, 'PLAY AGAIN', cx, 552, { size: 18, bold: true, color: '#fff6dd', align: 'center' });
}

// ------------------------------------------------------------ the frame

export function draw(ctx, world, now) {
  ctx.save();
  if (world.shake > 0) {
    const mag = world.shake * 14;
    ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
  }
  drawKitchen(ctx, now);
  drawOrderBoard(ctx, world, now);
  drawGrill(ctx, world, now);
  drawBoardStation(ctx, world, now);
  drawAssembly(ctx, world, now);
  drawPass(ctx, world, now);
  drawBins(ctx);
  drawHud(ctx, world);
  drawPopups(ctx, world);
  if (world.phase === 'title') drawTitleOverlay(ctx, world, now);
  else if (world.phase === 'paused') drawPauseOverlay(ctx);
  else if (world.phase === 'over') drawOverOverlay(ctx, world);
  ctx.restore();
}
