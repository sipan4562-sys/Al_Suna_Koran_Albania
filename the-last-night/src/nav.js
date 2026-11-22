// A*-Pfadsuche auf dem Raster inkl. Lüftungsschacht-Verbindungen für das Monster.
import { VENTS, VENT_LINKS } from './level/layout.js';

class Heap {
  constructor(score) {
    this.a = [];
    this.score = score;
  }
  push(v) {
    const a = this.a;
    a.push(v);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.score[a[p]] <= this.score[a[i]]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && this.score[a[l]] < this.score[a[m]]) m = l;
        if (r < a.length && this.score[a[r]] < this.score[a[m]]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
  get size() {
    return this.a.length;
  }
}

export class Nav {
  constructor(world) {
    this.world = world;
    const n = world.W * world.H;
    this.g = new Float32Array(n);
    this.f = new Float32Array(n);
    this.parent = new Int32Array(n);
    this.stamp = new Uint32Array(n);
    this.closed = new Uint32Array(n);
    this.gen = 1;
    this.wallCost = new Float32Array(n);
    this.links = new Map(); // Zellindex -> [{to, cost, vent}]
    this.vents = new Map();
    for (const v of VENTS) this.vents.set(v.id, { ...v, idx: world.idx(v.x, v.z) });
    for (const [a, b] of VENT_LINKS) {
      const va = this.vents.get(a);
      const vb = this.vents.get(b);
      const d = Math.hypot(va.x - vb.x, va.z - vb.z);
      const cost = d * 0.55 + 7;
      this.addLink(va.idx, vb.idx, cost, va, vb);
      this.addLink(vb.idx, va.idx, cost, vb, va);
    }
    this.ventsEnabled = true;
    this.computeWallCost();
  }

  addLink(from, to, cost, va, vb) {
    if (!this.links.has(from)) this.links.set(from, []);
    this.links.get(from).push({ to, cost, from: va, dest: vb });
  }

