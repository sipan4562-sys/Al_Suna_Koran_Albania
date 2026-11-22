// Modell-Fabriken für Requisiten (aus Grundkörpern zusammengesetzt).
import * as THREE from 'three';
import { MAT, emissiveMaterial, decalMaterial } from '../materials.js';
import { DECAL, makeSignTexture } from '../textures.js';
import { mulberry32 } from '../utils.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Verschmilzt die direkten Mesh-Kinder einer Gruppe pro Material (weniger Draw Calls).
export function mergeByMaterial(group, opts = {}) {
  const byMat = new Map();
  for (const c of [...group.children]) {
    if (!c.isMesh || c.userData.keep || c.isSkinnedMesh) continue;
    c.updateMatrix();
    let geo = c.geometry.clone();
    geo.applyMatrix4(c.matrix);
    for (const name of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(name)) geo.deleteAttribute(name);
    if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    if (!geo.index) {
      const idx = [];
      for (let i = 0; i < geo.attributes.position.count; i++) idx.push(i);
      geo.setIndex(idx);
    }
    const key = c.material;
    if (!byMat.has(key)) byMat.set(key, { geos: [], cast: false, recv: false, ud: c.userData });
    const e = byMat.get(key);
    e.geos.push(geo);
    e.cast = e.cast || c.castShadow;
    e.recv = e.recv || c.receiveShadow;
    group.remove(c);
  }
  for (const [mat, e] of byMat) {
    const g = e.geos.length === 1 ? e.geos[0] : mergeGeometries(e.geos, false);
    if (!g) continue;
    const m = new THREE.Mesh(g, mat);
    m.castShadow = opts.cast !== undefined ? opts.cast : e.cast;
    m.receiveShadow = e.recv;
    m.userData = { ...e.ud };
    group.add(m);
  }
  return group;
}

export const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 14),
  cylLo: new THREE.CylinderGeometry(1, 1, 1, 8),
  sphere: new THREE.SphereGeometry(1, 16, 12),
  plane: new THREE.PlaneGeometry(1, 1),
  torus: new THREE.TorusGeometry(1, 0.06, 6, 24),
};

export function part(parent, geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
export const box = (p, mat, w, h, d, x, y, z, ry = 0) => part(p, G.box, mat, x, y, z, w, h, d, 0, ry, 0);
export const cyl = (p, mat, r, h, x, y, z, rx = 0, rz = 0) => part(p, G.cyl, mat, x, y, z, r, h, r, rx, 0, rz);

function root(x, y, z, ry) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  return g;
}

// Achsenparallele Grundfläche nach Drehung (für Kollisionsboxen).
export function footprint(x, z, w, d, ry, pad = 0) {
  const c = Math.abs(Math.cos(ry));
  const s = Math.abs(Math.sin(ry));
  const hw = (w * c + d * s) / 2 + pad;
  const hd = (w * s + d * c) / 2 + pad;
  return { minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd };
}

// --------------------------------------------------------------------------
export function bed(x, y, z, ry, opts = {}) {
  const g = root(x, y, z, ry);
  const rng = mulberry32(opts.seed || 1);
  for (const lx of [-0.45, 0.45])
    for (const lz of [-0.95, 0.95]) cyl(g, MAT.steel, 0.025, 0.5, lx, 0.25, lz);
  for (const lx of [-0.45, 0.45]) box(g, MAT.steel, 0.04, 0.05, 1.95, lx, 0.42, 0);
  box(g, MAT.steel, 0.92, 0.04, 0.04, 0, 0.42, -0.95);
  box(g, MAT.steel, 0.92, 0.04, 0.04, 0, 0.42, 0.95);
  // Kopf- und Fußteil
  for (const [zz, hh] of [[-0.97, 1.05], [0.97, 0.8]]) {
    for (const lx of [-0.45, 0.45]) cyl(g, MAT.steel, 0.025, hh, lx, hh / 2, zz);
    box(g, MAT.steel, 0.92, 0.04, 0.04, 0, hh - 0.02, zz);
    for (let k = -3; k <= 3; k++) cyl(g, MAT.steel, 0.012, hh - 0.5, k * 0.12, 0.45 + (hh - 0.5) / 2, zz);
  }
  const tilt = (rng() - 0.5) * 0.05;
  box(g, MAT.mattress, 0.86, 0.16, 1.88, 0, 0.52, 0, tilt);
  if (!opts.bare) {
    part(g, G.sphere, MAT.sheet, 0, 0.64, -0.75, 0.32, 0.07, 0.17);
    box(g, MAT.sheet, 0.9, 0.04, 1.1, 0.02, 0.62, 0.35, tilt + (rng() - 0.5) * 0.2);
  }
  // Fixiergurte
  for (const zz of [-0.3, 0.45]) box(g, MAT.rubber, 0.95, 0.025, 0.08, 0, 0.61, zz);
  return { group: g, collider: footprint(x, z, 0.96, 2.0, ry, 0.02) };
}

