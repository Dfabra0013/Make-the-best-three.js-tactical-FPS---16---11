// world.js — the world as it is drawn: merged boxes, procedural textures, sky, lamps, steam.

import { MAP } from './map.js';
import { PALETTE, saltTexture, concreteTexture, metalTexture, saltBlockTexture, timberTexture } from './palette.js';

export function buildWorld(THREE, scene, mats) {
 const group = new THREE.Group();
 group.name = 'brine-works';
 scene.add(group);

 scene.background = new THREE.Color(MAP.sky);
 scene.fog = new THREE.Fog(MAP.fogColor, MAP.fogNear, MAP.fogFar);

 // --- ground: the salt pan the whole works sits on ---
 const groundTex = saltTexture(THREE);
 const groundMat = new THREE.MeshStandardMaterial({ map: groundTex, color: 0xc8c3b3, roughness: 1, metalness: 0 });
 for (const g of MAP.ground) {
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(g.w, g.d), groundMat);
  plane.rotation.x = -Math.PI / 2;
  plane.position.set(g.x, g.y + 0.001, g.z);
  plane.receiveShadow = true;
  group.add(plane);
 }

 const worldMats = {
  salt: new THREE.MeshStandardMaterial({ map: saltBlockTexture(THREE), color: 0xf2eee2, roughness: 0.92 }),
  saltDark: new THREE.MeshStandardMaterial({ map: saltBlockTexture(THREE), color: 0xd7d1c0, roughness: 0.95 }),
  concrete: new THREE.MeshStandardMaterial({ map: concreteTexture(THREE), color: 0xb8bfc2, roughness: 0.9 }),
  steel: new THREE.MeshStandardMaterial({ map: metalTexture(THREE), color: 0x9aa8b0, roughness: 0.62, metalness: 0.3 }),
  iron: new THREE.MeshStandardMaterial({ map: metalTexture(THREE), color: 0x84939b, roughness: 0.58, metalness: 0.35 }),
  rust: new THREE.MeshStandardMaterial({ map: metalTexture(THREE), color: 0xd08a62, roughness: 0.88, metalness: 0.12 }),
  timber: new THREE.MeshStandardMaterial({ map: timberTexture(THREE), color: 0xc3a682, roughness: 0.94 }),
 };

 // --- boxes, merged per material so the whole refinery costs one draw call each ---
 const byMat = new Map();
 for (const b of MAP.boxes ?? []) {
  const h = (b.y1 ?? 3) - (b.y0 ?? 0);
  const geo = new THREE.BoxGeometry(b.w, h, b.d);
  scaleBoxUVs(geo, b.w, h, b.d, 0.6);
  geo.translate(b.x, (b.y0 ?? 0) + h / 2, b.z);
  if (!byMat.has(b.mat)) byMat.set(b.mat, []);
  byMat.get(b.mat).push(geo);
 }
 for (const r of MAP.ramps ?? []) {
  const geo = rampGeometry(THREE, r);
  if (geo.attributes.uv) scaleBoxUVs(geo, r.w, r.y1 ?? 1, r.d, 0.6);
  if (!byMat.has(r.mat)) byMat.set(r.mat, []);
  byMat.get(r.mat).push(geo);
 }
 for (const [mat, geos] of byMat) {
  const merged = mergeGeometries(THREE, geos);
  const mesh = new THREE.Mesh(merged, worldMats[mat] ?? worldMats.concrete);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.matrixAutoUpdate = false;
  group.add(mesh);
  for (const g of geos) g.dispose();
 }

 // --- lamps: the only light in a storm sky, and the map's landmarks ---
 const hemi = new THREE.HemisphereLight(0x8fa8bc, 0x35322b, 1.05);
 scene.add(hemi);
 const moon = new THREE.DirectionalLight(0xa8c6da, 1.35);
 moon.position.set(-38, 58, 34);
 moon.castShadow = true;
 moon.shadow.mapSize.set(2048, 2048);
 moon.shadow.camera.left = -60;
 moon.shadow.camera.right = 60;
 moon.shadow.camera.top = 60;
 moon.shadow.camera.bottom = -60;
 moon.shadow.camera.far = 200;
 moon.shadow.bias = -0.0006;
 moon.shadow.normalBias = 0.03;
 scene.add(moon);
 scene.add(moon.target);
 const dusk = new THREE.DirectionalLight(0xffab63, 1.35);
 dusk.position.set(-60, 16, 70);
 scene.add(dusk);
 const lampMeshes = [];
 for (const l of MAP.lights) {
  const light = new THREE.PointLight(l.color, l.intensity, l.distance, 1.7);
  light.position.set(l.x, l.y, l.z);
  scene.add(light);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.6, 8, 1, true), mats.iron);
  shade.position.set(l.x, l.y - 0.1, l.z);
  group.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), mats.lamp);
  bulb.position.set(l.x, l.y - 0.32, l.z);
  group.add(bulb);
  lampMeshes.push(bulb);
 }

 // --- the sky: a painted dome, dusk at the horizon to a clear night overhead ---
 const skyTex = skyTexture(THREE);
 const skyGeo = new THREE.SphereGeometry(170, 32, 20);
 const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, depthWrite: false, fog: false });
 const sky = new THREE.Mesh(skyGeo, skyMat);
 sky.frustumCulled = false;
 scene.add(sky);

 // --- the two reliquaries: a plinth, a beacon, and a ring on the floor ---
 const beacons = {};
 const addReliquary = (id, x, z, tint) => {
  const plinthMat = new THREE.MeshStandardMaterial({ color: 0x6a6f6d, roughness: 0.9 });
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 2.2), plinthMat);
  plinth.position.set(x, 0.45, z);
  group.add(plinth);
  const glowMat = new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.85 });
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 1.5, 8), glowMat);
  core.position.set(x, 1.65, z);
  group.add(core);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8), glowMat);
  cap.position.set(x, 2.45, z);
  group.add(cap);
  const ringMat = new THREE.MeshBasicMaterial({ color: tint, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.1, 3.5, 40), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, 0.03, z);
  group.add(ring);
  const light = new THREE.PointLight(tint, 12, 12, 2);
  light.position.set(x, 1.8, z);
  group.add(light);
  beacons[id] = { core, cap, ring, light, glowMat, ringMat };
 };
 const A = MAP.objectives.A;
 const B = MAP.objectives.B;
 addReliquary('A', A.x, A.z, 0xf0a03c);
 addReliquary('B', B.x2 ?? B.x, B.z2 ?? B.z, 0xf0a03c);

 // --- steam: a handful of big soft sprites drifting off the pans, one draw call each ---
 const steamTex = softDisc(THREE);
 const steamMat = new THREE.SpriteMaterial({ map: steamTex, color: 0xaebfc4, transparent: true, opacity: 0.09, depthWrite: false });
 const steam = [];
 for (let i = 0; i < 14; i++) {
  const s = new THREE.Sprite(steamMat);
  const scale = 10 + (i % 5) * 4;
  s.scale.set(scale, scale * 0.55, 1);
  s.position.set(((i * 37) % 76) - 38, 1.2 + (i % 3), ((i * 53) % 80) - 40);
  s.userData.drift = 0.25 + (i % 4) * 0.12;
  group.add(s);
  steam.push(s);
 }

 // --- signage: the two reliquaries are named on the wall, as a real works would ---
 const signBoard = new THREE.MeshStandardMaterial({ color: 0x141a1d, roughness: 0.9 });
 const signs = [
  { text: 'RELIQUARY A', x: 0, y: 5.3, z: 7.05, rotY: 0 },
  { text: 'WEIGH HOUSE B', x: 26, y: 4.2, z: -0.95, rotY: 0 },
 ];
 for (const sgn of signs) {
  const board = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.1, 0.12), signBoard);
  board.position.set(sgn.x, sgn.y, sgn.z);
  board.rotation.y = sgn.rotY;
  group.add(board);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 88;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#151b1e';
  ctx.fillRect(0, 0, 512, 88);
  ctx.fillStyle = '#f0a03c';
  ctx.font = 'bold 52px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(sgn.text, 256, 48);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 1.05), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  face.position.set(sgn.x, sgn.y, sgn.z + 0.08);
  face.rotation.y = sgn.rotY;
  group.add(face);
 }

 // --- the conveyors' belt: a few marked plates so the viaducts read as machines ---
 const beltMat = new THREE.MeshStandardMaterial({ color: 0x22282b, roughness: 1 });
 for (const [x, z, w, d] of [[-12, 22, 9.4, 2.6], [14, 16, 2.6, 9.4]]) {
  const belt = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), beltMat);
  belt.position.set(x, 3.86, z);
  group.add(belt);
 }

 return {
  group,
  beacons,
  lampMeshes,
  update(t, dt) {
   for (const s of steam) {
    s.position.y += dt * 0.22;
    s.position.x += dt * s.userData.drift;
    if (s.position.y > 7) s.position.y = 1.1;
    if (s.position.x > 44) s.position.x = -44;
   }
   for (const id of Object.keys(beacons)) {
    const b = beacons[id];
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
    b.glowMat.opacity = 0.6 + 0.3 * pulse;
    b.ringMat.opacity = 0.18 + 0.18 * pulse;
    b.light.intensity = 9 + 5 * pulse;
    b.core.rotation.y = t * 0.6;
   }
  },
 };
}

