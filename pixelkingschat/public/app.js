// Pixelkingschat – anonymer Ende-zu-Ende-verschlüsselter Chat
// Kryptografie: ECDH P-256 → HKDF-SHA256 → AES-GCM-256 (WebCrypto, nur im Browser).
// Der Server sieht nur Codes und verschlüsselte Bytes.

const TTL = 24 * 60 * 60 * 1000;
const STORE_KEY = "pk_v1";
const $ = (s) => document.querySelector(s);

/* ================= Hilfsfunktionen ================= */
const enc = new TextEncoder();
const dec = new TextDecoder();
const b64u = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64u = (s) => {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
};
const rand = (n) => crypto.getRandomValues(new Uint8Array(n));
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

function toast(msg, ms = 2600) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.add("hidden"), ms);
}

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}
function fmtLeft(ts) {
  const left = ts + TTL - Date.now();
  if (left <= 0) return "läuft ab";
  const h = Math.ceil(left / 3600000);
  if (left >= 3600000) return `⏳ ${h} Std`;
  return `⏳ ${Math.max(1, Math.ceil(left / 60000))} Min`;
}

/* ================= Zustand ================= */
let S = load();
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (s && s.me) return { contacts: {}, messages: {}, ...s };
  } catch {}
  return { me: null, contacts: {}, messages: {} };
}
function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(S));
  } catch (e) {
    console.error(e);
  }
}

let currentChat = null;
let onceMode = false;
const keyCache = new Map();
const seenMids = new Set();
let myPriv = null;

/* ================= API ================= */
async function api(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (S.me?.id && S.me?.token) headers.authorization = `PK ${S.me.id}:${S.me.token}`;
  if (opts.body) headers["content-type"] = "application/json";
  const res = await fetch(`/api/${path}`, {
    method: opts.method || (opts.body ? "POST" : "GET"),
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(data.error || `Fehler ${res.status}`);
    e.status = res.status;
    throw e;
  }
  return data;
}

/* ================= Kryptografie ================= */
async function createIdentity(name) {
  const kp = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const pub = b64u(await crypto.subtle.exportKey("raw", kp.publicKey));
  const priv = await crypto.subtle.exportKey("jwk", kp.privateKey);
  const token = b64u(rand(32));
  S.me = null;
  const { id } = await api("register", { body: { pub, token } });
  S = { me: { id, token, pub, priv, name: name || "" }, contacts: {}, messages: {} };
  save();
}

async function getPriv() {
  if (!myPriv) {
    myPriv = await crypto.subtle.importKey("jwk", S.me.priv, { name: "ECDH", namedCurve: "P-256" }, false, [
      "deriveBits",
    ]);
  }
  return myPriv;
}

async function chatKey(contactId) {
  if (keyCache.has(contactId)) return keyCache.get(contactId);
  const c = S.contacts[contactId];
  const theirPub = await crypto.subtle.importKey("raw", unb64u(c.pub), { name: "ECDH", namedCurve: "P-256" }, false, []);
  const bits = await crypto.subtle.deriveBits({ name: "ECDH", public: theirPub }, await getPriv(), 256);
  const hk = await crypto.subtle.importKey("raw", bits, "HKDF", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: enc.encode("pixelkingschat"), info: enc.encode("pk-chat-v1") },
    hk,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  keyCache.set(contactId, key);
  return key;
}

const aad = (from, to, mid) => enc.encode(`${from}>${to}|${mid}`);

async function encryptFor(to, mid, payload) {
  const iv = rand(12);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: aad(S.me.id, to, mid) },
    await chatKey(to),
    enc.encode(JSON.stringify(payload))
  );
  return { iv: b64u(iv), ct: b64u(ct) };
}

async function decryptFrom(from, mid, iv, ct) {
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64u(iv), additionalData: aad(from, S.me.id, mid) },
    await chatKey(from),
    unb64u(ct)
  );
  return JSON.parse(dec.decode(pt));
}

async function fingerprint(pubA, pubB) {
  const [a, b] = [pubA, pubB].sort();
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(a + "|" + b)));
  const groups = [];
  for (let i = 0; i < 12; i++) {
    const n = ((h[i * 2] << 8) | h[i * 2 + 1]) % 100000;
    groups.push(String(n).padStart(5, "0"));
  }
  return groups;
}

/* ================= Kontakte ================= */
function displayName(c) {
  return c.nick || c.name || c.id;
}

