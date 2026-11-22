// Prozedural erzeugte PBR-Texturen (Farbe, Normalen, Rauheit/Metall).
// Alles wird zur Laufzeit generiert – keine externen Bilddateien.
import * as THREE from 'three';
import { mulberry32, clamp, nextFrame } from './utils.js';

const F = 512; // Größe der Rauschfelder
let fields = null;

function fbmField(period, octaves, seed, persistence = 0.5) {
  const out = new Float32Array(F * F);
  const rng = mulberry32(seed);
  let amp = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const p = period << o;
    const lat = new Float32Array(p * p);
    for (let i = 0; i < p * p; i++) lat[i] = rng();
    const scale = p / F;
    for (let y = 0; y < F; y++) {
      const fy = y * scale;
      const iy = fy | 0;
      const ty = fy - iy;
      const sy = ty * ty * (3 - 2 * ty);
      const y0 = (iy % p) * p;
      const y1 = ((iy + 1) % p) * p;
      const row = y * F;
      for (let x = 0; x < F; x++) {
        const fx = x * scale;
        const ix = fx | 0;
        const tx = fx - ix;
        const sx = tx * tx * (3 - 2 * tx);
        const x0 = ix % p;
        const x1 = (ix + 1) % p;
        const a = lat[y0 + x0];
        const b = lat[y0 + x1];
        const c = lat[y1 + x0];
        const d = lat[y1 + x1];
        const top = a + (b - a) * sx;
        const bot = c + (d - c) * sx;
        out[row + x] += amp * (top + (bot - top) * sy);
      }
    }
    total += amp;
    amp *= persistence;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

export function initNoise() {
  if (fields) return fields;
  fields = {
    big: fbmField(2, 6, 11, 0.55),
    mid: fbmField(4, 6, 23, 0.5),
    fine: fbmField(16, 4, 37, 0.5),
    grain: fbmField(64, 3, 41, 0.6),
    alt: fbmField(3, 6, 59, 0.55),
  };
  return fields;
}

// Abtasten eines Feldes, mit Skalierung für kleinere Texturen.
function sampler(field, size) {
  const k = F / size;
  return (x, y) => field[(((y * k) | 0) & (F - 1)) * F + (((x * k) | 0) & (F - 1))];
}

function hex(c) {
  return [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
}

function makeData(size, data, srgb) {
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

let maxAniso = 4;
export function setAnisotropy(a) {
  maxAniso = a;
}

// Packt Float-Puffer in Texturen. Konvention: Zeile 0 = v 0 (unten).
function pack(size, col, h, r, m, normalStrength) {
  const n = size * size;
  const c8 = new Uint8Array(n * 4);
  const n8 = new Uint8Array(n * 4);
  const r8 = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) {
    c8[i * 4] = clamp(col[i * 3] * 255, 0, 255);
    c8[i * 4 + 1] = clamp(col[i * 3 + 1] * 255, 0, 255);
    c8[i * 4 + 2] = clamp(col[i * 3 + 2] * 255, 0, 255);
    c8[i * 4 + 3] = 255;
    r8[i * 4] = 255;
    r8[i * 4 + 1] = clamp(r[i] * 255, 0, 255);
    r8[i * 4 + 2] = clamp(m[i] * 255, 0, 255);
    r8[i * 4 + 3] = 255;
  }
  const s1 = size - 1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const l = h[y * size + ((x - 1) & s1)];
      const rr = h[y * size + ((x + 1) & s1)];
      const d = h[((y - 1) & s1) * size + x];
      const u = h[((y + 1) & s1) * size + x];
      let nx = (l - rr) * normalStrength;
      let ny = (d - u) * normalStrength;
      const inv = 1 / Math.sqrt(nx * nx + ny * ny + 1);
      nx *= inv;
      ny *= inv;
      const nz = inv;
      const i = (y * size + x) * 4;
      n8[i] = (nx * 0.5 + 0.5) * 255;
      n8[i + 1] = (ny * 0.5 + 0.5) * 255;
      n8[i + 2] = (nz * 0.5 + 0.5) * 255;
      n8[i + 3] = 255;
    }
  }
  const map = makeData(size, c8, true);
  const normalMap = makeData(size, n8, false);
  const roughnessMap = makeData(size, r8, false);
  map.anisotropy = maxAniso;
  normalMap.anisotropy = maxAniso;
  return { map, normalMap, roughnessMap };
}

function buffers(size) {
  const n = size * size;
  return {
    size,
    col: new Float32Array(n * 3),
    h: new Float32Array(n),
    r: new Float32Array(n).fill(0.8),
    m: new Float32Array(n),
  };
}

function setCol(b, i, c, k = 1) {
  b.col[i * 3] = c[0] * k;
  b.col[i * 3 + 1] = c[1] * k;
  b.col[i * 3 + 2] = c[2] * k;
}
function mulCol(b, i, k) {
  b.col[i * 3] *= k;
  b.col[i * 3 + 1] *= k;
  b.col[i * 3 + 2] *= k;
}
function mixCol(b, i, c, t) {
  b.col[i * 3] += (c[0] - b.col[i * 3]) * t;
  b.col[i * 3 + 1] += (c[1] - b.col[i * 3 + 1]) * t;
  b.col[i * 3 + 2] += (c[2] - b.col[i * 3 + 2]) * t;
}

