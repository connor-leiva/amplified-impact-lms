// /learn/week/:week/step/:step, the step player (D-177): artboards 08/09 of the learner mockup.
//
// PURE. A step renders from `GET /api/course`: its name, what it asks, who does it, its time, its
// done-when line and its Claude and ChatGPT paths (`StepPaths`: text, copy, list and table blocks).
// "For this step" is only this step's linked Library skills whose page exists, plus the week's kit
// items placed on this step (D-189). The learner's progress and the step's id come from the snapshot,
// so "Mark step done" writes through the portal's own `toggleStep`.

import { fmt, mountainWhen } from '@ai/core';
import { watchThreshold } from '@ai/core/video';
import type { ChecklistMark, CoursePref, IcsEvent } from '@ai/core';
import type { Actor } from '@ai/core/mutations';
import type { CalloutBlock, CheckAction, CheckBlock, ContentBlock, GlossaryTerm, PathBlock, StepPaths, VideoBlock } from '@ai/core/course-types';
import { cardTerms, markSequence } from '@ai/core/glossary';
import type { GlossarySpan } from '@ai/core/glossary';
import type { CourseKitItem, OpenCourseWeek } from '@ai/core/course';
import { acceleratorModuleId } from '@ai/core/accelerator';
import { checkVisible, conditionMet, gateRemaining, itemChecked, pathHasCheck, pathRegions, progressCounts, waitingOn, weekHasCheck } from '@ai/core/checklist';
import { pathFromAnswers } from '@ai/core/personalize';
import type { LearnerStep } from '@ai/core/learner';
import { inLibrary } from '../course/Course.vm';
import type { CoursePayload, CourseSession } from '../course/Course.vm';
import { LABELS, helpVM, icsEvents, kitRow, skillRow, skillsForStep, stepMeta, stepText, stepTitle } from './learn.vm';
import type { HelpVM, KitRowVM, WeekRow } from './learn.vm';
import { learnIntake, learnStack, learnStep, learnTeam, learnWeek } from './routes';
import { startHereCard } from './Week.vm';
import type { StartHereVM } from './Week.vm';

export const STEP = {
  doThis: 'Do this',
  doneWhen: 'Done when:',
  previous: 'Previous',
  next: 'Next step',
  markDone: 'Mark step done',
  /** D-184: a done step's button, which toggles it back (the current portal's "click to undo"). */
  undo: 'Undo',
  forStep: 'For this step',
  stillStuck: 'Still stuck?',
  yourAi: 'Your AI',
  copy: 'Copy',
  copied: 'Copied',
  steps: 'steps',
  of: 'of',
  kit: 'This step’s kit',
  /** D-188: a video block's name when it has no title, and the link that opens one on another site. */
  video: 'Video',
  watch: 'Watch',
  /** D-198: the name of the button on a poster. The replay player's play button uses the same word. */
  play: 'Play',
  /** D-190: the one-step layout. Chrome, not a week’s words. */
  yourChecklist: 'Your Checklist',
  reference: 'Reference',
  onThisPage: 'On This Page',
  checklist: 'Checklist',
  stepDone: 'Step done',
  /** The line under Mark step done once the step is done and another step follows. */
  niceWork: 'Nice work. Step',
  isNext: 'is next.',
  week: 'Week',
  nextKicker: 'Next',
  tip: 'Tip',
  headsUp: 'Heads up',
  diy: 'Doing it yourself?',
  invite: 'Invite',
  download: 'Download',
  downloaded: 'Downloaded',
  playAt: 'Play from',
  checksItself: 'Checks itself at',
  /** D-191: the video block's own chrome. */
  chapters: 'Chapters',
  scrollChaptersLeft: 'Scroll chapters left',
  scrollChaptersRight: 'Scroll chapters right',
  showTranscript: 'Show transcript',
  hideTranscript: 'Hide transcript',
  copyTranscript: 'Copy transcript',
  transcript: 'Transcript',
  draftVideo: 'Draft video · narration coming',
  transcriptMissing: 'The transcript didn’t load.',
  loading: 'Loading.',
  waiting: 'Waiting on Step',
  checkAnyway: 'Check it off',
  notNow: 'Not now',
  show: 'Show',
  tasksTimed: 'tasks timed',
  checkedWord: 'checked',
  dayLeft: 'day left',
  daysLeft: 'days left',
  due: 'Due',
  moreToGo: 'more to mark this step done.',
  checkOff: 'Check off',
  oneMore: '1 more to mark this step done.',
  notStarted: 'not started',
  inProgress: 'in progress',
  waitingStatus: 'waiting',
  /** D-193: the glossary tooltip's way into the drawer. Chrome, not a term. */
  moreGlossary: 'More in the glossary',
  /** D-194: staff preview. The boxes move; nothing is saved. */
  previewChecks: 'Preview: Checks Aren’t Saved',
  /** D-194: a learner toggle that the server refused. */
  checkFailed: 'That check didn’t save.',
} as const;

