// round.js — the rules of a match, apart from how it looks.

import { LOSS_BONUS, ROUND_REWARD, START_MONEY, MAX_MONEY } from './weapons.js';

export const RULES = {
 winRounds: 4,
 sideSwitchAfter: 3, // a short match: attack three, defend three, first to four
 roundSeconds: 80,
 warmupSeconds: 4,
 buySeconds: 14,
 bombSeconds: 38,
 plantSeconds: 3.2,
 defuseSeconds: 8.5,
 defuseKitSeconds: 5.0,
 teamSize: 3, // the player and two bots per side: a short match, always a full round
 roundEndPause: 5.0,
};

export class Match {
 constructor(ctx) {
  this.ctx = ctx; // { audio, hud, bots, actors, world, nav }
  this.round = 0;
  this.state = 'warmup'; // warmup | buy | live | over | roundEnd
  this.time = 0;
  this.phaseEnds = 0;
  this.scores = { raid: 0, watch: 0 };
  this.lossStreak = { raid: 0, watch: 0 };
  this.money = { raid: START_MONEY, watch: START_MONEY };
  this.bomb = null;
  this.roundResult = null;
  this.playerTeam = 'raid';
  this.radio = [];
  this.lastBeep = 0;
  this.matchOver = false;
 }

 start(time) {
  this.round = 1;
  this.beginRound(time);
 }

 beginRound(time) {
  this.state = 'buy';
  this.phaseEnds = time + RULES.buySeconds;
  this.bomb = null;
  this.roundResult = null;
  this.plantProgress = 0;
  this.defuseProgress = 0;
  this.ctx.onRoundBegin?.(this);
  this.ctx.spawnTeams?.();
  for (const a of this.ctx.actors) {
   const teamMoney = this.money[a.team];
   if (a.isPlayer) {
    this.ctx.buyMenu?.open(a, teamMoney, time);
   } else {
    this.ctx.botBuy?.(a, teamMoney);
   }
  }
  const attackers = this.ctx.actors.filter((a) => a.team === 'raid' && a.alive);
  if (attackers.length) {
   const carrier = attackers[(Math.random() * attackers.length) | 0];
   carrier.hasBomb = true;
   this.bombCarrier = carrier;
  }
 }

 get clock() {
  return Math.max(0, this.phaseEnds - this.time);
 }

 goLive(time) {
  if (this.state !== 'buy') return;
  this.state = 'live';
  this.phaseEnds = time + RULES.roundSeconds;
  this.ctx.onLive?.(this);
 }

 plant(site, time) {
  if (this.state !== 'live' || this.bomb) return false;
  this.bomb = { x: site.x, z: site.z, site: site.id, plantedAt: time, explodesAt: time + RULES.bombSeconds, defused: false, exploded: false, beepAt: 0 };
  this.phaseEnds = time + RULES.bombSeconds;
  this.ctx.onPlant?.(this.bomb);
  return true;
 }

 defuse(time) {
  if (!this.bomb || this.bomb.defused) return false;
  this.bomb.defused = true;
  this.bomb.defusedAt = time;
  this.endRound('watch', 'defused', time);
  return true;
 }

 endRound(winner, reason, time) {
  if (this.state === 'roundEnd' || this.state === 'over') return;
  this.state = 'roundEnd';
  this.roundResult = { winner, reason, time };
  this.phaseEnds = time + RULES.roundEndPause;
  this.scores[winner]++;
  const loser = winner === 'raid' ? 'watch' : 'raid';
  this.money[winner] = Math.min(MAX_MONEY, this.money[winner] + ROUND_REWARD.win);
  this.lossStreak[loser] = Math.min(4, this.lossStreak[loser] + 1);
  const bonus = Math.min(LOSS_BONUS.max, LOSS_BONUS.base + (this.lossStreak[loser] - 1) * LOSS_BONUS.perLoss);
  this.money[loser] = Math.min(MAX_MONEY, this.money[loser] + bonus);
  this.lossStreak[winner] = 0;
  if (reason === 'exploded' && winner === 'raid') this.money.watch = Math.min(MAX_MONEY, this.money.watch + ROUND_REWARD.plant);
  if (reason === 'defused') this.money.watch = Math.min(MAX_MONEY, this.money.watch + ROUND_REWARD.defuse);
  this.ctx.onRoundEnd?.(this.roundResult, this);
 }

 update(dt, time) {
  this.time = time;
  if (this.matchOver) return;
  if (this.state === 'buy' && time >= this.phaseEnds) this.goLive(time);
  if (this.state === 'live') {
   const alive = { raid: 0, watch: 0 };
   for (const a of this.ctx.actors) if (a.alive) alive[a.team]++;
   if (alive.raid === 0) {
    this.endRound('watch', this.bomb ? 'defenders' : 'eliminated', time);
    return;
   }
   if (alive.watch === 0) {
    if (!this.bomb) this.endRound('raid', 'eliminated', time);
    return;
   }
   if (time >= this.phaseEnds && !this.bomb) {
    this.endRound('watch', 'timeout', time);
    return;
   }
   if (this.bomb) {
    if (time >= this.bomb.explodesAt - 5.5 && time - this.lastBeep > 0.55) {
     this.lastBeep = time;
     this.ctx.audio?.beep(1150, 0.05, 0.05);
    }
    if (time >= this.bomb.explodesAt) {
     this.bomb.exploded = true;
     this.ctx.onExplode?.(this.bomb);
     this.endRound('raid', 'exploded', time);
    }
   }
  }
  if (this.state === 'roundEnd' && time >= this.phaseEnds) {
   if (this.scores.raid >= RULES.winRounds || this.scores.watch >= RULES.winRounds) {
    this.matchOver = true;
    this.state = 'over';
    this.ctx.onMatchEnd?.({ winner: this.scores.raid > this.scores.watch ? 'raid' : 'watch', scores: { ...this.scores } });
    return;
   }
   this.round++;
   if (this.round === RULES.sideSwitchAfter + 1) this.ctx.onSideSwitch?.();
   this.beginRound(time);
  }
 }

 buy(actor, item) {
  return this.ctx.buyItem?.(actor, item, this) ?? false;
 }
}
