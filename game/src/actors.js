// actors.js — the people in the works: one Actor for the player and the bots, and its body.

import { TEAM_COLOR } from './palette.js';

export const HITBOX = {
 head: { y: 1.52, r: 0.17 },
 chest: { y: 1.12, r: 0.28 },
 legs: { y: 0.45, r: 0.26 },
};

const GRAVITY = 22;
const WALK_SPEED = 5.4;
const RUN_SPEED = 5.9;
const CROUCH_SPEED = 2.6;
const ACCEL = 62;
const AIR_ACCEL = 8;
const FRICTION = 9.5;
const JUMP = 6.1;
const STEP_UP = 0.45;

let nextId = 1;

export class Actor {
 constructor(THREE, scene, opts) {
  this.id = opts.id ?? nextId++;
  this.name = opts.name ?? 'Operator';
  this.team = opts.team ?? 'raid';
  this.isPlayer = !!opts.isPlayer;
  this.isBot = !opts.isPlayer;
  this.pos = { x: opts.x ?? 0, y: 0, z: opts.z ?? 0 };
  this.vel = { x: 0, y: 0, z: 0 };
  this.yaw = opts.yaw ?? 0;
  this.pitch = 0;
  this.health = 100;
  this.armor = 0;
  this.alive = true;
  this.crouch = 0; // 0 standing, 1 crouched, smoothed for the camera and the pose
  this.wantCrouch = false;
  this.onGround = true;
  this.eyeHeight = 1.62;
  this.radius = 0.34;
  this.height = 1.75;
  this.kills = 0;
  this.deaths = 0;
  this.weapon = null; // the weapon table row in use
  this.mag = 0;
  this.reserve = 0;
  this.reloading = 0;
  this.drawTime = 0;
  this.fireCooldown = 0;
  this.spreadExtra = 0;
  this.recoil = { x: 0, y: 0 };
  this.lastDamageAt = -99;
  this.lastHitBy = null;
  this.flashUntil = 0;
  this.deadAt = 0;
  this.hasBomb = false;
  this.grenades = { shard: 0, haze: 0, flare: 0 };
  this.spectating = false;
  this.mesh = opts.mesh ?? null;
  this.avatar = null;
  if (scene && opts.buildAvatar !== false) this.avatar = buildAvatar(THREE, scene, this);
 }

 get eyeY() {
  return this.pos.y + this.eyeHeight - this.crouch * 0.42;
 }

 get chestY() {
  return this.pos.y + 1.12 - this.crouch * 0.32;
 }

 // --- state changes -------------------------------------------------------------

 spawnAt(x, z, yaw) {
  this.pos.x = x;
  this.pos.z = z;
  this.pos.y = 0;
  this.vel.x = this.vel.y = this.vel.z = 0;
  this.yaw = yaw;
  this.pitch = 0;
  this.health = 100;
  this.alive = true;
  this.crouch = 0;
  this.wantCrouch = false;
  this.reloading = 0;
  this.fireCooldown = 0;
  this.spreadExtra = 0;
  this.recoil.x = this.recoil.y = 0;
  this.flashUntil = 0;
  this.hasBomb = false;
  if (this.avatar) {
   this.avatar.setHealth(100);
   this.avatar.group.visible = true;
   this.avatar.group.position.set(x, 0, z);
   this.avatar.group.rotation.y = yaw;
   this.avatar.setCrouch(0);
   this.avatar.setDead(false);
  }
 }

 equip(weapon) {
  this.weapon = weapon;
  this.mag = weapon ? weapon.mag : 0;
  this.reserve = weapon ? weapon.reserve : 0;
  this.reloading = 0;
  this.drawTime = weapon ? weapon.draw : 0;
 }

 takeDamage(amount, region, source, now) {
  if (!this.alive) return 0;
  let dmg = amount;
  if (this.armor > 0 && region !== 'head') {
   const through = 0.5 + (source?.armorPen ?? 0.6) * 0.5;
   const absorbed = dmg * (1 - through);
   const spent = Math.min(this.armor, absorbed * 1.4);
   this.armor -= spent;
   dmg -= spent * 0.7;
  } else if (this.armor > 0 && region === 'head') {
   const spent = Math.min(this.armor, dmg * 0.35);
   this.armor -= spent;
   dmg -= spent * 0.4;
  }
  this.health -= dmg;
  if (this.avatar) this.avatar.setHealth(this.health);
  this.lastDamageAt = now;
  this.lastHitBy = source ? source.id : null;
  if (this.health <= 0) {
   this.health = 0;
   this.die(now, source);
   return dmg;
  }
  return dmg;
 }

