// Pixelkingschat – anonymer Ende-zu-Ende-verschlüsselter Chat
// Kryptografie: ECDH P-256 → HKDF-SHA256 → eigener AES-GCM-256-Schlüssel pro Nachricht (WebCrypto, nur im Browser).
// Der Server sieht nur Codes und verschlüsselte Bytes.

const TTL = 24 * 60 * 60 * 1000;
const STORE_KEY = "pk_v1";
const MAX_IMG_B64 = 1_050_000;
const $ = (s) => document.querySelector(s);
import { renderRich, isEmoji, pixelEmoji, EMOJI_SETS } from "./emoji.js";
import { applyTheme, ACCENTS, BASES, WALLPAPERS, wallpaperUrl } from "./theme.js";
import { initCalls } from "./calls.js";

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
    if (s && s.me) return withDefaults(s);
  } catch {}
  return withDefaults({ me: null });
}
function withDefaults(s) {
  s.contacts ??= {};
  s.messages ??= {};
  s.groups ??= {};
  s.invites ??= {};
  s.stories ??= {};
  s.myStories ??= {};
  s.storySeen ??= {};
  s.settings = { autoGroup: true, accent: "#19e6d4", base: "schwarz", wp: {}, ...(s.settings || {}) };
  s.settings.wp ??= {};
  return s;
}
function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(S));
  } catch (e) {
    console.error(e);
  }
  clearTimeout(save._n);
  save._n = setTimeout(syncNames, 300);
  mirrorSoon();
}
function syncNames() {
  const names = {};
  for (const c of Object.values(S.contacts)) names[c.id] = displayName(c);
  for (const g of Object.values(S.groups)) names[g.id] = g.name;
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
  const { id } = await api("register", { body: { pub, token, name } });
  const settings = S.settings;
  S = withDefaults({ me: { id, token, pub, priv, name: name || "", nameSynced: name || "", av: 0 }, settings });
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

/* ================= Kontakte & Gruppen ================= */
const isGroup = (id) => typeof id === "string" && id.startsWith("g_");
const GID_RE = /^g_[A-Za-z0-9_-]{8,40}$/;
function displayName(c) {
  return c.nick || c.name || c.id;
}
function chatTitle(id) {
  if (isGroup(id)) return S.groups[id]?.name || "Gruppe";
  return S.contacts[id] ? displayName(S.contacts[id]) : id;
}
function memberName(id) {
  if (id === S.me.id) return "Du";
  return S.contacts[id] ? displayName(S.contacts[id]) : id;
}

async function addContactByCode(code, { open = true, peer = false } = {}) {
  code = String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (code.length !== 8) throw new Error("Ein Code hat 8 Zeichen.");
  if (code === S.me.id) throw new Error("Das ist dein eigener Code 😉");
  if (!S.contacts[code]) {
    const { pub, av, name } = await api(`key/${code}`);
    S.contacts[code] = { id: code, pub, av: av || 0, name: name || "", nick: "", added: Date.now(), unread: 0, last: Date.now(), peer };
    S.messages[code] = S.messages[code] || [];
    save();
  } else if (!peer && S.contacts[code].peer) {
    S.contacts[code].peer = false;
    save();
  }
  if (open) openChat(code);
  renderList();
  return S.contacts[code];
}
// Gruppenmitglied, das (noch) kein eigener Kontakt ist
async function ensurePeer(id) {
  if (!S.contacts[id]) await addContactByCode(id, { open: false, peer: true });
}

async function refreshProfile(id) {
  try {
    const { av, name } = await api(`key/${id}`);
    const c = S.contacts[id];
    if (c && (c.av !== av || (name && c.name !== name))) {
      c.av = av;
      if (name) c.name = name;
      save();
      renderList();
      if (currentChat === id) renderChatHead();
    }
  } catch {}
}

/* ================= Verschlüsselungs-Helfer ================= */
async function aesSeal(keyBytes, data, aadStr) {
  const iv = rand(12);
  const pt = data instanceof Uint8Array ? data : enc.encode(JSON.stringify(data));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: enc.encode(aadStr) }, await aesKey(keyBytes), pt);
  return { iv: b64u(iv), ct: b64u(ct) };
}
async function aesOpenRaw(keyBytes, e, aadStr) {
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64u(e.iv), additionalData: enc.encode(aadStr) },
    await aesKey(keyBytes),
    unb64u(e.ct)
  );
  return new Uint8Array(pt);
}
const aesOpenJson = async (k, e, a) => JSON.parse(dec.decode(await aesOpenRaw(k, e, a)));

/* ================= Senden ================= */
const newMid = () => b64u(rand(12));
const MAX_FILE = 2_500_000;

function sysMsg(chatId, text) {
  (S.messages[chatId] = S.messages[chatId] || []).push({ mid: newMid(), dir: "sys", ts: Date.now(), text });
}

async function sendMessage({ text = "", imgB64 = null, file = null, aud = null, vid = null, gif = null, meet = null, once = false }) {
  if (vid || gif || meet) once = false;
  const to = currentChat;
  if (!to) return;
  if (sendBlocked()) return;
  if (isGroup(to)) return sendGroupMessage({ text, imgB64, file, aud, vid, gif, meet });
  const mid = newMid();
  const ts = Date.now();
  const local = { mid, dir: "out", ts, once, status: "pending" };
  if (imgB64) local.img = true;
  if (file) local.file = { name: file.name, type: file.type, size: file.size };
  if (aud) local.aud = { type: aud.type, dur: aud.dur, w: aud.w };
  if (vid) local.vid = vid;
  if (gif) local.gif = gif;
  if (meet) local.meet = meet;
  if (!once) {
    local.text = text;
    if (imgB64) await idbPut("media", mid, imgB64);
    if (file) await idbPut("media", mid, file.d);
    if (aud) await idbPut("media", mid, aud.d);
  }
  S.messages[to].push(local);
  S.contacts[to].last = ts;
  save();
  renderMessages();
  renderList();
  try {
    const payload = { k: "m", t: text, o: !!once, n: S.me.name || "", av: S.me.av || 0 };
    if (imgB64) payload.img = imgB64;
    if (file) payload.file = file;
    if (aud) payload.aud = aud;
    if (vid) payload.vid = vid;
    if (gif) payload.gif = gif;
    if (meet) payload.meet = meet;
    const { iv, ct } = await encryptFor(to, mid, payload);
    await api("send", { body: { to, mid, iv, ct } });
    local.status = "sent";
  } catch (e) {
    local.status = "failed";
    if (e.status === 403) refreshMe();
    toast("Senden fehlgeschlagen: " + e.message);
  }
  save();
  renderMessages();
}

async function sendGroupMessage({ text, imgB64, file, aud, vid, gif, meet }) {
  const gid = currentChat;
  const g = S.groups[gid];
  if (!g || g.removed) return toast("Du bist nicht mehr in dieser Gruppe.");
  const mid = newMid();
  const ts = Date.now();
  const local = { mid, dir: "out", ts, from: S.me.id, text, status: "pending" };
  if (imgB64) {
    local.img = true;
    await idbPut("media", mid, imgB64);
  }
  if (file) {
    local.file = { name: file.name, type: file.type, size: file.size };
    await idbPut("media", mid, file.d);
  }
  if (aud) {
    local.aud = { type: aud.type, dur: aud.dur, w: aud.w };
    await idbPut("media", mid, aud.d);
  }
  if (vid) local.vid = vid;
  if (gif) local.gif = gif;
  if (meet) local.meet = meet;
  S.messages[gid].push(local);
  g.last = ts;
  save();
  renderMessages();
  renderList();
  try {
    const targets = Object.entries(g.members)
      .filter(([id, m]) => id !== S.me.id && m.st === "active")
      .map(([id]) => id);
    if (!targets.length) {
      local.status = "sent";
      toast("Noch ist niemand der Gruppe beigetreten.");
    } else {
      for (const id of targets) await ensurePeer(id);
      // Inhalt einmal mit Zufallsschlüssel verschlüsseln, Schlüssel pro Mitglied einzeln verpacken
      const K = rand(32);
      const body = { k: "m", t: text, n: S.me.name || "", av: S.me.av || 0 };
      if (imgB64) body.img = imgB64;
      if (file) body.file = file;
      if (aud) body.aud = aud;
      if (vid) body.vid = vid;
      if (gif) body.gif = gif;
      if (meet) body.meet = meet;
      const b = await aesSeal(K, body, `${gid}|${mid}`);
      const envs = [];
      for (const id of targets) envs.push({ to: id, ...(await encryptFor(id, mid, { k: "g", gid, bk: b64u(K) })) });
      await api("gsend", { body: { gid, mid, b, envs } });
      local.status = "sent";
    }
  } catch (e) {
    local.status = "failed";
    if (e.status === 403) refreshMe();
    toast("Senden fehlgeschlagen: " + e.message);
  }
  save();
  renderMessages();
}

// Steuernachricht (verschlüsselt, direkt an eine Person)
async function sendCtl(to, payload, silent = true) {
  await ensurePeer(to);
  const mid = newMid();
  const { iv, ct } = await encryptFor(to, mid, payload);
  await api("send", { body: { to, mid, iv, ct, silent } });
}
async function sendReceipt(to, ref) {
  try {
    await sendCtl(to, { k: "r", ref });
  } catch {}
}

/* ================= Gruppen ================= */
const groupPayload = (g) => ({
  gid: g.id,
  name: g.name,
  admin: g.admin,
  members: Object.fromEntries(Object.entries(g.members).map(([id, m]) => [id, { st: m.st }])),
});

async function createGroup(name, ids) {
  const gid = "g_" + b64u(rand(12));
  const members = { [S.me.id]: { st: "active" } };
  for (const id of ids) members[id] = { st: "invited" };
  const g = (S.groups[gid] = { id: gid, name, admin: S.me.id, members, created: Date.now(), last: Date.now(), unread: 0 });
  S.messages[gid] = [];
  sysMsg(gid, `Du hast die Gruppe „${name}“ erstellt.`);
  save();
  for (const id of ids) sendCtl(id, { k: "gi", ...groupPayload(g) }, false).catch(() => {});
  openChat(gid);
}

async function addGroupMembers(gid, ids) {
  const g = S.groups[gid];
  if (!g || g.admin !== S.me.id) return;
  const existing = Object.keys(g.members).filter((id) => id !== S.me.id);
  for (const id of ids) g.members[id] = { st: "invited" };
  sysMsg(gid, `Du hast ${ids.map(memberName).join(", ")} eingeladen.`);
  save();
  for (const id of ids) sendCtl(id, { k: "gi", ...groupPayload(g) }, false).catch(() => {});
  for (const id of existing) sendCtl(id, { k: "gu", ...groupPayload(g) }).catch(() => {});
  renderMessages();
}

async function removeGroupMember(gid, id) {
  const g = S.groups[gid];
  if (!g || g.admin !== S.me.id || id === S.me.id) return;
  delete g.members[id];
  sysMsg(gid, `Du hast ${memberName(id)} entfernt.`);
  save();
  const payload = { k: "gu", ...groupPayload(g) };
  for (const m of [...Object.keys(g.members), id]) if (m !== S.me.id) sendCtl(m, payload).catch(() => {});
  renderMessages();
}

async function renameGroup(gid, name) {
  const g = S.groups[gid];
  if (!g || g.admin !== S.me.id || !name) return;
  g.name = name;
  sysMsg(gid, `Du hast die Gruppe in „${name}“ umbenannt.`);
  save();
  for (const id of Object.keys(g.members)) if (id !== S.me.id) sendCtl(id, { k: "gu", ...groupPayload(g) }).catch(() => {});
  renderChatHead();
  renderList();
  renderMessages();
}

async function leaveGroup(gid) {
  const g = S.groups[gid];
  if (!g) return;
  for (const id of Object.keys(g.members)) if (id !== S.me.id && !g.removed) sendCtl(id, { k: "gl", gid }).catch(() => {});
  for (const m of S.messages[gid] || []) await dropMedia(m.mid);
  delete S.groups[gid];
  delete S.messages[gid];
  save();
  closeChat();
  $("#chat").classList.add("no-chat");
  renderList();
}

async function joinGroup(info, inviter) {
  const g = (S.groups[info.gid] = {
    id: info.gid,
    name: info.name,
    admin: info.admin,
    members: info.members,
    created: Date.now(),
    last: Date.now(),
    unread: 1,
  });
  g.members[S.me.id] = { st: "active" };
  S.messages[info.gid] = S.messages[info.gid] || [];
  sysMsg(info.gid, `${memberName(inviter)} hat dich zur Gruppe hinzugefügt.`);
  const inv = S.invites?.[info.gid];
  if (inv) inv.status = "accepted";
  save();
  for (const id of Object.keys(g.members)) if (id !== S.me.id) sendCtl(id, { k: "gj", gid: info.gid }).catch(() => {});
  renderList();
}

function validGroupInfo(p) {
  if (!GID_RE.test(p.gid || "") || typeof p.name !== "string" || typeof p.admin !== "string") return null;
  if (!p.members || typeof p.members !== "object") return null;
  const members = {};
  for (const [id, m] of Object.entries(p.members).slice(0, 64)) {
    if (/^[A-HJ-NP-Z2-9]{8}$/.test(id)) members[id] = { st: m?.st === "active" ? "active" : "invited" };
  }
  if (!members[S.me.id] || !members[p.admin]) return null;
  return { gid: p.gid, name: p.name.slice(0, 40), admin: p.admin, members };
}

async function acceptInvite(gid) {
  const inv = S.invites?.[gid];
  if (!inv || inv.status !== "pending") return;
  await joinGroup(inv.info, inv.from);
  openChat(gid);
}
async function declineInvite(gid) {
  const inv = S.invites?.[gid];
  if (!inv || inv.status !== "pending") return;
  inv.status = "declined";
  save();
  sendCtl(inv.from, { k: "gx", gid }).catch(() => {});
  if (inv.info.admin !== inv.from) sendCtl(inv.info.admin, { k: "gx", gid }).catch(() => {});
  renderMessages();
}

// Steuernachrichten für Gruppen verarbeiten – gibt true zurück, wenn etwas geändert wurde
async function handleGroupCtl(from, p, m) {
  const g = S.groups[p.gid];
  if (p.k === "gi") {
    const info = validGroupInfo(p);
    if (!info) return false;
    if (g && !g.removed) {
      // schon Mitglied – nur Mitgliederliste vom Admin übernehmen
      if (from !== g.admin) return false;
      g.name = info.name;
      for (const [id, mm] of Object.entries(info.members)) if (!g.members[id]) g.members[id] = mm;
      return true;
    }
    if (S.settings.autoGroup) {
      await joinGroup(info, from);
    } else {
      S.invites[info.gid] = { info, from, ts: m.ts, status: "pending" };
      const list = (S.messages[from] = S.messages[from] || []);
      list.push({ mid: m.mid, dir: "in", ts: m.ts, invite: info.gid });
      const c = S.contacts[from];
      c.last = m.ts;
      c.peer = false;
      if (currentChat !== from || document.hidden) c.unread = (c.unread || 0) + 1;
    }
    return true;
  }
  if (!g) return false;
  if (p.k === "gj" && g.members[from]) {
    if (g.members[from].st !== "active") {
      g.members[from].st = "active";
      sysMsg(g.id, `${memberName(from)} ist der Gruppe beigetreten.`);
    }
    return true;
  }
  if (p.k === "gx" && g.members[from]?.st === "invited") {
    delete g.members[from];
    sysMsg(g.id, `${memberName(from)} hat die Einladung abgelehnt.`);
    return true;
  }
  if (p.k === "gl" && g.members[from]) {
    delete g.members[from];
    sysMsg(g.id, `${memberName(from)} hat die Gruppe verlassen.`);
    return true;
  }
  if (p.k === "gu" && from === g.admin) {
    const info = validGroupInfo({ ...p, members: { ...p.members, [S.me.id]: p.members?.[S.me.id] } });
    if (!p.members?.[S.me.id]) {
      g.removed = true;
      sysMsg(g.id, `${memberName(from)} hat dich aus der Gruppe entfernt.`);
      return true;
    }
    if (!info) return false;
    if (info.name !== g.name) sysMsg(g.id, `${memberName(from)} hat die Gruppe in „${info.name}“ umbenannt.`);
    const before = new Set(Object.keys(g.members));
    g.name = info.name;
    const mine = g.members[S.me.id];
    g.members = info.members;
    g.members[S.me.id] = mine || { st: "active" };
    for (const id of Object.keys(g.members)) if (!before.has(id)) sysMsg(g.id, `${memberName(id)} wurde eingeladen.`);
    for (const id of before) if (!g.members[id]) sysMsg(g.id, `${memberName(id)} wurde entfernt.`);
    return true;
  }
  return false;
}

