// /course and /course/week-N: the Amplified AI Accelerator's pages (DECISIONS.md D-110).
//
// Net-new, like /skill-library (D-079): there is no reference file for it, so it sits OUTSIDE the
// shell and no portal golden moves. It reads `GET /api/course`, which answers the course only to a
// plan that opens it (`acceleratorOpen`), so the course's words come from the server and never sit in
// this bundle: `CourseContent` is imported as a type, which the compiler erases.
//
// PURE. No React, no clock, no fetch. Every string the screen renders is computed here and
// unit-tested; times go through `fmt.*` (the viewer's zone first, the program's in parentheses).

import { fmt } from '@ai/core';
import type { SessionType } from '@ai/core';
import { LIBRARY_ORIGIN, SKILL_LIBRARY_PATH, coursePath } from '@ai/core/accelerator';
import { courseGuideHref } from '@ai/core/skill-guides';
import type { CourseSkill, MediaItem, SkillRole } from '@ai/core/course-types';
import { isLockedWeek } from '@ai/core/course';
import type { LearnerCourse, LockedCourseWeek } from '@ai/core/course';
import { mountainWhen } from '@ai/core/release';
import { BLANK_WORKSHEET, COURSE_TEMPLATES, PRACTICE_SET, templateCsv, worksheetCsv } from '@ai/core/worksheet';
import { ENTRIES } from '../../library/content';

/** One session as `GET /api/course` sends it. Never a Zoom URL. */
export interface CourseSession {
  id: string;
  n: number;
  kind: 'build' | 'office_hours';
  /** D-180: the builder's type (live build, office hours, goal planning, setup or other). */
  type?: SessionType;
  week: number;
  title: string;
  start: number;
  mins: number;
  /**
   * D-183: the state the Console sets, which the learner portal v2's shell reads off the snapshot
   * (`withLiveState`): Go Live, and the replay. `GET /api/course` never sends them.
   */
  live?: boolean;
  replay?: 'processing' | 'ready' | null;
  attended?: number | null;
}

export interface CoursePayload {
  open: true;
  preview: boolean;
  /** D-175: the learner is in the pre-launch preview (Week 0 open, the rest locked with their dates). */
  prelaunch?: boolean;
  /** D-175: each week open (whole) or locked (its place in the outline and when it opens). */
  course: LearnerCourse;
  sessions: CourseSession[];
  /** D-175: the learner-facing copy strings, by key: what a locked week says, the preview line. */
  copy?: Record<string, string>;
}

export const COPY = {
  loading: 'Loading your course',
  signedOut: 'The AI Accelerator opens when you sign in.',
  signIn: 'Sign In',
  locked: 'The AI Accelerator isn’t in your plan.',
  lockedNote: 'Your Skill Library is still open, with everything your plan includes.',
  // D-143: a two-pay AI Accelerator whose second payment failed. It reopens once that payment goes through.
  paused: 'Your AI Accelerator is paused until your payment goes through.',
  pausedNote: 'Your second payment didn’t go through. Update your card in Manage Billing and the course opens again on its own.',
  billing: 'Manage Billing',
  library: 'Open Your Skill Library',
  failed: 'Your course didn’t load. Refresh the page to try again.',
  preview: 'Staff preview',
  allWeeks: 'All Weeks',
  weeks: 'The Weeks',
  calendar: 'Calendar',
  howItWorks: 'How It Works',
  roles: { owner: 'Owner', operator: 'Operator' },
  before: 'Before Week 1',
  intake: 'The Intake',
  orientation: 'Orientation',
  dataPack: 'The Data Pack',
  preferred: 'Preferred',
  minimum: 'Minimum to Start',
  practiceSet: 'The Practice Set',
  safeSharing: 'Safe Sharing',
  lanes: 'Three Ways to Connect Your Data',
  graduation: 'Graduation',
  afterWeek8: 'After Week 8',
  pilot: 'The Agent Pilot Review',
  why: 'Why It Matters',
  whoDoesWhat: 'Who Does What',
  time: 'Time This Week',
  skills: 'This Week’s Skills',
  setup: 'Setup Order',
  liveBuild: 'Live Build',
  officeHours: 'Office Hours',
  homework: 'Homework',
  evidence: 'Evidence Packet',
  rubric: 'Rubric',
  readiness: 'Readiness',
  media: 'Media',
  materials: 'Course Materials',
  agenda: 'Agenda',
  lesson: 'Lesson and Case',
  exercise: 'Live Exercise',
  required: 'Required Outcome',
  advanced: 'Advanced Option',
  ownerApproval: 'Owner Approval',
  workingAtEnd: 'Working at the End of Class',
  byWeekEnd: 'Implemented by Week’s End',
  assignment: 'Before the Next Session',
  acceptance: 'Acceptance Test',
  useEvidence: 'Adopted Means',
  issueForm: 'Issue Form',
  youLeaveWith: 'You Leave With',
  inClass: 'In Class',
  noLive: 'No live session this week. Week 0 is on your own time.',
  guidedSetup: 'Open the Guided Setup',
  /** Before the links of a step that names several skills, each link its skill's Library title. */
  guidedSetups: 'Open a Guided Setup:',
  download: 'Download in Your Skill Library',
  free: 'Free',
  worksheet: 'Download the Week 1 Worksheet',
  practice: 'Download the Practice Set',
  previous: 'Previous',
  next: 'Next',
  notFound: 'There’s no such week. Here’s the whole course.',
} as const;

