// The learner portal v2's shared view-model (D-177): the shell's nav and top bar, and the pieces Home,
// the week overview and the step player all draw (a week's row, a session's row, a kit row, the step
// meta line).
//
// PURE. No React, no clock, no fetch. The words a learner reads come from `GET /api/course` (the course,
// its sessions, the copy strings) and the snapshot (their name, progress and cohort); the only words in
// this file are generic chrome from the signed-off mockup (`LABELS`), which the copy guard
// (apps/api/test/copy-guard.test.ts) holds apart from the course's own. Every time goes through `fmt.*`
// (the viewer's zone first, the program's in parentheses); a locked week's opening reads the course's
// own way, through `opensText` (Mountain Time, from the `locked.opens` copy string).

import { ACCELERATOR_SUPPORT_EMAIL } from '@ai/core/accelerator';
import { cohortLine, fmt } from '@ai/core';
import type { AIEmployee, Db, IconName, IcsEvent, Learner, ResourceKind } from '@ai/core';
import { isLockedWeek } from '@ai/core/course';
import type { CourseKitItem, LearnerCourseWeek, LockedCourseWeek, OpenCourseWeek } from '@ai/core/course';
import type { CourseSkill } from '@ai/core/course-types';
import { duration, joinableSession, progressOn, sessionEndsAt, sessionPhase, stepCount, upcomingSessions, weekModuleOf, weekState, weekSteps } from '@ai/core/learner';
import type { LearnerStep, WeekState } from '@ai/core/learner';
import { guideHref, inLibrary, opensText } from '../course/Course.vm';
import type { CoursePayload, CourseSession } from '../course/Course.vm';
import { learnHome, learnSchedule, learnSkill, learnSkills, learnStep, learnWeek } from './routes';

/** Generic chrome, from the mockup. Never a week's, step's or session's words. */
export const LABELS = {
  home: 'Home',
  schedule: 'Schedule',
  library: 'Skill library',
  vault: 'Resource vault',
  employees: 'AI employees',
  help: 'Get help',
  openMenu: 'Open menu',
  closeMenu: 'Close menu',
  menu: 'Menu',
  account: 'Your account',
  accountPage: 'Account',
  signOut: 'Sign out',
  homeLink: 'Amplified Impact, Home',
  breadcrumb: 'Breadcrumb',
  learner: 'Learner',
  primary: 'Primary',
  nextBuild: 'Next live build',
  liveNow: 'Live now',
  // D-183: a session inside its join window, before it starts (the current portal's "Starting Soon").
  startingSoon: 'Starting soon',
  // D-183: the current portal's own words, as its Sessions page and Join Button write them.
  joinHint: 'Opens 15 Min Before',
  replayReady: 'Replay Ready',
  replayProcessing: 'Replay Processing',
  recordingPosted: 'Recording Posted',
  watchReplay: 'Watch Replay',
  openKit: 'Open the Build Kit',
  sessionEnded: 'Session Ended',
  // D-183: the current portal's calendar menu's own names for its two links.
  googleCalendar: 'Google Calendar',
  outlook: 'Outlook',
  attendedLive: 'attended live',
  started: 'Started',
  join: 'Join',
  joinBuild: 'Join the live build',
  addToCalendar: 'Add to calendar',
  addAll: 'Add all to calendar',
  addBoth: 'Add both to calendar',
  locked: 'Locked',
  built: 'Built',
  notStarted: 'Not started',
  open: 'Open',
  inProgress: 'In progress',
  done: 'Done',
  upNext: 'Up next',
  liveBuildNow: 'Live build now',
  week: 'Week',
  step: 'Step',
  skill: 'Skill',
  openNow: 'Open now',
  emailSupport: 'Email support',
  officeHours: 'Office hours',
  zoom: 'Zoom',
} as const;

export type Tone = 'forest' | 'blue' | 'amber' | 'terra' | 'green' | 'solid';
const TONES: readonly Tone[] = ['forest', 'blue', 'amber', 'terra', 'green', 'solid'];
/** The status hue each tone draws in (the stylesheets key a tile's colours by hue). */
export const HUE: Record<Tone, 'forest' | 'info' | 'warn' | 'bad' | 'ok' | 'solid'> = { forest: 'forest', blue: 'info', amber: 'warn', terra: 'bad', green: 'ok', solid: 'solid' };
/** A module's tone as the builder sets it, or forest when it sets none. */
export const toneOf = (t: string | undefined): Tone => (TONES as readonly string[]).includes(t ?? '') ? (t as Tone) : 'forest';

