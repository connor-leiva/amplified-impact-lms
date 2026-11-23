// The CRM sync log (D-134), against a real Postgres: what /api/admin/crm-sync reports, who may read
// it, and the retry for a row that gave up.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { seedForDatabase } from '@ai/core';
import { build } from '../src/app';
import type { App } from '../src/app';
import { ai101Waitlist, ghlLogins, orders, users } from '../src/db/schema';
import { readGhlConfig, syncStamp } from '../src/integrations/ghl';
import { MAX_ATTEMPTS } from '../src/jobs/ghl-sync';
import { resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-12-07T16:00:00Z');
const ENV = { GHL_TOKEN: 'pit-test-token-123', GHL_LOCATION_ID: 'loc-abc', GHL_FIELD_OFFER: 'f-offer-id', GHL_PIPELINE_ID: 'p-id', GHL_STAGE_PURCHASED: 's-buy-id' };
const STAMP = syncStamp(readGhlConfig(ENV)!);

let app: App;
const saved: Record<string, string | undefined> = {};

beforeAll(async () => {
  await testDatabase();
});
beforeEach(async () => {
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  for (const [k, v] of Object.entries(ENV)) {
    saved[k] = process.env[k];
    process.env[k] = v;
  }
  await resetDatabase(seedForDatabase('live'));
  const db = await testDatabase();
  await db.insert(ai101Waitlist).values([
    { id: 'wl-synced', firstName: 'Sy', email: 'synced@example.com', source: 'voice-profile', createdAt: NOW - 9000, ghlSyncedAt: NOW - 8000, ghlSyncStamp: STAMP, ghlAttempts: 1, ghlLastAttemptAt: NOW - 8000 },
    { id: 'wl-old', firstName: 'Ol', email: 'old@example.com', source: 'voice-profile', createdAt: NOW - 9000, ghlSyncedAt: NOW - 8000, ghlAttempts: 1 },
    { id: 'wl-new', firstName: 'Ne', email: 'new@example.com', source: 'voice-profile', createdAt: NOW - 100 },
  ]);
  await db.insert(orders).values([
    { id: 'o-retry', plan: 'cohort', option: 'full', origin: 'payment_link', status: 'paid', email: 'retry@example.com', createdAt: NOW - 5000, ghlSyncedAt: NOW - 4000, ghlContactId: 'c-1', ghlAttempts: 2, ghlError: 'fields:rejected:422', ghlNextAttemptAt: NOW + 60_000, ghlLastAttemptAt: NOW - 4000 },
    { id: 'o-gone', plan: 'membership', option: 'monthly', origin: 'payment_link', status: 'paid', email: 'gone@example.com', createdAt: NOW - 6000, ghlAttempts: MAX_ATTEMPTS, ghlError: 'upsert:rejected:400', ghlLastAttemptAt: NOW - 3000 },
    { id: 'o-pending', plan: 'cohort', option: 'full', origin: 'payment_link', status: 'pending', email: 'pending@example.com', createdAt: NOW - 100 },
  ]);
  await db.insert(ghlLogins).values({ userId: 'u_jamie', firstLoginAt: NOW - 7000, ghlSyncedAt: NOW - 6500, ghlSyncStamp: STAMP, ghlAttempts: 1, ghlLastAttemptAt: NOW - 6500 });
  app = await build({ logger: false });
});
afterEach(async () => {
  await app?.close();
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  delete process.env.GHL_SYNC_ENABLED;
});
afterAll(() => {
  delete process.env.FIXED_NOW;
});

const get = (cookie: string) => app.inject({ method: 'GET', url: '/api/admin/crm-sync', headers: { cookie } });
const retry = (cookie: string, payload: unknown) =>
  app.inject({ method: 'POST', url: '/api/admin/crm-sync/retry', headers: { cookie, 'content-type': 'application/json' }, payload: payload as object });

describe('the CRM sync log @g9', () => {
  it('counts each kind by state, and lists every row that needs a look', async () => {
    const res = await get(await app.signInAs('st1'));
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toMatchObject({ sync: 'on', fields: ['offer'], pipeline: true, stages: ['purchased'] });
    expect(body.counts).toEqual({
      // One synced by today's stamp, one synced before it (waiting for its re-sync), one never synced.
      waitlist: { total: 3, synced: 1, waiting: 2, retrying: 0, gaveUp: 0 },
      // The pending order is not part of the log: it is never copied.
      order: { total: 2, synced: 0, waiting: 0, retrying: 1, gaveUp: 1 },
      login: { total: 1, synced: 1, waiting: 0, retrying: 0, gaveUp: 0 },
      skill: { total: 0, synced: 0, waiting: 0, retrying: 0, gaveUp: 0 },
    });
    expect(body.problems.map((r: { id: string; state: string; error: string }) => [r.id, r.state, r.error])).toEqual([
      ['o-gone', 'gave-up', 'upsert:rejected:400'],
      ['o-retry', 'retrying', 'fields:rejected:422'],
    ]);
    expect(body.recent[0]).toMatchObject({ kind: 'waitlist', id: 'wl-new', email: 'new@example.com', state: 'waiting' });
    expect(body.recent.find((r: { kind: string }) => r.kind === 'login')).toMatchObject({ id: 'u_jamie', email: 'jamie@ortizhomes.com', state: 'synced' });
    // Names of what is set, never the ids or the token.
    for (const secret of ['pit-test-token-123', 'loc-abc', 'f-offer-id', 'p-id', 's-buy-id']) expect(res.body).not.toContain(secret);
  });

  it('says when the loop is paused, and when GHL is not configured at all', async () => {
    process.env.GHL_SYNC_ENABLED = 'false';
    expect((await get(await app.signInAs('st1'))).json().sync).toBe('paused');
    delete process.env.GHL_TOKEN;
    const off = (await get(await app.signInAs('st1'))).json();
    expect(off).toMatchObject({ sync: 'off', fields: [], pipeline: false, stages: [] });
    // With no stamp to compare, any completed sync counts as synced.
    expect(off.counts.waitlist).toMatchObject({ synced: 2, waiting: 1 });
  });

  it('is for the Owner and Admins: other staff and learners are refused', async () => {
    const db = await testDatabase();
    expect((await get(await app.signInAs('st2'))).statusCode).toBe(403); // Instructor
    expect((await get(await app.signInAs('st4'))).statusCode).toBe(403); // Support
    expect((await get(await app.signInAs('u_jamie'))).statusCode).toBe(403);
    await db.update(users).set({ staffRole: 'Admin' }).where(eq(users.id, 'st2'));
    expect((await get(await app.signInAs('st2'))).statusCode).toBe(200);
    expect((await retry(await app.signInAs('st4'), { kind: 'order', id: 'o-gone' })).statusCode).toBe(403);
  });

  it('retries a row that gave up: attempts back to 0 and its lock cleared, so the next tick takes it', async () => {
    const owner = await app.signInAs('st1');
    expect((await retry(owner, { kind: 'order', id: 'o-gone' })).json()).toEqual({ ok: true });
    const [row] = await (await testDatabase()).select().from(orders).where(eq(orders.id, 'o-gone'));
    expect(row).toMatchObject({ ghlAttempts: 0, ghlNextAttemptAt: null, ghlError: 'upsert:rejected:400' });
    expect((await get(owner)).json().counts.order).toMatchObject({ retrying: 2, gaveUp: 0 });
    // A login row by its user id.
    expect((await retry(owner, { kind: 'login', id: 'u_jamie' })).statusCode).toBe(200);
  });

  it('refuses a retry that does not say which row, or names none', async () => {
    const owner = await app.signInAs('st1');
    expect((await retry(owner, { kind: 'contact', id: 'o-gone' })).statusCode).toBe(400);
    expect((await retry(owner, { kind: 'order' })).statusCode).toBe(400);
    expect((await retry(owner, { kind: 'order', id: 'o-nope' })).statusCode).toBe(404);
  });
});

describe('the retry’s same-origin check @g9', () => {
  it('refuses a retry posted from another site', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/crm-sync/retry',
      headers: { cookie: await app.signInAs('st1'), 'content-type': 'application/json', origin: 'https://evil.example' },
      payload: { kind: 'order', id: 'o-gone' },
    });
    expect(res.statusCode).toBe(403);
    const [row] = await (await testDatabase()).select().from(orders).where(eq(orders.id, 'o-gone'));
    expect(row!.ghlAttempts).toBe(MAX_ATTEMPTS);
  });
});
