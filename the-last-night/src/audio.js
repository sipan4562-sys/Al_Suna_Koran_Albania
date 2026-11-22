// Prozedurales Sounddesign mit der Web Audio API – keine Audiodateien.
// Räumlicher Klang (HRTF), Verdeckung durch Wände, Hall, dynamische Musik.
import { clamp, rand, pick } from './utils.js';

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.occlusion = null;
    this.music = { dread: 0.5, tension: 0, chase: 0 };
    this.musicTarget = { dread: 0.5, tension: 0, chase: 0 };
    this.heart = { bpm: 70, level: 0, next: 0 };
    this.breath = { level: 0, rate: 0.3, next: 0, inhale: true };
    this.listenerPos = { x: 0, y: 0, z: 0 };
    this.ambientTimer = 3;
    this.hums = [];
    this.loops = new Set();
  }

  init() {
    if (this.ctx) {
      this.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC({ latencyHint: 'interactive' }));
    this.master = ctx.createGain();
    this.master.gain.value = 0.85;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 12;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.25;
    this.master.connect(comp);
    comp.connect(ctx.destination);
    this.sfx = ctx.createGain();
    this.sfx.connect(this.master);
    this.amb = ctx.createGain();
    this.amb.gain.value = 0.9;
    this.amb.connect(this.master);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 0.7;
    this.musicBus.connect(this.master);
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(3.2, 2.6);
    this.reverbIn = ctx.createGain();
    this.reverbIn.gain.value = 1;
    this.reverbIn.connect(this.reverb);
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    this.reverb.connect(wet);
    wet.connect(this.master);
    this.white = this.noiseBuffer('white', 3);
    this.brown = this.noiseBuffer('brown', 4);
    this.pink = this.noiseBuffer('pink', 4);
    this.startAmbience();
    this.startMusic();
    this.ready = true;
    this.resume();
  }

  resume() {
    if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
  }

  suspend() {
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
  }

  setVolumes(master, music) {
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(master, this.ctx.currentTime, 0.05);
    this.musicBus.gain.setTargetAtTime(music * 0.9, this.ctx.currentTime, 0.05);
  }

  get now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  // ------------------------------------------------------------------ Grundlagen
  noiseBuffer(type, seconds) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    let b0 = 0,
      b1 = 0,
      b2 = 0,
      b3 = 0,
      b4 = 0,
      b5 = 0,
      b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (type === 'white') d[i] = w;
      else if (type === 'brown') {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      } else {
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    }
    return buf;
  }

  impulse(seconds, decay) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (i < 800 ? i / 800 : 1);
      }
    }
    return buf;
  }

  noise(buffer = this.white, loop = false, rate = 1) {
    const s = this.ctx.createBufferSource();
    s.buffer = buffer;
    s.loop = loop;
    s.playbackRate.value = rate;
    if (!loop) {
      s.loopStart = 0;
    }
    return s;
  }

  osc(type, freq) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    return o;
  }

  filter(type, freq, Q = 1) {
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = Q;
    return f;
  }

  gain(v = 1) {
    const g = this.ctx.createGain();
    g.gain.value = v;
    return g;
  }

  env(g, t, attack, hold, release, peak = 1) {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
    g.gain.setValueAtTime(Math.max(peak, 0.0002), t + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
    return t + attack + hold + release;
  }

  makePanner(pos, ref = 2, roll = 1.1) {
    const ctx = this.ctx;
    const p = ctx.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'inverse';
    p.refDistance = ref;
    p.rolloffFactor = roll;
    p.maxDistance = 80;
    this.setPannerPos(p, pos);
    return p;
  }

  setPannerPos(p, pos) {
    if (p.positionX) {
      const t = this.ctx.currentTime;
      p.positionX.setTargetAtTime(pos.x, t, 0.02);
      p.positionY.setTargetAtTime(pos.y, t, 0.02);
      p.positionZ.setTargetAtTime(pos.z, t, 0.02);
    } else p.setPosition(pos.x, pos.y, pos.z);
  }

  // Ausgabekette: optional räumlich, verdeckt, mit Hall.
  out(opts = {}) {
    const ctx = this.ctx;
    const input = this.gain(opts.gain ?? 1);
    let node = input;
    let occ = 0;
    if (opts.pos && this.occlusion) occ = this.occlusion(opts.pos);
    let lp = null;
    if (occ > 0.01 || opts.lowpass) {
      lp = this.filter('lowpass', opts.lowpass || 20000);
      if (occ > 0.01) {
        lp.frequency.value = Math.min(lp.frequency.value, 16000 * (1 - occ) + 650 * occ);
        input.gain.value *= 1 - occ * 0.5;
      }
      node.connect(lp);
      node = lp;
    }
    let panner = null;
    if (opts.pos) {
      panner = this.makePanner(opts.pos, opts.ref ?? 2, opts.roll ?? 1.1);
      node.connect(panner);
      panner.connect(opts.bus || this.sfx);
    } else if (opts.pan) {
      const sp = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (sp) {
        sp.pan.value = opts.pan;
        node.connect(sp);
        sp.connect(opts.bus || this.sfx);
      } else node.connect(opts.bus || this.sfx);
    } else node.connect(opts.bus || this.sfx);
    if (opts.reverb) {
      const s = this.gain(opts.reverb * (1 + occ * 0.5));
      node.connect(s);
      s.connect(this.reverbIn);
    }
    return { input, panner, lp };
  }

  updateListener(camera) {
    if (!this.ctx) return;
    const l = this.ctx.listener;
    const p = camera.position;
    this.listenerPos = { x: p.x, y: p.y, z: p.z };
    const f = camera.getWorldDirection(this._v || (this._v = camera.position.clone()));
    const t = this.ctx.currentTime;
    if (l.positionX) {
      l.positionX.setTargetAtTime(p.x, t, 0.02);
      l.positionY.setTargetAtTime(p.y, t, 0.02);
      l.positionZ.setTargetAtTime(p.z, t, 0.02);
      l.forwardX.setTargetAtTime(f.x, t, 0.02);
      l.forwardY.setTargetAtTime(f.y, t, 0.02);
      l.forwardZ.setTargetAtTime(f.z, t, 0.02);
      l.upX.value = 0;
      l.upY.value = 1;
      l.upZ.value = 0;
    } else {
      l.setPosition(p.x, p.y, p.z);
      l.setOrientation(f.x, f.y, f.z, 0, 1, 0);
    }
  }

  // ------------------------------------------------------------------ Effekte
  thump(t, freq, decay, vol, dest, endFreq) {
    const o = this.osc('sine', freq);
    const g = this.gain(0);
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(endFreq || freq * 0.5, t + decay);
    o.connect(g);
    g.connect(dest);
    this.env(g, t, 0.004, 0, decay, vol);
    o.start(t);
    o.stop(t + decay + 0.05);
  }

  burst(t, type, freq, Q, decay, vol, dest, attack = 0.002, buffer) {
    const n = this.noise(buffer || this.white);
    const f = this.filter(type, freq, Q);
    const g = this.gain(0);
    n.connect(f);
    f.connect(g);
    g.connect(dest);
    this.env(g, t, attack, 0, decay, vol);
    const off = Math.random() * 2;
    n.start(t, off);
    n.stop(t + attack + decay + 0.05);
    return f;
  }

  footstep(surface, intensity = 0.6, pan = 0) {
    if (!this.ready) return;
    const t = this.now;
    const o = this.out({ gain: 0.55 * intensity, pan, reverb: 0.12 });
    const d = o.input;
    const v = rand(0.85, 1.15);
    switch (surface) {
      case 'metal':
        this.burst(t, 'bandpass', 2400 * v, 1, 0.05, 0.6, d);
        for (const f of [520, 1310, 2760]) this.burst(t, 'bandpass', f * v, 22, 0.28, 0.5, d);
        this.thump(t, 110, 0.1, 0.5, d);
        break;
      case 'water':
        {
          const f = this.burst(t, 'bandpass', 900, 1.5, 0.22, 0.8, d, 0.01);
          f.frequency.exponentialRampToValueAtTime(3200, t + 0.2);
          for (let k = 0; k < 3; k++) {
            const tt = t + 0.03 + Math.random() * 0.15;
            const s = this.osc('sine', rand(1400, 3200));
            const g = this.gain(0);
            s.frequency.exponentialRampToValueAtTime(rand(600, 1200), tt + 0.05);
            s.connect(g);
            g.connect(d);
            this.env(g, tt, 0.002, 0, 0.05, 0.12);
            s.start(tt);
            s.stop(tt + 0.1);
          }
          this.thump(t, 80, 0.08, 0.3, d);
        }
        break;
      case 'wood':
        this.thump(t, 140 * v, 0.12, 0.7, d, 90);
        this.burst(t, 'bandpass', 650 * v, 4, 0.1, 0.5, d);
        this.burst(t, 'highpass', 4000, 1, 0.02, 0.2, d);
        if (Math.random() < 0.12) this.creak(t + 0.05, d, 0.25, 0.25);
        break;
      case 'soft':
        this.thump(t, 70, 0.1, 0.5, d);
        this.burst(t, 'lowpass', 500, 1, 0.08, 0.4, d);
        break;
      case 'concrete':
        this.thump(t, 90 * v, 0.09, 0.7, d);
        this.burst(t, 'bandpass', 1300 * v, 1.2, 0.07, 0.6, d);
        this.burst(t + 0.01, 'highpass', 3500, 0.8, 0.05, 0.25, d, 0.004, this.pink);
        break;
      default:
        // Fliesen / Linoleum
        this.thump(t, 100 * v, 0.07, 0.55, d);
        this.burst(t, 'bandpass', 2600 * v, 1.3, 0.05, 0.6, d);
        this.burst(t, 'highpass', 6000, 1, 0.015, 0.35, d);
    }
  }

  creak(t, dest, dur = 0.8, vol = 0.5) {
    const o = this.osc('sawtooth', 60);
    const steps = 24;
    const curve = new Float32Array(steps);
    let f = rand(50, 90);
    for (let k = 0; k < steps; k++) {
      f = clamp(f + rand(-25, 30), 30, 170);
      curve[k] = f;
    }
    o.frequency.setValueCurveAtTime(curve, t, dur);
    const b1 = this.filter('bandpass', rand(800, 1100), 9);
    const b2 = this.filter('bandpass', rand(1700, 2300), 12);
    const g = this.gain(0);
    o.connect(b1);
    o.connect(b2);
    b1.connect(g);
    b2.connect(g);
    g.connect(dest);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.15);
    g.gain.setValueAtTime(vol * 0.8, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  doorOpen(pos, fast = false) {
    if (!this.ready) return;
    const t = this.now;
    const o = this.out({ pos, gain: 0.9, reverb: 0.3 });
    this.burst(t, 'bandpass', 3000, 4, 0.03, 0.5, o.input);
    this.burst(t + 0.02, 'bandpass', 1800, 6, 0.04, 0.3, o.input);
    if (!fast) this.creak(t + 0.1, o.input, rand(0.8, 1.3), 0.45);
  }

  doorClose(pos) {
    if (!this.ready) return;
    const t = this.now;
    const o = this.out({ pos, gain: 0.9, reverb: 0.35 });
    this.creak(t, o.input, 0.5, 0.25);
    this.thump(t + 0.45, 75, 0.25, 0.8, o.input);
    this.burst(t + 0.45, 'lowpass', 1500, 1, 0.15, 0.6, o.input);
    this.burst(t + 0.47, 'bandpass', 3200, 5, 0.04, 0.4, o.input);
  }

  doorSlam(pos) {
    if (!this.ready) return;
    const t = this.now;
    const o = this.out({ pos, gain: 1.3, reverb: 0.6, ref: 3 });
    this.thump(t, 70, 0.5, 1, o.input, 35);
    this.burst(t, 'lowpass', 2500, 0.8, 0.35, 0.9, o.input);
    this.burst(t + 0.01, 'bandpass', 3500, 6, 0.08, 0.5, o.input);
    for (let k = 0; k < 4; k++) this.burst(t + 0.08 + k * 0.05, 'bandpass', rand(2000, 4000), 10, 0.05, 0.3, o.input);
  }

  doorLocked(pos) {
    if (!this.ready) return;
    const t = this.now;
    const o = this.out({ pos, gain: 0.8, reverb: 0.2 });
    for (let k = 0; k < 4; k++) {
      const tt = t + k * 0.09 + rand(0, 0.02);
      this.burst(tt, 'bandpass', rand(2500, 3500), 7, 0.04, 0.55, o.input);
      this.thump(tt, 120, 0.05, 0.3, o.input);
    }
  }

  unlock(pos) {
    if (!this.ready) return;
    const t = this.now;
    const o = this.out({ pos, gain: 0.8 });
    this.burst(t, 'bandpass', 4000, 3, 0.18, 0.25, o.input, 0.05);
    this.burst(t + 0.25, 'bandpass', 2800, 8, 0.05, 0.8, o.input);
    this.thump(t + 0.25, 200, 0.06, 0.4, o.input);
  }

  metalClank(pos, vol = 1) {
    if (!this.ready) return;
    const t = this.now;
    const o = this.out({ pos, gain: 0.7 * vol, reverb: 0.3 });
    this.burst(t, 'bandpass', 1600, 1, 0.06, 0.6, o.input);
    for (const f of [380, 910, 1720, 2650]) this.burst(t, 'bandpass', f * rand(0.95, 1.05), 18, 0.45, 0.5, o.input);
    this.thump(t, 140, 0.12, 0.4, o.input);
  }

  lockerOpen(pos) {
    if (!this.ready) return;
    this.metalClank(pos, 0.6);
    const t = this.now;
    const o = this.out({ pos, gain: 0.25 });
    const s = this.osc('sine', 1300);
    s.frequency.exponentialRampToValueAtTime(800, t + 0.3);
    const g = this.gain(0);
    s.connect(g);
    g.connect(o.input);
    this.env(g, t, 0.02, 0.1, 0.2, 0.3);
    s.start(t);
    s.stop(t + 0.4);
  }

  pickup(kind = 'item') {
    if (!this.ready) return;
    const t = this.now;
    const o = this.out({ gain: 0.6, reverb: 0.15 });
    this.burst(t, 'bandpass', 2500, 1.5, 0.12, 0.35, o.input, 0.02, this.pink);
    if (kind === 'key') {
      for (let k = 0; k < 6; k++) {
        const tt = t + 0.05 + Math.random() * 0.25;
        const s = this.osc('sine', rand(3000, 5500));
        const g = this.gain(0);
        s.connect(g);
        g.connect(o.input);
        this.env(g, tt, 0.001, 0, 0.12, 0.15);
        s.start(tt);
        s.stop(tt + 0.15);
      }
    } else {
      this.thump(t + 0.05, 220, 0.08, 0.35, o.input, 160);
    }
  }

  click() {
    if (!this.ready) return;
    const t = this.now;
    const o = this.out({ gain: 0.5 });
    this.burst(t, 'highpass', 5000, 1, 0.01, 0.6, o.input);
    const s = this.osc('square', 1800);
    const g = this.gain(0);
    s.connect(g);
    g.connect(o.input);
    this.env(g, t, 0.001, 0, 0.015, 0.08);
    s.start(t);
    s.stop(t + 0.03);
  }

  battery() {
    if (!this.ready) return;
    const t = this.now;
    const o = this.out({ gain: 0.6 });
    this.burst(t, 'bandpass', 3000, 5, 0.03, 0.6, o.input);
    this.burst(t + 0.25, 'bandpass', 2500, 5, 0.03, 0.6, o.input);
    this.burst(t + 0.5, 'highpass', 5000, 1, 0.01, 0.5, o.input);
  }

  paper() {
    if (!this.ready) return;
    const t = this.now;
    const o = this.out({ gain: 0.5 });
    for (let k = 0; k < 5; k++) this.burst(t + k * 0.06 + rand(0, 0.03), 'bandpass', rand(2000, 5000), 1.2, 0.06, 0.35, o.input, 0.01);
  }

  beep(kind = 'key') {
    if (!this.ready) return;
    const t = this.now;
    const o = this.out({ gain: 0.25 });
    const tones = kind === 'ok' ? [1500, 2000] : kind === 'error' ? [160] : [1250];
    tones.forEach((f, k) => {
      const s = this.osc(kind === 'error' ? 'sawtooth' : 'square', f);
      const g = this.gain(0);
      s.connect(g);
      g.connect(o.input);
      const tt = t + k * 0.12;
      const dur = kind === 'error' ? 0.4 : 0.08;
      this.env(g, tt, 0.003, dur, 0.03, 0.5);
      s.start(tt);
      s.stop(tt + dur + 0.05);
    });
  }

  hurt() {
    if (!this.ready) return;
    const t = this.now;
    const o = this.out({ gain: 1.1, reverb: 0.3 });
    this.thump(t, 60, 0.4, 1, o.input, 30);
    this.burst(t, 'lowpass', 1800, 1, 0.3, 0.9, o.input);
    this.burst(t, 'bandpass', 600, 2, 0.25, 0.6, o.input, 0.002, this.pink);
    this.voice(t + 0.05, o.input, { f0: 210, f1: 150, dur: 0.45, vowel: 'a', vol: 0.4, noise: 0.5 });
  }

  // Formant-Stimme für Schreie, Stöhnen etc.
  voice(t, dest, { f0 = 300, f1 = 200, dur = 1, vowel = 'a', vol = 0.5, vib = 6, vibDepth = 0.03, noise = 0.3, distort = 0 }) {
    const F = {
      a: [800, 1200, 2600],
      e: [500, 1900, 2600],
      i: [320, 2400, 3100],
      o: [480, 900, 2500],
      u: [350, 700, 2400],
    }[vowel];
    const src = this.osc('sawtooth', f0);
    src.frequency.setValueAtTime(f0, t);
    src.frequency.linearRampToValueAtTime(f1, t + dur);
    const lfo = this.osc('sine', vib);
    const lg = this.gain(f0 * vibDepth);
    lfo.connect(lg);
    lg.connect(src.frequency);
    const mix = this.gain(1);
    src.connect(mix);
    if (noise > 0) {
      const n = this.noise(this.white);
      const ng = this.gain(noise);
      n.connect(ng);
      ng.connect(mix);
      n.start(t);
      n.stop(t + dur + 0.1);
    }
    let pre = mix;
    if (distort > 0) {
      const ws = this.ctx.createWaveShaper();
      const c = new Float32Array(256);
      for (let k = 0; k < 256; k++) {
        const x = (k / 255) * 2 - 1;
        c[k] = Math.tanh(x * (1 + distort * 8));
      }
      ws.curve = c;
      mix.connect(ws);
      pre = ws;
    }
    const g = this.gain(0);
    F.forEach((f, k) => {
      const bp = this.filter('bandpass', f, 6 + k * 2);
      pre.connect(bp);
      const bg = this.gain([1, 0.6, 0.35][k]);
      bp.connect(bg);
      bg.connect(g);
    });
    g.connect(dest);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.12, dur * 0.2));
    g.gain.setValueAtTime(vol, t + dur * 0.65);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.start(t);
    src.stop(t + dur + 0.05);
    lfo.start(t);
    lfo.stop(t + dur + 0.05);
  }

  monsterScream(pos) {
    if (!this.ready) return;
    const t = this.now;
    const o = this.out({ pos, gain: 1.6, reverb: 0.9, ref: 4 });
    this.voice(t, o.input, { f0: 340, f1: 520, dur: 0.6, vowel: 'a', vol: 0.8, vib: 9, vibDepth: 0.08, noise: 0.6, distort: 0.8 });
    this.voice(t + 0.5, o.input, { f0: 560, f1: 300, dur: 1.2, vowel: 'i', vol: 0.9, vib: 11, vibDepth: 0.1, noise: 0.8, distort: 1 });
    this.voice(t, o.input, { f0: 95, f1: 70, dur: 1.6, vowel: 'o', vol: 0.6, vib: 4, vibDepth: 0.05, noise: 0.4, distort: 1 });
  }

  monsterGrowl(pos, vol = 1) {
    if (!this.ready) return;
    const t = this.now;
    const o = this.out({ pos, gain: 1.1 * vol, reverb: 0.4, ref: 2.5 });
    this.voice(t, o.input, { f0: rand(70, 95), f1: rand(55, 70), dur: rand(1, 1.8), vowel: pick(['o', 'u', 'a']), vol: 0.8, vib: rand(3, 7), vibDepth: 0.12, noise: 0.9, distort: 1 });
  }

  monsterStep(pos, heavy = 1) {
    if (!this.ready) return;
    const t = this.now;
    const o = this.out({ pos, gain: 0.9 * heavy, reverb: 0.3, ref: 2.5 });
    this.thump(t, 65, 0.18, 0.9, o.input, 35);
    this.burst(t, 'lowpass', 500, 1, 0.12, 0.6, o.input);
    if (Math.random() < 0.35) {
      const f = this.burst(t + 0.1, 'bandpass', 900, 2, 0.3, 0.25, o.input, 0.05);
      f.frequency.linearRampToValueAtTime(1800, t + 0.4);
    }
  }

  monsterAttack(pos) {
    if (!this.ready) return;
    const t = this.now;
    const o = this.out({ pos, gain: 1.3, reverb: 0.4 });
    this.voice(t, o.input, { f0: 220, f1: 420, dur: 0.5, vowel: 'a', vol: 0.9, vib: 14, vibDepth: 0.1, noise: 1, distort: 1 });
    this.burst(t + 0.2, 'bandpass', 1200, 1, 0.25, 0.6, o.input);
  }

  glass(pos) {
    if (!this.ready) return;
    const t = this.now;
    const o = this.out({ pos, gain: 1.1, reverb: 0.6, ref: 3 });
    this.burst(t, 'highpass', 3000, 0.7, 0.25, 0.9, o.input);
    for (let k = 0; k < 9; k++) {
      const tt = t + Math.random() * 0.35;
      const s = this.osc('sine', rand(2500, 7000));
      const g = this.gain(0);
      s.connect(g);
      g.connect(o.input);
      this.env(g, tt, 0.001, 0, rand(0.04, 0.12), 0.25);
      s.start(tt);
      s.stop(tt + 0.15);
    }
    this.thump(t, 300, 0.05, 0.4, o.input, 150);
  }

  ventCrawl(pos) {
    if (!this.ready) return;
    const t = this.now;
    const o = this.out({ pos, gain: 0.7, reverb: 0.4, lowpass: 2500, ref: 3 });
    for (let k = 0; k < 3; k++) {
      const tt = t + k * rand(0.15, 0.3);
      for (const f of [300, 760, 1400]) this.burst(tt, 'bandpass', f * rand(0.9, 1.1), 14, 0.3, 0.4, o.input);
      this.thump(tt, 90, 0.1, 0.5, o.input);
    }
  }

  ventHatch(pos) {
    if (!this.ready) return;
    this.metalClank(pos, 1.3);
    const t = this.now;
    const o = this.out({ pos, gain: 1, reverb: 0.5 });
    this.thump(t + 0.35, 60, 0.4, 1, o.input, 30);
  }

  distantScream() {
    if (!this.ready) return;
    const t = this.now;
    const a = Math.random() * Math.PI * 2;
    const L = this.listenerPos;
    const pos = { x: L.x + Math.cos(a) * 30, y: L.y, z: L.z + Math.sin(a) * 30 };
    const o = this.out({ pos, gain: 0.35, reverb: 1.4, lowpass: 1600, ref: 10 });
    this.voice(t, o.input, { f0: rand(600, 800), f1: rand(380, 500), dur: rand(1.4, 2.2), vowel: pick(['a', 'e', 'i']), vol: 0.7, vib: 6, vibDepth: 0.05, noise: 0.25, distort: 0.2 });
  }

  whisper(pos) {
    if (!this.ready) return;
    const t = this.now;
    const o = this.out({ pos, gain: 0.35, reverb: 0.6 });
    for (let k = 0; k < 6; k++) {
      const tt = t + k * rand(0.12, 0.25);
      const f = this.burst(tt, 'bandpass', pick([1200, 2400, 3200, 4400]), 4, rand(0.08, 0.2), 0.5, o.input, 0.03);
      f.frequency.linearRampToValueAtTime(rand(1500, 4000), tt + 0.15);
    }
  }

  drip(pos) {
    if (!this.ready) return;
    const t = this.now;
    const o = this.out({ pos, gain: 0.35, reverb: 0.8 });
    const s = this.osc('sine', rand(1200, 2200));
    s.frequency.exponentialRampToValueAtTime(rand(400, 700), t + 0.08);
    const g = this.gain(0);
    s.connect(g);
    g.connect(o.input);
    this.env(g, t, 0.001, 0, 0.09, 0.4);
    s.start(t);
    s.stop(t + 0.12);
  }

  groan(pos) {
    if (!this.ready) return;
    const t = this.now;
    const o = this.out({ pos, gain: 0.45, reverb: 1, lowpass: 1500, ref: 6 });
    const n = this.noise(this.brown, true);
    const f = this.filter('bandpass', rand(120, 220), 25);
    f.frequency.linearRampToValueAtTime(rand(60, 120), t + 2.5);
    const g = this.gain(0);
    n.connect(f);
    f.connect(g);
    g.connect(o.input);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1.2, t + 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    n.start(t);
    n.stop(t + 2.7);
  }

  thunder() {
    if (!this.ready) return;
    const t = this.now;
    const o = this.out({ gain: 0.5, reverb: 1, lowpass: 400 });
    const n = this.noise(this.brown);
    const g = this.gain(0);
    n.connect(g);
    g.connect(o.input);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1, t + 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
    n.start(t);
    n.stop(t + 3.6);
  }

  generatorStart(pos) {
    if (!this.ready) return;
    const t = this.now;
    const o = this.out({ pos, gain: 1, reverb: 0.4 });
    const s = this.osc('sawtooth', 12);
    s.frequency.exponentialRampToValueAtTime(48, t + 2.5);
    const f = this.filter('lowpass', 300, 2);
    const g = this.gain(0);
    s.connect(f);
    f.connect(g);
    g.connect(o.input);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.9, t + 1);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3);
    s.start(t);
    s.stop(t + 3.1);
    for (let k = 0; k < 5; k++) this.thump(t + k * 0.35, 50, 0.2, 0.6, o.input);
    // Dauerton
    const loop = this.loopHum(pos, 48, 0.35, 'generator');
    return loop;
  }

  loopHum(pos, freq, vol, id) {
    const o = this.out({ pos, gain: 0, ref: 3, roll: 1.3 });
    const s = this.osc('sawtooth', freq);
    const s2 = this.osc('square', freq * 2);
    const f = this.filter('lowpass', 420, 1);
    const g2 = this.gain(0.2);
    s.connect(f);
    s2.connect(g2);
    g2.connect(f);
    f.connect(o.input);
    const n = this.noise(this.pink, true);
    const nf = this.filter('bandpass', 800, 1);
    const ng = this.gain(0.3);
    n.connect(nf);
    nf.connect(ng);
    ng.connect(o.input);
    s.start();
    s2.start();
    n.start();
    o.input.gain.setTargetAtTime(vol, this.now, 0.8);
    const loop = { id, o, stop: () => { try { s.stop(); s2.stop(); n.stop(); } catch (e) { /* */ } } };
    this.loops.add(loop);
    return loop;
  }

  alarmStart(pos) {
    if (!this.ready) return null;
    const o = this.out({ pos, gain: 0, reverb: 0.6, ref: 8 });
    const s = this.osc('square', 700);
    const lfo = this.osc('square', 1.2);
    const lg = this.gain(150);
    lfo.connect(lg);
    lg.connect(s.frequency);
    const f = this.filter('bandpass', 1100, 1.5);
    s.connect(f);
    f.connect(o.input);
    s.start();
    lfo.start();
    o.input.gain.setTargetAtTime(0.35, this.now, 0.2);
    // nicht-räumlicher Anteil, damit der Alarm überall hörbar ist
    const o2 = this.out({ gain: 0.05, lowpass: 1500 });
    f.connect(o2.input);
    return { stop: () => { try { s.stop(); lfo.stop(); } catch (e) { /* */ } } };
  }

  stinger(kind) {
    if (!this.ready) return;
    const t = this.now;
    const o = this.out({ gain: 0.9, reverb: 0.8, bus: this.musicBus });
    if (kind === 'spot' || kind === 'scare') {
      this.thump(t, 50, 1.2, 1, o.input, 28);
      this.burst(t, 'lowpass', 3000, 0.7, 0.6, 0.8, o.input);
      const fs = kind === 'scare' ? [1567, 1661, 1760, 1864] : [370, 392, 415, 440, 740, 784];
      for (const f of fs) {
        const s = this.osc('sawtooth', f);
        s.frequency.linearRampToValueAtTime(f * (kind === 'scare' ? 1.06 : 0.97), t + 1.5);
        const g = this.gain(0);
        const bp = this.filter('bandpass', f * 1.5, 1);
        s.connect(bp);
        bp.connect(g);
        g.connect(o.input);
        this.env(g, t, 0.01, 0.3, 1.4, 0.12);
        s.start(t);
        s.stop(t + 1.8);
      }
    } else if (kind === 'discover') {
      [659, 783, 987, 1318].forEach((f, k) => {
        const s = this.osc('sine', f);
        const g = this.gain(0);
        s.connect(g);
        g.connect(o.input);
        const tt = t + k * 0.08;
        this.env(g, tt, 0.01, 0.05, 1.8, 0.08);
        s.start(tt);
        s.stop(tt + 2);
      });
    } else if (kind === 'dawn') {
      [261.6, 329.6, 392, 523.3, 659.3].forEach((f) => {
        const s = this.osc('triangle', f);
        const g = this.gain(0);
        s.connect(g);
        g.connect(o.input);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.1, t + 3);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 9);
        s.start(t);
        s.stop(t + 9.2);
      });
    }
  }

  // ------------------------------------------------------------------ Ambience
  startAmbience() {
    const ctx = this.ctx;
    const drone = this.gain(0.0);
    const lp = this.filter('lowpass', 260, 0.7);
    drone.connect(lp);
    lp.connect(this.amb);
    for (const [type, f, v] of [
      ['sine', 41.2, 0.5],
      ['sine', 41.7, 0.4],
      ['triangle', 61.7, 0.25],
      ['sawtooth', 82.4, 0.06],
    ]) {
      const o = this.osc(type, f);
      const g = this.gain(v);
      o.connect(g);
      g.connect(drone);
      o.start();
    }
    const lfo = this.osc('sine', 0.05);
    const lg = this.gain(120);
    lfo.connect(lg);
    lg.connect(lp.frequency);
    lfo.start();
    drone.gain.setTargetAtTime(0.16, ctx.currentTime, 3);
    this.drone = drone;

    const air = this.noise(this.brown, true);
    const af = this.filter('bandpass', 420, 0.6);
    const ag = this.gain(0.0);
    air.connect(af);
    af.connect(ag);
    ag.connect(this.amb);
    air.start();
    const alfo = this.osc('sine', 0.07);
    const alg = this.gain(200);
    alfo.connect(alg);
    alg.connect(af.frequency);
    alfo.start();
    ag.gain.setTargetAtTime(0.12, ctx.currentTime, 3);
    this.air = ag;
  }

  updateAmbience(dt, ctxInfo) {
    if (!this.ready) return;
    this.ambientTimer -= dt;
    if (this.ambientTimer <= 0) {
      this.ambientTimer = rand(5, 13);
      const L = this.listenerPos;
      const r = Math.random();
      const near = { x: L.x + rand(-5, 5), y: L.y + rand(0, 1.5), z: L.z + rand(-5, 5) };
      const far = { x: L.x + rand(-18, 18), y: L.y, z: L.z + rand(-18, 18) };
      if (r < 0.28) this.drip(near);
      else if (r < 0.48) this.groan(far);
      else if (r < 0.6) this.creak(this.now, this.out({ pos: far, gain: 0.5, reverb: 0.7 }).input, rand(0.8, 1.6), 0.3);
      else if (r < 0.7 && ctxInfo.allowScreams) this.distantScream();
      else if (r < 0.78) this.whisper(near);
      else if (r < 0.86) {
        const o = this.out({ pos: far, gain: 0.6, reverb: 1 });
        this.thump(this.now, 55, 0.5, 0.8, o.input, 30);
      } else if (r < 0.92) this.thunder();
      else this.drip(near);
    }
    // Herzschlag
    const h = this.heart;
    if (h.level > 0.02 && this.now >= h.next) {
      const t = Math.max(this.now, h.next);
      const o = this.out({ gain: 0.9 * h.level, lowpass: 300 });
      this.thump(t, 58, 0.12, 1, o.input, 38);
      this.thump(t + 0.24, 50, 0.14, 0.7, o.input, 34);
      h.next = t + 60 / h.bpm;
    } else if (h.level <= 0.02) h.next = this.now;
    // Atmen
    const b = this.breath;
    if (b.level > 0.03 && this.now >= b.next) {
      const t = this.now;
      const dur = b.inhale ? 0.55 / b.rate : 0.7 / b.rate;
      const o = this.out({ gain: 0.45 * b.level });
      const f = this.burst(t, 'bandpass', b.inhale ? 1300 : 900, 1.5, dur * 0.7, 0.6, o.input, dur * 0.3, this.pink);
      f.frequency.linearRampToValueAtTime(b.inhale ? 1700 : 700, t + dur);
      b.next = t + dur + 0.08;
      b.inhale = !b.inhale;
    }
  }

  setHeart(level, bpm) {
    this.heart.level = level;
    this.heart.bpm = bpm;
  }
  setBreath(level, rate) {
    this.breath.level = level;
    this.breath.rate = rate;
  }

  // ------------------------------------------------------------------ Musik
  startMusic() {
    const ctx = this.ctx;
    // Schicht 1: Grundangst (Pad)
    this.padGain = this.gain(0);
    const padLP = this.filter('lowpass', 500, 0.8);
    this.padGain.connect(padLP);
    padLP.connect(this.musicBus);
    const plfo = this.osc('sine', 0.03);
    const plg = this.gain(250);
    plfo.connect(plg);
    plg.connect(padLP.frequency);
    plfo.start();
    this.padVoices = [];
    for (let k = 0; k < 4; k++) {
      const a = this.osc('sawtooth', 110);
      const b = this.osc('sawtooth', 110);
      b.detune.value = 9;
      a.detune.value = -7;
      const g = this.gain(0.05);
      a.connect(g);
      b.connect(g);
      g.connect(this.padGain);
      a.start();
      b.start();
      this.padVoices.push([a, b]);
    }
    this.chords = [
      [73.4, 110, 174.6, 164.8],
      [69.3, 103.8, 164.8, 155.6],
      [65.4, 98, 155.6, 146.8],
      [73.4, 116.5, 174.6, 185],
    ];
    this.chordIdx = 0;
    this.chordTimer = 0;
    this.setChord(0);

    // Schicht 2: Spannung (Streicher-Cluster + Puls)
    this.tensionGain = this.gain(0);
    const tf = this.filter('bandpass', 1800, 0.7);
    const trem = this.gain(1);
    const tl = this.osc('sine', 6.5);
    const tlg = this.gain(0.5);
    tl.connect(tlg);
    tlg.connect(trem.gain);
    tl.start();
    tf.connect(trem);
    trem.connect(this.tensionGain);
    this.tensionGain.connect(this.musicBus);
    for (const f of [987.8, 1046.5, 1108.7, 1174.7]) {
      const o = this.osc('sawtooth', f);
      const g = this.gain(0.035);
      o.connect(g);
      g.connect(tf);
      o.start();
    }
    const pulse = this.osc('sine', 36.7);
    const pg = this.gain(0);
    const pl = this.osc('sine', 1.1);
    const plg2 = this.gain(0.5);
    pl.connect(plg2);
    plg2.connect(pg.gain);
    pulse.connect(pg);
    pg.connect(this.tensionGain);
    pulse.start();
    pl.start();

    // Schicht 3: Verfolgung (Percussion, sequenziert)
    this.chaseGain = this.gain(0);
    this.chaseGain.connect(this.musicBus);
    this.seq = { next: ctx.currentTime + 0.1, step: 0, bpm: 138 };
  }

  setChord(i) {
    const c = this.chords[i % this.chords.length];
    const t = this.now;
    this.padVoices.forEach(([a, b], k) => {
      a.frequency.setTargetAtTime(c[k], t, 2.5);
      b.frequency.setTargetAtTime(c[k], t, 2.5);
    });
  }

  setMusicState(dread, tension, chase) {
    this.musicTarget.dread = dread;
    this.musicTarget.tension = tension;
    this.musicTarget.chase = chase;
  }

  updateMusic(dt) {
    if (!this.ready) return;
    const t = this.now;
    const m = this.music;
    const T = this.musicTarget;
    const k = 1 - Math.exp(-dt * 1.5);
    m.dread += (T.dread - m.dread) * k;
    m.tension += (T.tension - m.tension) * (1 - Math.exp(-dt * 2));
    m.chase += (T.chase - m.chase) * (1 - Math.exp(-dt * (T.chase > m.chase ? 6 : 0.8)));
    this.padGain.gain.setTargetAtTime(m.dread * 0.5 * (1 - m.chase * 0.5), t, 0.1);
    this.tensionGain.gain.setTargetAtTime(m.tension * 0.35, t, 0.1);
    this.chaseGain.gain.setTargetAtTime(m.chase * 0.75, t, 0.05);
    this.chordTimer += dt;
    if (this.chordTimer > 14) {
      this.chordTimer = 0;
      this.chordIdx++;
      this.setChord(this.chordIdx);
    }
    // Sequenzer der Verfolgungsmusik
    if (m.chase > 0.02) {
      const s = this.seq;
      const stepDur = 60 / s.bpm / 4;
      while (s.next < t + 0.12) {
        const st = s.step % 16;
        const tt = s.next;
        if (st === 0 || st === 6 || st === 10) this.thump(tt, 120, 0.25, 0.9, this.chaseGain, 38);
        if (st === 4 || st === 12) {
          this.burst(tt, 'bandpass', 1800, 0.8, 0.12, 0.5, this.chaseGain);
          this.thump(tt, 200, 0.08, 0.4, this.chaseGain, 120);
        }
        if (st % 2 === 1) this.burst(tt, 'highpass', 7000, 1, 0.03, 0.15, this.chaseGain);
        if (s.step % 32 === 0) {
          for (const f of [233, 247, 466, 494]) {
            const o = this.osc('sawtooth', f);
            o.frequency.linearRampToValueAtTime(f * 1.12, tt + stepDur * 16);
            const g = this.gain(0);
            const bp = this.filter('bandpass', f * 2, 1.5);
            o.connect(bp);
            bp.connect(g);
            g.connect(this.chaseGain);
            g.gain.setValueAtTime(0.0001, tt);
            g.gain.exponentialRampToValueAtTime(0.09, tt + stepDur * 14);
            g.gain.exponentialRampToValueAtTime(0.0001, tt + stepDur * 16);
            o.start(tt);
            o.stop(tt + stepDur * 16 + 0.05);
          }
        }
        s.next += stepDur;
        s.step++;
      }
    } else this.seq.next = t + 0.05;
  }

  // Leises elektrisches Brummen flackernder Lampen.
  setHums(sources) {
    if (!this.ready) return;
    while (this.hums.length < 2) {
      const o = this.out({ pos: { x: 0, y: 0, z: 0 }, gain: 0, ref: 1.5, roll: 1.6 });
      const s = this.osc('sawtooth', 50);
      const f = this.filter('bandpass', 100, 2);
      const f2 = this.filter('bandpass', 2400, 3);
      const g2 = this.gain(0.15);
      s.connect(f);
      s.connect(f2);
      f2.connect(g2);
      f.connect(o.input);
      g2.connect(o.input);
      s.start();
      this.hums.push(o);
    }
    this.hums.forEach((h, k) => {
      const src = sources[k];
      if (src) {
        this.setPannerPos(h.panner, src.pos);
        h.input.gain.setTargetAtTime(src.level * 0.25, this.now, 0.03);
      } else h.input.gain.setTargetAtTime(0, this.now, 0.1);
    });
  }

  stopLoops() {
    for (const l of this.loops) l.stop();
    this.loops.clear();
  }
}

