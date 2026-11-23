// Vollversion: Revolver als First-Person-Waffe. Er tötet das Monster nicht,
// aber ein Treffer betäubt es und treibt es in die Flucht.
import * as THREE from 'three';
import { G, box, cyl, part } from './level/props.js';
import { damp, clamp } from './utils.js';

const CYL = 6;

export class Revolver {
  constructor(game) {
    this.game = game;
    this.cooldown = 0;
    this.recoil = 0;
    this.reloadT = 0;
    this.flashT = 0;
    this.show = 0;
    const metal = new THREE.MeshStandardMaterial({ color: 0x3a3a3c, metalness: 0.75, roughness: 0.32, emissive: 0x0c0c0d });
    const dark = new THREE.MeshStandardMaterial({ color: 0x18181a, metalness: 0.6, roughness: 0.45, emissive: 0x060606 });
    const grip = new THREE.MeshStandardMaterial({ color: 0x4a2a16, roughness: 0.6, emissive: 0x0a0503 });
    const root = new THREE.Group();
    const gun = new THREE.Group();
    root.add(gun);
    // Lauf zeigt nach -z
    cyl(gun, metal, 0.011, 0.17, 0, 0.02, -0.12, Math.PI / 2, 0);
    box(gun, metal, 0.014, 0.012, 0.17, 0, 0.034, -0.12);
    cyl(gun, dark, 0.024, 0.05, 0, 0.012, -0.03, Math.PI / 2, 0);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      cyl(gun, metal, 0.005, 0.052, Math.cos(a) * 0.016, 0.012 + Math.sin(a) * 0.016, -0.03, Math.PI / 2, 0);
    }
    box(gun, metal, 0.026, 0.05, 0.075, 0, 0.012, 0.025);
    const g1 = box(gun, grip, 0.026, 0.1, 0.035, 0, -0.045, 0.07);
    g1.rotation.x = -0.35;
    box(gun, metal, 0.008, 0.018, 0.012, 0, 0.045, 0.05);
    box(gun, metal, 0.004, 0.012, 0.006, 0, 0.044, -0.2);
    const guard = part(gun, G.torus, metal, 0, -0.012, 0.03, 0.018, 0.018, 0.018, 0, Math.PI / 2, 0);
    void guard;
    gun.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = false;
        o.receiveShadow = false;
        o.frustumCulled = false;
        o.renderOrder = 20;
      }
    });
    // Mündungsfeuer
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffd28a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const flash = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), flashMat);
    flash.position.set(0, 0.02, -0.23);
    flash.frustumCulled = false;
    flash.renderOrder = 21;
    gun.add(flash);
    const flash2 = flash.clone();
    flash2.rotation.y = Math.PI / 2;
    gun.add(flash2);
    this.flashMeshes = [flash, flash2];
    root.position.set(0.17, -0.2, -0.36);
    root.visible = false;
    game.camera.add(root);
    this.root = root;
    this.gun = gun;
  }

  get inv() {
    return this.game.state.inv;
  }

  canUse() {
    const g = this.game;
    return g.premium && this.inv.revolver && !g.player.hidden && !g.player.dead;
  }

  tryFire() {
    const g = this.game;
    if (!this.canUse() || this.cooldown > 0 || this.reloadT > 0) return;
    const inv = this.inv;
    if (inv.ammo <= 0) {
      g.audio.emptyClick();
      if (inv.reserve > 0) this.startReload();
      else g.ui.toast('Keine Munition mehr.');
      this.cooldown = 0.35;
      return;
    }
    inv.ammo--;
    this.cooldown = 0.5;
    this.recoil = 1;
    this.flashT = 0.06;
    const cam = g.camera;
    const P = g.player;
    P.trauma = Math.min(1, P.trauma + 0.28);
    P.pitch = clamp(P.pitch + 0.035, -1.45, 1.45);
    g.audio.gunshot({ x: cam.position.x, y: cam.position.y, z: cam.position.z });
    g.muzzleFlash = 0.07;
    // Treffer?
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    const hit = this.hitMonster(cam.position, dir);
    if (hit) g.monster.stun(4.5, 'shot');
    else g.noise(cam.position.x, cam.position.z, 30, 'gunshot');
    if (inv.ammo === 0 && inv.reserve > 0) this.startReload(0.45);
    g.ui.refreshAbilities();
    return hit;
  }

  // Strahl gegen eine Kapsel um das Monster, Wände blockieren
  hitMonster(o, d) {
    const M = this.game.monster;
    if (!M || ['inVent', 'ventEnter', 'ventExit'].includes(M.state)) return false;
    const a = new THREE.Vector3(M.pos.x, M.pos.y + 0.35, M.pos.z);
    const b = new THREE.Vector3(M.pos.x, M.pos.y + 2.05, M.pos.z);
    // Nächster Abstand zwischen Strahl (o + t d) und Segment (a + s (b - a))
    const u = d;
    const v = new THREE.Vector3().subVectors(b, a);
    const w0 = new THREE.Vector3().subVectors(o, a);
    const A = u.dot(u);
    const B = u.dot(v);
    const C = v.dot(v);
    const D = u.dot(w0);
    const E = v.dot(w0);
    const den = A * C - B * B;
    let t = den > 1e-6 ? (B * E - C * D) / den : 0;
    let s = den > 1e-6 ? (A * E - B * D) / den : 0;
    s = clamp(s, 0, 1);
    t = Math.max(0, (B * s - D) / A);
    if (t > 32) return false;
    const pr = new THREE.Vector3().copy(o).addScaledVector(u, t);
    const ps = new THREE.Vector3().copy(a).addScaledVector(v, s);
    if (pr.distanceTo(ps) > 0.45) return false;
    // Wand dazwischen?
    const w = this.game.world;
    const hd = Math.hypot(pr.x - o.x, pr.z - o.z);
    if (hd > 0.01) {
      const f = w.rayDistance(o.x, o.z, pr.x - o.x, pr.z - o.z, 1);
      if (f * hd < hd - 0.3) return false;
    }
    return true;
  }

  startReload(delay = 0) {
    if (this.reloadT > 0 || this.inv.reserve <= 0 || this.inv.ammo >= CYL) return;
    this.reloadT = 1.8 + delay;
    this.reloadDelay = delay;
    this.game.schedule(delay, () => this.game.audio.reloadClicks());
  }

  update(dt, input) {
    const g = this.game;
    const usable = this.canUse() && (g.mode === 'playing');
    this.show = damp(this.show, usable ? 1 : 0, 10, dt);
    this.root.visible = this.show > 0.02;
    if (!this.root.visible) return;
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.reloadT > 0) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) {
        const inv = this.inv;
        const n = Math.min(CYL - inv.ammo, inv.reserve);
        inv.ammo += n;
        inv.reserve -= n;
        g.ui.refreshAbilities();
      }
    }
    if (usable && (input.pressed('fire') || input.pressed('click'))) this.tryFire();
    this.recoil = damp(this.recoil, 0, 10, dt);
    this.flashT = Math.max(0, this.flashT - dt);
    const fo = this.flashT > 0 ? 1 : 0;
    for (const f of this.flashMeshes) {
      f.material.opacity = fo;
      f.rotation.z = Math.random() * 3;
    }
    const P = g.player;
    const bob = Math.sin(P.bob * 2) * 0.006 * clamp(P.speed / 2.5, 0, 1.4);
    const sway = Math.cos(P.bob) * 0.008 * clamp(P.speed / 2.5, 0, 1.4);
    const rl = this.reloadT > 0 ? Math.sin(clamp((1.8 - this.reloadT + (this.reloadDelay || 0)) / 1.8, 0, 1) * Math.PI) : 0;
    this.root.position.set(0.17 + sway, -0.2 + bob - (1 - this.show) * 0.25 - rl * 0.08, -0.36 + this.recoil * 0.05);
    this.gun.rotation.set(this.recoil * 0.35 + rl * 0.6, rl * 0.4, rl * 0.5);
  }
}
