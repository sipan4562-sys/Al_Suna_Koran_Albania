// Lichtsystem: viele Lampen in der Welt, aber nur ein fester Pool echter Punktlichter,
// die jedes Frame den nächsten aktiven Lampen zugewiesen werden.
import * as THREE from 'three';
import { regionUniforms, emissiveMaterial } from './materials.js';
import { noise1, clamp, smoothstep } from './utils.js';
import { G, box, part, cyl, mergeByMaterial } from './level/props.js';
import { MAT } from './materials.js';

const coneVS = /* glsl */ `
varying vec3 vN;
varying vec3 vV;
varying float vH;
varying vec3 vW;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vW = wp.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vV = normalize(cameraPosition - wp.xyz);
  vH = uv.y;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const coneFS = /* glsl */ `
uniform vec3 color;
uniform float intensity;
uniform float time;
uniform vec3 camPos;
varying vec3 vN;
varying vec3 vV;
varying float vH;
varying vec3 vW;
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x) {
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
void main() {
  float facing = pow(abs(dot(normalize(vN), normalize(vV))), 2.0);
  float fall = smoothstep(0.0, 0.35, vH) * pow(vH, 0.6);
  float dust = 0.65 + 0.35 * vnoise(vW * 2.5 + vec3(0.0, -time * 0.15, time * 0.05));
  float near = smoothstep(0.6, 2.6, distance(cameraPosition, vW));
  float a = facing * fall * dust * intensity * near;
  gl_FragColor = vec4(color * a, 1.0);
}`;

export function coneMaterial(color, strength = 0.12) {
  return new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) }, intensity: { value: strength }, time: { value: 0 } },
    vertexShader: coneVS,
    fragmentShader: coneFS,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

const TYPES = {
  tube: { color: 0xd6e2ff, intensity: 4.4, range: 9, emissive: 2.2 },
  bulb: { color: 0xffc07a, intensity: 4.0, range: 8, emissive: 2.6, cone: 0.07 },
  emergency: { color: 0xff3a1c, intensity: 1.8, range: 6, emissive: 3 },
  surgical: { color: 0xe8f4ff, intensity: 14, range: 10, emissive: 5, cone: 0.06 },
  monitor: { color: 0x7fb0d8, intensity: 1.6, range: 4.5, emissive: 0 },
  moon: { color: 0x7a96d8, intensity: 4.5, range: 12, emissive: 0 },
  tv: { color: 0x9fb8e0, intensity: 1.8, range: 5, emissive: 0 },
  exit: { color: 0x40ff70, intensity: 0.8, range: 3.5, emissive: 0 },
};

export class LightSystem {
  constructor(scene, world, quality) {
    this.scene = scene;
    this.world = world;
    this.fixtures = [];
    this.cones = [];
    this.group = new THREE.Group();
    this.group.name = 'light-pool';
    scene.add(this.group);
    this.pool = [];
    this.power = false;
    // Slot 0: indirektes Licht der Taschenlampe
    this.bounce = new THREE.PointLight(0xffe6c8, 0, 5, 2);
    this.group.add(this.bounce);
    this.setPoolSize(quality.lights);
    this.t = 0;
  }

  setPoolSize(n) {
    while (this.pool.length < n) {
      const l = new THREE.PointLight(0xffffff, 0, 8, 2);
      l.castShadow = false;
      this.group.add(l);
      this.pool.push(l);
    }
    while (this.pool.length > n) {
      const l = this.pool.pop();
      this.group.remove(l);
      l.dispose && l.dispose();
    }
  }

  // Lampe mit Modell erzeugen. pre/post = Modus vor/nach Strom ('on','off','flicker','dying','pulse')
  add(type, x, y, z, opts = {}) {
    const T = TYPES[type];
    const f = {
      type,
      x,
      y,
      z,
      color: new THREE.Color(opts.color ?? T.color),
      intensity: opts.intensity ?? T.intensity,
      range: opts.range ?? T.range,
      pre: opts.pre ?? 'off',
      post: opts.post ?? 'on',
      mode: opts.pre ?? 'off',
      seed: Math.random() * 100,
      value: 0,
      region: this.world.regionAt(x, z),
      mats: [],
      cone: null,
      hum: type === 'tube' || type === 'bulb' || type === 'surgical',
      emissive: opts.emissive ?? T.emissive,
      override: null,
    };
    const group = new THREE.Group();
    group.position.set(x, y, z);
    if (opts.ry) group.rotation.y = opts.ry;
    this.scene.add(group);
    f.group = group;
    // Statische Teile (Gehäuse, Kabel …) werden verschmolzen
    const stat = new THREE.Group();
    stat.position.copy(group.position);
    stat.rotation.copy(group.rotation);

    if (type === 'tube') {
      const housing = box(stat, MAT.lampHousing, 1.25, 0.09, 0.32, 0, 0.05, 0);
      housing.castShadow = false;
      const m = emissiveMaterial(f.color, 0);
      f.mats.push(m);
      for (const zz of [-0.07, 0.07]) {
        const t = part(group, G.cylLo, m, 0, -0.01, zz, 0.022, 1.15, 0.022, 0, 0, Math.PI / 2);
        t.castShadow = false;
      }
    } else if (type === 'bulb') {
      const len = opts.cable ?? 0.6;
      const c = cyl(stat, MAT.black, 0.006, len, 0, len / 2, 0);
      c.castShadow = false;
      cyl(stat, MAT.steel, 0.03, 0.06, 0, 0.02, 0);
      const m = emissiveMaterial(f.color, 0);
      f.mats.push(m);
      const b = part(group, G.sphere, m, 0, -0.06, 0, 0.05, 0.065, 0.05);
      b.castShadow = false;
      if (opts.shade !== false) {
        const shade = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.16, 16, 1, true), MAT.metalPaint);
        shade.material = MAT.lampHousing;
        shade.position.y = 0.0;
        shade.castShadow = false;
        stat.add(shade);
      }
      if (opts.cone !== false) this.addCone(f, group, 0.12, 1.3, y - (opts.floor ?? (y - 2.6)), T.cone);
    } else if (type === 'emergency') {
      box(stat, MAT.plastic, 0.3, 0.12, 0.1, 0, 0, 0);
      const m = emissiveMaterial(f.color, 0);
      f.mats.push(m);
      const b = box(group, m, 0.24, 0.06, 0.02, 0, 0, 0.055);
      b.castShadow = false;
    } else if (type === 'surgical') {
      cyl(stat, MAT.steel, 0.025, 0.8, 0, 0.45, 0);
      const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.42, 0.18, 24, 1, true), MAT.lampHousing);
      stat.add(dish);
      const m = emissiveMaterial(f.color, 0);
      f.mats.push(m);
      const disc = part(group, G.cylLo, m, 0, -0.08, 0, 0.36, 0.02, 0.36);
      disc.castShadow = false;
      this.addCone(f, group, 0.36, 1.0, 2.3, T.cone);
    }
    if (stat.children.length) {
      if (this.batcher) this.batcher.add(stat);
      else this.scene.add(stat);
    }
    mergeByMaterial(group);
    this.fixtures.push(f);
    return f;
  }

  addCone(f, group, rTop, rBot, h, strength) {
    const geo = new THREE.CylinderGeometry(rTop, rBot, h, 24, 1, true);
    geo.translate(0, -h / 2, 0);
    // uv.y: 1 oben -> 0 unten (wir wollen hell oben)
    const mat = coneMaterial(f.color, strength);
    const m = new THREE.Mesh(geo, mat);
    m.position.y = -0.05;
    m.renderOrder = 5;
    m.frustumCulled = true;
    m.userData.keep = true;
    group.add(m);
    f.cone = m;
    f.coneStrength = strength;
    this.cones.push(m);
  }

  // Lichtschacht (z.B. Mondlicht durchs Fenster)
  addShaft(x, y, z, ry, color, w = 1.2, len = 4.5, tilt = 0.55, strength = 0.05) {
    const geo = new THREE.CylinderGeometry(w * 0.45, w * 0.9, len, 4, 1, true);
    geo.rotateY(Math.PI / 4);
    geo.translate(0, -len / 2, 0);
    const mat = coneMaterial(color, strength);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(0, ry, 0);
    m.rotateX(tilt);
    m.renderOrder = 5;
    this.scene.add(m);
    this.cones.push(m);
    return m;
  }

  setPower(on) {
    this.power = on;
    for (const f of this.fixtures) f.mode = on ? f.post : f.pre;
  }

  fixtureValue(f, t) {
    if (f.override !== null) return f.override;
    switch (f.tempT > 0 ? 'flicker' : f.mode) {
      case 'on':
        return 0.97 + noise1(t * 3 + f.seed) * 0.03;
      case 'off':
        return 0;
      case 'flicker': {
        const n = noise1(t * 2.3 + f.seed);
        if (n > 0.35) return Math.random() < 0.5 ? 0.05 : 0.6 + Math.random() * 0.3;
        if (n > 0.28) return 0.3;
        return 0.95;
      }
      case 'dying': {
        const n = noise1(t * 1.4 + f.seed);
        if (n > 0.55) return Math.random() < 0.6 ? 0.8 : 0.1;
        return 0.02;
      }
      case 'pulse':
        return 0.55 + 0.45 * Math.sin(t * 2.2 + f.seed);
      case 'static':
        return 0.6 + Math.random() * 0.4;
      default:
        return 1;
    }
  }

  update(dt, cam, flash) {
    this.t += dt;
    const t = this.t;
    const cx = cam.position.x;
    const cz = cam.position.z;
    const cands = [];
    const hums = [];
    for (const f of this.fixtures) {
      if (f.tempT > 0) f.tempT -= dt;
      const v = this.fixtureValue(f, t);
      f.value = v;
      for (const m of f.mats) m.emissiveIntensity = f.emissive * v;
      if (f.cone) {
        f.cone.material.uniforms.intensity.value = f.coneStrength * v;
        f.cone.material.uniforms.time.value = t;
        f.cone.visible = v > 0.02;
      }
      if (v < 0.02) continue;
      const d = Math.hypot(f.x - cx, f.z - cz) + Math.abs(f.y - cam.position.y) * 0.5;
      if (d > 26) continue;
      cands.push({ f, d, v });
      if (f.hum && f.mode !== 'on' && d < 9) hums.push({ pos: { x: f.x, y: f.y, z: f.z }, level: v * (1 - d / 9), d });
    }
    for (const c of this.cones) if (c.material.uniforms.time) c.material.uniforms.time.value = t;
    cands.sort((a, b) => a.d - b.d);
    const reg = regionUniforms.tlnLightRegion.value;
    const n = this.pool.length;
    for (let i = 0; i < n; i++) {
      const L = this.pool[i];
      const c = cands[i];
      if (!c) {
        L.intensity = 0;
        reg[i + 1] = 0;
        continue;
      }
      const fade = 1 - smoothstep(16, 26, c.d);
      L.position.set(c.f.x, c.f.y - 0.12, c.f.z);
      L.color.copy(c.f.color);
      L.intensity = c.f.intensity * c.v * fade;
      L.distance = c.f.range;
      reg[i + 1] = c.f.region;
    }
    // Indirektes Licht der Taschenlampe (Slot 0)
    if (flash) {
      const fl = flash.light;
      if (fl.intensity > 0.1) {
        const dir = flash.dir;
        const w = this.world;
        const tt = w.rayDistance(fl.position.x, fl.position.z, dir.x * 7, dir.z * 7, 1);
        let dist = tt * 7;
        const vy = dir.y;
        if (vy < -0.05) dist = Math.min(dist, (fl.position.y - w.floorAt(fl.position.x, fl.position.z)) / -vy);
        if (vy > 0.05) dist = Math.min(dist, (w.ceilAt(fl.position.x, fl.position.z) - fl.position.y) / vy);
        dist = clamp(dist, 0.3, 7);
        const back = Math.max(0.2, dist - 0.6);
        this.bounce.position.set(fl.position.x + dir.x * back, fl.position.y + dir.y * back, fl.position.z + dir.z * back);
        this.bounce.intensity = (fl.intensity / 72) * 1.3 * (1.2 - dist / 9);
        this.bounce.distance = 4.5;
        reg[0] = w.regionAt(this.bounce.position.x, this.bounce.position.z);
        if (reg[0] === 255) reg[0] = w.regionAt(fl.position.x, fl.position.z);
      } else this.bounce.intensity = 0;
    }
    hums.sort((a, b) => a.d - b.d);
    this.hums = hums.slice(0, 2);
  }

  // Zustand eines Lichtes manuell überschreiben (z.B. Skript-Flackern)
  flickerNear(x, z, radius, duration) {
    for (const f of this.fixtures) {
      if (Math.hypot(f.x - x, f.z - z) < radius) f.tempT = duration;
    }
  }
}
