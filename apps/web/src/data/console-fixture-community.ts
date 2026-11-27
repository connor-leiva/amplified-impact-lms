// D-238 (B-45): Admin › Support › Community in the FIXTURE build: the admin mockup's own threads (handoff/admin-mockup,
// `CM_DATA`: the learner mockup's made-up ones, `handoff/lms-v3/src/data/community.samples.json`), answered and changed
// in memory as the Community's routes (`apps/api/src/routes/community.ts`, D-231) answer and change them, with the same
// core rules (`cleanThread`, `cleanPost`, `waitingOn`, the hourly limit). FIXTURE ONLY, like `parity-r2.ts`: the
// console client imports it only when `VITE_DATA_SOURCE` is `fixture`, so no build that reaches a person carries it.
import { DEFAULT_COHORT_ID } from '@ai/core/accelerator';
import { COMMUNITY_ERRORS, POSTS_PER_HOUR, STAFF_TEAM, cleanPost, cleanThread, excerptOf, waitingOn } from '@ai/core/community';
import type { CommunityList, CommunityMembers, CommunityPerson, CommunitySpace, CommunityThread, CommunityThreadRow } from '@ai/core/community';
import { ConsoleError } from './console';
import type { ConsoleApi } from './console';

/**
 * The mockup's own "now": Fri, Nov 20, 2026, 3:20 PM CT, when its threads read "3 hr ago", "5 hr ago", "1 day ago" and
 * "2 days ago" (`?now=2026-11-20T21:20:00.000Z` draws them so).
 */
export const COMMUNITY_FIXTURE_NOW = Date.parse('2026-11-20T15:20:00-06:00');

/** The mockup's Members fact: "148 in 7 teams". */
export const COMMUNITY_FIXTURE_MEMBERS: CommunityMembers = { learners: 148, teams: 7 };

/** `CM_DATA.people`, by the mockup's ids; the staff member writes under "Amplified Impact". */
const PEOPLE: Record<string, CommunityPerson> = {
  am: { name: "Alex Morgan", team: "Northline Realty", staff: false },
  dw: { name: "Dana Whitlock", team: "Sample Team", staff: false },
  cl: { name: "Connor Leiva", team: "Amplified Impact", staff: true },
};

/** `CM_DATA.spaces`. */
const SPACES: CommunitySpace[] = [
  { id: "general", label: "General" },
  { id: "week-0", label: "Week 0 · Foundations" },
  { id: "wins", label: "Wins" },
];

interface Post {
  id: number;
  by: string;
  body: string;
  createdAt: number;
  edited: boolean;
  hidden: boolean;
  deleted: boolean;
}
interface Thread {
  id: number;
  space: string;
  title: string;
  pinned: boolean;
  hidden: boolean;
  deleted: boolean;
  posts: Post[];
  /** R-5 audit (D-267): the cohort it was started in; absent, the default cohort's. */
  cohortId?: string;
}

const at = (iso: string): number => Date.parse(iso);

