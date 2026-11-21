// D-231 (IMPLEMENTATION-SPEC.md §7.5): the Community's props, from what `GET /api/community` and
// `GET /api/community/:id` send. Pure. The words are the package's (`src/data/community.samples.json` › `ui`); every
// time goes through `fmt`: a thread's activity ("3 hr ago", "just now") through `fmt.activity`, a post's through
// `fmt.when` ("Thu, Nov 19 · 4:10 PM CT"), and a post under a minute old reads "Just now", as the mockup's new post does.
import { fmt } from '@ai/core';
import { spaceLabel } from '@ai/core/community';
import type { CommunityList, CommunityPerson, CommunityThread } from '@ai/core/community';
import { learnCommunity } from './shell.vm';
import type { CmPerson, CmThread, CmThreadRow, CommunityUi } from './types';

/** The package's words for the Community, as constants. */
export const COMMUNITY_UI: CommunityUi = {
  title: 'Community',
  lede: 'Ask the cohort, share a win, follow up on a live read. Everyone in your cohort can read what you write here.',
  all: 'All',
  spaces: 'Spaces',
  pinned: 'Pinned',
  hidden: 'Hidden',
  staff: 'Staff',
  threads: 'Threads',
  newest: 'Newest activity first',
  none: 'No threads here yet. Start one.',
  start: 'Start a thread',
  space: 'Space',
  threadTitle: 'Title',
  titleHint: 'One line: what you need.',
  details: 'Details',
  detailsHint: 'The number, what you tried, and where you’re stuck.',
  cohortReads: 'Everyone in your cohort reads this. Leave out client names, and any number you wouldn’t show another team.',
  postThread: 'Post thread',
  posted: 'Posted',
  postingAs: 'Posting as',
  how: 'How this works',
  howLines: [
    'Ask before office hours. Your question may already have an answer here.',
    'Say the number, what you tried and where you’re stuck.',
    'Reports for a live read go through Turn in on the step that asks for them, not here.',
    'Nothing here is emailed. Come back to check for replies.',
  ],
  back: 'Community',
  reply: 'Reply',
  replyHint: 'Add what you know, or what you tried.',
  replyReads: 'Everyone in your cohort reads this.',
  postReply: 'Post reply',
  edit: 'Edit',
  save: 'Save',
  cancel: 'Cancel',
  delete: 'Delete',
  deleteThread: 'Delete this thread and its replies?',
  deleteReply: 'Delete this reply?',
  edited: 'edited',
  about: 'About this thread',
  startedBy: 'Started by',
  lastReply: 'Last reply',
  noReplies: 'No replies yet',
  staffOnly: 'Staff only',
  staffSee: 'Connor and staff see this',
  pin: 'Pin thread',
  unpin: 'Unpin thread',
  hide: 'Hide',
  show: 'Show',
  hideThread: 'Hide thread',
  showThread: 'Show thread',
  needSpace: 'Pick a space for your thread.',
  needTitle: 'Give your thread a title.',
  needDetails: 'Add the details: the number, what you tried, and where you’re stuck.',
  needReply: 'Write a reply first.',
  justNow: 'Just now',
};

/** A post this new reads "Just now". */
export const JUST_NOW_MS = 60_000;

/** One thread's address. */
export const learnCommunityThread = (id: number | string): string => `${learnCommunity()}/${id}`;

/** Each author as the pages draw them: name, team, initials (`fmt.initials`), and the Staff mark. */
export function peopleProps(people: Readonly<Record<string, CommunityPerson>>): Record<string, CmPerson> {
  return Object.fromEntries(
    Object.entries(people).map(([id, p]) => [id, { name: p.name, team: p.team, initials: fmt.initials(p.name), ...(p.staff ? { staff: true } : {}) }]),
  );
}

/** B-30: the list's rows in one space ("all" for every space), newest activity first as the API sends them. */
export function threadRows(list: Pick<CommunityList, 'threads'>, space: string, now: number): CmThreadRow[] {
  return list.threads
    .filter((t) => space === 'all' || t.space === space)
    .map((t) => ({
      id: t.id,
      href: learnCommunityThread(t.id),
      space: t.space,
      title: t.title,
      pinned: t.pinned,
      hidden: t.hidden,
      activity: fmt.activity(t.activityAt, now),
      replies: t.replies,
      excerpt: t.excerpt,
      by: t.by,
    }));
}

/** A post's time: "Just now" for a minute, then the day and the time. */
export const postWhen = (createdAt: number, now: number): string => (now - createdAt < JUST_NOW_MS ? COMMUNITY_UI.justNow : fmt.when(createdAt));

/** B-31: one thread with the posts this viewer may see; `fresh` are the ones they just posted (they rise in). */
export function threadProps(data: Pick<CommunityThread, 'thread' | 'spaces'>, now: number, fresh: ReadonlySet<number | string> = new Set()): CmThread {
  const t = data.thread;
  return {
    id: t.id,
    space: t.space,
    spaceLabel: spaceLabel(data.spaces, t.space),
    title: t.title,
    pinned: t.pinned,
    hidden: t.hidden,
    posts: t.posts.map((p) => ({
      id: p.id,
      by: p.by,
      when: postWhen(p.createdAt, now),
      body: p.body,
      edited: p.edited,
      hidden: p.hidden,
      ...(fresh.has(p.id) ? { fresh: true } : {}),
    })),
  };
}

/** C-22: what the list's empty slot says instead, when the list can't be drawn. */
export const listMessage = (ui: CommunityUi, message: string): CommunityUi => ({ ...ui, none: message });
