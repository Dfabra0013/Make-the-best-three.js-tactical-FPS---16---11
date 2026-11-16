// game.js — the match in motion: the actors, the bots, the shooting, the round, the feed.

import { MAP } from './map.js';
import { World } from './collision.js';
import { buildWorld } from './world.js';
import { NavGrid } from './nav.js';
import { Actor, HITBOX } from './actors.js';
import { BotBrain, angleDelta } from './bots.js';
import { WEAPONS, GRENADES, ARMOR, KIT } from './weapons.js';
import { Match, RULES } from './round.js';
import { Effects } from './effects.js';
import { buildViewmodel } from './viewmodel.js';
import { Hud } from './hud.js';
import { BuyMenu } from './buy.js';

const STEP = 1 / 60;
const NAMES_RAID = ['Pelter', 'Brine', 'Cinder', 'Rook'];
const NAMES_WATCH = ['Warden', 'Quill', 'Slate', 'Tally'];

export class Game {
 constructor(THREE, renderer, canvas, input, audio) {
  this.THREE = THREE;
  this.renderer = renderer;
  this.canvas = canvas;
  this.input = input;
  this.audio = audio;
  this.time = 0;
  this.acc = 0;
  this.running = false;
  this.rng = mulberry32(0x5a17);

  // --- the place ---
  this.map = MAP;
  this.world = new World(MAP);
  this.nav = new NavGrid(this.world);
  this.scene = new THREE.Scene();
  this.camera = new THREE.PerspectiveCamera(76, 1, 0.05, 240);
  this.camera.rotation.order = 'YXZ';
  this.worldView = buildWorld(THREE, this.scene, this.mats = makeMats(THREE));
  this.effects = new Effects(THREE, this.scene, this.mats);
  this.viewmodel = buildViewmodel(THREE, this.mats);
  this.hud = new Hud();
  this.buyMenu = new BuyMenu(this);

  // --- the people ---
  this.actors = [];
  this.brains = new Map();
  this.player = null;
  this.buildTeams();

  this.onRoundEnd = (result, match) => this.handleRoundEnd(result, match);
  this.onRoundBegin = () => this.handleRoundBegin();
  this.onLive = () => this.handleLive();
  this.onPlant = (bomb) => this.handlePlant(bomb);
  this.onExplode = (bomb) => this.handleExplode(bomb);
  this.onMatchEnd = (r) => this.handleMatchEnd(r);
  this.onSideSwitch = () => this.handleSideSwitch();
  this.spawnTeams = () => this.spawnTeamsNow();

  // --- the match ---
  this.match = new Match(this);
  this.match.start(0);
  this.spotTimer = 0;
  this.spotted = new Set();
  this.lastStepSound = 0;
  this.alarm = null;
  this.plantHold = { by: null, progress: 0 };
  this.defuseHold = { by: null, progress: 0 };

  this.killCam = null;
  this.pendingShot = { origin: { x: 0, y: 0, z: 0 }, dir: { x: 0, y: 0, z: 0 }, rand: 0, rand2: 0, rand3: 0 };
  this.rayOut = { dist: 0, box: null, normal: { x: 0, y: 0, z: 0 } };
  this.thrown = [];
  this.cameraShake = 0;
 }

 buildTeams() {
  const THREE = this.THREE;
  const player = new Actor(THREE, this.scene, { name: 'You', team: 'raid', isPlayer: true, x: 0, z: 34, buildAvatar: false });
  this.player = player;
  this.actors.push(player);
  for (let i = 0; i < RULES.teamSize - 1; i++) {
   const raid = new Actor(THREE, this.scene, { name: NAMES_RAID[i], team: 'raid', x: -6 - i * 2, z: 33 + i });
   raid.role = 'attack';
   this.actors.push(raid);
  }
  for (let i = 0; i < RULES.teamSize; i++) {
   const watch = new Actor(THREE, this.scene, { name: NAMES_WATCH[i], team: 'watch', x: 2 - i * 3, z: -31 - i });
   watch.role = 'defend';
   this.actors.push(watch);
  }
  for (const a of this.actors) {
   if (a.isPlayer) continue;
   const brain = new BotBrain(a, this.nav, this.world);
   brain.role = a.role === 'attack' ? 'attack' : 'defend';
   this.brains.set(a.id, brain);
  }
 }

 // --- the teams, re-seated for a new round or after the side switch -----------------
 spawnTeamsNow() {
  const raidSpawns = MAP.spawns.raid;
  const watchSpawns = MAP.spawns.watch;
  let ri = 0;
  let wi = 0;
  for (const a of this.actors) {
   const spawns = a.team === 'raid' ? raidSpawns : watchSpawns;
   const idx = a.team === 'raid' ? ri++ : wi++;
   const s = spawns[idx % spawns.length];
   const yaw = a.team === 'raid' ? 0 : Math.PI;
   a.spawnAt(s.x, s.z, yaw);
   a.armor = 0;
   a.grenades = { shard: 0, haze: 0, flare: 0 };
   a.equip(WEAPONS['kettle-9']);
   a.hasKit = false;
   if (a.isPlayer) {
    a.avatar = null;
   }
  }
  this.player.team = this.playerTeam ?? this.player.team;
  this.viewmodel.setWeapon(this.player.weapon?.id ?? 'kettle-9', 0.5);
  this.alarm = null;
 }

