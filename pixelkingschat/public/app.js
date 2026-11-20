// Pixelkingschat – anonymer Ende-zu-Ende-verschlüsselter Chat
// Kryptografie: ECDH P-256 → HKDF-SHA256 → eigener AES-GCM-256-Schlüssel pro Nachricht (WebCrypto, nur im Browser).
// Der Server sieht nur Codes und verschlüsselte Bytes.

const TTL = 24 * 60 * 60 * 1000;
const STORE_KEY = "pk_v1";
const MAX_IMG_B64 = 1_050_000;
const $ = (s) => document.querySelector(s);

/* ================= Hilfsfunktionen ================= */
const enc = new TextEncoder();
const dec = new TextDecoder();
const b64u = (buf) => {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
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
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

function toast(msg, ms = 2800) {
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
  if (left >= 3600000) return `⏳ ${Math.ceil(left / 3600000)} Std`;
  return `⏳ ${Math.max(1, Math.ceil(left / 60000))} Min`;
}

/* ================= IndexedDB (Bilder & Rohdaten für Meldungen) ================= */
let dbP = null;
function db() {
  dbP ??= new Promise((resolve, reject) => {
    const req = indexedDB.open("pk", 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      for (const s of ["raw", "media", "meta"]) if (!d.objectStoreNames.contains(s)) d.createObjectStore(s);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbP;
}
async function idb(store, mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(store, mode);
    const r = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(r?.result);
    tx.onerror = () => reject(tx.error);
  });
}
const idbGet = (s, k) => idb(s, "readonly", (o) => o.get(k)).catch(() => undefined);
const idbPut = (s, k, v) => idb(s, "readwrite", (o) => o.put(v, k)).catch((e) => console.warn(e));
const idbDel = (s, k) => idb(s, "readwrite", (o) => o.delete(k)).catch(() => {});
const idbKeys = (s) => idb(s, "readonly", (o) => o.getAllKeys()).catch(() => []);

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
  clearTimeout(save._n);
  save._n = setTimeout(syncNames, 300);
}
function syncNames() {
  const names = {};
  for (const c of Object.values(S.contacts)) names[c.id] = displayName(c);
  idbPut("meta", "names", names);
}

let currentChat = null;
let onceMode = false;
const baseCache = new Map();
const seenMids = new Set();
const urlCache = new Map();
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
  S = { me: { id, token, pub, priv, name: name || "", av: 0 }, contacts: {}, messages: {} };
  save();
}

async function getPriv() {
  myPriv ??= await crypto.subtle.importKey("jwk", S.me.priv, { name: "ECDH", namedCurve: "P-256" }, false, [
    "deriveBits",
  ]);
  return myPriv;
}

// Gemeinsamer Basisschlüssel pro Kontakt (ECDH → HKDF-Schlüsselmaterial)
async function chatBase(contactId) {
  if (baseCache.has(contactId)) return baseCache.get(contactId);
  const c = S.contacts[contactId];
  const theirPub = await crypto.subtle.importKey("raw", unb64u(c.pub), { name: "ECDH", namedCurve: "P-256" }, false, []);
  const bits = await crypto.subtle.deriveBits({ name: "ECDH", public: theirPub }, await getPriv(), 256);
  const base = await crypto.subtle.importKey("raw", bits, "HKDF", false, ["deriveBits"]);
  baseCache.set(contactId, base);
  return base;
}
// Eigener Schlüssel für jede einzelne Nachricht – nur er wird beim Melden herausgegeben.
async function msgKeyBytes(contactId, mid) {
  return crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: enc.encode("pixelkingschat"), info: enc.encode(`pk-msg|${mid}`) },
    await chatBase(contactId),
    256
  );
}
const aesKey = (bytes) => crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
const aad = (from, to, mid) => enc.encode(`${from}>${to}|${mid}`);

