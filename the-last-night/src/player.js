// First-Person-Spieler: Bewegung, Kollision, Ducken, Sprinten, Ausdauer,
// Gesundheit, Kopfwippen, Schritte, Taschenlampe mit Batterie.
import * as THREE from 'three';
import { PLAYER, settings } from './config.js';
import { clamp, damp, lerp, noise1, dampAngle } from './utils.js';
import { DECAL } from './textures.js';

const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler(0, 0, 0, 'YXZ');

export class Player {
  constructor(game, camera, scene, quality) {
    this.game = game;
    this.camera = camera;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector2();
    this.yaw = 0;
    this.pitch = 0;
    this.roll = 0;
    this.eye = PLAYER.eyeStand;
    this.crouched = false;
    this.sprinting = false;
    this.stamina = PLAYER.staminaMax;
    this.exhausted = false;
    this.staminaDelay = 0;
    this.health = PLAYER.healthMax;
    this.regenDelay = 0;
    this.battery = 100;
    this.flashOn = false;
    this.hasFlashlight = false;
    this.hidden = null;
    this.locked = false; // Steuerung gesperrt (Menüs, Zwischensequenzen)
    this.dead = false;
    this.bob = 0;
    this.stepPhase = 0;
    this.stepSide = 1;
    this.trauma = 0;
    this.damageFlash = 0;
    this.speed = 0;
    this.moving = false;
    this.fovKick = 0;
    this.lastNoise = 0;
    this.smoothY = 0;

    // Taschenlampe
    const flash = new THREE.SpotLight(0xffeed8, 0, 32, 0.58, 0.55, 1.6);
    flash.castShadow = true;
    flash.shadow.mapSize.set(quality.shadowSize, quality.shadowSize);
    flash.shadow.camera.near = 0.2;
    flash.shadow.camera.far = 30;
    flash.shadow.bias = -0.0004;
    flash.shadow.normalBias = 0.025;
    flash.map = DECAL.cookie;
    scene.add(flash);
    scene.add(flash.target);
    this.flash = flash;
    this.flashDir = new THREE.Vector3(0, 0, -1);
    this.flashFlicker = 0;
    this.flashPower = 0;
  }

  setQuality(q) {
    this.flash.shadow.mapSize.set(q.shadowSize, q.shadowSize);
    if (this.flash.shadow.map) {
      this.flash.shadow.map.dispose();
      this.flash.shadow.map = null;
    }
  }

  spawn(x, z, yaw, pitch = 0) {
    this.pos.set(x, this.game.world.floorAt(x, z), z);
    this.smoothY = this.pos.y;
    this.yaw = yaw;
    this.pitch = pitch;
    this.vel.set(0, 0);
    this.crouched = false;
    this.eye = PLAYER.eyeStand;
    this.hidden = null;
    this.dead = false;
    this.roll = 0;
  }

  get height() {
    return this.crouched ? PLAYER.heightCrouch : PLAYER.heightStand;
  }

