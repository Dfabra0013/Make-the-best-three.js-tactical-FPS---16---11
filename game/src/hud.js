// hud.js — the readout a tactical shooter needs at a glance, and nothing else.

export class Hud {
 constructor() {
  const $ = (id) => document.getElementById(id);
  this.el = {
   hp: $('hp'), ap: $('ap'), hpWrap: document.querySelector('#vitals .hp'),
   money: $('money'), gunName: $('gun-name'), mag: $('mag'), reserve: $('reserve'),
   arms: $('arms'), gear: $('gear'), time: $('round-time'), scoreRaid: $('score-raid'),
   scoreWatch: $('score-watch'), roundLabel: $('round-label'), objective: $('objective'),
   feed: $('feed'), banner: $('banner'), bannerBig: $('banner-big'), bannerSub: $('banner-sub'),
   vignette: $('vignette'), plant: $('plant'), plantFill: $('plant-fill'),
   hit: $('hit'), reticle: $('reticle'), radar: $('radar-cv'),
  };
  this.prev = {};
  this.feedItems = [];
  this.hitTimer = 0;
  this.vignetteTimer = 0;
  this.radarCtx = this.el.radar.getContext('2d');
  this.el.radar.width = 296;
  this.el.radar.height = 296;
  this.bannerTimer = 0;
  this.reticleParts = [...this.el.reticle.querySelectorAll('i')];
 }

 set(key, value) {
  if (this.prev[key] === value) return;
  this.prev[key] = value;
  return true;
 }