async function encryptFor(to, mid, payload) {
  const iv = rand(12);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: aad(S.me.id, to, mid) },
    await aesKey(await msgKeyBytes(to, mid)),
    enc.encode(JSON.stringify(payload))
  );
  return { iv: b64u(iv), ct: b64u(ct) };
}
async function decryptFrom(from, mid, iv, ct) {
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64u(iv), additionalData: aad(from, S.me.id, mid) },
    await aesKey(await msgKeyBytes(from, mid)),
    unb64u(ct)
  );
  return JSON.parse(dec.decode(pt));
}

async function fingerprint(pubA, pubB) {
  const [a, b] = [pubA, pubB].sort();
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(a + "|" + b)));
  const groups = [];
  for (let i = 0; i < 12; i++) groups.push(String(((h[i * 2] << 8) | h[i * 2 + 1]) % 100000).padStart(5, "0"));
  return groups;
}

/* ================= Bilder ================= */
async function loadBitmap(file) {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}
async function compressImage(file, { maxDim = 1600, maxB64 = MAX_IMG_B64, square = false } = {}) {
  const bmp = await loadBitmap(file);
  const w0 = bmp.width;
  const h0 = bmp.height;
  let sx = 0,
    sy = 0,
    sw = w0,
    sh = h0;
  if (square) {
    const s = Math.min(w0, h0);
    sx = (w0 - s) / 2;
    sy = (h0 - s) / 2;
    sw = sh = s;
  }
  let dim = maxDim;
  for (let attempt = 0; attempt < 8; attempt++) {
    const scale = Math.min(1, dim / Math.max(sw, sh));
    const w = Math.max(1, Math.round(sw * scale));
    const h = Math.max(1, Math.round(sh * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, w, h);
    for (const q of [0.82, 0.7, 0.58]) {
      const dataUrl = canvas.toDataURL("image/jpeg", q);
      const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
      if (b64.length <= maxB64) return b64;
    }
    dim = Math.round(dim * 0.75);
  }
  throw new Error("Bild ist zu groß.");
}
function b64ToBlobUrl(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: "image/jpeg" }));
}
async function mediaUrl(mid) {
  if (urlCache.has(mid)) return urlCache.get(mid);
  const b64 = await idbGet("media", mid);
  if (!b64) return null;
  const url = b64ToBlobUrl(b64);
  urlCache.set(mid, url);
  return url;
}
async function dropMedia(mid) {
  const u = urlCache.get(mid);
  if (u) URL.revokeObjectURL(u);
  urlCache.delete(mid);
  await idbDel("media", mid);
  await idbDel("raw", mid);
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
    const { pub, av } = await api(`key/${code}`);
    S.contacts[code] = { id: code, pub, av: av || 0, name: "", nick: "", added: Date.now(), unread: 0, last: Date.now() };
    S.messages[code] = S.messages[code] || [];
    save();
  }
  if (open) openChat(code);
  renderList();
  return S.contacts[code];
}

async function refreshProfile(id) {
  try {
    const { av } = await api(`key/${id}`);
    const c = S.contacts[id];
    if (c && c.av !== av) {
      c.av = av;
      save();
      renderList();
      if (currentChat === id) fillAvatar($("#chatAvatar"), c);
    }
  } catch {}
}

/* ================= Senden / Empfangen ================= */
const newMid = () => b64u(rand(12));

async function sendMessage({ text = "", imgB64 = null, once = false }) {
  const to = currentChat;
  if (S.me.banned) return toast("Dein Konto ist gesperrt.");
  const mid = newMid();
  const ts = Date.now();
  const local = { mid, dir: "out", ts, once, status: "pending" };
  if (imgB64) local.img = true;
  if (!once) {
    local.text = text;
    if (imgB64) await idbPut("media", mid, imgB64);
  }
  S.messages[to].push(local);
  S.contacts[to].last = ts;
  save();
  renderMessages();
  renderList();
  try {
    const payload = { k: "m", t: text, o: !!once, n: S.me.name || "", av: S.me.av || 0 };
    if (imgB64) payload.img = imgB64;
    const { iv, ct } = await encryptFor(to, mid, payload);
    await api("send", { body: { to, mid, iv, ct } });
    local.status = "sent";
  } catch (e) {
    local.status = "failed";
    if (e.status === 403) setBanned(true);
    toast("Senden fehlgeschlagen: " + e.message);
  }
  save();
  renderMessages();
}

