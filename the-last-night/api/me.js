// Angemeldetes Konto laden und Kaufstatus ermitteln.
import { send, readBody, handle, httpError, accountsReady, requireUser, publicUser, isPremium } from './_lib.js';

export default handle(async (req, res) => {
  if (req.method !== 'POST') throw httpError(405, 'Nur POST.');
  if (!accountsReady()) throw httpError(503, 'Konten sind im Moment nicht verfügbar.');
  const { token } = await readBody(req);
  const rec = await requireUser(token);
  const premium = await isPremium(rec).catch(() => !!rec.premium);
  send(res, 200, { user: publicUser(rec), premium });
});
