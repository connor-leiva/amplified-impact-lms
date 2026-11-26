// D-231 (IMPLEMENTATION-SPEC.md B-29 to B-34): the cohort Community. Threads in spaces, read and written by the
// cohort's learners and by staff, in the learner portal (`/learn/community`, the mockup's pages).
//
//   GET   /api/community                       the list: this viewer's spaces, every thread they may see, the authors
//   POST  /api/community                       start a thread { space, title, body }
//   GET   /api/community/:id                   one thread, with the posts this viewer may see
//   PATCH /api/community/:id                   staff: { pinned } or { hidden }
//   POST  /api/community/:id/replies           reply { body }
//   PATCH /api/community/posts/:postId         the author edits { body }; staff hide or show a reply { hidden }
//   POST  /api/community/posts/:postId/delete  the author, or staff; a thread's first post deletes the thread
//
// Who: a learner whose plan has the course (`courseEntryFor`, as `GET /api/course`), in the spaces of the weeks open
// to them; staff, everywhere, with the staff tools (pin, hide, delete any post), each audited. A learner never sees a
// hidden or deleted thread or post, and never learns one exists: it answers as missing.
//
// Nothing is emailed and nothing notifies anyone: the page says so, and nothing here sends anything. Posts (threads
// and replies) are limited to `POSTS_PER_HOUR` a person, deleted ones included. Nothing is ever removed: a delete
// sets `deleted_at`.
//
// D-238 (B-34, for Admin › Support › Community): staff's list also carries, on each thread, `waiting` (the last word
// the cohort can see is a member's, `waitingOn`) and, beside the threads, `members` (the cohort's learners and their
// teams). Neither is ever sent to a learner.

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { and, asc, count, desc, eq, gte, inArray, isNull } from 'drizzle-orm';
import { DEFAULT_COHORT_ID } from '@ai/core/accelerator';
import { cohortView } from '@ai/core/cohort-run';
import {
  COMMUNITY_ERRORS,
  COMMUNITY_PATH,
  POSTS_PER_HOUR,
  STAFF_TEAM,
  cleanPost,
  cleanThread,
  excerptOf,
  mayDeletePost,
  mayEditPost,
  spaceLabel,
  spacesFor,
  visibleTo,
  waitingOn,
} from '@ai/core/community';
import type { CommunityList, CommunityMembers, CommunityPerson, CommunityPost, CommunitySpace, CommunityThread, CommunityThreadRow } from '@ai/core/community';
import { courseWeekModules } from '@ai/core/course';
import { weekOpenFor } from '@ai/core/release';
import type { CourseEntry } from '@ai/core/release';
import { requireJsonSameOrigin, requireSession, viewerOrThrow } from '../auth';
import type { SessionViewer } from '../auth';
import { audit } from '../console/audit';
import { staffActor } from '../console/guard';
import { getDb } from '../db/client';
import { loadDb } from '../db/io';
import { communityPosts, communityThreads, teams, users } from '../db/schema';
import { clock } from '../lib/clock';
import { courseEntryFor, viewerCohortId } from '../lib/course-access';

export { COMMUNITY_PATH };
export const COMMUNITY_THREAD_PATH = `${COMMUNITY_PATH}/:id`;
export const COMMUNITY_REPLIES_PATH = `${COMMUNITY_PATH}/:id/replies`;
export const COMMUNITY_POST_PATH = `${COMMUNITY_PATH}/posts/:postId`;
export const COMMUNITY_POST_DELETE_PATH = `${COMMUNITY_PATH}/posts/:postId/delete`;

/** The list holds the cohort's newest threads, this many at most. */
export const COMMUNITY_LIST_MAX = 200;
const HOUR = 3_600_000;

type ThreadRow = typeof communityThreads.$inferSelect;
type PostRow = typeof communityPosts.$inferSelect;

/** Who is reading or writing, and where: the viewer's id, whether staff, their cohort and spaces. */
interface Member {
  id: string;
  staff: boolean;
  cohortId: string;
  spaces: CommunitySpace[];
  /** Every week's space, open or not: the names staff see a thread's space by. */
  allSpaces: CommunitySpace[];
  viewer: SessionViewer;
}

/**
 * The spaces a page offers: the member's own, and for staff also any other space a thread on the page is in (a week
 * not open yet, where only a test account with early access can post), in course order, so every thread names one.
 */