 arm(actor, weaponId) {
  const w = WEAPONS[weaponId];
  if (!w) return false;
  actor.equip(w);
  actor.grenades = { shard: GRENADES.shard.count, haze: GRENADES.haze.count, flare: GRENADES.flare.count };
  if (actor.isPlayer) this.viewmodel.setWeapon(weaponId, w.draw);
  return true;
 }

 // --- buying ---------------------------------------------------------------------
 buyItem(actor, key) {
  if (this.match.state !== 'buy' && this.match.state !== 'live') return false;
  if (this.match.state === 'live' && !this.inBuyZone(actor)) return false;
  const price = itemPrice(key);
  if (price === null) return false;
  const team = actor.team;
  if (this.match.money[team] < price) return false;
  if (key === 'kit' && team !== 'watch') return false;
  if (key === 'armor') {
   if (actor.armor >= ARMOR.amount) return false;
   actor.armor = ARMOR.amount;
  } else if (key === 'kit') {
   if (actor.hasKit) return false;
   actor.hasKit = true;
  } else if (WEAPONS[key]) {
   actor.equip(WEAPONS[key]);
   if (actor.isPlayer) this.viewmodel.setWeapon(key, WEAPONS[key].draw);
  } else if (GRENADES[key]) {
   const def = GRENADES[key];
   if (actor.grenades[key] >= def.count) return false;
   actor.grenades[key]++;
  } else {
   return false;
  }
  this.match.money[team] -= price;
  return true;
 }

 inBuyZone(actor) {
  return actor.team === 'raid' ? actor.pos.z > 26 : actor.pos.z < -24;
 }

 // --- the step -------------------------------------------------------------------
 update(dt) {
  this.acc += Math.min(0.25, dt);
  while (this.acc >= STEP) {
   this.acc -= STEP;
   this.step(STEP);
  }
  this.render(dt);
 }

 step(dt) {
  this.time += dt;
  const t = this.time;
  if (this.match.state === 'buy' && this.buyMenu.isOpen && !this.input.down('KeyB') && this.input.consumeClicks().left > 0) {
  }
  this.controlPlayer(dt, t);
  this.updateBots(dt, t);
  for (const a of this.actors) {
   a.recover(dt);
   if (a.alive && !a.isPlayer) {
    a.step(this.THREE, this.world, dt, this.brains.get(a.id)?.intent ?? IDLE);
   }
  }
  this.stepPlayerPhysics(dt);
  this.updateThrown(dt, t);
  this.effects.update(dt);
  this.match.update(dt, t);
  this.worldView.update(t, dt);
  this.audio.setListener(this.player.pos.x, this.player.pos.z);
  if (this.cameraShake > 0) this.cameraShake = Math.max(0, this.cameraShake - dt * 3);
 }

 // --- the player -------------------------------------------------------------------
 controlPlayer(dt, t) {
  const p = this.player;
  if (!p.alive) {
   this.spectate(dt, t);
   return;
  }
  const look = this.input.consumeLook();
  p.yaw -= look.dx;
  p.pitch -= look.dy;
  p.pitch = Math.max(-1.45, Math.min(1.45, p.pitch));
  p.yaw -= 0;
  const move = this.input.movement();
  if (this.buyMenu.isOpen) {
   move.forward = move.right = 0;
  }
  p.crouchWant = move.crouch;
  const speedBefore = Math.hypot(p.vel.x, p.vel.z);
  p.aiming = this.input.buttons.right;
  this.playerIntent = {
   forward: move.forward,
   right: move.right,
   sprint: move.sprint && !this.input.down('ControlLeft'),
   crouch: move.crouch,
   jump: move.jump,
  };
  if (speedBefore > 2.2 && p.onGround && t - this.lastStepSound > (move.sprint ? 0.3 : 0.42)) {
   this.lastStepSound = t;
   this.audio.step(p.pos.x, p.pos.z, move.sprint ? 1.25 : 0.85);
   this.broadcastNoise(p.pos.x, p.pos.z, move.sprint ? 18 : 12, p);
  }
  if (!this.buyMenu.isOpen) {
   const weapon = p.weapon;
   p.aiming = this.input.buttons.right;
   if (this.input.buttons.left && p.canFire(t)) {
    if (weapon && !weapon.auto && p.fireCooldown > 0) {
    } else {
     this.playerShoot(t);
    }
   }
   if (this.input.down('KeyR') && p.reload()) this.viewmodel.startReload(p.weapon.reload);
   if (this.input.clicksCheck !== undefined) { /* reserved */ }
   if (this.input.down('KeyG')) {
    this.input.keys.delete('KeyG');
    this.throwGrenade(p, 'shard', t);
   }
   if (this.input.down('KeyH')) {
    this.input.keys.delete('KeyH');
    this.throwGrenade(p, 'haze', t);
   }
   if (this.input.down('KeyF')) {
    this.input.keys.delete('KeyF');
    this.throwGrenade(p, 'flare', t);
   }
   if (this.droppedBomb && !this.actors.some((a) => a.hasBomb)) this.pickUpBomb(p);
   if (this.input.down('KeyE')) {
    this.tryObjectiveAction(p, t);
   }
   if (this.input.down('KeyB')) {
    this.input.keys.delete('KeyB');
    this.buyMenu.toggle();
   }
  }
 }