// Risse als Zufallspfade in Höhe und Farbe.
function cracks(b, rng, count, len, depth = 0.6, dark = 0.55) {
  const s = b.size;
  for (let c = 0; c < count; c++) {
    let x = rng() * s;
    let y = rng() * s;
    let a = rng() * Math.PI * 2;
    const L = len * (0.4 + rng() * 0.8);
    for (let t = 0; t < L; t++) {
      a += (rng() - 0.5) * 0.7;
      x += Math.cos(a);
      y += Math.sin(a);
      const ix = ((x | 0) % s + s) % s;
      const iy = ((y | 0) % s + s) % s;
      const i = iy * s + ix;
      b.h[i] -= depth;
      mulCol(b, i, dark);
      b.r[i] = Math.min(1, b.r[i] + 0.1);
      if (rng() < 0.03) {
        // Verzweigung
        const sub = { x, y, a: a + (rng() - 0.5) * 2 };
        for (let k = 0; k < L * 0.3; k++) {
          sub.a += (rng() - 0.5) * 0.8;
          sub.x += Math.cos(sub.a);
          sub.y += Math.sin(sub.a);
          const jx = ((sub.x | 0) % s + s) % s;
          const jy = ((sub.y | 0) % s + s) % s;
          const j = jy * s + jx;
          b.h[j] -= depth * 0.6;
          mulCol(b, j, dark + 0.15);
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Generatoren
// ---------------------------------------------------------------------------
const GEN = {};

GEN.linoleum = (b, dark) => {
  const { size } = b;
  const big = sampler(fields.big, size);
  const mid = sampler(fields.mid, size);
  const fine = sampler(fields.fine, size);
  const grain = sampler(fields.grain, size);
  const alt = sampler(fields.alt, size);
  const cA = hex(dark ? 0x3b3f3a : 0xa9a284);
  const cB = hex(dark ? 0x23272a : 0x46524a);
  const grout = hex(0x2a2822);
  const grime = hex(0x2c2418);
  const tile = size / 8;
  const rng = mulberry32(5);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const tx = Math.floor(x / tile);
      const ty = Math.floor(y / tile);
      const gx = x % tile;
      const gy = y % tile;
      const isGrout = gx < 2 || gy < 2;
      const base = (tx + ty) & 1 ? cA : cB;
      const tileVar = 0.9 + ((tx * 7 + ty * 13) % 5) * 0.03;
      setCol(b, i, base, tileVar * (0.92 + fine(x, y) * 0.16));
      const g = big(x, y);
      const gm = mid(x + 100, y + 50);
      const dirt = clamp((g - 0.42) * 2.2 + (gm - 0.5) * 0.8, 0, 1);
      mixCol(b, i, grime, dirt * 0.75);
      const sp = grain(x, y);
      if (sp > 0.72) mulCol(b, i, 0.85);
      b.h[i] = isGrout ? -1 : fine(x, y) * 0.15;
      b.r[i] = 0.42 + dirt * 0.4 + sp * 0.08;
      if (isGrout) {
        setCol(b, i, grout, 0.8 + dirt * 0.2);
        b.r[i] = 0.95;
      }
      // Pfützen / feuchte Stellen
      const wet = alt(x + 200, y + 300);
      if (wet > 0.66) {
        const k = clamp((wet - 0.66) * 8, 0, 1);
        b.r[i] = b.r[i] * (1 - k) + 0.08 * k;
        mulCol(b, i, 1 - k * 0.35);
      }
    }
  }
  // Kratzer
  for (let s = 0; s < 60; s++) {
    let x = rng() * size;
    let y = rng() * size;
    const a = rng() * Math.PI;
    const l = 20 + rng() * 90;
    for (let t = 0; t < l; t++) {
      x += Math.cos(a);
      y += Math.sin(a);
      const i = (((y | 0) & (size - 1)) * size) + ((x | 0) & (size - 1));
      b.h[i] -= 0.25;
      mulCol(b, i, 1.12);
    }
  }
  cracks(b, rng, 4, 120, 0.4, 0.7);
};

GEN.tileWorn = (b) => {
  const { size } = b;
  const big = sampler(fields.big, size);
  const mid = sampler(fields.mid, size);
  const fine = sampler(fields.fine, size);
  const tile = size / 16;
  const white = hex(0x9c9a90);
  const concrete = hex(0x4a4741);
  const grime = hex(0x2a2116);
  const rng = mulberry32(9);
  const missing = new Set();
  for (let k = 0; k < 18; k++) missing.add(((rng() * 16) | 0) + ',' + ((rng() * 16) | 0));
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const tx = (x / tile) | 0;
      const ty = (y / tile) | 0;
      const gx = x % tile;
      const gy = y % tile;
      const grout = gx < 2 || gy < 2;
      const miss = missing.has(tx + ',' + ty);
      const f = fine(x, y);
      if (miss) {
        setCol(b, i, concrete, 0.7 + f * 0.5);
        b.h[i] = -1.4 + f * 0.4;
        b.r[i] = 0.95;
      } else if (grout) {
        setCol(b, i, hex(0x3c3830), 0.9);
        b.h[i] = -0.9;
        b.r[i] = 0.95;
      } else {
        const v = 0.85 + ((tx * 3 + ty * 5) % 4) * 0.05;
        setCol(b, i, white, v * (0.95 + f * 0.1));
        b.h[i] = f * 0.1;
        b.r[i] = 0.35;
      }
      const dirt = clamp((big(x, y) - 0.38) * 2 + (mid(x, y) - 0.5), 0, 1);
      mixCol(b, i, grime, dirt * 0.8);
      b.r[i] = Math.min(1, b.r[i] + dirt * 0.4);
    }
  }
  cracks(b, rng, 10, 140, 0.5, 0.6);
};

GEN.marble = (b) => {
  const { size } = b;
  const big = sampler(fields.big, size);
  const mid = sampler(fields.mid, size);
  const alt = sampler(fields.alt, size);
  const tile = size / 4;
  const light = hex(0xb7b2a6);
  const darkc = hex(0x2a2a2c);
  const grime = hex(0x2b2419);
  const rng = mulberry32(12);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const tx = (x / tile) | 0;
      const ty = (y / tile) | 0;
      const gx = x % tile;
      const gy = y % tile;
      const grout = gx < 2 || gy < 2;
      const isLight = ((tx + ty) & 1) === 0;
      const warp = mid(x, y) * 9 + big(x + 77, y) * 6;
      const vein = Math.pow(Math.abs(Math.sin((x + y) * 0.03 + warp)), 18);
      setCol(b, i, isLight ? light : darkc, 0.92 + alt(x, y) * 0.16);
      mixCol(b, i, isLight ? hex(0x5c5a56) : hex(0x8a8780), vein * 0.7);
      const dirt = clamp((big(x, y) - 0.45) * 2.4, 0, 1);
      mixCol(b, i, grime, dirt * 0.65);
      b.h[i] = grout ? -1 : 0;
      b.r[i] = grout ? 0.9 : 0.18 + dirt * 0.5;
      if (grout) setCol(b, i, hex(0x26231e));
    }
  }
  cracks(b, rng, 6, 160, 0.45, 0.65);
};