const ROLE_LABEL: Record<SkillRole, string> = {
  flagship: 'Flagship',
  supporting: 'Supporting',
  optional: 'Optional Extension',
  pilot: 'Agent Pilot',
  alternative: 'Alternative',
};

export interface SkillVM {
  title: string;
  role: string;
  use: string;
  free: boolean;
  /** The skill's Library page on www, with its guided setup; null while that page isn't built (D-176). */
  href: string | null;
  /** What shows instead of a link while the page isn't built: the `skill.coming` copy string, or null. */
  pending: string | null;
}

export interface StepVM {
  n: number;
  text: string;
  /**
   * The step's guided setups: none, one ("Open the Guided Setup"), or, for a step that names several
   * skills, one per skill, each by its Library title after "Open a Guided Setup:".
   */
  links: { label: string; href: string }[];
  /** D-176: the step names a Library page that isn't built yet: the `skill.coming` copy string, with no link. */
  pending: string | null;
}

export interface Row {
  label: string;
  text: string;
}

export interface SessionLineVM {
  id: string;
  label: string;
  title: string;
  when: string;
  mins: string;
}

export interface DownloadVM {
  label: string;
  name: string;
  content: string;
}

export interface WeekVM {
  week: number;
  heading: string;
  question: string;
  why: readonly string[];
  roles: Row[];
  time: Row[];
  timeNote: string;
  skills: SkillVM[];
  libraryHref: string;
  setup: StepVM[];
  live: null | {
    when: string;
    mins: string;
    join: JoinVM;
    agenda: Row[];
    lesson: string;
    exercise: string;
    required: string;
    advanced: string;
    ownerApproval: string;
    workingAtEnd: readonly string[];
    paths: Row[];
  };
  officeHours: null | {
    title: string;
    when: string;
    mins: string;
    join: JoinVM;
    note: string;
    format: Row[];
    outputs: readonly string[];
    rules: readonly string[];
    issueForm: Row[];
  };
  noLive: string;
  homework: { byWeekEnd: readonly string[]; assignment: readonly string[]; acceptance: readonly string[]; useEvidence: string };
  evidence: Row[];
  rubric: { dimensions: Row[]; scale: string; rules: readonly string[] };
  readiness: Row[];
  missedAWeek: string;
  /** The week's Media: its lines, and (D-188) its videos. */
  media: readonly MediaItem[];
  materials: readonly string[];
  downloads: DownloadVM[];
  prev: { label: string; href: string } | null;
  next: { label: string; href: string } | null;
}

export interface OverviewVM {
  title: string;
  sub: string;
  how: readonly string[];
  roles: Row[];
  scope: string;
  support: string;
  holiday: string;
  weeks: { week: number; heading: string; question: string; href: string; flagship: string; locked: boolean; opens: string | null }[];
  calendar: SessionLineVM[];
  before: {
    intake: readonly string[];
    orientation: { minutes: string; topics: readonly string[]; media: string };
    dataPack: { input: string; preferred: string; minimum: string }[];
    practiceSetNote: string;
    safeSharing: readonly string[];
    lanes: Row[];
    downloads: DownloadVM[];
  };
  after: { graduation: readonly string[]; note: string; paths: Row[]; noPaywall: string; pilot: Row[] };
}

