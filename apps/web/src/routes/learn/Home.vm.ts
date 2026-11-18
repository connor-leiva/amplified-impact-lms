// /learn, Home (D-177): artboards 01/02 (before launch) and 04/05 (live build) of the learner mockup.
//
// PURE: every string Home renders is computed here. The course's words are the API's; the learner's
// name is their snapshot row's; counts are real (the cohort's own enrolment) or the tile is not drawn.
// A learner whose plan has no course (Utah Life among them) gets Home without the cohort pieces: no
// hero, no AI employees, nothing coming up and no cohort card.

import { fmt } from '@ai/core';
import type { Cohort, IconName, IcsEvent, Learner } from '@ai/core';
import { ACCELERATOR_COHORT_ID, ACCELERATOR_SUPPORT_EMAIL, SKILL_LIBRARY_PATH } from '@ai/core/accelerator';
import { countWord, countdown, currentWeek, firstName, liveSessionAt, monthYear, partOfDay, sessionEndsAt, upcomingSessions } from '@ai/core/learner';
import { COPY as COURSE_COPY } from '../course/Course.vm';
import type { CoursePayload } from '../course/Course.vm';
import type { CourseLoad } from './data';
import { LABELS, SUPPORT_HREF, addLabel, icsEvents, segments, sessionRow, stepMeta, stepTitle } from './learn.vm';
import type { Seg, SessionRowVM, Tone, WeekRow } from './learn.vm';
import { learnSchedule, learnStep } from './routes';

