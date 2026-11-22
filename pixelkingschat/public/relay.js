// Pixelkingschat – Notfall-Weiterleitung für Anrufe
// Wenn keine direkte Verbindung zwischen zwei Handys möglich ist (z. B. manche Mobilfunknetze),
// läuft der Ton über einen Supabase-Realtime-Kanal. Der Ton bleibt Ende-zu-Ende-verschlüsselt:
// Kanalname und Schlüssel werden aus der geheimen Anruf-ID abgeleitet, Supabase sieht nur Datenmüll.
// Format: 12 kHz Mono, IMA-ADPCM (≈48 kbit/s), Stücke à 250 ms, bei Stille wird nichts gesendet.

const RATE = 12000;
const enc = new TextEncoder();

/* ---------- IMA-ADPCM ---------- */
const STEPS = [7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 19, 21, 23, 25, 28, 31, 34, 37, 41, 45, 50, 55, 60, 66, 73, 80, 88, 97, 107, 118, 130, 143, 157, 173, 190, 209, 230, 253, 279, 307, 337, 371, 408, 449, 494, 544, 598, 658, 724, 796, 876, 963, 1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066, 2272, 2499, 2749, 3024, 3327, 3660, 4026, 4428, 4871, 5358, 5894, 6484, 7132, 7845, 8630, 9493, 10442, 11487, 12635, 13899, 15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794, 32767];
const IDX = [-1, -1, -1, -1, 2, 4, 6, 8, -1, -1, -1, -1, 2, 4, 6, 8];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
function adpcmEncode(f32) {
  const out = new Uint8Array(4 + Math.ceil(f32.length / 2));
  let pred = clamp(Math.round(f32[0] * 32767), -32768, 32767);
  let index = 0;
  const dv = new DataView(out.buffer);
  dv.setInt16(0, pred, true);
  out[2] = index;
  for (let i = 0; i < f32.length; i++) {
    const s = clamp(Math.round(f32[i] * 32767), -32768, 32767);
    let step = STEPS[index];
    let diff = s - pred;
    let code = 0;
    if (diff < 0) {
      code = 8;
      diff = -diff;
    }
    let delta = step >> 3;
    if (diff >= step) {
      code |= 4;
      diff -= step;
      delta += step;
    }
    step >>= 1;
    if (diff >= step) {
      code |= 2;
      diff -= step;
      delta += step;
    }
    step >>= 1;
    if (diff >= step) {
      code |= 1;
      delta += step;
    }
    pred = clamp(code & 8 ? pred - delta : pred + delta, -32768, 32767);
    index = clamp(index + IDX[code], 0, 88);
    if (i & 1) out[4 + (i >> 1)] |= code << 4;
    else out[4 + (i >> 1)] = code;
  }
  return out;
}
function adpcmDecode(bytes, n) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let pred = dv.getInt16(0, true);
  let index = bytes[2];
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const b = bytes[4 + (i >> 1)];
    const code = i & 1 ? b >> 4 : b & 15;
    const step = STEPS[index];
    let delta = step >> 3;
    if (code & 4) delta += step;
    if (code & 2) delta += step >> 1;
    if (code & 1) delta += step >> 2;
    pred = clamp(code & 8 ? pred - delta : pred + delta, -32768, 32767);
    index = clamp(index + IDX[code], 0, 88);
    out[i] = pred / 32768;
  }
  return out;
}

const b64 = (u8) => {
  let s = "";
  for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(s);
};
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const hex = (buf) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");

/* ---------- gemeinsamer AudioContext (iPhone: im Tippen freischalten) ---------- */
let ac = null;
export function prepareAudio() {
  try {
    ac ??= new (window.AudioContext || window.webkitAudioContext)({ latencyHint: "interactive" });
    if (ac.state !== "running") ac.resume().catch(() => {});
  } catch {}
  return ac;
}
export const relaySupported = () => !!(window.WebSocket && window.AudioWorkletNode && crypto.subtle);