GEN.wood = (b, variant) => {
  const { size } = b;
  const mid = sampler(fields.mid, size);
  const fine = sampler(fields.fine, size);
  const big = sampler(fields.big, size);
  const plank = size / 8;
  const base = hex(variant === 'old' ? 0x3b2617 : 0x5a3a22);
  const grime = hex(0x1d140c);
  const rng = mulberry32(17);
  const offs = [];
  for (let k = 0; k < 8; k++) offs.push((rng() * size) | 0);
  for (let y = 0; y < size; y++) {
    const row = (y / plank) | 0;
    const py = y % plank;
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const xx = (x + offs[row]) % size;
      const seam = py < 2 || xx % (size / 2) < 2;
      const grainV = Math.sin(xx * 0.05 + mid(xx, y * 4) * 14 + row * 3.1) * 0.5 + 0.5;
      const ring = Math.pow(grainV, 3);
      const tint = 0.8 + ((row * 37) % 7) * 0.04;
      setCol(b, i, base, tint * (0.7 + ring * 0.5 + fine(x, y) * 0.1));
      const dirt = clamp((big(x, y) - 0.45) * 2, 0, 1);
      mixCol(b, i, grime, dirt * 0.6);
      b.h[i] = seam ? -1 : ring * 0.25;
      b.r[i] = seam ? 0.95 : 0.55 + dirt * 0.3 - ring * 0.1;
      if (seam) mulCol(b, i, 0.4);
    }
  }
};

GEN.whiteTile = (b, variant) => {
  const { size } = b;
  const big = sampler(fields.big, size);
  const mid = sampler(fields.mid, size);
  const fine = sampler(fields.fine, size);
  const tile = size / 16;
  const white = hex(variant === 'wall' ? 0xa8b0ad : 0xa5a9a6);
  const grime = hex(0x3a3226);
  const rng = mulberry32(21);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const gx = x % tile;
      const gy = y % tile;
      const grout = gx < 2 || gy < 2;
      const tx = (x / tile) | 0;
      const ty = (y / tile) | 0;
      if (grout) {
        setCol(b, i, hex(0x55524b));
        b.h[i] = -1;
        b.r[i] = 0.9;
      } else {
        const v = 0.92 + ((tx * 5 + ty * 3) % 3) * 0.03;
        setCol(b, i, white, v);
        // Glasur: flach mit leicht abgerundeten Kanten
        const ex = Math.min(gx, tile - gx) / tile;
        const ey = Math.min(gy, tile - gy) / tile;
        b.h[i] = Math.min(0.12, Math.min(ex, ey)) * 2.2;
        b.r[i] = 0.12 + fine(x, y) * 0.1;
      }
      const dirt = clamp((big(x, y) - 0.4) * 2 + (mid(x, y) - 0.5) * 0.6, 0, 1);
      mixCol(b, i, grime, dirt * 0.6);
      b.r[i] = Math.min(1, b.r[i] + dirt * 0.45);
    }
  }
  cracks(b, rng, 5, 100, 0.5, 0.6);
};

// Krankenhauswand: unten Kacheln, Zierleiste, oben Putz. 2m breit × 3m hoch.
GEN.hospitalWall = (b, variant) => {
  const { size } = b;
  const big = sampler(fields.big, size);
  const mid = sampler(fields.mid, size);
  const fine = sampler(fields.fine, size);
  const alt = sampler(fields.alt, size);
  const grain = sampler(fields.grain, size);
  const rng = mulberry32(31 + (variant === 'patient' ? 3 : 0));
  const tileW = size / 16;
  const tileH = size / 24;
  const bandTop = variant === 'patient' ? Math.round(size * 0.33) : Math.round(tileH * 9);
  const plaster = hex(variant === 'patient' ? 0x9a9784 : 0x9b9a86);
  const tileC = hex(0x5f7d6c);
  const paint = hex(0x4c5a52);
  const trim = hex(0x2f3a33);
  const concrete = hex(0x55524c);
  const grime = hex(0x2a2217);
  const streak = hex(0x5a4a33);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const f = fine(x, y);
      const vy = y / size; // 0 = Boden, 1 = Decke
      if (y < bandTop) {
        if (variant === 'patient') {
          setCol(b, i, paint, 0.85 + f * 0.2);
          b.h[i] = f * 0.2;
          b.r[i] = 0.55;
        } else {
          const gx = x % tileW;
          const gy = y % tileH;
          const tx = (x / tileW) | 0;
          const ty = (y / tileH) | 0;
          if (gx < 2 || gy < 2) {
            setCol(b, i, hex(0x34352e));
            b.h[i] = -1;
            b.r[i] = 0.9;
          } else {
            setCol(b, i, tileC, 0.85 + ((tx * 7 + ty * 11) % 5) * 0.05 + f * 0.05);
            b.h[i] = 0.2;
            b.r[i] = 0.18;
          }
        }
      } else if (y < bandTop + 8) {
        setCol(b, i, trim, 0.9 + f * 0.1);
        b.h[i] = 0.8;
        b.r[i] = 0.4;
      } else {
        setCol(b, i, plaster, 0.88 + f * 0.12 + mid(x, y) * 0.08);
        b.h[i] = f * 0.35 + grain(x, y) * 0.2;
        b.r[i] = 0.88;
        // Abblätternder Putz
        const peel = alt(x, y + 40) * 0.55 + mid(x + 31, y) * 0.45;
        if (peel > 0.63) {
          setCol(b, i, concrete, 0.8 + f * 0.3);
          b.h[i] = -0.8 + f * 0.2;
          b.r[i] = 0.95;
        } else if (peel > 0.6) {
          mulCol(b, i, 0.6);
          b.h[i] += 0.6;
        }
      }
      // Wasserschlieren von oben
      const st = mid((x * 3) % size, (y * 0.15) | 0);
      const streakK = clamp((st - 0.55) * 3, 0, 1) * clamp(vy * 1.4 - 0.2, 0, 1);
      mixCol(b, i, streak, streakK * 0.55);
      // Schmutz an Boden und Decke
      const edge = Math.max(clamp(1 - vy * 6, 0, 1), clamp((vy - 0.9) * 8, 0, 1));
      const dirt = clamp((big(x, y) - 0.45) * 2, 0, 1) * 0.5 + edge * 0.6;
      mixCol(b, i, grime, clamp(dirt, 0, 0.85));
    }
  }
  cracks(b, rng, 7, 160, 0.5, 0.6);
};