/* ================= Empfangen ================= */
let polling = false;
async function poll() {
  if (polling || !S.me) return;
  polling = true;
  try {
    const { messages } = await api(`inbox${!document.hidden && !S.settings.hideOnline ? "?v=1" : ""}`);
    const acks = [];
    let changed = false;
    for (const m of messages) {
      acks.push(m.key);
      try {
        if (S.contacts[m.from]?.blocked) continue;
        if (!S.contacts[m.from]) await addContactByCode(m.from, { open: false, peer: true });
        const p = await decryptFrom(m.from, m.mid, m.iv, m.ct);
        const c = S.contacts[m.from];
        if (p.k === "r") {
          for (const list of Object.values(S.messages)) {
            const orig = list.find((x) => x.mid === p.ref && x.dir === "out");
            if (orig) orig.status = "opened";
          }
          changed = true;
          continue;
        }
        if (p.k === "call") {
          if (calls?.handleCallCtl(m.from, p, m)) changed = true;
          continue;
        }
        if (p.k === "seen") {
          if (handleSeen(m.from, p)) changed = true;
          continue;
        }
        if (["gi", "gj", "gx", "gl", "gu"].includes(p.k)) {
          if (await handleGroupCtl(m.from, p, m)) changed = true;
          continue;
        }
        let chatId = m.from;
        let q = p;
        if (p.k === "g") {
          // Gruppennachricht
          const g = S.groups[p.gid];
          if (!g || g.removed || !g.members[m.from] || !m.body || typeof p.bk !== "string") continue;
          q = await aesOpenJson(unb64u(p.bk), m.body, `${p.gid}|${m.mid}`);
          if (g.members[m.from].st !== "active") g.members[m.from].st = "active";
          chatId = p.gid;
        }
        if (q.k !== "m" || typeof q.t !== "string") continue;
        const list = (S.messages[chatId] = S.messages[chatId] || []);
        if (list.some((x) => x.mid === m.mid)) continue;
        if (q.n && typeof q.n === "string") c.name = q.n.slice(0, 24);
        if (typeof q.av === "number" && q.av !== c.av) c.av = q.av;
        const msg = { mid: m.mid, dir: "in", ts: m.ts, from: m.from, once: chatId === m.from && !!q.o, text: q.t.slice(0, 4000) };
        if (typeof q.img === "string") {
          msg.img = true;
          await idbPut("media", m.mid, q.img);
        }
        if (q.file && typeof q.file.d === "string" && typeof q.file.name === "string") {
          msg.file = { name: q.file.name.slice(0, 120), type: String(q.file.type || "").slice(0, 100), size: Number(q.file.size) || 0 };
          await idbPut("media", m.mid, q.file.d);
        }
        if (q.aud && typeof q.aud.d === "string") {
          msg.aud = {
            type: /^audio\/[a-z0-9.+-]+$/i.test(q.aud.type || "") ? q.aud.type : "audio/webm",
            dur: Math.min(600, Number(q.aud.dur) || 0),
            w: Array.isArray(q.aud.w) ? q.aud.w.slice(0, 48).map((x) => Math.max(1, Math.min(20, Number(x) || 1))) : [],
          };
          await idbPut("media", m.mid, q.aud.d);
        }
        const cleanRef = (r) =>
          r && /^[A-Za-z0-9_-]{16}$/.test(r.id) && Number.isInteger(r.b) && Number.isInteger(r.n) && r.n > 0 && r.n <= 10 && typeof r.k === "string" && typeof r.iv === "string"
            ? { id: r.id, b: r.b, n: r.n, k: r.k, iv: r.iv, type: String(r.type || "").slice(0, 60), size: Number(r.size) || 0 }
            : null;
        const cleanPoster = (x) => (typeof x === "string" && x.length < 200000 && /^[A-Za-z0-9+/=]+$/.test(x) ? x : undefined);
        if (q.vid && cleanRef(q.vid.ref)) {
          msg.vid = { ref: cleanRef(q.vid.ref), dur: Math.min(600, Number(q.vid.dur) || 0), w: Number(q.vid.w) || 0, h: Number(q.vid.h) || 0, poster: cleanPoster(q.vid.poster) };
        }
        if (q.meet && /^[A-HJ-NP-Z2-9]{6}$/.test(q.meet.code || "")) msg.meet = { code: q.meet.code, title: String(q.meet.title || "").slice(0, 40) };
        if (q.gif) {
          if (typeof q.gif.p === "string" && PIXEL_GIFS.includes(q.gif.p)) msg.gif = { p: q.gif.p };
          else if (cleanRef(q.gif.ref)) msg.gif = { ref: cleanRef(q.gif.ref), w: Number(q.gif.w) || 0, h: Number(q.gif.h) || 0, poster: cleanPoster(q.gif.poster) };
        }
        // Rohdaten 24 h aufbewahren, damit die Nachricht überprüfbar gemeldet werden kann
        await idbPut("raw", m.mid, { iv: m.iv, ct: m.ct, ts: m.ts, body: m.body || null });
        list.push(msg);
        const holder = isGroup(chatId) ? S.groups[chatId] : c;
        if (!isGroup(chatId)) c.peer = false;
        holder.last = m.ts;
        if (currentChat !== chatId || document.hidden) holder.unread = (holder.unread || 0) + 1;
        changed = true;
      } catch (e) {
        console.warn("Nachricht konnte nicht entschlüsselt werden", e);
      }
    }
    if (changed) {
      save();
      renderList();
      if (currentChat) {
        renderChatHead();
        renderMessages();
        markSeenSoon();
      }
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
  for (const [gid, inv] of Object.entries(S.invites)) if (now - inv.ts > TTL) delete S.invites[gid];
  for (const k of Object.keys(S.storySeen)) if (now - S.storySeen[k] > TTL) delete S.storySeen[k];
  for (const [k, v] of Object.entries(S.myStories)) if (now - v.ts > TTL) delete S.myStories[k];
  if (changed) save();
  for (const store of ["media", "raw"]) {
    for (const k of await idbKeys(store)) if (!keep.has(String(k).replace(/^[vg]:/, ""))) await dropMedia(k);
  }
  renderList();
  if (currentChat) renderMessages();
}

/* ================= Rendering ================= */
function avatarColor(id) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h}, 70%, ${55 + (h % 15)}%)`;
}
function fillAvatar(node, c, letterSrc) {
  node.textContent = "";
  node.classList.remove("group-av");
  node.style.background = avatarColor(c.id);
  const letter = () => {
    const first = Array.from(letterSrc || displayName(c))[0] || "?";
    if (isEmoji(first)) renderRich(node, first);
    else node.textContent = first.toUpperCase();
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
function fillGroupAvatar(node, g) {
  node.textContent = "";
  node.classList.add("group-av");
  node.style.background = avatarColor(g.id);
  const first = Array.from(g.name || "G")[0];
  if (isEmoji(first)) renderRich(node, first);
  else node.textContent = first.toUpperCase();
  node.append(el("span", "group-badge", "👥"));
}
const rich = (tag, cls, text) => renderRich(el(tag, cls), text);

function fmtSize(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(".", ",") + " MB";
  return Math.max(1, Math.round(n / 1000)) + " KB";
}
function previewOf(m, isGrp) {
  if (!m) return "Noch keine Nachrichten";
  if (m.dir === "sys") return m.text;
  if (m.invite) return "📨 Gruppen-Einladung";
  const who = m.dir === "out" ? "Du: " : isGrp ? memberName(m.from) + ": " : "";
  if (m.once) return m.dir === "in" ? (m.opened ? "👁 Geöffnet" : "👁 Einmal-Nachricht") : "👁 Einmal-Nachricht gesendet";
  if (m.aud) return who + "🎤 Sprachnachricht (" + fmtDur(m.aud.dur) + ")";
  if (m.vid) return who + "🎬 Video (" + fmtDur(m.vid.dur) + ")";
  if (m.meet) return who + "📹 Meeting-Einladung";
  if (m.gif) return who + "GIF";
  if (m.file) return who + "📎 " + m.file.name;
  if (m.img) return who + "🖼 " + (m.text || "Bild");
  return who + m.text;
}

function renderList() {
  const list = $("#chatList");
  list.textContent = "";
  const items = [];
  for (const c of Object.values(S.contacts)) {
    if (c.peer && !(S.messages[c.id] || []).length) continue;
    items.push({ id: c.id, online: isOnline(c.id), last: c.last || 0, unread: c.unread, name: (c.acctBanned ? "⛔ " : c.blocked ? "🚫 " : "") + displayName(c), fill: (n) => fillAvatar(n, c) });
  }
  for (const g of Object.values(S.groups)) {
    items.push({ id: g.id, last: g.last || 0, unread: g.unread, name: g.name, grp: true, fill: (n) => fillGroupAvatar(n, g) });
  }
  items.sort((a, b) => b.last - a.last);
  $("#emptyList").classList.toggle("hidden", items.length > 0);
  for (const it of items) {
    const msgs = S.messages[it.id] || [];
    const last = msgs[msgs.length - 1];
    const b = el("button", "chat-item" + (it.id === currentChat ? " active" : ""));
    const av = el("div", "avatar");
    it.fill(av);
    const meta = el("div", "meta");
    const r1 = el("div", "row");
    r1.append(rich("span", "name", it.name), el("span", "time", last ? fmtTime(last.ts) : ""));
    const r2 = el("div", "row");
    r2.append(rich("span", "preview", previewOf(last, it.grp)));
    if (it.unread) r2.append(el("span", "badge", String(it.unread)));
    meta.append(r1, r2);
    b.append(av, meta);
    if (it.online) b.append(el("span", "online-dot"));
    b.onclick = () => openChat(it.id);
    list.append(b);
  }
}

function fileCard(m) {
  const card = el("div", "file-card");
  const ext = (m.file.name.split(".").pop() || "").slice(0, 4).toUpperCase();
  card.append(el("div", "file-icon", ext || "📎"));
  const meta = el("div", "file-meta");
  meta.append(el("div", "file-name", m.file.name), el("div", "file-size", fmtSize(m.file.size)));
  card.append(meta);
  const dl = el("button", "file-dl", "⬇");
  dl.title = "Speichern";
  dl.onclick = async (e) => {
    e.stopPropagation();
    const b64 = await idbGet("media", m.mid);
    if (!b64) return toast("Datei ist nicht mehr verfügbar.");
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/octet-stream" }));
    const a = el("a");
    a.href = url;
    a.download = m.file.name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };
  card.append(dl);
  return card;
}

function inviteCard(m) {
  const inv = S.invites[m.invite];
  const d = el("div", "msg in invite");
  d.append(el("div", "invite-title", "📨 Gruppen-Einladung"));
  if (!inv) {
    d.append(el("div", "small muted", "Diese Einladung ist abgelaufen."));
    return d;
  }
  d.append(rich("div", "invite-name", inv.info.name));
  d.append(el("div", "small muted", `${Object.keys(inv.info.members).length} Mitglieder · von ${memberName(inv.from)}`));
  if (inv.status === "pending") {
    const row = el("div", "btn-row");
    const yes = el("button", "btn primary", "Annehmen");
    yes.onclick = (e) => {
      e.stopPropagation();
      acceptInvite(m.invite);
    };
    const no = el("button", "btn", "Ablehnen");
    no.onclick = (e) => {
      e.stopPropagation();
      declineInvite(m.invite);
    };
    row.append(yes, no);
    d.append(row);
  } else d.append(el("div", "small accent", inv.status === "accepted" ? "✓ Angenommen" : "Abgelehnt"));
  return d;
}

function renderMessages() {
  if (!currentChat) return;
  const box = $("#messages");
  const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
  box.textContent = "";
  const grp = isGroup(currentChat);
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
  if (grp && S.groups[currentChat]?.removed) box.append(el("div", "sys-note", "Du bist kein Mitglied dieser Gruppe mehr."));
  let prevFrom = null;
  for (const m of S.messages[currentChat] || []) {
    if (m.dir === "sys") {
      box.append(rich("div", "sys-note small-note", m.text));
      prevFrom = null;
      continue;
    }
    if (m.invite) {
      box.append(inviteCard(m));
      prevFrom = null;
      continue;
    }
    const d = el("div", `msg ${m.dir}`);
    if (!seenMids.has(m.mid)) {
      seenMids.add(m.mid);
      if (!renderMessages.force) d.classList.add("new");
    }
    if (grp && m.dir === "in" && m.from !== prevFrom) {
      const s = rich("div", "sender", memberName(m.from));
      s.style.color = avatarColor(m.from);
      d.append(s);
    }
    prevFrom = m.dir === "in" ? m.from : null;
    const info = el("div", "info");
    const parts = [fmtTime(m.ts), fmtLeft(m.ts)];
    if (m.dir === "out") {
      const seenGrp = grp && m.seenBy?.length;
      if (m.status !== "seen" && !seenGrp)
        parts.push(m.status === "pending" ? "…" : m.status === "failed" ? "⚠ nicht gesendet" : m.status === "opened" ? "✓✓ geöffnet" : "✓");
    }
    info.textContent = parts.join(" · ");
    if (m.dir === "out" && m.status === "seen") info.append(" · ", eyeImg("Gesehen"));
    if (m.dir === "out" && grp && m.seenBy?.length) {
      info.append(" · ", eyeImg("Gesehen von: " + m.seenBy.map(memberName).join(", ")));
      info.append(el("span", "seen-count", String(m.seenBy.length)));
    }
    if (m.once) {
      d.classList.add("once");
      const badge = el("span", "once-badge", "1");
      const kind = m.img ? "Einmal-Bild" : m.aud ? "Einmal-Sprachnachricht" : "Einmal-Nachricht";
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
      if (m.meet) {
        d.classList.add("has-meet");
        const card = el("div", "meet-card");
        card.append(el("div", "meet-title", "📹 " + (m.meet.title ? `Meeting „${m.meet.title}“` : "Meeting")));
        card.append(el("div", "meet-code", "Code " + m.meet.code.slice(0, 3) + " " + m.meet.code.slice(3)));
        const join = el("button", "btn primary small-btn", "Beitreten");
        join.onclick = (e) => {
          e.stopPropagation();
          calls.joinMeeting(m.meet.code, { title: m.meet.title });
        };
        card.append(join);
        d.append(card);
      }
      if (m.vid) {
        d.classList.add("has-video");
        d.append(videoCard(m));
      }
      if (m.gif) {
        d.classList.add("has-gif");
        d.append(gifNode(m));
      }
      if (m.aud) {
        d.classList.add("has-voice");
        d.append(voicePlayer(m));
      }
      if (m.file) {
        d.classList.add("has-file");
        d.append(fileCard(m));
        if (/^audio\//.test(m.file.type || "")) d.append(voicePlayer({ mid: m.mid, aud: { type: m.file.type, dur: 0, w: [] } }));
      }
      if (m.text) d.append(rich("div", "msg-text", m.text));
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
  const n = [...Object.values(S.contacts), ...Object.values(S.groups)].reduce((a, c) => a + (c.unread || 0), 0);
  document.title = n ? `(${n}) Pixelkingschat` : "Pixelkingschat";
  if ("setAppBadge" in navigator) (n ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => {});
}

function renderMe() {
  $("#myCodeText").textContent = S.me.id;
  fillAvatar($("#meAvatar"), { id: S.me.id, av: S.me.av }, S.me.name || S.me.id);
}

function renderChatHead() {
  const id = currentChat;
  if (!id) return;
  if (isGroup(id)) {
    const g = S.groups[id];
    if (!g) return;
    fillGroupAvatar($("#chatAvatar"), g);
    renderRich($("#chatName"), g.name);
    const n = Object.values(g.members).filter((m) => m.st === "active").length;
    $("#chatSub").textContent = `${n} Mitglied${n === 1 ? "" : "er"} · 🔐 verschlüsselt`;
  } else {
    const c = S.contacts[id];
    if (!c) return;
    fillAvatar($("#chatAvatar"), c);
    renderRich($("#chatName"), displayName(c));
    const ls = lastSeenText(c.id);
    $("#chatSub").textContent = c.acctBanned ? `⛔ Dieses Konto wurde gesperrt` : ls ? ls : `Code ${c.id} · 🔐 verschlüsselt`;
    $("#chatSub").classList.toggle("is-online", ls === "online" && !c.acctBanned);
  }
}

function openChat(id) {
  const holder = isGroup(id) ? S.groups[id] : S.contacts[id];
  if (!holder) return;
  currentChat = id;
  holder.unread = 0;
  if (!isGroup(id)) holder.peer = false;
  save();
  $("#chat").classList.remove("no-chat");
  $("#app").classList.add("chat-open");
  if (onceMode && isGroup(id)) toggleOnce();
  $("#onceBtn").classList.toggle("hidden", isGroup(id));
  renderChatHead();
  applyWallpaper(id);
  $("#videoBtn").classList.toggle("hidden", isGroup(id));
  $("#callBtn").title = isGroup(id) ? "Gruppenanruf (Meeting)" : "Anrufen";
  renderMessages.force = true;
  renderMessages();
  renderList();
  updateTitle();
  if (!isGroup(id)) refreshProfile(id);
  markSeenSoon();
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
  updateModBanner();
}

/* ================= Moderation: Sperren, Timeouts, entfernte Nachrichten ================= */
function fmtUntil(ts) {
  return new Date(ts).toLocaleString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function timedOut() {
  return S.me.timeoutUntil && S.me.timeoutUntil > Date.now();
}
function sendBlocked() {
  if (S.me.banned) {
    toast("⛔ Dein Konto ist gesperrt.");
    return true;
  }
  if (timedOut()) {
    toast(`⏳ Du bist bis ${fmtUntil(S.me.timeoutUntil)} Uhr vorübergehend gesperrt.`);
    return true;
  }
  return false;
}
function updateModBanner() {
  const b = $("#bannedBanner");
  if (!b || !S.me) return;
  if (S.me.banned) b.textContent = "⛔ Dein Konto wurde wegen Verstößen gegen die Regeln dauerhaft gesperrt. Du kannst keine Nachrichten mehr senden.";
  else if (timedOut()) b.textContent = `⏳ Vorübergehend gesperrt bis ${fmtUntil(S.me.timeoutUntil)} Uhr – bis dahin kannst du nichts senden.`;
  b.classList.toggle("hidden", !(S.me.banned || timedOut()));
  $("#composer")?.classList.toggle("blocked", !!(S.me.banned || timedOut()));
}
function showNotice(n) {
  const body = el("div", "stack");
  const titles = { ban: "⛔ Konto gesperrt", timeout: "⏳ Vorübergehend gesperrt", warn: "⚠️ Verwarnung" };
  body.append(el("h2", null, titles[n.kind] || "Hinweis"));
  body.append(el("p", null, n.reason || "Deine Inhalte verstoßen gegen die Regeln von Pixelkingschat."));
  const what = [];
  if (n.deleted) what.push("Deine Nachrichten wurden aus allen Chats entfernt.");
  if (n.kind === "ban") what.push("Dein Konto wurde dauerhaft gesperrt. Du kannst keine Nachrichten, Stories oder Bilder mehr senden.");
  if (n.kind === "timeout" && n.until) what.push(`Du kannst bis ${fmtUntil(n.until)} Uhr keine Nachrichten senden.`);
  if (n.kind === "warn") what.push("Bei weiteren Verstößen wird dein Konto gesperrt.");
  for (const w of what) body.append(el("p", "small muted", w));
  const ok = el("button", "btn primary big", "Verstanden");
  ok.onclick = closeModal;
  body.append(ok);
  openModal(body, () => api("me/notice", { method: "DELETE" }).catch(() => {}));
}
async function refreshMe() {
  try {
    const r = await api("me");
    S.me.banned = !!r.banned;
    S.me.timeoutUntil = r.timeoutUntil || 0;
    if (r.av !== S.me.av) {
      S.me.av = r.av;
      renderMe();
    }
    if (r.purgeBefore && r.purgeBefore !== S.me.purgedAt) {
      // eigene Nachrichten wurden wegen eines Verstoßes entfernt
      S.me.purgedAt = r.purgeBefore;
      for (const chatId of Object.keys(S.messages)) {
        const before = S.messages[chatId].length;
        const keep = [];
        for (const m of S.messages[chatId]) {
          if (m.dir === "out" && m.ts <= r.purgeBefore) await dropMedia(m.mid);
          else keep.push(m);
        }
        if (keep.length !== before) {
          S.messages[chatId] = keep;
          sysMsg(chatId, "Deine Nachrichten wurden wegen eines Regelverstoßes entfernt.");
        }
      }
      renderList();
      if (currentChat) renderMessages();
    }
    save();
    updateModBanner();
    if (r.notice && r.notice.ts !== S.me.noticeSeen) {
      S.me.noticeSeen = r.notice.ts;
      save();
      showNotice(r.notice);
    }
  } catch {}
}
// Kontakte prüfen: gesperrte Konten markieren, entfernte Nachrichten löschen
async function pollModeration() {
  const ids = Object.keys(S.contacts);
  if (!ids.length) return;
  try {
    const { mod } = await api(`mod?ids=${ids.join(",")}`);
    let changed = false;
    for (const id of ids) {
      const c = S.contacts[id];
      const st = mod[id];
      const banned = !!st?.b;
      if (!!c.acctBanned !== banned) {
        c.acctBanned = banned;
        changed = true;
      }
      const p = st?.p || 0;
      if (p && p !== c.purgedAt) {
        c.purgedAt = p;
        changed = true;
        for (const chatId of Object.keys(S.messages)) {
          const before = S.messages[chatId].length;
          const keep = [];
          for (const m of S.messages[chatId]) {
            const fromThem = m.dir === "in" && (m.from === id || (chatId === id && !m.from));
            if (fromThem && m.ts <= p) await dropMedia(m.mid);
            else keep.push(m);
          }
          if (keep.length !== before) {
            S.messages[chatId] = keep;
            sysMsg(chatId, `Nachrichten von ${displayName(c)} wurden wegen eines Regelverstoßes entfernt.`);
          }
        }
        if (S.stories[id]) delete S.stories[id];
      }
    }
    if (changed) {
      save();
      renderList();
      renderStoryBar();
      if (currentChat) {
        renderChatHead();
        renderMessages();
      }
    }
  } catch {}
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
  body.append(el("h2", null, m.img ? "👁 Einmal-Bild" : m.aud ? "👁 Einmal-Sprachnachricht" : "👁 Einmal-Nachricht"));
  body.append(el("p", "small muted", "Wird gelöscht, sobald du dieses Fenster schließt."));
  const v = el("div", "once-view");
  if (m.img) {
    const img = el("img", "once-img");
    img.alt = "";
    const u = await mediaUrl(m.mid);
    if (u) img.src = u;
    v.append(img);
  }
  if (m.aud) v.append(voicePlayer(m));
  if (m.text) v.append(rich("div", null, m.text));
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
  stopVoice();
  m.text = "";
  m.opened = true;
  dropMedia(m.mid);
  save();
  renderMessages();
  renderList();
  sendReceipt(from, m.mid);
}

/* ================= Bilder & Dateien ================= */
async function showImage(m) {
  const body = el("div", "stack");
  const img = el("img", "full-img");
  img.alt = "";
  const u = await mediaUrl(m.mid);
  if (u) img.src = u;
  body.append(img);
  if (m.text) body.append(rich("p", null, m.text));
  if (m.dir === "in") {
    const rep = el("button", "btn danger", "⚑ Bild melden");
    rep.onclick = () => showReport({ type: "message", target: m.from || currentChat, mids: [m.mid] });
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
  body.append(prev, cap);
  const cb = el("input");
  cb.type = "checkbox";
  cb.checked = onceMode;
  if (!isGroup(currentChat)) {
    const lab = el("label", "check");
    lab.append(cb, " 👁 Nur einmal ansehen");
    body.append(lab);
  }
  const send = el("button", "btn primary big", "🔐 Verschlüsselt senden");
  send.onclick = () => {
    const once = cb.checked && !isGroup(currentChat);
    closeModal();
    sendMessage({ text: cap.value.trim(), imgB64: b64, once });
    if (onceMode) toggleOnce();
  };
  body.append(send);
  openModal(body);
}

function readAsB64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).slice(String(r.result).indexOf(",") + 1));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

async function pickFileToSend(file) {
  if (!currentChat) return;
  if (file.size > MAX_FILE) return toast(`Datei ist zu groß (${fmtSize(file.size)}). Maximal 2,5 MB.`);
  const body = el("div", "stack");
  body.append(el("h2", null, "Datei senden"));
  body.append(fileCard({ mid: "-", file: { name: file.name, size: file.size } }));
  body.querySelector(".file-dl")?.remove();
  const cap = el("input");
  cap.placeholder = "Nachricht dazu (optional)";
  cap.maxLength = 500;
  const send = el("button", "btn primary big", "🔐 Verschlüsselt senden");
  send.onclick = async () => {
    send.disabled = true;
    try {
      const d = await readAsB64(file);
      closeModal();
      sendMessage({
        text: cap.value.trim(),
        file: { name: file.name.slice(0, 120), type: (file.type || "application/octet-stream").slice(0, 100), size: file.size, d },
      });
    } catch {
      toast("Datei konnte nicht gelesen werden.");
      send.disabled = false;
    }
  };
  body.append(cap, send);
  openModal(body);
}

/* ================= Nachricht-Aktionen ================= */
function messageActions(m) {
  const body = el("div", "stack");
  body.append(el("h2", null, "Nachricht"));
  if (isGroup(currentChat)) body.append(el("p", "small muted", "von " + memberName(m.from)));
  if (m.text) {
    body.append(rich("div", "quote", m.text));
    const copyBtn = el("button", "btn", "Text kopieren");
    copyBtn.onclick = () => {
      copy(m.text);
      closeModal();
    };
    body.append(copyBtn);
  }
  const rep = el("button", "btn danger", "⚑ Nachricht melden");
  rep.onclick = () => showReport({ type: "message", target: m.from || currentChat, mids: [m.mid] });
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

function showReport({ type, target, mids = [], after, skey, key }) {
  const body = el("div", "stack");
  const titles = { message: "Nachricht melden", chat: "Chat melden", avatar: "Profilbild melden", story: "Story melden" };
  body.append(el("h2", null, "⚑ " + titles[type]));
  const expl = {
    message: "Die gemeldete Nachricht wird zur Prüfung übermittelt. Alle anderen Nachrichten bleiben privat.",
    chat: "Die letzten empfangenen Nachrichten dieses Kontakts werden zur Prüfung übermittelt. Deine eigenen Nachrichten bleiben privat.",
    avatar: "Das Profilbild wird zur Prüfung übermittelt.",
    story: "Die Story wird zur Prüfung übermittelt.",
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
      if (type === "message" || type === "chat") {
        let ids = mids;
        if (type === "chat") ids = (S.messages[target] || []).filter((m) => m.dir === "in").slice(-20).map((m) => m.mid);
        for (const mid of ids) {
          const raw = await idbGet("raw", mid);
          if (!raw) continue;
          const it = { mid, ts: raw.ts, iv: raw.iv, ct: raw.ct, k: b64u(await msgKeyBytes(target, mid)) };
          if (raw.body) it.body = raw.body;
          items.push(it);
        }
        if (!items.length) throw new Error("Keine Nachrichten gefunden, die gemeldet werden können.");
      }
      const res = await api("report", { body: { type, target, reason: picked, items, skey, k: key } });
      if (res.applied) pollModeration();
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
  if (isGroup(currentChat)) return showGroupInfo();
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
  const wp = el("button", "btn", "🖼 Hintergrund für diesen Chat");
  wp.onclick = () => showWallpaperPicker(c.id);
  root.append(wp, clear, del);
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
  lab.append(el("span", null, "Dein Anzeigename (sehen alle, die deinen Code haben)"));
  const inp = el("input");
  inp.value = S.me.name || "";
  inp.maxLength = 24;
  inp.placeholder = "Anonym";
  lab.append(inp);
  const sb = el("button", "btn", "Speichern");
  sb.onclick = async () => {
    S.me.name = inp.value.trim().slice(0, 24);
    save();
    renderMe();
    try {
      await syncMyName();
      toast("Gespeichert ✓ – deine Kontakte sehen jetzt „" + (S.me.name || "Anonym") + "“");
    } catch (e) {
      toast(e.message);
    }
  };
  root.append(lab, sb, el("hr"));

  root.append(el("strong", null, "🎨 Farbe"));
  const sw = el("div", "swatches");
  for (const [hex, name] of ACCENTS) {
    const b = el("button", "swatch" + (S.settings.accent === hex ? " active" : ""));
    b.style.background = hex;
    b.title = name;
    b.setAttribute("aria-label", name);
    b.onclick = () => {
      setThemeSetting({ accent: hex });
      showSettings();
    };
    sw.append(b);
  }
  const custom = el("label", "swatch custom");
  custom.title = "Eigene Farbe";
  const ci = el("input");
  ci.type = "color";
  ci.value = S.settings.accent;
  ci.oninput = () => setThemeSetting({ accent: ci.value });
  ci.onchange = () => showSettings();
  custom.append("🎨", ci);
  sw.append(custom);
  root.append(sw);
  root.append(el("strong", null, "🌑 Hintergrundton"));
  const bases = el("div", "chip-row");
  for (const [key, b] of Object.entries(BASES)) {
    const chip = el("button", "chip" + (S.settings.base === key ? " active" : ""), b.name);
    chip.style.background = b.panel2;
    chip.onclick = () => {
      setThemeSetting({ base: key });
      showSettings();
    };
    bases.append(chip);
  }
  root.append(bases);
  const wpb = el("button", "btn", "🖼 Chat-Hintergrund (alle Chats)");
  wpb.onclick = () => showWallpaperPicker("default");
  root.append(wpb, el("hr"));

  root.append(el("strong", null, "🔒 Privatsphäre"));
  const ol = el("label", "check");
  const ocb = el("input");
  ocb.type = "checkbox";
  ocb.checked = !S.settings.hideOnline;
  ocb.onchange = () => {
    setShowOnline(ocb.checked);
    toast(ocb.checked ? "Deine Kontakte sehen, wann du online bist." : "Niemand sieht mehr, wann du online bist.");
  };
  ol.append(ocb, " Online-Status anzeigen");
  const rl = el("label", "check");
  const rcb = el("input");
  rcb.type = "checkbox";
  rcb.checked = S.settings.readReceipts !== false;
  rcb.onchange = () => {
    S.settings.readReceipts = rcb.checked;
    save();
  };
  rl.append(rcb, " Gesehen-Auge senden (Lesebestätigung)");
  const pl = el("label", "check");
  const pcb = el("input");
  pcb.type = "checkbox";
  pcb.checked = !!S.settings.publicStories;
  pcb.onchange = () => {
    S.settings.publicStories = pcb.checked;
    save();
    toast(pcb.checked ? "🌍 Neue Stories sind öffentlich – alle können sie unter „Entdecken“ sehen." : "👥 Neue Stories sehen nur deine Kontakte.");
  };
  pl.append(pcb, " Stories öffentlich (alle App-Nutzer können sie sehen)");
  const cl = el("label", "check");
  const ccb = el("input");
  ccb.type = "checkbox";
  ccb.checked = !S.settings.callsOff;
  ccb.onchange = async () => {
    S.settings.callsOff = !ccb.checked;
    save();
    try {
      await api("settings", { method: "PUT", body: { callsOff: S.settings.callsOff } });
      toast(ccb.checked ? "📞 Man kann dich wieder anrufen." : "📵 Niemand kann dich mehr anrufen.");
    } catch (e) {
      toast(e.message);
    }
  };
  cl.append(ccb, " Anrufe erlauben");
  root.append(cl);
  root.append(ol, rl, pl, el("p", "small muted", "Ausgeschaltet sehen andere nicht, wann du online warst bzw. ob du ihre Nachrichten gesehen hast. Öffentliche Stories erscheinen für alle unter „🌍 Entdecken“ und werden vorher geprüft."), el("hr"));
  root.append(el("strong", null, "☁️ Backup"));
  root.append(
    el("p", "small muted", S.backupAt ? `✓ Gesichert – letztes Backup ${new Date(S.backupAt).toLocaleString("de-DE")}` : "Noch kein Backup. Wenn dein Handy die Website-Daten löscht, wären Code und Kontakte weg.")
  );
  const bkb = el("button", S.backupAt ? "btn" : "btn primary", S.backupAt ? "Backup verwalten" : "☁️ Backup einrichten");
  bkb.onclick = showBackupSetup;
  root.append(bkb, el("hr"));
  root.append(el("strong", null, "👥 Gruppen"));
  const gl = el("label", "check");
  const gcb = el("input");
  gcb.type = "checkbox";
  gcb.checked = !!S.settings.autoGroup;
  gcb.onchange = () => {
    S.settings.autoGroup = gcb.checked;
    save();
    toast(gcb.checked ? "Du wirst automatisch zu Gruppen hinzugefügt." : "Du bekommst ab jetzt zuerst eine Einladung im Chat.");
  };
  gl.append(gcb, " Automatisch zu Gruppen hinzufügen");
  root.append(gl, el("p", "small muted", "Ausgeschaltet: Wenn dich jemand zu einer Gruppe hinzufügt, bekommst du zuerst eine Einladung im Chat und entscheidest selbst."));
  root.append(el("hr"));

  root.append(el("strong", null, "📲 App"));
  if (isStandalone) root.append(el("p", "small muted", "✅ Pixelkingschat läuft als App vom Homebildschirm."));
  else {
    root.append(el("p", "small muted", "Installiere Pixelkingschat auf deinem Homebildschirm – dann startet es wie eine echte App, auch ohne Internet."));
    const ib = el("button", "btn primary", deferredPrompt ? "📲 App installieren" : "📲 So kommt die App auf den Homebildschirm");
    ib.onclick = installApp;
    root.append(ib);
  }
  const tr = el("button", "btn", "🔑 Konto übertragen");
  tr.onclick = showExport;
  root.append(tr);
  root.append(el("hr"));
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

async function syncMyName() {
  await api("profile", { method: "PUT", body: { name: S.me.name || "" } });
  S.me.nameSynced = S.me.name || "";
  save();
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
let swP = null;
function registerSW() {
  swP ??= doRegisterSW();
  return swP;
}
async function doRegisterSW() {
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
  }
  b.classList.toggle("hidden", !text || dismissed);
  if (text) {
    b.querySelector(".banner-text").textContent = text;
    $("#notifEnable").classList.toggle("hidden", !action);
  }
}

/* ================= App installieren (Homebildschirm) ================= */
let deferredPrompt = null;
const installDismissed = () => {
  try {
    return localStorage.getItem("pk_install_dismissed") === "1";
  } catch {
    return false;
  }
};
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  updateInstallBanner();
});
window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  updateInstallBanner();
  toast("📲 Pixelkingschat ist jetzt auf deinem Homebildschirm!");
});

function canInstall() {
  return !isStandalone && (!!deferredPrompt || isIOS);
}
function updateInstallBanner() {
  const b = $("#installBanner");
  if (!b) return;
  b.classList.toggle("hidden", !canInstall() || installDismissed());
  $("#installBtn").textContent = deferredPrompt ? "Installieren" : "So geht's";
}
async function installApp() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice.catch(() => ({}));
    deferredPrompt = null;
    if (outcome === "accepted") toast("📲 Wird installiert…");
    updateInstallBanner();
    return;
  }
  showInstallHelp();
}
function showInstallHelp() {
  const body = el("div", "stack");
  body.append(el("h2", null, "📲 Auf den Homebildschirm"));
  const ol = el("ol", "steps");
  const step = (...parts) => {
    const li = el("li");
    for (const p of parts) li.append(typeof p === "string" ? p : p);
    ol.append(li);
  };
  if (isIOS) {
    body.append(el("p", "small muted", "iPhone / iPad (in Safari):"));
    step("Tippe unten auf das ", el("b", null, "Teilen-Symbol"), " (Quadrat mit Pfeil nach oben).");
    step("Scrolle nach unten und wähle ", el("b", null, "„Zum Home-Bildschirm“"), ".");
    step("Tippe oben rechts auf ", el("b", null, "„Hinzufügen“"), ".");
    step("Öffne Pixelkingschat ab jetzt über das ", el("b", null, "Kronen-Symbol"), " auf deinem Homebildschirm – dort funktionieren auch Benachrichtigungen.");
  } else {
    body.append(el("p", "small muted", "Android / Computer:"));
    step("Öffne das ", el("b", null, "Browser-Menü"), " (⋮ oben rechts).");
    step("Wähle ", el("b", null, "„App installieren“"), " oder ", el("b", null, "„Zum Startbildschirm hinzufügen“"), ".");
    step("Bestätige mit ", el("b", null, "„Installieren“"), ".");
  }
  body.append(ol);
  if (isIOS && S.me) {
    const warn = el("p", "small accent");
    warn.textContent =
      "Wichtig: Auf dem iPhone hat die Homebildschirm-App einen eigenen Speicher. Damit dein Code mitkommt: hier unter Profil → „Konto übertragen“ den Übertragungscode kopieren und in der App beim Start auf „Konto übertragen“ tippen.";
    body.append(warn);
  }
  const ok = el("button", "btn primary big", "Verstanden");
  ok.onclick = closeModal;
  body.append(ok);
  openModal(body);
}

/* ================= Konto übertragen (z. B. Safari → Homebildschirm-App) ================= */
function exportCode() {
  const data = {
    v: 1,
    me: { id: S.me.id, token: S.me.token, pub: S.me.pub, priv: S.me.priv, name: S.me.name, av: S.me.av },
    contacts: Object.fromEntries(
      Object.values(S.contacts).map((c) => [c.id, { id: c.id, pub: c.pub, av: c.av, name: c.name, nick: c.nick, blocked: !!c.blocked, last: c.last, peer: !!c.peer }])
    ),
    groups: Object.fromEntries(Object.values(S.groups).map((g) => [g.id, { ...g, unread: 0 }])),
    settings: { ...S.settings, wp: {} },
  };
  return "PKX1:" + b64u(enc.encode(JSON.stringify(data)));
}
function showExport() {
  const body = el("div", "stack");
  body.append(el("h2", null, "🔑 Konto übertragen"));
  body.append(
    el("p", "small muted", "Mit diesem Code nimmst du deinen Pixelkingschat-Code und deine Kontakte mit – z. B. in die App auf deinem Homebildschirm. Nachrichten werden nicht übertragen.")
  );
  const warn = el("p", "small");
  warn.textContent = "⚠️ Dieser Code enthält deinen geheimen Schlüssel. Gib ihn niemals an andere weiter!";
  body.append(warn);
  const ta = el("textarea", "export-box");
  ta.readOnly = true;
  ta.value = exportCode();
  ta.rows = 4;
  const cp = el("button", "btn primary big", "Übertragungscode kopieren");
  cp.onclick = () => copy(ta.value);
  body.append(ta, cp);
  body.append(el("p", "small muted", "Danach in der Homebildschirm-App beim Start auf „Konto übertragen“ tippen und einfügen."));
  body.append(el("hr"));
  body.append(
    el("p", "small muted", "Wenn du übertragen hast: Melde dich hier ab, damit neue Nachrichten nur noch in der App ankommen. Dein Konto bleibt erhalten.")
  );
  const out = el("button", "btn danger", "Auf diesem Gerät abmelden");
  out.onclick = async () => {
    if (!confirm("Hast du den Übertragungscode kopiert und in der App eingefügt? Danach ist dein Konto auf diesem Gerät weg.")) return;
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await api("push", { method: "DELETE", body: { sub: sub.toJSON() } }).catch(() => {});
        await sub.unsubscribe();
      }
    } catch {}
    localStorage.removeItem(STORE_KEY);
    indexedDB.deleteDatabase("pk");
    location.replace("/");
  };
  body.append(out);
  openModal(body);
}
function showImport() {
  const body = el("div", "stack");
  body.append(el("h2", null, "🔑 Konto übertragen"));
  body.append(el("p", "small muted", "Füge hier den Übertragungscode ein (Profil → „Konto übertragen“ auf deinem anderen Gerät/Browser)."));
  const ta = el("textarea", "export-box");
  ta.rows = 4;
  ta.placeholder = "PKX1:…";
  const go = el("button", "btn primary big", "Konto übernehmen");
  go.onclick = async () => {
    try {
      const raw = ta.value.trim();
      if (!raw.startsWith("PKX1:")) throw new Error("Das ist kein gültiger Übertragungscode.");
      const data = JSON.parse(dec.decode(unb64u(raw.slice(5))));
      if (!data?.me?.id || !data.me.token || !data.me.priv || !data.me.pub) throw new Error("Code unvollständig.");
      S = withDefaults({ me: data.me, settings: data.settings, groups: data.groups || {} });
      for (const gid of Object.keys(S.groups)) S.messages[gid] = [];
      for (const c of Object.values(data.contacts || {})) {
        S.contacts[c.id] = { ...c, unread: 0 };
        S.messages[c.id] = [];
      }
      await api("me"); // prüft, ob das Konto gültig ist
      save();
      closeModal();
      toast("✅ Konto übernommen");
      startApp();
    } catch (e) {
      S = withDefaults({ me: null });
      toast(e.status === 401 ? "Dieses Konto existiert nicht mehr." : e.message || "Ungültiger Code.");
    }
  };
  body.append(ta, go);
  openModal(body);
  setTimeout(() => ta.focus(), 50);
}

/* ================= Eingabe: Anhängen-Menü, Einmal-Modus, Emojis ================= */
function toggleOnce() {
  onceMode = !onceMode;
  const b = $("#onceBtn");
  b.setAttribute("aria-pressed", String(onceMode));
  b.querySelector("span").textContent = `Einmal-Nachricht: ${onceMode ? "an" : "aus"}`;
  $("#composer").classList.toggle("once-on", onceMode);
  $("#attachBtn").classList.toggle("on", onceMode);
  $("#msgInput").placeholder = onceMode ? "👁 Einmal-Nachricht (nur 1× ansehbar)…" : "Verschlüsselte Nachricht…";
  if (onceMode) toast("👁 Einmal-Modus: Die nächste Nachricht kann nur einmal angesehen werden");
}

function closePopovers(except) {
  for (const id of ["attachMenu", "emojiPanel"]) if (id !== except) $("#" + id).classList.add("hidden");
  $("#attachBtn").setAttribute("aria-expanded", String(except === "attachMenu"));
}

function insertAtCursor(input, text) {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  input.value = input.value.slice(0, start) + text + input.value.slice(end);
  const pos = start + text.length;
  input.setSelectionRange(pos, pos);
  input.dispatchEvent(new Event("input"));
}

let emojiBuilt = false;
function buildEmojiPanel() {
  if (emojiBuilt) return;
  emojiBuilt = true;
  const panel = $("#emojiPanel");
  const tabs = el("div", "emoji-tabs");
  const grid = el("div", "emoji-grid");
  const show = (i) => {
    grid.textContent = "";
    grid.classList.remove("gif-grid");
    const emojiTabs = [...tabs.children].filter((t) => !t.classList.contains("gif-tab"));
    for (const t of tabs.children) t.classList.remove("active");
    emojiTabs[i]?.classList.add("active");
    for (const e of EMOJI_SETS[i][2].split(" ")) {
      const b = el("button", "emoji-cell");
      b.type = "button";
      b.title = e;
      const url = pixelEmoji(e);
      if (url) {
        const img = el("img");
        img.src = url;
        img.alt = e;
        b.append(img);
      } else b.textContent = e;
      b.onclick = () => insertAtCursor($("#msgInput"), e);
      grid.append(b);
    }
  };
  EMOJI_SETS.forEach(([icon, label], i) => {
    const t = el("button", "emoji-tab");
    t.type = "button";
    t.title = label;
    renderRich(t, icon);
    t.onclick = () => show(i);
    tabs.append(t);
  });
  const gt = el("button", "emoji-tab gif-tab", "GIF");
  gt.type = "button";
  gt.title = "GIFs";
  gt.onclick = () => {
    for (const t of tabs.children) t.classList.toggle("active", t === gt);
    renderGifTab(grid);
  };
  tabs.prepend(gt);
  panel.append(tabs, grid);
  show(0);
}

function bindComposerExtras() {
  renderRich($("#emojiBtn"), "😀");
  $("#attachBtn").onclick = (e) => {
    e.stopPropagation();
    const m = $("#attachMenu");
    const open = m.classList.contains("hidden");
    closePopovers(open ? "attachMenu" : null);
    m.classList.toggle("hidden", !open);
  };
  $("#emojiBtn").onclick = (e) => {
    e.stopPropagation();
    buildEmojiPanel();
    const p = $("#emojiPanel");
    const open = p.classList.contains("hidden");
    closePopovers(open ? "emojiPanel" : null);
    p.classList.toggle("hidden", !open);
  };
  $("#emojiPanel").onclick = (e) => e.stopPropagation();
  $("#attachMenu").onclick = (e) => {
    const act = e.target.closest("button")?.dataset.act;
    if (!act) return;
    closePopovers();
    if (act === "img") $("#imgInput").click();
    if (act === "file") $("#fileInput").click();
    if (act === "video") $("#videoInput").click();
    if (act === "once") toggleOnce();
  };
  document.addEventListener("click", () => closePopovers());
  $("#videoInput").onchange = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) pickVideoToSend(f);
  };
  $("#gifInput").onchange = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) sendGifBlob(f);
  };
  $("#fileInput").onchange = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) pickFileToSend(f);
  };
  $("#storyInput").onchange = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) storyFromPhoto(f);
  };
  $("#wallpaperInput").onchange = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) setPhotoWallpaper(f);
  };
}

/* ================= Neu-Menü ================= */
function showNewMenu() {
  const body = el("div", "stack");
  body.append(el("h2", null, "Neu"));
  const opts = [
    ["👤", "Kontakt hinzufügen", "Per Code, Link oder QR-Code", () => showAdd("mine")],
    ["👥", "Neue Gruppe", "Mit mehreren Kontakten chatten", showNewGroup],
    ["📸", "Story posten", "Für 24 Stunden für deine Kontakte", newStory],
    ["📹", "Meeting", "Starten oder mit Code beitreten", showMeetingMenu],
  ];
  for (const [icon, title, sub, fn] of opts) {
    const b = el("button", "menu-item");
    const ic = rich("span", "menu-icon", icon);
    const t = el("span", "menu-text");
    t.append(el("strong", null, title), el("span", "small muted", sub));
    b.append(ic, t);
    b.onclick = fn;
    body.append(b);
  }
  openModal(body);
}

/* ================= Gruppen-Oberfläche ================= */
function contactPicker(exclude = new Set()) {
  const wrap = el("div", "picker");
  const chosen = new Set();
  const contacts = Object.values(S.contacts)
    .filter((c) => !c.peer && !c.blocked && !exclude.has(c.id))
    .sort((a, b) => displayName(a).localeCompare(displayName(b)));
  if (!contacts.length) wrap.append(el("p", "small muted", "Keine Kontakte verfügbar. Füge zuerst Kontakte per Code hinzu."));
  for (const c of contacts) {
    const row = el("label", "pick-row");
    const cb = el("input");
    cb.type = "checkbox";
    cb.onchange = () => (cb.checked ? chosen.add(c.id) : chosen.delete(c.id));
    const av = el("div", "avatar sm");
    fillAvatar(av, c);
    row.append(cb, av, rich("span", "pick-name", displayName(c)));
    wrap.append(row);
  }
  return { node: wrap, chosen };
}

function showNewGroup() {
  const body = el("div", "stack");
  body.append(el("h2", null, "👥 Neue Gruppe"));
  const name = el("input");
  name.placeholder = "Gruppenname";
  name.maxLength = 40;
  body.append(name, el("strong", null, "Mitglieder auswählen"));
  const picker = contactPicker();
  body.append(picker.node);
  body.append(el("p", "small muted", "Wer automatische Gruppen ausgeschaltet hat, bekommt zuerst eine Einladung im Chat."));
  const go = el("button", "btn primary big", "Gruppe erstellen");
  go.onclick = async () => {
    const n = name.value.trim();
    if (!n) return toast("Gib der Gruppe einen Namen.");
    if (!picker.chosen.size) return toast("Wähle mindestens ein Mitglied aus.");
    closeModal();
    await createGroup(n, [...picker.chosen]);
    toast("Gruppe erstellt ✓");
  };
  body.append(go);
  openModal(body);
  setTimeout(() => name.focus(), 50);
}

function showGroupInfo() {
  const g = S.groups[currentChat];
  if (!g) return;
  const admin = g.admin === S.me.id && !g.removed;
  const root = el("div", "stack");
  const head = el("div", "profile-head");
  const av = el("div", "avatar xl");
  fillGroupAvatar(av, g);
  head.append(av, rich("h2", null, g.name));
  head.append(el("p", "small muted", `Gruppe · Admin: ${memberName(g.admin)}`));
  root.append(head);
  if (admin) {
    const lab = el("label", "field");
    lab.append(el("span", null, "Gruppenname"));
    const inp = el("input");
    inp.value = g.name;
    inp.maxLength = 40;
    lab.append(inp);
    const sb = el("button", "btn", "Umbenennen");
    sb.onclick = () => {
      renameGroup(g.id, inp.value.trim());
      closeModal();
    };
    root.append(lab, sb);
  }
  root.append(el("hr"), el("strong", null, `Mitglieder (${Object.keys(g.members).length})`));
  const list = el("div", "member-list");
  for (const [id, m] of Object.entries(g.members)) {
    const row = el("div", "member-row");
    const a = el("div", "avatar sm");
    if (id === S.me.id) fillAvatar(a, { id, av: S.me.av }, S.me.name || id);
    else fillAvatar(a, S.contacts[id] || { id, av: 0 });
    const label = el("div", "member-name");
    label.append(rich("span", null, memberName(id)));
    const tags = [];
    if (id === g.admin) tags.push("Admin");
    if (m.st === "invited") tags.push("eingeladen");
    if (tags.length) label.append(el("span", "small muted", " · " + tags.join(" · ")));
    row.append(a, label);
    if (admin && id !== S.me.id) {
      const x = el("button", "icon-btn", "✕");
      x.title = "Entfernen";
      x.onclick = () => {
        if (!confirm(`${memberName(id)} aus der Gruppe entfernen?`)) return;
        removeGroupMember(g.id, id);
        showGroupInfo();
      };
      row.append(x);
    }
    list.append(row);
  }
  root.append(list);
  if (admin) {
    const add = el("button", "btn primary", "➕ Mitglieder hinzufügen");
    add.onclick = () => {
      const body = el("div", "stack");
      body.append(el("h2", null, "Mitglieder hinzufügen"));
      const picker = contactPicker(new Set(Object.keys(g.members)));
      const go = el("button", "btn primary big", "Hinzufügen");
      go.onclick = () => {
        if (!picker.chosen.size) return toast("Niemand ausgewählt.");
        addGroupMembers(g.id, [...picker.chosen]);
        closeModal();
        toast("Eingeladen ✓");
      };
      body.append(picker.node, go);
      openModal(body);
    };
    root.append(add);
  }
  root.append(el("hr"));
  const wp = el("button", "btn", "🖼 Hintergrund für diese Gruppe");
  wp.onclick = () => showWallpaperPicker(g.id);
  const clear = el("button", "btn", "Chatverlauf leeren");
  clear.onclick = async () => {
    for (const m of S.messages[g.id] || []) await dropMedia(m.mid);
    S.messages[g.id] = [];
    save();
    renderMessages();
    renderList();
    closeModal();
  };
  const leave = el("button", "btn danger", g.removed ? "Gruppe löschen" : "Gruppe verlassen");
  leave.onclick = () => {
    if (!confirm(g.removed ? "Gruppe löschen?" : "Gruppe wirklich verlassen?")) return;
    closeModal();
    leaveGroup(g.id);
  };
  root.append(wp, clear, leave);
  openModal(root);
}

/* ================= Stories (24 Stunden) ================= */
const storyCache = new Map();
const storyContacts = () => Object.values(S.contacts).filter((c) => !c.peer && !c.blocked).map((c) => c.id);
let myStoryList = [];

async function pollStories() {
  if (!S.me) return;
  try {
    const ids = storyContacts();
    const res = ids.length ? await api(`stories?ids=${ids.join(",")}`) : { stories: [] };
    const by = {};
    for (const st of res.stories) (by[st.owner] = by[st.owner] || []).push(st);
    for (const list of Object.values(by)) list.sort((a, b) => a.ts - b.ts);
    S.stories = by;
    const mine = await api("story/mine");
    myStoryList = mine.stories.filter((x) => S.myStories[x.skey] || x.pub).sort((a, b) => a.ts - b.ts);
    save();
    renderStoryBar();
  } catch {}
}

function renderStoryBar() {
  const bar = $("#storyBar");
  if (!bar || !S.me) return;
  bar.textContent = "";
  const item = (label, fill, ring, onClick, plus) => {
    const b = el("button", "story-item");
    const r = el("div", "story-ring " + ring);
    const a = el("div", "avatar");
    fill(a);
    r.append(a);
    if (plus) r.append(el("span", "story-plus", "+"));
    b.append(r, rich("span", "story-label", label));
    b.onclick = onClick;
    bar.append(b);
  };
  item(
    "Deine Story",
    (a) => fillAvatar(a, { id: S.me.id, av: S.me.av }, S.me.name || S.me.id),
    myStoryList.length ? "seen" : "none",
    async () => {
      if (!myStoryList.length) return newStory();
      await pollStories();
      viewStories(S.me.id);
    },
    !myStoryList.length
  );
  item(
    "Entdecken",
    (a) => {
      a.textContent = "";
      a.style.background = "var(--panel2)";
      renderRich(a, "🌍");
    },
    "discover",
    showDiscover
  );
  const owners = Object.keys(S.stories).filter((o) => S.contacts[o] && S.stories[o].length);
  const unseen = (o) => S.stories[o].some((st) => !S.storySeen[`${o}/${st.skey}`]);
  owners.sort((a, b) => unseen(b) - unseen(a) || S.stories[b].at(-1).ts - S.stories[a].at(-1).ts);
  for (const o of owners) {
    item(displayName(S.contacts[o]), (a) => fillAvatar(a, S.contacts[o]), unseen(o) ? "unseen" : "seen", () => viewStories(o));
  }
}

function audienceToggle() {
  const wrap = el("div", "chip-row audience");
  const mk = (pub, label) => {
    const c = el("button", "chip" + (!!S.settings.publicStories === pub ? " active" : ""), label);
    c.type = "button";
    c.onclick = () => {
      S.settings.publicStories = pub;
      save();
      for (const x of wrap.children) x.classList.toggle("active", x === c);
      hint.textContent = pub
        ? "🌍 Öffentlich: Alle Pixelkingschat-Nutzer können diese Story unter „Entdecken“ sehen. Sie wird vorher geprüft."
        : "👥 Nur deine Kontakte – Ende-zu-Ende-verschlüsselt.";
    };
    return c;
  };
  const hint = el("p", "small muted");
  hint.textContent = S.settings.publicStories
    ? "🌍 Öffentlich: Alle Pixelkingschat-Nutzer können diese Story unter „Entdecken“ sehen. Sie wird vorher geprüft."
    : "👥 Nur deine Kontakte – Ende-zu-Ende-verschlüsselt.";
  wrap.append(mk(false, "👥 Kontakte"), mk(true, "🌍 Öffentlich"));
  const box = el("div", "stack");
  box.append(el("strong", null, "Wer darf die Story sehen?"), wrap, hint);
  return box;
}

function newStory() {
  const body = el("div", "stack");
  body.append(el("h2", null, "📸 Neue Story"));
  body.append(audienceToggle());
  const photo = el("button", "btn primary big", "📷 Foto oder 🎬 Video auswählen");
  photo.onclick = () => $("#storyInput").click();
  body.append(photo, el("hr"), el("strong", null, "…oder eine Text-Story"));
  const colors = ["#19e6d4", "#7c3aed", "#ec4899", "#f97316", "#16a34a", "#1d4ed8", "#111827"];
  let bg = S.settings.accent || colors[0];
  const prevBox = el("div", "story-text-preview");
  prevBox.style.background = bg;
  const prev = el("div");
  prevBox.append(prev);
  const ta = el("textarea");
  ta.maxLength = 300;
  ta.rows = 3;
  ta.placeholder = "Was gibt's Neues? 👑";
  ta.oninput = () => renderRich(prev, ta.value || "Deine Story");
  renderRich(prev, "Deine Story");
  const sw = el("div", "swatches");
  for (const c of colors) {
    const b = el("button", "swatch");
    b.style.background = c;
    b.onclick = () => {
      bg = c;
      prevBox.style.background = c;
    };
    sw.append(b);
  }
  const post = el("button", "btn big", "Text-Story posten");
  post.onclick = async () => {
    if (!ta.value.trim()) return toast("Schreib etwas für deine Story.");
    post.disabled = true;
    await postStory({ t: ta.value.trim(), bg });
    post.disabled = false;
  };
  body.append(prevBox, ta, sw, post);
  openModal(body);
}

async function storyFromPhoto(file) {
  if (file.type.startsWith("video/")) return storyFromVideo(file);
  let b64;
  try {
    b64 = await compressImage(file, { maxDim: 1280, maxB64: 1_200_000 });
  } catch (e) {
    return toast(e.message || "Bild konnte nicht gelesen werden.");
  }
  const body = el("div", "stack");
  body.append(el("h2", null, "📸 Story"));
  const img = el("img", "full-img");
  img.src = "data:image/jpeg;base64," + b64;
  const cap = el("input");
  cap.placeholder = "Text dazu (optional)";
  cap.maxLength = 200;
  const post = el("button", "btn primary big", "Story posten");
  post.onclick = async () => {
    post.disabled = true;
    await postStory({ img: b64, t: cap.value.trim() });
    post.disabled = false;
  };
  body.append(img, cap, audienceToggle(), post);
  openModal(body);
}

async function storyFromVideo(file) {
  if (sendBlocked()) return;
  let vid;
  try {
    vid = await prepareVideoRef(file, "🎬 Story-Video wird vorbereitet…");
  } catch (e) {
    closeModal();
    return toast(e.message || "Video konnte nicht gelesen werden.");
  }
  const body = el("div", "stack");
  body.append(el("h2", null, "🎬 Story"));
  const img = el("img", "full-img");
  img.src = "data:image/jpeg;base64," + vid.poster;
  const cap = el("input");
  cap.placeholder = "Text dazu (optional)";
  cap.maxLength = 200;
  const post = el("button", "btn primary big", "Story posten");
  post.onclick = async () => {
    post.disabled = true;
    await postStory({ vid, t: cap.value.trim() });
    post.disabled = false;
  };
  body.append(img, el("p", "small muted", `Video · ${fmtDur(vid.dur)}`), cap, audienceToggle(), post);
  openModal(body);
}

async function postStory(content) {
  if (sendBlocked()) return;
  const ids = storyContacts();
  const isPublic = !!S.settings.publicStories;
  try {
    const sid = b64u(rand(9));
    if (isPublic) {
      toast("Story wird geprüft…", 2500);
      const { skey, ts } = await api("story", { body: { sid, public: true, content } });
      S.myStories[skey] = { pub: true, ts };
      storyCache.set(`${S.me.id}/${skey}`, content);
      save();
      closeModal();
      toast("🌍 Öffentliche Story gepostet ✓ – alle können sie unter „Entdecken“ sehen");
    } else {
      const key = rand(32);
      const encd = await aesSeal(key, content, `story|${S.me.id}|${sid}`);
      const keys = {};
      for (const id of ids) {
        keys[id] = await aesSeal(new Uint8Array(await msgKeyBytes(id, "story|" + sid)), key, `${S.me.id}>${id}|story|${sid}`);
      }
      const { skey, ts } = await api("story", { body: { sid, ...encd, keys } });
      S.myStories[skey] = { k: b64u(key), ts };
      storyCache.set(`${S.me.id}/${skey}`, content);
      save();
      closeModal();
      toast(ids.length ? `Story gepostet ✓ – ${ids.length} Kontakt${ids.length === 1 ? "" : "e"} können sie sehen` : "Story gepostet ✓ (noch keine Kontakte)");
    }
    await pollStories();
  } catch (e) {
    if (e.status === 403) refreshMe();
    toast(e.status === 422 ? e.message : "Story konnte nicht gepostet werden: " + e.message);
  }
}

async function loadStory(owner, st) {
  const ck = `${owner}/${st.skey}`;
  if (storyCache.has(ck)) return storyCache.get(ck);
  const sid = st.skey.split("-").slice(1).join("-");
  const res = await api(`story/get?owner=${owner}&skey=${encodeURIComponent(st.skey)}`);
  let content;
  if (res.pub) {
    content = { ...(res.content || {}), _pub: true };
  } else {
    let key;
    if (owner === S.me.id) key = unb64u(S.myStories[st.skey].k);
    else key = await aesOpenRaw(new Uint8Array(await msgKeyBytes(owner, "story|" + sid)), res.wk, `${owner}>${S.me.id}|story|${sid}`);
    content = await aesOpenJson(key, res, `story|${owner}|${sid}`);
    content._k = b64u(key);
  }
  storyCache.set(ck, content);
  return content;
}

function timeAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "gerade eben";
  if (m < 60) return `vor ${m} Min`;
  return `vor ${Math.floor(m / 60)} Std`;
}

// opts: { list, name, av } für öffentliche Stories von Nicht-Kontakten
function viewStories(owner, opts = {}) {
  const list = opts.list || (owner === S.me.id ? myStoryList : S.stories[owner] || []);
  if (!list.length) return;
  const known = S.contacts[owner];
  const ownerName = owner === S.me.id ? "Deine Story" : known ? displayName(known) : opts.name || owner;
  let idx = owner === S.me.id ? 0 : Math.max(0, list.findIndex((st) => !S.storySeen[`${owner}/${st.skey}`]));
  let timer = null;
  let videoEl = null;
  const ov = el("div", "story-view");
  const bars = el("div", "story-bars");
  list.forEach(() => bars.append(el("div", "story-bar-seg")));
  const head = el("div", "story-head");
  const av = el("div", "avatar sm");
  if (owner === S.me.id) fillAvatar(av, { id: owner, av: S.me.av }, S.me.name || owner);
  else fillAvatar(av, known || { id: owner, av: opts.av || 0, name: opts.name }, ownerName);
  const who = el("div", "story-who");
  const close = el("button", "icon-btn story-close", "✕");
  head.append(av, who, close);
  const stage = el("div", "story-stage");
  const foot = el("div", "story-foot");
  ov.append(bars, head, stage, foot);
  document.body.append(ov);

  const stopVideo = () => {
    if (videoEl) videoEl.pause();
    videoEl = null;
  };
  const end = () => {
    clearTimeout(timer);
    stopVideo();
    ov.remove();
    renderStoryBar();
  };
  close.onclick = end;
  const go = (d) => {
    idx += d;
    if (idx < 0) idx = 0;
    if (idx >= list.length) return end();
    show();
  };
  stage.onclick = (e) => {
    if (e.target.closest("button")) return;
    const r = stage.getBoundingClientRect();
    go(e.clientX - r.left < r.width / 3 ? -1 : 1);
  };
  const runBar = (ms) => {
    [...bars.children].forEach((b, i) => {
      b.classList.toggle("done", i < idx);
      b.classList.remove("active");
      b.style.setProperty("--dur", ms + "ms");
      if (i === idx) void b.offsetWidth, b.classList.add("active");
    });
  };
  async function show() {
    clearTimeout(timer);
    stopVideo();
    const st = list[idx];
    runBar(6000);
    [...bars.children][idx].classList.remove("active");
    who.textContent = "";
    who.append(rich("strong", null, ownerName), el("span", "small", " · " + timeAgo(st.ts) + (st.pub ? " · 🌍" : "")));
    stage.textContent = "";
    foot.textContent = "";
    stage.append(el("div", "story-loading", "…"));
    try {
      const c = await loadStory(owner, st);
      stage.textContent = "";
      let ms = 6000;
      if (c.vid?.ref) {
        const v = el("video", "story-img");
        v.playsInline = true;
        v.poster = c.vid.poster ? "data:image/jpeg;base64," + c.vid.poster : "";
        stage.append(v);
        const load = el("div", "story-loading story-over", "Video wird geladen…");
        stage.append(load);
        const blob = await downloadMedia(c.vid.ref, (f) => (load.textContent = `Video wird geladen… ${Math.round(f * 100)} %`));
        load.remove();
        v.src = URL.createObjectURL(blob);
        videoEl = v;
        ms = Math.max(3000, Math.min(MAX_VIDEO_SEC, c.vid.dur || 10) * 1000 + 400);
        try {
          await v.play();
        } catch {
          v.muted = true;
          await v.play().catch(() => {});
          const unmute = el("button", "btn small-btn story-unmute", "🔇 Ton an");
          unmute.onclick = (e) => {
            e.stopPropagation();
            v.muted = false;
            unmute.remove();
          };
          stage.append(unmute);
        }
        if (c.t) stage.append(rich("div", "story-caption", c.t));
      } else if (c.img) {
        const img = el("img", "story-img");
        img.src = "data:image/jpeg;base64," + c.img;
        stage.append(img);
        if (c.t) stage.append(rich("div", "story-caption", c.t));
      } else {
        const t = el("div", "story-text");
        t.append(rich("div", null, c.t || ""));
        t.style.background = c.bg || "var(--accent)";
        stage.append(t);
      }
      runBar(ms);
      if (owner !== S.me.id && !S.storySeen[`${owner}/${st.skey}`]) {
        S.storySeen[`${owner}/${st.skey}`] = Date.now();
        save();
        api("story/seen", { body: { owner, skey: st.skey } }).catch(() => {});
      }
      if (owner === S.me.id) {
        const views = el("button", "btn small-btn", `👁 ${st.viewers.length} Aufruf${st.viewers.length === 1 ? "" : "e"}`);
        views.onclick = (e) => {
          e.stopPropagation();
          clearTimeout(timer);
          alert(st.viewers.length ? "Gesehen von:\n" + st.viewers.map(memberName).join("\n") : "Noch niemand hat deine Story gesehen.");
        };
        const add = el("button", "btn small-btn", "+ Neue Story");
        add.onclick = () => {
          end();
          newStory();
        };
        const del = el("button", "btn small-btn danger", "🗑 Löschen");
        del.onclick = async (e) => {
          e.stopPropagation();
          clearTimeout(timer);
          if (!confirm("Diese Story löschen?")) return;
          await api(`story?skey=${encodeURIComponent(st.skey)}`, { method: "DELETE" }).catch(() => {});
          delete S.myStories[st.skey];
          save();
          end();
          pollStories();
        };
        foot.append(views, add, del);
      } else {
        if (!known) {
          const addc = el("button", "btn small-btn", "＋ Als Kontakt");
          addc.onclick = async (e) => {
            e.stopPropagation();
            try {
              await addContactByCode(owner, { open: false });
              toast("Kontakt hinzugefügt ✓");
              addc.remove();
            } catch (err) {
              toast(err.message);
            }
          };
          foot.append(addc);
        }
        const rep = el("button", "btn small-btn danger", "⚑ Melden");
        rep.onclick = (e) => {
          e.stopPropagation();
          end();
          showReport({ type: "story", target: owner, skey: st.skey, key: c._k });
        };
        foot.append(rep);
      }
      timer = setTimeout(() => go(1), ms);
    } catch {
      stage.textContent = "";
      stage.append(el("div", "story-loading", "Story nicht mehr verfügbar."));
      timer = setTimeout(() => go(1), 1500);
    }
  }
  show();
}

/* ================= Farben & Chat-Hintergründe ================= */
function setThemeSetting(patch) {
  Object.assign(S.settings, patch);
  save();
  applyTheme(S.settings);
  if (currentChat) applyWallpaper(currentChat);
  renderStoryBar();
}

const wpUrlCache = new Map();
async function applyWallpaper(chatId) {
  const box = $("#messages");
  const scope = S.settings.wp[chatId] ? chatId : "default";
  const kind = S.settings.wp[scope] || "raster";
  box.style.backgroundImage = "";
  box.style.backgroundSize = "";
  box.style.backgroundPosition = "";
  box.classList.toggle("wp-photo", kind === "photo");
  if (kind === "photo") {
    let u = wpUrlCache.get(scope);
    if (!u) {
      const b64 = await idbGet("meta", "wp:" + scope);
      if (!b64) return;
      u = b64ToBlobUrl(b64);
      wpUrlCache.set(scope, u);
    }
    if (currentChat !== chatId) return;
    box.style.backgroundImage = `linear-gradient(rgba(0,0,0,.42), rgba(0,0,0,.42)), url("${u}")`;
    box.style.backgroundSize = "cover";
    box.style.backgroundPosition = "center";
    return;
  }
  const url = wallpaperUrl(kind, S.settings.accent, S.settings.base);
  if (url) {
    box.style.backgroundImage = `url("${url}")`;
    if (kind === "verlauf") box.style.backgroundSize = "cover";
  }
}

let wpScope = "default";
function showWallpaperPicker(scope) {
  wpScope = scope;
  const body = el("div", "stack");
  body.append(el("h2", null, scope === "default" ? "🖼 Hintergrund für alle Chats" : `🖼 Hintergrund für „${chatTitle(scope)}“`));
  const grid = el("div", "wp-grid");
  const current = S.settings.wp[scope] || (scope === "default" ? "raster" : "");
  const choose = (kind) => {
    if (kind === "") delete S.settings.wp[scope];
    else S.settings.wp[scope] = kind;
    save();
    if (currentChat) applyWallpaper(currentChat);
    showWallpaperPicker(scope);
  };
  if (scope !== "default") {
    const b = el("button", "wp-tile" + (current === "" ? " active" : ""));
    b.append(el("span", "wp-label", "Standard"));
    b.onclick = () => choose("");
    grid.append(b);
  }
  for (const [kind, label] of WALLPAPERS) {
    const b = el("button", "wp-tile" + (current === kind ? " active" : ""));
    const url = wallpaperUrl(kind, S.settings.accent, S.settings.base);
    if (url) b.style.backgroundImage = `url("${url}")`;
    if (kind === "verlauf") b.style.backgroundSize = "cover";
    b.append(el("span", "wp-label", label));
    b.onclick = () => choose(kind);
    grid.append(b);
  }
  const ph = el("button", "wp-tile photo" + (current === "photo" ? " active" : ""));
  ph.append(el("span", "wp-label", "📷 Eigenes Foto"));
  ph.onclick = () => $("#wallpaperInput").click();
  grid.append(ph);
  body.append(grid, el("p", "small muted", "Hintergründe gelten nur auf deinem Gerät."));
  openModal(body);
}

async function setPhotoWallpaper(file) {
  try {
    const b64 = await compressImage(file, { maxDim: 1400, maxB64: 900_000 });
    await idbPut("meta", "wp:" + wpScope, b64);
    const old = wpUrlCache.get(wpScope);
    if (old) URL.revokeObjectURL(old);
    wpUrlCache.delete(wpScope);
    S.settings.wp[wpScope] = "photo";
    save();
    if (currentChat) applyWallpaper(currentChat);
    toast("Hintergrund gesetzt ✓");
    showWallpaperPicker(wpScope);
  } catch (e) {
    toast(e.message || "Bild konnte nicht gelesen werden.");
  }
}

/* ================= Sprachnachrichten ================= */
const MAX_REC_SEC = 180;
function fmtDur(sec) {
  sec = Math.max(0, Math.round(sec || 0));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}
function pickAudioType() {
  if (!window.MediaRecorder) return null;
  for (const t of ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"]) {
    try {
      if (MediaRecorder.isTypeSupported(t)) return t;
    } catch {}
  }
  return "";
}

let rec = null;
async function startRecording() {
  if (!currentChat || rec) return;
  if (sendBlocked()) return;
  const type = pickAudioType();
  if (type === null || !navigator.mediaDevices?.getUserMedia) return toast("Dein Browser kann keine Sprachnachrichten aufnehmen.");
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  } catch {
    return toast("🎤 Bitte erlaube den Zugriff aufs Mikrofon.");
  }
  const opts = { audioBitsPerSecond: 32000 };
  if (type) opts.mimeType = type;
  let mr;
  try {
    mr = new MediaRecorder(stream, opts);
  } catch {
    mr = new MediaRecorder(stream);
  }
  const r = (rec = { mr, stream, chunks: [], levels: [], start: Date.now(), type: mr.mimeType || type || "audio/webm" });
  mr.ondataavailable = (e) => e.data?.size && r.chunks.push(e.data);
  // Lautstärke für die Wellenform messen
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    r.ctx = new Ctx();
    const an = r.ctx.createAnalyser();
    an.fftSize = 512;
    r.ctx.createMediaStreamSource(stream).connect(an);
    const buf = new Uint8Array(an.fftSize);
    r.sampler = setInterval(() => {
      an.getByteTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += (v - 128) * (v - 128);
      r.levels.push(Math.sqrt(sum / buf.length));
      drawRecWave(r.levels);
    }, 100);
  } catch {}
  mr.start(250);
  $("#composer").classList.add("recording");
  closePopovers();
  $("#recTime").textContent = "0:00";
  r.ticker = setInterval(() => {
    const sec = (Date.now() - r.start) / 1000;
    $("#recTime").textContent = fmtDur(sec);
    if (sec >= MAX_REC_SEC) {
      toast("Maximal 3 Minuten – Aufnahme wird gesendet.");
      stopRecording(true);
    }
  }, 250);
  if (navigator.vibrate) navigator.vibrate(30);
}

function drawRecWave(levels) {
  const box = $("#recWave");
  const n = Math.max(8, Math.floor(box.clientWidth / 5));
  const last = levels.slice(-n);
  box.textContent = "";
  for (const l of last) {
    const bar = el("span");
    bar.style.height = Math.max(3, Math.min(26, l * 1.4)) + "px";
    box.append(bar);
  }
}

function waveform(levels, n = 40) {
  if (!levels.length) return [];
  const out = [];
  const step = levels.length / n;
  for (let i = 0; i < n; i++) {
    const slice = levels.slice(Math.floor(i * step), Math.max(Math.floor((i + 1) * step), Math.floor(i * step) + 1));
    out.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  const max = Math.max(...out, 1);
  return out.map((v) => Math.max(1, Math.round((v / max) * 20)));
}

async function stopRecording(send) {
  const r = rec;
  if (!r) return;
  rec = null;
  clearInterval(r.ticker);
  clearInterval(r.sampler);
  const stopped = new Promise((res) => (r.mr.onstop = res));
  try {
    r.mr.stop();
  } catch {}
  await stopped;
  r.stream.getTracks().forEach((t) => t.stop());
  r.ctx?.close().catch(() => {});
  $("#composer").classList.remove("recording");
  $("#recWave").textContent = "";
  if (!send) return toast("Aufnahme verworfen");
  const dur = (Date.now() - r.start) / 1000;
  if (dur < 0.8 || !r.chunks.length) return toast("Zu kurz – halte die Aufnahme etwas länger.");
  const baseType = (r.type.split(";")[0] || "audio/webm").trim();
  const blob = new Blob(r.chunks, { type: baseType });
  if (blob.size > MAX_FILE) return toast("Sprachnachricht ist zu groß.");
  const d = await readAsB64(blob);
  sendMessage({ aud: { d, type: baseType, dur: Math.round(dur), w: waveform(r.levels) }, once: onceMode && !isGroup(currentChat) });
  if (onceMode) toggleOnce();
}

// Wiedergabe: ein gemeinsamer Player für alle Sprachnachrichten
const voiceUrls = new Map();
let voiceAudio = null;
let voiceUi = null;
function stopVoice() {
  if (voiceAudio) voiceAudio.pause();
  if (voiceUi) voiceUi.reset();
  voiceAudio = null;
  voiceUi = null;
}

function voicePlayer(m) {
  const box = el("div", "voice");
  const btn = el("button", "voice-play", "▶");
  btn.type = "button";
  btn.setAttribute("aria-label", "Abspielen");
  const mid = el("div", "voice-mid");
  const bars = el("div", "voice-bars");
  const w = m.aud.w?.length ? m.aud.w : Array.from({ length: 32 }, (_, i) => 4 + ((i * 7) % 11));
  for (const h of w) {
    const s = el("span");
    s.style.height = 3 + h * 1.1 + "px";
    bars.append(s);
  }
  const ctrl = el("div", "voice-ctrl");
  const back = el("button", "voice-skip", "⏪ 10");
  back.type = "button";
  back.title = "10 Sekunden zurück";
  const fwd = el("button", "voice-skip", "10 ⏩");
  fwd.type = "button";
  fwd.title = "10 Sekunden vor";
  const speed = el("button", "voice-speed", "1×");
  speed.type = "button";
  speed.title = "Geschwindigkeit";
  const time = el("span", "voice-time", m.aud.dur ? fmtDur(m.aud.dur) : "0:00");
  ctrl.append(back, time, fwd, speed);
  mid.append(bars, ctrl);
  box.append(btn, mid);
  let rate = 1;
  let pendingFrac = 0;
  const total = () => (voiceUi === ui && voiceAudio && isFinite(voiceAudio.duration) && voiceAudio.duration > 0 ? voiceAudio.duration : m.aud.dur || 1);
  const paint = (frac) => {
    const n = bars.children.length;
    [...bars.children].forEach((b, i) => b.classList.toggle("played", i / n < frac));
  };
  const ui = {
    reset() {
      btn.textContent = "▶";
      paint(0);
      pendingFrac = 0;
      time.textContent = m.aud.dur ? fmtDur(m.aud.dur) : "0:00";
    },
  };
  async function ensureAudio() {
    if (voiceUi === ui && voiceAudio) return voiceAudio;
    stopVoice();
    let url = voiceUrls.get(m.mid);
    if (!url) {
      const b64 = await idbGet("media", m.mid);
      if (!b64) {
        toast("Sprachnachricht ist nicht mehr verfügbar.");
        return null;
      }
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      url = URL.createObjectURL(new Blob([bytes], { type: m.aud.type || "audio/webm" }));
      voiceUrls.set(m.mid, url);
    }
    const a = new Audio(url);
    a.playbackRate = rate;
    voiceAudio = a;
    voiceUi = ui;
    a.ontimeupdate = () => {
      paint(a.currentTime / total());
      time.textContent = fmtDur(a.currentTime);
    };
    a.onended = () => {
      ui.reset();
      voiceAudio = null;
      voiceUi = null;
    };
    if (pendingFrac) {
      await new Promise((res) => {
        if (a.readyState >= 1) res();
        else a.onloadedmetadata = res;
        setTimeout(res, 800);
      });
      a.currentTime = pendingFrac * total();
    }
    return a;
  }
  const jump = async (delta) => {
    const a = await ensureAudio();
    if (!a) return;
    a.currentTime = Math.max(0, Math.min(total() - 0.05, a.currentTime + delta));
    paint(a.currentTime / total());
    time.textContent = fmtDur(a.currentTime);
  };
  box.onclick = (e) => {
    if (e.target.closest("button") || e.target.closest(".voice-bars")) e.stopPropagation();
  };
  bars.onclick = async (e) => {
    e.stopPropagation();
    const r = bars.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    paint(frac);
    if (voiceUi === ui && voiceAudio) voiceAudio.currentTime = frac * total();
    else {
      pendingFrac = frac;
      time.textContent = fmtDur(frac * (m.aud.dur || 0));
    }
  };
  back.onclick = (e) => {
    e.stopPropagation();
    jump(-10);
  };
  fwd.onclick = (e) => {
    e.stopPropagation();
    jump(10);
  };
  speed.onclick = (e) => {
    e.stopPropagation();
    rate = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1;
    speed.textContent = `${rate}×`.replace(".", ",");
    if (voiceUi === ui && voiceAudio) voiceAudio.playbackRate = rate;
  };
  btn.onclick = async (e) => {
    e.stopPropagation();
    if (voiceUi === ui && voiceAudio) {
      if (voiceAudio.paused) {
        await voiceAudio.play().catch(() => {});
        btn.textContent = "❚❚";
      } else {
        voiceAudio.pause();
        btn.textContent = "▶";
      }
      return;
    }
    const a = await ensureAudio();
    if (!a) return;
    try {
      await a.play();
      btn.textContent = "❚❚";
    } catch {
      toast("Diese Sprachnachricht kann auf diesem Gerät nicht abgespielt werden.");
      ui.reset();
    }
  };
  return box;
}

function bindVoice() {
  $("#micBtn").onclick = startRecording;
  $("#recCancel").onclick = () => stopRecording(false);
  $("#recSend").onclick = () => stopRecording(true);
}

/* ================= Online-Status ================= */
let presenceMap = {};
let serverSkew = 0;
const ONLINE_MS = 45000;
function lastSeenOf(id) {
  return presenceMap[id] || 0;
}
function isOnline(id) {
  const t = lastSeenOf(id);
  return !!t && Date.now() + serverSkew - t < ONLINE_MS;
}
function lastSeenText(id) {
  const t = lastSeenOf(id);
  if (!t) return "";
  const diff = Date.now() + serverSkew - t;
  if (diff < ONLINE_MS) return "online";
  const min = Math.floor(diff / 60000);
  if (min < 1) return "zuletzt online gerade eben";
  if (min < 60) return `zuletzt online vor ${min} Min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `zuletzt online vor ${h} Std`;
  const d = new Date(t);
  return `zuletzt online am ${d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}`;
}
async function pollPresence() {
  const ids = Object.values(S.contacts).filter((c) => !c.blocked).map((c) => c.id);
  if (!ids.length || !S.me) return;
  try {
    const r = await api(`presence?ids=${ids.join(",")}`);
    serverSkew = r.now - Date.now();
    presenceMap = r.seen || {};
    renderList();
    if (currentChat && !isGroup(currentChat)) renderChatHead();
  } catch {}
}
async function setShowOnline(on) {
  S.settings.hideOnline = !on;
  save();
  try {
    await api("presence", { method: on ? "POST" : "DELETE" });
  } catch {}
  if (on) poll();
}

