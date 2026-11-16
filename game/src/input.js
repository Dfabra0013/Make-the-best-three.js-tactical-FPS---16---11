// input.js — keyboard and mouse, read once per frame into a flat state object.

export class Input {
 constructor(canvas, onFirstGesture) {
  this.canvas = canvas;
  this.keys = new Set();
  this.mouse = { dx: 0, dy: 0 };
  this.buttons = { left: false, right: false };
  this.clicks = { left: 0, right: 0 };
  this.wheel = 0;
  this.locked = false;
  this.enabled = true;
  this.sensitivity = 0.0022;
  this.gestureFired = false;
  this.onFirstGesture = onFirstGesture;
  this.bind();
 }

 bind() {
  const fireGesture = () => {
   if (this.gestureFired) return;
   this.gestureFired = true;
   this.onFirstGesture?.();
  };
  window.addEventListener('keydown', (e) => {
   if (e.repeat) return;
   fireGesture();
   this.keys.add(e.code);
   if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'Tab', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'KeyB', 'KeyE', 'KeyR', 'KeyG', 'KeyQ', 'Escape'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => this.keys.delete(e.code));
  window.addEventListener('blur', () => {
   this.keys.clear();
   this.buttons.left = this.buttons.right = false;
  });
  document.addEventListener('pointerlockchange', () => {
   this.locked = document.pointerLockElement === this.canvas;
  });
  this.canvas.addEventListener('mousedown', (e) => {
   fireGesture();
   if (!this.locked) {
    this.canvas.requestPointerLock?.();
    return;
   }
   if (e.button === 0) {
    this.buttons.left = true;
    this.clicks.left++;
   }
   if (e.button === 2) {
    this.buttons.right = true;
    this.clicks.right++;
   }
  });
  window.addEventListener('mouseup', (e) => {
   if (e.button === 0) this.buttons.left = false;
   if (e.button === 2) this.buttons.right = false;
  });
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('mousemove', (e) => {
   if (!this.locked) return;
   this.mouse.dx += e.movementX;
   this.mouse.dy += e.movementY;
  });
  window.addEventListener('wheel', (e) => {
   this.wheel += Math.sign(e.deltaY);
  }, { passive: true });
 }

 consumeLook() {
  const dx = this.mouse.dx * this.sensitivity;
  const dy = this.mouse.dy * this.sensitivity;
  this.mouse.dx = 0;
  this.mouse.dy = 0;
  return { dx, dy };
 }

 down(code) {
  return this.keys.has(code);
 }

 movement() {
  let forward = 0;
  let right = 0;
  if (this.down('KeyW') || this.down('ArrowUp')) forward += 1;
  if (this.down('KeyS') || this.down('ArrowDown')) forward -= 1;
  if (this.down('KeyD') || this.down('ArrowRight')) right += 1;
  if (this.down('KeyA') || this.down('ArrowLeft')) right -= 1;
  return {
   forward,
   right,
   sprint: this.down('ShiftLeft') || this.down('ShiftRight'),
   crouch: this.down('ControlLeft') || this.down('ControlRight') || this.down('KeyC'),
   jump: this.down('Space'),
  };
 }

 consumeClicks() {
  const c = { left: this.clicks.left, right: this.clicks.right };
  this.clicks.left = 0;
  this.clicks.right = 0;
  return c;
 }
}

export function patchPointerLock(canvas) {
 if (typeof canvas.requestPointerLock === 'function') return;
 canvas.requestPointerLock = () => {
  document.dispatchEvent(new Event('pointerlockchange'));
 };
 document.exitPointerLock = () => {
  document.dispatchEvent(new Event('pointerlockchange'));
 };
 Object.defineProperty(document, 'pointerLockElement', { get: () => canvas, configurable: true });
}