const ROLE_LABEL: Record<string, string> = { owner: 'Owner', operator: 'Operator', each: 'Each of you' };
const CALLOUT_LABEL = { tip: STEP.tip, heads_up: STEP.headsUp, diy: STEP.diy } as const;

/** A video's length beside Watch: "7 min 49 s", "2 min", or "8 s". */
export function watchLength(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  if (m === 0) return `${sec} s`;
  if (sec === 0) return `${m} min`;
  return `${m} min ${sec} s`;
}

export type Platform = 'claude' | 'chatgpt';
export const PLATFORM_LABEL: Record<Platform, string> = { claude: 'Claude', chatgpt: 'ChatGPT' };

export interface RailStepVM {
  n: number;
  label: string;
  state: 'done' | 'current' | 'todo';
  on: boolean;
  href: string;
  aria: string;
}

export interface StepVM {
  kind: 'step';
  week: number;
  back: { label: string; href: string };
  railLabel: string;
  rail: RailStepVM[];
  eyebrow: string;
  title: string;
  lede: string | null;
  meta: string;
  doneWhen: string | null;
  hint: string | null;
  /** The platforms the step has a path for, in order, and each one's blocks. None: no tabs. */
  tabs: Platform[];
  paths: Partial<Record<Platform, PathBlock[]>>;
  prev: string | null;
  next: string | null;
  mark: { moduleId: string; stepId: string | null; done: boolean; disabled: boolean };
  /**
   * "For this step" at `tab` (the first path when the caller names none): linked skills whose Library
   * page exists, then kit items placed on this step that match the tab. Empty hides the section.
   */
  forStep: KitRowVM[];
  /** The same rows, so the player can swap kit items when the path tab changes. */
  aside: StepAside;
  help: HelpVM;
  /**
   * D-190: set only when this week has a checklist item on some step. Other weeks omit both, so the
   * step player’s view-model stays the one it had.
   */
  pills?: PillVM[];
  layouts?: Partial<Record<Platform, ChecklistLayoutVM>>;
  /** D-191: this learner’s place in this week’s videos. Absent until they have watched one, so a step with none keeps its keys. */
  videoProgress?: { videoId: string; maxPct: number; lastPositionS: number }[];
  /**
   * D-193: the course glossary, and the first use of each term in each path's paragraphs.
   * Absent when the course has no glossary, so a step without one keeps the keys it had.
   */
  glossary?: GlossaryTerm[];
  pathMarks?: Partial<Record<Platform, (GlossarySpan[] | undefined)[]>>;
  /** D-195: step 1 only, and only when the week has a Start Here card. */
  startHere?: StartHereVM;
  /** D-199: the path tab to open. A saved choice, or the intake's AI. Absent leaves the first tab. */
  pathDefault?: Platform;
}

export interface PillVM {
  n: number;
  title: string;
  status: 'done' | 'progress' | 'waiting' | 'idle';
  on: boolean;
  href: string;
  aria: string;
  /** D-199: the operator's count on this step, for the owner. Read-only. */
  note?: string;
}

