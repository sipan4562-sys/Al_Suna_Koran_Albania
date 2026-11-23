// Bestückung der Anstalt: Möbel, Lampen, Decals, Gegenstände, Rätselobjekte.
import * as THREE from 'three';
import * as P from './props.js';
import { MAT, decalMaterial, emissiveMaterial } from '../materials.js';
import { DECAL, makeWritingTexture, makeCodeTexture, makeSignTexture } from '../textures.js';
import { DOORS, LOCKERS, VENTS, SECRET_DOOR } from './layout.js';
import { Door, SecretShelf, Locker, Pickup, FuseBox, Lever, Drawer, Interactable, VentHatch } from '../entities.js';
import { mulberry32 } from '../utils.js';

export function populate(game, batcher) {
  const { world, scene, lights } = game;
  const ents = game.entities;
  const rng = mulberry32(1987);

  const paperGroup = new THREE.Group();
  const add = (res) => {
    batcher.add(res.group);
    if (res.collider) world.addCollider(res.collider);
    if (res.colliders) res.colliders.forEach((c) => world.addCollider(c));
    return res;
  };
  const decalMats = new Map();
  const dmat = (tex, o = {}) => {
    const key = tex.uuid + (o.roughness || '');
    if (!decalMats.has(key)) decalMats.set(key, decalMaterial(tex, o));
    return decalMats.get(key);
  };
  const decalMesh = (tex, w, h, o) => {
    const m = new THREE.Mesh(P.G.plane, dmat(tex, o));
    m.scale.set(w, h, 1);
    m.castShadow = false;
    m.receiveShadow = true;
    m.renderOrder = 2;
    return m;
  };
  // face: Richtung, in die das Decal schaut ('+x','-x','+z','-z')
  const wallDecal = (tex, x, y, z, face, w, h, o) => {
    const m = decalMesh(tex, w, h, o);
    const off = 0.012;
    m.position.set(x, y, z);
    if (face === '+x') {
      m.rotation.y = Math.PI / 2;
      m.position.x += off;
    } else if (face === '-x') {
      m.rotation.y = -Math.PI / 2;
      m.position.x -= off;
    } else if (face === '-z') {
      m.rotation.y = Math.PI;
      m.position.z -= off;
    } else m.position.z += off;
    if (o && o.rot) m.rotation.z = o.rot;
    batcher.add(m);
    return m;
  };
  const floorDecal = (tex, x, z, w, h, rot = 0, o) => {
    const m = decalMesh(tex, w, h, o);
    m.rotation.set(-Math.PI / 2, 0, rot);
    m.position.set(x, world.floorAt(x, z) + 0.006 + rng() * 0.002, z);
    batcher.add(m);
    return m;
  };
  const blood = (x, z, s = 1) => floorDecal(DECAL.blood[(rng() * 3) | 0], x, z, 1.1 * s, 1.1 * s, rng() * 6);
  const writingCache = new Map();
  const writing = (text, x, y, z, face, w, h, seed) => {
    if (!writingCache.has(text)) writingCache.set(text, makeWritingTexture(text, { seed }));
    return wallDecal(writingCache.get(text), x, y, z, face, w, h);
  };
  lights.batcher = batcher;
  const L = (type, x, y, z, pre, post, o = {}) => lights.add(type, x, y, z, { pre, post, ...o });
  const FACE_RY = { '+z': 0, '-z': Math.PI, '+x': Math.PI / 2, '-x': -Math.PI / 2 };
  const FACE_OFF = { '+z': [0, 0.01], '-z': [0, -0.01], '+x': [0.01, 0], '-x': [-0.01, 0] };
  const cross = (x, y, z, face, size = 1, o = {}) => {
    const [ox, oz] = FACE_OFF[face];
    batcher.add(P.crucifix(x + ox, y, z + oz, FACE_RY[face], size, o).group);
  };
  const ghostCross = (x, y, z, face) => wallDecal(DECAL.crossGhost, x, y, z, face, 0.42, 0.63);
  const paintedCache = new Map();
  const painted = (text, x, y, z, face, w, h) => {
    if (!paintedCache.has(text))
      paintedCache.set(text, makeWritingTexture(text, { painted: true, color: 'rgba(28,22,16,', font: '"Times New Roman", Georgia, serif', weight: 'bold', size: 150 }));
    return wallDecal(paintedCache.get(text), x, y, z, face, w, h);
  };
  const pick = (id, item, x, y, z, o = {}) => {
    if (game.pickupById[id]) return;
    const p = new Pickup(game, { id, item, x, y, z, ...o });
    ents.push(p);
    game.pickupById[id] = p;
    return p;
  };

  // ------------------------------------------------------------------ Türen
  for (const d of DOORS) {
    const door = new Door(game, d, batcher);
    ents.push(door);
    game.doors[d.id] = door;
  }
  const shelfDef = { ...SECRET_DOOR, axis: SECRET_DOOR.axis || 'z', lock: 'secret', style: 'shelf' };
  // Achse des Geheimregals bestimmen
  shelfDef.axis = world.solid[world.idx(SECRET_DOOR.x - 1, SECRET_DOOR.z)] ? 'z' : 'x';
  const shelf = new SecretShelf(game, shelfDef, batcher);
  ents.push(shelf);
  game.doors.bookshelf = shelf;

  // ------------------------------------------------------------------ Spinde
  LOCKERS.forEach((l, i) => {
    const lk = new Locker(game, l, batcher, i);
    ents.push(lk);
    game.lockers.push(lk);
  });

  // ------------------------------------------------------------------ Lüftungen
  for (const v of VENTS) {
    const h = new VentHatch(game, v);
    game.vents[v.id] = h;
  }

  // ================================================================== KREUZE & SAKRALES
  for (const x of [10.5, 13.5, 28.5, 38.5, 43.5]) cross(x, x === 28.5 ? 2.4 : 2.15, 20.0, '+z', 1, { tilt: x === 43.5 ? 0.35 : 0 });
  for (const x of [11, 24, 29.5, 34.5, 39.5]) cross(x, 2.15, 23.0, '-z', 1, { tilt: x === 34.5 ? -0.5 : 0 });
  ghostCross(6.5, 2.0, 20.0, '+z');
  ghostCross(21.0, 2.0, 10.0, '+x');
  cross(21.0, 2.1, 17.5, '+x');
  cross(24.0, 2.1, 8.0, '-x', 1, { tilt: 0.6 });
  cross(24.0, 2.1, 16.0, '-x');
  cross(15.6, 2.2, 15.0, '+z', 0.9);
  cross(3.5, 2.2, 15.0, '+z', 0.9);
  cross(8.5, 2.35, 15.0, '+z', 0.9);
  cross(4.0, 2.1, 25.4, '+x', 1.1, { corpus: true });
  cross(20.0, 2.6, 4.0, '-x', 1.1, { corpus: true, tilt: 0.25 });
  cross(25.0, 2.0, 4.6, '+x', 0.9);
  cross(27.0, 2.0, 9.0, '+z', 1, { tilt: 2.6 });
  cross(35.0, 2.6, 4.0, '+z', 1.2, { corpus: true });
  cross(4.0, 1.9, 33.5, '+x', 1, { tilt: 0.8 });
  cross(55.0, -2.2, 5.5, '-x', 1, { tilt: -0.7 });
  cross(59.0, -2.0, 13.6, '-x', 0.9, { tilt: 1.1 });
  cross(56.0, -2.0, 35.0, '+x', 0.9);
  cross(50.5, 0.6, 23.0, '-z', 0.9);
  cross(13.0, 2.7, 28.5, '+x', 2.0, { corpus: true });
  painted('LIBERA NOS A MALO', 14.6, 3.15, 24.0, '+z', 2.6, 0.55);
  painted('MEMENTO MORI', 49.0, -2.15, 11.0, '+x', 2.0, 0.5);
  painted('AVE MARIA', 25.0, 2.1, 26.0, '+x', 1.6, 0.42);
  batcher.add(P.iconFrame(DECAL.icons[1], 10.98, 1.7, 27.5, -Math.PI / 2).group);
  batcher.add(P.iconFrame(DECAL.icons[2], 23.98, 1.8, 26.5, -Math.PI / 2, 0.55).group);
  batcher.add(P.iconFrame(DECAL.icons[0], 17.5, 1.75, 15.0 + 0.01, 0, 0.35).group);
  // Madonna in der Eingangshalle
  add(P.madonna(22.6, 0, 24.7, -Math.PI / 4, 0.9));
  {
    const cs = P.candleStand(21.9, 0, 25.5, -Math.PI / 4, 5);
    add(cs);
    L('candle', 21.9, 1.05, 25.5, 'candle', 'candle', { ry: -Math.PI / 4, flames: cs.tops.map(([a, b, c]) => [a, b - 1.05, c]) });
  }

  // ================================================================== ERDGESCHOSS
  // Hauptflur
  for (const [x, pre, post] of [
    [5, 'off', 'on'], [10.5, 'off', 'flicker'], [15, 'off', 'on'], [20.5, 'flicker', 'on'], [26, 'off', 'on'],
    [31.5, 'dying', 'flicker'], [37, 'off', 'on'], [42.5, 'flicker', 'on'],
  ]) L('tube', x, 2.92, 21.5, pre, post);
  L('emergency', 18.5, 2.5, 20.06, 'pulse', 'on', {});
  L('emergency', 36.5, 2.5, 22.94, 'pulse', 'on', { ry: Math.PI });
  L('emergency', 45.5, 2.5, 20.06, 'pulse', 'on');
  L('emergency', 8.0, 2.5, 22.94, 'pulse', 'on', { ry: Math.PI });
  add(P.wheelchair(35.6, 0, 21.0, 2.3));
  add(P.gurney(14.6, 0, 22.5, Math.PI / 2));
  add(P.ivStand(25.4, 0, 20.4));
  add(P.chair(33.3, 0, 21.9, 1.2, true));
  add(P.cabinet(44.3, 0, 20.35, 0));
  add(P.chair(8.5, 0, 20.5, 0.4));
  add(P.cabinet(3.5, 0, 20.35, 0));
  P.papers(paperGroup, 30, 0, 21.4, 6, 11);
  P.papers(paperGroup, 17, 0, 21.2, 4, 12);
  P.papers(paperGroup, 6, 0, 21.6, 5, 13);
  writing('ER HÖRT DICH', 34, 1.75, 20.0, '+z', 2.4, 0.6, 5);
  writing('NICHT RENNEN', 44.0, 1.6, 23.0, '-z', 2.0, 0.5, 6);
  floorDecal(DECAL.trail, 23.5, 21.0, 2.5, 1.0, 0.2);
  floorDecal(DECAL.trail, 22.2, 19.2, 2.5, 1.0, Math.PI / 2);
  blood(38.5, 21.7, 0.7);
  wallDecal(DECAL.hand, 40.5, 1.3, 23.0, '-z', 0.9, 0.9);
  // Schilder
  const signM = (text, sub, x, y, z, face, o = {}) => {
    const s = P.sign(text, sub, o);
    s.position.set(x, y, z);
    s.rotation.y = face === '+x' ? Math.PI / 2 : face === '-x' ? -Math.PI / 2 : face === '-z' ? Math.PI : 0;
    scene.add(s);
    return s;
  };
  signM('NORDFLÜGEL', '↑ OP · ISOLATION · HYDRO', 22.5, 2.55, 22.97, '-z', { w: 512, h: 160, sw: 1.1, sh: 0.34 });
  signM('KAPELLE', '↓ Versorgungsflur', 45.03, 2.5, 25.0, '+x', { w: 512, h: 160, sw: 0.8, sh: 0.25, bg: '#2a1e12', fg: '#c9b48a' });
  signM('PERSONAL', 'Zutritt verboten', 12.0 + 1.03, 2.5, 21.5, '+x', { w: 512, h: 160, sw: 0.8, sh: 0.25, bg: '#3a1a14' });
  // Hängendes Notausgangsschild (beidseitig)
  for (const f of ['+x', '-x']) signM('AUSGANG ↓', null, 18.5 + (f === '+x' ? 0.01 : -0.01), 2.7, 21.5, f, { w: 512, h: 128, sw: 0.7, sh: 0.18, bg: '#0b3a18', fg: '#9dffb0', emissive: 1.2 });
  P.box(scene, MAT.steel, 0.01, 0.12, 0.01, 18.5, 2.88, 21.5);

  // Personaltrakt: Archiv
  L('bulb', 3.5, 2.45, 16.5, 'off', 'on', { cable: 0.5 });
  add(P.shelf(2.3, 0, 15.8, Math.PI / 2, { w: 1.4, seed: 4 }));
  add(P.shelf(2.3, 0, 17.7, Math.PI / 2, { w: 1.4, seed: 5 }));
  add(P.cabinet(4.6, 0, 15.4, 0, { h: 1.3 }));
  add(P.desk(4.4, 0, 16.6, -Math.PI / 2, { w: 1.1, d: 0.6 }));
  P.papers(paperGroup, 3.5, 0, 17, 7, 21);
  pick('bat_records', 'battery', 4.4, 0.785, 16.3);
  pick('note_file', 'note', 4.35, 0.79, 16.85, { note: 'n_file', ry: 0.3 });

  // Überwachungsraum
  L('monitor', 8.5, 1.4, 16.1, 'on', 'on');
  L('tube', 8.5, 2.92, 17.0, 'off', 'flicker');
  const survDesk = add(P.desk(8.5, 0, 15.5, 0, { w: 3.4, d: 0.8, mat: MAT.metalPaint }));
  void survDesk;
  game.monitorScreens = [];
  const screenPositions = [[7.3, 0.8, 15.35], [8.0, 0.8, 15.35], [9.0, 0.8, 15.35], [9.7, 0.8, 15.35]];
  // Bildschirme werden später mit Kamerabildern belegt (surveillance.js)
  game.monitorSlots = screenPositions;
  add(P.chair(8.5, 0, 16.5, Math.PI, false));
  add(P.cabinet(10.6, 0, 17.6, -Math.PI / 2, { h: 1.6 }));
  P.papers(paperGroup, 7.5, 0, 17.3, 4, 31);
  pick('note_guard', 'note', 9.4, 0.79, 15.7, { note: 'n_guard', ry: -0.2 });
  pick('bat_surv', 'battery', 6.6, 0.79, 15.6);
  ents.push(
    new Interactable(game, {
      id: 'monitors',
      kind: 'monitors',
      x: 8.5,
      y: 1.1,
      z: 15.4,
      radius: 0.9,
      prompt: () => '[E] Überwachungskameras ansehen',
      interact: (g) => g.enterMonitors(),
    }),
  );

  // Direktorenbüro
  L('bulb', 7.5, 2.45, 26.5, 'off', 'on', { cable: 0.5 });
  L('bulb', 6.3, 0.95, 27.0, 'dying', 'on', { cable: 0.02, shade: false, cone: false, intensity: 2, range: 5 });
  add(P.desk(7.5, 0, 27.1, Math.PI, { w: 1.8, d: 0.85, mat: MAT.darkWood }));
  add(P.chair(7.5, 0, 28.1, Math.PI, false));
  add(P.chair(7.0, 0, 25.6, 0.3, false));
  add(P.bookshelf(4.75, 0, 29.78, Math.PI, { w: 1.4, seed: 7 }));
  add(P.bookshelf(8.75, 0, 29.78, Math.PI, { w: 1.9, seed: 8 }));
  add(P.cabinet(10.6, 0, 24.8, -Math.PI / 2, { h: 1.3, mat: MAT.darkWood }));
  add(P.cabinet(4.4, 0, 24.5, Math.PI / 2, { h: 1.3, mat: MAT.darkWood }));
  P.papers(paperGroup, 6.5, 0, 25.5, 5, 41);
  const term = P.crt(scene, 8.1, 0.785, 27.0, 0, new THREE.MeshStandardMaterial({ color: 0x0a120c, emissive: 0x2a6a30, emissiveIntensity: 0.0, roughness: 0.3 }), 0.8);
  game.terminalScreen = term.screen;
  pick('note_diary', 'note', 6.9, 0.79, 26.9, { note: 'n_diary', ry: 0.4 });
  pick('med_office', 'medkit', 10.5, 1.31, 24.8);
  pick('ammo_office', 'ammo', 8.2, 0.785, 27.3, { premiumOnly: true });
  ents.push(
    new Interactable(game, {
      id: 'terminal',
      kind: 'terminal',
      x: 8.1,
      y: 1.0,
      z: 27.0,
      radius: 0.35,
      prompt: () => '[E] Terminal benutzen',
      interact: (g) => {
        if (!g.state.flags.power) {
          g.ui.toast('Das Terminal ist tot. Kein Strom.');
          g.audio.click();
          return;
        }
        g.audio.beep('key');
        g.readNote('n_terminal');
      },
    }),
  );
  writing('LETHE', 4.0, 1.9, 27.5, '+x', 1.4, 0.4, 9);

  // Geheimes Archiv
  L('bulb', 6.5, 2.2, 32.5, 'flicker', 'on', { cable: 0.4 });
  L('emergency', 6.5, 2.3, 34.94, 'pulse', 'pulse', { ry: Math.PI });
  add(P.shelf(4.35, 0, 32.0, Math.PI / 2, { w: 1.6, seed: 51 }));
  add(P.shelf(8.65, 0, 33.2, -Math.PI / 2, { w: 1.4, seed: 52 }));
  for (let k = 0; k < 9; k++) {
    wallDecal(DECAL.paper[k % 3], 4.6 + (k % 3) * 0.55 + rng() * 0.1, 1.2 + Math.floor(k / 3) * 0.45, 30.99 + 0.01, '+z', 0.3, 0.4);
  }
  writing('VERGISS NICHT', 6.5, 2.0, 35.0, '-z', 2.2, 0.55, 12);
  pick('note_final', 'note', 7.6, 0.0, 33.6, { note: 'n_final', ry: 1.0 });
  pick('med_secret', 'medkit', 4.6, 0.0, 34.4);
  const override = new Lever(game, 6.0, 1.3, 34.93, Math.PI, {
    id: 'override',
    red: true,
    prompt: (g) => (g.state.flags.power ? '[E] Notverriegelung manuell freigeben' : 'Manuelle Freigabe – ohne Strom funktionslos.'),
    canPull: (g) => g.state.flags.power,
    onPull: (g) => g.triggerOverride(),
    onFail: (g) => {
      g.ui.toast('Nichts passiert. Ohne Strom ist die Freigabe tot.');
      g.audio.doorLocked(override.pos);
    },
  });
  ents.push(override);
  game.overrideLever = override;

  // Schwesternstation
  L('tube', 16.8, 2.92, 16.8, 'dying', 'on');
  add(P.desk(17.6, 0, 17.3, Math.PI, { w: 2.2, d: 0.7, mat: MAT.metalWhite }));
  add(P.cabinet(14.4, 0, 15.5, Math.PI / 2, { h: 1.6, mat: MAT.metalWhite }));
  add(P.shelf(17.0, 0, 15.3, 0, { w: 1.6, seed: 61 }));
  add(P.chair(17.5, 0, 16.4, 0.6, false));
  P.papers(paperGroup, 15.5, 0, 17.6, 6, 62);
  pick('note_shift', 'note', 17.0, 0.79, 17.3, { note: 'n_shift', ry: -0.3 });
  pick('med_nurse', 'medkit', 14.45, 1.61, 15.5);
  pick('bat_nurse', 'battery', 18.2, 0.79, 17.4);
  pick('ammo_nurse', 'ammo', 16.6, 0.79, 17.15, { premiumOnly: true });

  // Nordflur
  for (const [z, pre, post] of [[6.5, 'off', 'on'], [12, 'dying', 'flicker'], [17, 'off', 'on']]) L('tube', 22.5, 2.92, z, pre, post, { ry: Math.PI / 2 });
  add(P.gurney(23.3, 0, 15.4, 0, true));
  add(P.wheelchair(21.6, 0, 9.8, -0.5));
  floorDecal(DECAL.trail, 21.7, 7.0, 2.4, 1.0, 0.1);
  floorDecal(DECAL.trail, 22.4, 11.5, 2.6, 1.0, Math.PI / 2 + 0.2);
  blood(21.6, 6.3, 0.8);
  writing('ES ERINNERT SICH', 21.0, 1.7, 13.0, '+x', 2.6, 0.6, 14);
  wallDecal(DECAL.hand, 21.0, 1.3, 6.0, '+x', 0.8, 0.8);
  // Keypad neben der OP-Tür
  const kp = new THREE.Group();
  P.box(kp, MAT.plastic, 0.14, 0.2, 0.04, 0, 0, 0);
  game.keypadLed = new THREE.Mesh(P.G.sphere, emissiveMaterial(0xff2010, 2.5));
  game.keypadLed.scale.setScalar(0.012);
  game.keypadLed.position.set(0, 0.07, 0.025);
  kp.add(game.keypadLed);
  kp.position.set(20.98 + 0.02, 1.35, 7.3);
  kp.rotation.y = Math.PI / 2;
  scene.add(kp);

  // OP-Saal
  L('surgical', 15.5, 2.55, 6.5, 'off', 'flicker', { intensity: 12 });
  L('tube', 13.5, 3.32, 4.0, 'dying', 'on');
  L('emergency', 19.94, 2.6, 9.0, 'pulse', 'off', { ry: -Math.PI / 2 });
  add(P.orTable(15.5, 0, 6.5, 0));
  add(P.trolley(17.3, 0, 5.2, 0.2));
  add(P.trolley(13.6, 0, 8.4, -0.4));
  add(P.cabinet(12.35, 0, 4.0, Math.PI / 2, { h: 1.8, mat: MAT.metalWhite }));
  add(P.cabinet(12.35, 0, 5.0, Math.PI / 2, { h: 1.8, mat: MAT.metalWhite }));
  add(P.ivStand(14.2, 0, 5.4));
  add(P.gurney(18.4, 0, 9.3, Math.PI / 2 + 0.1, true));
  add(P.sink(16.5, 0, 3.25, 0));
  blood(15.7, 7.6, 1.3);
  blood(14.6, 5.4, 0.9);
  floorDecal(DECAL.trail, 18.5, 6.3, 2.2, 0.9, 0);
  wallDecal(DECAL.blood[1], 19.98, 1.4, 4.5, '-x', 1.4, 1.4);
  writing('116', 12.0, 1.8, 7.5, '+x', 1.6, 0.6, 15);
  pick('basement_key', 'basement_key', 17.1, 0.915, 5.1, { ry: 0.6 });
  pick('fuse_or', 'fuse', 17.45, 0.915, 5.35, { ry: 0.2 });
  pick('note_surgery', 'note', 15.2, 0.93, 7.4, { note: 'n_surgery', ry: 0.2 });
  pick('bat_or', 'battery', 13.5, 0.915, 8.4);

  // Isolation 1
  L('bulb', 26.5, 2.3, 5.5, 'dying', 'flicker', { cable: 0.3 });
  add(P.bed(27.3, 0, 5.5, 0, { bare: true, seed: 3 }));
  writing('LASS MICH RAUS', 25.0, 1.6, 6.0, '+x', 2.0, 0.5, 16);
  pick('bottle_iso', 'bottle', 25.6, 0.0, 4.6);
  for (let k = 0; k < 4; k++) wallDecal(DECAL.hand, 26.0 + k * 0.55, 0.9 + rng() * 0.8, 4.0, '+z', 0.5, 0.5);

  // Isolation 2 (versiegelt) – der Code an der Wand
  L('bulb', 27.7, 2.35, 12.3, 'flicker', 'flicker', { cable: 0.3, intensity: 3.5, cone: false });
  const codeTex = makeCodeTexture(game.state.code);
  game.codeDecal = wallDecal(codeTex, 29.0, 1.35, 10.8, '-x', 2.8, 1.4);
  add(P.bed(26.4, 0, 11.5, Math.PI / 2, { bare: true, seed: 4 }));
  blood(27.0, 10.0, 1.2);

  // Hydrotherapie
  L('bulb', 33, 2.6, 7.5, 'dying', 'on', { cable: 0.5 });
  L('bulb', 38, 2.6, 7.5, 'off', 'flicker', { cable: 0.5 });
  L('moon', 35.5, 2.9, 5.4, 'on', 'on', { intensity: 3.0 });
  for (let k = 0; k < 4; k++) add(P.bathtub(31.5 + k * 2.4, 0, 9.6, 0));
  add(P.trolley(38.6, 0, 6.0, 0.5));
  add(P.wheelchair(31.2, 0, 5.2, 0.8));
  for (const x of [32.5, 37.5]) {
    batcher.add(P.boardedWindow(x, 1.7, 4.06, 0).group);
    lights.addShaft(x, 2.8, 4.1, 0, 0x6f86c8, 1.2, 4.5, 0.75, 0.05);
  }
  pick('staff_key', 'staff_key', 38.5, 0.915, 6.0, { ry: 0.4 });
  pick('note_memo', 'note', 38.8, 0.915, 5.8, { note: 'n_memo', ry: -0.6 });
  pick('bat_hydro', 'battery', 34.0, 0.6, 9.6);
  writing('↓ RAUS', 32.5, 1.5, 12.0, '-z', 1.4, 0.45, 17);
  floorDecal(DECAL.blood[2], 32.5, 11.2, 0.7, 0.7);

  // Patientenzimmer
  const rooms = [
    { x0: 25, z0: 14, n: 111, door: 'n' },
    { x0: 30, z0: 14, n: 112, door: 'n' },
    { x0: 35, z0: 14, n: 113, door: 'n' },
    { x0: 40, z0: 14, n: 114, door: 'n' },
    { x0: 25, z0: 24, n: 115, door: 's' },
    { x0: 30, z0: 24, n: 116, door: 's' },
    { x0: 35, z0: 24, n: 117, door: 's' },
    { x0: 40, z0: 24, n: 118, door: 's' },
  ];
  for (const r of rooms) {
    const cx = r.x0 + 2;
    const north = r.door === 'n';
    // Bett an der rückwärtigen Wand
    const bz = north ? r.z0 + 1.1 : r.z0 + 3.9;
    const bx = r.x0 + 0.65;
    const pre = r.n === 116 ? 'flicker' : r.n === 112 || r.n === 118 ? 'dying' : 'off';
    L('bulb', cx, 2.45, r.z0 + 2.5, pre, rng() < 0.4 ? 'flicker' : 'on', { cable: 0.5 });
    if (r.n !== 113) add(P.bed(bx, 0, bz, 0, { seed: r.n }));
    else add(P.bed(r.x0 + 2.5, 0, r.z0 + 2.3, 1.3, { seed: r.n }));
    add(P.sink(r.x0 + 3.5, 0, north ? r.z0 + 0.25 : r.z0 + 4.75, north ? 0 : Math.PI));
    if (r.n % 2 === 0) add(P.chair(r.x0 + 2.7, 0, r.z0 + 2.6, rng() * 6, r.n === 114));
    P.papers(paperGroup, cx, 0, r.z0 + 2.5, 3, r.n);
    if (r.n === 117) ghostCross(r.x0 + 0.65, 1.8, north ? r.z0 : r.z0 + 5, north ? '+z' : '-z');
    else cross(r.x0 + 0.65, 1.8, north ? r.z0 : r.z0 + 5, north ? '+z' : '-z', 0.85, { tilt: r.n === 112 || r.n === 118 ? 0.5 : 0, corpus: r.n === 116 });
    if (rng() < 0.6) blood(r.x0 + 1 + rng() * 2, r.z0 + 1 + rng() * 3, 0.6 + rng() * 0.5);
  }
  // Zimmer 116 (Start)
  add(P.cabinet(31.55, 0, 27.6, -Math.PI / 2, { h: 0.6, mat: MAT.metalWhite }));
  pick('flashlight', 'flashlight', 31.55, 0.61, 27.5, { ry: 1.2 });
  pick('note_wake', 'note', 30.7, 0.665, 27.7, { note: 'n_wake', ry: 0.3 });
  writing('NICHT VERGESSEN', 30.0, 1.6, 26.0, '+x', 2.4, 0.6, 18);
  // Zimmer 112: Zeichnungen + Loch in der Wand
  writing('DER LANGE MANN', 33.98, 1.5, 16.0, '-x', 2.2, 0.55, 19);
  pick('note_drawing', 'note', 31.5, 0.0, 15.3, { note: 'n_drawing', ry: 2.2 });
  pick('bottle_112', 'bottle', 33.4, 0.0, 17.4);
  // Zimmer 111, 115, 117, 118
  pick('bottle_111', 'bottle', 27.6, 0.0, 17.6);
  pick('bat_118', 'battery', 43.4, 0.0, 25.2);
  pick('med_115', 'medkit', 27.8, 0.0, 27.9);
  add(P.wheelchair(37.3, 0, 26.5, 2.5));
  writing('ER IST HIER', 38.98, 1.7, 26.0, '-x', 2.0, 0.5, 20);

  // Eingangshalle
  L('bulb', 18.5, 3.4, 29.0, 'off', 'on', { cable: 0.8, intensity: 6, range: 11 });
  L('moon', 15.0, 3.1, 30.4, 'on', 'on', { intensity: 2.0, range: 16 });
  L('moon', 22.0, 3.1, 30.4, 'on', 'on', { intensity: 2.0, range: 16 });
  L('emergency', 18.5, 3.95, 33.95, 'pulse', 'on', { ry: Math.PI });
  for (const x of [14.6, 22.4]) {
    batcher.add(P.boardedWindow(x, 1.0, 33.94, Math.PI).group);
    lights.addShaft(x, 2.5, 33.9, Math.PI, 0x6f86c8, 1.3, 5.0, 0.7, 0.06);
  }
  add(P.receptionDesk(18.5, 0, 27.4, 0));
  add(P.bench(13.4, 0, 30.0, Math.PI / 2));
  add(P.bench(23.6, 0, 27.5, -Math.PI / 2));
  add(P.chair(21.5, 0, 31.5, 2.0, true));
  add(P.chair(15.5, 0, 25.5, 0.8, false));
  P.papers(paperGroup, 18, 0, 30, 9, 71, 3);
  pick('bat_lobby', 'battery', 17.4, 1.15, 27.45);
  blood(19.5, 32.4, 0.8);
  signM('✝ ST. ALDRIC ✝', 'KATH. HEIL- UND PFLEGEANSTALT', 18.5, 3.62, 23.03, '+z', { w: 1024, h: 256, sw: 3.4, sh: 0.85, bg: '#2a1e12', fg: '#c9b48a' });
  signM('AUSGANG', null, 18.5, 3.55, 33.97, '-z', { w: 512, h: 128, sw: 0.9, sh: 0.22, bg: '#0b3a18', fg: '#9dffb0', emissive: 1.4 });
  L('exit', 18.5, 2.9, 34.4, 'on', 'on');
  // Haupteingang (Doppeltür mit Ketten)
  const gate = new THREE.Group();
  gate.position.set(18.5, 0, 34.98);
  game.gateDoors = [];
  for (const s of [-1, 1]) {
    const piv = new THREE.Group();
    piv.position.set(s * 1.48, 0, 0);
    gate.add(piv);
    const leaf = new THREE.Group();
    piv.add(leaf);
    P.box(leaf, MAT.darkWood, 1.46, 2.9, 0.08, -s * 0.73, 1.45, 0);
    P.box(leaf, MAT.darkWood, 1.1, 1.0, 0.1, -s * 0.73, 0.8, 0);
    P.box(leaf, MAT.darkWood, 1.1, 1.0, 0.1, -s * 0.73, 2.1, 0);
    P.cyl(leaf, MAT.copper, 0.03, 0.4, -s * 1.3, 1.2, 0.08);
    P.mergeByMaterial(leaf);
    game.gateDoors.push({ piv, s });
  }
  const chains = new THREE.Group();
  for (let k = 0; k < 9; k++) {
    const link = new THREE.Mesh(P.G.torus, MAT.steel);
    link.scale.setScalar(0.05);
    link.position.set(-0.2 + k * 0.05, 1.2 + Math.sin(k * 0.7) * 0.05, -0.08);
    link.rotation.set(0, k % 2 ? Math.PI / 2 : 0, 0.4);
    chains.add(link);
  }
  P.box(chains, MAT.steel, 0.1, 0.12, 0.05, 0, 1.05, -0.1);
  P.mergeByMaterial(chains);
  gate.add(chains);
  game.gateChains = chains;
  scene.add(gate);
  ents.push(
    new Interactable(game, {
      id: 'exit',
      kind: 'exit',
      x: 18.5,
      y: 1.3,
      z: 34.8,
      radius: 1.3,
      prompt: (g) => (g.state.flags.override ? '[E] FLIEHEN' : 'Haupteingang – verriegelt'),
      interact: (g) => g.tryExit(),
    }),
  );

  // Versorgungsflur Süd + Verbindungsflur
  for (const [x, pre] of [[28, 'off'], [36, 'flicker'], [43, 'off']]) L('tube', x, 2.92, 31.5, pre, 'on');
  L('tube', 45.5, 2.92, 26.0, 'dying', 'on', { ry: Math.PI / 2 });
  L('emergency', 30.5, 2.4, 30.06, 'pulse', 'on');
  add(P.crate(44.0, 0, 30.6, 0.3, 0.7));
  add(P.trolley(33.5, 0, 32.4, 0.1));
  add(P.wheelchair(41.0, 0, 31.0, -1.2));
  P.pipeRun(scene, 25, 30.3, 46.5, 30.3, 2.75, 0.08);
  P.pipeRun(scene, 25, 30.55, 46.5, 30.55, 2.78, 0.05, MAT.steel);
  writing('SIE BEOBACHTEN', 38.0, 1.6, 33.0, '-z', 2.4, 0.6, 21);
  blood(45.8, 25.5, 0.7);

  // Kapelle (früher Aufenthaltsraum)
  L('bulb', 31.0, 3.85, 37.6, 'off', 'on', { cable: 0.7, floor: 0 });
  L('bulb', 38.0, 3.85, 37.6, 'off', 'flicker', { cable: 0.7, floor: 0 });
  const glassMat = (tex) => new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.4, color: 0xa89cc8, side: THREE.DoubleSide });
  [[29.5, DECAL.glass[0], 0x8a5ad0], [39.5, DECAL.glass[1], 0xc8604a]].forEach(([x, tex, col]) => {
    const win = new THREE.Mesh(P.G.plane, glassMat(tex));
    win.scale.set(1.15, 2.3, 1);
    win.position.set(x, 2.55, 41.985);
    win.rotation.y = Math.PI;
    batcher.add(win);
    lights.addShaft(x, 3.2, 41.9, Math.PI, col, 1.1, 4.8, 0.75, 0.06);
    L('stained', x, 2.6, 40.6, 'on', 'on', { color: col, intensity: 2.4, range: 8 });
  });
  add(P.altar(34.5, 0, 40.95, Math.PI));
  batcher.add(P.crucifix(34.5, 2.75, 41.96, Math.PI, 2.6, { corpus: true }).group);
  for (const z of [35.4, 36.7, 38.0, 39.3]) {
    add(P.pew(31.0, 0, z, 0, 3.4));
    add(P.pew(38.0, 0, z, 0, 3.4));
  }
  add(P.madonna(28.0, 0, 40.95, Math.PI * 0.75, 0.95));
  const candleAt = (x, z, ry, n) => {
    const cs = P.candleStand(x, 0, z, ry, n);
    add(cs);
    L('candle', x, 1.05, z, 'candle', 'candle', { ry, flames: cs.tops.map(([a, b, c]) => [a, b - 1.05, c]) });
  };
  candleAt(28.9, 40.0, Math.PI * 0.75, 5);
  candleAt(32.7, 41.2, Math.PI, 3);
  candleAt(36.3, 41.2, Math.PI, 3);
  add(P.lectern(37.4, 0, 40.2, Math.PI));
  batcher.add(P.holyWaterFont(29.2, 0, 34.02, 0).group);
  batcher.add(P.holyWaterFont(37.2, 0, 34.02, 0).group);
  for (const [z, k] of [[36.4, 0], [38.6, 1]]) batcher.add(P.iconFrame(DECAL.icons[k], 27.02, 1.8, z, Math.PI / 2).group);
  for (const [z, k] of [[38.6, 2], [40.6, 0]]) batcher.add(P.iconFrame(DECAL.icons[k], 41.98, 1.8, z, -Math.PI / 2).group);
  painted('ORA PRO NOBIS', 34.5, 3.6, 34.0, '+z', 3.2, 0.7);
  pick('bottle_day1', 'bottle', 31.4, 0.48, 36.7);
  pick('bottle_day2', 'bottle', 38.5, 0.48, 38.0);
  pick('bat_day', 'battery', 35.3, 1.06, 40.9);
  pick('med_day', 'medkit', 40.9, 0.0, 41.4);
  pick('ammo_chapel', 'ammo', 31.6, 1.06, 39.05, { premiumOnly: true });
  pick('note_chapel', 'note', 37.4, 1.215, 40.18, { note: 'n_chapel', ry: Math.PI });
  P.papers(paperGroup, 34.5, 0, 37.5, 4, 81, 3);
  blood(34.5, 39.9, 0.9);

  // ================================================================== TREPPE & KELLER
  L('bulb', 49.5, 1.9, 21.5, 'dying', 'on', { cable: 0.3, floor: -0.75 });
  L('bulb', 53.5, -0.1, 21.5, 'off', 'flicker', { cable: 0.3, floor: -2.75 });
  {
    // Geländer (schräg)
    const rail = new THREE.Mesh(P.G.cylLo, MAT.steel);
    const len = Math.hypot(8, 4);
    rail.scale.set(0.03, len, 0.03);
    rail.position.set(52, -2 + 0.95, 22.82);
    rail.rotation.z = Math.PI / 2 - Math.atan2(4, 8);
    batcher.add(rail);
  }
  writing('UNTEN IST ES', 52.0, -0.6, 20.0, '+z', 2.4, 0.6, 22);
  signM('KELLER', null, 46.95, 2.48, 21.5, '-x', { w: 512, h: 128, sw: 0.6, sh: 0.15, bg: '#3a1a14' });

  // Kellergang
  for (const [z, pre, post] of [[6, 'off', 'on'], [12, 'dying', 'on'], [18, 'off', 'flicker'], [24, 'flicker', 'on'], [30, 'off', 'on'], [36, 'dying', 'flicker']]) {
    L('bulb', 57.5, -1.45, z, pre, post, { cable: 0.4, floor: -4 });
  }
  P.pipeRun(scene, 58.7, 3, 58.7, 41.5, -1.25, 0.12);
  P.pipeRun(scene, 58.4, 3, 58.4, 41.5, -1.2, 0.06, MAT.steel);
  P.pipeRun(scene, 56.2, 3, 56.2, 41.5, -1.18, 0.05, MAT.copper);
  add(P.barrel(56.4, -4, 14.5));
  add(P.crate(58.4, -4, 33.5, 0.4, 0.6));
  add(P.gurney(56.6, -4, 39.6, 0.05, true));
  floorDecal(DECAL.trail, 57.2, 9.5, 2.6, 1.0, Math.PI / 2);
  floorDecal(DECAL.trail, 56.4, 8.3, 1.8, 0.9, 0.1);
  for (const z of [16, 26.5, 35]) floorDecal(DECAL.blood[2], 57.5, z, 1.6, 1.4, rng() * 3, { roughness: 0.05 });
  writing('LAUF', 59.0, -2.6, 24.5, '-x', 1.6, 0.6, 23);

  // Generatorraum
  L('emergency', 62.5, -2.0, 3.06, 'pulse', 'off');
  L('tube', 63.5, -0.87, 6.5, 'off', 'on');
  add(P.generatorMachine(63.4, -4, 6.6, 0));
  add(P.barrel(65.9, -4, 8.9));
  add(P.barrel(65.2, -4, 9.2));
  P.pipeRun(scene, 60, 3.4, 67, 3.4, -1.1, 0.1);
  game.fusebox = new FuseBox(game, 61.2, -2.5, 3.1, 0);
  ents.push(game.fusebox);
  const genLever = new Lever(game, 62.3, -2.5, 3.08, 0, {
    id: 'genLever',
    prompt: (g) => ((g.state.flags.fusesInserted || 0) >= 3 ? '[E] Hauptschalter umlegen' : 'Hauptschalter – blockiert (Sicherungen fehlen)'),
    canPull: (g) => (g.state.flags.fusesInserted || 0) >= 3,
    onPull: (g) => g.restorePower(),
    onFail: (g) => g.ui.toast('Der Hebel lässt sich nicht bewegen. Erst alle drei Sicherungen einsetzen.'),
  });
  ents.push(genLever);
  game.genLever = genLever;
  pick('note_gen', 'note', 60.6, -4.0, 4.0, { note: 'n_generator', ry: 0.4 });

  // Heizungsraum
  L('bulb', 63, -1.4, 17, 'dying', 'on', { cable: 0.4, floor: -4 });
  add(P.boiler(62.8, -4, 17.2));
  add(P.shelf(60.35, -4, 14.5, Math.PI / 2, { w: 1.4, seed: 91 }));
  P.pipeRun(scene, 60, 19.5, 67, 19.5, -1.15, 0.12);
  pick('med_boiler', 'medkit', 60.4, -2.098, 14.2);
  pick('bat_boiler', 'battery', 60.35, -2.098, 15.0);
  pick('ammo_boiler', 'ammo', 60.4, -2.098, 14.6, { premiumOnly: true });

  // Überflutetes Lager B
  L('bulb', 63.2, -1.5, 31, 'dying', 'flicker', { cable: 0.4, floor: -4 });
  for (const z of [27.5, 31.5, 35.5]) {
    add(P.shelf(61.2, -4, z, Math.PI / 2, { w: 2.2, seed: z }));
    add(P.shelf(64.8, -4, z, -Math.PI / 2, { w: 2.2, seed: z + 1 }));
  }
  add(P.crate(65.6, -4, 38.4, 0.1, 0.8));
  add(P.crate(60.6, -4, 38.6, 0.4, 0.6));
  add(P.barrel(63.0, -4, 25.6));
  pick('fuse_flood', 'fuse', 65.6, -3.2, 38.4, { ry: 0.4 });
  pick('note_flood', 'note', 60.6, -3.4, 38.6, { note: 'n_flood', ry: 0.8 });
  pick('bat_flood', 'battery', 64.7, -3.255, 31.6);

  // Pathologie
  L('tube', 51.5, -1.27, 8.5, 'flicker', 'flicker', { ry: Math.PI / 2 });
  const drawers = [
    { id: 'd1', row: 1, col: 0, body: true },
    { id: 'd2', row: 0, col: 2, body: true, fuse: true },
    { id: 'd3', row: 2, col: 1, body: false, note: true },
  ];
  {
    const f = new THREE.Group();
    P.box(f, MAT.steel, 0.5, 1.9, 2.0, 49.25, -3.05, 5.62);
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 3; col++) {
        if (drawers.some((d) => d.row === row && d.col === col)) continue;
        const z = 5.0 + col * 0.62;
        const y = -3.55 + row * 0.6;
        P.box(f, MAT.steel, 0.03, 0.5, 0.56, 49.515, y, z);
        P.box(f, MAT.steel, 0.04, 0.03, 0.3, 49.55, y + 0.12, z);
      }
    batcher.add(f);
  }
  world.addCollider({ minX: 49, maxX: 49.5, minZ: 4.6, maxZ: 6.65 });
  for (const d of drawers) {
    const z = 5.0 + d.col * 0.62;
    const y = -3.55 + d.row * 0.6;
    const dr = new Drawer(game, 49.53, y, z, Math.PI / 2, { id: d.id, body: d.body });
    ents.push(dr);
    game.drawers[d.id] = dr;
    if (d.fuse) {
      const cp = { x: 49.53 + 0.75, y: y - 0.15, z };
      pick('fuse_morgue', 'fuse', 50.05, cp.y + 0.03, cp.z + 0.12, { hiddenUntil: () => dr.isOpen && dr.amt > 0.8 });
    }
    if (d.note) {
      pick('note_morgue', 'note', 50.0, y - 0.135, z, { note: 'n_morgue', hiddenUntil: () => dr.isOpen && dr.amt > 0.8 });
    }
  }
  add(P.gurney(52.5, -4, 7.0, 0.1, true));
  add(P.orTable(52.6, -4, 11.0, Math.PI / 2));
  add(P.sink(54.6, -4, 4.3, 0));
  add(P.trolley(50.5, -4, 12.4, 0.5));
  pick('bat_morgue', 'battery', 50.5, -3.085, 12.4);
  blood(51.5, 10.5, 1.6);
  blood(52.8, 12.6, 1.0);
  writing('WEHRMANN', 54.98, -2.5, 11.5, '-x', 2.2, 0.55, 24);

  // Wäscherei
  L('bulb', 51.5, -1.45, 32, 'off', 'on', { cable: 0.4, floor: -4 });
  add(P.shelf(53.9, -4, 28.0, -Math.PI / 2, { w: 1.8, seed: 101 }));
  add(P.shelf(53.9, -4, 35.5, -Math.PI / 2, { w: 1.8, seed: 102 }));
  for (const [x, z] of [[51.0, 28.0], [50.6, 35.0], [52.2, 36.6]]) add(P.crate(x, -4, z, rng(), 0.8));
  pick('bottle_laundry', 'bottle', 52.2, -3.2, 36.6);
  pick('bottle_laundry2', 'bottle', 51.0, -3.2, 28.0);

  batcher.add(paperGroup);
}