// --- a week, as every learner screen sees it -----------------------------------------------------

export interface WeekRow {
  week: number;
  title: string;
  outcome: string;
  icon: IconName;
  tone: Tone;
  state: WeekState;
  /** An open week's steps (none for a locked one). */
  steps: LearnerStep[];
  done: number;
  total: number;
  href: string;
  /** "Opens Dec 9": a locked week's short opening, in the viewer's zone. */
  opensShort: string | null;
  open: OpenCourseWeek | null;
  locked: LockedCourseWeek | null;
  /** The snapshot's module for the week, when the snapshot has it (its icon, tone, due date, step ids). */
  module: AIEmployee | undefined;
}

/** Every week of the course, in order, each with this learner's place in it. */
export function weekRows(p: CoursePayload, db: Pick<Db, 'modules'>, me: Learner | null): WeekRow[] {
  return p.course.weeks.map((w: LearnerCourseWeek): WeekRow => {
    const module = weekModuleOf(db, w.week);
    if (isLockedWeek(w)) {
      return {
        week: w.week,
        title: w.title,
        outcome: w.outcome,
        icon: module?.icon ?? 'lvLock',
        tone: toneOf(module?.tone),
        state: 'locked',
        steps: [],
        done: 0,
        total: 0,
        href: learnWeek(w.week),
        opensShort: w.opensAt === null ? null : `Opens ${fmt.date(w.opensAt)}`,
        open: null,
        locked: w,
        module,
      };
    }
    const steps = weekSteps(w, module, progressOn(me, w.week));
    const { done, total } = stepCount(steps);
    return {
      week: w.week,
      title: w.title,
      outcome: w.module.outcome,
      icon: w.module.icon,
      tone: toneOf(module?.tone),
      state: weekState(w, steps),
      steps,
      done,
      total,
      href: learnWeek(w.week),
      opensShort: null,
      open: w,
      locked: null,
      module,
    };
  });
}

// --- a step -----------------------------------------------------------------------------------------

/** A step's title: its name (`ch`), or its text when it has no name. */
export const stepTitle = (s: LearnerStep): string => s.step.ch || s.step.text;

/** What a step asks, beyond its title and its done-when line, or null when that is all it says. */
export function stepText(s: LearnerStep): string | null {
  const t = s.step.text;
  if (!t || t === stepTitle(s) || t === s.step.doneWhen) return null;
  return t;
}

/** "30 min · Claude or ChatGPT · Each of you": a step's time, the week's platform and who does it. */
export function stepMeta(s: LearnerStep, platform: string | null): string {
  const time = s.step.timeLabel || (s.step.mins ? duration(s.step.mins) : '');
  return [time, platform, s.step.who].filter((x): x is string => !!x).join(' · ');
}

/** "10 min · Owner": a step's time and who does it, as a list row writes it. */
export const stepRowMeta = (s: LearnerStep): string => stepMeta(s, null);

export type Seg = 'd' | 'c' | '';
/** One segment per step: done, up next, or still to do. */
export const segments = (steps: readonly LearnerStep[]): Seg[] => steps.map((s) => (s.done ? 'd' : s.current ? 'c' : ''));

// --- sessions ---------------------------------------------------------------------------------------

export interface DateTileVM {
  dw: string;
  dd: string;
}

/** The date tile: "Wed" over "2", in the viewer's zone. */
export function dateTile(t: number): DateTileVM {
  const [dw = '', rest = ''] = fmt.day(t).split(', ');
  return { dw, dd: rest.split(' ')[1] ?? '' };
}

export interface SessionRowVM {
  id: string;
  tile: DateTileVM;
  title: string;
  meta: string;
}

/** "Week 1 · 1:00 PM CT · 1 hr 30 min": a session's week (for a build), its start and its length. */
export function sessionRow(s: CourseSession): SessionRowVM {
  const when = `${fmt.time(s.start)} · ${duration(s.mins)}`;
  return { id: s.id, tile: dateTile(s.start), title: s.title, meta: s.kind === 'build' ? `${LABELS.week} ${s.week} · ${when}` : when };
}