function scaleBoxUVs(geo, w, h, d, scale) {
 const uv = geo.attributes.uv;
 const spans = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
 for (let face = 0; face < 6; face++) {
  const [su, sv] = spans[face];
  for (let i = 0; i < 4; i++) {
   const idx = face * 4 + i;
   uv.setXY(idx, (uv.getX(idx) * su) / scale, (uv.getY(idx) * sv) / scale);
  }
 }
 uv.needsUpdate = true;
 return geo;
}

function rampGeometry(THREE, r) {
 const halfD = r.d / 2;
 const y0 = r.y0 ?? 0;
 const y1 = r.y1 ?? 1;
 const shape = new THREE.Shape();
 shape.moveTo(-halfD, y0);
 shape.lineTo(halfD, y1);
 shape.lineTo(halfD, y0);
 shape.lineTo(-halfD, y0);
 const geo = new THREE.ExtrudeGeometry(shape, { depth: r.w, bevelEnabled: false });
 geo.rotateY(Math.PI / 2);
 geo.computeBoundingBox();
 const bb = geo.boundingBox;
 geo.translate(r.x - (bb.min.x + bb.max.x) / 2, 0, r.z);
 return geo;
}

function softDisc(THREE) {
 const c = document.createElement('canvas');
 c.width = c.height = 64;
 const ctx = c.getContext('2d');
 const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
 g.addColorStop(0, 'rgba(255,255,255,0.85)');
 g.addColorStop(0.5, 'rgba(255,255,255,0.28)');
 g.addColorStop(1, 'rgba(255,255,255,0)');
 ctx.fillStyle = g;
 ctx.fillRect(0, 0, 64, 64);
 const tex = new THREE.CanvasTexture(c);
 tex.colorSpace = THREE.SRGBColorSpace;
 return tex;
}

