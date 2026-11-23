// Passwort ändern (angemeldet). Alte Sitzungen werden dabei ungültig.
import { send, readBody, handle, httpError, accountsReady, requireUser, checkPassword, verifyPassword, hashPassword, saveUser, makeToken, lockCheck, registerFail } from './_lib.js';

export default handle(async (req, res) => {
  if (req.method !== 'POST') throw httpError(405, 'Nur POST.');
  if (!accountsReady()) throw httpError(503, 'Konten sind im Moment nicht verfügbar.');
  const { token, oldPassword, newPassword } = await readBody(req);
  const rec = await requireUser(token);
  lockCheck(rec);
  checkPassword(newPassword);
  if (!(await verifyPassword(String(oldPassword || ''), rec))) {
    await registerFail(rec);
    throw httpError(401, 'Das bisherige Passwort ist falsch.');
  }
  const { salt, hash } = await hashPassword(newPassword);
  rec.salt = salt;
  rec.hash = hash;
  rec.pwv = (rec.pwv || 1) + 1;
  rec.fails = 0;
  await saveUser(rec);
  send(res, 200, { token: makeToken(rec), ok: true });
});
