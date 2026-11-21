// Pixelkingschat – Audio-Lives
// Der Ton geht direkt vom Handy des Streamers zu jedem Zuhörer (WebRTC, DTLS-SRTP-verschlüsselt) –
// über den Server laufen nur winzige, Ende-zu-Ende-verschlüsselte Verbindungsnachrichten.
// Dadurch verbraucht ein Live praktisch kein Datenvolumen beim Hosting.

const MAX_LISTENERS = 50;

export function initLive(ctx) {
  const { api, S, el, rich, toast } = ctx;
  let live = null; // eigenes Live
  let listening = null; // Live, dem ich zuhöre
  let lives = [];

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const fmt = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(s / 3600);
    const mm = String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, "0");
    return `${h ? h + ":" : ""}${mm}:${String(s % 60).padStart(2, "0")}`;
  };
  const C = () => ctx.calls();
  const nameOf = (id, fallback) => (S().contacts[id] ? ctx.displayName(S().contacts[id]) : fallback || id);

  /* ================= Live gehen ================= */
  function showGoLive() {
    if (ctx.sendBlocked()) return;
    if (live) return showHost();
    if (C().inCall()) return toast("Du bist gerade in einem Anruf.");
    if (!window.RTCPeerConnection || !navigator.mediaDevices?.getUserMedia) return toast("Dein Browser unterstützt keine Lives.");
    const s = S().settings;
    const body = el("div", "stack");
    body.append(el("h2", null, "🎙 Audio-Live"));
    body.append(el("p", "small muted", `Sprich live zu deinen Kontakten oder zu allen – wie Radio. Bis zu ${MAX_LISTENERS} Zuhörer.`));
    const title = el("input");
    title.placeholder = "Thema (optional)";
    title.maxLength = 60;
    body.append(title);
    let pub = !!s.livePublic;
    const row = el("div", "chip-row");
    const hint = el("p", "small muted");
    const setHint = () =>
      (hint.textContent = pub
        ? "🌍 Öffentlich: Alle Pixelkingschat-Nutzer können zuhören (unter „Entdecken“)."
        : "👥 Nur deine Kontakte können zuhören.");
    for (const [k, txt] of [[false, "👥 Kontakte"], [true, "🌍 Öffentlich"]]) {
      const c = el("button", "chip" + (k === pub ? " active" : ""), txt);
      c.type = "button";
      c.onclick = () => {
        pub = k;
        for (const x of row.children) x.classList.toggle("active", x === c);
        setHint();
      };
      row.append(c);
    }
    setHint();
    body.append(el("strong", null, "Wer darf zuhören?"), row, hint);
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
      s.liveNotify = cb.checked;
      ctx.save();
      try {
        await startLive({ title: title.value.trim(), pub, notify: cb.checked });
      } catch (e) {
        toast(e.message);
        go.disabled = false;
      }
    };
    body.append(go, el("p", "small muted", "Lass die App während des Lives geöffnet. Ein Live dauert höchstens 4 Stunden."));
    ctx.openModal(body);
  }

  async function startLive({ title, pub, notify }) {
    let mic;
    try {
      mic = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
    } catch {
      throw new Error("🎤 Bitte erlaube den Zugriff aufs Mikrofon.");
    }
    const lid = ctx.b64u(ctx.rand(12));
    const contacts = ctx.storyContacts();
    try {
      await api("live/start", { body: { lid, title, pub, allow: pub ? [] : contacts, notify: notify ? contacts : [] } });
    } catch (e) {
      mic.getTracks().forEach((t) => t.stop());
      throw e;
    }
    ctx.closeModal();
    live = { lid, title, pub, mic, started: Date.now(), peers: new Map(), listeners: 0 };
    C().holdSignals("live-host", true, false);
    live.beat = setInterval(beat, 10000);
    try {
      live.wake = await navigator.wakeLock?.request("screen");
    } catch {}
    showHost();
    refreshList();
  }

  async function beat() {
    const L = live;
    if (!L) return;
    try {
      const r = await api("live/beat", { body: { lid: L.lid } });
      L.listeners = r.listeners;
      renderHostInfo();
    } catch (e) {
      if (e.status === 403 || e.status === 410) stopLive(e.message);
    }
  }

  function stopLive(msg) {
    const L = live;
    if (!L) return;
    live = null;
    clearInterval(L.beat);
    clearInterval(L.uiTimer);
    for (const [id, p] of L.peers) {
      C().signal(id, { k: "lend", lid: L.lid }).catch(() => {});
      try {
        p.pc.close();
      } catch {}
    }
    L.mic.getTracks().forEach((t) => t.stop());
    L.wake?.release?.().catch(() => {});
    C().holdSignals("live-host", false);
    api("live/end", { body: { lid: L.lid } }).catch(() => {});
    closeView();
    toast(msg || `Live beendet · ${fmt(Date.now() - L.started)}`, 4000);
    refreshList();
  }

  /* ================= Signale (Beitritt, Angebot, Antwort) ================= */
  async function onSignal(from, p) {
    if (live && p.lid === live.lid) {
      if (p.k === "ljoin") return hostAccept(from);
      if (p.k === "lans") {
        const peer = live.peers.get(from);
        if (peer && peer.pc.signalingState === "have-local-offer") await peer.pc.setRemoteDescription({ type: "answer", sdp: p.sdp });
        return;
      }
      if (p.k === "lleave") return hostDrop(from);
    }
    if (listening && p.lid === listening.lid && from === listening.info.owner) {
      if (p.k === "loffer") return listenerAnswer(p);
      if (p.k === "lend") return listenerEnded("📴 Das Live ist vorbei.");
      if (p.k === "lfull") return listenerEnded(`Das Live ist voll (max. ${MAX_LISTENERS} Zuhörer).`);
      if (p.k === "ldeny") return listenerEnded("Dieses Live ist nur für Kontakte.");
    }
  }

  async function hostAccept(from) {
    const L = live;
    const c = S().contacts[from];
    if (c?.blocked) return;
    if (!L.pub && !c) return C().signal(from, { k: "ldeny", lid: L.lid }).catch(() => {});
    if (!L.peers.has(from) && L.peers.size >= MAX_LISTENERS) return C().signal(from, { k: "lfull", lid: L.lid }).catch(() => {});
    hostDrop(from);
    const pc = new RTCPeerConnection({ iceServers: await C().getIce() });
    const peer = { pc, id: from };
    L.peers.set(from, peer);
    const track = L.mic.getAudioTracks()[0];
    const tr = pc.addTransceiver(track, { direction: "sendonly", streams: [L.mic] });
    // Sprache: Mono, ~32 kbit/s – spart Upload, damit viele zuhören können
    try {
      const prm = tr.sender.getParameters();
      prm.encodings = [{ ...(prm.encodings?.[0] || {}), maxBitrate: 32000 }];
      await tr.sender.setParameters(prm);
    } catch {}
    pc.onconnectionstatechange = () => {
      if (["failed", "closed"].includes(pc.connectionState) && L.peers.get(from) === peer) hostDrop(from);
      renderHostInfo();
    };
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await C().gathered(pc);
    if (live !== L) return;
    await C().signal(from, { k: "loffer", lid: L.lid, sdp: pc.localDescription.sdp });
    renderHostInfo();
  }
  function hostDrop(id) {
    const p = live?.peers.get(id);
    if (!p) return;
    try {
      p.pc.close();
    } catch {}
    live.peers.delete(id);
    renderHostInfo();
  }

  /* ================= Zuhören ================= */
  async function listen(lid) {
    if (live) return toast("Du bist gerade selbst live.");
    if (C().inCall()) return toast("Du bist gerade in einem Anruf.");
    stopListening();
    let info;
    try {
      info = await api("live/join", { body: { lid } });
    } catch (e) {
      return toast(e.message);
    }
    if (!info.alive) return toast("Dieses Live ist schon vorbei.");
    if (info.owner === S().me.id) return toast("Das ist dein eigenes Live.");
    const W = (listening = { lid, info, listeners: info.listeners, closed: false, tries: 0 });
    // Ton-Element sofort im Klick anlegen → Abspielen mit Ton ist erlaubt
    W.audio = new Audio();
    W.audio.autoplay = true;
    W.audio.play().catch(() => {});
    renderListener(W);
    C().holdSignals("live-listen", true, true);
    W.keep = setInterval(async () => {
      try {
        const r = await api("live/join", { body: { lid } });
        W.listeners = r.listeners;
        if (!r.alive) listenerEnded(r.endReason === "violation" ? "Dieses Live wurde wegen eines Regelverstoßes beendet." : "📴 Das Live ist vorbei.");
        renderListenerInfo(W);
      } catch {}
    }, 15000);
    requestJoin(W);
  }
  async function requestJoin(W) {
    while (!W.closed && !W.connected && W.tries < 4) {
      W.tries++;
      try {
        await C().signal(W.info.owner, { k: "ljoin", lid: W.lid });
      } catch {}
      for (let i = 0; i < 24 && !W.closed && !W.pc; i++) await sleep(500);
      if (W.pc) return;
    }
    if (!W.closed && !W.pc) listenerEnded("Keine Verbindung zum Live. Der Streamer ist vielleicht offline.");
  }
  async function listenerAnswer(p) {
    const W = listening;
    try {
      W.pc?.close();
    } catch {}
    const pc = new RTCPeerConnection({ iceServers: await C().getIce() });
    W.pc = pc;
    pc.ontrack = (e) => {
      const st = e.streams[0] || new MediaStream([e.track]);
      W.stream = st;
      W.audio.srcObject = st;
      W.audio.muted = !!W.muted;
      W.audio.play().catch(() => W.$unmute?.classList.remove("hidden"));
    };
    pc.onconnectionstatechange = () => {
      if (listening !== W) return;
      if (pc.connectionState === "connected") {
        W.connected = true;
        C().holdSignals("live-listen", true, false);
        W.$state.textContent = "";
        W.audio.play().catch(() => W.$unmute?.classList.remove("hidden"));
      } else if (pc.connectionState === "failed") {
        W.$state.textContent = C().hasRelay()
          ? "⚠ Verbindung unterbrochen – versuche es erneut…"
          : "⚠ Keine Verbindung – dein Netz blockiert direkte Verbindungen. Probier es im WLAN.";
        W.connected = false;
        W.pc = null;
        W.tries = 0;
        C().holdSignals("live-listen", true, true);
        requestJoin(W);
      }
      renderListenerInfo(W);
    };
    await pc.setRemoteDescription({ type: "offer", sdp: p.sdp });
    const ans = await pc.createAnswer();
    await pc.setLocalDescription(ans);
    await C().gathered(pc);
    if (listening !== W) return pc.close();
    await C().signal(W.info.owner, { k: "lans", lid: W.lid, sdp: pc.localDescription.sdp });
  }
  function listenerEnded(text) {
    const W = listening;
    if (!W) return;
    W.ended = true;
    try {
      W.pc?.close();
    } catch {}
    W.audio.srcObject = null;
    C().holdSignals("live-listen", false);
    clearInterval(W.keep);
    W.$state.textContent = text;
    W.$view?.classList.add("ended");
  }
  function stopListening() {
    const W = listening;
    if (!W) return;
    listening = null;
    W.closed = true;
    clearInterval(W.keep);
    clearInterval(W.uiTimer);
    if (!W.ended) C().signal(W.info.owner, { k: "lleave", lid: W.lid }).catch(() => {});
    try {
      W.pc?.close();
    } catch {}
    W.audio.srcObject = null;
    C().holdSignals("live-listen", false);
    api("live/leave", { body: { lid: W.lid } }).catch(() => {});
    closeView();
  }

  /* ================= Ansichten ================= */
  let $view = null;
  function closeView() {
    $view?.remove();
    $view = null;
    document.body.classList.remove("live-open");
  }
  function makeView(cls) {
    closeView();
    $view = el("div", "live-view audio " + cls);
    document.body.append($view);
    document.body.classList.add("live-open");
    return $view;
  }
  const badge = () => el("span", "live-badge", "LIVE");
  function stage(id, info, title) {
    const st = el("div", "live-stage");
    const av = el("div", "avatar xl live-av");
    ctx.fillAvatar(av, S().contacts[id] || { id, av: info.av || 0, name: info.name }, info.name || id);
    const wave = el("div", "live-wave");
    for (let i = 0; i < 5; i++) wave.append(el("span"));
    st.append(av, rich("div", "live-host-name", nameOf(id, info.name)));
    if (title) st.append(rich("div", "live-title", title));
    st.append(wave);
    return st;
  }

  function showHost() {
    const L = live;
    if (!L) return;
    const v = makeView("host");
    const top = el("div", "live-top");
    const info = el("div", "live-info");
    info.append(badge(), el("span", "live-time"), el("span", "live-viewers"));
    top.append(info, el("div", "live-aud small", L.pub ? "🌍 Öffentlich" : "👥 Nur Kontakte"));
    const me = S().me;
    const st = stage(me.id, { av: me.av, name: me.name || "Du" }, L.title);
    const bar = el("div", "live-bar");
    const mic = el("button", "call-btn", "🎤");
    mic.title = "Mikrofon an/aus";
    mic.onclick = () => {
      const t = L.mic.getAudioTracks()[0];
      t.enabled = !t.enabled;
      mic.textContent = t.enabled ? "🎤" : "🔇";
      mic.classList.toggle("off", !t.enabled);
    };
    const end = el("button", "btn danger live-end", "■ Beenden");
    end.onclick = () => confirm("Live wirklich beenden?") && stopLive();
    bar.append(mic, end);
    v.append(top, st, bar);
    renderHostInfo();
    L.uiTimer = setInterval(() => {
      renderHostInfo();
      speaking(v, localLevel());
    }, 250);
  }
  function renderHostInfo() {
    if (!live || !$view?.classList.contains("host")) return;
    const n = [...live.peers.values()].filter((p) => p.pc.connectionState === "connected").length;
    $view.querySelector(".live-time").textContent = fmt(Date.now() - live.started);
    $view.querySelector(".live-viewers").textContent = `👂 ${n}`;
  }

  // Lautstärke direkt aus WebRTC (kein WebAudio – das stört auf iPhones den Ton)
  let lastLocal = 0;
  function localLevel() {
    const p = [...(live?.peers.values() || [])].find((x) => x.pc.connectionState === "connected");
    if (p)
      p.pc
        .getStats()
        .then((st) =>
          st.forEach((r) => {
            if (r.type === "media-source" && r.kind === "audio" && typeof r.audioLevel === "number") lastLocal = r.audioLevel;
          })
        )
        .catch(() => {});
    else lastLocal = 0;
    return live?.mic.getAudioTracks()[0]?.enabled ? lastLocal : 0;
  }
  function remoteLevel(W) {
    try {
      const r = W.pc?.getReceivers().find((x) => x.track?.kind === "audio");
      const src = r?.getSynchronizationSources?.()[0];
      return src && performance.timeOrigin + performance.now() - src.timestamp < 1000 ? src.audioLevel || 0 : 0;
    } catch {
      return 0;
    }
  }
  function speaking(v, lvl) {
    v.classList.toggle("speaking", lvl > 0.03);
  }

  function renderListener(W) {
    const { info } = W;
    const v = makeView("listener");
    W.$view = v;
    const top = el("div", "live-top");
    const row = el("div", "live-who");
    const meta = el("div", "live-info");
    meta.append(badge(), el("span", "live-viewers"), el("span", "live-time"));
    const close = el("button", "icon-btn live-close", "✕");
    close.onclick = stopListening;
    row.append(meta, close);
    top.append(row);
    const st = stage(info.owner, info, info.title);
    const state = el("div", "live-state", "Verbinde…");
    W.$state = state;
    const unmute = el("button", "btn primary live-unmute hidden", "🔊 Tippen zum Zuhören");
    unmute.onclick = () => {
      W.audio.play().catch(() => {});
      unmute.classList.add("hidden");
    };
    W.$unmute = unmute;
    const bar = el("div", "live-bar");
    const spk = el("button", "call-btn", "🔊");
    spk.title = "Ton an/aus";
    spk.onclick = () => {
      W.muted = !W.muted;
      W.audio.muted = W.muted;
      spk.textContent = W.muted ? "🔕" : "🔊";
      spk.classList.toggle("off", W.muted);
      if (!W.muted) W.audio.play().catch(() => {});
    };
    const rep = el("button", "call-btn", "⚑");
    rep.title = "Live melden";
    rep.onclick = () => ctx.showReport({ type: "live", target: info.owner, lid: W.lid });
    bar.append(spk, rep);
    if (ctx.isOwner()) {
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
    st.append(state, unmute);
    v.append(top, st, bar);
    renderListenerInfo(W);
    W.uiTimer = setInterval(() => {
      renderListenerInfo(W);
      speaking(v, remoteLevel(W));
    }, 250);
  }
  function renderListenerInfo(W) {
    if (!$view || listening !== W) return;
    $view.querySelector(".live-viewers").textContent = `👂 ${W.listeners || 1}`;
    $view.querySelector(".live-time").textContent = fmt(Date.now() - W.info.started);
  }

  /* ================= Liste ================= */
  async function refreshList() {
    if (!S().me) return lives;
    try {
      const r = await api(`live/list?ids=${ctx.storyContacts().join(",")}`);
      lives = r.lives.filter((x) => x.owner !== S().me.id);
    } catch {}
    ctx.onList?.(lives);
    return lives;
  }

  return {
    showGoLive,
    watch: listen,
    onSignal,
    refreshList,
    list: () => lives,
    busy: () => !!live || !!listening,
  };
}