GEN.lobbyWall = (b) => {
  const { size } = b;
  const big = sampler(fields.big, size);
  const mid = sampler(fields.mid, size);
  const fine = sampler(fields.fine, size);
  const alt = sampler(fields.alt, size);
  const rng = mulberry32(44);
  const band = Math.round(size * 0.29);
  const woodC = hex(0x3d2818);
  const paper = hex(0x6b6450);
  const pat = hex(0x4d4838);
  const grime = hex(0x201810);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const f = fine(x, y);
      const vy = y / size;
      if (y < band) {
        const board = x % (size / 8);
        const g = Math.sin(x * 0.4 + mid(x * 4, y) * 10) * 0.5 + 0.5;
        setCol(b, i, woodC, 0.7 + g * 0.35);
        b.h[i] = board < 3 ? -1 : g * 0.2;
        b.r[i] = 0.5;
        if (y > band - 6) {
          b.h[i] = 1;
          mulCol(b, i, 0.8);
        }
      } else {
        const px = x % 64;
        const py = y % 96;
        const dx = (px - 32) / 32;
        const dy = (py - 48) / 48;
        const shape = Math.abs(dx) + Math.abs(dy) * 0.8 + Math.sin(dx * 9) * 0.1;
        const damask = shape < 0.55 && shape > 0.35 ? 1 : 0;
        setCol(b, i, damask ? pat : paper, 0.85 + f * 0.2);
        b.h[i] = damask * 0.15 + f * 0.1;
        b.r[i] = 0.85;
        if (alt(x, y) > 0.66) {
          setCol(b, i, hex(0x4e4a42), 0.8 + f * 0.3);
          b.h[i] = -0.6;
        }
      }
      const dirt = clamp((big(x, y) - 0.4) * 2, 0, 1) * 0.6 + clamp((vy - 0.85) * 5, 0, 1) * 0.5;
      mixCol(b, i, grime, clamp(dirt, 0, 0.8));
    }
  }
  cracks(b, rng, 4, 140, 0.4, 0.6);
};

GEN.wallpaper = (b, variant) => {
  const { size } = b;
  const big = sampler(fields.big, size);
  const mid = sampler(fields.mid, size);
  const fine = sampler(fields.fine, size);
  const alt = sampler(fields.alt, size);
  const red = variant === 'red';
  const paper = hex(red ? 0x4a1414 : 0x6a6248);
  const pat = hex(red ? 0x2a0909 : 0x524a34);
  const grime = hex(0x1d150c);
  const board = hex(red ? 0x1e100a : 0x3a2616);
  const rng = mulberry32(red ? 52 : 51);
  const band = Math.round(size * 0.12);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const f = fine(x, y);
      if (y < band) {
        setCol(b, i, board, 0.8 + f * 0.3);
        b.h[i] = y > band - 4 ? 1 : 0.3;
        b.r[i] = 0.5;
        continue;
      }
      const px = (x % 64) / 64 - 0.5;
      const py = (y % 64) / 64 - 0.5;
      const r = Math.sqrt(px * px + py * py);
      const petals = Math.cos(Math.atan2(py, px) * 4) * 0.08;
      const motif = r + petals < 0.3 && r + petals > 0.18;
      const stripe = x % 128 < 3;
      setCol(b, i, motif ? pat : paper, 0.85 + f * 0.2);
      if (stripe) mulCol(b, i, 0.7);
      b.h[i] = (motif ? 0.2 : 0) + f * 0.1;
      b.r[i] = 0.8;
      const peel = alt(x + 90, y);
      if (peel > 0.67) {
        setCol(b, i, hex(0x5a5650), 0.7 + f * 0.4);
        b.h[i] = -0.7;
        b.r[i] = 0.95;
      }
      const st = mid((x * 3) % size, (y * 0.2) | 0);
      mixCol(b, i, hex(0x2e2214), clamp((st - 0.55) * 3, 0, 1) * 0.5);
      const dirt = clamp((big(x, y) - 0.42) * 2, 0, 1);
      mixCol(b, i, grime, dirt * 0.55);
    }
  }
  cracks(b, rng, 3, 120, 0.3, 0.7);
};

