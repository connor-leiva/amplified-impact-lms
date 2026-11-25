import { fmt } from '@ai/core';
import type { ConsoleCap } from '@ai/core';
import { spaceLabel, waitingOn } from '@ai/core/community';
import type { CommunityList, CommunityMembers, CommunityPerson, CommunityThread } from '@ai/core/community';

// D-238 (B-45, IMPLEMENTATION-SPEC § 7.5a): Admin › Support › Community, the handoff mockup's `Community()` and
// `CommunityThread()` (handoff/admin-mockup/community-screens.jsx). Its words, its facts and tabs, its rows and a
// thread, from staff's `GET /api/community` (each thread's `waiting`, the cohort's `members`) and
// `GET /api/community/:id`. Times through `fmt`: the list's "3 hr ago" (`fmt.activity`), a post's
// "Thu, Nov 19 · 4:10 PM CT" (`fmt.when`, "Just now" under a minute, as the learner pages write it).

/** D-253: Cohort › Community, the cohort in the address (it was `/admin/community`). */
export const communityHome = (cohortId: string): string => `/admin/cohort/${encodeURIComponent(cohortId)}/community`;
export const threadHref = (cohortId: string, id: number | string): string => `${communityHome(cohortId)}/${id}`;

/**
 * Every write is the mockup's `guard('account', …)`: the Roles matrix's "Send password reset or change email" row,
 * which is this capability (Owner, Admin and Support unless the Owner takes it from Support).
 */
export const COMMUNITY_WRITE_CAP: ConsoleCap = 'user.password_reset';

/** Under a minute, a post reads "Just now" (the learner pages' rule, `postWhen`). */
const JUST_NOW_MS = 60_000;

export const COMMUNITY_COPY = {
  title: 'Community',
  description: (cohort: string) =>
    `The ${cohort}'s threads. You read, reply and moderate here, as staff. The cohort sees your posts with a Staff tag. Nothing is emailed.`,
  start: 'Start a thread',
  facts: { threads: 'Threads', waiting: 'Waiting on you', pinned: 'Pinned', hidden: 'Hidden', members: 'Members' },
  members: (m: CommunityMembers) => `${m.learners} in ${m.teams} teams`,
  tabsLabel: 'Threads',
  tabs: { all: 'All', waiting: 'Waiting on you', pinned: 'Pinned', hidden: 'Hidden' },
  find: 'Find a thread',
  space: 'Space',
  allSpaces: 'All spaces',
  columns: { thread: 'Thread', space: 'Space', by: 'Started by', replies: 'Replies', activity: 'Last activity' },
  pills: { pinned: 'Pinned', hidden: 'Hidden', waiting: 'Waiting on you', staff: 'Staff' },
  empty: {
    waiting: { title: 'Nothing is waiting on you', body: 'Every thread ends with a reply from staff.' },
    other: { title: 'No threads here', body: 'Change the filters, or start one.' },
  },
  menu: { open: 'Open thread', pin: 'Pin to the top', unpin: 'Unpin', hide: 'Hide from the cohort', show: 'Show to the cohort' },
  toast: {
    pinned: 'Pinned to the top for the cohort',
    unpinned: 'Unpinned',
    hidden: 'Hidden. Only staff can see it.',
    shown: 'The cohort can see it again',
    posted: 'Posted to the cohort as staff',
    replied: 'Reply posted as staff',
    threadDeleted: 'Thread deleted',
    replyDeleted: 'Reply deleted',
    replyHidden: 'Reply hidden. Only staff can see it.',
    replyShown: 'The cohort can see the reply again',
  },
  compose: {
    title: 'Start a thread',
    space: 'Space',
    titleLabel: 'Title',
    titlePlaceholder: 'One line',
    details: 'Details',
    note: (name: string) => `Posts as ${name} · Staff. Everyone in the cohort can read it. Nothing is emailed.`,
    cancel: 'Cancel',
    post: 'Post thread',
  },
  thread: {
    back: 'Community',
    hiddenNote: 'Hidden from the cohort. Only staff can see this thread.',
    replies: (n: number) => `${n} ${n === 1 ? 'reply' : 'replies'}`,
    edited: 'edited',
    more: 'More actions',
    replyLabel: 'Your reply',
    replyPlaceholder: 'Reply to the cohort',
    reply: 'Reply as staff',
    replyNote: 'Everyone in the cohort can read it. Nothing is emailed.',
    deleteThread: 'Delete thread',
    deleteReply: 'Delete reply',
    about: 'About this thread',
    aboutRows: { space: 'Space', by: 'Started by', started: 'Started', replies: 'Replies', activity: 'Last activity', sees: 'The cohort sees it' },
    sees: { hidden: 'No. It is hidden.', pinned: 'Yes, pinned to the top', yes: 'Yes' },
    cohort: 'What the cohort can do',
    cohortSub: 'For reference.',
    cohortBody:
      'Members start threads and reply, and edit or delete their own posts. They can’t pin or hide, and they never see a hidden post. Pins, hides and your deletes of someone else’s post are written to the Audit Log.',
    confirm: {
      threadTitle: 'Delete this thread?',
      replyTitle: 'Delete this reply?',
      // The mockup's own sentence, "replies" whatever the number.
      thread: (replies: number) =>
        `The thread and its ${replies} replies are removed for everyone. This can’t be undone. To take it out of view and keep it, hide it instead.`,
      reply: (name: string) =>
        `The reply by ${name} is removed for everyone. This can’t be undone. To take it out of view and keep it, hide it instead.`,
      cta: 'Delete',
    },
  },
  /** The mockup's `guard` toast, for a role the Roles matrix took the 'account' row from. */
  guard: (role: string, label: string) => `Your role (${role}) can't do this: ${label}`,
  guards: {
    start: 'Start a thread',
    pin: 'Pin a thread',
    unpin: 'Unpin a thread',
    hide: 'Hide a thread',
    show: 'Show a thread',
    hideReply: 'Hide a reply',
    showReply: 'Show a reply',
    delete: 'Delete a post',
    reply: 'Reply',
  },
  /** The mockup's `GBtn` title on a locked button. */
  locked: 'Your role cannot do this',
} as const;

