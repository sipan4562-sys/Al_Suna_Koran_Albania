// Monster-KI: Wahrnehmung (Sicht + Gehör), Zustandsautomat, Navigation inkl.
// Türen und Lüftungsschächten, Suche nach verlorenem Spieler, Spind-Kontrolle,
// und ein „Director“, der das Tempo der Bedrohung steuert (ohne zu teleportieren).
import * as THREE from 'three';
import { MonsterModel } from './model.js';
import { MonsterVoice } from '../audio.js';
import { MONSTER, PLAYER } from '../config.js';
import { clamp, angleDiff, dampAngle, rand, damp, pick } from '../utils.js';
import { POIS } from '../level/layout.js';

export class Monster {
  constructor(game) {
    this.game = game;
    this.world = game.world;
    this.nav = game.nav;
    this.model = new MonsterModel();
    game.scene.add(this.model.root);
    this.pos = new THREE.Vector3();
    this.heading = 0;
    this.state = 'dormant';
    this.stateTime = 0;
    this.path = null;
    this.pathIdx = 0;
    this.goal = null;
    this.repath = 0;
    this.awareness = 0;
    this.seeing = false;
    this.lastSeen = new THREE.Vector3();
    this.lastSeenVel = new THREE.Vector2();
    this.lastSeenTime = -100;
    this.investigatePt = null;
    this.searchPts = [];
    this.pause = 0;
    this.cooldown = 0;
    this.sinceEncounter = 0;
    this.attackT = 0;
    this.hitDone = false;
    this.vent = null;
    this.doorWait = 0;
    this.stuck = 0;
    this.lastPos = new THREE.Vector3();
    this.curSpeed = 0;
    this.lockerTarget = null;
    this.lockerSuspect = null;
    this.chaseTime = 0;
    this.lastScream = -100;
    this.growlTimer = 6;
    this.perceptionScale = 1;
    this.rage = 0; // steigt nach Strom/Alarm
    this.voice = new MonsterVoice(game.audio);
    this.model.stepCallback = (i, sp) => {
      if (this.state === 'inVent') return;
      game.audio.monsterStep({ x: this.pos.x, y: this.pos.y + 0.2, z: this.pos.z }, 0.6 + sp * 0.7);
      if (this.state === 'chase' && this.near()) game.player.trauma = Math.min(0.5, game.player.trauma + 0.12);
    };
    this.time = 0;
    this.avoid = new Map(); // Zellindex -> Ablaufzeit (nach Festfahren gemieden)
    this.debug = { lastNoise: null };
  }

  near() {
    const p = this.game.player.pos;
    return Math.hypot(p.x - this.pos.x, p.z - this.pos.z) < 7;
  }

  place(x, z, heading = 0) {
    this.pos.set(x, this.world.floorAt(x, z), z);
    this.heading = heading;
    this.model.root.position.copy(this.pos);
    this.model.root.rotation.y = heading;
    this.lastPos.copy(this.pos);
    this.path = null;
    this.vent = null;
    this.model.root.visible = true;
  }

  setState(s) {
    if (this.state === s) return;
    this.prevState = this.state;
    this.state = s;
    this.stateTime = 0;
    this.path = null;
    this.pause = 0;
  }

  awaken(opts = {}) {
    if (this.state !== 'dormant') return;
    this.setState('patrol');
    this.sinceEncounter = opts.sinceEncounter ?? 80;
    this.perceptionScale = opts.gentle ? 0.6 : 1;
    this.gentleTimer = opts.gentle ? 45 : 0;
  }

