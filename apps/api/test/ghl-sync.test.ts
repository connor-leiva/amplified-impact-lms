// The GoHighLevel sync job (D-033), against a real Postgres and a fake GHL.
//
// What is under test is the bookkeeping: which rows a tick claims, what it writes back, how it backs
// off, when it gives up, how a systemic failure is kept from using up the list's retries, and that
// nothing it logs carries a visitor's name or address. The HTTP shape is integrations/ghl.test.ts's.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { seedForDatabase } from '@ai/core';
import { build } from '../src/app';
import { settleEmails } from '../src/auth';
import { outbox, resetOutbox } from '../src/email/transport';
import { ai101Waitlist, authSessions, ghlLogins, orders, users } from '../src/db/schema';
import { BACKOFF_MS, LEASE_MS, MAX_ATTEMPTS, SYSTEMIC_PAUSE_MS, UNAUTHORIZED_PAUSE_MS, claimDueRows, runGhlSync, runGhlTick, startGhlSync } from '../src/jobs/ghl-sync';
import { enqueueLogins, runGhlLoginSync } from '../src/jobs/ghl-logins';
import { fakeCrm } from './fake-ghl';
import type { GhlSyncLog } from '../src/jobs/ghl-sync';
import { syncStamp } from '../src/integrations/ghl';
import type { Fetch, GhlConfig } from '../src/integrations/ghl';
import { resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-10-08T15:00:00Z');
const config: GhlConfig = { token: 'pit-test-token-123', locationId: 'loc-abc' };
const setNow = (ms: number) => void (process.env.FIXED_NOW = new Date(ms).toISOString());

/** A waitlist row as the route would have stored it. */
const signUp = (id: string, email: string, createdAt: number, extra: Partial<typeof ai101Waitlist.$inferInsert> = {}) => ({
  id,
  firstName: `First${id}`,
  email,
  brokerage: null,
  source: 'expcon-2026-ai101',
  src: 'qr',
  createdAt,
  ...extra,
});

async function insert(...rows: ReturnType<typeof signUp>[]) {
  await (await testDatabase()).insert(ai101Waitlist).values(rows);
}
const row = async (id: string) => (await (await testDatabase()).select().from(ai101Waitlist).where(eq(ai101Waitlist.id, id)))[0]!;

/**
 * A fake GHL that answers per EMAIL: a status to fail the upsert with, or success. Records the order
 * the contacts arrived in.
 */
function fakeGhl(failFor: Record<string, number> = {}) {
  const order: string[] = [];
  const upserts: Record<string, Record<string, unknown>> = {};
  const tagsSent: string[][] = [];
  let n = 0;
  const fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    const body = JSON.parse(String(init?.body ?? '{}')) as { email?: string; tags?: string[] };
    if (u.endsWith('/contacts/upsert')) {
      order.push(body.email!);
      upserts[body.email!] = body;
      const status = failFor[body.email!];
      if (status) return new Response(JSON.stringify({ message: `bad ${body.email}` }), { status });
      return new Response(JSON.stringify({ new: true, contact: { id: `c-${++n}`, tags: [] } }), { status: 200 });
    }
    tagsSent.push(body.tags ?? []);
    return new Response(JSON.stringify({ tags: body.tags }), { status: 201 });
  }) as Fetch;
  return { fetch, order, upserts, tagsSent };
}

/** Collects every log line, so a test can assert none of them carries a visitor. */
function capture(): GhlSyncLog & { lines: string[] } {
  const lines: string[] = [];
  const push = (level: string) => (o: Record<string, unknown>, m: string) => void lines.push(`${level} ${m} ${JSON.stringify(o)}`);
  return { lines, info: push('info'), warn: push('warn'), error: push('error') };
}

beforeAll(async () => {
  setNow(NOW);
  await testDatabase();
});
afterAll(() => {
  delete process.env.FIXED_NOW;
});
beforeEach(async () => {
  setNow(NOW);
  await resetDatabase();
});

