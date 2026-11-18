// The learner parity checker's own tests (node:test, run by `pnpm parity:learner` and CI before the
// meta-test). Fixtures are in ./fixtures; the last block reads the real inventory, manifest and drops.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseInventory, inventoryIds } from './inventory';
import {
  PARITY_DIR,
  playwrightTests,
  tagsOf,
  vitestListedTests,
  vitestResultTests,
  type FoundTest,
  type PwReport,
  type VitestReport,
} from './collect';
import {
  DROPS_FILE,
  INVENTORY_FILE,
  MANIFEST_FILE,
  checkParity,
  formatReport,
  parseApprovals,
  readManifest,
  testsById,
  type CheckInput,
  type Manifest,
  type ManifestEntry,
} from './check';
import { syncManifest } from './sync';

/** A stand-in approver: the fixtures never attribute words to Connor. */
const TEST_APPROVER = 'Test Approver';
const fixture = (name: string): string => readFileSync(join(PARITY_DIR, 'fixtures', name), 'utf8');
const REPO = '/repo';

const entry = (id: string, over: Partial<ManifestEntry> = {}): ManifestEntry => ({
  id,
  area: 'Routes and pages',
  what: `what ${id} does`,
  kind: 'route',
  audience: ['Accelerator'],
  status: 'kept',
  tests: [],
  ...over,
});

/** A small world: four IDs, a listing, results and approvals that are all consistent. */
function clean(): CheckInput {
  const listing: FoundTest[] = [
    { id: 't › a @parity:R-1', tags: ['R-1'] },
    { id: 't › b @parity:R-2 @parity:R-1', tags: ['R-2', 'R-1'] },
  ];
  return {
    inventory: ['R-1', 'R-2', 'SH-4', 'P-2'],
    manifest: {
      entries: [
        entry('R-1', { tests: ['t › a @parity:R-1', 't › b @parity:R-2 @parity:R-1'] }),
        entry('R-2', { status: 'restored', tests: ['t › b @parity:R-2 @parity:R-1'] }),
        entry('SH-4', { status: 'signed-off-drop', kind: 'action' }),
        entry('P-2', { status: 'n/a', kind: 'action' }),
      ],
    },
    listing,
    results: listing.map((t) => ({ ...t, outcome: 'passed' as const })),
    approvals: parseApprovals(
      'SH-4 — the picker — Approved by Test Approver on 2026-01-01, "Fixture words."',
      TEST_APPROVER,
    ),
  };
}

const kinds = (input: CheckInput) => checkParity(input).map((p) => `${p.kind} ${p.id}`);

describe('tags', () => {
  it('reads every @parity: tag in a title', () => {
    assert.deepEqual(tagsOf('Join opens 15 minutes early @parity:S-2 @parity:D-2'), ['S-2', 'D-2']);
    assert.deepEqual(tagsOf('no tags here'), []);
    assert.deepEqual(tagsOf('shows "Replay Processing @parity:E-8" (@parity:D-6)'), ['E-8', 'D-6']);
    assert.deepEqual(tagsOf('@parity:'), ['']);
  });
});

describe('reading Playwright and vitest reports', () => {
  const pw = JSON.parse(fixture('playwright-run.json')) as PwReport;
  it('finds tagged tests by file and title path, describe tags included, one ID across projects', () => {
    const found = playwrightTests(pw, REPO, true);
    const byId = Object.fromEntries(found.map((t) => [t.id, t]));
    assert.equal(found.length, 4);
    assert.deepEqual(
      byId['compliance/tests/parity/deep-links.spec.ts › session-24h lands on the Schedule @parity:M-1'],
      {
        id: 'compliance/tests/parity/deep-links.spec.ts › session-24h lands on the Schedule @parity:M-1',
        tags: ['M-1'],
        outcome: 'passed',
      },
    );
    const nested =
      byId['compliance/tests/parity/deep-links.spec.ts › replays @parity:E-1 › the player plays @parity:M-3']!;
    assert.deepEqual(nested.tags, ['E-1', 'M-3']);
    assert.equal(nested.outcome, 'failed');
    assert.equal(
      byId['compliance/tests/e2e/learn-v2.spec.ts › two projects, one skipped @parity:R-2']!.outcome,
      'passed',
    );
    assert.equal(byId['compliance/tests/e2e/learn-v2.spec.ts › skipped everywhere @parity:R-4']!.outcome, 'skipped');
  });
  it('a --list report gives the same IDs, without outcomes', () => {
    const listed = playwrightTests(pw, REPO, false);
    assert.deepEqual(
      listed.map((t) => t.id),
      playwrightTests(pw, REPO, true).map((t) => t.id),
    );
    assert.ok(listed.every((t) => t.outcome === undefined));
  });
  it('vitest: the list and the run name a test the same way', () => {
    const run = vitestResultTests(JSON.parse(fixture('vitest-run.json')) as VitestReport, REPO);
    assert.deepEqual(
      run.map((t) => [t.id, t.outcome]),
      [
        ['apps/web/src/routes/learn/Week.vm.test.ts › weekVM › renders every field @parity:K-1', 'passed'],
        ['apps/web/src/routes/learn/Week.vm.test.ts › weekVM › an empty field renders nothing @parity:K-2', 'failed'],
      ],
    );
    const listed = vitestListedTests(
      [
        { name: 'weekVM > renders every field @parity:K-1', file: '/repo/apps/web/src/routes/learn/Week.vm.test.ts' },
        { name: 'weekVM > not tagged', file: '/repo/apps/web/src/routes/learn/Week.vm.test.ts' },
      ],
      REPO,
    );
    assert.deepEqual(listed, [{ id: run[0]!.id, tags: ['K-1'] }]);
  });
});

