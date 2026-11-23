const API = new URL('../api/', import.meta.url).pathname;
process.env.GOOGLE_CLIENT_ID = 'cid.apps.googleusercontent.com';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
const log = [];
let paidSubs = new Set();
let lastCheckoutParams = '';
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  log.push((opts.method || 'GET') + ' ' + u.replace(/id_token=[^&]+/, 'id_token=…').slice(0, 110));
  const res = (status, body) => ({ ok: status < 400, status, json: async () => body });
  if (u.startsWith('https://oauth2.googleapis.com/tokeninfo')) {
    const tok = decodeURIComponent(u.split('id_token=')[1]);
    if (tok === 'good') return res(200, { aud: process.env.GOOGLE_CLIENT_ID, iss: 'https://accounts.google.com', sub: '1077', email: 'a@b.de', email_verified: 'true', exp: String(Math.floor(Date.now() / 1000) + 3600), name: 'Anna' });
    if (tok === 'otherapp') return res(200, { aud: 'fremd', iss: 'accounts.google.com', sub: '9', email: 'x@y.de', email_verified: 'true', exp: String(Math.floor(Date.now() / 1000) + 3600) });
    return res(400, { error: 'invalid_token' });
  }
  if (u.startsWith('https://api.stripe.com/v1/payment_intents/search')) {
    if (opts.headers.Authorization !== 'Bearer sk_test_dummy') return res(401, { error: { message: 'bad key' } });
    const q = decodeURIComponent(u.split('query=')[1]);
    const m = q.match(/google_sub'\]:'(\w+)'/);
    return res(200, { data: m && paidSubs.has(m[1]) ? [{ id: 'pi_1' }] : [] });
  }
  if (u.startsWith('https://api.stripe.com/v1/checkout/sessions/cs_')) {
    const id = u.split('/').pop();
    return res(200, id === 'cs_paid' ? { payment_status: 'paid', client_reference_id: '1077', metadata: { product: 'tln_full', google_sub: '1077' }, customer_details: { email: 'a@b.de' } } : { payment_status: 'unpaid', metadata: { product: 'tln_full' } });
  }
  if (u.startsWith('https://api.stripe.com/v1/checkout/sessions?')) return res(200, { data: [] });
  if (u === 'https://api.stripe.com/v1/checkout/sessions' && opts.method === 'POST') {
    lastCheckoutParams = decodeURIComponent(opts.body);
    return res(200, { id: 'cs_new', url: 'https://checkout.stripe.com/c/pay/cs_new' });
  }
  return res(404, {});
};
function mockRes() {
  return { statusCode: 0, headers: {}, body: '', setHeader(k, v) { this.headers[k] = v; }, end(b) { this.body = b; } };
}
async function call(name, method, body, headers = { host: 'the-last-night-seven.vercel.app' }) {
  const mod = await import(API + name + '.js');
  const res = mockRes();
  await mod.default({ method, body, headers }, res);
  return { status: res.statusCode, body: JSON.parse(res.body) };
}
const R = [];
const ok = (n, c, i) => R.push((c ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? '  ' + JSON.stringify(i) : ''));
let r = await call('config', 'GET');
ok('config: Zahlungen aktiv, Preis 1000', r.body.payments === true && r.body.priceCents === 1000 && !JSON.stringify(r.body).includes('sk_'), r.body);
r = await call('me', 'POST', { idToken: 'bad' });
ok('me: ungültiges Token -> 401', r.status === 401, r);
r = await call('me', 'POST', { idToken: 'otherapp' });
ok('me: Token einer fremden App -> 401', r.status === 401, r.body);
r = await call('me', 'POST', { idToken: 'good' });
ok('me: gültig, noch nicht gekauft', r.status === 200 && r.body.premium === false && r.body.user.sub === '1077', r.body);
r = await call('checkout', 'POST', { idToken: 'good' });
ok('checkout ohne Zustimmung -> 400', r.status === 400, r.body);
r = await call('checkout', 'POST', { idToken: 'good', consent: true });
ok('checkout: Stripe-URL', r.status === 200 && r.body.url.startsWith('https://checkout.stripe.com'), r.body);
ok('checkout: Einmalzahlung 10 € (kein Abo)', lastCheckoutParams.includes('mode=payment') && lastCheckoutParams.includes('[unit_amount]=1000') && lastCheckoutParams.includes('[currency]=eur') && !lastCheckoutParams.includes('subscription'));
ok('checkout: Konto-Zuordnung + Rücksprung', lastCheckoutParams.includes('client_reference_id=1077') && lastCheckoutParams.includes('metadata[google_sub]=1077') && lastCheckoutParams.includes('success_url=https://the-last-night-seven.vercel.app/?purchase=success&session_id={CHECKOUT_SESSION_ID}'));
r = await call('verify', 'POST', { sessionId: 'cs_paid' });
ok('verify: bezahlte Sitzung -> premium', r.body.premium === true && r.body.user.sub === '1077', r.body);
r = await call('verify', 'POST', { sessionId: 'cs_unpaid' });
ok('verify: unbezahlt -> kein premium', r.body.premium === false, r.body);
r = await call('verify', 'POST', { sessionId: '../../etc' });
ok('verify: ungültige ID -> 400', r.status === 400, r.body);
paidSubs.add('1077');
r = await call('me', 'POST', { idToken: 'good' });
ok('me: nach Kauf premium (Stripe-Suche)', r.body.premium === true, r.body);
r = await call('checkout', 'POST', { idToken: 'good', consent: true });
ok('checkout: kein Doppelkauf', r.body.premium === true && !r.body.url, r.body);
delete process.env.STRIPE_SECRET_KEY;
r = await call('me', 'POST', { idToken: 'good' });
ok('ohne Stripe-Schlüssel: 503 statt Absturz', r.status === 503, r.body);
r = await call('config', 'GET');
ok('config ohne Schlüssel: payments=false', r.body.payments === false, r.body);
r = await call('me', 'GET');
console.log(R.join('\n'));
