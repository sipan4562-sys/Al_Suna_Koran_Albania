// Pixel-Emojis: Jedes Emoji wird im Browser in ein eigenes 16×16-Pixel-Art-Bild umgerechnet
// (Farben reduziert, Kontur ergänzt) und überall statt des System-Emojis angezeigt.

const cache = new Map();
const EMOJI_RE = /\p{Extended_Pictographic}|\p{Regional_Indicator}|[\u{1F3FB}-\u{1F3FF}]/u;
const seg = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter("de", { granularity: "grapheme" }) : null;
const N = 16; // Pixelraster
const OUT = 48; // Ausgabegröße (wird pixelig skaliert)

export const isEmoji = (g) => EMOJI_RE.test(g) && !/^[0-9#*]$/.test(g);

function graphemes(text) {
  if (seg) return Array.from(seg.segment(text), (s) => s.segment);
  return Array.from(text);
}

export function pixelEmoji(g) {
  if (cache.has(g)) return cache.get(g);
  let url = null;
  try {
    const S = 96;
    const c = document.createElement("canvas");
    c.width = c.height = S;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${Math.round(S * 0.78)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif`;
    ctx.fillText(g, S / 2, S / 2 + S * 0.06);

    const d = document.createElement("canvas");
    d.width = d.height = N;
    const dctx = d.getContext("2d", { willReadFrequently: true });
    dctx.imageSmoothingEnabled = true;
    dctx.imageSmoothingQuality = "high";
    // 1 Pixel Rand lassen für die Kontur
    dctx.drawImage(c, 1, 1, N - 2, N - 2);
    const img = dctx.getImageData(0, 0, N, N);
    const px = img.data;
    const solid = new Uint8Array(N * N);
    let any = false;
    for (let i = 0; i < N * N; i++) {
      const a = px[i * 4 + 3];
      if (a > 110) {
        solid[i] = 1;
        any = true;
        // Farben auf 6 Stufen pro Kanal reduzieren (Pixel-Art-Palette), leicht kräftiger
        for (let k = 0; k < 3; k++) {
          const v = Math.min(255, (px[i * 4 + k] / (a / 255)) * 1.06);
          px[i * 4 + k] = Math.round(v / 51) * 51;
        }
        px[i * 4 + 3] = 255;
      } else px[i * 4 + 3] = 0;
    }
    if (any) {
      // dunkle Kontur um alle sichtbaren Pixel
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++) {
          const i = y * N + x;
          if (solid[i]) continue;
          const near =
            (x > 0 && solid[i - 1]) || (x < N - 1 && solid[i + 1]) || (y > 0 && solid[i - N]) || (y < N - 1 && solid[i + N]);
          if (near) {
            px[i * 4] = 8;
            px[i * 4 + 1] = 12;
            px[i * 4 + 2] = 14;
            px[i * 4 + 3] = 255;
          }
        }
      dctx.putImageData(img, 0, 0);
      const o = document.createElement("canvas");
      o.width = o.height = OUT;
      const octx = o.getContext("2d");
      octx.imageSmoothingEnabled = false;
      octx.drawImage(d, 0, 0, OUT, OUT);
      url = o.toDataURL("image/png");
    }
  } catch {
    url = null;
  }
  cache.set(g, url);
  return url;
}

// Text in ein Element schreiben und dabei alle Emojis durch Pixel-Bilder ersetzen
export function renderRich(node, text) {
  node.textContent = "";
  if (!text) return node;
  let buf = "";
  const flush = () => {
    if (buf) node.append(document.createTextNode(buf));
    buf = "";
  };
  const parts = graphemes(text);
  const onlyEmoji = parts.length <= 3 && parts.every((g) => isEmoji(g));
  for (const g of parts) {
    if (isEmoji(g)) {
      const url = pixelEmoji(g);
      if (url) {
        flush();
        const img = document.createElement("img");
        img.className = onlyEmoji ? "pxe big" : "pxe";
        img.src = url;
        img.alt = g;
        img.draggable = false;
        node.append(img);
        continue;
      }
    }
    buf += g;
  }
  flush();
  return node;
}

export const EMOJI_SETS = [
  ["😀", "Smileys", "😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 🙃 😉 😍 🥰 😘 😋 😛 😜 🤪 😎 🤩 🥳 😏 😒 😞 😔 😟 😕 🙁 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 🤗 🤔 🤭 🤫 🤥 😶 😐 😑 😬 🙄 😯 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕 🤑 🤠 😈 👿 💀 👻 👽 🤖 💩 😺 😸 😹 😻 😼 😽 🙀 😿 😾"],
  ["👍", "Gesten", "👍 👎 👌 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ ✋ 🤚 🖐️ 🖖 👋 👏 🙌 👐 🤲 🙏 💪 🦾 👀 👅 👄 💋 🧠 🫶 🤝"],
  ["❤️", "Herzen", "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💯 💢 💥 💫 💦 💨 🔥 ✨ ⭐ 🌟 ⚡ 🌈 ☀️ 🌙"],
  ["🐶", "Tiere", "🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐔 🐧 🐦 🦆 🦅 🦉 🐺 🐗 🐴 🦄 🐝 🐛 🦋 🐌 🐞 🐢 🐍 🦖 🐙 🦑 🦀 🐠 🐬 🐳 🦈 🐊"],
  ["🍕", "Essen", "🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🥑 🍆 🥕 🌽 🌶️ 🍔 🍟 🍕 🌭 🥪 🌮 🌯 🍣 🍜 🍝 🍦 🍩 🍪 🎂 🍰 🍫 🍬 🍭 🍿 ☕ 🧋 🥤 🍺"],
  ["⚽", "Aktivität", "⚽ 🏀 🏈 ⚾ 🎾 🏐 🎱 🏓 🏸 🥊 🎮 🕹️ 🎲 🧩 🎯 🎳 🎸 🎹 🎤 🎧 🎬 🎨 🏆 🥇 🥈 🥉 🏅 🎉 🎊 🎁 🎈 👑 💎 💰 📱 💻 📷 🚗 🚀 ✈️ 🏠 🌍"],
];
