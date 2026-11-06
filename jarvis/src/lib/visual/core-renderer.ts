/**
 * Holografischer JARVIS-Kern – eigener Canvas-2D-Renderer.
 *
 * Ebenen (außen → innen): Skalenring mit Beschriftung, Segmentbögen,
 * gestrichelter Ring, audioreaktives Spektrum, leuchtender Innenring mit
 * Scanner, rotierende 3D-Partikelkugel und Kernglühen.
 *
 * Läuft unabhängig von React per requestAnimationFrame; Zustandswechsel
 * werden weich interpoliert. Pausiert automatisch, wenn unsichtbar.
 */

export type CorePhase = "idle" | "listening" | "thinking" | "responding" | "speaking" | "error";

export interface LevelSource {
  input: number;
  output: number;
  outputIsReal: boolean;
  lastBoundary: number;
}

export interface CoreRendererOptions {
  variant: "full" | "mini";
  reducedMotion: boolean;
  levels: LevelSource;
  /** CSS-Schriftfamilie für Beschriftungen (z. B. aus --font-rajdhani). */
  labelFont?: string;
}

interface Look {
  hue: number;
  sat: number;
  energy: number;
  spin: number;
  breath: number;
  rings: number;
  scan: number;
  swirl: number;
}

const LOOKS: Record<CorePhase, Look> = {
  idle: { hue: 189, sat: 95, energy: 0.3, spin: 0.16, breath: 0.035, rings: 0.6, scan: 0, swirl: 0 },
  listening: { hue: 184, sat: 100, energy: 0.85, spin: 0.3, breath: 0.015, rings: 0.95, scan: 0, swirl: 0 },
  thinking: { hue: 198, sat: 96, energy: 0.62, spin: 1.2, breath: 0.03, rings: 0.85, scan: 1, swirl: 1 },
  responding: { hue: 187, sat: 100, energy: 0.78, spin: 0.5, breath: 0.02, rings: 0.85, scan: 0.25, swirl: 0.2 },
  speaking: { hue: 182, sat: 100, energy: 1, spin: 0.38, breath: 0.015, rings: 1, scan: 0, swirl: 0 },
  error: { hue: 352, sat: 92, energy: 0.6, spin: 0.22, breath: 0.06, rings: 0.8, scan: 0, swirl: 0 },
};

