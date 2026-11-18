// /learn/skills and /learn/skills/:slug, the learner portal v2's Skill Library (D-179): the learner
// mockup's artboards 16/17 (the library) and 18/19 (a locked skill's preview).
//
// PURE. No React, no clock, no fetch. Every skill's words come from the existing catalog through the
// API, as the current Skill Library reads them (D-079, D-151):
//
//   GET /api/skills               each published skill (its title, one line, set, files) with its state
//                                 for this learner by the one access rule (`open`, `locked`, `upcoming`
//                                 and when), the learner's access groups, and each group's locked line
//                                 from the builder's copy strings (`locked.utah_life`)
//   GET /api/skill-guides/:slug   the skill's guided setup when it is open; otherwise what www shows
//                                 anyone: its steps' titles and its sample output, which is made up
//
// Beside those, the catalog's own code that the current Skill Library already reads: a Grok Bot
// template's collection (`GROK_TEMPLATES`), the group names (the current library's set names, and the
// www library's two Grok Bot collections) and a skill's "Who it's for" (`leadFor`). The only words in this
// file are generic chrome from the signed-off mockup (`LIB`). Library skills never drip by week: a skill
// opens when the access rule says so, and its date is the API's.

import { fmt } from '@ai/core';
import type { IconName } from '@ai/core';
import { grokTemplate } from '@ai/core/grok-templates';
import type { GuideInline, GuideLaneId, GuideSample, GuideUi, SkillGuide, SkillGuidePreview } from '@ai/core/skill-guides';
import { guidePageOf, skillIdOfPage } from '@ai/core/skill-guides';
import { TOOLS, TOPICS, leadFor } from '../../library/content';
import { COPY as LIBRARY } from '../library/SkillLibrary';
import { dateTile } from './learn.vm';
import type { DateTileVM, Tone } from './learn.vm';
import { learnSkill, learnSkills } from './routes';

/** Generic chrome, from the mockup. Never a skill's own words. */
export const LIB = {
  title: 'Skill library',
  search: 'Search skills',
  startHere: 'Start here',
  openNow: 'Open now',
  all: 'All',
  filter: 'Filter by topic',
  open: 'Open',
  locked: 'Locked',
  sample: 'Sample',
  madeUp: 'Made-up data',
  sampleOutput: 'Sample output · made-up data',
  sampleAria: 'A sample of what it builds',
  whenOpens: 'When it opens',
  get: 'What you’ll get',
  guide: 'Its step-by-step setup guide',
  practice: 'Practice files to try it safely',
  back: 'Skill library',
  stillStuck: 'Still stuck?',
  loading: 'Loading your skills',
  loadingGuide: 'Loading the guided setup',
} as const;

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const word = (n: number): string => WORDS[n] ?? String(n);
const skillsWord = (n: number): string => `${n} ${n === 1 ? 'skill' : 'skills'}`;

/** "53 skills with step-by-step setups, and five of them are open now." */
export const ledeOf = (total: number, open: number): string =>
  `${skillsWord(total)} with step-by-step setups, and ${word(open)} of them ${open === 1 ? 'is' : 'are'} open now.`;
export const countOf = (n: number): string => skillsWord(n);
export const showAll = (n: number): string => `Show all ${n}`;
export const opensOn = (t: number): string => `Opens ${fmt.day(t)}`;
/** "Opens Wed, Dec 2 at 12:00 PM MT": the day, then the time in the viewer's zone (the program's after it). */
export const opensAtText = (t: number): string => `Opens ${fmt.day(t)} at ${fmt.time(t)}`;
export const downloadsFor = (platforms: string): string => `Downloads for ${platforms}`;

// --- what the API answers --------------------------------------------------------------------------

export type SkillState = 'open' | 'locked' | 'upcoming';
export type SkillSet = 'owner_ops' | 'agent' | 'both';
export type FileKind = 'claude' | 'chatgpt' | 'practice' | 'grok';

export interface ApiSkill {
  id: string;
  title: string;
  summary: string;
  sets: SkillSet;
  free: boolean;
  releasedAt: number;
  state: SkillState;
  opensAt?: number | null;
  files: FileKind[];
}

export interface ApiGroup {
  id: string;
  name: string;
  covers?: SkillSet[];
}