export function locker(x, y, z, ry) {
  const g = root(x, y, z, ry);
  // Rückwand + Seiten + Dach (Tür separat, dynamisch)
  box(g, MAT.locker, 0.6, 1.95, 0.04, 0, 0.975, -0.23);
  box(g, MAT.locker, 0.03, 1.95, 0.5, -0.285, 0.975, 0);
  box(g, MAT.locker, 0.03, 1.95, 0.5, 0.285, 0.975, 0);
  box(g, MAT.locker, 0.6, 0.04, 0.5, 0, 1.93, 0);
  box(g, MAT.locker, 0.6, 0.08, 0.5, 0, 0.04, 0);
  box(g, MAT.locker, 0.54, 0.02, 0.44, 0, 1.6, -0.01);
  // Tür
  const pivot = new THREE.Group();
  pivot.position.set(-0.28, 0, 0.245);
  g.add(pivot);
  const door = new THREE.Group();
  pivot.add(door);
  const panel = box(door, MAT.locker, 0.56, 1.86, 0.025, 0.28, 0.97, 0);
  panel.userData.dynamic = true;
  for (let k = 0; k < 6; k++) {
    const s = box(door, MAT.black, 0.36, 0.022, 0.01, 0.28, 1.55 + k * 0.05, 0.014);
    s.userData.dynamic = true;
    s.castShadow = false;
  }
  const h = box(door, MAT.steel, 0.03, 0.12, 0.03, 0.5, 1.0, 0.03);
  h.userData.dynamic = true;
  door.traverse((o) => (o.userData.dynamic = true));
  return { group: g, pivot, collider: footprint(x, z, 0.62, 0.52, ry, 0.0) };
}

export function desk(x, y, z, ry, opts = {}) {
  const g = root(x, y, z, ry);
  const w = opts.w || 1.4;
  const d = opts.d || 0.7;
  box(g, opts.mat || MAT.deskWood, w, 0.05, d, 0, 0.76, 0);
  for (const lx of [-w / 2 + 0.05, w / 2 - 0.05])
    for (const lz of [-d / 2 + 0.05, d / 2 - 0.05]) box(g, MAT.steel, 0.04, 0.74, 0.04, lx, 0.37, lz);
  box(g, opts.mat || MAT.deskWood, 0.45, 0.6, d - 0.05, w / 2 - 0.25, 0.43, 0);
  for (let k = 0; k < 3; k++) box(g, MAT.steel, 0.12, 0.02, 0.02, w / 2 - 0.25, 0.65 - k * 0.19, d / 2 - 0.01);
  return { group: g, collider: footprint(x, z, w, d, ry) };
}

