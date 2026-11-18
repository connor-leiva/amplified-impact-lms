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

/** One platform's way through a step. */
export interface StepPath {
  blocks: ContentBlock[];
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
  /** Clearly marked placeholders until a real recording exists. */
  media: string[];
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

/** What the cohort holds for the whole course (`Cohort.course`). */
export interface CohortCourse {
  intro: CourseIntro;
  shared: CourseShared;
  before: CourseBefore;
  after: CourseAfter;
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