GEN.ceilingTiles = (b) => {
  const { size } = b;
  const big = sampler(fields.big, size);
  const mid = sampler(fields.mid, size);
  const fine = sampler(fields.fine, size);
  const grain = sampler(fields.grain, size);
  const tile = size / 4;
  const rng = mulberry32(61);
  const tileC = hex(0x8b887b);
  const grid = hex(0x6e6c64);
  const stain = hex(0x5b4527);
  const missing = new Set(['1,2', '3,0']);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const gx = x % tile;
      const gy = y % tile;
      const tx = (x / tile) | 0;
      const ty = (y / tile) | 0;
      const isGrid = gx < 5 || gy < 5;
      if (isGrid) {
        setCol(b, i, grid);
        b.h[i] = 1;
        b.r[i] = 0.5;
        b.m[i] = 0.4;
      } else if (missing.has(tx + ',' + ty)) {
        setCol(b, i, hex(0x0b0a09), 0.6 + fine(x, y) * 0.8);
        b.h[i] = -2;
        b.r[i] = 1;
      } else {
        const sp = grain(x, y);
        setCol(b, i, tileC, 0.85 + fine(x, y) * 0.15 - (sp > 0.7 ? 0.15 : 0));
        b.h[i] = -0.2 + (sp > 0.7 ? -0.3 : 0) + fine(x, y) * 0.2;
        b.r[i] = 0.95;
        // Wasserflecken mit Rand
        const w = big(x + 30, y + 60) * 0.7 + mid(x, y) * 0.3;
        if (w > 0.56) {
          const k = clamp((w - 0.56) * 6, 0, 1);
          mixCol(b, i, stain, k * 0.6);
          if (w < 0.585) mixCol(b, i, hex(0x3a2a14), 0.5);
        }
      }
    }
  }
};

GEN.plaster = (b) => {
  const { size } = b;
  const big = sampler(fields.big, size);
  const mid = sampler(fields.mid, size);
  const fine = sampler(fields.fine, size);
  const rng = mulberry32(71);
  const c = hex(0x86826f);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      setCol(b, i, c, 0.85 + fine(x, y) * 0.15);
      b.h[i] = fine(x, y) * 0.5 + mid(x, y) * 0.3;
      b.r[i] = 0.95;
      const w = big(x, y);
      if (w > 0.55) mixCol(b, i, hex(0x4a3820), clamp((w - 0.55) * 4, 0, 0.7));
    }
  }
  cracks(b, rng, 8, 180, 0.6, 0.55);
};

GEN.concrete = (b, variant) => {
  const { size } = b;
  const big = sampler(fields.big, size);
  const mid = sampler(fields.mid, size);
  const fine = sampler(fields.fine, size);
  const grain = sampler(fields.grain, size);
  const alt = sampler(fields.alt, size);
  const rng = mulberry32(81 + (variant ? variant.length : 0));
  const c = hex(variant === 'wall' ? 0x55575a : 0x4b4b49);
  const wetC = hex(0x2a2724);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const f = fine(x, y);
      const g = grain(x, y);
      setCol(b, i, c, 0.75 + big(x, y) * 0.35 + f * 0.15);
      b.h[i] = f * 0.4 + mid(x, y) * 0.4;
      b.r[i] = 0.9;
      if (g > 0.8) {
        mulCol(b, i, 0.78);
        b.h[i] -= 0.6;
      }
      if (variant === 'wall') {
        // Schalungsfugen + Ankerlöcher
        if (y % 128 < 2) {
          b.h[i] -= 0.6;
          mulCol(b, i, 0.75);
        }
        const hx = x % 128;
        const hy = y % 128;
        const d = (hx - 64) * (hx - 64) + (hy - 64) * (hy - 64);
        if (d < 30) {
          b.h[i] -= 1.2;
          mulCol(b, i, 0.35);
        }
        const st = mid((x * 3) % size, (y * 0.15) | 0);
        mixCol(b, i, hex(0x3b3020), clamp((st - 0.55) * 3, 0, 1) * 0.5);
      }
      const wet = alt(x + 150, y + 10);
      const wetT = variant === 'wet' ? 0.45 : 0.62;
      if (wet > wetT) {
        const k = clamp((wet - wetT) * 7, 0, 1);
        mixCol(b, i, wetC, k * 0.6);
        b.r[i] = 0.9 - k * 0.82;
        b.h[i] *= 1 - k;
      }
    }
  }
  cracks(b, rng, 9, 200, 0.6, 0.55);
};

GEN.padded = (b) => {
  const { size } = b;
  const big = sampler(fields.big, size);
  const fine = sampler(fields.fine, size);
  const cell = size / 8;
  const c = hex(0x8f8a78);
  const stain = hex(0x4e3c22);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const u = ((x + (((y / cell) | 0) % 2) * cell * 0.5) % cell) / cell;
      const v = (y % cell) / cell;
      const bump = Math.sin(u * Math.PI) * Math.sin(v * Math.PI);
      setCol(b, i, c, 0.65 + bump * 0.35 + fine(x, y) * 0.08);
      b.h[i] = bump * 2.5;
      b.r[i] = 0.92;
      const w = big(x, y);
      if (w > 0.52) mixCol(b, i, stain, clamp((w - 0.52) * 3, 0, 0.75));
    }
  }
};

GEN.grate = (b) => {
  const { size } = b;
  const fine = sampler(fields.fine, size);
  const big = sampler(fields.big, size);
  const metal = hex(0x4a4640);
  const rust = hex(0x5a3218);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const bx = x % 32;
      const by = y % 64;
      const bar = bx < 6 || by < 6;
      if (bar) {
        setCol(b, i, metal, 0.8 + fine(x, y) * 0.3);
        b.h[i] = 1;
        b.r[i] = 0.5;
        b.m[i] = 0.85;
        const r = big(x, y);
        if (r > 0.5) {
          mixCol(b, i, rust, clamp((r - 0.5) * 3, 0, 1));
          b.m[i] = 0.3;
          b.r[i] = 0.9;
        }
      } else {
        setCol(b, i, hex(0x050505));
        b.h[i] = -2;
        b.r[i] = 1;
      }
    }
  }
};

