// The props of <StepPage> (v6), typed from the handoff's sample-data.js (handoff/step-page-v6/src/sample-data.js),
// which follows the LMS view-models in ../Step.vm.ts. StepPage.vm.ts fills them from the real loader.
// D-210: the optional fields carry what the mockup did not draw (a path's extra content, every item action,
// sub-checks, waiting and optional items, accordion tables and links, kit rows and files, a step with no checklist).
import type { ReactNode } from 'react';

/** One of the mockup's sprite icons (Icons.tsx). */
export type SpIcon =
  | 'left' | 'right' | 'arrow' | 'chev' | 'play' | 'clock' | 'users' | 'user' | 'cal' | 'calplus' | 'lines' | 'copy'
  | 'down' | 'check' | 'x' | 'book' | 'info' | 'alert' | 'key' | 'eye' | 'mail' | 'radio' | 'link';

/** PillVM-like: status is the LMS's own words; `on` marks the current step. */
export interface SpPill {
  n: number;
  title: string;
  status: 'done' | 'progress' | 'waiting' | 'idle';
  on: boolean;
  href: string;
}

export interface SpChapter {
  t: number;
  label: string;
}

export interface SpCue {
  s: number;
  e: number;
  text: string;
}

export interface SpVideo {
  id: string;
  title: string;
  sectionLength?: string;
  clock?: string;
  durationS?: number;
  playLabel: string;
  src?: string;
  type?: string;
  poster?: string;
  captions?: string;
  ariaLabel?: string;
  chapters: SpChapter[];
  cues: SpCue[];
  /** The item that checks itself at `autoAt` of the video. */
  autoCheckItem?: string;
  autoAt?: number;
}

export interface SpCallout {
  kind: 'tip' | 'heads_up' | 'diy';
  label: string;
  text: string;
  /** Rich text or glossary marks, drawn in place of `text`. */
  node?: ReactNode;
}

export type SpAction =
  | { type: 'play'; label: string; seconds: number; video?: string | null }
  | { type: 'card'; openLabel: string; closeLabel: string }
  | { type: 'calendar'; label: string; onClick?: () => void }
  | { type: 'link'; label: string; href: string }
  | { type: 'download'; files: { id: string; title: string; href: string | null }[] }
  | { type: 'copy'; label: string; text: string }
  | { type: 'invite'; label: string; href: string }
  /** D-230: Turn in, the step page's own button; for a teammate who can't turn in, a line in its place (B-26). */
  | { type: 'upload'; label: string; onClick: () => void }
  /** D-236: the seat card form's button, drawn as a form's (the step page's arrow button); it opens the drawer. */
  | { type: 'form'; label: string; onClick: () => void }
  | { type: 'line'; text: string };

export interface SpSubcheck {
  id: string;
  label: string;
  checked: boolean;
}

export interface SpItem {
  id: string;
  title: string;
  role: string | null;
  detail: string | null;
  checked: boolean;
  action: SpAction | null;
  /** A second action beside the first (a play button next to a download, say). */
  extra?: SpAction | null;
  autoLabel?: string | null;
  card?: { id: string; term: string; short: string }[];
  subchecks: SpSubcheck[];
  callouts: SpCallout[];
  /** Rich text or glossary marks, drawn in place of `title` / `detail`. */
  titleNode?: ReactNode;
  detailNode?: ReactNode;
  /** The step number this item waits on, while that step's item is not checked. */
  waiting?: number | null;
  optional?: boolean;
  /** Where to click, in order ("Settings", "Capabilities"). */
  clickPath?: string[];
  /** The operator's count, read-only. */
  note?: string;
}

export interface SpAccordion {
  index: number;
  title: string;
  open: boolean;
  body: string[];
  bodyNode?: ReactNode;
  table?: { head?: string[]; rows: string[][] } | null;
  link?: { label: string; href: string } | null;
}

export interface SpLink {
  label: string;
  href: string;
}

export interface SpNext {
  n: number;
  title: string;
  meta: string;
  href: string;
}

export interface SpForStep {
  id: string;
  icon: SpIcon;
  title: string;
  meta: string;
  view: boolean;
  onView?: () => void;
  copyText: string | null;
  /** A row that opens somewhere (a Library page, a file): View goes there. */
  href?: string | null;
  /** A row that downloads (a kit file): its Download button. */
  download?: { label: string; href: string | null } | null;
  /** The prompt's fill-ins ({{TEAM_NAME}}), shown under the row. */
  vars?: string[];
  tags?: string[];
}

export interface SpHelp {
  icon: SpIcon;
  title: string;
  meta: string;
  href: string;
}

export interface SpStep {
  week: number;
  n: number;
  back: SpLink;
  railLabel: string;
  pills: SpPill[];
  eyebrow: string;
  title: string;
  lede: string | null;
  tags: { icon: SpIcon; label: string }[];
  video: SpVideo | null;
  items: SpItem[];
  accordions: SpAccordion[];
  stepDone: boolean;
  next: SpNext | null;
  due: string | null;
  jumps: { id: string; label: string }[];
  forStep: SpForStep[];
  help: SpHelp[];
  /** The step's paths (Claude, ChatGPT) when it has more than one, the open one, and how to switch. */
  tabs?: { id: string; label: string }[];
  tab?: string;
  tabsLabel?: string;
  onTab?: (id: string) => void;
  /** Drawn above Watch: the live session, step 1's Start Here card, the path's leading callouts. */
  lead?: ReactNode;
  /** Drawn at the top of the checklist: the path's leading callouts. */
  leading?: ReactNode;
  /** Drawn under the checklist: the path's other content (paragraphs, lists, tables, copy blocks, more videos). */
  extras?: ReactNode;
  /** A step with no checklist: its content, under a "Do this" heading, and the line under Mark step done. */
  blocks?: ReactNode;
  doneWhen?: string | null;
  /** A Reference row opened or closed (remembered per learner). */
  onAccordion?: (index: number, open: boolean) => void;
  /** Mark step done can't be used here (staff, a preview). */
  markDisabled?: boolean;
}

/** The chrome words, as the mockup prints them. */
export interface SpLabels {
  watch: string;
  chapters: string;
  scrollLeft: string;
  scrollRight: string;
  scrollStepsLeft: string;
  scrollStepsRight: string;
  showTranscript: string;
  hideTranscript: string;
  copyTranscript: string;
  copied: string;
  copy: string;
  view: string;
  backToCurrent: string;
  transcript: string;
  yourChecklist: string;
  reference: string;
  onThisPage: string;
  checklist: string;
  forStep: string;
  stillStuck: string;
  markDone: string;
  stepDone: string;
  undo: string;
  nextKicker: string;
  checkProgress: string;
  checked: string;
  of: string;
  doThis?: string;
  download?: string;
  downloaded?: string;
  waiting?: string;
  checkAnyway?: string;
  notNow?: string;
  optional?: string;
  fillIn?: string;
  open?: string;
}
