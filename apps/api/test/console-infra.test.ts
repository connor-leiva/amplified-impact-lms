// The Console's Operations pages, PR 9 (D-168, spec §§ 7.11-7.13, 11): the flag and its flip, 3a's
// masquerade seam reading it, env presence's fixed shape, the integration cards and Check now, the
// deploys and their optional tokens, and DB health's read-only transaction. Through the real router
// and a real Postgres; every outside call is a fake (no live call to Stripe, Resend, GitHub or Railway).
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asc, eq, sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import { MASQUERADE_PATHS, seedForDatabase } from '@ai/core';
import type { DbHealthView, DeploysView, IntegrationView, OpsEnv, ProbeResult } from '@ai/core';
import { build } from '../src/app';
import type { App } from '../src/app';
import { settleEmails } from '../src/auth';
import { consoleFlagOn, invalidateConsoleFlags } from '../src/console/flags';
import { masqueradeEnabled } from '../src/console/masquerade';
import { JOURNAL, mapMigrations, readDbHealth } from '../src/console/infra-db';
import { resetDeploysCache } from '../src/console/infra-deploys';
import { ghlErrorDetail, resetProbes } from '../src/console/infra-integrations';
import type { StripeScopes } from '../src/console/infra-integrations';
import { resetDbHealthCache } from '../src/console/infra-routes';
import type { InfraDeps } from '../src/console/infra-routes';
import type { Database } from '../src/db/client';
import { auditLog, consoleFlags, emailLog, stripeEvents, users } from '../src/db/schema';
import type { CrmSyncReport } from '../src/routes/crm-sync';
import { resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-12-10T16:30:00Z');
const MIN = 60_000;
const SHA = 'a3f91c2d0e4b5a6978877665544332211aabbccd';
let app: App;
const at = (t: number): void => void (process.env.FIXED_NOW = new Date(t).toISOString());
const db = () => testDatabase();
const audits = async () => (await db()).select().from(auditLog).orderBy(asc(auditLog.id));

/** A fake `fetch` that records every call and answers from `answer`. */
function fakeFetch(answer: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fn = async (url: string, init?: RequestInit): Promise<Response> => {
    calls.push({ url, init });
    return answer(url, init);
  };
  return { fn, calls };
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const refuse = () => {
  throw new Error('no network in this test');
};

async function open(ops: InfraDeps = {}): Promise<void> {
  await app?.close();
  app = await build({ logger: false, console: { infra: { env: {}, fetch: refuse, ...ops } } });
}
const as = async (userId: string) => ({ cookie: await app.signInAs(userId) });
const get = async (url: string, userId = 'st1') => app.inject({ method: 'GET', url, headers: await as(userId) });
const post = async (url: string, payload: unknown, userId = 'st1') =>
  app.inject({ method: 'POST', url, headers: { ...(await as(userId)), 'content-type': 'application/json' }, payload: payload as object });

beforeAll(async () => {
  await testDatabase();
});
beforeEach(async () => {
  at(NOW);
  await resetDatabase(seedForDatabase('live'));
  await (await db()).insert(users).values({ id: 'st_admin', email: 'dana@amplifiedimpact.com', name: 'Dana Reyes', kind: 'staff', staffRole: 'Admin' });
  invalidateConsoleFlags();
  resetProbes();
  resetDeploysCache();
  resetDbHealthCache();
  await open();
});
afterEach(async () => {
  await settleEmails();
  await app?.close();
});
afterAll(() => {
  delete process.env.FIXED_NOW;
});

// ================================================================================================

describe('masquerade_enabled (spec § 7.13, D8) @console', () => {
  const flip = (on: boolean, typed: unknown = 'masquerade_enabled', userId = 'st1') => post('/api/console/flags/masquerade_enabled', { on, typed }, userId);

  it('is on by default, and the migration seeds it on and sensitive', async () => {
    expect(await masqueradeEnabled()).toBe(true);
    const env = (await get('/api/console/env')).json() as OpsEnv;
    expect(env.flags[0]).toEqual({ key: 'masquerade_enabled', label: 'Staff can start masquerade sessions', on: true, source: 'console', sensitive: true, updatedAt: null, updatedBy: null });
    const { readFileSync } = await import('node:fs');
    const migration = readFileSync(new URL(`../drizzle/${JOURNAL.find((j) => j.tag.endsWith('_console_flags'))!.tag}.sql`, import.meta.url), 'utf8');
    expect(migration).toContain(`INSERT INTO "console_flags" ("key", "on", "sensitive", "updated_at", "updated_by") VALUES ('masquerade_enabled', true, true, NULL, NULL) ON CONFLICT ("key") DO NOTHING;`);
  });

  it('turns off for the Owner, typed: one audit row, and Start is then 403 masquerade_disabled', async () => {
    const res = await flip(false);
    expect(res.statusCode).toBe(200);
    expect(res.json().flag).toMatchObject({ key: 'masquerade_enabled', on: false, updatedAt: NOW, updatedBy: 'Casey Lin' });
    expect(await (await db()).select().from(consoleFlags)).toEqual([{ key: 'masquerade_enabled', on: false, sensitive: true, updatedAt: NOW, updatedBy: 'st1' }]);
    const rows = await audits();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      action: 'flag.flip',
      outcome: 'ok',
      actorUserId: 'st1',
      actorRole: 'Owner',
      targetType: 'flag',
      targetId: 'masquerade_enabled',
      before: { on: true },
      after: { on: false, sensitive: true },
    });
    // 3a's seam reads the flag, and the flip dropped the cache at once.
    expect(await masqueradeEnabled()).toBe(false);
    const start = await post(MASQUERADE_PATHS.start, { targetUserId: 'u_jamie', reason: 'Checking the Week 2 steps for a ticket.' }, 'st_admin');
    expect(start.statusCode).toBe(403);
    expect(start.json().code).toBe('masquerade_disabled');
    // And back on.
    expect((await flip(true)).json().flag.on).toBe(true);
    const again = await post(MASQUERADE_PATHS.start, { targetUserId: 'u_jamie', reason: 'Checking the Week 2 steps for a ticket.' }, 'st_admin');
    expect(again.statusCode).toBe(201);
  });

  it('needs the key typed exactly, and refuses an Admin (flags.write_sensitive), audited', async () => {
    for (const typed of [undefined, '', 'masquerade', 'MASQUERADE_ENABLED']) {
      const res = await post('/api/console/flags/masquerade_enabled', typed === undefined ? { on: false } : { on: false, typed });
      expect(res.statusCode, String(typed)).toBe(400);
      expect(res.json()).toEqual({ error: 'Type masquerade_enabled to confirm.', code: 'invalid_body' });
    }
    expect((await post('/api/console/flags/masquerade_enabled', { on: 'no', typed: 'masquerade_enabled' })).statusCode).toBe(400);
    expect(await audits()).toHaveLength(0);
    const admin = await flip(false, 'masquerade_enabled', 'st_admin');
    expect(admin.statusCode).toBe(403);
    expect(admin.json().code).toBe('console_forbidden');
    expect((await audits()).at(-1)).toMatchObject({ action: 'console.access_denied', actorUserId: 'st_admin', targetId: 'POST /api/console/flags/:key', after: { capability: 'flags.write_sensitive' } });
    expect(await (await db()).select().from(consoleFlags)).toEqual([]);
    expect(await masqueradeEnabled()).toBe(true);
  });

  it('writes nothing for a flip to the state it has, and knows only its own keys', async () => {
    const same = await flip(true);
    expect(same.statusCode).toBe(200);
    expect(same.json().flag.on).toBe(true);
    expect(await audits()).toHaveLength(0);
    const other = await post('/api/console/flags/maintenance_mode', { on: true, typed: 'maintenance_mode' });
    expect(other.statusCode).toBe(404);
    expect(other.json().code).toBe('not_found');
  });

  it('caches for 30 seconds, and a read that fails answers off', async () => {
    expect(await consoleFlagOn('masquerade_enabled')).toBe(true);
    // Another replica's flip, straight into the table: this process sees it within 30 seconds.
    await (await db()).insert(consoleFlags).values({ key: 'masquerade_enabled', on: false, sensitive: true, updatedAt: NOW, updatedBy: 'st1' });
    expect(await consoleFlagOn('masquerade_enabled')).toBe(true);
    at(NOW + 31_000);
    expect(await consoleFlagOn('masquerade_enabled')).toBe(false);
    invalidateConsoleFlags();
    const broken = { select: () => { throw new Error('connection lost'); } } as unknown as Database;
    expect(await consoleFlagOn('masquerade_enabled', broken)).toBe(false);
  });
});

