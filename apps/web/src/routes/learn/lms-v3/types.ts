// D-225: the props of the v3 components, as `handoff/lms-v3/src/sample-data.js` and HANDOFF.md §2 describe them.
// Types only: the components are the package's, converted to TSX and nothing else.
import type { MouseEvent } from 'react';
import type { CalItem } from './CalMenu';
import type { SessionState } from './session';

export type StepStatus = 'done' | 'progress' | 'waiting' | 'idle';
export type Role = 'owner' | 'operator';

export interface WeekStep {
  n: number;
  title: string;
  href: string;
  role: string;
  who: Role[];
  time: string;
  minutes: number;
  doneWhen: string;
  status: StepStatus;
  waitsOn?: number;
}

export interface KitAct {
  icon: string;
  label: string;
  act?: string;
  copyText?: string;
  onClick?: (e?: MouseEvent) => void;
}

export interface KitRow {
  icon: string;
  title: string;
  meta: string;
  href?: string;
  form?: string;
  tags?: { label: string; hi?: boolean }[];
  acts?: KitAct[];
}

export type RefBlock =
  | { type: 'ul'; items: string[] }
  | { type: 'fine'; text: string }
  | { type: 'scale'; items: [number | string, string][] }
  | { type: 'dl'; rows: { dt: string; dd: string | string[]; small?: string }[] };

export interface WeekProps {
  n: number;
  title: string;
  open: boolean;
  question: string;
  purpose: string;
  crumbs: { label: string; href?: string }[];
  tags: { icon: string; label: string }[];
  steps: WeekStep[];
  roles: { id: string; label: string; count: number; summary: string }[];
  deployed: boolean;
  deployedWhen: string;
  platform: string;
  next: { n: number; title: string; href: string };
  libraryHref: string;
  supportEmail: string;
  note: { initials: string; name: string; text: string } | null;
  kit: { label: string; rows: KitRow[] }[];
  reference: { title: string; blocks: RefBlock[] }[];
}

/** The chrome words (sample-data.js › sampleLabels). */
export interface WeekLabels {
  open: string; upNext: string; doneWhen: string; deployedWhen: string;
  start: string; continue: string; markDeployed: string; undo: string;
  deployed: string; deployedTitle: string;
  stepsDone: string; allDone: string;
  stepsTitle: string; showStepsFor: string;
  done: string; inProgress: string; waitingOn: string; ready: string;
  forThisWeek: string; inStepOrder: string; openLibrary: string; copied: string;
  instructorNote: string; whyThisWeek: string; questions: string;
  reference: string; nextWeek: string;
}

/** What the page works out from `steps` (one source: the hero, the list and the finish row read it). */
export interface WeekView {
  nextI: number;
  allDone: boolean;
  deployed: boolean;
  doneN: number;
  left: number;
}

export interface ScheduleSession {
  icon: string;
  title: string;
  when?: string;
  id?: string;
  state?: SessionState;
  replayHref?: string;
}

export interface ScheduleWeekRow {
  week: number;
  title: string;
  href: string;
  tile: [string, string];
  outcome: string;
  sessions: ScheduleSession[];
  live?: boolean;
  status?: 'idle' | 'progress' | 'done';
  done?: number;
  total?: number;
  next?: boolean;
  locked?: boolean;
  break?: undefined;
}
export type ScheduleRow = ScheduleWeekRow | { break: string; text: string };

export interface ScheduleNext {
  week: number;
  kind: string;
  title: string;
  day: string;
  date: string;
  when: string;
  length: string;
  where: string;
  start: string;
  minutes: number;
  joinBefore: number;
  joinHref?: string;
  weekHref: string;
  cta: string;
  calendar: CalItem[];
  mode?: 'wait' | 'join' | 'live';
}

export interface ScheduleProps {
  sub: string;
  title: string;
  calendarHref: string;
  calendarAllHref: string;
  next: ScheduleNext | null;
  groups: { label: string; note?: string; rows: ScheduleRow[] }[];
}