function spacesWith(m: Member, used: Iterable<string>): CommunitySpace[] {
  if (!m.staff) return m.spaces;
  const ids = new Set([...m.spaces.map((s) => s.id), ...used]);
  const known = m.allSpaces.filter((s) => ids.has(s.id));
  const strays = [...ids].filter((id) => !m.allSpaces.some((s) => s.id === id)).map((id) => ({ id, label: spaceLabel(m.allSpaces, id) }));
  const wins = known.filter((s) => s.id === 'wins');
  return [...known.filter((s) => s.id !== 'wins'), ...strays, ...wins];
}

/** A learner whose course isn't open isn't in the community (C-22's `notMember`); staff always are. */
async function memberOf(req: FastifyRequest, now: number): Promise<Member | null> {
  const viewer = viewerOrThrow(req);
  const staff = viewer.user.kind === 'staff';
  let entry: CourseEntry | null = null;
  if (!staff) {
    entry = await courseEntryFor(getDb(), viewer.user.id, now);
    if (!entry.open) return null;
  }
  // R-5 Phase 4 (D-260): the viewer's own cohort (`viewerCohortId`), its threads and its weeks as its run has them.
  // Staff read the default cohort's, as they always have.
  const cohortId = staff ? DEFAULT_COHORT_ID : await viewerCohortId(getDb(), viewer.user.id);
  // The spaces: General, a space for each week open to this viewer, Wins. Staff get the weeks open by their
  // dates, the cohort's own (a test account's early access is its own, and opens more).
  const snapshot = await loadDb(getDb());
  const weeks = courseWeekModules(cohortView(snapshot, cohortId));
  const open = weeks.filter((m) => weekOpenFor(m, now, entry ?? { open: true, preview: false }));
  const spaces = spacesFor(open.map((m) => ({ week: m.course.week, title: m.course.title })));
  const allSpaces = spacesFor(weeks.map((m) => ({ week: m.course.week, title: m.course.title })));
  return { id: viewer.user.id, staff, cohortId, spaces, allSpaces, viewer };
}

/** Each author once: the name and the team the cohort sees (staff: "Amplified Impact"). */
async function peopleOf(ids: readonly string[]): Promise<Record<string, CommunityPerson>> {
  const unique = [...new Set(ids)];
  if (!unique.length) return {};
  const rows = await getDb().select({ id: users.id, name: users.name, kind: users.kind, teamId: users.teamId }).from(users).where(inArray(users.id, unique));
  const teamIds = [...new Set(rows.flatMap((r) => (r.kind === 'learner' && r.teamId ? [r.teamId] : [])))];
  const names = teamIds.length ? await getDb().select({ id: teams.id, name: teams.name }).from(teams).where(inArray(teams.id, teamIds)) : [];
  const team = new Map(names.map((t) => [t.id, t.name]));
  return Object.fromEntries(
    rows.map((r) => [r.id, { name: r.name, team: r.kind === 'staff' ? STAFF_TEAM : ((r.teamId && team.get(r.teamId)) ?? ''), staff: r.kind === 'staff' }]),
  );
}

/** D-238: the cohort's learners, not those still invited (as the Console counts them), and the teams they are in. */
async function membersOf(cohortId: string): Promise<CommunityMembers> {
  const rows = await getDb()
    .select({ teamId: users.teamId, status: users.status })
    .from(users)
    .where(and(eq(users.kind, 'learner'), eq(users.cohortId, cohortId)));
  const live = rows.filter((r) => r.status !== 'invited');
  return { learners: live.length, teams: new Set(live.flatMap((r) => (r.teamId ? [r.teamId] : []))).size };
}

/** A thread this member may open: in the cohort, not deleted, in one of their spaces (staff: any), shown (staff: any). */
const threadVisible = (t: ThreadRow, m: Member): boolean =>
  t.cohortId === m.cohortId && visibleTo(t, m.staff) && (m.staff || m.spaces.some((s) => s.id === t.space));

async function threadFor(id: number, m: Member): Promise<ThreadRow | null> {
  const [t] = await getDb().select().from(communityThreads).where(eq(communityThreads.id, id));
  return t && threadVisible(t, m) ? t : null;
}

/** A thread's posts this member may see, oldest first. The first is the thread's own. */
async function postsOf(threadIds: readonly number[], m: Member): Promise<PostRow[]> {
  if (!threadIds.length) return [];
  const rows = await getDb()
    .select()
    .from(communityPosts)
    .where(and(inArray(communityPosts.threadId, [...threadIds]), isNull(communityPosts.deletedAt)))
    .orderBy(asc(communityPosts.id));
  return rows.filter((p) => visibleTo(p, m.staff));
}

