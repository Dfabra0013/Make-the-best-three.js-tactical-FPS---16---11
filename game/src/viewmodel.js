// viewmodel.js — the gun in your hands.

export function buildViewmodel(THREE, mats) {
 const scene = new THREE.Scene();
 const camera = new THREE.PerspectiveCamera(72, 1, 0.01, 12);
 const root = new THREE.Group();
 scene.add(root);
 const hemi = new THREE.HemisphereLight(0xc8d8e2, 0x3a3229, 1.5);
 scene.add(hemi);
 const key = new THREE.DirectionalLight(0xffe2bc, 1.6);
 key.position.set(-1.1, 2.4, 1.9);
 scene.add(key);
 const rim = new THREE.DirectionalLight(0x8fc0d4, 0.9);
 rim.position.set(2, 0.6, -2);
 scene.add(rim);
 const fill = new THREE.PointLight(0xdfe9ef, 2.2, 4);
 fill.position.set(0.3, 0.15, 0.4);
 scene.add(fill);

 const glove = new THREE.MeshStandardMaterial({ color: 0x3b3229, roughness: 0.95 });
 const steel = mats.steel;
 const metal = mats.gunMetal;
 const poly = mats.gunPoly;
 const glow = new THREE.MeshBasicMaterial({ color: 0xf0a03c });

 const models = {};
 const makeModel = (id, build) => {
  const g = new THREE.Group();
  g.name = `vm-${id}`;
  g.visible = false;
  build(g);
  root.add(g);
  models[id] = g;
 };

 const box = (parent, w, h, d, x, y, z, mat) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
 };

 const rail = new THREE.MeshStandardMaterial({ color: 0x3d474d, roughness: 0.6, metalness: 0.2 });
 const brass = new THREE.MeshStandardMaterial({ color: 0xb98a4a, roughness: 0.5, metalness: 0.7 });

 makeModel('vesper', (g) => {
  box(g, 0.085, 0.11, 0.52, 0, 0, -0.26, metal); // receiver
  box(g, 0.07, 0.055, 0.34, 0, 0.012, -0.62, poly); // handguard
  box(g, 0.04, 0.04, 0.26, 0, 0.01, -0.86, metal); // barrel
  box(g, 0.06, 0.035, 0.07, 0, 0.012, -0.97, steel); // brake
  const mag = box(g, 0.06, 0.22, 0.1, 0, -0.16, -0.3, poly); // magazine, curved forward
  mag.rotation.x = 0.26;
  box(g, 0.062, 0.14, 0.07, 0, -0.11, -0.02, poly); // grip
  box(g, 0.05, 0.085, 0.15, 0, -0.005, 0.13, poly); // stock
  box(g, 0.055, 0.02, 0.3, 0, 0.062, -0.3, rail); // top rail
  box(g, 0.07, 0.06, 0.13, 0, 0.1, -0.34, metal); // optic body
  box(g, 0.05, 0.045, 0.006, 0, 0.1, -0.408, glow); // optic glass
  box(g, 0.1, 0.1, 0.12, -0.005, -0.06, -0.58, glove); // left hand
  box(g, 0.09, 0.11, 0.1, 0.02, -0.13, -0.04, glove); // right hand
  box(g, 0.03, 0.03, 0.1, 0.05, -0.02, -0.3, brass); // charging handle
 });

 makeModel('bellwether', (g) => {
  box(g, 0.1, 0.13, 0.58, 0, 0, -0.3, metal);
  box(g, 0.08, 0.07, 0.3, 0, 0.01, -0.7, poly);
  box(g, 0.05, 0.05, 0.24, 0, 0.01, -0.95, metal);
  box(g, 0.075, 0.045, 0.08, 0, 0.01, -1.07, steel);
  const mag = box(g, 0.07, 0.26, 0.11, 0, -0.18, -0.33, poly);
  mag.rotation.x = 0.2;
  box(g, 0.07, 0.15, 0.08, 0, -0.12, -0.03, poly);
  box(g, 0.055, 0.1, 0.16, 0, -0.005, 0.15, poly);
  box(g, 0.06, 0.025, 0.34, 0, 0.078, -0.34, rail);
  box(g, 0.085, 0.075, 0.16, 0, 0.13, -0.38, metal);
  box(g, 0.055, 0.05, 0.007, 0, 0.13, -0.458, glow);
  box(g, 0.11, 0.11, 0.13, -0.005, -0.07, -0.66, glove);
  box(g, 0.095, 0.12, 0.11, 0.02, -0.15, -0.05, glove);
  const drum = box(g, 0.05, 0.05, 0.05, 0.07, 0.0, -0.36, brass);
  drum.rotation.z = 0.4;
 });

 makeModel('tidecaller', (g) => {
  box(g, 0.075, 0.1, 0.38, 0, 0, -0.19, metal);
  box(g, 0.065, 0.06, 0.16, 0, -0.005, -0.44, poly);
  box(g, 0.04, 0.04, 0.12, 0, 0.0, -0.56, metal);
  box(g, 0.045, 0.018, 0.02, 0, 0.041, -0.26, glow); // torch
  const mag = box(g, 0.05, 0.2, 0.08, 0, -0.15, -0.22, poly);
  mag.rotation.x = 0.12;
  box(g, 0.062, 0.13, 0.07, 0, -0.1, 0.0, poly);
  box(g, 0.045, 0.07, 0.11, 0, -0.005, 0.11, poly); // folded stock
  box(g, 0.09, 0.09, 0.11, -0.005, -0.055, -0.42, glove);
  box(g, 0.085, 0.11, 0.09, 0.02, -0.12, -0.03, glove);
 });

 makeModel('longspar', (g) => {
  box(g, 0.085, 0.11, 0.66, 0, 0, -0.33, metal);
  box(g, 0.045, 0.045, 0.46, 0, 0.005, -0.9, metal);
  box(g, 0.06, 0.03, 0.1, 0, 0.005, -1.15, steel);
  box(g, 0.055, 0.07, 0.19, 0, -0.02, 0.13, poly); // stock
  box(g, 0.06, 0.035, 0.09, 0, 0.06, 0.06, poly); // cheek riser
  box(g, 0.07, 0.13, 0.07, 0, -0.1, -0.05, poly); // grip
  const bolt = box(g, 0.025, 0.025, 0.09, 0.055, -0.01, -0.12, brass);
  bolt.rotation.z = 0.35;
  box(g, 0.055, 0.055, 0.34, 0, 0.09, -0.36, metal); // scope tube
  box(g, 0.075, 0.075, 0.03, 0, 0.09, -0.53, steel); // objective bell
  box(g, 0.06, 0.06, 0.006, 0, 0.09, -0.546, glow);
  box(g, 0.1, 0.1, 0.13, -0.005, -0.06, -0.7, glove);
  box(g, 0.09, 0.12, 0.1, 0.02, -0.13, -0.05, glove);
 });

 makeModel('kettle-9', (g) => {
  box(g, 0.062, 0.085, 0.28, 0, 0, -0.14, metal); // slide
  box(g, 0.055, 0.05, 0.05, 0, -0.055, -0.06, poly); // frame
  box(g, 0.05, 0.15, 0.065, 0, -0.15, -0.05, poly); // grip, raked back
  const grip = g.children[g.children.length - 1];
  grip.rotation.x = -0.18;
  box(g, 0.028, 0.028, 0.03, 0, 0.006, -0.28, metal); // muzzle
  box(g, 0.014, 0.018, 0.01, 0, 0.049, -0.26, steel); // front sight
  box(g, 0.05, 0.016, 0.012, 0, 0.049, -0.02, steel); // rear sight
  box(g, 0.095, 0.12, 0.1, 0.015, -0.13, -0.04, glove); // both hands on the grip
  box(g, 0.08, 0.09, 0.09, -0.03, -0.14, 0.02, glove);
 });

 const pose = { scale: 0.94, x: 0.29, y: -0.25, z: -0.95, cant: 0.15, adsScale: 0.7 };

 const state = {
  current: null,
  bobPhase: 0,
  swayX: 0,
  swayY: 0,
  kick: 0,
  kickRot: 0,
  reloadT: 0,
  reloadLen: 1,
  drawT: 0,
  adsBlend: 0,
  lastMag: 0,
 };

 return {
  scene,
  camera,
  models,
  root,
  pose,
  get current() {
   return state.current;
  },
  setWeapon(id, drawTime) {
   for (const key of Object.keys(models)) models[key].visible = false;
   const m = models[id];
   if (m) m.visible = true;
   state.current = id;
   state.drawT = drawTime ?? 0.4;
   state.kick = 0;
  },
  update(dt, opts) {
   const m = models[state.current];
   if (!m) return;
   const speed = opts.speed ?? 0;
   state.bobPhase += dt * (4 + speed * 1.4);
   const bobAmt = Math.min(1, speed / 5.5) * 0.012;
   const bobX = Math.sin(state.bobPhase) * bobAmt * 2;
   const bobY = Math.abs(Math.cos(state.bobPhase)) * bobAmt;
   state.swayX += (opts.lookX * 0.5 - state.swayX) * Math.min(1, dt * 8);
   state.swayY += (opts.lookY * 0.5 - state.swayY) * Math.min(1, dt * 8);
   state.kick += (0 - state.kick) * Math.min(1, dt * 12);
   state.kickRot += (0 - state.kickRot) * Math.min(1, dt * 10);
   state.adsBlend += ((opts.ads ? 1 : 0) - state.adsBlend) * Math.min(1, dt * 10);

   const reloadProgress = opts.reload > 0 ? 1 - opts.reload / Math.max(0.001, opts.reloadLen) : 0;
   const reloadDip = opts.reload > 0 ? Math.sin(Math.min(1, reloadProgress) * Math.PI) : 0;
   const drawDip = state.drawT > 0 ? Math.min(1, state.drawT / 0.4) : 0;
   state.drawT = Math.max(0, state.drawT - dt);

   const held = state.current;
   const longGun = held === 'longspar';
   const compact = held === 'kettle-9' || held === 'tidecaller';
   const baseX = pose.x + (compact ? -0.02 : 0);
   const baseY = pose.y + (longGun ? -0.02 : 0);
   const baseZ = pose.z + (compact ? 0.16 : longGun ? -0.16 : 0);
   const adsX = 0.0;
   const adsY = -0.075;
   const adsZ = baseZ * 0.6;
   const t = state.adsBlend;
   m.scale.setScalar(pose.scale + (pose.adsScale - pose.scale) * t);
   m.position.set(
    baseX + (adsX - baseX) * t + bobX + state.swayX - reloadDip * 0.1,
    baseY + (adsY - baseY) * t + bobY + state.swayY - reloadDip * 0.18 - drawDip * 0.25,
    baseZ + (adsZ - baseZ) * t + state.kick * 0.05,
   );
   m.rotation.set(
    state.kickRot + reloadDip * 0.35 + drawDip * 0.5 + 0.045,
    -state.swayX * 2.2 + (1 - t) * pose.cant,
    (1 - t) * 0.02 - reloadDip * 0.25,
   );
  },
  kick(strength) {
   state.kick = Math.min(1, state.kick + strength);
   state.kickRot = Math.min(0.35, state.kickRot + strength * 0.22);
  },
  startReload(len) {
   state.reloadLen = len;
  },
 };
}