describe('the GHL sync job @g9', () => {
  it('does nothing at all when GHL is not configured', async () => {
    await insert(signUp('wl1', 'a@example.com', NOW - 1000));
    const run = await runGhlSync({ db: await testDatabase(), config: null, fetch: fakeGhl().fetch });
    expect(run).toMatchObject({ ran: false, claimed: 0 });
    expect(await row('wl1')).toMatchObject({ ghlSyncedAt: null, ghlAttempts: 0, ghlNextAttemptAt: null });
  });

  it('copies unsynced sign-ups into GHL and records each one — which is also the backfill', async () => {
    await insert(signUp('wl1', 'a@example.com', NOW - 2000), signUp('wl2', 'b@example.com', NOW - 1000));
    const ghl = fakeGhl();
    const run = await runGhlSync({ db: await testDatabase(), config, fetch: ghl.fetch, log: capture() });

    expect(run).toMatchObject({ ran: true, claimed: 2, synced: 2, created: 2, failed: 0 });
    expect(await row('wl1')).toMatchObject({ ghlSyncedAt: NOW, ghlContactId: 'c-1', ghlAttempts: 1, ghlError: null, ghlNextAttemptAt: null });
    expect(await row('wl2')).toMatchObject({ ghlSyncedAt: NOW, ghlContactId: 'c-2' });
  });

  it('goes oldest first, whatever order the ids sort in', async () => {
    // Ids are random, so this is the created_at sort, not an accident of the id.
    await insert(
      signUp('wl-z', 'third@example.com', NOW - 1000),
      signUp('wl-a', 'second@example.com', NOW - 2000),
      signUp('wl-m', 'first@example.com', NOW - 3000),
    );
    const ghl = fakeGhl();
    await runGhlSync({ db: await testDatabase(), config, fetch: ghl.fetch, log: capture() });
    expect(ghl.order).toEqual(['first@example.com', 'second@example.com', 'third@example.com']);
  });

  it('never sends a synced sign-up again', async () => {
    // Synced by TODAY's sync (D-134's stamp): nothing to send. See the stamp tests below for a stale one.
    await insert(signUp('wl1', 'a@example.com', NOW - 1000, { ghlSyncedAt: NOW - 500, ghlContactId: 'c-old', ghlAttempts: 1, ghlSyncStamp: syncStamp(config) }));
    const ghl = fakeGhl();
    const run = await runGhlSync({ db: await testDatabase(), config, fetch: ghl.fetch });
    expect(run.claimed).toBe(0);
    expect(ghl.order).toEqual([]);
  });

  it('backs off a contact GHL refused, and retries it only when the backoff is up', async () => {
    await insert(signUp('wl1', 'bad@example.com', NOW - 2000), signUp('wl2', 'ok@example.com', NOW - 1000));
    const db = await testDatabase();
    const run = await runGhlSync({ db, config, fetch: fakeGhl({ 'bad@example.com': 422 }).fetch, log: capture() });

    expect(run).toMatchObject({ claimed: 2, synced: 1, failed: 1, gaveUp: 0 });
    expect(await row('wl1')).toMatchObject({ ghlSyncedAt: null, ghlAttempts: 1, ghlError: 'upsert:rejected:422', ghlNextAttemptAt: NOW + BACKOFF_MS[0]! });
    expect(await row('wl2')).toMatchObject({ ghlSyncedAt: NOW });

    // Not before its time...
    setNow(NOW + BACKOFF_MS[0]! - 1);
    expect((await runGhlSync({ db, config, fetch: fakeGhl().fetch })).claimed).toBe(0);
    // ...and then once it is due, with a GHL that now accepts it.
    setNow(NOW + BACKOFF_MS[0]!);
    expect(await runGhlSync({ db, config, fetch: fakeGhl().fetch })).toMatchObject({ claimed: 1, synced: 1 });
    expect(await row('wl1')).toMatchObject({ ghlAttempts: 2, ghlError: null, ghlNextAttemptAt: null });
  });

  it('stops after the last attempt and leaves the row unsynced, with the reason', async () => {
    await insert(signUp('wl1', 'bad@example.com', NOW - 1000, { ghlAttempts: MAX_ATTEMPTS - 1 }));
    const db = await testDatabase();
    const log = capture();
    const run = await runGhlSync({ db, config, fetch: fakeGhl({ 'bad@example.com': 400 }).fetch, log });

    expect(run).toMatchObject({ failed: 1, gaveUp: 1 });
    expect(await row('wl1')).toMatchObject({ ghlSyncedAt: null, ghlAttempts: MAX_ATTEMPTS, ghlNextAttemptAt: null, ghlError: 'upsert:rejected:400' });
    expect(log.lines.some((l) => l.startsWith('error') && l.includes('last attempt'))).toBe(true);

    // Never claimed again, however much later it is.
    setNow(NOW + 365 * 24 * 3600_000);
    expect((await runGhlSync({ db, config, fetch: fakeGhl().fetch })).claimed).toBe(0);
  });

  it('pauses everyone on a rejected token, without spending anyone’s retries', async () => {
    // A revoked or wrong token is nothing to do with the rows. If each one burned an attempt, a bad
    // token for two days would give up on the whole list.
    await insert(
      signUp('wl1', 'a@example.com', NOW - 3000),
      signUp('wl2', 'b@example.com', NOW - 2000),
      signUp('wl3', 'c@example.com', NOW - 1000),
    );
    const db = await testDatabase();
    const log = capture();
    const unauthorized = (async () => new Response('{}', { status: 401 })) as Fetch;
    const run = await runGhlSync({ db, config, fetch: unauthorized, log });

    expect(run).toMatchObject({ claimed: 3, synced: 0, failed: 0, paused: { kind: 'unauthorized', status: 401, rowsDeferred: 3 } });
    for (const id of ['wl1', 'wl2', 'wl3'])
      expect(await row(id)).toMatchObject({ ghlAttempts: 0, ghlSyncedAt: null, ghlNextAttemptAt: NOW + UNAUTHORIZED_PAUSE_MS, ghlError: 'upsert:unauthorized:401' });
    expect(log.lines.some((l) => l.startsWith('error') && l.includes('GHL_TOKEN'))).toBe(true);

    // The token is fixed; the pause runs out; everyone goes through on their FIRST counted attempt.
    setNow(NOW + UNAUTHORIZED_PAUSE_MS);
    expect(await runGhlSync({ db, config, fetch: fakeGhl().fetch })).toMatchObject({ claimed: 3, synced: 3 });
    expect(await row('wl3')).toMatchObject({ ghlAttempts: 1, ghlError: null });
  });

  it('on an outage mid-batch, keeps what already synced and defers the rest', async () => {
    await insert(
      signUp('wl1', 'a@example.com', NOW - 3000),
      signUp('wl2', 'b@example.com', NOW - 2000),
      signUp('wl3', 'c@example.com', NOW - 1000),
    );
    const db = await testDatabase();
    const run = await runGhlSync({ db, config, fetch: fakeGhl({ 'b@example.com': 503 }).fetch, log: capture() });

    expect(run).toMatchObject({ claimed: 3, synced: 1, paused: { kind: 'server', rowsDeferred: 2 } });
    expect(await row('wl1')).toMatchObject({ ghlSyncedAt: NOW });
    for (const id of ['wl2', 'wl3'])
      expect(await row(id)).toMatchObject({ ghlSyncedAt: null, ghlAttempts: 0, ghlNextAttemptAt: NOW + SYSTEMIC_PAUSE_MS });
  });

  it('leases what it claims, so a crashed tick is retried and a concurrent one skips it', async () => {
    await insert(signUp('wl1', 'a@example.com', NOW - 1000));
    const db = await testDatabase();

    const first = await claimDueRows(db, NOW);
    expect(first.map((r) => r.id)).toEqual(['wl1']);
    expect(await row('wl1')).toMatchObject({ ghlAttempts: 1, ghlNextAttemptAt: NOW + LEASE_MS });

    // A second runner, or the next tick, before the lease is up: nothing to claim.
    expect(await claimDueRows(db, NOW + LEASE_MS - 1)).toEqual([]);
    // The claimer died without recording anything. Once the lease is up the row is due again.
    expect((await claimDueRows(db, NOW + LEASE_MS)).map((r) => r.id)).toEqual(['wl1']);
  });

  it('puts a number in the CRM only for the sign-ups that consented to texts (D-034)', async () => {
    await insert(
      signUp('wl1', 'yes@example.com', NOW - 2000, { phone: '+18605550001', smsConsent: true, smsConsentAt: NOW - 2000, smsConsentText: 'I agree to receive texts.' }),
      signUp('wl2', 'no@example.com', NOW - 1000, { phone: '+18605550002' }),
    );
    const ghl = fakeGhl();
    await runGhlSync({ db: await testDatabase(), config, fetch: ghl.fetch, log: capture() });

    expect(ghl.upserts['yes@example.com']!.phone).toBe('+18605550001');
    expect(ghl.upserts['no@example.com']).not.toHaveProperty('phone');
    expect(ghl.tagsSent[0]).toContain('sms-consent');
    expect(ghl.tagsSent[1]).not.toContain('sms-consent');
  });

  it("tags each row by its form: the kit's sign-ups get the kit's tag, never the waitlist's (D-038)", async () => {
    await insert(
      signUp('wl1', 'list@example.com', NOW - 2000),
      signUp('wl2', 'kit@example.com', NOW - 1000, { source: 'task-sync-starter', src: 'ig' }),
    );
    const ghl = fakeGhl();
    await runGhlSync({ db: await testDatabase(), config, fetch: ghl.fetch, log: capture() });
    expect(ghl.order).toEqual(['list@example.com', 'kit@example.com']);
    expect(ghl.tagsSent).toEqual([
      ['ai101-waitlist', 'event-expcon-2026', 'src-qr'],
      ['task-sync-starter', 'src-ig'],
    ]);
    expect((await row('wl2')).ghlSyncedAt).toBe(NOW);
  });

  it("tags a /retool row with its team size and the December box, read from the row (D-046)", async () => {
    // The claim's RETURNING carries both columns; without them every /retool contact would arrive
    // with no size tag and no December tag, and nothing would fail but marketing's filters.
    await insert(
      signUp('wl1', 'owner@example.com', NOW - 3000, { source: 'retool', src: 'ig', teamSize: '51+', decemberInterest: true }),
      signUp('wl2', 'small@example.com', NOW - 2000, { source: 'retool', src: null, teamSize: '1-10' }),
      signUp('wl3', 'list@example.com', NOW - 1000),
    );
    const ghl = fakeGhl();
    const run = await runGhlSync({ db: await testDatabase(), config, fetch: ghl.fetch, log: capture() });

    expect(run).toMatchObject({ claimed: 3, synced: 3, failed: 0 });
    expect(ghl.order).toEqual(['owner@example.com', 'small@example.com', 'list@example.com']);
    expect(ghl.tagsSent).toEqual([
      ['retool', 'src-ig', 'team-size-51-plus', 'december-interest'],
      ['retool', 'src-direct', 'team-size-1-10'],
      // A waitlist row has neither, so its tags are what they always were.
      ['ai101-waitlist', 'event-expcon-2026', 'src-qr'],
    ]);
    // Tags, never fields of the contact.
    for (const email of ['owner@example.com', 'small@example.com']) {
      expect(Object.keys(ghl.upserts[email]!).sort(), email).toEqual(['email', 'firstName', 'locationId']);
    }
    expect(await row('wl1')).toMatchObject({ ghlSyncedAt: NOW, ghlError: null });
  });

  it('refuses, in the database, SMS consent without its proof', async () => {
    // Consent needs the number, the time and the exact words, or the row is not written at all.
    const db = await testDatabase();
    for (const missing of [{ phone: null }, { smsConsentAt: null }, { smsConsentText: null }]) {
      await expect(
        db.insert(ai101Waitlist).values(
          signUp(`wlx${Object.keys(missing)[0]}`, `x-${Object.keys(missing)[0]}@example.com`, NOW, {
            phone: '+18605550003', smsConsent: true, smsConsentAt: NOW, smsConsentText: 'I agree.', ...missing,
          }),
        ),
      ).rejects.toThrow();
    }
    // Without consent, a number alone is fine.
    await expect(db.insert(ai101Waitlist).values(signUp('wlok', 'ok@example.com', NOW, { phone: '+18605550004' }))).resolves.toBeDefined();
  });

  it('claims at most a batch per tick', async () => {
    await insert(...Array.from({ length: 5 }, (_, i) => signUp(`wl${i}`, `p${i}@example.com`, NOW - 5000 + i)));
    expect(await claimDueRows(await testDatabase(), NOW, 3)).toHaveLength(3);
  });

  it('never logs a visitor’s name or address, on any path', async () => {
    await insert(
      signUp('wl1', 'refused@example.com', NOW - 3000, { firstName: 'Zelda', brokerage: 'Hyrule Realty', phone: '+18605559999', smsConsent: true, smsConsentAt: NOW, smsConsentText: 'I agree.' }),
      signUp('wl2', 'fine@example.com', NOW - 2000, { firstName: 'Link' }),
    );
    const db = await testDatabase();
    const log = capture();
    await runGhlSync({ db, config, fetch: fakeGhl({ 'refused@example.com': 422 }).fetch, log });
    setNow(NOW + 3600_000);
    await runGhlSync({ db, config, fetch: (async () => new Response('{}', { status: 401 })) as Fetch, log });

    expect(log.lines.length).toBeGreaterThan(0);
    for (const line of log.lines)
      for (const pii of ['refused@example.com', 'fine@example.com', 'Zelda', 'Link', 'Hyrule', 'pit-test-token-123', '8605559999']) expect(line).not.toContain(pii);
  });

  it('only arms the loop when there is a waitlist AND both variables', async () => {
    const log = capture();
    expect(startGhlSync({ waitlist: false, config, log, signals: [] }).running).toBe(false);
    expect(startGhlSync({ waitlist: true, config: null, log, signals: [] }).running).toBe(false);
    expect(log.lines.some((l) => l.includes('GHL_TOKEN and GHL_LOCATION_ID are not both set'))).toBe(true);

    const armed = startGhlSync({ waitlist: true, config, db: await testDatabase(), log, signals: [], intervalMs: 3_600_000 });
    expect(armed.running).toBe(true);
    await armed.stop();
    expect(armed.running).toBe(false);
  });
});

