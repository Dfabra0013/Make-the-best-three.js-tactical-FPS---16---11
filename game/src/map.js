// map.js — THE BRINE WORKS, SALTWORKS' one map, as data: geometry, objectives, spawns, lamps.

export const MAP = {
 name: 'The Brine Works',
 bounds: { minX: -46, maxX: 46, minZ: -46, maxZ: 46 },
 sky: 0x3d5d75,
 fogColor: 0x86969f,
 fogNear: 38,
 fogFar: 165,

 ground: [
  { x: 0, z: 0, w: 96, d: 96, y: 0, mat: 'salt', texture: true },
 ],

 boxes: [
  // ---- the perimeter: salt berms, chest high, with the fence above them ----
  { x: 0, z: 45.0, w: 92, d: 2.0, y0: 0, y1: 7.5, mat: 'salt' },
  { x: 0, z: -45.0, w: 92, d: 2.0, y0: 0, y1: 7.5, mat: 'salt' },
  { x: 45.0, z: 0, w: 2.0, d: 92, y0: 0, y1: 7.5, mat: 'salt' },
  { x: -45.0, z: 0, w: 2.0, d: 92, y0: 0, y1: 7.5, mat: 'salt' },

  // ---- the Long Pan (west lane): open salt flat, stacks and pan walls ----
  { x: -30, z: 6, w: 8, d: 8, y0: 0, y1: 5.6, mat: 'saltDark' }, // the salt stack
  { x: -30, z: 6, w: 9, d: 9, y0: 5.6, y1: 5.9, mat: 'steel' }, // its cap
  { x: -24.5, z: 12.5, w: 4, d: 1.4, y0: 0, y1: 1.4, mat: 'timber' }, // a bench at the stack
  { x: -21, z: -2, w: 4, d: 4, y0: 0, y1: 3.6, mat: 'salt' }, // second stack
  { x: -38, z: 22, w: 5, d: 16, y0: 0, y1: 4.2, mat: 'concrete' }, // pan wall, runs north
  { x: -38, z: -16, w: 5, d: 14, y0: 0, y1: 4.2, mat: 'concrete' }, // pan wall, runs south
  { x: -30, z: 32, w: 14, d: 2.5, y0: 0, y1: 1.5, mat: 'saltDark' }, // pan edge
  { x: -14, z: -8, w: 3, d: 11, y0: 0, y1: 2.7, mat: 'timber' }, // crate wall on the lane's east
  { x: -14, z: -8, w: 3.4, d: 11.4, y0: 2.7, y1: 3.0, mat: 'steel' },
  { x: -22, z: 24, w: 3, d: 3, y0: 0, y1: 1.2, mat: 'rust' },
  { x: -33, z: -30, w: 8, d: 6, y0: 0, y1: 3.4, mat: 'saltDark' },

  // ---- the Evaporator (middle lane): the hall, its two portals, its stacks ----
  { x: -5.5, z: -6, w: 5, d: 20, y0: 0, y1: 7.2, mat: 'concrete' }, // hall, west half
  { x: 5.5, z: -6, w: 5, d: 20, y0: 0, y1: 7.2, mat: 'concrete' }, // hall, east half
  { x: 0, z: -6, w: 6.2, d: 20, y0: 3.4, y1: 7.2, mat: 'concrete' }, // the portal header
  { x: -5.5, z: -6, w: 5.4, d: 20.4, y0: 7.2, y1: 7.6, mat: 'steel' }, // roof lip, west
  { x: 5.5, z: -6, w: 5.4, d: 20.4, y0: 7.2, y1: 7.6, mat: 'steel' }, // roof lip, east
  { x: 0, z: -6, w: 6.4, d: 20.4, y0: 7.2, y1: 7.6, mat: 'steel' },
  { x: -13.0, z: 6, w: 1.6, d: 14, y0: 0, y1: 2.6, mat: 'rust' }, // stacked pans outside
  { x: 13.0, z: 6, w: 1.6, d: 14, y0: 0, y1: 2.6, mat: 'rust' },
  { x: -13.0, z: -18, w: 1.6, d: 8, y0: 0, y1: 2.6, mat: 'rust' },
  { x: 13.0, z: -18, w: 1.6, d: 8, y0: 0, y1: 2.6, mat: 'rust' },
  { x: -9.5, z: 16, w: 2.4, d: 2.4, y0: 0, y1: 1.1, mat: 'steel' }, // approach cover
  { x: 9.5, z: 17, w: 2.4, d: 2.4, y0: 0, y1: 1.1, mat: 'steel' },
  { x: 0, z: 21, w: 7, d: 1.4, y0: 0, y1: 1.5, mat: 'saltDark' },
  { x: -4, z: -30, w: 5, d: 1.4, y0: 0, y1: 1.4, mat: 'concrete' },
  { x: 6, z: -29, w: 1.4, d: 4, y0: 0, y1: 1.4, mat: 'concrete' },

  // ---- the Weigh House (east lane): weigh house, dock, sacks ----
  { x: 22, z: -22, w: 10, d: 10, y0: 0, y1: 5.4, mat: 'concrete' }, // weigh house block
  { x: 22, z: -22, w: 11, d: 11, y0: 5.4, y1: 5.9, mat: 'steel' },
  { x: 33, z: -22, w: 8, d: 10, y0: 0, y1: 4.6, mat: 'timber' }, // loading dock shed
  { x: 33, z: -22, w: 9, d: 11, y0: 4.6, y1: 5.0, mat: 'steel' },
  { x: 26, z: 1.5, w: 7, d: 1.2, y0: 3.6, y1: 3.9, mat: 'steel' }, // the reliquary's gantry
  { x: 22.6, z: 1.5, w: 1, d: 1, y0: 0, y1: 3.6, mat: 'iron' },
  { x: 29.4, z: 1.5, w: 1, d: 1, y0: 0, y1: 3.6, mat: 'iron' },
  { x: 21, z: 10, w: 8, d: 2, y0: 0, y1: 1.3, mat: 'timber' }, // sack wall
  { x: 35, z: 12, w: 9, d: 8, y0: 0, y1: 5.2, mat: 'concrete' }, // dock office
  { x: 37, z: 24, w: 3, d: 3, y0: 0, y1: 2.0, mat: 'rust' },
  { x: 27, z: 22, w: 4, d: 4, y0: 0, y1: 2.4, mat: 'saltDark' },
  { x: 26, z: 32, w: 14, d: 2.5, y0: 0, y1: 1.6, mat: 'saltDark' },
  { x: 30, z: -34, w: 8, d: 8, y0: 0, y1: 4.2, mat: 'saltDark' },

  // ---- the crane gantry over reliquary A ----
  { x: -4, z: -22, w: 1, d: 1, y0: 0, y1: 9, mat: 'iron' },
  { x: 4, z: -22, w: 1, d: 1, y0: 0, y1: 9, mat: 'iron' },
  { x: 0, z: -22, w: 9, d: 1, y0: 8.6, y1: 9.2, mat: 'steel' },

  // ---- attackers' yard (south) and defenders' barracks (north) ----
  { x: -34, z: 40, w: 9, d: 6, y0: 0, y1: 4.6, mat: 'concrete' }, // staging hut
  { x: 20, z: 41, w: 7, d: 4, y0: 0, y1: 2.4, mat: 'timber' },
  { x: 13, z: 40, w: 4, d: 4, y0: 0, y1: 2.6, mat: 'salt' },
  { x: -14, z: -38, w: 14, d: 7, y0: 0, y1: 5.4, mat: 'concrete' }, // barracks
  { x: 2, z: -37, w: 5, d: 5, y0: 0, y1: 3.0, mat: 'saltDark' },
  { x: 12, z: -39, w: 6, d: 4, y0: 0, y1: 2.6, mat: 'timber' },
  { x: 0, z: 35, w: 1.2, d: 3, y0: 0, y1: 1.2, mat: 'concrete' }, // spawn-yard cover
  { x: -8, z: 29, w: 1.2, d: 4, y0: 0, y1: 1.3, mat: 'concrete' },
  { x: 9, z: 28, w: 4, d: 1.2, y0: 0, y1: 1.3, mat: 'concrete' },
 ],

 ramps: [
  { x: 34, z: 5.5, w: 8, d: 2.6, y0: 0, y1: 1.4, mat: 'steel' }, // up to the loading dock
  { x: -27, z: -12, w: 4, d: 5, y0: 0, y1: 1.6, mat: 'concrete' },
 ],

 objectives: {
  A: { id: 'A', name: 'Crane Reliquary', x: 0, z: -22, r: 3.6 },
  B: { id: 'B', name: 'Weigh House Reliquary', x: 26, z: 1.5, r: 3.4 },
 },

 spawns: {
  raid: [{ x: -2, z: 35 }, { x: 2, z: 34 }, { x: 6, z: 33 }, { x: -6, z: 32 }, { x: 10, z: 35 }],
  watch: [{ x: -2, z: -32 }, { x: 3, z: -33 }, { x: -7, z: -31 }, { x: 9, z: -30 }, { x: -12, z: -33 }],
 },

 lights: [
  { x: 0, z: 12, y: 7.4, color: 0xffc98a, intensity: 130, distance: 46 },
  { x: 0, z: -16, y: 7.4, color: 0xffc98a, intensity: 130, distance: 46 },
  { x: -28, z: 8, y: 7.0, color: 0xffd7a0, intensity: 90, distance: 40 },
  { x: -30, z: -18, y: 6.0, color: 0xffd7a0, intensity: 70, distance: 34 },
  { x: 24, z: 6, y: 7.0, color: 0xffd7a0, intensity: 90, distance: 40 },
  { x: 28, z: -20, y: 6.5, color: 0xffd7a0, intensity: 70, distance: 34 },
  { x: -30, z: 36, y: 5.5, color: 0xffb066, intensity: 60, distance: 28 },
  { x: -12, z: -34, y: 6.0, color: 0x8fd0dd, intensity: 60, distance: 32 },
  { x: 0, z: -22, y: 8.4, color: 0xffe0b0, intensity: 45, distance: 24 },
 ],
};
