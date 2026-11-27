// D-226: the v3 shell's props (`AppShell`'s `shell`, `current`, `hideNext`), from the learner portal's own
// view-models (IMPLEMENTATION-SPEC.md §7.1). Pure: the screen hands in the nav, the sidebar, the weeks, the
// sessions and the clock, and draws what comes back. Every word here is the mockup's chrome; every title, time and
// count comes from the course.
import { fmt } from '@ai/core';
import { PLAN_NAMES } from '@ai/core/offer';
import type { Learner } from '@ai/core';
import { joinableSession, progressOnModule, sessionEndsAt, sessionPhase, upcomingSessions } from '@ai/core/learner';
import { calLinks } from '../../../components/calendar-links';
import type { CourseSession } from '../../course/Course.vm';
import { LABELS, weekOfPath } from '../learn.vm';
import type { NavVM, SideVM, WeekRow } from '../learn.vm';
import { learnHome, learnSchedule, learnSkills, learnVault, LEARN_ROOT } from '../routes';
import type { CalItem } from './CalMenu';
import type { Shell, ShellNext, ShellWeek } from './AppShell';
import type { SessionMode } from './session';

/** The mockup's chrome words for the shell (handoff/lms-v3/src/sample-data.js › sampleShell). */
export const SHELL_LABELS = {
  /** D-227: the group's name ("AI employees is getting replaced with Weeks", Connor, Nov 20). */
  weeks: 'Weeks',
  community: 'Community',
  logo: 'Amplified Impact Academy, Home',
  nextBuild: LABELS.nextBuild,
  nextOfficeHours: 'Next office hours',
  icsFile: 'Calendar file (.ics)',
} as const;

/** D-233 (B-41, v7): the one logo file as the page loads it (`logos.ts` inlines it as a `data:` URI). */
export interface ShellLogos {
  app: string;
}

/** B-29 (nav half): the Community's address. The page itself arrives with Phase 10. */
export const learnCommunity = (): string => `${LEARN_ROOT}/community`;
/**
 * The Join button's address. The mockup's Join is a link; the Zoom URL exists only inside the join route's window
 * (phase 08 § 8.4), so the v3 frame catches a click on this address and asks for it, as `Join` does today.
 */
export const learnJoin = (sessionId: string): string => `${LEARN_ROOT}/join/${encodeURIComponent(sessionId)}`;
export const joinOfHref = (pathname: string): string | null => {
  const m = /^\/learn\/join\/([^/]+)$/.exec(pathname);
  return m ? decodeURIComponent(m[1]!) : null;
};

/** D-183: the join window opens this many minutes before a session starts (core's `sessionPhase`). */
export const JOIN_BEFORE_MIN = 15;

/** The nav item a path is on (`AppShell`'s `current`): a nav row's id, or a week's `week-N`. */
export function currentOf(pathname: string): string | undefined {
  const week = weekOfPath(pathname);
  if (week !== null) return `week-${week}`;
  const p = pathname.replace(/\/$/, '') || '/';
  if (p === learnHome()) return 'home';
  if (p === learnSchedule()) return 'schedule';
  if (p === learnCommunity() || p.startsWith(`${learnCommunity()}/`)) return 'community';
  if (p === learnSkills() || p.startsWith(`${learnSkills()}/`)) return 'library';
  if (p === `${LEARN_ROOT}/team`) return 'team';
  if (p === learnVault()) return 'vault';
  return undefined;
}

/**
 * A week's row in the nav. The mockup's rule (sample-data.js › week0): a check once the week is deployed; a ring and
 * "N of M" once a step is done (all eight done but not deployed is still "8 of 8"); otherwise nothing. A locked week
 * carries its lock (B-38).
 */
export function shellWeek(r: WeekRow, me: Learner | null): ShellWeek {
  const locked = r.state === 'locked';
  const deployed = !locked && !!progressOnModule(me, r.moduleId)?.deployedAt;
  return {
    n: r.week,
    title: r.title,
    href: r.href,
    id: `week-${r.week}`,
    status: deployed ? 'done' : !locked && r.done > 0 ? 'progress' : 'idle',
    ...(locked ? {} : { done: r.done, total: r.total }),
    locked,
  };
}

/** A session's calendar choices: the file, Google Calendar and Outlook (B-05). */
export function calendarOf(s: CourseSession, onIcs: () => void): CalItem[] {
  const links = calLinks({ title: s.title, start: s.start, end: sessionEndsAt(s) });
  return [
    { icon: 'down', label: SHELL_LABELS.icsFile, href: '#', onClick: onIcs },
    { icon: 'cal', label: LABELS.googleCalendar, href: links.google },
    { icon: 'cal', label: LABELS.outlook, href: links.outlook },
  ];
}

