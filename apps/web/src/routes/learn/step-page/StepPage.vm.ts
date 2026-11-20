// The v6 step page's props from the step player's own view-model (HANDOFF §5): StepVM and its checklist
// layout for the open path. Pure, so the mapping is unit-tested; the screen (StepPageRoute.tsx) adds the
// handlers, the video's learned length and its transcript.
//
// The v6 page draws only what the mockup draws. `v6Covers` says whether a step's content is all of that
// kind; a step with anything else (path tabs, Start Here, a download, a waiting item, a table…) keeps
// the step player it has today, so nothing the mockup never designed is styled from a description.

import type { BuildKitVM } from '../WeekContent.vm';
import type { KitRowVM } from '../learn.vm';
import type { ChecklistLayoutVM, CheckItemVM, StepVM } from '../Step.vm';
import { watchLength } from '../Step.vm';
import { clock } from './motion';
import type { SpAction, SpCue, SpForStep, SpHelp, SpItem, SpLabels, SpStep, SpVideo } from './types';

/** The chrome words, exactly as the mockup prints them (handoff/step-page-v6/src/sample-data.js › sampleLabels). */
export const V6_LABELS: SpLabels = {
  watch: 'Watch',
  chapters: 'Chapters',
  scrollLeft: 'Scroll chapters left',
  scrollRight: 'Scroll chapters right',
  scrollStepsLeft: 'Scroll steps left',
  scrollStepsRight: 'Scroll steps right',
  showTranscript: 'Show transcript',
  hideTranscript: 'Hide transcript',
  copyTranscript: 'Copy transcript',
  copied: 'Copied',
  copy: 'Copy',
  view: 'View',
  backToCurrent: 'Back to current',
  transcript: 'Transcript',
  yourChecklist: 'Your checklist',
  reference: 'Reference',
  onThisPage: 'On this page',
  checklist: 'Checklist',
  forStep: 'For this step',
  stillStuck: 'Still stuck?',
  markDone: 'Mark step done',
  stepDone: 'Step done',
  undo: 'Undo',
  nextKicker: 'Next',
  checkProgress: 'Checklist progress',
  checked: 'checked',
  of: 'of',
};

/** Words the mockup prints that are not chrome labels in the source's `labels`. */
export const V6_WORDS = {
  systemPrompt: 'System prompt',
  addToCalendar: 'Add to calendar',
  play: 'Play',
  open: 'Open the',
  hide: 'Hide the',
  words: 'words',
  week: 'Week',
  steps: 'steps',
} as const;

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const countWord = (n: number): string => NUMBER_WORDS[n] ?? String(n);

/** The section ids the v6 page renders (#watch, #checklist, #reference) for the layout's jump ids. */
const JUMP_ID: Record<string, string> = { 'step-watch': 'watch', 'step-checklist': 'checklist', 'step-reference': 'reference' };
const JUMP_LABEL: Record<string, string> = { watch: V6_LABELS.watch, checklist: V6_LABELS.yourChecklist, reference: V6_LABELS.reference };

/** Why a step stays on today's player, or null when the v6 page draws every piece of it. */
export function v6Gap(
  vm: StepVM,
  layout: ChecklistLayoutVM | undefined,
  kit: BuildKitVM | null,
  forStep: readonly KitRowVM[],
  videoKind: 'file' | 'hls' | 'link' | null,
): string | null {
  if (!vm.pills || !layout) return 'not a checklist step';
  if (vm.tabs.length > 1) return 'path tabs';
  if (vm.startHere) return 'Start Here card';
  if (layout.leading.length) return 'leading callout';
  if (layout.extras.length) return 'extra content';
  if (layout.videos.length > 1) return 'more than one video';
  const block = layout.videos[0];
  if (block) {
    if (videoKind !== 'file' && videoKind !== 'hls') return 'video link';
    if (block.draft) return 'draft video';
    if (!block.chapters?.length) return 'video without chapters';
    if (!block.transcript) return 'video without a transcript';
  }
  if (layout.accordions.some((a) => a.table || a.link)) return 'accordion table or link';
  if (forStep.length) return 'linked skill or kit row';
  if (kit && (kit.files.length || (kit.prompt && kit.prompt.vars.length))) return 'build kit files or fill-ins';
  for (const item of layout.items) {
    if (item.waiting !== null) return 'waiting item';
    if (item.optional) return 'optional item';
    // <StepPage> draws sub-checks but passes no handler for them, so a step with sub-checks keeps today's player.
    if (item.subchecks.length) return 'sub-checks';
    if (item.note) return 'operator count';
    if (item.clickPath.length) return 'click path';
    if (item.action && item.action.type !== 'calendar' && item.action.type !== 'link') return `${item.action.type} action`;
    if (item.action && item.playLabel) return 'two actions on one item';
    if (item.action?.type === 'calendar' && !item.action.event) return 'calendar without an event';
    if (item.card?.length && (item.action || item.playLabel)) return 'two actions on one item';
  }
  return null;
}