export function chair(x, y, z, ry, fallen = false) {
  const g = root(x, y, z, ry);
  const inner = new THREE.Group();
  g.add(inner);
  if (fallen) {
    inner.rotation.x = -Math.PI / 2;
    inner.position.y = 0.22;
    inner.position.z = 0.25;
  }
  box(inner, MAT.darkWood, 0.44, 0.04, 0.42, 0, 0.46, 0);
  box(inner, MAT.darkWood, 0.44, 0.42, 0.03, 0, 0.7, -0.2);
  for (const lx of [-0.19, 0.19])
    for (const lz of [-0.18, 0.18]) box(inner, MAT.steel, 0.025, 0.46, 0.025, lx, 0.23, lz);
  return { group: g, collider: fallen ? null : footprint(x, z, 0.44, 0.44, ry) };
}

export function wheelchair(x, y, z, ry) {
  const g = root(x, y, z, ry);
  for (const s of [-1, 1]) {
    part(g, G.torus, MAT.rubber, s * 0.3, 0.3, 0, 0.3, 0.3, 0.3, 0, Math.PI / 2, 0);
    cyl(g, MAT.steel, 0.008, 0.6, s * 0.3, 0.3, 0, Math.PI / 2, 0);
    part(g, G.torus, MAT.rubber, s * 0.22, 0.07, 0.38, 0.07, 0.07, 0.07, 0, Math.PI / 2, 0);
    box(g, MAT.steel, 0.025, 0.55, 0.025, s * 0.24, 0.65, -0.18);
    box(g, MAT.steel, 0.025, 0.025, 0.5, s * 0.24, 0.62, 0.05);
  }
  box(g, MAT.mattress, 0.46, 0.05, 0.44, 0, 0.5, 0.02);
  box(g, MAT.mattress, 0.46, 0.42, 0.04, 0, 0.75, -0.2, 0.08);
  return { group: g, collider: footprint(x, z, 0.7, 0.8, ry) };
}

export function gurney(x, y, z, ry, body = false) {
  const g = root(x, y, z, ry);
  for (const lx of [-0.3, 0.3])
    for (const lz of [-0.85, 0.85]) {
      cyl(g, MAT.steel, 0.02, 0.75, lx, 0.4, lz);
      cyl(g, MAT.rubber, 0.04, 0.03, lx, 0.04, lz, 0, Math.PI / 2);
    }
  box(g, MAT.steel, 0.66, 0.04, 1.85, 0, 0.78, 0);
  box(g, MAT.steel, 0.66, 0.02, 1.85, 0, 0.25, 0);
  box(g, MAT.mattress, 0.6, 0.06, 1.8, 0, 0.83, 0);
  if (body) {
    part(g, G.sphere, MAT.sheet, 0, 0.95, -0.65, 0.13, 0.11, 0.14);
    part(g, G.sphere, MAT.sheet, 0, 0.93, -0.15, 0.24, 0.1, 0.42);
    part(g, G.sphere, MAT.sheet, 0, 0.92, 0.5, 0.2, 0.08, 0.38);
    box(g, MAT.sheet, 0.64, 0.02, 1.86, 0, 0.87, 0);
  }
  return { group: g, collider: footprint(x, z, 0.7, 1.9, ry) };
}

export function cabinet(x, y, z, ry, opts = {}) {
  const g = root(x, y, z, ry);
  const h = opts.h || 1.3;
  box(g, opts.mat || MAT.metalPaint, 0.5, h, 0.6, 0, h / 2, 0);
  const n = Math.round(h / 0.33);
  for (let k = 0; k < n; k++) {
    box(g, MAT.black, 0.46, 0.01, 0.01, 0, 0.33 * (k + 1) - 0.02, 0.3);
    box(g, MAT.steel, 0.12, 0.025, 0.03, 0, 0.33 * k + 0.2, 0.31);
  }
  return { group: g, collider: footprint(x, z, 0.52, 0.62, ry) };
}

