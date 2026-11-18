// /learn, Home (D-177): artboards 01/02 (before launch) and 04/05 (live build) of the learner mockup.
//
// PURE: every string Home renders is computed here. The course's words are the API's; the learner's
// name is their snapshot row's; counts are real (the cohort's own enrolment) or the tile is not drawn.
// A learner whose plan has no course (Utah Life among them) gets Home without the cohort pieces: no
// hero, no AI employees, nothing coming up and no cohort card.

import { fmt } from '@ai/core';
import type { Cohort, Db, IconName, IcsEvent, Learner } from '@ai/core';
import { ACCELERATOR_COHORT_ID, ACCELERATOR_SUPPORT_EMAIL } from '@ai/core/accelerator';
import { countWord, countdown, currentWeek, firstName, inAppAnnouncement, joinableSession, monthYear, partOfDay, sessionEndsAt, sessionPhase, upcomingSessions } from '@ai/core/learner';
import { COPY as COURSE_COPY } from '../course/Course.vm';
import { PRE_LAUNCH, whenOf } from '../library/PreLaunch';
import type { CoursePayload } from '../course/Course.vm';
import type { CourseLoad } from './data';
import { LABELS, SUPPORT_HREF, addLabel, icsEvents, segments, sessionRow, stepMeta, stepTitle } from './learn.vm';
import type { Seg, SessionRowVM, Tone, WeekRow } from './learn.vm';
import { learnSchedule, learnSkills, learnStep } from './routes';

/** D-183: the current portal's post-cohort block, in its Dashboard's own words. */
export const POST = {
  wrapped: 'Your Cohort Wrapped on',
  title: 'Office Hours Continue',
  help: 'Drop-In Build Help with',
  next: 'Next:',
  tba: 'Schedule TBA',
  host: 'your instructor',
  addOfficeHours: 'Add Office Hours to Calendar',
  rewatch: 'Rewatch Any Session',
} as const;

/** D-183: the in-app announcement's chrome, the current portal's banner's own words. */
export const BANNER = {
  open: 'Open',
  dismiss: 'Dismiss',
  session: 'Session',
  movedTo: 'moved to',
  updated: 'Calendar invite updated',
} as const;

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
      /** D-183: live now (Go Live, or under way), or inside its 15-minute join window. */
      state: 'live' | 'ready';
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
  /**
   * Bought, before the course opens to them: how long until it does, and (D-183) the pre-launch welcome
   * the current portal shows them on /course and the Skill Library, beside it.
   */
  | { kind: 'opens'; right: HeroRightVM; welcome: { title: string; starts: string; support: string; email: string; href: string } };

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

/**
 * D-183: the in-app announcement, as the current portal's Dashboard banner shows it: warning or info, its
 * title (a moved session's title re-read from the session, so it never goes stale), its body, when it was
 * sent, its action (the updated calendar invite for a moved session, else the Schedule) and Dismiss.
 */
export interface BannerVM {
  id: string;
  severity: 'info' | 'warning';
  title: string;
  body: string;
  when: string;
  abs: string;
  action: { label: string; kind: 'calendar'; ics: IcsEvent[]; name: string; toast: string } | { label: string; kind: 'nav'; href: string } | null;
  dismiss: string;
}

/**
 * D-183: the current portal's post-cohort block, once every session of the cohort is over: when it
 * wrapped, office hours that continue (the next one, with its calendar file), and Rewatch Any Session
 * (the latest replay's week page, where its player is, else the Schedule).
 */
export interface PostVM {
  kicker: string;
  title: string;
  meta: string;
  ics: IcsEvent[] | null;
  icsName: string;
  addLabel: string;
  rewatch: { label: string; href: string };
}

/**
 * D-183: the current portal's Session Card after a session, for 12 hours: "Replay Ready" with Watch Replay,
 * or "Session Ended" with the replay processing and Open the Build Kit. Both open the week's page, where
 * the player and the kit are.
 */
export interface RecentVM {
  state: 'replay' | 'processing';
  badge: string;
  title: string;
  note: string;
  action: { label: string; href: string };
}