function mergeGeometries(THREE, geos) {
 let count = 0;
 const prepared = geos.map((g) => {
  const geo = g.index ? g.toNonIndexed() : g;
  count += geo.attributes.position.count;
  return geo;
 });
 const positions = new Float32Array(count * 3);
 const normals = new Float32Array(count * 3);
 const uvs = new Float32Array(count * 2);
 let p = 0;
 for (const geo of prepared) {
  positions.set(geo.attributes.position.array, p * 3);
  normals.set(geo.attributes.normal.array, p * 3);
  if (geo.attributes.uv) uvs.set(geo.attributes.uv.array, p * 2);
  p += geo.attributes.position.count;
  if (geo !== geos[prepared.indexOf(geo)]) geo.dispose();
 }
 const out = new THREE.BufferGeometry();
 out.setAttribute('position', new THREE.BufferAttribute(positions, 3));
 out.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
 out.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
 out.computeBoundingSphere();
 return out;
}

function skyTexture(THREE) {
 const w = 1024;
 const h = 512;
 const c = document.createElement('canvas');
 c.width = w;
 c.height = h;
 const ctx = c.getContext('2d');
 const grad = ctx.createLinearGradient(0, 0, 0, h);
 grad.addColorStop(0.0, '#0d1b2c');
 grad.addColorStop(0.32, '#1d3a55');
 grad.addColorStop(0.52, '#4a6b84');
 grad.addColorStop(0.66, '#b98f6d');
 grad.addColorStop(0.74, '#e8b487');
 grad.addColorStop(0.82, '#8b7a6c');
 grad.addColorStop(1.0, '#3d3a35');
 ctx.fillStyle = grad;
 ctx.fillRect(0, 0, w, h);
 for (let i = 0; i < 700; i++) {
  const y = Math.random() * h * 0.62;
  const a = (1 - y / (h * 0.62)) * (0.35 + Math.random() * 0.65);
  ctx.fillStyle = `rgba(232,240,255,${a.toFixed(3)})`;
  const s = Math.random() < 0.9 ? 1 : 2;
  ctx.fillRect(Math.random() * w, y, s, s);
 }
 for (let i = 0; i < 34; i++) {
  const y = h * (0.18 + Math.random() * 0.5);
  const cw = 120 + Math.random() * 380;
  const ch = 4 + Math.random() * 16;
  const g = ctx.createLinearGradient(0, y, 0, y + ch);
  g.addColorStop(0, 'rgba(255,214,170,0)');
  g.addColorStop(0.5, `rgba(255,214,170,${0.05 + Math.random() * 0.10})`);
  g.addColorStop(1, 'rgba(255,214,170,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(Math.random() * w, y, cw / 2, ch / 2, 0, 0, Math.PI * 2);
  ctx.fill();
 }
 const mx = w * 0.18;
 const my = h * 0.3;
 const halo = ctx.createRadialGradient(mx, my, 4, mx, my, 78);
 halo.addColorStop(0, 'rgba(226,238,250,0.55)');
 halo.addColorStop(1, 'rgba(226,238,250,0)');
 ctx.fillStyle = halo;
 ctx.beginPath(); ctx.arc(mx, my, 78, 0, Math.PI * 2); ctx.fill();
 ctx.fillStyle = '#e9f0f8';
 ctx.beginPath(); ctx.arc(mx, my, 13, 0, Math.PI * 2); ctx.fill();
 ctx.fillStyle = 'rgba(180,192,206,0.5)';
 ctx.beginPath(); ctx.arc(mx - 4, my - 3, 3.4, 0, Math.PI * 2); ctx.fill();
 ctx.beginPath(); ctx.arc(mx + 5, my + 4, 2.4, 0, Math.PI * 2); ctx.fill();
 const tex = new THREE.CanvasTexture(c);
 tex.colorSpace = THREE.SRGBColorSpace;
 tex.mapping = THREE.EquirectangularReflectionMapping;
 return tex;
}