function actionOf(item: CheckItemVM, onCalendar: (item: CheckItemVM) => void): SpAction | null {
  if (item.card?.length) {
    const n = countWord(item.card.length);
    return { type: 'card', openLabel: `${V6_WORDS.open} ${n} ${V6_WORDS.words}`, closeLabel: `${V6_WORDS.hide} ${n} ${V6_WORDS.words}` };
  }
  if (item.playLabel && item.playSeconds !== null) return { type: 'play', label: item.playLabel, seconds: item.playSeconds };
  const a = item.action;
  if (!a) return null;
  if (a.type === 'calendar') return { type: 'calendar', label: V6_WORDS.addToCalendar, onClick: () => onCalendar(item) };
  if (a.type === 'link') return { type: 'link', label: a.label, href: a.href };
  return null;
}

/** The checks-itself fraction from the item's label ("Checks itself at 90%"). */
export function autoAtOf(label: string | null): number | undefined {
  const m = label ? /(\d+(?:\.\d+)?)%/.exec(label) : null;
  return m ? Number(m[1]) / 100 : undefined;
}

export interface V6Media {
  /** The video's length once its metadata loads; null before. */
  duration: number | null;
  cues: SpCue[];
  poster: string | undefined;
  captions: string | undefined;
}

export interface V6Handlers {
  onCalendar: (item: CheckItemVM) => void;
  onViewPrompt: () => void;
}

/** <StepPage>'s `step` prop. Callers check `v6Gap` first. */
export function stepPageStep(vm: StepVM, layout: ChecklistLayoutVM, kit: BuildKitVM | null, media: V6Media, on: V6Handlers): SpStep {
  const pills = vm.pills ?? [];
  const current = pills.find((p) => p.on);
  const n = current?.n ?? 1;
  const block = layout.videos[0];
  const auto = layout.items.find((it) => it.autoLabel);
  const video: SpVideo | null = block
    ? {
        id: block.id?.trim() || 'video',
        title: vm.title,
        ...(media.duration !== null
          ? { durationS: media.duration, sectionLength: watchLength(media.duration), clock: clock(Math.round(media.duration)) }
          : {}),
        playLabel: block.title?.trim() || V6_WORDS.play,
        ...(media.poster ? { poster: media.poster } : {}),
        ...(media.captions ? { captions: media.captions } : {}),
        chapters: (block.chapters ?? []).map((c) => ({ t: c.t, label: c.label })),
        cues: media.cues,
        ...(auto ? { autoCheckItem: auto.id } : {}),
        ...(auto && autoAtOf(auto.autoLabel) !== undefined ? { autoAt: autoAtOf(auto.autoLabel)! } : {}),
      }
    : null;
  const items: SpItem[] = layout.items.map((it) => ({
    id: it.id,
    title: it.title,
    role: it.role,
    detail: it.detail,
    checked: it.checked,
    action: actionOf(it, on.onCalendar),
    ...(it.autoLabel ? { autoLabel: it.autoLabel } : {}),
    ...(it.card?.length ? { card: it.card } : {}),
    subchecks: it.subchecks.map((s) => ({ id: s.id, label: s.label, checked: s.checked })),
    callouts: it.callouts.map((c) => ({ kind: c.kind, label: c.label, text: c.text })),
  }));
  const nextPill = pills.find((p) => p.n === n + 1);
  const forStep: SpForStep[] = kit?.prompt
    ? [{ id: 'system-prompt', icon: 'key', title: V6_WORDS.systemPrompt, meta: kit.prompt.stats, view: true, onView: on.onViewPrompt, copyText: kit.prompt.text }]
    : [];
  const help: SpHelp[] = [
    { icon: 'mail', title: vm.help.email.label, meta: vm.help.email.address, href: vm.help.email.href },
    ...(vm.help.officeHours ? [{ icon: 'radio' as const, title: vm.help.officeHours.label, meta: vm.help.officeHours.meta, href: vm.help.officeHours.href }] : []),
  ];
  return {
    week: vm.week,
    n,
    back: { label: vm.back.label, href: vm.back.href },
    // The mockup's words for the rail's label ("Week 0 steps"); the old player's is the week's name.
    railLabel: `${V6_WORDS.week} ${vm.week} ${V6_WORDS.steps}`,
    pills: pills.map((p) => ({ n: p.n, title: p.title, status: p.status, on: p.on, href: p.href })),
    eyebrow: layout.eyebrow,
    title: vm.title,
    lede: vm.lede,
    tags: [
      ...(layout.time ? [{ icon: 'clock' as const, label: layout.time }] : []),
      ...(layout.role ? [{ icon: 'users' as const, label: layout.role }] : []),
      ...(layout.due ? [{ icon: 'cal' as const, label: layout.due }] : []),
    ],
    video,
    items,
    accordions: layout.accordions.map((a) => ({ index: a.index, title: a.title, open: a.open, body: a.body })),
    stepDone: vm.mark.done,
    next: layout.next && nextPill ? { n: nextPill.n, title: nextPill.title, meta: layout.next.meta, href: layout.next.href } : null,
    due: layout.due,
    jumps: layout.jumps.map((j) => {
      const id = JUMP_ID[j.id] ?? j.id;
      return { id, label: JUMP_LABEL[id] ?? j.label };
    }),
    forStep,
    help,
  };
}
