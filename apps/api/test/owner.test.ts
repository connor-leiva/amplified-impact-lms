// `db:owner` (Ampy, 2026-11-11): the Owner alone, for a production database that has buyers but never
// had the launch seed. Against Postgres, because what matters is what it writes and what it leaves.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { seedProduction } from '@ai/core/seed/curriculum';
import type { Db, Learner } from '@ai/core';
import { addOwner, DEPLOY_OWNER, ensureOwner, OwnerRefused } from '../src/db/seed';
import type { Database } from '../src/db/client';
import { loadDb, resetDatabase, TEST_DATABASE_URL, testDatabase } from './helpers';

const OWNER = { name: 'Test Owner', email: 'Owner@Example.test' };
const buyer: Learner = { id: 'u_buyer', name: 'Buyer', email: 'buyer@example.test', tier: 'team', role: 'Team Owner', teamId: 't_buyer', cohortId: 'dec26', joined: 0, last: null, status: 'active', progress: {} };

/** Production as it would be with sales and no launch seed: the course and a buyer, no staff, no role matrix. */
function noLaunchSeed(): Db {
  const db = seedProduction({ owner: { name: 'Someone', email: 'someone@example.test' } });
  return { ...db, staff: [], perms: {} as Db['perms'], users: [buyer], teams: [{ id: 't_buyer', name: 'Buyer Team', ownerId: 'u_buyer', seats: 2 }] };
}

let handle: Database;
beforeEach(async () => {
  handle = await testDatabase();
  await resetDatabase(noLaunchSeed());
});

describe('db:owner', () => {
  it('adds the Owner and the role matrix, and nothing a learner, team or course row holds', async () => {
    const before = await loadDb();
    expect(await addOwner(handle, { owner: OWNER })).toBeGreaterThan(0);
    const after = await loadDb();
    expect(after.staff).toEqual([{ id: 'st_owner', name: 'Test Owner', email: 'owner@example.test', role: 'Owner', last: null }]);
    expect(after.perms).toEqual(seedProduction({ owner: OWNER }).perms);
    for (const k of ['users', 'teams', 'cohorts', 'sessions', 'modules', 'tiers', 'reminders', 'resources'] as const) expect(after[k], k).toEqual(before[k]);
  });

  it('writes nothing the second time with the same address, in any case', async () => {
    await addOwner(handle, { owner: OWNER });
    const once = await loadDb();
    expect(await addOwner(handle, { owner: { ...OWNER, email: ' owner@example.TEST ' } })).toBe(0);
    expect(await loadDb()).toEqual(once);
  });

  it('refuses, writing nothing, when a different Owner is already here', async () => {
    await addOwner(handle, { owner: OWNER });
    const once = await loadDb();
    await expect(addOwner(handle, { owner: { name: 'Other', email: 'other@example.test' } })).rejects.toThrow(OwnerRefused);
    expect(await loadDb()).toEqual(once);
  });

  it('refuses an address that already signs in as a learner, and keeps an existing role matrix', async () => {
    await expect(addOwner(handle, { owner: { name: 'Buyer', email: 'buyer@example.test' } })).rejects.toThrow(/already signs in here/);
    expect((await loadDb()).staff).toEqual([]);
    const kept = { ...seedProduction({ owner: OWNER }).perms };
    await resetDatabase({ ...noLaunchSeed(), perms: kept });
    await addOwner(handle, { owner: OWNER });
    expect((await loadDb()).perms).toEqual(kept);
  });

  it('refuses an address it could not mail, before connecting', async () => {
    await expect(addOwner(handle, { owner: { name: 'X', email: 'not-an-email' } })).rejects.toThrow(/not a usable email/);
  });

  it('says why it refused, as a word', async () => {
    await expect(addOwner(handle, { owner: { name: 'Buyer', email: 'buyer@example.test' } })).rejects.toMatchObject({ reason: 'address-taken' });
    await addOwner(handle, { owner: OWNER });
    await expect(addOwner(handle, { owner: { name: 'Other', email: 'other@example.test' } })).rejects.toMatchObject({ reason: 'other-owner' });
  });
});