// --- D-134: the stamp, the extras, first sign-ins and the pause ---------------------------------------

const FIELDS = { offer: 'f-offer', cohort: 'f-cohort', amount: 'f-amount', purchaseDate: 'f-date', lmsLogin: 'f-login' };
const PIPELINE = { id: 'p1', stages: { lead: 's-lead', freeSkills: 's-free', checkoutStarted: 's-checkout', purchased: 's-buy', canceled: 's-gone', refunded: 's-gone' } };
const full: GhlConfig = { ...config, fields: FIELDS, pipeline: PIPELINE };

/** An order as the webhook leaves it. */
async function order(id: string, email: string, extra: Partial<typeof orders.$inferInsert> = {}) {
  await (await testDatabase()).insert(orders).values({
    id, plan: 'cohort', option: 'full', origin: 'payment_link', status: 'paid', name: 'Pat Buyer', email,
    amountTotal: 99700, paidAt: NOW - 60_000, createdAt: NOW - 120_000, ...extra,
  });
}
const orderRow = async (id: string) => (await (await testDatabase()).select().from(orders).where(eq(orders.id, id)))[0]!;
const loginRow = async (userId: string) => (await (await testDatabase()).select().from(ghlLogins).where(eq(ghlLogins.userId, userId)))[0];
const writes = (calls: { method: string; path: string }[]) => calls.filter((c) => c.method !== 'GET');

