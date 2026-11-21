// The v6 step page's props from the step player's own view-model (HANDOFF §5): StepVM and its checklist
// layout for the open path. Pure, so the mapping is unit-tested; the screen (StepPageRoute.tsx) adds the
// handlers, the video's learned length and its transcript, and the renderers for rich text and content blocks.
//
// D-210: every step draws the v6 page. What the mockup did not draw (a path's extra content, every item action,
// sub-checks, waiting items, accordion tables and links, kit rows and files, a step with no checklist) maps onto
// the same pieces, styled from the mockup's own tokens and long-step styles.

import type { BuildKitVM } from '../WeekContent.vm';
import type { KitRowVM } from '../learn.vm';
import type { ChecklistLayoutVM, CheckItemVM, Platform, StepVM } from '../Step.vm';
import { PLATFORM_LABEL, STEP, asideRows, watchLength } from '../Step.vm';
import { clock } from './motion';
import type { ReactNode } from 'react';
import type { GlossarySpan } from '@ai/core/glossary';
import type { PathBlock } from '@ai/core/course-types';
import type { RichText } from '@ai/core/rich-text';
import type { SpAction, SpCallout, SpCue, SpForStep, SpHelp, SpItem, SpLabels, SpStep, SpVideo } from './types';

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
  step: 'Step',
} as const;

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const countWord = (n: number): string => NUMBER_WORDS[n] ?? String(n);

/** The section ids the v6 page renders (#watch, #checklist, #reference) for the layout's jump ids. */
const JUMP_ID: Record<string, string> = { 'step-watch': 'watch', 'step-checklist': 'checklist', 'step-reference': 'reference' };
const JUMP_LABEL: Record<string, string> = { watch: V6_LABELS.watch, checklist: V6_LABELS.yourChecklist, reference: V6_LABELS.reference };

/** Why a step stays on today's player, or null when the v6 page draws every piece of it. */
/** D-210: the v6 page draws every kind of step content, so no step keeps today's player for its content. */
export function v6Gaps(
  _vm: StepVM,
  _layout: ChecklistLayoutVM | undefined,
  _kit: BuildKitVM | null,
  _forStep: readonly KitRowVM[],
  _videoKind: 'file' | 'hls' | 'link' | null,
): string[] {
  return [];
}

/** Why a step's layout keeps today's player (the first reason), or null when the v6 page draws all of it. */
export function v6Gap(
  vm: StepVM,
  layout: ChecklistLayoutVM | undefined,
  kit: BuildKitVM | null,
  forStep: readonly KitRowVM[],
  videoKind: 'file' | 'hls' | 'link' | null,
): string | null {
  return v6Gaps(vm, layout, kit, forStep, videoKind)[0] ?? null;
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
  /** The open path, and how to switch it (absent: the step's first path). */
  on?: Platform;
  choose?: (p: Platform) => void;
  /** Whether the first video can be the page's own player: an upload or a stream (not a link), with chapters and a transcript. */
  hero?: boolean;
}

/** Renderers for what is not plain text: StepPageRoute supplies them (Glossary marks, rich text, content blocks). */
export interface V6Nodes {
  marked: (text: string, spans: readonly GlossarySpan[]) => ReactNode;
  rich: (doc: RichText, spans?: readonly GlossarySpan[]) => ReactNode;
  callouts: (list: SpCallout[]) => ReactNode;
  blocks: (blocks: readonly PathBlock[], marks?: readonly (GlossarySpan[] | undefined)[]) => ReactNode;
}

export interface V6Handlers {
  onCalendar: (item: CheckItemVM) => void;
  onViewPrompt: () => void;
  nodes?: V6Nodes;
  /**
   * D-230: Turn in, for a viewer v3 draws for (absent: an upload action draws nothing). `agent` is the line a teammate
   * who can't turn in sees in the button's place (B-26); else the button reads `labelOf(kind)` and opens the drawer.
   */
  turnIn?: { agent: string | null; labelOf: (kind: 'live_read' | 'checkpoint') => string; open: (kind: 'live_read' | 'checkpoint') => void };
}

const hasTerm = (spans?: readonly GlossarySpan[]): spans is readonly GlossarySpan[] => !!spans?.some((x) => x.kind === 'term');

/** Extra words the mockup prints only in its review section, or the step player's own words for what the mockup lacks. */
export const V6_MORE = {
  doThis: STEP.doThis,
  download: STEP.download,
  downloaded: STEP.downloaded,
  waiting: STEP.waiting,
  checkAnyway: STEP.checkAnyway,
  notNow: STEP.notNow,
  fillIn: 'Fill in',
  open: 'Open',
};

const ICON_OF: Record<string, SpForStep['icon']> = { book: 'book', play: 'play', lvCopy: 'copy', lvKey: 'key', file: 'book' };