describe('signed-off-drops.md', () => {
  it('reads approval lines in the format, by the approver, and nothing in the pending section or a code block', () => {
    const a = parseApprovals(fixture('drops.md'), TEST_APPROVER);
    assert.deepEqual([...a.keys()].sort(), ['D-10', 'SH-4']);
    assert.deepEqual(a.get('SH-4'), {
      id: 'SH-4',
      lost: 'the time-zone picker',
      date: '2026-01-01',
      words: 'Fixture words, not anyone’s approval.',
      line: 9,
    });
  });
  it('an approval with empty words, or by anyone else, is not an approval', () => {
    const a = parseApprovals(fixture('drops.md'), TEST_APPROVER);
    assert.equal(a.has('E-15'), false);
    assert.equal(a.has('C-13'), false);
  });
  it('by default only Connor Leiva’s approvals count', () => {
    assert.equal(parseApprovals(fixture('drops.md')).size, 0);
  });
});

describe('checkParity', () => {
  it('a consistent world passes', () => {
    assert.deepEqual(kinds(clean()), []);
  });
  it('an inventory ID missing from the manifest, and a manifest ID not in the inventory', () => {
    const i = clean();
    i.inventory = [...i.inventory, 'K-1'];
    i.manifest.entries.push(entry('Z-9', { status: 'n/a' }));
    assert.deepEqual(kinds(i).sort(), ['missing-from-manifest K-1', 'not-in-inventory Z-9']);
  });
  it('a row the inventory lacks is allowed only as `added`, with an X-<n> ID', () => {
    const i = clean();
    i.manifest.entries.push(entry('X-1', { added: 'TeamHub.tsx:132 Export CSV', tests: [], status: 'n/a' }));
    assert.deepEqual(kinds(i), []);
    i.manifest.entries.push(entry('R-2', { added: 'twice' }));
    i.manifest.entries.push(entry('Q-1', { added: 'somewhere', status: 'n/a' }));
    assert.deepEqual(kinds(i).sort(), ['malformed Q-1', 'malformed R-2', 'malformed R-2', 'stale-tests R-2']);
  });
  it('a tag naming an unknown ID', () => {
    const i = clean();
    i.listing.push({ id: 't › c @parity:R-99', tags: ['R-99'] });
    assert.deepEqual(kinds(i), ['unknown-tag R-99']);
  });
  it('stale tests: a tag added or removed without a sync', () => {
    const i = clean();
    i.listing = i.listing.slice(0, 1);
    i.results = i.listing.map((t) => ({ ...t, outcome: 'passed' as const }));
    const p = kinds(i);
    assert.ok(p.includes('stale-tests R-1'));
    assert.ok(p.includes('stale-tests R-2'));
  });
  it('a kept or restored ID with no passing test: failed, skipped, did not run, or untagged', () => {
    for (const outcome of ['failed', 'skipped'] as const) {
      const i = clean();
      i.results = i.listing.map((t) => ({ ...t, outcome: t.tags.includes('R-2') ? outcome : 'passed' }));
      assert.ok(kinds(i).includes('no-passing-test R-2'), outcome);
    }
    const notRun = clean();
    notRun.results = [];
    assert.deepEqual(kinds(notRun).sort(), ['no-passing-test R-1', 'no-passing-test R-2']);
    const untagged = clean();
    untagged.manifest.entries.push(entry('K-1', { status: 'restored', by: 'claude/learner-pr9c-content' }));
    untagged.inventory.push('K-1');
    const p = checkParity(untagged).find((x) => x.id === 'K-1')!;
    assert.equal(p.kind, 'no-passing-test');
    assert.match(p.detail, /expected from claude\/learner-pr9c-content/);
  });
  it('one passing test is enough for an ID; a failing one is still reported', () => {
    const i = clean();
    i.results = i.listing.map((t) => ({ ...t, outcome: t.id.endsWith('a @parity:R-1') ? 'failed' : 'passed' }));
    assert.deepEqual(kinds(i), ['failed-test t › a @parity:R-1']);
  });
  it('signed-off-drop and n/a entries need no test', () => {
    const i = clean();
    assert.equal(kinds(i).length, 0);
    assert.deepEqual(i.manifest.entries.find((e) => e.id === 'P-2')!.tests, []);
  });
  it('a signed-off drop without Connor’s approval line fails, naming the ID', () => {
    const i = clean();
    i.approvals = new Map();
    const problems = checkParity(i);
    assert.deepEqual(
      problems.map((p) => `${p.kind} ${p.id}`),
      ['awaiting-sign-off SH-4'],
    );
    assert.match(formatReport(i, problems), /Awaiting Connor's sign-off: SH-4\./);
  });
  it('an approval for an ID that is not a drop is reported', () => {
    const i = clean();
    i.approvals = parseApprovals(
      [
        'SH-4 — the picker — Approved by Test Approver on 2026-01-01, "Fixture words."',
        'R-1 — x — Approved by Test Approver on 2026-01-01, "Fixture words."',
      ].join('\n'),
      TEST_APPROVER,
    );
    assert.deepEqual(kinds(i), ['malformed R-1']);
  });
  it('malformed entries', () => {
    const i = clean();
    i.manifest.entries[0] = {
      ...i.manifest.entries[0]!,
      kind: 'page' as never,
      audience: ['Everyone' as never],
      what: '',
    };
    assert.equal(kinds(i).filter((k) => k === 'malformed R-1').length, 3);
  });
  it('--no-results checks the structure only', () => {
    const i = clean();
    i.results = null;
    assert.deepEqual(kinds(i), []);
  });
});

describe('sync', () => {
  it('writes each entry’s tests from the tags, sorted, and leaves every other field alone', () => {
    const i = clean();
    const before: Manifest = { entries: i.manifest.entries.map((e) => ({ ...e, tests: ['stale'] })) };
    const after = syncManifest(
      before,
      testsById(
        i.listing,
        before.entries.map((e) => e.id),
      ),
    );
    assert.deepEqual(after, i.manifest);
  });
});

describe('the real files', () => {
  const md = readFileSync(INVENTORY_FILE, 'utf8');
  const rows = parseInventory(md);
  it('the inventory has 176 rows, each ID once, counted as its own Counts table counts them', () => {
    assert.equal(rows.length, 176);
    assert.equal(new Set(rows.map((r) => r.id)).size, 176);
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.status ?? 'none'] = (counts[r.status ?? 'none'] ?? 0) + 1;
    assert.deepEqual(counts, { KEPT: 77, MISSING: 52, CHANGED: 34, 'N/A': 8, New: 3, unverified: 2 });
  });
  it('the manifest’s IDs are exactly the inventory’s, in its order, then the rows this suite added', () => {
    const entries = readManifest(MANIFEST_FILE).entries;
    assert.deepEqual(
      entries.filter((e) => e.added === undefined).map((e) => e.id),
      inventoryIds(md),
    );
    const added = entries.filter((e) => e.added !== undefined);
    assert.deepEqual(entries.slice(entries.length - added.length), added);
    for (const e of added) assert.match(e.id, /^X-\d+$/);
  });
  it('the manifest maps the inventory’s statuses as the brief says', () => {
    const m = readManifest(MANIFEST_FILE);
    const status = Object.fromEntries(m.entries.map((e) => [e.id, e.status]));
    for (const id of [
      'E-14',
      'E-15',
      'SH-8',
      'P-1',
      'R-6',
      'A-7',
      'C-13',
      'SH-5',
      'SH-6',
      'MO-3',
      'D-10',
      'E-22',
      'SH-4',
    ])
      assert.equal(status[id], 'signed-off-drop', id);
    assert.equal(status['M-12'], 'n/a');
    assert.equal(status['E-21'], 'restored');
    for (const r of rows)
      if (r.status === 'KEPT' && status[r.id] !== 'kept')
        assert.ok(['restored', 'signed-off-drop'].includes(status[r.id]!), `${r.id} is KEPT in the inventory`);
    for (const e of m.entries)
      if (e.status === 'restored') assert.ok(e.by, `${e.id} names the branch that restores it`);
  });
  it('signed-off-drops.md approves SH-4 alone, in Connor’s words; every other drop is pending', () => {
    const a = parseApprovals(readFileSync(DROPS_FILE, 'utf8'));
    assert.deepEqual([...a.keys()], ['SH-4']);
    assert.equal(a.get('SH-4')!.words, 'No time-zone picker.');
  });
});