export type CommunityTab = 'all' | 'waiting' | 'pinned' | 'hidden';
export const COMMUNITY_TABS: readonly CommunityTab[] = ['all', 'waiting', 'pinned', 'hidden'];

/** An author as the pages draw them: initials, name, team, and the Staff tag. */
export interface WhoVM {
  initials: string;
  name: string;
  team: string;
  staff: boolean;
}

export const whoOf = (people: Record<string, CommunityPerson>, id: string): WhoVM => {
  const p = people[id];
  return { initials: fmt.initials(p?.name ?? ''), name: p?.name ?? '', team: p?.team ?? '', staff: p?.staff === true };
};

export interface CommunityRowVM {
  key: string;
  id: number;
  href: string;
  title: string;
  excerpt: string;
  spaceId: string;
  space: string;
  by: WhoVM;
  replies: number;
  activityAt: number;
  activity: string;
  pinned: boolean;
  hidden: boolean;
  waiting: boolean;
}

/**
 * The list's rows as the mockup lists them: pinned threads first ("Pinned to the top for the cohort"), then the newest
 * activity first, as the API sends them.
 */
export function communityRows(list: CommunityList, now: number, cohortId: string): CommunityRowVM[] {
  const threads = [...list.threads].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.activityAt - a.activityAt || b.id - a.id);
  return threads.map((t) => ({
    key: String(t.id),
    id: t.id,
    href: threadHref(cohortId, t.id),
    title: t.title,
    excerpt: t.excerpt,
    spaceId: t.space,
    space: spaceLabel(list.spaces, t.space),
    by: whoOf(list.people, t.by),
    replies: t.replies,
    activityAt: t.activityAt,
    activity: fmt.activity(t.activityAt, now),
    pinned: t.pinned,
    hidden: t.hidden,
    waiting: t.waiting === true,
  }));
}

/** The facts and the tabs' counts: Threads leaves hidden ones out; the All tab counts them. */
export function communityCounts(rows: readonly CommunityRowVM[]) {
  return {
    all: rows.length,
    threads: rows.filter((r) => !r.hidden).length,
    waiting: rows.filter((r) => r.waiting).length,
    pinned: rows.filter((r) => r.pinned).length,
    hidden: rows.filter((r) => r.hidden).length,
  };
}

const TAB_TEST: Record<CommunityTab, (r: CommunityRowVM) => boolean> = {
  all: () => true,
  waiting: (r) => r.waiting,
  pinned: (r) => r.pinned,
  hidden: (r) => r.hidden,
};

/** The tab, the space (`''`: All spaces) and the find box, as the mockup filters: the title and the first post. */
export function filterCommunity(rows: readonly CommunityRowVM[], tab: CommunityTab, space: string, q: string): CommunityRowVM[] {
  const needle = q.toLowerCase();
  return rows.filter((r) => TAB_TEST[tab](r) && (!space || r.spaceId === space) && (r.title + r.excerpt).toLowerCase().includes(needle));
}

export interface PostVM {
  id: number;
  who: WhoVM;
  /** "Thu, Nov 19 · 4:10 PM CT", "Just now"; " · edited" after an edit. */
  when: string;
  paragraphs: string[];
  hidden: boolean;
  first: boolean;
}

export interface ThreadVM {
  id: number;
  title: string;
  spaceId: string;
  space: string;
  pinned: boolean;
  hidden: boolean;
  waiting: boolean;
  posts: PostVM[];
  replies: number;
  started: string;
  activity: string;
  /** The About card's last row. */
  sees: string;
  starter: WhoVM;
}

const whenOf = (t: number, now: number): string => (now - t < JUST_NOW_MS ? 'Just now' : fmt.when(t));

export function communityThreadVM(data: CommunityThread, now: number): ThreadVM {
  const t = data.thread;
  const C = COMMUNITY_COPY.thread;
  const posts = t.posts.map<PostVM>((p, i) => ({
    id: p.id,
    who: whoOf(data.people, p.by),
    when: whenOf(p.createdAt, now) + (p.edited ? ` · ${C.edited}` : ''),
    paragraphs: p.body.split(/\n\n+/),
    hidden: p.hidden,
    first: i === 0,
  }));
  const first = t.posts[0];
  return {
    id: t.id,
    title: t.title,
    spaceId: t.space,
    space: spaceLabel(data.spaces, t.space),
    pinned: t.pinned,
    hidden: t.hidden,
    waiting: waitingOn(t, t.posts, (id) => data.people[id]?.staff === true),
    posts,
    replies: Math.max(0, t.posts.length - 1),
    started: first ? whenOf(first.createdAt, now) : '',
    activity: t.posts.length ? fmt.activity(Math.max(...t.posts.map((p) => p.createdAt)), now) : '',
    sees: t.hidden ? C.sees.hidden : t.pinned ? C.sees.pinned : C.sees.yes,
    starter: first ? whoOf(data.people, first.by) : { initials: '', name: '', team: '', staff: false },
  };
}