/** `CM_DATA.threads`, each post's "Thu, Nov 19 · 4:10 PM CT" as the instant it names. */
function seedThreads(): Thread[] {
  return [
    {
      id: 1,
      space: "general",
      title: "Start here: how to ask so the cohort can help",
      pinned: true,
      hidden: false,
      deleted: false,
      posts: [
        { id: 101, by: "cl", body: "Say the number, what you tried and where you’re stuck.\n\nKeep it to one question a thread, so the next team can find it.", createdAt: at("2026-11-18T09:00:00-06:00"), edited: false, hidden: false, deleted: false },
      ],
    },
    {
      id: 2,
      space: "week-0",
      title: "Our bookkeeper keeps the QuickBooks login. Can the operator still connect the books?",
      pinned: false,
      hidden: false,
      deleted: false,
      posts: [
        { id: 102, by: "dw", body: "Step 6 asks us to connect the books. Our bookkeeper keeps the login and won’t share it.\n\nIs an export enough for now?", createdAt: at("2026-11-19T16:10:00-06:00"), edited: false, hidden: false, deleted: false },
        { id: 103, by: "cl", body: "Yes. An export is the yellow route on your stack card.\n\nPut your bookkeeper on the card as the person who has it, and send the card back.", createdAt: at("2026-11-19T17:02:00-06:00"), edited: false, hidden: false, deleted: false },
        { id: 104, by: "am", body: "Same here. We asked ours for an export each month and that was fine.", createdAt: at("2026-11-20T12:20:00-06:00"), edited: false, hidden: false, deleted: false },
      ],
    },
    {
      id: 3,
      space: "week-0",
      title: "Ready Check is green on Claude. Do we run it on ChatGPT too?",
      pinned: false,
      hidden: false,
      deleted: false,
      posts: [
        { id: 105, by: "am", body: "We picked Claude for the course. One teammate still uses ChatGPT for other work.\n\nDo we need the Ready Check on both?", createdAt: at("2026-11-20T10:05:00-06:00"), edited: false, hidden: false, deleted: false },
      ],
    },
    {
      id: 4,
      space: "wins",
      title: "Win: the test hire ran with nobody at the keyboard",
      pinned: false,
      hidden: false,
      deleted: false,
      posts: [
        { id: 106, by: "dw", body: "Step 8 is done. It ran on its own this morning.", createdAt: at("2026-11-19T08:15:00-06:00"), edited: false, hidden: false, deleted: false },
      ],
    },
    {
      id: 5,
      space: "general",
      title: "Test post, please ignore",
      pinned: false,
      hidden: true,
      deleted: false,
      posts: [
        { id: 107, by: "dw", body: "Checking that this works.", createdAt: at("2026-11-18T14:30:00-06:00"), edited: false, hidden: false, deleted: false },
      ],
    },
  ];
}

const HOUR = 3_600_000;
const missing = () => new ConsoleError('not_found', 404, null, COMMUNITY_ERRORS.missing);
const refused = (status: number, message: string) => new ConsoleError(status === 429 ? 'rate_limited' : 'failed', status, null, message);

type CommunityPart = Pick<ConsoleApi, 'community' | 'communityThread' | 'startThread' | 'replyThread' | 'setThread' | 'setPost' | 'deletePost'>;

/**
 * The Community part of the fixture's Console client, for the signed-in staff member `me` (the parity fixture's
 * Connor Leiva is the mockup's own `cl`). `settle` is the fixture's (its loading, error and limit states); `audit`
 * writes what the server would audit, so the Audit Log shows it.
 */