async function addContactByCode(code, { open = true } = {}) {
  code = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (code.length !== 8) throw new Error("Ein Code hat 8 Zeichen.");
  if (code === S.me.id) throw new Error("Das ist dein eigener Code 😉");
  if (!S.contacts[code]) {
    const { pub } = await api(`key/${code}`);
    S.contacts[code] = { id: code, pub, name: "", nick: "", added: Date.now(), unread: 0, last: Date.now() };
    S.messages[code] = S.messages[code] || [];
    save();
  }
  if (open) openChat(code);
  renderList();
  return S.contacts[code];
}

/* ================= Senden / Empfangen ================= */
function newMid() {
  return b64u(rand(12));
}

async function sendMessage(text, once) {
  const to = currentChat;
  const mid = newMid();
  const ts = Date.now();
  const local = { mid, dir: "out", ts, once, status: "pending" };
  if (!once) local.text = text;
  S.messages[to].push(local);
  S.contacts[to].last = ts;
  save();
  renderMessages();
  renderList();
  try {
    const { iv, ct } = await encryptFor(to, mid, { k: "m", t: text, o: !!once, n: S.me.name || "" });
    await api("send", { body: { to, mid, iv, ct } });
    local.status = "sent";
  } catch (e) {
    local.status = "failed";
    toast("Senden fehlgeschlagen: " + e.message);
  }
  save();
  renderMessages();
}

async function sendReceipt(to, ref) {
  try {
    const mid = newMid();
    const { iv, ct } = await encryptFor(to, mid, { k: "r", ref });
    await api("send", { body: { to, mid, iv, ct } });
  } catch {}
}

let polling = false;
async function poll() {
  if (polling || !S.me) return;
  polling = true;
  try {
    const { messages } = await api("inbox");
    const acks = [];
    let changed = false;
    for (const m of messages) {
      acks.push(m.key);
      try {
        if (!S.contacts[m.from]) await addContactByCode(m.from, { open: false });
        const p = await decryptFrom(m.from, m.mid, m.iv, m.ct);
        const list = (S.messages[m.from] = S.messages[m.from] || []);
        if (list.some((x) => x.mid === m.mid)) continue;
        const c = S.contacts[m.from];
        if (p.k === "r") {
          const orig = list.find((x) => x.mid === p.ref && x.dir === "out");
          if (orig) orig.status = "opened";
          changed = true;
          continue;
        }
        if (p.k !== "m" || typeof p.t !== "string") continue;
        if (p.n && typeof p.n === "string") c.name = p.n.slice(0, 24);
        list.push({ mid: m.mid, dir: "in", ts: m.ts, once: !!p.o, text: p.t.slice(0, 4000) });
        c.last = m.ts;
        if (currentChat !== m.from || document.hidden) c.unread = (c.unread || 0) + 1;
        changed = true;
      } catch (e) {
        console.warn("Nachricht konnte nicht entschlüsselt werden", e);
      }
    }
    if (changed) {
      save();
      renderList();
      renderMessages();
      updateTitle();
    }
    if (acks.length) await api("ack", { body: { keys: acks } });
  } catch (e) {
    if (e.status === 401) {
      toast("Dein Konto existiert nicht mehr auf dem Server.");
    }
  } finally {
    polling = false;
  }
}

function purgeExpired() {
  const now = Date.now();
  let changed = false;
  for (const id of Object.keys(S.messages)) {
    const before = S.messages[id].length;
    S.messages[id] = S.messages[id].filter((m) => now - m.ts < TTL);
    if (S.messages[id].length !== before) changed = true;
  }
  if (changed) save();
  renderList();
  if (currentChat) renderMessages();
}