describe('D-134: the stamp re-syncs what was already in GHL, once @g9', () => {
  it('sends a sign-up synced before this shipped again, with its new pack tag, and then never again', async () => {
    await insert(signUp('wl1', 'free@example.com', NOW - 1000, { source: 'perfect-week', src: null, ghlSyncedAt: NOW - 500, ghlContactId: 'c-old', ghlAttempts: 6 }));
    const db = await testDatabase();
    const crm = fakeCrm();
    expect(await runGhlSync({ db, config, fetch: crm.fetch, log: capture() })).toMatchObject({ claimed: 1, synced: 1 });
    expect(crm.tagsOf('free@example.com')).toEqual(['perfect-week', 'ai-lead-free-skills', 'src-direct']);
    // Its earlier attempts don't count against the re-sync: it starts again at 1.
    expect(await row('wl1')).toMatchObject({ ghlSyncStamp: syncStamp(config), ghlAttempts: 1, ghlError: null, ghlLastAttemptAt: NOW });
    expect((await runGhlSync({ db, config, fetch: crm.fetch, log: capture() })).claimed).toBe(0);
  });

  it('re-sends a paid order already in GHL so its buyer gets the alias, and again when Connor adds a field id', async () => {
    await order('o1', 'pat@example.com', { ghlSyncedAt: NOW - 500, ghlContactId: 'c-old', ghlAttempts: 1 });
    const db = await testDatabase();
    const crm = fakeCrm();
    await runGhlTick({ db, config, fetch: crm.fetch, log: capture() });
    expect(crm.tagsOf('pat@example.com')).toEqual(['offer-buyer', 'plan-cohort', 'pay-full', 'ai-buyer-accelerator']);
    expect(await orderRow('o1')).toMatchObject({ ghlSyncStamp: syncStamp(config), ghlError: null });
    // Nothing configured for fields or a pipeline: no call beyond the contact and its tags.
    expect(crm.calls.map((c) => `${c.method} ${c.path.split('?')[0]}`)).toEqual(['POST /contacts/upsert', `POST /contacts/${crm.calls[1]!.path.split('/')[2]}/tags`]);

    // Connor sets GHL_FIELD_OFFER: the stamp changes, so the order goes once more and the field is written.
    const withOffer: GhlConfig = { ...config, fields: { offer: 'f-offer' } };
    await runGhlTick({ db, config: withOffer, fetch: crm.fetch, log: capture() });
    expect(crm.fieldsOf('pat@example.com')).toEqual({ 'f-offer': 'Amplified AI Accelerator' });
    expect(await orderRow('o1')).toMatchObject({ ghlSyncStamp: syncStamp(withOffer) });
  });
});