 stepPlayerPhysics(dt) {
  const p = this.player;
  if (!p.alive) return;
  p.step(this.THREE, this.world, dt, this.playerIntent ?? IDLE);
  for (const other of this.actors) {
   if (other === p || !other.alive) continue;
   const dx = p.pos.x - other.pos.x;
   const dz = p.pos.z - other.pos.z;
   const d = Math.hypot(dx, dz);
   const minD = 0.62;
   if (d > 1e-4 && d < minD) {
    const push = (minD - d) / 2;
    p.pos.x += (dx / d) * push;
    p.pos.z += (dz / d) * push;
    other.pos.x -= (dx / d) * push;
    other.pos.z -= (dz / d) * push;
    if (other.avatar) other.avatar.group.position.set(other.pos.x, other.pos.y, other.pos.z);
   }
  }
  const speed = Math.hypot(p.vel.x, p.vel.z);
  this.viewmodel.update(dt, {
   speed,
   lookX: 0,
   lookY: 0,
   ads: p.weapon?.scoped && this.input.buttons.right,
   reload: p.reloading,
   reloadLen: p.weapon?.reload ?? 1,
  });
 }

 playerShoot(t) {
  const p = this.player;
  const out = this.pendingShot;
  out.rand = this.rng();
  out.rand2 = this.rng();
  out.rand3 = this.rng();
  p.fire(out);
  this.noteShot(p);
  const from = { x: out.origin.x, y: out.origin.y, z: out.origin.z };
  this.traceShot(p, out.dir, p.weapon, t, from);
  this.audio.shoot(p.weapon, p.pos.x, p.pos.z, 0);
  this.effects.flash(from.x + out.dir.x * 0.6, from.y + out.dir.y * 0.6 - 0.18, from.z + out.dir.z * 0.6, 0.7);
  this.viewmodel.kick(p.weapon.recoil.punch * 6);
  p.pitch += p.weapon.recoil.kick * 0.85;
  p.yaw += (out.rand3 - 0.5) * p.weapon.recoil.side * 1.4;
  this.broadcastNoise(p.pos.x, p.pos.z, 55, p);
 }

 traceShot(shooter, dir, weapon, t, from) {
  const maxDist = weapon.range ?? 120;
  const wout = this.rayOut;
  let bestActor = null;
  let bestDist = maxDist;
  let bestRegion = null;
  for (const other of this.actors) {
   if (!other.alive || other === shooter) continue;
   const hit = raySphere(from, dir, other.pos.x, other.chestY, other.pos.z, 0.42, bestDist);
   if (!hit) continue;
   if (hit < bestDist) {
    bestDist = hit;
    bestActor = other;
    bestRegion = 'chest';
   }
  }
  for (const other of this.actors) {
   if (!other.alive || other === shooter) continue;
   const hy = other.pos.y + HITBOX.head.y - other.crouch * 0.42;
   const hit = raySphere(from, dir, other.pos.x, hy, other.pos.z, HITBOX.head.r + 0.06, bestDist);
   if (hit && hit < bestDist + 0.001) {
    bestDist = hit;
    bestActor = other;
    bestRegion = 'head';
   }
   const ly = other.pos.y + HITBOX.legs.y;
   const legHit = raySphere(from, dir, other.pos.x, ly, other.pos.z, 0.3, bestDist);
   if (legHit && legHit < bestDist && bestActor !== other) {
    bestDist = legHit;
    bestActor = other;
    bestRegion = 'legs';
   }
  }
  const worldDist = this.world.raycast(from, dir, bestDist, wout);
  const endDist = Math.min(bestDist, worldDist);
  const end = { x: from.x + dir.x * endDist, y: from.y + dir.y * endDist, z: from.z + dir.z * endDist };
  if (shooter !== this.player) this.effects.tracer(from, end);
  else if (weapon.id !== 'kettle-9' || true) this.effects.tracer(from, end);
  if (bestActor && bestDist <= worldDist + 0.01) {
   this.hitActor(bestActor, shooter, weapon, bestRegion, bestDist, dir, end, t);
  } else {
   this.effects.impact(end.x, end.y, end.z, wout.normal.x, wout.normal.y, wout.normal.z);
  }
  return end;
 }

 noteShot(actor) {
  const entry = this.roundLog[this.roundLog.length - 1];
  if (entry) entry.shots++;
 }

 hitActor(target, shooter, weapon, region, dist, dir, point, t) {
  const entry = this.roundLog[this.roundLog.length - 1];
  if (entry) entry.hits++;
  const mul = region === 'head' ? weapon.headMul : region === 'legs' ? weapon.legMul : 1;
  const falloff = Math.max(0.55, 1 - dist / (weapon.range * 1.6));
  const dmg = weapon.damage * mul * falloff;
  const dealt = target.takeDamage(dmg, region, weapon, t);
  this.effects.impact(point.x, point.y, point.z, -dir.x * 0.4, 0.2, -dir.z * 0.4, true);
  if (shooter === this.player) {
   this.hud.hit(!target.alive);
   this.audio.hitConfirm(!target.alive);
  }
  if (target === this.player) {
   this.hud.damaged();
   this.cameraShake = Math.min(1, this.cameraShake + 0.4);
  }
  if (shooter === this.player) this.markDamage(point, dealt, region);
  if (!target.alive) {
   if (entry) entry.kills++;
   target.killer = shooter;
   target.killedBy = weapon;
   const reward = weapon.killReward ?? 300;
   const team = shooter.team;
   this.match.money[team] = Math.min(16000, this.match.money[team] + reward);
   this.hud.feed(shooter.isPlayer ? 'You' : shooter.name, target.isPlayer ? 'you' : target.name, weapon.name, shooter.isPlayer || target.isPlayer);
   if (target.hasBomb) {
    target.hasBomb = false;
    this.dropBomb(target.pos.x, target.pos.z);
   }
   if (target.isPlayer) this.beginSpectate(t);
  }
  return dealt;
 }

