// H-4: the reviewed one-off that activates invited learners who already signed in.

import { beforeEach, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { seedForDatabase } from '@ai/core';
import { activateInvited, formatInvited, invitedWithSession } from '../src/db/activate-invited';
import { auditLog, authSessions, authTokens, skillPurchases, users } from '../src/db/schema';
import { resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-11-30T12:00:00-07:00');
const DAY = 86_400_000;

describe('activate:invited (H-4)', () => {
  beforeEach(async () => {
    process.env.FIXED_NOW = new Date(NOW).toISOString();
    await resetDatabase(seedForDatabase('live'));
  });

  async function setUp() {
    const db = await testDatabase();
    const learners = (await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.kind, 'learner')).orderBy(users.id)).slice(0, 4);
    expect(learners).toHaveLength(4);
    const [linked, expired, masqueraded, neverIn] = learners as [typeof learners[0], typeof learners[0], typeof learners[0], typeof learners[0]];
    await db.update(users).set({ status: 'invited', joined: null }).where(inArray(users.id, learners.map((l) => l.id)));
    // Signed in by an emailed link: a live session and a spent sign-in token.
    await db.insert(authSessions).values({ id: 's_linked', userId: linked.id, expiresAt: new Date(NOW + DAY) });
    await db.insert(authTokens).values({ tokenHash: 'h_linked', email: linked.email.toUpperCase(), purpose: 'sign_in', expiresAt: new Date(NOW - DAY), usedAt: new Date(NOW - 2 * DAY) });
    // Signed in once, long ago: the session row is still there but expired. Their join date is kept.
    await db.update(users).set({ joined: NOW - 9 * DAY }).where(eq(users.id, expired.id));
    await db.insert(authSessions).values({ id: 's_expired', userId: expired.id, expiresAt: new Date(NOW - 5 * DAY) });
    await db.insert(skillPurchases).values({ id: 'skp_guest', userId: expired.id, skillId: 'team-pnl-review', stripeSessionId: 'cs_test_guest_h4', purchasedAt: NOW - 10 * DAY, createdUserId: expired.id, guestEnteredAt: NOW - 10 * DAY });
    // Only a staff member's masquerade: not a sign-in of their own.
    await db.insert(authSessions).values({ id: 's_masq', userId: masqueraded.id, expiresAt: new Date(NOW + DAY), impersonating: 'u_staff' });
    return { db, linked, expired, masqueraded, neverIn };
  }

  it('lists invited learners who had a session of their own, with the evidence, and writes nothing', async () => {
    const { db, linked, expired } = await setUp();
    const before = await db.select().from(users).orderBy(users.id);
    const rows = await invitedWithSession(db, NOW);
    expect(rows.map((r) => [r.userId, r.sessions, r.liveSessions, r.spentSignInLinks, r.guestReturn])).toEqual(
      [
        [linked.id, 1, 1, 1, false],
        [expired.id, 1, 0, 0, true],
      ].sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    );
    expect(await db.select().from(users).orderBy(users.id)).toEqual(before);
    const text = formatInvited(rows, NOW);
    expect(text.split('\n')[0]).toBe('user_id\tteam_id\tjoined\tsessions\tlive_sessions\tspent_sign_in_links\tguest_return');
    expect(text).not.toMatch(/@/);
  });

  it('activates them in one transaction, keeps a join date, appends one audit row each, and changes nothing a second time', async () => {
    const { db, linked, expired, masqueraded, neverIn } = await setUp();
    const ids = (await invitedWithSession(db, NOW)).map((r) => r.userId);
    expect(await activateInvited(db, ids, NOW)).toEqual([linked.id, expired.id].sort());

    const after = await db.select({ id: users.id, status: users.status, joined: users.joined }).from(users).where(inArray(users.id, [linked.id, expired.id, masqueraded.id, neverIn.id]));
    const byId = new Map(after.map((u) => [u.id, u]));
    expect(byId.get(linked.id)).toMatchObject({ status: 'active', joined: NOW });
    expect(byId.get(expired.id)).toMatchObject({ status: 'active', joined: NOW - 9 * DAY });
    expect(byId.get(masqueraded.id)).toMatchObject({ status: 'invited', joined: null });
    expect(byId.get(neverIn.id)).toMatchObject({ status: 'invited', joined: null });

    const rows = await db.select().from(auditLog).where(eq(auditLog.action, 'user.activate')).orderBy(auditLog.targetId);
    expect(rows.map((r) => [r.targetId, r.actorSource, r.actorRole, r.outcome])).toEqual(
      [linked.id, expired.id].sort().map((id) => [id, 'system', 'system:activate-invited', 'ok']),
    );

    // A second run finds nobody and writes nothing more.
    expect(await invitedWithSession(db, NOW)).toEqual([]);
    expect(await activateInvited(db, ids, NOW)).toEqual([]);
    expect(await db.select().from(auditLog).where(eq(auditLog.action, 'user.activate'))).toHaveLength(2);
  });
});