/* ---------- Weiterleitung starten ---------- */
// cfg: { url, key } (Supabase-Projekt, öffentlicher Schlüssel), room: geheime Anruf-ID
export async function startRelay({ cfg, room, me, local, onConnected, onState }) {
  const ctx = prepareAudio();
  if (ctx.state !== "running") await ctx.resume().catch(() => {});
  await ctx.audioWorklet.addModule("/relay-worklet.js");
  const chan = "pk-call-" + hex(await crypto.subtle.digest("SHA-256", enc.encode("pk-relay-chan|" + room))).slice(0, 32);
  const key = await crypto.subtle.importKey("raw", await crypto.subtle.digest("SHA-256", enc.encode("pk-relay-key|" + room)), "AES-GCM", false, ["encrypt", "decrypt"]);

  // Wiedergabe
  const player = new AudioWorkletNode(ctx, "pk-play", { numberOfInputs: 0, outputChannelCount: [1] });
  const outGain = ctx.createGain();
  player.connect(outGain).connect(ctx.destination);
  // Aufnahme
  const src = ctx.createMediaStreamSource(local);
  const cap = new AudioWorkletNode(ctx, "pk-cap");
  const sink = ctx.createGain();
  sink.gain.value = 0;
  src.connect(cap).connect(sink).connect(ctx.destination);

  const R = { closed: false, connected: false, localLevel: 0, remoteLevel: 0, sent: 0, recv: 0 };
  const topic = "realtime:" + chan;
  let ws = null;
  let ref = 1;
  let joined = false;
  let hb = null;
  let seq = 0;
  let speakUntil = 0;
  const send = (event, payload) => {
    if (!ws || ws.readyState !== 1 || !joined) return false;
    ws.send(JSON.stringify({ topic, event: "broadcast", payload: { type: "broadcast", event, payload }, ref: String(ref++), join_ref: "1" }));
    return true;
  };
  const hello = () => send("hi", { from: me });
  const markConnected = () => {
    if (R.connected) return;
    R.connected = true;
    onConnected?.();
  };

  cap.port.onmessage = async (e) => {
    const f = e.data;
    let sum = 0;
    for (let i = 0; i < f.length; i += 4) sum += f[i] * f[i];
    const rms = Math.sqrt(sum / (f.length / 4));
    R.localLevel = rms;
    const now = performance.now();
    if (rms > 0.006) speakUntil = now + 600; // kurz nachlaufen lassen, damit Wortenden nicht abgeschnitten werden
    if (now > speakUntil || !joined) return;
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: enc.encode(me) }, key, adpcmEncode(f)));
    const pkt = new Uint8Array(12 + ct.length);
    pkt.set(iv);
    pkt.set(ct, 12);
    if (send("a", { f: me, s: seq++, n: f.length, d: b64(pkt) })) R.sent++;
  };

  const onMsg = async (m) => {
    if (m.event === "phx_reply" && m.ref === "1") {
      if (m.payload?.status === "ok") {
        joined = true;
        onState?.("joined");
        hello();
      } else onState?.("error");
      return;
    }
    if (m.event !== "broadcast" || m.topic !== topic) return;
    const ev = m.payload?.event;
    const p = m.payload?.payload || {};
    if (!p.f || p.f === me) return;
    if (ev === "hi") {
      if (!R.connected) hello();
      markConnected();
      return;
    }
    if (ev === "a" && typeof p.d === "string" && Number.isInteger(p.n) && p.n > 0 && p.n <= RATE) {
      try {
        const pkt = unb64(p.d);
        const pt = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: pkt.subarray(0, 12), additionalData: enc.encode(p.f) }, key, pkt.subarray(12)));
        const f = adpcmDecode(pt, p.n);
        let sum = 0;
        for (let i = 0; i < f.length; i += 4) sum += f[i] * f[i];
        R.remoteLevel = Math.sqrt(sum / (f.length / 4));
        R.lastRecv = performance.now();
        R.recv++;
        player.port.postMessage(f, [f.buffer]);
        markConnected();
      } catch {}
    }
  };

  let tries = 0;
  const connect = () => {
    if (R.closed) return;
    joined = false;
    ws = new WebSocket(cfg.url.replace(/^http/, "ws") + "/realtime/v1/websocket?apikey=" + encodeURIComponent(cfg.key) + "&vsn=1.0.0");
    ws.onopen = () => {
      tries = 0;
      ref = 2;
      ws.send(
        JSON.stringify({
          topic,
          event: "phx_join",
          payload: { config: { broadcast: { self: false, ack: false }, presence: { key: "" }, postgres_changes: [] }, access_token: cfg.key },
          ref: "1",
          join_ref: "1",
        })
      );
    };
    ws.onmessage = (e) => {
      try {
        onMsg(JSON.parse(e.data));
      } catch {}
    };
    ws.onclose = () => {
      joined = false;
      if (R.closed) return;
      onState?.("reconnecting");
      if (++tries <= 6) setTimeout(connect, 600 * tries);
      else onState?.("error");
    };
  };
  connect();
  hb = setInterval(() => {
    if (ws?.readyState === 1) ws.send(JSON.stringify({ topic: "phoenix", event: "heartbeat", payload: {}, ref: String(ref++) }));
    if (joined && !R.connected) hello();
  }, 4000);
  // Pegel langsam abklingen lassen (für die Sprech-Anzeige)
  const decay = setInterval(() => {
    if (performance.now() - (R.lastRecv || 0) > 400) R.remoteLevel *= 0.5;
  }, 200);

  R.setOutputMuted = (m) => (outGain.gain.value = m ? 0 : 1);
  R.close = () => {
    if (R.closed) return;
    R.closed = true;
    clearInterval(hb);
    clearInterval(decay);
    try {
      ws?.close();
    } catch {}
    try {
      src.disconnect();
      cap.disconnect();
      player.disconnect();
      outGain.disconnect();
      sink.disconnect();
    } catch {}
  };
  return R;
}
