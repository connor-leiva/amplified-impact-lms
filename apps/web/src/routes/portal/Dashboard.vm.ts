// The Portal Dashboard view-model: a pure port of `renderVals()` in
// design-reference/Portal Dashboard.dc.html. Contract: SCREENS § 3.1, phase 05 § 5.1.
//
// PURE. No React, no hooks, no router, no `Date.now()`: `now` arrives as an argument and every
// `onClick="{{ … }}"` thunk in the reference becomes a declarative {@link DashAction} that the
// component carries out. That is what makes it structurally impossible for a locked AI Employee to
// navigate — the model can only ever ask for the Locked Preview (SCREENS § 2.4).
//
// Every business rule is imported from @ai/core. Nothing here recomputes status, access or time.

import {
  accessibleSessions,
  buildOf,
  canAccess,
  cardSession,
  cardVM,
  fmt,
  hasOfficeHoursSeries,
  ics,
  isOpen,
  moduleForSession,
  nextSession,
  sessionEnd,
  sessionEvent,
  sessionKind,
  sessionFor,
  sessionState,
  sessionVM,
  variantNow,
  visibleModules,
} from '@ai/core';
import type {
  Announcement,
  BuildState,
  CardVM,
  Db,
  IconName,
  Learner,
  Phase,
  Session,
  SessionVM,
  Variant,
} from '@ai/core';
import type { StatusTokenProps } from '../../components/StatusToken';

// ---------------------------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------------------------

/** A file the screen hands the browser, with the toast the reference shows alongside it. */
export interface DownloadSpec {
  name: string;
  content: string;
  mime: string;
  toast: string;
}

/** What a control does when it is used. The component, not the model, carries this out. */
export type DashAction =
  | { kind: 'nav'; to: string }
  | { kind: 'locked'; moduleId: string }
  | { kind: 'toast'; msg: string; tone: 'info' }
  | { kind: 'download'; file: DownloadSpec };

// ---------------------------------------------------------------------------------------------
// View-model shape
// ---------------------------------------------------------------------------------------------

export interface DashboardAnn {
  id: string;
  severity: 'info' | 'warning';
  title: string;
  body: string;
  /** Relative (`19 hours ago`); {@link abs} is its tooltip. */
  when: string;
  abs: string;
  /** `''` when the announcement carries no action, which hides the banner's button. */
  actionLabel: string;
  action: DashAction | null;
}

/** The Session Card's Add to Calendar menu. Google and Outlook open in a new tab. */
export interface DashboardCal {
  google: string;
  outlook: string;
  ics: DownloadSpec;
}

export interface DashboardPost {
  ended: string;
  /** "Office Hours Continue Wednesdays" for the prototype; a cohort with its own series says no day. */
  title: string;
  host: string;
  next: string;
  /** Null when there is no scheduled office hour to add (D-110): the button is not drawn. */
  cal: DownloadSpec | null;
  rewatch: DashAction;
}

export interface ProgressSeg {
  key: string;
  label: string;
  state: BuildState;
  n: number;
  total: number;
  /** The fill width, as a percentage string. A genuinely per-instance value, so it stays inline. */
  w: string;
  tip: string;
}

export interface DashboardProgress {
  done: number;
  total: number;
  segs: ProgressSeg[];
  aria: string;
  /** Hidden in Week 0 and once everything included is built. */
  next: { name: string; action: DashAction } | null;
  /** `''` for Team tier, which has nothing locked. */
  lockedNote: string;
  lockedAction: DashAction | null;
  week0: { date: string; watch: DashAction } | null;
}

export interface QuickLink {
  key: string;
  icon: IconName;
  title: string;
  sub: string;
  arrow: IconName;
  action: DashAction;
}

export interface SchedRow {
  key: string;
  n: number;
  title: string;
  sub: string;
  locked: boolean;
  token: StatusTokenProps | null;
  action: DashAction;
}

export interface DashboardVM {
  subline: string;
  ann: DashboardAnn | null;
  /** `null` in Week 0 before anything is scheduled, and after the cohort wraps. */
  session: SessionVM | null;
  cal: DashboardCal | null;
  join: DashAction | null;
  /** Both `onWatch` and `onKit` in the reference: the card's AI Employee, or Sessions. */
  watch: DashAction | null;
  post: DashboardPost | null;
  pg: DashboardProgress;
  cards: CardVM[];
  links: QuickLink[];
  sched: SchedRow[];
  allSessions: DashAction;
}