/**
 * The next session (B-35, B-36, B-07): the one to join now (live, or inside its join window: today's `barVM` rule,
 * Go Live included), else the next session of any kind, with its mode worked out from `now`. The top bar and the
 * Schedule's hero both read it, so they always agree.
 */
export function nextSessionOf(
  sessions: readonly CourseSession[],
  now: number,
): { s: CourseSession; mode: SessionMode } | null {
  const live = joinableSession(sessions, now) as CourseSession | null | undefined;
  const s = live ?? upcomingSessions(sessions, now).find((x) => !x.live);
  if (!s) return null;
  const phase = live ? sessionPhase(live, now) : null;
  return { s, mode: phase === 'live' ? 'live' : phase === 'ready' ? 'join' : 'wait' };
}

/** The top bar's session. */
export function shellNext(
  sessions: readonly CourseSession[],
  now: number,
  saveIcs: (s: CourseSession) => void,
): ShellNext | null {
  const next = nextSessionOf(sessions, now);
  if (!next) return null;
  const { s, mode } = next;
  return {
    label: s.kind === 'build' ? SHELL_LABELS.nextBuild : SHELL_LABELS.nextOfficeHours,
    title: s.title,
    when: fmt.when(s.start),
    time: fmt.time(s.start),
    where: LABELS.zoom,
    start: new Date(s.start).toISOString(),
    minutes: s.mins,
    joinBefore: JOIN_BEFORE_MIN,
    joinHref: learnJoin(s.id),
    calendar: calendarOf(s, () => saveIcs(s)),
    mode,
  };
}

export interface ShellInput {
  nav: NavVM;
  side: SideVM;
  rows: readonly WeekRow[];
  sessions: readonly CourseSession[];
  me: Learner | null;
  /** The learner's name, or the staff member's, for the account button's initials. */
  name: string;
  now: number;
  /** The breadcrumb's current page (visually hidden). */
  here: string;
  logos: ShellLogos;
  account: { open: boolean; onClick: () => void };
  saveIcs: (s: CourseSession) => void;
  /**
   * D-257: a learner whose plan opens no course (`isNoCourseLearner`): no Schedule, Community or Weeks, which are the
   * cohort's. Home, Skill library, Team Hub when they have one, Resource vault (Connor, Nov 25, Q-B4: "add a Home row").
   */
  noCourse?: boolean;
  /** D-257 (Q-B3): the program line of a learner without the course: their plan's name, or their access group's. */
  programName?: string;
}

/**
 * D-257 (Q-B3, Connor Nov 25: "show the plan's name in the program lines (e.g. 'Amplified Agent Plan'), or 'Utah Life'
 * for that group"). The first plan that hasn't ended, by its billing name (`PLAN_NAMES`); else the access group's name;
 * else nothing. Read off `GET /api/skills` (`plans`, `accessGroups`).
 */
export function programNameOf(a: { plans?: readonly { kind: string; status?: string }[]; accessGroups?: readonly { name: string }[] } | null | undefined): string {
  const plan = (a?.plans ?? []).find((p) => p.status !== 'ended' && p.kind in PLAN_NAMES);
  if (plan) return PLAN_NAMES[plan.kind as keyof typeof PLAN_NAMES];
  return a?.accessGroups?.[0]?.name ?? '';
}

/** `AppShell`'s `shell` prop. */
export function shellProps(x: ShellInput): Shell {
  const { nav, side } = x;
  const navRows: Shell['nav'] = [
    { icon: 'home', label: nav.home.label, href: nav.home.href, id: 'home' },
    ...(nav.cohort ? [{ icon: 'cal', label: nav.schedule.label, href: nav.schedule.href, id: 'schedule' }] : []),
    ...(nav.cohort ? [{ icon: 'talk', label: SHELL_LABELS.community, href: learnCommunity(), id: 'community' }] : []),
    { icon: 'grid', label: nav.library.label, href: nav.library.href, id: 'library' },
    ...(side.teamHub ? [{ icon: 'users', label: side.teamHub.label, href: side.teamHub.href, id: 'team' }] : []),
    { icon: 'folder', label: nav.vault.label, href: nav.vault.href, id: 'vault' },
  ];
  return {
    homeHref: nav.home.href,
    helpHref: nav.help.href,
    logo: { label: SHELL_LABELS.logo, app: x.logos.app },
    cohort: x.noCourse ? [x.programName ?? '', ''] : [side.program ?? '', side.cohortOnly ?? ''],
    nav: navRows,
    weeksLabel: SHELL_LABELS.weeks,
    weeks: x.rows.map((r) => shellWeek(r, x.me)),
    next: nav.cohort ? shellNext(x.sessions, x.now, x.saveIcs) : null,
    account: { initials: fmt.initials(x.name), aria: LABELS.account, onClick: x.account.onClick, open: x.account.open },
    here: x.here,
  };
}
