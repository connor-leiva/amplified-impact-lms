// @vitest-environment node
//
// D-157: the Console's fixture (fictional people, a role switch and state switches for screenshots)
// must never reach production. `console.ts` loads it behind `import.meta.env.VITE_DATA_SOURCE ===
// 'fixture'`, which Vite replaces with a constant; this builds `console.ts` both ways, with Vite and
// this app's own aliases and env files, and reads what comes out.
import { describe, expect, it } from 'vitest';
import { build } from 'vite';
import type { Rollup } from 'vite';
import { fileURLToPath } from 'node:url';

const WEB = fileURLToPath(new URL('../..', import.meta.url));
const CORE = (p: string) => fileURLToPath(new URL(`../../../../packages/core/src/${p}`, import.meta.url));

/** Strings only `console-fixture.ts` holds: its two query parameters and its documentation addresses. */
const SENTINELS = [
  'console-role',
  'console-state',
  '203.0.113.',
  // R2-3b: the parity fixture's audit rows (`AUDIT0`).
  'in_1QxK5fFm0270',
  'Customer cannot see the Session 2 replay',
];

async function bundle(mode: 'production' | 'fixture', entry = './console.ts'): Promise<string> {
  const out = (await build({
    root: WEB,
    mode,
    configFile: false,
    logLevel: 'silent',
    resolve: {
      alias: [
        { find: /^@ai\/core\/(.*)$/, replacement: CORE('$1.ts') },
        { find: '@ai/core', replacement: CORE('index.ts') },
      ],
    },
    build: {
      write: false,
      minify: false,
      sourcemap: false,
      lib: { entry: fileURLToPath(new URL(entry, import.meta.url)), formats: ['es'], fileName: 'bundle' },
    },
  })) as Rollup.RollupOutput | Rollup.RollupOutput[];
  const outputs = Array.isArray(out) ? out : [out];
  return outputs
    .flatMap((o) => o.output)
    .map((f) => (f.type === 'chunk' ? f.code : typeof f.source === 'string' ? f.source : ''))
    .join('\n');
}

/**
 * D-160 R2-1c: the Console fixture's records are the R2 mockup's people (fixture build only). D-168: the
 * Operations pages' sample data (the mockup's deploys, slow queries, mockup-only flags and integration
 * stamps) is fixture-only too.
 */
const RECORD_SENTINELS = [
  'ws_northshore',
  'Elena Vargas',
  'cus_Rk3NshoreA1',
  'in_1QxT4mNs0291',
  'Scope 16px floor and 44px targets to phone widths',
  'o.ghl_attempts, o.ghl_error',
  'zoom_recording_webhook',
  'maintenance_mode',
  '1 hard bounce',
  'Zoom OAuth client secret',
];

describe('the Console fixture is not in the http build (D-157)', () => {
  it('D-168: the Operations pages’ view-model prints production’s own words, and none of the mockup’s data', async () => {
    const code = await bundle('production', '../routes/console/ops.vm.ts');
    expect(code).toContain('Not configured');
    expect(code).toContain('www only (D-155)');
    for (const s of ['Scope 16px floor', 'zoom_recording_webhook', 'maintenance_mode', '1 hard bounce', 'GHL orders: back off on 401']) expect(code, s).not.toContain(s);
  }, 60_000);

  it('the http build has none of it', async () => {
    const code = await bundle('production');
    expect(code).toContain('/api/console/audit');
    for (const s of [...SENTINELS, ...RECORD_SENTINELS]) expect(code, s).not.toContain(s);
  }, 60_000);

  it('the fixture build has it, so the check above can fail', async () => {
    const code = await bundle('fixture');
    for (const s of [...SENTINELS, ...RECORD_SENTINELS]) expect(code, s).toContain(s);
  }, 60_000);
});

/**
 * D-160 R2-1b: the Admin redesign R2 parity fixture (`parity-r2.ts`, the mockup's own people and
 * counts, selected by `?parity=r2`) and the fixture-only `/admin/denied` route are fixture-build only
 * too. `admin-shell.ts` loads the fixture behind the same constant; `routes/console/fixtureRoutes.ts`
 * holds the route behind it.
 */
const PARITY_SENTINELS = ['Connor Leiva', 'INC-0007', 'Kenji Watanabe', 'December 2026 Cohort'];

describe('the R2 parity fixture is not in the http build (D-160 R2-1b)', () => {
  it("the http build of the admin shell's data has none of it", async () => {
    const code = await bundle('production', './admin-shell.ts');
    expect(code).toContain('Amplified AI Accelerator');
    for (const s of PARITY_SENTINELS) expect(code, s).not.toContain(s);
  }, 60_000);

  it('the fixture build has it, so the check above can fail', async () => {
    const code = await bundle('fixture', './admin-shell.ts');
    for (const s of PARITY_SENTINELS) expect(code, s).toContain(s);
  }, 60_000);

  it('the http build has no /admin/denied route; the fixture build does', async () => {
    expect(await bundle('production', '../routes/console/fixtureRoutes.ts')).not.toContain('admin/denied');
    expect(await bundle('fixture', '../routes/console/fixtureRoutes.ts')).toContain('admin/denied');
  }, 120_000);
});

/**
 * D-160 R2-2: the parity snapshot (`parity-r2-db.ts`, the mockup's curriculum, sessions and cohort as
 * the app's own snapshot) is loaded by `boot.ts` behind the same constant and `?parity=r2`.
 */
const SNAPSHOT_SENTINELS = [
  'Wednesdays, weekly',
  'skill-file.zip',
  'review-checklist.pdf',
  'Recruiting AI Employee',
  // R2-3a: the Overview's, Learners & Teams' and Tiers & Upgrades' data.
  'elena@northshoregroup.example',
  'Lantern Street Partners',
  'The same Team Tier, sized for larger teams.',
  'Team · 16 seats → 41 seats',
  'Sarah Collins',
];

describe('the R2 parity snapshot is not in the http build (D-160 R2-2)', () => {
  it('the http build of boot has none of it', async () => {
    const code = await bundle('production', './boot.ts');
    expect(code).toContain('createHttpRepository');
    for (const s of SNAPSHOT_SENTINELS) expect(code, s).not.toContain(s);
  }, 120_000);

  it('the fixture build has it, so the check above can fail', async () => {
    const code = await bundle('fixture', './boot.ts');
    for (const s of SNAPSHOT_SENTINELS) expect(code, s).toContain(s);
  }, 120_000);
});
