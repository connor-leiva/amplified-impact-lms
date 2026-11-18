// `pnpm parity:learner` (D-182, Connor's parity brief §§ 3-4). A PLACEHOLDER until the parity suite and
// its manifest (`compliance/parity/learner-parity.json`) land from their own branch, which replaces this
// file's body with the real suite.
//
// What it proves today, both halves always run so both report:
//   1. the learner portal, flag on: every `learn-v2*` e2e spec against the flag-on fixture build
//      (`pnpm e2e:learn`, dist-fixture-v2 on 4174), the audience routing among them;
//   2. today's portal, flag off: every parity scenario against its untouched goldens, on the flag-off
//      fixture build (`pnpm compliance`, dist-fixture on 4173).
//
// THE CONTRACT, which the real suite must keep: exit 0 only when everything passed, non-zero otherwise.
// CI's `parity-learner` job runs this script, and the build guard on VITE_LEARNER_V2
// (`apps/web/src/build/learner-parity-guard.ts`) reads only that job's conclusion on the commit, never
// what runs inside it.
import { spawnSync } from 'node:child_process';

const steps = [
  ['the learner portal, flag on (pnpm e2e:learn)', 'pnpm e2e:learn'],
  ['today’s portal against its goldens, flag off (pnpm compliance)', 'pnpm compliance'],
];

const failed = [];
for (const [what, cmd] of steps) {
  console.log(`\n▶ parity:learner: ${what}`);
  const run = spawnSync(cmd, { stdio: 'inherit', shell: true });
  if (run.status !== 0) failed.push(what);
}

if (failed.length) {
  console.error(`\n✗ parity:learner failed: ${failed.join('; ')}`);
  process.exit(1);
}
console.log('\n✓ parity:learner passed');