/** A calendar event for each session, never with a join link (only the join route hands that out). */
export const icsEvents = (sessions: readonly CourseSession[]): IcsEvent[] =>
  sessions.map((s) => ({ id: s.id, title: s.title, start: s.start, end: sessionEndsAt(s) }));

/** What a button that adds these sessions to a calendar says: one, both, or all. */
export const addLabel = (n: number): string => (n === 1 ? LABELS.addToCalendar : n === 2 ? LABELS.addBoth : LABELS.addAll);

// --- the shell: the nav and the top bar -------------------------------------------------------------

export interface NavEmployeeVM {
  week: number;
  label: string;
  title: string;
  href: string;
  icon: IconName;
  tone: Tone;
  active: boolean;
  status: { kind: 'ring'; text: string; ratio: number } | { kind: 'built'; text: string } | { kind: 'open'; text: string } | { kind: 'opens'; text: string } | null;
}

export interface NavVM {
  /** False for a learner whose plan has no course: no Schedule, vault or AI employees (cohort pieces). */
  cohort: boolean;
  home: { label: string; href: string; active: boolean };
  schedule: { label: string; href: string; active: boolean };
  library: { label: string; href: string; active: boolean };
  /** The vault: a link, or locked (with when it opens) during the pre-launch preview. */
  vault: { label: string; href: string; locked: boolean; title: string | null };
  employees: { label: string; count: number; rows: NavEmployeeVM[] } | null;
  help: { label: string; href: string };
}

export const SUPPORT_HREF = `mailto:${ACCELERATOR_SUPPORT_EMAIL}`;

/** The week a path is on, or null: `/learn/week/3` and `/learn/week/3/step/2` are both on Week 3. */
export function weekOfPath(pathname: string): number | null {
  const m = /^\/learn\/week\/(\d+)(?:\/|$)/.exec(pathname);
  return m ? Number(m[1]) : null;
}

/** The first week that opens after the preview, as the vault's lock says it. */
function vaultOpens(p: CoursePayload): string | null {
  const next = p.course.weeks.find((w): w is LockedCourseWeek => isLockedWeek(w) && w.opensAt !== null);
  return next ? opensText(next, p.copy) : null;
}

export function navVM(p: CoursePayload | null, rows: readonly WeekRow[], pathname: string): NavVM {
  const on = weekOfPath(pathname);
  return {
    cohort: p !== null,
    home: { label: LABELS.home, href: learnHome(), active: pathname === learnHome() || pathname === `${learnHome()}/` },
    schedule: { label: LABELS.schedule, href: learnSchedule(), active: pathname === learnSchedule() },
    library: { label: LABELS.library, href: learnSkills(), active: pathname === learnSkills() || pathname.startsWith(`${learnSkills()}/`) },
    vault: { label: LABELS.vault, href: '/vault', locked: !!p?.prelaunch, title: p?.prelaunch ? vaultOpens(p) : null },
    employees: p
      ? {
          label: LABELS.employees,
          count: rows.length,
          rows: rows.map((r): NavEmployeeVM => {
            const status: NavEmployeeVM['status'] =
              r.state === 'locked'
                ? r.opensShort
                  ? { kind: 'opens', text: r.opensShort }
                  : null
                : r.state === 'built'
                  ? { kind: 'built', text: LABELS.built }
                  : r.state === 'in_progress'
                    ? { kind: 'ring', text: `${r.done} of ${r.total}`, ratio: r.total ? r.done / r.total : 0 }
                    : { kind: 'open', text: LABELS.notStarted };
            return {
              week: r.week,
              label: r.title,
              title: status ? `${r.title} · ${status.text}` : r.title,
              href: r.href,
              icon: r.icon,
              tone: r.tone,
              active: on === r.week,
              status,
            };
          }),
        }
      : null,
    help: { label: LABELS.help, href: SUPPORT_HREF },
  };
}

// --- Join (D-183) ------------------------------------------------------------------------------------

/**
 * A session a learner can join now, as every learner screen draws it: live (staff pressed Go Live, or it
 * is under way) with the live badge, or starting soon (inside its 15-minute window). One rule for the
 * shell, Home, the Schedule and the week page: core's `sessionPhase`, the join route's own window.
 */
