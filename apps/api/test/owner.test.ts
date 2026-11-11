// `db:owner` (Ampy, 2026-11-11): the Owner alone, for a production database that has buyers but never
// had the launch seed. Against Postgres, because what matters is what it writes and what it leaves.
import { beforeEach, describe, expect, it } from 'vitest';
import { seedProduction } from '@ai/core';
import type { Db, Learner } from '@ai/core';
import { addOwner, OwnerRefused } from '../src/db/seed';
import type { Database } from '../src/db/client';
import { loadDb, resetDatabase, testDatabase } from './helpers';

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
});
