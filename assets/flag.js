/* ============================================================
   IRAK — العراق — 3D-Flaggen-Simulation
   Echte Stoffphysik (Verlet-Integration, 3D-Punktgitter,
   Distanz-Constraints) auf Canvas 2D:
   - Wind aus überlagerten, nie exakt wiederholenden Wellen + Böen
   - Beleuchtung pro Zelle über Flächennormalen (Falten mit Tiefe)
   - Der Takbir „الله أكبر" ist Textur und verformt sich mit dem Stoff
   - Maus/Finger schieben den Stoff physikalisch an, Hover = mehr Wind
   Keine externen Bibliotheken.
   ============================================================ */
(function () {
  "use strict";

  const canvas = document.getElementById("flagCanvas");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ================= Flaggen-Textur (offscreen) ================= */
  const TW = 900, TH = 600;
  const tex = document.createElement("canvas");
  tex.width = TW; tex.height = TH;
  const tctx = tex.getContext("2d");
  let textBounds = { x0: TW * 0.2, x1: TW * 0.8, y0: TH / 3, y1: (TH * 2) / 3 };

  const RED = [206, 17, 38], WHITE = [244, 243, 238], BLACK = [18, 18, 20];

  function paintTexture() {
    tctx.fillStyle = "rgb(" + RED.join(",") + ")"; tctx.fillRect(0, 0, TW, TH / 3);
    tctx.fillStyle = "rgb(" + WHITE.join(",") + ")"; tctx.fillRect(0, TH / 3, TW, TH / 3);
    tctx.fillStyle = "rgb(" + BLACK.join(",") + ")"; tctx.fillRect(0, (TH * 2) / 3, TW, TH / 3);

    // Takbir in grüner Kufi-Schrift. textAlign/measureText sind mit
    // RTL-Schrift + Fallback-Fonts unzuverlässig — deshalb: auf eine
    // Hilfs-Canvas malen, die echten Pixelgrenzen scannen und exakt
    // zentriert + eingepasst in die Textur kopieren.
    const tmp = document.createElement("canvas");
    tmp.width = TW; tmp.height = TH;
    const xc = tmp.getContext("2d");
    xc.fillStyle = "#007a3d";
    xc.font = '700 150px "Noto Kufi Arabic", "Amiri", "Traditional Arabic", serif';
    xc.textAlign = "center"; xc.textBaseline = "middle";
    try { xc.direction = "rtl"; } catch (e) { /* ältere Browser */ }
    xc.fillText("الله أكبر", TW / 2, TH / 2);

    const img = xc.getImageData(0, 0, TW, TH).data;
    let minX = TW, maxX = 0, minY = TH, maxY = 0;
    for (let y = 0; y < TH; y += 2) {
      for (let x = 0; x < TW; x += 2) {
        if (img[(y * TW + x) * 4 + 3] > 40) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX > minX) {
      const bw = maxX - minX + 4, bh = maxY - minY + 4;
      const s = Math.min((TW * 0.58) / bw, (TH / 3) * 0.62 / bh);
      const dw = bw * s, dh = bh * s;
      const dx = TW / 2 - dw / 2, dy = TH / 2 - dh / 2;
      tctx.drawImage(tmp, minX - 2, minY - 2, bw, bh, dx, dy, dw, dh);
      textBounds = { x0: dx - 20, x1: dx + dw + 20, y0: TH / 3, y1: (TH * 2) / 3 };
    }
  }
  paintTexture();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { paintTexture(); if (cells.length) classifyCells(); drawStatic(); });
  }

  /* ================= Stoff-Gitter ================= */
  let W = 0, H = 0, dpr = 1;
  let COLS = 40, ROWS = 26, SP = 14;      // Spalten, Reihen, Punktabstand
  let flagW = 0, flagH = 0, ox = 0, oy = 0, poleX = 0;
  let px = [], py = [], pz = [], ppx = [], ppy = [], ppz = [], pinned = [];
  let cells = [];                          // { tex, u0, v0, u1, v1, base } je Zelle
  let order = [];                          // Zeichenreihenfolge (Tiefensortierung)

  const G = 0.9;                           // relative Schwerkraft
  const DRAG = 0.984;
  const ITER = 3;

  let quality = 1; // 1 = voll, 0.7 = reduziert (adaptiv bei schwacher Hardware)

  function layout() {
    dpr = Math.min(window.devicePixelRatio || 1, quality < 1 ? 1.25 : 1.75);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    COLS = Math.round((W < 560 ? 26 : (W < 900 ? 34 : 42)) * quality);
    ROWS = Math.round(COLS * 0.62);
    flagW = Math.min(W * 0.76, 820);
    flagH = flagW * (2 / 3);
    if (flagH > H * 0.66) { flagH = H * 0.66; flagW = flagH * 1.5; }
    SP = flagW / COLS;
    poleX = W / 2 - flagW / 2 - 18;
    ox = poleX + 12;
    oy = H * 0.47 - flagH * 0.5;

    const N = (COLS + 1) * (ROWS + 1);
    px = new Float32Array(N); py = new Float32Array(N); pz = new Float32Array(N);
    ppx = new Float32Array(N); ppy = new Float32Array(N); ppz = new Float32Array(N);
    pinned = new Uint8Array(N);
    for (let j = 0; j <= ROWS; j++) {
      for (let i = 0; i <= COLS; i++) {
        const k = j * (COLS + 1) + i;
        px[k] = ox + i * SP;
        py[k] = oy + j * (flagH / ROWS);
        pz[k] = Math.sin(i * 0.5) * SP * 0.4;   // leichte Startwelle
        ppx[k] = px[k]; ppy[k] = py[k]; ppz[k] = pz[k];
        if (i === 0) pinned[k] = 1;             // am Mast fixiert
      }
    }
    classifyCells();
    order = cells.map((_, idx) => idx);
  }

  function classifyCells() {
    cells = [];
    for (let j = 0; j < ROWS; j++) {
      for (let i = 0; i < COLS; i++) {
        const u0 = (i / COLS) * TW, u1 = ((i + 1) / COLS) * TW;
        const v0 = (j / ROWS) * TH, v1 = ((j + 1) / ROWS) * TH;
        const overlapsText = u1 > textBounds.x0 && u0 < textBounds.x1 && v1 > textBounds.y0 && v0 < textBounds.y1;
        const vm = (v0 + v1) / 2;
        const base = vm < TH / 3 ? RED : (vm < (TH * 2) / 3 ? WHITE : BLACK);
        cells.push({ i, j, tex: overlapsText, u0, v0, u1, v1, base });
      }
    }
  }

  /* ================= Wind (organisch, nicht loopend) ================= */
  let t = 0;
  let gust = 1, gustTarget = 1, gustTimer = 0;
  let hoverBoost = 1, hoverTarget = 1;

  function windStep() {
    t += 1 / 60;
    gustTimer -= 1 / 60;
    if (gustTimer <= 0) {                          // zufällige Böen
      gustTarget = 0.85 + Math.random() * 0.95;
      gustTimer = 2.5 + Math.random() * 5.5;
    }
    gust += (gustTarget - gust) * 0.015;
    hoverBoost += (hoverTarget - hoverBoost) * 0.06;
    // Grundwind: Überlagerung inkommensurabler Frequenzen → kein Loop.
    // Untergrenze, damit die Fahne nie kraftlos durchhängt.
    const base = 1 + 0.4 * Math.sin(t * 0.61) + 0.27 * Math.sin(t * 0.233 + 2.1) + 0.14 * Math.sin(t * 1.77 + 0.7);
    return Math.max(0.8, base * gust) * hoverBoost;
  }

  /* ================= Maus / Touch ================= */
  const mouse = { x: -9999, y: -9999, vx: 0, vy: 0, on: false };
  canvas.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    const nx = e.clientX - r.left, ny = e.clientY - r.top;
    if (mouse.on) { mouse.vx = nx - mouse.x; mouse.vy = ny - mouse.y; }
    mouse.x = nx; mouse.y = ny; mouse.on = true;
    if (finePointer) hoverTarget = 1.9;
  }, { passive: true });
  canvas.addEventListener("pointerleave", () => {
    mouse.on = false; mouse.vx = 0; mouse.vy = 0;
    hoverTarget = 1;
  });

  /* ================= Simulation ================= */
  function step() {
    const wind = windStep();
    const amp = SP * 0.055 * wind;
    const grav = SP * 0.007 * G - amp * 0.06;   // Wind erzeugt leichten Auftrieb
    const mR = flagW * 0.22, mR2 = mR * mR;
    const mPush = Math.min(Math.hypot(mouse.vx, mouse.vy), 40);

    for (let j = 0; j <= ROWS; j++) {
      for (let i = 0; i <= COLS; i++) {
        const k = j * (COLS + 1) + i;
        if (pinned[k]) continue;
        const u = i / COLS, v = j / ROWS;
        // Windkraft: räumliche Wellen wandern durch den Stoff
        let fx = amp * (0.6 + 0.45 * Math.sin(4.2 * u - t * 2.3 + v * 1.4));
        let fy = grav + amp * 0.16 * Math.sin(8.8 * u - t * 3.6 + v * 6.2);
        let fz = amp * (0.85 * Math.sin(6.3 * u - t * 3.1 + v * 2.2)
               + 0.4 * Math.sin(11.4 * u - t * 4.9 + v * 4.7 + 1.3));
        // Maus: physikalischer Schub auf nahe Stoffpunkte
        if (mouse.on && mPush > 0.4) {
          const dx = px[k] - mouse.x, dy = py[k] - mouse.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < mR2) {
            const fall = 1 - Math.sqrt(d2) / mR;
            fx += mouse.vx * 0.06 * fall;
            fy += mouse.vy * 0.06 * fall;
            fz -= mPush * 0.10 * fall;
          }
        }
        const nx = px[k] + (px[k] - ppx[k]) * DRAG + fx;
        const ny = py[k] + (py[k] - ppy[k]) * DRAG + fy;
        const nz = pz[k] + (pz[k] - ppz[k]) * DRAG + fz;
        ppx[k] = px[k]; ppy[k] = py[k]; ppz[k] = pz[k];
        px[k] = nx; py[k] = ny; pz[k] = nz;
      }
    }
    mouse.vx *= 0.72; mouse.vy *= 0.72;

    // Constraints: Nachbarabstände (strukturell, horizontal + vertikal)
    const restX = SP, restY = flagH / ROWS;
    for (let it = 0; it < ITER; it++) {
      for (let j = 0; j <= ROWS; j++) {
        for (let i = 0; i <= COLS; i++) {
          const k = j * (COLS + 1) + i;
          if (i < COLS) relax(k, k + 1, restX);
          if (j < ROWS) relax(k, k + COLS + 1, restY);
        }
      }
      // Mastpunkte zurücksetzen
      for (let j = 0; j <= ROWS; j++) {
        const k = j * (COLS + 1);
        px[k] = ox; py[k] = oy + j * restY; pz[k] = 0;
      }
    }
  }

  function relax(a, b, rest) {
    const dx = px[b] - px[a], dy = py[b] - py[a], dz = pz[b] - pz[a];
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.0001;
    const diff = (d - rest) / d;
    const pa = pinned[a], pb = pinned[b];
    if (pa && pb) return;
    const wa = pa ? 0 : (pb ? 1 : 0.5);
    const wb = pb ? 0 : (pa ? 1 : 0.5);
    px[a] += dx * diff * wa; py[a] += dy * diff * wa; pz[a] += dz * diff * wa;
    px[b] -= dx * diff * wb; py[b] -= dy * diff * wb; pz[b] -= dz * diff * wb;
  }

  /* ================= Rendering ================= */
  const LX = 0.26, LY = 0.32, LZ = -0.91;   // Lichtrichtung (vorn oben links)
  const FOV = 900;

  function project(k, out) {
    const s = FOV / (FOV + pz[k]);
    out.x = W / 2 + (px[k] - W / 2) * s;
    out.y = H / 2 + (py[k] - H / 2) * s;
  }
  const q0 = {}, q1 = {}, q2 = {}, q3 = {};

  function render() {
    ctx.clearRect(0, 0, W, H);

    // Bodenschatten der Flagge
    const shY = oy + flagH + Math.min(H - (oy + flagH), 52) * 0.7;
    const shG = ctx.createRadialGradient(ox + flagW / 2, shY, 0, ox + flagW / 2, shY, flagW * 0.55);
    shG.addColorStop(0, "rgba(2,4,12,0.42)");
    shG.addColorStop(1, "rgba(2,4,12,0)");
    ctx.save();
    ctx.translate(ox + flagW / 2, shY);
    ctx.scale(1, 0.12);
    ctx.translate(-(ox + flagW / 2), -shY);
    ctx.fillStyle = shG;
    ctx.fillRect(0, 0, W, H * 4);
    ctx.restore();

    // Fahnenmast
    const poleTop = oy - flagH * 0.16, poleBot = Math.min(H - 8, oy + flagH + 46);
    const pg = ctx.createLinearGradient(poleX - 5, 0, poleX + 6, 0);
    pg.addColorStop(0, "#5a6272"); pg.addColorStop(0.45, "#c9d2de"); pg.addColorStop(1, "#4a5160");
    ctx.fillStyle = pg;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(poleX - 5, poleTop, 11, poleBot - poleTop, 5);
    else ctx.rect(poleX - 5, poleTop, 11, poleBot - poleTop);
    ctx.fill();
    const bg = ctx.createRadialGradient(poleX - 2, poleTop - 8, 1, poleX, poleTop - 6, 11);
    bg.addColorStop(0, "#f6e2ae"); bg.addColorStop(1, "#b9862f");
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(poleX + 0.5, poleTop - 6, 9, 0, 6.2832); ctx.fill();

    // Zellen nach Tiefe sortieren (hinten zuerst)
    const CW = COLS + 1;
    order.sort((a, b) => {
      const ca = cells[a], cb = cells[b];
      const za = pz[ca.j * CW + ca.i] + pz[(ca.j + 1) * CW + ca.i + 1];
      const zb = pz[cb.j * CW + cb.i] + pz[(cb.j + 1) * CW + cb.i + 1];
      return zb - za;
    });

    for (let n = 0; n < order.length; n++) {
      const c = cells[order[n]];
      const k00 = c.j * CW + c.i, k10 = k00 + 1, k01 = k00 + CW, k11 = k01 + 1;
      project(k00, q0); project(k10, q1); project(k11, q2); project(k01, q3);

      // Flächennormale → Lambert-Beleuchtung (Falten!)
      const ax = px[k10] - px[k00], ay = py[k10] - py[k00], az = pz[k10] - pz[k00];
      const bx = px[k01] - px[k00], by = py[k01] - py[k00], bz = pz[k01] - pz[k00];
      let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
      const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      nx /= nl; ny /= nl; nz /= nl;
      if (nz > 0) { nx = -nx; ny = -ny; nz = -nz; }   // Normale zum Betrachter
      const diff = Math.max(0, nx * LX + ny * LY + nz * LZ);
      const shade = 0.44 + 0.72 * diff;                // 0.44 … 1.16

      if (!c.tex) {
        // Einfarbige Zelle: Farbe direkt schattieren; Quad leicht
        // aufgeblasen füllen (eine Rasterung, keine Fugen)
        const r = Math.min(255, c.base[0] * shade) | 0;
        const g = Math.min(255, c.base[1] * shade) | 0;
        const b = Math.min(255, c.base[2] * shade) | 0;
        const mx = (q0.x + q1.x + q2.x + q3.x) / 4, my = (q0.y + q1.y + q2.y + q3.y) / 4;
        const s = 1.06;
        ctx.beginPath();
        ctx.moveTo(mx + (q0.x - mx) * s, my + (q0.y - my) * s);
        ctx.lineTo(mx + (q1.x - mx) * s, my + (q1.y - my) * s);
        ctx.lineTo(mx + (q2.x - mx) * s, my + (q2.y - my) * s);
        ctx.lineTo(mx + (q3.x - mx) * s, my + (q3.y - my) * s);
        ctx.closePath();
        ctx.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
        ctx.fill();
      } else {
        // Texturierte Zelle (Schriftzug): Best-Fit-Parallelogramm ohne
        // Clipping — ein einziges drawImage des Zell-Ausschnitts.
        quadTex(c, shade);
      }
    }
  }

  function quadTex(c, shade) {
    // Best-Fit-Parallelogramm des Quads (q0..q3 sind bereits projiziert):
    // U-Achse = Mittel der oberen/unteren Kante, V-Achse = Mittel der Seiten.
    const du = c.u1 - c.u0, dv = c.v1 - c.v0;
    const ux = ((q1.x - q0.x) + (q2.x - q3.x)) / 2 / du;
    const uy = ((q1.y - q0.y) + (q2.y - q3.y)) / 2 / du;
    const vx = ((q3.x - q0.x) + (q2.x - q1.x)) / 2 / dv;
    const vy = ((q3.y - q0.y) + (q2.y - q1.y)) / 2 / dv;
    // Textur-Zellmitte auf Quad-Mitte legen
    const mx = (q0.x + q1.x + q2.x + q3.x) / 4, my = (q0.y + q1.y + q2.y + q3.y) / 4;
    const cu = c.u0 + du / 2, cv = c.v0 + dv / 2;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.transform(ux, uy, vx, vy, mx - ux * cu - vx * cv, my - uy * cu - vy * cv);
    const sx = Math.max(0, c.u0 - 2), sy = Math.max(0, c.v0 - 2);
    const sw = Math.min(TW - sx, du + 4), sh = Math.min(TH - sy, dv + 4);
    ctx.drawImage(tex, sx, sy, sw, sh, sx, sy, sw, sh);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Licht/Schatten über der Textur (nur wenn sichtbar abweichend)
    if (shade < 0.97 || shade > 1.03) {
      ctx.beginPath();
      ctx.moveTo(q0.x, q0.y); ctx.lineTo(q1.x, q1.y);
      ctx.lineTo(q2.x, q2.y); ctx.lineTo(q3.x, q3.y);
      ctx.closePath();
      ctx.fillStyle = shade < 1
        ? "rgba(6,8,18," + ((1 - shade) * 0.72).toFixed(3) + ")"
        : "rgba(255,250,235," + ((shade - 1) * 0.55).toFixed(3) + ")";
      ctx.fill();
    }
  }

  /* ================= Loop / Sichtbarkeit ================= */
  let raf = null, visible = false;
  let ftSum = 0, ftCount = 0, ftChecked = false;

  function frame() {
    const f0 = performance.now();
    step();
    render();
    // Adaptive Qualität: ruckelt es anfangs, Gitter + DPR reduzieren
    if (!ftChecked) {
      ftSum += performance.now() - f0;
      if (++ftCount === 60) {
        ftChecked = true;
        if (ftSum / 60 > 22 && quality === 1) {
          quality = 0.7;
          layout();
          warmup(80);
        }
      }
    }
    raf = requestAnimationFrame(frame);
  }
  function start() { if (raf === null && visible && !reduced) raf = requestAnimationFrame(frame); }
  function stop() { if (raf !== null) { cancelAnimationFrame(raf); raf = null; } }

  function warmup(n) { for (let i = 0; i < n; i++) step(); }
  function drawStatic() { if (reduced || raf === null) render(); }

  layout();
  warmup(150);
  render();

  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      visible ? start() : stop();
    }, { rootMargin: "80px" }).observe(canvas);
  } else { visible = true; start(); }

  document.addEventListener("visibilitychange", () => { document.hidden ? stop() : (visible && start()); });

  let rT = null;
  window.addEventListener("resize", () => {
    clearTimeout(rT);
    rT = setTimeout(() => { layout(); warmup(90); render(); }, 150);
  });
})();