 // --- bots ---------------------------------------------------------------------
 updateBots(dt, t) {
  if (this.match.state === 'roundEnd' || this.match.state === 'over') {
   for (const brain of this.brains.values()) {
    brain.intent.forward = brain.intent.right = 0;
    brain.actor.recover(dt);
   }
   return;
  }
  for (const [id, brain] of this.brains) {
   const a = brain.actor;
   if (!a.alive) continue;
   brain.think(t, dt, this.botContext);
   a.crouchWant = brain.intent.crouch;
   a.step(this.THREE, this.world, dt, brain.intent);
  }
 }

 get botContext() {
  if (this._botCtx) return this._botCtx;
  const self = this;
  this._botCtx = {
   actors: this.actors,
   shoot: (actor) => this.botShoot(actor),
   site: () => this.targetSite(),
   bombPos: () => (this.match.bomb ? { x: this.match.bomb.x, z: this.match.bomb.z } : this.droppedBombPos()),
   canPlant: () => this.match.state === 'live' && !this.match.bomb,
   bombPlantedAt: () => (this.match.bomb ? this.match.bomb.plantedAt : -1),
   throwAt: (actor, kind) => this.throwGrenade(actor, kind, this.time),
   plant: (actor) => this.botPlant(actor),
   defuse: (actor) => this.botDefuse(actor),
   holdSpots: (actor) => this.holdSpotsFor(actor),
   watchPoints: (actor) => this.watchPointsFor(actor),
   attackGoal: (actor) => this.attackGoalFor(actor),
   getSmokeBlocking: (ax, ay, az, bx, by, bz) => this.effects.smokeBlocks(ax, ay, az, bx, by, bz),
   get alarm() { return self.alarm; },
  };
  return this._botCtx;
 }

 botShoot(actor) {
  const out = this.pendingShot;
  out.rand = this.rng();
  out.rand2 = this.rng();
  out.rand3 = this.rng();
  actor.fire(out);
  this.noteShot(actor);
  const from = { x: out.origin.x, y: out.origin.y, z: out.origin.z };
  this.traceShot(actor, out.dir, actor.weapon, this.time, from);
  this.audio.shoot(actor.weapon, actor.pos.x, actor.pos.z, Math.hypot(actor.pos.x - this.player.pos.x, actor.pos.z - this.player.pos.z));
  this.effects.flash(from.x + out.dir.x * 0.5, from.y + out.dir.y * 0.5 - 0.1, from.z + out.dir.z * 0.5, 0.55);
  this.broadcastNoise(actor.pos.x, actor.pos.z, 50, actor);
 }

 botPlant(actor) {
  if (this.match.state !== 'live' || this.match.bomb) return;
  const site = this.targetSite();
  if (!site) return;
  if (actor.hasBomb && Math.hypot(actor.pos.x - site.x, actor.pos.z - site.z) < 2.4) {
   actor.hasBomb = false;
   this.match.plant(site, this.time);
  }
 }

 botDefuse(actor) {
  const bomb = this.match.bomb;
  if (!bomb || this.match.state !== 'live') return;
  this.defuseHold.by = actor;
  this.defuseHold.progress += 1 / 60;
  const need = actor.hasKit ? RULES.defuseKitSeconds : RULES.defuseSeconds;
  if (this.defuseHold.progress >= need) {
   this.match.defuse(this.time);
   this.defuseHold.progress = 0;
  }
 }

 targetSite() {
  if (!this._targetSite) this._targetSite = Math.random() < 0.55 ? 'A' : 'B';
  const o = MAP.objectives[this._targetSite];
  return { id: o.id, x: o.x2 ?? o.x, z: o.z2 ?? o.z };
 }

 holdSpotsFor(actor) {
  if (this._holdSpots) return this._holdSpots;
  const spots = [];
  for (const id of ['A', 'B']) {
   const o = MAP.objectives[id];
   const ox = id === 'B' ? o.x2 ?? o.x : o.x;
   const oz = id === 'B' ? o.z2 ?? o.z : o.z;
   for (const c of this.nav.cellsSeeing(ox, oz, 26, 26)) spots.push(c);
  }
  this._holdSpots = spots;
  return spots;
 }

 watchPointsFor() {
  if (this._watch) return this._watch;
  const pts = [];
  for (const id of ['A', 'B']) {
   const o = MAP.objectives[id];
   pts.push({ x: o.x2 ?? o.x, z: o.z2 ?? o.z });
  }
  pts.push({ x: 0, z: 20 }, { x: 0, z: -20 }, { x: -26, z: 6 }, { x: 30, z: 16 }, { x: -20, z: -26 });
  this._watch = pts;
  return pts;
 }

 attackGoalFor(actor) {
  const site = this.targetSite();
  const idx = this.actors.filter((a) => a.team === 'raid').indexOf(actor);
  const ring = this._attackRing ?? (this._attackRing = this.nav.cellsSeeing(site.x, site.z, 15, 40));
  if (ring.length === 0) return site;
  return ring[(idx * 3 + Math.floor(this.time / 6)) % ring.length];
 }