export function shelf(x, y, z, ry, opts = {}) {
  const g = root(x, y, z, ry);
  const rng = mulberry32(opts.seed || 3);
  const w = opts.w || 1.0;
  for (const lx of [-w / 2, w / 2])
    for (const lz of [-0.2, 0.2]) box(g, MAT.steel, 0.03, 2.0, 0.03, lx, 1.0, lz);
  for (let k = 0; k < 4; k++) {
    const yy = 0.15 + k * 0.58;
    box(g, MAT.metalPaint, w, 0.025, 0.44, 0, yy, 0);
    let px = -w / 2 + 0.08;
    while (px < w / 2 - 0.15) {
      const t = rng();
      const bw = 0.12 + rng() * 0.25;
      if (t < 0.45) box(g, MAT.deskWood, bw, 0.12 + rng() * 0.2, 0.3, px + bw / 2, yy + 0.12, 0, (rng() - 0.5) * 0.3);
      else if (t < 0.7) {
        cyl(g, MAT.bottle, 0.035, 0.22, px + 0.04, yy + 0.12, (rng() - 0.5) * 0.2);
      } else if (t < 0.85) box(g, MAT.sheet, bw, 0.08, 0.3, px + bw / 2, yy + 0.05, 0);
      px += bw + 0.03;
    }
  }
  return { group: g, collider: footprint(x, z, w + 0.06, 0.46, ry) };
}

export function bookshelf(x, y, z, ry, opts = {}) {
  const g = root(x, y, z, ry);
  const rng = mulberry32(opts.seed || 17);
  const w = opts.w || 1.0;
  const mats = [MAT.redPaint, MAT.darkWood, MAT.deskWood, MAT.cloth, MAT.locker];
  box(g, MAT.darkWood, w, 2.2, 0.05, 0, 1.1, -0.17);
  box(g, MAT.darkWood, 0.04, 2.2, 0.38, -w / 2, 1.1, 0);
  box(g, MAT.darkWood, 0.04, 2.2, 0.38, w / 2, 1.1, 0);
  const bookBoxes = [];
  for (let k = 0; k < 5; k++) {
    const yy = 0.05 + k * 0.44;
    box(g, MAT.darkWood, w, 0.03, 0.36, 0, yy, 0);
    let px = -w / 2 + 0.04;
    while (px < w / 2 - 0.06) {
      const bw = 0.03 + rng() * 0.05;
      const bh = 0.24 + rng() * 0.12;
      if (rng() > 0.08) {
        const b = box(g, mats[(rng() * mats.length) | 0], bw, bh, 0.24, px + bw / 2, yy + bh / 2 + 0.015, 0.02, 0);
        bookBoxes.push(b);
      }
      px += bw + 0.004;
    }
  }
  return { group: g, collider: footprint(x, z, w, 0.4, ry), books: bookBoxes };
}

export function crate(x, y, z, ry, s = 0.7) {
  const g = root(x, y, z, ry);
  box(g, MAT.deskWood, s, s, s, 0, s / 2, 0);
  for (const yy of [0.05, s - 0.05]) box(g, MAT.darkWood, s + 0.02, 0.06, s + 0.02, 0, yy, 0);
  return { group: g, collider: footprint(x, z, s, s, ry) };
}

export function barrel(x, y, z) {
  const g = root(x, y, z, 0);
  cyl(g, MAT.rust, 0.3, 0.9, 0, 0.45, 0);
  for (const yy of [0.15, 0.75]) cyl(g, MAT.steel, 0.31, 0.04, 0, yy, 0);
  return { group: g, collider: footprint(x, z, 0.6, 0.6, 0) };
}

export function ivStand(x, y, z) {
  const g = root(x, y, z, 0);
  cyl(g, MAT.steel, 0.012, 1.8, 0, 0.9, 0);
  for (let k = 0; k < 4; k++) box(g, MAT.steel, 0.3, 0.02, 0.02, 0, 0.04, 0, (k * Math.PI) / 4);
  box(g, MAT.steel, 0.3, 0.015, 0.015, 0, 1.78, 0);
  part(g, G.sphere, MAT.glass, 0.12, 1.6, 0, 0.06, 0.1, 0.03);
  return { group: g, collider: null };
}

