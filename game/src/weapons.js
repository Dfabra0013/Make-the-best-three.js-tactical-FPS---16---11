// weapons.js — the armoury: SALTWORKS' own guns, no real-world names, no real-world stats.

export const WEAPONS = {
 vesper: {
  id: 'vesper', name: 'Vesper M4', slot: 'primary', price: 2700, killReward: 300,
  mag: 30, reserve: 90, rpm: 640, damage: 30, headMul: 4.0, legMul: 0.72,
  armorPen: 0.72, range: 90,
  spread: { base: 0.0035, move: 0.055, air: 0.15, perShot: 0.0042, max: 0.055, recover: 0.055, crouch: 0.62 },
  recoil: { kick: 0.0125, side: 0.004, recover: 0.82, punch: 0.02 },
  reload: 2.25, draw: 0.55, auto: true,
  sound: { freq: 150, decay: 0.16, tone: 'crack' },
  model: { len: 0.78, kind: 'rifle' },
 },
 bellwether: {
  id: 'bellwether', name: 'Bellwether 7', slot: 'primary', price: 3300, killReward: 300,
  mag: 25, reserve: 75, rpm: 540, damage: 38, headMul: 3.6, legMul: 0.7,
  armorPen: 0.85, range: 100,
  spread: { base: 0.003, move: 0.06, air: 0.17, perShot: 0.006, max: 0.07, recover: 0.05, crouch: 0.6 },
  recoil: { kick: 0.019, side: 0.006, recover: 0.8, punch: 0.03 },
  reload: 2.7, draw: 0.7, auto: true,
  sound: { freq: 118, decay: 0.22, tone: 'heavy' },
  model: { len: 0.86, kind: 'rifle' },
 },
 tidecaller: {
  id: 'tidecaller', name: 'Tidecaller SMG', slot: 'primary', price: 1250, killReward: 600,
  mag: 30, reserve: 90, rpm: 840, damage: 23, headMul: 3.2, legMul: 0.8,
  armorPen: 0.55, range: 55,
  spread: { base: 0.006, move: 0.04, air: 0.13, perShot: 0.0038, max: 0.06, recover: 0.07, crouch: 0.7 },
  recoil: { kick: 0.0095, side: 0.0055, recover: 0.86, punch: 0.012 },
  reload: 2.0, draw: 0.45, auto: true,
  sound: { freq: 190, decay: 0.1, tone: 'crack' },
  model: { len: 0.62, kind: 'smg' },
 },
 longspar: {
  id: 'longspar', name: 'Longspar', slot: 'primary', price: 4300, killReward: 300,
  mag: 5, reserve: 25, rpm: 55, damage: 105, headMul: 2.6, legMul: 0.85,
  armorPen: 0.98, range: 160, scoped: true,
  spread: { base: 0.0006, move: 0.19, air: 0.3, perShot: 0.05, max: 0.19, recover: 0.02, crouch: 0.42 },
  recoil: { kick: 0.05, side: 0.008, recover: 0.55, punch: 0.055 },
  reload: 3.2, draw: 0.9, auto: false,
  sound: { freq: 92, decay: 0.3, tone: 'heavy' },
  model: { len: 1.0, kind: 'sniper' },
 },
 'kettle-9': {
  id: 'kettle-9', name: 'Kettle 9', slot: 'secondary', price: 0, killReward: 300,
  mag: 12, reserve: 48, rpm: 400, damage: 26, headMul: 3.4, legMul: 0.78,
  armorPen: 0.5, range: 50,
  spread: { base: 0.0045, move: 0.03, air: 0.1, perShot: 0.006, max: 0.06, recover: 0.08, crouch: 0.75 },
  recoil: { kick: 0.014, side: 0.004, recover: 0.84, punch: 0.018 },
  reload: 1.6, draw: 0.35, auto: false,
  sound: { freq: 210, decay: 0.09, tone: 'crack' },
  model: { len: 0.34, kind: 'pistol' },
 },
};

export const GRENADES = {
 shard: { id: 'shard', name: 'Shard', price: 300, fuse: 1.9, damage: 98, radius: 8.2, kind: 'frag', count: 2 },
 haze: { id: 'haze', name: 'Haze', price: 250, fuse: 1.4, radius: 5.5, duration: 15, kind: 'smoke', count: 2 },
 flare: { id: 'flare', name: 'Flare', price: 200, fuse: 1.2, radius: 10, duration: 3.2, kind: 'flash', count: 2 },
};

export const ARMOR = { price: 650, amount: 100 };
export const KIT = { price: 400, name: 'Defuse kit' };

export const LOSS_BONUS = { base: 1400, perLoss: 500, max: 3400 };
export const START_MONEY = 800;
export const MAX_MONEY = 16000;
export const ROUND_REWARD = { win: 3250, lose: 1900, plant: 800, defuse: 300, objective: 300 };