export interface CheckSubVM {
  id: string;
  label: string;
  checked: boolean;
}

export interface CalloutVM {
  kind: CalloutBlock['kind'];
  label: string;
  text: string;
  /** D-193: set only when this callout holds the first use of a term. */
  spans?: GlossarySpan[];
}

export type CheckActionVM =
  | { type: 'download'; files: { id: string; title: string; href: string | null }[] }
  | { type: 'copy'; label: string; text: string }
  | { type: 'invite'; label: string; href: string }
  | { type: 'calendar'; event: IcsEvent | null }
  | { type: 'link'; label: string; href: string };

export interface CheckItemVM {
  id: string;
  title: string;
  detail: string | null;
  role: string | null;
  checked: boolean;
  /** The step number this item is waiting on, when a cross-step dependency is not checked yet. */
  waiting: number | null;
  optional: boolean;
  clickPath: string[];
  playLabel: string | null;
  playSeconds: number | null;
  /** The video id, when the item names one. Absent means the first video on the path. */
  playVideo: string | null;
  /** Set when the item checks itself once its video is watched to a fraction. */
  autoLabel: string | null;
  action: CheckActionVM | null;
  subchecks: CheckSubVM[];
  callouts: CalloutVM[];
  /** D-193: set only when this title or detail holds the first use of a term. */
  titleSpans?: GlossarySpan[];
  detailSpans?: GlossarySpan[];
  /** D-193: the Know These card. Missing ids are already dropped. Absent when there is nothing to list. */
  card?: { id: string; term: string; short: string }[];
  /** D-199: the operator's count, on an Operator item. Read-only. */
  note?: string;
}

export interface AccordionVM {
  index: number;
  title: string;
  body: string[];
  table: { head?: string[]; rows: string[][] } | null;
  link: { label: string; href: string } | null;
  open: boolean;
  prefKey: string;
}

export interface ChecklistLayoutVM {
  eyebrow: string;
  time: string | null;
  role: string | null;
  progress: { done: number; total: number; label: string };
  countdown: string | null;
  videos: VideoBlock[];
  leading: CalloutVM[];
  items: CheckItemVM[];
  extras: ContentBlock[];
  accordions: AccordionVM[];
  /** Staff preview never gates. A learner who still has items left cannot mark the step done. */
  gate: { locked: boolean; reason: string | null };
  next: { href: string; title: string; meta: string } | null;
  due: string | null;
  jumps: { id: string; label: string }[];
  /** D-193: first-use marks for `extras`, aligned with that list. Absent when the course has no glossary. */
  extraMarks?: (GlossarySpan[] | undefined)[];
}

/** Kit items on this step, kept with the platform the builder set, so a tab can filter them. */
export interface StepAside {
  skills: KitRowVM[];
  kit: { platform: CourseKitItem['platform']; row: KitRowVM }[];
}

export interface StepVMOptions {
  fileUrl?: (id: string) => string | null;
  /** The path tab to filter kit items by. Omit it for the step's first tab, or null when it has none. */
  tab?: Platform | null;
  /** This learner’s checklist boxes and accordion memory. Omit them and every box is unchecked. */
  checks?: readonly ChecklistMark[];
  prefs?: readonly CoursePref[];
  /** This learner’s place in the week’s videos. Omit it and nothing resumes. */
  videoProgress?: readonly { videoId: string; maxPct: number; lastPositionS: number; moduleId: string }[];
  /** D-199: the team's intake answers, when this viewer may see them. */
  intake?: Readonly<Record<string, string | string[]>>;
  /** D-199: the operator's checklist count per step, for the owner. Read-only. */
  operator?: { name: string; byStep: Readonly<Record<string, { done: number; total: number }>> } | null;
}

export type StepPageVM = StepVM | { kind: 'missing'; href: string };

