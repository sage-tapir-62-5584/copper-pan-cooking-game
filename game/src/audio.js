// audio.js — every sound in The Copper Pan is synthesised with WebAudio:
// no audio files, nothing to load. The context is created lazily on the
// first user gesture (browsers refuse one before that), and each method
// is a tiny recipe of oscillators and filtered noise.

export class SoundKit {
  constructor() {
    this.ctx = null;
    this.master = null;
  }

  // Call from any click or key handler so the context unlocks.
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    this.ctx = new AudioCtor();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
  }

  tone(freq, dur, { type = 'sine', gain = 0.2, slideTo = null, delay = 0 } = {}) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    amp.gain.setValueAtTime(0, t0);
    amp.gain.linearRampToValueAtTime(gain, t0 + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(amp).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  noise(dur, { freq = 3000, q = 0.8, gain = 0.15, delay = 0, type = 'bandpass' } = {}) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const amp = this.ctx.createGain();
    amp.gain.setValueAtTime(gain, t0);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(amp).connect(this.master);
    src.start(t0);
  }

  // An ingredient landing on the plate.
  pop() {
    this.tone(320, 0.09, { type: 'triangle', gain: 0.25, slideTo: 540 });
  }

  // The knife coming down on the chopping board.
  chop() {
    this.noise(0.05, { freq: 1800, gain: 0.3 });
    this.tone(140, 0.06, { type: 'square', gain: 0.12, slideTo: 90 });
  }

  // Something hits the hot grill.
  sizzle() {
    this.noise(0.45, { freq: 5200, gain: 0.1 });
    this.noise(0.3, { freq: 3400, gain: 0.07, delay: 0.08 });
  }

  // A grill item reaching done — a soft two-note "ready".
  ready() {
    this.tone(880, 0.1, { type: 'sine', gain: 0.16 });
    this.tone(1318, 0.14, { type: 'sine', gain: 0.16, delay: 0.09 });
  }

  // The pass bell when a dish is served.
  ding() {
    this.tone(1568, 0.5, { type: 'sine', gain: 0.22 });
    this.tone(2093, 0.35, { type: 'sine', gain: 0.1 });
    this.tone(2637, 0.2, { type: 'sine', gain: 0.05 });
  }

  // Coins landing in the till.
  coin() {
    this.tone(988, 0.08, { type: 'square', gain: 0.1 });
    this.tone(1319, 0.16, { type: 'square', gain: 0.1, delay: 0.07 });
  }

  // A refused action: bin full, no match at the bell, burnt food.
  error() {
    this.tone(160, 0.18, { type: 'sawtooth', gain: 0.14, slideTo: 110 });
  }

  // A ticket walked out.
  walkout() {
    this.tone(392, 0.16, { type: 'triangle', gain: 0.18 });
    this.tone(330, 0.16, { type: 'triangle', gain: 0.18, delay: 0.14 });
    this.tone(262, 0.3, { type: 'triangle', gain: 0.18, delay: 0.28 });
  }

  // The plate goes in the trash.
  scrap() {
    this.noise(0.16, { freq: 700, gain: 0.2, type: 'lowpass' });
    this.tone(220, 0.12, { type: 'triangle', gain: 0.12, slideTo: 130 });
  }
}