export interface LockedWeekProps {
  n: number;
  title: string;
  outcome: string;
  question: string;
  opens: string;
  opensAt: string;
  sessions: { title: string; kind: string; when: string; tile: [string, string] }[];
  calendarHref: string;
  back: { label: string; href: string };
  crumbs: { label: string; href?: string }[];
}

/** A form (src/forms/week-0-intake.json): the LMS's CourseIntake plus `required`, and the drawer's own words. */
export interface FormQuestion {
  id: string;
  label: string;
  help?: string;
  kind: 'short' | 'long' | 'choice' | 'multi';
  options?: string[];
  required?: boolean;
}
export interface FormUi {
  title: string; kicker: string; sub: string; submitLabel: string;
  submittedTitle: string; submittedText: string;
  optional: string; needText: string; needChoice: string;
}
export interface FormDef {
  id: string;
  ui: FormUi;
  intake: { intro?: string; sections: { title: string; intro?: string; questions: FormQuestion[] }[] };
}
export type FormAnswers = Record<string, string | string[]>;
export type FormStatus = 'new' | 'draft' | 'submitted';
export interface FormInitial { status: FormStatus; answers: FormAnswers; savedLabel?: string; submittedShort?: string }

// D-231: the Community (`handoff/lms-v3/src/components/Community.jsx`, `src/data/community.samples.json`).
export interface CommunityUi {
  title: string; lede: string; all: string; spaces: string; pinned: string; hidden: string; staff: string; threads: string; newest: string;
  none: string; start: string; space: string; threadTitle: string; titleHint: string; details: string; detailsHint: string; cohortReads: string;
  postThread: string; posted: string; postingAs: string; how: string; howLines: string[]; back: string; reply: string; replyHint: string;
  replyReads: string; postReply: string; edit: string; save: string; cancel: string; delete: string; deleteThread: string; deleteReply: string;
  edited: string; about: string; startedBy: string; lastReply: string; noReplies: string; staffOnly: string; staffSee: string; pin: string;
  unpin: string; hide: string; show: string; hideThread: string; showThread: string; needSpace: string; needTitle: string; needDetails: string;
  needReply: string; justNow: string;
}
export interface CmPerson { name: string; team: string; initials: string; staff?: boolean }
export interface CmSpace { id: string; label: string }
/** A list row, in activity order. */
export interface CmThreadRow { id: number | string; href: string; space: string; title: string; pinned?: boolean; hidden?: boolean; activity: string; replies: number; excerpt: string; by: string }
/** A post this viewer may see. `fresh`: it was just posted, and rises in. */
export interface CmPost { id: number | string; by: string; when: string; body: string; edited?: boolean; hidden?: boolean; fresh?: boolean }
export interface CmThread { id: number | string; space: string; spaceLabel: string; title: string; pinned?: boolean; hidden?: boolean; posts: CmPost[] }

// D-230: Turn in (`handoff/lms-v3/src/components/TurnIn.jsx`, `src/data/turn-in.samples.json`).
export interface TiKind { title: string; sub: string; noteLabel: string; privacy?: string; minutesLabel?: string; minutesHint?: string }
export interface TurnInUi {
  turnIn: string; view: string; agent: string; drop: string; or: string; choose: string; types: string; uploaded: string; remove: string;
  submit: string; submitted: string; done: string; newVersion: string; sentTo: string; bannerTitle: string; files: string; by: string;
  needFile: string; wait: string; tooMany: string; badType: string; tooBig: string;
  kinds: Record<'live_read' | 'checkpoint', TiKind>;
}
/** One step that asks for a file: `id` is its kind. */
export interface TiAsk { id: string; kind: 'live_read' | 'checkpoint'; step: number; kicker: string }
/** What the team turned in last for an ask. Never what staff did with it. */
export interface TiSub { files: { name: string; size: string; href?: string }[]; note: string; minutes: string; by: string; when: string }
/** A file as the drawer hands it to `onSubmit`. */
export interface TiFileIn { name: string; size: string; file: File }
