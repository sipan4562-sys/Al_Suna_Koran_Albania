// Interaktive Objekte: Türen, Spinde, Gegenstände, Sicherungskasten, Hebel,
// Kühlfächer, Geheimregal, Ausgang, Überwachungspult, Terminal, Lüftungsgitter, Wurfflaschen.
import * as THREE from 'three';
import { MAT, emissiveMaterial } from './materials.js';
import { box, cyl, part, G, locker as lockerModel, bookshelf as bookshelfModel, sign, mergeByMaterial, confessional as confessionalModel } from './level/props.js';
import { DECAL } from './textures.js';
import { damp, clamp, rand } from './utils.js';
import { PLAYER } from './config.js';

const TMP = new THREE.Vector3();

// ---------------------------------------------------------------------------
export class Door {
  constructor(game, def, batcher) {
    this.game = game;
    this.def = def;
    this.id = def.id;
    this.kind = 'door';
    const w = game.world;
    this.cx = def.x;
    this.cz = def.z;
    this.idx = w.idx(def.x, def.z);
    this.floor = w.floorY[this.idx];
    this.axis = def.axis;
    this.lock = def.lock || null;
    this.locked = !!def.lock;
    this.isOpen = false;
    this.angle = 0;
    this.target = 0;
    this.collider = null;
    this.radius = 0.55;
    const c = new THREE.Vector3(def.x + 0.5, this.floor, def.z + 0.5);
    this.center = c;
    this.pos = new THREE.Vector3(c.x, this.floor + 1.1, c.z);
    this.pivot = new THREE.Group();
    if (this.axis === 'z') {
      this.pivot.position.set(def.x + 0.04, this.floor, c.z);
      this.baseYaw = 0;
    } else {
      this.pivot.position.set(c.x, this.floor, def.z + 0.04);
      this.baseYaw = -Math.PI / 2;
    }
    this.pivot.rotation.y = this.baseYaw;
    this.panel = new THREE.Group();
    this.pivot.add(this.panel);
    this.buildPanel(def.style);
    game.scene.add(this.pivot);
    this.buildFrame(batcher, def);
    this.applyWorld();
  }

  buildPanel(style) {
    const p = this.panel;
    const mat = style === 'security' ? MAT.steel : style === 'wood' ? MAT.darkWood : style === 'cell' ? MAT.metalWhite : MAT.doorPaint;
    box(p, mat, 0.92, 2.12, 0.05, 0.46, 1.06, 0);
    if (style === 'wood') {
      for (const yy of [0.55, 1.5]) {
        box(p, MAT.darkWood, 0.62, 0.7, 0.07, 0.46, yy, 0);
      }
      cyl(p, MAT.copper, 0.03, 0.12, 0.82, 1.0, 0, Math.PI / 2);
    } else if (style === 'cell') {
      box(p, MAT.black, 0.3, 0.08, 0.06, 0.46, 1.55, 0);
      box(p, MAT.steel, 0.36, 0.14, 0.07, 0.46, 1.42, 0);
      for (const yy of [0.4, 1.0, 1.8]) box(p, MAT.steel, 0.1, 0.06, 0.08, 0.06, yy, 0);
      box(p, MAT.steel, 0.06, 0.25, 0.08, 0.84, 1.0, 0);
    } else if (style === 'security') {
      box(p, MAT.rust, 0.85, 0.08, 0.07, 0.46, 1.0, 0);
      box(p, MAT.black, 0.22, 0.3, 0.065, 0.46, 1.6, 0);
      cyl(p, MAT.steel, 0.035, 0.1, 0.82, 1.0, 0, Math.PI / 2);
    } else {
      // Krankenhaustür mit Fenster
      const glass = new THREE.MeshStandardMaterial({ color: 0x0b0d0c, roughness: 0.08, metalness: 0.5 });
      box(p, glass, 0.26, 0.42, 0.06, 0.46, 1.55, 0);
      box(p, MAT.steel, 0.82, 0.2, 0.06, 0.46, 0.12, 0);
      box(p, MAT.steel, 0.1, 0.28, 0.065, 0.82, 1.05, 0);
    }
    p.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    mergeByMaterial(p);
  }