function actionOf(a: CheckItemVM['action'], item: CheckItemVM, on: Pick<V6Handlers, 'onCalendar' | 'turnIn'>): SpAction | null {
  if (!a) return null;
  if (a.type === 'calendar') return a.event ? { type: 'calendar', label: V6_WORDS.addToCalendar, onClick: () => on.onCalendar(item) } : null;
  if (a.type === 'upload') {
    const t = on.turnIn;
    if (!t) return null;
    return t.agent !== null ? { type: 'line', text: t.agent } : { type: 'upload', label: t.labelOf(a.kind), onClick: () => t.open(a.kind) };
  }
  if (a.type === 'link') return { type: 'link', label: a.label, href: a.href };
  if (a.type === 'invite') return { type: 'invite', label: a.label, href: a.href };
  if (a.type === 'copy') return { type: 'copy', label: a.label, text: a.text };
  if (a.type === 'download') return { type: 'download', files: a.files };
  return null;
}

function itemOf(it: CheckItemVM, on: V6Handlers): SpItem {
  const n = it.card?.length ? countWord(it.card.length) : null;
  const card: SpAction | null = n ? { type: 'card', openLabel: `${V6_WORDS.open} ${n} ${V6_WORDS.words}`, closeLabel: `${V6_WORDS.hide} ${n} ${V6_WORDS.words}` } : null;
  const play: SpAction | null = it.playLabel && it.playSeconds !== null ? { type: 'play', label: it.playLabel, seconds: it.playSeconds, ...(it.playVideo ? { video: it.playVideo } : {}) } : null;
  const act = actionOf(it.action, it, on);
  const action = card ?? play ?? act;
  const extra = card ? (play ?? act) : play && act ? act : null;
  const nodes = on.nodes;
  return {
    id: it.id,
    title: it.title,
    role: it.role,
    detail: it.detail,
    checked: it.checked,
    action,
    ...(extra ? { extra } : {}),
    ...(it.autoLabel ? { autoLabel: it.autoLabel } : {}),
    ...(it.card?.length ? { card: it.card } : {}),
    subchecks: it.subchecks.map((x) => ({ id: x.id, label: x.label, checked: x.checked })),
    callouts: it.callouts.map((c) => calloutOf(c, nodes)),
    ...(nodes && hasTerm(it.titleSpans) ? { titleNode: nodes.marked(it.title, it.titleSpans) } : {}),
    ...(nodes && it.detailRich ? { detailNode: nodes.rich(it.detailRich, it.detailSpans) } : nodes && it.detail && hasTerm(it.detailSpans) ? { detailNode: nodes.marked(it.detail, it.detailSpans) } : {}),
    ...(it.waiting !== null ? { waiting: it.waiting } : {}),
    ...(it.clickPath.length ? { clickPath: it.clickPath } : {}),
    ...(it.note ? { note: it.note } : {}),
  };
}

function calloutOf(c: ChecklistLayoutVM['leading'][number], nodes?: V6Nodes): SpCallout {
  return {
    kind: c.kind,
    label: c.label,
    text: c.text,
    ...(nodes && c.rich ? { node: nodes.rich(c.rich, c.spans) } : nodes && hasTerm(c.spans) ? { node: nodes.marked(c.text, c.spans) } : {}),
  };
}

/** "For this step": the week's system prompt, its kit files, then this path's linked skills and kit rows. */
function forStepOf(vm: StepVM, kit: BuildKitVM | null, tab: Platform | null, on: V6Handlers): SpForStep[] {
  const rows: SpForStep[] = [];
  if (kit?.prompt) rows.push({ id: 'system-prompt', icon: 'key', title: V6_WORDS.systemPrompt, meta: kit.prompt.stats, view: true, onView: on.onViewPrompt, copyText: kit.prompt.text, ...(kit.prompt.vars.length ? { vars: kit.prompt.vars } : {}) });
  for (const f of kit?.files ?? []) rows.push({ id: `file:${f.key}`, icon: 'book', title: f.name, meta: f.meta, view: false, copyText: null, download: { label: f.downloadLabel, href: f.href } });
  for (const r of asideRows(vm.aside, tab)) rows.push({ id: r.key, icon: ICON_OF[r.icon] ?? 'link', title: r.title, meta: r.meta, view: !!r.href, copyText: null, href: r.href, ...(r.tags?.length ? { tags: r.tags.map((t) => t.label) } : {}) });
  return rows;
}