  // ------------------------------------------------------------ Wahrnehmung
  perceive(dt) {
    const g = this.game;
    const P = g.player;
    this.seeing = false;
    if (P.dead || this.state === 'inVent' || this.state === 'dormant' || this.state === 'ventEnter') return;
    const dx = P.pos.x - this.pos.x;
    const dz = P.pos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    if (Math.abs(P.pos.y - this.pos.y) > 2.6) {
      this.awareness = Math.max(0, this.awareness - dt * 0.3);
      return;
    }
    let can = false;
    let strength = 0;
    if (!P.hidden && dist < 30) {
      const fx = Math.sin(this.heading);
      const fz = Math.cos(this.heading);
      const cos = (fx * dx + fz * dz) / (dist || 1);
      const inFov = cos > Math.cos(MONSTER.fov / 2) || dist < 2.2;
      if (inFov && this.world.lineOfSight(this.pos.x, this.pos.z, P.pos.x, P.pos.z)) {
        let vis = 1;
        if (P.flashOn) {
          vis *= 1.55;
          const fd = P.flashDir;
          const dot = -(fd.x * dx + fd.z * dz) / (dist || 1);
          if (dot > 0.85) vis *= 1.3;
        } else vis *= 0.72;
        if (P.crouched) vis *= 0.55;
        if (P.moving) vis *= 1.15;
        const lit = g.lights ? g.litAt(P.pos.x, P.pos.z) : 0;
        vis *= 1 + lit * 0.5;
        let range = clamp(MONSTER.sight * vis * this.perceptionScale * (1 + this.rage * 0.2), 3, 26);
        if (this.state === 'chase') range = Math.max(range, 18);
        if (dist < range) {
          can = true;
          strength = 1 - dist / range;
        }
      }
    }
    this.seeing = can;
    if (can) {
      let rate = 0.55 + 2.8 * strength;
      if (this.state === 'investigate' || this.state === 'search' || this.state === 'alert') rate *= 1.9;
      if (this.state === 'chase' || this.state === 'recover' || this.state === 'attack') rate = 20;
      if (dist < 3) rate = 20;
      this.awareness = Math.min(1.2, this.awareness + rate * dt);
      this.glimpse = { x: P.pos.x, z: P.pos.z };
      if (this.awareness >= 1) {
        this.lastSeen.copy(P.pos);
        this.lastSeenVel.copy(P.vel);
        this.lastSeenTime = this.time;
      }
    } else {
      this.awareness = Math.max(0, this.awareness - dt * (this.state === 'chase' ? 0.12 : 0.22));
    }
  }

  // Geräusch-Ereignis (Schritte, Türen, Flaschen, Spinde …)
  hear(x, z, radius, type) {
    if (this.state === 'dormant' || this.game.player.dead) return;
    const dx = x - this.pos.x;
    const dz = z - this.pos.z;
    const d = Math.hypot(dx, dz);
    const fy = this.world.floorAt(x, z);
    let eff = radius * (1 + this.rage * 0.25);
    if (Math.abs(fy - this.pos.y) > 2.5) eff *= 0.35;
    if (d > eff) return;
    const occluded = !this.world.lineOfSight(this.pos.x, this.pos.z, x, z);
    if (occluded) eff *= 0.6;
    if (d > eff) return;
    this.debug.lastNoise = { x, z, radius, type, t: this.time };
    if (this.state === 'chase' || this.state === 'attack' || this.state === 'recover') {
      if (!this.seeing) {
        this.lastSeen.set(x, fy, z);
        this.lastSeenTime = this.time;
      }
      return;
    }
    if (this.state === 'checkLocker' || this.state === 'openLocker') return;
    const err = Math.min(2.5, d * 0.12);
    const tx = x + rand(-err, err);
    const tz = z + rand(-err, err);
    // Lautere / nähere Geräusche haben Vorrang
    const prio = radius / Math.max(1, d);
    if (this.state === 'investigate' && this.investigatePt && prio < (this.investigatePt.prio || 0) * 0.7) return;
    this.investigatePt = { x: tx, z: tz, prio, urgent: radius > 9 && d < 14, type };
    if (type === 'locker' && d < 9) this.lockerSuspect = this.game.nearestLocker(x, z);
    else if (type !== 'locker') this.lockerSuspect = null;
    if (this.state === 'inVent' || this.state === 'ventEnter' || this.state === 'ventExit') {
      this.pendingInvestigate = true;
      return;
    }
    this.setState('investigate');
    if (Math.random() < 0.5) this.game.audio.monsterGrowl(this.headPos(), 0.6);
  }

  headPos() {
    return { x: this.pos.x, y: this.pos.y + 1.9, z: this.pos.z };
  }

