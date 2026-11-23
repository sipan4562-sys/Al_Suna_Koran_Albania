// Nach der Rückkehr von Stripe: Zahlung bestätigen und im Konto vermerken.
import { send, readBody, handle, httpError, paymentsReady, requireUser, stripe, saveUser, PRODUCT } from './_lib.js';

export default handle(async (req, res) => {
  if (req.method !== 'POST') throw httpError(405, 'Nur POST.');
  if (!paymentsReady()) throw httpError(503, 'Der Kauf ist im Moment nicht verfügbar.');
  const { token, sessionId } = await readBody(req);
  if (!sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) throw httpError(400, 'Ungültige Sitzung.');
  const rec = await requireUser(token);
  const s = await stripe('checkout/sessions/' + sessionId);
  const paid = s.payment_status === 'paid' && s.metadata && s.metadata.product === PRODUCT && s.client_reference_id === rec.id;
  if (paid && !rec.premium) {
    rec.premium = true;
    rec.premiumAt = Date.now();
    await saveUser(rec);
  }
  send(res, 200, { premium: paid || !!rec.premium });
});