export interface SkillsPayload {
  skills: ApiSkill[];
  accessGroups?: ApiGroup[];
  paused?: boolean;
  /** D-179: each access group's locked line, from the builder's copy strings, by group id. */
  lockedLines?: Record<string, string>;
  /** D-187: the Team Plan window's words (`plan.team.*`), from the builder's copy strings. */
  planCopy?: Record<string, string>;
}

/** What `GET /api/skill-guides/:slug` answers. */
export interface GuideAnswer {
  slug: string;
  skill: string;
  title: string;
  state: SkillState;
  opensAt: number | null;
  preview: SkillGuidePreview;
  sample?: GuideSample | null;
  guide: SkillGuide | null;
  ui: GuideUi | null;
}

// --- the groups ------------------------------------------------------------------------------------

/** A library group: a skill's set, or a Grok Bot template's collection. In this order on the page. */
export type GroupKey = 'owner_ops' | 'bookkeeping' | 'transactions' | 'agent' | 'both';
const GROUP_ORDER: readonly GroupKey[] = ['owner_ops', 'bookkeeping', 'transactions', 'agent', 'both'];

/** Each group's name, from the catalog's code the current library and www already read. */
const GROUP_LABEL: Record<GroupKey, string> = {
  owner_ops: LIBRARY.sets.owner_ops,
  bookkeeping: TOPICS.bookkeeping,
  transactions: TOPICS.transactions,
  agent: LIBRARY.sets.agent,
  both: LIBRARY.sets.both,
};
/** Each group's tinted icon (generic chrome: the catalog holds no icon per skill yet). */
const GROUP_ICON: Record<GroupKey, IconName> = { owner_ops: 'users', bookkeeping: 'dollar', transactions: 'file', agent: 'home', both: 'zap' };
const GROUP_TONE: Record<GroupKey, Tone> = { owner_ops: 'blue', bookkeeping: 'amber', transactions: 'terra', agent: 'green', both: 'forest' };

export function groupOf(k: Pick<ApiSkill, 'id' | 'sets'>): GroupKey {
  const t = grokTemplate(k.id);
  if (t) return t.collection;
  return k.sets;
}

// --- one skill -------------------------------------------------------------------------------------

