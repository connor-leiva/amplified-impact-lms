// Nothing cohort-specific is hard-coded (Connor, Nov 26, 2026; handoff/admin-mockup/PLAN.md § 10.10, D-262).
//
// R-5 Phase 5 adds this check to `pnpm lint`, so CI's quality job runs it. It reads the runtime code (apps/api/src,
// apps/web/src, packages/core/src: no tests, no seeds, no comments) and fails on:
//
//   - a comparison to December's id: `=== DEFAULT_COHORT_ID`, `!== ACCELERATOR_COHORT_ID`, `eq(…, DEFAULT_COHORT_ID)`,
//     `case DEFAULT_COHORT_ID:` (a branch that treats December differently from every other cohort);
//   - the literal 'dec26' anywhere (a cohort's id typed into code);
//   - a date literal: '2026-12-02…', Date.UTC(2027, …), new Date(2027, …) (a cohort's date typed into code);
//
// unless the line is on `scripts/cohort-hardcodes.allow.json`:
//
//   allow      what is still to move: each entry names its file, a piece of the line it matches, how many lines it
//              may match, why it is there and the phase that removes it. As short as it can be, and shrinking.
//   notCohort  what is not cohort-specific and never moves (§ 10.10's "Not cohort-specific": the Team Plan's and the
//              Agent Plan's dates, the agreement's version, an API's version), each with its reason.
//   ignore     whole files that are not the product's runtime code (the prototype's demo seed and the fixture data
//              the fixture build draws), each with its reason.
//
// An entry that no longer matches anything fails too, so the list can only shrink: remove it in the change that moves
// the line. `node scripts/check-cohort-hardcodes.mjs --list` prints every finding with its entry.
import { globSync, readFileSync } from 'node:fs';
import { code } from './code-only.mjs';

const LIST = process.argv.includes('--list');
const CONFIG = 'scripts/cohort-hardcodes.allow.json';
const { allow, notCohort, ignore } = JSON.parse(readFileSync(CONFIG, 'utf8'));

const ROOTS = ['apps/api/src', 'apps/web/src', 'packages/core/src'];
const SKIP = [/\.test\.tsx?$/, /\/test\//, /\/__tests__\//, /\.d\.ts$/];

const CHECKS = [
  {
    kind: 'comparison to December’s id',
    re: /(===|!==|==|!=)\s*(DEFAULT_COHORT_ID|ACCELERATOR_COHORT_ID)\b|\b(DEFAULT_COHORT_ID|ACCELERATOR_COHORT_ID)\s*(===|!==|==|!=)|\beq\([^)]*\b(DEFAULT_COHORT_ID|ACCELERATOR_COHORT_ID)\b|\bcase\s+(DEFAULT_COHORT_ID|ACCELERATOR_COHORT_ID)\b/,
  },
  { kind: 'the literal dec26', re: /['"`]dec26['"`]/ },
  { kind: 'a date literal', re: /['"`]20\d\d-[01]\d-[0-3]\d|Date\.UTC\(\s*20\d\d\b|new Date\(\s*20\d\d\s*,/ },
  // R-5 audit (D-267): a cohort's name typed into text ("December 2026 Cohort", "December 2026", "December Cohort"): a
  // screen, an email or a label that names one cohort where it should read the cohort's record.
  {
    kind: 'a cohort’s name in text',
    // The skill guides' worked examples (apps/web/src/guides) date their own made-up reports ("October 2026"): sample
    // content, not a cohort.
    skip: /^apps\/web\/src\/guides\//,
    re: /\b(January|February|March|April|May|June|July|August|September|October|November|December) (20\d\d|Cohort)\b/,
  },
];

const files = ROOTS.flatMap((r) => globSync(`${r}/**/*.{ts,tsx}`))
  .map((f) => f.split('\\').join('/'))
  .filter((f) => !SKIP.some((re) => re.test(f)))
  .filter((f) => !ignore.some((x) => x.file === f))
  .sort();

const entries = [...allow.map((e) => ({ ...e, list: 'allow' })), ...notCohort.map((e) => ({ ...e, list: 'notCohort' }))];
for (const e of entries) {
  const where = `${CONFIG}: ${e.file} "${e.match}"`;
  if (!e.file || !e.match || !Number.isInteger(e.count) || e.count < 1 || !e.reason) throw new Error(`${where}: every entry needs file, match, count and reason.`);
  if (e.list === 'allow' && !e.phase) throw new Error(`${where}: an allow entry needs the phase that removes it.`);
  e.used = 0;
}
for (const x of ignore) if (!x.file || !x.reason) throw new Error(`${CONFIG}: every ignored file needs a reason.`);

const bad = [];
const found = [];
for (const f of files) {
  const lines = code(readFileSync(f, 'utf8')).split('\n');
  lines.forEach((line, i) => {
    for (const check of CHECKS) {
      if (check.skip?.test(f) || !check.re.test(line)) continue;
      const e = entries.find((x) => x.file === f && line.includes(x.match) && x.used < x.count);
      const at = `${f}:${i + 1}`;
      if (e) {
        e.used += 1;
        found.push(`${at}  ${check.kind}  [${e.list}: ${e.phase ?? 'never'}]  ${line.trim().slice(0, 120)}`);
      } else bad.push(`${at}  ${check.kind}: ${line.trim().slice(0, 160)}`);
      break;
    }
  });
}
const stale = entries.filter((e) => e.used === 0).map((e) => `${e.file} "${e.match}" (${e.list})`);
const short = entries.filter((e) => e.used > 0 && e.used < e.count).map((e) => `${e.file} "${e.match}": ${e.used} of ${e.count}`);

if (LIST) console.log(found.join('\n'));
if (bad.length || stale.length || short.length) {
  if (bad.length)
    console.error(
      `A cohort hard-coded in runtime code (PLAN.md § 10.10): read it from the cohort's record instead. If it truly must stay, add it to ${CONFIG} with its reason and the phase that removes it.\n` +
        bad.join('\n'),
    );
  if (stale.length) console.error(`\n${CONFIG}: these entries match nothing now. Remove them (the list only shrinks):\n` + stale.join('\n'));
  if (short.length) console.error(`\n${CONFIG}: these entries allow more lines than match now. Lower their count:\n` + short.join('\n'));
  process.exit(1);
}
console.log(`check-cohort-hardcodes: ok (${allow.length} still to move, ${notCohort.length} not cohort-specific, ${ignore.length} files ignored)`);