const ORDER: readonly Platform[] = ['claude', 'chatgpt'];
const pathsOf = (p: StepPaths | undefined): Partial<Record<Platform, PathBlock[]>> => {
  const out: Partial<Record<Platform, PathBlock[]>> = {};
  for (const k of ORDER) if (p?.[k]?.blocks.length) out[k] = p[k]!.blocks;
  return out;
};

/** The step number in `/learn/week/0/step/3`, or null. */
export function stepParam(param: string | undefined): number | null {
  return /^\d{1,2}$/.test(param ?? '') && Number(param) > 0 ? Number(param) : null;
}

/**
 * A kit item belongs on the open path tab when its platform is unset or both, or equals the tab.
 * A step with no path tabs has no tab to filter by, so every item placed on it stays (D-189).
 */
export function kitOnTab(platform: CourseKitItem['platform'], tab: Platform | null): boolean {
  if (platform === null || platform === 'both' || tab === null) return true;
  return platform === tab;
}

/** "For this step" for one path tab: linked skills with a Library page, then this step's kit items. */
export function asideRows(aside: StepAside, tab: Platform | null): KitRowVM[] {
  return [...aside.skills, ...aside.kit.filter((k) => kitOnTab(k.platform, tab)).map((k) => k.row)];
}

function asideOf(w: OpenCourseWeek, steps: readonly LearnerStep[], s: LearnerStep, copy: Record<string, string> | undefined, fileUrl: (id: string) => string | null): StepAside {
  const skills = skillsForStep(w, s)
    .filter((k) => inLibrary(k.route))
    .map((k) => skillRow(k, copy));
  const kit = (w.kit ?? [])
    .filter((item) => s.id !== null && item.stepId === s.id)
    .map((item) => ({ platform: item.platform, row: kitRow(item, steps, fileUrl) }));
  return { skills, kit };
}

function chosenTab(tabs: readonly Platform[], opts?: StepVMOptions): Platform | null {
  if (opts && 'tab' in opts) return opts.tab ?? null;
  return tabs[0] ?? null;
}

export function stepVM(p: CoursePayload, r: WeekRow | undefined, n: number | null, actor: Actor, now: number, opts?: StepVMOptions): StepPageVM {
  if (!r || !r.open || n === null) return { kind: 'missing', href: r ? learnWeek(r.week) : learnWeek(0) };
  const s = r.steps[n - 1];
  if (!s) return { kind: 'missing', href: learnWeek(r.week) };
  const w = r.open;
  const paths = pathsOf(s.step.paths);
  const tabs = ORDER.filter((k) => paths[k]);
  const aside = asideOf(w, r.steps, s, p.copy, opts?.fileUrl ?? (() => null));
  const base: StepVM = {
    kind: 'step',
    week: r.week,
    back: { label: r.title, href: learnWeek(r.week) },
    railLabel: `${r.title} ${STEP.steps}`,
    rail: r.steps.map((x) => {
      const state = x.done ? 'done' : x.current ? 'current' : 'todo';
      const said = x.done ? LABELS.done.toLowerCase() : x.current ? LABELS.upNext.toLowerCase() : LABELS.notStarted.toLowerCase();
      return { n: x.n, label: x.step.ch || x.step.text, state, on: x.n === s.n, href: learnStep(r.week, x.n), aria: `${LABELS.step} ${x.n}, ${stepTitle(x)}, ${said}` };
    }),
    eyebrow: `${LABELS.step} ${s.n} ${STEP.of} ${r.total}`,
    title: stepTitle(s),
    lede: s.step.goal?.trim() || stepText(s),
    meta: stepMeta(s, w.module.platform || null),
    doneWhen: s.step.doneWhen ? `${STEP.doneWhen} ${s.step.doneWhen}` : null,
    // An older week's tip, when the step has no Who or Time of its own (the new weeks' hint repeats them).
    hint: !s.step.who && !s.step.timeLabel && s.step.hint ? s.step.hint : null,
    tabs,
    paths,
    prev: s.n > 1 ? learnStep(r.week, s.n - 1) : null,
    next: s.n < r.total ? learnStep(r.week, s.n + 1) : null,
    mark: { moduleId: acceleratorModuleId(r.week), stepId: s.id, done: s.done, disabled: s.id === null || actor.kind !== 'learner' },
    forStep: asideRows(aside, chosenTab(tabs, opts)),
    aside,
    help: helpVM(p, now),
    ...checklistOf(p, r, s, actor, now, opts, p.course.glossary),
    ...(s.n === 1 && w.startHere ? { startHere: startHereCard(w.startHere, r, opts?.checks ?? []) } : {}),
    ...(() => {
      const saved = opts?.prefs?.find((p) => p.key === 'path')?.value;
      const preferred = pathFromAnswers(opts?.intake?.ai, saved);
      return preferred && tabs.includes(preferred) ? { pathDefault: preferred } : {};
    })(),
  };
  const glossary = p.course.glossary?.length ? p.course.glossary : undefined;
  const withGlossary: StepVM = glossary ? { ...base, glossary, pathMarks: pathMarksOf(paths, glossary, s.n) } : base;
  const watched = (opts?.videoProgress ?? [])
    .filter((row) => row.moduleId === acceleratorModuleId(r.week))
    .map(({ videoId, maxPct, lastPositionS }) => ({ videoId, maxPct, lastPositionS }));
  return watched.length ? { ...withGlossary, videoProgress: watched } : withGlossary;
}

