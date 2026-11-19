// The course's shapes: what the database holds for the Amplified AI Accelerator and what
// `GET /api/course` sends. Types only, no words (D-173).
//
// THE WORDS LIVE IN THE DATABASE. Admins edit them in the curriculum builder; the first copy is a
// one-time seed (`packages/core/seed/`), which runtime code never imports. A module of kind `week`
// carries its week in `AIEmployee.course` (`ModuleCourse`); the cohort carries what every week shares
// in `Cohort.course` (`CohortCourse`). `courseFromSnapshot` (course.ts) puts them back together into
// the `CourseContent` the course page renders.

import type { IconName } from './icons';
import type { Step } from './types';

export type SkillRole = 'flagship' | 'supporting' | 'optional' | 'pilot' | 'alternative';

/** A Library item, by its Library title and route. Never a new skill. */
export interface CourseSkill {
  title: string;
  route: string;
  role: SkillRole;
  /** What it does for this week, in one line. */
  use: string;
  /** Free to everyone, as the Library has it. */
  free?: boolean;
}

/**
 * One numbered setup step. `route` opens that Library item's guided setup. A step that names more
 * than one of the week's skills ("open X, Y or Z") links each of them: `route` for the first,
 * `also` for the rest, in the order the step names them.
 */
export interface SetupStep {
  text: string;
  route?: string;
  also?: string[];
}

/** One row of a run-of-show: minutes `from` to `to`, what happens and why. */
export interface AgendaItem {
  from: number;
  to: number;
  activity: string;
  why: string;
}

export interface LiveBuildPage {
  sessionId: string;
  /** The run-of-show. */
  agenda: AgendaItem[];
  lesson: string;
  exercise: string;
  /** The one required outcome. */
  required: string;
  /** The harder option, for the same outcome. */
  advanced: string;
  /** The owner approves a real run in class. */
  ownerApproval: string;
  /** Working at the end of class. */
  workingAtEnd: string[];
}

export interface OfficeHoursPage {
  sessionId: string;
  title: string;
  /** What the hour is for, beyond the standard format. */
  note: string;
  format: AgendaItem[] | null;
  /** For a goal-planning session: what you leave with. */
  outputs?: string[];
}

export interface Homework {
  /** Implemented by week's end. */
  byWeekEnd: string[];
  /** The between-session assignment. */
  assignment: string[];
  /** The acceptance test (the checkpoint). */
  acceptance: string[];
  /** What "adopted" needs beyond a passing rubric. */
  useEvidence: string;
}

// --- blocks: a step's Claude and ChatGPT paths, a sample output -----------------------------------

/** A paragraph, a copy-to-clipboard block, a list or a table: the pieces a step or a sample output is made of. */
export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'copy'; label?: string; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; head?: string[]; rows: string[][] };

// --- D-190: a checklist step (Week 0 v2). Editable in the builder; nothing here is course copy. ------

/** Who a checklist item is for. Empty means no role tag. The words Owner, Operator and Each of you are chrome. */
export type CheckRole = 'owner' | 'operator' | 'each' | '';

/**
 * A condition the builder can store now. Personalization (hide and collapse) is evaluated in a later
 * change; until then every condition is false.
 */
export interface CheckCond {
  field: string;
  equals: string;
}

/**
 * What a checklist item's button does. `form` is stored now and drawn by a later change.
 * `card` lists glossary terms (D-193). Its title is the checklist item's title.
 */
export type CheckAction =
  | { type: 'download'; kitItemIds: string[] }
  | { type: 'copy'; label: string; text: string }
  | { type: 'invite'; label?: string }
  | { type: 'calendar'; sessionId: string }
  | { type: 'link'; label: string; href: string }
  | { type: 'form'; formId: 'intake' | 'stack-card'; label: string; itemId?: string }
  | { type: 'card'; terms: string[] };

/** One line under a checklist item that has sub-checks (step 3's tasks). The item is checked when all are. */
export interface CheckSub {
  id: string;
  label: string;
}

/**
 * One checklist item. `id` is unique on the step and is never a number: nothing refers to an item by
 * its place in the list (B1). `dependsOn` may name another item on this step, or `step:N:item-id`.
 */
export interface CheckBlock {
  type: 'check';
  id: string;
  title: string;
  detail?: string;
  role?: CheckRole;
  action?: CheckAction;
  clickPath?: string[];
  /**
   * Seconds into this path's video. `video` names which one when the path has more than one
   * (the block's id). Absent means the first video on the path.
   */
  playAt?: { t: number; video?: string };
  dependsOn?: string[];
  hideIf?: CheckCond;
  collapseIf?: CheckCond;
  collapsedNote?: string;
  optional?: boolean;
  /**
   * D-191: the item checks itself when this path's video has been watched to `at`.
   * `at` is a fraction (0.9) or a percent (90). `id` names the video when the path has more than one;
   * absent means the first video on the path.
   */
  auto?: { video: true; at: number; id?: string };
  subchecks?: CheckSub[];
}

