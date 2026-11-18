// The learner parity meta-test (Connor's parity brief § 3). `pnpm parity:learner` runs it after the
// tagged tests; CI's `parity-learner` job fails when it does. It fails when:
//
//   1. an inventory ID is missing from the manifest (or the manifest has an ID the inventory doesn't)
//   2. a test's `@parity:` tag names an ID the manifest doesn't have
//   3. a manifest entry's `tests` differ from what `pnpm parity:learner:sync` would write (stale)
//   4. a `kept` or `restored` entry has no PASSING test (a test that failed, was skipped or did not run
//      does not count). `signed-off-drop` and `n/a` entries need none, though they may have one.
//   5. a `signed-off-drop` entry has no approval line in `signed-off-drops.md` (Connor's format:
//      `ID — what is lost — Approved by Connor Leiva on <date>, "<his exact words>"`). Lines under the
//      "Pending Connor's sign-off" heading are not approvals.
//   6. a tagged test failed (the run itself is red then, too; this says which)
//   7. an entry is malformed (a kind, status or audience outside the brief's lists, an empty `what`)
//
// Usage (from the repository root):
//   pnpm parity:learner:check                 read the last run's results in compliance/parity/results/
//   pnpm parity:learner:check --no-results    only the structure: 1, 2, 3, 5 and 7, without running tests

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ID_PATTERN, inventoryIds } from './inventory';
import { PARITY_DIR, collectListing, collectResults, type FoundTest, type Outcome } from './collect';

export const KINDS = ['route', 'action', 'deep-link', 'api', 'console-effect', 'access-group', 'mobile'] as const;
export const STATUSES = ['kept', 'restored', 'signed-off-drop', 'n/a'] as const;
export const AUDIENCES = ['Accelerator', 'Team', 'Agent', 'Utah Life', 'Insiders', 'free'] as const;

export interface ManifestEntry {
  id: string;
  area: string;
  what: string;
  kind: (typeof KINDS)[number];
  audience: (typeof AUDIENCES)[number][];
  status: (typeof STATUSES)[number];
  /** The branch expected to supply a restored entry's tests. */
  by?: string;
  note?: string;
  tests: string[];
}
export interface Manifest {
  entries: ManifestEntry[];
}

export const MANIFEST_FILE = join(PARITY_DIR, 'learner-parity.json');
export const INVENTORY_FILE = join(PARITY_DIR, 'portal-parity-inventory.md');
export const DROPS_FILE = join(PARITY_DIR, 'signed-off-drops.md');

// ---- signed-off-drops.md -----------------------------------------------------------------------

export interface Approval {
  id: string;
  lost: string;
  date: string;
  words: string;
  line: number;
}

const APPROVAL = /^\s*(?:[-*]\s+)?([A-Z]{1,2}-\d+) — (.+?) — Approved by Connor Leiva on ([^,]+), "(.+)"\s*$/;
const HEADING = /^#{1,6}\s+(.*)$/;