async function sendReceipt(to, ref) {
  try {
    const mid = newMid();
    const { iv, ct } = await encryptFor(to, mid, { k: "r", ref });
    await api("send", { body: { to, mid, iv, ct, silent: true } });
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
        if (S.contacts[m.from]?.blocked) continue;
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
        if (typeof p.av === "number" && p.av !== c.av) c.av = p.av;
        const msg = { mid: m.mid, dir: "in", ts: m.ts, once: !!p.o, text: p.t.slice(0, 4000) };
        if (typeof p.img === "string") {
          msg.img = true;
          await idbPut("media", m.mid, p.img);
        }
        // Rohdaten 24 h aufbewahren, damit die Nachricht überprüfbar gemeldet werden kann
        await idbPut("raw", m.mid, { iv: m.iv, ct: m.ct, ts: m.ts });
        list.push(msg);
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
    if (e.status === 401) toast("Dein Konto existiert nicht mehr auf dem Server.");
  } finally {
    polling = false;
  }
}

async function purgeExpired() {
  const now = Date.now();
  let changed = false;
  const keep = new Set();
  for (const id of Object.keys(S.messages)) {
    const before = S.messages[id].length;
    S.messages[id] = S.messages[id].filter((m) => now - m.ts < TTL);
    for (const m of S.messages[id]) if (!(m.once && m.opened)) keep.add(m.mid);
    if (S.messages[id].length !== before) changed = true;
  }
  if (changed) save();
  for (const store of ["media", "raw"]) {
    for (const k of await idbKeys(store)) if (!keep.has(k)) await dropMedia(k);
  }
  renderList();
  if (currentChat) renderMessages();
}

