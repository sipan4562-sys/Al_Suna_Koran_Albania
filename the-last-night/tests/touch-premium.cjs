const { chromium, devices } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await browser.newContext({ ...devices['iPhone 13 landscape'], deviceScaleFactor: 1 });
  await ctx.route('**/accounts.google.com/**', (r) => r.abort());
  await ctx.route('**/api/**', (route) => {
    const u = route.request().url();
    const j = (o) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) });
    if (u.includes('config')) return j({ googleClientId: 'x', payments: true, priceCents: 1000 });
    if (u.includes('me')) return j({ user: { sub: '1', email: 'a@b.de', name: 'A' }, premium: true });
    return j({});
  });
  const page = await ctx.newPage();
  const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
  await page.goto('http://localhost:4173/?debug', { waitUntil: 'load' });
  await page.waitForFunction(() => window.TLN && TLN.mode === 'menu' && TLN.account.config, null, { timeout: 120000 });
  await page.evaluate(() => TLN.account.onCredential('tok'));
  await page.waitForTimeout(400);
  await page.tap('#btn-new'); await page.waitForTimeout(300); await page.tap('#btn-intro'); await page.waitForTimeout(500);
  const R = [];
  const ok = (n, c, i) => R.push((c ? 'PASS ' : 'FAIL ') + n + (i !== undefined ? '  ' + JSON.stringify(i) : ''));
  ok('Vollversion aktiv', await page.evaluate(() => TLN.premium));
  ok('Touch-Buttons Vollversion sichtbar', await page.evaluate(() => ['#tb-fire', '#tb-cross', '#tb-pray'].every((s) => getComputedStyle(document.querySelector(s)).display !== 'none')));
  // Überlappungen prüfen
  const overlaps = await page.evaluate(() => {
    const ids = ['#tb-pause', '#tb-inv', '#tb-interact', '#tb-flash', '#tb-crouch', '#tb-sprint', '#tb-fire', '#tb-cross', '#tb-pray', '#tb-reload', '#tb-heal', '#tb-throw'];
    document.querySelectorAll('#tb-reload,#tb-heal,#tb-throw').forEach((e) => (e.style.display = 'flex'));
    const rs = ids.map((id) => [id, document.querySelector(id).getBoundingClientRect()]);
    const out = [];
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
      const a = rs[i][1], b = rs[j][1];
      if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) out.push(rs[i][0] + '/' + rs[j][0]);
    }
    const off = rs.filter(([, r]) => r.left < 0 || r.top < 0 || r.right > innerWidth || r.bottom > innerHeight).map(([id]) => id);
    return { out, off };
  });
  ok('Keine überlappenden Buttons', overlaps.out.length === 0 && overlaps.off.length === 0, overlaps);
  await page.evaluate(() => { const g = TLN; g.monster.awaken({}); g.monster.place(36.5, 21.5, -1.57); g.monster.setState('patrol'); g.monster.pause = 30; g.player.spawn(30.5, 21.5, -Math.PI / 2, 0.02); });
  await page.waitForTimeout(500);
  await page.tap('#tb-fire');
  await page.waitForTimeout(500);
  ok('Schießen per Touch', await page.evaluate(() => TLN.state.inv.ammo === 5), await page.evaluate(() => [TLN.state.inv.ammo, TLN.monster.state]));
  await page.tap('#tb-cross');
  await page.waitForTimeout(300);
  ok('Kreuzkette per Touch', await page.evaluate(() => TLN.crossActive()));
  await page.tap('#tb-pray');
  await page.waitForTimeout(300);
  ok('Gebet per Touch', await page.evaluate(() => TLN.ab.prayT > 0));
  await page.screenshot({ path: (process.argv[2] || require('os').tmpdir()) + '/touch_premium.png' });
  console.log(R.join('\n'));
  console.log(logs.join('\n') || 'keine Fehler');
  await browser.close();
})();
