// Nach der Rückkehr von Stripe: Zahlung einer Checkout-Session bestätigen.
import { send, readBody, stripe, configured, handle, httpError, PRODUCT } from './_lib.js';

export default handle(async (req, res) => {
  if (req.method !== 'POST') throw httpError(405, 'Nur POST.');
  if (!configured()) throw httpError(503, 'Shop ist nicht eingerichtet.');
  const { sessionId } = await readBody(req);
  if (!sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) throw httpError(400, 'Ungültige Sitzung.');
  const s = await stripe('checkout/sessions/' + sessionId);
  const paid = s.payment_status === 'paid' && s.metadata && s.metadata.product === PRODUCT;
  send(res, 200, {
    premium: paid,
    user: paid ? { sub: s.client_reference_id, email: (s.customer_details && s.customer_details.email) || s.customer_email || '' } : null,
  });
});