export interface HomeVM {
  greeting: string;
  banner: BannerVM | null;
  post: PostVM | null;
  recent: RecentVM | null;
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

/** D-183: the announcement a learner's Home shows, by the current portal's rule (`inAppAnnouncement`). */
export function bannerVM(db: Pick<Db, 'announcements' | 'dismissed' | 'sessions'>, me: Learner | null, now: number): BannerVM | null {
  if (!me) return null;
  const raw = inAppAnnouncement(db, me);
  if (!raw) return null;
  const moved = raw.sessionId ? (db.sessions.find((x) => x.id === raw.sessionId) ?? null) : null;
  const label = raw.action ? raw.actionLabel || BANNER.open : '';
  return {
    id: raw.id,
    severity: raw.severity || 'info',
    title: moved ? `${BANNER.session} ${moved.n} ${BANNER.movedTo} ${fmt.dayPlain(moved.start)} · ${fmt.time(moved.start)}` : raw.title,
    body: raw.body || '',
    when: fmt.ago(raw.at, now),
    abs: fmt.abs(raw.at),
    action: !label
      ? null
      : raw.action === 'calendar' && moved
        ? { label, kind: 'calendar', ics: [{ id: moved.id, title: moved.title, start: moved.start, end: sessionEndsAt(moved) }], name: `session-${moved.n}.ics`, toast: BANNER.updated }
        : { label, kind: 'nav', href: learnSchedule() },
    dismiss: BANNER.dismiss,
  };
}

const RECENT_MS = 12 * 3600_000;

/** The last live build that ended in the past 12 hours (and isn't live again), by the current portal's rule. */
export function recentVM(p: CoursePayload, rows: readonly WeekRow[], now: number): RecentVM | null {
  const s = p.sessions
    .filter((x) => x.kind === 'build' && !x.live && sessionEndsAt(x) <= now && now - sessionEndsAt(x) < RECENT_MS)
    .sort((a, b) => a.start - b.start)
    .pop();
  if (!s) return null;
  const href = rows.find((r) => r.week === s.week)?.href ?? learnSchedule();
  return sessionPhase(s, now) === 'replay'
    ? { state: 'replay', badge: LABELS.replayReady, title: s.title, note: REPLAY_NOTE, action: { label: LABELS.watchReplay, href } }
    : { state: 'processing', badge: LABELS.sessionEnded, title: s.title, note: PROCESSING_NOTE, action: { label: LABELS.openKit, href } };
}

/** The current portal's Session Card notes. */
const REPLAY_NOTE = 'Chapters and a searchable transcript are up.';
const PROCESSING_NOTE = 'Replay processing · usually within 2 hours';

/**
 * The post-cohort block, by the current portal's rule: the cohort has started and no session is still
 * ahead or live. Its host is the first instructor a week names, else "your instructor".
 */
export function postVM(p: CoursePayload, cohort: Cohort | undefined, modules: readonly { instructor?: string }[], now: number, rows: readonly WeekRow[] = []): PostVM | null {
  if (!cohort || now <= cohort.start || !p.sessions.length) return null;
  if (p.sessions.some((s) => s.live || sessionEndsAt(s) > now)) return null;
  const oh = upcomingSessions(p.sessions, now, 'office_hours')[0] ?? null;
  const host = modules.find((m) => m.instructor)?.instructor || POST.host;
  return {
    kicker: `${POST.wrapped} ${fmt.date(cohort.end)}`,
    title: POST.title,
    meta: `${POST.help} ${host} · ${POST.next} ${oh ? `${fmt.day(oh.start)} · ${fmt.time(oh.start)}` : POST.tba}`,
    ics: oh ? [{ id: oh.id, title: oh.title, start: oh.start, end: sessionEndsAt(oh) }] : null,
    icsName: 'office-hours.ics',
    addLabel: POST.addOfficeHours,
    rewatch: { label: POST.rewatch, href: rewatchHref(p, rows, now) },
  };
}

/** Rewatch: the latest week whose live build's replay is published (its player), else the Schedule. */
function rewatchHref(p: CoursePayload, rows: readonly WeekRow[], now: number): string {
  const last = p.sessions
    .filter((s) => s.kind === 'build' && sessionPhase(s, now) === 'replay')
    .sort((a, b) => a.start - b.start)
    .pop();
  return (last && rows.find((r) => r.week === last.week && r.state !== 'locked')?.href) ?? learnSchedule();
}

function courseHome(p: CoursePayload, rows: readonly WeekRow[], cohort: Cohort | undefined, now: number): Omit<HomeVM, 'greeting' | 'banner' | 'post' | 'recent'> {
  // D-183: the session to join now: live (Go Live, or under way), else inside its 15-minute window.
  const live = joinableSession(p.sessions, now);
  const liveState = live && sessionPhase(live, now) === 'live' ? 'live' : 'ready';
  const nextBuild = upcomingSessions(p.sessions, now, 'build').find((s) => !s.live) ?? null;
  const cur = currentWeek(rows);
  const step = cur?.steps.find((s) => s.current) ?? null;

  let hero: HeroVM | null = null;
  if (live) {
    const row = rows.find((r) => r.week === live.week);
    const ends = sessionEndsAt(live);
    const parts = countParts(ends, now, false);
    hero = {
      kind: 'live',
      state: liveState,
      tile: { icon: row?.icon ?? 'lvLive', tone: row?.tone ?? 'forest' },
      eyebrow: `${liveState === 'live' ? LABELS.liveNow : LABELS.startingSoon} · ${LABELS.week} ${live.week}`,
      title: live.title,
      meta: `${fmt.time(live.start)} · ${LABELS.zoom}`,
      sessionId: live.id,
      joinLabel: live.kind === 'build' ? LABELS.joinBuild : LABELS.join,
      open: row && row.state !== 'locked' ? { label: `${LABELS.open} ${row.title}`, href: row.href } : null,
      right:
        liveState === 'live'
          ? { label: HOME.timeLeft, icon: 'r2Jobs', parts, aria: partsAria(parts), foot: `${HOME.ends} ${fmt.time(ends)}. ${HOME.replayAfter}` }
          : goesLive(live.start, now),
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
  const coming = upcomingSessions(p.sessions, now)
    .filter((s) => !s.live)
    .slice(0, 3);
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
      cards: cards(rows, cur, live && liveState === 'live' ? live.week : null),
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
const NO_COURSE: Omit<HomeVM, 'greeting' | 'banner' | 'post' | 'recent'> = {
  lede: null,
  hero: null,
  employees: null,
  comingUp: null,
  cohort: null,
  // D-179: the learner portal's own Skill Library.
  library: { note: COURSE_COPY.lockedNote, label: COURSE_COPY.library, href: learnSkills() },
};

/**
 * Home. `db` is the learner's snapshot, for the in-app announcement (D-183); without it no banner is drawn.
 * Every learner sees their announcement, with the course or without it, as on the current portal.
 */
export function homeVM(
  load: CourseLoad,
  rows: readonly WeekRow[],
  cohorts: readonly Cohort[],
  me: Learner | null,
  name: string,
  now: number,
  db?: Pick<Db, 'announcements' | 'dismissed' | 'sessions'>,
): HomeVM {
  const hello = { greeting: greeting(name, now), banner: db ? bannerVM(db, me, now) : null, post: null, recent: null };
  if (load.kind === 'ready') {
    const cohort = cohorts.find((c) => c.id === (me?.cohortId ?? ACCELERATOR_COHORT_ID));
    const modules = rows.map((r) => r.module).filter((m): m is NonNullable<typeof m> => !!m);
    const post = postVM(load.payload, cohort, modules, now, rows);
    return { ...hello, ...courseHome(load.payload, rows, cohort, now), post, recent: post ? null : recentVM(load.payload, rows, now) };
  }
  if (load.kind === 'paused') return { ...hello, ...NO_COURSE, lede: COURSE_COPY.paused, library: { note: COURSE_COPY.pausedNote, label: COURSE_COPY.billing, href: '/api/billing/portal' } };
  if (load.kind === 'failed') return { ...hello, ...NO_COURSE, lede: COURSE_COPY.failed, library: null };
  if (load.kind === 'upcoming') {
    const welcome = { title: PRE_LAUNCH.title, starts: PRE_LAUNCH.starts(whenOf(load.opensAt)), support: PRE_LAUNCH.support, email: ACCELERATOR_SUPPORT_EMAIL, href: SUPPORT_HREF };
    return { ...hello, ...NO_COURSE, library: null, hero: { kind: 'opens', right: goesLive(load.opensAt, now), welcome } };
  }
  return { ...hello, ...NO_COURSE };
}
