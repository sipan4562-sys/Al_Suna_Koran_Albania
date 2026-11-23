// Gemeinsame Helfer für die Vercel-Funktionen:
// eigenes Kontosystem (E-Mail + Passwort) in einem privaten Vercel-Blob-Speicher,
// signierte Sitzungen und Einmalkauf über Stripe.
import crypto from 'node:crypto';
import * as blobSdk from '@vercel/blob';

// Für lokale Tests austauschbar (In-Memory-Speicher)
const blob = () => globalThis.__TLN_BLOB_MOCK__ || blobSdk;

export const PRICE_CENTS = parseInt(process.env.PRICE_CENTS || '1000', 10);
export const PRODUCT = 'tln_full';
const SESSION_DAYS = 30;
const MAX_FAILS = 8;
const LOCK_MINUTES = 10;

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export const accountsReady = () => !!(process.env.BLOB_READ_WRITE_TOKEN && process.env.SESSION_SECRET);
export const paymentsReady = () => accountsReady() && !!process.env.STRIPE_SECRET_KEY;

export async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (e) {
      return {};
    }
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch (e) {
    return {};
  }
}

export function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

export function handle(fn) {
  return async (req, res) => {
    try {
      if (req.method !== 'POST' && req.method !== 'GET') throw httpError(405, 'Methode nicht erlaubt.');
      await fn(req, res);
    } catch (e) {
      if (!e.status) console.error(e);
      send(res, e.status || 500, { error: e.status ? e.message : 'Interner Fehler.' });
    }
  };
}

// ---------------------------------------------------------------- Konten
export function normEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  if (e.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) throw httpError(400, 'Bitte eine gültige E-Mail-Adresse eingeben.');
  return e;
}

export function checkPassword(pw) {
  if (typeof pw !== 'string' || pw.length < 8) throw httpError(400, 'Das Passwort muss mindestens 8 Zeichen lang sein.');
  if (pw.length > 200) throw httpError(400, 'Das Passwort ist zu lang.');
  return pw;
}

// Pfad im Speicher: Hash der E-Mail (mit Server-Geheimnis), damit Adressen nicht im Dateinamen stehen
export function userKey(email) {
  return crypto.createHmac('sha256', process.env.SESSION_SECRET).update('user:' + email).digest('hex').slice(0, 40);
}
const userPath = (key) => `users/${key}.json`;

export async function loadUser(key) {
  if (!/^[0-9a-f]{40}$/.test(key)) return null;
  let r;
  try {
    r = await blob().get(userPath(key), { access: 'private', useCache: false });
  } catch (e) {
    if (e && (e.name === 'BlobNotFoundError' || /not.?found/i.test(e.message || ''))) return null;
    throw e;
  }
  if (!r || !r.stream) return null;
  const text = await new Response(r.stream).text();
  return JSON.parse(text);
}

export async function saveUser(rec, { create = false } = {}) {
  await blob().put(userPath(rec.key), JSON.stringify(rec), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: !create,
    contentType: 'application/json',
    cacheControlMaxAge: 60,
  });
}

export async function deleteUser(rec) {
  await blob().del(userPath(rec.key));
}

function scrypt(pw, salt) {
  return new Promise((resolve, reject) =>
    crypto.scrypt(pw, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (err, buf) => (err ? reject(err) : resolve(buf))),
  );
}

export async function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = (await scrypt(pw, salt)).toString('hex');
  return { salt, hash };
}

export async function verifyPassword(pw, rec) {
  const h = await scrypt(pw, rec.salt);
  const stored = Buffer.from(rec.hash, 'hex');
  return stored.length === h.length && crypto.timingSafeEqual(stored, h);
}

export const publicUser = (rec) => ({ id: rec.id, email: rec.email, name: rec.name || rec.email.split('@')[0] });