  buildFrame(batcher, def) {
    const g = new THREE.Group();
    const y = this.floor;
    const c = this.center;
    for (const s of [-1, 1]) {
      if (this.axis === 'z') {
        const zz = c.z + s * 0.5 + s * 0.02;
        box(g, MAT.frame, 0.08, 2.24, 0.04, def.x + 0.04, y + 1.12, zz);
        box(g, MAT.frame, 0.08, 2.24, 0.04, def.x + 0.96, y + 1.12, zz);
        box(g, MAT.frame, 1.08, 0.08, 0.04, c.x, y + 2.24, zz);
      } else {
        const xx = c.x + s * 0.5 + s * 0.02;
        box(g, MAT.frame, 0.04, 2.24, 0.08, xx, y + 1.12, def.z + 0.04);
        box(g, MAT.frame, 0.04, 2.24, 0.08, xx, y + 1.12, def.z + 0.96);
        box(g, MAT.frame, 0.04, 0.08, 1.08, xx, y + 2.24, c.z);
      }
    }
    batcher.add(g);
    // Türschild auf der Flurseite
    if (def.label) {
      const w = this.game.world;
      const sides = this.axis === 'z' ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]];
      let side = sides[0];
      for (const sd of sides) {
        const zn = w.zone[w.idx(def.x + sd[0], def.z + sd[1])];
        if (zn === 'corridor' || zn === 'lobby' || zn === 'basement') side = sd;
      }
      const s = sign(def.label, null, { w: 512, h: 128, bg: def.style === 'security' ? '#3a1a14' : '#1d2a24', size: 70 });
      const off = 0.52;
      if (this.axis === 'z') {
        s.position.set(c.x, y + 2.48, c.z + side[1] * off);
        s.rotation.y = side[1] > 0 ? 0 : Math.PI;
      } else {
        s.position.set(c.x + side[0] * off, y + 2.48, c.z);
        s.rotation.y = side[0] > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
      s.scale.set(0.56, 0.14, 1);
      this.game.scene.add(s);
    }
  }

  applyWorld() {
    const w = this.game.world;
    const closedish = Math.abs(this.angle) < 0.5;
    w.blocked[this.idx] = closedish ? 1 : 0;
    w.monsterBlock[this.idx] = this.locked ? 1 : 0;
  }


  openDirFrom(px, pz) {
    // Wähle die Schwenkrichtung weg vom Öffnenden
    const c = this.center;
    const vx = px - c.x;
    const vz = pz - c.z;
    const a = this.baseYaw + Math.PI / 2;
    const dx = Math.cos(a);
    const dz = -Math.sin(a);
    return dx * vx + dz * vz < 0 ? Math.PI / 2 : -Math.PI / 2;
  }

  open(px, pz, opts = {}) {
    if (this.isOpen) return;
    this.isOpen = true;
    this.target = this.openDirFrom(px, pz) * 0.97;
    this.fast = !!opts.fast;
    const a = this.game.audio;
    const p = { x: this.center.x, y: this.floor + 1.2, z: this.center.z };
    if (opts.fast) a.doorSlam(p);
    else a.doorOpen(p);
    if (opts.noise !== 0) this.game.noise(this.center.x, this.center.z, opts.noise ?? (opts.fast ? 12 : 5), 'door');
  }

  close() {
    if (!this.isOpen) return true;
    // Nicht schließen, wenn jemand im Türrahmen steht
    const P = this.game.player.pos;
    const m = this.game.monster && this.game.monster.pos;
    const inCell = (p, r) => p && p.x + r > this.cx && p.x - r < this.cx + 1 && p.z + r > this.cz && p.z - r < this.cz + 1;
    if (inCell(P, PLAYER.radius) || inCell(m, 0.36)) return false;
    this.isOpen = false;
    this.target = 0;
    this.removeCollider();
    this.game.audio.doorClose({ x: this.center.x, y: this.floor + 1.2, z: this.center.z });
    this.game.noise(this.center.x, this.center.z, 4.5, 'door');
    return true;
  }

  monsterOpen(fast) {
    this.open(this.game.monster.pos.x, this.game.monster.pos.z, { fast, noise: 0 });
  }

  removeCollider() {
    if (this.collider) {
      this.game.world.removeCollider(this.collider);
      this.collider = null;
    }
  }

  addCollider() {
    if (this.collider) return;
    const yaw = this.baseYaw + this.target;
    const dx = Math.cos(yaw);
    const dz = -Math.sin(yaw);
    const hx = this.pivot.position.x;
    const hz = this.pivot.position.z;
    const ex = hx + dx * 0.92;
    const ez = hz + dz * 0.92;
    const t = 0.04;
    this.collider = this.game.world.addCollider({
      minX: Math.min(hx, ex) - t,
      maxX: Math.max(hx, ex) + t,
      minZ: Math.min(hz, ez) - t,
      maxZ: Math.max(hz, ez) + t,
      noNav: true,
    });
  }

  update(dt) {
    const speed = this.fast ? 14 : 4.2;
    const prev = this.angle;
    this.angle = damp(this.angle, this.target, speed, dt);
    if (Math.abs(this.angle - this.target) < 0.002) this.angle = this.target;
    if (prev !== this.angle) {
      this.pivot.rotation.y = this.baseYaw + this.angle;
      this.applyWorld();
      if (this.isOpen && Math.abs(this.angle - this.target) < 0.08) this.addCollider();
    }
  }

  prompt() {
    const inv = this.game.state.inv;
    if (this.locked) {
      if (this.lock === 'sealed') return 'Die Tür ist von außen zugeschweißt.';
      if (this.lock === 'keypad') return '[E] Code eingeben';
      if (this.lock === 'staff_key') return inv.staffKey ? '[E] Aufschließen (Personalschlüssel)' : 'Verschlossen – Personalschlüssel benötigt';
      if (this.lock === 'basement_key') return inv.basementKey ? '[E] Aufschließen (Kellerschlüssel)' : 'Verschlossen – Kellerschlüssel benötigt';
      if (this.lock === 'secret') return null;
    }
    return this.isOpen ? '[E] Tür schließen' : '[E] Tür öffnen';
  }

  interact() {
    const g = this.game;
    const P = g.player;
    const inv = g.state.inv;
    const sound = { x: this.center.x, y: this.floor + 1.2, z: this.center.z };
    if (this.locked) {
      if (this.lock === 'keypad') {
        g.ui.openKeypad((code) => {
          if (code === g.state.code) {
            this.unlock();
            g.state.flags.orOpen = true;
            g.audio.beep('ok');
            this.open(P.pos.x, P.pos.z);
            g.checkpoint('OP geöffnet');
            g.updateObjective();
            return true;
          }
          g.audio.beep('error');
          return false;
        });
        return;
      }
      const has = (this.lock === 'staff_key' && inv.staffKey) || (this.lock === 'basement_key' && inv.basementKey);
      if (has) {
        this.unlock();
        g.audio.unlock(sound);
        g.ui.toast('Aufgeschlossen.');
        g.schedule(0.35, () => this.open(P.pos.x, P.pos.z));
        g.state.flags['unlocked_' + this.id] = true;
        if (this.id === 'basement') g.checkpoint('Kellertür');
        return;
      }
      g.audio.doorLocked(sound);
      g.noise(this.center.x, this.center.z, 3.5, 'door');
      if (this.lock === 'sealed') g.ui.toast('Jemand hat diese Tür zugeschweißt. Was ist da drin?');
      else g.ui.toast(this.prompt());
      return;
    }
    if (this.isOpen) {
      if (!this.close()) g.ui.toast('Etwas ist im Weg.');
    } else {
      const fast = P.sprinting;
      this.open(P.pos.x, P.pos.z, { fast, noise: P.crouched ? 2.5 : fast ? 11 : 5 });
    }
  }

  unlock() {
    this.locked = false;
    this.applyWorld();
  }

  serialize() {
    return { locked: this.locked, open: this.isOpen };
  }

  restore(s) {
    if (!s) return;
    this.locked = s.locked;
    this.removeCollider();
    this.isOpen = s.open;
    this.target = s.open ? (Math.PI / 2) * 0.97 : 0;
    this.angle = this.target;
    this.pivot.rotation.y = this.baseYaw + this.angle;
    if (this.isOpen) this.addCollider();
    this.applyWorld();
  }
}

