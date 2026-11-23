// Registrierung und Anmeldung mit E-Mail und Passwort.
import crypto from 'node:crypto';
import {
  send, readBody, handle, httpError, accountsReady, normEmail, checkPassword, userKey, loadUser, saveUser,
  hashPassword, verifyPassword, makeToken, publicUser, isPremium, lockCheck, registerFail,
} from './_lib.js';

export default handle(async (req, res) => {
  if (req.method !== 'POST') throw httpError(405, 'Nur POST.');
  if (!accountsReady()) throw httpError(503, 'Konten sind im Moment nicht verfügbar.');
  const { action, email, password, name } = await readBody(req);
  const mail = normEmail(email);
  const key = userKey(mail);

  if (action === 'register') {
    checkPassword(password);
    if (await loadUser(key)) throw httpError(409, 'Für diese E-Mail-Adresse gibt es schon ein Konto. Bitte anmelden.');
    const { salt, hash } = await hashPassword(password);
    const rec = {
      v: 1,
      key,
      id: crypto.randomUUID().replace(/-/g, ''),
      email: mail,
      name: String(name || '').trim().slice(0, 40) || mail.split('@')[0],
      salt,
      hash,
      pwv: 1,
      premium: false,
      fails: 0,
      lockUntil: 0,
      createdAt: Date.now(),
    };
    try {
      await saveUser(rec, { create: true });
    } catch (e) {
      throw httpError(409, 'Für diese E-Mail-Adresse gibt es schon ein Konto. Bitte anmelden.');
    }
    return send(res, 200, { token: makeToken(rec), user: publicUser(rec), premium: false });
  }

  if (action === 'login') {
    if (typeof password !== 'string' || !password) throw httpError(400, 'Bitte das Passwort eingeben.');
    const rec = await loadUser(key);
    if (!rec) throw httpError(401, 'E-Mail oder Passwort ist falsch.');
    lockCheck(rec);
    if (!(await verifyPassword(password, rec))) {
      await registerFail(rec);
      throw httpError(401, 'E-Mail oder Passwort ist falsch.');
    }
    if (rec.fails || rec.lockUntil) {
      rec.fails = 0;
      rec.lockUntil = 0;
      await saveUser(rec);
    }
    const premium = await isPremium(rec).catch(() => !!rec.premium);
    return send(res, 200, { token: makeToken(rec), user: publicUser(rec), premium });
  }

  throw httpError(400, 'Unbekannte Aktion.');
});
