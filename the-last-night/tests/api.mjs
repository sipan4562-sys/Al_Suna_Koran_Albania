// Server-Funktionen lokal testen: Vercel Blob (In-Memory) und Stripe werden simuliert.
const API = new URL('../api/', import.meta.url).pathname;
process.env.SESSION_SECRET = 'test-secret-0123456789';
process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_test';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
const store = new Map();
globalThis.__TLN_BLOB_MOCK__ = {
  async get(path) {
    if (!store.has(path)) return null;
    return { stream: new Blob([store.get(path)]).stream(), blob: { pathname: path } };
  },
  async put(path, body, opts) {
    if (opts.access !== 'private') throw new Error('nicht privat!');
    if (!opts.allowOverwrite && store.has(path)) throw new Error('This blob already exists');
    store.set(path, body);
    return { pathname: path };
  },
  async del(path) {
    store.delete(path);
  },
};
let paidUsers = new Set();
let lastCheckout = '';
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  const res = (status, body) => ({ ok: status < 400, status, json: async () => body });
  if (u.startsWith('https://api.stripe.com/v1/payment_intents/search')) {
    const q = decodeURIComponent(u.split('query=')[1]);
    const m = q.match(/user_id'\]:'(\w+)'/);
    return res(200, { data: m && paidUsers.has(m[1]) ? [{ id: 'pi' }] : [] });
  }
  if (u.startsWith('https://api.stripe.com/v1/checkout/sessions/cs_')) {
    const id = u.split('/').pop();
    const [, uid] = id.split('__');
    return res(200, { payment_status: id.startsWith('cs_paid') ? 'paid' : 'unpaid', client_reference_id: uid, metadata: { product: 'tln_full' } });
  }
  if (u.startsWith('https://api.stripe.com/v1/checkout/sessions?')) return res(200, { data: [] });
  if (u === 'https://api.stripe.com/v1/checkout/sessions') {
    lastCheckout = decodeURIComponent(opts.body);
    return res(200, { url: 'https://checkout.stripe.com/c/pay/cs_x' });
  }
  return res(404, {});
};
const mockRes = () => ({ statusCode: 0, setHeader() {}, end(b) { this.body = b; } });
async function call(name, body, method = 'POST') {
  const mod = await import(API + name + '.js');
  const res = mockRes();
  await mod.default({ method, body, headers: { host: 'the-last-night-seven.vercel.app' } }, res);
  return { status: res.statusCode, body: JSON.parse(res.body) };
}
const R = [];
const ok = (n, c, i) => R.push((c ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? '  ' + JSON.stringify(i) : ''));
let r = await call('config', null, 'GET');
ok('config: Konten + Zahlung aktiv, keine Geheimnisse', r.body.accounts && r.body.payments && !JSON.stringify(r.body).match(/secret|sk_|blob_rw/), r.body);
r = await call('auth', { action: 'register', email: 'kein-email', password: '12345678' });
ok('Registrierung: ungültige E-Mail -> 400', r.status === 400, r.body);
r = await call('auth', { action: 'register', email: 'anna@example.de', password: 'kurz' });
ok('Registrierung: Passwort zu kurz -> 400', r.status === 400, r.body);
r = await call('auth', { action: 'register', email: 'Anna@Example.de ', password: 'geheim123', name: 'Anna' });
ok('Registrierung erfolgreich', r.status === 200 && r.body.token && r.body.user.email === 'anna@example.de' && r.body.premium === false, r.body.user);
const tok1 = r.body.token;
const uid = r.body.user.id;
const stored = [...store.values()][0];
ok('Passwort nur als Hash gespeichert', !stored.includes('geheim123') && JSON.parse(stored).hash.length === 128);
ok('E-Mail nicht im Dateinamen', ![...store.keys()][0].includes('anna'), [...store.keys()][0]);
r = await call('auth', { action: 'register', email: 'anna@example.de', password: 'anderes123' });
ok('Doppelte Registrierung -> 409', r.status === 409, r.body);
r = await call('auth', { action: 'login', email: 'anna@example.de', password: 'falsch123' });
ok('Falsches Passwort -> 401', r.status === 401, r.body);
r = await call('auth', { action: 'login', email: 'niemand@example.de', password: 'egal12345' });
ok('Unbekanntes Konto -> gleiche Meldung (401)', r.status === 401 && r.body.error === 'E-Mail oder Passwort ist falsch.', r.body);
r = await call('auth', { action: 'login', email: 'ANNA@example.de', password: 'geheim123' });
ok('Anmeldung erfolgreich', r.status === 200 && r.body.token, r.body.user);
r = await call('me', { token: tok1 });
ok('me mit Sitzung', r.status === 200 && r.body.user.id === uid && r.body.premium === false, r.body);
r = await call('me', { token: tok1.slice(0, -2) + 'xx' });
ok('Manipulierte Sitzung -> 401', r.status === 401, r.body);
r = await call('me', { token: 'abc' });
ok('Unsinniges Token -> 401', r.status === 401, r.body);
r = await call('checkout', { token: tok1 });
ok('Kauf ohne Zustimmung -> 400', r.status === 400, r.body);
r = await call('checkout', { consent: true });
ok('Kauf ohne Anmeldung -> 401', r.status === 401, r.body);
r = await call('checkout', { token: tok1, consent: true });
ok('Kauf: Stripe-Checkout-URL', r.status === 200 && r.body.url.includes('checkout.stripe.com'), r.body);
ok('Kauf: 10 € einmalig, an Konto gebunden', lastCheckout.includes('mode=payment') && lastCheckout.includes('[unit_amount]=1000') && lastCheckout.includes('client_reference_id=' + uid) && lastCheckout.includes('metadata[user_id]=' + uid) && lastCheckout.includes('customer_email=anna@example.de'));
r = await call('verify', { token: tok1, sessionId: 'cs_paid__someoneelse' });
ok('verify: Zahlung eines anderen Kontos zählt nicht', r.body.premium === false, r.body);
r = await call('verify', { token: tok1, sessionId: 'cs_paid__' + uid });
ok('verify: bezahlt -> Vollversion', r.body.premium === true, r.body);
r = await call('me', { token: tok1 });
ok('me danach: Vollversion gespeichert', r.body.premium === true, r.body);
r = await call('checkout', { token: tok1, consent: true });
ok('Kein Doppelkauf', r.body.premium === true && !r.body.url, r.body);
// Kauf über Stripe-Suche erkennen (z.B. anderes Gerät, Rückkehr verpasst)
r = await call('auth', { action: 'register', email: 'ben@example.de', password: 'passwort1' });
const tokB = r.body.token;
paidUsers.add(r.body.user.id);
r = await call('me', { token: tokB });
ok('Kauf ohne Rückkehr wird über Stripe erkannt', r.body.premium === true, r.body);
// Passwort ändern
r = await call('password', { token: tok1, oldPassword: 'falsch', newPassword: 'neuesPW123' });
ok('Passwort ändern: altes Passwort falsch -> 401', r.status === 401, r.body);
r = await call('password', { token: tok1, oldPassword: 'geheim123', newPassword: 'neuesPW123' });
ok('Passwort geändert, neue Sitzung', r.status === 200 && r.body.token, r.body);
const tok2 = r.body.token;
r = await call('me', { token: tok1 });
ok('Alte Sitzungen ungültig nach Passwortwechsel', r.status === 401, r.body);
r = await call('auth', { action: 'login', email: 'anna@example.de', password: 'neuesPW123' });
ok('Anmeldung mit neuem Passwort', r.status === 200, r.body.user);
// Sperre nach Fehlversuchen
for (let i = 0; i < 8; i++) await call('auth', { action: 'login', email: 'anna@example.de', password: 'x' + i + 'falsch' });
r = await call('auth', { action: 'login', email: 'anna@example.de', password: 'neuesPW123' });
ok('Sperre nach 8 Fehlversuchen (429)', r.status === 429, r.body);
// Konto löschen
r = await call('delete', { token: tokB, password: 'falsch' });
ok('Löschen mit falschem Passwort -> 401', r.status === 401, r.body);
r = await call('delete', { token: tokB, password: 'passwort1' });
ok('Konto gelöscht', r.status === 200 && store.size === 1, store.size);
r = await call('me', { token: tokB });
ok('Gelöschtes Konto: Sitzung ungültig', r.status === 401, r.body);
// Ohne Stripe-Schlüssel: Konten gehen, Kauf nicht
delete process.env.STRIPE_SECRET_KEY;
r = await call('config', null, 'GET');
ok('Ohne Stripe: Konten ja, Kauf nein', r.body.accounts === true && r.body.payments === false, r.body);
r = await call('auth', { action: 'register', email: 'carl@example.de', password: 'passwort1' });
ok('Ohne Stripe: Registrierung funktioniert', r.status === 200, r.body.user);
r = await call('checkout', { token: r.body.token, consent: true });
ok('Ohne Stripe: Kauf -> 503', r.status === 503, r.body);
console.log(R.join('\n'));
console.log(R.filter((x) => x.startsWith('PASS')).length + '/' + R.length + ' bestanden');
