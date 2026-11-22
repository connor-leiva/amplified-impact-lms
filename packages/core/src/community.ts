// D-231: the cohort Community, threads in spaces (IMPLEMENTATION-SPEC.md B-29 to B-34). Pure: no clock, no I/O.
//
// The pages are the mockup's (`handoff/lms-v3/src/components/Community.jsx`); their words live with them in the web
// app. Here are the rules the server enforces: which spaces a viewer has, what a thread or a reply must hold, who may
// see, edit, delete or hide what, and the words the server answers with. Nothing here sends an email or a
// notification: the Community says so, and nothing does.

/** One space a thread lives in. */
export interface CommunitySpace {
  id: string;
  label: string;
}

/** §7.5: General, "Week N · Title" for each week open to the viewer, then Wins. */
export function spacesFor(openWeeks: readonly { week: number; title: string }[]): CommunitySpace[] {
  return [
    { id: 'general', label: 'General' },
    ...openWeeks.map((w) => ({ id: `week-${w.week}`, label: `Week ${w.week} · ${w.title}` })),
    { id: 'wins', label: 'Wins' },
  ];
}

/** The drawer's limits (the mockup's `maxLength`s), enforced again here. */
export const THREAD_TITLE_MIN = 3;
export const THREAD_TITLE_MAX = 140;
export const POST_MAX = 4000;
/** B-34: posts (threads and replies) one person may write in an hour. */
export const POSTS_PER_HOUR = 30;

/**
 * The server's words. The first four are the mockup's own validation messages (the drawer and the reply box show
 * them in place); the rest are C-22's states the mockup doesn't draw, each shown in a slot it already has.
 */
export const COMMUNITY_ERRORS = {
  needSpace: 'Pick a space for your thread.',
  needTitle: 'Give your thread a title.',
  needDetails: 'Add the details: the number, what you tried, and where you’re stuck.',
  needReply: 'Write a reply first.',
  loadFailed: 'The community didn’t load. Refresh to try again.',
  saveFailed: 'That didn’t go through. Try again.',
  missing: 'That thread isn’t here anymore.',
  notMember: 'The community is for the cohort’s teams.',
  tooMany: 'That’s 30 posts this hour. Try again later.',
  notYours: 'Only the person who wrote it can change it.',
  staffOnly: 'Only staff can do that.',
} as const;

export type ThreadErrors = Partial<Record<'space' | 'title' | 'details', string>>;

const text = (v: unknown): string => (typeof v === 'string' ? v : '');

/** B-32: a new thread, as the drawer checks it: a space the viewer has, a title of 3+ characters, details. */
export function cleanThread(
  input: { space?: unknown; title?: unknown; body?: unknown },
  spaces: readonly string[],
): { ok: true; value: { space: string; title: string; body: string } } | { ok: false; errors: ThreadErrors } {
  const space = text(input.space);
  const title = text(input.title).replace(/\s+/g, ' ').trim().slice(0, THREAD_TITLE_MAX);
  const body = text(input.body).trim().slice(0, POST_MAX);
  const errors: ThreadErrors = {
    ...(!spaces.includes(space) && { space: COMMUNITY_ERRORS.needSpace }),
    ...(title.length < THREAD_TITLE_MIN && { title: COMMUNITY_ERRORS.needTitle }),
    ...(!body && { details: COMMUNITY_ERRORS.needDetails }),
  };
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: { space, title, body } };
}

/** A reply or an edit: something to say, at most `POST_MAX` characters. Null when empty. */
export function cleanPost(body: unknown): string | null {
  const b = text(body).trim().slice(0, POST_MAX);
  return b || null;
}

/** A list row's first lines: the first post with its whitespace run together (the mockup's; CSS trims the rest). */
export const excerptOf = (body: string): string => body.replace(/\s+/g, ' ').trim();