/** D-175: a week a learner can't open yet: where it sits, what it asks, when it opens. */
export interface LockedWeekVM {
  week: number;
  heading: string;
  question: string;
  outcome: string;
  /** "Opens Wed, Dec 9 · 12:00 PM MT" (the week's own locked copy, else the copy string), or the date alone. */
  opens: string | null;
  headline: string | null;
  line: string | null;
  prev: { label: string; href: string } | null;
  next: { label: string; href: string } | null;
}

export type CourseView =
  | { kind: 'overview'; preview: boolean; prelaunch: string | null; notFound: boolean; vm: OverviewVM }
  | { kind: 'week'; preview: boolean; prelaunch: string | null; title: string; vm: WeekVM }
  | { kind: 'locked'; preview: boolean; prelaunch: string | null; title: string; vm: LockedWeekVM };

/**
 * D-175: what a locked week says about its opening: its own locked copy's template (set in the builder)
 * or the `locked.opens` copy string, `{date}` filled in Mountain Time; the date alone when neither says
 * anything; nothing when no date is set.
 */
export function opensText(w: Pick<LockedCourseWeek, 'opensAt' | 'lockedCopy'>, copy: Record<string, string> | undefined): string | null {
  if (w.opensAt === null) return null;
  const date = mountainWhen(w.opensAt);
  const template = w.lockedCopy?.opens ?? copy?.['locked.opens'];
  return template && template.includes('{date}') ? template.replace('{date}', date) : date;
}

const mins = (n: number): string => `${n} Minutes`;
const span = (from: number, to: number): string => `${from} to ${to} min`;

/**
 * Where a course link to a Library page goes (D-151): a skill's guided setup in learn,
 * `/skill-library/<page>`, opened in the same tab; any other page (/voice-profile) on www, in a new one.
 */
export const guideHref = (route: string): string => courseGuideHref(route, LIBRARY_ORIGIN);
/** Whether a course link leaves learn, and so opens in a new tab. */
export const isExternal = (href: string): boolean => /^https?:\/\//.test(href);

/**
 * D-176: the Library pages that exist, by where a course link to each goes. A week can name a skill whose
 * page isn't built yet (Map Your Spend, Lead Source Review); the course shows it with no link, never a
 * dead one.
 */
const LIBRARY_HREFS: ReadonlySet<string> = new Set(ENTRIES.filter((e) => e.href).map((e) => guideHref(e.href!)));
export const inLibrary = (route: string): boolean => LIBRARY_HREFS.has(guideHref(route));
/** What a skill or step says instead of a link while its page isn't built: the `skill.coming` copy string. */
const comingText = (copy: Record<string, string> | undefined): string | null => copy?.['skill.coming'] || null;

export const skillVM = (s: CourseSkill, copy: Record<string, string> | undefined): SkillVM => {
  // A skill's guided setup in learn (D-151); a page that is not a skill is still on www.
  const href = inLibrary(s.route) ? guideHref(s.route) : null;
  return { title: s.title, role: ROLE_LABEL[s.role], use: s.use, free: !!s.free, href, pending: href ? null : comingText(copy) };
};

/** `Week 3 · Live Build` or `Week 3 · Office Hours`, and the goal-planning title where it is one. */
const sessionLine = (s: CourseSession): SessionLineVM => ({
  id: s.id,
  label: `Week ${s.week} · ${s.kind === 'build' ? COPY.liveBuild : COPY.officeHours}`,
  title: s.title,
  when: fmt.when(s.start),
  mins: mins(s.mins),
});

const WORKSHEET: DownloadVM = { label: COPY.worksheet, name: 'week-1-worksheet.csv', content: worksheetCsv(BLANK_WORKSHEET) };
const PRACTICE: DownloadVM = { label: COPY.practice, name: 'week-1-practice-set.csv', content: worksheetCsv(PRACTICE_SET) };

/** Where a live session is joined: the portal's Sessions page, and when its Join opens. Never a Zoom URL. */
export interface JoinVM {
  label: string;
  note: string;
  href: string;
}
const joinVM = (j: { label: string; note: string; path: string }): JoinVM => ({ label: j.label, note: j.note, href: j.path });

