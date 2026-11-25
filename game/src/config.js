// config.js — every piece of design data for The Copper Pan lives here:
// canvas size, the colour palette, the ingredient bins, the recipe book,
// the day's balance numbers and the screen layout the renderer and the
// input handler both read. No logic lives in this file.

// The canvas is a fixed logical size; CSS scales it to the window.
export const VIEW_W = 1280;
export const VIEW_H = 800;

// Warm flat-illustration palette: deep teal walls, copper metal, cream paper.
export const PALETTE = {
  wallTop: '#175263',
  wallBottom: '#0e3542',
  wallTrim: '#c97b4a',
  counterTop: '#a06a42',
  counterFace: '#7c4f2e',
  counterEdge: '#e0aa72',
  boardWood: '#5d3d24',
  boardDark: '#2a1c10',
  paper: '#fff4d6',
  paperEdge: '#d9b878',
  ink: '#33241a',
  cream: '#f6ead2',
  copper: '#c97b4a',
  copperLight: '#eda96a',
  copperDark: '#9a5527',
  brass: '#e8b34b',
  teal: '#1d6a72',
  good: '#7ac74f',
  warn: '#f2b13c',
  bad: '#e4572e',
  grillMetal: '#3a3f45',
  grillDark: '#22262b',
  flame: '#ff9a3c',
};

// How an ingredient behaves when its bin is picked:
//   station 'plate' — lands on the assembly plate at once
//   station 'grill' — goes on the grill and cooks for cookTime seconds,
//                     then burns after burnTime more seconds
//   station 'board' — goes on the chopping board and needs chopClicks clicks
// key is the number key that picks the bin.
export const INGREDIENTS = [
  { id: 'bun',     name: 'Bun',     key: '1', station: 'plate' },
  { id: 'patty',   name: 'Patty',   key: '2', station: 'grill', cookTime: 6,  burnTime: 5 },
  { id: 'cheese',  name: 'Cheese',  key: '3', station: 'plate' },
  { id: 'tomato',  name: 'Tomato',  key: '4', station: 'board', chopClicks: 3 },
  { id: 'lettuce', name: 'Lettuce', key: '5', station: 'board', chopClicks: 3 },
  { id: 'bacon',   name: 'Bacon',   key: '6', station: 'grill', cookTime: 5,  burnTime: 5 },
  { id: 'egg',     name: 'Egg',     key: '7', station: 'grill', cookTime: 4,  burnTime: 4 },
  { id: 'onion',   name: 'Onion',   key: '8', station: 'board', chopClicks: 2 },
];

export const INGREDIENT_BY_ID = Object.fromEntries(INGREDIENTS.map((ing) => [ing.id, ing]));

// The recipe book. layers run bottom to top and the plate must match them
// exactly, in order. kind decides how the finished dish is drawn and served:
// 'burger' stacks between buns, 'plate' is a breakfast plate, 'bowl' a salad.
// unlockAt is the elapsed second of the day from which tickets may ask for it.
export const RECIPES = [
  { id: 'classic',  name: 'Classic Burger',  kind: 'burger', price: 12, unlockAt: 0,
    layers: ['bun', 'patty', 'cheese', 'bun'] },
  { id: 'salad',    name: 'Garden Salad',    kind: 'bowl',   price: 11, unlockAt: 0,
    layers: ['lettuce', 'tomato', 'onion'] },
  { id: 'garden',   name: 'Garden Burger',   kind: 'burger', price: 15, unlockAt: 25,
    layers: ['bun', 'lettuce', 'patty', 'tomato', 'bun'] },
  { id: 'melt',     name: 'Bacon Melt',      kind: 'burger', price: 16, unlockAt: 40,
    layers: ['bun', 'patty', 'bacon', 'cheese', 'bun'] },
  { id: 'breakfast', name: 'Breakfast Plate', kind: 'plate', price: 14, unlockAt: 55,
    layers: ['egg', 'bacon', 'tomato'] },
  { id: 'double',   name: 'Double Stack',    kind: 'burger', price: 19, unlockAt: 70,
    layers: ['bun', 'patty', 'cheese', 'patty', 'cheese', 'bun'] },
  { id: 'sunrise',  name: 'Sunrise Burger',  kind: 'burger', price: 17, unlockAt: 85,
    layers: ['bun', 'egg', 'bacon', 'cheese', 'bun'] },
];

export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((r) => [r.id, r]));

// Day balance: one day of service, and how the rush builds.
export const BALANCE = {
  dayLength: 120,          // seconds of service
  startStars: 3,           // a ticket that walks out costs one star
  maxTickets: 4,           // order board slots
  grillSlots: 3,
  passSlots: 2,            // finished plates waiting at the pass
  passHoldTime: 1.1,       // seconds a served plate sits at the pass
  firstTicketDelay: 0.8,
  spawnStart: 8.5,         // seconds between tickets at the day's start
  spawnEnd: 4.2,           // ... and at its end
  patienceStart: 52,       // seconds a ticket waits at the day's start
  patienceEnd: 30,         // ... and at its end
  tipFraction: 0.5,        // tip is up to this share of the price, by patience left
  comboStep: 0.25,         // each combo step adds this to the serve multiplier
  comboCap: 8,             // combo steps counted toward the multiplier
  maxPlateLayers: 7,
};

// Screen layout, in logical pixels. The renderer draws these regions and
// the input handler hit-tests the same numbers, so they live in one place.
export const LAYOUT = {
  hud:        { x: 0,    y: 0,   w: 1280, h: 58 },
  board:      { x: 24,   y: 70,  w: 1232, h: 168 },
  ticketW: 292,
  ticketH: 148,
  ticketGap: 18,
  grill:      { x: 36,   y: 300, w: 380, h: 218 },
  grillSlotW: 108,
  plate:      { x: 452,  y: 292, w: 376, h: 226 },   // assembly station incl. buttons
  plateCx: 640,
  plateBaseY: 452,                                    // where the stack's bottom sits
  boardStation: { x: 864, y: 300, w: 380, h: 118 },   // chopping board
  pass:       { x: 864,  y: 434, w: 380, h: 84 },     // serving pass under the board
  bins:       { x: 24,   y: 636, w: 1232, h: 140 },
  binW: 140,
  binH: 116,
  binGap: 12,
};

// Where ticket i sits on the order board.
export function ticketRect(i) {
  const totalW = LAYOUT.ticketW * 4 + LAYOUT.ticketGap * 3;
  const x0 = (VIEW_W - totalW) / 2;
  return { x: x0 + i * (LAYOUT.ticketW + LAYOUT.ticketGap), y: LAYOUT.board.y + 10, w: LAYOUT.ticketW, h: LAYOUT.ticketH };
}

// Where grill slot i sits inside the grill station.
export function grillSlotRect(i) {
  const g = LAYOUT.grill;
  const totalW = LAYOUT.grillSlotW * BALANCE.grillSlots + 16 * (BALANCE.grillSlots - 1);
  const x0 = g.x + (g.w - totalW) / 2;
  return { x: x0 + i * (LAYOUT.grillSlotW + 16), y: g.y + 56, w: LAYOUT.grillSlotW, h: 108 };
}

// Where ingredient bin i sits in the bottom row.
export function binRect(i) {
  const b = LAYOUT.bins;
  const totalW = LAYOUT.binW * INGREDIENTS.length + LAYOUT.binGap * (INGREDIENTS.length - 1);
  const x0 = b.x + (b.w - totalW) / 2;
  return { x: x0 + i * (LAYOUT.binW + LAYOUT.binGap), y: b.y + 12, w: LAYOUT.binW, h: LAYOUT.binH };
}