export interface JoinVM {
  sessionId: string;
  state: 'live' | 'ready';
  /** "Live now" or "Starting soon". */
  badge: string;
  title: string;
  week: number;
  /** "12:00 PM MT (1:00 PM CT) · Zoom". */
  meta: string;
  /** "Join the live build" for a build, else "Join". */
  joinLabel: string;
}

export function joinVM(s: CourseSession | null | undefined, now: number): JoinVM | null {
  if (!s) return null;
  const phase = sessionPhase(s, now);
  if (phase !== 'live' && phase !== 'ready') return null;
  return {
    sessionId: s.id,
    state: phase,
    badge: phase === 'live' ? LABELS.liveNow : LABELS.startingSoon,
    title: s.title,
    week: s.week,
    meta: `${fmt.time(s.start)} · ${LABELS.zoom}`,
    joinLabel: s.kind === 'build' ? LABELS.joinBuild : LABELS.join,
  };
}

/** The first of these sessions a learner can join now, as a `JoinVM`. */
export const joinNow = (sessions: readonly CourseSession[], now: number): JoinVM | null => joinVM(joinableSession(sessions, now), now);

export type BarVM =
  | { kind: 'live'; state: 'live' | 'ready'; badge: string; sessionId: string; title: string; started: string; joinLabel: string; week: number }
  | { kind: 'next'; sessionId: string; title: string; when: string; ics: IcsEvent[] }
  | { kind: 'none' };

/**
 * The top bar's one thing: the session to join now (live, or inside its 15-minute window, D-183), else the
 * next live build, else nothing.
 */
export function barVM(p: CoursePayload | null, now: number): BarVM {
  if (!p) return { kind: 'none' };
  const live = joinableSession(p.sessions, now);
  const j = joinVM(live, now);
  if (live && j)
    return {
      kind: 'live',
      state: j.state,
      badge: j.badge,
      sessionId: live.id,
      title: live.title,
      started: j.state === 'live' ? `${LABELS.started} ${fmt.time(live.start)}` : fmt.time(live.start),
      joinLabel: LABELS.join,
      week: live.week,
    };
  const next = upcomingSessions(p.sessions, now, 'build').find((s) => !s.live);
  if (!next) return { kind: 'none' };
  return { kind: 'next', sessionId: next.id, title: next.title, when: fmt.when(next.start), ics: icsEvents([next]) };
}

// --- kit rows and skill rows ------------------------------------------------------------------------

export interface KitRowVM {
  key: string;
  icon: IconName;
  title: string;
  meta: string;
  /** Where it goes: a Library page, or the gated files route. Null when there is nowhere yet. */
  href: string | null;
  external: boolean;
  /** D-184: a week's skill's role ("Flagship") and Free, as the course page tags them. */
  tags?: { label: string; tone?: 'done' }[];
}

const KIND_LABEL: Record<ResourceKind, string> = { file: 'File', prompt: 'Prompt', guide: 'Guide', replay: 'Replay', vault: 'File' };
const KIND_ICON: Record<ResourceKind, IconName> = { file: 'file', prompt: 'lvCopy', guide: 'book', replay: 'play', vault: 'file' };

/** The Library route a step links, as a course route ("map-your-spend" → "/map-your-spend"). */
const asRoute = (r: string): string => (r.startsWith('/') ? r : `/${r}`);

/** `/skill-library/<page>` (the current portal's guide) as the learner portal's `/learn/skills/<page>`; any other address as it is. */
const asLearn = (href: string): string => {
  const m = /^\/skill-library\/([a-z0-9-]+)$/.exec(href);
  return m ? learnSkill(m[1]!) : href;
};

/** A Library skill's row: its guided setup when its page exists, else the `skill.coming` copy string and no link. */
export function skillRow(k: Pick<CourseSkill, 'title' | 'route'>, copy: Record<string, string> | undefined, suffix?: string): KitRowVM {
  const route = asRoute(k.route);
  // D-179: a guided setup opens in the learner portal's own Skill Library, in the step player.
  const href = inLibrary(route) ? asLearn(guideHref(route)) : null;
  const status = href ? LABELS.openNow : (copy?.['skill.coming'] ?? null);
  return {
    key: `skill:${route}`,
    icon: 'book',
    title: k.title,
    meta: [LABELS.skill, suffix ?? status].filter((x): x is string => !!x).join(' · '),
    href,
    external: !!href && /^https?:\/\//.test(href),
  };
}