// Bücherregal als Geheimtür
export class SecretShelf extends Door {
  buildPanel() {
    const shelf = bookshelfModel(0.46, 0, 0.0, Math.PI, { w: 0.92, seed: 33 });
    mergeByMaterial(shelf.group);
    this.panel.add(shelf.group);
    // Das rote Buch (zeigt zum Büro, -z)
    const book = box(this.panel, MAT.redPaint, 0.06, 0.32, 0.26, 0.6, 0.94 + 0.18, -0.1);
    this.book = book;
    this.panel.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  }
  buildFrame() {}
  prompt() {
    if (this.isOpen) return null;
    return this.game.state.flags.readDiary ? '[E] Das rote Buch „LETHE“ herausziehen' : '[E] Bücherregal untersuchen';
  }
  interact() {
    const g = this.game;
    if (this.isOpen) return;
    if (!g.state.flags.readDiary && !g.state.flags.shelfHint) {
      g.state.flags.shelfHint = true;
      g.ui.toast('Alte Akten und Bücher. Ein rotes Buch steht etwas hervor: „LETHE“.');
      return;
    }
    this.locked = false;
    g.audio.metalClank(this.center, 0.5);
    g.audio.creak(g.audio.now, g.audio.out({ pos: this.center, gain: 0.8, reverb: 0.5 }).input, 1.6, 0.5);
    this.book.position.z -= 0.08;
    this.isOpen = true;
    this.target = -(Math.PI / 2) * 0.95;
    this.fast = false;
    g.state.flags.shelfOpen = true;
    g.ui.toast('Das Regal schwingt zur Seite. Ein verborgener Raum …');
    g.audio.stinger('discover');
    g.updateObjective();
  }
  update(dt) {
    this.angle = damp(this.angle, this.target, 1.6, dt);
    this.pivot.rotation.y = this.baseYaw + this.angle;
    this.applyWorld();
  }
  restore(s) {
    if (!s) return;
    this.isOpen = s.open;
    this.locked = !s.open;
    this.target = s.open ? -(Math.PI / 2) * 0.95 : 0;
    this.angle = this.target;
    this.pivot.rotation.y = this.baseYaw + this.angle;
    this.applyWorld();
  }
}

