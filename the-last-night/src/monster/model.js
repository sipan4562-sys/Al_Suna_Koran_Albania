// Das Monster („Subjekt 0“): prozedural modelliert und vollständig prozedural animiert.
// Gelenkhierarchie mit 2-Knochen-IK für die Beine, Gangzyklus, Zuckungen, Kiefer, Stoffstreifen.
import * as THREE from 'three';
import { MAT, emissiveMaterial } from '../materials.js';
import { clamp, damp, lerp, noise1, rand } from '../utils.js';
import { mergeByMaterial } from '../level/props.js';

function bumpy(geo, amount, freq = 9) {
  const p = geo.attributes.position;
  const n = geo.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const s =
      Math.sin(x * freq * 1.3 + y * freq * 0.7) * Math.cos(z * freq * 1.1 - y * freq * 0.5) +
      Math.sin((x + z) * freq * 2.1) * 0.4;
    const k = s * amount;
    p.setXYZ(i, x + n.getX(i) * k, y + n.getY(i) * k, z + n.getZ(i) * k);
  }
  geo.computeVertexNormals();
  return geo;
}

function limb(r, len, mat, bump = 0.006) {
  const geo = bumpy(new THREE.CapsuleGeometry(r, len, 5, 10), bump, 14);
  geo.translate(0, -len / 2, 0);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  return m;
}

function joint(parent, x, y, z) {
  const j = new THREE.Group();
  j.position.set(x, y, z);
  parent.add(j);
  return j;
}