/* ================= Rendering ================= */
function avatarColor(id) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${(h % 60) + 150}, 80%, ${55 + (h % 15)}%)`;
}
function fillAvatar(node, c) {
  node.textContent = displayName(c).slice(0, 1).toUpperCase();
  node.style.background = avatarColor(c.id);
}

function renderList() {
  const list = $("#chatList");
  list.textContent = "";
  const contacts = Object.values(S.contacts).sort((a, b) => (b.last || 0) - (a.last || 0));
  $("#emptyList").classList.toggle("hidden", contacts.length > 0);
  for (const c of contacts) {
    const msgs = S.messages[c.id] || [];
    const last = msgs[msgs.length - 1];
    const b = el("button", "chat-item" + (c.id === currentChat ? " active" : ""));
    const av = el("div", "avatar");
    fillAvatar(av, c);
    const meta = el("div", "meta");
    const r1 = el("div", "row");
    r1.append(el("span", "name", displayName(c)), el("span", "time", last ? fmtTime(last.ts) : ""));
    const r2 = el("div", "row");
    let prev = "Noch keine Nachrichten";
    if (last) {
      if (last.once) prev = last.dir === "in" ? (last.opened ? "👁 Geöffnet" : "👁 Einmal-Nachricht") : "👁 Einmal-Nachricht gesendet";
      else prev = (last.dir === "out" ? "Du: " : "") + last.text;
    }
    r2.append(el("span", "preview", prev));
    if (c.unread) r2.append(el("span", "badge", String(c.unread)));
    meta.append(r1, r2);
    b.append(av, meta);
    b.onclick = () => openChat(c.id);
    list.append(b);
  }
}

function renderMessages() {
  if (!currentChat) return;
  const box = $("#messages");
  const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
  box.textContent = "";
  const note = el("div", "sys-note");
  note.innerHTML =
    "🔐 <b>Ende-zu-Ende-verschlüsselt.</b> Nachrichten löschen sich nach <b>24 Stunden</b> automatisch.";
  box.append(note);
  for (const m of S.messages[currentChat] || []) {
    const d = el("div", `msg ${m.dir}`);
    if (!seenMids.has(m.mid)) {
      seenMids.add(m.mid);
      if (!renderMessages.force) d.classList.add("new");
    }
    const info = el("div", "info");
    const parts = [fmtTime(m.ts), fmtLeft(m.ts)];
    if (m.dir === "out") {
      parts.push(
        m.status === "pending" ? "…" : m.status === "failed" ? "⚠ nicht gesendet" : m.status === "opened" ? "✓✓ geöffnet" : "✓"
      );
    }
    info.textContent = parts.join(" · ");
    if (m.once) {
      d.classList.add("once");
      const badge = el("span", "once-badge", "1");
      let label;
      if (m.dir === "out") label = m.status === "opened" ? "Einmal-Nachricht wurde angesehen" : "Einmal-Nachricht";
      else if (m.opened) label = "Geöffnet";
      else {
        label = "Einmal-Nachricht · antippen";
        d.onclick = () => viewOnce(m);
      }
      const wrap = el("div");
      wrap.append(el("div", null, label), info);
      d.append(badge, wrap);
    } else {
      d.append(document.createTextNode(m.text), info);
    }
    if (m.status === "pending") d.classList.add("pending");
    if (m.status === "failed") d.classList.add("failed");
    box.append(d);
  }
  if (atBottom || renderMessages.force) box.scrollTop = box.scrollHeight;
  renderMessages.force = false;
}

function updateTitle() {
  const n = Object.values(S.contacts).reduce((a, c) => a + (c.unread || 0), 0);
  document.title = n ? `(${n}) Pixelkingschat` : "Pixelkingschat";
}

function openChat(id) {
  currentChat = id;
  const c = S.contacts[id];
  c.unread = 0;
  save();
  $("#chat").classList.remove("no-chat");
  $("#app").classList.add("chat-open");
  fillAvatar($("#chatAvatar"), c);
  $("#chatName").textContent = displayName(c);
  $("#chatSub").textContent = `Code ${c.id} · 🔐 verschlüsselt`;
  renderMessages.force = true;
  renderMessages();
  renderList();
  updateTitle();
  if (matchMedia("(min-width: 761px)").matches) $("#msgInput").focus();
}

function closeChat() {
  $("#app").classList.remove("chat-open");
  currentChat = null;
  renderList();
  setTimeout(() => !currentChat && $("#chat").classList.add("no-chat"), 250);
}

/* ================= Einmal-Nachricht ================= */
function viewOnce(m) {
  const from = currentChat;
  const body = el("div");
  body.append(el("h2", null, "👁 Einmal-Nachricht"));
  body.append(el("p", "small muted", "Diese Nachricht wird gelöscht, sobald du dieses Fenster schließt."));
  const v = el("div", "once-view", m.text);
  body.append(v);
  const btn = el("button", "btn primary big", "Gelesen – jetzt löschen");
  body.append(btn);
  const done = () => {
    m.text = "";
    m.opened = true;
    save();
    renderMessages();
    renderList();
    sendReceipt(from, m.mid);
  };
  btn.onclick = closeModal;
  openModal(body, done);
}

/* ================= Modale Dialoge ================= */
let modalOnClose = null;
let scannerStop = null;
function openModal(content, onClose) {
  closeModal();
  $("#modalBody").textContent = "";
  $("#modalBody").append(content);
  $("#modal").classList.remove("hidden");
  modalOnClose = onClose || null;
}
function closeModal() {
  if (scannerStop) scannerStop();
  scannerStop = null;
  $("#modal").classList.add("hidden");
  const cb = modalOnClose;
  modalOnClose = null;
  if (cb) cb();
}

function inviteUrl() {
  return `${location.origin}/#add=${S.me.id}`;
}