describe('D-134: custom fields and the opportunity @g9', () => {
  it('writes the order’s fields and creates its opportunity, then writes nothing on a second sync', async () => {
    await order('o1', 'pat@example.com');
    const db = await testDatabase();
    const crm = fakeCrm();
    await runGhlTick({ db, config: full, fetch: crm.fetch, log: capture() });
    expect(crm.fieldsOf('pat@example.com')).toEqual({ 'f-offer': 'Amplified AI Accelerator', 'f-cohort': 'dec26', 'f-amount': 997, 'f-date': '2026-10-08' });
    expect(crm.oppOf('pat@example.com')).toMatchObject({ pipelineId: 'p1', pipelineStageId: 's-buy', status: 'won', name: 'Amplified AI Accelerator', monetaryValue: 997 });
    expect(await orderRow('o1')).toMatchObject({ ghlSyncStamp: syncStamp(full), ghlError: null });

    // The webhook re-queues the same order with nothing new: tags and fields again (idempotent), no opportunity write.
    await (await testDatabase()).update(orders).set({ ghlSyncedAt: null, ghlAttempts: 0 }).where(eq(orders.id, 'o1'));
    const before = crm.calls.length;
    await runGhlTick({ db, config: full, fetch: crm.fetch, log: capture() });
    expect(writes(crm.calls.slice(before)).filter((c) => c.path.startsWith('/opportunities'))).toEqual([]);
  });

  it('moves the opportunity to Refunded on a refund, and a later free guide never moves it back to a lead', async () => {
    await order('o1', 'pat@example.com');
    const db = await testDatabase();
    const crm = fakeCrm();
    await runGhlTick({ db, config: full, fetch: crm.fetch, log: capture() });
    // The webhook's refund: `refunded`, and back to the queue.
    await db.update(orders).set({ status: 'refunded', refundedAt: NOW, ghlSyncedAt: null, ghlAttempts: 0 }).where(eq(orders.id, 'o1'));
    await runGhlTick({ db, config: full, fetch: crm.fetch, log: capture() });
    expect(crm.oppOf('pat@example.com')).toMatchObject({ pipelineStageId: 's-gone', status: 'lost' });
    expect(crm.tagsOf('pat@example.com')).toEqual(expect.arrayContaining(['refunded', 'ai-refunded']));
    // A free skill sign-up for the same address: the pack tag, and the opportunity stays put.
    await insert(signUp('wl1', 'pat@example.com', NOW, { source: 'ai-brain-setup', src: null }));
    await runGhlTick({ db, config: full, fetch: crm.fetch, log: capture() });
    expect(crm.tagsOf('pat@example.com')).toContain('ai-lead-free-skills');
    expect(crm.oppOf('pat@example.com')).toMatchObject({ pipelineStageId: 's-gone' });
    // A new paid order that is not refunded brings it back to Purchased.
    await order('o2', 'pat@example.com', { plan: 'agent_plan', option: 'monthly', amountTotal: 9700, paidAt: NOW, createdAt: NOW });
    await runGhlTick({ db, config: full, fetch: crm.fetch, log: capture() });
    expect(crm.oppOf('pat@example.com')).toMatchObject({ pipelineStageId: 's-buy', status: 'won', name: 'Amplified Agent Plan' });
  });

  it('a sign-up with no order becomes a lead in Free Skills; one with an order is left to the order', async () => {
    await insert(signUp('wl1', 'lead@example.com', NOW - 1000, { source: 'voice-profile', src: null }), signUp('wl2', 'list@example.com', NOW - 500));
    const crm = fakeCrm();
    await runGhlTick({ db: await testDatabase(), config: full, fetch: crm.fetch, log: capture() });
    expect(crm.oppOf('lead@example.com')).toMatchObject({ pipelineStageId: 's-free', status: 'open', name: 'Amplified Impact' });
    expect(crm.oppOf('list@example.com')).toMatchObject({ pipelineStageId: 's-lead' });
    // A sign-up writes no fields: it has no purchase to put in them.
    expect(crm.calls.filter((c) => c.method === 'PUT' && c.path.startsWith('/contacts/'))).toEqual([]);
  });

  it('keeps the contact and its tags when GHL refuses a field, and retries the field on the backoff', async () => {
    await order('o1', 'pat@example.com');
    const db = await testDatabase();
    const log = capture();
    const refusing = fakeCrm({ fields: 422 });
    const run = await runGhlTick({ db, config: full, fetch: refusing.fetch, log });
    expect(refusing.tagsOf('pat@example.com')).toContain('ai-buyer-accelerator');
    // In GHL: synced, with its contact. Not stamped: the field is still owed.
    expect(await orderRow('o1')).toMatchObject({ ghlSyncedAt: NOW, ghlContactId: 'c-1', ghlSyncStamp: null, ghlError: 'fields:rejected:422', ghlNextAttemptAt: NOW + BACKOFF_MS[0]! });
    expect(log.lines.some((l) => l.includes('the contact and its tags are in GHL'))).toBe(true);
    expect(run).toBeDefined();

    setNow(NOW + BACKOFF_MS[0]!);
    const fixed = fakeCrm();
    await runGhlTick({ db, config: full, fetch: fixed.fetch, log: capture() });
    expect(await orderRow('o1')).toMatchObject({ ghlSyncStamp: syncStamp(full), ghlError: null, ghlNextAttemptAt: null });
    expect(fixed.fieldsOf('pat@example.com')['f-offer']).toBe('Amplified AI Accelerator');
  });

  it('on a 403 for the fields (a missing scope), keeps syncing contacts and tags, skips the extras, and burns no attempt', async () => {
    await order('o1', 'a@example.com', { createdAt: NOW - 3000 });
    await order('o2', 'b@example.com', { createdAt: NOW - 2000 });
    const db = await testDatabase();
    const log = capture();
    const crm = fakeCrm({ fields: 403 });
    await runGhlTick({ db, config: full, fetch: crm.fetch, log });
    for (const [id, email] of [['o1', 'a@example.com'], ['o2', 'b@example.com']] as const) {
      expect(crm.tagsOf(email), email).toContain('offer-buyer');
      expect(await orderRow(id), id).toMatchObject({ ghlSyncedAt: NOW, ghlSyncStamp: null, ghlAttempts: 0, ghlError: 'fields:unauthorized:403', ghlNextAttemptAt: NOW + UNAUTHORIZED_PAUSE_MS });
    }
    // One field call, the first; the second order's extras were skipped for the rest of the tick.
    expect(crm.calls.filter((c) => c.method === 'PUT' && c.path.startsWith('/contacts/'))).toHaveLength(1);
    expect(log.lines.filter((l) => l.startsWith('error') && l.includes('scopes'))).toHaveLength(1);
  });

  it('pauses the rest of the tick when the pipeline is unavailable, without using anyone’s attempts', async () => {
    await order('o1', 'a@example.com', { createdAt: NOW - 3000 });
    await order('o2', 'b@example.com', { createdAt: NOW - 2000 });
    const db = await testDatabase();
    const crm = fakeCrm({ search: 503 });
    await runGhlTick({ db, config: full, fetch: crm.fetch, log: capture() });
    expect(await orderRow('o1')).toMatchObject({ ghlSyncedAt: NOW, ghlSyncStamp: null, ghlAttempts: 0, ghlError: 'opportunity:server:503', ghlNextAttemptAt: NOW + SYSTEMIC_PAUSE_MS });
    // The second order was claimed and never reached: handed back and paused, contact not even written.
    expect(await orderRow('o2')).toMatchObject({ ghlSyncedAt: null, ghlAttempts: 0, ghlNextAttemptAt: NOW + SYSTEMIC_PAUSE_MS });
    expect(crm.calls.filter((c) => c.body?.email === 'b@example.com')).toEqual([]);
  });

  it('never logs a name, an address, the token or an id from the environment on the new paths', async () => {
    await order('o1', 'zelda@example.com', { name: 'Zelda Hyrule', phone: '+18605559999', createdAt: NOW - 3000 });
    await order('o2', 'link@example.com', { name: 'Link Kokiri', createdAt: NOW - 2000 });
    const db = await testDatabase();
    const log = capture();
    await runGhlTick({ db, config: full, fetch: fakeCrm({ fields: 422 }).fetch, log });
    setNow(NOW + 3600_000);
    await runGhlTick({ db, config: full, fetch: fakeCrm({ fields: 403 }).fetch, log });
    setNow(NOW + 7200_000);
    await runGhlTick({ db, config: full, fetch: fakeCrm({ search: 503 }).fetch, log });
    expect(log.lines.length).toBeGreaterThan(0);
    for (const line of log.lines)
      for (const pii of ['zelda@example.com', 'link@example.com', 'Zelda', 'Hyrule', 'Link Kokiri', 'pit-test-token-123', '8605559999', 'f-offer', 's-buy', 'loc-abc']) expect(line).not.toContain(pii);
  });
});

