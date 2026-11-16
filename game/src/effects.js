// effects.js — the pooled things a fight needs: sparks, tracers, smoke, flash, blast light.

export class Effects {
 constructor(THREE, scene, mats) {
  this.THREE = THREE;
  this.scene = scene;
  this.flashes = [];
  this.tracers = [];
  this.puffs = [];
  this.smokes = [];
  this.sparks = [];

  const flashGeo = new THREE.PlaneGeometry(0.5, 0.5);
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xffd08a, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  for (let i = 0; i < 6; i++) {
   const m = new THREE.Mesh(flashGeo, flashMat.clone());
   m.visible = false;
   scene.add(m);
   this.flashes.push({ mesh: m, life: 0 });
  }

  const tracerGeo = new THREE.BoxGeometry(0.03, 0.03, 1);
  const tracerMat = new THREE.MeshBasicMaterial({ color: 0xffcf8a, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending });
  for (let i = 0; i < 24; i++) {
   const m = new THREE.Mesh(tracerGeo, tracerMat.clone());
   m.visible = false;
   scene.add(m);
   this.tracers.push({ mesh: m, life: 0 });
  }

  const puffGeo = new THREE.SphereGeometry(0.14, 6, 4);
  for (let i = 0; i < 40; i++) {
   const mat = new THREE.MeshBasicMaterial({ color: 0xd8d4c6, transparent: true, opacity: 0.7, depthWrite: false });
   const m = new THREE.Mesh(puffGeo, mat);
   m.visible = false;
   scene.add(m);
   this.puffs.push({ mesh: m, life: 0, vx: 0, vy: 0, vz: 0 });
  }

  for (let i = 0; i < 4; i++) {
   const group = new THREE.Group();
   group.visible = false;
   const sprites = [];
   for (let j = 0; j < 9; j++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xcfd6d6, transparent: true, opacity: 0.5, depthWrite: false }));
    s.position.set((Math.random() - 0.5) * 3, Math.random() * 1.8, (Math.random() - 0.5) * 3);
    s.scale.set(3.4, 2.6, 1);
    group.add(s);
    sprites.push(s);
   }
   scene.add(group);
   this.smokes.push({ group, sprites, life: 0, max: 0, x: 0, z: 0, radius: 5.5 });
  }

  this.blastLight = new THREE.PointLight(0xffb060, 0, 24, 2);
  scene.add(this.blastLight);
  this.blastLife = 0;

  this.throwables = [];
 }

 flash(x, y, z, size = 1) {
  const f = this.flashes.find((v) => v.life <= 0) ?? this.flashes[0];
  f.mesh.position.set(x, y, z);
  f.mesh.scale.setScalar(size);
  f.mesh.rotation.z = Math.random() * Math.PI;
  f.mesh.visible = true;
  f.life = 0.045;
 }

 tracer(from, to) {
  const t = this.tracers.find((v) => v.life <= 0) ?? this.tracers[0];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dz = to.z - from.z;
  const len = Math.hypot(dx, dy, dz);
  if (len < 0.5) return;
  t.mesh.position.set(from.x + dx / 2, from.y + dy / 2, from.z + dz / 2);
  t.mesh.scale.set(1, 1, len);
  t.mesh.lookAt(to.x, to.y, to.z);
  t.mesh.visible = true;
  t.life = 0.05;
 }

 impact(x, y, z, nx, ny, nz, blood = false) {
  for (let i = 0; i < 3; i++) {
   const p = this.puffs.find((v) => v.life <= 0);
   if (!p) return;
   p.mesh.material.color.setHex(blood ? 0x7a2a1c : 0xd8d4c6);
   p.mesh.material.opacity = 0.8;
   p.mesh.position.set(x + nx * 0.05, y + ny * 0.05, z + nz * 0.05);
   p.mesh.scale.setScalar(blood ? 0.9 : 0.6 + Math.random() * 0.6);
   p.mesh.visible = true;
   p.life = blood ? 0.35 : 0.5;
   p.vx = nx * 1.4 + (Math.random() - 0.5) * 1.2;
   p.vy = ny * 1.2 + Math.random() * 0.9;
   p.vz = nz * 1.4 + (Math.random() - 0.5) * 1.2;
  }
 }

 smoke(x, z, duration, radius) {
  const s = this.smokes.find((v) => v.life <= 0) ?? this.smokes[0];
  s.group.visible = true;
  s.group.position.set(x, 0.6, z);
  s.life = duration;
  s.max = duration;
  s.x = x;
  s.z = z;
  s.radius = radius;
  for (const sp of s.sprites) {
   sp.material.opacity = 0.45;
   sp.position.set((Math.random() - 0.5) * radius * 0.7, Math.random() * 2.2, (Math.random() - 0.5) * radius * 0.7);
  }
 }

 blast(x, y, z) {
  this.blastLight.position.set(x, y, z);
  this.blastLight.intensity = 220;
  this.blastLife = 0.35;
  for (let i = 0; i < 10; i++) {
   const p = this.puffs.find((v) => v.life <= 0);
   if (!p) break;
   p.mesh.material.color.setHex(0xffb060);
   p.mesh.material.opacity = 0.9;
   p.mesh.position.set(x, y, z);
   p.mesh.scale.setScalar(1 + Math.random() * 2);
   p.mesh.visible = true;
   p.life = 0.5;
   p.vx = (Math.random() - 0.5) * 10;
   p.vy = Math.random() * 7;
   p.vz = (Math.random() - 0.5) * 10;
  }
 }

 smokeBlocks(ax, ay, az, bx, by, bz) {
  for (const s of this.smokes) {
   if (s.life <= 0) continue;
   const r = s.radius * 0.75;
   const dx = bx - ax;
   const dz = bz - az;
   const len2 = dx * dx + dz * dz;
   let t = 0;
   if (len2 > 1e-4) t = Math.max(0, Math.min(1, ((s.x - ax) * dx + (s.z - az) * dz) / len2));
   const px = ax + dx * t;
   const pz = az + dz * t;
   if (Math.hypot(px - s.x, pz - s.z) < r) return true;
  }
  return false;
 }

 update(dt) {
  for (const f of this.flashes) {
   if (f.life <= 0) continue;
   f.life -= dt;
   f.mesh.material.opacity = Math.max(0, f.life / 0.045) * 0.9;
   if (f.life <= 0) f.mesh.visible = false;
  }
  for (const t of this.tracers) {
   if (t.life <= 0) continue;
   t.life -= dt;
   t.mesh.material.opacity = Math.max(0, t.life / 0.05) * 0.7;
   if (t.life <= 0) t.mesh.visible = false;
  }
  for (const p of this.puffs) {
   if (p.life <= 0) continue;
   p.life -= dt;
   p.mesh.position.x += p.vx * dt;
   p.mesh.position.y += p.vy * dt;
   p.mesh.position.z += p.vz * dt;
   p.vy -= 6 * dt;
   p.mesh.material.opacity = Math.max(0, p.life) * 1.4;
   if (p.life <= 0) p.mesh.visible = false;
  }
  for (const s of this.smokes) {
   if (s.life <= 0) continue;
   s.life -= dt;
   const age = s.max - s.life;
   const grow = Math.min(1, age / 1.2);
   const fade = s.life < 2 ? Math.max(0, s.life / 2) : 1;
   for (const sp of s.sprites) {
    sp.scale.set(3.4 * (0.5 + grow), 2.6 * (0.5 + grow), 1);
    sp.material.opacity = 0.5 * grow * fade;
   }
   if (s.life <= 0) s.group.visible = false;
  }
  if (this.blastLife > 0) {
   this.blastLife -= dt;
   this.blastLight.intensity = Math.max(0, this.blastLife / 0.35) * 220;
  }
 }
}