 // --- throwing ---------------------------------------------------------------------
 throwGrenade(actor, kind, t) {
  if (!actor.alive || actor.grenades[kind] <= 0) return false;
  const def = GRENADES[kind];
  actor.grenades[kind]--;
  const from = { x: actor.pos.x, y: actor.eyeY - 0.1, z: actor.pos.z };
  const power = 17;
  const dir = {
   x: -Math.sin(actor.yaw) * Math.cos(actor.pitch),
   y: Math.sin(actor.pitch) + 0.18,
   z: -Math.cos(actor.yaw) * Math.cos(actor.pitch),
  };
  const mesh = new this.THREE.Mesh(
   new this.THREE.IcosahedronGeometry(0.12, 0),
   new this.THREE.MeshStandardMaterial({ color: kind === 'haze' ? 0x9fb3b6 : kind === 'flare' ? 0xe7e2d6 : 0xf0a03c, roughness: 0.5, metalness: 0.4 }),
  );
  mesh.position.set(from.x, from.y, from.z);
  this.scene.add(mesh);
  this.thrown.push({
   kind, def, mesh,
   pos: { ...from },
   vel: { x: dir.x * power, y: dir.y * power, z: dir.z * power },
   detonateAt: t + def.fuse,
   owner: actor,
  });
  return true;
 }

 updateThrown(dt, t) {
  for (let i = this.thrown.length - 1; i >= 0; i--) {
   const g = this.thrown[i];
   g.vel.y -= 20 * dt;
   const next = { x: g.pos.x + g.vel.x * dt, y: g.pos.y + g.vel.y * dt, z: g.pos.z + g.vel.z * dt };
   const ground = this.world.heightAt(next.x, next.z, g.pos.y + 0.4);
   if (next.y <= ground + 0.12) {
    next.y = ground + 0.12;
    g.vel.y = -g.vel.y * 0.32;
    g.vel.x *= 0.62;
    g.vel.z *= 0.62;
    if (Math.abs(g.vel.y) < 0.6) g.vel.y = 0;
   }
   const probe = { x: next.x, z: next.z };
   this.world.resolveCircle(probe, 0.14, next.y - 0.1, 0.3);
   if (Math.abs(probe.x - next.x) > 1e-4) g.vel.x *= -0.4;
   if (Math.abs(probe.z - next.z) > 1e-4) g.vel.z *= -0.4;
   next.x = probe.x;
   next.z = probe.z;
   g.pos = next;
   g.mesh.position.set(next.x, next.y, next.z);
   if (t >= g.detonateAt) {
    this.detonate(g, t);
    this.scene.remove(g.mesh);
    g.mesh.geometry.dispose();
    g.mesh.material.dispose();
    this.thrown.splice(i, 1);
   }
  }
 }

 detonate(g, t) {
  const { kind, pos, def } = g;
  if (kind === 'shard') {
   this.effects.blast(pos.x, pos.y + 0.2, pos.z);
   this.audio.explosion(pos.x, pos.z);
   this.cameraShake = Math.min(1.4, this.cameraShake + Math.max(0, 1 - Math.hypot(pos.x - this.player.pos.x, pos.z - this.player.pos.z) / 16));
   for (const a of this.actors) {
    if (!a.alive) continue;
    const d = Math.hypot(a.pos.x - pos.x, a.pos.z - pos.z);
    if (d > def.radius) continue;
    const los = !this.world.segmentBlocked(pos.x, pos.y + 0.2, pos.z, a.pos.x, a.chestY, a.pos.z);
    const falloff = Math.max(0, 1 - d / def.radius) * (los ? 1 : 0.45);
    a.takeDamage(def.damage * falloff, 'chest', { armorPen: 0.5 }, t);
    if (!a.alive) {
     a.killer = g.owner;
     a.killedBy = { name: 'Shard' };
     this.hud.feed(g.owner?.isPlayer ? 'You' : g.owner?.name ?? '—', a.isPlayer ? 'you' : a.name, 'Shard', g.owner?.isPlayer);
     if (a.isPlayer) this.beginSpectate(t);
    }
   }
  } else if (kind === 'haze') {
   this.effects.smoke(pos.x, pos.z, def.duration, def.radius);
   this.audio.beep(300, 0.3, 0.08);
  } else if (kind === 'flare') {
   this.audio.flash(pos.x, pos.z);
   this.effects.blast(pos.x, pos.y + 0.4, pos.z);
   for (const a of this.actors) {
    if (!a.alive) continue;
    const d = Math.hypot(a.pos.x - pos.x, a.pos.z - pos.z);
    if (d > def.radius) continue;
    const toX = pos.x - a.pos.x;
    const toZ = pos.z - a.pos.z;
    const fx = -Math.sin(a.yaw);
    const fz = -Math.cos(a.yaw);
    const facing = (toX * fx + toZ * fz) / (Math.hypot(toX, toZ) || 1);
    const los = !this.world.segmentBlocked(a.pos.x, a.eyeY, a.pos.z, pos.x, pos.y + 0.4, pos.z);
    if (facing > 0.35 && los) {
     a.flashUntil = Math.max(a.flashUntil, this.time + def.duration * (1 - d / def.radius) * 0.9);
     if (a.isPlayer) this.hud.banner('BLINDED', 'flare — hold still and wait', 'loss', 1.6);
    }
   }
  }
 }

