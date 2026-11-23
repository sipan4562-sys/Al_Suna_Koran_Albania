// Gemeinsame Helfer für die Vercel-Funktionen (keine externen Abhängigkeiten).

export const PRICE_CENTS = parseInt(process.env.PRICE_CENTS || '1000', 10);
export const PRODUCT = 'tln_full';

export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export function configured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.STRIPE_SECRET_KEY);
}

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

// Prüft ein Google-ID-Token (Google Identity Services) und liefert die Nutzerdaten.
export async function verifyGoogle(idToken) {
  if (!idToken || typeof idToken !== 'string' || idToken.length > 4096) throw httpError(401, 'Nicht angemeldet.');
  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken));
  if (!r.ok) throw httpError(401, 'Anmeldung ungültig oder abgelaufen.');
  const t = await r.json();
  const okIss = t.iss === 'accounts.google.com' || t.iss === 'https://accounts.google.com';
  if (t.aud !== process.env.GOOGLE_CLIENT_ID || !okIss) throw httpError(401, 'Anmeldung gehört nicht zu diesem Spiel.');
  if (!t.exp || Number(t.exp) * 1000 < Date.now()) throw httpError(401, 'Anmeldung abgelaufen.');
  if (t.email_verified !== 'true' && t.email_verified !== true) throw httpError(401, 'E-Mail-Adresse nicht bestätigt.');
  return { sub: String(t.sub), email: t.email, name: t.name || t.email, picture: t.picture || '' };
}

export function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

// Verschachtelte Parameter im Stripe-Form-Format kodieren (a[b][0][c]=…)
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
    headers: {
      Authorization: 'Bearer ' + process.env.STRIPE_SECRET_KEY,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: method === 'GET' ? undefined : qs,
  });
  const j = await r.json();
  if (!r.ok) throw httpError(502, (j.error && j.error.message) || 'Zahlungsdienst nicht erreichbar.');
  return j;
}

// Hat dieser Google-Nutzer die Vollversion bezahlt? (Stripe ist die Datenbank.)
export async function hasPurchased(sub) {
  const safe = sub.replace(/[^0-9A-Za-z_-]/g, '');
  try {
    const q = `status:'succeeded' AND metadata['google_sub']:'${safe}' AND metadata['product']:'${PRODUCT}'`;
    const res = await stripe('payment_intents/search', { params: { query: q, limit: 1 } });
    if (res.data && res.data.length) return true;
  } catch (e) {
    /* Suche nicht verfügbar – unten Fallback */
  }
  // Fallback (und für ganz frische Zahlungen, die der Suchindex noch nicht kennt)
  const list = await stripe('checkout/sessions', { params: { limit: 100, status: 'complete' } });
  return (list.data || []).some((s) => s.client_reference_id === safe && s.payment_status === 'paid' && s.metadata && s.metadata.product === PRODUCT);
}

export function originOf(req) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, '');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
}

export function handle(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (e) {
      send(res, e.status || 500, { error: e.status ? e.message : 'Interner Fehler.' });
    }
  };
}
