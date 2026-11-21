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
function flagColors(id) {
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