/** A setup step's guided-setup links: one plainly labeled, or several, each by its skill's Library title. */
function setupLinks(step: { route?: string; also?: readonly string[] }, skills: readonly { title: string; route: string }[]): StepVM['links'] {
  const routes = (step.route ? [step.route, ...(step.also ?? [])] : []).filter(inLibrary);
  if (routes.length === 1) return [{ label: COPY.guidedSetup, href: guideHref(routes[0]!) }];
  return routes.map((r) => ({ label: skills.find((k) => k.route === r)?.title ?? r, href: guideHref(r) }));
}

/** The week number in `/course/week-3`, or null for anything else. */
export function weekFromParam(param: string | undefined): number | null {
  const m = /^week-(\d)$/.exec(param ?? '');
  return m ? Number(m[1]) : null;
}

export function weekVM(p: CoursePayload, week: number): WeekVM | null {
  const { course } = p;
  const w = course.weeks.find((x) => x.week === week);
  if (!w || isLockedWeek(w)) return null;
  const build = p.sessions.find((s) => s.id === w.liveBuild?.sessionId) ?? null;
  const oh = p.sessions.find((s) => s.id === w.officeHours?.sessionId) ?? null;
  const shared = course.shared;
  const i = course.weeks.indexOf(w);
  const before = course.weeks[i - 1];
  const after = course.weeks[i + 1];

  return {
    week: w.week,
    heading: `Week ${w.week} · ${w.title}`,
    question: w.question,
    why: w.why,
    roles: [
      { label: COPY.roles.owner, text: w.owner },
      { label: COPY.roles.operator, text: w.operator },
    ],
    time: [
      { label: COPY.roles.owner, text: w.time.owner },
      { label: COPY.roles.operator, text: w.time.operator },
    ],
    timeNote: shared.estimateNote,
    skills: w.skills.map((k) => skillVM(k, p.copy)),
    libraryHref: SKILL_LIBRARY_PATH,
    setup: w.setup.map((step, k) => ({
      n: k + 1,
      text: step.text,
      links: setupLinks(step, w.skills),
      pending: [step.route, ...(step.also ?? [])].some((r) => r !== undefined && !inLibrary(r)) ? comingText(p.copy) : null,
    })),
    live:
      w.liveBuild && build
        ? {
            when: fmt.when(build.start),
            mins: mins(build.mins),
            join: joinVM(course.intro.join),
            agenda: w.liveBuild.agenda.map((a) => ({ label: span(a.from, a.to), text: `${a.activity}. ${a.why}` })),
            lesson: w.liveBuild.lesson,
            exercise: w.liveBuild.exercise,
            required: w.liveBuild.required,
            advanced: w.liveBuild.advanced,
            ownerApproval: w.liveBuild.ownerApproval,
            workingAtEnd: w.liveBuild.workingAtEnd,
            paths: shared.paths.map((x) => ({ label: x.label, text: x.text })),
          }
        : null,
    officeHours:
      w.officeHours && oh
        ? {
            title: oh.title,
            when: fmt.when(oh.start),
            mins: mins(oh.mins),
            join: joinVM(course.intro.join),
            note: w.officeHours.note,
            format: (w.officeHours.format ?? []).map((a) => ({ label: span(a.from, a.to), text: `${a.activity}. ${a.why}` })),
            outputs: w.officeHours.outputs ?? [],
            rules: shared.officeHoursRules,
            issueForm: shared.issueForm.map((f) => ({ label: f.label, text: f.hint })),
          }
        : null,
    noLive: COPY.noLive,
    homework: w.homework,
    evidence: shared.evidence.map((e) => ({ label: e.label, text: e.hint })),
    rubric: {
      dimensions: shared.rubric.map((d) => ({ label: d.label, text: d.meets })),
      scale: shared.rubricScale.map((x) => `${x.score} ${x.label}`).join(' · '),
      rules: shared.rubricRules,
    },
    readiness: shared.readiness.map((r) => ({ label: r.gate, text: r.text })),
    missedAWeek: shared.missedAWeek,
    media: w.media,
    materials: w.materials,
    downloads: [
      // D-176: the Week 1 worksheet and the practice set go with the cohort's practice set note: when the
      // builder's Before page has none (the data pack and practice set retired), neither is offered.
      ...((w.week === 0 || w.week === 1) && course.before.practiceSetNote ? [WORKSHEET, PRACTICE] : []),
      ...COURSE_TEMPLATES.filter((t) => t.weeks.includes(w.week)).map((t): DownloadVM => ({ label: t.label, name: t.file, content: templateCsv(t) })),
    ],
    prev: before ? { label: `${COPY.previous}: Week ${before.week}`, href: coursePath(before.week) } : null,
    next: after ? { label: `${COPY.next}: Week ${after.week}`, href: coursePath(after.week) } : null,
  };
}

