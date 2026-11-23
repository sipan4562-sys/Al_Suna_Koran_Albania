const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 560 } });
  const page = await ctx.newPage();
  const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) logs.push('console.error: ' + m.text()); });
  let paid = false;
  let loggedIn = false;
  const calls = [];
  await ctx.route('**/api/**', async (route) => {
    const url = route.request().url();
    const body = route.request().postData() || '';
    calls.push(url.replace(/^.*\/api\//, '') + ' ' + body.slice(0, 70));
    const json = (o, st = 200) => route.fulfill({ status: st, contentType: 'application/json', body: JSON.stringify(o) });
    const user = { id: 'u1', email: 'spieler@example.com', name: 'Spieler' };
    if (url.includes('/api/config')) return json({ accounts: true, payments: true, priceCents: 1000, currency: 'EUR' });
    if (url.includes('/api/auth')) {
      const b = JSON.parse(body);
      if (b.password !== 'geheim123') return json({ error: 'E-Mail oder Passwort ist falsch.' }, 401);
      loggedIn = true;
      return json({ token: 'tok.sig', user, premium: paid });
    }
    if (url.includes('/api/me')) return loggedIn ? json({ user, premium: paid }) : json({ error: 'Bitte anmelden.' }, 401);
    if (url.includes('/api/checkout')) { const b = JSON.parse(body); if (!b.consent) return json({ error: 'Zustimmung fehlt' }, 400); return json({ url: 'http://localhost:4173/?debug&purchase=success&session_id=cs_test_ABC' }); }
    if (url.includes('/api/verify')) { paid = true; return json({ premium: true }); }
    return route.fulfill({ status: 404, body: '{}' });
  });
  const R = [];
  const ok = (n, c, i) => R.push((c ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? '  ' + JSON.stringify(i) : ''));
  await page.goto('http://localhost:4173/?debug', { waitUntil: 'load' });
  await page.waitForFunction(() => window.TLN && window.TLN.mode === 'menu' && TLN.account.config, null, { timeout: 120000 });
  ok('Shop-Knopf im Menü', await page.evaluate(() => document.querySelector('#btn-shop').textContent.includes('10')));
  await page.click('#btn-shop');
  await page.waitForTimeout(300);
  ok('Shop-Bildschirm offen', await page.evaluate(() => TLN.ui.current === 'shop'));
  ok('Kaufen gesperrt ohne Anmeldung', await page.evaluate(() => document.querySelector('#shop-step-buy').classList.contains('disabled')));
  await page.screenshot({ path: (process.argv[2] || require('os').tmpdir()) + '/shop_logged_out.png' });
  ok('Anmeldeformular sichtbar (ohne Google)', await page.evaluate(() => !document.querySelector('#auth-form').classList.contains('hidden') && !document.querySelector('script[src*="accounts.google"]')));
  await page.click('.atab[data-mode="register"]');
  await page.fill('#auth-name', 'Spieler');
  await page.fill('#auth-email', 'spieler@example.com');
  await page.fill('#auth-pw', 'geheim123');
  await page.fill('#auth-pw2', 'anders123');
  await page.click('#btn-auth');
  await page.waitForTimeout(300);
  ok('Passwörter müssen übereinstimmen', await page.evaluate(() => TLN.account.message.includes('stimmen nicht')));
  await page.fill('#auth-pw2', 'geheim123');
  await page.fill('#auth-pw', 'falsch99');
  await page.fill('#auth-pw2', 'falsch99');
  await page.click('#btn-auth');
  await page.waitForTimeout(400);
  ok('Fehlermeldung vom Server angezeigt', await page.evaluate(() => document.querySelector('#shop-msg').textContent.includes('falsch')));
  await page.click('.atab[data-mode="login"]');
  await page.fill('#auth-pw', 'geheim123');
  await page.press('#auth-pw', 'Enter');
  await page.waitForFunction(() => TLN.account.loggedIn, null, { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(200);
  ok('Angemeldet (E-Mail angezeigt)', await page.evaluate(() => document.querySelector('#shop-user').textContent.includes('spieler@example.com')), await page.evaluate(() => [document.querySelector('#shop-user').textContent, TLN.account.loggedIn, TLN.account.message]));
  ok('Tippen im Formular steuert nicht das Spiel', await page.evaluate(() => TLN.input.keys.size === 0));
  ok('Noch keine Vollversion', await page.evaluate(() => !TLN.premium));
  ok('Kaufen jetzt möglich', await page.evaluate(() => !document.querySelector('#shop-step-buy').classList.contains('disabled')));
  await page.click('#btn-buy');
  await page.waitForTimeout(300);
  ok('Ohne Zustimmung kein Kauf', await page.evaluate(() => TLN.account.message.includes('bestätige')), await page.evaluate(() => TLN.account.message));
  await page.check('#shop-consent');
  await page.screenshot({ path: (process.argv[2] || require('os').tmpdir()) + '/shop_logged_in.png' });
  await Promise.all([page.waitForNavigation({ timeout: 60000 }), page.click('#btn-buy')]);
  await page.waitForFunction(() => window.TLN && window.TLN.mode === 'menu' && TLN.account.config, null, { timeout: 120000 });
  await page.waitForTimeout(800);
  ok('Nach Rückkehr: Vollversion aktiv', await page.evaluate(() => TLN.premium === true));
  ok('Danke-Meldung + Shop zeigt aktiv', await page.evaluate(() => TLN.ui.current === 'shop' && !document.querySelector('#shop-owned').classList.contains('hidden')), await page.evaluate(() => [TLN.ui.current, TLN.account.message]));
  ok('URL bereinigt', await page.evaluate(() => !location.search.includes('session_id')));
  await page.screenshot({ path: (process.argv[2] || require('os').tmpdir()) + '/shop_owned.png' });
  ok('Server-Aufrufe', calls.some((c) => c.startsWith('checkout')) && calls.some((c) => c.startsWith('verify')), calls);
  // Gameplay mit Vollversion
  const res = await page.evaluate(() => {
    const g = TLN; const out = [];
    const ok = (n, c, i) => out.push((c ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? '  ' + JSON.stringify(i) : ''));
    g.newGame(); g.startPlaying(); g.loopStop();
    const P = g.player, M = g.monster, inv = g.state.inv;
    const step = (sec) => { for (let t = 0; t < sec; t += 1 / 30) g.update(1 / 30); };
    const press = (a) => { g.input.edges.add(a); g.update(1 / 30); };
    ok('Startausrüstung Revolver/Munition/Kreuz', inv.revolver && inv.ammo === 6 && inv.reserve === 6 && inv.cross);
    ok('Munitionskisten sichtbar (nur Vollversion)', g.pickupById.ammo_nurse.available());
    // Schuss auf Monster
    M.awaken({}); M.place(36.5, 21.5, -Math.PI / 2); M.setState('patrol'); M.path = null; M.pause = 30; M.awareness = 0;
    P.spawn(30.5, 21.5, -Math.PI / 2, 0); P.flashOn = true; step(0.2);
    const c = g.camera.position; P.yaw = Math.atan2(-(36.5 - c.x), -(21.5 - c.z)); P.pitch = Math.atan2(M.pos.y + 1.2 - c.y, 6); step(0.1);
    ok('Revolver sichtbar', g.revolver.root.visible);
    press('fire');
    ok('Schuss: Munition 5', inv.ammo === 5, inv.ammo);
    ok('Treffer betäubt Monster', M.state === 'stunned', M.state);
    const d0 = Math.hypot(M.pos.x - P.pos.x, M.pos.z - P.pos.z);
    step(5);
    ok('Monster flieht danach', M.state === 'flee' || M.state === 'patrol', M.state);
    step(4);
    const d1 = Math.hypot(M.pos.x - P.pos.x, M.pos.z - P.pos.z);
    ok('Abstand vergrößert', d1 > d0 + 4, [d0.toFixed(1), d1.toFixed(1)]);
    // Fehlschuss in die Wand -> Lärm
    M.place(40, 21.5, Math.PI / 2); M.setState('patrol'); M.path = null; M.pause = 30; M.awareness = 0;
    P.spawn(30.5, 21.5, 0, 0); step(0.1); g.revolver.cooldown = 0;
    press('fire');
    ok('Fehlschuss erzeugt Lärm -> Monster untersucht', M.state === 'investigate', M.state);
    // Nachladen
    inv.ammo = 0; inv.reserve = 6; g.revolver.cooldown = 0; g.revolver.reloadT = 0; press('fire'); step(2.6);
    ok('Automatisches Nachladen', inv.ammo === 6 && inv.reserve === 0, [inv.ammo, inv.reserve]);
    // Kreuzkette
    P.health = 100; P.dead = false; g.mode = 'playing';
    M.place(33, 21.5, -Math.PI / 2); M.setState('chase'); M.lastSeen.copy(P.pos); M.lastSeenTime = M.time; M.awareness = 1.2;
    P.spawn(30.5, 21.5, -Math.PI / 2, 0); P.flashOn = true;
    press('cross');
    ok('Kreuzkette aktiv', g.crossActive());
    let stunned = false;
    for (let i = 0; i < 300; i++) { g.update(1 / 30); if (M.state === 'stunned') stunned = true; }
    ok('Monster kann nicht angreifen (kein Schaden)', P.health === 100 && !P.dead, P.health);
    ok('Monster weicht vor dem Kreuz zurück', stunned);
    g.ab.crossT = 0; press('cross');
    ok('Abklingzeit 2 Minuten', !g.crossActive() && g.ab.crossCd > 100, g.ab.crossCd);
    g.ab.crossCd = 0;
    // Gebet
    M.place(57.5, 30, 0); M.setState('patrol'); M.path = null; M.pause = 30;
    P.spawn(31.5, 21.5, 0, 0);
    press('pray'); step(0.1);
    g.applyCulling(g.camera.position.x, g.camera.position.z);
    ok('Gebet: Monster durch Wände sichtbar', M.model.root.visible && M.model.xray && M.model.xray[0].visible);
    step(6.5); g.applyCulling(g.camera.position.x, g.camera.position.z);
    ok('Gebet endet', !M.model.xray[0].visible && !M.model.root.visible);
    ok('Gebet Abklingzeit', g.ab.prayCd > 40, g.ab.prayCd);
    // Batterie hält länger
    P.battery = 100; P.flashOn = true; step(10);
    ok('Gesegnete Batterie (halber Verbrauch)', Math.abs((100 - P.battery) - 0.42 * 10 * 0.5) < 0.3, 100 - P.battery);
    // Spind + Kreuz: Monster zieht dich nicht heraus
    const lk = g.lockers[0];
    P.spawn(lk.front.x, lk.front.z, 0, 0); P.health = 100; lk.interact();
    M.place(lk.front.x + 1.2, lk.front.z, -Math.PI / 2); M.lockerTarget = lk; M.setState('openLocker');
    g.ab.crossT = 12;
    step(3);
    ok('Kreuz schützt im Spind', g.mode === 'playing' && !P.dead, [g.mode, M.state]);
    g.loopStart();
    return out;
  });
  R.push(...res);
  await page.evaluate(() => { const g = TLN; g.loopStart(); g.monster.place(33.5, 21.5, -Math.PI / 2); g.monster.state = 'scripted'; g.monster.script = (dt, a) => { a.lean = 0.4; }; g.player.spawn(30.5, 21.5, -Math.PI / 2, 0); g.ab.crossT = 12; g.ab.prayT = 6; });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: (process.argv[2] || require('os').tmpdir()) + '/premium_play.png' });
  console.log(R.join('\n'));
  console.log(logs.join('\n') || 'keine Fehler');
  await browser.close();
})();
