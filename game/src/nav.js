// nav.js — the bots' picture of the map: a 1.5 m grid, A* with string-pulling, sightlines.

const CELL = 1.5;

export class NavGrid {
 constructor(world) {
  this.world = world;
  const b = world.bounds;
  this.cell = CELL;
  this.minX = b.minX;
  this.minZ = b.minZ;
  this.w = Math.ceil((b.maxX - b.minX) / CELL);
  this.h = Math.ceil((b.maxZ - b.minZ) / CELL);
  this.walk = new Uint8Array(this.w * this.h);
  this.heights = new Float32Array(this.w * this.h);
  this.bake();
 }

 index(cx, cz) {
  return cz * this.w + cx;
 }

 cellOf(x, z) {
  return {
   cx: Math.min(this.w - 1, Math.max(0, Math.floor((x - this.minX) / this.cell))),
   cz: Math.min(this.h - 1, Math.max(0, Math.floor((z - this.minZ) / this.cell))),
  };
 }

 centre(cx, cz) {
  return { x: this.minX + (cx + 0.5) * this.cell, z: this.minZ + (cz + 0.5) * this.cell };
 }

 bake() {
  const probe = { x: 0, z: 0 };
  for (let cz = 0; cz < this.h; cz++) {
   for (let cx = 0; cx < this.w; cx++) {
    const c = this.centre(cx, cz);
    probe.x = c.x;
    probe.z = c.z;
    this.world.resolveCircle(probe, 0.38, 0.1, 1.6);
    const pushed = Math.hypot(probe.x - c.x, probe.z - c.z);
    const ground = this.world.heightAt(c.x, c.z, 0.6);
    const walkable = pushed < 0.06 && ground < 1.2;
    this.walk[this.index(cx, cz)] = walkable ? 1 : 0;
    this.heights[this.index(cx, cz)] = ground;
   }
  }
 }

 isWalkable(cx, cz) {
  if (cx < 0 || cz < 0 || cx >= this.w || cz >= this.h) return false;
  return this.walk[this.index(cx, cz)] === 1;
 }