/* ================= Rendering ================= */
function avatarColor(id) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${(h % 60) + 150}, 80%, ${55 + (h % 15)}%)`;
}
function fillAvatar(node, c, letterSrc) {
  node.textContent = "";
  node.style.background = avatarColor(c.id);
  const letter = () => {
    node.textContent = (letterSrc || displayName(c)).slice(0, 1).toUpperCase();
  };
  if (c.av) {
    const img = el("img");
    img.alt = "";
    img.src = `/api/avatar/${c.id}?v=${c.av}`;
    img.onerror = () => {
      img.remove();
      letter();
    };
    node.append(img);
  } else letter();
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
    r1.append(el("span", "name", (c.blocked ? "🚫 " : "") + displayName(c)), el("span", "time", last ? fmtTime(last.ts) : ""));
    const r2 = el("div", "row");
    let prev = "Noch keine Nachrichten";
    if (last) {
      if (last.once)
        prev = last.dir === "in" ? (last.opened ? "👁 Geöffnet" : "👁 Einmal-Nachricht") : "👁 Einmal-Nachricht gesendet";
      else prev = (last.dir === "out" ? "Du: " : "") + (last.img ? "🖼 " + (last.text || "Bild") : last.text);
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
  note.append(
    "🔐 ",
    el("b", null, "Ende-zu-Ende-verschlüsselt."),
    " Nachrichten löschen sich nach ",
    el("b", null, "24 Stunden"),
    " automatisch."
  );
  box.append(note);
  if (S.contacts[currentChat]?.blocked) box.append(el("div", "sys-note", "🚫 Du hast diesen Kontakt blockiert."));
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
      const kind = m.img ? "Einmal-Bild" : "Einmal-Nachricht";
      let label;
      if (m.dir === "out") label = m.status === "opened" ? `${kind} wurde angesehen` : kind;
      else if (m.opened) label = "Geöffnet";
      else {
        label = `${kind} · antippen`;
        d.onclick = () => viewOnce(m);
      }
      const wrap = el("div");
      wrap.append(el("div", null, label), info);
      d.append(badge, wrap);
    } else {
      if (m.img) {
        d.classList.add("has-img");
        const img = el("img", "msg-img");
        img.alt = "Bild";
        mediaUrl(m.mid).then((u) => {
          if (u) img.src = u;
          else img.replaceWith(el("div", "img-missing", "🖼 Bild nicht mehr verfügbar"));
        });
        img.onclick = (e) => {
          e.stopPropagation();
          showImage(m);
        };
        d.append(img);
      }
      if (m.text) d.append(el("div", "msg-text", m.text));
      d.append(info);
      if (m.dir === "in") d.onclick = () => messageActions(m);
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
  if ("setAppBadge" in navigator) (n ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => {});
}

function renderMe() {
  $("#myCodeText").textContent = S.me.id;
  fillAvatar($("#meAvatar"), { id: S.me.id, av: S.me.av }, S.me.name || S.me.id);
}

function openChat(id) {
  if (!S.contacts[id]) return;
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
  refreshProfile(id);
  if (matchMedia("(min-width: 761px)").matches) $("#msgInput").focus();
}

function closeChat() {
  $("#app").classList.remove("chat-open");
  currentChat = null;
  renderList();
  setTimeout(() => !currentChat && $("#chat").classList.add("no-chat"), 250);
}

function setBanned(on) {
  S.me.banned = !!on;
  save();
  $("#bannedBanner").classList.toggle("hidden", !on);
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

/* ================= Einmal-Nachricht ================= */
async function viewOnce(m) {
  const from = currentChat;
  const body = el("div");
  body.append(el("h2", null, m.img ? "👁 Einmal-Bild" : "👁 Einmal-Nachricht"));
  body.append(el("p", "small muted", "Wird gelöscht, sobald du dieses Fenster schließt."));
  const v = el("div", "once-view");
  if (m.img) {
    const img = el("img", "once-img");
    img.alt = "";
    const u = await mediaUrl(m.mid);
    if (u) img.src = u;
    v.append(img);
  }
  if (m.text) v.append(el("div", null, m.text));
  body.append(v);
  const btn = el("button", "btn primary big", "Gesehen – jetzt löschen");
  btn.onclick = closeModal;
  const rep = el("button", "link-btn", "⚑ Diese Nachricht melden");
  rep.onclick = () => {
    modalOnClose = null; // Inhalt bleibt bis nach der Meldung erhalten
    showReport({ type: "message", target: from, mids: [m.mid], after: () => finishOnce(m, from) });
  };
  body.append(btn, rep);
  openModal(body, () => finishOnce(m, from));
}
function finishOnce(m, from) {
  if (m.opened) return;
  m.text = "";
  m.opened = true;
  dropMedia(m.mid);
  save();
  renderMessages();
  renderList();
  sendReceipt(from, m.mid);
}

/* ================= Bilder ansehen / senden ================= */
async function showImage(m) {
  const body = el("div", "stack");
  const img = el("img", "full-img");
  img.alt = "";
  const u = await mediaUrl(m.mid);
  if (u) img.src = u;
  body.append(img);
  if (m.text) body.append(el("p", null, m.text));
  if (m.dir === "in") {
    const rep = el("button", "btn danger", "⚑ Bild melden");
    rep.onclick = () => showReport({ type: "message", target: currentChat, mids: [m.mid] });
    body.append(rep);
  }
  openModal(body);
}

async function pickImageToSend(file) {
  if (!currentChat) return;
  let b64;
  try {
    toast("Bild wird vorbereitet…", 1500);
    b64 = await compressImage(file);
  } catch (e) {
    return toast(e.message || "Bild konnte nicht gelesen werden.");
  }
  const body = el("div", "stack");
  body.append(el("h2", null, "Bild senden"));
  const prev = el("img", "full-img");
  prev.src = "data:image/jpeg;base64," + b64;
  const cap = el("input");
  cap.placeholder = "Bildunterschrift (optional)";
  cap.maxLength = 500;
  const lab = el("label", "check");
  const cb = el("input");
  cb.type = "checkbox";
  cb.checked = onceMode;
  lab.append(cb, " 👁 Nur einmal ansehen");
  const send = el("button", "btn primary big", "🔐 Verschlüsselt senden");
  send.onclick = () => {
    const once = cb.checked;
    closeModal();
    sendMessage({ text: cap.value.trim(), imgB64: b64, once });
    if (onceMode) $("#onceBtn").click();
  };
  body.append(prev, cap, lab, send);
  openModal(body);
}

/* ================= Melden ================= */
function messageActions(m) {
  const body = el("div", "stack");
  body.append(el("h2", null, "Nachricht"));
  if (m.text) {
    body.append(el("div", "quote", m.text));
    const copyBtn = el("button", "btn", "Text kopieren");
    copyBtn.onclick = () => {
      copy(m.text);
      closeModal();
    };
    body.append(copyBtn);
  }
  const rep = el("button", "btn danger", "⚑ Nachricht melden");
  rep.onclick = () => showReport({ type: "message", target: currentChat, mids: [m.mid] });
  body.append(rep);
  openModal(body);
}

const REASONS = [
  ["harassment", "Belästigung oder Mobbing"],
  ["threat", "Drohung oder Gewalt"],
  ["sexual", "Sexuelle oder anstößige Inhalte"],
  ["hate", "Hass oder Hetze"],
  ["spam", "Spam oder Betrug"],
  ["other", "Etwas anderes"],
];

function showReport({ type, target, mids = [], after }) {
  const body = el("div", "stack");
  const titles = { message: "Nachricht melden", chat: "Chat melden", avatar: "Profilbild melden" };
  body.append(el("h2", null, "⚑ " + titles[type]));
  const expl = {
    message: "Die gemeldete Nachricht wird zur Prüfung übermittelt. Alle anderen Nachrichten bleiben privat.",
    chat: "Die letzten empfangenen Nachrichten dieses Kontakts werden zur Prüfung übermittelt. Deine eigenen Nachrichten bleiben privat.",
    avatar: "Das Profilbild wird zur Prüfung übermittelt.",
  };
  body.append(el("p", "small muted", expl[type]));
  body.append(el("strong", null, "Was ist das Problem?"));
  const list = el("div", "reasons");
  let picked = null;
  const send = el("button", "btn danger big", "Meldung absenden");
  send.disabled = true;
  for (const [k, label] of REASONS) {
    const b = el("button", "reason", label);
    b.type = "button";
    b.onclick = () => {
      picked = k;
      for (const x of list.children) x.classList.toggle("active", x === b);
      send.disabled = false;
    };
    list.append(b);
  }
  const lab = el("label", "check");
  const blockCb = el("input");
  blockCb.type = "checkbox";
  blockCb.checked = type !== "avatar";
  lab.append(blockCb, " Kontakt außerdem blockieren");
  send.onclick = async () => {
    send.disabled = true;
    send.textContent = "Wird geprüft…";
    try {
      const items = [];
      if (type !== "avatar") {
        let ids = mids;
        if (type === "chat") ids = (S.messages[target] || []).filter((m) => m.dir === "in").slice(-20).map((m) => m.mid);
        for (const mid of ids) {
          const raw = await idbGet("raw", mid);
          if (!raw) continue;
          items.push({ mid, ts: raw.ts, iv: raw.iv, ct: raw.ct, k: b64u(await msgKeyBytes(target, mid)) });
        }
        if (!items.length) throw new Error("Keine Nachrichten gefunden, die gemeldet werden können.");
      }
      const res = await api("report", { body: { type, target, reason: picked, items } });
      if (blockCb.checked) await setBlocked(target, true);
      const done = el("div", "stack");
      done.append(el("h2", null, "Danke! 💚"));
      done.append(el("p", null, res.message));
      const ok = el("button", "btn primary big", "OK");
      ok.onclick = closeModal;
      done.append(ok);
      openModal(done, after);
    } catch (e) {
      toast(e.message);
      send.disabled = false;
      send.textContent = "Meldung absenden";
    }
  };
  body.append(list, lab, send);
  openModal(body, after);
}

async function setBlocked(id, on) {
  const c = S.contacts[id];
  if (!c) return;
  c.blocked = on;
  save();
  try {
    await api("block", { body: { id, on } });
  } catch {}
  renderList();
  renderMessages();
}

/* ================= Teilen / QR ================= */
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
    } else startScanner(content);
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
      const res = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" });
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

/* ================= Kontakt-Info ================= */
async function showContactInfo() {
  const c = S.contacts[currentChat];
  const root = el("div", "stack");
  const head = el("div", "profile-head");
  const av = el("div", "avatar xl");
  fillAvatar(av, c);
  head.append(av, el("h2", null, displayName(c)));
  head.append(el("p", "small muted", `Code: ${c.id}${c.name ? ` · nennt sich „${c.name}“` : ""}`));
  root.append(head);
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
  root.append(el("div", "fingerprint", (await fingerprint(S.me.pub, c.pub)).join("  ")), el("hr"));

  const block = el("button", "btn", c.blocked ? "Blockierung aufheben" : "🚫 Kontakt blockieren");
  block.onclick = async () => {
    await setBlocked(c.id, !c.blocked);
    toast(c.blocked ? "Kontakt blockiert" : "Blockierung aufgehoben");
    closeModal();
  };
  const repChat = el("button", "btn danger", "⚑ Chat melden");
  repChat.onclick = () => showReport({ type: "chat", target: c.id });
  root.append(block, repChat);
  if (c.av) {
    const repAv = el("button", "btn danger", "⚑ Profilbild melden");
    repAv.onclick = () => showReport({ type: "avatar", target: c.id });
    root.append(repAv);
  }
  root.append(el("hr"));
  const clear = el("button", "btn", "Chatverlauf leeren");
  clear.onclick = async () => {
    for (const m of S.messages[c.id] || []) await dropMedia(m.mid);
    S.messages[c.id] = [];
    save();
    renderMessages();
    renderList();
    closeModal();
  };
  const del = el("button", "btn danger", "Kontakt & Chat löschen");
  del.onclick = async () => {
    if (!confirm("Kontakt und Chat wirklich löschen?")) return;
    for (const m of S.messages[c.id] || []) await dropMedia(m.mid);
    delete S.contacts[c.id];
    delete S.messages[c.id];
    baseCache.delete(c.id);
    save();
    closeModal();
    closeChat();
    $("#chat").classList.add("no-chat");
  };
  root.append(clear, del);
  openModal(root);
}

/* ================= Einstellungen / Profil ================= */
function showSettings() {
  const root = el("div", "stack");
  root.append(el("h2", null, "Profil & Einstellungen"));
  const head = el("div", "profile-head");
  const av = el("div", "avatar xl");
  fillAvatar(av, { id: S.me.id, av: S.me.av }, S.me.name || S.me.id);
  head.append(av);
  const row = el("div", "btn-row");
  const pick = el("button", "btn", "📷 Profilbild wählen");
  pick.onclick = () => $("#avatarInput").click();
  row.append(pick);
  if (S.me.av) {
    const rm = el("button", "btn", "Entfernen");
    rm.onclick = async () => {
      try {
        await api("avatar", { method: "DELETE" });
        S.me.av = 0;
        save();
        renderMe();
        showSettings();
      } catch (e) {
        toast(e.message);
      }
    };
    row.append(rm);
  }
  head.append(row);
  root.append(head);
  root.append(el("p", "small muted", "Dein Profilbild ist für alle sichtbar, die deinen Code kennen."));

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
    renderMe();
    toast("Gespeichert ✓");
  };
  root.append(lab, sb, el("hr"));

  root.append(el("strong", null, "🔔 Benachrichtigungen"));
  root.append(el("p", "small muted", notifStatusText()));
  if (pushSupported() && Notification.permission === "default") {
    const nb = el("button", "btn primary", "Benachrichtigungen aktivieren");
    nb.onclick = async () => {
      await enablePush();
      showSettings();
    };
    root.append(nb);
  }
  root.append(el("hr"));

  root.append(el("strong", null, "So schützt dich Pixelkingschat"));
  const ul = el("ul", "small muted");
  for (const t of [
    "Keine Telefonnummer, keine E-Mail – nur ein zufälliger Code, den es nur ein einziges Mal gibt.",
    "Dein privater Schlüssel bleibt auf diesem Gerät. Texte und Bilder werden im Browser verschlüsselt (ECDH P-256 + AES-256-GCM).",
    "Der Server speichert nur verschlüsselte Nachrichten, bis sie abgeholt werden – höchstens 24 Stunden.",
    "Auf deinem Gerät löschen sich Nachrichten und Bilder nach 24 Stunden automatisch.",
    "Einmal-Nachrichten werden nach dem Ansehen gelöscht. (Screenshots kann keine App verhindern.)",
    "Gemeldete Inhalte werden geprüft und Verstöße automatisch geahndet.",
  ])
    ul.append(el("li", null, t));
  root.append(ul, el("hr"));
  root.append(
    el("p", "small muted", "Achtung: Wenn du die Browserdaten oder das Konto löschst, sind dein Code und alle Chats weg.")
  );
  const del = el("button", "btn danger", "Konto & alle Daten löschen");
  del.onclick = async () => {
    if (!confirm("Konto wirklich löschen? Dein Code wird ungültig und alle Chats verschwinden.")) return;
    try {
      await api("me", { method: "DELETE" });
    } catch {}
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      await sub?.unsubscribe();
    } catch {}
    localStorage.removeItem(STORE_KEY);
    indexedDB.deleteDatabase("pk");
    location.replace("/");
  };
  root.append(del);
  openModal(root);
}

async function uploadAvatar(file) {
  try {
    const b64 = await compressImage(file, { maxDim: 320, maxB64: 250_000, square: true });
    const { av } = await api("avatar", { method: "PUT", body: { img: b64 } });
    S.me.av = av;
    save();
    renderMe();
    toast("Profilbild gespeichert ✓");
    if (!$("#modal").classList.contains("hidden")) showSettings();
  } catch (e) {
    toast(e.message || "Profilbild konnte nicht gespeichert werden.");
  }
}

/* ================= Push-Benachrichtigungen ================= */
const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

function notifStatusText() {
  if (!pushSupported()) {
    if (isIOS && !isStandalone)
      return "Auf dem iPhone: Tippe unten auf „Teilen“ → „Zum Home-Bildschirm“ und öffne Pixelkingschat von dort. Dann kannst du Benachrichtigungen aktivieren.";
    return "Dein Browser unterstützt keine Benachrichtigungen.";
  }
  if (Notification.permission === "granted") return "✅ Aktiv – du wirst bei neuen Nachrichten benachrichtigt (ohne Inhalt).";
  if (Notification.permission === "denied")
    return "❌ Blockiert. Erlaube Benachrichtigungen in den Einstellungen deines Handys/Browsers für diese Seite.";
  return "Du wirst bei neuen Nachrichten benachrichtigt – der Inhalt bleibt dabei verschlüsselt.";
}

let swReg = null;
async function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  try {
    swReg = await navigator.serviceWorker.register("/sw.js");
    navigator.serviceWorker.addEventListener("message", (e) => {
      if (e.data?.type === "push") poll();
      if (e.data?.type === "open" && e.data.from) {
        poll();
        openChat(e.data.from);
      }
    });
  } catch (e) {
    console.warn("SW", e);
  }
}

async function subscribePush() {
  if (!pushSupported() || Notification.permission !== "granted") return false;
  const reg = swReg || (await navigator.serviceWorker.ready);
  const { vapid } = await api("config");
  if (!vapid) return false;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: unb64u(vapid) });
  await api("push", { body: { sub: sub.toJSON() } });
  return true;
}

async function enablePush() {
  try {
    const p = await Notification.requestPermission();
    if (p === "granted") {
      await subscribePush();
      toast("🔔 Benachrichtigungen aktiviert");
    } else toast("Benachrichtigungen wurden nicht erlaubt.");
  } catch (e) {
    toast("Benachrichtigungen konnten nicht aktiviert werden.");
    console.warn(e);
  }
  updateNotifBanner();
}

function updateNotifBanner() {
  const b = $("#notifBanner");
  let dismissed = false;
  try {
    dismissed = localStorage.getItem("pk_notif_dismissed") === "1";
  } catch {}
  let text = null;
  let action = false;
  if (pushSupported() && Notification.permission === "default") {
    text = "🔔 Bekomme eine Benachrichtigung, wenn dir jemand schreibt.";
    action = true;
  } else if (!pushSupported() && isIOS && !isStandalone) {
    text = "📲 Für Benachrichtigungen: unten auf „Teilen“ tippen → „Zum Home-Bildschirm“.";
  }
  b.classList.toggle("hidden", !text || dismissed);
  if (text) {
    b.querySelector(".banner-text").textContent = text;
    $("#notifEnable").classList.toggle("hidden", !action);
  }
}

/* ================= Start ================= */
function handleHash() {
  const m = /#(add|chat)=([A-Z0-9]{8})/i.exec(location.hash);
  if (!m) return null;
  history.replaceState(null, "", location.pathname);
  return { kind: m[1].toLowerCase(), code: m[2].toUpperCase() };
}

let pendingHash = handleHash();

async function startApp() {
  $("#welcome").classList.add("hidden");
  $("#app").classList.remove("hidden");
  renderMe();
  setBanned(!!S.me.banned);
  await purgeExpired();
  updateTitle();
  syncNames();
  registerSW().then(() => subscribePush().catch(() => {}));
  updateNotifBanner();
  api("me")
    .then((r) => {
      setBanned(r.banned);
      if (r.av !== S.me.av) {
        S.me.av = r.av;
        save();
        renderMe();
      }
    })
    .catch(() => {});
  if (pendingHash) {
    const { kind, code } = pendingHash;
    pendingHash = null;
    if (kind === "chat" && S.contacts[code]) openChat(code);
    else {
      try {
        await addContactByCode(code);
        toast("Kontakt hinzugefügt ✓");
      } catch (e) {
        toast(e.status === 404 ? "Dieser Einladungscode existiert nicht." : e.message);
      }
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
  $("#notifEnable").onclick = enablePush;
  $("#notifDismiss").onclick = () => {
    try {
      localStorage.setItem("pk_notif_dismissed", "1");
    } catch {}
    updateNotifBanner();
  };
  $("#imgBtn").onclick = () => $("#imgInput").click();
  $("#imgInput").onchange = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) pickImageToSend(f);
  };
  $("#avatarInput").onchange = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) uploadAvatar(f);
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
  input.addEventListener("paste", (e) => {
    const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith("image/"));
    if (f) {
      e.preventDefault();
      pickImageToSend(f);
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
    sendMessage({ text, once: onceMode });
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
    const h = handleHash();
    if (!h || !S.me) return;
    if (h.kind === "chat" && S.contacts[h.code]) openChat(h.code);
    else addContactByCode(h.code).catch((e) => toast(e.message));
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
  if (pendingHash?.kind === "add") {
    $(".tagline").after(el("p", "small accent", "Du wurdest zu einem Chat eingeladen – erstelle kurz dein anonymes Profil."));
  }
}