GEN.metal = (b, variant) => {
  const { size } = b;
  const big = sampler(fields.big, size);
  const mid = sampler(fields.mid, size);
  const fine = sampler(fields.fine, size);
  const alt = sampler(fields.alt, size);
  const rng = mulberry32(91);
  const paintC = hex(
    variant === 'bare' ? 0x77736b : variant === 'locker' ? 0x4f5d55 : variant === 'white' ? 0x9a9a92 : 0x5d6058,
  );
  const rust = hex(0x5c2f14);
  const bare = hex(0x7a766e);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const f = fine(x, y);
      setCol(b, i, paintC, 0.85 + f * 0.15);
      b.h[i] = f * 0.1;
      if (variant === 'bare') {
        b.r[i] = 0.35 + mid(x, y * 0.1) * 0.25;
        b.m[i] = 0.85;
      } else {
        b.r[i] = 0.5;
        b.m[i] = 0.15;
      }
      const chip = alt(x, y);
      if (variant !== 'bare' && chip > 0.64) {
        setCol(b, i, bare, 0.8 + f * 0.3);
        b.m[i] = 0.85;
        b.r[i] = 0.4;
        b.h[i] = -0.4;
      }
      const r = big(x + 40, y) * 0.6 + mid(x, y) * 0.4;
      if (r > 0.58) {
        const k = clamp((r - 0.58) * 5, 0, 1);
        mixCol(b, i, rust, k);
        b.m[i] *= 1 - k * 0.8;
        b.r[i] = b.r[i] * (1 - k) + 0.95 * k;
        b.h[i] += k * 0.3 * f;
      }
    }
  }
  // Kratzer
  for (let s = 0; s < 40; s++) {
    let x = rng() * size;
    let y = rng() * size;
    const a = rng() * Math.PI;
    for (let t = 0; t < 30 + rng() * 60; t++) {
      x += Math.cos(a);
      y += Math.sin(a);
      const i = ((y | 0) & (size - 1)) * size + ((x | 0) & (size - 1));
      setCol(b, i, bare, 1.1);
      b.m[i] = 0.9;
      b.r[i] = 0.3;
    }
  }
};

GEN.fabric = (b, variant) => {
  const { size } = b;
  const big = sampler(fields.big, size);
  const mid = sampler(fields.mid, size);
  const fine = sampler(fields.fine, size);
  const isSheet = variant === 'sheet';
  const isCloth = variant === 'cloth';
  const c1 = hex(isSheet ? 0x8f8c82 : isCloth ? 0x7d7562 : 0x7d8590);
  const c2 = hex(isSheet ? 0x8f8c82 : isCloth ? 0x6d6552 : 0x9c9a92);
  const stain = hex(0x5e4421);
  const blood = hex(0x3a0806);
  const altS = sampler(fields.alt, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const weave = ((x & 3) < 2) !== ((y & 3) < 2) ? 1 : 0.85;
      const stripe = !isSheet && !isCloth && x % 32 < 12;
      setCol(b, i, stripe ? c1 : c2, weave * (0.85 + fine(x, y) * 0.2));
      b.h[i] = weave * 0.3;
      b.r[i] = 0.95;
      const w = big(x, y) * 0.7 + mid(x, y) * 0.3;
      if (w > 0.53) mixCol(b, i, stain, clamp((w - 0.53) * 4, 0, 0.8));
      if (isCloth || isSheet) {
        const bl = altS(x, y);
        if (bl > 0.68) mixCol(b, i, blood, clamp((bl - 0.68) * 6, 0, 0.9));
      }
    }
  }
};

GEN.skin = (b) => {
  const { size } = b;
  const big = sampler(fields.big, size);
  const mid = sampler(fields.mid, size);
  const fine = sampler(fields.fine, size);
  const alt = sampler(fields.alt, size);
  const skin = hex(0x6b6359);
  const vein = hex(0x2a2230);
  const bruise = hex(0x40303a);
  const red = hex(0x4a1210);
  const grainS = sampler(fields.grain, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      const f = fine(x, y);
      setCol(b, i, skin, 0.78 + big(x, y) * 0.3 + f * 0.08);
      const m = mid(x, y);
      const v = Math.abs(m - 0.5);
      const vk = clamp(1 - v * 40, 0, 1);
      mixCol(b, i, vein, vk * 0.65);
      const v2 = Math.abs(alt(x, y) - 0.5);
      mixCol(b, i, vein, clamp(1 - v2 * 50, 0, 1) * 0.4);
      const br = big(x + 123, y + 321);
      if (br > 0.58) mixCol(b, i, bruise, clamp((br - 0.58) * 4, 0, 0.7));
      if (alt(x + 300, y) > 0.7) mixCol(b, i, red, 0.6);
      b.h[i] = f * 0.6 - vk * 0.4 + grainS(x, y) * 0.4;
      b.r[i] = 0.5 + f * 0.2;
    }
  }
};

GEN.rust = (b) => {
  GEN.metal(b, 'pipe');
  const { size } = b;
  const big = sampler(fields.big, size);
  for (let i = 0; i < size * size; i++) {
    const x = i % size;
    const y = (i / size) | 0;
    if (big(x, y) > 0.4) {
      mixCol(b, i, hex(0x4a2410), 0.6);
      b.m[i] *= 0.4;
      b.r[i] = 0.9;
    }
  }
};

