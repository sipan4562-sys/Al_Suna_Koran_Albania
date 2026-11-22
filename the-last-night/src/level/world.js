// Kollisionswelt: Raster, Höhen, Kollisionsboxen, Sichtlinien.
import * as THREE from 'three';
import { W, H, ZONES, ROOMS, DOORS, STAIRS, SECRET_DOOR, EXTRA_WALLS } from './layout.js';
import { clamp } from '../utils.js';

export class World {
  constructor() {
    this.W = W;
    this.H = H;
    const n = W * H;
    this.solid = new Uint8Array(n).fill(1);
    this.zone = new Array(n).fill(null);
    this.doorAt = new Array(n).fill(null);
    this.blocked = new Uint8Array(n); // geschlossene Türen (Bewegung + Sicht)
    this.monsterBlock = new Uint8Array(n); // verschlossene Türen, Kriechgang
    this.navBlock = new Uint8Array(n); // durch Möbel belegt
    this.region = new Uint8Array(n).fill(255);
    this.floorY = new Float32Array(n);
    this.ceilY = new Float32Array(n);
    this.doorCell = new Uint8Array(n);
    this.colliders = [];
    this.cellColliders = new Array(n).fill(null).map(() => []);
    this.build();
  }

  idx(x, z) {
    return z * W + x;
  }
  inBounds(x, z) {
    return x >= 0 && z >= 0 && x < W && z < H;
  }

  build() {
    for (const [x0, z0, x1, z1, zone] of ROOMS) {
      for (let z = z0; z <= z1; z++)
        for (let x = x0; x <= x1; x++) {
          const i = this.idx(x, z);
          this.solid[i] = 0;
          this.zone[i] = zone;
          const Z = ZONES[zone];
          this.floorY[i] = Z.y;
          this.ceilY[i] = Z.c;
        }
    }
    for (const [x, z] of EXTRA_WALLS) {
      const i = this.idx(x, z);
      this.solid[i] = 1;
      this.zone[i] = null;
    }
    const doorList = [...DOORS, { ...SECRET_DOOR, secret: true }];
    for (const d of doorList) {
      const i = this.idx(d.x, d.z);
      // Ausrichtung: Wände links/rechts -> Durchgang entlang Z
      const wallsX = this.solid[this.idx(d.x - 1, d.z)] && this.solid[this.idx(d.x + 1, d.z)];
      d.axis = wallsX ? 'z' : 'x';
      const nA = wallsX ? this.idx(d.x, d.z - 1) : this.idx(d.x - 1, d.z);
      const nB = wallsX ? this.idx(d.x, d.z + 1) : this.idx(d.x + 1, d.z);
      const zA = this.zone[nA];
      const zB = this.zone[nB];
      const zone = zA === 'corridor' ? zA : zB === 'corridor' ? zB : zA || zB;
      this.solid[i] = 0;
      this.zone[i] = zone;
      this.doorCell[i] = 1;
      const y = Math.max(ZONES[zA || zone].y, ZONES[zB || zone].y);
      this.floorY[i] = y;
      this.ceilY[i] = y + 2.2;
    }
    // Das Monster passt nicht durch den Kriechgang
    for (let i = 0; i < W * H; i++) if (this.zone[i] === 'crawl') this.monsterBlock[i] = 1;
    this.computeRegions();
  }

  computeRegions() {
    const n = W * H;
    const reg = this.region;
    reg.fill(255);
    let id = 1;
    const stack = [];
    for (let i = 0; i < n; i++) {
      if (this.solid[i] || this.doorCell[i] || reg[i] !== 255) continue;
      stack.push(i);
      reg[i] = id;
      while (stack.length) {
        const c = stack.pop();
        const x = c % W;
        const z = (c / W) | 0;
        const nb = [
          [x + 1, z],
          [x - 1, z],
          [x, z + 1],
          [x, z - 1],
        ];
        for (const [nx, nz] of nb) {
          if (!this.inBounds(nx, nz)) continue;
          const j = this.idx(nx, nz);
          if (this.solid[j] || this.doorCell[j] || reg[j] !== 255) continue;
          reg[j] = id;
          stack.push(j);
        }
      }
      id++;
      if (id > 250) id = 250;
    }
    this.regionCount = id;
  }

  makeRegionTexture() {
    const data = new Uint8Array(W * H * 4);
    for (let i = 0; i < W * H; i++) {
      data[i * 4] = this.region[i];
      data[i * 4 + 3] = 255;
    }
    const t = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.needsUpdate = true;
    return t;
  }

  cellOf(x, z) {
    return [Math.floor(x), Math.floor(z)];
  }

  zoneAt(x, z) {
    const cx = Math.floor(x);
    const cz = Math.floor(z);
    if (!this.inBounds(cx, cz)) return null;
    return this.zone[this.idx(cx, cz)];
  }