  // ------------------------------------------------------------ Navigation
  goTo(x, z, opts = {}) {
    if (this.avoid.size) {
      const W = this.world.W;
      for (const [k, t] of this.avoid) if (t < this.time) this.avoid.delete(k);
      opts = { ...opts, avoid: (cx, cz) => (this.avoid.has(cz * W + cx) ? 12 : 0) };
    }
    const path = this.nav.findPath(this.pos.x, this.pos.z, x, z, opts);
    this.path = path;
    this.pathIdx = path && path.length > 1 ? 1 : 0;
    this.goal = { x, z };
    return !!path;
  }

  arrived() {
    return !this.path || this.pathIdx >= this.path.length;
  }

  follow(speed, dt) {
    if (!this.path || this.pathIdx >= this.path.length) {
      this.curSpeed = damp(this.curSpeed, 0, 8, dt);
      return true;
    }
    const wp = this.path[this.pathIdx];
    const dx = wp.x - this.pos.x;
    const dz = wp.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (wp.ventFrom && d < 0.5) {
      const next = this.path[this.pathIdx + 1];
      if (next && next.ventTo) {
        this.startVent(wp.ventFrom, next.ventTo);
        this.pathIdx += 2;
        return false;
      }
    }
    const last = this.pathIdx === this.path.length - 1;
    if (d < (last ? 0.35 : 0.5)) {
      this.pathIdx++;
      return this.pathIdx >= this.path.length;
    }
    // Tür im Weg?
    if (this.doorWait > 0) {
      this.doorWait -= dt;
      this.curSpeed = damp(this.curSpeed, 0, 10, dt);
      this.model.set({ push: 1 });
      return false;
    }
    this.model.set({ push: 0 });
    const ax = this.pos.x + (dx / d) * 0.75;
    const az = this.pos.z + (dz / d) * 0.75;
    const door = this.game.doorAtCell(Math.floor(ax), Math.floor(az));
    if (door && !door.isOpen && !door.locked) {
      door.monsterOpen(this.state === 'chase');
      this.doorWait = this.state === 'chase' ? 0.25 : 0.55;
      return false;
    }
    const want = Math.atan2(dx, dz);
    this.heading = dampAngle(this.heading, want, this.state === 'chase' ? 9 : 5, dt);
    const turn = Math.abs(angleDiff(this.heading, want));
    const k = clamp(1.15 - turn / 1.4, 0.2, 1);
    this.curSpeed = damp(this.curSpeed, speed * k, 4, dt);
    const step = Math.min(this.curSpeed * dt, d);
    this.world.moveCircle(this.pos, (dx / d) * step, (dz / d) * step, MONSTER.radius, 1.5);
    this.pos.y = damp(this.pos.y, this.world.floorAt(this.pos.x, this.pos.z), 14, dt);
    return false;
  }

  checkStuck(dt) {
    const moved = this.pos.distanceTo(this.lastPos);
    this.lastPos.copy(this.pos);
    if (this.path && this.pathIdx < this.path.length && this.doorWait <= 0 && this.curSpeed > 0.3 && moved < this.curSpeed * dt * 0.15) {
      this.stuck += dt;
    } else this.stuck = Math.max(0, this.stuck - dt * 2);
    if (this.stuck > 1.2) {
      this.stuck = 0;
      // Zelle vor dem Monster vorübergehend meiden und neu planen
      const wp = this.path && this.path[this.pathIdx];
      if (wp) {
        const dx = wp.x - this.pos.x;
        const dz = wp.z - this.pos.z;
        const d = Math.hypot(dx, dz) || 1;
        const ax = Math.floor(this.pos.x + (dx / d) * 0.7);
        const az = Math.floor(this.pos.z + (dz / d) * 0.7);
        this.avoid.set(this.world.idx(ax, az), this.time + 20);
      }
      if (this.goal) this.goTo(this.goal.x, this.goal.z);
      if (!this.path) this.path = null;
      return true;
    }
    return false;
  }

  // ------------------------------------------------------------ Lüftung
  startVent(from, to) {
    this.vent = { from, to, t: 0, dur: Math.hypot(from.x - to.x, from.z - to.z) * 0.22 + 2.5, nextSound: 0 };
    this.setStateKeepPath('ventEnter');
    this.game.openVent(from.id);
    this.game.audio.ventHatch({ x: from.x + 0.5, y: this.world.ceilAt(from.x + 0.5, from.z + 0.5), z: from.z + 0.5 });
  }