 die(now, source) {
  this.alive = false;
  this.deaths++;
  this.deadAt = now;
  this.vel.x = this.vel.z = 0;
  if (this.avatar) this.avatar.setDead(true);
 }

 // --- movement ------------------------------------------------------------------

 step(THREE_UNUSED, world, dt, intent) {
  const wantCrouch = !!intent.crouch;
  const crouchTarget = wantCrouch ? 1 : 0;
  this.crouch += Math.max(-dt * 6, Math.min(dt * 6, crouchTarget - this.crouch));

  let maxSpeed = WALK_SPEED;
  if (wantCrouch) maxSpeed = CROUCH_SPEED;
  else if (intent.sprint) maxSpeed = RUN_SPEED;

  const fwdX = -Math.sin(this.yaw);
  const fwdZ = -Math.cos(this.yaw);
  const rightX = Math.cos(this.yaw);
  const rightZ = -Math.sin(this.yaw);
  let wx = fwdX * intent.forward + rightX * intent.right;
  let wz = fwdZ * intent.forward + rightZ * intent.right;
  const wlen = Math.hypot(wx, wz);
  if (wlen > 1e-4) {
   wx /= wlen;
   wz /= wlen;
  } else {
   wx = wz = 0;
  }

  const accel = this.onGround ? ACCEL : AIR_ACCEL;
  const wishSpeed = maxSpeed * Math.min(1, wlen);
  if (this.onGround) {
   const speed = Math.hypot(this.vel.x, this.vel.z);
   if (speed > 0.01) {
    const drop = Math.max(0, speed - Math.max(0, speed - FRICTION * dt * Math.max(speed, 1.6)));
    const factor = Math.max(0, (speed - drop) / speed);
    this.vel.x *= factor;
    this.vel.z *= factor;
   } else {
    this.vel.x = this.vel.z = 0;
   }
  }
  if (wishSpeed > 0.01) {
   const cur = this.vel.x * wx + this.vel.z * wz;
   const add = Math.min(wishSpeed - cur, accel * dt);
   if (add > 0) {
    this.vel.x += wx * add;
    this.vel.z += wz * add;
   }
  }

  if (intent.jump && this.onGround) {
   this.vel.y = JUMP;
   this.onGround = false;
  }

  this.vel.y -= GRAVITY * dt;

  this.pos.x += this.vel.x * dt;
  this.pos.z += this.vel.z * dt;
  const before = { x: this.pos.x, z: this.pos.z };
  world.resolveCircle(this.pos, this.radius, this.pos.y, this.height - this.crouch * 0.42);
  if (Math.abs(this.pos.x - before.x) > 1e-6) this.vel.x = (this.pos.x - before.x) / dt * 0.6;
  if (Math.abs(this.pos.z - before.z) > 1e-6) this.vel.z = (this.pos.z - before.z) / dt * 0.6;

  this.pos.y += this.vel.y * dt;
  const ground = world.heightAt(this.pos.x, this.pos.z, this.pos.y + STEP_UP);
  if (this.pos.y <= ground + 0.001) {
   this.pos.y = ground;
   this.vel.y = 0;
   this.onGround = true;
  } else {
   this.onGround = false;
  }

  if (this.avatar) {
   this.avatar.group.position.set(this.pos.x, this.pos.y, this.pos.z);
   this.avatar.group.rotation.y = this.yaw;
   this.avatar.setCrouch(this.crouch);
   this.avatar.walk(this.vel, dt);
  }
 }

 // --- shooting ------------------------------------------------------------------

 currentSpread() {
  const w = this.weapon;
  if (!w) return 0;
  const speed = Math.hypot(this.vel.x, this.vel.z);
  const moveFrac = Math.min(1, speed / WALK_SPEED);
  let s = w.spread.base + w.spread.move * moveFrac * moveFrac;
  if (!this.onGround) s += w.spread.air;
  s *= 1 - (1 - w.spread.crouch) * this.crouch;
  s += this.spreadExtra;
  if (this.aiming) s *= w.scoped ? 0.35 : 0.68;
  return Math.min(s, w.spread.max);
 }