// --- db:owner:ensure, the deploy's step (Connor, 2026-11-11) ---------------------------------------

/** What a seat count and the money read: these must not move. */
async function billingCounts(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const t of ['accounts', 'plans', 'orders']) {
    const r = await handle.execute(sql.raw(`select count(*)::int as n from ${t}`));
    out[t] = Number((r as unknown as { n: number }[])[0]!.n);
  }
  return out;
}

describe('db:owner:ensure', () => {
  it('creates the deploy’s Owner on a database with buyers and no Owner, and nothing else', async () => {
    const before = await loadDb();
    const money = await billingCounts();
    const out = await ensureOwner(handle);
    expect(out).toMatchObject({ status: 'created' });
    const after = await loadDb();
    expect(after.staff).toEqual([{ id: 'st_owner', name: 'Connor Leiva', email: 'connor@springb.com', role: 'Owner', last: null }]);
    expect(after.perms).toEqual(seedProduction({ owner: DEPLOY_OWNER }).perms);
    for (const k of ['users', 'teams', 'cohorts', 'sessions', 'modules', 'tiers', 'reminders', 'resources'] as const) expect(after[k], k).toEqual(before[k]);
    expect(await billingCounts()).toEqual(money);
  });

  it('is a no-op on every later deploy', async () => {
    await ensureOwner(handle);
    const once = await loadDb();
    expect(await ensureOwner(handle)).toEqual({ status: 'unchanged' });
    expect(await ensureOwner(handle)).toEqual({ status: 'unchanged' });
    expect(await loadDb()).toEqual(once);
  });

  it('skips, writing nothing and throwing nothing, when a different Owner is already here', async () => {
    await addOwner(handle, { owner: OWNER });
    const once = await loadDb();
    expect(await ensureOwner(handle)).toEqual({ status: 'skipped', reason: 'other-owner' });
    expect(await loadDb()).toEqual(once);
  });

  it('skips, writing nothing and throwing nothing, when the address already signs in as a learner', async () => {
    await resetDatabase({ ...noLaunchSeed(), users: [{ ...buyer, email: 'connor@springb.com' }] });
    const once = await loadDb();
    expect(await ensureOwner(handle)).toEqual({ status: 'skipped', reason: 'address-taken' });
    expect(await loadDb()).toEqual(once);
    expect(once.users[0]!.email).toBe('connor@springb.com');
  });

  it('turns any other error into a skip, writing nothing', async () => {
    const once = await loadDb();
    expect(await ensureOwner(handle, { name: 'X', email: 'not-an-email' })).toEqual({ status: 'skipped', reason: 'error', detail: 'Error' });
    expect(await loadDb()).toEqual(once);
  });

  it('as the deploy runs it, exits 0 and logs no name or address, even when it has to skip', async () => {
    await addOwner(handle, { owner: OWNER });
    const api = fileURLToPath(new URL('..', import.meta.url));
    const run = () =>
      spawnSync(process.execPath, ['--import', 'tsx', 'src/db/seed.ts', '--owner-ensure'], {
        cwd: api,
        env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
        encoding: 'utf8',
        timeout: 60_000,
      });
    const skipped = run();
    expect(skipped.status, skipped.stderr).toBe(0);
    expect(skipped.stdout).toBe('Owner: skipped, this database already has a different Owner. Change the Owner from Staff & Roles in the console. Nothing was written, and the deploy goes on.\n');
    expect(skipped.stdout + skipped.stderr).not.toMatch(/connor|springb|example\.test/i);

    await resetDatabase(noLaunchSeed());
    const created = run();
    expect(created.status, created.stderr).toBe(0);
    expect(created.stdout).toMatch(/^Owner: created the console’s Owner \(\d+ rows/);
    const again = run();
    expect([again.status, again.stdout]).toEqual([0, 'Owner: already set. Nothing was written.\n']);
    expect(created.stdout + again.stdout).not.toMatch(/connor|springb/i);
  }, 120_000);
});