// ---------------------------------------------------------------------------
const DIRV = [
  [0, 1],
  [-1, 0],
  [0, -1],
  [1, 0],
];

export class Locker {
  constructor(game, def, batcher, index) {
    this.game = game;
    this.kind = 'locker';
    this.id = 'locker' + index;
    const w = game.world;
    const [fx, fz] = DIRV[def.dir];
    this.facing = { x: fx, z: fz };
    const floor = w.floorY[w.idx(def.x, def.z)];
    this.isConfessional = def.type === 'confessional';
    const back = this.isConfessional ? 0.04 : 0.235;
    const cx = def.x + 0.5 - fx * back;
    const cz = def.z + 0.5 - fz * back;
    this.yaw = Math.atan2(fx, fz);
    const m = this.isConfessional ? confessionalModel(cx, floor, cz, this.yaw) : lockerModel(cx, floor, cz, this.yaw);
    this.model = m;
    // Korpus statisch, Tür dynamisch
    const doorPivot = m.pivot;
    m.group.remove(doorPivot);
    batcher.add(m.group);
    this.doorGroup = new THREE.Group();
    this.doorGroup.position.set(cx, floor, cz);
    this.doorGroup.rotation.y = this.yaw;
    this.doorGroup.add(doorPivot);
    game.scene.add(this.doorGroup);
    this.pivot = doorPivot;
    doorPivot.children.forEach((c) => c.isGroup && mergeByMaterial(c));
    this.collider = game.world.addCollider({ ...m.collider });
    const fo = this.isConfessional ? 0.42 : 0.2;
    this.pos = new THREE.Vector3(cx + fx * fo, floor + 1.1, cz + fz * fo);
    this.front = { x: cx + fx * (this.isConfessional ? 1.05 : 0.85), z: cz + fz * (this.isConfessional ? 1.05 : 0.85) };
    this.eyePos = new THREE.Vector3(cx - fx * 0.02, floor + (this.isConfessional ? 1.35 : 1.55), cz - fz * 0.02);
    this.radius = 0.45;
    this.doorAngle = 0;
    this.doorTarget = 0;
    this.forcedOpen = false;
    this.cam = { yaw: Math.atan2(-fx, -fz) };
  }

  get yawOut() {
    // Kamerablick nach außen: Player.yaw-Konvention (vorwärts = -sin(yaw), -cos(yaw))
    return Math.atan2(-this.facing.x, -this.facing.z);
  }

  prompt() {
    const P = this.game.player;
    const n = this.isConfessional ? 'Beichtstuhl' : 'Spind';
    if (P.hidden === this) return `[E] ${n} verlassen`;
    if (P.hidden) return null;
    return `[E] Im ${n} verstecken`;
  }

  interact() {
    const g = this.game;
    const P = g.player;
    if (P.hidden === this) return this.exit();
    if (P.hidden) return;
    // Hineingehen
    P.hidden = this;
    this.yaw = this.yawOut;
    this.enteredAt = g.monster ? g.monster.time : 0;
    P.yaw = this.yawOut;
    P.pitch = 0;
    P.vel.set(0, 0);
    if (P.flashOn) P.toggleFlash(false);
    this.doorTarget = -1.5;
    setTimeout(() => {
      if (P.hidden === this) this.doorTarget = 0;
    }, 380);
    g.audio.lockerOpen(this.pos);
    g.noise(this.pos.x, this.pos.z, P.crouched ? 4 : 6.5, 'locker');
    g.ui.setHiding(true);
  }

  exit() {
    const g = this.game;
    const P = g.player;
    P.hidden = null;
    P.pos.x = this.front.x;
    P.pos.z = this.front.z;
    P.yaw = this.yawOut;
    this.doorTarget = -1.5;
    setTimeout(() => (this.doorTarget = 0), 600);
    g.audio.lockerOpen(this.pos);
    g.noise(this.pos.x, this.pos.z, 5, 'locker');
    g.ui.setHiding(false);
  }

