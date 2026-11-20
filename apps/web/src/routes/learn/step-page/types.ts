// The props of <StepPage> (v6), typed from the handoff's sample-data.js (handoff/step-page-v6/src/sample-data.js),
// which follows the LMS view-models in ../Step.vm.ts. StepPage.vm.ts fills them from the real loader.

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
}

export type SpAction =
  | { type: 'play'; label: string; seconds: number }
  | { type: 'card'; openLabel: string; closeLabel: string }
  | { type: 'calendar'; label: string; onClick?: () => void }
  | { type: 'link'; label: string; href: string };

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
  autoLabel?: string | null;
  card?: { id: string; term: string; short: string }[];
  subchecks: SpSubcheck[];
  callouts: SpCallout[];
}

export interface SpAccordion {
  index: number;
  title: string;
  open: boolean;
  body: string[];
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
}