function qrNode(text) {
  const q = qrcode(0, "M");
  q.addData(text);
  q.make();
  const box = el("div", "qr-box");
  box.innerHTML = q.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
  return box;
}

async function shareInvite() {
  const url = inviteUrl();
  const text = `Schreib mir anonym & verschlüsselt auf Pixelkingschat! Mein Code: ${S.me.id}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: "Pixelkingschat", text, url });
      return;
    } catch (e) {
      if (e.name === "AbortError") return;
    }
  }
  await copy(`${text}\n${url}`);
}

async function copy(t) {
  try {
    await navigator.clipboard.writeText(t);
    toast("Kopiert ✓");
  } catch {
    toast(t, 6000);
  }
}

function showAdd(tab = "mine") {
  const root = el("div");
  root.append(el("h2", null, "Kontakt hinzufügen"));
  const tabs = el("div", "tabs");
  const content = el("div");
  const defs = [
    ["mine", "Mein Code"],
    ["enter", "Code eingeben"],
    ["scan", "QR scannen"],
  ];
  const btns = {};
  for (const [k, label] of defs) {
    const b = el("button", null, label);
    b.type = "button";
    b.onclick = () => show(k);
    btns[k] = b;
    tabs.append(b);
  }
  root.append(tabs, content);

  function show(k) {
    if (scannerStop) scannerStop();
    scannerStop = null;
    for (const [key, b] of Object.entries(btns)) b.classList.toggle("active", key === k);
    content.textContent = "";
    if (k === "mine") {
      content.append(el("p", "small muted", "Lass diesen QR-Code scannen oder schick deinen Code / Link."));
      content.append(qrNode(inviteUrl()));
      content.append(el("div", "big-code", S.me.id));
      const row = el("div", "btn-row");
      const c1 = el("button", "btn", "Code kopieren");
      c1.onclick = () => copy(S.me.id);
      const c2 = el("button", "btn primary", "Link teilen");
      c2.onclick = shareInvite;
      row.append(c1, c2);
      content.append(row);
    } else if (k === "enter") {
      const f = el("form", "stack");
      const inp = el("input", "code-input");
      inp.maxLength = 8;
      inp.placeholder = "XXXXXXXX";
      inp.autocapitalize = "characters";
      inp.spellcheck = false;
      const sub = el("button", "btn primary big", "Chat starten");
      f.append(el("p", "small muted", "Gib den 8-stelligen Code deines Kontakts ein."), inp, sub);
      f.onsubmit = async (e) => {
        e.preventDefault();
        sub.disabled = true;
        try {
          await addContactByCode(inp.value);
          closeModal();
        } catch (err) {
          toast(err.status === 404 ? "Diesen Code gibt es nicht." : err.message);
        } finally {
          sub.disabled = false;
        }
      };
      content.append(f);
      setTimeout(() => inp.focus(), 50);
    } else {
      startScanner(content);
    }
  }
  openModal(root);
  show(tab);
}

async function startScanner(container) {
  const wrap = el("div", "scanner");
  const video = el("video");
  video.setAttribute("playsinline", "");
  video.muted = true;
  wrap.append(video, el("div", "frame"));
  const hint = el("p", "small muted", "Halte die Kamera auf den Pixelkingschat-QR-Code.");
  container.append(wrap, hint);
  let stream;
  let raf;
  let stopped = false;
  scannerStop = () => {
    stopped = true;
    cancelAnimationFrame(raf);
    stream?.getTracks().forEach((t) => t.stop());
  };
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
    if (stopped) return scannerStop();
    video.srcObject = stream;
    await video.play();
  } catch {
    hint.textContent = "Kein Kamerazugriff. Erlaube die Kamera oder gib den Code manuell ein.";
    return;
  }
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  let busy = false;
  const tick = async () => {
    if (stopped) return;
    if (video.readyState === video.HAVE_ENOUGH_DATA && !busy) {
      const w = 480;
      const h = Math.round((video.videoHeight / video.videoWidth) * w) || 480;
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(video, 0, 0, w, h);
      const img = ctx.getImageData(0, 0, w, h);
      const res = jsQR(img.data, w, h, { inversionAttempts: "dontInvert" });
      if (res?.data) {
        const m = /#add=([A-Z0-9]{8})/i.exec(res.data) || /^([A-Z0-9]{8})$/i.exec(res.data.trim());
        if (m) {
          busy = true;
          try {
            await addContactByCode(m[1]);
            if (navigator.vibrate) navigator.vibrate(60);
            closeModal();
            toast("Kontakt hinzugefügt ✓");
            return;
          } catch (err) {
            toast(err.status === 404 ? "Dieser Code existiert nicht." : err.message);
            setTimeout(() => (busy = false), 1500);
          }
        }
      }
    }
    raf = requestAnimationFrame(tick);
  };
  tick();
}

async function showContactInfo() {
  const c = S.contacts[currentChat];
  const root = el("div", "stack");
  root.append(el("h2", null, displayName(c)));
  root.append(el("p", "small muted", `Code: ${c.id}${c.name ? ` · nennt sich „${c.name}“` : ""}`));
  const lab = el("label", "field");
  lab.append(el("span", null, "Eigener Name für diesen Kontakt"));
  const inp = el("input");
  inp.value = c.nick || "";
  inp.maxLength = 24;
  inp.placeholder = c.name || c.id;
  lab.append(inp);
  const saveBtn = el("button", "btn", "Name speichern");
  saveBtn.onclick = () => {
    c.nick = inp.value.trim();
    save();
    openChat(c.id);
    closeModal();
  };
  root.append(lab, saveBtn, el("hr"));
  root.append(el("strong", null, "🔐 Sicherheitsnummer"));
  root.append(
    el("p", "small muted", "Vergleicht diese Nummer persönlich. Stimmt sie bei euch beiden überein, liest garantiert niemand mit.")
  );
  const fp = el("div", "fingerprint", (await fingerprint(S.me.pub, c.pub)).join("  "));
  root.append(fp, el("hr"));
  const clear = el("button", "btn", "Chatverlauf leeren");
  clear.onclick = () => {
    S.messages[c.id] = [];
    save();
    renderMessages();
    renderList();
    closeModal();
  };
  const del = el("button", "btn danger", "Kontakt & Chat löschen");
  del.onclick = () => {
    if (!confirm("Kontakt und Chat wirklich löschen?")) return;
    delete S.contacts[c.id];
    delete S.messages[c.id];
    keyCache.delete(c.id);
    save();
    closeModal();
    closeChat();
    $("#chat").classList.add("no-chat");
  };
  root.append(clear, del);
  openModal(root);
}

function showSettings() {
  const root = el("div", "stack");
  root.append(el("h2", null, "Einstellungen"));
  const lab = el("label", "field");
  lab.append(el("span", null, "Dein Anzeigename (wird verschlüsselt mitgeschickt)"));
  const inp = el("input");
  inp.value = S.me.name || "";
  inp.maxLength = 24;
  inp.placeholder = "Anonym";
  lab.append(inp);
  const sb = el("button", "btn", "Speichern");
  sb.onclick = () => {
    S.me.name = inp.value.trim();
    save();
    toast("Gespeichert ✓");
  };
  root.append(lab, sb, el("hr"));
  root.append(el("strong", null, "So schützt dich Pixelkingschat"));
  const ul = el("ul", "small muted");
  for (const t of [
    "Keine Telefonnummer, keine E-Mail – nur ein zufälliger Code.",
    "Dein privater Schlüssel bleibt auf diesem Gerät. Nachrichten werden im Browser verschlüsselt (ECDH P-256 + AES-256-GCM).",
    "Der Server speichert nur verschlüsselte Nachrichten, bis sie abgeholt werden – höchstens 24 Stunden.",
    "Auf deinem Gerät löschen sich Nachrichten nach 24 Stunden automatisch.",
    "Einmal-Nachrichten werden nach dem Ansehen gelöscht. (Screenshots kann keine App verhindern.)",
  ])
    ul.append(el("li", null, t));
  root.append(ul, el("hr"));
  root.append(
    el("p", "small muted", "Achtung: Wenn du die Browserdaten löschst oder das Konto löschst, sind dein Code und alle Chats weg.")
  );
  const del = el("button", "btn danger", "Konto & alle Daten löschen");
  del.onclick = async () => {
    if (!confirm("Konto wirklich löschen? Dein Code wird ungültig und alle Chats verschwinden.")) return;
    try {
      await api("me", { method: "DELETE" });
    } catch {}
    localStorage.removeItem(STORE_KEY);
    location.replace("/");
  };
  root.append(del);
  openModal(root);
}

/* ================= Start ================= */
function handleHash() {
  const m = /#add=([A-Z0-9]{8})/i.exec(location.hash);
  if (!m) return null;
  history.replaceState(null, "", location.pathname);
  return m[1].toUpperCase();
}

let pendingAdd = handleHash();

async function startApp() {
  $("#welcome").classList.add("hidden");
  $("#app").classList.remove("hidden");
  $("#myCodeText").textContent = S.me.id;
  purgeExpired();
  updateTitle();
  if (pendingAdd) {
    const code = pendingAdd;
    pendingAdd = null;
    try {
      await addContactByCode(code);
      toast("Kontakt hinzugefügt ✓");
    } catch (e) {
      toast(e.status === 404 ? "Dieser Einladungscode existiert nicht." : e.message);
    }
  }
  poll();
  loop();
  setInterval(purgeExpired, 30000);
}

function loop() {
  setTimeout(async () => {
    await poll();
    loop();
  }, document.hidden ? 15000 : 3000);
}

function bind() {
  $("#createBtn").onclick = async () => {
    const b = $("#createBtn");
    b.disabled = true;
    b.textContent = "Schlüssel werden erzeugt…";
    try {
      await createIdentity($("#welcomeName").value.trim().slice(0, 24));
      startApp();
    } catch (e) {
      toast("Fehler: " + e.message);
      b.disabled = false;
      b.textContent = "Los geht's";
    }
  };
  $("#addBtn").onclick = () => showAdd("mine");
  $("#myCodeCard").onclick = () => showAdd("mine");
  $("#menuBtn").onclick = showSettings;
  $("#backBtn").onclick = closeChat;
  $("#chatInfoBtn").onclick = showContactInfo;
  $("#modalClose").onclick = () => closeModal();
  $("#modal").onclick = (e) => {
    if (e.target.id === "modal") closeModal();
  };
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !$("#modal").classList.contains("hidden")) closeModal();
  });

  const input = $("#msgInput");
  const grow = () => {
    input.style.height = "44px";
    if (input.value) input.style.height = Math.min(Math.max(input.scrollHeight + 2, 44), 140) + "px";
  };
  input.addEventListener("input", grow);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && matchMedia("(pointer: fine)").matches) {
      e.preventDefault();
      $("#composer").requestSubmit();
    }
  });
  $("#onceBtn").onclick = () => {
    onceMode = !onceMode;
    $("#onceBtn").setAttribute("aria-pressed", String(onceMode));
    $("#composer").classList.toggle("once-on", onceMode);
    input.placeholder = onceMode ? "Einmal-Nachricht (nur 1× ansehbar)…" : "Verschlüsselte Nachricht…";
    if (onceMode) toast("👁 Einmal-Modus: Nachricht kann nur einmal angesehen werden");
  };
  $("#composer").onsubmit = (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || !currentChat) return;
    input.value = "";
    grow();
    sendMessage(text, onceMode);
    if (onceMode) $("#onceBtn").click();
    input.focus();
  };
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      poll();
      if (currentChat && S.contacts[currentChat]) {
        S.contacts[currentChat].unread = 0;
        save();
        renderList();
        updateTitle();
      }
    }
  });
  window.addEventListener("hashchange", () => {
    const code = handleHash();
    if (code && S.me) addContactByCode(code).catch((e) => toast(e.message));
  });
  window.addEventListener("storage", (e) => {
    if (e.key === STORE_KEY) {
      S = load();
      renderList();
      renderMessages();
    }
  });
}

bind();
if (S.me) startApp();
else {
  $("#welcome").classList.remove("hidden");
  if (pendingAdd) {
    const p = el("p", "small accent", "Du wurdest zu einem Chat eingeladen – erstelle kurz dein anonymes Profil.");
    $(".tagline").after(p);
  }
}
