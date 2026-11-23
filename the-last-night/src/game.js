// Zentrale Spiellogik: Initialisierung, Spielzustände, Ziele, Ereignisse,
// Checkpoints, Tod und Ende.
import * as THREE from 'three';
import { settings, resolveQuality, IS_TOUCH, DEBUG } from './config.js';
import { clamp, damp, rand, pick as pickOne } from './utils.js';
import { generateAll, setAnisotropy, makeCodeTexture } from './textures.js';
import { buildMaterials, regionUniforms, MAT } from './materials.js';
import { World } from './level/world.js';
import { buildArchitecture, StaticBatcher } from './level/builder.js';
import { populate } from './level/populate.js';
import { PLAYER_START, MONSTER_LAIR, POIS, VENTS } from './level/layout.js';
import { Nav } from './nav.js';
import { LightSystem } from './lights.js';
import { Player } from './player.js';
import { Monster } from './monster/ai.js';
import { Surveillance, screenMaterial, CAMS } from './surveillance.js';
import { PostFX, Dust } from './effects.js';
import { AudioEngine } from './audio.js';
import { Input } from './input.js';
import { UI } from './ui.js';
import { NOTES, objectiveText } from './story.js';
import { Projectile } from './entities.js';
import { Revolver } from './weapon.js';
import { Account } from './account.js';

const CROSS_TIME = 12;
const CROSS_COOLDOWN = 120;
const PRAY_TIME = 6;
const PRAY_COOLDOWN = 60;

const SAVE_KEY = 'tln_save_v1';

export class Game {
  constructor(renderer, canvas) {
    this.renderer = renderer;
    this.canvas = canvas;
    this.mode = 'loading';
    this.time = 0;
    this.projectiles = [];
    this.shards = [];
    this.timers = [];
    this.staticMats = [];
    this.fovBase = settings.fov;
    this.premium = false;
    this.ab = { crossT: 0, crossCd: 0, prayT: 0, prayCd: 0 };
    this.muzzleFlash = 0;
  }