export function sink(x, y, z, ry) {
  const g = root(x, y, z, ry);
  box(g, MAT.porcelain, 0.55, 0.18, 0.42, 0, 0.82, 0);
  box(g, MAT.black, 0.42, 0.02, 0.3, 0, 0.915, 0.02);
  cyl(g, MAT.steel, 0.015, 0.18, 0, 1.0, -0.15);
  box(g, MAT.steel, 0.02, 0.02, 0.12, 0, 1.08, -0.1);
  cyl(g, MAT.porcelain, 0.07, 0.7, 0, 0.36, -0.08);
  // Spiegel
  const mirror = new THREE.MeshStandardMaterial({ color: 0x3a403e, roughness: 0.15, metalness: 0.9 });
  box(g, mirror, 0.45, 0.6, 0.02, 0, 1.55, -0.2);
  return { group: g, collider: footprint(x, z, 0.55, 0.42, ry) };
}

export function bathtub(x, y, z, ry) {
  const g = root(x, y, z, ry);
  box(g, MAT.porcelain, 0.8, 0.55, 1.75, 0, 0.3, 0);
  box(g, MAT.porcelain, 0.86, 0.06, 1.81, 0, 0.6, 0);
  const water = new THREE.MeshStandardMaterial({ color: 0x1b1d12, roughness: 0.04, metalness: 0.2 });
  box(g, water, 0.68, 0.02, 1.6, 0, 0.5, 0);
  for (const zz of [-0.4, 0.3]) box(g, MAT.rubber, 0.9, 0.03, 0.08, 0, 0.63, zz);
  for (const lx of [-0.32, 0.32])
    for (const lz of [-0.75, 0.75]) part(g, G.sphere, MAT.steel, lx, 0.04, lz, 0.06, 0.05, 0.06);
  return { group: g, collider: footprint(x, z, 0.88, 1.82, ry) };
}

export function orTable(x, y, z, ry) {
  const g = root(x, y, z, ry);
  cyl(g, MAT.steel, 0.12, 0.8, 0, 0.4, 0);
  box(g, MAT.steel, 0.6, 0.06, 0.9, 0, 0.04, 0);
  box(g, MAT.steel, 0.62, 0.08, 1.95, 0, 0.84, 0);
  box(g, MAT.sheet, 0.66, 0.06, 2.0, 0, 0.9, 0);
  part(g, G.sphere, MAT.sheet, 0, 1.0, -0.6, 0.15, 0.1, 0.15);
  part(g, G.sphere, MAT.sheet, 0, 0.98, 0.0, 0.25, 0.1, 0.5);
  for (const zz of [-0.3, 0.4, 0.8]) box(g, MAT.rubber, 0.72, 0.03, 0.07, 0, 0.97, zz);
  return { group: g, collider: footprint(x, z, 0.66, 2.0, ry) };
}

export function trolley(x, y, z, ry) {
  const g = root(x, y, z, ry);
  for (const lx of [-0.25, 0.25])
    for (const lz of [-0.18, 0.18]) cyl(g, MAT.steel, 0.012, 0.9, lx, 0.45, lz);
  box(g, MAT.steel, 0.56, 0.02, 0.42, 0, 0.9, 0);
  box(g, MAT.steel, 0.56, 0.02, 0.42, 0, 0.35, 0);
  const rng = mulberry32(8);
  for (let k = 0; k < 6; k++)
    box(g, MAT.steel, 0.15, 0.008, 0.015, (rng() - 0.5) * 0.4, 0.915, (rng() - 0.5) * 0.3, rng() * 3);
  return { group: g, collider: footprint(x, z, 0.56, 0.42, ry) };
}

export function bench(x, y, z, ry) {
  const g = root(x, y, z, ry);
  box(g, MAT.darkWood, 1.8, 0.05, 0.42, 0, 0.45, 0);
  box(g, MAT.darkWood, 1.8, 0.35, 0.04, 0, 0.7, -0.2, 0);
  for (const lx of [-0.8, 0.8]) box(g, MAT.steel, 0.05, 0.45, 0.4, lx, 0.22, 0);
  return { group: g, collider: footprint(x, z, 1.8, 0.45, ry) };
}

