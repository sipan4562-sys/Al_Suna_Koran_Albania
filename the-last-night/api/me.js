// Angemeldeten Nutzer prüfen und Kaufstatus aus Stripe ermitteln.
import { send, readBody, verifyGoogle, hasPurchased, configured, handle, httpError } from './_lib.js';

export default handle(async (req, res) => {
  if (req.method !== 'POST') throw httpError(405, 'Nur POST.');
  if (!configured()) throw httpError(503, 'Shop ist nicht eingerichtet.');
  const { idToken } = await readBody(req);
  const user = await verifyGoogle(idToken);
  const premium = await hasPurchased(user.sub);
  send(res, 200, { user, premium });
});
