// bots.js — the other four operators, on both sides.

import { WEAPONS, GRENADES } from './weapons.js';

const SIGHT_RANGE = 62;
const FOV_COS = Math.cos((68 * Math.PI) / 180);

export class BotBrain {
 constructor(actor, nav, world) {
  this.actor = actor;
  this.nav = nav;
  this.world = world;
  this.state = 'hold';
  this.path = [];
  this.pathIndex = 0;
  this.goal = null;
  this.repathAt = 0;
  this.target = null;
  this.targetSeenAt = -99;
  this.lastKnown = null;
  this.reactAt = 0;
  this.aimError = 1;
  this.strafe = 0;
  this.strafeAt = 0;
  this.burstLeft = 0;
  this.burstPause = 0;
  this.holdSpot = null;
  this.lookAt = null;
  this.nextLookAt = 0;
  this.personality = {
   aim: 0.55 + Math.random() * 0.35, // how tight the aim settles
   reaction: 0.18 + Math.random() * 0.26,
   aggression: Math.random(),
   burst: 2 + ((Math.random() * 5) | 0),
  };
  this.grenadeCooldown = 6 + Math.random() * 12;
  this.intent = { forward: 0, right: 0, jump: false, crouch: false, sprint: false };
 }

 get a() {
  return this.actor;
 }

 // --- the decision step, run at the simulation's fixed rate --------------------

 think(now, dt, ctx) {
  const a = this.actor;
  if (!a.alive) return this.intent;
  this.maybeThrow(now, ctx);
  const enemy = this.perceive(now, ctx);
  if (enemy) {
   this.target = enemy;
   this.targetSeenAt = now;
   this.lastKnown = { x: enemy.pos.x, z: enemy.pos.z };
   if (this.state !== 'fight') {
    this.state = 'fight';
    this.reactAt = now + this.personality.reaction;
    this.aimError = 1;
    this.burstLeft = this.personality.burst;
   }
  } else if (this.target && now - this.targetSeenAt > 0.9) {
   this.target = null;
  }
  switch (this.state) {
   case 'fight':
    this.fight(now, dt, ctx);
    break;
   case 'plant':
    this.plant(now, ctx);
    break;
   case 'defuse':
    this.defuse(now, ctx);
    break;
   default:
    this.roam(now, dt, ctx);
  }
  return this.intent;
 }

 // --- throwing -------------------------------------------------------------------
 maybeThrow(now, ctx) {
  const a = this.actor;
  this.grenadeCooldown -= 1 / 60;
  if (this.grenadeCooldown > 0) return;
  const hasFrag = a.grenades.shard > 0;
  const hasSmoke = a.grenades.haze > 0;
  if (this.target && hasFrag && this.targetSeenAt === now) {
   const d = Math.hypot(this.target.pos.x - a.pos.x, this.target.pos.z - a.pos.z);
   if (d > 6 && d < 26) {
    a.pitch = 0.22;
    ctx.throwAt(a, 'shard');
    this.grenadeCooldown = 14 + Math.random() * 12;
    return;
   }
  }
  if (hasSmoke && this.target && a.health < 55) {
   ctx.throwAt(a, 'haze');
   this.grenadeCooldown = 18 + Math.random() * 10;
  }
 }

 // --- perception ------------------------------------------------------------------

 perceive(now, ctx) {
  const a = this.actor;
  let best = null;
  let bestDist = Infinity;
  const eye = a.eyeY;
  const fx = -Math.sin(a.yaw);
  const fz = -Math.cos(a.yaw);
  for (const other of ctx.actors) {
   if (!other.alive || other.team === a.team) continue;
   const dx = other.pos.x - a.pos.x;
   const dz = other.pos.z - a.pos.z;
   const dist = Math.hypot(dx, dz);
   if (dist > SIGHT_RANGE) continue;
   const dot = (dx * fx + dz * fz) / (dist || 1);
   const inCone = dot > FOV_COS || dist < 5 || now - a.lastDamageAt < 0.6;
   if (!inCone) continue;
   if (ctx.getSmokeBlocking && ctx.getSmokeBlocking(a.pos.x, eye, a.pos.z, other.pos.x, other.chestY, other.pos.z)) continue;
   const targetY = other.pos.y + 1.05 - other.crouch * 0.3;
   if (this.world.segmentBlocked(a.pos.x, eye, a.pos.z, other.pos.x, targetY, other.pos.z)) continue;
   if (dist < bestDist) {
    bestDist = dist;
    best = other;
   }
  }
  return best;
 }

