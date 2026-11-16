// collision.js — an axis-aligned box world with ramps, sliding move and ray casts.

const SKIN = 0.02;

export class World {
 constructor(map) {
  this.boxes = [];
  for (const b of map.boxes ?? []) {
   this.boxes.push({
    minX: b.x - b.w / 2, maxX: b.x + b.w / 2,
    minZ: b.z - b.d / 2, maxZ: b.z + b.d / 2,
    minY: b.y0 ?? 0, maxY: b.y1 ?? 3,
    mat: b.mat ?? 'concrete',
    kind: 'box',
    rot: b.rot ?? 0,
   });
  }
  for (const r of map.ramps ?? []) {
   this.boxes.push({
    minX: r.x - r.w / 2, maxX: r.x + r.w / 2,
    minZ: r.z - r.d / 2, maxZ: r.z + r.d / 2,
    minY: r.y0 ?? 0, maxY: r.y1 ?? 1,
    mat: r.mat ?? 'steel',
    kind: 'ramp',
    axis: r.axis ?? 'z',
    rot: 0,
   });
  }
  this.bounds = map.bounds;
 }

 heightAt(x, z, feetY) {
  let best = 0;
  for (const b of this.boxes) {
   if (x < b.minX - 0.001 || x > b.maxX + 0.001 || z < b.minZ - 0.001 || z > b.maxZ + 0.001) continue;
   let top = b.maxY;
   if (b.kind === 'ramp') {
    const t = (z - b.minZ) / (b.maxZ - b.minZ);
    top = b.minY + (b.maxY - b.minY) * Math.min(1, Math.max(0, t));
   }
   if (top <= feetY + 0.55 && top > best) best = top;
  }
  return best;
 }

 resolveCircle(pos, r, y, height) {
  for (let pass = 0; pass < 3; pass++) {
   let moved = false;
   for (const b of this.boxes) {
    if (b.kind === 'ramp') continue; // ramps are walked over, not around
    const top = b.maxY;
    const bottom = b.minY;
    if (top <= y + 0.35 || bottom >= y + height) continue; // step up small lips, ignore overheads
    const cx = Math.min(Math.max(pos.x, b.minX), b.maxX);
    const cz = Math.min(Math.max(pos.z, b.minZ), b.maxZ);
    const dx = pos.x - cx;
    const dz = pos.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    if (d2 > 1e-8) {
     const d = Math.sqrt(d2);
     const push = r - d + SKIN;
     pos.x += (dx / d) * push;
     pos.z += (dz / d) * push;
    } else {
     const toRight = b.maxX - pos.x;
     const toLeft = pos.x - b.minX;
     const toFar = b.maxZ - pos.z;
     const toNear = pos.z - b.minZ;
     const m = Math.min(toRight, toLeft, toFar, toNear);
     if (m === toRight) pos.x = b.maxX + r + SKIN;
     else if (m === toLeft) pos.x = b.minX - r - SKIN;
     else if (m === toFar) pos.z = b.maxZ + r + SKIN;
     else pos.z = b.minZ - r - SKIN;
    }
    moved = true;
   }
   if (!moved) break;
  }
  const bd = this.bounds;
  pos.x = Math.min(bd.maxX - 1, Math.max(bd.minX + 1, pos.x));
  pos.z = Math.min(bd.maxZ - 1, Math.max(bd.minZ + 1, pos.z));
 }

 raycast(origin, dir, maxDist, out) {
  let best = maxDist;
  let hitBox = null;
  let nx = 0, ny = 0, nz = 0;
  for (const b of this.boxes) {
   if (b.kind === 'ramp') continue;
   let tmin = 0;
   let tmax = best;
   let axis = -1;
   let sign = 1;
   if (Math.abs(dir.x) < 1e-9) {
    if (origin.x < b.minX || origin.x > b.maxX) continue;
   } else {
    const inv = 1 / dir.x;
    let t1 = (b.minX - origin.x) * inv;
    let t2 = (b.maxX - origin.x) * inv;
    let s = -1;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; s = 1; }
    if (t1 > tmin) { tmin = t1; axis = 0; sign = s; }
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) continue;
   }
   if (Math.abs(dir.y) < 1e-9) {
    if (origin.y < b.minY || origin.y > b.maxY) continue;
   } else {
    const inv = 1 / dir.y;
    let t1 = (b.minY - origin.y) * inv;
    let t2 = (b.maxY - origin.y) * inv;
    let s = -1;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; s = 1; }
    if (t1 > tmin) { tmin = t1; axis = 1; sign = s; }
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) continue;
   }
   if (Math.abs(dir.z) < 1e-9) {
    if (origin.z < b.minZ || origin.z > b.maxZ) continue;
   } else {
    const inv = 1 / dir.z;
    let t1 = (b.minZ - origin.z) * inv;
    let t2 = (b.maxZ - origin.z) * inv;
    let s = -1;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; s = 1; }
    if (t1 > tmin) { tmin = t1; axis = 2; sign = s; }
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) continue;
   }
   if (axis < 0 || tmin >= best) continue;
   best = tmin;
   hitBox = b;
   nx = axis === 0 ? sign : 0;
   ny = axis === 1 ? sign : 0;
   nz = axis === 2 ? sign : 0;
  }
  if (dir.y < -1e-6) {
   const t = -origin.y / dir.y;
   if (t > 0 && t < best) {
    best = t;
    hitBox = null;
    nx = 0; ny = 1; nz = 0;
   }
  }
  out.dist = best;
  out.box = hitBox;
  out.normal.x = nx; out.normal.y = ny; out.normal.z = nz;
  return best;
 }

 segmentBlocked(ax, ay, az, bx, by, bz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  const len = Math.hypot(dx, dy, dz);
  if (len < 1e-6) return false;
  const dir = { x: dx / len, y: dy / len, z: dz / len };
  const out = { dist: 0, box: null, normal: { x: 0, y: 0, z: 0 } };
  const d = this.raycast({ x: ax, y: ay, z: az }, dir, len, out);
  return d < len - 0.05;
 }
}