describe('D-134: a learner’s first sign-in @g9', () => {
  async function people() {
    const db = await testDatabase();
    await db.insert(users).values([
      { id: 'u-joined', email: 'joined@example.com', name: 'Joan Joined', kind: 'learner', status: 'active', joined: NOW - 5000 },
      { id: 'u-session', email: 'session@example.com', name: 'Sam', kind: 'learner', status: 'active' },
      // Invited, with the `joined` date core gives every invite, and never signed in.
      { id: 'u-invited', email: 'invited@example.com', name: 'Ivy Invited', kind: 'learner', status: 'invited', joined: NOW - 9000 },
      { id: 'u-staff', email: 'staff@example.com', name: 'Casey Staff', kind: 'staff', staffRole: 'Owner' },
    ]);
    await db.insert(authSessions).values([
      { id: 's1', userId: 'u-session', expiresAt: new Date(NOW + 86_400_000) },
      { id: 's2', userId: 'u-staff', expiresAt: new Date(NOW + 86_400_000) },
    ]);
    return db;
  }

  it('queues every learner who has signed in, once, and never a staff member or someone only invited', async () => {
    const db = await people();
    expect(await enqueueLogins(db, NOW)).toBe(2);
    expect(await enqueueLogins(db, NOW + 1000)).toBe(0);
    expect(await loginRow('u-joined')).toMatchObject({ firstLoginAt: NOW, ghlSyncedAt: null });
    expect(await loginRow('u-session')).toMatchObject({ firstLoginAt: NOW });
    expect(await loginRow('u-invited')).toBeUndefined();
    expect(await loginRow('u-staff')).toBeUndefined();
  });

  it('tags lms-logged-in and sets LMS Login when its id is set, once per learner', async () => {
    const db = await people();
    await enqueueLogins(db, NOW);
    const crm = fakeCrm();
    const run = await runGhlLoginSync({ db, log: capture(), config: full, fetch: crm.fetch });
    expect(run).toMatchObject({ claimed: 2, synced: 2 });
    expect(crm.tagsOf('joined@example.com')).toEqual(['lms-logged-in']);
    expect(crm.fieldsOf('joined@example.com')).toEqual({ 'f-login': 'signed-in' });
    // No opportunity for a sign-in: the orders decide that.
    expect(crm.calls.filter((c) => c.path.startsWith('/opportunities'))).toEqual([]);
    expect(await loginRow('u-joined')).toMatchObject({ ghlSyncStamp: syncStamp(full), ghlError: null });
    expect((await runGhlLoginSync({ db, log: capture(), config: full, fetch: crm.fetch })).claimed).toBe(0);
    // Without the field's id: the tag alone.
    await (await testDatabase()).update(ghlLogins).set({ ghlSyncedAt: null });
    const tagOnly = fakeCrm();
    await runGhlLoginSync({ db, log: capture(), config, fetch: tagOnly.fetch });
    expect(tagOnly.calls.filter((c) => c.method === 'PUT')).toEqual([]);
  });

  it('runs on the loop’s own tick: a sign-in by email link succeeds while GHL is down, and reaches GHL after', async () => {
    await resetDatabase(seedForDatabase('live'));
    process.env.APP_URL = 'https://learn.example.com';
    resetOutbox();
    const app = await build({ logger: false });
    const down = (async () => {
      throw new Error('connect ECONNREFUSED');
    }) as Fetch;
    const sync = startGhlSync({ waitlist: true, config, db: await testDatabase(), fetch: down, log: capture(), signals: [], intervalMs: 5 });
    try {
      const requested = await app.inject({ method: 'POST', url: '/api/auth/request', payload: { email: 'jamie@ortizhomes.com' } });
      expect(requested.statusCode).toBe(200);
      await settleEmails();
      const token = outbox().find((m) => m.template === 'sign-in')!.data.token as string;
      const verified = await app.inject({ method: 'POST', url: '/api/auth/verify', payload: { token } });
      expect(verified.statusCode, verified.body).toBe(200);
      expect(String(verified.headers['set-cookie'])).toContain('ai_sid=');
    } finally {
      await sync.stop();
      await app.close();
      delete process.env.APP_URL;
    }
    // GHL was down the whole time: nothing reached it, the sign-in is queued, and the next good tick sends it.
    const db = await testDatabase();
    await enqueueLogins(db, NOW);
    setNow(NOW + 3600_000);
    const crm = fakeCrm();
    await runGhlLoginSync({ db, log: capture(), config, fetch: crm.fetch });
    expect(crm.tagsOf('jamie@ortizhomes.com')).toEqual(['lms-logged-in']);
  });
});

