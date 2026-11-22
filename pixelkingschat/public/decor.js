// Pixelkingschat – animierte Profilbilder & Profilrahmen
// Alles wird als kleine animierte SVG-Grafik direkt im Browser erzeugt (kein Download, kein Datenvolumen).
// IDs: "f-de" = Flagge, "e-fire" = Effekt. Profilbild und Rahmen nutzen dieselben Flaggen.

const W = 24;
const H = 16;

/* ================= Pixel-Werkzeuge ================= */
const grid = (bg) => Array.from({ length: H }, () => Array(W).fill(bg));
function hs(g, cols, wts) {
  const w = wts || cols.map(() => 1);
  const tot = w.reduce((a, b) => a + b, 0);
  for (let y = 0; y < H; y++) {
    let acc = 0;
    const pos = ((y + 0.5) / H) * tot;
    for (let i = 0; i < cols.length; i++) {
      acc += w[i];
      if (pos < acc) {
        g[y].fill(cols[i]);
        break;
      }
    }
  }
  return g;
}
function vs(g, cols, wts) {
  const w = wts || cols.map(() => 1);
  const tot = w.reduce((a, b) => a + b, 0);
  for (let x = 0; x < W; x++) {
    let acc = 0;
    const pos = ((x + 0.5) / W) * tot;
    for (let i = 0; i < cols.length; i++) {
      acc += w[i];
      if (pos < acc) {
        for (let y = 0; y < H; y++) g[y][x] = cols[i];
        break;
      }
    }
  }
  return g;
}
const set = (g, x, y, c) => {
  if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c;
};
function rect(g, x, y, w, h, c) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(g, i, j, c);
}
function circ(g, cx, cy, r, c) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) g[y][x] = c;
}
function ring(g, cx, cy, r1, r2, c) {
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d >= r1 && d <= r2) g[y][x] = c;
    }
}
// Halbmond: Kreis malen, dann versetzten Kreis mit dem ursprünglichen Hintergrund „ausschneiden“
function crescent(g, cx, cy, r, off, ri, c) {
  const base = g.map((row) => row.slice());
  circ(g, cx, cy, r, c);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x + 0.5 - cx - off) ** 2 + (y + 0.5 - cy) ** 2 <= ri * ri) g[y][x] = base[y][x];
}
function sprite(g, x, y, rows, c) {
  rows.forEach((row, j) => [...row].forEach((ch, i) => ch === "#" && set(g, x + i, y + j, c)));
}
function hoistTri(g, depth, c) {
  for (let y = 0; y < H; y++) {
    const half = depth * (1 - Math.abs(y + 0.5 - H / 2) / (H / 2));
    for (let x = 0; x < W; x++) if (x + 0.5 < half) g[y][x] = c;
  }
}
function nordic(g, cross, inner) {
  rect(g, 6, 0, 4, H, cross);
  rect(g, 0, 6, W, 4, cross);
  if (inner) {
    rect(g, 7, 0, 2, H, inner);
    rect(g, 0, 7, W, 2, inner);
  }
  return g;
}
const S5 = ["..#..", ".###.", "#####", ".###.", ".#.#."];
const S3 = [".#.", "###", ".#."];

/* ================= Flaggen (24×16 Pixel) ================= */
const F = [];
const flag = (id, name, draw) => F.push({ id, name, draw });

