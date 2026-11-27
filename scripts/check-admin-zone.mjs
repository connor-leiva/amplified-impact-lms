// The admin prints no "MST" (R-5 audit, D-267; Connor, Nov 26, 2026: "Every admin time via the MT / CT formatter; remove
// ADMIN_ZONE 'MST' output and add a check that fails on 'MST' in admin output").
//
// In `pnpm lint`, so CI's quality job runs it. It reads the code that makes what the admin shows (not tests, not
// comments) and fails on the word "MST" anywhere in it: a zone label, a description ("Times are MST"), a form label
// ("Send at (MST)") or the fixture's sample data the admin draws. The admin's zone is MT (America/Denver), and a time that
// names its zone is "12:00 PM MT / 1:00 PM CT", through `fmt.mtCt` (`packages/core/src/admin-build.ts`).
//
// What it reads:
//   apps/web/src/routes/admin, apps/web/src/routes/console, apps/web/src/shell/admin, apps/web/src/components/r2,
//   apps/web/src/data/admin-shell.ts and the admin's fixture data (parity-r2*.ts, console-fixture*.ts);
//   packages/core/src: the admin's formatters and view logic (admin-*, console-*, cohort-*, curriculum-week);
//   apps/api/src/console (the Console's own routes).
// The learner portal is not read: a learner in Arizona sees their own zone's label (`fmt`'s `zoneAbbr`), which is MST.
//
// `node scripts/check-admin-zone.mjs --list` prints the files it reads.
import { globSync, readFileSync } from 'node:fs';
import { code } from './code-only.mjs';

const LIST = process.argv.includes('--list');
const GLOBS = [
  'apps/web/src/routes/admin/**/*.{ts,tsx}',
  'apps/web/src/routes/console/**/*.{ts,tsx}',
  'apps/web/src/shell/admin/**/*.{ts,tsx}',
  'apps/web/src/components/r2/**/*.{ts,tsx}',
  'apps/web/src/data/admin-shell.ts',
  'apps/web/src/data/parity-r2*.ts',
  'apps/web/src/data/console-fixture*.ts',
  'packages/core/src/admin-*.ts',
  'packages/core/src/console-*.ts',
  'packages/core/src/cohort-*.ts',
  'packages/core/src/curriculum-week.ts',
  'apps/api/src/console/**/*.ts',
];
const SKIP = [/\.test\.tsx?$/, /\/test\//, /\/__tests__\//, /\.d\.ts$/];
const MST = /\bMST\b/;

const files = [...new Set(GLOBS.flatMap((g) => globSync(g)))]
  .map((f) => f.split('\\').join('/'))
  .filter((f) => !SKIP.some((re) => re.test(f)))
  .sort();
if (!files.length) throw new Error('check-admin-zone: no file matched; the paths have moved.');

const bad = [];
for (const f of files) {
  code(readFileSync(f, 'utf8'))
    .split('\n')
    .forEach((line, i) => {
      if (MST.test(line)) bad.push(`${f}:${i + 1}: ${line.trim().slice(0, 160)}`);
    });
}
if (LIST) console.log(files.join('\n'));
if (bad.length) {
  console.error(
    'The admin prints "MST" (D-267): its zone is MT, and a time that names its zone is "12:00 PM MT / 1:00 PM CT" through `fmt.mtCt` (`adminWhen`, `adminStampZoned`).\n' +
      bad.join('\n'),
  );
  process.exit(1);
}
console.log(`check-admin-zone: ok (${files.length} admin files, no "MST")`);