export class MonsterModel {
  constructor() {
    const skin = MAT.skin;
    const cloth = MAT.cloth;
    this.root = new THREE.Group();
    this.root.name = 'monster';
    const body = (this.body = joint(this.root, 0, 0, 0));
    this.hips = joint(body, 0, 1.02, 0);
    const pelvis = new THREE.Mesh(bumpy(new THREE.SphereGeometry(0.15, 14, 10), 0.01), skin);
    pelvis.scale.set(1.05, 0.75, 0.8);
    pelvis.castShadow = true;
    this.hips.add(pelvis);

    // Wirbelsäule + Brustkorb
    this.spine = joint(this.hips, 0, 0.06, 0);
    const prof = [
      [0.07, 0], [0.105, 0.06], [0.1, 0.16], [0.12, 0.27], [0.17, 0.4], [0.19, 0.5], [0.17, 0.58], [0.1, 0.64], [0.05, 0.66],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    const torsoGeo = bumpy(new THREE.LatheGeometry(prof, 18), 0.008, 12);
    const torso = new THREE.Mesh(torsoGeo, skin);
    torso.userData.keep = true;
    torso.scale.set(1, 1, 0.72);
    torso.castShadow = true;
    this.spine.add(torso);
    this.torso = torso;
    // Rippen
    for (let k = 0; k < 6; k++) {
      const y = 0.3 + k * 0.05;
      const r = 0.16 + Math.sin((k / 5) * Math.PI) * 0.03;
      const rib = new THREE.Mesh(new THREE.TorusGeometry(r, 0.009, 4, 18, Math.PI * 0.8), skin);
      rib.rotation.x = Math.PI / 2;
      rib.rotation.z = Math.PI * 0.1;
      rib.position.set(0, y, 0.0);
      rib.scale.set(1, 0.74, 1);
      this.spine.add(rib);
    }
    // Wirbel am Rücken
    for (let k = 0; k < 9; k++) {
      const v = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 5), skin);
      v.position.set(0, 0.05 + k * 0.065, -0.1 - Math.sin((k / 8) * Math.PI) * 0.04);
      this.spine.add(v);
    }
    // Reste einer Zwangsjacke
    const jacket = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.125, 0.34, 16, 1, true), cloth);
    jacket.material = cloth;
    jacket.position.y = 0.2;
    jacket.scale.set(1, 1, 0.78);
    jacket.castShadow = true;
    this.spine.add(jacket);
    const clothDS = cloth.clone();
    clothDS.side = THREE.DoubleSide;
    clothDS.onBeforeCompile = cloth.onBeforeCompile;
    clothDS.customProgramCacheKey = cloth.customProgramCacheKey;
    this.strips = [];
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + 0.3;
      const piv = joint(this.spine, Math.sin(a) * 0.15, 0.06, Math.cos(a) * 0.11);
      piv.rotation.y = a;
      const len = rand(0.25, 0.5);
      const g = new THREE.PlaneGeometry(rand(0.05, 0.09), len);
      g.translate(0, -len / 2, 0);
      const s = new THREE.Mesh(g, clothDS);
      s.castShadow = true;
      piv.add(s);
      this.strips.push({ piv, phase: rand(0, 6), len });
    }
    for (const yy of [0.12, 0.28]) {
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.012, 4, 20), MAT.rubber);
      strap.rotation.x = Math.PI / 2;
      strap.position.y = yy;
      strap.scale.set(1.02, 0.78, 1);
      this.spine.add(strap);
    }

    this.chest = joint(this.spine, 0, 0.56, 0);
    this.neck = joint(this.chest, 0, 0.06, 0.03);
    const neckM = limb(0.04, 0.16, skin);
    neckM.rotation.x = Math.PI;
    neckM.position.y = 0;
    this.neck.add(neckM);
    this.head = joint(this.neck, 0, 0.2, 0.02);
    const skull = new THREE.Mesh(bumpy(new THREE.SphereGeometry(0.115, 20, 16), 0.006, 16), skin);
    skull.scale.set(0.95, 1.3, 1.08);
    skull.position.set(0, 0.06, 0.01);
    skull.castShadow = true;
    this.head.add(skull);
    // Tiefe Augenhöhlen mit glimmenden Pupillen
    this.eyeMat = emissiveMaterial(0xffe8b0, 1.6);
    for (const s of [-1, 1]) {
      const sock = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), MAT.mouth);
      sock.position.set(s * 0.045, 0.05, 0.1);
      sock.scale.set(1.2, 0.8, 0.6);
      this.head.add(sock);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), this.eyeMat);
      eye.position.set(s * 0.045, 0.048, 0.118);
      this.head.add(eye);
    }
    // Obere Zähne + Mund
    const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), MAT.mouth);
    mouth.scale.set(1, 0.5, 0.8);
    mouth.position.set(0, -0.06, 0.06);
    this.head.add(mouth);
    const toothGeo = new THREE.ConeGeometry(0.008, 0.035, 5);
    for (let k = 0; k < 9; k++) {
      const a = ((k - 4) / 4) * 0.9;
      const t = new THREE.Mesh(toothGeo, MAT.teeth);
      t.position.set(Math.sin(a) * 0.065, -0.045, 0.055 + Math.cos(a) * 0.045);
      t.rotation.x = Math.PI;
      this.head.add(t);
    }
    this.jaw = joint(this.head, 0, -0.04, -0.02);
    const jawM = new THREE.Mesh(bumpy(new THREE.SphereGeometry(0.085, 14, 8, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5), 0.005), skin);
    jawM.scale.set(0.95, 0.9, 1.35);
    jawM.position.set(0, 0.0, 0.06);
    jawM.castShadow = true;
    this.jaw.add(jawM);
    for (let k = 0; k < 8; k++) {
      const a = ((k - 3.5) / 3.5) * 0.85;
      const t = new THREE.Mesh(toothGeo, MAT.teeth);
      t.position.set(Math.sin(a) * 0.062, -0.0, 0.07 + Math.cos(a) * 0.045);
      this.jaw.add(t);
    }

    // Arme
    this.arms = [-1, 1].map((s) => {
      const shoulder = joint(this.chest, s * 0.2, 0.0, -0.01);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), skin);
      shoulder.add(ball);
      const upper = joint(shoulder, 0, 0, 0);
      upper.add(limb(0.042, 0.42, skin));
      const elbow = joint(upper, 0, -0.44, 0);
      elbow.add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), skin));
      elbow.add(limb(0.034, 0.46, skin));
      const wrist = joint(elbow, 0, -0.48, 0);
      const palm = new THREE.Mesh(bumpy(new THREE.BoxGeometry(0.08, 0.11, 0.03, 3, 3, 1), 0.004), skin);
      palm.position.y = -0.05;
      palm.castShadow = true;
      wrist.add(palm);
      const fingers = [];
      for (let f = 0; f < 4; f++) {
        const fj = joint(wrist, -0.03 + f * 0.02, -0.1, 0);
        fj.add(limb(0.008, 0.09, skin, 0.002));
        const fj2 = joint(fj, 0, -0.1, 0);
        fj2.add(limb(0.007, 0.08, skin, 0.002));
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.03, 4), MAT.teeth);
        claw.position.y = -0.1;
        claw.rotation.x = Math.PI;
        fj2.add(claw);
        fingers.push([fj, fj2]);
      }
      return { s, shoulder, upper, elbow, wrist, fingers };
    });

    // Beine
    this.L1 = 0.5;
    this.L2 = 0.5;
    this.legs = [-1, 1].map((s) => {
      const hip = joint(this.hips, s * 0.1, -0.04, 0);
      const thigh = joint(hip, 0, 0, 0);
      thigh.add(limb(0.055, this.L1, skin));
      const knee = joint(thigh, 0, -this.L1, 0);
      knee.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), skin));
      knee.add(limb(0.042, this.L2, skin));
      const ankle = joint(knee, 0, -this.L2, 0);
      const foot = new THREE.Mesh(bumpy(new THREE.BoxGeometry(0.08, 0.05, 0.24, 2, 1, 4), 0.006), skin);
      foot.position.set(0, -0.02, 0.07);
      foot.castShadow = true;
      ankle.add(foot);
      return { s, hip, thigh, knee, ankle, footPhase: 0 };
    });

    this.root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    // Meshes pro Gelenk verschmelzen (deutlich weniger Draw Calls)
    const joints = [];
    this.root.traverse((o) => {
      if (o.isGroup || o === this.root) joints.push(o);
    });
    for (const j of joints) mergeByMaterial(j);

    // Animationsparameter (werden geglättet)
    this.p = { speed: 0, lean: 0.4, reach: 0, jaw: 0.05, crouch: 0, scan: 0, scream: 0, attack: 0, spread: 0, push: 0 };
    this.target = { ...this.p };
    this.phase = 0;
    this.twitch = { t: 0, next: 1, yaw: 0, pitch: 0, roll: 0, arm: 0 };
    this.time = 0;
    this.stepCallback = null;
    this.lastStepSign = [0, 0];
  }

  // Vollversion „Gebet“: Silhouette durch Wände sichtbar
  setXray(on) {
    if (on && !this.xray) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xff4a2a, transparent: true, opacity: 0.4, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending });
      this.xray = [];
      const meshes = [];
      this.root.traverse((o) => o.isMesh && meshes.push(o));
      for (const m of meshes) {
        const x = new THREE.Mesh(m.geometry, mat);
        x.renderOrder = 30;
        x.frustumCulled = false;
        m.add(x);
        this.xray.push(x);
      }
    }
    if (this.xray) for (const x of this.xray) x.visible = on;
  }

  set(params) {
    Object.assign(this.target, params);
  }

  update(dt, speed) {
    this.time += dt;
    const t = this.time;
    const p = this.p;
    const T = this.target;
    T.speed = speed;
    for (const k of Object.keys(p)) p[k] = damp(p[k], T[k], k === 'attack' || k === 'jaw' ? 14 : 6, dt);
    const sp = clamp(p.speed / 4, 0, 1);

    // Gangzyklus
    const stepLen = 0.5 + sp * 0.35;
    this.phase += (p.speed / (stepLen * 2)) * dt;
    const stance = lerp(0.62, 0.42, sp);
    const stride = Math.min(stepLen * 1.1, 0.25 + p.speed * 0.32);
    const hipH = 0.98 - p.crouch * 0.45 - sp * 0.08 + Math.abs(Math.sin(this.phase * Math.PI * 2)) * 0.035 * (p.speed > 0.1 ? 1 : 0);
    this.hips.position.y = hipH;
    this.hips.position.z = sp * 0.05;
    // Hüftrotation
    this.hips.rotation.y = Math.sin(this.phase * Math.PI * 2) * 0.12 * Math.min(1, p.speed);
    this.hips.rotation.z = Math.cos(this.phase * Math.PI * 2) * 0.05 * Math.min(1, p.speed);

    this.legs.forEach((leg, i) => {
      let ph = (this.phase + i * 0.5) % 1;
      if (ph < 0) ph += 1;
      let z;
      let lift = 0;
      if (p.speed < 0.05) {
        z = (i ? 0.06 : -0.04) + p.crouch * 0.1;
      } else if (ph < stance) {
        const u = ph / stance;
        z = stride / 2 - u * stride;
      } else {
        const u = (ph - stance) / (1 - stance);
        z = -stride / 2 + u * stride;
        lift = Math.sin(u * Math.PI) * (0.1 + sp * 0.14);
      }
      // Schritt-Ereignis beim Aufsetzen
      const sign = ph < stance ? 1 : -1;
      if (p.speed > 0.2 && sign === 1 && this.lastStepSign[i] === -1 && this.stepCallback) this.stepCallback(i, sp);
      this.lastStepSign[i] = sign;
      const hipWorldY = hipH - 0.04;
      const ty = -hipWorldY + lift + 0.06;
      const tz = z - this.hips.position.z;
      const L1 = this.L1;
      const L2 = this.L2;
      const d = clamp(Math.hypot(ty, tz), 0.15, L1 + L2 - 0.002);
      const alpha = Math.atan2(tz, -ty);
      const beta = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
      const kneeIn = Math.acos(clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
      const bend = Math.PI - kneeIn;
      leg.thigh.rotation.x = -(alpha + beta);
      leg.knee.rotation.x = bend;
      leg.ankle.rotation.x = -(leg.thigh.rotation.x + leg.knee.rotation.x) + (lift > 0.02 ? 0.3 : 0);
      leg.hip.rotation.z = leg.s * (0.05 + p.crouch * 0.15);
      leg.hip.rotation.y = leg.s * 0.1;
    });

    // Oberkörper
    const breath = Math.sin(t * (p.speed > 2 ? 4 : 1.6)) * 0.015;
    this.spine.rotation.x = p.lean + sp * 0.25 + p.attack * 0.35 + breath - p.scream * 0.5;
    this.spine.rotation.z = Math.sin(this.phase * Math.PI * 2) * 0.04 * Math.min(1, p.speed);
    this.spine.rotation.y = -this.hips.rotation.y * 0.6;
    this.chest.rotation.x = 0.15 + p.attack * 0.2 - p.scream * 0.25;
    this.torso.scale.x = 1 + breath * 2;

    // Zuckungen
    const tw = this.twitch;
    tw.next -= dt;
    if (tw.next <= 0) {
      tw.next = rand(0.6, 3.2) * (p.speed > 2.5 ? 0.6 : 1);
      tw.t = 0.18;
      tw.yaw = rand(-0.6, 0.6);
      tw.pitch = rand(-0.3, 0.4);
      tw.roll = rand(-0.7, 0.7);
      tw.arm = rand(-0.6, 0.6);
    }
    tw.t = Math.max(0, tw.t - dt);
    const twK = tw.t > 0 ? 1 : 0;
    this._tw = this._tw ? damp(this._tw, twK, twK ? 40 : 5, dt) : twK;
    const k = this._tw;

    // Kopf
    const scanYaw = Math.sin(t * 1.3) * 0.9 * p.scan;
    this.neck.rotation.x = -(p.lean + sp * 0.25) * 0.75 + 0.15 + p.scream * 0.4;
    this.head.rotation.x = -0.1 + tw.pitch * k - p.scream * 0.6 + noise1(t * 0.7) * 0.08;
    this.head.rotation.y = scanYaw + tw.yaw * k + noise1(t * 0.5 + 9) * 0.15;
    this.head.rotation.z = 0.32 + tw.roll * k + noise1(t * 0.4 + 3) * 0.1;
    this.jaw.rotation.x = clamp(p.jaw + p.scream * 0.8 + p.attack * 0.5 + Math.max(0, noise1(t * 3)) * 0.06, 0, 1.0);

    // Arme
    this.arms.forEach((a, i) => {
      const swing = p.speed > 0.05 ? Math.sin((this.phase + (i ? 0 : 0.5)) * Math.PI * 2) * (0.35 + sp * 0.3) : 0;
      const reach = p.reach + p.attack;
      a.upper.rotation.x = swing * (1 - p.reach) - reach * 1.25 - p.push * 1.3 + (i ? tw.arm * k : 0);
      a.upper.rotation.z = a.s * (0.12 + p.spread * 1.2 + p.scream * 0.9) + Math.sin(t * 0.9 + i) * 0.04;
      a.upper.rotation.y = a.s * reach * 0.25;
      a.elbow.rotation.x = -(0.35 + sp * 0.4 + reach * 0.2 - p.attack * 0.3 + p.push * -0.2);
      a.wrist.rotation.x = -0.2 - reach * 0.3;
      const curl = 0.3 + 0.5 * (1 - reach) + Math.sin(t * 8 + i * 3) * 0.08 + (p.attack > 0.5 ? -0.3 : 0);
      a.fingers.forEach(([f1, f2], fi) => {
        f1.rotation.x = -curl - fi * 0.05 + noise1(t * 5 + fi + i * 7) * 0.15;
        f2.rotation.x = -curl * 0.9;
        f1.rotation.z = (fi - 1.5) * 0.08 * a.s;
      });
    });

    // Stoffstreifen pendeln
    for (const s of this.strips) {
      s.piv.rotation.x = 0.2 + sp * 0.5 + Math.sin(t * (2 + sp * 4) + s.phase) * (0.12 + sp * 0.2);
    }
  }
}