describe('D-134: GHL_SYNC_ENABLED @g9', () => {
  it('does not start the loop when it is exactly "false", and starts it for anything else', async () => {
    const saved = process.env.GHL_SYNC_ENABLED;
    try {
      const log = capture();
      process.env.GHL_SYNC_ENABLED = 'false';
      expect(startGhlSync({ waitlist: true, config, db: await testDatabase(), log, signals: [], intervalMs: 3_600_000 }).running).toBe(false);
      expect(log.lines.some((l) => l.includes('GHL_SYNC_ENABLED is false'))).toBe(true);
      for (const v of ['true', '', 'FALSE']) {
        process.env.GHL_SYNC_ENABLED = v;
        const armed = startGhlSync({ waitlist: true, config, db: await testDatabase(), log: capture(), signals: [], intervalMs: 3_600_000 });
        expect(armed.running, v).toBe(true);
        await armed.stop();
      }
      // Paused, the rows simply wait: a sign-up made meanwhile is synced once it is unset.
      delete process.env.GHL_SYNC_ENABLED;
      await insert(signUp('wl1', 'a@example.com', NOW - 1000));
      expect((await runGhlSync({ db: await testDatabase(), config, fetch: fakeCrm().fetch, log: capture() })).synced).toBe(1);
    } finally {
      if (saved === undefined) delete process.env.GHL_SYNC_ENABLED;
      else process.env.GHL_SYNC_ENABLED = saved;
    }
  });
});