/** What a viewer may see: nothing deleted; hidden threads and posts only by staff (B-33). */
export const visibleTo = (x: { hidden: boolean; deletedAt: number | null }, staff: boolean): boolean =>
  x.deletedAt === null && (staff || !x.hidden);

/** B-31, B-33: your own posts you edit; your own, or any as staff, you delete; staff hide a reply or a thread. */
export const mayEditPost = (by: string, me: string): boolean => by === me;
export const mayDeletePost = (by: string, me: string, staff: boolean): boolean => staff || by === me;

/** The space a thread's label names ("Week 0 · Foundations"), or the id itself for a week no longer open. */
export const spaceLabel = (spaces: readonly CommunitySpace[], id: string): string =>
  spaces.find((s) => s.id === id)?.label ?? (id.startsWith('week-') ? `Week ${id.slice(5)}` : id);

/**
 * D-238 (B-34, the admin's "Waiting on you"): a thread waits on staff when the newest post the cohort can see was not
 * written by staff. A hidden post doesn't count (the first post stands in when every reply is hidden), and a hidden
 * thread waits on no one. `posts` oldest first, as a thread holds them; nothing deleted.
 */
export function waitingOn(
  thread: { hidden: boolean },
  posts: readonly { by: string; hidden: boolean }[],
  isStaff: (userId: string) => boolean,
): boolean {
  if (thread.hidden) return false;
  const last = [...posts].reverse().find((p) => !p.hidden) ?? posts[0];
  return last !== undefined && !isStaff(last.by);
}

/** §7.5: the team a staff member writes under ("Connor Leiva · Amplified Impact"). */
export const STAFF_TEAM = 'Amplified Impact';

/** The paths the portal reads and writes. */
export const COMMUNITY_PATH = '/api/community';
export const communityThreadPath = (id: number | string): string => `${COMMUNITY_PATH}/${id}`;
export const communityRepliesPath = (id: number | string): string => `${COMMUNITY_PATH}/${id}/replies`;
export const communityPostPath = (id: number | string): string => `${COMMUNITY_PATH}/posts/${id}`;
export const communityPostDeletePath = (id: number | string): string => `${COMMUNITY_PATH}/posts/${id}/delete`;

// --- what the API sends (`GET /api/community`, `GET /api/community/:id`) ------------------------------

/** An author, as everyone in the cohort sees them: a name and a team (staff: "Amplified Impact"). */
export interface CommunityPerson {
  name: string;
  team: string;
  staff: boolean;
}

/** What both reads carry: who is reading, their spaces and every author on the page, by user id. */
export interface CommunityViewerPart {
  me: string;
  staff: boolean;
  spaces: CommunitySpace[];
  people: Record<string, CommunityPerson>;
}

/** A list row: the thread, its newest post's time this viewer can see, and the replies this viewer can see. */
export interface CommunityThreadRow {
  id: number;
  space: string;
  title: string;
  pinned: boolean;
  hidden: boolean;
  by: string;
  activityAt: number;
  replies: number;
  excerpt: string;
  /** D-238 (B-34), STAFF ONLY: the last word the cohort can see is a member's (`waitingOn`). Never sent to a learner. */
  waiting?: boolean;
}

/** D-238 (B-34), STAFF ONLY: the cohort's learners (not those still invited) and the teams they are in. */
export interface CommunityMembers {
  learners: number;
  teams: number;
}

/** One post as a thread page draws it. */
export interface CommunityPost {
  id: number;
  by: string;
  body: string;
  createdAt: number;
  edited: boolean;
  hidden: boolean;
}

export interface CommunityList extends CommunityViewerPart {
  threads: CommunityThreadRow[];
  /** D-238 (B-34): staff only, beside the list. Never sent to a learner. */
  members?: CommunityMembers;
}

export interface CommunityThread extends CommunityViewerPart {
  thread: { id: number; space: string; title: string; pinned: boolean; hidden: boolean; posts: CommunityPost[] };
}