  forceOpen() {
    this.forcedOpen = true;
    this.doorTarget = -1.9;
    this.game.audio.metalClank(this.pos, 1.4);
  }

  close() {
    this.doorTarget = 0;
  }

  update(dt) {
    this.doorAngle = damp(this.doorAngle, this.doorTarget, this.forcedOpen ? 16 : 9, dt);
    if (this.isConfessional) {
      // Vorhang wird zur Seite gerafft
      const open = Math.min(1, Math.abs(this.doorAngle) / 1.5);
      this.pivot.scale.x = 1 - open * 0.82;
    } else this.pivot.rotation.y = this.doorAngle;
    // Türblatt ausblenden, solange man drinnen steckt (Sicht durch die Lüftungsschlitze per Overlay)
    const inside = this.game.player.hidden === this && Math.abs(this.doorAngle) < 0.3;
    this.pivot.visible = !inside;
  }
}

// ---------------------------------------------------------------------------
export function itemMesh(kind) {
  const g = new THREE.Group();
  const glow = emissiveMaterial(0xfff0c0, 0.0);
  g.userData.glow = glow;
  switch (kind) {
    case 'battery':
      cyl(g, MAT.yellow, 0.017, 0.06, 0, 0.0175, 0, 0, Math.PI / 2);
      cyl(g, MAT.copper, 0.008, 0.01, 0.034, 0.0175, 0, 0, Math.PI / 2);
      part(g, G.cyl, glow, 0, 0.0175, 0, 0.0172, 0.03, 0.0172, 0, 0, Math.PI / 2);
      break;
    case 'medkit':
      box(g, MAT.metalWhite, 0.24, 0.09, 0.17, 0, 0.045, 0);
      box(g, MAT.redPaint, 0.03, 0.002, 0.11, 0, 0.091, 0);
      box(g, MAT.redPaint, 0.11, 0.002, 0.03, 0, 0.091, 0);
      box(g, glow, 0.08, 0.002, 0.02, 0, 0.092, 0.07);
      break;
    case 'bottle':
      cyl(g, MAT.bottle, 0.035, 0.2, 0, 0.1, 0);
      cyl(g, MAT.bottle, 0.012, 0.08, 0, 0.24, 0);
      part(g, G.cyl, glow, 0, 0.2, 0, 0.013, 0.01, 0.013);
      break;
    case 'staff_key':
    case 'basement_key': {
      const brass = kind === 'staff_key' ? MAT.copper : MAT.steel;
      part(g, G.torus, brass, 0, 0.006, 0, 0.025, 0.025, 0.025, Math.PI / 2, 0, 0);
      box(g, brass, 0.09, 0.006, 0.01, 0.07, 0.006, 0);
      box(g, brass, 0.012, 0.006, 0.022, 0.105, 0.006, 0.01);
      box(g, MAT.paper, 0.05, 0.002, 0.03, -0.05, 0.004, 0.02);
      part(g, G.sphere, glow, 0, 0.01, 0, 0.012, 0.012, 0.012);
      break;
    }
    case 'fuse':
      cyl(g, MAT.porcelain, 0.018, 0.08, 0, 0.018, 0, 0, Math.PI / 2);
      for (const s of [-1, 1]) cyl(g, MAT.copper, 0.02, 0.012, s * 0.045, 0.018, 0, 0, Math.PI / 2);
      box(g, glow, 0.03, 0.004, 0.01, 0, 0.037, 0);
      break;
    case 'flashlight':
      cyl(g, MAT.rubber, 0.022, 0.2, 0, 0.022, 0, Math.PI / 2, 0);
      cyl(g, MAT.steel, 0.032, 0.05, 0, 0.026, 0.12, Math.PI / 2, 0);
      part(g, G.cyl, glow, 0, 0.026, 0.146, 0.028, 0.004, 0.028, Math.PI / 2, 0, 0);
      break;
    case 'ammo':
      box(g, MAT.copper, 0.1, 0.05, 0.07, 0, 0.025, 0);
      box(g, MAT.paper, 0.102, 0.03, 0.072, 0, 0.03, 0);
      for (let k = 0; k < 3; k++) cyl(g, MAT.gold, 0.006, 0.03, -0.03 + k * 0.03, 0.065, 0.02);
      box(g, glow, 0.04, 0.002, 0.01, 0, 0.051, -0.03);
      break;
    case 'note': {
      const m = new THREE.Mesh(G.plane, new THREE.MeshStandardMaterial({ map: DECAL.paper[1], roughness: 0.9, emissive: 0x332a18, emissiveIntensity: 0 }));
      m.rotation.x = -Math.PI / 2;
      m.scale.set(0.21, 0.28, 1);
      m.position.y = 0.004;
      m.receiveShadow = true;
      g.add(m);
      g.userData.glow = m.material;
      break;
    }
  }
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = false;
  });
  mergeByMaterial(g);
  return g;
}

