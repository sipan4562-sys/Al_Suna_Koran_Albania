// Pixelkingschat – eigene Story-Musik
// Alle Songs werden im Browser live erzeugt (WebAudio-Synthesizer): eigene Kompositionen von
// „Pixelkings Studio“ – keine fremden Aufnahmen, keine Lizenzkosten, kein Download, kein Datenvolumen.

const ARTIST = "Pixelkings Studio";
const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  hijaz: [0, 1, 4, 5, 7, 8, 10],
  mixo: [0, 2, 4, 5, 7, 9, 10],
};
// prog = Akkordstufen (0 = Grundton der Tonleiter), je ein Takt
export const TRACKS = [
  { id: "neon", title: "Neon Nacht", mood: "Synthwave", bpm: 104, root: 45, scale: "minor", prog: [0, 5, 2, 6], lead: "sawtooth", bass: "square", drums: "four", arp: true, seed: 11 },
  { id: "party", title: "Pixel Party", mood: "Chiptune", bpm: 132, root: 48, scale: "major", prog: [0, 4, 5, 3], lead: "square", bass: "triangle", drums: "four", arp: true, seed: 5 },
  { id: "lofi", title: "Regen am Fenster", mood: "Lo-Fi", bpm: 78, root: 50, scale: "dorian", prog: [0, 3, 1, 4], lead: "triangle", bass: "sine", drums: "lofi", arp: false, lowpass: 1500, swing: 0.16, seed: 23 },
  { id: "koenig", title: "Königsmarsch", mood: "Episch", bpm: 112, root: 43, scale: "minor", prog: [0, 5, 3, 4], lead: "square", bass: "sawtooth", drums: "march", arp: false, seed: 7 },
  { id: "sommer", title: "Sommerwind", mood: "Fröhlich", bpm: 118, root: 53, scale: "mixo", prog: [0, 6, 3, 0], lead: "triangle", bass: "square", drums: "half", arp: true, seed: 31 },
  { id: "boss", title: "Boss-Kampf", mood: "Action", bpm: 150, root: 40, scale: "minor", prog: [0, 0, 5, 6], lead: "sawtooth", bass: "square", drums: "fast", arp: true, seed: 3 },
  { id: "herz", title: "Herzklopfen", mood: "Romantisch", bpm: 92, root: 52, scale: "major", prog: [0, 5, 3, 4], lead: "sine", bass: "triangle", drums: "half", arp: true, seed: 17, lowpass: 3000 },
  { id: "trap", title: "Mitternacht", mood: "Trap", bpm: 140, root: 41, scale: "minor", prog: [0, 0, 5, 4], lead: "square", bass: "sine", drums: "trap", arp: false, seed: 29 },
  { id: "arcade", title: "Arcade-Held", mood: "Retro", bpm: 140, root: 50, scale: "major", prog: [0, 3, 4, 4], lead: "square", bass: "triangle", drums: "four", arp: false, seed: 41 },
  { id: "sterne", title: "Sternenstaub", mood: "Verträumt", bpm: 86, root: 55, scale: "major", prog: [0, 2, 5, 3], lead: "sine", bass: "triangle", drums: "none", arp: true, lowpass: 2400, seed: 13 },
  { id: "orient", title: "Orient-Express", mood: "Orientalisch", bpm: 100, root: 50, scale: "hijaz", prog: [0, 0, 6, 0], lead: "sawtooth", bass: "triangle", drums: "darbuka", arp: false, seed: 19 },
  { id: "kaffee", title: "Morgenkaffee", mood: "Gemütlich", bpm: 96, root: 48, scale: "major", prog: [0, 3, 0, 4], lead: "triangle", bass: "sine", drums: "lofi", arp: false, swing: 0.12, lowpass: 2200, seed: 37 },
].map((t) => ({ ...t, artist: ARTIST }));
export const trackById = (id) => TRACKS.find((t) => t.id === id) || null;

/* ---------- Komposition (aus Startwert, immer gleich) ---------- */
const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const DRUMS = {
  four: { k: "x...x...x...x...", s: "....x.......x...", h: "..x...x...x...x." },
  half: { k: "x.......x.......", s: "........x.......", h: "x.x.x.x.x.x.x.x." },
  lofi: { k: "x......x..x.....", s: "....x.......x...", h: "x.x.x.x.x.x.x.x." },
  march: { k: "x...x...x...x...", s: "....x.x.....x.xx", h: "x...x...x...x..." },
  fast: { k: "x.x.x.x.x.x.x.x.", s: "....x.......x...", h: "xxxxxxxxxxxxxxxx" },
  trap: { k: "x.......x..x....", s: "........x.......", h: "x.x.xxx.x.x.x.xx" },
  darbuka: { k: "x..x..x.....x...", s: "....x..x....x.x.", h: "..x...x...x...xx" },
  none: { k: "................", s: "................", h: "................" },
};
const cacheSong = new Map();
function compose(t) {
  if (cacheSong.has(t.id)) return cacheSong.get(t.id);
  const r = rng(t.seed * 7919 + 1);
  const sc = SCALES[t.scale];
  const midi = (deg, oct = 0) => t.root + sc[((deg % sc.length) + sc.length) % sc.length] + 12 * (Math.floor(deg / sc.length) + oct);
  const chord = (deg) => [deg, deg + 2, deg + 4];
  // Motiv: Rhythmus + welcher Akkord-/Tonleiterton (16 Achtel = 2 Takte), wird über alle Akkorde wiederholt
  const motif = [];
  let idx = 2;
  for (let i = 0; i < 16; i++) {
    const strong = i % 4 === 0;
    if (!strong && r() < 0.34) {
      motif.push(null);
      continue;
    }
    idx = Math.max(-1, Math.min(6, idx + Math.round((r() - 0.5) * 3)));
    motif.push({ i: idx, len: r() < 0.25 ? 2 : 1 });
  }
  const bars = t.prog.length * 2;
  const lead = [];
  const bass = [];
  const arp = [];
  for (let b = 0; b < bars; b++) {
    const deg = t.prog[b % t.prog.length];
    const ch = chord(deg);
    const variation = b >= t.prog.length; // zweite Hälfte leicht anders
    for (let e = 0; e < 8; e++) {
      const m = motif[(b % 2) * 8 + e];
      if (m) {
        let d = m.i % 2 === 0 ? ch[(m.i / 2) % 3] + 7 * Math.floor(m.i / 6) : deg + m.i;
        if (variation && e === 7) d += 2;
        lead.push({ step: b * 16 + e * 2, n: midi(d, 1), len: m.len * 2 });
      }
    }
    const pat = t.drums === "trap" ? [0, 6, 10] : t.bpm < 95 ? [0, 8] : [0, 4, 8, 12];
    for (const s of pat) bass.push({ step: b * 16 + s, n: midi(deg, -1) + (s === 8 && r() < 0.3 ? 7 : 0), len: t.bpm < 95 ? 7 : 3 });
    if (t.arp) for (let s = 0; s < 16; s++) arp.push({ step: b * 16 + s, n: midi(ch[s % 3] + (s % 6 >= 3 ? 7 : 0), 1), len: 1 });
  }
  const song = { lead, bass, arp, steps: bars * 16, drums: DRUMS[t.drums] || DRUMS.none };
  cacheSong.set(t.id, song);
  return song;
}