  forward(out = _v) {
    return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  canStand() {
    const w = this.game.world;
    const r = PLAYER.radius;
    for (const [ox, oz] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) {
      const x = this.pos.x + ox;
      const z = this.pos.z + oz;
      if (w.ceilAt(x, z) - w.floorAt(x, z) < PLAYER.heightStand) return false;
    }
    return true;
  }

  update(dt, input) {
    const g = this.game;
    const w = g.world;
    if (this.dead) return;

    // Umsehen
    if (!this.locked) {
      const look = input.consumeLook();
      this.yaw -= look.x;
      this.pitch = clamp(this.pitch - look.y, -1.45, 1.45);
      if (this.hidden) {
        const base = this.hidden.yaw;
        const d = Math.atan2(Math.sin(this.yaw - base), Math.cos(this.yaw - base));
        this.yaw = base + clamp(d, -0.7, 0.7);
        this.pitch = clamp(this.pitch, -0.45, 0.35);
      }
    } else input.consumeLook();

    // Ducken
    if (!this.locked && !this.hidden) {
      if (input.pressed('crouch')) {
        if (this.crouched && this.canStand()) this.crouched = false;
        else if (!this.crouched) this.crouched = true;
      }
      if (input.pressed('crouchHold')) this.crouched = true;
      if (input.pressed('crouchRelease') && this.canStand()) this.crouched = false;
    }
    if (this.crouched && w.ceilAt(this.pos.x, this.pos.z) - w.floorAt(this.pos.x, this.pos.z) < PLAYER.heightStand) {
      this.crouched = true;
    }

    // Bewegung
    let mv = { x: 0, y: 0, mag: 0 };
    if (!this.locked && !this.hidden) mv = input.moveVector();
    const wantSprint = !this.locked && !this.hidden && input.sprinting() && mv.y > 0.3 && !this.exhausted;
    if (wantSprint && this.crouched && this.canStand()) this.crouched = false;
    this.sprinting = wantSprint && !this.crouched;
    let maxSpeed = this.crouched ? PLAYER.crouch : this.sprinting ? PLAYER.sprint : PLAYER.walk;
    if (this.health < 35) maxSpeed *= 0.85;
    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);
    const rx = Math.cos(this.yaw);
    const rz = -Math.sin(this.yaw);
    const tx = (fx * mv.y + rx * mv.x) * maxSpeed * Math.max(mv.mag, 0);
    const tz = (fz * mv.y + rz * mv.x) * maxSpeed * Math.max(mv.mag, 0);
    const accel = mv.mag > 0 ? 10 : 12;
    this.vel.x = damp(this.vel.x, tx, accel, dt);
    this.vel.y = damp(this.vel.y, tz, accel, dt);

    if (!this.hidden) {
      const before = { x: this.pos.x, z: this.pos.z };
      w.moveCircle(this.pos, this.vel.x * dt, this.vel.y * dt, PLAYER.radius, this.height);
      const moved = Math.hypot(this.pos.x - before.x, this.pos.z - before.z);
      this.speed = dt > 0 ? moved / dt : 0;
      const fy = w.floorAt(this.pos.x, this.pos.z);
      this.smoothY = damp(this.smoothY, fy, 18, dt);
      this.pos.y = this.smoothY;
    } else this.speed = 0;
    this.moving = this.speed > 0.4;
    // Touch-Sprint bleibt aktiv, bis man nach dem Rennen stehen bleibt
    if (input.touchSprint) {
      if (this.sprinting && this.moving) this._tsUsed = true;
      if (!this.moving && this._tsUsed) {
        input.resetTouchSprint();
        this._tsUsed = false;
      }
    } else this._tsUsed = false;

    // Ausdauer
    if (this.sprinting && this.moving) {
      this.stamina -= PLAYER.staminaDrain * dt;
      this.staminaDelay = 1.0;
      if (this.stamina <= 0) {
        this.stamina = 0;
        this.exhausted = true;
        g.ui.toast('Du bist außer Atem …');
      }
    } else {
      this.staminaDelay -= dt;
      if (this.staminaDelay <= 0) this.stamina = Math.min(PLAYER.staminaMax, this.stamina + PLAYER.staminaRegen * dt * (this.moving ? 0.6 : 1));
      if (this.exhausted && this.stamina > 35) this.exhausted = false;
    }

    // Gesundheit regenerieren
    this.regenDelay -= dt;
    if (this.regenDelay <= 0 && this.health < PLAYER.healthMax) this.health = Math.min(PLAYER.healthMax, this.health + 1.6 * dt);

    // Schritte & Geräusche
    if (this.moving) {
      const stride = this.crouched ? 0.62 : this.sprinting ? 1.05 : 0.78;
      this.stepPhase += (this.speed * dt) / stride;
      if (this.stepPhase >= 1) {
        this.stepPhase -= 1;
        this.stepSide *= -1;
        const surface = w.surfaceAt(this.pos.x, this.pos.z);
        const inten = this.crouched ? 0.28 : this.sprinting ? 1 : 0.62;
        g.audio.footstep(surface, inten, this.stepSide * 0.12);
        const surfMul = { metal: 1.5, water: 1.35, wood: 1.15, soft: 0.5, concrete: 1, tile: 1 }[surface] || 1;
        const radius = (this.crouched ? 1.6 : this.sprinting ? 13 : 5.5) * surfMul;
        g.noise(this.pos.x, this.pos.z, radius, 'step');
      }
      this.bob += this.speed * dt * (this.sprinting ? 1.45 : 1.6);
    } else {
      this.bob = damp(this.bob, Math.round(this.bob / Math.PI) * Math.PI, 4, dt);
    }

    // Taschenlampe
    if (!this.locked && input.pressed('flashlight') && this.hasFlashlight) this.toggleFlash();
    if (this.flashOn) {
      this.battery = Math.max(0, this.battery - PLAYER.batteryDrain * dt);
      if (this.battery <= 0) {
        this.flashOn = false;
        g.audio.click();
        g.ui.toast('Die Batterie ist leer. [R] Batterie wechseln');
      }
    }

    this.trauma = Math.max(0, this.trauma - dt * 1.4);
    this.damageFlash = Math.max(0, this.damageFlash - dt * 1.2);
    this.updateCamera(dt);
    this.updateFlash(dt);
  }