/** A note anchored to the checklist item above it. `kind` picks the label: Tip, Heads up, Doing it yourself? */
export interface CalloutBlock {
  type: 'callout';
  kind: 'tip' | 'heads_up' | 'diy';
  text: string;
}

/** A reference row, closed until the learner opens it. The open state is remembered per learner. */
export interface AccordionBlock {
  type: 'accordion';
  title: string;
  body: string[];
  table?: { head?: string[]; rows: string[][] };
  link?: { label: string; href: string };
}

// --- D-188: a video, in a step's paths and in a week's Media ----------------------------------------

/** A video file staff uploaded to the bucket: its key (minted by `POST /api/files/upload-url`), name, size and type. */
export interface VideoUpload {
  upload: string;
  name: string;
  /** Bytes. */
  size: number;
  type: 'video/mp4';
}

/** A video somewhere else, by its http(s) address: an `.mp4` or `.m3u8` plays inline, any other page opens in a new tab. */
export interface VideoLink {
  url: string;
}

/** D-191: a poster image staff uploaded for a video block. Jpeg only, through the same upload route. */
export interface VideoPoster {
  upload: string;
  name: string;
  /** Bytes. */
  size: number;
  type: 'image/jpeg';
}

/** D-191: a WebVTT transcript staff uploaded for a video block. */
export interface VideoTranscript {
  upload: string;
  name: string;
  /** Bytes. */
  size: number;
  type: 'text/vtt';
}

/** D-191: one chapter. `t` is seconds from the start. `item` is a checklist item id on the same step. */
export interface VideoChapter {
  t: number;
  label: string;
  item?: string;
}

/**
 * D-188: a video block. Its source is an uploaded mp4 (played from the API, same-origin) or a link. The
 * optional title is shown with it and follows the copy rules like any other learner-facing string.
 * D-191: poster, chapters, transcript and the draft badge are optional, so a block without them is
 * unchanged. Staff set each one in the Week Builder. `id` is stable on the week (resume and auto-check).
 */
export interface VideoBlock {
  type: 'video';
  source: VideoUpload | VideoLink;
  title?: string;
  id?: string;
  poster?: VideoPoster;
  transcript?: VideoTranscript;
  chapters?: VideoChapter[];
  /** Shows the badge "Draft video · narration coming". */
  draft?: boolean;
}

/** What a step's path is made of: the content blocks, (D-188) a video, and (D-190) checklist, callout and accordion blocks. */
export type PathBlock = ContentBlock | VideoBlock | CheckBlock | CalloutBlock | AccordionBlock;

/** One item of a week's Media: a line of text, as before, or (D-188) a video. */
export type MediaItem = string | VideoBlock;

export const isVideoUpload = (s: VideoBlock['source']): s is VideoUpload => typeof (s as VideoUpload).upload === 'string';

/** One platform's way through a step. */
export interface StepPath {
  blocks: PathBlock[];
}

/** A step's Claude path and ChatGPT path. Either may be absent; a step with neither has no tabs. */
export interface StepPaths {
  claude?: StepPath;
  chatgpt?: StepPath;
}

// --- the cards a week can carry (the builder edits each one) ---------------------------------------

/** The hire's seat card. */
export interface SeatCard {
  seat: string;
  reportsTo: string;
  runs: string;
  pulls: string;
  applies: string;
  produces: string;
  tookOver: string;
  cantDo: string;
  firstRun?: string;
}

/** The week's playbook card: Connor's standard, the question it asks and the play. */
export interface PlaybookCard {
  name?: string;
  number: string;
  question: string;
  play: string;
  source?: string;
  signedOff: boolean;
}

/** A sample output, always labeled made up. */
export interface SampleOutput {
  title: string;
  madeUpLabel: string;
  blocks: ContentBlock[];
}

/** What a locked week or skill says. `opens` is a template: `{date}` becomes the open date and time. */
export interface LockedCopy {
  headline: string;
  line: string;
  opens: string;
}

/**
 * A week of the course, as a module of kind `week` holds it (`AIEmployee.course`). The module's own
 * columns hold what the portal's AI Employee already had (icon, platform, run label, outcome, the
 * three outputs and the steps); this holds the rest. Fields after `materials` are the builder's newer
 * cards: optional, so a week without one simply has none.
 */