/** The first post of a thread, whoever may see it: what a delete of it, or a hide, is checked against. */
async function firstPostId(threadId: number): Promise<number | null> {
  const [p] = await getDb().select({ id: communityPosts.id }).from(communityPosts).where(eq(communityPosts.threadId, threadId)).orderBy(asc(communityPosts.id)).limit(1);
  return p?.id ?? null;
}

/** B-34: at most `POSTS_PER_HOUR` posts (threads and replies) a person in the last hour, deleted ones counted. */
async function overLimit(userId: string, now: number): Promise<boolean> {
  const [row] = await getDb()
    .select({ n: count() })
    .from(communityPosts)
    .where(and(eq(communityPosts.byUserId, userId), gte(communityPosts.createdAt, now - HOUR)));
  return Number(row?.n ?? 0) >= POSTS_PER_HOUR;
}

const idOf = (v: unknown): number | null => (typeof v === 'string' && /^\d{1,15}$/.test(v) ? Number(v) : null);

const asPost = (p: PostRow): CommunityPost => ({ id: p.id, by: p.byUserId, body: p.body, createdAt: p.createdAt, edited: p.editedAt !== null, hidden: p.hidden });

/** The audit row's actor, for a staff member's moderation. */
const actorOf = (m: Member) => staffActor(m.viewer) ?? { source: 'staff' as const, userId: m.id, role: null };