  async init(onProgress) {
    const r = this.renderer;
    this.quality = resolveQuality();
    setAnisotropy(Math.min(8, r.capabilities.getMaxAnisotropy()));
    const scene = (this.scene = new THREE.Scene());
    scene.background = new THREE.Color(0x020203);
    scene.fog = new THREE.FogExp2(0x05070a, 0.062);
    this.camera = new THREE.PerspectiveCamera(settings.fov, innerWidth / innerHeight, 0.05, 34);
    scene.add(this.camera);

    this.audio = new AudioEngine();
    this.audio.occlusion = (pos) => this.occlusion(pos);
    this.input = new Input(this.canvas);
    this.input.onPointerUnlock = () => {
      if (this.expectUnlock) {
        this.expectUnlock = false;
        return;
      }
      if (this.mode === 'playing') this.pause();
    };
    this.ui = new UI(this);
    this.input.bindTouch(document.querySelector('#touch-ui'));
    this.account = new Account();
    this.premium = this.account.premium;
    this.account.on(() => this.onAccountChange());
    this.account.init();

    onProgress(0.02, 'Texturen werden erzeugt …');
    await generateAll((p) => onProgress(0.02 + p * 0.6, 'Texturen werden erzeugt …'));
    buildMaterials();
    onProgress(0.65, 'Die Anstalt wird gebaut …');
    await tick();

    this.world = new World();
    regionUniforms.tlnRegionTex.value = this.world.makeRegionTexture();
    regionUniforms.tlnGrid.value.set(this.world.W, this.world.H);
    buildArchitecture(this.world, scene);
    this.lights = new LightSystem(scene, this.world, this.quality);
    this.state = this.newState();
    this.entities = [];
    this.doors = {};
    this.lockers = [];
    this.vents = {};
    this.pickupById = {};
    this.drawers = {};
    const batcher = new StaticBatcher((x, z) => this.world.probeRegions(x, z));
    populate(this, batcher);
    onProgress(0.78, 'Requisiten werden platziert …');
    await tick();
    batcher.build(scene);
    this.world.computeNavBlocks();
    this.doorByIdx = new Map();
    for (const d of Object.values(this.doors)) this.doorByIdx.set(d.idx, d);
    this.nav = new Nav(this.world);

    this.player = new Player(this, this.camera, scene, this.quality);
    this.monster = new Monster(this);
    this.surv = new Surveillance(this);
    this.dust = new Dust(scene, this.quality.dust);
    this.ambient = new THREE.HemisphereLight(0x3a4658, 0x14100c, 0.55);
    scene.add(this.ambient);
    this.post = new PostFX(r, scene, this.camera, this.quality);
    this.revolver = new Revolver(this);
    this.setupCulling();
    onProgress(0.88, 'Shader werden kompiliert …');
    await tick();
    this.applySettings();
    this.resetWorld(this.initialSnapshot());
    try {
      r.compile(scene, this.camera);
    } catch (e) {
      /* ignore */
    }
    onProgress(1, 'Bereit.');
    this.setupMenuScene();
    if (DEBUG) window.TLN = this;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.mode === 'playing') this.pause();
    });
  }

  // ------------------------------------------------------------------ Zustand
  newState() {
    let code = String(Math.floor(1000 + Math.random() * 9000));
    if (/(\d)\1\1/.test(code)) code = '4719';
    return {
      code,
      flags: { fusesInserted: 0 },
      inv: { flashlight: false, batteries: 0, medkits: 0, bottles: 0, fuses: 0, staffKey: false, basementKey: false, revolver: false, ammo: 0, reserve: 0, cross: false },
      notes: [],
      picked: [],
      playTime: 0,
      deaths: 0,
    };
  }

  initialSnapshot() {
    return {
      v: 1,
      name: 'Zimmer 116',
      ...JSON.parse(JSON.stringify(this.state)),
      player: { x: PLAYER_START.x, z: PLAYER_START.z, yaw: PLAYER_START.yaw, health: 100, battery: 100 },
      doors: {},
      drawers: {},
      monster: { active: false, rage: 0 },
    };
  }

  snapshot(name) {
    const P = this.player;
    let x = P.pos.x;
    let z = P.pos.z;
    let yaw = P.yaw;
    if (P.hidden) {
      x = P.hidden.front.x;
      z = P.hidden.front.z;
      yaw = P.hidden.yawOut;
    }
    const doors = {};
    for (const [id, d] of Object.entries(this.doors)) doors[id] = d.serialize ? d.serialize() : { open: d.isOpen, locked: d.locked };
    const drawers = {};
    for (const [id, d] of Object.entries(this.drawers)) drawers[id] = d.isOpen;
    return {
      v: 1,
      name,
      ...JSON.parse(JSON.stringify(this.state)),
      player: { x, z, yaw, health: Math.max(P.health, 65), battery: Math.max(P.battery, 25), flash: P.flashOn },
      doors,
      drawers,
      monster: { active: this.monster.state !== 'dormant', rage: this.monster.rage },
    };
  }

  checkpoint(name) {
    if (this.monster && ['chase', 'attack', 'recover'].includes(this.monster.state)) {
      this.pendingCheckpoint = name;
      return;
    }
    this.pendingCheckpoint = null;
    const snap = this.snapshot(name);
    this.lastSnapshot = snap;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(snap));
    } catch (e) {
      /* ignore */
    }
    this.ui.checkpointFlash();
    this.ui.setContinue(true);
  }

  loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && s.v === 1) return s;
      }
    } catch (e) {
      /* ignore */
    }
    return null;
  }

  // Welt in den Zustand eines Schnappschusses versetzen.
  resetWorld(snap) {
    const s = JSON.parse(JSON.stringify(snap));
    const prevCode = this.state.code;
    this.state = {
      code: s.code,
      flags: s.flags || {},
      inv: s.inv,
      notes: s.notes || [],
      picked: s.picked || [],
      playTime: s.playTime || 0,
      deaths: s.deaths || 0,
    };
    if (this.codeDecal && (s.code !== prevCode || !this.codeDecal.userData.code)) {
      const mat = this.codeDecal.material.clone();
      mat.onBeforeCompile = this.codeDecal.material.onBeforeCompile;
      mat.customProgramCacheKey = this.codeDecal.material.customProgramCacheKey;
      mat.map = makeCodeTexture(s.code);
      this.codeDecal.material = mat;
      this.codeDecal.userData.code = s.code;
    }
    const f = this.state.flags;
    this.ensurePremiumItems();
    this.ab = { crossT: 0, crossCd: 0, prayT: 0, prayCd: 0 };
    for (const p of Object.values(this.pickupById)) p.restore(this.state.picked.includes(p.id));
    for (const [id, d] of Object.entries(this.doors)) {
      const ds = s.doors && s.doors[id];
      if (ds) d.restore(ds);
      else d.restore({ open: false, locked: !!d.def.lock || id === 'bookshelf' });
    }
    for (const [id, d] of Object.entries(this.drawers)) d.restore(!!(s.drawers && s.drawers[id]));
    this.fusebox.sync();
    this.genLever.setPulled(!!f.power);
    this.overrideLever.setPulled(!!f.override);
    this.lights.setPower(!!f.power);
    this.keypadLed.material.emissive.setHex(f.orOpen ? 0x20ff40 : 0xff2010);
    this.gateChains.visible = !f.override;
    for (const gd of this.gateDoors) gd.piv.rotation.y = 0;
    if (this.terminalScreen) this.terminalScreen.material.emissiveIntensity = f.power ? 1.2 : 0;
    this.audio.stopLoops && this.audio.stopLoops();
    this.genHum = null;
    if (this.alarm) {
      this.alarm.stop();
      this.alarm = null;
    }
    this.ensureLoops();
    for (const pr of this.projectiles) pr.alive && this.scene.remove(pr.mesh);
    this.projectiles = [];
    this.timers = [];

    const P = this.player;
    P.spawn(s.player.x, s.player.z, s.player.yaw);
    P.health = s.player.health ?? 100;
    P.battery = s.player.battery ?? 100;
    P.hasFlashlight = !!this.state.inv.flashlight;
    P.flashOn = !!(s.player.flash && P.hasFlashlight && P.battery > 0);
    P.stamina = 100;
    P.exhausted = false;
    P.trauma = 0;
    P.damageFlash = 0;
    P.locked = false;
    this.ui.setHiding(false);

    const M = this.monster;
    M.rage = s.monster ? s.monster.rage || 0 : 0;
    M.awareness = 0;
    M.vent = null;
    M.model.root.visible = true;
    if (s.monster && s.monster.active) {
      const spot = this.farSpot(22);
      M.place(spot.x, spot.z, Math.random() * 6);
      M.state = 'patrol';
      M.setState('search');
      M.setState('patrol');
      M.cooldown = 25;
      M.sinceEncounter = 30;
      M.perceptionScale = 1;
    } else {
      M.place(MONSTER_LAIR.x, MONSTER_LAIR.z, 1.2);
      M.state = 'dormant';
      M.stateTime = 0;
    }
    this.dangerSmooth = 0;
    this.lastSnapshot = snap;
    this.updateObjective(false);
  }

  farSpot(minDist) {
    const P = this.player.pos;
    const cands = [];
    for (const [x, z] of POIS) {
      const px = x + 0.5;
      const pz = z + 0.5;
      if (!this.world.monsterPassable(x, z)) continue;
      const d = Math.hypot(px - P.x, pz - P.z) + (Math.abs(this.world.floorAt(px, pz) - P.y) > 2 ? 10 : 0);
      if (d >= minDist) cands.push({ x: px, z: pz, d });
    }
    if (!cands.length) return { x: MONSTER_LAIR.x, z: MONSTER_LAIR.z };
    cands.sort((a, b) => b.d - a.d);
    return pickOne(cands.slice(0, Math.max(3, Math.floor(cands.length / 2))));
  }

  // ------------------------------------------------------------------ Vollversion
  onAccountChange() {
    const was = this.premium;
    this.premium = !!this.account.premium;
    if (this.premium && !was) {
      this.ensurePremiumItems();
      if (this.mode === 'playing') this.ui.toast('Vollversion aktiv: Revolver [Klick/V], Kreuzkette [Q], Gebet [B].', 5000);
    }
    this.ui.refreshAccount();
    this.ui.refreshAbilities();
  }

  ensurePremiumItems() {
    if (!this.premium || !this.state) return;
    const inv = this.state.inv;
    if (inv.revolver === undefined) Object.assign(inv, { revolver: false, ammo: 0, reserve: 0, cross: false });
    if (!inv.revolver) {
      inv.revolver = true;
      inv.ammo = 6;
      inv.reserve = 6;
    }
    inv.cross = true;
  }

  crossActive() {
    return this.premium && this.ab.crossT > 0;
  }

  useCross() {
    if (!this.premium) return this.ui.toast('Die Kreuzkette gehört zur Vollversion.');
    const a = this.ab;
    if (a.crossT > 0) return;
    if (a.crossCd > 0) return this.ui.toast(`Die Kreuzkette ruht noch ${Math.ceil(a.crossCd)} s.`);
    a.crossT = CROSS_TIME;
    a.crossCd = CROSS_COOLDOWN;
    this.audio.holy();
    this.ui.toast('Du hebst die Kreuzkette. Es kann dich jetzt nicht angreifen.');
  }

  usePray() {
    if (!this.premium) return this.ui.toast('Das Gebet gehört zur Vollversion.');
    const a = this.ab;
    if (a.prayT > 0) return;
    if (a.prayCd > 0) return this.ui.toast(`Du kannst erst in ${Math.ceil(a.prayCd)} s wieder beten.`);
    a.prayT = PRAY_TIME;
    a.prayCd = PRAY_COOLDOWN;
    this.audio.prayer();
    this.ui.toast('Ein Gebet … du spürst, wo es ist.');
  }

  updateAbilities(dt) {
    const a = this.ab;
    a.crossT = Math.max(0, a.crossT - dt);
    a.crossCd = Math.max(0, a.crossCd - dt);
    a.prayT = Math.max(0, a.prayT - dt);
    a.prayCd = Math.max(0, a.prayCd - dt);
    this.monster.model.setXray(this.premium && a.prayT > 0 && this.monster.state !== 'inVent');
    const u = this.post.u;
    u.holy.value = damp(u.holy.value, this.crossActive() ? 0.6 + Math.sin(this.time * 4) * 0.15 : 0, 6, dt);
    this.muzzleFlash = Math.max(0, this.muzzleFlash - dt);
    this.ui.updateAbilities(this);
  }

  // Mündungsfeuer bzw. goldener Schein über das indirekte Licht (kein Shader-Neukompilieren)
  overrideBounce() {
    const b = this.lights.bounce;
    const reg = regionUniforms.tlnLightRegion.value;
    const c = this.camera.position;
    if (this.muzzleFlash > 0) {
      const d = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      b.position.copy(c).addScaledVector(d, 0.6);
      b.color.setHex(0xffc070);
      b.intensity = 14;
      b.distance = 12;
      reg[0] = this.world.regionAt(c.x, c.z);
    } else if (this.crossActive()) {
      b.position.set(c.x, c.y + 0.3, c.z);
      b.color.setHex(0xffd890);
      b.intensity = 1.6 + Math.sin(this.time * 4) * 0.4;
      b.distance = 6;
      reg[0] = this.world.regionAt(c.x, c.z);
    } else b.color.setHex(0xffe6c8);
  }

  // ------------------------------------------------------------------ Raum-Culling
  // Objekte gehören zu Regionen (Räumen). Sichtbar ist nur die Region der Kamera
  // plus Regionen, die über offene Türen verbunden sind.
  setupCulling() {
    const w = this.world;
    this.cullItems = [];
    this.doorLinks = [];
    for (const d of Object.values(this.doors)) {
      const a = d.axis === 'z' ? [d.cx, d.cz - 1, d.cx, d.cz + 1] : [d.cx - 1, d.cz, d.cx + 1, d.cz];
      const A = w.region[w.idx(a[0], a[1])];
      const B = w.region[w.idx(a[2], a[3])];
      d.pivot.userData.regions = [A, B];
      this.doorLinks.push({ A, B, door: d, idx: d.idx });
    }
    const skip = new Set(['architecture', 'props-static', 'light-pool', 'monster']);
    for (const child of this.scene.children) {
      if (skip.has(child.name) || child.isLight || child.isCamera || child.isPoints) continue;
      if (child === this.player.flash.target) continue;
      if (!child.userData.regions) {
        const box = new THREE.Box3().setFromObject(child);
        if (box.isEmpty()) continue;
        const c = box.getCenter(new THREE.Vector3());
        child.userData.regions = w.probeRegions(c.x, c.z);
      }
      this.cullItems.push(child);
    }
    for (const name of ['architecture', 'props-static']) {
      for (const g of this.scene.children.filter((c) => c.name === name)) for (const m of g.children) this.cullItems.push(m);
    }
    this.visibleRegions = new Set();
  }

  computeVisibleRegions(x, z, out) {
    const w = this.world;
    out.clear();
    out.add(255);
    const r = w.regionAt(x, z);
    if (r === 255) for (const rr of w.probeRegions(x, z, 0.6)) out.add(rr);
    else out.add(r);
    for (let depth = 0; depth < 2; depth++) {
      const add = [];
      for (const L of this.doorLinks) {
        const open = L.door.isOpen || Math.abs(L.door.angle) > 0.05;
        if (!open) continue;
        if (out.has(L.A) && !out.has(L.B)) add.push(L.B);
        else if (out.has(L.B) && !out.has(L.A)) add.push(L.A);
      }
      if (!add.length) break;
      for (const a of add) out.add(a);
    }
    return out;
  }

  applyCulling(x, z) {
    if (!this.cullItems) return;
    const vis = this.computeVisibleRegions(x, z, this.visibleRegions);
    for (const o of this.cullItems) {
      const regs = o.userData.regions;
      let v = false;
      for (let i = 0; i < regs.length; i++) if (vis.has(regs[i])) { v = true; break; }
      o.visible = v && !o.userData.hidden;
    }
    // Monster: dynamische Region (beim Gebet immer sichtbar)
    const M = this.monster;
    if (M && M.state !== 'inVent') {
      const mr = this.world.probeRegions(M.pos.x, M.pos.z, 0.4);
      M.model.root.visible = mr.some((r) => vis.has(r)) || (this.premium && this.ab.prayT > 0);
    }
  }

  // ------------------------------------------------------------------ Modi
  setupMenuScene() {
    this.mode = 'menu';
    this.menuT = 5;
    this.menuStart = 5;
    this.ui.show('menu');
    this.ui.setHud(false);
    this.ui.setContinue(!!this.loadSave());
    this.ui.refreshAccount();
    this.menuMonster();
  }

  menuMonster() {
    const M = this.monster;
    M.place(13.6, 21.4, Math.PI / 2);
    M.state = 'scripted';
    M.script = (dt, anim) => {
      anim.lean = 0.25;
      anim.scan = 0.15;
      anim.jaw = 0.1;
      M.curSpeed = 0;
    };
  }

  toMenu() {
    this.expectUnlock = true;
    this.input.unlock();
    this.audio.suspend();
    this.resetWorld(this.initialSnapshot());
    this.ui.setMonitor(false);
    this.post.setCamera(this.camera);
    this.post.u.cctv.value = 0;
    this.ui.fade(0);
    this.setupMenuScene();
  }

  newGame() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {
      /* ignore */
    }
    this.state = this.newState();
    const snap = this.initialSnapshot();
    this.resetWorld(snap);
    this.lastSnapshot = snap;
    this.mode = 'intro';
    this.ui.show('intro');
    this.audio.init();
    this.audio.resume();
  }

  continueGame() {
    const s = this.loadSave();
    if (!s) return this.newGame();
    this.resetWorld(s);
    this.startPlaying();
  }

  startPlaying() {
    this.ui.hideAll();
    this.ui.setHud(true);
    this.mode = 'playing';
    this.input.enabled = true;
    this.input.clear();
    this.audio.init();
    this.audio.resume();
    this.ensureLoops();
    if (!IS_TOUCH) this.input.lock();
    this.ui.fade(0);
    const u = this.post.u;
    u.fade.value = 0;
    u.flash.value = 0;
    u.cctv.value = 0;
    u.damage.value = 0;
    this.post.setCamera(this.camera);
    this.updateObjective(true);
    if (!this.state.flags.tutorial) {
      this.state.flags.tutorial = true;
      setTimeout(() => this.ui.toast(IS_TOUCH ? 'Linke Seite: laufen · Rechte Seite: umsehen' : 'WASD: laufen · Maus: umsehen · Shift: rennen'), 1200);
      setTimeout(() => this.ui.toast('Neben dem Bett liegt etwas …'), 5000);
    }
  }

  ensureLoops() {
    if (!this.audio.ready) return;
    const f = this.state.flags;
    if (f.power && !this.genHum) this.genHum = this.audio.loopHum({ x: 63.4, y: -3, z: 6.6 }, 48, 0.3, 'gen');
    if (f.override && !this.alarm) this.alarm = this.audio.alarmStart({ x: 6.5, y: 2, z: 33 });
  }

  pause() {
    if (this.mode !== 'playing') return;
    this.mode = 'paused';
    this.ui.show('pause');
    this.expectUnlock = true;
    this.input.unlock();
    this.audio.suspend();
  }

  resume() {
    this.ui.hideAll();
    this.mode = 'playing';
    this.input.clear();
    this.audio.resume();
    if (!IS_TOUCH) this.input.lock();
  }

  setOverlay(kind) {
    this.mode = 'overlay';
    this.overlay = kind;
    this.expectUnlock = !!document.pointerLockElement;
    this.input.unlock();
  }

  openInventory() {
    this.setOverlay('inventory');
    this.ui.invSel = null;
    this.ui.refreshInventory();
    this.ui.show('inventory');
    this.audio.paper();
  }

  closeOverlay() {
    if (this.overlay === 'note' && this.noteFromInv) {
      this.noteFromInv = false;
      this.overlay = 'inventory';
      this.ui.refreshInventory();
      this.ui.show('inventory');
      return;
    }
    this.overlay = null;
    this.ui.hideAll();
    this.mode = 'playing';
    this.input.clear();
    if (!IS_TOUCH) this.input.lock();
  }

  readNote(id, fromInv = false) {
    const s = this.state;
    if (!s.notes.includes(id)) {
      s.notes.push(id);
      this.audio.stinger('discover');
      if (id === 'n_shift') s.flags.readShift = true;
      if (id === 'n_diary') s.flags.readDiary = true;
      if (id === 'n_guard') s.flags.readGuard = true;
      this.updateObjective(true);
    }
    this.audio.paper();
    this.noteFromInv = fromInv;
    this.setOverlay('note');
    this.ui.showNote(id);
  }

  noteTitle(id) {
    return NOTES[id] ? NOTES[id].title : null;
  }

  updateObjective(flash = true) {
    this.ui.setObjective(objectiveText(this.state), flash);
  }

  // ------------------------------------------------------------------ Aktionen
  collect(p) {
    const s = this.state;
    const inv = s.inv;
    const P = this.player;
    switch (p.item) {
      case 'flashlight':
        inv.flashlight = true;
        P.hasFlashlight = true;
        P.battery = 100;
        P.toggleFlash(true);
        this.ui.toast(IS_TOUCH ? 'Taschenlampe. Taste mit Lampensymbol zum Ein-/Ausschalten.' : 'Taschenlampe aufgehoben. [F] ein-/ausschalten.');
        break;
      case 'battery':
        inv.batteries++;
        this.ui.toast('Batterie aufgehoben (' + inv.batteries + ').');
        break;
      case 'medkit':
        inv.medkits++;
        this.ui.toast('Verbandskasten aufgehoben. ' + (IS_TOUCH ? '[+]' : '[H]') + ' benutzen.');
        break;
      case 'bottle':
        if (inv.bottles >= 3) {
          this.ui.toast('Du kannst nicht mehr Flaschen tragen.');
          return;
        }
        inv.bottles++;
        this.ui.toast('Glasflasche. ' + (IS_TOUCH ? '[WURF]' : '[G]') + ' werfen, um es abzulenken.');
        break;
      case 'staff_key':
        inv.staffKey = true;
        this.ui.toast('Personalschlüssel gefunden.');
        this.onStaffKey();
        break;
      case 'basement_key':
        inv.basementKey = true;
        this.ui.toast('Kellerschlüssel gefunden.');
        this.lights.flickerNear(15.5, 6.5, 8, 3);
        this.noise(15.5, 6.5, 30, 'scripted');
        break;
      case 'fuse':
        inv.fuses++;
        this.ui.toast('Sicherung gefunden.');
        break;
      case 'ammo':
        inv.reserve = (inv.reserve || 0) + 6;
        this.ui.toast('Revolvermunition (+6).');
        if (inv.ammo === 0) this.revolver.startReload();
        break;
      case 'note':
        p.take();
        s.picked.push(p.id);
        this.readNote(p.note);
        return;
    }
    p.take();
    s.picked.push(p.id);
    this.audio.pickup(p.item.endsWith('key') ? 'key' : 'item');
    this.updateObjective(true);
    if (['flashlight', 'staff_key', 'basement_key', 'fuse'].includes(p.item)) this.checkpoint(p.item);
  }

  onStaffKey() {
    // Das Monster erwacht – kommt durch die Lüftung in den Nordflügel.
    if (this.monster.state !== 'dormant') return;
    this.lights.flickerNear(35, 8, 12, 2.5);
    this.schedule(0.6, () => this.audio.distantScream());
    this.schedule(2.5, () => {
      if (this.monster.state !== 'dormant') return;
      this.monster.awaken({ gentle: true, sinceEncounter: 30 });
      this.monster.investigatePt = { x: 22.5, z: 8.5, prio: 10 };
      this.monster.setState('investigate');
      this.ui.toast('Irgendwo über dir poltert etwas durch die Lüftung …');
    });
  }

  // Spielzeitbasierte Verzögerung (läuft nicht weiter, solange pausiert ist)
  schedule(delay, fn) {
    this.timers.push({ t: delay, fn });
  }

  runTimers(dt) {
    if (!this.timers.length) return;
    const due = [];
    for (const tm of this.timers) {
      tm.t -= dt;
      if (tm.t <= 0) due.push(tm);
    }
    if (!due.length) return;
    this.timers = this.timers.filter((tm) => tm.t > 0);
    for (const tm of due) tm.fn();
  }

  noise(x, z, radius, type) {
    if (this.monster) this.monster.hear(x, z, radius, type);
  }

  useBattery() {
    const inv = this.state.inv;
    const P = this.player;
    if (!inv.flashlight) return;
    if (inv.batteries <= 0) return this.ui.toast('Keine Ersatzbatterie.');
    if (P.battery > 92) return this.ui.toast('Die Batterie ist noch fast voll.');
    inv.batteries--;
    P.battery = 100;
    this.audio.battery();
    this.ui.toast('Neue Batterie eingesetzt.');
  }

  useMedkit() {
    const inv = this.state.inv;
    const P = this.player;
    if (inv.medkits <= 0) return this.ui.toast('Kein Verbandskasten.');
    if (P.health >= 100) return this.ui.toast('Du bist nicht verletzt.');
    inv.medkits--;
    P.heal(50);
    this.audio.pickup();
    this.ui.toast('Wunden verbunden (+50).');
  }

  throwBottle() {
    const inv = this.state.inv;
    if (inv.bottles <= 0) return this.ui.toast('Keine Flasche zum Werfen.');
    if (this.player.hidden) return;
    inv.bottles--;
    const cam = this.camera;
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    const pos = cam.position.clone().addScaledVector(dir, 0.35);
    pos.y -= 0.1;
    const vel = dir.clone().multiplyScalar(11);
    vel.y += 2.2;
    this.projectiles.push(new Projectile(this, pos, vel));
    this.audio.burst(this.audio.now, 'bandpass', 800, 1, 0.2, 0.2, this.audio.out({ gain: 0.4 }).input, 0.05);
  }

  spawnShards(p) {
    for (let k = 0; k < 7; k++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.004, 0.02), MAT.bottle);
      m.position.set(p.x + rand(-0.3, 0.3), this.world.floorAt(p.x, p.z) + 0.004, p.z + rand(-0.3, 0.3));
      m.rotation.y = rand(0, 6);
      this.scene.add(m);
      this.shards.push(m);
    }
    while (this.shards.length > 60) {
      const s = this.shards.shift();
      this.scene.remove(s);
      s.geometry.dispose();
    }
  }

  makeStaticMaterial() {
    const m = screenMaterial(null);
    this.staticMats.push(m);
    return m;
  }

  openVent(id) {
    const v = this.vents[id];
    if (v) v.trigger();
  }

  doorAtCell(cx, cz) {
    return this.doorByIdx.get(this.world.idx(cx, cz)) || null;
  }

  nearestLocker(x, z) {
    let best = null;
    let bd = 7;
    for (const l of this.lockers) {
      const d = Math.hypot(l.pos.x - x, l.pos.z - z);
      if (d < bd) {
        bd = d;
        best = l;
      }
    }
    return best;
  }

  litAt(x, z) {
    const reg = this.world.regionAt(x, z);
    let lit = 0;
    for (const f of this.lights.fixtures) {
      if (f.value < 0.1 || f.type === 'moon' || f.type === 'exit') continue;
      if (f.region !== reg && f.region !== 255 && reg !== 255) continue;
      const d = Math.hypot(f.x - x, f.z - z);
      if (d < 4.5) lit = Math.max(lit, f.value * (1 - d / 4.5) * Math.min(1, f.intensity / 4));
    }
    return lit;
  }

  occlusion(pos) {
    const c = this.camera.position;
    if (Math.abs(pos.y - c.y) > 3.5) return 0.9;
    return this.world.lineOfSight(c.x, c.z, pos.x, pos.z) ? 0 : 0.8;
  }

  // ------------------------------------------------------------------ Story-Ereignisse
  restorePower() {
    const s = this.state;
    s.flags.power = true;
    const genPos = { x: 63.4, y: -3, z: 6.6 };
    this.genHum = this.audio.generatorStart(genPos);
    this.player.trauma = 0.6;
    this.ui.toast('Das Aggregat springt röchelnd an …');
    this.schedule(2.4, () => {
      this.lights.setPower(true);
      for (const f of this.lights.fixtures) {
        f.override = 0;
        this.schedule(0.2 + Math.random() * 1.6, () => (f.override = null));
      }
      if (this.terminalScreen) this.terminalScreen.material.emissiveIntensity = 1.2;
      this.ui.toast('Überall im Haus flackern Lichter auf. Und etwas hat es gehört.');
      this.audio.monsterScream({ x: 40, y: 1, z: 21 });
    });
    this.monster.rage = 1;
    if (this.monster.state === 'dormant') this.monster.awaken({ sinceEncounter: 60 });
    this.schedule(2.6, () => this.noise(genPos.x, genPos.z, 90, 'generator'));
    this.updateObjective(true);
    this.schedule(0.3, () => this.checkpoint('Strom'));
  }

  triggerOverride() {
    const s = this.state;
    s.flags.override = true;
    this.gateChains.visible = false;
    const pos = { x: 6.5, y: 2, z: 33 };
    this.alarm = this.audio.alarmStart(pos);
    this.audio.stinger('spot');
    this.ui.toast('Die Notverriegelung ist gelöst! Sirenen heulen. LAUF zum Haupteingang!');
    this.monster.rage = 1.6;
    if (this.monster.state === 'dormant') this.monster.awaken({ sinceEncounter: 100 });
    this.noise(6.5, 32, 120, 'alarm');
    this.updateObjective(true);
    this.schedule(0.3, () => this.checkpoint('Freigabe'));
  }

  tryExit() {
    const s = this.state;
    if (!s.flags.override) {
      if (!s.flags.seenExit) {
        s.flags.seenExit = true;
        this.updateObjective(true);
      }
      this.audio.doorLocked({ x: 18.5, y: 1.3, z: 34.6 });
      this.ui.toast('Schwere Ketten, ein Elektroschloss: „NOTVERRIEGELUNG – STROMAUSFALL“.');
      this.noise(18.5, 34.5, 6, 'door');
      return;
    }
    this.startEnding();
  }

  startEnding() {
    this.mode = 'ending';
    this.endT = 0;
    this.player.locked = true;
    this.ui.setHud(false);
    this.expectUnlock = true;
    this.input.unlock();
    this.audio.doorSlam({ x: 18.5, y: 1.3, z: 34.8 });
    if (this.alarm) {
      this.schedule(2.5, () => {
        this.alarm && this.alarm.stop();
        this.alarm = null;
      });
    }
    this.audio.stinger('dawn');
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch (e) {
      /* ignore */
    }
  }

  onPlayerKilled(cause) {
    if (this.mode === 'dying' || this.mode === 'dead') return;
    if (this.mode === 'monitor') this.exitMonitors();
    this.mode = 'dying';
    this.dieT = 0;
    this.dieCause = cause;
    this.player.dead = true;
    this.state.deaths++;
    this.audio.stinger('scare');
    this.audio.monsterScream(this.monster.headPos());
    this.audio.setHeart(0, 60);
    this.ui.setHud(false);
    this.ui.setHiding(false);
    this.expectUnlock = true;
    this.input.unlock();
    this.dieQuat = this.camera.quaternion.clone();
  }

  loadCheckpoint() {
    const snap = this.lastSnapshot || this.loadSave() || this.initialSnapshot();
    const deaths = this.state.deaths;
    this.resetWorld(snap);
    this.state.deaths = Math.max(deaths, this.state.deaths);
    this.ui.fade(0, false, 600);
    this.post.u.fade.value = 0;
    this.startPlaying();
  }

  // ------------------------------------------------------------------ Kameramodus
  enterMonitors() {
    this.mode = 'monitor';
    this.camIdx = this.camIdx || 0;
    this.camViewT = 0;
    this.player.locked = true;
    this.ui.setHud(false);
    this.setCam(this.camIdx);
    this.post.u.cctv.value = 1;
    this.ui.setMonitor(true, CAMS[this.camIdx].name);
    this.audio.beep('key');
    this.expectUnlock = !!document.pointerLockElement;
    this.input.unlock();
  }

  setCam(i) {
    const cam = this.surv.cams[i];
    cam.aspect = innerWidth / innerHeight;
    cam.updateProjectionMatrix();
    this.post.setCamera(cam);
    this.ui.setMonitor(true, CAMS[i].name);
    this.camViewT = 0;
  }

  cycleCam(d) {
    this.camIdx = (this.camIdx + d + CAMS.length) % CAMS.length;
    this.setCam(this.camIdx);
    this.audio.beep('key');
  }

  exitMonitors() {
    if (this.mode !== 'monitor') return;
    for (const c of this.surv.cams) {
      c.aspect = 4 / 3;
      c.updateProjectionMatrix();
    }
    this.post.setCamera(this.camera);
    this.post.u.cctv.value = 0;
    this.ui.setMonitor(false);
    this.player.locked = false;
    this.mode = 'playing';
    this.ui.setHud(true);
    this.input.clear();
    if (!IS_TOUCH) this.input.lock();
  }

  // ------------------------------------------------------------------ Einstellungen
  applySettings() {
    const r = this.renderer;
    r.toneMappingExposure = 1.3 * settings.brightness;
    if (this.ambient) this.ambient.intensity = 0.55 * settings.brightness;
    this.audio.setVolumes(settings.volume, settings.music);
    this.updateFov();
  }

  updateFov() {
    const aspect = innerWidth / innerHeight;
    if (aspect >= 1) this.fovBase = settings.fov;
    else {
      const h = (settings.fov * Math.PI) / 180;
      this.fovBase = Math.min(100, (2 * Math.atan(Math.tan(h / 2) * 0.82 / aspect) * 180) / Math.PI);
    }
  }

  applyQuality() {
    const q = resolveQuality();
    this.quality = q;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, q.pixelRatio));
    this.player.setQuality(q);
    this.lights.setPoolSize(q.lights);
    this.post.build(q);
  }

  resize() {
    const w = innerWidth;
    const h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.post) this.post.setSize(w, h);
    if (this.mode === 'monitor') this.setCam(this.camIdx);
    this.updateFov();
    this.ui.layoutStatus();
  }

  // ------------------------------------------------------------------ Interaktion
  findTarget() {
    const P = this.player;
    if (P.hidden) return P.hidden;
    const cam = this.camera;
    const f = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    const touch = this.input.usingTouch || IS_TOUCH;
    let best = null;
    let bestScore = Infinity;
    const v = new THREE.Vector3();
    for (const e of this.entities) {
      if (!e.pos) continue;
      v.subVectors(e.pos, cam.position);
      const d = v.length();
      const reach = 2.35 + (e.radius > 0.8 ? 0.6 : 0);
      if (d > reach + e.radius) continue;
      v.divideScalar(d || 1);
      const ang = Math.acos(clamp(v.dot(f), -1, 1));
      const tol = Math.atan2(e.radius, d) + (touch ? 0.24 : 0.09);
      if (ang > tol) continue;
      // Wände dazwischen?
      const t = this.world.rayDistance(cam.position.x, cam.position.z, e.pos.x - cam.position.x, e.pos.z - cam.position.z, 1);
      const hd = Math.hypot(e.pos.x - cam.position.x, e.pos.z - cam.position.z);
      if ((1 - t) * hd > 0.7) continue;
      const pr = e.prompt();
      if (!pr) continue;
      const score = ang / tol + d * 0.12;
      if (score < bestScore) {
        bestScore = score;
        best = e;
      }
    }
    return best;
  }

  // ------------------------------------------------------------------ Hauptschleife
  update(dt) {
    this.time += dt;
    const input = this.input;
    switch (this.mode) {
      case 'menu':
      case 'intro':
        this.updateMenu(dt);
        break;
      case 'playing':
        this.updatePlaying(dt);
        break;
      case 'monitor':
        this.updateMonitor(dt);
        break;
      case 'overlay':
        if (input.pressed('pause')) this.closeOverlay();
        else if (this.overlay === 'inventory' && input.pressed('inventory')) this.closeOverlay();
        else if (this.overlay === 'note' && (input.pressed('interact') || input.pressed('inventory'))) this.closeOverlay();
        this.updateWorldVisuals(dt * 0.0001);
        break;
      case 'paused':
        if (input.pressed('pause')) this.resume();
        break;
      case 'dying':
        this.updateDying(dt);
        break;
      case 'ending':
        this.updateEnding(dt);
        break;
      default:
        break;
    }
    input.endFrame();
  }

  updateMenu(dt) {
    this.menuT += dt;
    const cam = this.camera;
    const t = this.menuT;
    const L = 26;
    const k = (t * 0.32) % L;
    const x = 44 - k;
    cam.position.set(x, 1.6 + Math.sin(t * 0.8) * 0.02, 21.4 + Math.sin(t * 0.3) * 0.15);
    cam.rotation.set(Math.sin(t * 0.4) * 0.03 - 0.02, Math.PI / 2 + Math.sin(t * 0.23) * 0.12, 0, 'YXZ');
    cam.fov = 70;
    cam.updateProjectionMatrix();
    const P = this.player;
    P.flashOn = true;
    P.battery = 100;
    P.flashDir.set(0, 0, -1).applyQuaternion(cam.quaternion);
    P.flashPower = 0.85 + Math.sin(t * 9) * 0.02 * (Math.random() < 0.02 ? 20 : 1);
    P.flash.intensity = P.flashPower * 72;
    P.flash.position.copy(cam.position).add(new THREE.Vector3(0.15, -0.15, 0).applyQuaternion(cam.quaternion));
    P.flash.target.position.copy(P.flash.position).addScaledVector(P.flashDir, 6);
    P.flash.target.updateMatrixWorld();
    // Ein-/Ausblenden der Kamerafahrt
    const end = clamp((k - (L - 3)) / 3, 0, 1) + clamp(1 - k / 1.2, 0, 1) * (t - this.menuStart > 3 ? 1 : 0) + clamp(1 - (t - this.menuStart) / 1.5, 0, 1);
    this.post.u.fade.value = clamp(end, 0, 1);
    this.monster.update(dt);
    this.updateWorldVisuals(dt);
    if (this.audio.ready) {
      this.audio.updateListener(cam);
      this.audio.setMusicState(0.6, 0, 0);
      this.audio.updateMusic(dt);
    }
  }

  updatePlaying(dt) {
    const input = this.input;
    const P = this.player;
    const s = this.state;
    s.playTime += dt;
    if (input.pressed('pause')) return this.pause();
    if (input.pressed('inventory')) return this.openInventory();
    if (input.pressed('reload')) this.useBattery();
    if (input.pressed('heal')) this.useMedkit();
    if (input.pressed('throw')) this.throwBottle();
    if (input.pressed('cross')) this.useCross();
    if (input.pressed('pray')) this.usePray();

    this.runTimers(dt);
    P.update(dt, input);
    if (P.moving) this.ui.hideKeyHint();

    const target = this.findTarget();
    this.ui.setPrompt(target ? target.prompt() : null);
    if (input.pressed('interact') && target) {
      const pr = target.prompt();
      if (pr) target.interact();
    }

    this.revolver.update(dt, input);
    this.updateAbilities(dt);
    for (const e of this.entities) if (e.update) e.update(dt);
    for (const v of Object.values(this.vents)) v.update(dt);
    for (const pr of this.projectiles) pr.update(dt);
    this.projectiles = this.projectiles.filter((p) => p.alive);
    this.monster.update(dt);
    if (this.mode !== 'playing') return;

    this.storyTriggers(dt);
    this.updateDanger(dt);
    this.updateWorldVisuals(dt);
    this.ui.updateHud(P, s.inv, dt);
    if (this.pendingCheckpoint && !['chase', 'attack', 'recover'].includes(this.monster.state)) this.checkpoint(this.pendingCheckpoint);
  }

  updateMonitor(dt) {
    const input = this.input;
    if (input.pressed('interact') || input.pressed('pause')) return this.exitMonitors();
    if (input.keys.has('ArrowRight') || input.keys.has('KeyD')) {
      if (!this._camHeld) this.cycleCam(1);
      this._camHeld = true;
    } else if (input.keys.has('ArrowLeft') || input.keys.has('KeyA')) {
      if (!this._camHeld) this.cycleCam(-1);
      this._camHeld = true;
    } else this._camHeld = false;
    this.camViewT += dt;
    if (this.camIdx === 2 && this.camViewT > 1.2 && !this.state.flags.codeKnown) {
      this.state.flags.codeKnown = true;
      this.ui.toast(`An der Zellenwand stehen vier Ziffern: ${this.state.code.split('').join(' ')} (notiert)`, 5000);
      this.audio.stinger('discover');
      this.updateObjective(true);
      this.checkpoint('Code');
    }
    this.runTimers(dt);
    for (const e of this.entities) if (e.update) e.update(dt);
    for (const v of Object.values(this.vents)) v.update(dt);
    this.player.update(dt, input);
    this.monster.update(dt);
    if (this.mode !== 'monitor') return;
    this.updateDanger(dt);
    const near = this.monster.danger() > 0.55;
    this.ui.monitorTick(near);
    if (this.monster.state === 'attack' || (this.monster.state === 'chase' && this.monster.near())) this.exitMonitors();
    this.updateWorldVisuals(dt);
  }

  storyTriggers(dt) {
    const s = this.state;
    const P = this.player;
    const M = this.monster;
    if (M.state === 'dormant' && s.playTime > 420 && s.inv.flashlight) {
      M.awaken({ gentle: true, sinceEncounter: 40 });
      this.audio.distantScream();
    }
    if (!s.flags.enteredBasement && P.pos.y < -2.5) {
      s.flags.enteredBasement = true;
      this.ui.toast('Kalte, feuchte Luft. Irgendwo tropft Wasser.');
      this.checkpoint('Keller');
    }
    if (!s.flags.enteredStaff && P.pos.x < 11.5 && P.pos.z > 19 && P.pos.z < 23 && P.pos.y > -1) {
      s.flags.enteredStaff = true;
      this.checkpoint('Personaltrakt');
    }
    if (!s.flags.enteredSecret && this.world.zoneAt(P.pos.x, P.pos.z) === 'secret') {
      s.flags.enteredSecret = true;
      this.checkpoint('Archiv');
    }
    // Monster stört die Taschenlampe, wenn es nah ist
    if (P.flashOn && M.state === 'chase' && M.near() && Math.random() < dt * 1.2) P.flashFlicker = 0.25;
  }

  updateDanger(dt) {
    const M = this.monster;
    const P = this.player;
    const dg = M.danger();
    this.dangerSmooth = damp(this.dangerSmooth || 0, dg, dg > this.dangerSmooth ? 4 : 0.8, dt);
    const d = this.dangerSmooth;
    this.audio.setHeart(d > 0.18 ? 0.25 + d * 0.75 : 0, 68 + d * 85);
    let bl = 0;
    let br = 0.5;
    if (P.exhausted) {
      bl = 0.8;
      br = 1.6;
    } else if (P.hidden && d > 0.3) {
      bl = 0.35;
      br = 0.45;
    }
    this.audio.setBreath(bl, br);
    const chasing = ['chase', 'attack', 'recover'].includes(M.state);
    this.audio.setMusicState(M.state === 'dormant' ? 0.4 : 0.55, clamp(d * 1.3, 0, 1) * (chasing ? 0.4 : 1), chasing ? 1 : 0);
    const u = this.post.u;
    u.danger.value = d;
    u.damage.value = P.damageFlash;
    u.lowHealth.value = clamp((55 - P.health) / 55, 0, 1);
    M.model.eyeMat.emissiveIntensity = chasing ? 3 : 1.4;
    const amb = 0.55 * settings.brightness * (P.hidden ? 4 : 1);
    this.ambient.intensity = damp(this.ambient.intensity, amb, 3, dt);
  }

  updateWorldVisuals(dt) {
    const P = this.player;
    this.lights.update(dt, this.camera, { light: P.flash, dir: P.flashDir });
    this.overrideBounce();
    this.dust.update(dt, this.camera, P.flash, P.flashPower, innerHeight * this.renderer.getPixelRatio());
    for (const m of this.staticMats) m.uniforms.time.value += dt;
    if (this.audio.ready) {
      this.audio.updateListener(this.camera);
      this.audio.updateAmbience(dt, { allowScreams: this.monster.state !== 'dormant' || this.state.playTime > 90 });
      this.audio.updateMusic(dt);
      this.audio.setHums(this.lights.hums || []);
    }
  }

  updateDying(dt) {
    this.dieT += dt;
    const M = this.monster;
    const cam = this.camera;
    M.update(dt);
    const head = new THREE.Vector3(M.pos.x, M.pos.y + 1.75, M.pos.z);
    const m = new THREE.Matrix4().lookAt(cam.position, head, new THREE.Vector3(0, 1, 0));
    const q = new THREE.Quaternion().setFromRotationMatrix(m);
    cam.quaternion.slerp(q, 1 - Math.exp(-dt * 8));
    if (this.dieCause === 'attack' && this.dieT > 0.5) {
      cam.position.y = damp(cam.position.y, this.player.pos.y + 0.35, 3, dt);
      cam.rotateZ(dt * 0.4);
    }
    const u = this.post.u;
    u.damage.value = 1;
    u.danger.value = 1;
    if (this.dieT > 1.3) u.fade.value = clamp((this.dieT - 1.3) / 1.0, 0, 1);
    this.updateWorldVisuals(dt);
    if (this.dieT > 2.6) {
      this.mode = 'dead';
      this.audio.setMusicState(0.3, 0, 0);
      this.ui.showDead(this.dieCause);
    }
  }

  updateEnding(dt) {
    this.endT += dt;
    this.runTimers(dt);
    const k = clamp(this.endT / 2.5, 0, 1);
    for (const gd of this.gateDoors) gd.piv.rotation.y = gd.s * 1.3 * (1 - Math.pow(1 - k, 3));
    const cam = this.camera;
    const target = new THREE.Vector3(18.5, 1.6, 36);
    const m = new THREE.Matrix4().lookAt(cam.position, target, new THREE.Vector3(0, 1, 0));
    cam.quaternion.slerp(new THREE.Quaternion().setFromRotationMatrix(m), 1 - Math.exp(-dt * 3));
    cam.position.z = damp(cam.position.z, 34.6, 0.6, dt);
    this.post.u.flash.value = clamp((this.endT - 1.0) / 2.5, 0, 1) * 1.2;
    this.monster.update(dt);
    this.updateWorldVisuals(dt);
    if (this.endT > 4.2 && !this.endShown) {
      this.endShown = true;
      this.ui.fade(1, true, 1500);
      setTimeout(() => {
        const s = this.state;
        const mins = Math.floor(s.playTime / 60);
        const secs = Math.floor(s.playTime % 60);
        const total = Object.keys(NOTES).length;
        this.ui.showEnd(
          `Spielzeit: ${mins}:${String(secs).padStart(2, '0')}<br>Tode: ${s.deaths}<br>Dokumente: ${s.notes.length} / ${total}`,
        );
        this.ui.fade(0, true, 1200);
        this.post.u.flash.value = 0;
        this.endShown = false;
        this.mode = 'dead';
      }, 1700);
    }
  }

  render(dt) {
    const r = this.renderer;
    r.shadowMap.needsUpdate = true;
    const nv = this.mode === 'monitor';
    const vc = nv ? this.surv.cams[this.camIdx].position : this.camera.position;
    this.applyCulling(vc.x, vc.z);
    if (nv) this.surv.cams[this.camIdx].userData.prop.visible = false;
    if (nv) this.surv.nightVision(true);
    this.post.render(dt);
    if (nv) this.surv.nightVision(false);
    if (this.mode === 'playing' || this.mode === 'monitor') this.surv.update(dt, r);
  }
}

function tick() {
  return new Promise((r) => setTimeout(r, 0));
}

void VENTS;
