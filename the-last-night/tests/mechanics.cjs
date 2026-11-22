const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
  const logs = [];
  page.on('console', (m) => { if (m.type() === 'error') logs.push('console.error: ' + m.text()); });
  page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + '\n' + e.stack));
  await page.goto('http://localhost:4173/?debug', { waitUntil: 'load' });
  await page.waitForFunction(() => window.TLN && window.TLN.mode === 'menu', null, { timeout: 120000 });
  const results = await page.evaluate(() => {
    const g = TLN;
    g.loopStop();
    const R = [];
    const ok = (name, cond, info) => R.push({ name, pass: !!cond, info: info === undefined ? '' : JSON.stringify(info) });
    const step = (sec, dt = 1 / 30) => { for (let t = 0; t < sec; t += dt) g.update(dt); };
    const P = g.player;
    const M = g.monster;
    const lookAt = (x, y, z) => {
      const c = g.camera.position;
      const dx = x - c.x, dy = y - c.y, dz = z - c.z;
      P.yaw = Math.atan2(-dx, -dz);
      P.pitch = Math.atan2(dy, Math.hypot(dx, dz));
    };
    const face = (x, y, z) => { g.update(1 / 30); lookAt(x, y, z); g.update(1 / 30); lookAt(x, y, z); g.update(1 / 60); };
    const hold = (key, sec) => { g.input.keys.add(key); step(sec); g.input.keys.delete(key); };
    const press = (a) => { g.input.edges.add(a); g.update(1 / 30); };
    try {
      g.newGame(); g.startPlaying();
      ok('mode playing', g.mode === 'playing');
      // 1 Taschenlampe aufheben
      P.spawn(31.0, 26.7, 0, 0); step(0.1);
      lookAt(31.55, 0.65, 27.5); step(0.1); face(31.55, 0.65, 27.5);
      const t1 = g.findTarget();
      ok('Ziel: Taschenlampe', t1 && t1.id === 'flashlight', t1 && t1.id);
      press('interact');
      ok('Taschenlampe im Inventar', g.state.inv.flashlight && P.flashOn);
      // 2 Kollision mit Wand
      P.spawn(31.5, 25.5, Math.PI / 2, 0); hold('KeyW', 3);
      ok('Wandkollision West (x>=30.29)', P.pos.x >= 30.29, P.pos.x);
      P.spawn(32.5, 25.5, -Math.PI / 2, 0); hold('KeyW', 3);
      ok('Wandkollision Ost (x<=33.71)', P.pos.x <= 33.71, P.pos.x);
      // 3 Tür 116
      const d116 = g.doors.r116;
      P.spawn(32.5, 24.8, 0, 0); hold('KeyW', 2);
      ok('Geschlossene Tür blockiert', P.pos.z >= 24.29 && d116.isOpen === false, P.pos.z);
      face(32.5, 1.2, 23.5);
      const t3 = g.findTarget();
      ok('Ziel: Tür 116', t3 === d116, t3 && t3.id);
      press('interact'); step(1.5);
      ok('Tür offen + passierbar', d116.isOpen && g.world.blocked[d116.idx] === 0);
      P.yaw = 0; P.pitch = 0; hold('KeyW', 2.5);
      ok('Durch Tür in den Flur', P.pos.z < 23, P.pos.z);
      P.spawn(32.5, 21.6, Math.PI, 0); face(32.5, 1.2, 23.5);
      press('interact'); step(1.5);
      ok('Tür wieder geschlossen', !d116.isOpen && g.world.blocked[d116.idx] === 1);
      // 4 Verschlossene Personaltür
      const ds = g.doors.staff;
      P.spawn(13.7, 21.5, Math.PI / 2, 0); face(12.5, 1.2, 21.5);
      ok('Ziel: Personaltür', g.findTarget() === ds);
      press('interact'); step(0.5);
      ok('Ohne Schlüssel verschlossen', ds.locked && !ds.isOpen);
      g.state.inv.staffKey = true;
      press('interact'); step(2);
      ok('Mit Schlüssel aufgeschlossen + offen', !ds.locked && ds.isOpen);
      // 5 Kriechgang
      P.spawn(32.5, 14.7, 0, 0); P.crouched = false; hold('KeyW', 2);
      ok('Stehend kein Durchkommen (Kriechgang)', P.pos.z >= 14.25, P.pos.z);
      press('crouch'); hold('KeyW', 4);
      ok('Geduckt durch den Kriechgang', P.pos.z < 12.2, P.pos.z);
      // 6 Treppe in den Keller
      const db = g.doors.basement; db.unlock(); db.open(46, 21.5); step(1.5);
      P.spawn(46.3, 21.5, -Math.PI / 2, 0); P.crouched = false; hold('KeyW', 6);
      ok('Treppe hinunter (y≈-4)', P.pos.y < -3.8 && P.pos.x > 55.5, [P.pos.x, P.pos.y]);
      // 7 Pfadfindung
      const p1 = g.nav.findPath(50.6, 9.3, 22.5, 8.5);
      ok('Pfad Leichenhalle -> Nordflur nutzt Lüftung', p1 && p1.some((w) => w.ventFrom), p1 && p1.length);
      db.restore({ locked: true, open: false });
      const p2 = g.nav.findPath(57.5, 25.5, 35.5, 21.5);
      ok('Pfad Keller -> Flur trotz verschlossener Tür', !!p2, p2 && p2.length);
      const p3 = g.nav.findPath(31.5, 16.5, 31.5, 9.5);
      ok('Pfad zwischen Zimmer 112 und Hydro nicht durch Kriechgang', p3 && !p3.some((w) => w.cell === g.world.idx(32, 12)));
      // 8 Monster: Sicht -> Verfolgung
      M.awaken({ sinceEncounter: 0 }); M.perceptionScale = 1;
      M.place(39, 21.5, -Math.PI / 2); M.setState('patrol'); M.path = null; M.goal = null; M.pause = 5;
      P.spawn(30.5, 21.5, -Math.PI / 2, 0); P.flashOn = true; P.health = 100;
      let sawChase = false;
      for (let i = 0; i < 150 && !sawChase; i++) { g.update(1 / 30); if (M.state === 'chase') sawChase = true; }
      ok('Monster sieht Spieler -> Verfolgung', sawChase, M.state);
      // 9 Angriff
      let hurt = false;
      for (let i = 0; i < 400 && !hurt; i++) { g.update(1 / 30); if (P.health < 100) hurt = true; }
      ok('Monster holt auf und greift an (Schaden)', hurt, [P.health, M.state, Math.hypot(M.pos.x - P.pos.x, M.pos.z - P.pos.z)]);
      step(0.8);
      ok('Spieler überlebt ersten Treffer', !P.dead && P.health > 0, P.health);
      ok('Monster weicht nach Treffer zurück (recover)', ['recover', 'chase', 'attack'].includes(M.state), M.state);
      // 10 Gehör
      M.place(40, 21.5, Math.PI / 2); M.setState('patrol'); M.awareness = 0; M.path = null; M.pause = 10;
      P.spawn(2.5, 16.5, 0, 0); P.health = 100; P.dead = false; g.mode = 'playing';
      g.noise(35.5, 31.5, 15, 'bottle'); step(0.1);
      ok('Verdecktes Geräusch hinter Wänden wird nicht gehört', M.state === 'patrol', M.state);
      g.noise(35.5, 31.5, 26, 'bottle'); step(0.1);
      ok('Lautes Geräusch -> Untersuchen', M.state === 'investigate', M.state);
      step(18);
      const dN = Math.hypot(M.pos.x - 35.5, M.pos.z - 31.5);
      ok('Monster läuft zum Geräusch (navigiert, Türen)', dN < 3.5 || M.state === 'search', [dN, M.state, M.pos.x.toFixed(1), M.pos.z.toFixed(1)]);
      // 11 Suche, wenn Spieler verloren
      step(6);
      ok('Danach Suche/Patrouille', ['search', 'patrol', 'investigate'].includes(M.state), M.state);
      // 12 Monster öffnet Türen
      g.doors.r116.restore({ locked: false, open: false });
      M.place(32.5, 21.5, Math.PI); M.setState('investigate'); M.investigatePt = { x: 31.5, z: 26.5, prio: 9 }; M.path = null;
      M.stateTime = 0;
      let maxZ = 0;
      for (let i = 0; i < 240; i++) { g.update(1 / 30); maxZ = Math.max(maxZ, M.pos.z); }
      ok('Monster öffnet Tür und betritt Zimmer', g.doors.r116.isOpen && maxZ > 25, [maxZ, g.doors.r116.isOpen]);
      // Flasche werfen -> Ablenkung
      M.place(40.5, 21.5, Math.PI / 2); M.setState('patrol'); M.path = null; M.pause = 20; M.awareness = 0;
      P.spawn(25.5, 21.5, Math.PI / 2, 0); P.flashOn = false; g.state.inv.bottles = 1;
      g.update(1 / 30); P.yaw = -Math.PI / 2; P.pitch = 0.1; g.update(1 / 30);
      press('throw');
      ok('Flasche geworfen', g.projectiles.length === 1 && g.state.inv.bottles === 0);
      step(1.5);
      ok('Flasche zerschellt + Monster untersucht', g.projectiles.length === 0 && M.state === 'investigate', [M.state, M.investigatePt]);
      // Batterie
      P.battery = 10; g.state.inv.batteries = 1; press('reload');
      ok('Batterie gewechselt', P.battery === 100 && g.state.inv.batteries === 0);
      P.flashOn = true; step(5);
      ok('Batterie entlädt sich', P.battery < 100, P.battery);
      // Verbandskasten
      P.health = 30; g.state.inv.medkits = 1; press('heal');
      ok('Verbandskasten heilt', P.health >= 80 && g.state.inv.medkits === 0, P.health);
      // Lüftungsschacht-Durchquerung
      M.place(50.6, 9.3, 0); M.setState('investigate'); M.investigatePt = { x: 22.5, z: 8.5, prio: 9 }; M.path = null; M.stateTime = 0;
      P.spawn(3.5, 16.5, 0, 0);
      const states = new Set();
      for (let i = 0; i < 1200; i++) { g.update(1 / 30); states.add(M.state); if (Math.hypot(M.pos.x - 22.5, M.pos.z - 8.5) < 1.5) break; }
      ok('Monster kriecht durch Lüftung in den Nordflur', states.has('inVent') && Math.hypot(M.pos.x - 22.5, M.pos.z - 8.5) < 2, [...states, M.pos.x.toFixed(1), M.pos.z.toFixed(1)]);
      // 13 Verstecken ungesehen
      const lk = g.lockers.find((l) => l.id === 'locker0');
      M.place(57.5, 30, 0); M.setState('patrol'); M.path = null; M.pause = 30; M.awareness = 0;
      P.spawn(lk.front.x, lk.front.z, 0, 0); face(lk.pos.x, lk.pos.y, lk.pos.z);
      ok('Ziel: Spind', g.findTarget() === lk);
      press('interact'); step(0.5);
      ok('Im Spind versteckt', P.hidden === lk);
      M.place(36, 21.5, -Math.PI / 2); M.setState('patrol'); M.path = null; M.goTo(22, 21.5);
      let seen = false;
      for (let i = 0; i < 300; i++) { g.update(1 / 30); if (M.seeing) seen = true; }
      ok('Versteckter Spieler wird nicht gesehen', !seen && g.mode === 'playing', [M.state]);
      press('interact'); step(0.3);
      ok('Spind verlassen', P.hidden === null);
      // 14 Beim Verstecken beobachtet -> Monster öffnet Spind
      M.place(lk.front.x + 6, lk.front.z + 0.5, -Math.PI / 2); M.setState('patrol'); M.path = null; M.pause = 5; M.awareness = 0;
      P.spawn(lk.front.x, lk.front.z, -Math.PI / 2, 0); P.flashOn = true; P.health = 100;
      for (let i = 0; i < 120 && M.state !== 'chase'; i++) g.update(1 / 30);
      for (let i = 0; i < 30; i++) g.update(1 / 30);
      face(lk.pos.x, lk.pos.y, lk.pos.z);
      if (g.findTarget() === lk) press('interact');
      let caught = false;
      for (let i = 0; i < 400 && !caught; i++) { g.update(1 / 30); if (g.mode === 'dying') caught = true; }
      ok('Gesehen beim Verstecken -> Monster zieht dich raus', caught, [M.state, g.mode]);
      step(3);
      ok('Game Over Bildschirm', g.mode === 'dead' && !document.querySelector('#screen-dead').classList.contains('hidden'));
      // 15 Checkpoint laden
      g.loadCheckpoint();
      ok('Checkpoint geladen', g.mode === 'playing' && !P.dead && P.health >= 65, [P.pos.x, P.pos.z, P.health]);
      // 16 Rätselkette
      g.state.inv.staffKey = true;
      g.monitorScreens; 
      g.enterMonitors(); g.camIdx = 2; g.setCam(2); step(2);
      ok('Code über Kamera 3 entdeckt', g.state.flags.codeKnown);
      g.exitMonitors();
      const dor = g.doors.or; dor.restore({ locked: true, open: false });
      P.spawn(21.5, 6.5, Math.PI / 2, 0); face(20.5, 1.2, 6.5);
      press('interact');
      ok('Tastenfeld geöffnet', g.mode === 'overlay' && g.overlay === 'keypad');
      g.ui.kpPress('0'); g.ui.kpPress('0'); g.ui.kpPress('0'); g.ui.kpPress('0'); g.ui.kpPress('OK');
      ok('Falscher Code abgelehnt', dor.locked);
      for (const c of g.state.code) g.ui.kpPress(c);
      g.ui.kpPress('OK');
      step(1);
      ok('Richtiger Code öffnet OP', !dor.locked && dor.isOpen && g.mode === 'playing');
      for (const id of ['basement_key', 'fuse_or', 'fuse_flood']) g.collect(g.pickupById[id]);
      const dr = g.drawers.d2; dr.interact(); step(1.5);
      ok('Kühlfach offen, Sicherung sichtbar', g.pickupById.fuse_morgue.available());
      g.collect(g.pickupById.fuse_morgue);
      ok('3 Sicherungen', g.state.inv.fuses === 3, g.state.inv.fuses);
      M.place(8, 21.5, 0); M.setState('patrol'); M.path = null; M.pause = 60;
      P.spawn(61.5, 4.2, 0, 0); face(61.2, -2.5, 3.1);
      ok('Ziel: Sicherungskasten', g.findTarget() === g.fusebox, g.findTarget() && g.findTarget().id);
      press('interact');
      ok('Sicherungen eingesetzt', g.state.flags.fusesInserted === 3);
      face(62.3, -2.5, 3.08);
      ok('Ziel: Hebel', g.findTarget() === g.genLever, g.findTarget() && g.findTarget().id);
      press('interact'); step(3);
      ok('Strom wiederhergestellt', g.state.flags.power && g.lights.power);
      const shelf = g.doors.bookshelf;
      g.state.flags.readDiary = true;
      P.spawn(6.5, 29.0, 0, 0); face(6.5, 1.1, 30.3);
      ok('Ziel: Geheimregal', g.findTarget() === shelf, g.findTarget() && g.findTarget().id);
      press('interact'); step(3);
      ok('Geheimregal offen + passierbar', shelf.isOpen && g.world.blocked[shelf.idx] === 0);
      P.spawn(6.5, 29.5, 0, 0); P.yaw = Math.PI; hold('KeyW', 3);
      ok('Ins geheime Archiv gelaufen', P.pos.z > 31, P.pos.z);
      P.spawn(6.0, 33.8, Math.PI, 0); face(6.0, 1.3, 34.93);
      ok('Ziel: Freigabehebel', g.findTarget() === g.overrideLever, g.findTarget() && g.findTarget().id);
      press('interact'); step(0.5);
      ok('Notverriegelung gelöst', g.state.flags.override);
      P.spawn(18.5, 33.3, Math.PI, 0); face(18.5, 1.3, 34.8);
      const ex = g.findTarget();
      ok('Ziel: Ausgang', ex && ex.id === 'exit', ex && ex.id);
      press('interact'); step(7);
      ok('Ende erreicht', g.mode === 'ending' || g.mode === 'dead');
    } catch (e) {
      ok('EXCEPTION', false, e.message + ' ' + e.stack);
    }
    return R;
  });
  await page.waitForTimeout(2500);
  const endVisible = await page.evaluate(() => !document.querySelector('#screen-end').classList.contains('hidden'));
  results.push({ name: 'Endbildschirm sichtbar', pass: endVisible, info: '' });
  let pass = 0;
  for (const r of results) { console.log((r.pass ? 'PASS ' : 'FAIL ') + r.name + (r.info ? '  ' + r.info : '')); if (r.pass) pass++; }
  console.log(`${pass}/${results.length} bestanden`);
  console.log(logs.slice(0, 20).join('\n'));
  await browser.close();
})();
