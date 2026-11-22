// Überwachungskameras: echte Live-Bilder der 3D-Welt auf Monitoren + Vollbild-Kameramodus.
import * as THREE from 'three';
import { securityCamera, crt, mergeByMaterial } from './level/props.js';

export const CAMS = [
  { id: 1, name: 'KAM 1 · HAUPTFLUR OST', pos: [46.75, 2.72, 20.4], look: [30, 1.0, 21.7] },
  { id: 2, name: 'KAM 2 · EINGANGSHALLE', pos: [13.3, 3.95, 24.3], look: [19.5, 0.6, 31.5] },
  { id: 3, name: 'KAM 3 · ISOLATION 2', pos: [25.3, 2.5, 9.3], look: [29, 1.3, 10.8] },
  { id: 4, name: 'KAM 4 · KELLER HAUPTGANG', pos: [57.5, -1.32, 40.75], look: [57.5, -3.0, 25] },
];

const screenFS = /* glsl */ `
uniform sampler2D map;
uniform float time;
uniform float on;
uniform float useMap;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec2 uv = vUv;
  float n = hash(floor(uv * vec2(220.0, 160.0)) + fract(time * 7.0) * 61.0);
  float l;
  if (useMap > 0.5) {
    vec3 c = texture2D(map, uv).rgb;
    l = dot(c, vec3(0.3, 0.59, 0.11)) * 1.8 + (n - 0.5) * 0.12;
  } else {
    l = n * 0.8 + 0.1 * sin(uv.y * 40.0 + time * 20.0);
  }
  float scan = 0.78 + 0.22 * sin(uv.y * 520.0);
  vec2 d = uv - 0.5;
  vec3 col = vec3(l * 0.78, l, l * 0.84) * scan * (1.0 - dot(d, d) * 1.6);
  gl_FragColor = vec4(col * on * 1.4, 1.0);
}`;
const screenVS = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

export function screenMaterial(tex) {
  return new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, time: { value: 0 }, on: { value: 1 }, useMap: { value: tex ? 1 : 0 } },
    vertexShader: screenVS,
    fragmentShader: screenFS,
  });
}

export class Surveillance {
  constructor(game) {
    this.game = game;
    this.cams = [];
    this.targets = [];
    this.mats = [];
    this.next = 0;
    this.active = false;
    for (const c of CAMS) {
      const cam = new THREE.PerspectiveCamera(62, 4 / 3, 0.1, 45);
      const dir = new THREE.Vector3(c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]).normalize();
      cam.position.set(...c.pos).addScaledVector(dir, 0.32);
      cam.lookAt(new THREE.Vector3(...c.look));
      cam.userData.def = c;
      this.cams.push(cam);
      const dx = c.look[0] - c.pos[0];
      const dy = c.look[1] - c.pos[1];
      const dz = c.look[2] - c.pos[2];
      const ry = Math.atan2(dx, dz);
      const pitch = Math.atan2(-dy, Math.hypot(dx, dz));
      const prop = securityCamera(c.pos[0], c.pos[1] + 0.06, c.pos[2], ry, pitch);
      prop.group.traverse((o) => o.isGroup && mergeByMaterial(o, { cast: false }));
      game.scene.add(prop.group);
      cam.userData.prop = prop.group;
      const floatOK = game.renderer.extensions.has('EXT_color_buffer_float') || game.renderer.extensions.has('EXT_color_buffer_half_float');
      const rt = new THREE.WebGLRenderTarget(256, 192, { type: floatOK ? THREE.HalfFloatType : THREE.UnsignedByteType });
      this.targets.push(rt);
      this.mats.push(screenMaterial(rt.texture));
    }
    // Monitore im Überwachungsraum
    (game.monitorSlots || []).forEach((p, i) => {
      crt(game.scene, p[0], p[1], p[2], 0, this.mats[i % this.mats.length], 0.85);
    });
    this.fill = new THREE.HemisphereLight(0x9fb0a0, 0x303830, 0);
    game.scene.add(this.fill);
    this.desk = new THREE.Vector3(8.5, 1, 15.6);
  }

  // Während der Kamera-Renderings: Restlichtverstärkung (Nachtsicht)
  nightVision(on) {
    if (on === !!this._nv) return;
    this._nv = on;
    this.fill.intensity = on ? 2.4 : 0;
    const fog = this.game.scene.fog;
    if (on) {
      this._fog = fog.density;
      fog.density *= 0.45;
    } else fog.density = this._fog;
  }

  update(dt, renderer) {
    for (const m of this.mats) m.uniforms.time.value += dt;
    const g = this.game;
    const near = g.camera.position.distanceTo(this.desk) < 7 && Math.abs(g.camera.position.y - 1.5) < 2;
    this.active = near;
    if (!near || !g.quality.feeds) return;
    const i = this.next++ % this.cams.length;
    const cam = this.cams[i];
    this.nightVision(true);
    g.applyCulling(cam.position.x, cam.position.z);
    cam.userData.prop.visible = false;
    const prevTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(this.targets[i]);
    renderer.clear();
    renderer.render(g.scene, cam);
    renderer.setRenderTarget(prevTarget);
    this.nightVision(false);
    g.applyCulling(g.camera.position.x, g.camera.position.z);
  }
}
