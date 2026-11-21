// D-231 (B-29 to B-34): the cohort Community's server. Learners of the course post, reply, edit and delete their own;
// staff see everything and pin, hide and delete, audited; a learner never sees what is hidden or deleted; the drawer's
// three checks and the reply's one are the server's too; 30 posts an hour; nothing is emailed.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq, inArray } from 'drizzle-orm';
import { COMMUNITY_ERRORS, POSTS_PER_HOUR } from '@ai/core/community';
import type { CommunityList, CommunityThread } from '@ai/core/community';
import { seedProduction } from '@ai/core/seed/curriculum';
import { build } from '../src/app';
import type { App } from '../src/app';
import { accounts, auditLog, communityPosts, communityThreads, emailLog, modules, plans, teams, users } from '../src/db/schema';
import { resetDatabase, testDatabase } from './helpers';
import type { Database } from '../src/db/client';

/** Thu, Dec 3, 2026, 10:00 AM CT: the course is open (its first build was the day before). */
const NOW = '2026-12-03T10:00:00-06:00';
const T = Date.parse(NOW);

let handle: Database;
let app: App;
const cookie = new Map<string, string>();

const json = (who: string) => ({ cookie: cookie.get(who)!, 'content-type': 'application/json' });
const list = async (who: string) => app.inject({ method: 'GET', url: '/api/community', headers: { cookie: cookie.get(who)! } });
const thread = async (who: string, id: number) => app.inject({ method: 'GET', url: `/api/community/${id}`, headers: { cookie: cookie.get(who)! } });
const start = (who: string, payload: Record<string, unknown>) => app.inject({ method: 'POST', url: '/api/community', headers: json(who), payload });
const replyTo = (who: string, id: number, body: string) => app.inject({ method: 'POST', url: `/api/community/${id}/replies`, headers: json(who), payload: { body } });
const patchPost = (who: string, id: number, payload: Record<string, unknown>) => app.inject({ method: 'PATCH', url: `/api/community/posts/${id}`, headers: json(who), payload });
const del = (who: string, id: number) => app.inject({ method: 'POST', url: `/api/community/posts/${id}/delete`, headers: json(who), payload: {} });
const patchThread = (who: string, id: number, payload: Record<string, unknown>) => app.inject({ method: 'PATCH', url: `/api/community/${id}`, headers: json(who), payload });

beforeAll(async () => {
  process.env.FIXED_NOW = NOW;
  handle = await testDatabase();
  app = await build({ logger: false });
});

beforeEach(async () => {
  await resetDatabase(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } }));
  // The seed publishes every week; as the cohort runs, Weeks 2 to 8 open on later dates.
  const later = [2, 3, 4, 5, 6, 7, 8].map((n) => `accelerator-week-${n}`);
  await handle.update(modules).set({ status: 'scheduled', opens: T + 30 * 86_400_000 }).where(inArray(modules.id, later));
  await handle.insert(teams).values([
    { id: 'team-a', name: 'Northline Realty', ownerId: 'own-a', seats: 5, seq: 90 },
    { id: 'team-b', name: 'Sample Team', ownerId: 'own-b', seats: 5, seq: 91 },
    { id: 'team-n', name: 'No Plan Team', ownerId: 'own-n', seats: 5, seq: 92 },
  ]);
  const learner = (id: string, name: string, teamId: string, seq: number) => ({
    id, email: `${id}@example.test`, name, kind: 'learner' as const, tier: 'team' as const, role: 'Team Owner', teamId, cohortId: 'dec26', status: 'active' as const, joined: T, seq,
  });
  await handle.insert(users).values([learner('own-a', 'Alex Morgan', 'team-a', 90), learner('own-b', 'Dana Whitlock', 'team-b', 91), learner('own-n', 'Nora Plan', 'team-n', 92)]);
  // Teams A and B bought the AI Accelerator; team N has no plan.
  await handle.insert(accounts).values([
    { id: 'acct-a', teamId: 'team-a', ownerUserId: 'own-a', ownerEmail: 'own-a@example.test', name: 'Northline Realty', createdAt: T },
    { id: 'acct-b', teamId: 'team-b', ownerUserId: 'own-b', ownerEmail: 'own-b@example.test', name: 'Sample Team', createdAt: T },
  ]);
  await handle.insert(plans).values([
    { id: 'plan-a', accountId: 'acct-a', kind: 'cohort', option: 'full', seats: 5, cohortId: 'dec26', status: 'active', startsAt: T - 86_400_000 * 20, orderId: 'ord-a', createdAt: T },
    { id: 'plan-b', accountId: 'acct-b', kind: 'cohort', option: 'full', seats: 5, cohortId: 'dec26', status: 'active', startsAt: T - 86_400_000 * 20, orderId: 'ord-b', createdAt: T },
  ]);
  for (const who of ['own-a', 'own-b', 'own-n', 'st_owner']) cookie.set(who, await app.signInAs(who));
});

afterAll(async () => {
  delete process.env.FIXED_NOW;
  await app?.close();
});