const SPECS = {
  linoleum: { size: 512, gen: (b) => GEN.linoleum(b, false), ns: 3 },
  linoleumDark: { size: 512, gen: (b) => GEN.linoleum(b, true), ns: 3 },
  tileWorn: { size: 512, gen: GEN.tileWorn, ns: 3 },
  marble: { size: 512, gen: GEN.marble, ns: 3 },
  wood: { size: 512, gen: (b) => GEN.wood(b), ns: 3 },
  woodOld: { size: 512, gen: (b) => GEN.wood(b, 'old'), ns: 3 },
  whiteTile: { size: 512, gen: (b) => GEN.whiteTile(b), ns: 3 },
  whiteTileWall: { size: 512, gen: (b) => GEN.whiteTile(b, 'wall'), ns: 3 },
  hospitalWall: { size: 512, gen: (b) => GEN.hospitalWall(b), ns: 3 },
  patientWall: { size: 512, gen: (b) => GEN.hospitalWall(b, 'patient'), ns: 3 },
  lobbyWall: { size: 512, gen: GEN.lobbyWall, ns: 3 },
  wallpaper: { size: 512, gen: (b) => GEN.wallpaper(b), ns: 2.5 },
  wallpaperRed: { size: 512, gen: (b) => GEN.wallpaper(b, 'red'), ns: 2.5 },
  ceilingTiles: { size: 512, gen: GEN.ceilingTiles, ns: 2 },
  plaster: { size: 512, gen: GEN.plaster, ns: 2.5 },
  concrete: { size: 512, gen: (b) => GEN.concrete(b), ns: 3 },
  concreteWall: { size: 512, gen: (b) => GEN.concrete(b, 'wall'), ns: 3 },
  concreteWet: { size: 512, gen: (b) => GEN.concrete(b, 'wet'), ns: 3 },
  padded: { size: 256, gen: GEN.padded, ns: 2 },
  grate: { size: 256, gen: GEN.grate, ns: 3 },
  metalLocker: { size: 256, gen: (b) => GEN.metal(b, 'locker'), ns: 2 },
  metalPaint: { size: 256, gen: (b) => GEN.metal(b, 'paint'), ns: 2 },
  metalWhite: { size: 256, gen: (b) => GEN.metal(b, 'white'), ns: 2 },
  metalBare: { size: 256, gen: (b) => GEN.metal(b, 'bare'), ns: 2 },
  rust: { size: 256, gen: GEN.rust, ns: 2 },
  mattress: { size: 256, gen: (b) => GEN.fabric(b), ns: 2 },
  sheet: { size: 256, gen: (b) => GEN.fabric(b, 'sheet'), ns: 1.5 },
  cloth: { size: 256, gen: (b) => GEN.fabric(b, 'cloth'), ns: 2 },
  skin: { size: 512, gen: GEN.skin, ns: 4 },
};

export const TEX = {};

export async function generateAll(onProgress) {
  initNoise();
  const names = Object.keys(SPECS);
  let k = 0;
  for (const name of names) {
    const spec = SPECS[name];
    const b = buffers(spec.size);
    spec.gen(b);
    TEX[name] = pack(spec.size, b.col, b.h, b.r, b.m, spec.ns);
    k++;
    onProgress && onProgress(k / names.length);
    await nextFrame();
  }
  makeDecals();
  return TEX;
}

// ---------------------------------------------------------------------------
// Canvas-Texturen für Decals, Schrift, Schilder (flipY = true wie gewohnt)
// ---------------------------------------------------------------------------
function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function canvasTex(c, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  return t;
}

