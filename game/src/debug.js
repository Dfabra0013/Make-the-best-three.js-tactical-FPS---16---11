// debug.js — a live readout of the simulation on F1 (or ?debug), for tuning and demos.

export class DebugPanel {
 constructor(game) {
  this.game = game;
  this.visible = new URLSearchParams(location.search).has('debug');
  this.acc = 0;
  this.el = document.createElement('div');
  this.el.id = 'debug';
  this.el.style.cssText = `position:fixed;left:14px;top:14px;z-index:15;pointer-events:none;
   font-family:ui-monospace,Menlo,monospace;font-size:11px;line-height:1.5;color:#c9d6da;
   background:rgba(9,13,16,0.78);border:1px solid #2b343a;border-left:2px solid #f0a03c;
   padding:8px 12px;border-radius:2px;white-space:pre;min-width:262px;display:none;`;
  document.body.appendChild(this.el);
  window.addEventListener('keydown', (e) => {
   if (e.code === 'F1' || e.code === 'Backquote') {
    this.visible = !this.visible;
    this.el.style.display = this.visible ? 'block' : 'none';
    e.preventDefault();
   }
  });
  if (this.visible) this.el.style.display = 'block';
 }

 update(dt) {
  if (!this.visible) return;
  this.acc += dt;
  if (this.acc < 0.15) return; // four repaints a second is plenty for a readout
  this.acc = 0;
  const s = this.game.debugState();
  const r = s.roundLog[s.roundLog.length - 1];
  const acc = r && r.shots ? Math.round((100 * r.hits) / r.shots) : 0;
  const lines = [
   `SALTWORKS  t=${s.time.toFixed(1)}s  round ${s.round}  ${s.phase}`,
   `score  raid ${s.scores.raid} : ${s.scores.watch} watch`,
   `money  raid $${s.money.raid}  watch $${s.money.watch}`,
   `you    ${s.player.hp}hp ${s.player.armor}ap  ${s.player.weapon} ${s.player.mag}/${s.player.reserve}`,
   `       at ${s.player.x},${s.player.z}  cone ${s.player.spreadDeg}°${s.player.hasBomb ? '  CHARGE' : ''}`,
   r ? `round  ${r.shots} shots  ${r.hits} hits  ${acc}% acc  ${r.kills} kills` : 'round  —',
   `bots   ${s.botCount}`,
   ...s.bots.map((b) => `  ${b.team === 'raid' ? '+' : '×'} ${b.name.padEnd(8)} ${b.ai.padEnd(8)} ${String(b.hp).padStart(3)}hp ${b.x},${b.z} ${b.status}`),
  ];
  if (s.bomb) lines.push(`charge at ${s.bomb.site} (${s.bomb.x.toFixed(1)}, ${s.bomb.z.toFixed(1)})`);
  this.el.textContent = lines.join('\n');
 }
}