export function overviewVM(p: CoursePayload): OverviewVM {
  const { course } = p;
  return {
    title: course.intro.title,
    sub: course.intro.sub,
    how: course.intro.how,
    roles: [
      { label: COPY.roles.owner, text: course.intro.roles.owner },
      { label: COPY.roles.operator, text: course.intro.roles.operator },
    ],
    scope: course.intro.scope,
    support: course.intro.support,
    holiday: course.intro.holiday,
    weeks: course.weeks.map((w) => {
      if (isLockedWeek(w))
        return { week: w.week, heading: `Week ${w.week} · ${w.title}`, question: w.question, href: coursePath(w.week), flagship: '', locked: true, opens: opensText(w, p.copy) };
      const lead = w.skills.filter((s) => s.role === 'flagship');
      return {
        week: w.week,
        heading: `Week ${w.week} · ${w.title}`,
        question: w.question,
        href: coursePath(w.week),
        flagship: (lead.length ? lead : w.skills).map((s) => s.title).join(', '),
        locked: false,
        opens: null,
      };
    }),
    calendar: p.sessions.slice().sort((a, b) => a.start - b.start).map(sessionLine),
    before: {
      intake: course.before.intake,
      orientation: {
        minutes: `About ${course.before.orientation.minutes} minutes`,
        topics: course.before.orientation.topics,
        media: course.before.orientation.media,
      },
      dataPack: course.before.dataPack.map((d) => ({ ...d })),
      practiceSetNote: course.before.practiceSetNote,
      safeSharing: course.before.safeSharing,
      lanes: course.before.lanes.map((l) => ({ label: l.label, text: l.text })),
      downloads: course.before.practiceSetNote ? [WORKSHEET, PRACTICE] : [],
    },
    after: {
      graduation: course.after.graduation,
      note: course.after.graduationNote,
      paths: course.after.paths.map((x) => ({ label: x.label, text: x.text })),
      noPaywall: course.after.noPaywall,
      pilot: course.after.pilotQuestions.map((x) => ({ label: x.label, text: x.text })),
    },
  };
}

/** D-175: a locked week's page, or null when the week is open or not in the course. */
export function lockedWeekVM(p: CoursePayload, week: number): LockedWeekVM | null {
  const weeks = p.course.weeks;
  const w = weeks.find((x) => x.week === week);
  if (!w || !isLockedWeek(w)) return null;
  const i = weeks.indexOf(w);
  const before = weeks[i - 1];
  const after = weeks[i + 1];
  return {
    week: w.week,
    heading: `Week ${w.week} · ${w.title}`,
    question: w.question,
    outcome: w.outcome,
    opens: opensText(w, p.copy),
    headline: w.lockedCopy?.headline || null,
    line: w.lockedCopy?.line || null,
    prev: before ? { label: `${COPY.previous}: Week ${before.week}`, href: coursePath(before.week) } : null,
    next: after ? { label: `${COPY.next}: Week ${after.week}`, href: coursePath(after.week) } : null,
  };
}

/** What `/course` or `/course/:week` shows for this payload. An unknown week falls back to the overview. */
export function courseView(p: CoursePayload, param: string | undefined): CourseView {
  // D-175: the pre-launch preview's line, as the copy string says it (nothing when it says nothing).
  const prelaunch = p.prelaunch ? (p.copy?.['course.prelaunch'] ?? null) : null;
  if (param !== undefined) {
    const n = weekFromParam(param);
    const vm = n === null ? null : weekVM(p, n);
    if (vm) return { kind: 'week', preview: p.preview, prelaunch, title: vm.heading, vm };
    const locked = n === null ? null : lockedWeekVM(p, n);
    if (locked) return { kind: 'locked', preview: p.preview, prelaunch, title: locked.heading, vm: locked };
    return { kind: 'overview', preview: p.preview, prelaunch, notFound: true, vm: overviewVM(p) };
  }
  return { kind: 'overview', preview: p.preview, prelaunch, notFound: false, vm: overviewVM(p) };
}
