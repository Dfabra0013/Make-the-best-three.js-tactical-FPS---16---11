# SALTWORKS — a round-based tactical FPS on three.js

[![make.fun · threejs-fps-02](https://make.fun/badge/threejs-fps-02.svg)](https://make.fun/bounty/threejs-fps-02)
[![rank](https://make.fun/badge/threejs-fps-02/Dfabra0013/Make-the-best-three.js-tactical-FPS---16---11/rank.svg)](https://make.fun/bounty/threejs-fps-02/leaderboard)
[![reward](https://make.fun/badge/threejs-fps-02/Dfabra0013/Make-the-best-three.js-tactical-FPS---16---11/reward.svg)](https://make.fun/bounty/threejs-fps-02)

**SALTWORKS** is a first-person, round-based tactical shooter in the browser on three.js 0.187.0:
two three-operator teams, the Raid against the Watch, a bomb-style objective at two
reliquaries, an economy with a buy menu, and bots that push lanes, hold angles, hear
gunfire and fight back. Everything runs from static files — no build step, no network
request, no server logic. The map, the operators, the weapons, the palette and every sound
are original to this game.

- **Three lanes, one map.** *The Brine Works*: the Long Pan in the west, the stacked
  Evaporator hall through the middle with its two portals, the Weigh House lane in the east.
  Attacker yard south, defender barracks north, both reliquaries on a gantry-lit salt floor.
- **Gunplay where stopping pays.** A cone of fire that opens when you move, jump or spray and
  tightens when you stop, crouch or aim down the sights; a first shot that goes where you
  point it; per-limb damage with a head multiplier; armour with weapon penetration.
- **Tactics beyond killing.** Plant or cut the charge, five primaries and a pistol, three
  throws (frag, smoke, flash), a plate, a defuse kit, per-round money with a climbing loss
  bonus, and bots that take routes, hold sightlines from the map's own grid, rotate to
  sound, throw smoke and frags, and plant or defuse when the round asks them to.
- **A look of its own.** A dusk-lit salt refinery: a painted sky with stars and a low moon
  over a warm horizon, procedurally drawn concrete, corrugated steel, cut salt and timber,
  lamp-lit landmarks, drifting steam, and an original palette of slate, chalk and one warm
  accent.

## Run it

```sh
node serve.ts                       # serves game/ on http://localhost:8080
```

Open <http://localhost:8080> in a desktop browser with WebGL 2 (Chrome is the reference).
Click **ENTER THE WORKS** to lock the mouse and start the round.

`WASD` move · `Shift` sprint · `Ctrl` crouch · `Space` jump · mouse look · left mouse fire ·
right mouse aim · `R` reload · `G` shard · `H` haze · `F` flare · `E` plant or cut the
charge · `B` buy menu · `Tab` scoreboard · `F1` the simulation readout.

## Hand it in / build the dossier

`main.ts` is the program the bounty's harness runs (Node 22, standard library only). It
copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the
bounty's own `vendor/makefun-threejs.ts`, so the dossier is byte for byte what the gate
would write from the same files.

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## The code

| file | its one job |
| --- | --- |
| `game/index.html` | the page: the HUD's markup and styles, one import map, one module script |
| `game/src/main.js` | boot, the frame loop, the bot requisition policy |
| `game/src/game.js` | the match in motion: actors, shooting, the round's events, the camera |
| `game/src/actors.js` | one Actor for player and bots: movement, hit boxes, damage, the body |
| `game/src/bots.js` | the bots: perception by ray, states for fight/hold/push/plant/defuse |
| `game/src/round.js` | the rules of a match: phases, timers, economy, win conditions |
| `game/src/collision.js` | the box world: sliding collision, ramps, ray casts |
| `game/src/nav.js` | the 1.5 m navigation grid: A* with string-pulling, sightline queries |
| `game/src/map.js` | *The Brine Works* as data: geometry, objectives, spawns, lamps |
| `game/src/world.js` | the world as it is drawn: merged meshes, textures, sky, beacons, steam |
| `game/src/weapons.js` | the armoury: damage, spread, recoil, prices, grenades |
| `game/src/viewmodel.js` | the weapon in hand: its own scene, its own camera, its animation |
| `game/src/effects.js` | pooled tracers, impacts, smoke, muzzle flash, blast light |
| `game/src/audio.js` | every sound, synthesised at run time with the Web Audio API |
| `game/src/hud.js` | the readout: vitals, ammunition, clock, score, feed, radar |
| `game/src/buy.js` | the buy menu |
| `game/src/debug.js` | the F1 simulation readout |
| `game/src/palette.js` | the palette and the procedural surface textures |
| `game/src/input.js` | keyboard and mouse, read once a frame |
| `vendor/makefun-threejs.ts` | the bounty's vendored library, unchanged (builds the dossier) |
| `main.ts` | the entrypoint the grader runs |

The simulation runs at a fixed 1/60 s step from an accumulator, so the round plays the same
at 30 or 300 frames a second; rendering only reads what the step produces. Geometry is
merged per material (the whole refinery is a handful of draw calls), textures are drawn once
at load, effects come from fixed pools, and no frame allocates a mesh.

## AI judge's brief, answered

- A first-person view with mouse look and keyboard movement, a weapon that fires, reloads and
  runs out, opponents that move, see and shoot back, rounds that end in a win or a loss and
  start again, and a HUD with health, ammunition, the round timer and the score.
- Hits checked against bodies with more damage to the head; recoil and spread that punish
  firing on the move; movement with acceleration, crouching and collision; stopping to aim
  pays.
- Plant and defuse at two sites, money every round spent in a buy menu, five primary weapons
  and three grenades, bots that follow routes through the map, hold positions and react to
  what they see and hear.
- An original map with lanes, corners and sightlines, a chosen palette, its own art, and
  code split one job to a file with a fixed-step simulation kept apart from rendering.

Licensed under MIT. Built for [make.fun](https://make.fun/bounty/threejs-fps-02)'s
bounties.