  toggleFlash(force) {
    const want = force !== undefined ? force : !this.flashOn;
    if (want && this.battery <= 0) {
      this.game.ui.toast('Keine Energie. Lege eine neue Batterie ein [R].');
      this.game.audio.click();
      return;
    }
    if (want === this.flashOn) return;
    this.flashOn = want;
    this.game.audio.click();
  }

  updateCamera(dt) {
    const cam = this.camera;
    const targetEye = this.crouched ? PLAYER.eyeCrouch : PLAYER.eyeStand;
    this.eye = damp(this.eye, targetEye, 10, dt);
    let bobY = 0;
    let bobX = 0;
    let bobRoll = 0;
    if (settings.headBob) {
      const amp = this.sprinting ? 0.055 : this.crouched ? 0.018 : 0.032;
      const k = clamp(this.speed / 2.5, 0, 1.4);
      bobY = Math.sin(this.bob * 2) * amp * k;
      bobX = Math.cos(this.bob) * amp * 0.6 * k;
      bobRoll = Math.cos(this.bob) * 0.006 * k;
    }
    // Atmen im Stand
    const t = performance.now() / 1000;
    const breath = Math.sin(t * (this.exhausted ? 3.2 : 1.3)) * (this.exhausted ? 0.012 : 0.004);
    // Kamerawackeln
    const tr = this.trauma * this.trauma;
    const shakeYaw = noise1(t * 23) * 0.05 * tr;
    const shakePitch = noise1(t * 21 + 40) * 0.05 * tr;
    const shakeRoll = noise1(t * 19 + 80) * 0.06 * tr;

    if (this.hidden) {
      cam.position.lerp(this.hidden.eyePos, 1 - Math.exp(-10 * dt));
    } else {
      cam.position.set(this.pos.x, this.pos.y + this.eye + bobY + breath, this.pos.z);
      cam.position.x += Math.cos(this.yaw) * bobX;
      cam.position.z -= Math.sin(this.yaw) * bobX;
    }
    // Leichtes Neigen beim Seitwärtsgehen
    const side = this.vel.x * Math.cos(this.yaw) - this.vel.y * Math.sin(this.yaw);
    this.roll = damp(this.roll, -side * 0.006, 6, dt);
    _e.set(this.pitch + shakePitch, this.yaw + shakeYaw, this.roll + bobRoll + shakeRoll);
    cam.quaternion.setFromEuler(_e);
    const fovT = (this.game.fovBase || settings.fov) + (this.sprinting && this.moving ? 5 : 0) + this.fovKick;
    if (Math.abs(cam.fov - fovT) > 0.05) {
      cam.fov = damp(cam.fov, fovT, 6, dt);
      cam.updateProjectionMatrix();
    }
  }

  updateFlash(dt) {
    const cam = this.camera;
    const f = this.flash;
    // Verzögerte Ausrichtung (Trägheit der Hand)
    const fwd = _v.set(0, 0, -1).applyQuaternion(cam.quaternion);
    this.flashDir.lerp(fwd, 1 - Math.exp(-dt * 14)).normalize();
    const off = new THREE.Vector3(0.16, -0.17, -0.05).applyQuaternion(cam.quaternion);
    f.position.copy(cam.position).add(off);
    if (this.hidden) f.position.copy(cam.position);
    f.target.position.copy(f.position).addScaledVector(this.flashDir, 6);
    f.target.updateMatrixWorld();

    let power = this.flashOn ? 1 : 0;
    if (this.flashOn && this.battery < 22) {
      // Schwache Batterie: dunkler + Flackern
      const t = performance.now() / 1000;
      power *= 0.45 + (this.battery / 22) * 0.55;
      const fl = noise1(t * 9);
      if (fl > 0.55 - (22 - this.battery) * 0.01) power *= 0.15 + Math.random() * 0.3;
    }
    if (this.flashFlicker > 0) {
      this.flashFlicker -= dt;
      power *= Math.random() < 0.5 ? 0.05 : 0.7;
    }
    this.flashPower = damp(this.flashPower, power, 30, dt);
    // Licht bleibt immer im Szenengraph (sichtbar), sonst würden alle Shader neu kompiliert.
    f.intensity = this.flashPower * 72;
  }

  damage(amount, from) {
    if (this.dead) return;
    this.health -= amount;
    this.regenDelay = 9;
    this.trauma = Math.min(1, this.trauma + 0.9);
    this.damageFlash = 1;
    this.game.audio.hurt();
    if (from) {
      // Rückstoß
      const dx = this.pos.x - from.x;
      const dz = this.pos.z - from.z;
      const d = Math.hypot(dx, dz) || 1;
      this.vel.x += (dx / d) * 5;
      this.vel.y += (dz / d) * 5;
    }
    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
    }
  }

  heal(n) {
    this.health = Math.min(PLAYER.healthMax, this.health + n);
  }
}