// ================================================================================================

describe('env presence: booleans and modes only (spec § 7.13) @console', () => {
  it('answers the fixed shape, from the readers', async () => {
    await open({
      env: {
        NODE_ENV: 'production',
        STRIPE_SECRET_KEY: 'rk_live_ExampleOnly',
        RESEND_API_KEY: '   ',
        GHL_TOKEN: 'pit-example',
        GHL_SYNC_ENABLED: 'false',
        GHL_LOCATION_ID: 'loc-example',
        OFFER_OPEN: 'true',
        S3_BUCKET: 'skills',
        S3_ACCESS_KEY_ID: 'AKIAEXAMPLE',
        S3_SECRET_ACCESS_KEY: 'example',
        S3_ENDPOINT: 'https://storage.example',
        CONSOLE_GITHUB_TOKEN: 'ghp_example',
      },
    });
    const res = await get('/api/console/env');
    expect(res.statusCode).toBe(200);
    expect(res.headers['cache-control']).toBe('private, no-store');
    const body = res.json() as OpsEnv;
    expect(Object.keys(body).sort()).toEqual(['env', 'flags', 'modes']);
    expect(body.modes).toEqual({ environment: 'production', stripe: 'live', email: 'production', ghl: 'paused' });
    for (const e of body.env) expect(Object.keys(e).sort()).toEqual(['group', 'name', 'state']);
    expect(body.env.map((e) => [e.name, e.state])).toEqual([
      ['Stripe secret key', 'present'],
      ['Stripe webhook signing secret', 'not_configured'],
      ['Resend API key', 'not_configured'],
      ['GoHighLevel access token', 'present'],
      ['GoHighLevel location ID', 'present'],
      ['Google OAuth client secret', 'not_configured'],
      ['Session signing secret', 'not_configured'],
      ['Storage access key', 'present'],
      ['Console GitHub token', 'present'],
      ['Console Railway token', 'not_configured'],
    ]);
    expect(body.flags.map((f) => [f.key, f.source, f.on])).toEqual([
      ['masquerade_enabled', 'console', true],
      ['OFFER_OPEN', 'env', true],
      ['GHL_SYNC_ENABLED', 'env', false],
    ]);
    // Not one character of a value.
    for (const v of ['rk_live', 'ExampleOnly', 'pit-example', 'loc-example', 'AKIAEXAMPLE', 'ghp_example', 'storage.example']) expect(res.body).not.toContain(v);
  });
});