export interface ModuleCourse {
  week: number;
  title: string;
  question: string;
  why: string[];
  owner: string;
  operator: string;
  time: { owner: string; operator: string };
  skills: CourseSkill[];
  setup: SetupStep[];
  liveBuild: LiveBuildPage | null;
  officeHours: OfficeHoursPage | null;
  homework: Homework;
  /** Clearly marked placeholders until a real recording exists, and (D-188) videos. */
  media: MediaItem[];
  /** Course material shipped with the week, by name. */
  materials: string[];
  promise?: string;
  flagship?: string;
  tools?: string[];
  seatCard?: SeatCard;
  playbookCard?: PlaybookCard;
  sampleOutput?: SampleOutput;
  lockedCopy?: LockedCopy;
  /** The hire's status labels, by state (e.g. `not_started` → "Not hired yet"). */
  statusLabels?: Readonly<Record<string, string>>;
  /**
   * D-195: the Start Here card. The step rows are the week's own steps, not a second copy.
   * Absent until staff or the seed set it.
   */
  startHere?: StartHere;
  /**
   * D-196: the week's intake form. Questions are course content. Absent until staff or the seed set it.
   * The opening line is optional and sits above the sections.
   */
  intake?: CourseIntake;
  /** D-197: the stack card's words. A team's rows are not stored here. */
  stackCard?: StackCardContent;
}

export interface StackSource {
  id: string;
  name: string;
  green: string;
  yellow: string;
}

export interface StackExampleRow {
  source: string;
  tool: string;
  plan: 'green' | 'yellow';
  who: string;
}

export interface StackCardContent {
  sources: StackSource[];
  exampleLabel: string;
  exampleTeam: string;
  example: StackExampleRow[];
}

/** D-196: one intake question. `choice` and `multi` carry `options`. */
export interface IntakeQuestion {
  id: string;
  label: string;
  help?: string;
  kind: 'short' | 'long' | 'choice' | 'multi';
  options?: string[];
}

/** D-196: one group of questions. */
export interface IntakeSection {
  title: string;
  intro?: string;
  questions: IntakeQuestion[];
}

/** D-196: a week's intake. Answers are not stored here. */
export interface CourseIntake {
  intro?: string;
  sections: IntakeSection[];
}

/** D-195: the words of a week's Start Here card. The step list is not stored here. */
export interface StartHere {
  title: string;
  sub: string;
  line: string;
  hint: string;
  totals: { owner: string; operator: string };
}

// --- what every week shares (`Cohort.course`) -------------------------------------------------------

export interface LabelHint {
  label: string;
  hint: string;
}

export interface LabelText {
  label: string;
  text: string;
}

export interface RubricDimension {
  label: string;
  meets: string;
}

export interface CourseIntro {
  title: string;
  sub: string;
  how: string[];
  roles: { owner: string; operator: string };
  scope: string;
  support: string;
  instructor: string;
  holiday: string;
  /** How a learner joins a live session. Never a Zoom URL: only the join route hands that out. */
  join: { label: string; note: string; path: string };
  /**
   * D-187: the cohort community's address (an http or https link), set in the builder's Shared pages.
   * Absent or empty, the learner portal shows no community link.
   */
  community?: string;
}

export interface CourseShared {
  liveBuildMins: number;
  officeHoursMins: number;
  officeHoursRules: string[];
  issueForm: LabelHint[];
  evidence: LabelHint[];
  rubric: RubricDimension[];
  rubricScale: { score: 0 | 1 | 2; label: string }[];
  rubricRules: string[];
  readiness: { gate: 'Green' | 'Amber' | 'Red'; text: string }[];
  paths: LabelText[];
  missedAWeek: string;
  estimateNote: string;
}

export interface CourseBefore {
  intake: string[];
  orientation: { minutes: number; topics: string[]; media: string };
  dataPack: { input: string; preferred: string; minimum: string }[];
  practiceSetNote: string;
  safeSharing: string[];
  lanes: LabelText[];
}

export interface CourseAfter {
  graduation: string[];
  graduationNote: string;
  paths: LabelText[];
  noPaywall: string;
  pilotQuestions: LabelText[];
}

/**
 * D-193: one glossary term. `firstStep` is the first step number that may underline it (absent means
 * every step). `underline` false turns the underline off; absent means on. The words are course copy.
 */
export interface GlossaryTerm {
  id: string;
  term: string;
  short: string;
  long: string;
  aliases: string[];
  firstStep?: number;
  underline?: boolean;
}

/** What the cohort holds for the whole course (`Cohort.course`). */
export interface CohortCourse {
  intro: CourseIntro;
  shared: CourseShared;
  before: CourseBefore;
  after: CourseAfter;
  /** D-193: terms the step pages underline, and a checklist Card lists. Absent until one is set. */
  glossary?: GlossaryTerm[];
}

// --- what `GET /api/course` sends -----------------------------------------------------------------

/**
 * A week as the course page renders it: the module's course, plus the AI Employee fields it shows. D-184:
 * with its seat card and playbook card, when the week has them (the learner portal's week page draws them).
 */
export interface CourseWeek extends Omit<ModuleCourse, 'promise' | 'flagship' | 'tools' | 'sampleOutput' | 'lockedCopy' | 'statusLabels'> {
  /** The AI Employee this week is in the portal: its icon, platform, outputs and steps. */
  module: {
    icon: IconName;
    platform: string;
    runLabel: string;
    outcome: string;
    outputs: [string, string, string];
    checklist: Omit<Step, 'id'>[];
  };
}

export interface CourseContent extends CohortCourse {
  weeks: CourseWeek[];
}
