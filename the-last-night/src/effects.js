// Postprocessing (Bloom, Film-Look, Schadenseffekte, Überwachungskamera-Look) und Staubpartikel.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { DECAL } from './textures.js';

const HorrorShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    resolution: { value: new THREE.Vector2(1, 1) },
    grain: { value: 0.055 },
    vignette: { value: 0.42 },
    damage: { value: 0 },
    danger: { value: 0 },
    lowHealth: { value: 0 },
    fade: { value: 0 },
    cctv: { value: 0 },
    flash: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float time, grain, vignette, damage, danger, lowHealth, fade, cctv, flash;
    uniform vec2 resolution;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 uv = vUv;
      vec2 c = uv - 0.5;
      float r2 = dot(c, c);
      float wob = danger * 0.0025 * sin(time * 7.0 + uv.y * 20.0);
      uv.x += wob;
      if (cctv > 0.5) {
        uv = 0.5 + c * (1.0 + 0.12 * r2);
        float jitter = step(0.985, hash(vec2(floor(time * 12.0), 3.0))) * (hash(vec2(uv.y * 40.0, time)) - 0.5) * 0.03;
        uv.x += jitter;
      }
      float ca = (0.0012 + danger * 0.0035 + damage * 0.008) * (0.4 + r2 * 4.0);
      vec3 col;
      col.r = texture2D(tDiffuse, uv + c * ca).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - c * ca).b;
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      if (cctv > 0.5) {
        float n = hash(uv * resolution + fract(time) * 100.0);
        lum = lum * 1.25 + (n - 0.5) * 0.12;
        float scan = 0.85 + 0.15 * sin(uv.y * resolution.y * 1.4);
        float roll = 0.92 + 0.08 * sin(uv.y * 6.0 - time * 3.0);
        col = vec3(lum * 0.78, lum * 1.0, lum * 0.82) * scan * roll;
        col *= 1.0 - smoothstep(0.18, 0.5, r2) * 0.9;
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) col = vec3(0.0);
      } else {
        col = mix(col, vec3(lum), lowHealth * 0.65);
        float edge = smoothstep(0.05, 0.45, r2);
        col = mix(col, col * vec3(1.25, 0.35, 0.3) + vec3(0.12, 0.0, 0.0), clamp(damage * edge * 1.6 + lowHealth * edge * 0.35, 0.0, 1.0));
        col *= 1.0 - vignette * smoothstep(0.08, 0.62, r2 * (1.0 + danger * 0.6));
        float n = hash(uv * resolution + fract(time * 1.3) * 91.0);
        col += (n - 0.5) * grain * (1.0 + danger * 0.6);
      }
      col += flash;
      col *= 1.0 - fade;
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export class PostFX {
  constructor(renderer, scene, camera, quality) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.build(quality);
  }

  build(q) {
    if (this.composer) this.composer.dispose();
    const r = this.renderer;
    const size = r.getSize(new THREE.Vector2());
    const pr = r.getPixelRatio();
    // HDR-Puffer nur, wenn das Gerät Float-Rendertargets kann (sonst 8-Bit-Fallback)
    const ext = r.extensions;
    const floatOK = ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float');
    this.hdr = floatOK;
    const rt = new THREE.WebGLRenderTarget(Math.max(1, size.x * pr), Math.max(1, size.y * pr), {
      type: floatOK ? THREE.HalfFloatType : THREE.UnsignedByteType,
      samples: q.msaa,
    });
    const composer = new EffectComposer(r, rt);
    this.renderPass = new RenderPass(this.scene, this.camera);
    composer.addPass(this.renderPass);
    if (q.bloom && floatOK) {
      this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.55, 0.55, 0.78);
      composer.addPass(this.bloom);
    } else this.bloom = null;
    composer.addPass(new OutputPass());
    this.horror = new ShaderPass(HorrorShader);
    composer.addPass(this.horror);
    this.composer = composer;
    this.setSize(size.x, size.y);
  }

  setSize(w, h) {
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    const pr = this.renderer.getPixelRatio();
    this.horror.uniforms.resolution.value.set(w * pr, h * pr);
  }

  setCamera(cam) {
    this.renderPass.camera = cam;
  }

  get u() {
    return this.horror.uniforms;
  }

  render(dt) {
    this.u.time.value += dt;
    this.composer.render(dt);
  }
}

// Schwebender Staub, der im Lichtkegel der Taschenlampe glitzert.
export class Dust {
  constructor(scene, count) {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = Math.random() * 10;
      pos[i * 3 + 1] = Math.random() * 4;
      pos[i * 3 + 2] = Math.random() * 10;
      seed[i] = Math.random();
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    this.uniforms = {
      camPos: { value: new THREE.Vector3() },
      flashPos: { value: new THREE.Vector3() },
      flashDir: { value: new THREE.Vector3(0, 0, -1) },
      flashPower: { value: 0 },
      time: { value: 0 },
      map: { value: DECAL.dust },
      scale: { value: 300 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: /* glsl */ `
        attribute float seed;
        uniform vec3 camPos, flashPos, flashDir;
        uniform float flashPower, time, scale;
        varying float vA;
        void main() {
          vec3 box = vec3(10.0, 4.0, 10.0);
          vec3 p = position;
          p += vec3(sin(time * 0.3 + seed * 30.0) * 0.3, sin(time * 0.17 + seed * 17.0) * 0.2 - time * 0.03, cos(time * 0.23 + seed * 11.0) * 0.3);
          vec3 base = camPos - box * 0.5;
          p = mod(p - base, box) + base;
          vec3 d = p - flashPos;
          float dist = length(d);
          float cone = smoothstep(0.84, 0.97, dot(d / max(dist, 0.001), flashDir));
          float atten = 1.0 / (1.0 + dist * dist * 0.15);
          vA = (cone * atten * flashPower * 1.6 + 0.015) * (0.5 + 0.5 * sin(time * 2.0 + seed * 50.0));
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = (0.6 + seed * 1.4) * scale / -mv.z;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D map;
        varying float vA;
        void main() {
          float a = texture2D(map, gl_PointCoord).a;
          gl_FragColor = vec4(vec3(1.0, 0.95, 0.85) * a * vA, 1.0);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 6;
    scene.add(this.points);
  }

  update(dt, camera, flash, power, viewportH) {
    const u = this.uniforms;
    u.time.value += dt;
    u.camPos.value.copy(camera.position);
    u.flashPos.value.copy(flash.position);
    u.flashDir.value.copy(flash.target.position).sub(flash.position).normalize();
    u.flashPower.value = power;
    u.scale.value = viewportH * 0.0065;
  }
}