// ================================================================================================

const CRM: CrmSyncReport = {
  sync: 'on',
  fields: [],
  pipeline: false,
  stages: [],
  counts: { waitlist: { total: 0, synced: 0, waiting: 0, retrying: 0, gaveUp: 0 }, order: { total: 0, synced: 0, waiting: 0, retrying: 0, gaveUp: 0 }, login: { total: 0, synced: 0, waiting: 0, retrying: 0, gaveUp: 0 } },
  problems: [{ kind: 'order', id: 'o1', email: 'ana@example.com', state: 'retrying', attempts: 2, lastAttemptAt: NOW - 20 * MIN, nextAttemptAt: null, syncedAt: null, error: 'upsert:unauthorized:401' }],
  recent: [{ kind: 'login', id: 'u1', email: 'bo@example.com', state: 'synced', attempts: 0, lastAttemptAt: null, nextAttemptAt: null, syncedAt: NOW - 12 * 60 * MIN, error: null }],
};

describe('integrations (spec § 7.13) @console', () => {
  it('answers each card from its reader and its table', async () => {
    await open({
      env: { STRIPE_SECRET_KEY: 'rk_test_x', STRIPE_WEBHOOK_SECRET: 'whsec_x', GHL_TOKEN: 't', GHL_LOCATION_ID: 'l', RESEND_API_KEY: 're_x', NODE_ENV: 'production' },
      crm: async () => CRM,
    });
    const d = await db();
    // D-166's email log: Resend's last send and its last refusal; the outbox's rows don't count.
    await d.insert(emailLog).values([
      { at: NOW - 30 * MIN, to: 'a@example.com', userId: null, template: 'sign-in', subject: 'Your sign-in link', provider: 'resend', providerId: 'msg_1', status: 'sent', errorKind: null },
      { at: NOW - 90 * MIN, to: 'b@example.com', userId: null, template: 'sign-in', subject: 'Your sign-in link', provider: 'resend', providerId: null, status: 'failed', errorKind: 'provider' },
      { at: NOW - 5 * MIN, to: 'c@example.com', userId: null, template: 'sign-in', subject: 'Your sign-in link', provider: 'outbox', providerId: null, status: 'failed', errorKind: 'render' },
    ]);
    await d.insert(stripeEvents).values([
      { id: 'evt_1', type: 'invoice.paid', receivedAt: NOW - 50 * MIN, processedAt: NOW - 49 * MIN, error: null },
      { id: 'evt_2', type: 'invoice.paid', receivedAt: NOW - 40 * MIN, processedAt: null, error: 'StripeCardError:card_declined' },
    ]);
    const res = await get('/api/console/integrations');
    expect(res.statusCode).toBe(200);
    const list = res.json().integrations as IntegrationView[];
    expect(list.map((i) => [i.id, i.state])).toEqual([
      ['stripe', 'degraded'],
      ['ghl', 'degraded'],
      ['zoom', 'not_configured'],
      ['google', 'not_configured'],
      ['resend', 'connected'],
      ['storage', 'not_configured'],
      ['ga4', 'www_only'],
      ['meta', 'www_only'],
    ]);
    const card = (id: string) => list.find((i) => i.id === id)!;
    expect(card('stripe')).toMatchObject({
      mode: 'test',
      lastSuccess: { at: NOW - 49 * MIN, detail: null },
      lastError: { at: NOW - 40 * MIN, detail: 'StripeCardError:card_declined' },
      source: 'stripe_events',
      secrets: [{ label: 'Secret key', state: 'present' }, { label: 'Webhook signing secret', state: 'present' }],
      probe: true,
    });
    expect(card('ghl')).toMatchObject({ mode: 'on', lastSuccess: { at: NOW - 720 * MIN }, lastError: { at: NOW - 20 * MIN, detail: '401 Unauthorized' }, probe: false });
    expect(res.body).not.toContain('ana@example.com');
    expect(card('resend')).toMatchObject({
      mode: 'production',
      lastSuccess: { at: NOW - 30 * MIN, detail: null },
      lastError: { at: NOW - 90 * MIN, detail: 'Resend refused it' },
      source: 'email_log',
      secrets: [{ label: 'API key', state: 'present' }],
      probe: true,
    });
    expect(res.body).not.toContain('a@example.com');
    expect(card('zoom')).toMatchObject({ secrets: [], lastSuccess: 'unavailable' });
    expect(card('ga4')).toMatchObject({ publicId: 'G-TSQ5YB5BCP', name: 'GA4', use: 'Analytics on www only' });
    expect(card('meta')).toMatchObject({ publicId: '1835170747490806' });
    expect(ghlErrorDetail('tags:timeout:')).toBe('timeout');
  });

  it('Check now asks Resend one read, with the key in the header only, and audits the outcome', async () => {
    const resend = fakeFetch((url) => (url === 'https://api.resend.com/domains' ? json({ name: 'restricted_api_key', message: 'This API key is restricted to only send emails' }, 401) : json({}, 500)));
    await open({ env: { RESEND_API_KEY: 're_ExampleKey' }, fetch: resend.fn });
    const res = await post('/api/console/integrations/resend/check', {});
    expect(res.statusCode).toBe(200);
    expect(res.json().result).toEqual({ id: 'resend', outcome: 'ok', at: NOW, status: null, missing: [] } satisfies ProbeResult);
    expect(resend.calls).toHaveLength(1);
    expect(resend.calls[0]!.init?.method).toBe('GET');
    expect((resend.calls[0]!.init?.headers as Record<string, string>).authorization).toBe('Bearer re_ExampleKey');
    expect(res.body).not.toContain('re_ExampleKey');
    expect(res.body).not.toContain('restricted to only send');
    expect((await audits()).at(-1)).toMatchObject({ action: 'integration.probe', outcome: 'ok', targetId: 'resend', after: { outcome: 'ok', status: null, missing: [] } });
    // Reused for 10 seconds, across callers.
    await post('/api/console/integrations/resend/check', {}, 'st_admin');
    expect(resend.calls).toHaveLength(1);
  });

  it('Check now reports a refused key, no answer, and no key, never the provider’s words', async () => {
    const cases: [Response | 'throw' | null, string, number | null][] = [
      [json({ name: 'validation_error', message: 'API key is invalid: re_ExampleKey' }, 401), 'refused', 401],
      [json({}, 429), 'rate_limited', 429],
      [json({}, 502), 'failed', 502],
      ['throw', 'unreachable', null],
      [null, 'not_configured', null],
    ];
    for (const [answer, outcome, status] of cases) {
      resetProbes();
      const f = fakeFetch(() => {
        if (answer === 'throw') throw new Error('getaddrinfo ENOTFOUND re_ExampleKey');
        return answer!;
      });
      await open({ env: answer === null ? {} : { RESEND_API_KEY: 're_ExampleKey' }, fetch: f.fn });
      const res = await post('/api/console/integrations/resend/check', {});
      expect(res.json().result, outcome).toMatchObject({ outcome, status });
      expect(res.body).not.toContain('re_ExampleKey');
      expect((await audits()).at(-1)).toMatchObject({ action: 'integration.probe', outcome: 'failed' });
    }
  });

  it('Check now for Stripe is Billing’s scope probe; GoHighLevel has none', async () => {
    let scopes: StripeScopes = { Subscriptions: true, Invoices: true, Charges: true, Refunds: true, Customers: true };
    await open({ env: { STRIPE_SECRET_KEY: 'rk_live_x' }, stripeScopes: async () => scopes });
    expect((await post('/api/console/integrations/stripe/check', {})).json().result).toMatchObject({ outcome: 'ok' });
    resetProbes();
    scopes = { ...scopes, Invoices: false, Refunds: false };
    expect((await post('/api/console/integrations/stripe/check', {})).json().result).toMatchObject({ outcome: 'scope_missing', missing: ['Invoices', 'Refunds'] });
    resetProbes();
    scopes = { ...scopes, Invoices: true, Refunds: null };
    expect((await post('/api/console/integrations/stripe/check', {})).json().result).toMatchObject({ outcome: 'failed' });
    const ghl = await post('/api/console/integrations/ghl/check', {});
    expect(ghl.statusCode).toBe(404);
    expect(ghl.json()).toEqual({ error: 'Check now is for Stripe and Resend only.', code: 'not_found' });
  });

  it('Check now is 5 a minute per session', async () => {
    await open({ env: {} });
    const cookie = (await as('st1')).cookie;
    const codes: number[] = [];
    for (let i = 0; i < 6; i++) {
      codes.push((await app.inject({ method: 'POST', url: '/api/console/integrations/stripe/check', headers: { cookie, 'content-type': 'application/json' }, payload: {} })).statusCode);
    }
    expect(codes).toEqual([200, 200, 200, 200, 200, 429]);
  });
});