 // --- planting and defusing ---------------------------------------------------------
 tryObjectiveAction(actor, t) {
  const site = this.inSite(actor);
  if (actor.hasBomb && site && !this.match.bomb && this.match.state === 'live') {
   this.plantHold.by = actor;
   this.plantHold.progress += 1 / 60;
   if (this.plantHold.progress >= RULES.plantSeconds) {
    actor.hasBomb = false;
    this.match.plant({ id: site.id, x: site.x, z: site.z }, t);
    this.plantHold.progress = 0;
   }
   return;
  }
  this.plantHold.progress = 0;
  const bomb = this.match.bomb;
  if (bomb && !bomb.defused && actor.team === 'watch') {
   const d = Math.hypot(actor.pos.x - bomb.x, actor.pos.z - bomb.z);
   if (d < 1.8) {
    this.defuseHold.by = actor;
    this.defuseHold.progress += 1 / 60;
    const need = actor.hasKit ? RULES.defuseKitSeconds : RULES.defuseSeconds;
    if (this.defuseHold.progress >= need) {
     this.match.defuse(t);
     this.defuseHold.progress = 0;
    }
    return 0;
   }
  }
  this.defuseHold.progress = 0;
 }

 inSite(actor) {
  for (const id of ['A', 'B']) {
   const o = MAP.objectives[id];
   const ox = id === 'B' ? o.x2 ?? o.x : o.x;
   const oz = id === 'B' ? o.z2 ?? o.z : o.z;
   if (Math.hypot(actor.pos.x - ox, actor.pos.z - oz) < o.r + 1.2) return { id, x: ox, z: oz };
  }
  return null;
 }

 plantingProgress() {
  if (this.plantHold.by === this.player && this.match.state === 'live') return Math.min(1, this.plantHold.progress / RULES.plantSeconds);
  return 0;
 }

 // --- the bomb on the ground ---------------------------------------------------------
 dropBomb(x, z) {
  if (this.droppedBomb) return;
  this.droppedBomb = { x, z, mesh: null };
  const mesh = new this.THREE.Mesh(new this.THREE.BoxGeometry(0.4, 0.24, 0.28), new this.THREE.MeshStandardMaterial({ color: 0x3a3f42, roughness: 0.6, metalness: 0.5, emissive: 0xf0a03c, emissiveIntensity: 0.35 }));
  mesh.position.set(x, 0.16, z);
  this.scene.add(mesh);
  this.droppedBomb.mesh = mesh;
 }

 droppedBombPos() {
  return this.droppedBomb ? { x: this.droppedBomb.x, z: this.droppedBomb.z } : null;
 }

 pickUpBomb(actor) {
  if (!this.droppedBomb || actor.team !== 'raid') return;
  const d = Math.hypot(actor.pos.x - this.droppedBomb.x, actor.pos.z - this.droppedBomb.z);
  if (d < 1.2 && !this.actors.some((a) => a.hasBomb)) {
   actor.hasBomb = true;
   this.scene.remove(this.droppedBomb.mesh);
   this.droppedBomb.mesh.geometry.dispose();
   this.droppedBomb.mesh.material.dispose();
   this.droppedBomb = null;
  }
 }

 // --- events -----------------------------------------------------------------------
 broadcastNoise(x, z, radius, source) {
  if (source.team === 'raid') this.alarm = null;
  if (source.team === 'watch') return;
  this.alarm = { x, z, at: this.time };
  for (const [id, brain] of this.brains) {
   if (brain.actor.team === 'watch' && brain.state === 'hold') brain.repathAt = 0;
  }
 }

 isSpotted(actor) {
  for (const a of this.actors) {
   if (!a.alive || a.team === actor.team) continue;
   const dist = Math.hypot(a.pos.x - actor.pos.x, a.pos.z - actor.pos.z);
   if (dist > 55) continue;
   if (!this.world.segmentBlocked(a.pos.x, a.eyeY, a.pos.z, actor.pos.x, actor.chestY, actor.pos.z)) return true;
  }
  return false;
 }

 handleRoundBegin() {
  this.roundLog = this.roundLog ?? [];
  this.roundLog.push({ round: this.match.round, shots: 0, hits: 0, kills: 0 });
  this.plantHold = this.plantHold ?? { by: null, progress: 0 };
  this.defuseHold = this.defuseHold ?? { by: null, progress: 0 };
  this.plantHold.progress = 0;
  this.defuseHold.progress = 0;
  if (this.thrown) {
   for (const g of this.thrown) this.scene.remove(g.mesh);
   this.thrown.length = 0;
  } else {
   this.thrown = [];
  }
  if (this.droppedBomb) {
   this.scene.remove(this.droppedBomb.mesh);
   this.droppedBomb = null;
  }
  this._botCtx = null;
  this._targetSite = Math.random() < 0.55 ? 'A' : 'B';
  this.targetSiteHint = this._targetSite;
  this._holdSpots = null;
  this._attackRing = null;
  this._watch = null;
  this.plantSite = null;
  this.spectating = false;
  this.player.alive = true;
 }

 handleLive() {
  if (this.buyMenu.isOpen) this.buyMenu.hide();
  this.hud.banner(`ROUND ${this.match.round}`, this.player.team === 'raid' ? `set the charge at ${this.targetSiteHint}` : 'hold the works', 'win', 1.8);
  this.audio.beep(660, 0.12, 0.06);
 }

 handlePlant(bomb) {
  this.hud.banner('CHARGE SET', `${bomb.site} · ${RULES.bombSeconds}s`, 'loss', 2.4);
  this.audio.beep(420, 0.25, 0.1);
  this.buyMenu.hide();
 }

