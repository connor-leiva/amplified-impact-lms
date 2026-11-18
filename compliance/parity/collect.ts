// Finding the `@parity:<ID>` tests, and reading how they did.
//
// A tagged test is any Playwright or vitest test whose title (or a describe block around it) carries
// `@parity:<ID>`, e.g. `Join is enabled 14 minutes before start @parity:S-2 @parity:D-2`.
//
//   Playwright   every test project in `learner.config.ts` (the main config's, plus the suite's own), read
//                from `playwright test --list --reporter=json` before a run and from the JSON reporter's
//                file after it.
//   vitest       `packages/core` and `apps/web`, the two packages whose suites run without a database.
//                Only files that contain the text `@parity:` are listed, so collecting stays fast.
//
// A test's ID here is its file, from the repository root, and its title path, joined by " › ", the way
// Playwright prints it: `compliance/tests/parity/deep-links.spec.ts › deep links › … @parity:M-3`. The
// same test run in two Playwright projects is one ID (the projects are where it runs, not what it is).

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../..', import.meta.url));
export const PARITY_DIR = fileURLToPath(new URL('.', import.meta.url));
export const RESULTS_DIR = join(PARITY_DIR, 'results');
export const CONFIG = join(PARITY_DIR, 'learner.config.ts');
export const PLAYWRIGHT_RESULTS = join(RESULTS_DIR, 'playwright.json');
export const VITEST_PACKAGES = ['packages/core', 'apps/web'] as const;
export const vitestResultsFile = (pkg: string): string =>
  join(RESULTS_DIR, `vitest-${pkg.replace(/[\\/]/g, '-')}.json`);
/** The two CLIs, run with this Node rather than through `pnpm exec`, whose warnings would land in the JSON on stdout. */
export const PLAYWRIGHT_CLI = join(ROOT, 'node_modules', '@playwright', 'test', 'cli.js');
export const vitestCli = (pkg: string): string => join(ROOT, pkg, 'node_modules', 'vitest', 'vitest.mjs');

/** The JSON document in a CLI's stdout: from the first line that opens one. */
function jsonOf<T>(stdout: string, open: '{' | '['): T | null {
  const lines = stdout.split(/\r?\n/);
  const at = lines.findIndex((l) => l.startsWith(open));
  return at < 0 ? null : (JSON.parse(lines.slice(at).join('\n')) as T);
}

// An ID is letters, digits and hyphens (`E-8`, `X-2`): punctuation after it (a closing quote or
// bracket in the title) is not part of the tag.
const TAG = /@parity:([A-Za-z0-9-]*)/g;
const SEP = ' › ';

/** Every `@parity:` value in a title, as written (the checker decides whether each is a known ID). */
export function tagsOf(title: string): string[] {
  return [...title.matchAll(TAG)].map((m) => m[1] ?? '');
}

/** How a test did, across every project or package that ran it. */
export type Outcome = 'passed' | 'failed' | 'skipped';

export interface FoundTest {
  id: string;
  tags: string[];
  outcome?: Outcome;
}

const posix = (p: string): string => p.split(sep).join('/');

// ---- Playwright -------------------------------------------------------------------------------

interface PwTest {
  projectName?: string;
  status?: string;
}
interface PwSpec {
  title: string;
  tests?: PwTest[];
}
export interface PwSuite {
  title: string;
  file?: string;
  specs?: PwSpec[];
  suites?: PwSuite[];
}
export interface PwReport {
  config?: { rootDir?: string };
  suites?: PwSuite[];
}

/** The outcome of one Playwright test over its project runs: failed if any run failed, passed if any passed. */
function pwOutcome(tests: PwTest[]): Outcome {
  if (tests.some((t) => t.status === 'unexpected')) return 'failed';
  if (tests.some((t) => t.status === 'expected' || t.status === 'flaky')) return 'passed';
  return 'skipped';
}

/**
 * The tagged tests in a Playwright JSON report (a `--list` or a run). `rootDir` is the report's test
 * directory; titles are prefixed with it relative to the repository root.
 */
export function playwrightTests(report: PwReport, root: string = ROOT, withOutcome = false): FoundTest[] {
  const rootDir = report.config?.rootDir ?? join(root, 'compliance', 'tests');
  const prefix = posix(relative(root, rootDir));
  const out = new Map<string, FoundTest & { runs: PwTest[] }>();
  const walk = (suite: PwSuite, path: string[]) => {
    for (const spec of suite.specs ?? []) {
      const titles = [...path, spec.title];
      const tags = titles.flatMap(tagsOf);
      if (!tags.length) continue;
      const id = titles.join(SEP);
      const seen = out.get(id) ?? { id, tags: [...new Set(tags)], runs: [] };
      seen.runs.push(...(spec.tests ?? []));
      out.set(id, seen);
    }
    for (const child of suite.suites ?? []) walk(child, [...path, child.title]);
  };
  for (const file of report.suites ?? []) walk(file, [prefix ? `${prefix}/${file.title}` : file.title]);
  return [...out.values()].map(({ runs, ...t }) => (withOutcome ? { ...t, outcome: pwOutcome(runs) } : t));
}