  setStateKeepPath(s) {
    const p = this.path;
    const i = this.pathIdx;
    const g = this.goal;
    const prev = this.state;
    this.setState(s);
    this.ventResume = prev;
    this.path = p;
    this.pathIdx = i;
    this.goal = g;
  }

  updateVent(dt) {
    const v = this.vent;
    if (!v) {
      this.model.root.visible = true;
      this.setState('patrol');
      return;
    }
    if (this.state === 'ventEnter') {
      this.model.set({ crouch: this.stateTime < 0.35 ? 1 : 0, reach: 1, spread: 0 });
      const cx = v.from.x + 0.5;
      const cz = v.from.z + 0.5;
      this.pos.x = damp(this.pos.x, cx, 8, dt);
      this.pos.z = damp(this.pos.z, cz, 8, dt);
      if (this.stateTime > 0.35) this.model.root.position.y = this.pos.y + (this.stateTime - 0.35) * 6;
      if (this.stateTime > 0.75) {
        this.model.root.visible = false;
        const resume = this.ventResume;
        this.setStateKeepPath('inVent');
        this.ventResume = resume;
      }
      return;
    }
    if (this.state === 'inVent') {
      v.t += dt;
      const k = clamp(v.t / v.dur, 0, 1);
      const x = v.from.x + 0.5 + (v.to.x - v.from.x) * k;
      const z = v.from.z + 0.5 + (v.to.z - v.from.z) * k;
      v.nextSound -= dt;
      if (v.nextSound <= 0) {
        v.nextSound = rand(0.7, 1.4);
        const y = Math.max(this.world.ceilAt(x, z), this.world.ceilAt(v.from.x, v.from.z)) + 0.3;
        this.game.audio.ventCrawl({ x, y, z });
      }
      this.pos.x = x;
      this.pos.z = z;
      if (v.t >= v.dur) {
        this.place(v.to.x + 0.5, v.to.z + 0.5, this.heading);
        this.vent = v; // place() setzt den Schachtzustand zurück
        this.model.root.position.y = this.world.ceilAt(this.pos.x, this.pos.z) - 2.0;
        this.game.openVent(v.to.id);
        this.game.audio.ventHatch({ x: v.to.x + 0.5, y: this.world.ceilAt(v.to.x + 0.5, v.to.z + 0.5), z: v.to.z + 0.5 });
        const resume = this.ventResume;
        this.setStateKeepPath('ventExit');
        this.ventResume = resume;
        this.model.root.visible = true;
      }
      return;
    }
    if (this.state === 'ventExit') {
      const ceil = this.world.ceilAt(this.pos.x, this.pos.z);
      const k = clamp(this.stateTime / 0.35, 0, 1);
      this.model.root.position.y = this.pos.y + (1 - k * k) * Math.max(0, ceil - this.pos.y - 2.0);
      this.model.set({ crouch: this.stateTime < 0.8 ? 1 : 0, reach: 0.3 });
      if (this.stateTime > 0.35 && !v.landed) {
        v.landed = true;
        this.game.audio.monsterStep({ x: this.pos.x, y: this.pos.y, z: this.pos.z }, 1.6);
        this.game.noiseVisual && this.game.noiseVisual();
      }
      if (this.stateTime > 1.0) {
        const resume = this.ventResume || 'patrol';
        const p = this.path;
        const i = this.pathIdx;
        const g = this.goal;
        this.vent = null;
        this.setState(this.pendingInvestigate ? 'investigate' : resume);
        this.pendingInvestigate = false;
        if (this.state !== 'investigate') {
          this.path = p;
          this.pathIdx = i;
          this.goal = g;
        }
      }
    }
  }

