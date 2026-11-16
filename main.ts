// SALTWORKS — a round-based tactical FPS, handed in to make.fun's threejs-fps-02 bounty.
//
// This program does one thing: it copies the playable game beside it and the screenshots
// taken of it into the grader's output directory, and writes /output/dossier.json — the
// summary the judge reads — with the bounty's vendored library, so the dossier is exactly
// what the bounty's own gate would write from the same files.
//
// Node 22, the standard library only, no build step. Play the game locally with:
//   node serve.ts        (serves game/ on http://localhost:8080)
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-threejs.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The bounty's own caps (its gate): a 160 KiB source text, up to four screenshots of at
// most 256 KiB each, and a game tree of at most 993 files and 48 MiB.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  }),
);