export const HOME = {
  greeting: { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening' },
  goesLive: 'Goes live in',
  timeLeft: 'Time left',
  replayAfter: 'The replay posts after.',
  ends: 'Ends',
  continueStep: 'Continue step',
  seeAll: 'See all',
  steps: 'steps',
  done: 'done',
  employees: 'Your AI employees',
  built: 'built',
  comingUp: 'Coming up',
  cohort: 'Your cohort',
  inCohort: 'in your cohort',
  questions: 'Questions? Email support',
  units: { days: 'days', hrs: 'hrs', hr: 'hr', min: 'min' },
} as const;

export interface CountPart {
  n: number;
  unit: string;
}

export interface HeroRightVM {
  label: string;
  icon: IconName;
  parts: CountPart[];
  /** What a screen reader hears for the timer. */
  aria: string;
  foot: string;
}

export type HeroVM =
  | {
      kind: 'step';
      tile: { icon: IconName; tone: Tone };
      eyebrow: string;
      title: string;
      meta: string;
      segs: Seg[];
      labels: string[];
      progressAria: string;
      doneText: string;
      primary: { label: string; href: string };
      secondary: { label: string; href: string };
      right: HeroRightVM | null;
    }
  | {
      kind: 'live';
      tile: { icon: IconName; tone: Tone };
      eyebrow: string;
      title: string;
      meta: string;
      sessionId: string;
      joinLabel: string;
      open: { label: string; href: string } | null;
      right: HeroRightVM;
    }
  | {
      kind: 'next';
      eyebrow: string;
      title: string;
      meta: string;
      ics: IcsEvent[];
      addLabel: string;
      right: HeroRightVM;
    }
  /** Bought, before the course opens to them: how long until it does. */
  | { kind: 'opens'; right: HeroRightVM };

export interface CardVM {
  week: number;
  title: string;
  line: string;
  icon: IconName;
  tone: Tone;
  href: string;
  /** What a screen reader hears: "Foundations, 2 of 8". */
  aria: string;
  locked: boolean;
  current: boolean;
  live: boolean;
  foot: { kind: 'bar'; segs: Seg[]; text: string } | { kind: 'built'; text: string } | { kind: 'text'; text: string } | null;
  weekLabel: string;
}

export interface HomeVM {
  greeting: string;
  lede: string | null;
  hero: HeroVM | null;
  employees: { heading: string; meta: string | null; schedule: { label: string; href: string }; cards: CardVM[] } | null;
  comingUp: { heading: string; rows: SessionRowVM[]; add: { label: string; ics: IcsEvent[] } | null } | null;
  cohort: {
    heading: string;
    month: string | null;
    stats: { figure: string; label: string }[];
    officeHours: { title: string; meta: string; href: string } | null;
    support: { label: string; address: string; href: string };
  } | null;
  /** Home without the course: a way to the Skill Library, and why there is no course to show. */
  library: { note: string; label: string; href: string } | null;
}

/** "Good afternoon, Dana", by the time of day in the viewer's zone. */
export const greeting = (name: string, now: number): string => {
  const first = firstName(name);
  const hello = HOME.greeting[partOfDay(now)];
  return first ? `${hello}, ${first}` : hello;
};

export function countParts(at: number, now: number, withDays: boolean): CountPart[] {
  const c = countdown(at, now);
  if (withDays && c.days > 0)
    return [
      { n: c.days, unit: HOME.units.days },
      { n: c.hours, unit: HOME.units.hrs },
      { n: c.minutes, unit: HOME.units.min },
    ];
  const hours = c.days * 24 + c.hours;
  return hours > 0
    ? [
        { n: hours, unit: hours === 1 ? HOME.units.hr : HOME.units.hrs },
        { n: c.minutes, unit: HOME.units.min },
      ]
    : [{ n: c.minutes, unit: HOME.units.min }];
}

export const partsAria = (parts: CountPart[]): string => parts.map((x) => `${x.n} ${x.unit}`).join(', ');

/** The hero's right side before a live build: how long until it goes live, and when. */
function goesLive(at: number, now: number): HeroRightVM {
  const parts = countParts(at, now, true);
  return { label: HOME.goesLive, icon: 'r2Jobs', parts, aria: partsAria(parts), foot: fmt.when(at) };
}

function cards(rows: readonly WeekRow[], current: WeekRow | null, liveWeek: number | null): CardVM[] {
  return rows.map((r): CardVM => {
    const live = liveWeek === r.week;
    const foot: CardVM['foot'] =
      r.state === 'locked'
        ? r.opensShort
          ? { kind: 'text', text: r.opensShort }
          : null
        : r.state === 'built'
          ? { kind: 'built', text: LABELS.built }
          : r.state === 'in_progress'
            ? { kind: 'bar', segs: segments(r.steps), text: `${r.done} of ${r.total}` }
            : { kind: 'text', text: LABELS.notStarted };
    const said = foot ? foot.text : r.state === 'locked' ? LABELS.locked : '';
    return {
      week: r.week,
      title: r.title,
      line: r.outcome,
      icon: r.icon,
      tone: r.tone,
      href: r.href,
      aria: said ? `${r.title}, ${said}` : r.title,
      locked: r.state === 'locked',
      current: liveWeek === null && current?.week === r.week && r.state !== 'built',
      live,
      foot,
      weekLabel: `${LABELS.week} ${r.week}`,
    };
  });
}

function courseHome(p: CoursePayload, rows: readonly WeekRow[], cohort: Cohort | undefined, now: number): Omit<HomeVM, 'greeting'> {
  const live = liveSessionAt(p.sessions, now);
  const nextBuild = upcomingSessions(p.sessions, now, 'build')[0] ?? null;
  const cur = currentWeek(rows);
  const step = cur?.steps.find((s) => s.current) ?? null;

  let hero: HeroVM | null = null;
  if (live) {
    const row = rows.find((r) => r.week === live.week);
    const ends = sessionEndsAt(live);
    const parts = countParts(ends, now, false);
    hero = {
      kind: 'live',
      tile: { icon: row?.icon ?? 'lvLive', tone: row?.tone ?? 'forest' },
      eyebrow: `${LABELS.liveNow} · ${LABELS.week} ${live.week}`,
      title: live.title,
      meta: `${fmt.time(live.start)} · ${LABELS.zoom}`,
      sessionId: live.id,
      joinLabel: live.kind === 'build' ? LABELS.joinBuild : LABELS.join,
      open: row && row.state !== 'locked' ? { label: `${LABELS.open} ${row.title}`, href: row.href } : null,
      right: { label: HOME.timeLeft, icon: 'r2Jobs', parts, aria: partsAria(parts), foot: `${HOME.ends} ${fmt.time(ends)}. ${HOME.replayAfter}` },
    };
  } else if (cur && step && cur.open) {
    hero = {
      kind: 'step',
      tile: { icon: cur.icon, tone: cur.tone },
      eyebrow: `${LABELS.upNext} · ${LABELS.step} ${step.n} of ${cur.total}`,
      title: stepTitle(step),
      meta: stepMeta(step, cur.open.module.platform || null),
      segs: segments(cur.steps),
      labels: cur.steps.map((s) => s.step.ch || s.step.text),
      progressAria: `${cur.done} of ${cur.total} steps done. ${LABELS.step} ${step.n}, ${stepTitle(step)}, is next.`,
      doneText: `${cur.done} of ${cur.total} ${HOME.done}`,
      primary: { label: `${HOME.continueStep} ${step.n}`, href: learnStep(cur.week, step.n) },
      secondary: { label: `${HOME.seeAll} ${countWord(cur.total)} ${HOME.steps}`, href: cur.href },
      right: nextBuild ? goesLive(nextBuild.start, now) : null,
    };
  } else if (nextBuild) {
    hero = {
      kind: 'next',
      eyebrow: LABELS.nextBuild,
      title: nextBuild.title,
      meta: fmt.when(nextBuild.start),
      ics: icsEvents([nextBuild]),
      addLabel: LABELS.addToCalendar,
      right: goesLive(nextBuild.start, now),
    };
  }

  const built = rows.filter((r) => r.state === 'built').length;
  const coming = upcomingSessions(p.sessions, now).slice(0, 3);
  const oh = upcomingSessions(p.sessions, now, 'office_hours')[0] ?? null;
  const enrolled = cohort?.enrolled ?? 0;

  return {
    // D-175: the pre-launch preview's line, as its copy string says it; otherwise the week's own question.
    lede: p.prelaunch ? (p.copy?.['course.prelaunch'] ?? null) : ((live ? rows.find((r) => r.week === live.week)?.open?.question : undefined) ?? cur?.open?.question ?? null),
    hero,
    employees: {
      heading: HOME.employees,
      meta: built > 0 ? `${built} ${HOME.built}` : null,
      schedule: { label: LABELS.schedule, href: learnSchedule() },
      cards: cards(rows, cur, live ? live.week : null),
    },
    comingUp: coming.length
      ? { heading: HOME.comingUp, rows: coming.map(sessionRow), add: { label: addLabel(coming.length), ics: icsEvents(coming) } }
      : null,
    cohort: {
      heading: HOME.cohort,
      month: cohort ? monthYear(cohort.start) : null,
      // Real counts only: the cohort's enrolment is its learners' rows (D-018). Nothing else is drawn.
      stats: enrolled > 0 ? [{ figure: fmt.num(enrolled), label: HOME.inCohort }] : [],
      officeHours: oh ? { title: oh.title, meta: fmt.when(oh.start), href: '/sessions' } : null,
      support: { label: HOME.questions, address: ACCELERATOR_SUPPORT_EMAIL, href: SUPPORT_HREF },
    },
    library: null,
  };
}

/** Home without the course: the greeting, and the Skill Library their plan opens. No cohort pieces. */
const NO_COURSE: Omit<HomeVM, 'greeting'> = {
  lede: null,
  hero: null,
  employees: null,
  comingUp: null,
  cohort: null,
  library: { note: COURSE_COPY.lockedNote, label: COURSE_COPY.library, href: SKILL_LIBRARY_PATH },
};

export function homeVM(load: CourseLoad, rows: readonly WeekRow[], cohorts: readonly Cohort[], me: Learner | null, name: string, now: number): HomeVM {
  const hello = greeting(name, now);
  if (load.kind === 'ready') {
    const cohort = cohorts.find((c) => c.id === (me?.cohortId ?? ACCELERATOR_COHORT_ID));
    return { greeting: hello, ...courseHome(load.payload, rows, cohort, now) };
  }
  if (load.kind === 'paused') return { greeting: hello, ...NO_COURSE, lede: COURSE_COPY.paused, library: { note: COURSE_COPY.pausedNote, label: COURSE_COPY.billing, href: '/api/billing/portal' } };
  if (load.kind === 'failed') return { greeting: hello, ...NO_COURSE, lede: COURSE_COPY.failed, library: null };
  if (load.kind === 'upcoming') {
    return { greeting: hello, ...NO_COURSE, library: null, hero: { kind: 'opens', right: goesLive(load.opensAt, now) } };
  }
  return { greeting: hello, ...NO_COURSE };
}