  // ------------------------------------------------------------ Director
  choosePatrolTarget() {
    const P = this.game.player.pos;
    const cands = [];
    let total = 0;
    for (const [x, z] of POIS) {
      const px = x + 0.5;
      const pz = z + 0.5;
      const dm = Math.hypot(px - this.pos.x, pz - this.pos.z);
      if (dm < 5) continue;
      if (!this.world.monsterPassable(x, z)) continue;
      const dp = Math.hypot(px - P.x, pz - P.z);
      let w = 1;
      if (this.sinceEncounter > 45) w += 5 * Math.exp(-dp / 11);
      if (this.sinceEncounter > 90) w += 8 * Math.exp(-dp / 8);
      if (this.cooldown > 0) w *= dp > 16 ? 2.5 : 0.15;
      const sameFloor = Math.abs(this.world.floorAt(px, pz) - P.y) < 2;
      if (sameFloor) w *= 1.6;
      if (dp < 3.5) w *= 0.25; // nicht direkt auf den Spieler zulaufen
      cands.push([px, pz, w]);
      total += w;
    }
    let r = Math.random() * total;
    for (const c of cands) {
      r -= c[2];
      if (r <= 0) return c;
    }
    return cands[0];
  }

  makeSearchPoints(cx, cz, dirX, dirZ) {
    const pts = [];
    const w = this.world;
    for (let tries = 0; tries < 60 && pts.length < 4; tries++) {
      const a = Math.random() * Math.PI * 2;
      const r = rand(2, 9);
      let x = cx + Math.cos(a) * r;
      let z = cz + Math.sin(a) * r;
      const along = (Math.cos(a) * dirX + Math.sin(a) * dirZ) / (Math.hypot(dirX, dirZ) || 1);
      if (along < -0.3 && Math.random() < 0.6) continue;
      const fx = Math.floor(x);
      const fz = Math.floor(z);
      if (!w.monsterPassable(fx, fz)) continue;
      if (Math.abs(w.floorAt(x, z) - w.floorAt(cx, cz)) > 2) continue;
      if (pts.some((p) => Math.hypot(p.x - x, p.z - z) < 2.5)) continue;
      pts.push({ x: fx + 0.5, z: fz + 0.5 });
    }
    return pts;
  }

  startChase() {
    const g = this.game;
    const wasChasing = this.state === 'chase';
    this.setState('chase');
    this.chaseTime = 0;
    this.sinceEncounter = 0;
    if (!wasChasing && this.time - this.lastScream > 12) {
      this.lastScream = this.time;
      g.audio.monsterScream(this.headPos());
      g.audio.stinger('spot');
      this.screamT = 0.9;
    }
    g.onChaseStart && g.onChaseStart();
  }

