// /learn/week/:week/step/:step, the step player (D-177): artboards 08/09 of the learner mockup.
//
// PURE. A step renders from `GET /api/course`: its name, what it asks, who does it, its time, its
// done-when line and its Claude and ChatGPT paths (`StepPaths`: text, copy, list and table blocks).
// "For this step" is only this step's linked Library skills whose page exists, plus the week's kit
// items placed on this step (D-189). The learner's progress and the step's id come from the snapshot,
// so "Mark step done" writes through the portal's own `toggleStep`.

import type { Actor } from '@ai/core/mutations';
import type { PathBlock, StepPaths } from '@ai/core/course-types';
import type { CourseKitItem, OpenCourseWeek } from '@ai/core/course';
import { acceleratorModuleId } from '@ai/core/accelerator';
import type { LearnerStep } from '@ai/core/learner';
import { inLibrary } from '../course/Course.vm';
import type { CoursePayload } from '../course/Course.vm';
import { LABELS, helpVM, kitRow, skillRow, skillsForStep, stepMeta, stepText, stepTitle } from './learn.vm';
import type { HelpVM, KitRowVM, WeekRow } from './learn.vm';
import { learnStep, learnWeek } from './routes';

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
} as const;

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
  return {
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
    lede: stepText(s),
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
  };
}