/** First use in each path's paragraphs. Other blocks are not a surface, so their slot stays empty. */
function pathMarksOf(paths: Partial<Record<Platform, PathBlock[]>>, glossary: readonly GlossaryTerm[], step: number): Partial<Record<Platform, (GlossarySpan[] | undefined)[]>> {
  const out: Partial<Record<Platform, (GlossarySpan[] | undefined)[]>> = {};
  for (const k of ORDER) {
    const blocks = paths[k];
    if (blocks) out[k] = markSequence(blocks.map((b) => (b.type === 'text' ? b.text : null)), glossary, step);
  }
  return out;
}

const DAY = 86_400_000;

/**
 * A course due instant, always Mountain Time with "MT". `fmt.time` follows the viewer's zone and,
 * when that zone shares a clock with the program zone (Central), drops Mountain entirely
 * ("1:00 PM CT"). The course rule is the same one `mountainWhen` uses for a week's opening.
 */
function dueLine(dueAt: number): string {
  const [day, time] = mountainWhen(dueAt).split(' · ');
  return `${day}, ${time}`;
}

function countdown(dueAt: number, now: number): string {
  const when = dueLine(dueAt);
  const days = Math.ceil((dueAt - now) / DAY);
  if (days <= 0) return `${STEP.due} · ${when}`;
  if (days === 1) return `1 ${STEP.dayLeft} · ${when}`;
  return `${days} ${STEP.daysLeft} · ${when}`;
}

function calloutVM(b: CalloutBlock): CalloutVM {
  return { kind: b.kind, label: CALLOUT_LABEL[b.kind], text: b.text };
}

function actionVM(action: CheckAction | undefined, kit: readonly CourseKitItem[], fileUrl: (id: string) => string | null, sessions: readonly CourseSession[]): CheckActionVM | null {
  if (!action || action.type === 'card') return null;
  if (action.type === 'form') {
    if (action.formId === 'intake') return { type: 'link', label: action.label || 'Open the form', href: learnIntake() };
    return { type: 'link', label: action.label || 'Open the form', href: learnStack() };
  }
  if (action.type === 'download') {
    const files = action.kitItemIds.flatMap((id) => {
      const item = kit.find((k) => k.id === id);
      return item ? [{ id, title: item.title, href: fileUrl(id) }] : [];
    });
    return files.length ? { type: 'download', files } : null;
  }
  if (action.type === 'copy') return { type: 'copy', label: action.label || STEP.copy, text: action.text };
  if (action.type === 'invite') return { type: 'invite', label: action.label || STEP.invite, href: learnTeam() };
  if (action.type === 'link') return { type: 'link', label: action.label, href: action.href };
  const session = sessions.find((x) => x.id === action.sessionId);
  return { type: 'calendar', event: session ? (icsEvents([session])[0] ?? null) : null };
}