describe('the Community (D-231)', () => {
  it('lists General, the open weeks and Wins, and lets a learner start, read, reply, edit and delete', async () => {
    const empty = await list('own-a');
    expect(empty.statusCode).toBe(200);
    const body = empty.json() as CommunityList;
    expect(body.me).toBe('own-a');
    expect(body.staff).toBe(false);
    expect(body.threads).toEqual([]);
    const ids = body.spaces.map((s) => s.id);
    expect(ids[0]).toBe('general');
    expect(ids.at(-1)).toBe('wins');
    expect(ids).toContain('week-0');
    expect(ids).not.toContain('week-8');
    expect(body.spaces.find((s) => s.id === 'week-0')!.label).toMatch(/^Week 0 · \S/);

    const made = await start('own-b', { space: 'week-0', title: '  Our bookkeeper keeps   the login ', body: 'Step 6 asks us.\n\nIs an export enough?' });
    expect(made.statusCode).toBe(201);
    const id = made.json().id as number;

    const seen = (await list('own-a')).json() as CommunityList;
    expect(seen.threads).toEqual([
      { id, space: 'week-0', title: 'Our bookkeeper keeps the login', pinned: false, hidden: false, by: 'own-b', activityAt: T, replies: 0, excerpt: 'Step 6 asks us. Is an export enough?' },
    ]);
    expect(seen.people['own-b']).toEqual({ name: 'Dana Whitlock', team: 'Sample Team', staff: false });
    expect(seen.people['own-a']).toEqual({ name: 'Alex Morgan', team: 'Northline Realty', staff: false });

    const r = await replyTo('own-a', id, ' Same here. ');
    expect(r.statusCode).toBe(201);
    const replyId = r.json().id as number;
    const read = (await thread('own-a', id)).json() as CommunityThread;
    expect(read.thread.posts.map((p) => [p.by, p.body, p.edited])).toEqual([
      ['own-b', 'Step 6 asks us.\n\nIs an export enough?', false],
      ['own-a', 'Same here.', false],
    ]);

    // Your own you edit; someone else's you don't.
    expect((await patchPost('own-a', replyId, { body: 'Same here. Ours sends an export on the 5th.' })).statusCode).toBe(200);
    const theirs = await patchPost('own-a', read.thread.posts[0]!.id, { body: 'Mine now' });
    expect(theirs.statusCode).toBe(403);
    expect(theirs.json().error).toBe(COMMUNITY_ERRORS.notYours);
    const edited = (await thread('own-b', id)).json() as CommunityThread;
    expect(edited.thread.posts[1]).toMatchObject({ body: 'Same here. Ours sends an export on the 5th.', edited: true });
    expect((await list('own-b')).json().threads[0].replies).toBe(1);

    // Delete a reply; then the thread's first post takes the thread with it.
    expect((await del('own-b', replyId)).statusCode).toBe(403);
    expect((await del('own-a', replyId)).statusCode).toBe(200);
    expect(((await thread('own-b', id)).json() as CommunityThread).thread.posts).toHaveLength(1);
    const gone = await del('own-b', read.thread.posts[0]!.id);
    expect(gone.json()).toEqual({ ok: true, thread: true });
    const missing = await thread('own-a', id);
    expect(missing.statusCode).toBe(404);
    expect(missing.json().error).toBe(COMMUNITY_ERRORS.missing);
    expect(((await list('own-a')).json() as CommunityList).threads).toEqual([]);
    // Nothing is removed from the table, and nothing was emailed.
    expect(await handle.select().from(communityPosts)).toHaveLength(2);
    expect(await handle.select().from(emailLog)).toEqual([]);
  });

  it('checks a new thread and a reply as the drawer and the reply box do, in the mockup’s words', async () => {
    const bad = await start('own-a', { space: 'week-8', title: 'Hi', body: '   ' });
    expect(bad.statusCode).toBe(422);
    expect(bad.json().errors).toEqual({
      space: 'Pick a space for your thread.',
      title: 'Give your thread a title.',
      details: 'Add the details: the number, what you tried, and where you’re stuck.',
    });
    const id = (await start('own-a', { space: 'general', title: 'A real title', body: 'Details' })).json().id as number;
    const empty = await replyTo('own-b', id, ' \n ');
    expect(empty.statusCode).toBe(422);
    expect(empty.json().error).toBe('Write a reply first.');
    expect((await app.inject({ method: 'POST', url: '/api/community', headers: { cookie: cookie.get('own-a')! }, payload: 'x' })).statusCode).toBe(415);
  });

  it('keeps a learner without the course out', async () => {
    const res = await list('own-n');
    expect(res.statusCode).toBe(403);
    expect(res.json().error).toBe(COMMUNITY_ERRORS.notMember);
    expect((await start('own-n', { space: 'general', title: 'Let me in', body: 'Please' })).statusCode).toBe(403);
  });

  it('gives staff the staff tools, audited, and hides what they hide from learners', async () => {
    const id = (await start('own-b', { space: 'general', title: 'Test post, please ignore', body: 'Checking that this works.' })).json().id as number;
    const replyId = (await replyTo('own-a', id, 'It works.')).json().id as number;

    // A learner has no staff tools.
    const refused = await patchThread('own-a', id, { pinned: true });
    expect(refused.statusCode).toBe(403);
    expect(refused.json().error).toBe(COMMUNITY_ERRORS.staffOnly);
    expect((await patchPost('own-a', replyId, { hidden: true })).statusCode).toBe(403);

    // Staff read everything, with "Amplified Impact" as their team.
    const staff = (await list('st_owner')).json() as CommunityList;
    expect(staff.staff).toBe(true);
    expect(staff.people['st_owner']).toMatchObject({ team: 'Amplified Impact', staff: true });

    // Pin, then hide a reply: the learner's count drops; staff still see it, marked.
    expect((await patchThread('st_owner', id, { pinned: true })).statusCode).toBe(200);
    expect((await patchPost('st_owner', replyId, { hidden: true })).statusCode).toBe(200);
    const forLearner = (await list('own-b')).json() as CommunityList;
    expect(forLearner.threads[0]).toMatchObject({ pinned: true, replies: 0 });
    expect(((await thread('own-b', id)).json() as CommunityThread).thread.posts).toHaveLength(1);
    expect((await patchPost('own-a', replyId, { body: 'Edited' })).statusCode).toBe(404);
    const forStaff = (await thread('st_owner', id)).json() as CommunityThread;
    expect(forStaff.thread.posts.map((p) => p.hidden)).toEqual([false, true]);
    // The first post is the thread: it hides with Hide thread, not on its own.
    expect((await patchPost('st_owner', forStaff.thread.posts[0]!.id, { hidden: true })).statusCode).toBe(400);

    // Hide the thread: gone for learners, there for staff.
    expect((await patchThread('st_owner', id, { hidden: true })).statusCode).toBe(200);
    expect(((await list('own-b')).json() as CommunityList).threads).toEqual([]);
    expect((await thread('own-b', id)).statusCode).toBe(404);
    expect((await replyTo('own-b', id, 'Hello?')).statusCode).toBe(404);
    expect(((await list('st_owner')).json() as CommunityList).threads[0]).toMatchObject({ id, hidden: true, pinned: true, replies: 1 });

    // Staff delete a learner's post.
    expect((await del('st_owner', replyId)).statusCode).toBe(200);

    const rows = await handle.select().from(auditLog);
    const actions = rows.filter((r) => r.action.startsWith('community.')).map((r) => [r.action, r.targetType, r.actorUserId, r.after]);
    expect(actions).toEqual([
      ['community.pin', 'community_thread', 'st_owner', { pinned: true }],
      ['community.hide', 'community_post', 'st_owner', { hidden: true }],
      ['community.hide', 'community_thread', 'st_owner', { hidden: true }],
      ['community.delete', 'community_post', 'st_owner', null],
    ]);
  });

  it('keeps a thread in a week a learner hasn’t opened to staff', async () => {
    const [t] = await handle.insert(communityThreads).values({ cohortId: 'dec26', space: 'week-8', title: 'Later', byUserId: 'st_owner', createdAt: T, activityAt: T }).returning();
    await handle.insert(communityPosts).values({ threadId: t!.id, byUserId: 'st_owner', body: 'Soon', createdAt: T });
    expect(((await list('own-a')).json() as CommunityList).threads).toEqual([]);
    expect((await thread('own-a', t!.id)).statusCode).toBe(404);
    expect((await thread('st_owner', t!.id)).statusCode).toBe(200);
    // Staff get the week's space with the thread, so the list can name it; the chips are otherwise the dates'.
    const ids = ((await list('st_owner')).json() as CommunityList).spaces.map((s) => s.id);
    expect(ids).toContain('week-8');
    expect(ids).not.toContain('week-7');
    expect(ids.at(-1)).toBe('wins');
    expect(((await list('own-a')).json() as CommunityList).spaces.map((s) => s.id)).not.toContain('week-8');
  });

  it(`allows ${POSTS_PER_HOUR} posts an hour, deleted ones counted`, async () => {
    const id = (await start('own-a', { space: 'general', title: 'Busy thread', body: 'One' })).json().id as number;
    await handle.insert(communityPosts).values(
      Array.from({ length: POSTS_PER_HOUR - 1 }, (_, i) => ({ threadId: id, byUserId: 'own-a', body: `Reply ${i}`, createdAt: T - 60_000, deletedAt: i % 2 ? T : null })),
    );
    const over = await replyTo('own-a', id, 'One more');
    expect(over.statusCode).toBe(429);
    expect(over.json().error).toBe(COMMUNITY_ERRORS.tooMany);
    expect((await start('own-a', { space: 'general', title: 'Another one', body: 'Two' })).statusCode).toBe(429);
    // An hour on, the old ones no longer count.
    await handle.update(communityPosts).set({ createdAt: T - 3_600_001 }).where(eq(communityPosts.byUserId, 'own-a'));
    expect((await replyTo('own-a', id, 'One more')).statusCode).toBe(201);
    // Someone else is unaffected.
    expect((await replyTo('own-b', id, 'Me too')).statusCode).toBe(201);
  });
});