 handleExplode(bomb) {
  this.effects.blast(bomb.x, 0.4, bomb.z);
  this.audio.explosion(bomb.x, bomb.z);
  this.cameraShake = 1.4;
  const d = Math.hypot(bomb.x - this.player.pos.x, bomb.z - this.player.pos.z);
  if (d < 22) this.hud.damaged();
 }

 handleRoundEnd(result, match) {
  const entry = this.roundLog[this.roundLog.length - 1];
  if (entry) Object.assign(entry, { winner: result.winner, reason: result.reason });
  const won = result.winner === this.player.team;
  const why = { exploded: 'the charge went off', defused: 'the charge was cut', eliminated: 'all contacts down', timeout: 'the clock ran out', defenders: 'the defenders held' }[result.reason] ?? result.reason;
  this.hud.banner(won ? 'ROUND WON' : 'ROUND LOST', why, won ? 'win' : 'loss', 3.2);
  this.audio.sting(won);
 }

 handleMatchEnd(result) {
  const won = result.winner === this.player.team;
  this.hud.banner(won ? 'MATCH WON' : 'MATCH LOST', `${result.scores.raid} — ${result.scores.watch}`, won ? 'win' : 'loss', 12);
  this.audio.sting(won);
 }

 handleSideSwitch() {
  this.playerTeam = this.player.team === 'raid' ? 'watch' : 'raid';
  for (const a of this.actors) a.team = a.team === 'raid' ? 'watch' : 'raid';
  this.player.team = this.playerTeam;
  this.match.money.raid = 1000;
  this.match.money.watch = 1000;
  for (const [id, brain] of this.brains) brain.role = brain.actor.team === 'raid' ? 'attack' : 'defend';
  this.spawnTeamsNow();
  this.hud.banner('SIDES SWITCHED', this.playerTeam === 'raid' ? 'you attack' : 'you defend', 'win', 3);
 }

 beginSpectate(t) {
  this.spectating = true;
  this.killCam = { at: t };
 }

 spectate(dt, t) {
  const mate = this.actors.filter((a) => a.alive && a.team === this.player.team)[0];
  if (!mate) return;
  const want = { x: mate.pos.x, y: mate.eyeY + 0.6, z: mate.pos.z };
  const p = this.player;
  p.pos.x += (want.x - p.pos.x) * Math.min(1, dt * 4);
  p.pos.z += (want.z - p.pos.z) * Math.min(1, dt * 4);
  p.pos.y += (want.y - p.pos.y) * Math.min(1, dt * 4);
  p.yaw = mate.yaw;
  p.pitch = mate.pitch;
 }

 // --- questions the HUD and the bots ask ---------------------------------------------
 objectiveLine() {
  const m = this.match;
  if (m.state === 'over') return m.matchOver ? 'match over' : '';
  if (m.state === 'roundEnd') {
   const r = m.roundResult;
   if (!r) return 'round over';
   return r.winner === this.player.team ? 'round won — next round buys in a moment' : 'round lost — go again';
  }
  if (this.player.team === 'raid') {
   if (m.bomb) return `charge set at ${m.bomb.site} — hold it`;
   if (this.player.hasBomb) return `carry the charge to ${this.targetSiteHint ?? 'A or B'}`;
   if (this.actors.some((a) => a.hasBomb)) return `set the charge at ${this.targetSiteHint ?? 'A or B'}`;
   return 'recover the charge';
  }
  if (m.bomb) return `cut the charge — ${Math.max(0, Math.ceil(m.bomb.explodesAt - this.time))}s`;
  return 'hold both reliquaries';
 }

 playerSpread() {
  return this.player.alive ? this.player.currentSpread() : 0;
 }

 aiming() {
  return this.player.alive && !!this.player.aiming;
 }

 hasDefuseKit(actor) {
  return !!actor.hasKit;
 }