function itemVM(b: CheckBlock, callouts: CalloutBlock[], isOn: (stepId: string, itemId: string) => boolean, stepId: string, waiting: (b: CheckBlock) => number | null, kit: readonly CourseKitItem[], fileUrl: (id: string) => string | null, sessions: readonly CourseSession[], glossary: readonly GlossaryTerm[] | undefined, answers?: Readonly<Record<string, string | string[]>>, operatorNote?: string): CheckItemVM {
  const subs = (b.subchecks ?? []).map((sub) => ({ id: sub.id, label: sub.label, checked: isOn(stepId, `${b.id}:${sub.id}`) }));
  const listed = b.action?.type === 'card' ? cardTerms(b.action.terms, glossary) : [];
  const folded = conditionMet(b.collapseIf, answers);
  const shown = callouts.filter((c) => !c.showIf || !answers || conditionMet(c.showIf, answers));
  const note = b.role === 'operator' && operatorNote ? operatorNote : undefined;
  return {
    id: b.id,
    title: b.title,
    detail: folded ? (b.collapsedNote ?? b.detail ?? null) : (b.detail ?? null),
    role: b.role ? (ROLE_LABEL[b.role] ?? null) : null,
    checked: folded || itemChecked(b, (itemId) => isOn(stepId, itemId)),
    ...(note ? { note } : {}),
    waiting: waiting(b),
    optional: !!b.optional,
    clickPath: b.clickPath ?? [],
    playLabel: b.playAt ? `${STEP.playAt} ${fmt.clock(b.playAt.t)}` : null,
    playSeconds: b.playAt ? b.playAt.t : null,
    playVideo: b.playAt?.video ?? null,
    autoLabel: b.auto ? `${STEP.checksItself} ${Math.round(watchThreshold(b.auto.at) * 100)}%` : null,
    action: actionVM(b.action, kit, fileUrl, sessions),
    subchecks: subs,
    callouts: shown.map(calloutVM),
    ...(listed.length ? { card: listed } : {}),
  };
}

function layoutFor(blocks: readonly PathBlock[], ctx: LayoutCtx): ChecklistLayoutVM {
  const regions = pathRegions(blocks);
  const counts = progressCounts(blocks, (itemId) => ctx.isOn(ctx.stepId, itemId), ctx.answers);
  const remaining = gateRemaining(blocks, (itemId) => ctx.isOn(ctx.stepId, itemId), ctx.answers);
  const locked = !ctx.staff && !ctx.done && remaining > 0;
  const jumps: { id: string; label: string }[] = [];
  if (regions.videos.length) jumps.push({ id: 'step-watch', label: STEP.watch });
  if (regions.groups.length || regions.leading.length) jumps.push({ id: 'step-checklist', label: STEP.yourChecklist });
  if (regions.accordions.length) jumps.push({ id: 'step-reference', label: STEP.reference });
  const tasks = counts.tasks;
  const shows = (c: CalloutBlock): boolean => !c.showIf || !ctx.answers || conditionMet(c.showIf, ctx.answers);
  const leading = regions.leading.filter(shows).map(calloutVM);
  const items = regions.groups.filter((g) => checkVisible(g.item, ctx.answers)).map((g) => itemVM(g.item, g.callouts.filter(shows), ctx.isOn, ctx.stepId, ctx.waiting, ctx.kit, ctx.fileUrl, ctx.sessions, ctx.glossary, ctx.answers, ctx.operatorNote));
  const extraMarks = applyGlossary(leading, items, regions.extras, ctx.glossary, ctx.n);
  return {
    eyebrow: `${STEP.week} ${ctx.week} · ${LABELS.step} ${ctx.n}`,
    time: ctx.time,
    role: ctx.who,
    progress: {
      done: counts.done,
      total: counts.total,
      label: tasks ? `${counts.done} ${STEP.of} ${counts.total} ${STEP.tasksTimed}` : `${counts.done} ${STEP.of} ${counts.total} ${STEP.checkedWord}`,
    },
    countdown: tasks && ctx.dueAt !== null ? countdown(ctx.dueAt, ctx.now) : null,
    videos: regions.videos,
    leading,
    items,
    extras: regions.extras,
    accordions: regions.accordions.map((b, index) => {
      const prefKey = `acc:${ctx.moduleId}:${ctx.stepId}:${index}`;
      return {
        index,
        title: b.title,
        body: b.body,
        table: b.table ?? null,
        link: b.link ?? null,
        open: ctx.prefs.some((p) => p.key === prefKey && p.value === '1'),
        prefKey,
      };
    }),
    gate: {
      locked,
      reason: locked
        ? (remaining === 1 ? `${STEP.checkOff} ${STEP.oneMore}` : `${STEP.checkOff} ${remaining} ${STEP.moreToGo}`)
        : (ctx.done && ctx.next ? `${STEP.niceWork} ${ctx.n + 1} ${STEP.isNext}` : null),
    },
    next: ctx.next,
    due: ctx.dueAt !== null ? `${STEP.due} ${dueLine(ctx.dueAt)}` : null,
    jumps,
    ...(extraMarks ? { extraMarks } : {}),
  };
}