/* ================= Gelesen-Bestätigung (Pixel-Auge) ================= */
let eyeUrl = null;
function pixelEyeUrl() {
  if (eyeUrl) return eyeUrl;
  const rows = [
    "....XXXXXX....",
    "..XXwwwwwwXX..",
    ".XwwwwPPwwwwX.",
    "XwwwwPPhPwwwwX",
    "XwwwwPPPPwwwwX",
    ".XwwwwPPwwwwX.",
    "..XXwwwwwwXX..",
    "....XXXXXX....",
  ];
  const col = { X: "#0b1214", w: "#ffffff", P: "#1a1a2e", h: "#ffffff" };
  let rects = "";
  rows.forEach((row, y) => [...row].forEach((ch, x) => ch !== "." && (rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${col[ch]}"/>`)));
  eyeUrl = "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 8" shape-rendering="crispEdges">${rects}</svg>`);
  return eyeUrl;
}
function eyeImg(title) {
  const img = el("img", "pxeye");
  img.src = pixelEyeUrl();
  img.alt = "gesehen";
  img.title = title || "Gesehen";
  return img;
}

// Eingehende Nachrichten im offenen Chat als gesehen melden
let seenTimer = null;
function markSeenSoon() {
  clearTimeout(seenTimer);
  seenTimer = setTimeout(markSeen, 400);
}
function markSeen() {
  if (!currentChat || document.hidden || !S.me) return;
  const list = S.messages[currentChat] || [];
  const bySender = {};
  for (const m of list) {
    if (m.dir !== "in" || m.seenSent || m.invite) continue;
    m.seenSent = true;
    if (m.once) continue; // Einmal-Nachrichten melden sich beim Öffnen selbst
    const from = m.from || currentChat;
    (bySender[from] = bySender[from] || []).push(m.mid);
  }
  const senders = Object.keys(bySender);
  if (!senders.length) return;
  save();
  if (S.settings.readReceipts === false) return;
  for (const s of senders) {
    if (S.contacts[s]?.blocked) continue;
    sendCtl(s, { k: "seen", mids: bySender[s].slice(-100), gid: isGroup(currentChat) ? currentChat : undefined }).catch(() => {});
  }
}
function handleSeen(from, p) {
  if (!Array.isArray(p.mids)) return false;
  const want = new Set(p.mids.filter((x) => typeof x === "string").slice(0, 200));
  let changed = false;
  for (const [chatId, list] of Object.entries(S.messages)) {
    if (isGroup(chatId) ? p.gid !== chatId : chatId !== from) continue;
    for (const m of list) {
      if (m.dir !== "out" || !want.has(m.mid)) continue;
      if (isGroup(chatId)) {
        m.seenBy = m.seenBy || [];
        if (!m.seenBy.includes(from)) {
          m.seenBy.push(from);
          changed = true;
        }
      } else if (m.status !== "seen" && m.status !== "opened") {
        m.status = "seen";
        changed = true;
      }
    }
  }
  return changed;
}

/* ================= Daten sichern: Gerät + verschlüsseltes Cloud-Backup ================= */
const BK_ITER = 600000;
async function requestPersistence() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {}
}
// Sicherheitskopie im IndexedDB des Geräts (falls localStorage verloren geht)
let mirrorTimer = null;
function mirrorSoon() {
  clearTimeout(mirrorTimer);
  mirrorTimer = setTimeout(() => {
    if (S.me) idbPut("meta", "state", JSON.stringify(S));
    autoBackup();
  }, 1500);
}
function backupPayload() {
  return {
    v: 1,
    me: { id: S.me.id, token: S.me.token, pub: S.me.pub, priv: S.me.priv, name: S.me.name, av: S.me.av },
    contacts: Object.fromEntries(
      Object.values(S.contacts).map((c) => [c.id, { id: c.id, pub: c.pub, av: c.av, name: c.name, nick: c.nick, blocked: !!c.blocked, last: c.last, peer: !!c.peer }])
    ),
    groups: Object.fromEntries(Object.values(S.groups).map((g) => [g.id, { ...g, unread: 0 }])),
    settings: { ...S.settings, wp: {} },
  };
}
async function deriveBackupKey(password, salt, it = BK_ITER) {
  const base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt: unb64u(salt), iterations: it },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}
let backupBusy = false;
async function uploadBackup(force = false) {
  const bk = await idbGet("meta", "bk-key");
  if (!bk || !S.me || backupBusy) return false;
  const payload = JSON.stringify(backupPayload());
  const hash = b64u(await crypto.subtle.digest("SHA-256", enc.encode(payload)));
  if (!force && hash === S.backupHash) return true;
  backupBusy = true;
  try {
    const iv = rand(12);
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: enc.encode("pk-backup|" + S.me.id) }, bk.key, enc.encode(payload));
    await api("backup", { method: "PUT", body: { salt: bk.salt, it: bk.it, iv: b64u(iv), ct: b64u(ct) } });
    S.backupHash = hash;
    S.backupAt = Date.now();
    localStorage.setItem(STORE_KEY, JSON.stringify(S));
    return true;
  } catch {
    return false;
  } finally {
    backupBusy = false;
  }
}
let autoBackupTimer = null;
function autoBackup() {
  clearTimeout(autoBackupTimer);
  autoBackupTimer = setTimeout(() => uploadBackup(false), 4000);
}
function updateBackupBanner() {
  let dismissed = false;
  try {
    dismissed = localStorage.getItem("pk_backup_dismissed") === "1";
  } catch {}
  $("#backupBanner").classList.toggle("hidden", !S.me || !!S.backupAt || dismissed);
}

function showBackupSetup() {
  const body = el("div", "stack");
  body.append(el("h2", null, "☁️ Konto-Backup"));
  body.append(
    el(
      "p",
      "small muted",
      "Mit einem Backup-Passwort kannst du deinen Code, deine Kontakte und Gruppen jederzeit wiederherstellen – auch auf einem neuen Handy oder wenn dein Browser die Daten gelöscht hat. Das Backup wird auf deinem Gerät mit deinem Passwort verschlüsselt. Niemand außer dir kann es öffnen."
    )
  );
  if (S.backupAt) body.append(el("p", "small accent", `✓ Letztes Backup: ${new Date(S.backupAt).toLocaleString("de-DE")} – wird automatisch aktualisiert.`));
  const p1 = el("input");
  p1.type = "password";
  p1.placeholder = "Backup-Passwort (mind. 8 Zeichen)";
  p1.autocomplete = "new-password";
  const p2 = el("input");
  p2.type = "password";
  p2.placeholder = "Passwort wiederholen";
  p2.autocomplete = "new-password";
  const warn = el("p", "small");
  warn.textContent = "⚠️ Merk dir dein Passwort und deinen Code " + S.me.id + " gut – ohne beides kann niemand das Backup wiederherstellen.";
  const go = el("button", "btn primary big", S.backupAt ? "Passwort ändern & sichern" : "Backup aktivieren");
  go.onclick = async () => {
    if (p1.value.length < 8) return toast("Das Passwort muss mindestens 8 Zeichen haben.");
    if (p1.value !== p2.value) return toast("Die Passwörter stimmen nicht überein.");
    go.disabled = true;
    go.textContent = "Wird verschlüsselt…";
    try {
      const salt = b64u(rand(16));
      const key = await deriveBackupKey(p1.value, salt);
      await idbPut("meta", "bk-key", { key, salt, it: BK_ITER });
      if (!(await uploadBackup(true))) throw new Error("Backup konnte nicht hochgeladen werden.");
      closeModal();
      updateBackupBanner();
      toast("☁️ Backup aktiviert – es wird ab jetzt automatisch aktualisiert.");
    } catch (e) {
      toast(e.message);
      go.disabled = false;
      go.textContent = "Backup aktivieren";
    }
  };
  body.append(p1, p2, warn, go);
  if (S.backupAt) {
    const del = el("button", "btn danger", "Backup löschen");
    del.onclick = async () => {
      if (!confirm("Backup wirklich löschen?")) return;
      await api("backup", { method: "DELETE" }).catch(() => {});
      await idbDel("meta", "bk-key");
      delete S.backupAt;
      delete S.backupHash;
      save();
      closeModal();
      updateBackupBanner();
    };
    body.append(del);
  }
  openModal(body);
  setTimeout(() => p1.focus(), 50);
}

function showRestore() {
  const body = el("div", "stack");
  body.append(el("h2", null, "☁️ Konto wiederherstellen"));
  body.append(el("p", "small muted", "Gib deinen Code und dein Backup-Passwort ein. Deine Kontakte und Gruppen kommen zurück."));
  const code = el("input", "code-input");
  code.maxLength = 8;
  code.placeholder = "DEIN CODE";
  code.autocapitalize = "characters";
  const pw = el("input");
  pw.type = "password";
  pw.placeholder = "Backup-Passwort";
  pw.autocomplete = "current-password";
  const go = el("button", "btn primary big", "Wiederherstellen");
  go.onclick = async () => {
    const id = code.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (id.length !== 8) return toast("Ein Code hat 8 Zeichen.");
    go.disabled = true;
    go.textContent = "Wird entschlüsselt…";
    try {
      const bk = await api(`backup/${id}`);
      const key = await deriveBackupKey(pw.value, bk.salt, bk.it);
      let data;
      try {
        const pt = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv: unb64u(bk.iv), additionalData: enc.encode("pk-backup|" + id) },
          key,
          unb64u(bk.ct)
        );
        data = JSON.parse(dec.decode(pt));
      } catch {
        throw new Error("Falsches Passwort.");
      }
      S = withDefaults({ me: data.me, settings: data.settings, groups: data.groups || {} });
      for (const c of Object.values(data.contacts || {})) {
        S.contacts[c.id] = { ...c, unread: 0 };
        S.messages[c.id] = [];
      }
      for (const gid of Object.keys(S.groups)) S.messages[gid] = [];
      await api("me");
      S.backupAt = bk.ts;
      await idbPut("meta", "bk-key", { key, salt: bk.salt, it: bk.it });
      save();
      applyTheme(S.settings);
      closeModal();
      toast("✅ Konto wiederhergestellt");
      startApp();
    } catch (e) {
      S = withDefaults({ me: null });
      toast(e.status === 404 ? "Für diesen Code gibt es kein Backup." : e.status === 401 ? "Dieses Konto existiert nicht mehr." : e.message);
      go.disabled = false;
      go.textContent = "Wiederherstellen";
    }
  };
  body.append(code, pw, go);
  openModal(body);
  setTimeout(() => code.focus(), 50);
}

// Beim Start: Falls localStorage leer ist, aus der Sicherheitskopie im Gerät wiederherstellen
async function recoverFromMirror() {
  try {
    const raw = await idbGet("meta", "state");
    if (!raw) return false;
    const st = JSON.parse(raw);
    if (!st?.me?.id || !st.me.token) return false;
    S = withDefaults(st);
    localStorage.setItem(STORE_KEY, JSON.stringify(S));
    return true;
  } catch {
    return false;
  }
}

/* ================= Große Medien: Videos & GIFs (verschlüsselt, in Stücken) ================= */
const MEDIA_CHUNK = 3_500_000;
const MAX_MEDIA = 30_000_000;
const MAX_VIDEO_SEC = 60;
const PIXEL_GIFS = ["gg", "lol", "hi", "omg", "herz", "krone", "feuer", "nein", "ja", "daumen", "lachen", "weinen", "brb", "xd", "sterne", "party"];

async function uploadMedia(blob, onProgress) {
  if (blob.size > MAX_MEDIA) throw new Error("Datei ist zu groß (max. 30 MB).");
  const key = rand(32);
  const iv = rand(12);
  const id = b64u(rand(12));
  const b = Math.floor(Date.now() / 3600000);
  const plain = new Uint8Array(await blob.arrayBuffer());
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: enc.encode("pk-media|" + id) }, await aesKey(key), plain)
  );
  const n = Math.ceil(ct.length / MEDIA_CHUNK);
  for (let i = 0; i < n; i++) {
    const part = ct.subarray(i * MEDIA_CHUNK, Math.min(ct.length, (i + 1) * MEDIA_CHUNK));
    let ok = false;
    for (let attempt = 0; attempt < 3 && !ok; attempt++) {
      const r = await fetch(`/api/media?id=${id}&i=${i}&b=${b}`, {
        method: "PUT",
        headers: { authorization: `PK ${S.me.id}:${S.me.token}`, "content-type": "application/octet-stream" },
        body: part,
      });
      if (r.status === 403) {
        const d = await r.json().catch(() => ({}));
        throw Object.assign(new Error(d.error || "Gesperrt"), { status: 403 });
      }
      ok = r.ok;
    }
    if (!ok) throw new Error("Hochladen fehlgeschlagen – bitte nochmal versuchen.");
    onProgress?.((i + 1) / n);
  }
  return { id, b, n, k: b64u(key), iv: b64u(iv), type: blob.type || "application/octet-stream", size: blob.size };
}

const mediaBlobCache = new Map();
async function downloadMedia(ref, onProgress) {
  if (mediaBlobCache.has(ref.id)) return mediaBlobCache.get(ref.id);
  const parts = [];
  for (let i = 0; i < ref.n; i++) {
    const r = await fetch(`/api/media?id=${ref.id}&i=${i}&b=${ref.b}`, { headers: { authorization: `PK ${S.me.id}:${S.me.token}` } });
    if (!r.ok) throw new Error("Nicht mehr verfügbar.");
    parts.push(new Uint8Array(await r.arrayBuffer()));
    onProgress?.((i + 1) / ref.n);
  }
  const total = parts.reduce((a, p) => a + p.length, 0);
  const ct = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    ct.set(p, off);
    off += p.length;
  }
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64u(ref.iv), additionalData: enc.encode("pk-media|" + ref.id) },
    await aesKey(unb64u(ref.k)),
    ct
  );
  const blob = new Blob([pt], { type: ref.type });
  mediaBlobCache.set(ref.id, blob);
  return blob;
}
// Medien einer Nachricht: einmal laden, dann im Gerät (IndexedDB) behalten
async function messageMediaUrl(m, kind, onProgress) {
  const key = `${kind}:${m.mid}`;
  if (urlCache.has(key)) return urlCache.get(key);
  let blob = await idbGet("media", key);
  if (!blob) {
    const ref = (kind === "v" ? m.vid : m.gif)?.ref;
    if (!ref) return null;
    blob = await downloadMedia(ref, onProgress);
    await idbPut("media", key, blob);
  }
  const url = URL.createObjectURL(blob);
  urlCache.set(key, url);
  return url;
}

function videoInfo(file) {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.playsInline = true;
    v.src = URL.createObjectURL(file);
    v.onloadedmetadata = () => resolve(v);
    v.onerror = () => reject(new Error("Dieses Video kann nicht gelesen werden."));
  });
}
async function posterOf(v, at = 0.2) {
  await new Promise((res) => {
    v.onseeked = res;
    v.currentTime = Math.min(at, (v.duration || 1) / 2);
    setTimeout(res, 1500);
  });
  const w = v.videoWidth || 320;
  const h = v.videoHeight || 240;
  const sc = Math.min(1, 320 / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.round(w * sc);
  c.height = Math.round(h * sc);
  c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
  const d = c.toDataURL("image/jpeg", 0.6);
  return { poster: d.slice(d.indexOf(",") + 1), w, h };
}
function pickVideoType() {
  if (!window.MediaRecorder) return null;
  for (const t of ["video/mp4;codecs=avc1,mp4a", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]) {
    try {
      if (MediaRecorder.isTypeSupported(t)) return t;
    } catch {}
  }
  return null;
}
// Video verkleinern: im Browser neu aufnehmen (max. 720p, ~1,2 Mbit/s)
async function transcodeVideo(file, v, onProgress) {
  const type = pickVideoType();
  const canvas = document.createElement("canvas");
  if (!type || !canvas.captureStream) return null;
  const sc = Math.min(1, 720 / Math.max(v.videoWidth, v.videoHeight));
  canvas.width = Math.round((v.videoWidth * sc) / 2) * 2;
  canvas.height = Math.round((v.videoHeight * sc) / 2) * 2;
  const ctx = canvas.getContext("2d");
  const stream = canvas.captureStream(30);
  let actx = null;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    actx = new Ctx();
    const src = actx.createMediaElementSource(v);
    const dest = actx.createMediaStreamDestination();
    src.connect(dest);
    dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
  } catch {}
  v.muted = !actx;
  v.currentTime = 0;
  const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 1_200_000, audioBitsPerSecond: 64000 });
  const chunks = [];
  rec.ondataavailable = (e) => e.data?.size && chunks.push(e.data);
  const done = new Promise((res) => (rec.onstop = res));
  let raf;
  const draw = () => {
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    onProgress?.(Math.min(0.99, v.currentTime / v.duration));
    if (!v.ended) raf = requestAnimationFrame(draw);
  };
  rec.start(500);
  await v.play();
  draw();
  await new Promise((res) => (v.onended = res));
  cancelAnimationFrame(raf);
  rec.stop();
  await done;
  actx?.close().catch(() => {});
  stream.getTracks().forEach((t) => t.stop());
  const out = new Blob(chunks, { type: type.split(";")[0] });
  return out.size > 1000 ? out : null;
}

function progressModal(title) {
  const body = el("div", "stack");
  body.append(el("h2", null, title));
  const bar = el("div", "progress");
  const fill = el("div", "progress-fill");
  bar.append(fill);
  const label = el("p", "small muted", "0 %");
  body.append(bar, label);
  openModal(body);
  return (f, text) => {
    fill.style.width = Math.round(f * 100) + "%";
    label.textContent = text || Math.round(f * 100) + " %";
  };
}

// Video auswählen → (verkleinern) → verschlüsselt hochladen → senden bzw. für Story zurückgeben
async function prepareVideoRef(file, title = "🎬 Video wird vorbereitet…") {
  const v = await videoInfo(file);
  if (v.duration > MAX_VIDEO_SEC + 1) throw new Error(`Videos dürfen höchstens ${MAX_VIDEO_SEC} Sekunden lang sein.`);
  const set = progressModal(title);
  const { poster, w, h } = await posterOf(v);
  let blob = null;
  if (file.size > 8_000_000 || !/^video\/(mp4|webm)$/.test(file.type)) {
    set(0, "Video wird verkleinert… 0 %");
    try {
      blob = await transcodeVideo(file, v, (f) => set(f * 0.7, `Video wird verkleinert… ${Math.round(f * 100)} %`));
    } catch {
      blob = null;
    }
  }
  if (!blob) blob = file;
  if (blob.size > MAX_MEDIA) throw new Error("Das Video ist zu groß. Bitte ein kürzeres Video wählen.");
  const ref = await uploadMedia(blob, (f) => set(0.7 + f * 0.3, `Wird verschlüsselt hochgeladen… ${Math.round(f * 100)} %`));
  URL.revokeObjectURL(v.src);
  return { ref, dur: Math.round(v.duration), w, h, poster };
}

async function pickVideoToSend(file) {
  if (!currentChat || sendBlocked()) return;
  try {
    const vid = await prepareVideoRef(file);
    closeModal();
    if (onceMode) toggleOnce();
    sendMessage({ vid });
  } catch (e) {
    closeModal();
    toast(e.message || "Video konnte nicht gesendet werden.");
  }
}

async function gifStill(blob) {
  try {
    const bmp = await createImageBitmap(blob);
    const sc = Math.min(1, 320 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * sc);
    c.height = Math.round(bmp.height * sc);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    const d = c.toDataURL("image/jpeg", 0.7);
    return { poster: d.slice(d.indexOf(",") + 1), w: bmp.width, h: bmp.height };
  } catch {
    return { poster: undefined, w: 200, h: 200 };
  }
}
async function sendGifBlob(blob) {
  if (!currentChat || sendBlocked()) return;
  if (blob.size > 8_000_000) return toast("GIF ist zu groß (max. 8 MB).");
  try {
    const set = progressModal("GIF wird gesendet…");
    const { poster, w, h } = await gifStill(blob);
    const ref = await uploadMedia(blob, (f) => set(f));
    closeModal();
    sendMessage({ gif: { ref, w, h, poster } });
  } catch (e) {
    closeModal();
    toast(e.message || "GIF konnte nicht gesendet werden.");
  }
}
function sendPixelGif(name) {
  if (!currentChat || sendBlocked()) return;
  closePopovers();
  sendMessage({ gif: { p: name } });
}

// Darstellung im Chat
function videoCard(m) {
  const box = el("div", "video-card");
  if (m.vid.poster) {
    const img = el("img");
    img.src = "data:image/jpeg;base64," + m.vid.poster;
    img.alt = "Video";
    box.append(img);
  }
  box.append(el("span", "video-play", "▶"), el("span", "video-dur", fmtDur(m.vid.dur)));
  box.onclick = async (e) => {
    e.stopPropagation();
    const body = el("div", "stack");
    const status = el("p", "small muted", "Video wird geladen…");
    body.append(status);
    openModal(body);
    try {
      const url = await messageMediaUrl(m, "v", (f) => (status.textContent = `Video wird geladen… ${Math.round(f * 100)} %`));
      if (!url) throw new Error();
      const vid = el("video", "full-video");
      vid.src = url;
      vid.controls = true;
      vid.playsInline = true;
      vid.autoplay = true;
      status.replaceWith(vid);
      if (m.text) body.append(rich("p", null, m.text));
      if (m.dir === "in") {
        const rep = el("button", "btn danger", "⚑ Video melden");
        rep.onclick = () => showReport({ type: "message", target: m.from || currentChat, mids: [m.mid] });
        body.append(rep);
      }
    } catch {
      status.textContent = "Video ist nicht mehr verfügbar.";
    }
  };
  if (m.vid.w && m.vid.h) box.style.aspectRatio = `${m.vid.w} / ${m.vid.h}`;
  return box;
}
function gifNode(m) {
  const img = el("img", "msg-gif");
  img.alt = "GIF";
  if (m.gif.p) img.src = `/gifs/${m.gif.p}.gif`;
  else {
    if (m.gif.poster) img.src = "data:image/jpeg;base64," + m.gif.poster;
    messageMediaUrl(m, "g").then((u) => u && (img.src = u)).catch(() => {});
  }
  if (m.gif.w && m.gif.h) img.style.aspectRatio = `${m.gif.w} / ${m.gif.h}`;
  return img;
}

/* ---------- GIF-Auswahl (wie bei Discord) ---------- */
let gifSearchEnabled = null;
async function renderGifTab(grid) {
  grid.textContent = "";
  grid.classList.add("gif-grid");
  const top = el("div", "gif-top");
  const search = el("input", "gif-search");
  search.placeholder = "GIFs suchen…";
  const own = el("button", "btn small-btn", "📁 Eigenes GIF");
  own.type = "button";
  own.onclick = () => $("#gifInput").click();
  top.append(search, own);
  const results = el("div", "gif-results");
  grid.append(top, results);
  const showPixel = () => {
    results.textContent = "";
    results.append(el("div", "gif-section", "👾 Pixel-GIFs"));
    for (const name of PIXEL_GIFS) {
      const b = el("button", "gif-cell");
      b.type = "button";
      const img = el("img");
      img.src = `/gifs/${name}.gif`;
      img.alt = name;
      img.loading = "lazy";
      b.append(img);
      b.onclick = () => sendPixelGif(name);
      results.append(b);
    }
  };
  const showSearch = async (q) => {
    if (gifSearchEnabled === false) return;
    try {
      const r = await api(`gifs?q=${encodeURIComponent(q)}`);
      gifSearchEnabled = r.enabled;
      if (!r.enabled) {
        search.placeholder = "Suche bald verfügbar – Pixel-GIFs & eigene GIFs gehen schon";
        search.disabled = true;
        return;
      }
      if (q) results.textContent = "";
      results.append(el("div", "gif-section", q ? `🔎 ${q}` : "🔥 Angesagt"));
      for (const g of r.results) {
        const b = el("button", "gif-cell");
        b.type = "button";
        const img = el("img");
        img.src = g.preview;
        img.loading = "lazy";
        img.alt = "GIF";
        img.referrerPolicy = "no-referrer";
        b.append(img);
        b.onclick = async () => {
          closePopovers();
          try {
            const res = await fetch(`/api/gif?id=${g.id}`, { headers: { authorization: `PK ${S.me.id}:${S.me.token}` } });
            if (!res.ok) throw new Error();
            await sendGifBlob(await res.blob());
          } catch {
            toast("GIF konnte nicht geladen werden.");
          }
        };
        results.append(b);
      }
    } catch {}
  };
  showPixel();
  showSearch("");
  let t;
  search.oninput = () => {
    clearTimeout(t);
    t = setTimeout(() => {
      if (!search.value.trim()) {
        showPixel();
        showSearch("");
      } else showSearch(search.value.trim());
    }, 400);
  };
}

/* ================= Öffentliche Stories entdecken ================= */
async function showDiscover() {
  const body = el("div", "stack");
  body.append(el("h2", null, "🌍 Entdecken"));
  body.append(el("p", "small muted", "Öffentliche Stories aus der ganzen Pixelkingschat-Community (24 Stunden)."));
  const grid = el("div", "discover-grid");
  grid.append(el("p", "small muted", "Wird geladen…"));
  body.append(grid);
  openModal(body);
  try {
    const { owners } = await api("pubstories");
    grid.textContent = "";
    if (!owners.length) grid.append(el("p", "small muted", "Gerade gibt es keine öffentlichen Stories. Poste doch die erste! 👑"));
    for (const o of owners) {
      if (o.owner === S.me.id) continue;
      const b = el("button", "discover-item");
      const ring = el("div", "story-ring " + (o.items.some((st) => !S.storySeen[`${o.owner}/${st.skey}`]) ? "unseen" : "seen"));
      const a = el("div", "avatar");
      fillAvatar(a, { id: o.owner, av: o.av, name: o.name }, o.name || o.owner);
      ring.append(a);
      b.append(ring, rich("span", "story-label", o.name || o.owner), el("span", "small muted", timeAgo(o.items.at(-1).ts)));
      b.onclick = () => {
        closeModal();
        viewStories(o.owner, { list: o.items.map((x) => ({ ...x, pub: true })), name: o.name, av: o.av });
      };
      grid.append(b);
    }
  } catch {
    grid.textContent = "Konnte nicht geladen werden.";
  }
}

/* ================= Anrufe & Meetings ================= */
let calls = null;
function showMeetingMenu() {
  const body = el("div", "stack");
  body.append(el("h2", null, "📹 Meeting"));
  body.append(el("p", "small muted", "Video-Meeting mit bis zu 8 Personen. Jeder mit dem Code kann beitreten."));
  const title = el("input");
  title.placeholder = "Name des Meetings (optional)";
  title.maxLength = 40;
  const start = el("button", "btn primary big", "Neues Meeting starten");
  start.onclick = () => {
    closeModal();
    calls.createMeeting(title.value.trim());
  };
  body.append(title, start, el("hr"), el("strong", null, "Mit Code beitreten"));
  const code = el("input", "code-input");
  code.maxLength = 7;
  code.placeholder = "ABC 123";
  code.autocapitalize = "characters";
  const join = el("button", "btn big", "Beitreten");
  join.onclick = () => {
    closeModal();
    calls.joinMeeting(code.value);
  };
  body.append(code, join);
  openModal(body);
}
function shareMeeting(code, title) {
  const url = `${location.origin}/#meet=${code}`;
  const text = `Komm in mein Pixelkingschat-Meeting${title ? ` „${title}“` : ""}! Code: ${code.slice(0, 3)} ${code.slice(3)}`;
  const box = el("div", "call-share");
  box.append(el("h3", null, "Meeting teilen"), el("div", "call-code", code.slice(0, 3) + " " + code.slice(3)), qrNode(url));
  const row = el("div", "btn-row");
  const c1 = el("button", "btn", "Code kopieren");
  c1.onclick = () => copy(code);
  const c2 = el("button", "btn primary", "Link teilen");
  c2.onclick = async () => {
    if (navigator.share) {
      try {
        return await navigator.share({ title: "Pixelkingschat-Meeting", text, url });
      } catch (e) {
        if (e.name === "AbortError") return;
      }
    }
    copy(`${text}\n${url}`);
  };
  const close = el("button", "btn", "Schließen");
  close.onclick = () => box.remove();
  row.append(c1, c2, close);
  box.append(row);
  document.body.append(box);
}
function sendMeetInvite(chatId, code, title) {
  if (currentChat !== chatId) return;
  sendMessage({ meet: { code, title } });
}
function setupCalls() {
  calls = initCalls({
    api,
    S: () => S,
    el,
    rich,
    toast,
    b64u,
    rand,
    encryptFor,
    decryptFrom,
    ensurePeer,
    sendCtl,
    memberName,
    fillAvatar,
    sysMsg,
    save,
    sendBlocked,
    shareMeeting,
    sendMeetInvite,
    refresh: (id) => {
      renderList();
      if (currentChat === id) renderMessages();
    },
  });
  $("#callBtn").onclick = () => {
    if (!currentChat) return;
    if (isGroup(currentChat)) calls.createMeeting(S.groups[currentChat]?.name || "", currentChat);
    else calls.startCall(currentChat, false);
  };
  $("#videoBtn").onclick = () => currentChat && !isGroup(currentChat) && calls.startCall(currentChat, true);
}

/* ================= Start ================= */
function handleHash() {
  const mm = /^#meet=([A-Z0-9]{6})$/i.exec(location.hash);
  if (mm) {
    history.replaceState(null, "", location.pathname);
    return { kind: "meet", code: mm[1].toUpperCase() };
  }
  const sc = /^#(new|scan)$/.exec(location.hash);
  if (sc) {
    history.replaceState(null, "", location.pathname);
    return { kind: sc[1] };
  }
  const gm = /#chat=(g_[A-Za-z0-9_-]{8,40})/.exec(location.hash);
  if (gm) {
    history.replaceState(null, "", location.pathname);
    return { kind: "chat", code: gm[1] };
  }
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
  updateInstallBanner();
  if (S.me.nameSynced !== (S.me.name || "")) syncMyName().catch(() => {});
  if (S.settings.callsOff) api("settings", { method: "PUT", body: { callsOff: true } }).catch(() => {});
  refreshMe();
  pollModeration();
  pollPresence();
  setInterval(() => !document.hidden && pollPresence(), 20000);
  requestPersistence();
  updateBackupBanner();
  uploadBackup(false);
  if (pendingHash) {
    const { kind, code } = pendingHash;
    pendingHash = null;
    if (kind === "meet") setTimeout(() => calls.joinMeeting(code), 300);
    else if (kind === "new") showAdd("enter");
    else if (kind === "scan") showAdd("scan");
    else if (kind === "chat" && (S.contacts[code] || S.groups[code])) openChat(code);
    else if (kind === "chat" && isGroup(code)) {
    } else {
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
  Object.keys(S.contacts).forEach((id, i) => setTimeout(() => refreshProfile(id), 500 + i * 300));
  renderStoryBar();
  pollStories();
  setInterval(() => {
    if (document.hidden) return;
    pollStories();
    refreshMe();
    pollModeration();
  }, 60000);
  setInterval(updateModBanner, 30000);
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
  $("#addBtn").onclick = showNewMenu;
  $("#myCodeCard").onclick = () => showAdd("mine");
  $("#menuBtn").onclick = showSettings;
  $("#backBtn").onclick = closeChat;
  $("#chatInfoBtn").onclick = showContactInfo;
  $("#modalClose").onclick = () => closeModal();
  $("#modal").onclick = (e) => {
    if (e.target.id === "modal") closeModal();
  };
  $("#notifEnable").onclick = enablePush;
  $("#installBtn").onclick = installApp;
  $("#installDismiss").onclick = () => {
    try {
      localStorage.setItem("pk_install_dismissed", "1");
    } catch {}
    updateInstallBanner();
  };
  $("#notifDismiss").onclick = () => {
    try {
      localStorage.setItem("pk_notif_dismissed", "1");
    } catch {}
    updateNotifBanner();
  };
  $("#imgInput").onchange = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) f.type === "image/gif" ? sendGifBlob(f) : pickImageToSend(f);
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
    $("#composer").classList.toggle("has-text", !!input.value.trim());
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
  bindComposerExtras();
  bindVoice();
  grow();
  $("#composer").onsubmit = (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || !currentChat) return;
    input.value = "";
    grow();
    sendMessage({ text, once: onceMode });
    if (onceMode) toggleOnce();
    input.focus();
  };
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      poll();
      markSeenSoon();
      pollPresence();
      const holder = currentChat && (S.contacts[currentChat] || S.groups[currentChat]);
      if (holder) {
        holder.unread = 0;
        save();
        renderList();
        updateTitle();
      }
    }
  });
  window.addEventListener("hashchange", () => {
    const h = handleHash();
    if (!h || !S.me) return;
    if (h.kind === "meet") return calls.joinMeeting(h.code);
    if (h.kind === "new") return showAdd("enter");
    if (h.kind === "scan") return showAdd("scan");
    if (h.kind === "chat" && (S.contacts[h.code] || S.groups[h.code])) openChat(h.code);
    else if (!isGroup(h.code)) addContactByCode(h.code).catch((e) => toast(e.message));
  });
  window.addEventListener("storage", (e) => {
    if (e.key === STORE_KEY) {
      S = load();
      renderList();
      renderMessages();
    }
  });
}

applyTheme(S.settings);
bind();
setupCalls();
$("#importBtn").onclick = showImport;
$("#restoreBtn").onclick = showRestore;
$("#backupSetup").onclick = showBackupSetup;
$("#backupDismiss").onclick = () => {
  try {
    localStorage.setItem("pk_backup_dismissed", "1");
  } catch {}
  updateBackupBanner();
};
registerSW();
if (S.me) startApp();
else if (await recoverFromMirror()) {
  applyTheme(S.settings);
  startApp();
} else {
  $("#welcome").classList.remove("hidden");
  if (pendingHash?.kind === "add") {
    $(".tagline").after(el("p", "small accent", "Du wurdest zu einem Chat eingeladen – erstelle kurz dein anonymes Profil."));
  }
}