export function table(x, y, z, ry) {
  const g = root(x, y, z, ry);
  box(g, MAT.metalWhite, 1.3, 0.04, 0.8, 0, 0.74, 0);
  for (const lx of [-0.58, 0.58]) for (const lz of [-0.33, 0.33]) box(g, MAT.steel, 0.04, 0.72, 0.04, lx, 0.36, lz);
  return { group: g, collider: footprint(x, z, 1.3, 0.8, ry) };
}

export function receptionDesk(x, y, z, ry) {
  const g = root(x, y, z, ry);
  box(g, MAT.darkWood, 3.2, 1.1, 0.6, 0, 0.55, 0);
  box(g, MAT.marble, 3.3, 0.05, 0.7, 0, 1.12, 0);
  box(g, MAT.darkWood, 0.6, 1.1, 1.6, 1.3, 0.55, -1.0);
  box(g, MAT.deskWood, 2.6, 0.04, 0.5, 0, 0.75, -0.5);
  return {
    group: g,
    colliders: [footprint(x, z, 3.2, 0.6, ry), footprint(x + Math.cos(ry) * 1.3 + Math.sin(ry) * -1.0, z - Math.sin(ry) * 1.3 + Math.cos(ry) * -1.0, 0.6, 1.6, ry)],
  };
}

export function crt(parent, x, y, z, ry, screenMat, s = 1) {
  const g = root(x, y, z, ry);
  box(g, MAT.plastic, 0.5 * s, 0.42 * s, 0.45 * s, 0, 0.21 * s, -0.05 * s);
  box(g, MAT.plastic, 0.36 * s, 0.32 * s, 0.25 * s, 0, 0.2 * s, -0.35 * s);
  const scr = new THREE.Mesh(G.plane, screenMat);
  scr.scale.set(0.42 * s, 0.32 * s, 1);
  scr.position.set(0, 0.22 * s, 0.176 * s);
  scr.userData.dynamic = true;
  scr.userData.keep = true;
  scr.castShadow = false;
  g.add(scr);
  mergeByMaterial(g);
  parent.add(g);
  return { group: g, screen: scr };
}

export function boiler(x, y, z) {
  const g = root(x, y, z, 0);
  cyl(g, MAT.rust, 0.9, 2.6, 0, 1.3, 0);
  cyl(g, MAT.steel, 0.95, 0.1, 0, 2.6, 0);
  cyl(g, MAT.steel, 0.95, 0.1, 0, 0.05, 0);
  cyl(g, MAT.rust, 0.12, 1.2, 0, 3.2, 0);
  cyl(g, MAT.rust, 0.1, 1.6, 0.9, 1.8, 0, 0, Math.PI / 2);
  part(g, G.cyl, MAT.porcelain, 0, 1.6, 0.92, 0.12, 0.03, 0.12, Math.PI / 2, 0, 0);
  return { group: g, collider: footprint(x, z, 1.9, 1.9, 0) };
}

export function generatorMachine(x, y, z, ry) {
  const g = root(x, y, z, ry);
  box(g, MAT.locker, 2.4, 1.4, 1.2, 0, 0.75, 0);
  box(g, MAT.steel, 2.5, 0.1, 1.3, 0, 0.05, 0);
  cyl(g, MAT.rust, 0.45, 1.3, -0.4, 1.6, 0, 0, Math.PI / 2);
  cyl(g, MAT.rust, 0.12, 1.6, 0.9, 2.2, -0.3);
  for (let k = 0; k < 8; k++) box(g, MAT.black, 0.02, 0.6, 1.0, -1.0 + k * 0.08, 0.8, 0.0);
  box(g, MAT.yellow, 0.6, 0.4, 0.04, 0.7, 1.1, 0.61);
  return { group: g, collider: footprint(x, z, 2.5, 1.3, ry) };
}

