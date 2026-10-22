// The GoHighLevel sync job (D-033), against a real Postgres and a fake GHL.
//
// What is under test is the bookkeeping: which rows a tick claims, what it writes back, how it backs
// off, when it gives up, how a systemic failure is kept from using up the list's retries, and that
// nothing it logs carries a visitor's name or address. The HTTP shape is integrations/ghl.test.ts's.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { ai101Waitlist } from '../src/db/schema';
import { BACKOFF_MS, LEASE_MS, MAX_ATTEMPTS, SYSTEMIC_PAUSE_MS, UNAUTHORIZED_PAUSE_MS, claimDueRows, runGhlSync, startGhlSync } from '../src/jobs/ghl-sync';
import type { GhlSyncLog } from '../src/jobs/ghl-sync';
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
    await insert(signUp('wl1', 'a@example.com', NOW - 1000, { ghlSyncedAt: NOW - 500, ghlContactId: 'c-old', ghlAttempts: 1 }));
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