 // --- fighting ----------------------------------------------------------------------

 fight(now, dt, ctx) {
  const a = this.actor;
  const target = this.target;
  if (!target) {
   this.state = this.role === 'attack' ? 'advance' : 'hold';
   return;
  }
  const dx = target.pos.x - a.pos.x;
  const dz = target.pos.z - a.pos.z;
  const dist = Math.hypot(dx, dz);
  const aimYaw = Math.atan2(-dx, -dz);
  const targetY = target.pos.y + 1.2 - target.crouch * 0.34;
  const aimPitch = Math.atan2(targetY - a.eyeY, dist);
  const equipped = a.weapon;
  this.aimError = Math.max(0.12, this.aimError - dt * (0.9 + this.personality.aim));
  const jitter = this.aimError * 0.055;
  const noise = (n) => Math.sin(now * 7.3 + n * 12.9) * 0.5 + Math.sin(now * 3.1 + n * 4.7) * 0.5;
  const wantYaw = aimYaw + noise(a.id) * jitter;
  const wantPitch = aimPitch + noise(a.id + 3) * jitter * 0.6;
  a.yaw = turnToward(a.yaw, wantYaw, dt * 9);
  a.pitch = turnToward(a.pitch, wantPitch, dt * 9);

  const ideal = equipped?.scoped ? 34 : equipped?.id === 'tidecaller' ? 9 : 17;
  if (now > this.strafeAt) {
   this.strafe = -1 + ((Math.random() * 2) | 0) * 2;
   this.strafeAt = now + 0.5 + Math.random() * 0.7;
  }
  const aligned = Math.abs(angleDelta(a.yaw, aimYaw)) < 0.14;
  this.intent.forward = dist > ideal + 3 ? 1 : dist < ideal - 4 ? -0.8 : 0;
  this.intent.right = aligned ? this.strafe * 0.8 : 0;
  this.intent.crouch = dist > 14 && aligned && this.personality.aggression < 0.4;
  this.intent.sprint = false;

  if (now < this.reactAt) return;
  if (this.burstPause > 0) {
   this.burstPause -= dt;
   return;
  }
  if (!a.canFire(now)) {
   if (a.mag === 0 && a.reserve > 0) a.reload();
   return;
  }
  if (equipped && equipped.scoped && dist > 20 && this.aimError < 0.35) {
   ctx.shoot(a);
   this.burstPause = 0.35;
   return;
  }
  if (this.burstLeft <= 0) {
   this.burstLeft = this.personality.burst;
   this.burstPause = 0.24 + Math.random() * 0.3;
   return;
  }
  if (aligned && Math.abs(a.pitch - aimPitch) < 0.1) {
   ctx.shoot(a);
   this.burstLeft--;
   if (this.burstLeft <= 0) this.burstPause = 0.22 + Math.random() * 0.4;
  }
 }

 // --- objectives ----------------------------------------------------------------------

 plant(now, ctx) {
  const a = this.actor;
  const site = ctx.site();
  if (!site || !a.hasBomb) {
   this.state = 'advance';
   return;
  }
  const dist = Math.hypot(a.pos.x - site.x, a.pos.z - site.z);
  if (dist < 1.8) {
   this.intent.forward = this.intent.right = 0;
   a.crouch = 1;
   ctx.plant(a);
  } else {
   this.goto(now, site.x, site.z);
  }
 }

 defuse(now, ctx) {
  const a = this.actor;
  const bomb = ctx.bombPos();
  if (!bomb) {
   this.state = 'hold';
   return;
  }
  const dist = Math.hypot(a.pos.x - bomb.x, a.pos.z - bomb.z);
  if (dist < 1.5) {
   this.intent.forward = this.intent.right = 0;
   a.crouch = 1;
   ctx.defuse(a);
  } else {
   this.goto(now, bomb.x, bomb.z);
  }
 }

