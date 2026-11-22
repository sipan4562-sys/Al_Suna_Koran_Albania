// Pixelkingschat – automatische Untertitel für Story-Videos
// Spracherkennung „Whisper“ läuft komplett auf dem Gerät (transformers.js + ONNX, WebAssembly).
// Das Video verlässt das Handy dafür nicht. Das Modell (~80 MB) wird beim ersten Mal von Hugging Face
// geladen und danach im Browser zwischengespeichert – es läuft nicht über unseren Server.

const LIB = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.1/dist/transformers.min.js";
const MODEL = "onnx-community/whisper-base";

export const SUB_LANGS = [
  ["german", "Deutsch"],
  ["english", "Englisch"],
  ["turkish", "Türkisch"],
  ["arabic", "Arabisch"],
  ["albanian", "Albanisch"],
  ["persian", "Persisch"],
  ["polish", "Polnisch"],
  ["russian", "Russisch"],
  ["spanish", "Spanisch"],
  ["french", "Französisch"],
  ["italian", "Italienisch"],
];

let asrP = null;
function loadAsr(onProgress) {
  asrP ??= (async () => {
    const { pipeline, env } = await import(/* @vite-ignore */ LIB);
    env.allowLocalModels = false;
    const files = new Map();
    return pipeline("automatic-speech-recognition", MODEL, {
      dtype: "q8",
      device: "wasm",
      progress_callback: (p) => {
        if (p.status === "progress" && p.total) {
          files.set(p.file, [p.loaded, p.total]);
          let l = 0;
          let t = 0;
          for (const [a, b] of files.values()) {
            l += a;
            t += b;
          }
          onProgress?.("load", t ? l / t : 0);
        }
      },
    });
  })().catch((e) => {
    asrP = null;
    throw e;
  });
  return asrP;
}

// Tonspur aus der Videodatei holen: 16 kHz, Mono
async function audioOf(file) {
  const buf = await file.arrayBuffer();
  const C = window.AudioContext || window.webkitAudioContext;
  const tmp = new C();
  let decoded;
  try {
    decoded = await tmp.decodeAudioData(buf.slice(0));
  } finally {
    tmp.close?.().catch?.(() => {});
  }
  const len = Math.ceil(decoded.duration * 16000);
  const off = new OfflineAudioContext(1, Math.max(1, len), 16000);
  const src = off.createBufferSource();
  src.buffer = decoded;
  src.connect(off.destination);
  src.start();
  const out = await off.startRendering();
  return out.getChannelData(0);
}

// Ergebnis: [[start, ende, text], …] in Sekunden
export async function transcribe(file, { lang = "german", onProgress } = {}) {
  onProgress?.("audio", 0);
  let audio;
  try {
    audio = await audioOf(file);
  } catch {
    throw new Error("Die Tonspur des Videos konnte nicht gelesen werden.");
  }
  let peak = 0;
  for (let i = 0; i < audio.length; i += 64) peak = Math.max(peak, Math.abs(audio[i]));
  if (peak < 0.01) throw new Error("In diesem Video ist kein Ton zu hören.");
  const asr = await loadAsr(onProgress);
  onProgress?.("run", 0);
  const res = await asr(audio, {
    language: lang,
    task: "transcribe",
    return_timestamps: true,
    chunk_length_s: 30,
    stride_length_s: 5,
  });
  const dur = audio.length / 16000;
  const chunks = (res.chunks || [{ timestamp: [0, dur], text: res.text || "" }])
    .map((c) => {
      const s = Math.max(0, Number(c.timestamp?.[0]) || 0);
      const e = Math.min(dur, Number(c.timestamp?.[1]) || s + 3);
      return [Math.round(s * 10) / 10, Math.round(Math.max(e, s + 0.5) * 10) / 10, String(c.text || "").trim()];
    })
    .filter((c) => c[2] && !/^[\[(].*[\])]$/.test(c[2]));
  if (!chunks.length) throw new Error("Es wurde keine Sprache erkannt.");
  return chunks.slice(0, 80);
}

export function cleanSubs(x) {
  if (!Array.isArray(x)) return null;
  const out = [];
  for (const c of x.slice(0, 80)) {
    if (!Array.isArray(c) || typeof c[2] !== "string") continue;
    const s = Number(c[0]);
    const e = Number(c[1]);
    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s || s < 0 || e > 120) continue;
    const t = c[2].trim().slice(0, 160);
    if (t) out.push([s, e, t]);
  }
  return out.length ? out : null;
}