export function registerCommunityRoutes(app: FastifyInstance): void {
  const read = { preHandler: requireSession };
  const write = { preHandler: [requireSession, requireJsonSameOrigin] };

  app.get(COMMUNITY_PATH, read, async (req, reply): Promise<FastifyReply> => {
    reply.header('cache-control', 'no-store');
    const m = await memberOf(req, clock.now());
    if (!m) return reply.code(403).send({ error: COMMUNITY_ERRORS.notMember });
    const rows = (
      await getDb()
        .select()
        .from(communityThreads)
        .where(and(eq(communityThreads.cohortId, m.cohortId), isNull(communityThreads.deletedAt)))
        .orderBy(desc(communityThreads.activityAt))
        .limit(COMMUNITY_LIST_MAX)
    ).filter((t) => threadVisible(t, m));
    const posts = await postsOf(rows.map((t) => t.id), m);
    const byThread = new Map<number, PostRow[]>();
    for (const p of posts) byThread.set(p.threadId, [...(byThread.get(p.threadId) ?? []), p]);
    const threads: CommunityThreadRow[] = rows.flatMap((t) => {
      const ps = byThread.get(t.id) ?? [];
      const first = ps[0];
      if (!first) return [];
      return [{
        id: t.id,
        space: t.space,
        title: t.title,
        pinned: t.pinned,
        hidden: t.hidden,
        by: t.byUserId,
        // The newest post this viewer can see: a hidden or deleted reply doesn't move a thread up.
        activityAt: Math.max(...ps.map((p) => p.createdAt)),
        replies: ps.length - 1,
        excerpt: excerptOf(first.body),
      }];
    });
    threads.sort((a, b) => b.activityAt - a.activityAt || b.id - a.id);
    // D-238: for staff, who wrote each thread's posts decides `waiting` (so staff's `people` names them all); a
    // learner's list never carries it, and its `people` stays the thread starters and the reader.
    const authors = m.staff ? posts.map((p) => p.byUserId) : [];
    const people = await peopleOf([...threads.map((t) => t.by), m.id, ...authors]);
    if (m.staff) {
      const hidden = new Map(rows.map((t) => [t.id, t.hidden]));
      for (const t of threads)
        t.waiting = waitingOn({ hidden: hidden.get(t.id) ?? false }, (byThread.get(t.id) ?? []).map((p) => ({ by: p.byUserId, hidden: p.hidden })), (id) => people[id]?.staff === true);
    }
    const body: CommunityList = {
      me: m.id,
      staff: m.staff,
      spaces: spacesWith(m, threads.map((t) => t.space)),
      people,
      threads,
      ...(m.staff && { members: await membersOf(m.cohortId) }),
    };
    return reply.code(200).send(body);
  });

  app.get(COMMUNITY_THREAD_PATH, read, async (req, reply): Promise<FastifyReply> => {
    reply.header('cache-control', 'no-store');
    const m = await memberOf(req, clock.now());
    if (!m) return reply.code(403).send({ error: COMMUNITY_ERRORS.notMember });
    const id = idOf((req.params as { id?: string }).id);
    const t = id === null ? null : await threadFor(id, m);
    const posts = t ? await postsOf([t.id], m) : [];
    if (!t || !posts.length) return reply.code(404).send({ error: COMMUNITY_ERRORS.missing });
    const body: CommunityThread = {
      me: m.id,
      staff: m.staff,
      spaces: spacesWith(m, [t.space]),
      people: await peopleOf([t.byUserId, ...posts.map((p) => p.byUserId), m.id]),
      thread: { id: t.id, space: t.space, title: t.title, pinned: t.pinned, hidden: t.hidden, posts: posts.map(asPost) },
    };
    return reply.code(200).send(body);
  });

  // B-32: Start a thread. The drawer's three checks again, then the thread and its first post.
  app.post(COMMUNITY_PATH, write, async (req, reply): Promise<FastifyReply> => {
    reply.header('cache-control', 'no-store');
    const now = clock.now();
    const m = await memberOf(req, now);
    if (!m) return reply.code(403).send({ error: COMMUNITY_ERRORS.notMember });
    const clean = cleanThread((req.body ?? {}) as Record<string, unknown>, m.spaces.map((s) => s.id));
    if (!clean.ok) return reply.code(422).send({ error: Object.values(clean.errors)[0], errors: clean.errors });
    if (await overLimit(m.id, now)) return reply.code(429).send({ error: COMMUNITY_ERRORS.tooMany });
    const id = await getDb().transaction(async (tx) => {
      const [t] = await tx
        .insert(communityThreads)
        .values({ cohortId: m.cohortId, space: clean.value.space, title: clean.value.title, byUserId: m.id, createdAt: now, activityAt: now })
        .returning({ id: communityThreads.id });
      await tx.insert(communityPosts).values({ threadId: t!.id, byUserId: m.id, body: clean.value.body, createdAt: now });
      return t!.id;
    });
    return reply.code(201).send({ id });
  });

  // B-31: Reply.
  app.post(COMMUNITY_REPLIES_PATH, write, async (req, reply): Promise<FastifyReply> => {
    reply.header('cache-control', 'no-store');
    const now = clock.now();
    const m = await memberOf(req, now);
    if (!m) return reply.code(403).send({ error: COMMUNITY_ERRORS.notMember });
    const id = idOf((req.params as { id?: string }).id);
    const t = id === null ? null : await threadFor(id, m);
    if (!t) return reply.code(404).send({ error: COMMUNITY_ERRORS.missing });
    const text = cleanPost(((req.body ?? {}) as { body?: unknown }).body);
    if (!text) return reply.code(422).send({ error: COMMUNITY_ERRORS.needReply });
    if (await overLimit(m.id, now)) return reply.code(429).send({ error: COMMUNITY_ERRORS.tooMany });
    const postId = await getDb().transaction(async (tx) => {
      const [p] = await tx.insert(communityPosts).values({ threadId: t.id, byUserId: m.id, body: text, createdAt: now }).returning({ id: communityPosts.id });
      await tx.update(communityThreads).set({ activityAt: now }).where(eq(communityThreads.id, t.id));
      return p!.id;
    });
    return reply.code(201).send({ id: postId });
  });

  // B-33: staff pin or unpin a thread, or hide or show it. Audited.
  app.patch(COMMUNITY_THREAD_PATH, write, async (req, reply): Promise<FastifyReply> => {
    reply.header('cache-control', 'no-store');
    const m = await memberOf(req, clock.now());
    if (!m) return reply.code(403).send({ error: COMMUNITY_ERRORS.notMember });
    if (!m.staff) return reply.code(403).send({ error: COMMUNITY_ERRORS.staffOnly });
    const id = idOf((req.params as { id?: string }).id);
    const t = id === null ? null : await threadFor(id, m);
    if (!t) return reply.code(404).send({ error: COMMUNITY_ERRORS.missing });
    const body = (req.body ?? {}) as { pinned?: unknown; hidden?: unknown };
    const pinned = typeof body.pinned === 'boolean' ? body.pinned : undefined;
    const hidden = typeof body.hidden === 'boolean' ? body.hidden : undefined;
    if (pinned === undefined && hidden === undefined) return reply.code(400).send({ error: COMMUNITY_ERRORS.saveFailed });
    await getDb()
      .update(communityThreads)
      .set({ ...(pinned !== undefined ? { pinned } : {}), ...(hidden !== undefined ? { hidden } : {}) })
      .where(eq(communityThreads.id, t.id));
    const target = { type: 'community_thread', id: String(t.id), label: t.title };
    if (pinned !== undefined && pinned !== t.pinned) {
      await audit(req, { action: 'community.pin', outcome: 'ok', actor: actorOf(m), target, before: { pinned: t.pinned }, after: { pinned } });
    }
    if (hidden !== undefined && hidden !== t.hidden) {
      await audit(req, { action: 'community.hide', outcome: 'ok', actor: actorOf(m), target, before: { hidden: t.hidden }, after: { hidden } });
    }
    return reply.code(200).send({ ok: true });
  });

  // B-31, B-33: the author edits a post; staff hide or show a reply (audited).
  app.patch(COMMUNITY_POST_PATH, write, async (req, reply): Promise<FastifyReply> => {
    reply.header('cache-control', 'no-store');
    const now = clock.now();
    const m = await memberOf(req, now);
    if (!m) return reply.code(403).send({ error: COMMUNITY_ERRORS.notMember });
    const postId = idOf((req.params as { postId?: string }).postId);
    const [p] = postId === null ? [] : await getDb().select().from(communityPosts).where(eq(communityPosts.id, postId));
    const t = p && visibleTo(p, m.staff) ? await threadFor(p.threadId, m) : null;
    if (!p || !t) return reply.code(404).send({ error: COMMUNITY_ERRORS.missing });
    const body = (req.body ?? {}) as { body?: unknown; hidden?: unknown };
    if (typeof body.hidden === 'boolean') {
      if (!m.staff) return reply.code(403).send({ error: COMMUNITY_ERRORS.staffOnly });
      // The first post is the thread: Hide thread hides it.
      if ((await firstPostId(t.id)) === p.id) return reply.code(400).send({ error: COMMUNITY_ERRORS.saveFailed });
      await getDb().update(communityPosts).set({ hidden: body.hidden }).where(eq(communityPosts.id, p.id));
      if (body.hidden !== p.hidden) {
        await audit(req, {
          action: 'community.hide',
          outcome: 'ok',
          actor: actorOf(m),
          target: { type: 'community_post', id: String(p.id), label: t.title },
          before: { hidden: p.hidden },
          after: { hidden: body.hidden },
        });
      }
      return reply.code(200).send({ ok: true });
    }
    if (!mayEditPost(p.byUserId, m.id)) return reply.code(403).send({ error: COMMUNITY_ERRORS.notYours });
    const text = cleanPost(body.body);
    if (!text) return reply.code(422).send({ error: COMMUNITY_ERRORS.needReply });
    if (text !== p.body) await getDb().update(communityPosts).set({ body: text, editedAt: now }).where(eq(communityPosts.id, p.id));
    return reply.code(200).send({ ok: true });
  });

  // B-31, B-33: the author deletes a post, or staff delete any (audited when it isn't theirs). A thread's first post
  // takes the thread with it ("Delete this thread and its replies?").
  app.post(COMMUNITY_POST_DELETE_PATH, write, async (req, reply): Promise<FastifyReply> => {
    reply.header('cache-control', 'no-store');
    const now = clock.now();
    const m = await memberOf(req, now);
    if (!m) return reply.code(403).send({ error: COMMUNITY_ERRORS.notMember });
    const postId = idOf((req.params as { postId?: string }).postId);
    const [p] = postId === null ? [] : await getDb().select().from(communityPosts).where(eq(communityPosts.id, postId));
    const t = p && visibleTo(p, m.staff) ? await threadFor(p.threadId, m) : null;
    if (!p || !t) return reply.code(404).send({ error: COMMUNITY_ERRORS.missing });
    if (!mayDeletePost(p.byUserId, m.id, m.staff)) return reply.code(403).send({ error: COMMUNITY_ERRORS.notYours });
    const thread = (await firstPostId(t.id)) === p.id;
    await getDb().transaction(async (tx) => {
      await tx.update(communityPosts).set({ deletedAt: now }).where(eq(communityPosts.id, p.id));
      if (thread) {
        await tx.update(communityThreads).set({ deletedAt: now }).where(eq(communityThreads.id, t.id));
      } else {
        // The thread's activity goes back to its newest post still there.
        const [last] = await tx
          .select({ at: communityPosts.createdAt })
          .from(communityPosts)
          .where(and(eq(communityPosts.threadId, t.id), isNull(communityPosts.deletedAt)))
          .orderBy(desc(communityPosts.id))
          .limit(1);
        if (last) await tx.update(communityThreads).set({ activityAt: last.at }).where(eq(communityThreads.id, t.id));
      }
    });
    if (p.byUserId !== m.id) {
      await audit(req, {
        action: 'community.delete',
        outcome: 'ok',
        actor: actorOf(m),
        target: { type: thread ? 'community_thread' : 'community_post', id: String(thread ? t.id : p.id), label: t.title },
      });
    }
    return reply.code(200).send({ ok: true, thread });
  });
}