 path(fromX, fromZ, toX, toZ, maxNodes = 2600) {
  const start = this.cellOf(fromX, fromZ);
  const goal = this.cellOf(toX, toZ);
  if (!this.isWalkable(goal.cx, goal.cz)) {
   const alt = this.nearestWalkable(goal.cx, goal.cz, 4);
   if (!alt) return [];
   goal.cx = alt.cx;
   goal.cz = alt.cz;
  }
  if (!this.isWalkable(start.cx, start.cz)) {
   const alt = this.nearestWalkable(start.cx, start.cz, 4);
   if (!alt) return [];
   start.cx = alt.cx;
   start.cz = alt.cz;
  }
  const w = this.w;
  const n = w * this.h;
  const gScore = new Float32Array(n).fill(Infinity);
  const came = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const heap = new MinHeap();
  const si = start.cz * w + start.cx;
  const gi = goal.cz * w + goal.cx;
  gScore[si] = 0;
  heap.push(si, this.heuristic(start.cx, start.cz, goal.cx, goal.cz));
  let nodes = 0;
  while (heap.size > 0 && nodes < maxNodes) {
   const cur = heap.pop();
   if (closed[cur]) continue;
   closed[cur] = 1;
   nodes++;
   if (cur === gi) break;
   const cx = cur % w;
   const cz = (cur / w) | 0;
   for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
     if (dx === 0 && dz === 0) continue;
     const nx = cx + dx;
     const nz = cz + dz;
     if (!this.isWalkable(nx, nz)) continue;
     if (dx !== 0 && dz !== 0 && (!this.isWalkable(cx + dx, cz) || !this.isWalkable(cx, cz + dz))) continue;
     const ni = nz * w + nx;
     if (closed[ni]) continue;
     const step = dx !== 0 && dz !== 0 ? 1.4142 : 1;
     const tentative = gScore[cur] + step;
     if (tentative < gScore[ni]) {
      gScore[ni] = tentative;
      came[ni] = cur;
      heap.push(ni, tentative + this.heuristic(nx, nz, goal.cx, goal.cz));
     }
    }
   }
  }
  if (came[gi] === -1 && gi !== si) return [];
  const cells = [];
  let c = gi;
  while (c !== -1) {
   cells.push(c);
   if (c === si) break;
   c = came[c];
  }
  cells.reverse();
  const pts = cells.map((i) => this.centre(i % w, (i / w) | 0));
  if (pts.length === 0) return [];
  const last = pts[pts.length - 1];
  if (Math.hypot(last.x - toX, last.z - toZ) < this.cell * 1.6) last.x = toX, last.z = toZ;
  return this.pull(pts);
 }

 heuristic(ax, az, bx, bz) {
  const dx = Math.abs(ax - bx);
  const dz = Math.abs(az - bz);
  return Math.max(dx, dz) + 0.4142 * Math.min(dx, dz);
 }

 nearestWalkable(cx, cz, radius) {
  for (let r = 1; r <= radius; r++) {
   for (let dz = -r; dz <= r; dz++) {
    for (let dx = -r; dx <= r; dx++) {
     if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
     if (this.isWalkable(cx + dx, cz + dz)) return { cx: cx + dx, cz: cz + dz };
    }
   }
  }
  return null;
 }

 pull(pts) {
  if (pts.length <= 2) return pts;
  const out = [pts[0]];
  let anchor = 0;
  for (let i = 2; i < pts.length; i++) {
   if (!this.gridLineClear(pts[anchor], pts[i])) {
    out.push(pts[i - 1]);
    anchor = i - 1;
   }
  }
  out.push(pts[pts.length - 1]);
  return out;
 }

 gridLineClear(a, b) {
  const dist = Math.hypot(b.x - a.x, b.z - a.z);
  const steps = Math.ceil(dist / (this.cell * 0.5));
  for (let i = 1; i < steps; i++) {
   const t = i / steps;
   const x = a.x + (b.x - a.x) * t;
   const z = a.z + (b.z - a.z) * t;
   const c = this.cellOf(x, z);
   if (!this.isWalkable(c.cx, c.cz)) return false;
  }
  return true;
 }

 cellsSeeing(x, z, radius, maxCells = 40) {
  const out = [];
  const centre = this.cellOf(x, z);
  const r = Math.ceil(radius / this.cell);
  for (let dz = -r; dz <= r; dz++) {
   for (let dx = -r; dx <= r; dx++) {
    const cx = centre.cx + dx;
    const cz = centre.cz + dz;
    if (!this.isWalkable(cx, cz)) continue;
    const c = this.centre(cx, cz);
    if (Math.hypot(c.x - x, c.z - z) > radius) continue;
    if (this.world.segmentBlocked(c.x, 1.6, c.z, x, 1.2, z)) continue;
    out.push(c);
    if (out.length >= maxCells) return out;
   }
  }
  return out;
 }
}

class MinHeap {
 constructor() {
  this.items = [];
  this.prio = [];
 }
 get size() {
  return this.items.length;
 }
 push(item, prio) {
  const items = this.items;
  const prioArr = this.prio;
  items.push(item);
  prioArr.push(prio);
  let i = items.length - 1;
  while (i > 0) {
   const parent = (i - 1) >> 1;
   if (prioArr[parent] <= prioArr[i]) break;
   this.swap(i, parent);
   i = parent;
  }
 }
 pop() {
  const items = this.items;
  const prioArr = this.prio;
  const top = items[0];
  const last = items.pop();
  const lastPrio = prioArr.pop();
  if (items.length > 0) {
   items[0] = last;
   prioArr[0] = lastPrio;
   let i = 0;
   for (;;) {
    const l = i * 2 + 1;
    const r = l + 1;
    let smallest = i;
    if (l < items.length && prioArr[l] < prioArr[smallest]) smallest = l;
    if (r < items.length && prioArr[r] < prioArr[smallest]) smallest = r;
    if (smallest === i) break;
    this.swap(i, smallest);
    i = smallest;
   }
  }
  return top;
 }
 swap(a, b) {
  const items = this.items;
  const prioArr = this.prio;
  const t = items[a]; items[a] = items[b]; items[b] = t;
  const p = prioArr[a]; prioArr[a] = prioArr[b]; prioArr[b] = p;
 }
}