// ================================================================================================

const COMMITS = [
  { sha: SHA, commit: { message: 'Scope 16px floor and 44px targets to phone widths\n\nBody text', author: { name: 'Connor Leiva', date: '2026-12-10T05:42:00Z' }, committer: { date: '2026-12-10T05:42:00Z' } } },
  { sha: '7be20d4aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', commit: { message: 'Curriculum: fitted grid', author: { name: 'Avery Stone', date: '2026-12-09T22:15:00Z' }, committer: { date: '2026-12-09T22:15:00Z' } } },
];
const DEPLOYMENTS = {
  data: {
    deployments: {
      edges: [
        { node: { status: 'SUCCESS', createdAt: '2026-12-10T05:44:00Z', meta: { commitHash: SHA, commitMessage: 'Scope 16px floor', commitAuthor: 'Connor Leiva' } } },
        { node: { status: 'FAILED', createdAt: '2026-12-08T18:20:00Z', meta: { commitHash: '19aa6f3bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', commitMessage: 'Sidebar', commitAuthor: 'Avery Stone' } } },
        { node: { status: 'REMOVED', createdAt: '2026-12-02T16:48:00Z', meta: { commitHash: 'e5527b9ccccccccccccccccccccccccccccccccc', commitMessage: 'Cohort starts at first build', commitAuthor: 'Connor Leiva' } } },
      ],
    },
  },
};

