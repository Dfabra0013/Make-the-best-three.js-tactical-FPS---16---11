// Node 22; no dependencies. Builds a clean handoff and verifies the local submission caps.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from '../vendor/makefun-threejs.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = mkdtempSync(join(tmpdir(), 'saltworks-preflight-'));
const caps = { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, game_max_files: 993, game_max_bytes: 50331648 };
try {
  const run = spawnSync(process.execPath, ['main.ts'], {
    cwd: root, env: { ...process.env, MAKEFUN_OUTPUT_DIR: out }, encoding: 'utf8',
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  const bytes = readFileSync(join(out, 'dossier.json'));
  const dossier = JSON.parse(bytes.toString());
  assert(bytes.length <= 1572864, 'Dossier exceeds 1.5 MiB');
  assert(bytes.equals(Buffer.from(buildDossier(out, caps))), 'Dossier is not canonical');
  assert(Buffer.byteLength(dossier.text) <= caps.text_max_bytes);
  assert(!/\[Cut at|lines not shown/.test(dossier.text), 'Source text is truncated');
  let sources = 0;
  for (const name of readdirSync(join(out, 'game', 'src'))) {
    if (!name.endsWith('.js')) continue;
    sources++;
    assert(dossier.text.includes(`### game/src/${name} (`), `Missing source: ${name}`);
    const syntax = spawnSync(process.execPath, ['--input-type=module', '--check'], {
      input: readFileSync(join(out, 'game', 'src', name)), encoding: 'utf8',
    });
    assert.equal(syntax.status, 0, `${name}: ${syntax.stderr}`);
  }
  assert(dossier.text.includes('### game/index.html ('));
  const shots = readdirSync(join(out, 'screenshots')).sort();
  assert(shots.length >= 3 && shots.length <= 4, 'Expected 3–4 screenshots');
  for (const shot of shots) assert(statSync(join(out, 'screenshots', shot)).size <= 262144, `Screenshot too large: ${shot}`);
  console.log(`PASS: canonical dossier; ${sources + 1} complete sources; ${Buffer.byteLength(dossier.text)}/163840 text bytes; ${shots.length} screenshots; all JS syntax checks pass.`);
  console.log('This verifies local packaging, not remote acceptance or judging results.');
} finally {
  rmSync(out, { recursive: true, force: true });
}
