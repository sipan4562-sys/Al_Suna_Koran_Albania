// Pixelkingschat – Livestreams
// Der Streamer nimmt alle 3 Sekunden ein in sich abgeschlossenes Video-Stück auf (MediaRecorder)
// und lädt es hoch – in voller Qualität (HD) und zusätzlich als 480p-Version für schwache Verbindungen.
// Zuschauer hängen die Stücke nahtlos aneinander (Media Source Extensions).
// „Nur Kontakte“: jedes Stück ist Ende-zu-Ende-verschlüsselt (AES-GCM), der Schlüssel ist pro Kontakt eingepackt.

const SEG_MS = 3000;
const LEVELS = {
  1080: { w: 1920, h: 1080, vb: 4_000_000 },
  720: { w: 1280, h: 720, vb: 2_200_000 },
  480: { w: 854, h: 480, vb: 900_000 },
};
const SD = { w: 854, h: 480, vb: 800_000 };
const Q_LABEL = { auto: "Automatisch", 1080: "1080p", 720: "720p", 480: "480p" };

export function initLive(ctx) {
  const { api, S, el, rich, toast } = ctx;
  let live = null; // eigenes Live (Streamer)
  let watching = null; // Live, das ich gerade anschaue
  let lives = []; // aktuelle Lives (Kontakte + öffentlich)

  const enc = new TextEncoder();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const fmt = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(s / 3600);
    const mm = String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, "0");
    return `${h ? h + ":" : ""}${mm}:${String(s % 60).padStart(2, "0")}`;
  };
  const authHeader = () => ({ authorization: `PK ${S().me.id}:${S().me.token}` });

  async function aesKey(raw) {
    return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
  }
  async function sealSeg(key, lid, r, n, data) {
    const iv = ctx.rand(12);
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: enc.encode(`live|${lid}|${r}|${n}`) }, key, data);
    const out = new Uint8Array(12 + ct.byteLength);
    out.set(iv);
    out.set(new Uint8Array(ct), 12);
    return out;
  }
  async function openSeg(key, lid, r, n, buf) {
    const b = new Uint8Array(buf);
    return crypto.subtle.decrypt({ name: "AES-GCM", iv: b.slice(0, 12), additionalData: enc.encode(`live|${lid}|${r}|${n}`) }, key, b.slice(12));
  }

  function pickMime() {
    if (!window.MediaRecorder) return null;
    const MS = window.ManagedMediaSource || window.MediaSource;
    const mseOk = (m) => !MS || MS.isTypeSupported(m);
    // MP4 (H.264) läuft überall, auch auf iPhones – wenn der Browser es aufnehmen kann
    const cands = [
      "video/mp4;codecs=avc1.42E01F,mp4a.40.2",
      "video/mp4;codecs=avc1,mp4a.40.2",
      "video/webm;codecs=vp8,opus",
      "video/webm;codecs=vp9,opus",
      "video/webm",
      "video/mp4",
    ];
    return cands.find((m) => MediaRecorder.isTypeSupported(m) && mseOk(m)) || cands.find((m) => MediaRecorder.isTypeSupported(m)) || null;
  }

  /* ================= Live gehen ================= */
  function showGoLive() {
    if (ctx.sendBlocked()) return;
    if (live) return showStreamer();
    if (!pickMime() || !navigator.mediaDevices?.getUserMedia) return toast("Dein Browser kann leider keine Livestreams senden.");
    const s = S().settings;
    const body = el("div", "stack");
    body.append(el("h2", null, "🔴 Live gehen"));
    const title = el("input");
    title.placeholder = "Titel (optional)";
    title.maxLength = 60;
    body.append(title);

    const chips = (label, opts, cur, onPick) => {
      const box = el("div", "stack");
      const row = el("div", "chip-row");
      for (const [k, txt] of opts) {
        const c = el("button", "chip" + (k === cur ? " active" : ""), txt);
        c.type = "button";
        c.onclick = () => {
          for (const x of row.children) x.classList.toggle("active", x === c);
          onPick(k);
        };
        row.append(c);
      }
      box.append(el("strong", null, label), row);
      return box;
    };
    let pub = !!s.livePublic;
    let q = s.liveQ || "auto";
    const hint = el("p", "small muted");
    const setHint = () =>
      (hint.textContent = pub
        ? "🌍 Öffentlich: Alle Pixelkingschat-Nutzer können zuschauen (unter „Entdecken“)."
        : "👥 Nur deine Kontakte – Ende-zu-Ende-verschlüsselt.");
    setHint();
    body.append(
      chips("Wer darf zuschauen?", [[false, "👥 Kontakte"], [true, "🌍 Öffentlich"]], pub, (v) => {
        pub = v;
        setHint();
      }),
      hint
    );
    const qHint = el("p", "small muted");
    const setQHint = () =>
      (qHint.textContent =
        q === "auto"
          ? "Automatisch: passt sich laufend deiner Verbindung an – bis 1080p."
          : `Bis ${Q_LABEL[q]}. Zuschauer mit schwacher Verbindung bekommen automatisch 480p.`);
    setQHint();
    body.append(
      chips("Qualität", [["auto", "⚡ Auto"], ["1080", "1080p"], ["720", "720p"], ["480", "480p"]], q, (v) => {
        q = v;
        setQHint();
      }),
      qHint
    );
    const lab = el("label", "check");
    const cb = el("input");
    cb.type = "checkbox";
    cb.checked = s.liveNotify !== false;
    lab.append(cb, " Kontakte benachrichtigen");
    body.append(lab);
    const go = el("button", "btn danger big", "🔴 Jetzt live gehen");
    go.onclick = async () => {
      go.disabled = true;
      s.livePublic = pub;
      s.liveQ = q;
      s.liveNotify = cb.checked;
      ctx.save();
      try {
        await startLive({ title: title.value.trim(), pub, q, notify: cb.checked });
      } catch (e) {
        toast(e.message);
        go.disabled = false;
      }
    };
    body.append(go, el("p", "small muted", "Ein Live dauert höchstens 4 Stunden. Lass die App dabei geöffnet."));
    ctx.openModal(body);
  }

  async function getCam(facing, lv) {
    const L = LEVELS[lv];
    return navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: { facingMode: facing, width: { ideal: L.w }, height: { ideal: L.h }, frameRate: { ideal: 30, max: 30 } },
    });
  }

  async function startLive({ title, pub, q, notify }) {
    const mime = pickMime();
    const maxLv = q === "auto" ? 1080 : Number(q);
    const startLv = q === "auto" ? 720 : maxLv;
    let cam;
    try {
      cam = await getCam("user", startLv);
    } catch {
      throw new Error("📷 Bitte erlaube Kamera und Mikrofon.");
    }
    const lid = ctx.b64u(ctx.rand(12));
    const me = S().me.id;
    let keyRaw = null;
    const keys = {};
    const contacts = ctx.storyContacts();
    if (!pub) {
      keyRaw = ctx.rand(32);
      for (const id of contacts) {
        keys[id] = await ctx.aesSeal(new Uint8Array(await ctx.msgKeyBytes(id, "live|" + lid)), keyRaw, `${me}>${id}|live|${lid}`);
      }
    }
    try {
      await api("live/start", {
        body: { lid, title, pub, mime, rs: ["hd", "sd"], q, keys, notify: notify ? contacts : [] },
      });
    } catch (e) {
      cam.getTracks().forEach((t) => t.stop());
      throw e;
    }
    ctx.closeModal();
    live = {
      lid,
      title,
      pub,
      q,
      mime,
      maxLv,
      lv: startLv,
      cam,
      facing: "user",
      key: keyRaw ? await aesKey(keyRaw) : null,
      sdTrack: null,
      n: 0,
      recs: null,
      inflight: { hd: 0, sd: 0 },
      slow: 0,
      fast: 0,
      started: Date.now(),
      viewers: 0,
      dropped: 0,
    };
    await setupSd();
    try {
      live.wake = await navigator.wakeLock?.request("screen");
    } catch {}
    showStreamer();
    tick();
    live.timer = setInterval(tick, SEG_MS);
    refreshList();
  }

  // 480p-Kopie des Kamerabilds für Zuschauer mit schwacher Verbindung.
  // Über eine Zeichenfläche – verkleinerte Track-Kopien nimmt der MediaRecorder sonst trotzdem in voller Größe auf.
  async function setupSd() {
    const L = live;
    stopSd(L);
    if (L.lv <= 480) return;
    try {
      const v = document.createElement("video");
      v.muted = true;
      v.playsInline = true;
      v.srcObject = new MediaStream(L.cam.getVideoTracks());
      await v.play().catch(() => {});
      const c = document.createElement("canvas");
      const g = c.getContext("2d", { alpha: false });
      const draw = () => {
        if (!L.sd || L.sd.v !== v) return;
        const w = v.videoWidth;
        const h = v.videoHeight;
        if (w && h) {
          const s = SD.h / Math.min(w, h); // kürzere Seite → 480 (auch im Hochformat)
          const cw = Math.round((w * s) / 2) * 2;
          const ch = Math.round((h * s) / 2) * 2;
          if (c.width !== cw || c.height !== ch) {
            c.width = cw;
            c.height = ch;
          }
          g.drawImage(v, 0, 0, cw, ch);
        }
        if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(draw);
      };
      L.sd = { v, c };
      if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(draw);
      else L.sd.iv = setInterval(draw, 33);
      L.sdTrack = c.captureStream(30).getVideoTracks()[0];
    } catch {
      stopSd(L);
    }
  }
  function stopSd(L) {
    L.sdTrack?.stop();
    L.sdTrack = null;
    if (L.sd) {
      clearInterval(L.sd.iv);
      L.sd.v.srcObject = null;
      L.sd = null;
    }
  }

  function newRecorder(r, n) {
    const L = r === "hd" ? LEVELS[live.lv] : SD;
    const tracks = r === "hd" ? live.cam.getTracks() : [live.sdTrack, ...live.cam.getAudioTracks()];
    const rec = new MediaRecorder(new MediaStream(tracks), { mimeType: live.mime, videoBitsPerSecond: L.vb, audioBitsPerSecond: 64000 });
    const chunks = [];
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      if (!live || !chunks.length) return;
      upload(r, n, new Blob(chunks, { type: live.mime }));
    };
    rec.onerror = () => {};
    rec.start();
    return rec;
  }

  // Alle 3 s: neue Aufnahme starten, dann die alte beenden (keine Lücke)
  function tick() {
    if (!live) return;
    const n = ++live.n;
    const next = {};
    try {
      next.hd = newRecorder("hd", n);
      if (live.sdTrack && live.sdTrack.readyState === "live") next.sd = newRecorder("sd", n);
    } catch (e) {
      console.warn("live recorder", e);
    }
    const prev = live.recs;
    live.recs = next;
    if (prev) for (const r of Object.values(prev)) if (r.state !== "inactive") r.stop();
  }

  async function upload(r, n, blob) {
    const L = live;
    if (!L) return;
    // Verbindung kommt nicht hinterher → lieber ein Stück auslassen als immer weiter zurückfallen
    if (L.inflight[r] >= 2) {
      L.dropped++;
      if (r === "hd") adapt(SEG_MS * 2);
      return;
    }
    L.inflight[r]++;
    const t0 = performance.now();
    try {
      let data = new Uint8Array(await blob.arrayBuffer());
      if (L.key) data = await sealSeg(L.key, L.lid, r, n, data);
      const res = await fetch(`/api/live/seg?lid=${L.lid}&r=${r}&n=${n}`, {
        method: "PUT",
        headers: { ...authHeader(), "content-type": "application/octet-stream" },
        body: data,
      });
      const d = await res.json().catch(() => ({}));
      if (res.status === 403 || res.status === 410) {
        if (live === L) stopLive(d.error || "Das Live wurde beendet.");
        return;
      }
      if (res.ok && r === "hd") {
        if (typeof d.viewers === "number") L.viewers = d.viewers;
        adapt(performance.now() - t0);
      }
    } catch {
      if (r === "hd") adapt(SEG_MS * 2);
    } finally {
      L.inflight[r]--;
      if (live === L) renderStreamerInfo();
    }
  }

  // Automatische Qualität: Upload-Zeit pro Stück beobachten und die Auflösung anpassen
  function adapt(ms) {
    const L = live;
    if (!L || L.q !== "auto") return;
    if (ms > SEG_MS * 0.85) {
      L.fast = 0;
      if (++L.slow >= 2) {
        L.slow = 0;
        setLevel(L.lv === 1080 ? 720 : 480);
      }
    } else if (ms < SEG_MS * 0.3) {
      L.slow = 0;
      if (++L.fast >= 6) {
        L.fast = 0;
        if (L.lv < L.maxLv) setLevel(L.lv === 480 ? 720 : 1080);
      }
    } else {
      L.slow = 0;
      L.fast = 0;
    }
  }
  async function setLevel(lv) {
    if (!live || live.lv === lv) return;
    live.lv = lv;
    const L = LEVELS[lv];
    try {
      await live.cam.getVideoTracks()[0].applyConstraints({ width: { ideal: L.w }, height: { ideal: L.h }, frameRate: { ideal: 30, max: 30 } });
    } catch {}
    await setupSd();
    renderStreamerInfo();
  }

  async function flipCamera() {
    if (!live) return;
    const facing = live.facing === "user" ? "environment" : "user";
    try {
      const L = LEVELS[live.lv];
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: L.w }, height: { ideal: L.h }, frameRate: { ideal: 30, max: 30 } },
      });
      const old = live.cam.getVideoTracks()[0];
      live.cam.removeTrack(old);
      old.stop();
      live.cam.addTrack(s.getVideoTracks()[0]);
      live.facing = facing;
      await setupSd();
      // sofort ein neues Stück beginnen, damit das Bild ohne Aussetzer wechselt
      clearInterval(live.timer);
      tick();
      live.timer = setInterval(tick, SEG_MS);
      const v = $view?.querySelector("video");
      if (v) {
        v.srcObject = live.cam;
        v.classList.toggle("mirror", facing === "user");
      }
    } catch {
      toast("Kamera konnte nicht gewechselt werden.");
    }
  }

  function stopLive(msg) {
    const L = live;
    if (!L) return;
    live = null;
    clearInterval(L.timer);
    clearInterval(L.uiTimer);
    try {
      if (L.recs) for (const r of Object.values(L.recs)) if (r.state !== "inactive") r.stop();
    } catch {}
    L.cam.getTracks().forEach((t) => t.stop());
    stopSd(L);
    L.wake?.release?.().catch(() => {});
    api("live/end", { body: { lid: L.lid } }).catch(() => {});
    closeView();
    toast(msg || `Live beendet · ${fmt(Date.now() - L.started)}`, 4000);
    refreshList();
  }

  /* ================= Vollbild-Ansichten ================= */
  let $view = null;
  function closeView() {
    $view?.remove();
    $view = null;
    document.body.classList.remove("live-open");
  }
  function makeView(cls) {
    closeView();
    $view = el("div", "live-view " + cls);
    document.body.append($view);
    document.body.classList.add("live-open");
    return $view;
  }
  const badge = () => el("span", "live-badge", "LIVE");

  function showStreamer() {
    const L = live;
    if (!L) return;
    const v = makeView("streamer");
    const video = el("video", "live-video mirror");
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.srcObject = L.cam;
    const top = el("div", "live-top");
    const info = el("div", "live-info");
    info.append(badge(), el("span", "live-time"), el("span", "live-viewers"), el("span", "live-q"));
    top.append(info);
    if (L.title) top.append(rich("div", "live-title", L.title));
    top.append(el("div", "live-aud small", L.pub ? "🌍 Öffentlich" : "👥 Nur Kontakte · 🔐 verschlüsselt"));
    const bar = el("div", "live-bar");
    const flip = el("button", "call-btn", "🔄");
    flip.title = "Kamera wechseln";
    flip.onclick = flipCamera;
    const mic = el("button", "call-btn", "🎤");
    mic.title = "Mikrofon an/aus";
    mic.onclick = () => {
      const t = L.cam.getAudioTracks()[0];
      if (!t) return;
      t.enabled = !t.enabled;
      mic.textContent = t.enabled ? "🎤" : "🔇";
      mic.classList.toggle("off", !t.enabled);
    };
    const end = el("button", "btn danger live-end", "■ Beenden");
    end.onclick = () => confirm("Live wirklich beenden?") && stopLive();
    bar.append(flip, mic, end);
    v.append(video, top, bar);
    renderStreamerInfo();
    L.uiTimer = setInterval(renderStreamerInfo, 1000);
  }
  function renderStreamerInfo() {
    if (!live || !$view?.classList.contains("streamer")) return;
    $view.querySelector(".live-time").textContent = fmt(Date.now() - live.started);
    $view.querySelector(".live-viewers").textContent = `👁 ${live.viewers}`;
    $view.querySelector(".live-q").textContent = `${live.lv}p${live.q === "auto" ? " · Auto" : ""}`;
  }

  /* ================= Zuschauen ================= */
  async function watch(lid) {
    if (live) return toast("Du bist gerade selbst live.");
    stopWatching();
    let info;
    try {
      info = await api("live/join", { body: { lid } });
    } catch (e) {
      return toast(e.message);
    }
    if (!info.alive) return toast("Dieses Live ist schon vorbei.");
    let key = null;
    if (!info.pub) {
      try {
        const me = S().me.id;
        if (info.owner === me) return toast("Das ist dein eigenes Live.");
        const raw = await ctx.aesOpenRaw(new Uint8Array(await ctx.msgKeyBytes(info.owner, "live|" + lid)), info.wk, `${info.owner}>${me}|live|${lid}`);
        key = await aesKey(raw);
      } catch {
        return toast("Dieses Live konnte nicht entschlüsselt werden.");
      }
    }
    const W = (watching = {
      lid,
      info,
      key,
      latest: { ...info.last },
      alive: true,
      viewers: info.viewers,
      pref: S().settings.liveViewQ || "auto",
      cur: info.rs.includes("sd") && (S().settings.liveViewQ === "sd") ? "sd" : "hd",
      slow: 0,
      fast: 0,
      closed: false,
    });
    renderViewer(W);
    W.headTimer = setInterval(() => head(W), 2000);
    W.joinTimer = setInterval(() => api("live/join", { body: { lid } }).catch(() => {}), 20000);
    play(W).catch((e) => {
      console.warn("live play", e);
      if (!W.closed) showViewerMsg(W, "⚠ Das Live kann auf diesem Gerät nicht abgespielt werden.");
    });
  }

  async function head(W) {
    try {
      const r = await fetch(`/api/live/head?lid=${W.lid}`);
      if (!r.ok) return;
      const h = await r.json();
      for (const k of Object.keys(h.last || {})) W.latest[k] = Math.max(W.latest[k] || 0, h.last[k]);
      W.viewers = h.viewers;
      W.alive = h.alive;
      W.endReason = h.endReason;
      renderViewerInfo(W);
    } catch {}
  }

  function chooseR(W) {
    const rs = W.info.rs;
    if (!rs.includes("sd") || W.pref === "hd") return "hd";
    if (W.pref === "sd") return (W.latest.sd || 0) >= (W.latest.hd || 0) - 1 ? "sd" : "hd";
    // Auto: wenn es kein 480p-Stück gibt (z. B. Streamer selbst auf 480p), HD nehmen
    if (W.cur === "sd" && (W.latest.sd || 0) < (W.latest.hd || 0) - 1) return "hd";
    return W.cur;
  }
  function adaptView(W, r, ms, ahead) {
    if (W.pref !== "auto" || !W.info.rs.includes("sd")) return;
    if (r === "hd" && (ms > SEG_MS * 0.6 || ahead < 1)) {
      W.fast = 0;
      if (++W.slow >= 2) {
        W.slow = 0;
        W.cur = "sd";
      }
    } else if (r === "sd" && ms < SEG_MS * 0.15 && ahead > 3) {
      W.slow = 0;
      if (++W.fast >= 5) {
        W.fast = 0;
        W.cur = "hd";
      }
    } else if (r === "hd") W.slow = 0;
  }

  async function fetchSeg(W, r, n) {
    const t0 = performance.now();
    const res = await fetch(`/api/live/seg?lid=${W.lid}&r=${r}&n=${n}`);
    if (!res.ok) return { missing: res.status === 404 };
    let buf = await res.arrayBuffer();
    if (W.key) buf = await openSeg(W.key, W.lid, r, n, buf);
    return { buf, ms: performance.now() - t0 };
  }

  async function play(W) {
    const MS = window.ManagedMediaSource || window.MediaSource;
    const mime = W.info.mime;
    if (MS && MS.isTypeSupported(mime)) return playMse(W, MS, mime);
    return playBlobs(W);
  }

  // Bevorzugt: Media Source – alle Stücke laufen als ein durchgehendes Video
  async function playMse(W, MS, mime) {
    const video = W.video;
    const ms = new MS();
    video.disableRemotePlayback = true;
    video.src = URL.createObjectURL(ms);
    await new Promise((r) => ms.addEventListener("sourceopen", r, { once: true }));
    const sb = ms.addSourceBuffer(mime);
    sb.mode = "sequence";
    const append = (buf) =>
      new Promise((res, rej) => {
        sb.addEventListener("updateend", res, { once: true });
        sb.addEventListener("error", rej, { once: true });
        sb.appendBuffer(buf);
      });
    const removeOld = () =>
      new Promise((res) => {
        const b = sb.buffered;
        if (!b.length || video.currentTime - b.start(0) < 30) return res();
        sb.addEventListener("updateend", res, { once: true });
        try {
          sb.remove(0, video.currentTime - 15);
        } catch {
          res();
        }
      });
    let n = Math.max(1, (W.latest.hd || 1) - 1);
    let misses = 0;
    while (!W.closed) {
      const r = chooseR(W);
      const latest = W.latest[r] || 0;
      if (n > latest) {
        if (!W.alive) {
          showViewerMsg(W, endText(W));
          return;
        }
        await sleep(500);
        continue;
      }
      // weit zurückgefallen (z. B. App war im Hintergrund) → zum Live-Rand springen
      if (latest - n > 4) n = latest - 1;
      let seg;
      try {
        seg = await fetchSeg(W, r, n);
      } catch {
        await sleep(800);
        continue;
      }
      if (W.closed) return;
      if (!seg.buf) {
        // Stück fehlt (Streamer hatte kurz schlechtes Netz) → nach kurzem Warten überspringen
        if (++misses >= 3 || latest - n >= 2) {
          misses = 0;
          n++;
        } else await sleep(500);
        continue;
      }
      misses = 0;
      try {
        await append(seg.buf);
      } catch (e) {
        console.warn("append", e);
        n++;
        continue;
      }
      n++;
      const b = sb.buffered;
      const end = b.length ? b.end(b.length - 1) : 0;
      // zu weit hinter dem Live-Rand → aufholen
      if (end - video.currentTime > 10) video.currentTime = end - 3;
      if (b.length && video.currentTime < b.start(0)) video.currentTime = b.start(0);
      adaptView(W, r, seg.ms, end - video.currentTime);
      W.shown = r;
      renderViewerInfo(W);
      startPlayback(W);
      await removeOld();
    }
  }

  // Ersatz für Geräte ohne Media Source (ältere iPhones): Stücke nacheinander abspielen
  async function playBlobs(W) {
    const queue = [];
    const vids = [W.video, el("video", "live-video hidden")];
    vids[1].playsInline = true;
    W.video.after(vids[1]);
    let active = 0;
    const next = () => {
      const url = queue.shift();
      if (!url) return false;
      const v = vids[active];
      const old = vids[1 - active];
      v.src = url;
      v.classList.remove("hidden");
      v.muted = W.muted;
      v.play().catch(() => {});
      old.classList.add("hidden");
      old.pause();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      return true;
    };
    for (const v of vids)
      v.onended = () => {
        active = 1 - active;
        if (!next()) W.waiting = true;
      };
    let n = Math.max(1, (W.latest.hd || 1) - 1);
    let started = false;
    while (!W.closed) {
      const r = chooseR(W);
      const latest = W.latest[r] || 0;
      if (n > latest) {
        if (!W.alive) return showViewerMsg(W, endText(W));
        await sleep(500);
        continue;
      }
      if (latest - n > 4) n = latest - 1;
      const seg = await fetchSeg(W, r, n).catch(() => ({}));
      n++;
      if (!seg.buf) continue;
      queue.push(URL.createObjectURL(new Blob([seg.buf], { type: W.info.mime })));
      while (queue.length > 3) URL.revokeObjectURL(queue.shift());
      adaptView(W, r, seg.ms, queue.length * 3);
      W.shown = r;
      renderViewerInfo(W);
      if (!started || W.waiting) {
        started = true;
        W.waiting = false;
        next();
        W.$loading?.classList.add("hidden");
      }
    }
  }

  function startPlayback(W) {
    const v = W.video;
    W.$loading?.classList.add("hidden");
    if (!v.paused) return;
    v.muted = W.muted;
    v.play().catch(() => {
      // Autoplay mit Ton blockiert → stumm starten, Knopf zum Einschalten zeigen
      W.muted = true;
      v.muted = true;
      v.play().catch(() => {});
      W.$unmute?.classList.remove("hidden");
    });
  }

  const endText = (W) =>
    W.endReason === "violation" || W.endReason === "owner" || W.endReason === "blocked"
      ? "Dieses Live wurde wegen eines Regelverstoßes beendet."
      : "📴 Das Live ist vorbei.";

  function showViewerMsg(W, text) {
    if (!W.$msg) return;
    W.$msg.textContent = text;
    W.$msg.classList.remove("hidden");
    W.$loading?.classList.add("hidden");
  }

  function renderViewer(W) {
    const v = makeView("viewer");
    const { info } = W;
    const video = el("video", "live-video");
    video.playsInline = true;
    video.autoplay = true;
    W.video = video;
    W.muted = false;
    // im Klick des Nutzers starten → Ton ist erlaubt
    video.play().catch(() => {});
    const top = el("div", "live-top");
    const who = el("div", "live-who");
    const av = el("div", "avatar");
    ctx.fillAvatar(av, S().contacts[info.owner] || { id: info.owner, av: info.av, name: info.name }, info.name || info.owner);
    const nm = el("div", "live-name");
    nm.append(rich("strong", null, S().contacts[info.owner] ? ctx.displayName(S().contacts[info.owner]) : info.name || info.owner));
    const meta = el("div", "live-info");
    meta.append(badge(), el("span", "live-viewers"), el("span", "live-time"));
    nm.append(meta);
    const close = el("button", "icon-btn live-close", "✕");
    close.onclick = stopWatching;
    who.append(av, nm, close);
    top.append(who);
    if (info.title) top.append(rich("div", "live-title", info.title));
    const loading = el("div", "live-loading", "Verbinde mit dem Live…");
    const msg = el("div", "live-msg hidden");
    const unmute = el("button", "btn primary live-unmute hidden", "🔊 Ton einschalten");
    unmute.onclick = () => {
      W.muted = false;
      video.muted = false;
      for (const x of v.querySelectorAll("video")) x.muted = false;
      video.play().catch(() => {});
      unmute.classList.add("hidden");
    };
    const bar = el("div", "live-bar");
    const qBtn = el("button", "chip live-qbtn");
    qBtn.onclick = () => {
      const order = info.rs.includes("sd") ? ["auto", "hd", "sd"] : ["auto", "hd"];
      W.pref = order[(order.indexOf(W.pref) + 1) % order.length];
      if (W.pref !== "auto") W.cur = W.pref;
      S().settings.liveViewQ = W.pref;
      ctx.save();
      renderViewerInfo(W);
      toast(W.pref === "auto" ? "Qualität: Automatisch (je nach Verbindung)" : W.pref === "hd" ? "Qualität: HD" : "Qualität: 480p (spart Daten)");
    };
    const rep = el("button", "icon-btn live-report", "⚑");
    rep.title = "Live melden";
    rep.onclick = () => reportLive(W);
    bar.append(qBtn, rep);
    if (ctx.isOwner() && info.owner !== S().me.id) {
      const kill = el("button", "btn danger small-btn", "⛔ Live beenden");
      kill.onclick = async () => {
        if (!confirm("Dieses Live als Besitzer beenden?")) return;
        try {
          await api("live/end", { body: { lid: W.lid } });
          toast("Live beendet");
        } catch (e) {
          toast(e.message);
        }
      };
      bar.append(kill);
    }
    v.append(video, top, loading, msg, unmute, bar);
    W.$loading = loading;
    W.$msg = msg;
    W.$unmute = unmute;
    W.$q = qBtn;
    renderViewerInfo(W);
    W.uiTimer = setInterval(() => renderViewerInfo(W), 1000);
  }
  function renderViewerInfo(W) {
    if (!$view || watching !== W) return;
    $view.querySelector(".live-viewers").textContent = `👁 ${W.viewers || 1}`;
    $view.querySelector(".live-time").textContent = fmt(Date.now() - W.info.started);
    const shown = W.shown === "sd" ? "480p" : W.info.q && W.info.q !== "auto" ? `${W.info.q}p` : "HD";
    W.$q.textContent = W.pref === "auto" ? `⚡ Auto · ${shown}` : W.pref === "hd" ? `HD${W.info.q && W.info.q !== "auto" ? ` (${W.info.q}p)` : ""}` : "480p";
  }

  function stopWatching() {
    const W = watching;
    if (!W) return;
    watching = null;
    W.closed = true;
    clearInterval(W.headTimer);
    clearInterval(W.joinTimer);
    clearInterval(W.uiTimer);
    try {
      W.video.pause();
      W.video.removeAttribute("src");
      W.video.load();
    } catch {}
    api("live/leave", { body: { lid: W.lid } }).catch(() => {});
    closeView();
  }

  function snapshot(video) {
    try {
      const c = document.createElement("canvas");
      const s = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight));
      c.width = Math.round(video.videoWidth * s);
      c.height = Math.round(video.videoHeight * s);
      if (!c.width) return undefined;
      c.getContext("2d").drawImage(video, 0, 0, c.width, c.height);
      return c.toDataURL("image/jpeg", 0.75).split(",")[1];
    } catch {
      return undefined;
    }
  }
  function reportLive(W) {
    const vis = [...$view.querySelectorAll("video")].find((v) => !v.classList.contains("hidden")) || W.video;
    const imageB64 = snapshot(vis);
    ctx.showReport({ type: "live", target: W.info.owner, lid: W.lid, imageB64 });
  }

  /* ================= Liste der Lives ================= */
  async function refreshList() {
    if (!S().me) return lives;
    try {
      const ids = ctx.storyContacts();
      const r = await api(`live/list?ids=${ids.join(",")}`);
      lives = r.lives.filter((x) => x.owner !== S().me.id);
    } catch {}
    ctx.onList?.(lives);
    return lives;
  }

  return {
    showGoLive,
    watch,
    refreshList,
    list: () => lives,
    isLive: () => !!live,
    isWatching: () => !!watching,
    busy: () => !!live || !!watching,
  };
}
