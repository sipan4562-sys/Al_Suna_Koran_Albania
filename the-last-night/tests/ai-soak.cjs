const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 320, height: 180 } });
  const logs = [];
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message));
  await page.goto('http://localhost:4173/?debug', { waitUntil: 'load' });
  await page.waitForFunction(() => window.TLN && window.TLN.mode === 'menu', null, { timeout: 120000 });
  const r = await page.evaluate(() => {
    const g = TLN; g.newGame(); g.startPlaying(); g.loopStop();
    const P = g.player, M = g.monster, w = g.world;
    // Alle Türen entriegeln (außer versiegelt), damit die KI das ganze Haus nutzt
    for (const d of Object.values(g.doors)) if (d.lock !== 'sealed' && d.id !== 'bookshelf') d.unlock();
    M.awaken({ sinceEncounter: 200 });
    const counts = {}; let bad = 0, nan = 0, kills = 0, chases = 0, prev = M.state, stuckMax = 0;
    const spots = [[31, 26], [8.5, 16.5], [57.5, 30], [18.5, 30], [35, 7], [63, 33], [27, 40]];
    let si = 0;
    for (let i = 0; i < 18000; i++) {
      if (i % 1800 === 0) { const s = spots[si++ % spots.length]; P.spawn(s[0] + 0.5, s[1] + 0.5, 0, 0); P.health = 100; P.dead = false; g.mode = 'playing'; }
      // Spieler wandert langsam im Kreis
      P.yaw += 0.01; g.input.keys.add('KeyW');
      g.update(1 / 30);
      if (g.mode === 'dying' || g.mode === 'dead') { kills++; g.mode = 'playing'; P.dead = false; P.health = 100; M.setState('search'); M.searchPts = []; }
      counts[M.state] = (counts[M.state] || 0) + 1;
      if (M.state === 'chase' && prev !== 'chase') chases++;
      prev = M.state;
      if (!Number.isFinite(M.pos.x) || !Number.isFinite(M.pos.z)) nan++;
      const cx = Math.floor(M.pos.x), cz = Math.floor(M.pos.z);
      if (M.state !== 'inVent' && w.solid[w.idx(cx, cz)]) bad++;
      stuckMax = Math.max(stuckMax, M.stuck);
    }
    g.input.keys.delete('KeyW');
    return { counts, bad, nan, kills, chases, stuckMax: stuckMax.toFixed(2), visitedVents: counts.inVent || 0 };
  });
  console.log(JSON.stringify(r, null, 1));
  console.log(logs.join('\n'));
  await browser.close();
})();