const ITEM_NAMES = {
  battery: 'Batterie',
  medkit: 'Verbandskasten',
  bottle: 'Glasflasche',
  staff_key: 'Personalschlüssel',
  basement_key: 'Kellerschlüssel',
  fuse: 'Sicherung',
  flashlight: 'Taschenlampe',
  note: 'Dokument',
  ammo: 'Revolvermunition',
};

export class Pickup {
  constructor(game, def) {
    this.game = game;
    this.kind = 'pickup';
    this.id = def.id;
    this.item = def.item;
    this.note = def.note;
    this.def = def;
    this.mesh = itemMesh(def.item);
    this.mesh.position.set(def.x, def.y, def.z);
    this.mesh.rotation.y = def.ry || 0;
    game.scene.add(this.mesh);
    this.pos = new THREE.Vector3(def.x, def.y + 0.05, def.z);
    this.radius = def.item === 'note' ? 0.28 : 0.22;
    this.taken = false;
    this.hiddenUntil = def.hiddenUntil || null; // z.B. erst sichtbar, wenn Kühlfach offen
    this.t = Math.random() * 10;
  }

  available() {
    if (this.taken) return false;
    if (this.def.premiumOnly && !this.game.premium) return false;
    if (this.hiddenUntil && !this.hiddenUntil()) return false;
    return true;
  }

  prompt() {
    if (!this.available()) return null;
    if (this.item === 'note') return '[E] Lesen: ' + (this.game.noteTitle(this.note) || 'Dokument');
    return '[E] Aufheben: ' + ITEM_NAMES[this.item];
  }

  interact() {
    if (!this.available()) return;
    this.game.collect(this);
  }

  take() {
    this.taken = true;
    this.mesh.userData.hidden = true;
  }

  restore(taken) {
    this.taken = taken;
    this.mesh.userData.hidden = taken || (this.hiddenUntil ? !this.hiddenUntil() : false);
  }

  update(dt) {
    if (this.taken) return;
    this.t += dt;
    const glow = this.mesh.userData.glow;
    if (glow) {
      // Dezentes Schimmern, damit Gegenstände im Dunkeln auffindbar sind
      const cam = this.game.camera.position;
      const d = cam.distanceTo(this.pos);
      const k = clamp(1 - d / 7, 0, 1);
      glow.emissiveIntensity = (0.25 + 0.25 * Math.sin(this.t * 3)) * k * (this.item === 'note' ? 0.6 : 1.4);
    }
    if (this.hiddenUntil) this.mesh.userData.hidden = !this.hiddenUntil();
    if (this.def.premiumOnly) this.mesh.userData.hidden = !this.game.premium;
  }
}

// ---------------------------------------------------------------------------
export class FuseBox {
  constructor(game, x, y, z, ry) {
    this.game = game;
    this.kind = 'fusebox';
    this.id = 'fusebox';
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry;
    box(g, MAT.locker, 0.6, 0.8, 0.18, 0, 0, 0);
    box(g, MAT.black, 0.5, 0.68, 0.02, 0, 0, 0.09);
    const lid = box(g, MAT.locker, 0.6, 0.8, 0.02, -0.55, 0, 0.12, 0.3);
    lid.rotation.y = -1.9;
    lid.position.set(-0.5, 0, 0.2);
    this.slots = [];
    for (let k = 0; k < 3; k++) {
      const yy = 0.22 - k * 0.22;
      box(g, MAT.porcelain, 0.3, 0.12, 0.04, 0, yy, 0.1);
      const fuse = new THREE.Group();
      cyl(fuse, MAT.porcelain, 0.025, 0.12, 0, 0, 0, 0, Math.PI / 2);
      for (const s of [-1, 1]) cyl(fuse, MAT.copper, 0.028, 0.02, s * 0.065, 0, 0, 0, Math.PI / 2);
      fuse.position.set(0, yy, 0.14);
      fuse.visible = false;
      g.add(fuse);
      this.slots.push(fuse);
    }
    this.led = new THREE.Mesh(G.sphere, emissiveMaterial(0xff2010, 2));
    this.led.scale.setScalar(0.02);
    this.led.position.set(0.22, 0.33, 0.1);
    g.add(this.led);
    game.scene.add(g);
    this.group = g;
    this.pos = new THREE.Vector3(x, y, z);
    this.radius = 0.4;
  }
  sync() {
    const n = this.game.state.flags.fusesInserted || 0;
    this.slots.forEach((s, k) => (s.visible = k < n));
    this.led.material.emissive.setHex(n >= 3 ? 0x20ff40 : 0xff2010);
  }
  prompt() {
    const n = this.game.state.flags.fusesInserted || 0;
    if (n >= 3) return 'Alle Sicherungen sind eingesetzt.';
    if (this.game.state.inv.fuses > 0) return '[E] Sicherung einsetzen';
    return `Sicherungskasten (${n}/3) – es fehlen Sicherungen.`;
  }
  interact() {
    const g = this.game;
    const s = g.state;
    if (s.inv.fuses <= 0) {
      g.ui.toast(this.prompt());
      return;
    }
    s.flags.fusesInserted = (s.flags.fusesInserted || 0) + s.inv.fuses;
    s.inv.fuses = 0;
    g.audio.metalClank(this.pos, 0.5);
    this.sync();
    const n = s.flags.fusesInserted;
    g.ui.toast(n >= 3 ? 'Alle drei Sicherungen sitzen. Jetzt den Hebel ziehen.' : `Sicherung eingesetzt (${n}/3).`);
    g.updateObjective();
    g.ui.refreshInventory();
  }
}