 // --- moving and holding ---------------------------------------------------------------

 roam(now, dt, ctx) {
  const a = this.actor;
  if (this.role === 'attack') {
   if (a.hasBomb && ctx.canPlant() && ctx.bombPlantedAt() < 0) {
    this.state = 'plant';
    return;
   }
   const goal = ctx.attackGoal(a);
   if (goal) this.goto(now, goal.x, goal.z, 1.1);
   else this.hold(now, ctx);
  } else {
   const bomb = ctx.bombPos();
   if (bomb) {
    this.state = 'defuse';
    return;
   }
   if (ctx.alarm) {
    const spot = this.nav.cellsSeeing(ctx.alarm.x, ctx.alarm.z, 16, 8)[0];
    if (spot) this.goto(now, spot.x, spot.z, 1);
    else this.hold(now, ctx);
   } else {
    this.hold(now, ctx);
   }
  }
 }

 hold(now, ctx) {
  const a = this.actor;
  if (!this.holdSpot) {
   const spots = ctx.holdSpots(a);
   this.holdSpot = spots.length ? spots[(Math.random() * spots.length) | 0] : { x: a.pos.x, z: a.pos.z };
  }
  const d = Math.hypot(a.pos.x - this.holdSpot.x, a.pos.z - this.holdSpot.z);
  if (d > 1.4) {
   this.goto(now, this.holdSpot.x, this.holdSpot.z, 1);
  } else {
   this.intent.forward = this.intent.right = 0;
   this.intent.crouch = this.personality.aggression < 0.45;
   this.intent.sprint = false;
   if (now > this.nextLookAt) {
    const watch = ctx.watchPoints(a);
    this.lookAt = watch.length ? watch[(Math.random() * watch.length) | 0] : null;
    this.nextLookAt = now + 2.5 + Math.random() * 3;
   }
   if (this.lookAt) {
    const wantYaw = Math.atan2(-(this.lookAt.x - a.pos.x), -(this.lookAt.z - a.pos.z));
    a.yaw = turnToward(a.yaw, wantYaw, (now > this.nextLookAt - 2.5 ? 6 : 2.2) * 0.016);
    a.pitch = turnToward(a.pitch, 0, 0.04);
   }
  }
 }

 goto(now, x, z, speedScale = 1) {
  const a = this.actor;
  if (now > this.repathAt || this.path.length === 0 || !this.goal || Math.hypot(this.goal.x - x, this.goal.z - z) > 2.5) {
   this.path = this.nav.path(a.pos.x, a.pos.z, x, z);
   this.pathIndex = 0;
   this.goal = { x, z };
   this.repathAt = now + 1.4 + Math.random() * 0.8;
  }
  const wp = this.path[this.pathIndex];
  if (!wp) {
   this.intent.forward = 0;
   this.intent.right = 0;
   this.intent.crouch = false;
   this.intent.sprint = false;
   return;
  }
  const dx = wp.x - a.pos.x;
  const dz = wp.z - a.pos.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.7) {
   this.pathIndex++;
   return;
  }
  const wantYaw = Math.atan2(-dx, -dz);
  a.yaw = turnToward(a.yaw, wantYaw, 0.14);
  if (Math.abs(angleDelta(a.yaw, wantYaw)) > 0.9) {
   this.intent.forward = 0;
   this.intent.sprint = false;
  } else {
   this.intent.forward = speedScale;
   this.intent.sprint = speedScale >= 1 && this.pathIndex < this.path.length - 1 ? false : false;
  }
  this.intent.right = 0;
  this.intent.crouch = false;
  a.pitch = turnToward(a.pitch, 0, 0.05);
 }
}

function turnToward(current, want, maxStep) {
 let d = angleDelta(current, want);
 if (Math.abs(d) <= maxStep) return want;
 return current + Math.sign(d) * maxStep;
}

function angleDelta(a, b) {
 let d = (b - a) % (Math.PI * 2);
 if (d > Math.PI) d -= Math.PI * 2;
 if (d < -Math.PI) d += Math.PI * 2;
 return d;
}

export { angleDelta, turnToward };