/**
 * First use across the checklist page, in the order it is drawn: leading callouts, then each item's
 * title, detail and callouts, then paragraph extras. A copy box, a list, a table and a heading are
 * not surfaces. Returns the extra marks only when the course has a glossary.
 */
function applyGlossary(leading: CalloutVM[], items: CheckItemVM[], extras: readonly ContentBlock[], glossary: readonly GlossaryTerm[] | undefined, step: number): (GlossarySpan[] | undefined)[] | undefined {
  if (!glossary?.length) return undefined;
  const texts: (string | null)[] = [];
  for (const c of leading) texts.push(c.text);
  for (const item of items) {
    texts.push(item.title);
    texts.push(item.detail);
    for (const c of item.callouts) texts.push(c.text);
  }
  for (const b of extras) texts.push(b.type === 'text' ? b.text : null);
  const marks = markSequence(texts, glossary, step);
  let i = 0;
  for (const c of leading) {
    const spans = marks[i++];
    if (spans) c.spans = spans;
  }
  for (const item of items) {
    const title = marks[i++];
    const detail = marks[i++];
    if (title) item.titleSpans = title;
    if (detail) item.detailSpans = detail;
    for (const c of item.callouts) {
      const spans = marks[i++];
      if (spans) c.spans = spans;
    }
  }
  return extras.map(() => marks[i++]);
}

interface LayoutCtx {
  week: number;
  n: number;
  moduleId: string;
  stepId: string;
  time: string | null;
  who: string | null;
  done: boolean;
  staff: boolean;
  now: number;
  dueAt: number | null;
  isOn: (stepId: string, itemId: string) => boolean;
  waiting: (b: CheckBlock) => number | null;
  kit: readonly CourseKitItem[];
  fileUrl: (id: string) => string | null;
  sessions: readonly CourseSession[];
  prefs: readonly CoursePref[];
  next: { href: string; title: string; meta: string } | null;
  glossary?: readonly GlossaryTerm[];
  answers?: Readonly<Record<string, string | string[]>>;
  operatorNote?: string;
}

/**
 * The one-step layout, only when this week has a checklist item somewhere. A week without one gets
 * nothing added, so the view-model matches the one the step player already had.
 */