/** Only the States contract sheet pins a variant; the route passes nothing. */
export interface DashboardUi {
  forceVariant?: Variant | null;
  /** Milliseconds since that sheet mounted, fed to `variantNow`. */
  tick?: number;
}

// ---------------------------------------------------------------------------------------------
// Helpers, ported verbatim
// ---------------------------------------------------------------------------------------------

const OFFICE_HOURS_ZOOM = 'https://zoom.us/j/8841299001';
const OFFICE_HOURS_TITLE = 'Amplified Impact office hours';

/** The UTC basic format a Google Calendar template link wants. */
const gcalStamp = (t: number): string =>
  new Date(t)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

/**
 * The next Wednesday 11:00 AM CT at or after `now`. Ported literally from the reference's IIFE,
 * including the fixed 6-hour offset it uses to read a Central date out of a UTC string.
 */
export function nextWednesday(now: number): number {
  let t = Date.parse(new Date(now - 6 * 3600e3).toISOString().slice(0, 10) + 'T11:00:00-06:00');
  while (new Date(t - 6 * 3600e3).getUTCDay() !== 3 || t < now) t += 86400e3;
  return t;
}

/** A real office hour from the cohort's own series (D-110): its own time, and no invented link. */
const officeHourFile = (oh: Session, stamp: number): DownloadSpec => ({
  name: 'office-hours.ics',
  content: ics([sessionEvent(oh)], stamp),
  mime: 'text/calendar',
  toast: 'Office hours added to your calendar',
});

/** No scheduled office hour yet: said, not invented. */
const SCHEDULE_TBA = 'Schedule TBA';
/** The host when no module of a cohort with its own office hours names an instructor (Ampy, 2026-11-11). */
export const INSTRUCTOR_FALLBACK = 'Your instructor';

const officeHoursFile = (t: number, stamp: number): DownloadSpec => ({
  name: 'office-hours.ics',
  content: ics([{ id: 'oh' + t, title: OFFICE_HOURS_TITLE, start: t, end: t + 3600e3, url: OFFICE_HOURS_ZOOM }], stamp),
  mime: 'text/calendar',
  toast: 'Office hours added to your calendar',
});

/**
 * The reference's `openMod`: a missing AI Employee falls back to Sessions and a locked one opens
 * the preview rather than navigating. It looks in `db.modules`, not `visibleModules`, as written.
 */
function moduleAction(db: Db, user: Learner, id: string | null): DashAction {
  const m = id ? db.modules.find((x) => x.id === id) : undefined;
  if (!m) return { kind: 'nav', to: '/sessions' };
  if (!canAccess(user, m)) return { kind: 'locked', moduleId: m.id };
  return { kind: 'nav', to: `/employees/${m.id}` };
}

/**
 * `Opens Dec 14` → `opens Dec 14`.
 *
 * The reference lowercases the whole label (`card.opensLabel.toLowerCase()`, giving `opens dec 14`).
 * SCREENS § 3.1 names that a defect — "the reference lowercases the month; use the correct case" —
 * so only the leading verb is lowered. No parity scenario renders this toast.
 */
const opensPhrase = (opensLabel: string): string => opensLabel.replace(/^Opens/, 'opens');

/** What clicking an Employee Card on the grid does. */
export function cardAction(card: CardVM): DashAction {
  if (card.locked) return { kind: 'locked', moduleId: card.id };
  if (card.soon)
    return {
      kind: 'toast',
      msg: `${card.name} ${opensPhrase(card.opensLabel)}. Materials post that morning.`,
      tone: 'info',
    };
  return { kind: 'nav', to: `/employees/${card.id}` };
}

// ---------------------------------------------------------------------------------------------
// The view-model
// ---------------------------------------------------------------------------------------------