flag("de", "Deutschland", () => hs(grid(), ["#111", "#dd0000", "#ffce00"]));
flag("at", "Österreich", () => hs(grid(), ["#c8102e", "#fff", "#c8102e"]));
flag("ch", "Schweiz", () => {
  const g = grid("#d52b1e");
  rect(g, 10, 3, 4, 10, "#fff");
  rect(g, 7, 6, 10, 4, "#fff");
  return g;
});
flag("al", "Albanien", () => {
  const g = grid("#e41e20");
  sprite(g, 6, 2, [
    ".#........#.",
    "##.#....#.##",
    ".####..####.",
    "..########..",
    "...######...",
    ".##.####.##.",
    "##..####..##",
    "....####....",
    "...######...",
    "..##.##.##..",
    ".#...##...#.",
  ], "#111");
  return g;
});
flag("xk", "Kosovo", () => {
  const g = grid("#244aa5");
  sprite(g, 8, 7, ["..####..", ".######.", "########", ".#######", "..#####.", "...##..."], "#d0a650");
  [[6, 5], [8, 4], [10, 3], [13, 3], [15, 4], [17, 5]].forEach(([x, y]) => set(g, x, y, "#fff"));
  return g;
});
flag("tr", "Türkei", () => {
  const g = grid("#e30a17");
  crescent(g, 9, 8, 4.6, 1.3, 3.7, "#fff");
  sprite(g, 13, 6, S5, "#fff");
  return g;
});
flag("ku", "Kurdistan", () => {
  const g = hs(grid(), ["#ed2024", "#fff", "#278e43"]);
  circ(g, 12, 8, 2.6, "#febd11");
  [[12, 4], [12, 11], [8, 8], [15, 8], [9, 5], [15, 5], [9, 11], [15, 11]].forEach(([x, y]) => set(g, x, y, "#febd11"));
  return g;
});
flag("sy", "Syrien", () => {
  const g = hs(grid(), ["#007a3d", "#fff", "#111"]);
  [5, 10.5, 16].forEach((x) => sprite(g, Math.round(x), 6, S3, "#ce1126"));
  return g;
});
flag("iq", "Irak", () => {
  const g = hs(grid(), ["#ce1126", "#fff", "#111"]);
  sprite(g, 7, 7, ["##.#.##.#", "#.###.###"], "#007a3d");
  return g;
});
flag("lb", "Libanon", () => {
  const g = hs(grid(), ["#ed1c24", "#fff", "#ed1c24"], [1, 2, 1]);
  sprite(g, 9, 5, ["..##..", ".####.", "######", ".####.", "######", "..##.."], "#00a651");
  return g;
});
flag("ps", "Palästina", () => {
  const g = hs(grid(), ["#111", "#fff", "#007a3d"]);
  hoistTri(g, 10, "#ce1126");
  return g;
});
flag("il", "Israel", () => {
  const g = grid("#fff");
  rect(g, 0, 2, W, 2, "#0038b8");
  rect(g, 0, 12, W, 2, "#0038b8");
  sprite(g, 9, 4, ["...#...", "..#.#..", "#######", ".#...#.", "#######", "..#.#..", "...#..."], "#0038b8");
  return g;
});
flag("ma", "Marokko", () => {
  const g = grid("#c1272d");
  sprite(g, 10, 5, S5, "#006233");
  return g;
});
flag("tn", "Tunesien", () => {
  const g = grid("#e70013");
  circ(g, 12, 8, 4.8, "#fff");
  crescent(g, 11.6, 8, 3.4, 1.1, 2.7, "#e70013");
  set(g, 13, 8, "#e70013");
  set(g, 14, 8, "#e70013");
  set(g, 13, 7, "#e70013");
  return g;
});
flag("dz", "Algerien", () => {
  const g = vs(grid(), ["#006233", "#fff"]);
  crescent(g, 12, 8, 4.4, 1.4, 3.5, "#d21034");
  sprite(g, 13, 7, S3, "#d21034");
  return g;
});
flag("eg", "Ägypten", () => {
  const g = hs(grid(), ["#ce1126", "#fff", "#111"]);
  sprite(g, 10, 6, [".##.", "####", ".##.", "#..#"], "#c09300");
  return g;
});
flag("pl", "Polen", () => hs(grid(), ["#fff", "#dc143c"]));
flag("ua", "Ukraine", () => hs(grid(), ["#0057b7", "#ffd700"]));
flag("ru", "Russland", () => hs(grid(), ["#fff", "#0039a6", "#d52b1e"]));
flag("ro", "Rumänien", () => vs(grid(), ["#002b7f", "#fcd116", "#ce1126"]));
flag("bg", "Bulgarien", () => hs(grid(), ["#fff", "#00966e", "#d62612"]));
flag("gr", "Griechenland", () => {
  const g = hs(grid(), Array.from({ length: 9 }, (_, i) => (i % 2 ? "#fff" : "#0d5eaf")));
  rect(g, 0, 0, 10, 9, "#0d5eaf");
  rect(g, 4, 0, 2, 9, "#fff");
  rect(g, 0, 3, 10, 2, "#fff");
  return g;
});
flag("it", "Italien", () => vs(grid(), ["#009246", "#fff", "#ce2b37"]));
flag("fr", "Frankreich", () => vs(grid(), ["#0055a4", "#fff", "#ef4135"]));
flag("es", "Spanien", () => {
  const g = hs(grid(), ["#aa151b", "#f1bf00", "#aa151b"], [1, 2, 1]);
  sprite(g, 5, 6, ["###", "#.#", "###", ".#."], "#aa151b");
  return g;
});
flag("pt", "Portugal", () => {
  const g = vs(grid(), ["#006600", "#ff0000"], [2, 3]);
  circ(g, 9.6, 8, 3.2, "#ffcc00");
  circ(g, 9.6, 8, 2, "#ff0000");
  rect(g, 9, 7, 2, 2, "#fff");
  return g;
});
flag("nl", "Niederlande", () => hs(grid(), ["#ae1c28", "#fff", "#21468b"]));
flag("be", "Belgien", () => vs(grid(), ["#111", "#fdda24", "#ef3340"]));
flag("hr", "Kroatien", () => {
  const g = hs(grid(), ["#ff0000", "#fff", "#171796"]);
  for (let y = 0; y < 6; y++) for (let x = 0; x < 5; x++) set(g, 10 + x, 5 + y, (x + y) % 2 ? "#fff" : "#ff0000");
  return g;
});
flag("ba", "Bosnien", () => {
  const g = grid("#002395");
  for (let y = 0; y < H; y++) for (let x = 6; x < 18; x++) if (y + 0.5 < ((x - 6 + 0.5) * 16) / 11) g[y][x] = "#fecb00";
  [[4, 1], [6, 3], [7, 5], [9, 7], [10, 9], [11, 11], [13, 13], [14, 15]].forEach(([x, y]) => set(g, x, y, "#fff"));
  return g;
});
flag("rs", "Serbien", () => {
  const g = hs(grid(), ["#c6363c", "#0c4076", "#fff"]);
  sprite(g, 5, 4, ["####", "#..#", "####", "#..#", ".##."], "#c6363c");
  rect(g, 6, 5, 2, 2, "#fff");
  return g;
});
flag("mk", "Nordmazedonien", () => {
  const g = grid("#d20000");
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const a = Math.atan2(y + 0.5 - 8, (x + 0.5 - 12) / 1.5);
      const k = Math.abs(Math.sin(a * 4));
      if (k < 0.22) g[y][x] = "#ffe600";
    }
  circ(g, 12, 8, 2.8, "#d20000");
  circ(g, 12, 8, 2.2, "#ffe600");
  return g;
});
flag("gb", "Großbritannien", () => {
  const g = grid("#012169");
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const d1 = Math.abs(py - (px * H) / W) * 0.83;
      const d2 = Math.abs(py - (H - (px * H) / W)) * 0.83;
      if (Math.min(d1, d2) < 1.7) g[y][x] = "#fff";
      if (Math.min(d1, d2) < 0.7) g[y][x] = "#c8102e";
    }
  rect(g, 9, 0, 6, H, "#fff");
  rect(g, 0, 5, W, 6, "#fff");
  rect(g, 10, 0, 4, H, "#c8102e");
  rect(g, 0, 6, W, 4, "#c8102e");
  return g;
});
flag("us", "USA", () => {
  const g = grid();
  for (let y = 0; y < H; y++) g[y].fill(Math.floor(((y + 0.5) * 13) / H) % 2 ? "#fff" : "#b22234");
  rect(g, 0, 0, 10, 9, "#3c3b6e");
  for (let y = 1; y < 9; y += 2) for (let x = 1; x < 10; x += 2) set(g, x, y, "#fff");
  return g;
});
flag("br", "Brasilien", () => {
  const g = grid("#009c3b");
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (Math.abs(x + 0.5 - 12) / 10.5 + Math.abs(y + 0.5 - 8) / 6.5 <= 1) g[y][x] = "#ffdf00";
  circ(g, 12, 8, 3.7, "#002776");
  rect(g, 9, 7, 6, 1, "#fff");
  return g;
});
flag("ng", "Nigeria", () => vs(grid(), ["#008751", "#fff", "#008751"]));
flag("gh", "Ghana", () => {
  const g = hs(grid(), ["#ce1126", "#fcd116", "#006b3f"]);
  sprite(g, 10, 5, S5, "#111");
  return g;
});
flag("so", "Somalia", () => {
  const g = grid("#4189dd");
  sprite(g, 10, 5, S5, "#fff");
  return g;
});
flag("et", "Äthiopien", () => {
  const g = hs(grid(), ["#078930", "#fcdd09", "#da121a"]);
  circ(g, 12, 8, 3.6, "#0f47af");
  sprite(g, 10, 6, S5, "#fcdd09");
  return g;
});
flag("jp", "Japan", () => {
  const g = grid("#fff");
  circ(g, 12, 8, 4.7, "#bc002d");
  return g;
});
flag("kr", "Südkorea", () => {
  const g = grid("#fff");
  circ(g, 12, 8, 4.2, "#cd2e3a");
  for (let y = 8; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x] === "#cd2e3a") g[y][x] = "#0047a0";
  sprite(g, 2, 1, ["###", "###", "###"], "#111");
  sprite(g, 19, 1, ["#.#", "###", "#.#"], "#111");
  sprite(g, 2, 12, ["###", "#.#", "###"], "#111");
  sprite(g, 19, 12, ["#.#", "#.#", "#.#"], "#111");
  return g;
});
flag("cn", "China", () => {
  const g = grid("#de2910");
  sprite(g, 2, 2, S5, "#ffde00");
  [[8, 1], [9, 3], [9, 6], [8, 8]].forEach(([x, y]) => set(g, x, y, "#ffde00"));
  return g;
});
flag("in", "Indien", () => {
  const g = hs(grid(), ["#ff9933", "#fff", "#138808"]);
  ring(g, 12, 8, 1.4, 2.5, "#000080");
  set(g, 11, 7, "#000080");
  return g;
});
flag("pk", "Pakistan", () => {
  const g = grid("#01411c");
  rect(g, 0, 0, 6, H, "#fff");
  crescent(g, 15, 8.5, 4.3, 1.4, 3.5, "#fff");
  sprite(g, 16, 4, S3, "#fff");
  return g;
});
flag("az", "Aserbaidschan", () => {
  const g = hs(grid(), ["#0092bc", "#e4002b", "#00af66"]);
  crescent(g, 11, 8, 2.6, 0.9, 2, "#fff");
  set(g, 13, 8, "#fff");
  return g;
});
flag("ge", "Georgien", () => {
  const g = grid("#fff");
  rect(g, 10, 0, 4, H, "#ff0000");
  rect(g, 0, 6, W, 4, "#ff0000");
  [[4, 2], [18, 2], [4, 12], [18, 12]].forEach(([x, y]) => sprite(g, x, y, [".#.", "###", ".#."], "#ff0000"));
  return g;
});
flag("am", "Armenien", () => hs(grid(), ["#d90012", "#0033a0", "#f2a800"]));
flag("cz", "Tschechien", () => {
  const g = hs(grid(), ["#fff", "#d7141a"]);
  hoistTri(g, 12, "#11457e");
  return g;
});
flag("hu", "Ungarn", () => hs(grid(), ["#ce2939", "#fff", "#477050"]));
flag("ie", "Irland", () => vs(grid(), ["#169b62", "#fff", "#ff883e"]));
flag("se", "Schweden", () => nordic(grid("#006aa7"), "#fecc00"));
flag("no", "Norwegen", () => nordic(grid("#ba0c2f"), "#fff", "#00205b"));
flag("dk", "Dänemark", () => nordic(grid("#c8102e"), "#fff"));
flag("fi", "Finnland", () => nordic(grid("#fff"), "#002f6c"));
flag("ar", "Argentinien", () => {
  const g = hs(grid(), ["#74acdf", "#fff", "#74acdf"]);
  circ(g, 12, 8, 2, "#f6b40e");
  return g;
});
flag("mx", "Mexiko", () => {
  const g = vs(grid(), ["#006847", "#fff", "#ce1126"]);
  sprite(g, 10, 5, [".##.", "####", "####", ".##."], "#8c5a2b");
  rect(g, 10, 10, 4, 1, "#006847");
  return g;
});
flag("ca", "Kanada", () => {
  const g = vs(grid(), ["#d80621", "#fff", "#d80621"], [1, 2, 1]);
  sprite(g, 9, 4, ["...#...", ".#.#.#.", ".#####.", "#######", ".#####.", "...#...", "...#..."], "#d80621");
  return g;
});
flag("eu", "Europa", () => {
  const g = grid("#003399");
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    set(g, Math.floor(12 + Math.cos(a) * 5.2), Math.floor(8 + Math.sin(a) * 5.2), "#ffcc00");
  }
  return g;
});
flag("rb", "Regenbogen", () => hs(grid(), ["#e40303", "#ff8c00", "#ffed00", "#008026", "#24408e", "#732982"]));
flag("pp", "Progress Pride", () => {
  const g = hs(grid(), ["#e40303", "#ff8c00", "#ffed00", "#008026", "#24408e", "#732982"]);
  // Pfeil am Fahnenmast: Schwarz, Braun, Hellblau, Rosa, Weiß (von außen nach innen)
  const layers = [[14, "#000000"], [12, "#784f17"], [10, "#5bcefa"], [8, "#f5a9b8"], [6, "#ffffff"]];
  for (const [depth, c] of layers)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x + 0.5 < depth - Math.abs(y + 0.5 - H / 2) * 0.95) g[y][x] = c;
  return g;
});
flag("pkc", "Pixelkingschat", () => {
  const g = grid("#0b1416");
  sprite(g, 6, 4, ["#...#...#...", "##.###.###.#", "############", "############", "#.#.#.#.#.##", "############", "############"].map((r) => r.slice(0, 12)), "#2ee6d6");
  rect(g, 0, 0, W, 1, "#2ee6d6");
  rect(g, 0, H - 1, W, 1, "#2ee6d6");
  return g;
});