 update(game, dt) {
  const p = game.player;
  if (this.set('hp', Math.ceil(p.health))) this.el.hp.textContent = Math.ceil(p.health);
  if (this.set('ap', Math.ceil(p.armor))) this.el.ap.textContent = Math.ceil(p.armor);
  if (this.set('hpLow', p.health <= 30)) this.el.hpWrap.classList.toggle('low', p.health <= 30);
  const money = game.match.money[p.team] | 0;
  if (this.set('money', money)) this.el.money.textContent = `$${money}`;
  const w = p.weapon;
  if (this.set('gun', w ? w.name : '—')) this.el.gunName.textContent = w ? w.name : '—';
  if (this.set('mag', p.mag)) this.el.mag.textContent = p.mag;
  if (this.set('reserve', p.reserve)) this.el.reserve.textContent = p.reserve;
  if (this.set('lowAmmo', p.mag <= Math.max(3, (w?.mag ?? 10) * 0.25))) this.el.arms.classList.toggle('low', p.mag <= Math.max(3, (w?.mag ?? 10) * 0.25));
  const gearParts = [
   `<b>${p.grenades.shard}</b> shard`,
   `<b>${p.grenades.haze}</b> haze`,
   `<b>${p.grenades.flare}</b> flare`,
  ];
  if (p.hasBomb) gearParts.push('<b style="color:var(--accent)">charge</b>');
  if (game.hasDefuseKit(p)) gearParts.push('<b>kit</b>');
  const gearHtml = gearParts.join(' · ');
  if (this.set('gear', gearHtml)) this.el.gear.innerHTML = gearHtml;

  const clock = game.match.clock;
  const t = Math.ceil(clock);
  const clockText = `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  if (this.set('clock', clockText)) this.el.time.textContent = clockText;
  if (this.set('clockUrgent', clock <= 10 && game.match.state === 'live')) this.el.time.classList.toggle('urgent', clock <= 10 && game.match.state === 'live');
  if (this.set('sr', game.match.scores.raid)) this.el.scoreRaid.textContent = game.match.scores.raid;
  if (this.set('sw', game.match.scores.watch)) this.el.scoreWatch.textContent = game.match.scores.watch;

  let label = `Round ${game.match.round}`;
  if (game.match.state === 'buy') label += ' · buy phase';
  else if (game.match.state === 'live') label += ' · live';
  else if (game.match.state === 'roundEnd') label += ' · round over';
  else if (game.match.state === 'over') label += ' · match over';
  if (this.set('label', label)) this.el.roundLabel.textContent = label;

  const obj = game.objectiveLine();
  if (this.set('obj', obj)) this.el.objective.textContent = obj;

  const planting = game.plantingProgress();
  if (this.set('planting', planting > 0)) this.el.plant.style.display = planting > 0 ? 'block' : 'none';
  if (planting > 0) this.el.plantFill.style.width = `${Math.round(planting * 100)}%`;

  const spread = game.playerSpread();
  const gap = Math.round(3 + Math.min(27, spread * 520));
  const set = (el, prop, value) => {
   if (el['_' + prop] !== value) {
    el['_' + prop] = value;
    el.style[prop] = `${value}px`;
   }
  };
  const [up, down, left, right] = this.reticleParts;
  set(up, 'top', 38 - gap - 9);
  set(down, 'bottom', 38 - gap - 9);
  set(left, 'left', 38 - gap - 9);
  set(right, 'right', 38 - gap - 9);
  const scoped = game.aiming?.() && game.player.weapon?.scoped;
  if (this.set('scoped', !!scoped)) {
   this.el.vignette.style.background = scoped
    ? 'radial-gradient(circle at center, rgba(9,12,14,0) 30%, rgba(9,12,14,0.92) 46%)'
    : '';
   this.el.vignette.style.opacity = scoped ? '1' : '';
  }

  if (this.hitTimer > 0) {
   this.hitTimer -= dt;
   if (this.hitTimer <= 0) this.el.hit.classList.remove('on');
  }
  if (this.vignetteTimer > 0) {
   this.vignetteTimer -= dt;
   if (!this.prev.scoped) this.el.vignette.style.opacity = Math.max(0, Math.min(1, this.vignetteTimer / 0.6));
   if (this.vignetteTimer <= 0 && !this.prev.scoped) this.el.vignette.style.opacity = 0;
  }
  if (this.bannerTimer > 0) {
   this.bannerTimer -= dt;
   if (this.bannerTimer <= 0) this.el.banner.classList.remove('on');
  }
  this.drawRadar(game);
  this.tickFeed(dt);
 }

 hit(kill) {
  this.el.hit.classList.add('on');
  this.el.hit.classList.toggle('kill', !!kill);
  this.hitTimer = kill ? 0.3 : 0.13;
 }

 damaged() {
  this.vignetteTimer = 0.6;
  this.el.vignette.style.opacity = 0.9;
 }

 banner(big, sub, kind = 'win', seconds = 3.4) {
  this.el.bannerBig.textContent = big;
  this.el.bannerSub.textContent = sub ?? '';
  this.el.banner.className = `on ${kind}`;
  this.bannerTimer = seconds;
 }

 feed(killer, victim, weapon, mine) {
  const div = document.createElement('div');
  div.innerHTML = `<b>${escapeHtml(killer)}</b> ${escapeHtml(weapon)} <b>${escapeHtml(victim)}</b>`;
  if (mine) div.classList.add('mine');
  this.el.feed.appendChild(div);
  this.feedItems.push({ el: div, t: 5.5 });
  while (this.el.feed.children.length > 5) this.el.feed.removeChild(this.el.feed.firstChild);
 }

 tickFeed(dt) {
  for (let i = this.feedItems.length - 1; i >= 0; i--) {
   const item = this.feedItems[i];
   item.t -= dt;
   if (item.t <= 0) {
    item.el.remove();
    this.feedItems.splice(i, 1);
   } else if (item.t < 0.6) {
    item.el.style.opacity = String(item.t / 0.6);
   }
  }
 }

 drawRadar(game) {
  const ctx = this.radarCtx;
  const W = this.el.radar.width;
  const H = this.el.radar.height;
  const b = game.world.bounds;
  const pad = 8;
  const sx = (W - pad * 2) / (b.maxX - b.minX);
  const sz = (H - pad * 2) / (b.maxZ - b.minZ);
  const s = Math.min(sx, sz);
  const px = (x) => pad + (x - b.minX) * s;
  const pz = (z) => pad + (z - b.minZ) * s;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(13,17,20,0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(43,52,58,0.9)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);
  ctx.fillStyle = 'rgba(93,104,110,0.55)';
  for (const box of game.world.boxes) {
   if (box.kind === 'ramp') continue;
   const w = (box.maxX - box.minX) * s;
   const d = (box.maxZ - box.minZ) * s;
   if (w < 1 || d < 1) continue;
   ctx.fillRect(px(box.minX), pz(box.minZ), w, d);
  }
  for (const id of ['A', 'B']) {
   const o = game.map.objectives[id];
   const ox = id === 'B' ? o.x2 ?? o.x : o.x;
   const oz = id === 'B' ? o.z2 ?? o.z : o.z;
   ctx.strokeStyle = 'rgba(240,160,60,0.8)';
   ctx.lineWidth = 2;
   ctx.beginPath();
   ctx.arc(px(ox), pz(oz), 7, 0, Math.PI * 2);
   ctx.stroke();
   ctx.fillStyle = 'rgba(240,160,60,0.9)';
   ctx.font = 'bold 11px ui-monospace, monospace';
   ctx.fillText(id, px(ox) + 9, pz(oz) + 4);
  }
  if (game.match.bomb) {
   const bm = game.match.bomb;
   const blink = Math.sin(game.time * 8) > 0;
   ctx.fillStyle = blink ? '#f0a03c' : 'rgba(240,160,60,0.35)';
   ctx.beginPath();
   ctx.arc(px(bm.x), pz(bm.z), 5.5, 0, Math.PI * 2);
   ctx.fill();
  }
  for (const a of game.actors) {
   if (!a.alive || a.isPlayer) continue;
   if (a.team !== game.player.team && !game.isSpotted(a)) continue;
   ctx.fillStyle = a.team === game.player.team ? 'rgba(240,160,60,0.95)' : 'rgba(168,72,44,0.95)';
   ctx.beginPath();
   ctx.arc(px(a.pos.x), pz(a.pos.z), 3.4, 0, Math.PI * 2);
   ctx.fill();
  }
  const p = game.player;
  const cx = px(p.pos.x);
  const cz = pz(p.pos.z);
  ctx.save();
  ctx.translate(cx, cz);
  ctx.rotate(-p.yaw);
  ctx.fillStyle = '#e7e2d6';
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(5, 5);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
 }
}

function escapeHtml(s) {
 return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
