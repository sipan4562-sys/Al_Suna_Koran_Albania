// Farbthemen und Chat-Hintergründe

export const ACCENTS = [
  ["#19e6d4", "Türkis"],
  ["#3b9cff", "Blau"],
  ["#a78bfa", "Lila"],
  ["#ff4fa3", "Pink"],
  ["#f43f5e", "Rot"],
  ["#fb923c", "Orange"],
  ["#facc15", "Gelb"],
  ["#4ade80", "Grün"],
  ["#e5e7eb", "Weiß"],
];

export const BASES = {
  schwarz: { name: "Schwarz", bg: "#050708", bg2: "#0b1012", panel: "#10171a", panel2: "#162024", line: "#1d2a2f" },
  nacht: { name: "Mitternacht", bg: "#05071a", bg2: "#0a0e26", panel: "#10163a", panel2: "#161e4a", line: "#222c5c" },
  lila: { name: "Aubergine", bg: "#0c0612", bg2: "#140b1c", panel: "#1c1128", panel2: "#251734", line: "#33204a" },
  wald: { name: "Wald", bg: "#040a06", bg2: "#08120c", panel: "#0e1a12", panel2: "#132419", line: "#1d3324" },
  grau: { name: "Grau", bg: "#111214", bg2: "#18191c", panel: "#1f2125", panel2: "#272a2f", line: "#33363c" },
};

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return [25, 230, 212];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const toHex = (rgb) => "#" + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
function luminance([r, g, b]) {
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function applyTheme({ accent = "#19e6d4", base = "schwarz" } = {}) {
  const root = document.documentElement.style;
  const rgb = hexToRgb(accent);
  const b = BASES[base] || BASES.schwarz;
  root.setProperty("--accent", toHex(rgb));
  root.setProperty("--accent2", toHex(mix(rgb, [0, 0, 0], 0.32)));
  root.setProperty("--accent-hover", toHex(mix(rgb, [255, 255, 255], 0.22)));
  root.setProperty("--accent-dim", `rgba(${rgb.join(",")}, 0.12)`);
  root.setProperty("--accent-rgb", rgb.join(","));
  root.setProperty("--on-accent", luminance(rgb) > 0.35 ? "#04100f" : "#ffffff");
  for (const k of ["bg", "bg2", "panel", "panel2", "line"]) root.setProperty(`--${k}`, b[k]);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", b.bg);
}

/* ---------------- Chat-Hintergründe ---------------- */
export const WALLPAPERS = [
  ["raster", "Pixel-Raster"],
  ["kronen", "Kronen"],
  ["sterne", "Sterne"],
  ["verlauf", "Verlauf"],
  ["karo", "Karo"],
  ["wellen", "Wellen"],
  ["leer", "Schlicht"],
];

const wpCache = new Map();
function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")];
}

// Erzeugt ein Hintergrundbild (als data-URL) in der aktuellen Akzentfarbe
export function wallpaperUrl(kind, accent, baseKey) {
  const key = `${kind}|${accent}|${baseKey}`;
  if (wpCache.has(key)) return wpCache.get(key);
  const [r, g, b] = hexToRgb(accent);
  const bg = (BASES[baseKey] || BASES.schwarz).bg;
  const a = (o) => `rgba(${r},${g},${b},${o})`;
  let url = null;
  if (kind === "raster") {
    const [c, x] = canvas(24, 24);
    x.fillStyle = bg;
    x.fillRect(0, 0, 24, 24);
    x.fillStyle = a(0.05);
    x.fillRect(0, 0, 24, 1);
    x.fillRect(0, 0, 1, 24);
    url = c.toDataURL();
  } else if (kind === "kronen") {
    const [c, x] = canvas(64, 64);
    x.fillStyle = bg;
    x.fillRect(0, 0, 64, 64);
    const crown = [
      [0, 1], [3, 0], [6, 1],
      [0, 2], [1, 2], [3, 1], [3, 2], [5, 2], [6, 2],
      [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3],
      [0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4],
    ];
    const draw = (ox, oy, o) => {
      x.fillStyle = a(o);
      for (const [cx, cy] of crown) x.fillRect(ox + cx * 2, oy + cy * 2, 2, 2);
    };
    draw(8, 10, 0.09);
    draw(40, 42, 0.06);
    url = c.toDataURL();
  } else if (kind === "sterne") {
    const [c, x] = canvas(120, 120);
    x.fillStyle = bg;
    x.fillRect(0, 0, 120, 120);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 26; i++) {
      x.fillStyle = i % 4 === 0 ? a(0.35) : "rgba(255,255,255,0.18)";
      const s = i % 6 === 0 ? 3 : 2;
      x.fillRect(Math.floor(rnd() * 118), Math.floor(rnd() * 118), s, s);
    }
    url = c.toDataURL();
  } else if (kind === "verlauf") {
    const [c, x] = canvas(400, 800);
    const gr = x.createLinearGradient(0, 0, 400, 800);
    gr.addColorStop(0, a(0.28));
    gr.addColorStop(0.5, bg);
    gr.addColorStop(1, a(0.14));
    x.fillStyle = bg;
    x.fillRect(0, 0, 400, 800);
    x.fillStyle = gr;
    x.fillRect(0, 0, 400, 800);
    url = c.toDataURL("image/jpeg", 0.9);
  } else if (kind === "karo") {
    const [c, x] = canvas(32, 32);
    x.fillStyle = bg;
    x.fillRect(0, 0, 32, 32);
    x.fillStyle = a(0.05);
    x.fillRect(0, 0, 16, 16);
    x.fillRect(16, 16, 16, 16);
    url = c.toDataURL();
  } else if (kind === "wellen") {
    const [c, x] = canvas(80, 40);
    x.fillStyle = bg;
    x.fillRect(0, 0, 80, 40);
    x.fillStyle = a(0.08);
    for (let i = 0; i < 80; i += 2) {
      const y = Math.round(20 + Math.sin((i / 80) * Math.PI * 2) * 8);
      x.fillRect(i, y, 2, 2);
    }
    url = c.toDataURL();
  }
  wpCache.set(key, url);
  return url;
}