 canFire(now) {
  return this.alive && this.weapon && this.mag > 0 && this.reloading <= 0 && this.drawTime <= 0 && this.fireCooldown <= 0;
 }

 fire(out) {
  const w = this.weapon;
  this.mag--;
  this.fireCooldown = 60 / w.rpm;
  const spread = this.currentSpread();
  const a = out.rand * Math.PI * 2;
  const r = Math.sqrt(out.rand2) * spread;
  const yaw = this.yaw + (this.recoil.y * 0) + Math.cos(a) * r;
  const pitch = this.pitch + Math.sin(a) * r;
  const cosP = Math.cos(pitch);
  out.dir.x = -Math.sin(yaw) * cosP;
  out.dir.y = Math.sin(pitch);
  out.dir.z = -Math.cos(yaw) * cosP;
  out.origin.x = this.pos.x;
  out.origin.y = this.eyeY;
  out.origin.z = this.pos.z;
  this.spreadExtra = Math.min(w.spread.max - w.spread.base, this.spreadExtra + w.spread.perShot);
  this.recoil.x += w.recoil.kick;
  this.recoil.y += (out.rand3 - 0.5) * 2 * w.recoil.side;
  return out;
 }

 recover(dt) {
  const w = this.weapon;
  if (!w) return;
  const rec = 1 - Math.pow(0.0001, dt);
  this.recoil.x *= 1 - Math.min(1, dt * (1 - w.recoil.recover) * 8);
  this.recoil.y *= 1 - Math.min(1, dt * 7);
  this.spreadExtra = Math.max(0, this.spreadExtra - w.spread.recover * dt);
  if (this.reloading > 0) {
   this.reloading -= dt;
   if (this.reloading <= 0) {
    const take = Math.min(w.mag - this.mag, this.reserve);
    this.mag += take;
    this.reserve -= take;
    this.reloading = 0;
   }
  }
  if (this.drawTime > 0) this.drawTime -= dt;
  if (this.fireCooldown > 0) this.fireCooldown -= dt;
 }

 reload() {
  if (this.reloading > 0 || !this.weapon) return false;
  if (this.mag >= this.weapon.mag || this.reserve <= 0) return false;
  this.reloading = this.weapon.reload;
  return true;
 }
}