export const FLAGS = F.map(({ id, name }) => ({ id: "f-" + id, name }));
const flagById = new Map(F.map((f) => [f.id, f]));
const gridCache = new Map();
function flagGrid(id) {
  if (!gridCache.has(id)) gridCache.set(id, flagById.get(id).draw());
  return gridCache.get(id);
}
// Hauptfarben einer Flagge (für die Ringe)
const RING_COLORS = {
  rb: ["#e40303", "#ff8c00", "#ffed00", "#008026", "#24408e", "#732982"],
  pp: ["#e40303", "#ff8c00", "#ffed00", "#008026", "#24408e", "#732982", "#000000", "#784f17", "#5bcefa", "#f5a9b8", "#ffffff"],
};
function flagColors(id) {
  if (RING_COLORS[id]) return RING_COLORS[id];
  const cnt = new Map();
  for (const row of flagGrid(id)) for (const c of row) cnt.set(c, (cnt.get(c) || 0) + 1);
  return [...cnt.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([c]) => c);
}

/* ================= SVG-Bausteine ================= */
const svgDoc = (vb, body, extra = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" shape-rendering="crispEdges">${extra}${body}</svg>`;
const anim = (attr, values, dur, begin = 0, extra = "") =>
  `<animate attributeName="${attr}" values="${values}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"${extra}/>`;
const animT = (type, values, dur, begin = 0, extra = "") =>
  `<animateTransform attributeName="transform" type="${type}" values="${values}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"${extra}/>`;

// Wehende Flagge: jede Spalte schwingt zeitversetzt, dazu ein wandernder Lichtschimmer
function wavingFlag(id, x0, y0, s) {
  const g = flagGrid(id);
  let out = `<g transform="translate(${x0} ${y0}) scale(${s})">`;
  for (let x = 0; x < W; x++) {
    let col = "";
    let y = 0;
    while (y < H) {
      const c = g[y][x];
      let h = 1;
      while (y + h < H && g[y + h][x] === c) h++;
      col += `<rect x="${x}" y="${y}" width="1.04" height="${h}" fill="${c}"/>`;
      y += h;
    }
    const b = (-x * 0.075).toFixed(3);
    col += `<rect x="${x}" y="0" width="1.04" height="${H}" fill="#fff" opacity="0">${anim("opacity", "0;0.22;0;0;0", 1.6, b)}</rect>`;
    out += `<g>${animT("translate", "0 0;0 -0.7;0 0;0 0.7;0 0", 1.6, b)}${col}</g>`;
  }
  return out + "</g>";
}

/* ================= Animierte Profilbilder ================= */
const BG = (a, b) =>
  `<defs><radialGradient id="bg" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient></defs><rect width="32" height="32" fill="url(#bg)"/>`;
const rnd = (seed) => () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
const heart = (x, y, c) =>
  `<g transform="translate(${x} ${y})" fill="${c}"><rect x="1" y="0" width="2" height="1"/><rect x="4" y="0" width="2" height="1"/><rect x="0" y="1" width="7" height="2"/><rect x="1" y="3" width="5" height="1"/><rect x="2" y="4" width="3" height="1"/><rect x="3" y="5" width="1" height="1"/></g>`;

const EFFECTS = {
  fire: {
    name: "Feuer",
    svg() {
      let s = BG("#3a1205", "#0d0402");
      const r = rnd(7);
      for (let x = 2; x < 30; x += 2) {
        const h = 9 + r() * 10;
        const b = (r() * 0.8).toFixed(2);
        for (const [c, k] of [["#e8401c", 1], ["#ff8c1a", 0.66], ["#ffd23f", 0.36]]) {
          const hh = h * k;
          s += `<rect x="${x}" y="${32 - hh}" width="2" height="${hh}" fill="${c}">${anim("height", `${hh};${hh * 1.35};${hh * 0.85};${hh}`, 0.7, b)}${anim("y", `${32 - hh};${32 - hh * 1.35};${32 - hh * 0.85};${32 - hh}`, 0.7, b)}</rect>`;
        }
      }
      return s;
    },
  },
  galaxy: {
    name: "Galaxie",
    svg() {
      let s = BG("#3b1a6b", "#07031a");
      const r = rnd(3);
      for (let i = 0; i < 26; i++) s += `<rect x="${Math.floor(r() * 32)}" y="${Math.floor(r() * 32)}" width="1" height="1" fill="#fff">${anim("opacity", "0.2;1;0.2", 1 + r() * 2, r() * 2)}</rect>`;
      s += `<ellipse cx="16" cy="16" rx="11" ry="4" fill="none" stroke="#b48cff" stroke-width="0.8" opacity=".6"/>`;
      s += `<circle cx="16" cy="16" r="4" fill="#2ee6d6"/><circle cx="15" cy="15" r="1.4" fill="#bafff8"/>`;
      s += `<g>${animT("rotate", "0 16 16;360 16 16", 4)}<circle cx="27" cy="16" r="1.6" fill="#ff7ad9"/></g>`;
      return s;
    },
  },
  hearts: {
    name: "Herzen",
    svg() {
      let s = BG("#5a0f33", "#1a0410");
      const r = rnd(11);
      for (let i = 0; i < 7; i++) {
        const x = 2 + Math.floor(r() * 23);
        const c = ["#ff4d8d", "#ff8fb8", "#ff2d55"][i % 3];
        s += `<g>${animT("translate", "0 36;0 -8", 3 + r() * 2, -r() * 4)}${heart(x, 0, c)}</g>`;
      }
      return s;
    },
  },
  rainbow: {
    name: "Regenbogen",
    svg() {
      const cols = "#ff3b3b;#ff9a1a;#ffe21a;#3ddc6a;#2ee6d6;#4d7cff;#b84dff;#ff3b3b";
      let s = `<rect width="32" height="32" fill="#ff3b3b">${anim("fill", cols, 6)}</rect>`;
      for (let i = -32; i < 32; i += 8) s += `<path d="M${i} 32 L${i + 32} 0 L${i + 36} 0 L${i + 4} 32Z" fill="#fff" opacity=".18">${animT("translate", "0 0;8 0", 1.2)}</path>`;
      s += `<rect x="9" y="9" width="14" height="14" fill="#fff" opacity=".25"/>`;
      return s;
    },
  },
  matrix: {
    name: "Matrix",
    svg() {
      let s = `<rect width="32" height="32" fill="#020a04"/>`;
      const r = rnd(5);
      for (let x = 1; x < 32; x += 3) {
        const d = 1.5 + r() * 2;
        const b = -r() * d;
        let col = "";
        for (let k = 0; k < 7; k++) col += `<rect x="${x}" y="${-k * 2}" width="2" height="1.6" fill="${k ? "#1ed760" : "#bfffd0"}" opacity="${1 - k / 7}"/>`;
        s += `<g>${animT("translate", "0 -4;0 46", d, b)}${col}</g>`;
      }
      return s;
    },
  },
  crown: {
    name: "Pixel-Krone",
    svg() {
      let s = BG("#13474d", "#041012");
      s += `<g>${animT("translate", "0 0;0 -1.5;0 0", 1.6)}<g fill="#2ee6d6"><rect x="7" y="12" width="2" height="2"/><rect x="15" y="9" width="2" height="2"/><rect x="23" y="12" width="2" height="2"/><rect x="7" y="14" width="18" height="2"/><rect x="8" y="16" width="16" height="5"/><rect x="11" y="14" width="2" height="2"/><rect x="19" y="14" width="2" height="2"/><rect x="15" y="11" width="2" height="3"/></g><rect x="8" y="21" width="16" height="2" fill="#ffd23f"/><rect x="11" y="17" width="2" height="2" fill="#ff4d8d"/><rect x="15" y="17" width="2" height="2" fill="#ffd23f"/><rect x="19" y="17" width="2" height="2" fill="#ff4d8d"/></g>`;
      [[4, 6, 0], [26, 8, 0.5], [6, 25, 1], [25, 24, 1.3]].forEach(([x, y, b]) => {
        s += `<g fill="#fff" opacity="0">${anim("opacity", "0;1;0", 1.6, b)}<rect x="${x}" y="${y - 1}" width="1" height="3"/><rect x="${x - 1}" y="${y}" width="3" height="1"/></g>`;
      });
      return s;
    },
  },
  ghost: {
    name: "Geist",
    svg() {
      let s = BG("#2a3346", "#0b0e15");
      s += `<g>${animT("translate", "0 1;0 -2;0 1", 2.2)}<g fill="#f2f6ff"><rect x="10" y="7" width="12" height="2"/><rect x="8" y="9" width="16" height="12"/><rect x="8" y="21" width="3" height="3"/><rect x="13" y="21" width="3" height="3"/><rect x="18" y="21" width="3" height="3"/><rect x="22" y="21" width="2" height="2"/></g><g fill="#1b2233"><rect x="11" y="12" width="3" height="4">${anim("height", "4;4;0.6;4", 3)}</rect><rect x="18" y="12" width="3" height="4">${anim("height", "4;4;0.6;4", 3)}</rect></g><rect x="14" y="17" width="4" height="2" fill="#ff8fb8"/></g>`;
      return s;
    },
  },
  snow: {
    name: "Schnee",
    svg() {
      let s = BG("#1d3a63", "#07111f");
      const r = rnd(9);
      for (let i = 0; i < 22; i++) {
        const x = Math.floor(r() * 32);
        const d = 2.5 + r() * 3;
        s += `<rect x="${x}" y="0" width="1" height="1" fill="#fff">${animT("translate", `0 -2;${(r() * 4 - 2).toFixed(1)} 34`, d, -r() * d)}</rect>`;
      }
      s += `<rect x="0" y="28" width="32" height="4" fill="#e8f4ff"/><rect x="5" y="27" width="6" height="1" fill="#e8f4ff"/><rect x="20" y="27" width="8" height="1" fill="#e8f4ff"/>`;
      return s;
    },
  },
  storm: {
    name: "Blitz",
    svg() {
      let s = `<rect width="32" height="32" fill="#151826"/><rect width="32" height="32" fill="#c8d4ff" opacity="0">${anim("opacity", "0;0;0;0.8;0;0.5;0;0;0;0", 2.4)}</rect>`;
      s += `<g fill="#3a3f57"><rect x="4" y="3" width="24" height="6"/><rect x="7" y="1" width="12" height="3"/></g>`;
      s += `<path d="M18 9 L11 19 L16 19 L12 30 L22 16 L17 16 L21 9Z" fill="#ffe14d" opacity="0">${anim("opacity", "0;0;0;1;0.2;1;0;0;0;0", 2.4)}</path>`;
      return s;
    },
  },
  music: {
    name: "Musik",
    svg() {
      let s = BG("#1c2140", "#070914");
      const r = rnd(4);
      for (let i = 0; i < 7; i++) {
        const x = 3 + i * 4;
        const d = 0.5 + r() * 0.5;
        s += `<rect x="${x}" y="10" width="3" height="16" fill="${i % 2 ? "#ff4d8d" : "#2ee6d6"}">${anim("y", `${12 + r() * 6};${4 + r() * 4};${16 + r() * 6};${12 + r() * 6}`, d)}${anim("height", "14;22;8;14", d)}</rect>`;
      }
      s += `<rect x="0" y="27" width="32" height="5" fill="#070914"/>`;
      return s;
    },
  },
  sun: {
    name: "Sonne",
    svg() {
      let s = BG("#ffcf6b", "#ff7a2f");
      let rays = "";
      for (let k = 0; k < 12; k++) rays += `<rect x="15" y="1" width="2" height="6" fill="#fff4b8" transform="rotate(${k * 30} 16 16)"/>`;
      s += `<g>${animT("rotate", "0 16 16;360 16 16", 10)}${rays}</g><circle cx="16" cy="16" r="7" fill="#ffe14d"/><rect x="13" y="14" width="2" height="2" fill="#6b3b00"/><rect x="18" y="14" width="2" height="2" fill="#6b3b00"/><rect x="13" y="18" width="6" height="1" fill="#6b3b00"/>`;
      return s;
    },
  },
  heartbeat: {
    name: "Herzschlag",
    svg() {
      let s = BG("#2a0a12", "#0a0205");
      s += `<g>${animT("scale", "1;1.12;1;1.08;1", 1, 0, ' additive="sum"')}<g transform="translate(16 15) scale(2.2) translate(-3.5 -3)">${heart(0, 0, "#ff2d55")}</g></g>`;
      s += `<path d="M0 26 H9 L11 22 L13 30 L15 24 H32" fill="none" stroke="#2ee6d6" stroke-width="1.2" stroke-dasharray="40" stroke-dashoffset="40">${anim("stroke-dashoffset", "40;0;-40", 1.6)}</path>`;
      return s;
    },
  },
  wave: {
    name: "Pixel-Welle",
    svg() {
      let s = `<rect width="32" height="32" fill="#051a1d"/>`;
      for (let x = 0; x < 32; x += 2)
        for (let k = 0; k < 3; k++) {
          const b = (-x * 0.06 - k * 0.2).toFixed(2);
          s += `<rect x="${x}" y="${14 + k * 5}" width="2" height="3" fill="${["#2ee6d6", "#1aa9a0", "#0f6e69"][k]}">${animT("translate", "0 -3;0 3;0 -3", 1.8, b)}</rect>`;
        }
      return s;
    },
  },
  gamer: {
    name: "Gamer",
    svg() {
      let s = BG("#22264a", "#090a16");
      s += `<g fill="#e9ecff"><rect x="5" y="11" width="22" height="10"/><rect x="3" y="13" width="4" height="10"/><rect x="25" y="13" width="4" height="10"/></g><g fill="#22264a"><rect x="8" y="15" width="6" height="2"/><rect x="10" y="13" width="2" height="6"/></g>`;
      [[20, 13, "#ff4d8d", 0], [23, 16, "#2ee6d6", 0.3], [20, 18, "#ffd23f", 0.6], [17, 16, "#3ddc6a", 0.9]].forEach(([x, y, c, b]) => {
        s += `<rect x="${x}" y="${y}" width="2" height="2" fill="${c}">${anim("opacity", "1;0.3;1", 1.2, b)}</rect>`;
      });
      return s;
    },
  },
};

/* ---------- Mystisch & Natur ---------- */
const starPts = (cx, cy, r, rot = -90) =>
  [0, 2, 4, 1, 3]
    .map((k) => {
      const a = ((rot + k * 72) * Math.PI) / 180;
      return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
    })
    .join(" ");
const flame = (x, y, s, b) =>
  `<g transform="translate(${x} ${y})"><g>${animT("scale", "1 1;0.85 1.25;1.1 0.9;1 1", 0.5, b)}<ellipse cx="0" cy="${-1.6 * s}" rx="${1.1 * s}" ry="${2 * s}" fill="#ff8c1a"/><ellipse cx="0" cy="${-1.2 * s}" rx="${0.55 * s}" ry="${1.2 * s}" fill="#ffe14d"/></g></g>`;
Object.assign(EFFECTS, {
  ritual: {
    name: "Opfergabe",
    svg() {
      let s = BG("#3a1240", "#060208");
      // allsehendes Auge in der Pyramide
      s += `<g><polygon points="16,2.5 25,16 7,16" fill="#2a1a05" stroke="#ffcf4d" stroke-width="0.8"/>`;
      s += `<circle cx="16" cy="11" r="5" fill="#ffcf4d" opacity=".25">${anim("opacity", "0.1;0.45;0.1", 2)}${anim("r", "4;6.5;4", 2)}</circle>`;
      s += `<ellipse cx="16" cy="11" rx="3.4" ry="1.9" fill="#fff6d0"/><circle cx="16" cy="11" r="1.3" fill="#3a1240"/><circle cx="16.4" cy="10.6" r="0.4" fill="#fff"/>`;
      s += `<ellipse cx="16" cy="11" rx="3.6" ry="0" fill="#2a1a05">${anim("ry", "0;0;0;0;0;0;0;0;2.1;0", 4)}</ellipse></g>`;
      for (let k = 0; k < 6; k++) s += `<rect x="${15.6 + Math.cos(k) * 9}" y="11" width="0.5" height="0.5" fill="#ffcf4d" opacity=".7" transform="rotate(${k * 60} 16 11)"/>`;
      // Altar mit Opferschale
      s += `<rect x="6" y="25" width="20" height="3" fill="#4a4550"/><rect x="8" y="28" width="3" height="4" fill="#38343e"/><rect x="21" y="28" width="3" height="4" fill="#38343e"/>`;
      s += `<path d="M12 22 Q16 26 20 22Z" fill="#8a6a2a"/><circle cx="16" cy="21.5" r="1.8" fill="#ff5a3d">${anim("r", "1.5;2.2;1.5", 1.2)}</circle><circle cx="16" cy="21.5" r="4" fill="#ff5a3d" opacity=".25">${anim("opacity", "0.1;0.4;0.1", 1.2)}</circle>`;
      // Kerzen
      for (const [x, b] of [[8, 0], [24, 0.25]]) s += `<rect x="${x - 1}" y="19" width="2" height="6" fill="#efe6d6"/>${flame(x, 19, 1, b)}`;
      // aufsteigende Funken
      const r = rnd(66);
      for (let i = 0; i < 7; i++) s += `<rect x="${(10 + r() * 12).toFixed(1)}" y="0" width="0.7" height="0.7" fill="#ffcf4d">${animT("translate", "0 22;0 4", 2 + r() * 2, -r() * 3)}${anim("opacity", "1;0", 2.5, -r() * 3)}</rect>`;
      return s;
    },
  },
  eden: {
    name: "Schlange & Apfel",
    svg() {
      let s = BG("#2f6b2a", "#0b1f0a");
      // Ast
      s += `<path d="M0 6 Q12 4 32 8" stroke="#5a3a1e" stroke-width="2.2" fill="none"/><path d="M20 6.5 q2 -3 5 -2" stroke="#3d8a2a" stroke-width="1.5" fill="#3d8a2a"/>`;
      // Apfel schaukelt
      s += `<g>${animT("rotate", "-8 22 7;8 22 7;-8 22 7", 2.4)}<line x1="22" y1="7" x2="22" y2="11" stroke="#5a3a1e" stroke-width="0.6"/><circle cx="22" cy="14" r="3.4" fill="#d81e2c"/><circle cx="20.8" cy="12.8" r="0.9" fill="#ff8a8a"/><rect x="22" y="9.6" width="1.8" height="1" fill="#3d8a2a"/></g>`;
      // Schlange um den Ast/Stamm, Körper schlängelt sich
      s += `<g>${animT("translate", "0 0;0 -0.8;0 0", 1.6)}`;
      s += `<path d="M3 31 C 3 24, 13 25, 11 19 S 4 13, 9 8" stroke="#1f8f3a" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
      s += `<path d="M3 31 C 3 24, 13 25, 11 19 S 4 13, 9 8" stroke="#a8e05a" stroke-width="1" fill="none" stroke-dasharray="1 2">${anim("stroke-dashoffset", "0;-6", 0.9)}</path>`;
      s += `<ellipse cx="10.5" cy="7" rx="2.6" ry="1.8" fill="#1f8f3a"/><rect x="11" y="6" width="0.9" height="0.9" fill="#ffe14d"/><rect x="11.3" y="6.2" width="0.4" height="0.6" fill="#111"/>`;
      s += `<path d="M13 7.3 l2 0 l0.8 -0.7 M15 7.3 l0.8 0.7" stroke="#e0203a" stroke-width="0.5" fill="none" opacity="0">${anim("opacity", "0;1;0;0;1;0;0;0", 1.6)}</path></g>`;
      return s;
    },
  },
  pentagram: {
    name: "Pentagramm",
    svg() {
      let s = `<rect width="32" height="32" fill="#080102"/><defs><filter id="gl" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.2"/></filter></defs>`;
      const star = `<circle cx="16" cy="16" r="12" fill="none" stroke="#8b0000" stroke-width="1.3"/><polygon points="${starPts(16, 16, 12)}" fill="none" stroke="#8b0000" stroke-width="1.3" stroke-linejoin="miter"/>`;
      s += `<g filter="url(#gl)" opacity=".9">${anim("opacity", "0.35;1;0.35", 2.6)}${star.replace(/#8b0000/g, "#ff1a1a")}</g>`;
      s += `<g>${animT("rotate", "0 16 16;360 16 16", 40)}${star}</g>`;
      const r = rnd(13);
      for (let i = 0; i < 9; i++) s += `<rect x="${(4 + r() * 24).toFixed(1)}" y="0" width="0.6" height="0.6" fill="#ff3b1a">${animT("translate", "0 32;0 0", 3 + r() * 3, -r() * 5)}${anim("opacity", "0;1;0", 3, -r() * 4)}</rect>`;
      return s;
    },
  },
  alien: {
    name: "Alien",
    svg() {
      let s = `<defs><radialGradient id="sk" cx="45%" cy="35%" r="70%"><stop offset="0" stop-color="#c3cbc4"/><stop offset="1" stop-color="#7d8a82"/></radialGradient><linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9dffea" stop-opacity=".5"/><stop offset="1" stop-color="#9dffea" stop-opacity="0"/></linearGradient></defs>`;
      s += `<rect width="32" height="32" fill="#05080f"/>`;
      const r = rnd(4);
      for (let i = 0; i < 14; i++) s += `<rect x="${Math.floor(r() * 32)}" y="${Math.floor(r() * 32)}" width="0.6" height="0.6" fill="#fff">${anim("opacity", "0.2;1;0.2", 1 + r() * 2, r())}</rect>`;
      s += `<polygon points="13,0 19,0 27,32 5,32" fill="url(#beam)">${anim("opacity", "0.4;1;0.4", 3)}</polygon>`;
      s += `<g>${animT("translate", "0 0.6;0 -0.6;0 0.6", 3)}`;
      // Körper & Hals
      s += `<path d="M9 32 Q10 26 14 25 L18 25 Q22 26 23 32Z" fill="#6f7b74"/><rect x="14.6" y="21" width="2.8" height="5" fill="#8a968e"/>`;
      // großer Kopf, schmales Kinn
      s += `<path d="M16 3 C 25 3, 27 10, 25 15 C 23.5 19, 19 23, 16 23.5 C 13 23, 8.5 19, 7 15 C 5 10, 7 3, 16 3Z" fill="url(#sk)"/>`;
      // riesige schwarze Mandelaugen mit Spiegelung
      for (const dir of [-1, 1]) {
        const x = 16 + dir * 4.6;
        s += `<g transform="translate(${x} 13.5) rotate(${dir * 28})"><ellipse rx="3.5" ry="1.9" fill="#050608"/><ellipse cx="${-dir * 1}" cy="-0.6" rx="0.9" ry="0.45" fill="#7fe8ff" opacity=".7"/><ellipse rx="3.7" ry="0" fill="#9aa69e">${anim("ry", "0;0;0;0;0;0;0;0;0;2.1;0", 5)}</ellipse></g>`;
      }
      s += `<rect x="15.6" y="17.5" width="0.4" height="0.6" fill="#55605a"/><rect x="16.3" y="17.5" width="0.4" height="0.6" fill="#55605a"/><path d="M14.8 20 Q16 20.6 17.2 20" stroke="#55605a" stroke-width="0.5" fill="none"/>`;
      s += `</g>`;
      return s;
    },
  },
  waterfall: {
    name: "Wasserfall",
    svg() {
      let s = `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fd3ff"/><stop offset="1" stop-color="#d7f3ff"/></linearGradient><clipPath id="wf"><rect x="11" y="6" width="10" height="20"/></clipPath></defs>`;
      s += `<rect width="32" height="32" fill="url(#sky)"/>`;
      // Felsen & Bäume
      s += `<path d="M0 32 L0 4 L6 2 L11 6 L11 28 Z" fill="#4b5a52"/><path d="M32 32 L32 5 L26 3 L21 6 L21 28 Z" fill="#3e4c45"/>`;
      s += `<path d="M0 6 L3 1 L6 6Z M4 5 L7 0 L10 5Z" fill="#2f7a3a"/><path d="M22 5 L25 0 L28 5Z M26 6 L29 1 L32 6Z" fill="#2f7a3a"/>`;
      // fallendes Wasser
      let col = "";
      for (let x = 11; x < 21; x += 1) {
        const c = x % 3 === 0 ? "#ffffff" : x % 3 === 1 ? "#bfeaff" : "#7fd0f5";
        for (let k = 0; k < 6; k++) col += `<rect x="${x}" y="${k * 8 - 8}" width="1.02" height="5" fill="${c}"/><rect x="${x}" y="${k * 8 - 3}" width="1.02" height="3" fill="#5bb8e6"/>`;
      }
      s += `<rect x="11" y="6" width="10" height="20" fill="#5bb8e6"/><g clip-path="url(#wf)"><g>${animT("translate", "0 0;0 8", 0.45)}${col}</g></g>`;
      // Becken mit Wellen & Gischt
      s += `<rect x="0" y="26" width="32" height="6" fill="#2f8fd0"/>`;
      for (let i = 0; i < 4; i++) s += `<rect x="${3 + i * 7}" y="${28 + (i % 2)}" width="4" height="0.6" fill="#bfeaff">${animT("translate", "-2 0;2 0;-2 0", 2, i * 0.4)}</rect>`;
      for (const [x, b] of [[12, 0], [16, 0.3], [20, 0.6], [14, 0.9], [18, 0.15]])
        s += `<circle cx="${x}" cy="26" r="2" fill="#fff" opacity=".8">${anim("r", "1.2;2.8;1.2", 1.2, b)}${anim("opacity", "0.9;0.3;0.9", 1.2, b)}</circle>`;
      return s;
    },
  },
});
export const EFFECT_AVATARS = Object.entries(EFFECTS).map(([k, v]) => ({ id: "e-" + k, name: v.name }));

function avatarSvg(id) {
  if (id.startsWith("f-") && flagById.has(id.slice(2))) {
    const r = rnd(id.length * 31);
    let sp = "";
    for (let i = 0; i < 5; i++) sp += `<rect x="${Math.floor(r() * 30)}" y="${Math.floor(r() * 4) + (i % 2 ? 26 : 1)}" width="1" height="1" fill="#fff">${anim("opacity", "0;1;0", 1.5 + r(), r())}</rect>`;
    return svgDoc("0 0 32 32", BG("#16494f", "#061214") + sp + wavingFlag(id.slice(2), 0, 5.3, 32 / 24));
  }
  const e = EFFECTS[id.slice(2)];
  return id.startsWith("e-") && e ? svgDoc("0 0 32 32", e.svg()) : null;
}

/* ================= Profilrahmen (rund) ================= */
// viewBox 0..120, Profilbild liegt in der Mitte (Radius ≈ 42)
const C0 = 60;
function arc(r, a0, a1) {
  const p = (a) => [C0 + r * Math.cos(a), C0 + r * Math.sin(a)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}
function colorRing(colors, r = 48, w = 6, dur = 8, reps = 3) {
  const n = colors.length * reps;
  let s = `<g>${animT("rotate", `0 ${C0} ${C0};360 ${C0} ${C0}`, dur)}`;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2 + 0.01;
    s += `<path d="${arc(r, a0, a1)}" stroke="${colors[i % colors.length]}" stroke-width="${w}" fill="none"/>`;
  }
  return s + "</g>";
}
const outline = (r, c = "#000", w = 1.5, o = 0.5) => `<circle cx="60" cy="60" r="${r}" fill="none" stroke="${c}" stroke-width="${w}" opacity="${o}"/>`;
const sparkle = (x, y, s, c, b) =>
  `<g transform="translate(${x} ${y})"><path d="M0 ${-s} L${s * 0.25} ${-s * 0.25} L${s} 0 L${s * 0.25} ${s * 0.25} L0 ${s} L${-s * 0.25} ${s * 0.25} L${-s} 0 L${-s * 0.25} ${-s * 0.25}Z" fill="${c}">${animT("scale", "0.2;1;0.2", 1.4, b)}</path></g>`;

const FRAMES = {
  neon: {
    name: "Neon",
    svg: () =>
      `<defs><filter id="gl" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter></defs><circle cx="60" cy="60" r="48" fill="none" stroke="#2ee6d6" stroke-width="6" filter="url(#gl)">${anim("opacity", "0.4;1;0.4", 1.8)}</circle><circle cx="60" cy="60" r="48" fill="none" stroke="#bafff8" stroke-width="2.5"/>`,
  },
  rainbow: { name: "Regenbogen", svg: () => colorRing(["#ff3b3b", "#ff9a1a", "#ffe21a", "#3ddc6a", "#2ee6d6", "#4d7cff", "#b84dff"], 48, 7, 5, 2) + outline(51.5) },
  fire: {
    name: "Feuer",
    svg() {
      let s = colorRing(["#e8401c", "#ff8c1a"], 47, 5, 6, 6);
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * 360;
        const b = (-k * 0.11).toFixed(2);
        s += `<g transform="rotate(${a} 60 60)"><g>${animT("scale", "1 1;1 1.5;1 0.8;1 1", 0.6, b)}<rect x="57" y="2" width="6" height="8" fill="#ff8c1a" transform="translate(0 4)"/><rect x="58.5" y="5" width="3" height="5" fill="#ffd23f" transform="translate(0 4)"/></g></g>`;
      }
      return s;
    },
  },
  stars: {
    name: "Sterne",
    svg() {
      let s = `<circle cx="60" cy="60" r="48" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="2 5" opacity=".7"/><g>${animT("rotate", "0 60 60;360 60 60", 12)}`;
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        s += sparkle(60 + 50 * Math.cos(a), 60 + 50 * Math.sin(a), 7, k % 2 ? "#ffe14d" : "#fff", k * 0.23);
      }
      return s + "</g>";
    },
  },
  crown: {
    name: "Krone",
    svg: () =>
      `<circle cx="60" cy="60" r="48" fill="none" stroke="#ffd23f" stroke-width="4"/><circle cx="60" cy="60" r="48" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="12 290" opacity=".8">${anim("stroke-dashoffset", "0;-302", 3)}</circle><g>${animT("translate", "0 0;0 -3;0 0", 1.6)}<g fill="#ffd23f" stroke="#7a5200" stroke-width="1"><path d="M40 20 L44 2 L52 12 L60 0 L68 12 L76 2 L80 20Z"/></g><rect x="48" y="12" width="5" height="5" fill="#ff4d8d"/><rect x="58" y="10" width="5" height="5" fill="#2ee6d6"/><rect x="68" y="12" width="5" height="5" fill="#ff4d8d"/></g>`,
  },
  hearts: {
    name: "Herzen",
    svg() {
      let s = `<circle cx="60" cy="60" r="48" fill="none" stroke="#ff8fb8" stroke-width="3"/><g>${animT("rotate", "0 60 60;360 60 60", 10)}`;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        s += `<g transform="translate(${(60 + 49 * Math.cos(a) - 7).toFixed(1)} ${(60 + 49 * Math.sin(a) - 6).toFixed(1)}) scale(2)"><g>${animT("scale", "1;1.25;1", 0.9, k * 0.1)}${heart(0, 0, k % 2 ? "#ff2d55" : "#ff8fb8")}</g></g>`;
      }
      return s + "</g>";
    },
  },
  gold: {
    name: "Gold",
    svg: () =>
      `<defs><linearGradient id="gd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1a8"/><stop offset=".5" stop-color="#d9a400"/><stop offset="1" stop-color="#7a5200"/></linearGradient></defs><circle cx="60" cy="60" r="48" fill="none" stroke="url(#gd)" stroke-width="7"/><g>${animT("rotate", "0 60 60;360 60 60", 3)}<path d="${arc(48, -0.5, 0.2)}" stroke="#fff" stroke-width="3" fill="none" opacity=".85"/></g>${outline(52, "#3a2800")}`,
  },
  ice: {
    name: "Eis",
    svg() {
      let s = colorRing(["#bfefff", "#7fd6ff", "#e8fbff"], 48, 6, 14, 4) + `<g>${animT("rotate", "360 60 60;0 60 60", 16)}`;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        const x = 60 + 50 * Math.cos(a);
        const y = 60 + 50 * Math.sin(a);
        s += `<g fill="#fff" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><rect x="-0.8" y="-4" width="1.6" height="8"/><rect x="-4" y="-0.8" width="8" height="1.6"/><rect x="-2.5" y="-2.5" width="1.6" height="1.6"/><rect x="1" y="1" width="1.6" height="1.6"/></g>`;
      }
      return s + "</g>";
    },
  },
  galaxy: {
    name: "Galaxie",
    svg() {
      let s = colorRing(["#3b1a6b", "#7a3dff", "#ff7ad9", "#2ee6d6"], 48, 6, 10, 3);
      for (const [dir, dur, n, r] of [[1, 6, 7, 53], [-1, 9, 9, 43.5]]) {
        s += `<g>${animT("rotate", dir > 0 ? "0 60 60;360 60 60" : "360 60 60;0 60 60", dur)}`;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2;
          s += `<rect x="${(60 + r * Math.cos(a)).toFixed(1)}" y="${(60 + r * Math.sin(a)).toFixed(1)}" width="2" height="2" fill="#fff">${anim("opacity", "0.2;1;0.2", 1.2, k * 0.15)}</rect>`;
        }
        s += "</g>";
      }
      return s;
    },
  },
  electric: {
    name: "Strom",
    svg: () =>
      `<circle cx="60" cy="60" r="48" fill="none" stroke="#1d6cff" stroke-width="6" opacity=".6"/><circle cx="60" cy="60" r="48" fill="none" stroke="#bafff8" stroke-width="2.5" stroke-dasharray="14 8 4 10">${anim("stroke-dashoffset", "0;-36", 0.5)}${anim("opacity", "1;0.4;1;0.8;1", 0.3)}</circle><circle cx="60" cy="60" r="52" fill="none" stroke="#2ee6d6" stroke-width="1" stroke-dasharray="3 12">${anim("stroke-dashoffset", "0;30", 0.7)}</circle>`,
  },
  pixel: {
    name: "Pixel",
    svg: () =>
      `<circle cx="60" cy="60" r="48" fill="none" stroke="#0b1416" stroke-width="8"/><circle cx="60" cy="60" r="48" fill="none" stroke="#2ee6d6" stroke-width="6" stroke-dasharray="6 6">${anim("stroke-dashoffset", "0;24", 1.2)}</circle>`,
  },
  glitch: {
    name: "Glitch",
    svg: () =>
      `<circle cx="60" cy="60" r="48" fill="none" stroke="#ff2d55" stroke-width="3" opacity=".85">${animT("translate", "0 0;-2 1;1 -1;0 0;0 0;0 0", 0.9)}</circle><circle cx="60" cy="60" r="48" fill="none" stroke="#2ee6d6" stroke-width="3" opacity=".85">${animT("translate", "0 0;2 -1;-1 1;0 0;0 0;0 0", 0.9)}</circle><circle cx="60" cy="60" r="48" fill="none" stroke="#fff" stroke-width="2"/>`,
  },
};

