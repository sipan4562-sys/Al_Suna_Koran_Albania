// Konto endgültig löschen (Passwort zur Bestätigung).
import { send, readBody, handle, httpError, accountsReady, requireUser, verifyPassword, deleteUser, lockCheck, registerFail } from './_lib.js';

export default handle(async (req, res) => {
  if (req.method !== 'POST') throw httpError(405, 'Nur POST.');
  if (!accountsReady()) throw httpError(503, 'Konten sind im Moment nicht verfügbar.');
  const { token, password } = await readBody(req);
  const rec = await requireUser(token);
  lockCheck(rec);
  if (!(await verifyPassword(String(password || ''), rec))) {
    await registerFail(rec);
    throw httpError(401, 'Das Passwort ist falsch.');
  }
  await deleteUser(rec);
  send(res, 200, { ok: true });
});
