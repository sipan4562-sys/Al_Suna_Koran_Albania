// PixelCam – Gesichtserkennung & Verpixelung
// --------------------------------------------------------------
// Läuft komplett lokal im Browser (MediaPipe BlazeFace full-range,
// WebAssembly). Jedes Kamerabild wird zuerst in eine unsichtbare
// Arbeitsfläche gezeichnet, dort erkannt und verpixelt und erst danach auf
// die sichtbare Fläche kopiert. Die Aufnahme greift nur die sichtbare Fläche
// ab – ein unverpixeltes Bild kann so nie in die Aufnahme gelangen.

import { FaceDetector, FilesetResolver } from '../vendor/mediapipe/vision_bundle.mjs';

const BASE = new URL('../vendor/', import.meta.url);
const WASM_LOCAL = {
  wasmLoaderPath: new URL('mediapipe/wasm/vision_wasm_internal.js', BASE).href,
  wasmBinaryPath: new URL('mediapipe/wasm/vision_wasm_internal.wasm', BASE).href,
};
// Nur für sehr alte Browser ohne WebAssembly-SIMD.
const WASM_NOSIMD = {
  wasmLoaderPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm/vision_wasm_nosimd_internal.js',
  wasmBinaryPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm/vision_wasm_nosimd_internal.wasm',
};
// Full-range-Modell: erkennt Gesichter von ganz nah bis ca. 5 m Entfernung.
const MODEL_URL = new URL('models/blaze_face_full_range.tflite', BASE).href;
const TILE_SIZE = 384;