// ---------------------------------------------------------------- Sitzungen
const b64 = (s) => Buffer.from(s).toString('base64url');
const sign = (data) => crypto.createHmac('sha256', process.env.SESSION_SECRET).update(data).digest('base64url');

export function makeToken(rec) {
  const payload = b64(JSON.stringify({ k: rec.key, v: rec.pwv, exp: Date.now() + SESSION_DAYS * 864e5 }));
  return payload + '.' + sign(payload);
}

// Prüft das Sitzungstoken und lädt das Konto
export async function requireUser(token) {
  if (typeof token !== 'string' || token.length > 600 || !token.includes('.')) throw httpError(401, 'Bitte anmelden.');
  const [payload, sig] = token.split('.');
  const expect = sign(payload);
  if (!sig || sig.length !== expect.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) throw httpError(401, 'Sitzung ungültig. Bitte neu anmelden.');
  let data;
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch (e) {
    throw httpError(401, 'Sitzung ungültig.');
  }
  if (!data.exp || data.exp < Date.now()) throw httpError(401, 'Sitzung abgelaufen. Bitte neu anmelden.');
  const rec = await loadUser(data.k);
  if (!rec || rec.pwv !== data.v) throw httpError(401, 'Sitzung abgelaufen. Bitte neu anmelden.');
  return rec;
}

export function lockCheck(rec) {
  if (rec.lockUntil && rec.lockUntil > Date.now()) {
    const min = Math.ceil((rec.lockUntil - Date.now()) / 60000);
    throw httpError(429, `Zu viele Fehlversuche. Bitte in ${min} Minute(n) erneut versuchen.`);
  }
}

export async function registerFail(rec) {
  rec.fails = (rec.fails || 0) + 1;
  if (rec.fails >= MAX_FAILS) {
    rec.fails = 0;
    rec.lockUntil = Date.now() + LOCK_MINUTES * 60000;
  }
  await saveUser(rec);
}

// ---------------------------------------------------------------- Stripe
function encode(obj, prefix, out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((item, i) => (typeof item === 'object' ? encode(item, `${key}[${i}]`, out) : out.push(`${encodeURIComponent(`${key}[${i}]`)}=${encodeURIComponent(item)}`)));
    else if (typeof v === 'object') encode(v, key, out);
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
  }
  return out;
}

export async function stripe(path, { method = 'GET', params } = {}) {
  const qs = params ? encode(params).join('&') : '';
  const url = 'https://api.stripe.com/v1/' + path + (method === 'GET' && qs ? '?' + qs : '');
  const r = await fetch(url, {
    method,
    headers: { Authorization: 'Bearer ' + process.env.STRIPE_SECRET_KEY, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: method === 'GET' ? undefined : qs,
  });
  const j = await r.json();
  if (!r.ok) throw httpError(502, (j.error && j.error.message) || 'Zahlungsdienst nicht erreichbar.');
  return j;
}

// Hat dieses Konto bezahlt? Erst Konto-Datensatz, dann Stripe als Quelle der Wahrheit.
export async function isPremium(rec) {
  if (rec.premium) return true;
  if (!process.env.STRIPE_SECRET_KEY) return false;
  let paid = false;
  try {
    const q = `status:'succeeded' AND metadata['user_id']:'${rec.id}' AND metadata['product']:'${PRODUCT}'`;
    const res = await stripe('payment_intents/search', { params: { query: q, limit: 1 } });
    paid = !!(res.data && res.data.length);
  } catch (e) {
    /* Suche nicht verfügbar */
  }
  if (!paid) {
    const list = await stripe('checkout/sessions', { params: { limit: 100, status: 'complete' } });
    paid = (list.data || []).some((s) => s.client_reference_id === rec.id && s.payment_status === 'paid' && s.metadata && s.metadata.product === PRODUCT);
  }
  if (paid) {
    rec.premium = true;
    rec.premiumAt = Date.now();
    await saveUser(rec);
  }
  return paid;
}

export function originOf(req) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, '');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
}