/** `playwright test --list` over the learner config, as JSON. */
export function listPlaywright(): PwReport {
  const run = spawnSync(process.execPath, [PLAYWRIGHT_CLI, 'test', '-c', CONFIG, '--list', '--reporter=json'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  const report = jsonOf<PwReport>(run.stdout, '{');
  if (run.status !== 0 || !report)
    throw new Error(`playwright --list failed (${run.status}):\n${run.stderr}\n${run.stdout.slice(0, 2000)}`);
  return report;
}

// ---- vitest -----------------------------------------------------------------------------------

const TEST_FILE = /\.test\.tsx?$/;
const SKIP_DIRS = new Set(['node_modules', 'dist', 'dist-fixture', 'dist-private', 'coverage']);

/** The test files of a package that mention `@parity:` at all. */
export function taggedVitestFiles(pkg: string, root: string = ROOT): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (SKIP_DIRS.has(name)) continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (TEST_FILE.test(name) && readFileSync(p, 'utf8').includes('@parity:')) out.push(p);
    }
  };
  const base = join(root, pkg);
  if (existsSync(base)) walk(base);
  return out.sort();
}

interface VitestListed {
  name: string;
  file: string;
}

/** The tagged tests in `vitest list --json` output. */
export function vitestListedTests(listed: VitestListed[], root: string = ROOT): FoundTest[] {
  const out = new Map<string, FoundTest>();
  for (const t of listed) {
    const tags = tagsOf(t.name);
    if (!tags.length) continue;
    const id = [posix(relative(root, t.file)), ...t.name.split(' > ')].join(SEP);
    out.set(id, { id, tags: [...new Set(tags)] });
  }
  return [...out.values()];
}

interface VitestAssertion {
  title: string;
  ancestorTitles?: string[];
  status: string;
}
export interface VitestReport {
  testResults?: { name: string; assertionResults?: VitestAssertion[] }[];
}

/** The tagged tests in a vitest JSON report, with how each did. */
export function vitestResultTests(report: VitestReport, root: string = ROOT): FoundTest[] {
  const out: FoundTest[] = [];
  for (const file of report.testResults ?? []) {
    for (const a of file.assertionResults ?? []) {
      const titles = [...(a.ancestorTitles ?? []), a.title];
      const tags = titles.flatMap(tagsOf);
      if (!tags.length) continue;
      const outcome: Outcome = a.status === 'passed' ? 'passed' : a.status === 'failed' ? 'failed' : 'skipped';
      out.push({ id: [posix(relative(root, file.name)), ...titles].join(SEP), tags: [...new Set(tags)], outcome });
    }
  }
  return out;
}

/** `vitest list --json` over a package's tagged files. */
export function listVitest(pkg: string, files: string[]): VitestListed[] {
  if (!files.length) return [];
  const run = spawnSync(
    process.execPath,
    // `--json` LAST: given a value it is an output path, and vitest would write the listing over the first
    // test file named after it.
    [vitestCli(pkg), 'list', ...files.map((f) => relative(join(ROOT, pkg), f)), '--json'],
    { cwd: join(ROOT, pkg), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  if (run.status !== 0) throw new Error(`vitest list in ${pkg} failed (${run.status}):\n${run.stderr}`);
  return jsonOf<VitestListed[]>(run.stdout, '[') ?? [];
}

// ---- the listing ------------------------------------------------------------------------------

/** Every tagged test the repository holds now, from Playwright and vitest. */
export function collectListing(): FoundTest[] {
  const found = playwrightTests(listPlaywright());
  for (const pkg of VITEST_PACKAGES) found.push(...vitestListedTests(listVitest(pkg, taggedVitestFiles(pkg))));
  return found.sort((a, b) => a.id.localeCompare(b.id));
}

/** Every tagged test a finished run reported, with its outcome. Missing report files report nothing. */
export function collectResults(): FoundTest[] {
  const found: FoundTest[] = [];
  if (existsSync(PLAYWRIGHT_RESULTS))
    found.push(...playwrightTests(JSON.parse(readFileSync(PLAYWRIGHT_RESULTS, 'utf8')) as PwReport, ROOT, true));
  for (const pkg of VITEST_PACKAGES) {
    const f = vitestResultsFile(pkg);
    if (existsSync(f)) found.push(...vitestResultTests(JSON.parse(readFileSync(f, 'utf8')) as VitestReport));
  }
  return found;
}