function checklistOf(p: CoursePayload, r: WeekRow, s: LearnerStep, actor: Actor, now: number, opts: StepVMOptions | undefined, glossary: readonly GlossaryTerm[] | undefined): { pills: PillVM[]; layouts: Partial<Record<Platform, ChecklistLayoutVM>> } | Record<string, never> {
  if (!r.open || !weekHasCheck(r.steps.map((x) => x.step))) return {};
  const moduleId = acceleratorModuleId(r.week);
  const checks = opts?.checks ?? [];
  const isOn = (stepId: string, itemId: string): boolean => checks.some((c) => c.moduleId === moduleId && c.stepId === stepId && c.itemId === itemId && c.checked);
  const blocksOf = (step: LearnerStep): PathBlock[] => [...(step.step.paths?.claude?.blocks ?? []), ...(step.step.paths?.chatgpt?.blocks ?? [])];
  const hasItem = (step: LearnerStep, itemId: string): boolean =>
    blocksOf(step).some((b) => b.type === 'check' && (b.id === itemId || (b.subchecks ?? []).some((sub) => sub.id === itemId)));
  const waitingOf = (b: CheckBlock): number | null =>
    waitingOn(b.dependsOn, (stepN, itemId) => {
      const other = r.steps[stepN - 1];
      if (!other?.id || !hasItem(other, itemId)) return false;
      return isOn(other.id, itemId);
    });
  const statusOf = (step: LearnerStep): PillVM['status'] => {
    if (step.done) return 'done';
    const items = blocksOf(step).filter((b): b is CheckBlock => b.type === 'check');
    const touched = !!step.id && checks.some((c) => c.moduleId === moduleId && c.stepId === step.id && c.checked);
    if (touched || items.some((b) => itemChecked(b, (itemId) => (step.id ? isOn(step.id, itemId) : false)))) return 'progress';
    if (step.id && items.some((b) => waitingOf(b) !== null)) return 'waiting';
    return 'idle';
  };
  const said: Record<PillVM['status'], string> = { done: LABELS.done.toLowerCase(), progress: STEP.inProgress, waiting: STEP.waitingStatus, idle: STEP.notStarted };
  const lineFor = (stepId: string | null): string | undefined => {
    if (!opts?.operator || !stepId) return undefined;
    const row = opts.operator.byStep[stepId];
    if (!row || row.total < 1) return undefined;
    return `${opts.operator.name}: ${row.done} of ${row.total}`;
  };
  const pills: PillVM[] = r.steps.map((x) => {
    const note = lineFor(x.id);
    return {
      n: x.n,
      title: stepTitle(x),
      status: statusOf(x),
      on: x.n === s.n,
      href: learnStep(r.week, x.n),
      aria: `${LABELS.step} ${x.n}, ${stepTitle(x)}, ${said[statusOf(x)]}`,
      ...(note ? { note } : {}),
    };
  });
  const fileUrl = opts?.fileUrl ?? (() => null);
  const nextStep = r.steps[s.n];
  const next = nextStep
    ? { href: learnStep(r.week, nextStep.n), title: `${LABELS.step} ${nextStep.n} · ${stepTitle(nextStep)}`, meta: [nextStep.step.who, nextStep.step.timeLabel].filter((x): x is string => !!x).join(' · ') }
    : null;
  const ctxBase = {
    week: r.week,
    n: s.n,
    moduleId,
    stepId: s.id ?? '',
    time: s.step.timeLabel ?? null,
    who: s.step.who ?? null,
    done: s.done,
    staff: actor.kind !== 'learner',
    now,
    dueAt: r.module?.dueAt ?? null,
    isOn,
    waiting: waitingOf,
    kit: r.open.kit ?? [],
    fileUrl,
    sessions: p.sessions,
    prefs: opts?.prefs ?? [],
    next,
    ...(glossary?.length ? { glossary } : {}),
    ...(opts?.intake ? { answers: opts.intake } : {}),
    ...(lineFor(s.id) ? { operatorNote: lineFor(s.id) } : {}),
  };
  const layouts: Partial<Record<Platform, ChecklistLayoutVM>> = {};
  for (const k of ORDER) {
    const blocks = s.step.paths?.[k]?.blocks;
    if (pathHasCheck(blocks)) layouts[k] = layoutFor(blocks!, ctxBase);
  }
  return { pills, layouts };
}