  regionAt(x, z) {
    const cx = Math.floor(x);
    const cz = Math.floor(z);
    if (!this.inBounds(cx, cz)) return 255;
    return this.region[this.idx(cx, cz)];
  }

  // Regionen um einen Punkt (für Objekte an Wänden / in Türen)
  probeRegions(x, z, r = 0.35) {
    const c = this.regionAt(x, z);
    const ci = this.inBounds(Math.floor(x), Math.floor(z)) ? this.idx(Math.floor(x), Math.floor(z)) : -1;
    if (c !== 255 && ci >= 0 && !this.solid[ci]) return [c];
    const out = new Set();
    for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, -r], [r, -r], [-r, r]]) {
      const cx = Math.floor(x + dx);
      const cz = Math.floor(z + dz);
      if (!this.inBounds(cx, cz)) continue;
      const i = this.idx(cx, cz);
      if (this.solid[i]) continue;
      const rr = this.region[i];
      if (rr !== 255) out.add(rr);
      else {
        // Türzelle: beide Seiten
        for (const [ex, ez] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          if (!this.inBounds(cx + ex, cz + ez)) continue;
          const j = this.idx(cx + ex, cz + ez);
          if (!this.solid[j] && this.region[j] !== 255) out.add(this.region[j]);
        }
      }
    }
    return out.size ? [...out].sort((a, b) => a - b) : [255];
  }

  surfaceAt(x, z) {
    const zone = this.zoneAt(x, z);
    return zone ? ZONES[zone].surface : 'concrete';
  }

  // Bodenhöhe inkl. Treppenrampe.
  floorAt(x, z) {
    const cx = Math.floor(x);
    const cz = Math.floor(z);
    if (!this.inBounds(cx, cz)) return 0;
    const i = this.idx(cx, cz);
    if (this.zone[i] === 'stairs') return stairHeight(x);
    return this.floorY[i];
  }

  ceilAt(x, z) {
    const cx = Math.floor(x);
    const cz = Math.floor(z);
    if (!this.inBounds(cx, cz)) return 3;
    const i = this.idx(cx, cz);
    if (this.zone[i] === 'stairs') return stairHeight(x) + 3;
    return this.ceilY[i];
  }

  isOpaque(cx, cz) {
    if (!this.inBounds(cx, cz)) return true;
    const i = this.idx(cx, cz);
    return this.solid[i] === 1 || this.blocked[i] === 1;
  }

  // Blockiert diese Zelle einen Körper der Höhe h?
  cellBlocks(cx, cz, h) {
    if (!this.inBounds(cx, cz)) return true;
    const i = this.idx(cx, cz);
    if (this.solid[i] || this.blocked[i]) return true;
    if (this.zone[i] !== 'stairs' && this.ceilY[i] - this.floorY[i] < h) return true;
    return false;
  }

  monsterPassable(cx, cz) {
    if (!this.inBounds(cx, cz)) return false;
    const i = this.idx(cx, cz);
    return !this.solid[i] && !this.monsterBlock[i] && !this.navBlock[i];
  }

  addCollider(box) {
    // box: {minX, maxX, minZ, maxZ}
    this.colliders.push(box);
    const x0 = Math.floor(box.minX - 0.5);
    const x1 = Math.floor(box.maxX + 0.5);
    const z0 = Math.floor(box.minZ - 0.5);
    const z1 = Math.floor(box.maxZ + 0.5);
    box._cells = [];
    for (let z = z0; z <= z1; z++)
      for (let x = x0; x <= x1; x++) {
        if (!this.inBounds(x, z)) continue;
        const i = this.idx(x, z);
        this.cellColliders[i].push(box);
        box._cells.push(i);
      }
    return box;
  }

  removeCollider(box) {
    const k = this.colliders.indexOf(box);
    if (k >= 0) this.colliders.splice(k, 1);
    for (const i of box._cells || []) {
      const arr = this.cellColliders[i];
      const j = arr.indexOf(box);
      if (j >= 0) arr.splice(j, 1);
    }
    box._cells = [];
  }

  // Zellen, die von Möbeln zu stark belegt sind, für die Navigation sperren.
  computeNavBlocks() {
    this.navBlock.fill(0);
    for (const b of this.colliders) {
      if (b.noNav) continue;
      for (let z = Math.floor(b.minZ); z <= Math.floor(b.maxZ); z++)
        for (let x = Math.floor(b.minX); x <= Math.floor(b.maxX); x++) {
          if (!this.inBounds(x, z)) continue;
          const ox = Math.min(b.maxX, x + 1) - Math.max(b.minX, x);
          const oz = Math.min(b.maxZ, z + 1) - Math.max(b.minZ, z);
          if (ox > 0 && oz > 0 && ox * oz > 0.14) this.navBlock[this.idx(x, z)] = 1;
        }
    }
  }

  pushOutBox(p, r, minX, maxX, minZ, maxZ) {
    const qx = clamp(p.x, minX, maxX);
    const qz = clamp(p.z, minZ, maxZ);
    let dx = p.x - qx;
    let dz = p.z - qz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= r * r) return false;
    if (d2 > 1e-10) {
      const d = Math.sqrt(d2);
      const push = r - d;
      p.x += (dx / d) * push;
      p.z += (dz / d) * push;
    } else {
      // Mittelpunkt in der Box: kürzester Ausweg
      const l = p.x - minX;
      const rr = maxX - p.x;
      const t = p.z - minZ;
      const b = maxZ - p.z;
      const m = Math.min(l, rr, t, b);
      if (m === l) p.x = minX - r;
      else if (m === rr) p.x = maxX + r;
      else if (m === t) p.z = minZ - r;
      else p.z = maxZ + r;
    }
    return true;
  }

  resolve(p, r, h, ignore) {
    let hit = false;
    for (let it = 0; it < 3; it++) {
      let any = false;
      const x0 = Math.floor(p.x - r);
      const x1 = Math.floor(p.x + r);
      const z0 = Math.floor(p.z - r);
      const z1 = Math.floor(p.z + r);
      for (let cz = z0; cz <= z1; cz++)
        for (let cx = x0; cx <= x1; cx++) {
          if (this.cellBlocks(cx, cz, h)) {
            if (this.pushOutBox(p, r, cx, cx + 1, cz, cz + 1)) any = true;
          }
        }
      const ci = this.inBounds(Math.floor(p.x), Math.floor(p.z)) ? this.idx(Math.floor(p.x), Math.floor(p.z)) : -1;
      if (ci >= 0) {
        for (const b of this.cellColliders[ci]) {
          if (b === ignore || b.disabled) continue;
          if (this.pushOutBox(p, r, b.minX, b.maxX, b.minZ, b.maxZ)) any = true;
        }
      }
      if (!any) break;
      hit = true;
    }
    return hit;
  }

  // Bewegt einen Kreis mit Teilschritten und Gleiten an Wänden.
  moveCircle(p, dx, dz, r, h, ignore) {
    const dist = Math.max(Math.abs(dx), Math.abs(dz));
    const steps = Math.max(1, Math.ceil(dist / 0.08));
    let hit = false;
    for (let s = 0; s < steps; s++) {
      p.x += dx / steps;
      if (this.resolve(p, r, h, ignore)) hit = true;
      p.z += dz / steps;
      if (this.resolve(p, r, h, ignore)) hit = true;
    }
    return hit;
  }

  // Sichtlinie über das Raster (Wände und geschlossene Türen blockieren).
  lineOfSight(x0, z0, x1, z1) {
    return this.rayDistance(x0, z0, x1 - x0, z1 - z0, 1) >= 1;
  }

  // DDA-Strahl; liefert den Bruchteil t (0..maxT) bis zur ersten blockierenden Zelle.
  rayDistance(x0, z0, dx, dz, maxT) {
    let cx = Math.floor(x0);
    let cz = Math.floor(z0);
    if (this.isOpaque(cx, cz)) return 0;
    const stepX = dx > 0 ? 1 : -1;
    const stepZ = dz > 0 ? 1 : -1;
    const tDX = dx !== 0 ? Math.abs(1 / dx) : Infinity;
    const tDZ = dz !== 0 ? Math.abs(1 / dz) : Infinity;
    let tMX = dx !== 0 ? (dx > 0 ? cx + 1 - x0 : x0 - cx) * tDX : Infinity;
    let tMZ = dz !== 0 ? (dz > 0 ? cz + 1 - z0 : z0 - cz) * tDZ : Infinity;
    for (let k = 0; k < 256; k++) {
      let t;
      if (tMX < tMZ) {
        t = tMX;
        tMX += tDX;
        cx += stepX;
      } else {
        t = tMZ;
        tMZ += tDZ;
        cz += stepZ;
      }
      if (t >= maxT) return maxT;
      if (this.isOpaque(cx, cz)) return t;
    }
    return maxT;
  }

  nearestWalkable(x, z, maxR = 6, forMonster = true) {
    const cx = Math.floor(x);
    const cz = Math.floor(z);
    for (let r = 0; r <= maxR; r++) {
      let best = null;
      let bd = Infinity;
      for (let dz = -r; dz <= r; dz++)
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const nx = cx + dx;
          const nz = cz + dz;
          const ok = forMonster ? this.monsterPassable(nx, nz) : !this.cellBlocks(nx, nz, 1.8);
          if (!ok) continue;
          const d = (nx + 0.5 - x) ** 2 + (nz + 0.5 - z) ** 2;
          if (d < bd) {
            bd = d;
            best = { x: nx + 0.5, z: nz + 0.5 };
          }
        }
      if (best) return best;
    }
    return null;
  }
}

export function stairHeight(x) {
  const t = clamp((x - STAIRS.x0) / (STAIRS.x1 - STAIRS.x0), 0, 1);
  return STAIRS.h0 + (STAIRS.h1 - STAIRS.h0) * t;
}