export function fixtureCommunity(opts: {
  me: { id: string; name: string };
  now: () => number;
  settle: <T>(value: () => T) => Promise<T>;
  audit: (action: 'community.pin' | 'community.hide' | 'community.delete', label: string, after: unknown) => void;
}): CommunityPart {
  const { me, now, settle, audit } = opts;
  const people: Record<string, CommunityPerson> = { ...PEOPLE, [me.id]: PEOPLE[me.id] ?? { name: me.name, team: STAFF_TEAM, staff: true } };
  let threads = seedThreads();
  let seq = 900;
  const live = (t: Thread) => t.posts.filter((p) => !p.deleted);
  const find = (id: number) => {
    const t = threads.find((x) => x.id === id && !x.deleted);
    if (!t) throw missing();
    return t;
  };
  const findPost = (postId: number) => {
    for (const t of threads) {
      if (t.deleted) continue;
      const p = t.posts.find((x) => x.id === postId && !x.deleted);
      if (p) return { t, p };
    }
    throw missing();
  };
  const overLimit = () =>
    threads.flatMap((t) => t.posts).filter((p) => p.by === me.id && p.createdAt >= now() - HOUR).length >= POSTS_PER_HOUR;
  const row = (t: Thread): CommunityThreadRow => {
    const ps = live(t);
    return {
      id: t.id,
      space: t.space,
      title: t.title,
      pinned: t.pinned,
      hidden: t.hidden,
      by: ps[0]!.by,
      activityAt: Math.max(...ps.map((p) => p.createdAt)),
      replies: ps.length - 1,
      excerpt: excerptOf(ps[0]!.body),
      waiting: waitingOn(t, ps, (id) => people[id]?.staff === true),
    };
  };
  const viewer = () => ({ me: me.id, staff: true, spaces: SPACES, people });
  // R-5 audit (D-267): a thread is its cohort's; the sample threads are the default cohort's, as the API's are.
  const inCohort = (t: Thread, cohortId?: string) => (t.cohortId ?? DEFAULT_COHORT_ID) === (cohortId || DEFAULT_COHORT_ID);

  return {
    community: (cohortId) =>
      settle((): CommunityList => ({
        ...viewer(),
        threads: threads
          .filter((t) => !t.deleted && live(t).length && inCohort(t, cohortId))
          .map(row)
          .sort((a, b) => b.activityAt - a.activityAt || b.id - a.id),
        members: COMMUNITY_FIXTURE_MEMBERS,
      })),
    communityThread: (id) =>
      settle((): CommunityThread => {
        const t = find(Number(id));
        return {
          ...viewer(),
          thread: {
            id: t.id,
            space: t.space,
            title: t.title,
            pinned: t.pinned,
            hidden: t.hidden,
            posts: live(t).map((p) => ({ id: p.id, by: p.by, body: p.body, createdAt: p.createdAt, edited: p.edited, hidden: p.hidden })),
          },
        };
      }),
    startThread: (input, cohortId) =>
      settle(() => {
        const clean = cleanThread(input, SPACES.map((sp) => sp.id));
        if (!clean.ok) throw refused(422, Object.values(clean.errors)[0]!);
        if (overLimit()) throw refused(429, COMMUNITY_ERRORS.tooMany);
        const { space, title, body } = clean.value;
        const id = ++seq;
        const first: Post = { id: ++seq, by: me.id, body, createdAt: now(), edited: false, hidden: false, deleted: false };
        threads = [{ id, space, title, pinned: false, hidden: false, deleted: false, posts: [first], ...(cohortId ? { cohortId } : {}) }, ...threads];
        return { id };
      }),
    replyThread: (id, body) =>
      settle(() => {
        const t = find(id);
        const text = cleanPost(body);
        if (!text) throw refused(422, COMMUNITY_ERRORS.needReply);
        if (overLimit()) throw refused(429, COMMUNITY_ERRORS.tooMany);
        const postId = ++seq;
        t.posts.push({ id: postId, by: me.id, body: text, createdAt: now(), edited: false, hidden: false, deleted: false });
        return { id: postId };
      }),
    setThread: (id, change) =>
      settle(() => {
        const t = find(id);
        if ('pinned' in change && change.pinned !== t.pinned) {
          t.pinned = change.pinned;
          audit('community.pin', t.title, { pinned: t.pinned });
        }
        if ('hidden' in change && change.hidden !== t.hidden) {
          t.hidden = change.hidden;
          audit('community.hide', t.title, { hidden: t.hidden });
        }
      }),
    setPost: (postId, change) =>
      settle(() => {
        const { t, p } = findPost(postId);
        // The first post is the thread: it hides with the thread, not on its own (the server's 400).
        if (live(t)[0] === p) throw refused(400, COMMUNITY_ERRORS.saveFailed);
        if (change.hidden !== p.hidden) {
          p.hidden = change.hidden;
          audit('community.hide', t.title, { hidden: p.hidden });
        }
      }),
    deletePost: (postId) =>
      settle(() => {
        const { t, p } = findPost(postId);
        const thread = live(t)[0] === p;
        p.deleted = true;
        if (thread) t.deleted = true;
        if (p.by !== me.id) audit('community.delete', t.title, null);
        return { thread };
      }),
  };
}
