// `pnpm parity:learner`: the learner parity suite, start to finish (Connor's parity brief § 3). It exits
// non-zero on ANY failure, which is the only thing the flip's build guard and CI's `parity-learner` job
// rely on.
//
//   1. the checker's own unit tests (`check.test.ts`, node:test)
//   2. every Playwright test tagged `@parity:` (`learner.config.ts`: the fixture build, the suite's
//      http-mode request-capture build, and the main config's http parity project when HTTP_PARITY is on)
//   3. every vitest test tagged `@parity:` in packages/core and apps/web
//   4. the meta-test (`check.ts`) over what 2 and 3 reported
//
// Every step runs even when an earlier one failed, so one red run says everything that is wrong.

import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  CONFIG,
  PLAYWRIGHT_CLI,
  RESULTS_DIR,
  ROOT,
  VITEST_PACKAGES,
  taggedVitestFiles,
  vitestCli,
  vitestResultsFile,
} from './collect';
import { main as check } from './check';

const API = join(ROOT, 'apps', 'api');

function step(name: string, cmd: string, args: string[], cwd: string): boolean {
  console.log(`\n▶ ${name}\n  ${cmd} ${args.join(' ')}`);
  const run = spawnSync(cmd, args, { cwd, stdio: 'inherit', env: process.env });
  const ok = run.status === 0;
  console.log(`${ok ? '✓' : '✗'} ${name}${ok ? '' : ` (exit ${run.status ?? run.signal})`}`);
  return ok;
}

const results: { name: string; ok: boolean }[] = [];
rmSync(RESULTS_DIR, { recursive: true, force: true });
mkdirSync(RESULTS_DIR, { recursive: true });

results.push({
  name: 'the checker’s unit tests',
  ok: step(
    'the checker’s unit tests',
    process.execPath,
    ['--import', 'tsx', '--test', join(ROOT, 'compliance', 'parity', 'check.test.ts')],
    API,
  ),
});

results.push({
  name: 'Playwright @parity tests',
  ok: step(
    'Playwright @parity tests',
    process.execPath,
    [PLAYWRIGHT_CLI, 'test', '-c', CONFIG, '--grep', '@parity:'],
    ROOT,
  ),
});

for (const pkg of VITEST_PACKAGES) {
  const files = taggedVitestFiles(pkg);
  if (!files.length) {
    console.log(`\n▶ vitest @parity tests in ${pkg}: none tagged`);
    continue;
  }
  const dir = join(ROOT, pkg);
  results.push({
    name: `vitest @parity tests in ${pkg}`,
    ok: step(
      `vitest @parity tests in ${pkg}`,
      process.execPath,
      [
        vitestCli(pkg),
        'run',
        ...files.map((f) => relative(dir, f)),
        '-t',
        '@parity:',
        '--reporter=default',
        '--reporter=json',
        `--outputFile.json=${vitestResultsFile(pkg)}`,
      ],
      dir,
    ),
  });
}

console.log('\n▶ the meta-test (check.ts)\n');
results.push({ name: 'the meta-test', ok: check([]) === 0 });

console.log('\nparity:learner summary');
for (const r of results) console.log(`  ${r.ok ? '✓' : '✗'} ${r.name}`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
