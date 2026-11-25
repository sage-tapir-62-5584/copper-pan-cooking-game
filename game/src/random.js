// random.js — a small seeded random number generator (mulberry32) so a
// staged screenshot or a replayed day always deals the same tickets.
// The live game seeds it from the clock; the screenshot staging seeds it
// from the URL, which is what makes the staged scenes deterministic.

export function makeRng(seed) {
  let state = (seed >>> 0) || 1;
  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A float in [min, max).
export function randRange(rng, min, max) {
  return min + rng() * (max - min);
}

// An integer in [min, max], both ends included.
export function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

// One element of a non-empty array.
export function pickRandom(rng, list) {
  return list[Math.floor(rng() * list.length)];
}