  // ------------------------------------------------------------ Hauptupdate
  update(dt) {
    this.time += dt;
    this.stateTime += dt;
    const g = this.game;
    const P = g.player;
    if (this.state === 'dormant') {
      this.model.set({ lean: 0.9, crouch: 0.6, scan: 0, jaw: 0.02, reach: 0 });
      this.model.update(dt, 0);
      this.syncModel(dt);
      this.voice.update(this.headPos(), 0, false, 1);
      return;
    }
    if (this.gentleTimer > 0) {
      this.gentleTimer -= dt;
      if (this.gentleTimer <= 0) this.perceptionScale = 1;
    }
    this.sinceEncounter += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.perceive(dt);
    const dist = Math.hypot(P.pos.x - this.pos.x, P.pos.z - this.pos.z);

    // Übergänge durch Sicht
    if (this.awareness >= 1 && this.seeing && !['chase', 'attack', 'recover', 'checkLocker', 'openLocker', 'scripted'].includes(this.state) && !this.vent) {
      this.startChase();
    } else if (this.seeing && this.awareness > 0.3 && ['patrol', 'investigate', 'search'].includes(this.state)) {
      this.setState('alert');
    }

    let speed = 0;
    const anim = { lean: 0.45, reach: 0, jaw: 0.06, scan: 0, scream: 0, attack: 0, crouch: 0, spread: 0 };
    switch (this.state) {
      case 'patrol': {
        if (this.pause > 0) {
          this.pause -= dt;
          anim.scan = 1;
          speed = 0;
          this.follow(0, dt);
          break;
        }
        if (this.arrived()) {
          if (this.goal && Math.random() < 0.65 && this.stateTime > 1) {
            this.pause = rand(1.5, 4);
            this.goal = null;
            break;
          }
          const t = this.choosePatrolTarget();
          if (t) this.goTo(t[0], t[1]);
        }
        speed = MONSTER.patrolSpeed * (1 + this.rage * 0.25);
        this.follow(speed, dt);
        this.growlTimer -= dt;
        if (this.growlTimer <= 0) {
          this.growlTimer = rand(9, 18);
          g.audio.monsterGrowl(this.headPos(), 0.7);
        }
        break;
      }
      case 'alert': {
        // Hat etwas bemerkt: bleibt stehen, starrt, schleicht näher
        const gl = this.glimpse || this.lastSeen;
        const want = Math.atan2(gl.x - this.pos.x, gl.z - this.pos.z);
        this.heading = dampAngle(this.heading, want, 4, dt);
        anim.lean = 0.3;
        anim.jaw = 0.25;
        if (this.stateTime > 0.8) {
          if (!this.path || this.repath <= 0) {
            this.goTo(gl.x, gl.z);
            this.repath = 0.8;
          }
          this.repath -= dt;
          speed = 0.9;
          this.follow(speed, dt);
        }
        if (this.stateTime < 0.1) g.audio.monsterGrowl(this.headPos(), 0.9);
        if (!this.seeing && this.awareness < 0.15) {
          this.investigatePt = { x: gl.x, z: gl.z, prio: 1 };
          this.setState('investigate');
        }
        break;
      }
      case 'investigate': {
        const ip = this.investigatePt;
        if (!ip) {
          this.setState('patrol');
          break;
        }
        if (!this.path && this.stateTime < 0.2) {
          if (!this.goTo(ip.x, ip.z)) {
            this.setState('patrol');
            break;
          }
        }
        anim.lean = 0.55;
        anim.scan = 0.2;
        if (!this.arrived()) {
          speed = ip.urgent ? MONSTER.investigateSpeed * 1.35 : MONSTER.investigateSpeed;
          speed *= 1 + this.rage * 0.2;
          this.follow(speed, dt);
        } else {
          // Am Geräuschort: umsehen
          anim.scan = 1;
          this.pause += dt;
          if (this.lockerSuspect) {
            this.lockerTarget = this.lockerSuspect;
            this.lockerSuspect = null;
            this.setState('checkLocker');
            break;
          }
          if (this.pause > rand(2.2, 3.5)) {
            this.searchPts = this.makeSearchPoints(ip.x, ip.z, 0, 0).slice(0, 2);
            this.searchTotal = 0;
            this.investigatePt = null;
            this.setState('search');
          }
        }
        break;
      }
      case 'chase': {
        this.chaseTime += dt;
        if (this.screamT > 0) {
          this.screamT -= dt;
          anim.scream = 1;
          const want = Math.atan2(P.pos.x - this.pos.x, P.pos.z - this.pos.z);
          this.heading = dampAngle(this.heading, want, 6, dt);
          this.follow(0, dt);
          break;
        }
        anim.lean = 0.72;
        anim.reach = 0.55;
        anim.jaw = 0.4;
        speed = Math.min(MONSTER.chaseSpeedMax, MONSTER.chaseSpeed + this.chaseTime * 0.12) * (1 + this.rage * 0.08);
        const since = this.time - this.lastSeenTime;
        let tx;
        let tz;
        if (this.seeing) {
          tx = P.pos.x;
          tz = P.pos.z;
        } else {
          const k = Math.min(since, 1.4);
          tx = this.lastSeen.x + this.lastSeenVel.x * k;
          tz = this.lastSeen.z + this.lastSeenVel.y * k;
          if (!this.world.monsterPassable(Math.floor(tx), Math.floor(tz))) {
            tx = this.lastSeen.x;
            tz = this.lastSeen.z;
          }
        }
        // Spieler versteckt sich vor den Augen des Monsters?
        if (P.hidden && since < 0.8 && P.hidden.enteredAt && this.time - P.hidden.enteredAt < 1.2) {
          this.lockerTarget = P.hidden;
          this.setState('checkLocker');
          break;
        }
        const direct = this.seeing && dist < 7 && this.nav.clear(this.pos, P.pos, 0.3);
        if (direct) {
          this.path = [{ x: tx, z: tz }];
          this.pathIdx = 0;
        } else {
          this.repath -= dt;
          if (this.repath <= 0 || !this.path) {
            this.repath = 0.3;
            this.goTo(tx, tz);
          }
        }
        this.follow(speed, dt);
        if (this.seeing && dist < MONSTER.attackRange && !P.hidden) {
          this.setState('attack');
          this.attackT = 0;
          this.hitDone = false;
          g.audio.monsterAttack(this.headPos());
          break;
        }
        if (!this.seeing && since > 2.5 && (this.arrived() || since > 7)) {
          this.awareness = 0.5;
          const c = { x: this.lastSeen.x + this.lastSeenVel.x * 1.2, z: this.lastSeen.z + this.lastSeenVel.y * 1.2 };
          this.searchPts = this.makeSearchPoints(c.x, c.z, this.lastSeenVel.x, this.lastSeenVel.y);
          this.searchPts.unshift({ x: c.x, z: c.z });
          this.searchTotal = 0;
          this.setState('search');
          g.audio.monsterGrowl(this.headPos(), 1);
        }
        break;
      }
      case 'attack': {
        this.attackT += dt;
        const want = Math.atan2(P.pos.x - this.pos.x, P.pos.z - this.pos.z);
        this.heading = dampAngle(this.heading, want, 10, dt);
        anim.attack = this.attackT < 0.3 ? 0.35 : 1;
        anim.jaw = 0.9;
        anim.lean = 0.6;
        this.curSpeed = damp(this.curSpeed, 1.2, 6, dt);
        if (this.attackT < 0.45 && dist > 0.9) {
          const d = dist || 1;
          this.world.moveCircle(this.pos, ((P.pos.x - this.pos.x) / d) * 2.2 * dt, ((P.pos.z - this.pos.z) / d) * 2.2 * dt, MONSTER.radius, 1.5);
        }
        if (this.attackT >= 0.42 && !this.hitDone) {
          this.hitDone = true;
          const fx = Math.sin(this.heading);
          const fz = Math.cos(this.heading);
          const cos = (fx * (P.pos.x - this.pos.x) + fz * (P.pos.z - this.pos.z)) / (dist || 1);
          if (dist < MONSTER.hitRange && cos > 0.2 && !P.hidden) {
            P.damage(MONSTER.damage * (1 + this.rage * 0.1), this.pos);
            if (P.dead) {
              g.onPlayerKilled('attack');
              this.setState('feeding');
              break;
            }
          }
        }
        if (this.attackT > 1.05) {
          this.setState('recover');
        }
        break;
      }
      case 'recover': {
        anim.scream = this.stateTime < 1.0 ? 0.8 : 0;
        anim.lean = 0.3;
        if (this.stateTime < 0.05) g.audio.monsterGrowl(this.headPos(), 1.2);
        if (this.stateTime > 1.5) {
          if (this.seeing) {
            this.setState('chase');
            this.chaseTime = 1;
          } else {
            this.searchPts = this.makeSearchPoints(this.lastSeen.x, this.lastSeen.z, this.lastSeenVel.x, this.lastSeenVel.y);
            this.searchPts.unshift({ x: this.lastSeen.x, z: this.lastSeen.z });
            this.searchTotal = 0;
            this.setState('search');
          }
        }
        break;
      }
      case 'search': {
        this.searchTotal = (this.searchTotal || 0) + dt;
        anim.lean = 0.5;
        if (this.pause > 0) {
          this.pause -= dt;
          anim.scan = 1;
          this.follow(0, dt);
          if (this.pause <= 0) this.path = null;
          break;
        }
        if (!this.path) {
          const nxt = this.searchPts.shift();
          if (!nxt || this.searchTotal > 30) {
            this.cooldown = 28;
            this.awareness = 0;
            this.setState('patrol');
            break;
          }
          if (!this.goTo(nxt.x, nxt.z)) break;
        }
        speed = MONSTER.searchSpeed * (1 + this.rage * 0.2);
        if (this.follow(speed, dt)) this.pause = rand(1.4, 3);
        this.growlTimer -= dt;
        if (this.growlTimer <= 0) {
          this.growlTimer = rand(4, 8);
          g.audio.monsterGrowl(this.headPos(), 0.8);
        }
        break;
      }
      case 'checkLocker': {
        const L = this.lockerTarget;
        if (!L) {
          this.setState('search');
          break;
        }
        if (!this.path && this.stateTime < 0.1) this.goTo(L.front.x, L.front.z);
        anim.lean = 0.6;
        anim.reach = 0.3;
        if (this.follow(MONSTER.investigateSpeed * 1.2, dt) || Math.hypot(L.front.x - this.pos.x, L.front.z - this.pos.z) < 0.45) {
          this.setState('openLocker');
          this.lockerTarget = L;
        }
        if (this.stateTime > 12) this.setState('search');
        break;
      }
      case 'openLocker': {
        const L = this.lockerTarget;
        const want = Math.atan2(L.pos.x - this.pos.x, L.pos.z - this.pos.z);
        this.heading = dampAngle(this.heading, want, 8, dt);
        anim.reach = 1;
        anim.lean = 0.5;
        anim.jaw = 0.5;
        if (this.stateTime > 0.6 && !L.forcedOpen) {
          L.forceOpen();
          if (P.hidden === L) {
            g.onPlayerKilled('locker');
            this.setState('feeding');
            break;
          }
        }
        if (this.stateTime > 2.2) {
          L.forcedOpen = false;
          L.close && L.close(true);
          this.searchPts = this.makeSearchPoints(this.pos.x, this.pos.z, 0, 0).slice(0, 2);
          this.searchTotal = 10;
          this.setState('search');
        }
        break;
      }
      case 'ventEnter':
      case 'inVent':
      case 'ventExit':
        this.updateVent(dt);
        break;
      case 'feeding': {
        anim.lean = 0.8;
        anim.jaw = 0.7;
        anim.reach = 1;
        break;
      }
      case 'scripted':
        if (this.script) this.script(dt, anim);
        speed = this.curSpeed;
        break;
    }

    if (!['ventEnter', 'inVent', 'ventExit', 'scripted'].includes(this.state)) {
      if (this.checkStuck(dt) && this.state === 'chase') this.repath = 0;
    }
    if (this.state !== 'ventEnter' && this.state !== 'inVent' && this.state !== 'ventExit') this.model.set(anim);
    this.model.update(dt, this.state === 'inVent' ? 0 : this.curSpeed);
    this.syncModel(dt);

    // Stimme
    const loud = this.state === 'chase' || this.state === 'attack' ? 0.9 : this.state === 'search' || this.state === 'alert' ? 0.45 : this.state === 'inVent' ? 0.15 : 0.28;
    const occ = this.world.lineOfSight(this.pos.x, this.pos.z, P.pos.x, P.pos.z) ? 0 : 1;
    this.voice.update(this.headPos(), loud, this.state === 'chase' || this.state === 'attack', occ);
  }

  syncModel(dt) {
    const r = this.model.root;
    r.position.x = this.pos.x;
    r.position.z = this.pos.z;
    if (this.state !== 'ventEnter' && this.state !== 'ventExit') r.position.y = this.pos.y;
    r.rotation.y = this.heading;
  }

  // Gefahr für Spieler-Feedback (Herzschlag/Musik) 0..1
  danger() {
    if (this.state === 'dormant') return 0;
    const P = this.game.player.pos;
    const d = Math.hypot(P.x - this.pos.x, P.z - this.pos.z);
    const sameFloor = Math.abs(P.y - this.pos.y) < 2.6;
    if (this.state === 'chase' || this.state === 'attack' || this.state === 'recover') return 1;
    let k = clamp(1 - d / 16, 0, 1) * (sameFloor ? 1 : 0.3);
    if (this.state === 'alert') k = Math.max(k, 0.75);
    if (this.state === 'search' || this.state === 'investigate' || this.state === 'checkLocker') k *= 1.2;
    return clamp(k, 0, 1);
  }

  serialize() {
    return { state: this.state === 'dormant' ? 'dormant' : 'active', rage: this.rage };
  }
}