/** The approval lines in signed-off-drops.md, outside the "Pending Connor's sign-off" section. */
export function parseApprovals(markdown: string): Map<string, Approval> {
  const out = new Map<string, Approval>();
  let pending = false;
  let fence = false;
  markdown.split(/\r?\n/).forEach((text, i) => {
    if (/^\s*```/.test(text)) {
      fence = !fence;
      return;
    }
    if (fence) return;
    const h = HEADING.exec(text);
    if (h) {
      pending = /pending/i.test(h[1]!);
      return;
    }
    if (pending) return;
    const m = APPROVAL.exec(text);
    if (m && m[4]!.trim())
      out.set(m[1]!, { id: m[1]!, lost: m[2]!.trim(), date: m[3]!.trim(), words: m[4]!, line: i + 1 });
  });
  return out;
}

// ---- the check --------------------------------------------------------------------------------

export interface CheckInput {
  inventory: string[];
  manifest: Manifest;
  /** Every tagged test the repository holds now (what `sync` would write from). */
  listing: FoundTest[];
  /** Every tagged test the last run reported, with its outcome. Null: the structure only. */
  results: FoundTest[] | null;
  approvals: Map<string, Approval>;
}

export type ProblemKind =
  | 'missing-from-manifest'
  | 'not-in-inventory'
  | 'unknown-tag'
  | 'stale-tests'
  | 'no-passing-test'
  | 'awaiting-sign-off'
  | 'failed-test'
  | 'malformed';

export interface Problem {
  kind: ProblemKind;
  id: string;
  detail: string;
}

/** What `sync` writes into each entry's `tests`: the tagged tests naming it, sorted. */
export function testsById(listing: FoundTest[], ids: Iterable<string>): Map<string, string[]> {
  const out = new Map<string, string[]>([...ids].map((id) => [id, []]));
  for (const t of listing) for (const tag of t.tags) out.get(tag)?.push(t.id);
  for (const [id, tests] of out) out.set(id, [...new Set(tests)].sort());
  return out;
}

const NEEDS_TEST = new Set(['kept', 'restored']);

export function checkParity(input: CheckInput): Problem[] {
  const problems: Problem[] = [];
  const add = (kind: ProblemKind, id: string, detail: string) => problems.push({ kind, id, detail });
  const entries = input.manifest.entries;
  const ids = new Set(entries.map((e) => e.id));
  const inv = new Set(input.inventory);

  // 1. coverage
  for (const id of input.inventory)
    if (!ids.has(id)) add('missing-from-manifest', id, 'in the inventory, not in learner-parity.json');
  for (const id of ids) if (!inv.has(id)) add('not-in-inventory', id, 'in learner-parity.json, not in the inventory');
  const seen = new Set<string>();
  for (const e of entries) {
    if (seen.has(e.id)) add('malformed', e.id, 'listed twice');
    seen.add(e.id);
  }

  // 7. shape
  for (const e of entries) {
    if (!ID_PATTERN.test(e.id)) add('malformed', e.id, 'not an inventory ID');
    if (!KINDS.includes(e.kind)) add('malformed', e.id, `kind "${e.kind}" is not one of ${KINDS.join(', ')}`);
    if (!STATUSES.includes(e.status))
      add('malformed', e.id, `status "${e.status}" is not one of ${STATUSES.join(', ')}`);
    if (!Array.isArray(e.audience) || e.audience.some((a) => !AUDIENCES.includes(a)))
      add('malformed', e.id, `audience must be drawn from ${AUDIENCES.join(', ')}`);
    if (typeof e.what !== 'string' || !e.what.trim() || /\n/.test(e.what))
      add('malformed', e.id, '`what` must be one non-empty line');
    if (!Array.isArray(e.tests)) add('malformed', e.id, '`tests` must be a list');
  }

  // 2. unknown tags
  for (const t of input.listing)
    for (const tag of t.tags) if (!ids.has(tag)) add('unknown-tag', tag || '(empty)', `@parity:${tag} in ${t.id}`);

  // 3. stale
  const want = testsById(input.listing, ids);
  for (const e of entries) {
    const have = [...(e.tests ?? [])].sort();
    const should = want.get(e.id) ?? [];
    if (have.length !== should.length || have.some((t, i) => t !== should[i])) {
      const added = should.filter((t) => !have.includes(t)).length;
      const removed = have.filter((t) => !should.includes(t)).length;
      add(
        'stale-tests',
        e.id,
        `tests differ from the tags (${added} to add, ${removed} to remove): run pnpm parity:learner:sync`,
      );
    }
  }

  // 4 and 6. outcomes
  if (input.results) {
    const outcome = new Map<string, Outcome>();
    for (const r of input.results) {
      const prev = outcome.get(r.id);
      // The same test from two reports: a failure wins, then a pass.
      outcome.set(
        r.id,
        prev === 'failed' || r.outcome === 'failed'
          ? 'failed'
          : prev === 'passed' || r.outcome === 'passed'
            ? 'passed'
            : 'skipped',
      );
    }
    for (const e of entries) {
      if (!NEEDS_TEST.has(e.status)) continue;
      const tests = want.get(e.id) ?? [];
      if (tests.some((t) => outcome.get(t) === 'passed')) continue;
      const why = tests.length
        ? tests.map((t) => `${outcome.get(t) ?? 'did not run'}: ${t}`).join('\n      ')
        : `no test is tagged @parity:${e.id}${e.by ? ` (expected from ${e.by})` : ''}`;
      add('no-passing-test', e.id, why);
    }
    for (const [id, o] of outcome) if (o === 'failed') add('failed-test', id, 'failed');
  }

  // 5. approvals
  for (const e of entries)
    if (e.status === 'signed-off-drop' && !input.approvals.has(e.id))
      add('awaiting-sign-off', e.id, 'no approval line in signed-off-drops.md');
  for (const [id, a] of input.approvals) {
    const e = entries.find((x) => x.id === id);
    if (!e) add('malformed', id, `approval on signed-off-drops.md:${a.line} names an ID the manifest doesn't have`);
    else if (e.status !== 'signed-off-drop')
      add('malformed', id, `approval on signed-off-drops.md:${a.line}, but the manifest's status is "${e.status}"`);
  }

  return problems;
}

const HEADINGS: Record<ProblemKind, string> = {
  'missing-from-manifest': 'Inventory IDs missing from the manifest',
  'not-in-inventory': 'Manifest IDs that are not in the inventory',
  'unknown-tag': '@parity: tags naming an unknown ID',
  'stale-tests': 'Stale `tests` (run `pnpm parity:learner:sync`)',
  'no-passing-test': 'Kept or restored IDs with no passing test',
  'awaiting-sign-off': "Signed-off drops awaiting Connor's sign-off (no approval line in signed-off-drops.md)",
  'failed-test': 'Tagged tests that failed',
  malformed: 'Malformed entries',
};

/** The report, as `check.ts` prints it. */
export function formatReport(input: CheckInput, problems: Problem[]): string {
  const entries = input.manifest.entries;
  const count = (f: (e: ManifestEntry) => string) =>
    Object.entries(entries.reduce<Record<string, number>>((acc, e) => ((acc[f(e)] = (acc[f(e)] ?? 0) + 1), acc), {}))
      .map(([k, n]) => `${k} ${n}`)
      .join(', ');
  const lines = [
    `Learner parity: ${entries.length} manifest entries, ${input.inventory.length} inventory IDs, ${input.listing.length} tagged tests.`,
    `  by status: ${count((e) => e.status)}`,
    `  by kind:   ${count((e) => e.kind)}`,
  ];
  if (input.results) {
    const passed = new Set(input.results.filter((r) => r.outcome === 'passed').map((r) => r.id));
    const covered = entries.filter((e) => (e.tests ?? []).some((t) => passed.has(t))).length;
    lines.push(
      `  results:   ${input.results.length} tagged tests reported, ${passed.size} passed; ${covered} of ${entries.length} IDs have a passing test`,
    );
  } else lines.push('  results:   not read (--no-results)');
  for (const kind of Object.keys(HEADINGS) as ProblemKind[]) {
    const list = problems.filter((p) => p.kind === kind);
    if (!list.length) continue;
    lines.push('', `${HEADINGS[kind]}: ${list.length}`);
    if (kind === 'awaiting-sign-off') lines.push(`  ${list.map((p) => p.id).join(', ')}`);
    else for (const p of list) lines.push(`  ${p.id}: ${p.detail}`);
  }
  lines.push('', problems.length ? `parity:learner FAILED: ${problems.length} problems.` : 'parity:learner PASSED.');
  const waiting = problems.filter((p) => p.kind === 'awaiting-sign-off').map((p) => p.id);
  if (waiting.length) lines.push(`Awaiting Connor's sign-off: ${waiting.join(', ')}.`);
  return lines.join('\n');
}

export function readManifest(file = MANIFEST_FILE): Manifest {
  return JSON.parse(readFileSync(file, 'utf8')) as Manifest;
}

/** The CLI. */
export function main(argv: string[]): number {
  const structureOnly = argv.includes('--no-results');
  const input: CheckInput = {
    inventory: inventoryIds(readFileSync(INVENTORY_FILE, 'utf8')),
    manifest: readManifest(),
    listing: collectListing(),
    results: structureOnly ? null : collectResults(),
    approvals: parseApprovals(readFileSync(DROPS_FILE, 'utf8')),
  };
  const problems = checkParity(input);
  console.log(formatReport(input, problems));
  return problems.length ? 1 : 0;
}

if (process.argv[1] && /check\.ts$/.test(process.argv[1])) process.exit(main(process.argv.slice(2)));