Object.assign(FRAMES, {
  pentagram: {
    name: "Pentagramm",
    svg() {
      let s = `<defs><filter id="pg" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.5"/></filter></defs>`;
      s += `<circle cx="60" cy="60" r="48" fill="none" stroke="#ff1a1a" stroke-width="6" filter="url(#pg)">${anim("opacity", "0.2;0.8;0.2", 2.6)}</circle>`;
      s += `<circle cx="60" cy="60" r="48" fill="none" stroke="#8b0000" stroke-width="4.5"/><circle cx="60" cy="60" r="53" fill="none" stroke="#5a0000" stroke-width="1.2" stroke-dasharray="3 5"/>`;
      s += `<g>${animT("rotate", "0 60 60;360 60 60", 24)}`;
      for (let k = 0; k < 5; k++) {
        const a = (k * 72 - 90) * (Math.PI / 180);
        const x = 60 + 50 * Math.cos(a);
        const y = 60 + 50 * Math.sin(a);
        s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="#0a0102" stroke="#8b0000" stroke-width="1.2"/><polygon points="${starPts(x, y, 6)}" fill="none" stroke="#c0101a" stroke-width="1"/>`;
      }
      return s + "</g>";
    },
  },
  snake: {
    name: "Schlange",
    svg() {
      let s = `<circle cx="60" cy="60" r="48" fill="none" stroke="#0f5a22" stroke-width="8"/>`;
      s += `<circle cx="60" cy="60" r="48" fill="none" stroke="#2fbf4f" stroke-width="5"/>`;
      s += `<circle cx="60" cy="60" r="48" fill="none" stroke="#c6f27a" stroke-width="2" stroke-dasharray="2 5">${anim("stroke-dashoffset", "0;-28", 1.2)}</circle>`;
      // Kopf oben rechts mit züngelnder Zunge
      s += `<g transform="translate(94 26) rotate(40)"><ellipse rx="8" ry="5.5" fill="#1f8f3a" stroke="#0f5a22" stroke-width="1.2"/><circle cx="2.5" cy="-2" r="1.4" fill="#ffe14d"/><rect x="2.1" y="-2.9" width="0.8" height="1.8" fill="#111"/>`;
      s += `<path d="M8 0 l6 0 l2 -2 M14 0 l2 2" stroke="#e0203a" stroke-width="1.3" fill="none">${anim("opacity", "0;1;0;1;0;0;0", 1.4)}</path></g>`;
      // Apfel an der Seite
      s += `<g>${animT("translate", "0 0;0 -2;0 0", 2)}<circle cx="96" cy="96" r="11" fill="#d81e2c" stroke="#5a0a10" stroke-width="1.5"/><circle cx="92" cy="92" r="3" fill="#ff8a8a"/><rect x="95" y="81" width="2" height="5" fill="#5a3a1e"/><path d="M97 83 q5 -4 9 -1 q-4 3 -9 1Z" fill="#3d8a2a"/></g>`;
      return s;
    },
  },
  ritual: {
    name: "Ritual",
    svg() {
      let s = `<circle cx="60" cy="60" r="48" fill="none" stroke="#2a1a05" stroke-width="7"/><circle cx="60" cy="60" r="48" fill="none" stroke="#ffcf4d" stroke-width="1.5" stroke-dasharray="1 4"/>`;
      for (let k = 0; k < 8; k++) {
        if (k === 0) continue;
        const a = ((k * 45 - 90) * Math.PI) / 180;
        const x = 60 + 50 * Math.cos(a);
        const y = 60 + 50 * Math.sin(a);
        s += `<rect x="${(x - 2.5).toFixed(1)}" y="${(y - 3).toFixed(1)}" width="5" height="9" fill="#efe6d6" stroke="#8a7a60" stroke-width=".6"/>${flame(x, y - 3, 2.2, k * 0.13)}`;
      }
      // allsehendes Auge oben
      s += `<g><polygon points="60,0 74,22 46,22" fill="#2a1a05" stroke="#ffcf4d" stroke-width="1.5"/><circle cx="60" cy="15" r="9" fill="#ffcf4d" opacity=".2">${anim("opacity", "0.05;0.45;0.05", 2)}</circle><ellipse cx="60" cy="15" rx="6" ry="3.4" fill="#fff6d0"/><circle cx="60" cy="15" r="2.3" fill="#3a1240"/><ellipse cx="60" cy="15" rx="6.3" ry="0" fill="#2a1a05">${anim("ry", "0;0;0;0;0;0;0;3.6;0", 4)}</ellipse></g>`;
      return s;
    },
  },
  ufo: {
    name: "UFO",
    svg() {
      let s = `<defs><linearGradient id="bm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9dffea" stop-opacity=".55"/><stop offset="1" stop-color="#9dffea" stop-opacity="0"/></linearGradient></defs>`;
      s += `<circle cx="60" cy="60" r="48" fill="none" stroke="#1b2a33" stroke-width="6"/><circle cx="60" cy="60" r="48" fill="none" stroke="#9dffea" stroke-width="2" stroke-dasharray="4 8">${anim("stroke-dashoffset", "0;-24", 1)}</circle>`;
      s += `<g>${animT("translate", "-14 0;14 0;-14 0", 6)}<polygon points="52,16 68,16 84,60 36,60" fill="url(#bm)">${anim("opacity", "0.3;0.9;0.3", 1.6)}</polygon>`;
      s += `<ellipse cx="60" cy="13" rx="18" ry="5.5" fill="#9aa7b0" stroke="#4a565e" stroke-width="1"/><ellipse cx="60" cy="9" rx="8" ry="5" fill="#7fe8ff" opacity=".85"/>`;
      for (let i = 0; i < 5; i++) s += `<circle cx="${46 + i * 7}" cy="14" r="1.4" fill="#ffe14d">${anim("opacity", "1;0.2;1", 0.8, i * 0.16)}</circle>`;
      return s + "</g>";
    },
  },
});
export const EFFECT_FRAMES = Object.entries(FRAMES).map(([k, v]) => ({ id: "e-" + k, name: v.name }));

function frameSvg(id) {
  if (id.startsWith("f-") && flagById.has(id.slice(2))) {
    const fid = id.slice(2);
    const cols = flagColors(fid);
    const badge = `<rect x="75" y="80" width="40" height="28" rx="4" fill="#0b1416" stroke="#fff" stroke-width="1.5"/>${wavingFlag(fid, 79, 84, 32 / 24)}`;
    return svgDoc("0 0 120 120", outline(52, "#000", 1.5, 0.5) + colorRing(cols, 48, 7, 10, cols.length > 2 ? 2 : 4) + outline(44.5, "#000", 1, 0.35) + badge);
  }
  const f = FRAMES[id.slice(2)];
  return id.startsWith("e-") && f ? svgDoc("0 0 120 120", f.svg(), "") : null;
}

/* ================= Öffentliche Helfer ================= */
const urlCache = new Map();
const toUrl = (svg) => (svg ? "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg) : null);
export function avatarUrl(id) {
  if (!id || typeof id !== "string") return null;
  const k = "a:" + id;
  if (!urlCache.has(k)) urlCache.set(k, toUrl(avatarSvg(id)));
  return urlCache.get(k);
}
export function frameUrl(id) {
  if (!id || typeof id !== "string") return null;
  const k = "r:" + id;
  if (!urlCache.has(k)) urlCache.set(k, toUrl(frameSvg(id)));
  return urlCache.get(k);
}
export const isDecorId = (id) => typeof id === "string" && /^[ef]-[a-z]{2,10}$/.test(id);