export function dashboardVM(db: Db, user: Learner, now: number, ui: DashboardUi = {}): DashboardVM {
  const phase: Phase = db.phase ?? 'live';
  const force = ui.forceVariant ?? null;
  const team = user.teamId ? (db.teams.find((t) => t.id === user.teamId) ?? null) : null;
  const isTeam = user.tier === 'team';

  const vis = visibleModules(db);
  const acc = vis.filter((m) => canAccess(user, m));
  const lockedN = vis.length - acc.length;

  const subline = isTeam
    ? `${team ? team.name + ' · ' : ''}Team Tier`
    : `Agent Tier · ${acc
        .map((m) => m.short)
        .join(', ')
        .replace(/, ([^,]*)$/, ' and $1')} Included`;

  // ---- the banner: first match in seed order, which is newest first ---------------------------
  const aud = (a: Announcement): boolean =>
    a.audience === 'all' || a.audience === user.tier || (a.audience === 'owners' && user.role === 'Team Owner');
  const raw = db.announcements.find(
    (x) => x.status === 'sent' && x.channels.includes('inapp') && aud(x) && !(db.dismissed ?? {})[`${user.id}:${x.id}`],
  );

  let ann: DashboardAnn | null = null;
  if (raw) {
    const moved = raw.sessionId ? (db.sessions.find((x) => x.id === raw.sessionId) ?? null) : null;
    const actionLabel = raw.action ? raw.actionLabel || 'Open' : '';
    ann = {
      id: raw.id,
      severity: raw.severity || 'info',
      // A moved session re-renders its title from the session, so the banner can never go stale.
      title: moved ? `Session ${moved.n} moved to ${fmt.dayPlain(moved.start)} · ${fmt.time(moved.start)}` : raw.title,
      body: raw.body || '',
      when: fmt.ago(raw.at, now),
      abs: fmt.abs(raw.at),
      actionLabel,
      action: !actionLabel
        ? null
        : raw.action === 'calendar' && moved
          ? {
              kind: 'download',
              file: {
                name: `session-${moved.n}.ics`,
                content: ics([sessionEvent(moved)], now),
                mime: 'text/calendar',
                toast: 'Calendar invite updated',
              },
            }
          : { kind: 'nav', to: '/sessions' },
    };
  }

  // ---- the Session Card ----------------------------------------------------------------------
  const real = cardSession(db, user, now);
  let s: Session | null = real.s;
  let variant: Variant | 'none' = real.variant;
  if (force) {
    s = s ?? accessibleSessions(db, user).slice(-1)[0] ?? null;
    variant = force;
  }
  const session: SessionVM | null =
    s && variant !== 'none' ? sessionVM(db, s, variant, force ? variantNow(s, force, ui.tick ?? 0) : now) : null;

  const co = db.cohorts.find((x) => x.id === user.cohortId) ?? db.cohorts[0] ?? null;
  const isPost = !force && (phase === 'post' || (real.variant === 'none' && !!co && now > co.start));
  const card = isPost ? null : session;

  const wed = nextWednesday(now);
  // A cohort with its own office-hours series (the AI Accelerator, D-110) uses its real Thursdays and
  // its real instructor. The prototype's cohorts have none, so everything below is as ported for them.
  const series = !!co && hasOfficeHoursSeries(db.sessions, co.id);
  const ohNext = series
    ? (accessibleSessions(db, user).find((x) => sessionKind(x) === 'office_hours' && sessionEnd(x) > now) ?? null)
    : null;
  // No module names an instructor: "Your instructor", never the prototype's invented name (Ampy,
  // 2026-11-11). The prototype's own post card says "Your instructor" too (D-118).
  const host = series ? (vis.find((m) => m.instructor)?.instructor ?? INSTRUCTOR_FALLBACK) : INSTRUCTOR_FALLBACK;
  const post: DashboardPost | null =
    isPost && co
      ? series
        ? {
            ended: fmt.date(co.end),
            title: 'Office Hours Continue',
            host,
            next: ohNext ? `${fmt.day(ohNext.start)} · ${fmt.time(ohNext.start)}` : SCHEDULE_TBA,
            cal: ohNext ? officeHourFile(ohNext, now) : null,
            rewatch: { kind: 'nav', to: '/sessions' },
          }
        : {
            ended: fmt.date(co.end),
            title: 'Office Hours Continue Wednesdays',
            host,
            next: `${fmt.day(wed)} · ${fmt.time(wed)}`,
            cal: officeHoursFile(wed, now),
            rewatch: { kind: 'nav', to: '/sessions' },
          }
      : null;

  // ---- the Progress card ---------------------------------------------------------------------
  const segs: ProgressSeg[] = acc.map((m) => {
    const b = buildOf(user, m);
    return {
      key: m.id,
      label: m.short,
      state: b.state,
      n: b.n,
      total: b.total,
      w: `${Math.round((b.n / b.total) * 100)}%`,
      tip: `${m.name}: ${b.n} of ${b.total} steps verified`,
    };
  });
  const built = acc.filter((m) => buildOf(user, m).state === 'verified').length;
  const nextM =
    acc.find((m) => isOpen(m, now) && buildOf(user, m).state === 'in_progress') ??
    acc.find((m) => isOpen(m, now) && buildOf(user, m).state === 'not_started') ??
    null;
  const s1 = sessionFor(db, user.cohortId, 1);
  const firstLocked = vis.find((m) => !canAccess(user, m)) ?? null;

  const pg: DashboardProgress = {
    done: built,
    total: acc.length,
    segs,
    aria:
      `${built} of ${acc.length} AI Employees built. ` +
      segs.map((x) => `${x.label} ${x.n} of ${x.total} steps`).join(', '),
    next:
      nextM && built < acc.length && phase !== 'week0'
        ? { name: nextM.name, action: { kind: 'nav', to: `/employees/${nextM.id}` } }
        : null,
    lockedNote: lockedN ? `${lockedN} More with Team Tier` : '',
    lockedAction: firstLocked ? { kind: 'locked', moduleId: firstLocked.id } : null,
    week0:
      phase === 'week0' && s1
        ? {
            date: fmt.date(s1.start),
            watch: {
              kind: 'toast',
              msg: 'Orientation · 5 min. Plays in the production player.',
              tone: 'info',
            },
          }
        : null,
  };

  // ---- the grid, the quick links and the schedule ---------------------------------------------
  const cards = vis.map((m) => cardVM(db, user, m, now));

  const links: QuickLink[] = [
    {
      key: 'community',
      icon: 'chat',
      title: 'Cohort Community',
      sub: '148 members · 23 new posts today',
      arrow: 'arrowUR',
      action: { kind: 'toast', msg: 'Opening the cohort community', tone: 'info' },
    },
    series
      ? {
          key: 'office-hours',
          icon: 'calendar',
          title: 'Office Hours',
          sub: ohNext ? `${fmt.weekday(ohNext.start)}s · ${fmt.time(ohNext.start)}` : SCHEDULE_TBA,
          arrow: 'calPlus',
          action: ohNext ? { kind: 'download', file: officeHourFile(ohNext, now) } : { kind: 'nav', to: '/sessions' },
        }
      : {
          key: 'office-hours',
          icon: 'calendar',
          title: 'Office Hours',
          sub: `Wednesdays · ${fmt.time(wed)}`,
          arrow: 'calPlus',
          action: { kind: 'download', file: officeHoursFile(wed, now) },
        },
    {
      key: 'support',
      icon: 'headset',
      title: 'Technical Support',
      sub: 'Typical reply in under 2 hours',
      arrow: 'chevR',
      action: {
        kind: 'toast',
        msg: 'Support chat opened. Luis from Support will reply here.',
        tone: 'info',
      },
    },
  ];

  const nextS = nextSession(db, user, now);
  const sched: SchedRow[] = db.sessions
    .filter((x) => x.cohortId === user.cohortId)
    .sort((a1, b1) => a1.start - b1.start)
    .map((x) => {
      const m = moduleForSession(db, x);
      const locked = !!m && !canAccess(user, m);
      const st = sessionState(x, now);
      const isNext = !!nextS && nextS.id === x.id;
      const token: StatusTokenProps | null = locked
        ? { kind: 'access', state: 'locked' }
        : st === 'replay'
          ? { kind: 'custom', tone: 'success', icon: 'check', label: 'Replay' }
          : st === 'live'
            ? { kind: 'custom', tone: 'live', label: 'Live' }
            : isNext
              ? { kind: 'custom', tone: 'progress', icon: 'clock', label: 'Next' }
              : null;
      return {
        key: x.id,
        n: x.n,
        title: x.title,
        sub: fmt.when(x.start),
        locked,
        token,
        action: m ? moduleAction(db, user, m.id) : { kind: 'nav', to: '/sessions' },
      };
    });

  const event = s ? sessionEvent(s) : null;

  return {
    subline,
    ann,
    session: card,
    cal:
      card && s && event
        ? {
            google: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${gcalStamp(event.start)}/${gcalStamp(event.end)}&details=${encodeURIComponent(event.url)}`,
            outlook: `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(event.title)}&startdt=${new Date(event.start).toISOString()}&enddt=${new Date(event.end).toISOString()}&body=${encodeURIComponent(event.url)}`,
            ics: {
              name: `session-${s.n}.ics`,
              content: ics([event], now),
              mime: 'text/calendar',
              toast: 'Calendar invite downloaded',
            },
          }
        : null,
    join: card ? { kind: 'toast', msg: `Opening Zoom · ${card.zoom}`, tone: 'info' } : null,
    watch: card ? moduleAction(db, user, card.moduleId) : null,
    post,
    pg,
    cards,
    links,
    sched,
    allSessions: { kind: 'nav', to: '/sessions' },
  };
}
