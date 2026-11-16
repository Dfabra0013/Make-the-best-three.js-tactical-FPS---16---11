// palette.js — the one palette every colour comes from, and the procedural surface textures.

export const PALETTE = {
 night: 0x0d1114,
 slate: 0x171d21,
 steel: 0x2b343a,
 iron: 0x39434a,
 chalk: 0xe7e2d6,
 salt: 0xd8d4c6,
 ash: 0x93a0a6,
 accent: 0xf0a03c,
 tideline: 0x2f7f94,
 rust: 0xa8482c,
 timber: 0x4a3b2c,
 moss: 0x3d4d3a,
 sky: 0x1d2830,
 fog: 0x1a2429,
};

export const TEAM_COLOR = {
 raid: 0xf0a03c, // the attackers: the player's side
 watch: 0x2f7f94, // the defenders
};

export function saltTexture(THREE, size = 512) {
 const canvas = document.createElement('canvas');
 canvas.width = canvas.height = size;
 const ctx = canvas.getContext('2d');
 ctx.fillStyle = '#c9c4b4';
 ctx.fillRect(0, 0, size, size);
 for (let i = 0; i < 46; i++) {
  const x = Math.random() * size;
  const y = Math.random() * size;
  const r = 18 + Math.random() * 70;
  const grad = ctx.createRadialGradient(x, y, r * 0.2, x, y, r);
  grad.addColorStop(0, 'rgba(120,122,112,0.30)');
  grad.addColorStop(1, 'rgba(120,122,112,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
 }
 ctx.strokeStyle = 'rgba(90,92,84,0.35)';
 for (let i = 0; i < 70; i++) {
  ctx.lineWidth = Math.random() < 0.7 ? 1 : 2;
  let x = Math.random() * size;
  let y = Math.random() * size;
  ctx.beginPath();
  ctx.moveTo(x, y);
  let angle = Math.random() * Math.PI * 2;
  for (let s = 0; s < 5; s++) {
   angle += (Math.random() - 0.5) * 1.2;
   x += Math.cos(angle) * (10 + Math.random() * 22);
   y += Math.sin(angle) * (10 + Math.random() * 22);
   ctx.lineTo(x, y);
  }
  ctx.stroke();
 }
 const tex = new THREE.CanvasTexture(canvas);
 tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
 tex.repeat.set(9, 9);
 tex.colorSpace = THREE.SRGBColorSpace;
 tex.anisotropy = 4;
 return tex;
}

// --- surface textures -----------------------------------------------------------------

function canvasOf(size) {
 const c = document.createElement('canvas');
 c.width = c.height = size;
 return c;
}

function finish(THREE, canvas, repeat = 1) {
 const tex = new THREE.CanvasTexture(canvas);
 tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
 tex.colorSpace = THREE.SRGBColorSpace;
 tex.anisotropy = 4;
 tex.repeat.set(repeat, repeat);
 return tex;
}

export function concreteTexture(THREE) {
 const c = canvasOf(256);
 const ctx = c.getContext('2d');
 ctx.fillStyle = '#a3a9ab';
 ctx.fillRect(0, 0, 256, 256);
 for (let i = 0; i < 1600; i++) {
  const g = 120 + Math.random() * 70;
  ctx.fillStyle = `rgba(${g},${g},${g - 4},${0.05 + Math.random() * 0.12})`;
  ctx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 3, 1 + Math.random() * 3);
 }
 ctx.strokeStyle = 'rgba(110,116,118,0.55)';
 ctx.lineWidth = 2;
 ctx.strokeRect(0, 0, 256, 256);
 ctx.lineWidth = 1;
 ctx.beginPath();
 ctx.moveTo(0, 128); ctx.lineTo(256, 128);
 ctx.moveTo(128, 0); ctx.lineTo(128, 256);
 ctx.stroke();
 for (let i = 0; i < 8; i++) {
  const x = Math.random() * 256;
  const grad = ctx.createLinearGradient(x, 0, x, 256);
  grad.addColorStop(0, 'rgba(90,96,98,0.26)');
  grad.addColorStop(1, 'rgba(90,96,98,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(x, 0, 6 + Math.random() * 14, 256);
 }
 return finish(THREE, c);
}

export function metalTexture(THREE) {
 const c = canvasOf(256);
 const ctx = c.getContext('2d');
 ctx.fillStyle = '#5d6a71';
 ctx.fillRect(0, 0, 256, 256);
 for (let x = 0; x < 256; x += 8) {
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fillRect(x, 0, 3, 256);
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.fillRect(x + 5, 0, 2, 256);
 }
 for (let i = 0; i < 26; i++) {
  const x = Math.random() * 256;
  const y = Math.random() * 256;
  const grad = ctx.createLinearGradient(x, y, x, y + 30 + Math.random() * 60);
  grad.addColorStop(0, 'rgba(150,74,44,0.5)');
  grad.addColorStop(1, 'rgba(150,74,44,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, 3 + Math.random() * 8, 30 + Math.random() * 60);
 }
 return finish(THREE, c);
}

export function saltBlockTexture(THREE) {
 const c = canvasOf(256);
 const ctx = c.getContext('2d');
 ctx.fillStyle = '#ded9c9';
 ctx.fillRect(0, 0, 256, 256);
 for (let i = 0; i < 900; i++) {
  const g = 200 + Math.random() * 55;
  ctx.fillStyle = `rgba(${g},${g - 4},${g - 16},${0.5})`;
  const s = 1 + Math.random() * 4;
  ctx.fillRect(Math.random() * 256, Math.random() * 256, s, s);
 }
 ctx.strokeStyle = 'rgba(150,146,132,0.5)';
 for (let y = 0; y < 256; y += 32) {
  ctx.beginPath();
  ctx.moveTo(0, y); ctx.lineTo(256, y);
  ctx.stroke();
  for (let x = (y / 32) % 2 ? 0 : 32; x < 256; x += 64) {
   ctx.beginPath();
   ctx.moveTo(x, y); ctx.lineTo(x, y + 32);
   ctx.stroke();
  }
 }
 return finish(THREE, c);
}

export function timberTexture(THREE) {
 const c = canvasOf(256);
 const ctx = c.getContext('2d');
 ctx.fillStyle = '#8d6e4c';
 ctx.fillRect(0, 0, 256, 256);
 for (let y = 0; y < 256; y += 26) {
  ctx.fillStyle = `rgba(${96 + Math.random() * 34},${74 + Math.random() * 26},${50 + Math.random() * 18},0.55)`;
  ctx.fillRect(0, y, 256, 24);
  ctx.strokeStyle = 'rgba(52,38,26,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, y + 25); ctx.lineTo(256, y + 25); ctx.stroke();
  for (let i = 0; i < 22; i++) {
   ctx.strokeStyle = 'rgba(50,36,24,0.35)';
   ctx.lineWidth = 1;
   const yy = y + Math.random() * 22;
   ctx.beginPath(); ctx.moveTo(Math.random() * 60, yy); ctx.lineTo(120 + Math.random() * 130, yy); ctx.stroke();
  }
 }
 return finish(THREE, c);
}