/* ---------- Klangerzeugung ---------- */
let ac = null;
let noise = null;
function ctx() {
  if (!ac) {
    const C = window.AudioContext || window.webkitAudioContext;
    ac = new C();
    noise = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return ac;
}
// iPhone & Co.: Ton erst nach einem Tippen erlaubt – beim ersten Tippen freischalten
export function unlockAudio() {
  try {
    const c = ctx();
    if (c.state !== "running") c.resume();
  } catch {}
}
const hz = (n) => 440 * 2 ** ((n - 69) / 12);
function tone(out, type, n, t, dur, vol) {
  const c = ac;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(hz(n), t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(vol * 0.55, t + Math.min(0.12, dur * 0.4));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.02);
}
function noiseHit(out, t, dur, vol, hp) {
  const s = ac.createBufferSource();
  s.buffer = noise;
  const f = ac.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = hp;
  const g = ac.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(out);
  s.start(t);
  s.stop(t + dur + 0.02);
}
function kick(out, t, vol = 0.9) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 0.3);
}

/* ---------- Abspielen ---------- */
let current = null;
export function stopMusic() {
  const cur = current;
  current = null;
  if (!cur) return;
  clearInterval(cur.timer);
  try {
    const t = ac.currentTime;
    cur.master.gain.cancelScheduledValues(t);
    cur.master.gain.setValueAtTime(cur.master.gain.value, t);
    cur.master.gain.linearRampToValueAtTime(0, t + 0.25);
    setTimeout(() => cur.master.disconnect(), 400);
  } catch {}
}
export function playTrack(id, { volume = 0.55 } = {}) {
  stopMusic();
  const t = trackById(id);
  if (!t) return null;
  const c = ctx();
  if (c.state !== "running") c.resume().catch(() => {});
  const song = compose(t);
  const master = c.createGain();
  master.gain.setValueAtTime(0, c.currentTime);
  master.gain.linearRampToValueAtTime(volume, c.currentTime + 0.4);
  const comp = c.createDynamicsCompressor();
  let out = master;
  if (t.lowpass) {
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = t.lowpass;
    lp.connect(master);
    out = lp;
  }
  comp.connect(out);
  master.connect(c.destination);
  const bus = comp;
  const sixteenth = 60 / t.bpm / 4;
  const byStep = (list) => {
    const m = new Map();
    for (const x of list) m.set(x.step, [...(m.get(x.step) || []), x]);
    return m;
  };
  const L = byStep(song.lead);
  const B = byStep(song.bass);
  const A = byStep(song.arp);
  let step = 0;
  let next = c.currentTime + 0.08;
  const me = { master, timer: 0, track: t };
  const tick = () => {
    while (next < c.currentTime + 0.15) {
      const s = step % song.steps;
      const d = s % 16;
      const swing = t.swing && d % 2 === 1 ? sixteenth * t.swing : 0;
      const at = next + swing;
      for (const n of L.get(s) || []) tone(bus, t.lead, n.n, at, n.len * sixteenth * 0.95, 0.16);
      for (const n of B.get(s) || []) tone(bus, t.bass, n.n, at, n.len * sixteenth * 0.9, 0.2);
      for (const n of A.get(s) || []) tone(bus, t.lead === "sawtooth" ? "square" : "triangle", n.n + 12, at, sixteenth * 0.8, 0.045);
      if (song.drums.k[d] === "x") kick(bus, at);
      if (song.drums.s[d] === "x") {
        noiseHit(bus, at, t.drums === "darbuka" ? 0.08 : 0.16, 0.35, t.drums === "darbuka" ? 600 : 1200);
        tone(bus, "triangle", 50, at, 0.08, 0.15);
      }
      if (song.drums.h[d] === "x") noiseHit(bus, at, 0.035, 0.12, 7000);
      next += sixteenth;
      step++;
    }
  };
  tick();
  me.timer = setInterval(tick, 25);
  current = me;
  return me;
}
export const isPlaying = (id) => current?.track.id === id;
