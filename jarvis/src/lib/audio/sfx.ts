import { getAudioContext } from "./context";

/**
 * Dezente, synthetisch erzeugte HUD-Soundeffekte (keine Audiodateien nötig).
 */

type Effect = "listen" | "stop" | "send" | "error" | "boot" | "done";

interface Tone {
  freq: number;
  to?: number;
  start: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
}

const EFFECTS: Record<Effect, Tone[]> = {
  listen: [
    { freq: 620, to: 880, start: 0, duration: 0.09 },
    { freq: 990, to: 1320, start: 0.08, duration: 0.11 },
  ],
  stop: [
    { freq: 990, to: 740, start: 0, duration: 0.08 },
    { freq: 660, to: 440, start: 0.07, duration: 0.12 },
  ],
  send: [{ freq: 1400, to: 1800, start: 0, duration: 0.05, gain: 0.035 }],
  done: [{ freq: 1180, to: 1250, start: 0, duration: 0.06, gain: 0.025 }],
  error: [
    { freq: 220, to: 180, start: 0, duration: 0.16, type: "sawtooth", gain: 0.03 },
    { freq: 180, to: 140, start: 0.15, duration: 0.2, type: "sawtooth", gain: 0.03 },
  ],
  boot: [
    { freq: 220, to: 440, start: 0, duration: 0.5, gain: 0.03 },
    { freq: 330, to: 660, start: 0.15, duration: 0.55, gain: 0.025 },
    { freq: 880, to: 1760, start: 0.55, duration: 0.25, gain: 0.02 },
  ],
};

let enabled = true;

export function setSoundsEnabled(value: boolean) {
  enabled = value;
}

export function playSfx(effect: Effect): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx || ctx.state !== "running") return;
  const now = ctx.currentTime + 0.01;
  for (const tone of EFFECTS[effect]) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = tone.type ?? "sine";
    osc.frequency.setValueAtTime(tone.freq, now + tone.start);
    if (tone.to) osc.frequency.exponentialRampToValueAtTime(tone.to, now + tone.start + tone.duration);
    const peak = tone.gain ?? 0.045;
    gain.gain.setValueAtTime(0.0001, now + tone.start);
    gain.gain.exponentialRampToValueAtTime(peak, now + tone.start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.start + tone.duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + tone.start);
    osc.stop(now + tone.start + tone.duration + 0.02);
  }
}
