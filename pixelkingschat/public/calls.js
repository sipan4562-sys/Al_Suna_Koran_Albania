// Pixelkingschat – Anrufe & Meetings (WebRTC)
// Ton/Bild laufen direkt zwischen den Geräten (DTLS-SRTP-verschlüsselt).
// Der Verbindungsaufbau (SDP) wird zusätzlich Ende-zu-Ende verschlüsselt über den Server ausgetauscht.

export function initCalls(ctx) {
  const { api, S, el, rich, toast } = ctx;
  const RING_MS = 45000;
  let iceServers = null;
  let hasRelay = false;
  let call = null; // aktiver Anruf oder Meeting
  let incoming = null; // klingelnder Anruf
  let sigTimer = null;
  let sigFast = false;

  async function getIce() {
    if (iceServers) return iceServers;
    try {
      iceServers = (await api("turn")).iceServers;
      hasRelay = iceServers.some((s) => [].concat(s.urls).some((u) => /^turns?:/.test(u)));
    } catch {
      iceServers = [{ urls: "stun:stun.l.google.com:19302" }];
    }
    return iceServers;
  }

  /* ---------- Verschlüsselte Signale ---------- */
  async function signal(to, payload) {
    await ctx.ensurePeer(to);
    const sid = ctx.b64u(ctx.rand(12));
    const { iv, ct } = await ctx.encryptFor(to, "sig|" + sid, payload);
    await api("signal", { body: { to, sid, iv, ct } });
  }
  function startSignalPolling(fast = true) {
    sigFast = fast;
    if (sigTimer) return;
    const tick = async () => {
      sigTimer = setTimeout(tick, sigFast ? 900 : 2500);
      try {
        const { signals } = await api("signal");
        for (const s of signals) {
          try {
            await ctx.ensurePeer(s.from);
            const p = await ctx.decryptFrom(s.from, "sig|" + s.sid, s.iv, s.ct);
            await onSignal(s.from, p);
          } catch (e) {
            console.warn("signal", e);
          }
        }
      } catch {}
    };
    tick();
  }
  function stopSignalPolling() {
    clearTimeout(sigTimer);
    sigTimer = null;
  }

  /* ---------- Klingelton ---------- */
  let ring = null;
  function startRinging(outgoing) {
    stopRinging();
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ac = new Ctx();
      const beep = () => {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = "square";
        o.frequency.value = outgoing ? 440 : 660;
        g.gain.value = 0.04;
        o.connect(g).connect(ac.destination);
        o.start();
        o.stop(ac.currentTime + (outgoing ? 1.0 : 0.25));
        if (!outgoing) {
          const o2 = ac.createOscillator();
          o2.type = "square";
          o2.frequency.value = 880;
          o2.connect(g);
          o2.start(ac.currentTime + 0.3);
          o2.stop(ac.currentTime + 0.55);
        }
      };
      beep();
      ring = { ac, t: setInterval(beep, outgoing ? 3000 : 1500) };
    } catch {}
    if (!outgoing && navigator.vibrate) navigator.vibrate([400, 200, 400]);
  }
  function stopRinging() {
    if (!ring) return;
    clearInterval(ring.t);
    ring.ac.close().catch(() => {});
    ring = null;
  }

  /* ---------- Medien ---------- */
  // Nur Sprachanrufe (spart Datenvolumen und Leistung)
  async function getLocal() {
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
    } catch {
      throw new Error("🎤 Bitte erlaube den Zugriff aufs Mikrofon.");
    }
  }

  /* ---------- Peer-Verbindung ---------- */
  async function makePeer(id) {
    const pc = new RTCPeerConnection({ iceServers: await getIce() });
    const peer = { id, pc, stream: new MediaStream(), tile: null };
    const local = call.local;
    local.getAudioTracks().forEach((t) => pc.addTrack(t, local));
    pc.ontrack = (e) => {
      if (!peer.stream.getTracks().includes(e.track)) peer.stream.addTrack(e.track);
      renderTiles();
    };
    pc.onconnectionstatechange = () => {
      if (!call || call.peers.get(id) !== peer) return;
      if (pc.connectionState === "connected") {
        peer.connected = true;
        if (!call.connectedAt) call.connectedAt = Date.now();
        sigFast = false;
        stopRinging();
        playRemote(peer);
      }
      if (pc.connectionState === "failed") {
        // einmal neu versuchen (z. B. nach Netzwechsel WLAN ↔ Mobilfunk)
        const tries = (call.retries[id] = (call.retries[id] || 0) + 1);
        if (peer.offerer && tries <= 2) {
          sendOffer(id).catch(() => {});
          return;
        }
        toast(
          hasRelay
            ? "Verbindung zu " + ctx.memberName(id) + " fehlgeschlagen."
            : "Keine Verbindung zu " + ctx.memberName(id) + " – das Netz blockiert direkte Anrufe. Probiert es im WLAN."
        );
      }
      renderTiles();
    };
    call.peers.set(id, peer);
    return peer;
  }
  function gathered(pc) {
    return new Promise((res) => {
      if (pc.iceGatheringState === "complete") return res();
      let done = false;
      let early = null;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(t);
        clearTimeout(early);
        res();
      };
      const t = setTimeout(finish, 6000);
      pc.addEventListener("icegatheringstatechange", () => pc.iceGatheringState === "complete" && finish());
      pc.addEventListener("icecandidate", (e) => {
        const c = e.candidate?.candidate || "";
        // Relay gefunden → gleich los; nur STUN → noch kurz auf weitere Wege warten
        if (/ typ relay/.test(c)) early ??= setTimeout(finish, 300);
        else if (/ typ srflx/.test(c) && !hasRelay) early ??= setTimeout(finish, 1200);
      });
    });
  }
  async function sendOffer(id) {
    let peer = call.peers.get(id);
    if (peer) closePeer(id);
    peer = await makePeer(id);
    peer.offerer = true;
    const offer = await peer.pc.createOffer({ offerToReceiveAudio: true });
    await peer.pc.setLocalDescription(offer);
    await gathered(peer.pc);
    await signal(id, { k: "offer", room: call.room, sdp: peer.pc.localDescription.sdp });
  }
  async function onOffer(from, p) {
    if (!call || call.room !== p.room) return;
    if (call.peers.has(from)) closePeer(from);
    const peer = await makePeer(from);
    await peer.pc.setRemoteDescription({ type: "offer", sdp: p.sdp });
    const ans = await peer.pc.createAnswer();
    await peer.pc.setLocalDescription(ans);
    await gathered(peer.pc);
    await signal(from, { k: "answer", room: call.room, sdp: peer.pc.localDescription.sdp });
  }
  function closePeer(id) {
    const p = call?.peers.get(id);
    if (!p) return;
    try {
      p.pc.close();
    } catch {}
    call.peers.delete(id);
    renderTiles();
  }

  /* ---------- Signale verarbeiten ---------- */
  async function onSignal(from, p) {
    if (p.k === "accept" && call?.kind === "direct" && call.with === from && call.room === p.room) {
      stopRinging();
      call.status = "verbinde…";
      renderTiles();
      await sendOffer(from);
    } else if (p.k === "decline" && call?.kind === "direct" && call.with === from && call.room === p.room) {
      endCall(p.reason === "busy" ? `${ctx.memberName(from)} ist gerade in einem anderen Anruf.` : `${ctx.memberName(from)} hat abgelehnt.`, "declined");
    } else if (p.k === "offer") {
      await onOffer(from, p);
    } else if (p.k === "answer" && call?.room === p.room) {
      const peer = call.peers.get(from);
      if (peer && peer.pc.signalingState === "have-local-offer") await peer.pc.setRemoteDescription({ type: "answer", sdp: p.sdp });
    } else if (p.k === "hangup") {
      if (incoming && incoming.from === from && incoming.room === p.room) {
        logCall(from, "missed");
        closeIncoming();
        toast(`Verpasster Anruf von ${ctx.memberName(from)}`);
      } else if (call?.kind === "direct" && call.with === from && call.room === p.room) endCall(`${ctx.memberName(from)} hat aufgelegt.`);
      else if (call?.kind === "meet" && call.room === p.room) closePeer(from);
    }
  }

  /* ---------- Direkter Anruf ---------- */
  async function startCall(to) {
    const video = false;
    if (call) return toast("Du bist schon in einem Anruf.");
    if (ctx.sendBlocked()) return;
    if (!window.RTCPeerConnection) return toast("Dein Browser unterstützt keine Anrufe.");
    const room = ctx.b64u(ctx.rand(9));
    let local;
    try {
      local = await getLocal(video);
    } catch (e) {
      return toast(e.message);
    }
    call = { kind: "direct", with: to, room, video, local, peers: new Map(), retries: {}, started: Date.now(), outgoing: true, status: "klingelt…" };
    openCallView();
    try {
      const r = await api("call/ring", { body: { to, callId: room, video } });
      if (!r.ok) return endCall(`${ctx.memberName(to)} nimmt keine Anrufe an.`, "off");
    } catch (e) {
      return endCall(e.message);
    }
    await ctx.sendCtl(to, { k: "call", room, video: !!video }, true).catch(() => {});
    startRinging(true);
    startSignalPolling(true);
    call.ringTimer = setTimeout(() => {
      if (call && !call.connectedAt && call.room === room) {
        signal(to, { k: "hangup", room }).catch(() => {});
        endCall("Keine Antwort.", "noanswer");
      }
    }, RING_MS);
  }

  // Eingehender Anruf (kommt als verschlüsselte Steuernachricht)
  function handleCallCtl(from, p, m) {
    if (p.k !== "call" || typeof p.room !== "string") return false;
    if (Date.now() - (m.ts || Date.now()) > RING_MS) {
      logCall(from, "missed");
      return true;
    }
    if (S().settings.callsOff || S().contacts[from]?.noCalls) {
      signal(from, { k: "decline", room: p.room, reason: "off" }).catch(() => {});
      return false;
    }
    if (call || incoming) {
      signal(from, { k: "decline", room: p.room, reason: "busy" }).catch(() => {});
      logCall(from, "missed");
      return true;
    }
    incoming = { from, room: p.room, video: false, ts: m.ts };
    showIncoming();
    startSignalPolling(true);
    incoming.timer = setTimeout(() => {
      if (incoming?.room === p.room) {
        logCall(from, "missed");
        closeIncoming();
      }
    }, RING_MS);
    return true;
  }

  let incomingEl = null;
  function showIncoming() {
    const c = S().contacts[incoming.from] || { id: incoming.from, av: 0 };
    incomingEl = el("div", "call-incoming");
    const av = el("div", "avatar xl call-pulse");
    ctx.fillAvatar(av, c);
    const name = rich("div", "call-name", ctx.memberName(incoming.from));
    const what = el("div", "call-what", incoming.video ? "🎥 Videoanruf…" : "📞 ruft dich an…");
    const row = el("div", "call-actions");
    const no = el("button", "call-btn red", "✕");
    no.title = "Ablehnen";
    const yes = el("button", "call-btn green", incoming.video ? "🎥" : "📞");
    yes.title = "Annehmen";
    no.onclick = () => {
      signal(incoming.from, { k: "decline", room: incoming.room }).catch(() => {});
      logCall(incoming.from, "declined-in");
      closeIncoming();
    };
    yes.onclick = acceptIncoming;
    row.append(no, yes);
    incomingEl.append(av, name, what, row);
    document.body.append(incomingEl);
    startRinging(false);
  }
  function closeIncoming() {
    stopRinging();
    clearTimeout(incoming?.timer);
    incomingEl?.remove();
    incomingEl = null;
    incoming = null;
    if (!call) stopSignalPolling();
  }
  async function acceptIncoming() {
    const inc = incoming;
    closeIncoming();
    let local;
    try {
      local = await getLocal(inc.video);
    } catch (e) {
      signal(inc.from, { k: "decline", room: inc.room }).catch(() => {});
      return toast(e.message);
    }
    call = { kind: "direct", with: inc.from, room: inc.room, video: inc.video, local, peers: new Map(), retries: {}, started: Date.now(), status: "verbinde…" };
    openCallView();
    startSignalPolling(true);
    await signal(inc.from, { k: "accept", room: inc.room });
  }

  /* ---------- Meetings ---------- */
  let beatTimer = null;
  async function joinMeeting(code, { title = "" } = {}) {
    const video = false;
    if (call) return toast("Du bist schon in einem Anruf.");
    if (!window.RTCPeerConnection) return toast("Dein Browser unterstützt keine Anrufe.");
    code = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (code.length !== 6) return toast("Ein Meeting-Code hat 6 Zeichen.");
    let info;
    try {
      info = await api("meet/join", { body: { code } });
    } catch (e) {
      return toast(e.message);
    }
    let local;
    try {
      local = await getLocal(video);
    } catch (e) {
      api("meet/leave", { body: { code } }).catch(() => {});
      return toast(e.message);
    }
    call = { kind: "meet", room: code, title: info.title || title, video, local, peers: new Map(), retries: {}, started: Date.now(), members: info.members, status: "" };
    openCallView();
    startSignalPolling(true);
    await syncMeeting(info.members);
    beatTimer = setInterval(async () => {
      if (!call || call.kind !== "meet") return;
      try {
        const r = await api("meet/beat", { body: { code } });
        await syncMeeting(r.members);
      } catch {}
    }, 5000);
  }
  async function syncMeeting(members) {
    if (!call || call.kind !== "meet") return;
    const me = S().me.id;
    call.members = members;
    const ids = new Set(members.map((m) => m.id));
    for (const m of members) {
      if (m.name && S().contacts[m.id] && !S().contacts[m.id].name) S().contacts[m.id].name = m.name;
      call.names = call.names || {};
      call.names[m.id] = m.name;
    }
    for (const id of [...call.peers.keys()]) if (!ids.has(id)) closePeer(id);
    for (const m of members) {
      if (m.id === me || call.peers.has(m.id)) continue;
      // Wer die "kleinere" ID hat, startet die Verbindung
      if (me < m.id) sendOffer(m.id).catch((e) => console.warn(e));
    }
    renderTiles();
  }
  async function createMeeting(title = "", inviteGroup = null) {
    try {
      const { code } = await api("meet/create", { body: { title } });
      if (inviteGroup) ctx.sendMeetInvite(inviteGroup, code, title);
      await joinMeeting(code, { title });
    } catch (e) {
      toast(e.message);
    }
  }

  /* ---------- Anrufansicht ---------- */
  let view = null;
  let durTimer = null;
  function openCallView() {
    view = el("div", "call-view");
    const head = el("div", "call-head");
    const title = el("div", "call-title");
    const sub = el("div", "call-sub");
    head.append(title, sub);
    const grid = el("div", "call-grid");
    const self = el("div", "hidden");
    const bar = el("div", "call-bar");
    const mic = el("button", "call-btn", "🎤");
    mic.title = "Stummschalten";
    mic.onclick = () => {
      const t = call.local.getAudioTracks()[0];
      if (!t) return;
      t.enabled = !t.enabled;
      mic.classList.toggle("off", !t.enabled);
      mic.textContent = t.enabled ? "🎤" : "🔇";
    };
    const spk = el("button", "call-btn", "🔊");
    spk.title = "Ton der anderen an/aus";
    spk.onclick = () => {
      const muted = !view._muteOut;
      view._muteOut = muted;
      for (const p of call.peers.values()) if (p.audio) p.audio.muted = muted;
      spk.textContent = muted ? "🔕" : "🔊";
      spk.classList.toggle("off", muted);
      toast(muted ? "🔕 Du hörst die anderen gerade nicht." : "🔊 Ton wieder an");
      if (!muted) unlockAudio();
    };
    // Falls der Browser das automatische Abspielen blockiert
    const unlock = el("button", "btn primary call-unlock hidden", "🔊 Tippen, um den Ton zu hören");
    unlock.onclick = (e) => {
      e.stopPropagation();
      unlockAudio();
    };
    const hang = el("button", "call-btn red", "📞");
    hang.title = "Auflegen";
    hang.onclick = () => hangup();
    bar.append(mic, spk);
    if (call.kind === "meet") {
      const share = el("button", "call-btn", "🔗");
      share.title = "Code teilen";
      share.onclick = () => ctx.shareMeeting(call.room, call.title);
      bar.append(share);
    }
    bar.append(hang);
    view.append(head, grid, unlock, self, bar);
    view.addEventListener("pointerdown", unlockAudio);
    document.body.append(view);
    view._refs = { title, sub, grid, self, unlock };
    renderTiles();
    clearInterval(durTimer);
    durTimer = setInterval(renderHead, 1000);
  }
  function fmt(sec) {
    sec = Math.floor(sec);
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
  }
  function renderHead() {
    if (!view || !call) return;
    const { title, sub } = view._refs;
    if (call.kind === "direct") {
      title.textContent = "";
      title.append(rich("span", null, ctx.memberName(call.with)));
      sub.textContent = call.connectedAt ? `🔐 ${fmt((Date.now() - call.connectedAt) / 1000)}` : call.status;
    } else {
      title.textContent = "";
      title.append(rich("span", null, call.title || "Meeting"));
      const n = call.members?.length || 1;
      sub.textContent = `Code ${call.room.slice(0, 3)} ${call.room.slice(3)} · ${n} Person${n === 1 ? "" : "en"} · ${fmt((Date.now() - call.started) / 1000)}`;
    }
  }
  function nameOf(id) {
    return (call?.names && call.names[id]) || ctx.memberName(id);
  }
  function playRemote(p) {
    const a = p.audio;
    if (!a) return;
    if (a.srcObject !== p.stream) a.srcObject = p.stream;
    a.muted = !!view?._muteOut;
    const pr = a.play();
    if (pr)
      pr.then(() => view?._refs.unlock?.classList.add("hidden")).catch(() => {
        // Autoplay blockiert → Knopf anzeigen, ein Tippen schaltet den Ton frei
        view?._refs.unlock?.classList.remove("hidden");
      });
  }
  function unlockAudio() {
    if (!call) return;
    for (const p of call.peers.values()) playRemote(p);
  }
  function renderTiles() {
    if (!view || !call) return;
    renderHead();
    const { grid } = view._refs;
    const peers = [...call.peers.values()];
    grid.className = "call-grid n" + Math.max(1, peers.length);
    // vorhandene Kacheln wiederverwenden (sonst ruckelt das Video)
    const keep = new Set();
    for (const p of peers) {
      keep.add(p.id);
      if (!p.tile) {
        const tile = el("div", "call-tile");
        const v = el("audio");
        v.autoplay = true;
        v.setAttribute("playsinline", "");
        const av = el("div", "avatar xl");
        ctx.fillAvatar(av, S().contacts[p.id] || { id: p.id, av: 0, name: nameOf(p.id) }, nameOf(p.id));
        const label = rich("div", "call-label", nameOf(p.id));
        const state = el("div", "call-state");
        tile.append(av, v, label, state);
        p.tile = tile;
        p.tileVideo = v;
        p.audio = v;
        p.tileState = state;
      }
      if (p.audio.srcObject !== p.stream || p.audio.paused) playRemote(p);
      const st = p.pc.connectionState;
      p.tileState.textContent = st === "connected" ? "" : st === "failed" ? "⚠ keine Verbindung" : "verbinde…";
      if (p.tile.parentNode !== grid) grid.append(p.tile);
    }
    for (const t of [...grid.children]) if (!peers.some((p) => p.tile === t)) t.remove();
    if (!peers.length) {
      const wait = el("div", "call-wait");
      if (call.kind === "direct") {
        const av = el("div", "avatar xl call-pulse");
        ctx.fillAvatar(av, S().contacts[call.with] || { id: call.with, av: 0 });
        wait.append(av, el("div", "call-what", call.status));
      } else {
        wait.append(el("div", "call-what", "Warte auf andere Teilnehmer…"), el("div", "call-code", call.room.slice(0, 3) + " " + call.room.slice(3)));
        wait.append(el("div", "small", "Teile diesen Code, damit andere beitreten können."));
      }
      grid.append(wait);
    }
  }
  // Sprech-Anzeige: Profilbild leuchtet, wenn jemand spricht.
  // Pegel kommen direkt aus WebRTC – kein WebAudio, das auf iPhones den Ton stören kann.
  function remoteLevel(p) {
    try {
      const r = p.pc.getReceivers().find((x) => x.track?.kind === "audio");
      const src = r?.getSynchronizationSources?.()[0];
      return src && performance.timeOrigin + performance.now() - src.timestamp < 1000 ? src.audioLevel || 0 : 0;
    } catch {
      return 0;
    }
  }
  let meBusy = false;
  async function localLevel() {
    const p = [...call.peers.values()].find((x) => x.pc.connectionState === "connected");
    if (!p) return 0;
    const st = await p.pc.getStats();
    let lvl = 0;
    st.forEach((r) => {
      if (r.type === "media-source" && r.kind === "audio" && typeof r.audioLevel === "number") lvl = r.audioLevel;
    });
    return lvl;
  }
  setInterval(() => {
    if (!call || !view) return;
    for (const p of call.peers.values()) if (p.tile) p.tile.classList.toggle("speaking", remoteLevel(p) > 0.03);
    const t = call.local.getAudioTracks()[0];
    if (!t?.enabled) return view.classList.remove("me-speaking");
    if (meBusy) return;
    meBusy = true;
    localLevel()
      .then((l) => view?.classList.toggle("me-speaking", l > 0.03))
      .catch(() => {})
      .finally(() => (meBusy = false));
  }, 250);

  /* ---------- Auflegen ---------- */
  function hangup() {
    if (!call) return;
    if (call.kind === "direct") {
      signal(call.with, { k: "hangup", room: call.room }).catch(() => {});
      endCall();
    } else {
      for (const id of call.peers.keys()) signal(id, { k: "hangup", room: call.room }).catch(() => {});
      api("meet/leave", { body: { code: call.room } }).catch(() => {});
      endCall();
    }
  }
  function endCall(msg, reason) {
    if (!call) return;
    const c = call;
    call = null;
    clearTimeout(c.ringTimer);
    clearInterval(beatTimer);
    clearInterval(durTimer);
    stopRinging();
    for (const p of c.peers.values())
      try {
        p.pc.close();
      } catch {}
    c.local.getTracks().forEach((t) => t.stop());
    view?.remove();
    view = null;
    if (!incoming) stopSignalPolling();
    if (c.kind === "direct") {
      if (c.connectedAt) logCall(c.with, "done", (Date.now() - c.connectedAt) / 1000);
      else if (c.outgoing) logCall(c.with, reason === "declined" ? "declined-out" : reason === "off" ? "off" : "noanswer");
    }
    if (msg) toast(msg);
  }

  /* ---------- Anrufliste im Chat ---------- */
  function logCall(id, kind, sec = 0) {
    const texts = {
      done: `📞 Anruf · ${fmt(sec)}`,
      missed: "📞 Verpasster Anruf",
      noanswer: "📞 Keine Antwort",
      "declined-in": "📞 Anruf abgelehnt",
      "declined-out": "📞 Anruf wurde abgelehnt",
      off: "📞 Nimmt keine Anrufe an",
    };
    if (!S().contacts[id]) return;
    ctx.sysMsg(id, texts[kind] || "📞 Anruf");
    const c = S().contacts[id];
    c.last = Date.now();
    c.peer = false;
    ctx.save();
    ctx.refresh(id);
  }

  window.addEventListener("pagehide", () => call && hangup());
  return { startCall, handleCallCtl, joinMeeting, createMeeting, inCall: () => !!call };
}