 // --- the scoreboard ---------------------------------------------------------------
 toggleScoreboard(show) {
  if (!this.scoreboardEl) {
   const el = document.createElement('div');
   el.id = 'scoreboard';
   el.style.cssText = `position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:18;
    min-width:520px;padding:20px 26px;background:rgba(13,17,20,0.94);border:1px solid #2b343a;border-radius:3px;
    font-family:var(--font-ui);color:#e7e2d6;display:none;pointer-events:none;`;
   document.body.appendChild(el);
   this.scoreboardEl = el;
  }
  this.scoreboardEl.style.display = show ? 'block' : 'none';
  if (show) {
   const rows = (team) => this.actors.filter((a) => a.team === team).map((a) => {
    const me = a.isPlayer ? ' style="color:#f0a03c"' : '';
    return `<tr><td${me}>${a.id === this.player.id ? 'You' : a.name}</td>` +
     `<td>${Math.round(a.health)}</td><td>${Math.round(a.armor)}</td>` +
     `<td>${a.weapon ? a.weapon.name : '—'}</td><td>${a.alive ? 'up' : 'down'}</td></tr>`;
   }).join('');
   this.scoreboardEl.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid #2b343a;padding-bottom:8px;margin-bottom:10px">
     <div style="font-size:18px;letter-spacing:.1em">THE BRINE WORKS</div>
     <div style="font-family:var(--font-readout);font-size:20px">
      <span style="color:#f0a03c">${this.match.scores.raid}</span> —
      <span style="color:#3d95ac">${this.match.scores.watch}</span></div>
    </div>
    <div style="font-size:11px;letter-spacing:.18em;color:#93a0a6;margin:6px 0 4px">RAID · $${this.match.money.raid}</div>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
     <tr style="color:#93a0a6;font-size:11px;letter-spacing:.12em"><td>OPERATOR</td><td>HP</td><td>PLATE</td><td>WEAPON</td><td>STATE</td></tr>
     ${rows('raid')}
    </table>
    <div style="font-size:11px;letter-spacing:.18em;color:#93a0a6;margin:14px 0 4px">WATCH · $${this.match.money.watch}</div>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
     ${rows('watch')}
    </table>
    <div style="margin-top:14px;font-size:11px;color:#5b6a72;letter-spacing:.1em">TAB HOLDS THE BOARD · F1 OPENS THE SIMULATION READOUT</div>`;
  }
 }

 // --- debug ---------------------------------------------------------------------
 debugState() {
  const p = this.player;
  const bots = this.actors.filter((a) => !a.isPlayer).map((a) => ({
   name: a.name,
   team: a.team,
   ai: this.brains.get(a.id)?.state ?? '-',
   hp: Math.round(a.health),
   x: +a.pos.x.toFixed(1),
   z: +a.pos.z.toFixed(1),
   status: a.alive ? 'up' : 'down',
  }));
  return {
   time: this.time,
   round: this.match.round,
   phase: this.match.state,
   scores: this.match.scores,
   money: this.match.money,
   player: {
    hp: Math.round(p.health),
    armor: Math.round(p.armor),
    x: +p.pos.x.toFixed(1),
    z: +p.pos.z.toFixed(1),
    weapon: p.weapon?.name ?? '-',
    mag: p.mag,
    reserve: p.reserve,
    spreadDeg: +((this.playerSpread() * 180) / Math.PI).toFixed(2),
    hasBomb: p.hasBomb,
   },
   botCount: this.brains.size,
   bots,
   roundLog: this.roundLog,
   bomb: this.match.bomb,
  };
 }

 // --- drawing -------------------------------------------------------------------
 resize(w, h, dpr) {
  this.renderer.setSize(w, h, false);
  this.renderer.setPixelRatio(dpr);
  this.camera.aspect = w / h;
  this.camera.updateProjectionMatrix();
  this.viewmodel.camera.aspect = w / h;
  this.viewmodel.camera.updateProjectionMatrix();
 }

 render(dt) {
  const p = this.player;
  const shake = this.cameraShake;
  const bob = Math.min(1, Math.hypot(p.vel.x, p.vel.z) / 6);
  const camY = p.alive ? p.eyeY : p.pos.y;
  this.camera.position.set(p.pos.x + Math.sin(this.time * 40) * shake * 0.02, camY + Math.sin(this.time * 9) * bob * 0.012, p.pos.z + Math.cos(this.time * 36) * shake * 0.02);
  this.camera.rotation.set(p.pitch + p.recoil.x * 0.0, p.yaw, -Math.sin(this.time * 30) * shake * 0.01);
  this.camera.fov = p.weapon?.scoped && this.input.buttons.right ? 32 : 76;
  this.camera.updateProjectionMatrix();
  const flash = Math.max(0, (p.flashUntil - this.time) / 1);
  this.renderer.render(this.scene, this.camera);
  this.renderer.autoClear = false;
  this.renderer.clearDepth();
  if (p.alive) this.renderer.render(this.viewmodel.scene, this.viewmodel.camera);
  this.renderer.autoClear = true;
  this.hud.flashOverlay?.(flash);
  this.hud.update(this, dt);
 }
}

function itemPrice(key) {
 if (key === 'armor') return ARMOR.price;
 if (key === 'kit') return KIT.price;
 if (WEAPONS[key]) return WEAPONS[key].price;
 if (GRENADES[key]) return GRENADES[key].price;
 return null;
}

function raySphere(o, d, cx, cy, cz, r, maxDist) {
 const ox = o.x - cx;
 const oy = o.y - cy;
 const oz = o.z - cz;
 const b = ox * d.x + oy * d.y + oz * d.z;
 const c = ox * ox + oy * oy + oz * oz - r * r;
 const disc = b * b - c;
 if (disc < 0) return 0;
 const sq = Math.sqrt(disc);
 let t = -b - sq;
 if (t < 0) t = -b + sq;
 if (t < 0 || t > maxDist) return 0;
 return t;
}

function makeMats(THREE) {
 const std = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, ...opts });
 return {
  salt: std(0xe8e4d8, { roughness: 0.92 }),
  saltDark: std(0xc9c3b2, { roughness: 0.95 }),
  concrete: std(0x9aa2a6, { roughness: 0.88 }),
  steel: std(0x5b6a72, { roughness: 0.6, metalness: 0.35 }),
  iron: std(0x4d5a62, { roughness: 0.55, metalness: 0.4 }),
  rust: std(0xb45533, { roughness: 0.85, metalness: 0.15 }),
  timber: std(0x7a5f42, { roughness: 0.92 }),
  chalk: std(0xf2eee2, { roughness: 0.8 }),
  moss: std(0x5d7055, { roughness: 1 }),
  lamp: new THREE.MeshBasicMaterial({ color: 0xffd79a }),
  gunMetal: std(0x4a565d, { roughness: 0.45, metalness: 0.45 }),
  gunPoly: std(0x5e6a70, { roughness: 0.8, metalness: 0.12 }),
  accent: std(0xf0a03c, { roughness: 0.7 }),
  tideline: std(0x3d95ac, { roughness: 0.8 }),
 };
}

const IDLE = { forward: 0, right: 0, jump: false, crouch: false, sprint: false };

function mulberry32(a) {
 return function () {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
 };
}