/** "Grok Bot, Claude or ChatGPT": the apps a skill's files are for, in the order the setups offer them. */
export function platformsOf(files: readonly FileKind[], conj: 'or' | 'and' = 'or'): string {
  const names = (['grok', 'claude', 'chatgpt'] as const).filter((k) => files.includes(k)).map((k) => TOOLS[k]);
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} ${conj} ${names[names.length - 1]}`;
}

/** "Claude or ChatGPT · Ops/admin": the skill's apps and who it's for (the www library's lead). */
export function skillMeta(k: Pick<ApiSkill, 'id' | 'files'>): string {
  return [platformsOf(k.files), leadFor(guidePageOf(k.id))?.forRole].filter((x): x is string => !!x).join(' · ');
}

/** The group a member's locked skill names: the one whose grant covers its set, else the first. */
function groupFor(k: Pick<ApiSkill, 'sets'>, groups: readonly ApiGroup[]): ApiGroup | null {
  return groups.find((g) => g.covers?.includes(k.sets)) ?? groups[0] ?? null;
}

/**
 * What a skill that isn't open says, and so what its lock reads:
 *   - upcoming: "Opens Wed, Dec 2" (the API's date: the release, or the plan's first day);
 *   - locked, for an access group's member: the group's copy string (`locked.utah_life`, "Not included
 *     with Utah Life access"), with no upsell (D-150). A group with no string reads the current
 *     library's same words;
 *   - paused (D-143): the current library's paused line;
 *   - locked otherwise: the current library's "Not in your plan.".
 * Null for an open skill.
 */
export function lockLine(k: Pick<ApiSkill, 'state' | 'opensAt' | 'releasedAt' | 'sets'>, p: Pick<SkillsPayload, 'accessGroups' | 'paused' | 'lockedLines'>): string | null {
  if (k.state === 'open') return null;
  if (k.state === 'upcoming') return opensOn(k.opensAt ?? k.releasedAt);
  const g = groupFor(k, p.accessGroups ?? []);
  if (g) return p.lockedLines?.[g.id] ?? LIBRARY.notIncluded(g.name);
  if (p.paused) return LIBRARY.paused;
  return LIBRARY.locked;
}

/** Whether a locked skill may offer the plans: never to an access group's member (D-150), never while paused. */
export function offersPlans(k: Pick<ApiSkill, 'state'>, p: Pick<SkillsPayload, 'accessGroups' | 'paused'>): boolean {
  return k.state === 'locked' && !(p.accessGroups ?? []).length && !p.paused;
}

export interface CardVM {
  id: string;
  title: string;
  summary: string;
  meta: string;
  href: string;
  icon: IconName;
  tone: Tone;
  open: boolean;
  /** Why it's closed, or null when it is open. */
  lock: string | null;
  aria: string;
}

function cardOf(k: ApiSkill, p: SkillsPayload): CardVM {
  const g = groupOf(k);
  const lock = lockLine(k, p);
  return {
    id: k.id,
    title: k.title,
    summary: k.summary,
    meta: skillMeta(k),
    href: learnSkill(guidePageOf(k.id)),
    icon: GROUP_ICON[g],
    tone: GROUP_TONE[g],
    open: k.state === 'open',
    lock,
    aria: `${k.title}, ${lock ? lock.charAt(0).toLowerCase() + lock.slice(1) : LIB.open.toLowerCase()}`.replace(/\.$/, ''),
  };
}

// --- the library page ------------------------------------------------------------------------------

export interface GroupVM {
  key: GroupKey;
  label: string;
  icon: IconName;
  tone: Tone;
  count: string;
  /** One lock line for the whole group, when every skill in it says the same; else null. */
  lock: string | null;
  cards: CardVM[];
}

export interface ChipVM {
  key: GroupKey | 'all';
  label: string;
  count: number;
  tone: Tone | null;
}

export interface LibraryVM {
  title: string;
  lede: string;
  /** D-143: why the AI Accelerator's skills read locked. */
  paused: string | null;
  /** Start here: the free skills, the first one larger, with its sample output when its page has one. */
  start: CardVM[];
  chips: ChipVM[];
  groups: GroupVM[];
}

/** A skill matches a search when its name or its one line holds every word, in any case. */
export function matches(k: Pick<ApiSkill, 'title' | 'summary'>, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const hay = `${k.title} ${k.summary}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}

export function libraryVM(p: SkillsPayload, query = '', chip: GroupKey | 'all' = 'all'): LibraryVM {
  const all = p.skills;
  const shown = all.filter((k) => matches(k, query));
  const rest = shown.filter((k) => !k.free);
  const byGroup = (list: readonly ApiSkill[], g: GroupKey) => list.filter((k) => groupOf(k) === g);
  const groups = GROUP_ORDER.filter((g) => byGroup(all, g).some((k) => !k.free)).map((g): GroupVM => {
    const cards = byGroup(rest, g).map((k) => cardOf(k, p));
    const locks = new Set(cards.map((c) => c.lock));
    const only = locks.size === 1 ? [...locks][0]! : null;
    return { key: g, label: GROUP_LABEL[g], icon: GROUP_ICON[g], tone: GROUP_TONE[g], count: countOf(byGroup(all, g).filter((k) => !k.free).length), lock: only, cards };
  });
  return {
    title: LIB.title,
    lede: ledeOf(all.length, all.filter((k) => k.state === 'open').length),
    paused: p.paused ? LIBRARY.paused : null,
    start: shown.filter((k) => k.free).map((k) => cardOf(k, p)),
    chips: [
      { key: 'all', label: LIB.all, count: all.filter((k) => !k.free).length, tone: null },
      ...groups.map((g) => ({ key: g.key, label: g.label, count: byGroup(all, g.key).filter((k) => !k.free).length, tone: g.tone })),
    ],
    groups: groups.filter((g) => g.cards.length && (chip === 'all' || chip === g.key)),
  };
}

/** A run of words as plain text. */
const plain = (segs: readonly GuideInline[]): string => segs.map((x) => (typeof x === 'string' ? x : 'strong' in x ? x.strong : x.link)).join('');

/**
 * The featured card's sample (D-179): the sample output's title and its first paragraph, as written.
 * Null when the skill's page has no sample: nothing is drawn in its place.
 */