function bloodSplat(ctx, cx, cy, r, rng, color = 'rgba(70,6,4,') {
  for (let k = 0; k < 26; k++) {
    const a = rng() * Math.PI * 2;
    const d = Math.pow(rng(), 1.6) * r;
    const rr = r * (0.06 + rng() * 0.22) * (1 - d / r);
    ctx.fillStyle = color + (0.55 + rng() * 0.45) + ')';
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, Math.max(1, rr), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = color + '0.9)';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.32, 0, Math.PI * 2);
  ctx.fill();
  for (let k = 0; k < 40; k++) {
    const a = rng() * Math.PI * 2;
    const d = r * (0.6 + rng() * 0.8);
    ctx.fillStyle = color + (0.4 + rng() * 0.5) + ')';
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 0.8 + rng() * 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function makeWritingTexture(text, opts = {}) {
  const w = opts.w || 1024;
  const h = opts.h || 256;
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  const rng = mulberry32(opts.seed || 7);
  const size = opts.size || h * 0.6;
  ctx.font = `${opts.weight || 'bold'} ${size}px ${opts.font || '"Brush Script MT", "Segoe Script", "Comic Sans MS", cursive'}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const color = opts.color || 'rgba(78,8,6,';
  // Grobe, verschmierte Schrift aus mehreren Lagen
  for (let k = 0; k < 6; k++) {
    ctx.fillStyle = color + (0.25 + rng() * 0.3) + ')';
    ctx.fillText(text, w / 2 + (rng() - 0.5) * 6, h / 2 + (rng() - 0.5) * 6);
  }
  ctx.fillStyle = color + '0.85)';
  ctx.fillText(text, w / 2, h / 2);
  // Tropfen
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const drips = opts.drips ?? 26;
  for (let k = 0; k < drips; k++) {
    const x = (rng() * w) | 0;
    let y = -1;
    for (let yy = (h * 0.75) | 0; yy > h * 0.3; yy--) {
      if (d[(yy * w + x) * 4 + 3] > 120) {
        y = yy;
        break;
      }
    }
    if (y < 0) continue;
    const len = 10 + rng() * h * 0.35;
    ctx.fillStyle = color + '0.8)';
    ctx.fillRect(x - 1, y, 2 + rng() * 2, len);
    ctx.beginPath();
    ctx.arc(x, y + len, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvasTex(c);
}

export function makeSignTexture(lines, opts = {}) {
  const w = opts.w || 512;
  const h = opts.h || 128;
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = opts.bg || '#1d2a24';
  ctx.fillRect(0, 0, w, h);
  const rng = mulberry32(opts.seed || 3);
  // Gebrauchsspuren
  for (let k = 0; k < 300; k++) {
    ctx.fillStyle = `rgba(0,0,0,${rng() * 0.25})`;
    ctx.fillRect(rng() * w, rng() * h, rng() * 30, rng() * 8);
  }
  ctx.strokeStyle = opts.border || 'rgba(220,220,200,0.6)';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, w - 16, h - 16);
  ctx.fillStyle = opts.fg || '#d8d4c4';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const n = lines.length;
  lines.forEach((l, i) => {
    const fs = (opts.size || h * 0.42) * (i === 0 ? 1 : 0.6);
    ctx.font = `bold ${fs}px "Arial Narrow", Arial, sans-serif`;
    ctx.fillText(l, w / 2, (h * (i + 0.5)) / n + (n > 1 ? (i === 0 ? 6 : -6) : 0));
  });
  return canvasTex(c);
}

export function makePaperTexture(seed = 1) {
  const c = canvas(256, 320);
  const ctx = c.getContext('2d');
  const rng = mulberry32(seed);
  ctx.fillStyle = '#cfc6ae';
  ctx.fillRect(0, 0, 256, 320);
  for (let k = 0; k < 900; k++) {
    ctx.fillStyle = `rgba(90,70,40,${rng() * 0.08})`;
    ctx.fillRect(rng() * 256, rng() * 320, rng() * 20, rng() * 20);
  }
  ctx.fillStyle = 'rgba(30,30,40,0.75)';
  for (let l = 0; l < 14; l++) {
    const y = 40 + l * 18;
    const len = 120 + rng() * 90;
    for (let x = 24; x < 24 + len; x += 6 + rng() * 8) {
      ctx.fillRect(x, y, 3 + rng() * 6, 2);
    }
  }
  if (rng() > 0.4) bloodSplat(ctx, 180, 250, 30, rng);
  return canvasTex(c);
}

function makeCookie() {
  const s = 256;
  const c = canvas(s, s);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgb(255,250,235)');
  g.addColorStop(0.18, 'rgb(250,240,215)');
  g.addColorStop(0.24, 'rgb(170,160,140)');
  g.addColorStop(0.32, 'rgb(230,220,200)');
  g.addColorStop(0.55, 'rgb(120,112,98)');
  g.addColorStop(0.62, 'rgb(150,140,122)');
  g.addColorStop(0.85, 'rgb(40,36,30)');
  g.addColorStop(1, 'rgb(0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const rng = mulberry32(99);
  for (let k = 0; k < 40; k++) {
    ctx.fillStyle = `rgba(0,0,0,${rng() * 0.12})`;
    ctx.beginPath();
    ctx.arc(s / 2 + (rng() - 0.5) * s * 0.6, s / 2 + (rng() - 0.5) * s * 0.6, rng() * 20, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = canvasTex(c);
  return t;
}

function makeDust() {
  const s = 64;
  const c = canvas(s, s);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.5)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  return canvasTex(c, false);
}

function makeBloodDecal(seed, kind) {
  const s = 256;
  const c = canvas(s, s);
  const ctx = c.getContext('2d');
  const rng = mulberry32(seed);
  if (kind === 'trail') {
    for (let k = 0; k < 9; k++) {
      bloodSplat(ctx, 30 + k * 25 + rng() * 10, s / 2 + (rng() - 0.5) * 30, 16 + rng() * 14, rng);
    }
    ctx.strokeStyle = 'rgba(60,5,4,0.55)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(10, s / 2);
    for (let x = 10; x < s - 10; x += 20) ctx.lineTo(x, s / 2 + Math.sin(x * 0.05) * 12);
    ctx.stroke();
  } else if (kind === 'hand') {
    for (let k = 0; k < 3; k++) {
      const cx = 60 + k * 70;
      const cy = 120 + (rng() - 0.5) * 60;
      ctx.fillStyle = 'rgba(70,6,4,0.85)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 22, 28, 0, 0, Math.PI * 2);
      ctx.fill();
      for (let f = 0; f < 5; f++) {
        const a = -Math.PI / 2 + (f - 2) * 0.32 + (f === 0 ? 0.6 : 0);
        ctx.save();
        ctx.translate(cx + Math.cos(a) * 24, cy + Math.sin(a) * 28);
        ctx.rotate(a + Math.PI / 2);
        ctx.fillRect(-5, -32, 10, 34);
        ctx.restore();
      }
      ctx.fillRect(cx - 4, cy + 20, 6, 40 + rng() * 40);
    }
  } else {
    bloodSplat(ctx, s / 2, s / 2, s * 0.36, rng);
  }
  return canvasTex(c);
}

function makeVent() {
  const s = 128;
  const c = canvas(s, s);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#3a3a36';
  ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = '#050505';
  for (let y = 14; y < s - 14; y += 12) ctx.fillRect(12, y, s - 24, 6);
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, s - 6, s - 6);
  return canvasTex(c);
}

function makeScreenStatic() {
  const c = canvas(128, 96);
  return canvasTex(c);
}

export function makeCodeTexture(code) {
  const w = 1024;
  const h = 512;
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  const rng = mulberry32(parseInt(code, 10) || 1);
  ctx.font = `bold 300px "Impact", "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const digits = code.split('');
  digits.forEach((d, i) => {
    const x = w * (0.14 + i * 0.24);
    for (let k = 0; k < 5; k++) {
      ctx.fillStyle = `rgba(80,8,6,${0.25 + rng() * 0.3})`;
      ctx.fillText(d, x + (rng() - 0.5) * 10, h * 0.48 + (rng() - 0.5) * 10);
    }
    ctx.fillStyle = 'rgba(90,10,8,0.95)';
    ctx.fillText(d, x, h * 0.48);
    for (let k = 0; k < 4; k++) {
      const dx = x + (rng() - 0.5) * 100;
      const len = 40 + rng() * 140;
      ctx.fillRect(dx, h * 0.62, 5, len);
    }
  });
  return canvasTex(c);
}

export const DECAL = {};
function makeDecals() {
  DECAL.cookie = makeCookie();
  DECAL.dust = makeDust();
  DECAL.blood = [makeBloodDecal(1), makeBloodDecal(2), makeBloodDecal(3)];
  DECAL.trail = makeBloodDecal(4, 'trail');
  DECAL.hand = makeBloodDecal(5, 'hand');
  DECAL.vent = makeVent();
  DECAL.paper = [makePaperTexture(1), makePaperTexture(2), makePaperTexture(3)];
  DECAL.static = makeScreenStatic();
}