export class Lever {
  constructor(game, x, y, z, ry, opts) {
    this.game = game;
    this.kind = 'lever';
    this.id = opts.id;
    this.opts = opts;
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry;
    box(g, MAT.locker, 0.3, 0.5, 0.12, 0, 0, 0);
    this.handle = new THREE.Group();
    this.handle.position.set(0, 0.1, 0.08);
    g.add(this.handle);
    box(this.handle, MAT.steel, 0.04, 0.04, 0.34, 0, 0, 0.17);
    const knob = box(this.handle, opts.red ? MAT.redPaint : MAT.rubber, 0.12, 0.06, 0.06, 0, 0, 0.34);
    void knob;
    this.handle.rotation.x = -0.6;
    game.scene.add(g);
    this.group = g;
    this.pos = new THREE.Vector3(x, y, z);
    this.radius = 0.35;
    this.pulled = false;
    this.anim = 0;
  }
  prompt() {
    if (this.pulled) return null;
    return this.opts.prompt(this.game);
  }
  interact() {
    if (this.pulled) return;
    if (this.opts.canPull(this.game)) {
      this.pulled = true;
      this.game.audio.metalClank(this.pos, 1);
      this.opts.onPull(this.game);
    } else this.opts.onFail(this.game);
  }
  setPulled(p) {
    this.pulled = p;
    this.anim = p ? 1 : 0;
    this.handle.rotation.x = p ? 0.9 : -0.6;
  }
  update(dt) {
    this.anim = damp(this.anim, this.pulled ? 1 : 0, 8, dt);
    this.handle.rotation.x = -0.6 + this.anim * 1.5;
  }
}

// Kühlfach in der Pathologie
export class Drawer {
  constructor(game, x, y, z, ry, opts) {
    this.game = game;
    this.kind = 'drawer';
    this.id = opts.id;
    this.opts = opts;
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry;
    this.slide = new THREE.Group();
    g.add(this.slide);
    box(this.slide, MAT.steel, 0.56, 0.5, 0.04, 0, 0, 0.0);
    cyl(this.slide, MAT.steel, 0.02, 0.3, 0, 0.12, 0.05, 0, Math.PI / 2);
    box(this.slide, MAT.steel, 0.5, 0.04, 1.6, 0, -0.18, -0.8);
    if (opts.body) {
      part(this.slide, G.sphere, MAT.rubber, 0, -0.08, -0.55, 0.18, 0.09, 0.5);
      part(this.slide, G.sphere, MAT.rubber, 0, -0.07, -0.02, 0.11, 0.08, 0.11);
    }
    game.scene.add(g);
    this.group = g;
    this.pos = new THREE.Vector3(x, y, z);
    this.radius = 0.32;
    this.isOpen = false;
    this.amt = 0;
    this.ry = ry;
  }
  contentPos() {
    const v = new THREE.Vector3(0, -0.15, -0.45);
    v.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.ry);
    return v.add(this.pos).add(new THREE.Vector3(Math.sin(this.ry) * 0.75, 0, Math.cos(this.ry) * 0.75));
  }
  prompt() {
    return this.isOpen ? null : '[E] Kühlfach öffnen';
  }
  interact() {
    if (this.isOpen) return;
    this.isOpen = true;
    this.game.audio.metalClank(this.pos, 0.8);
    this.game.audio.creak(this.game.audio.now, this.game.audio.out({ pos: this.pos, gain: 0.6 }).input, 0.7, 0.3);
    this.game.noise(this.pos.x, this.pos.z, 5, 'door');
    this.game.state.flags['drawer_' + this.id] = true;
    if (this.opts.onOpen) this.opts.onOpen(this.game);
  }
  restore(open) {
    this.isOpen = open;
    this.amt = open ? 1 : 0;
    this.slide.position.z = this.amt * 0.75;
  }
  update(dt) {
    this.amt = damp(this.amt, this.isOpen ? 1 : 0, 5, dt);
    this.slide.position.z = this.amt * 0.75;
  }
}

