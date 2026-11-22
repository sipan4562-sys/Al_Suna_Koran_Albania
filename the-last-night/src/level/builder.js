// Erzeugt die Architektur (Böden, Wände, Decken, Treppen) aus dem Raster
// und fasst statische Geometrie pro Material und Bereich zusammen.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ZONES, STAIRS } from './layout.js';
import { stairHeight } from './world.js';
import { MAT } from '../materials.js';

const CHUNK = 16;
const UV_SCALE = { ceilingTiles: 2.4, concrete: 3, concreteWet: 3, concreteWall: 3, plaster: 2.5 };

class GeoBucket {
  constructor() {
    this.pos = [];
    this.nor = [];
    this.uv = [];
    this.idx = [];
  }
  quad(a, b, c, d, n, ua, ub, uc, ud) {
    const base = this.pos.length / 3;
    this.pos.push(...a, ...b, ...c, ...d);
    for (let k = 0; k < 4; k++) this.nor.push(n[0], n[1], n[2]);
    this.uv.push(...ua, ...ub, ...uc, ...ud);
    this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  toGeometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

export function buildArchitecture(world, scene) {
  const buckets = new Map();
  // Region der Zelle (für raumbasiertes Culling); Türzellen gehören zu beiden Seiten
  const cellRegions = (x, z) => {
    const i = world.idx(x, z);
    const r = world.region[i];
    if (r !== 255) return [r];
    const out = new Set();
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!world.inBounds(x + dx, z + dz)) continue;
      const rr = world.region[world.idx(x + dx, z + dz)];
      if (!world.solid[world.idx(x + dx, z + dz)] && rr !== 255) out.add(rr);
    }
    return out.size ? [...out].sort((a, b) => a - b) : [255];
  };
  const bucket = (mat, x, z, kind) => {
    const regs = cellRegions(x, z);
    const key = `${mat}|${kind}|${regs.join('_')}|${Math.floor(x / CHUNK)}_${Math.floor(z / CHUNK)}`;
    let b = buckets.get(key);
    if (!b) {
      b = new GeoBucket();
      b.mat = mat;
      b.kind = kind;
      b.regions = regs;
      buckets.set(key, b);
    }
    return b;
  };

  const { W, H } = world;
  const floorEdge = (i, x, z) => (world.zone[i] === 'stairs' ? stairHeight(x) : world.floorY[i]);
  const ceilEdge = (i, x, z) => (world.zone[i] === 'stairs' ? stairHeight(x) + 3 : world.ceilY[i]);

  // Richtungen: dx, dz, Kante (Start/Ende), Normale in die Zelle
  const DIRS = [
    { dx: 1, dz: 0, e: (x, z) => [x + 1, z + 1, x + 1, z], n: [-1, 0, 0] },
    { dx: -1, dz: 0, e: (x, z) => [x, z, x, z + 1], n: [1, 0, 0] },
    { dx: 0, dz: 1, e: (x, z) => [x, z + 1, x + 1, z + 1], n: [0, 0, -1] },
    { dx: 0, dz: -1, e: (x, z) => [x + 1, z, x, z], n: [0, 0, 1] },
  ];