export function snipOf(sample: GuideSample | null | undefined): { title: string; text: string | null } | null {
  if (!sample) return null;
  const first = sample.blocks.find((b): b is { p: GuideInline[] } => 'p' in b);
  return { title: sample.title, text: first ? plain(first.p) : null };
}

// --- one skill's page ------------------------------------------------------------------------------

/** The catalog id behind `/learn/skills/<slug>`, or null for an address that is no skill's. */
export const skillOfSlug = (slug: string | undefined): string | null => skillIdOfPage(slug ?? '');

export interface GetRowVM {
  key: string;
  icon: IconName;
  label: string;
}

/** "What you'll get": the guide, the downloads its files are for, and practice files when it has them. */
export function getRows(files: readonly FileKind[]): GetRowVM[] {
  const apps = platformsOf(files, 'and');
  return [
    { key: 'guide', icon: 'book', label: LIB.guide },
    ...(apps ? [{ key: 'downloads', icon: 'download' as const, label: downloadsFor(apps) }] : []),
    ...(files.includes('practice') ? [{ key: 'practice', icon: 'file' as const, label: LIB.practice }] : []),
  ];
}

export interface PreviewVM {
  kind: 'preview';
  back: { label: string; href: string };
  title: string;
  summary: string;
  icon: IconName;
  tone: Tone;
  /** "Opens Wed, Dec 2 at 12:00 PM MT · Claude or ChatGPT · Ops/admin", or the locked line and the rest. */
  meta: string;
  /** The sample output, only where the page has one; always labelled made up. */
  sample: GuideSample | null;
  when: { tile: DateTileVM; text: string } | null;
  get: GetRowVM[];
  plans: boolean;
}

export interface SetupVM {
  kind: 'setup';
  back: { label: string; href: string };
  title: string;
  guide: SkillGuide;
  ui: GuideUi;
}

export type SkillPageVM = PreviewVM | SetupVM | { kind: 'missing'; href: string } | { kind: 'failed'; title: string };

/**
 * A skill's page. Open (by the API's answer, the gate): its guided setup, in the step player. Otherwise
 * its locked preview: what www shows anyone (its name, one line and sample output), when it opens, and
 * what comes with it, from its files. Nothing of the setup is fetched or drawn.
 */
export function skillPageVM(p: SkillsPayload, slug: string | undefined, answer: GuideAnswer | null): SkillPageVM {
  const id = skillOfSlug(slug);
  const k = id ? p.skills.find((x) => x.id === id) : undefined;
  if (!k) return { kind: 'missing', href: learnSkills() };
  const back = { label: LIB.back, href: learnSkills() };
  if (answer && answer.state === 'open' && answer.guide && answer.ui) return { kind: 'setup', back, title: answer.title || k.title, guide: answer.guide, ui: answer.ui };
  // Open, and its setup didn't arrive (the guides file is missing, or the request failed): say so, never a lock.
  if (k.state === 'open') return { kind: 'failed', title: k.title };
  const g = groupOf(k);
  const opensAt = k.state === 'upcoming' ? (k.opensAt ?? k.releasedAt) : null;
  const lock = opensAt !== null ? opensAtText(opensAt) : lockLine(k, p);
  return {
    kind: 'preview',
    back,
    title: k.title,
    summary: k.summary,
    icon: GROUP_ICON[g],
    tone: GROUP_TONE[g],
    meta: [lock, skillMeta(k)].filter((x): x is string => !!x).join(' · '),
    sample: answer?.sample ?? null,
    when: opensAt !== null ? { tile: dateTile(opensAt), text: `${fmt.day(opensAt)} at ${fmt.time(opensAt)}` } : null,
    get: getRows(k.files),
    plans: offersPlans(k, p),
  };
}

// --- the setup, in the step player -----------------------------------------------------------------

/** Where a learner is in a lane, kept on this device, under the current guide page's own key. */
export const placeKey = (slug: string, lane: GuideLaneId): string => `guide-step:${slug}:${lane}`;

/** "Step 2 of 7", from the guides' own words (`ui.guided.progress`). */
export const progressText = (ui: GuideUi, n: number, total: number): string =>
  ui.guided.progress.replace('{n}', String(n)).replace('{total}', String(total));

/** A step's place in its lane, clamped: a saved place past the end is the last step. */
export const clampStep = (at: number, total: number): number => Math.min(Math.max(0, at), Math.max(0, total - 1));