const TAU = Math.PI * 2;
const LABELS = ["NEURAL LINK", "J.A.R.V.I.S.", "CORE · 01", "SYNC"];
const SEGMENTS: Array<[number, number]> = [
  [0.05, 1.15],
  [1.55, 0.42],
  [2.3, 1.35],
  [4.05, 0.62],
  [5.0, 0.95],
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function hueLerp(a: number, b: number, t: number) {
  let d = b - a;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return (a + d * t + 360) % 360;
}

export class CoreRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly opts: CoreRendererOptions;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private phase: CorePhase = "idle";
  private look: Look = { ...LOOKS.idle };
  private level = 0;
  private time = 0;
  private last = 0;
  private frameId = 0;
  private running = false;
  private visible = true;
  private flicker = 0;

  private readonly count: number;
  private readonly base: Float32Array;
  private readonly seed: Float32Array;
  private readonly px: Float32Array;
  private readonly py: Float32Array;
  private readonly pz: Float32Array;
  private readonly bars: Float32Array;
  private rotY = 0;
  private ringAngles = [0, 0, 0, 0];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    options: CoreRendererOptions,
  ) {
    const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
    if (!ctx) throw new Error("Canvas 2D nicht verfügbar");
    this.ctx = ctx;
    this.opts = options;

    this.count = options.variant === "mini" ? 140 : 720;
    this.base = new Float32Array(this.count * 3);
    this.seed = new Float32Array(this.count);
    this.px = new Float32Array(this.count);
    this.py = new Float32Array(this.count);
    this.pz = new Float32Array(this.count);
    this.bars = new Float32Array(options.variant === "mini" ? 0 : 84);

    // Fibonacci-Kugel: gleichmäßig verteilte Punkte.
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < this.count; i++) {
      const y = 1 - (i / (this.count - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = golden * i;
      this.base[i * 3] = Math.cos(theta) * radius;
      this.base[i * 3 + 1] = y;
      this.base[i * 3 + 2] = Math.sin(theta) * radius;
      this.seed[i] = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    }
  }

  setPhase(phase: CorePhase) {
    if (phase === "error" && this.phase !== "error") this.flicker = 1;
    this.phase = phase;
    if (!this.running) this.drawOnce();
  }

  setVisible(visible: boolean) {
    this.visible = visible;
    if (visible && this.running && !this.frameId) {
      this.last = performance.now();
      this.frameId = requestAnimationFrame(this.frame);
    }
  }

  resize(cssWidth: number, cssHeight: number) {
    const dpr = Math.min(window.devicePixelRatio || 1, this.opts.variant === "mini" ? 2 : 2);
    this.dpr = dpr;
    this.width = Math.max(1, Math.round(cssWidth * dpr));
    this.height = Math.max(1, Math.round(cssHeight * dpr));
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.drawOnce();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.frameId = requestAnimationFrame(this.frame);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.frameId);
    this.frameId = 0;
  }

  destroy() {
    this.stop();
  }

  private frame = (now: number) => {
    this.frameId = 0;
    if (!this.running || !this.visible) return;
    const dt = Math.min(0.05, Math.max(0.001, (now - this.last) / 1000));
    this.last = now;
    this.update(dt, now);
    this.draw();
    this.frameId = requestAnimationFrame(this.frame);
  };

  private drawOnce() {
    if (this.width > 1) {
      this.update(0.016, performance.now());
      this.draw();
    }
  }

  private syntheticSpeech(now: number) {
    const t = this.time;
    const syllables = Math.abs(Math.sin(t * 8.7)) * Math.abs(Math.sin(t * 2.3 + 0.7));
    const boundary = Math.exp(-Math.max(0, now - this.opts.levels.lastBoundary) / 140);
    return Math.min(1, 0.32 + syllables * 0.5 + boundary * 0.3);
  }

  private update(dt: number, now: number) {
    const motion = this.opts.reducedMotion ? 0.25 : 1;
    this.time += dt * motion;

    // Zustandswechsel weich einblenden.
    const target = LOOKS[this.phase];
    const k = 1 - Math.exp(-dt * 3.2);
    const l = this.look;
    l.hue = hueLerp(l.hue, target.hue, k);
    l.sat = lerp(l.sat, target.sat, k);
    l.energy = lerp(l.energy, target.energy, k);
    l.spin = lerp(l.spin, target.spin, k);
    l.breath = lerp(l.breath, target.breath, k);
    l.rings = lerp(l.rings, target.rings, k);
    l.scan = lerp(l.scan, target.scan, k);
    l.swirl = lerp(l.swirl, target.swirl, k);
    this.flicker = Math.max(0, this.flicker - dt * 1.4);

    // Ziel-Pegel abhängig vom Zustand (echte Audiodaten, sonst synthetisch).
    const levels = this.opts.levels;
    const t = this.time;
    let wanted: number;
    switch (this.phase) {
      case "listening":
        wanted = levels.input > 0.02 ? levels.input : 0.18 + 0.08 * Math.sin(t * 3.1);
        break;
      case "speaking":
        wanted = levels.outputIsReal ? levels.output : this.syntheticSpeech(now);
        break;
      case "responding":
        wanted = 0.25 + this.syntheticSpeech(now) * 0.35;
        break;
      case "thinking":
        wanted = 0.16 + 0.08 * Math.sin(t * 2.4);
        break;
      default:
        wanted = 0.05 + 0.03 * Math.sin(t * 1.2);
    }
    if (this.opts.reducedMotion) wanted *= 0.5;
    const attack = wanted > this.level ? 0.4 : 0.09;
    this.level += (wanted - this.level) * attack;

    this.rotY += dt * motion * (0.22 + l.spin * 0.85);
    this.ringAngles[0] += dt * motion * 0.05 * (0.5 + l.spin);
    this.ringAngles[1] -= dt * motion * 0.22 * (0.4 + l.spin);
    this.ringAngles[2] += dt * motion * 0.12 * (0.5 + l.spin);
    this.ringAngles[3] += dt * motion * (0.6 + l.spin * 1.8);
  }

  private color(lightness: number, alpha: number, hueShift = 0) {
    return `hsla(${(this.look.hue + hueShift).toFixed(1)}, ${this.look.sat.toFixed(0)}%, ${lightness}%, ${Math.max(0, Math.min(1, alpha)).toFixed(3)})`;
  }

  private draw() {
    const { ctx, width: w, height: h } = this;
    const mini = this.opts.variant === "mini";
    const cx = w / 2;
    const cy = h / 2;
    const R = (Math.min(w, h) / 2) * 0.95;
    const s = R / 300; // Skalierungsfaktor relativ zu einem 600px-Kern
    const l = this.look;
    const level = this.level;
    const energy = l.energy;
    const flicker = this.flicker > 0 ? 0.65 + 0.35 * Math.sin(this.time * 60) : 1;
    const alphaBase = flicker * (0.55 + energy * 0.45);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = "round";

    // Halo
    const halo = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 1.05);
    halo.addColorStop(0, this.color(60, 0.16 + level * 0.18));
    halo.addColorStop(0.45, this.color(50, 0.06 + level * 0.06));
    halo.addColorStop(1, this.color(40, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = "lighter";

    if (mini) {
      this.drawArcs(cx, cy, R * 0.9, Math.max(1, 1.6 * s * 3), [
        [0.2, 1.6],
        [3.3, 1.6],
      ], this.ringAngles[1] * 2, this.color(70, 0.75 * alphaBase));
      this.drawSphere(cx, cy, R * (0.56 + level * 0.06), Math.max(0.9, s * 2.6), alphaBase);
      this.drawCoreGlow(cx, cy, R * 0.5, level, alphaBase);
      ctx.globalCompositeOperation = "source-over";
      return;
    }

    // 1) Äußerer Skalenring
    const r1 = R * 0.975;
    ctx.beginPath();
    for (let i = 0; i < 144; i++) {
      const a = (i / 144) * TAU + this.ringAngles[0];
      const major = i % 12 === 0;
      const len = (major ? 13 : i % 3 === 0 ? 7 : 4) * s;
      ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.lineTo(cx + Math.cos(a) * (r1 - len), cy + Math.sin(a) * (r1 - len));
    }
    ctx.strokeStyle = this.color(72, 0.32 * l.rings * alphaBase);
    ctx.lineWidth = Math.max(1, 1.2 * s);
    ctx.stroke();

    // Beschriftungen auf dem Skalenring
    if (R > 140) {
      ctx.save();
      ctx.font = `600 ${Math.round(10.5 * s)}px ${this.opts.labelFont ?? "sans-serif"}`;
      ctx.fillStyle = this.color(80, 0.42 * l.rings * alphaBase);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      LABELS.forEach((label, index) => {
        const a = this.ringAngles[0] + (index / LABELS.length) * TAU + 0.35;
        ctx.save();
        ctx.translate(cx + Math.cos(a) * (r1 - 26 * s), cy + Math.sin(a) * (r1 - 26 * s));
        ctx.rotate(a + Math.PI / 2);
        ctx.fillText(label.split("").join(" "), 0, 0);
        ctx.restore();
      });
      ctx.restore();
    }

    // 2) Segmentbögen mit Endmarken
    this.drawArcs(
      cx,
      cy,
      R * 0.86,
      Math.max(1.2, 2.2 * s),
      SEGMENTS,
      this.ringAngles[1],
      this.color(70, 0.62 * l.rings * alphaBase),
      true,
    );

    // 3) Gestrichelter Ring
    ctx.save();
    ctx.setLineDash([2 * s, 7 * s]);
    ctx.lineDashOffset = -this.ringAngles[2] * 120 * s;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.775, 0, TAU);
    ctx.strokeStyle = this.color(70, 0.4 * l.rings * alphaBase);
    ctx.lineWidth = Math.max(1, 1.5 * s);
    ctx.stroke();
    ctx.restore();

    // 4) Audioreaktives Spektrum
    const n = this.bars.length;
    const r4 = R * 0.635;
    const maxLen = R * 0.115;
    const t = this.time;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const m = Math.min(i, n - i);
      const spectrum = 0.3 + 0.7 * Math.abs(Math.sin(m * 0.55 + t * 3.1) * Math.sin(m * 0.21 - t * 1.7 + 1.3));
      const wanted = 0.04 + level * spectrum * (0.35 + energy * 0.65);
      this.bars[i] += (wanted - this.bars[i]) * 0.28;
      const a = (i / n) * TAU - Math.PI / 2;
      const len = Math.max(1.5 * s, this.bars[i] * maxLen);
      ctx.moveTo(cx + Math.cos(a) * r4, cy + Math.sin(a) * r4);
      ctx.lineTo(cx + Math.cos(a) * (r4 + len), cy + Math.sin(a) * (r4 + len));
    }
    ctx.strokeStyle = this.color(74, 0.78 * alphaBase);
    ctx.lineWidth = Math.max(1.2, 2.4 * s);
    ctx.stroke();

    // 5) Innenring mit leuchtenden Bögen
    const r5 = R * 0.545;
    ctx.beginPath();
    ctx.arc(cx, cy, r5, 0, TAU);
    ctx.strokeStyle = this.color(70, 0.22 * alphaBase);
    ctx.lineWidth = Math.max(1, 1.2 * s);
    ctx.stroke();

    ctx.save();
    ctx.shadowColor = this.color(65, 0.9);
    ctx.shadowBlur = 16 * s;
    this.drawArcs(
      cx,
      cy,
      r5,
      Math.max(2, (3.2 + level * 2.5) * s),
      [
        [0, 0.95],
        [2.1, 0.95],
        [4.2, 0.95],
      ],
      -this.ringAngles[2] * 1.6,
      this.color(72, (0.55 + level * 0.4) * alphaBase),
    );
    ctx.restore();

    // Scanner (beim Nachdenken): bernsteinfarbener Bogen mit Schweif
    if (l.scan > 0.02) {
      const head = this.ringAngles[3];
      for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        ctx.arc(cx, cy, r5 + 7 * s, head - i * 0.14 - 0.14, head - i * 0.14);
        ctx.strokeStyle = `hsla(38, 100%, 62%, ${(l.scan * 0.85 * (1 - i / 7)).toFixed(3)})`;
        ctx.lineWidth = Math.max(1.5, 2.6 * s);
        ctx.stroke();
      }
    }

    // Kreisende Satelliten
    for (let i = 0; i < 3; i++) {
      const radius = R * (0.69 + i * 0.045);
      const a = this.ringAngles[3] * (0.35 + i * 0.18) * (i % 2 ? -1 : 1) + i * 2.1;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius, (1.6 + i * 0.3) * s, 0, TAU);
      ctx.fillStyle = this.color(85, 0.8 * alphaBase);
      ctx.fill();
    }

    // 6) Partikelkugel + 7) Kernglühen
    const breath = 1 + Math.sin(this.time * 1.4) * l.breath;
    const sphereRadius = R * 0.36 * breath * (1 + level * 0.1);
    this.drawSphere(cx, cy, sphereRadius, Math.max(0.8, 2.1 * s), alphaBase);
    this.drawCoreGlow(cx, cy, sphereRadius, level, alphaBase);

    ctx.globalCompositeOperation = "source-over";
  }

  private drawArcs(
    cx: number,
    cy: number,
    radius: number,
    lineWidth: number,
    segments: Array<[number, number]>,
    rotation: number,
    stroke: string,
    caps = false,
  ) {
    const { ctx } = this;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    for (const [start, length] of segments) {
      const a0 = start + rotation;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, a0, a0 + length);
      ctx.stroke();
      if (caps) {
        for (const a of [a0, a0 + length]) {
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * (radius - lineWidth * 3), cy + Math.sin(a) * (radius - lineWidth * 3));
          ctx.lineTo(cx + Math.cos(a) * (radius + lineWidth * 3), cy + Math.sin(a) * (radius + lineWidth * 3));
          ctx.stroke();
        }
      }
    }
  }

  private drawSphere(cx: number, cy: number, radius: number, dot: number, alphaBase: number) {
    const { ctx, count, base, seed, px, py, pz } = this;
    const level = this.level;
    const l = this.look;
    const t = this.time;
    const cosY = Math.cos(this.rotY);
    const sinY = Math.sin(this.rotY);
    const tilt = 0.42 + Math.sin(t * 0.3) * 0.08;
    const cosX = Math.cos(tilt);
    const sinX = Math.sin(tilt);
    const displacement = this.opts.reducedMotion ? 0 : level * 0.24 * (0.4 + l.energy * 0.6);

    for (let i = 0; i < count; i++) {
      let x = base[i * 3];
      let y = base[i * 3 + 1];
      let z = base[i * 3 + 2];
      // Wirbel beim Nachdenken: Rotation abhängig von der Höhe.
      if (l.swirl > 0.01) {
        const twist = l.swirl * Math.sin(t * 1.6 + y * 2.2) * 0.9;
        const c = Math.cos(twist);
        const sn = Math.sin(twist);
        const nx = x * c - z * sn;
        z = x * sn + z * c;
        x = nx;
      }
      const wobble = 1 + displacement * (0.5 + 0.5 * Math.sin(seed[i] * 40 + t * 6.5 + y * 3));
      x *= wobble;
      y *= wobble;
      z *= wobble;
      const x1 = x * cosY + z * sinY;
      const z1 = -x * sinY + z * cosY;
      const y1 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;
      const perspective = 2.8 / (2.8 + z2);
      px[i] = cx + x1 * radius * perspective;
      py[i] = cy + y1 * radius * perspective;
      pz[i] = (1 - z2) / 2; // 0 = hinten, 1 = vorne
    }

    // Tiefe in 5 Stufen zeichnen – wenige fillStyle-Wechsel, gute Performance.
    const buckets = 5;
    for (let b = 0; b < buckets; b++) {
      const lo = b / buckets;
      const hi = (b + 1) / buckets;
      const depth = (lo + hi) / 2;
      ctx.fillStyle = this.color(58 + depth * 34, (0.1 + depth * 0.85) * alphaBase, -depth * 6);
      const size = dot * (0.55 + depth * 1.25);
      const half = size / 2;
      for (let i = 0; i < count; i++) {
        const d = pz[i];
        if (d < lo || d >= hi) continue;
        ctx.fillRect(px[i] - half, py[i] - half, size, size);
      }
    }
  }

  private drawCoreGlow(cx: number, cy: number, radius: number, level: number, alphaBase: number) {
    const { ctx } = this;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.05);
    glow.addColorStop(0, `hsla(${this.look.hue}, 100%, 92%, ${(0.55 + level * 0.4) * alphaBase})`);
    glow.addColorStop(0.18, this.color(72, (0.32 + level * 0.35) * alphaBase));
    glow.addColorStop(0.6, this.color(55, 0.08 + level * 0.1));
    glow.addColorStop(1, this.color(50, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.05, 0, TAU);
    ctx.fill();
  }
}
