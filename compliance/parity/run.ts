// `pnpm parity:learner`: the learner parity suite, start to finish (Connor's parity brief § 3). It exits
// non-zero on ANY failure, which is the only thing the flip's build guard and CI's `parity-learner` job
// rely on.
//
//   1. the checker's own unit tests (`check.test.ts`, node:test)
//   2. every Playwright test tagged `@parity:` (`learner.config.ts`: the fixture build, the suite's
//      http-mode request-capture build, and the main config's http parity project when HTTP_PARITY is on)
//   3. every vitest test tagged `@parity:` in packages/core and apps/web
//   4. the meta-test (`check.ts`) over what 2 and 3 reported
//   5. D-258: the LMS v3 screens, which a production build with `VITE_LMS_V3=true` ships: the both-flags-on e2e
//      (`pnpm e2e:v3`, every `lms-v3-*` spec, every learner type) and the v3 unit tests in apps/web (the package's
//      HTML-equality tests, the view-models, the gap rules, every learner type's routing)
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

function step(name: string, cmd: string, args: string[], cwd: string, env: NodeJS.ProcessEnv = process.env): boolean {
  console.log(`\n▶ ${name}\n  ${cmd} ${args.join(' ')}`);
  const run = spawnSync(cmd, args, { cwd, stdio: 'inherit', env });
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

// D-258: the guard (`learner-parity-guard.ts`) reads this job's conclusion, so with these two steps it attests the v3
// screens too. Neither is tagged `@parity:`: the meta-test's manifest and the results it reads are unchanged.
results.push({
  name: 'the LMS v3 screens, both flags on (e2e-v3)',
  ok: step(
    'the LMS v3 screens, both flags on (e2e-v3)',
    process.execPath,
    [PLAYWRIGHT_CLI, 'test', '-c', join(ROOT, 'compliance', 'playwright.config.ts'), '--project=e2e-v3'],
    ROOT,
    { ...process.env, LMS_V3: '1', LEARNER_V2: '' },
  ),
});
results.push({
  name: 'the LMS v3 unit tests (apps/web)',
  ok: step(
    'the LMS v3 unit tests (apps/web)',
    process.execPath,
    [vitestCli('apps/web'), 'run', 'src/routes/learn/lms-v3', 'src/routes/learn/every-learner.test.tsx', 'src/routes/learn/IntroText.test.tsx'],
    join(ROOT, 'apps', 'web'),
  ),
});

console.log('\n▶ the meta-test (check.ts)\n');
results.push({ name: 'the meta-test', ok: check([]) === 0 });

console.log('\nparity:learner summary');
for (const r of results) console.log(`  ${r.ok ? '✓' : '✗'} ${r.name}`);
process.exit(results.every((r) => r.ok) ? 0 : 1);
