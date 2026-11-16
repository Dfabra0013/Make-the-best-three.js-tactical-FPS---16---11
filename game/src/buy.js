// buy.js — the buy menu, and the economy that makes it a decision.

import { WEAPONS, GRENADES, ARMOR, KIT } from './weapons.js';

const BUY_LIST = [
 { key: 'vesper', kind: 'weapon', label: 'Vesper M4', price: WEAPONS.vesper.price, note: 'standard rifle · 30 rounds' },
 { key: 'bellwether', kind: 'weapon', label: 'Bellwether 7', price: WEAPONS.bellwether.price, note: 'heavy rifle · 25 rounds' },
 { key: 'tidecaller', kind: 'weapon', label: 'Tidecaller SMG', price: WEAPONS.tidecaller.price, note: 'cheap, fast, pays per kill' },
 { key: 'longspar', kind: 'weapon', label: 'Longspar', price: WEAPONS.longspar.price, note: 'marksman rifle · 5 rounds' },
 { key: 'armor', kind: 'armor', label: 'Salt plate', price: ARMOR.price, note: 'armour 100' },
 { key: 'shard', kind: 'grenade', label: 'Shard', price: GRENADES.shard.price, note: 'frag · 2 for the round' },
 { key: 'haze', kind: 'grenade', label: 'Haze', price: GRENADES.haze.price, note: 'smoke · cuts a sightline' },
 { key: 'flare', kind: 'grenade', label: 'Flare', price: GRENADES.flare.price, note: 'flash · blinds anyone looking' },
 { key: 'kit', kind: 'kit', label: KIT.name, price: KIT.price, note: 'defuse twice as fast', team: 'watch' },
];

export class BuyMenu {
 constructor(game) {
  this.game = game;
  this.open_ = false;
  this.actor = null;
  this.buildDom();
 }

 buildDom() {
  const root = document.createElement('div');
  root.id = 'buy';
  root.style.cssText = `position:fixed;inset:0;display:none;align-items:center;justify-content:center;
   background:radial-gradient(ellipse at center, rgba(13,17,20,0.72), rgba(13,17,20,0.92));z-index:20;
   font-family:var(--font-ui);color:var(--chalk);`;
  const panel = document.createElement('div');
  panel.style.cssText = `width:min(760px,92vw);background:color-mix(in srgb, var(--slate) 94%, transparent);
   border:1px solid var(--steel);padding:22px 26px 20px;border-radius:4px;`;
  panel.innerHTML = `
   <div style="display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid var(--steel);padding-bottom:10px;margin-bottom:14px">
    <div>
     <div style="font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--ash)">Brine Works · Requisition</div>
     <div style="font-size:22px;letter-spacing:.06em;margin-top:2px">BUY PHASE</div>
    </div>
    <div style="text-align:right">
     <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--ash)">Funds</div>
     <div id="buy-money" style="font-family:var(--font-readout);font-size:26px;color:var(--accent)">$0</div>
    </div>
   </div>
   <div id="buy-grid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px"></div>
   <div style="margin-top:16px;display:flex;justify-content:space-between;align-items:center;color:var(--ash);font-size:11px;letter-spacing:.1em">
    <div>1–9 BUY · B / ESC CLOSE · THE ROUND STARTS WHEN THE BUY TIME ENDS</div>
    <div id="buy-hint"></div>
   </div>`;
  root.appendChild(panel);
  document.body.appendChild(root);
  this.root = root;
  root.style.pointerEvents = 'none';
  panel.style.pointerEvents = 'auto';
  this.panel = panel;
  this.moneyEl = panel.querySelector('#buy-money');
  this.gridEl = panel.querySelector('#buy-grid');
  this.hintEl = panel.querySelector('#buy-hint');
  this.buttons = BUY_LIST.map((item, i) => {
   const b = document.createElement('button');
   b.dataset.key = item.key;
   b.style.cssText = `text-align:left;padding:10px 12px;background:var(--night);border:1px solid var(--steel);
    color:var(--chalk);font:inherit;cursor:pointer;border-radius:3px;transition:border-color .12s, background .12s;`;
   b.innerHTML = `<div style="display:flex;justify-content:space-between;gap:8px">
     <span style="font-size:13px;letter-spacing:.04em">${item.label}</span>
     <span style="font-family:var(--font-readout);color:var(--accent)">$${item.price}</span></div>
    <div style="font-size:11px;color:var(--ash);margin-top:3px">${item.note}</div>
    <div style="font-size:10px;color:var(--steel);margin-top:4px">${i + 1}</div>`;
   b.addEventListener('click', (e) => {
    e.stopPropagation();
    this.buy(item.key);
   });
   b.addEventListener('mouseenter', () => { b.style.borderColor = 'var(--accent)'; });
   b.addEventListener('mouseleave', () => { this.refresh(); });
   this.gridEl.appendChild(b);
   return b;
  });
  this.items = BUY_LIST;
  window.addEventListener('keydown', (e) => {
   if (!this.open_) return;
   const n = Number(e.key);
   if (n >= 1 && n <= this.items.length) {
    const item = this.items[n - 1];
    this.buy(item.key);
    e.preventDefault();
   }
   if (e.code === 'Escape' || e.code === 'KeyB') {
    this.hide();
    e.preventDefault();
   }
  });
 }

 get isOpen() {
  return this.open_;
 }

 open(actor, money, time) {
  this.actor = actor;
  this.open_ = true;
  this.root.style.display = 'flex';
  this.refresh(money);
  if (document.pointerLockElement) document.exitPointerLock();
 }

 hide() {
  this.open_ = false;
  this.root.style.display = 'none';
  this.game.canvas.requestPointerLock?.();
 }

 toggle() {
  if (this.open_) this.hide();
  else this.open(this.actor ?? this.game.player, this.game.match.money[this.game.player.team] | 0, this.game.time);
 }

 buy(key) {
  const item = this.items.find((i) => i.key === key);
  if (!item) return;
  if (item.team && item.team !== this.game.player.team) {
   this.hintEl.textContent = 'not your side';
   return;
  }
  const ok = this.game.buyItem(this.game.player, key);
  this.hintEl.textContent = ok ? `${item.label} acquired` : 'not enough funds';
  this.refresh();
 }

 refresh() {
  const game = this.game;
  const money = game.match.money[game.player.team] | 0;
  this.moneyEl.textContent = `$${money}`;
  for (const btn of this.buttons) {
   const item = this.items.find((i) => i.key === btn.dataset.key);
   const wrongTeam = item.team && item.team !== game.player.team;
   const afford = money >= item.price;
   const owned = game.player.ownsItem?.(item.key);
   btn.disabled = !afford || wrongTeam || !!owned || !this.open_;
   btn.style.opacity = btn.disabled ? '0.42' : '1';
   btn.style.cursor = btn.disabled ? 'default' : 'pointer';
   btn.style.borderColor = 'var(--steel)';
   btn.style.background = 'var(--night)';
  }
 }
}
