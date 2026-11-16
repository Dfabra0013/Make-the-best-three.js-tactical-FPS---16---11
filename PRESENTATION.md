# SALTWORKS — presentation handoff

## The pitch

A round-based tactical FPS set in an original dusk-lit salt refinery. Two three-operator teams fight over two plant/defuse sites. Stopping to aim matters, money carries tactical choices between rounds, and bots navigate, fight and play the objective. Built with locally vendored three.js, procedural surfaces and synthesised audio; no install or external asset service is needed to play.

## Start the presentation

Use Node 22 or newer:

```sh
node scripts/preflight.ts
node serve.ts
```

Open http://localhost:8080 in a desktop browser with WebGL 2. Use the live preview when presenting remotely. Click **ENTER THE WORKS** to enable sound and request mouse lock. If an embedded preview blocks mouse lock, open the preview in its own tab and click again. Escape releases the pointer; click the game to resume mouse look.

## A short, honest demo

1. **Identity:** show the salt refinery, warm objective landmarks and weapon viewmodel. Explain the Raid versus Watch objective.
2. **Gunplay:** move, stop, aim with right mouse and fire. Show how the crosshair reacts; reload with R.
3. **Tactics:** show the radar and lanes. Hold E at an eligible objective to plant or cut the charge. Bots continue playing the objective independently.
4. **Economy:** open B during a buy phase; show the weapon and equipment choices. Hold Tab for the scoreboard.
5. **Implementation:** optionally press F1 for live simulation information. Explain fixed-step simulation, collision, bot navigation, procedural materials and local audio synthesis.

Do not promise a particular combat outcome during a live demo. The four included screenshots document staged in-engine views, including a charge and round-win composition; they are not evidence of an unassisted live match.

## Controls

WASD move · Shift sprint · Ctrl crouch · Space jump · mouse look · left mouse fire · right mouse aim · R reload · G shard · H haze · F flare · E plant/cut · B buy · Tab scoreboard · F1 debug.

## Export for handoff

Start with an empty output directory to avoid stale files:

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

Hand off `out/game/`, `out/screenshots/` and `out/dossier.json` together. The build uses the vendored dossier library unchanged. `node scripts/preflight.ts` checks a fresh temporary export, canonical dossier equality, full source inclusion, JavaScript syntax and packaging limits. It is not the remote judge.

## Submission status and remaining actions

- The game, screenshots, entrypoint and local packaging checks are available in this branch.
- Remote submission has **not** been completed. This environment has no `makefun` executable, and make.fun network access was unavailable.
- `.makefun/owner.json` has an empty wallet. Confirm the platform's ownership/payment requirements and configure the intended recipient through its documented flow before submitting. No recipient has been invented.
- Use the platform's current official bundle/submit instructions in an environment with its tooling and access; retain its receipt or submission ID.
- No score, acceptance, prize, leaderboard rank or win rate is guaranteed.