describe('deploys (spec § 7.11) @console', () => {
  it('names the repository, branch and service `.railway/railway.ts` builds', async () => {
    const { readFileSync } = await import('node:fs');
    const { DEPLOY_FACTS } = await import('@ai/core');
    const railway = readFileSync(new URL('../../../.railway/railway.ts', import.meta.url), 'utf8');
    expect(railway).toContain(`const REPO = '${DEPLOY_FACTS.owner}/${DEPLOY_FACTS.repository}';`);
    expect(railway).toContain(`service('${DEPLOY_FACTS.service}', {`);
    expect(railway).toContain(`source: github(REPO, { branch: '${DEPLOY_FACTS.branch}' }),`);
  });

  it('shows the live commit, and "Not configured" with neither token', async () => {
    await open({ env: { RAILWAY_GIT_COMMIT_SHA: SHA, NODE_ENV: 'production' } });
    const res = await get('/api/console/deploys');
    expect(res.json()).toEqual({ repository: 'amplified-impact-lms', branch: 'main', service: 'web', environment: 'production', liveCommit: SHA, history: { state: 'not_configured' } } satisfies DeploysView);
  });

  it('lists the commits on main with a GitHub token, cached for 5 minutes', async () => {
    const gh = fakeFetch(() => json(COMMITS));
    await open({ env: { RAILWAY_GIT_COMMIT_SHA: SHA, CONSOLE_GITHUB_TOKEN: 'ghp_ExampleToken' }, fetch: gh.fn });
    const view = (await get('/api/console/deploys')).json() as DeploysView;
    expect(gh.calls[0]!.url).toBe('https://api.github.com/repos/connor-leiva/amplified-impact-lms/commits?sha=main&per_page=10');
    expect((gh.calls[0]!.init?.headers as Record<string, string>).authorization).toBe('Bearer ghp_ExampleToken');
    expect(view.history).toEqual({
      state: 'ok',
      source: 'github',
      asOf: NOW,
      rows: [
        { sha: SHA, message: 'Scope 16px floor and 44px targets to phone widths', status: 'live', buildMs: null, author: 'Connor Leiva', at: Date.parse('2026-12-10T05:42:00Z') },
        { sha: '7be20d4aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', message: 'Curriculum: fitted grid', status: null, buildMs: null, author: 'Avery Stone', at: Date.parse('2026-12-09T22:15:00Z') },
      ],
    });
    at(NOW + 4 * MIN);
    await get('/api/console/deploys');
    expect(gh.calls).toHaveLength(1);
    at(NOW + 6 * MIN);
    await get('/api/console/deploys');
    expect(gh.calls).toHaveLength(2);
  });

  it('lists Railway’s deployments with a Railway token (one `deployments` query), falling back to GitHub', async () => {
    const both = fakeFetch((url) => (url.startsWith('https://backboard.railway.com') ? json(DEPLOYMENTS) : json(COMMITS)));
    const env = { RAILWAY_GIT_COMMIT_SHA: SHA, CONSOLE_RAILWAY_TOKEN: 'rw_ExampleToken', CONSOLE_GITHUB_TOKEN: 'ghp_ExampleToken', RAILWAY_PROJECT_ID: 'p1', RAILWAY_ENVIRONMENT_ID: 'e1', RAILWAY_SERVICE_ID: 's1' };
    await open({ env, fetch: both.fn });
    const view = (await get('/api/console/deploys')).json() as DeploysView;
    expect(both.calls).toHaveLength(1);
    const sent = JSON.parse(String(both.calls[0]!.init?.body)) as { query: string; variables: unknown };
    expect(sent.query).toMatch(/^query Deploys\(\$input: DeploymentListInput!, \$first: Int\) \{ deployments\(/);
    expect(sent.query).not.toMatch(/variables/i);
    expect(sent.variables).toEqual({ input: { projectId: 'p1', environmentId: 'e1', serviceId: 's1' }, first: 10 });
    expect(view.history).toMatchObject({ state: 'ok', source: 'railway' });
    expect((view.history as { rows: { status: string }[] }).rows.map((r) => r.status)).toEqual(['live', 'failed', 'removed']);
    // Railway refuses: GitHub's commits instead; both refuse: unavailable, in no one's words.
    resetDeploysCache();
    const half = fakeFetch((url) => (url.startsWith('https://backboard.railway.com') ? json({ errors: [{ message: 'Not Authorized rw_ExampleToken' }] }) : json(COMMITS)));
    await open({ env, fetch: half.fn });
    expect(((await get('/api/console/deploys')).json() as DeploysView).history).toMatchObject({ state: 'ok', source: 'github' });
    resetDeploysCache();
    const none = fakeFetch(() => json({ message: 'Bad credentials ghp_ExampleToken' }, 401));
    await open({ env, fetch: none.fn });
    const res = await get('/api/console/deploys');
    expect((res.json() as DeploysView).history).toEqual({ state: 'unavailable', source: 'railway' });
    expect(res.body).not.toMatch(/ExampleToken|Bad credentials|Not Authorized/);
  });
});

// ================================================================================================

describe('DB health (spec § 7.12) @console', () => {
  it('reads connections, size, the largest tables and the migrations, cached for 60 seconds', async () => {
    const res = await get('/api/console/db');
    expect(res.statusCode).toBe(200);
    const view = res.json() as DbHealthView;
    expect(view.asOf).toBe(NOW);
    expect(view.connections.used).toBeGreaterThan(0);
    expect(view.connections.max).toBeGreaterThanOrEqual(view.connections.used);
    expect(view.sizeBytes).toBeGreaterThan(0);
    expect(view.tables.length).toBeGreaterThan(0);
    expect(view.tables.length).toBeLessThanOrEqual(10);
    expect(view.tables.map((t) => t.name)).toContain('users');
    expect(view.migrations.applied[0]).toEqual({ tag: JOURNAL.at(-1)!.tag, at: JOURNAL.at(-1)!.when });
    expect(view.migrations.applied).toHaveLength(JOURNAL.length);
    expect(view.migrations.pending).toEqual([]);
    expect(view.slow).toEqual({ available: false });
    at(NOW + 30_000);
    expect(((await get('/api/console/db')).json() as DbHealthView).asOf).toBe(NOW);
    at(NOW + 61_000);
    expect(((await get('/api/console/db')).json() as DbHealthView).asOf).toBe(NOW + 61_000);
  });

  it('runs every query read-only with a two-second limit, and never enables pg_stat_statements', async () => {
    const statements: string[] = [];
    const dialect = new PgDialect();
    const longQuery = `SELECT ${'o.id, '.repeat(120)}1 FROM orders o WHERE o.ghl_synced_at IS NULL`;
    const answer = (text: string): Record<string, unknown>[] => {
      if (text.includes('pg_stat_activity')) return [{ used: 14, max: 100 }];
      if (text.includes('pg_database_size')) return [{ bytes: '1932735283' }];
      if (text.includes('pg_total_relation_size')) return [{ name: 'activity', bytes: '432013312', rows: '2100000' }];
      if (text.includes('to_regclass')) return [{ present: true }];
      if (text.includes('__drizzle_migrations')) return [{ created_at: String(JOURNAL[0]!.when) }];
      if (text.includes('pg_extension')) return [{ present: true }];
      if (text.includes('count(*)::int as n from pg_stat_statements')) return [{ n: 3 }];
      if (text.includes('from pg_stat_statements')) return [{ query: longQuery, calls: '96', mean: 1940.2 }];
      return [];
    };
    const tx = {
      execute: async (q: SQL) => {
        const text = dialect.sqlToQuery(q).sql;
        statements.push(text);
        return answer(text);
      },
      transaction: async <T>(fn: (sp: unknown) => Promise<T>) => {
        statements.push('SAVEPOINT');
        return fn(tx);
      },
    };
    const fake = { transaction: async <T>(fn: (t: unknown) => Promise<T>) => fn(tx) } as unknown as Database;
    const view = await readDbHealth(fake, NOW);
    expect(statements.slice(0, 2)).toEqual(['SET TRANSACTION READ ONLY', 'SET LOCAL statement_timeout = 2000']);
    for (const s of statements) expect(s, s).not.toMatch(/\b(create|alter|insert|update|delete|drop|load)\b/i);
    expect(statements).toContain('SAVEPOINT');
    expect(view.slow).toMatchObject({ available: true, windowHours: null, over500: 3, rows: [{ meanMs: 1940.2, calls: 96 }] });
    expect((view.slow as { rows: { query: string }[] }).rows[0]!.query).toHaveLength(400);
    expect(view.migrations).toEqual({ applied: [{ tag: JOURNAL[0]!.tag, at: JOURNAL[0]!.when }], pending: JOURNAL.slice(1).map((j) => j.tag) });
    expect(view.tables).toEqual([{ name: 'activity', bytes: 432013312, rows: 2100000 }]);

    // An extension that exists but can't be read costs only its own card.
    const failing = { ...tx, transaction: async () => Promise.reject(new Error('pg_stat_statements must be loaded via shared_preload_libraries')) };
    const view2 = await readDbHealth({ transaction: async <T>(fn: (t: unknown) => Promise<T>) => fn(failing) } as unknown as Database, NOW);
    expect(view2.slow).toEqual({ available: false });
  });

  it('is a transaction Postgres itself keeps read-only', async () => {
    const d = await db();
    await expect(
      d.transaction(async (tx) => {
        await tx.execute(sql.raw('SET TRANSACTION READ ONLY'));
        await tx.insert(consoleFlags).values({ key: 'masquerade_enabled', on: false, sensitive: true });
      }),
    ).rejects.toThrow();
    expect(await d.select().from(consoleFlags).where(eq(consoleFlags.key, 'masquerade_enabled'))).toEqual([]);
  });

  it('maps applied migrations to the journal by their `when`, newest first', () => {
    const entries = [
      { tag: '0001_a', when: 10 },
      { tag: '0002_b', when: 20 },
      { tag: '0003_c', when: 30 },
    ];
    expect(mapMigrations([10, 20], entries)).toEqual({ applied: [{ tag: '0002_b', at: 20 }, { tag: '0001_a', at: 10 }], pending: ['0003_c'] });
    expect(mapMigrations([99], entries).applied).toEqual([{ tag: 'Unknown migration', at: 99 }]);
  });
});