// --- the body ---------------------------------------------------------------------
export function buildAvatar(THREE, scene, actor) {
 const raid = actor.team === 'raid';
 const std = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...opts });
 const cloth = std(raid ? 0x8f7047 : 0x35555e, { roughness: 0.94 });
 const plate = std(raid ? 0x3f3428 : 0x1d2f34, { roughness: 0.7, metalness: 0.15 });
 const skin = std(raid ? 0xb08a63 : 0x9c8a76, { roughness: 0.95 });
 const tabard = std(raid ? 0xf0a03c : 0x3d95ac, { roughness: 0.7, emissive: raid ? 0x4a2c00 : 0x093038, emissiveIntensity: 0.5 });
 const gunMat = std(0x2b3338, { roughness: 0.45, metalness: 0.55 });

 const group = new THREE.Group();
 group.name = `actor-${actor.id}`;
 const part = (parent, w, h, d, x, y, z, mat) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
 };

 const legs = [];
 for (const side of [-1, 1]) {
  const hip = new THREE.Group();
  hip.position.set(side * 0.13, 0.82, 0);
  part(hip, 0.19, 0.46, 0.21, 0, -0.23, 0, cloth); // thigh
  part(hip, 0.17, 0.4, 0.19, 0, -0.62, 0.01, plate); // shin
  part(hip, 0.18, 0.12, 0.3, 0, -0.8, -0.04, plate); // boot
  group.add(hip);
  legs.push(hip);
 }

 const torso = part(group, 0.5, 0.58, 0.29, 0, 1.13, 0, cloth);
 part(group, 0.54, 0.4, 0.33, 0, 1.2, 0, plate); // chest
 const sash = part(group, 0.16, 0.62, 0.02, raid ? 0.12 : -0.12, 1.05, -0.16, tabard);
 sash.rotation.z = raid ? -0.16 : 0.16;
 part(group, 0.52, 0.09, 0.31, 0, 0.85, 0, plate); // belt
 for (const side of [-1, 1]) part(group, 0.12, 0.14, 0.1, side * 0.19, 0.79, -0.13, cloth); // pouches

 const head = part(group, 0.24, 0.26, 0.24, 0, 1.58, 0, skin);
 part(group, 0.29, 0.22, 0.28, 0, 1.66, 0.02, cloth); // hood
 part(group, 0.23, 0.07, 0.02, 0, 1.6, -0.13, tabard); // visor
 part(group, 0.2, 0.1, 0.06, 0, 1.51, -0.12, plate); // mask

 const arms = [];
 for (const side of [-1, 1]) {
  const shoulder = new THREE.Group();
  shoulder.position.set(side * 0.32, 1.35, 0);
  part(shoulder, 0.14, 0.34, 0.15, 0, -0.17, 0, cloth); // upper arm
  part(shoulder, 0.13, 0.3, 0.14, side * -0.06, -0.42, -0.1, plate).rotation.x = -0.9;
  part(shoulder, 0.11, 0.11, 0.13, side * -0.1, -0.5, -0.26, plate); // glove
  group.add(shoulder);
  arms.push(shoulder);
 }

 part(group, 0.07, 0.1, 0.72, 0.08, 1.15, -0.3, gunMat).rotation.x = 0.08;
 part(group, 0.06, 0.16, 0.08, 0.08, 1.02, -0.22, gunMat).rotation.x = 0.25;
 const muzzle = new THREE.Object3D();
 muzzle.position.set(0.08, 1.16, -0.68);
 group.add(muzzle);

 const shadow = new THREE.Mesh(
  new THREE.CircleGeometry(0.45, 16),
  new THREE.MeshBasicMaterial({ color: 0x0a0d0f, transparent: true, opacity: 0.38, depthWrite: false }),
 );
 shadow.rotation.x = -Math.PI / 2;
 shadow.position.y = 0.02;
 group.add(shadow);

 const bar = new THREE.Group();
 bar.add(new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.07), new THREE.MeshBasicMaterial({ color: 0x11161a, transparent: true, opacity: 0.75, depthWrite: false })));
 const barFg = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.05), new THREE.MeshBasicMaterial({ color: raid ? 0xf0a03c : 0x3d95ac, depthWrite: false }));
 barFg.position.z = 0.001;
 bar.add(barFg);
 bar.position.y = 1.95;
 bar.visible = false;
 group.add(bar);

 scene.add(group);

 let walkPhase = 0;
 let idlePhase = 0;
 return {
  group, muzzle, legs, arms, head, torso, bar, barFg,
  setCrouch(c) {
   group.scale.y = 1 - c * 0.22;
  },
  setDead(dead) {
   group.rotation.z = dead ? Math.PI / 2 : 0;
   group.rotation.x = dead ? 0.1 : 0;
   bar.visible = false;
   group.position.y = dead ? 0.1 : group.position.y;
  },
  setVisible(v) {
   group.visible = v;
  },
  setHealth(h) {
   const hurt = h < 100;
   bar.visible = hurt;
   if (hurt) {
    barFg.scale.x = Math.max(0.001, h / 100);
    barFg.position.x = -(0.58 * (1 - h / 100)) / 2;
   }
  },
  walk(vel, dt) {
   const speed = Math.hypot(vel.x, vel.z);
   walkPhase += dt * speed * 2.6;
   const swing = Math.min(1, speed / 5) * 0.72;
   legs[0].rotation.x = Math.sin(walkPhase) * swing;
   legs[1].rotation.x = -Math.sin(walkPhase) * swing;
   arms[0].rotation.x = -Math.sin(walkPhase) * swing * 0.4;
   arms[1].rotation.x = Math.sin(walkPhase) * swing * 0.25;
   group.rotation.x = Math.min(0.08, speed * 0.012);
   idlePhase += dt;
   torso.position.y = 1.13 + (speed < 0.4 ? Math.sin(idlePhase * 1.7) * 0.008 : 0);
  },
 };
}
