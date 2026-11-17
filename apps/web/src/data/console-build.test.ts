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
  // R2-3b, editable Roles: the fixture's stand-in confirm tokens and its `PERMS0` (the parity matrix).
  'fixture-${',
  'parityRoleGrants',
  // D-172: the fixture's stand-in staff confirm tokens.
  'fixture-staff-',
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
 * D-160 R2-1c: the Console fixture's records are the R2 mockup's people (fixture build only). D-163:
 * Billing's sample figures and their "· sample" qualifiers.
 */
const RECORD_SENTINELS = [
  'ws_northshore',
  'Elena Vargas',
  'cus_Rk3NshoreA1',
  'in_1QxT4mNs0291',
  // D-162 3b: the mockup's recent masquerade sessions, and the switch that turns the flag off.
  'Checking seat invite flow after upgrade request',
  'Verifying Week 2 step order on her account',
  'masquerade-flag',
  // D-163: Billing's sample figures and their qualifiers.
  'MRR · sample',
  'Plan economics · sample figures',
  '+$695 this week',
  '$29 per agent, monthly',
  'card_declined: do_not_honor',
  're_3QxK5fFm70',
  // D-164: the fixture's stand-in confirm token and its two refusal states for the dialogs.
  'fixture-confirm',
  'action_expired',
  'action_scope',
];

describe('the Console fixture is not in the http build (D-157)', () => {
  it('D-163: the Billing screen’s production view-model has no sample words', async () => {
    const code = await bundle('production', '../routes/console/billing.vm.ts');
    expect(code).toContain('Plan economics');
    for (const s of ['MRR · sample', 'Plan economics · sample figures', '+$695 this week', '$18,516', '$67,500'])
      expect(code, s).not.toContain(s);
  }, 60_000);

  it('the http build has none of it', async () => {
    const code = await bundle('production');
    expect(code).toContain('/api/console/audit');
    expect(code).toContain('/api/console/roles/preview');
    expect(code).toContain('/api/console/staff/preview');
    // D-164: the http client asks the API for Billing's preview and execute.
    expect(code).toContain('/api/console/billing/');
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

/**
 * D-162 3b: the fixture's simulated masquerade session (`masquerade-fixture.ts`: its storage key, its
 * `?masquerade=` switch, the mockup's demo session and its write block) is loaded by `masquerade.ts`
 * behind the same constant, so the http build can never fake a session.
 */
const MASQUERADE_SENTINELS = ['ai-lms-masquerade', 'mq_fixture', 'Customer reports Week 2 steps are out of order', 'createMasqueradeFixture'];

describe('the simulated masquerade is not in the http build (D-162 3b)', () => {
  it('the http build of the masquerade client has none of it, and talks to the API', async () => {
    const code = await bundle('production', './masquerade.ts');
    expect(code).toContain('/api/console/masquerade/current');
    for (const s of MASQUERADE_SENTINELS) expect(code, s).not.toContain(s);
  }, 60_000);

  it('the fixture build has it, so the check above can fail', async () => {
    const code = await bundle('fixture', './masquerade.ts');
    for (const s of MASQUERADE_SENTINELS) expect(code, s).toContain(s);
  }, 60_000);
});

/**
 * D-165: API & Webhooks' and Scheduled Jobs' mockup records (`ENDPOINTS`, `HOOKS`, `JOBS` in
 * `parity-r2.ts`, shaped by `console-fixture-ops.ts`) are fixture-build only, and the screens'
 * production view-model holds none of their figures (spec § 13).
 */
const OPS_SENTINELS = ['ord_2291', 'evt_1QxN1hHm79', 'Handler timeout after 10 s', 'u_1077', 'Daily 9:00 AM'];

describe('the ops fixture is not in the http build (D-165)', () => {
  it('the http build has none of it', async () => {
    const code = await bundle('production');
    expect(code).toContain('/api/console/jobs');
    for (const s of OPS_SENTINELS) expect(code, s).not.toContain(s);
  }, 60_000);

  it('the fixture build has it, so the check above can fail', async () => {
    const code = await bundle('fixture');
    for (const s of OPS_SENTINELS) expect(code, s).toContain(s);
  }, 60_000);

  it('the screens’ production view-model has no sample figure', async () => {
    const code = await bundle('production', '../routes/console/ops.vm.ts');
    expect(code).toContain('Failed deliveries');
    for (const s of ['76,320', '41,208', '212 ms', '3 GHL, 1 Stripe', 'Every 5 min']) expect(code, s).not.toContain(s);
  }, 60_000);
});