async function fetchWithProgress(url, onProgress) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Laden fehlgeschlagen (${res.status}): ${url.split('/').pop()}`);
  const total = Number(res.headers.get('content-length')) || 0;
  if (!res.body || !total) {
    const buf = await res.arrayBuffer();
    onProgress?.(buf.byteLength, buf.byteLength);
    return new Uint8Array(buf);
  }
  const reader = res.body.getReader();
  const chunks = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    onProgress?.(loaded, total);
  }
  const out = new Uint8Array(loaded);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.byteLength; }
  return out;
}

/** Eine erkannte Person: Box + 6 Punkte (Augen, Nase, Mund, Ohren) in Pixeln. */
function toFace(det, ox, oy, sx, sy, srcW, srcH) {
  const b = det.boundingBox;
  return {
    x: ox + b.originX * sx, y: oy + b.originY * sy, w: b.width * sx, h: b.height * sy,
    score: det.categories?.[0]?.score ?? 0,
    kp: (det.keypoints || []).map(k => ({ x: ox + k.x * srcW * sx, y: oy + k.y * srcH * sy })),
  };
}

function iou(a, b) {
  const x0 = Math.max(a.x, b.x), y0 = Math.max(a.y, b.y);
  const x1 = Math.min(a.x + a.w, b.x + b.w), y1 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
  return inter / (a.w * a.h + b.w * b.h - inter || 1);
}

/** Doppelte Treffer (Vollbild + Ausschnitt) zusammenführen – im Zweifel größer. */
function merge(list) {
  const out = [];
  for (const f of list.sort((a, b) => b.score - a.score)) {
    const same = out.find(o => iou(o, f) > 0.2);
    if (!same) { out.push(f); continue; }
    const x0 = Math.min(same.x, f.x), y0 = Math.min(same.y, f.y);
    const x1 = Math.max(same.x + same.w, f.x + f.w), y1 = Math.max(same.y + same.h, f.y + f.h);
    Object.assign(same, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
  }
  return out;
}

export class FaceEngine {
  detector = null;
  delegate = null;

  /** Lädt Modell + WebAssembly. onProgress(0..1) */
  async init({ onProgress } = {}) {
    const simd = await FilesetResolver.isSimdSupported().catch(() => true);
    const fileset = simd ? WASM_LOCAL : WASM_NOSIMD;

    // Modell und WASM vorab mit Fortschritt laden (landen im Cache).
    const sizes = { model: 1.08e6, wasm: 11.2e6 };
    const loaded = { model: 0, wasm: 0 };
    const report = () => onProgress?.(Math.min(0.97, (loaded.model + loaded.wasm) / (sizes.model + sizes.wasm)));
    const [model] = await Promise.all([
      fetchWithProgress(MODEL_URL, (l, t) => { loaded.model = l; sizes.model = t; report(); }),
      fetchWithProgress(fileset.wasmBinaryPath, (l, t) => { loaded.wasm = l; sizes.wasm = t; report(); }).catch(() => null),
    ]);
    onProgress?.(0.98);

    // CPU (XNNPACK) liefert bei kleinen Gesichtern die zuverlässigsten
    // Ergebnisse; GPU nur als Ausweichlösung.
    let lastErr;
    for (const delegate of ['CPU', 'GPU']) {
      try {
        this.detector = await FaceDetector.createFromOptions(fileset, {
          baseOptions: { modelAssetBuffer: model, delegate },
          runningMode: 'IMAGE',
          // Niedrige Schwelle: lieber einmal zu viel verpixeln als zu wenig.
          minDetectionConfidence: 0.3,
          minSuppressionThreshold: 0.3,
        });
        this.delegate = delegate;
        break;
      } catch (err) {
        lastErr = err;
        console.warn(`FaceDetector (${delegate}) fehlgeschlagen`, err);
      }
    }
    if (!this.detector) throw lastErr || new Error('Gesichtserkennung nicht verfügbar.');
    this.tile = document.createElement('canvas');
    this.tile.width = this.tile.height = TILE_SIZE;
    this.tctx = this.tile.getContext('2d', { alpha: false });
    onProgress?.(1);
  }

  get ready() { return !!this.detector; }

  /** Erkennt Gesichter im ganzen Bild. */
  detect(source, w, h) {
    if (!this.detector) return null;
    const r = this.detector.detect(source);
    return r.detections.map(d => toFace(d, 0, 0, 1, 1, w, h));
  }

  /**
   * Sucht kleine/weit entfernte Gesichter: Das Bild wird in überlappende,
   * quadratische Ausschnitte zerlegt, die einzeln (vergrößert) geprüft werden.
   */
  detectTiles(source, w, h) {
    if (!this.detector) return [];
    const side = Math.min(w, h);
    const tiles = [];
    const long = Math.max(w, h);
    const n = Math.max(2, Math.ceil((long / side) * 1.5)); // genug Überlappung
    for (let i = 0; i < n; i++) {
      const off = Math.round(((long - side) * i) / (n - 1));
      tiles.push(w >= h ? [off, 0] : [0, off]);
    }
    // Bei fast quadratischen Bildern zusätzlich 2×2 Viertel prüfen.
    if (long / side < 1.25) {
      const q = Math.round(side * 0.6);
      tiles.length = 0;
      for (const tx of [0, w - q]) for (const ty of [0, h - q]) tiles.push([tx, ty, q]);
    }
    const out = [];
    for (const [tx, ty, size = side] of tiles) {
      this.tctx.drawImage(source, tx, ty, size, size, 0, 0, TILE_SIZE, TILE_SIZE);
      const r = this.detector.detect(this.tile);
      const s = size / TILE_SIZE;
      for (const d of r.detections) out.push(toFace(d, tx, ty, s, s, TILE_SIZE, TILE_SIZE));
    }
    return out;
  }
}

/**
 * Verarbeitet Kamerabilder: erkennen → verpixeln → ausgeben.
 * settings wird bei jedem Bild gelesen, Änderungen wirken sofort.
 */
export class Processor {
  constructor(outCanvas, engine, settings) {
    this.out = outCanvas;
    this.octx = outCanvas.getContext('2d', { alpha: false });
    this.work = document.createElement('canvas');
    this.wctx = this.work.getContext('2d', { alpha: false });
    this.tmp = document.createElement('canvas');
    this.tctx = this.tmp.getContext('2d', { alpha: false });
    this.engine = engine;
    this.settings = settings;
    this.video = null;
    this.running = false;
    this.tracks = []; // zuletzt gesehene Gesichter mit Geschwindigkeit
    this.lastSeen = -Infinity;
    this.stats = { faces: 0, fps: 0, state: 'idle' };
    this.counters = { frames: 0, detected: 0, held: 0, full: 0, tiles: 0 };
    this.onStats = null;
    this._frames = 0;
    this._fpsT = performance.now();
    this._handle = null;
    this._n = 0;
  }

  start(video) {
    this.stop();
    this.video = video;
    this.running = true;
    this.tracks = [];
    this.lastSeen = -Infinity;
    this.#schedule();
  }

  stop() {
    this.running = false;
    if (this._handle != null && this.video) {
      if (this._viaVfc && this.video.cancelVideoFrameCallback) this.video.cancelVideoFrameCallback(this._handle);
      else cancelAnimationFrame(this._handle);
    }
    this._handle = null;
  }

  #schedule() {
    if (!this.running) return;
    const v = this.video;
    if (v && 'requestVideoFrameCallback' in HTMLVideoElement.prototype) {
      this._viaVfc = true;
      this._handle = v.requestVideoFrameCallback(() => this.#tick());
    } else {
      this._viaVfc = false;
      this._handle = requestAnimationFrame(() => this.#tick());
    }
  }

  #tick() {
    if (!this.running) return;
    try { this.renderFrame(); } catch (err) { console.error(err); }
    this.#schedule();
  }

  #detect(w, h) {
    const e = this.engine;
    if (!e?.ready) return null;
    try {
      let faces = e.detect(this.work, w, h);
      // Nichts gefunden – oder Modus „weit entfernt“: Ausschnitte prüfen.
      // (Bei „weit entfernt“ nur jedes 2. Bild, um Leistung zu sparen.)
      const far = this.settings.farFaces && (this._n++ % 2 === 0);
      if (!faces.length || far) {
        const extra = e.detectTiles(this.work, w, h);
        if (extra.length) this.counters.tiles++;
        faces = merge(faces.concat(extra));
      }
      return faces;
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  renderFrame() {
    const v = this.video;
    const w = v?.videoWidth, h = v?.videoHeight;
    if (!w || !h || v.readyState < 2) return;
    if (this.work.width !== w || this.work.height !== h) { this.work.width = w; this.work.height = h; }
    if (this.out.width !== w || this.out.height !== h) { this.out.width = w; this.out.height = h; }
    const s = this.settings;
    this.wctx.drawImage(v, 0, 0, w, h);

    const now = performance.now();
    const faces = this.#detect(w, h);
    let regions = [];
    if (faces && faces.length) {
      this.#updateTracks(faces, now);
      this.lastSeen = now;
      regions = faces.map(f => this.#regionFor(f));
    } else if (now - this.lastSeen < s.holdMs && this.tracks.length) {
      // Kurz nicht erkannt: letzte Position in Bewegungsrichtung mitführen
      // und deutlich vergrößern, damit nichts durchrutscht.
      const dt = now - this.lastSeen;
      regions = this.tracks.map((t) => {
        const f = { ...t.face, x: t.face.x + t.vx * dt, y: t.face.y + t.vy * dt };
        f.kp = t.face.kp.map(p => ({ x: p.x + t.vx * dt, y: p.y + t.vy * dt }));
        const speed = Math.hypot(t.vx, t.vy) * dt;
        return grow(this.#regionFor(f), 1.25 + (speed / Math.max(20, f.w)) * 1.5);
      });
    }

    const engineReady = !!this.engine?.ready;
    const fullFrame = !engineReady || (s.safety && regions.length === 0);
    const c = this.counters;
    c.frames++;
    if (faces && faces.length) c.detected++; else if (fullFrame) c.full++; else if (regions.length) c.held++;

    if (fullFrame) {
      this.#pixelate(0, 0, w, h, Math.max(w, h) / 22, 'rect');
    } else {
      for (const r of regions) this.#apply(r);
    }
    this.octx.drawImage(this.work, 0, 0);

    this._frames++;
    if (now - this._fpsT >= 1000) {
      this.stats.fps = Math.round((this._frames * 1000) / (now - this._fpsT));
      this._frames = 0; this._fpsT = now;
    }
    this.stats.faces = faces ? faces.length : 0;
    this.stats.state = !engineReady ? 'loading' : fullFrame ? 'safety' : regions.length ? 'ok' : 'none';
    this.onStats?.(this.stats);
  }

  #updateTracks(faces, now) {
    const next = faces.map((face) => {
      const cx = face.x + face.w / 2, cy = face.y + face.h / 2;
      let best = null, bestD = Infinity;
      for (const t of this.tracks) {
        const d = Math.hypot(t.cx - cx, t.cy - cy);
        if (d < bestD && d < face.w * 1.5) { best = t; bestD = d; }
      }
      let vx = 0, vy = 0;
      if (best) {
        const dt = Math.max(1, now - best.t);
        vx = best.vx * 0.4 + ((cx - best.cx) / dt) * 0.6;
        vy = best.vy * 0.4 + ((cy - best.cy) / dt) * 0.6;
      }
      return { face, cx, cy, vx, vy, t: now };
    });
    this.tracks = next;
  }

  /** Bereich, der verpixelt wird – aus Gesichtsbox und Augenpunkten. */
  #regionFor(f) {
    const s = this.settings;
    const block = Math.max(3, f.w * s.pixelScale);
    if (s.mode === 'face') {
      const mx = f.w * (0.08 + 0.2 * s.padding);
      const top = f.h * (0.3 + 0.2 * s.padding); // Stirn & Haaransatz
      const bottom = f.h * (0.08 + 0.15 * s.padding);
      return { x: f.x - mx, y: f.y - top, w: f.w + mx * 2, h: f.h + top + bottom, block, shape: s.shape };
    }
    const [re, le] = f.kp;
    if (!re || !le) {
      // Ohne Augenpunkte: obere Gesichtshälfte abdecken.
      return { x: f.x - f.w * 0.1, y: f.y, w: f.w * 1.2, h: f.h * 0.6, block, shape: 'round' };
    }
    const dx = le.x - re.x, dy = le.y - re.y;
    const d = Math.max(Math.hypot(dx, dy), f.w * 0.36); // Profilansicht: nicht zu klein werden
    const ang = Math.atan2(dy, dx);
    const cx = (re.x + le.x) / 2, cy = (re.y + le.y) / 2;
    if (s.effect === 'bar') {
      // Klassischer Zensurbalken: schmal, entlang der Augenlinie gedreht.
      // Länge: von Augenwinkel zu Augenwinkel plus etwas Rand.
      // Stärke: Augenöffnung (~0,2·d) plus einstellbarer Rand.
      return {
        kind: 'bar', cx, cy, ang,
        len: Math.hypot(dx, dy) + d * (0.85 + 0.3 * s.padding),
        thick: d * (0.3 + 0.45 * s.barThickness),
      };
    }
    const m = d * (0.14 + 0.3 * s.padding);
    const half = Math.hypot(dx, dy) / 2 + d * 0.3 + m; // halbe Breite
    const up = d * (s.brows ? 0.5 : 0.16) + m;
    const down = d * 0.16 + m;
    // Gedrehtes Rechteck → achsenparallele Box
    const cos = Math.cos(ang), sin = Math.sin(ang);
    const pts = [[-half, -up], [half, -up], [half, down], [-half, down]].map(([px, py]) => [cx + px * cos - py * sin, cy + px * sin + py * cos]);
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x0 = Math.min(...xs), y0 = Math.min(...ys);
    return { x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0, block, shape: 'round' };
  }

  #apply(r) {
    if (r.kind === 'bar') {
      const ctx = this.wctx;
      ctx.save();
      ctx.translate(r.cx, r.cy);
      ctx.rotate(r.ang);
      ctx.fillStyle = '#000';
      ctx.fillRect(-r.len / 2, -r.thick / 2, r.len, r.thick);
      ctx.restore();
      return;
    }
    if (this.settings.effect === 'bar') {
      const ctx = this.wctx;
      ctx.save();
      ctx.fillStyle = '#000';
      this.#path(ctx, r.x, r.y, r.w, r.h, r.shape);
      ctx.fill();
      ctx.restore();
      return;
    }
    this.#pixelate(r.x, r.y, r.w, r.h, r.block, r.shape);
  }

  #path(ctx, x, y, w, h, shape) {
    ctx.beginPath();
    if (shape === 'oval') ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    else if (shape === 'round' && ctx.roundRect) ctx.roundRect(x, y, w, h, Math.min(w, h) * 0.22);
    else ctx.rect(x, y, w, h);
  }

  #pixelate(x, y, w, h, block, shape) {
    const W = this.work.width, H = this.work.height;
    const x0 = Math.max(0, Math.floor(x)), y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(W, Math.ceil(x + w)), y1 = Math.min(H, Math.ceil(y + h));
    const rw = x1 - x0, rh = y1 - y0;
    if (rw < 2 || rh < 2) return;
    const sw = Math.max(1, Math.round(rw / block));
    const sh = Math.max(1, Math.round(rh / block));
    if (this.tmp.width < sw || this.tmp.height < sh) {
      this.tmp.width = Math.max(this.tmp.width, sw);
      this.tmp.height = Math.max(this.tmp.height, sh);
    }
    const t = this.tctx;
    t.imageSmoothingEnabled = true;
    t.imageSmoothingQuality = 'high';
    t.drawImage(this.work, x0, y0, rw, rh, 0, 0, sw, sh);

    const ctx = this.wctx;
    ctx.save();
    if (shape === 'oval' || shape === 'round') {
      this.#path(ctx, x, y, w, h, shape);
      ctx.clip();
    }
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.tmp, 0, 0, sw, sh, x0, y0, rw, rh);
    ctx.restore();
  }

  snapshot(maxW = 360, quality = 0.72) {
    const w = this.out.width, h = this.out.height;
    if (!w || !h) return Promise.resolve(null);
    const scale = Math.min(1, maxW / w);
    const c = document.createElement('canvas');
    c.width = Math.round(w * scale); c.height = Math.round(h * scale);
    c.getContext('2d').drawImage(this.out, 0, 0, c.width, c.height);
    return new Promise(res => c.toBlob(b => res(b), 'image/jpeg', quality));
  }
}

function grow(r, f) {
  if (r.kind === 'bar') return { ...r, len: r.len * f, thick: r.thick * f };
  const nw = r.w * f, nh = r.h * f;
  return { ...r, x: r.x - (nw - r.w) / 2, y: r.y - (nh - r.h) / 2, w: nw, h: nh };
}