/** A kit item's row: what it is and its step, downloaded through the gated files route. */
export function kitRow(item: CourseKitItem, steps: readonly LearnerStep[], fileUrl: (id: string) => string | null): KitRowVM {
  const step = item.stepId ? steps.find((s) => s.id === item.stepId) : undefined;
  const kind = item.kind ?? 'file';
  return {
    key: `kit:${item.id}`,
    icon: KIND_ICON[kind],
    title: item.title,
    meta: [KIND_LABEL[kind], step ? `${LABELS.step} ${step.n}` : null].filter((x): x is string => !!x).join(' · '),
    href: fileUrl(item.id),
    external: false,
  };
}

/** The step a skill route belongs to in this week, by the step's linked skill: "Step 5", or none. */
export function stepOfSkill(route: string, steps: readonly LearnerStep[]): string | undefined {
  const r = asRoute(route);
  const s = steps.find((x) => x.step.linkedSkill && asRoute(x.step.linkedSkill) === r);
  return s ? `${LABELS.step} ${s.n}` : undefined;
}

/** The week's Library skills that a step links (by its linked skill), else every skill of the week. */
export function skillsForStep(week: OpenCourseWeek, s: LearnerStep): Pick<CourseSkill, 'title' | 'route'>[] {
  const linked = s.step.linkedSkill ? asRoute(s.step.linkedSkill) : null;
  if (!linked) return week.skills;
  const own = week.skills.find((k) => asRoute(k.route) === linked);
  return [own ?? { title: linked.slice(1), route: linked }];
}

export interface HelpVM {
  email: { label: string; address: string; href: string };
  officeHours: { label: string; meta: string; href: string } | null;
}

/** "Still stuck?": email support, and the next office hours when there is one. */
export function helpVM(p: CoursePayload, now: number): HelpVM {
  const oh = upcomingSessions(p.sessions, now, 'office_hours')[0];
  return {
    email: { label: LABELS.emailSupport, address: ACCELERATOR_SUPPORT_EMAIL, href: SUPPORT_HREF },
    officeHours: oh ? { label: LABELS.officeHours, meta: fmt.when(oh.start), href: '/sessions' } : null,
  };
}

/** The step player's address for a week's step (1-based). */
export const stepHref = learnStep;

// --- D-184: the sidebar's Team Hub and cohort line -------------------------------------------------

/** The sidebar's Team Hub label, the current portal's own. */
export const TEAM_HUB_LABEL = 'Team Hub';
/** Where Team Hub opens: the current portal's page (`/team`), until the flip moves it into the learner portal. */
export const TEAM_HUB_HREF = '/team';

/**
 * Whether this learner has a Team Hub: a Team tier learner on a team, the first portal's rule (D-119, the
 * same check D-182 uses for the account menu).
 */
export const hasTeamHub = (db: Pick<Db, 'teams'>, me: Pick<Learner, 'tier' | 'teamId'> | null): boolean =>
  !!me && me.tier === 'team' && me.teamId !== null && db.teams.some((t) => t.id === me.teamId);

export interface SideVM {
  /** Team Hub, for a Team tier learner on a team (T-1); null for anyone else. */
  teamHub: { label: string; href: string; active: boolean } | null;
  /** The cohort line under the wordmark (SH-9): "December 2026 Cohort · Week 2 of 9"; null without a course. */
  cohortLine: string | null;
}

/**
 * The sidebar's Team Hub entry and cohort line. The cohort line is the current portal's (`cohortLine`, from
 * the learner's cohort and its sessions in the snapshot), shown, as there, only to a learner in the course.
 */
export function sideVM(db: Pick<Db, 'teams' | 'cohorts' | 'sessions'>, me: Learner | null, p: CoursePayload | null, pathname: string, now: number): SideVM {
  const cohort = me && p ? db.cohorts.find((c) => c.id === me.cohortId) : undefined;
  return {
    teamHub: hasTeamHub(db, me) ? { label: TEAM_HUB_LABEL, href: TEAM_HUB_HREF, active: pathname === TEAM_HUB_HREF } : null,
    cohortLine: cohort ? cohortLine(cohort, now, db.sessions) : null,
  };
}