  for (let z = 0; z < H; z++) {
    for (let x = 0; x < W; x++) {
      const i = world.idx(x, z);
      if (world.solid[i]) continue;
      const zoneKey = world.zone[i];
      const Z = ZONES[zoneKey];
      const isDoor = world.doorCell[i] === 1;
      const fy = world.floorY[i];
      const cy = world.ceilY[i];
      const fs = UV_SCALE[Z.floor] || 2;
      const cs = UV_SCALE[Z.ceil] || 2;

      // Boden
      if (zoneKey === 'stairs') {
        const b = bucket('concrete', x, z, 'floor');
        for (let j = 0; j < 2; j++) {
          const k = (x - STAIRS.x0) * 2 + j;
          const top = -0.25 * k;
          const xa = x + j * 0.5;
          const xb = xa + 0.5;
          b.quad([xa, top, z], [xa, top, z + 1], [xb, top, z + 1], [xb, top, z], [0, 1, 0],
            [xa / 2, z / 2], [xa / 2, (z + 1) / 2], [xb / 2, (z + 1) / 2], [xb / 2, z / 2]);
          const low = top - 0.25;
          b.quad([xb, top, z], [xb, top, z + 1], [xb, low, z + 1], [xb, low, z], [1, 0, 0],
            [z / 2, top / 2], [(z + 1) / 2, top / 2], [(z + 1) / 2, low / 2], [z / 2, low / 2]);
        }
      } else {
        const b = bucket(Z.floor, x, z, 'floor');
        b.quad([x, fy, z], [x, fy, z + 1], [x + 1, fy, z + 1], [x + 1, fy, z], [0, 1, 0],
          [x / fs, z / fs], [x / fs, (z + 1) / fs], [(x + 1) / fs, (z + 1) / fs], [(x + 1) / fs, z / fs]);
      }

      // Decke
      {
        const ceilMat = isDoor ? 'plaster' : Z.ceil;
        const b = bucket(ceilMat, x, z, 'ceil');
        const c0 = ceilEdge(i, x, z);
        const c1 = ceilEdge(i, x + 1, z);
        b.quad([x, c0, z], [x + 1, c1, z], [x + 1, c1, z + 1], [x, c0, z + 1], [0, -1, 0],
          [x / cs, z / cs], [(x + 1) / cs, z / cs], [(x + 1) / cs, (z + 1) / cs], [x / cs, (z + 1) / cs]);
      }

      // Wände und Stürze
      for (const d of DIRS) {
        const nx = x + d.dx;
        const nz = z + d.dz;
        const inB = world.inBounds(nx, nz);
        const j = inB ? world.idx(nx, nz) : -1;
        const nSolid = !inB || world.solid[j] === 1;
        const [ax, az, bx, bz] = d.e(x, z);
        const wallMat = isDoor ? 'plaster' : Z.wall;
        const wh = isDoor ? 2 : Z.wallH;
        const ws = UV_SCALE[wallMat] || 2;
        const baseY = zoneKey === 'stairs' ? 0 : fy;
        const along = d.dx !== 0 ? [az, bz] : [ax, bx];
        const ua = along[0] / ws;
        const ub = along[1] / ws;
        if (nSolid) {
          const fa = floorEdge(i, ax, az) - (zoneKey === 'stairs' ? 0.3 : 0);
          const fb = floorEdge(i, bx, bz) - (zoneKey === 'stairs' ? 0.3 : 0);
          const ca = ceilEdge(i, ax, az);
          const cb = ceilEdge(i, bx, bz);
          const b = bucket(wallMat, x, z, 'wall');
          b.quad([ax, fa, az], [ax, ca, az], [bx, cb, bz], [bx, fb, bz], d.n,
            [ua, (fa - baseY) / wh], [ua, (ca - baseY) / wh], [ub, (cb - baseY) / wh], [ub, (fb - baseY) / wh]);
        } else {
          // Sturz, wenn die Nachbardecke niedriger ist
          const myA = ceilEdge(i, ax, az);
          const myB = ceilEdge(i, bx, bz);
          const nA = ceilEdge(j, ax, az);
          const nB = ceilEdge(j, bx, bz);
          if (nA < myA - 0.01 || nB < myB - 0.01) {
            const hm = Z.wall;
            const hh = Z.wallH;
            const b = bucket(isDoor ? 'plaster' : hm, x, z, 'wall');
            b.quad([ax, nA, az], [ax, myA, az], [bx, myB, bz], [bx, nB, bz], d.n,
              [ua, (nA - baseY) / hh], [ua, (myA - baseY) / hh], [ub, (myB - baseY) / hh], [ub, (nB - baseY) / hh]);
          }
          // Stufe nach oben (falls Nachbarboden höher)
          const nfA = floorEdge(j, ax, az);
          const nfB = floorEdge(j, bx, bz);
          const mfA = floorEdge(i, ax, az);
          const mfB = floorEdge(i, bx, bz);
          if (zoneKey !== 'stairs' && world.zone[j] !== 'stairs' && (nfA > mfA + 0.01 || nfB > mfB + 0.01)) {
            const b = bucket('concreteWall', x, z, 'wall');
            b.quad([ax, mfA, az], [ax, nfA, az], [bx, nfB, bz], [bx, mfB, bz], d.n,
              [ua, 0], [ua, 0.2], [ub, 0.2], [ub, 0]);
          }
        }
      }
    }
  }

  const group = new THREE.Group();
  group.name = 'architecture';
  for (const b of buckets.values()) {
    const mesh = new THREE.Mesh(b.toGeometry(), MAT[b.mat]);
    mesh.userData.regions = b.regions;
    mesh.castShadow = b.kind === 'wall';
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    group.add(mesh);
  }
  scene.add(group);
  return group;
}

// Sammelt statische Requisiten und verschmilzt sie pro Material/Bereich.
export class StaticBatcher {
  constructor(regionOf) {
    this.items = new Map();
    this.regionOf = regionOf;
  }
  add(object) {
    object.updateMatrixWorld(true);
    object.traverse((o) => {
      if (!o.isMesh || o.userData.dynamic) return;
      const g = o.geometry.index ? o.geometry.clone() : o.geometry.clone();
      g.applyMatrix4(o.matrixWorld);
      for (const name of Object.keys(g.attributes)) {
        if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
      }
      if (!g.attributes.uv) {
        g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      }
      const geo = g.index ? g : indexify(g);
      g.computeBoundingBox();
      const c = new THREE.Vector3();
      g.boundingBox.getCenter(c);
      const regs = this.regionOf ? this.regionOf(c.x, c.z) : [255];
      const key = `${o.material.uuid}|${o.castShadow ? 1 : 0}|${regs.join('_')}|${Math.floor(c.x / CHUNK)}_${Math.floor(c.z / CHUNK)}`;
      let it = this.items.get(key);
      if (!it) {
        it = { material: o.material, geos: [], cast: o.castShadow, regions: regs };
        this.items.set(key, it);
      }
      it.geos.push(geo);
    });
  }
  build(scene) {
    const group = new THREE.Group();
    group.name = 'props-static';
    for (const it of this.items.values()) {
      const merged = mergeGeometries(it.geos, false);
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, it.material);
      mesh.userData.regions = it.regions;
      mesh.castShadow = it.cast;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      group.add(mesh);
    }
    scene.add(group);
    this.items.clear();
    return group;
  }
}

function indexify(g) {
  const n = g.attributes.position.count;
  const idx = new Array(n);
  for (let i = 0; i < n; i++) idx[i] = i;
  g.setIndex(idx);
  return g;
}
