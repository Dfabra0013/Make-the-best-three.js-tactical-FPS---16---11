// audio.js — every sound is synthesised at run time from noise and short oscillator envelopes.

export class AudioEngine {
 constructor() {
  this.ctx = null;
  this.master = null;
  this.listener = { x: 0, z: 0 };
  this.muted = false;
  this.noiseBuffer = null;
 }

 start() {
  if (this.ctx) {
   if (this.ctx.state === 'suspended') this.ctx.resume();
   return;
  }
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  this.ctx = ctx;
  this.master = ctx.createGain();
  this.master.gain.value = 0.55;
  this.comp = ctx.createDynamicsCompressor();
  this.comp.threshold.value = -16;
  this.comp.ratio.value = 6;
  this.master.connect(this.comp);
  this.comp.connect(ctx.destination);
  this.noiseBuffer = makeNoise(ctx, 1.2);
  this.room = makeRoom(ctx, 1.6);
  this.roomGain = ctx.createGain();
  this.roomGain.gain.value = 0.16;
  this.room.connect(this.roomGain);
  this.roomGain.connect(this.master);
 }

 get ready() {
  return !!this.ctx && this.ctx.state === 'running';
 }

 setListener(x, z) {
  this.listener.x = x;
  this.listener.z = z;
 }

 spatial(x, z, gainValue) {
  const ctx = this.ctx;
  const g = ctx.createGain();
  g.gain.value = gainValue;
  const pan = ctx.createStereoPanner();
  const rel = Math.max(-1, Math.min(1, (x - this.listener.x) / 26));
  pan.pan.value = rel;
  g.connect(pan);
  pan.connect(this.master);
  let roomGain = null;
  if (this.room) {
   roomGain = ctx.createGain();
   roomGain.gain.value = 0.5;
   pan.connect(roomGain);
   roomGain.connect(this.room);
  }
  return { gain: g, pan };
 }

 // --- the guns -----------------------------------------------------------------
 shoot(weapon, x, z, distance) {
  if (!this.ready) return;
  const ctx = this.ctx;
  const at = Math.max(0.05, 1 - distance / 90);
  const bus = this.spatial(x ?? 0, z ?? 0, at * 0.9);
  const now = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = this.noiseBuffer;
  src.playbackRate.value = 0.8 + Math.random() * 0.3;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  const tone = weapon?.sound?.tone ?? 'crack';
  filter.frequency.setValueAtTime(tone === 'heavy' ? 1100 : tone === 'sniper' ? 1800 : 2600, now);
  filter.frequency.exponentialRampToValueAtTime(240, now + 0.16);
  filter.Q.value = 4;
  const env = ctx.createGain();
  const decay = weapon?.sound?.decay ?? 0.15;
  env.gain.setValueAtTime(0.9, now);
  env.gain.exponentialRampToValueAtTime(0.001, now + decay + 0.18);
  src.connect(filter);
  filter.connect(env);
  env.connect(bus.gain);
  src.start(now);
  src.stop(now + decay + 0.24);
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  const base = weapon?.sound?.freq ?? 150;
  osc.frequency.setValueAtTime(base, now);
  osc.frequency.exponentialRampToValueAtTime(base * 0.4, now + 0.12);
  const oenv = ctx.createGain();
  oenv.gain.setValueAtTime(0.5, now);
  oenv.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
  osc.connect(oenv);
  oenv.connect(bus.gain);
  osc.start(now);
  osc.stop(now + 0.16);
 }

 hitConfirm(kill) {
  if (!this.ready) return;
  const ctx = this.ctx;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(kill ? 620 : 880, now);
  osc.frequency.exponentialRampToValueAtTime(kill ? 300 : 640, now + 0.07);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.14, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
  osc.connect(g);
  g.connect(this.master);
  osc.start(now);
  osc.stop(now + 0.1);
 }

 // --- footsteps, the tell in a tactical round --------------------------------------
 step(x, z, loud = 1) {
  if (!this.ready) return;
  const ctx = this.ctx;
  const bus = this.spatial(x, z, 0.12 * loud);
  const now = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = this.noiseBuffer;
  src.playbackRate.value = 1.6;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 1400 + Math.random() * 500;
  f.Q.value = 1.6;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.5, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
  src.connect(f); f.connect(g); g.connect(bus.gain);
  src.start(now, Math.random() * 0.5, 0.08);
  return;
 }

 reloadClick() {
  this.click(0.08, 900);
 }
 emptyClick() {
  this.click(0.06, 1600);
 }
 click(gain, freq) {
  if (!this.ready) return;
  const ctx = this.ctx;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.0005, now + 0.03);
  osc.connect(g);
  g.connect(this.master);
  osc.start(now);
  osc.stop(now + 0.035);
 }

 // --- the round's own sounds ------------------------------------------------------
 beep(freq = 880, dur = 0.09, gain = 0.1) {
  if (!this.ready) return;
  const ctx = this.ctx;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.0005, now + dur);
  osc.connect(g);
  g.connect(this.master);
  osc.start(now);
  osc.stop(now + dur + 0.02);
 }

 explosion(x, z) {
  if (!this.ready) return;
  const ctx = this.ctx;
  const bus = this.spatial(x, z, 0.9);
  const now = ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = this.noiseBuffer;
  src.playbackRate.value = 0.55;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(900, now);
  f.frequency.exponentialRampToValueAtTime(90, now + 0.7);
  const g = ctx.createGain();
  g.gain.setValueAtTime(1, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
  src.connect(f); f.connect(g); g.connect(bus.gain);
  src.start(now);
  src.stop(now + 0.95);
 }

 flash(x, z) {
  if (!this.ready) return;
  const ctx = this.ctx;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(2400, now);
  osc.frequency.exponentialRampToValueAtTime(400, now + 0.5);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.15, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
  osc.connect(g);
  g.connect(this.master);
  osc.start(now);
  osc.stop(now + 0.6);
 }

 sting(win) {
  if (!this.ready) return;
  const ctx = this.ctx;
  const now = ctx.currentTime;
  const notes = win ? [392, 587] : [330, 220];
  notes.forEach((f, i) => {
   const osc = ctx.createOscillator();
   osc.type = 'triangle';
   osc.frequency.value = f;
   const g = ctx.createGain();
   const t = now + i * 0.16;
   g.gain.setValueAtTime(0.0001, t);
   g.gain.exponentialRampToValueAtTime(0.14, t + 0.02);
   g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
   osc.connect(g);
   g.connect(this.master);
   osc.start(t);
   osc.stop(t + 0.55);
  });
 }
}

function makeNoise(ctx, seconds) {
 const len = Math.floor(ctx.sampleRate * seconds);
 const buf = ctx.createBuffer(1, len, ctx.sampleRate);
 const data = buf.getChannelData(0);
 let last = 0;
 for (let i = 0; i < len; i++) {
  const white = Math.random() * 2 - 1;
  last = (last + 0.02 * white) / 1.02;
  data[i] = white * 0.7 + last * 3;
 }
 return buf;
}

function makeRoom(ctx, seconds) {
 const len = Math.floor(ctx.sampleRate * seconds);
 const buf = ctx.createBuffer(2, len, ctx.sampleRate);
 for (let ch = 0; ch < 2; ch++) {
  const data = buf.getChannelData(ch);
  for (let i = 0; i < len; i++) {
   const t = i / len;
   data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.6) * 0.5;
  }
 }
 const conv = ctx.createConvolver();
 conv.buffer = buf;
 return conv;
}