/** <StepPage>'s `step` prop, for a checklist path (`layout`) or a step with no checklist (no layout). */
export function stepPageStep(vm: StepVM, layout: ChecklistLayoutVM | undefined, kit: BuildKitVM | null, media: V6Media, on: V6Handlers): SpStep {
  const nodes = on.nodes;
  const pills: SpStep['pills'] = vm.pills
    ? vm.pills.map((p) => ({ n: p.n, title: p.title, status: p.status, on: p.on, href: p.href }))
    : vm.rail.map((r) => ({ n: r.n, title: r.label, status: r.state === 'done' ? 'done' : 'idle', on: r.on, href: r.href }));
  const n = vm.n;
  const tab: Platform | null = vm.tabs.length ? (media.on ?? vm.tabs[0]!) : null;
  const videos = layout?.videos ?? [];
  const block = media.hero === false ? undefined : videos[0];
  const auto = layout?.items.find((it) => it.autoLabel);
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
  const items: SpItem[] = (layout?.items ?? []).map((it) => itemOf(it, on));
  const rest = block ? videos.slice(1) : videos;
  const extraBlocks: PathBlock[] = [...rest, ...(layout?.extras ?? [])];
  const extraMarks = [...rest.map(() => undefined), ...(layout?.extraMarks ?? (layout?.extras ?? []).map(() => undefined))];
  const leading = layout?.leading.length && nodes ? nodes.callouts(layout.leading.map((c) => calloutOf(c, nodes))) : undefined;
  const extras = extraBlocks.length && nodes ? nodes.blocks(extraBlocks, extraMarks) : undefined;
  // A step with no checklist draws its path's blocks under "Do this". A step staff haven't written yet has none:
  // then there is no section, and no jump to it (no empty heading).
  const pathBlocks = vm.paths[tab ?? 'claude'] ?? Object.values(vm.paths)[0] ?? [];
  const blocks = !layout && nodes && pathBlocks.length ? nodes.blocks(pathBlocks, vm.pathMarks?.[tab ?? 'claude']) : undefined;
  const help: SpHelp[] = [
    { icon: 'mail', title: vm.help.email.label, meta: vm.help.email.address, href: vm.help.email.href },
    ...(vm.help.officeHours ? [{ icon: 'radio' as const, title: vm.help.officeHours.label, meta: vm.help.officeHours.meta, href: vm.help.officeHours.href }] : []),
  ];
  const jumps: SpStep['jumps'] = layout
    ? layout.jumps
        .map((j) => { const id = JUMP_ID[j.id] ?? j.id; return { id, label: JUMP_LABEL[id] ?? j.label }; })
        .filter((j) => j.id !== 'watch' || !!video)
    : blocks ? [{ id: 'checklist', label: V6_MORE.doThis }] : [];
  if (layout && !video && !jumps.some((j) => j.id === 'checklist') && (leading || extras)) jumps.unshift({ id: 'checklist', label: V6_LABELS.yourChecklist });
  return {
    week: vm.week,
    n,
    back: { label: vm.back.label, href: vm.back.href },
    // The mockup's words for the rail's label ("Week 0 steps"); the old player's is the week's name.
    // D-210: the rail is named for the week, as the old player's was (E-16: "Where the Money Goes steps").
    railLabel: vm.railLabel,
    pills,
    eyebrow: layout?.eyebrow ?? `${STEP.week} ${vm.week} · ${V6_WORDS.step} ${n}`,
    title: vm.title,
    lede: vm.lede,
    tags: [
      ...((layout?.time ?? vm.time) ? [{ icon: 'clock' as const, label: (layout?.time ?? vm.time)! }] : []),
      ...((layout?.role ?? vm.who) ? [{ icon: 'users' as const, label: (layout?.role ?? vm.who)! }] : []),
      ...((layout?.due ?? vm.due) ? [{ icon: 'cal' as const, label: (layout?.due ?? vm.due)! }] : []),
    ],
    video,
    items,
    accordions: (layout?.accordions ?? []).map((a) => ({
      index: a.index,
      title: a.title,
      open: a.open,
      body: a.body,
      ...(nodes && a.bodyRich ? { bodyNode: nodes.rich(a.bodyRich) } : {}),
      ...(a.table ? { table: a.table } : {}),
      ...(a.link ? { link: a.link } : {}),
    })),
    stepDone: vm.mark.done,
    next: vm.nextCard ? { n: vm.nextCard.n, title: vm.nextCard.title, meta: vm.nextCard.meta, href: vm.nextCard.href } : null,
    due: layout?.due ?? vm.due,
    jumps,
    forStep: forStepOf(vm, kit, tab, on),
    help,
    ...(leading ? { leading } : {}),
    ...(extras ? { extras } : {}),
    ...(blocks ? { blocks } : {}),
    ...(!layout ? { doneWhen: vm.doneWhen } : {}),
    ...(vm.mark.disabled ? { markDisabled: true } : {}),
    ...(vm.tabs.length > 1
      ? { tabs: vm.tabs.map((t) => ({ id: t, label: PLATFORM_LABEL[t] })), tab: tab!, tabsLabel: STEP.yourAi, onTab: (id: string) => media.choose?.(id as Platform) }
      : {}),
  };
}