// Allgemeines Interaktionsobjekt
export class Interactable {
  constructor(game, opts) {
    this.game = game;
    this.kind = opts.kind || 'generic';
    this.id = opts.id;
    this.pos = new THREE.Vector3(opts.x, opts.y, opts.z);
    this.radius = opts.radius || 0.4;
    this._prompt = opts.prompt;
    this._interact = opts.interact;
  }
  prompt() {
    return this._prompt(this.game);
  }
  interact() {
    this._interact(this.game);
  }
}

// Lüftungsgitter an der Decke (wird vom Monster aufgestoßen)
export class VentHatch {
  constructor(game, v) {
    this.game = game;
    this.id = v.id;
    const w = game.world;
    const x = v.x + 0.5;
    const z = v.z + 0.5;
    const y = w.ceilAt(x, z) - 0.01;
    const g = new THREE.Group();
    g.position.set(x - 0.32, y, z);
    this.hinge = new THREE.Group();
    g.add(this.hinge);
    const mat = new THREE.MeshStandardMaterial({ map: DECAL.vent, roughness: 0.6, metalness: 0.5 });
    const grate = new THREE.Mesh(G.plane, mat);
    grate.rotation.x = Math.PI / 2;
    grate.scale.set(0.64, 0.64, 1);
    grate.position.set(0.32, 0, 0);
    this.hinge.add(grate);
    const dark = new THREE.Mesh(G.plane, MAT.black);
    dark.rotation.x = Math.PI / 2;
    dark.scale.set(0.62, 0.62, 1);
    dark.position.set(x, y + 0.005, z);
    game.scene.add(dark);
    game.scene.add(g);
    this.open = 0;
    this.target = 0;
    this.timer = 0;
  }
  trigger() {
    this.target = 1;
    this.timer = 6;
  }
  update(dt) {
    if (this.timer > 0) {
      this.timer -= dt;
      if (this.timer <= 0) this.target = 0;
    }
    this.open = damp(this.open, this.target, this.target ? 12 : 2, dt);
    this.hinge.rotation.z = -this.open * 1.9;
  }
}

// Geworfene Flasche
export class Projectile {
  constructor(game, pos, vel) {
    this.game = game;
    this.mesh = itemMesh('bottle');
    this.mesh.position.copy(pos);
    game.scene.add(this.mesh);
    this.pos = pos.clone();
    this.vel = vel.clone();
    this.alive = true;
    this.spin = new THREE.Vector3(rand(-10, 10), rand(-6, 6), rand(-10, 10));
  }
  update(dt) {
    if (!this.alive) return;
    const w = this.game.world;
    this.vel.y -= 9.8 * dt;
    const nx = this.pos.x + this.vel.x * dt;
    const nz = this.pos.z + this.vel.z * dt;
    let ny = this.pos.y + this.vel.y * dt;
    let shatter = false;
    if (w.isOpaque(Math.floor(nx), Math.floor(nz))) shatter = true;
    const floor = w.floorAt(nx, nz);
    if (ny <= floor + 0.03) shatter = true;
    if (ny >= w.ceilAt(nx, nz) - 0.05) {
      this.vel.y = -Math.abs(this.vel.y) * 0.3;
      ny = w.ceilAt(nx, nz) - 0.06;
    }
    if (shatter) {
      this.alive = false;
      this.game.scene.remove(this.mesh);
      const p = { x: this.pos.x, y: Math.max(this.pos.y, floor + 0.05), z: this.pos.z };
      this.game.audio.glass(p);
      this.game.noise(p.x, p.z, 15, 'bottle');
      this.game.spawnShards(p);
      return;
    }
    this.pos.set(nx, ny, nz);
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.x += this.spin.x * dt;
    this.mesh.rotation.y += this.spin.y * dt;
    this.mesh.rotation.z += this.spin.z * dt;
  }
}

export { ITEM_NAMES };
void TMP;