  computeWallCost() {
    const w = this.world;
    for (let z = 0; z < w.H; z++)
      for (let x = 0; x < w.W; x++) {
        let c = 0;
        for (let dz = -1; dz <= 1; dz++)
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dz) continue;
            if (w.inBounds(x + dx, z + dz) && w.solid[w.idx(x + dx, z + dz)]) c += dx && dz ? 0.25 : 0.5;
          }
        this.wallCost[w.idx(x, z)] = c;
      }
  }

  // Liefert Liste von Wegpunkten {x,z,vent?} oder null.
  findPath(sx, sz, tx, tz, opts = {}) {
    const w = this.world;
    const W = w.W;
    let s = this.snap(sx, sz);
    let t = this.snap(tx, tz);
    if (!s || !t) return null;
    const si = w.idx(s.x, s.z);
    const ti = w.idx(t.x, t.z);
    const gen = ++this.gen;
    const { g, f, parent, stamp, closed } = this;
    const heap = new Heap(f);
    g[si] = 0;
    f[si] = this.h(s.x, s.z, t.x, t.z);
    parent[si] = -1;
    stamp[si] = gen;
    heap.push(si);
    const useVents = this.ventsEnabled && opts.vents !== false;
    let iter = 0;
    const DIR8 = [
      [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
      [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414],
    ];
    while (heap.size && iter++ < 6000) {
      const c = heap.pop();
      if (closed[c] === gen) continue;
      closed[c] = gen;
      if (c === ti) return this.reconstruct(c, ti, tx, tz);
      const cx = c % W;
      const cz = (c / W) | 0;
      for (const [dx, dz, cost] of DIR8) {
        const nx = cx + dx;
        const nz = cz + dz;
        if (!w.monsterPassable(nx, nz)) continue;
        if (dx && dz && (!w.monsterPassable(cx + dx, cz) || !w.monsterPassable(cx, cz + dz))) continue;
        const ni = w.idx(nx, nz);
        if (closed[ni] === gen) continue;
        let step = cost + this.wallCost[ni];
        if (w.blocked[ni]) step += 1.5; // geschlossene Tür
        if (opts.avoid) step += opts.avoid(nx, nz);
        const ng = g[c] + step;
        if (stamp[ni] !== gen || ng < g[ni]) {
          stamp[ni] = gen;
          g[ni] = ng;
          f[ni] = ng + this.h(nx, nz, t.x, t.z);
          parent[ni] = c;
          heap.push(ni);
        }
      }
      if (useVents) {
        const links = this.links.get(c);
        if (links)
          for (const l of links) {
            if (closed[l.to] === gen) continue;
            const ng = g[c] + l.cost;
            if (stamp[l.to] !== gen || ng < g[l.to]) {
              stamp[l.to] = gen;
              g[l.to] = ng;
              const vx = l.to % W;
              const vz = (l.to / W) | 0;
              f[l.to] = ng + this.h(vx, vz, t.x, t.z);
              parent[l.to] = c;
              heap.push(l.to);
            }
          }
      }
    }
    return null;
  }

  h(x0, z0, x1, z1) {
    const dx = Math.abs(x0 - x1);
    const dz = Math.abs(z0 - z1);
    // Lüftungsschächte machen die Heuristik leicht unzulässig – wir skalieren sie herunter.
    return (dx + dz + (1.414 - 2) * Math.min(dx, dz)) * 0.55;
  }

  snap(x, z) {
    const cx = Math.floor(x);
    const cz = Math.floor(z);
    if (this.world.monsterPassable(cx, cz)) return { x: cx, z: cz };
    const n = this.world.nearestWalkable(x, z, 4, true);
    return n ? { x: Math.floor(n.x), z: Math.floor(n.z) } : null;
  }

  pathCost(c) {
    return this.g[c];
  }

  reconstruct(c, ti, tx, tz) {
    const W = this.world.W;
    const cells = [];
    while (c !== -1) {
      cells.push(c);
      c = this.parent[c];
    }
    cells.reverse();
    const pts = [];
    for (let k = 0; k < cells.length; k++) {
      const ci = cells[k];
      const p = { x: (ci % W) + 0.5, z: ((ci / W) | 0) + 0.5, cell: ci };
      if (k > 0) {
        const prev = cells[k - 1];
        const links = this.links.get(prev);
        const l = links && links.find((L) => L.to === ci);
        const adj = Math.abs((prev % W) - (ci % W)) <= 1 && Math.abs(((prev / W) | 0) - ((ci / W) | 0)) <= 1;
        if (l && !adj) {
          pts[pts.length - 1].ventFrom = l.from;
          p.ventTo = l.dest;
        }
      }
      pts.push(p);
    }
    const last = pts[pts.length - 1];
    if (this.world.monsterPassable(Math.floor(tx), Math.floor(tz))) {
      last.x = tx;
      last.z = tz;
    }
    return this.smooth(pts);
  }

  // Wegpunkte glätten (String-Pulling); Lüftungs- und Türpunkte bleiben als Anker erhalten.
  smooth(pts) {
    if (pts.length <= 2) return pts;
    const anchors = [0];
    for (let m = 1; m < pts.length - 1; m++) {
      if (pts[m].ventFrom || pts[m].ventTo || this.world.doorCell[pts[m].cell]) anchors.push(m);
    }
    anchors.push(pts.length - 1);
    const out = [pts[0]];
    for (let s = 0; s < anchors.length - 1; s++) {
      const a = anchors[s];
      const b = anchors[s + 1];
      if (pts[a].ventFrom) {
        out.push(pts[b]);
        continue;
      }
      let i = a;
      while (i < b) {
        let j = i + 1;
        for (let k = b; k > i + 1; k--) {
          if (this.clear(pts[i], pts[k])) {
            j = k;
            break;
          }
        }
        out.push(pts[j]);
        i = j;
      }
    }
    return out;
  }

  clear(a, b, r = 0.38) {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    if (len < 1e-3) return true;
    const nx = -dz / len;
    const nz = dx / len;
    const steps = Math.ceil(len / 0.25);
    const w = this.world;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const px = a.x + dx * t;
      const pz = a.z + dz * t;
      for (const o of [-r, 0, r]) {
        if (!w.monsterPassable(Math.floor(px + nx * o), Math.floor(pz + nz * o))) return false;
      }
    }
    return true;
  }

  // Pfadlänge (Meter) für Hörweiten-Berechnungen.
  pathLength(path) {
    if (!path) return Infinity;
    let L = 0;
    for (let k = 1; k < path.length; k++) {
      if (path[k].ventTo) L += 4;
      else L += Math.hypot(path[k].x - path[k - 1].x, path[k].z - path[k - 1].z);
    }
    return L;
  }
}