// Kontinuierliche Monsterstimme (Atmen/Knurren), folgt der Monsterposition.
export class MonsterVoice {
  constructor(audio) {
    this.audio = audio;
    this.o = null;
  }
  ensure() {
    const a = this.audio;
    if (this.o || !a.ready) return;
    this.o = a.out({ pos: { x: 0, y: 0, z: 0 }, gain: 0, reverb: 0.25, ref: 2, roll: 1.2 });
    const n = a.noise(a.pink, true);
    const f = a.filter('bandpass', 420, 2.5);
    this.am = a.gain(0.5);
    n.connect(f);
    f.connect(this.am);
    this.am.connect(this.o.input);
    const lfo = a.osc('sine', 0.45);
    const lg = a.gain(0.5);
    lfo.connect(lg);
    lg.connect(this.am.gain);
    this.lfo = lfo;
    const growl = a.osc('sawtooth', 52);
    const gf = a.filter('lowpass', 380, 3);
    this.growlGain = a.gain(0.0);
    growl.connect(gf);
    gf.connect(this.growlGain);
    this.growlGain.connect(this.o.input);
    n.start();
    lfo.start();
    growl.start();
  }
  update(pos, level, aggressive, occl) {
    this.ensure();
    if (!this.o) return;
    const a = this.audio;
    a.setPannerPos(this.o.panner, pos);
    this.o.input.gain.setTargetAtTime(level * (1 - occl * 0.5), a.now, 0.1);
    this.lfo.frequency.setTargetAtTime(aggressive ? 1.1 : 0.42, a.now, 0.3);
    this.growlGain.gain.setTargetAtTime(aggressive ? 0.35 : 0.08, a.now, 0.2);
  }
}