export function pipeRun(group, x0, z0, x1, z1, y, r = 0.08, mat = MAT.rust) {
  const dx = x1 - x0;
  const dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  const m = part(group, G.cylLo, mat, (x0 + x1) / 2, y, (z0 + z1) / 2, r, len, r, 0, 0, Math.PI / 2);
  m.rotation.set(0, -Math.atan2(dz, dx), Math.PI / 2, 'YXZ');
  m.castShadow = false;
  return m;
}

export function boardedWindow(x, y, z, ry) {
  const g = root(x, y, z, ry);
  box(g, MAT.darkWood, 1.3, 0.08, 0.12, 0, 0.0, 0);
  box(g, MAT.darkWood, 1.3, 0.08, 0.12, 0, 1.4, 0);
  box(g, MAT.darkWood, 0.08, 1.48, 0.12, -0.61, 0.7, 0);
  box(g, MAT.darkWood, 0.08, 1.48, 0.12, 0.61, 0.7, 0);
  const sky = new THREE.MeshBasicMaterial({ color: 0x223048 });
  const back = new THREE.Mesh(G.plane, sky);
  back.scale.set(1.2, 1.35, 1);
  back.position.set(0, 0.7, -0.05);
  g.add(back);
  const rng = mulberry32(Math.floor(x * 13 + z * 7));
  for (let k = 0; k < 5; k++) {
    const p = box(g, MAT.deskWood, 1.5, 0.16, 0.04, 0, 0.12 + k * 0.29 + (rng() - 0.5) * 0.06, 0.07);
    p.rotation.z = (rng() - 0.5) * 0.25;
  }
  return { group: g };
}

export function securityCamera(x, y, z, ry, pitch = 0.4) {
  const g = root(x, y, z, ry);
  box(g, MAT.plastic, 0.08, 0.08, 0.25, 0, 0, -0.12);
  const head = new THREE.Group();
  head.rotation.x = pitch;
  g.add(head);
  box(head, MAT.plastic, 0.14, 0.12, 0.3, 0, -0.06, 0.05);
  cyl(head, MAT.black, 0.04, 0.04, 0, -0.06, 0.21, Math.PI / 2);
  const led = new THREE.Mesh(G.sphere, emissiveMaterial(0xff2010, 3));
  led.scale.setScalar(0.012);
  led.position.set(0.05, -0.01, 0.2);
  head.add(led);
  return { group: g };
}

export function sign(text, sub, opts = {}) {
  const tex = makeSignTexture(sub ? [text, sub] : [text], opts);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, emissive: opts.emissive ? 0xffffff : 0x000000, emissiveMap: opts.emissive ? tex : null, emissiveIntensity: opts.emissive || 0 });
  const m = new THREE.Mesh(G.plane, mat);
  m.scale.set(opts.sw || 0.5, opts.sh || 0.125, 1);
  m.castShadow = false;
  m.receiveShadow = false;
  return m;
}

export function decal(tex, w, h, opts = {}) {
  const m = new THREE.Mesh(G.plane, decalMaterial(tex, opts));
  m.scale.set(w, h, 1);
  m.receiveShadow = true;
  m.renderOrder = 2;
  return m;
}

const PAPER_MATS = [];
export function papers(group, cx, y, cz, n, seed, spread = 1.2) {
  const rng = mulberry32(seed);
  if (!PAPER_MATS.length) {
    for (let k = 0; k < 3; k++)
      PAPER_MATS.push(
        decalMaterial(DECAL.paper[k], { roughness: 0.95 }),
      );
  }
  for (let k = 0; k < n; k++) {
    const m = new THREE.Mesh(G.plane, PAPER_MATS[k % 3]);
    m.scale.set(0.21, 0.29, 1);
    m.rotation.set(-Math.PI / 2, 0, rng() * Math.PI * 2);
    m.position.set(cx + (rng() - 0.5) * spread, y + 0.005 + k * 0.0015, cz + (rng() - 0.5) * spread);
    m.receiveShadow = true;
    m.castShadow = false;
    group.add(m);
  }
}
