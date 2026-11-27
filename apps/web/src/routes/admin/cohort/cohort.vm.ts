// D-255 (R-5 Phase 3): the Cohort page's view-models: its head, Overview, Schedule and Settings, and New cohort's
// preview. PURE: the database, `now` and the cohort's facts come in; what is done, counted or refused is core's
// (`@ai/core/cohort-page`, `cohort-run`), and these only word it as the mockup does (handoff/admin-mockup/p3-cohort.jsx,
// p3-model.jsx), with PLAN.md § 10.8's copy rules: Title Case headings, times on one line in MT and CT, no dashes.
//
// Every number opens the list it counts (spec § 4, rule 1): each fact, line and row carries its `to`.

import {
  LAYOUT_KIND_LABEL,
  autoPromise,
  beforeItOpens,
  clashWords,
  cohortClashes,
  cohortHosts,
  cohortProgress,
  cohortProgressLine,
  cohortShapeOf,
  cohortShortName,
  cohortStatusWord,
  cohortWordsOf,
  fmt,
  includedLine,
  layOut,
  layoutProblem,
  layoutWarnings,
  meetsHowOften,
  meetsLine,
  programWeeks,
  runRows,
  sessionState,
  shapeLine,
  slotLine,
  weekOpensLine,
  zonedInputs,
  cohortSelling,
  enrollmentOpen,
  foundingCloseInputs,
  foundingCloseLine,
  cohortLinksNeeded,
  twoPayWords,
} from '@ai/core';
import { dollars } from '@ai/core/offer';
import type { CohortSelling, StripePrice } from '@ai/core';
import type {
  BeforeKey,
  CohortFacts,
  CohortSlot,
  CohortStatusWord,
  Db,
  LaidSession,
  Session,
  SessionType,
} from '@ai/core';
import { PROGRAM, cohortLabel } from '../../../data/admin-shell';

const MT = 'America/Denver';
export type Tone = 'ok' | 'info' | 'warn' | 'bad' | 'off' | 'neutral';

export const cohortPath = (id: string, tab?: string): string =>
  `/admin/cohort/${encodeURIComponent(id)}${tab && tab !== 'overview' ? `/${tab}` : ''}`;
export const weekPath = (moduleId: string): string => `/admin/program/weeks/${encodeURIComponent(moduleId)}`;
export const NEW_COHORT_PATH = '/admin/cohort/new';
export const FLAGS_PATH = '/admin/flags';
/** The Enrollment card on Settings: the one source of seats (PLAN.md § 10.3). */
export const enrollmentPath = (id: string): string => `${cohortPath(id, 'settings')}#enrollment`;

// The mockup's `TONE`: Draft is `off`, Scheduled `info`, Active `ok`; Finished has none, so it is plain.
const STATUS_TONE: Record<CohortStatusWord, Tone> = {
  Draft: 'off',
  Scheduled: 'info',
  Active: 'ok',
  Finished: 'neutral',
};

/** "1 hr 30 min", "1 hr", "45 min". */
export const lengthLine = (mins: number): string => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h} hr${m ? ` ${m} min` : ''}` : `${m} min`;
};

const sessionsOf = (db: Db, id: string): Session[] =>
  db.sessions.filter((s) => s.cohortId === id).sort((a, b) => a.start - b.start);

// ================================================================================================
// The head: the picker, the status word, the shape line
// ================================================================================================

export interface CohortHeadVM {
  label: string;
  status: { label: CohortStatusWord; tone: Tone };
  /**
   * "Amplified AI Accelerator · 6 weeks of building · twice a week · Week 0 opens Sun, Dec 27 · Week 1 opens Sun, Jan 3",
   * and "… · Week 2 of 6" once Week 1 has opened (R-5 audit, D-267).
   */
  line: string;
  draft: boolean;
}

export function cohortHeadVM(db: Db, cohortId: string, now: number): CohortHeadVM | null {
  const co = db.cohorts.find((c) => c.id === cohortId);
  if (!co) return null;
  const status = cohortStatusWord(db, cohortId, now);
  const shape = cohortShapeOf(db, cohortId);
  const progress = cohortProgress(db, cohortId, now);
  return {
    label: cohortLabel(co),
    status: { label: status, tone: STATUS_TONE[status] },
    // The mockup's `p3Line`: a cohort with no building weeks has no shape to say. R-5 audit (D-267, Connor): Week 1's
    // opening (and the setup week's) until it opens, then where the cohort is: "Week N of M".
    line: [PROGRAM, shape && shape.shape.buildWeeks ? shapeLine(shape.shape) : null, progress ? cohortProgressLine(progress, now) : null]
      .filter(Boolean)
      .join(' · '),
    draft: co.status === 'draft',
  };
}

// ================================================================================================
// Overview
// ================================================================================================

export interface FactVM {
  label: string;
  value: string;
  /** The value on a phone, where it differs (the mockup's `ph ? …`). */
  short?: string;
  to?: string;
}

export interface TodoVM {
  key: BeforeKey;
  label: string;
  detail: string;
  done: boolean;
  warn: boolean;
  to: string;
}

export interface NeedVM {
  icon: 'r2File' | 'r2Integrations' | 'r2Community' | 'r2Cohorts' | 'r2Billing';
  title: string;
  detail: string;
  to: string;
  tone: 'bad' | 'warn' | '';
}

export interface RunRowVM {
  id: string;
  n: number;
  title: string;
  line: string;
  published: boolean;
  /** "Opens first" or "This week", the week the cohort is on. */
  now: string | null;
  to: string;
}

export interface ComingVM {
  id: string;
  day: string;
  mon: string;
  title: string;
  line: string;
  flag: string | null;
}

export interface OverviewVM {
  facts: FactVM[];
  before: { lines: TodoVM[]; done: number; total: number; left: number } | null;
  needs: NeedVM[] | null;
  run: RunRowVM[];
  readiness: { label: string; n: number; to: string }[] | null;
  teams: number | null;
  seats: { taken: number | null; cap: number; note: string };
  coming: ComingVM[];
  shape: { promise: string; meets: string; seats: string; /** R-5 Phase 5 (D-262): Stripe's price, "$7,500, or two payments"; null for "Not set". */ price: string | null };
}

/**
 * R-5 audit (D-267): "2 second payments are on the calendar · $3,750 each, on Wed, Dec 30." (the mockup's row), opening
 * Revenue › Payments.
 */
function secondPaymentsNeed(p: NonNullable<CohortFacts['secondPayments']>): NeedVM {
  const one = p.count === 1;
  const each = p.each !== null ? dollars(p.each) : null;
  const day = p.next !== null ? fmt.mtDay(p.next) : null;
  const detail = !day ? (each ? `${each}${one ? '' : ' each'}.` : '') : each ? `${each}${one ? '' : ' each'}, on ${day}.` : `The next is on ${day}.`;
  return {
    icon: 'r2Billing',
    title: `${p.count} second payment${one ? ' is' : 's are'} on the calendar`,
    detail,
    to: '/admin/revenue/payments',
    tone: '',
  };
}

const BEFORE_TO = (id: string): Record<BeforeKey, string> => ({
  shape: cohortPath(id, 'settings'),
  weeks: '/admin/program',
  sessions: cohortPath(id, 'schedule'),
  zoom: cohortPath(id, 'schedule'),
  week0: `${cohortPath(id, 'settings')}#dates`,
  stripe: enrollmentPath(id),
  links: enrollmentPath(id),
  included: `${cohortPath(id, 'settings')}#dates`,
  words: `${cohortPath(id, 'settings')}#words`,
  tests: FLAGS_PATH,
  open: enrollmentPath(id),
});

/**
 * `waiting` (R-5 audit, D-267): the threads in this cohort's Community whose last word is a member's (the sidebar's
 * "3 waiting", `useWaitingThreads`, for the cohort the admin is on).
 */
export function overviewVM(db: Db, cohortId: string, now: number, facts: CohortFacts | null, waiting = 0): OverviewVM | null {
  const co = db.cohorts.find((c) => c.id === cohortId);
  if (!co) return null;
  const draft = co.status === 'draft';
  const shape = cohortShapeOf(db, cohortId);
  const progress = cohortProgress(db, cohortId, now);
  const ses = sessionsOf(db, cohortId);
  const next = ses.find((s) => s.start + s.mins * 60_000 > now) ?? null;
  const teams = facts?.teams ?? null;
  const settings = cohortPath(cohortId, 'settings');
  const factsVM: FactVM[] = [
    // R-5 audit (D-267, Connor): Week 1's opening until it opens, then "Week 2 of 6" (the reference's Week fact).
    progress?.kind === 'running'
      ? { label: 'Week', value: `${progress.n} of ${progress.of}`, to: `${settings}#dates` }
      : {
          label: 'Opens',
          value: progress ? `${fmt.mtDay(progress.week1)} · ${fmt.mtCt(progress.week1)}` : 'Not set',
          short: progress ? fmt.mtDay(progress.week1) : 'Not set',
          to: `${settings}#dates`,
        },
    {
      label: 'Shape',
      value: shape ? `${shape.shape.buildWeeks} weeks · ${meetsHowOften(shape.shape.slots)}` : 'Not set',
      to: settings,
    },
    { label: 'Teams', value: `${teams ?? 0} of ${co.capacity} seats`, to: enrollmentPath(cohortId) },
    { label: 'Learners', value: String(facts?.learners ?? 0), to: cohortPath(cohortId, 'people') },
    { label: 'Next session', value: next ? fmt.mtDay(next.start) : 'None yet', to: cohortPath(cohortId, 'schedule') },
  ];

  const b = draft ? beforeItOpens(db, cohortId, facts ?? undefined) : null;
  const to = BEFORE_TO(cohortId);
  const before = b
    ? {
        lines: b.lines.map((l) => ({
          key: l.key,
          label: l.label,
          detail: l.detail,
          done: l.done,
          warn: !!l.warn,
          to: to[l.key],
        })),
        done: b.done,
        total: b.lines.length,
        left: b.lines.length - b.done,
      }
    : null;

  let needs: NeedVM[] | null = null;
  if (!draft) {
    const noZoom = ses.filter((s) => !s.zoom.trim() && s.start > now);
    const firstNoZoom = noZoom[0];
    const list: (NeedVM | null)[] = [
      facts?.intakeNotStarted
        ? {
            icon: 'r2File' as const,
            title: `${facts.intakeNotStarted} team${facts.intakeNotStarted === 1 ? ' hasn’t' : 's haven’t'} started their intake`,
            detail: 'Open the cohort’s people to see which.',
            to: cohortPath(cohortId, 'people'),
            tone: 'bad' as const,
          }
        : null,
      facts?.intakeGhlFailed
        ? {
            icon: 'r2Integrations' as const,
            title: `${facts.intakeGhlFailed} intake${facts.intakeGhlFailed === 1 ? ' didn’t' : 's didn’t'} reach GHL`,
            detail: 'Retry from the team’s Intake tab.',
            to: cohortPath(cohortId, 'people'),
            tone: 'bad' as const,
          }
        : null,
      // R-5 audit (D-267): the mockup's two rows D-255 left out, each from a source that exists.
      waiting > 0
        ? {
            icon: 'r2Community' as const,
            title: `${waiting} thread${waiting === 1 ? ' is' : 's are'} waiting on you`,
            detail: waiting === 1 ? 'The last word in it is a member’s.' : 'The last word in each is a member’s.',
            to: cohortPath(cohortId, 'community'),
            tone: 'warn' as const,
          }
        : null,
      noZoom.length
        ? {
            icon: 'r2Cohorts' as const,
            title: `${noZoom.length} session${noZoom.length === 1 ? ' has' : 's have'} no Zoom link`,
            detail: firstNoZoom ? `The next one without a link is ${fmt.mtDay(firstNoZoom.start)}.` : '',
            to: cohortPath(cohortId, 'schedule'),
            tone: 'warn' as const,
          }
        : null,
      facts?.secondPayments?.count ? secondPaymentsNeed(facts.secondPayments) : null,
    ];
    needs = list.filter((x): x is NeedVM => x !== null);
  }

  const rows = runRows(db, cohortId);
  const current = [...rows].reverse().find((w) => w.opensAt !== null && w.opensAt <= now) ?? null;
  const run: RunRowVM[] = rows.map((w) => {
    const meets = w.sessions.map((s) => fmt.mtDay(s.start)).join(' and ');
    const opensWhen =
      w.opensAt !== null
        ? fmt.mtDay(w.opensAt)
        : w.n === 0 && co.previewOpensAt !== undefined
          ? fmt.mtDay(co.previewOpensAt)
          : 'with the course';
    return {
      id: w.moduleId,
      n: w.n,
      title: w.title,
      line: `Opens ${opensWhen}${meets ? ` · ${draft ? 'Meets' : 'Live build'} ${meets}` : ' · Self-paced'}`,
      published: w.published,
      now: current ? (current.moduleId === w.moduleId ? 'This week' : null) : w === rows[0] ? 'Opens first' : null,
      to: weekPath(w.moduleId),
    };
  });

  const readiness =
    !draft && teams
      ? [
          { label: 'Signed in', n: facts?.signedIn ?? 0, to: cohortPath(cohortId, 'people') },
          { label: 'Intake submitted', n: facts?.intakeSubmitted ?? 0, to: cohortPath(cohortId, 'people') },
          { label: 'Paid in full', n: facts?.paidInFull ?? 0, to: '/admin/revenue/payments' },
        ]
      : null;

  const clashes = new Set(cohortClashes(db, cohortId).map((c) => c.start));
  const coming = ses
    .filter((s) => s.start + s.mins * 60_000 > now)
    .slice(0, 3)
    .map((s) => {
      const [dow, mon, dd] = fmt.mtDay(s.start).replace(',', '').split(' ');
      return {
        id: s.id,
        day: dd ?? '',
        mon: mon ?? '',
        title: s.title,
        line: `${dow} · ${fmt.mtCt(s.start)}`,
        flag: clashes.has(s.start) ? 'Same time' : !s.zoom.trim() ? 'No link' : null,
      };
    });

  const words = cohortWordsOf(db, cohortId);
  return {
    facts: factsVM,
    before,
    needs,
    run,
    readiness,
    teams,
    seats: {
      taken: teams,
      cap: co.capacity,
      note:
        co.status === 'draft'
          ? 'No one yet. Enrollment is closed.'
          : 'Enrollment is open. A team that buys a seat lands here.',
    },
    coming,
    shape: {
      promise: words?.promise || 'Not set',
      meets: shape?.shape.slots.length ? meetsLine(shape.shape.slots) : 'Self-paced',
      seats: `${co.capacity} teams`,
      price: enrollmentVM(db, cohortId, facts).shapePrice,
    },
  };
}

// ================================================================================================
// Schedule
// ================================================================================================

export type ScheduleFilter =
  'All sessions' | 'Live builds' | 'Office hours' | 'Without a Zoom link' | 'Same time as another cohort';

export interface ScheduleRowVM {
  id: string;
  title: string;
  kind: string;
  day: string;
  time: string;
  week: { label: string; to: string } | null;
  zoom: { label: string; tone: Tone };
  reminder: { label: string; tone: Tone };
  clash: boolean;
  hasZoom: boolean;
  sessionKind: SessionType | null;
  primary: { label: string; mutation: 'goLive' | 'endSession' | 'publishReplay' } | null;
  ended: boolean;
  replayUrl: string;
  zoomUrl: string;
  moduleId: string | null;
}

export interface ScheduleVM {
  facts: FactVM[];
  filters: ScheduleFilter[];
  rows: ScheduleRowVM[];
  /** Weeks with no session, and how many the rhythm would add ("Add 4 sessions"). */
  missing: { first: number; last: number; add: number; rhythm: string } | null;
  /** Sessions at the same instant as another cohort's, not yet kept on purpose. */
  clash: { n: number; words: string; kept: boolean } | null;
}

export function scheduleVM(db: Db, cohortId: string, now: number): ScheduleVM | null {
  const co = db.cohorts.find((c) => c.id === cohortId);
  if (!co) return null;
  const ses = sessionsOf(db, cohortId);
  const shape = cohortShapeOf(db, cohortId);
  const rows = runRows(db, cohortId);
  const byModule = new Map(rows.map((w) => [w.moduleId, w]));
  const clashes = new Set(cohortClashes(db, cohortId).map((c) => c.start));
  const slots = shape?.shape.slots ?? [];
  const total = rows.filter((w) => w.n > 0).length * slots.length;
  const noZoom = ses.filter((s) => !s.zoom.trim()).length;
  const clash = ses.filter((s) => clashes.has(s.start)).length;
  const live = co.status !== 'draft';
  const nextId = live ? (ses.find((s) => s.live || s.start + s.mins * 60_000 > now)?.id ?? null) : null;
  const out: ScheduleRowVM[] = ses.map((s) => {
    const w = s.moduleId ? byModule.get(s.moduleId) : undefined;
    const st = sessionState(s, now);
    const primary =
      st === 'live'
        ? { label: 'End Session', mutation: 'endSession' as const }
        : st === 'processing'
          ? { label: 'Publish Replay', mutation: 'publishReplay' as const }
          : s.id === nextId && st !== 'replay'
            ? { label: 'Go Live', mutation: 'goLive' as const }
            : null;
    return {
      id: s.id,
      title: s.title,
      kind: s.kind ? LAYOUT_KIND_LABEL[s.kind] : 'Session',
      day: fmt.mtDay(s.start),
      time: fmt.mtCt(s.start),
      week: w ? { label: `Week ${w.n} · ${w.title}`, to: weekPath(w.moduleId) } : null,
      zoom: clashes.has(s.start)
        ? { label: `Same time as ${clashWordsShort(db, cohortId)}`, tone: 'warn' }
        : s.zoom.trim()
          ? { label: 'Ready', tone: 'ok' }
          : { label: 'No link yet', tone: 'warn' },
      reminder: !s.zoom.trim()
        ? { label: 'Draft', tone: 'off' }
        : now >= s.start - 864e5
          ? { label: 'Sent', tone: 'ok' }
          : { label: 'Scheduled', tone: 'info' },
      clash: clashes.has(s.start),
      hasZoom: !!s.zoom.trim(),
      sessionKind: s.kind ?? null,
      primary,
      ended: !s.live && now >= s.start + s.mins * 60_000,
      replayUrl: s.replayUrl ?? '',
      zoomUrl: s.zoom,
      moduleId: s.moduleId ?? null,
    };
  });
  const empty = rows.filter((w) => w.n > 0 && !w.sessions.length);
  const first = ses.find((s) => s.start + s.mins * 60_000 > now);
  return {
    facts: [
      { label: 'On the calendar', value: `${ses.length} of ${total} sessions` },
      { label: 'Rhythm', value: slots.length ? meetsLine(slots) : 'Self-paced', to: cohortPath(cohortId, 'settings') },
      { label: 'Without a Zoom link', value: String(noZoom) },
      clash
        ? { label: 'Same time as another cohort', value: String(clash) }
        : { label: 'Next', value: first ? `${fmt.mtDay(first.start)} · ${fmt.mtCt(first.start)}` : 'None yet' },
    ],
    filters: [
      'All sessions',
      'Live builds',
      'Office hours',
      'Without a Zoom link',
      ...(clash ? (['Same time as another cohort'] as const) : []),
    ],
    rows: out,
    missing:
      empty.length && slots.length && shape?.stored
        ? {
            first: empty[0]!.n,
            last: empty[empty.length - 1]!.n,
            add: empty.length * slots.length,
            rhythm: rhythmWords(slots),
          }
        : null,
    clash: clash ? { n: clash, words: clashWords(db, cohortId), kept: co.overlapOkAt !== undefined } : null,
  };
}

/** "December's" for the Zoom column's pill: the short name of the first cohort a session clashes with. */
function clashWordsShort(db: Db, cohortId: string): string {
  const c = cohortClashes(db, cohortId)[0];
  const other = c ? db.cohorts.find((x) => x.id === c.cohortId) : undefined;
  return other ? cohortShortName(other).slice(0, 3) : 'another cohort';
}

const DAY_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/** "Tuesday live build and Thursday office hours". */
const rhythmWords = (slots: readonly CohortSlot[]): string =>
  slots.map((s) => `${DAY_NAME[s.day]} ${LAYOUT_KIND_LABEL[s.kind].toLowerCase()}`).join(' and ');

/** The cohort's weeks, for the session form's Week field. */
export const runRowsForForm = (db: Db, cohortId: string): { id: string; n: number; title: string }[] =>
  runRows(db, cohortId).map((w) => ({ id: w.moduleId, n: w.n, title: w.title }));

export function filterRows(rows: readonly ScheduleRowVM[], f: ScheduleFilter): ScheduleRowVM[] {
  return rows.filter((r) =>
    f === 'All sessions'
      ? true
      : f === 'Without a Zoom link'
        ? !r.hasZoom
        : f === 'Same time as another cohort'
          ? r.clash
          : f === 'Live builds'
            ? r.sessionKind === 'live_build'
            : r.sessionKind === 'office_hours' || r.sessionKind === 'goal_planning',
  );
}

// ================================================================================================
// Settings
// ================================================================================================

export interface SettingsVM {
  shape: {
    rows: { label: string; value: string }[];
    weeks: string;
    hosts: string;
    stored: boolean;
    setupWeek: boolean;
  };
  dates: { label: string; value: string }[];
  enrollment: EnrollmentVM;
  words: { name: string; promise: string; how: string[]; holiday: string; unread: boolean } | null;
  includedFrozen: boolean;
}

export function settingsVM(db: Db, cohortId: string, facts: CohortFacts | null): SettingsVM | null {
  const co = db.cohorts.find((c) => c.id === cohortId);
  if (!co) return null;
  const view = cohortShapeOf(db, cohortId);
  const shape = view?.shape;
  const tz = co.timezone ?? MT;
  const rows = runRows(db, cohortId);
  const w1 = rows.find((w) => w.n === 1)?.opensAt ?? null;
  const setup = rows.find((w) => w.n === 0);
  const program = programWeeks(db).length;
  const words = cohortWordsOf(db, cohortId);
  const later = weekOpensLine(db, cohortId);
  return {
    shape: {
      rows: shape
        ? [
            {
              label: 'Length',
              value: `${shape.buildWeeks} weeks of building${shape.setupWeek ? ', after a setup week' : ''}`,
            },
            ...shape.slots.map((s, i) => ({ label: i ? 'And' : 'Meets', value: slotLine(s, tz) })),
          ]
        : [],
      weeks: `${shape?.buildWeeks ?? 0} of the program’s ${program}`,
      hosts: cohortHosts(co) || 'Not set',
      stored: !!view?.stored,
      setupWeek: !!shape?.setupWeek,
    },
    dates: [
      { label: 'Week 1 opens', value: w1 !== null ? `${fmt.mtDay(w1)} · ${fmt.mtCt(w1)}` : 'Not set' },
      ...(later ? [{ label: 'A week opens', value: later }] : []),
      {
        label: setup ? 'Setup week opens' : 'Preview opens',
        value:
          co.previewOpensAt !== undefined
            ? `${fmt.mtDay(co.previewOpensAt)} · ${fmt.mtCt(co.previewOpensAt)}`
            : 'Not set',
      },
      ...(setup
        ? [
            {
              label: 'Week 0 is due',
              value: setup.dueAt !== null ? `${fmt.mtDay(setup.dueAt)} · ${fmt.mtCt(setup.dueAt)}` : 'Not set',
            },
          ]
        : []),
      {
        label: 'Welcome email',
        value:
          co.welcomeSendsAt !== undefined
            ? `${fmt.mtDay(co.welcomeSendsAt)} · ${fmt.mtCt(co.welcomeSendsAt)}`
            : 'When a team is enrolled',
      },
      { label: 'Included time ends', value: co.includedUntil ? includedLine(co.includedUntil) : 'Not set' },
      { label: 'Session reminders', value: 'The day before and an hour before, in MT and CT' },
      { label: 'Time zone', value: 'Mountain in the admin. Learners see Central.' },
    ],
    enrollment: enrollmentVM(db, cohortId, facts),
    words: words
      ? { name: words.name, promise: words.promise, how: words.how, holiday: words.holiday, unread: words.unread }
      : null,
    includedFrozen: (facts?.plans ?? 0) > 0,
  };
}

// ================================================================================================
// R-5 Phase 5 (D-262): Settings › Enrollment, what the cohort sells through (PLAN.md § 10.5's "Sells through")
// ================================================================================================

/** A value on the Enrollment card: words, or a warning pill (the mockup's `pl warn`) when there is nothing to show. */
export interface EnrollValue {
  text: string;
  warn: boolean;
}

export interface EnrollmentVM {
  open: boolean;
  /** "0 of 15 taken": opens the cohort's people. */
  seats: string;
  /** Stripe's price for paid in full, or "Not set" / "Not found in Stripe". */
  price: EnrollValue;
  twoPay: string;
  founding: string;
  links: EnrollValue;
  ghl: string;
  /** The mockup's button: "Set the price" with no keys, else "Change the price". */
  priceButton: string;
  /** The Overview's "This Cohort's Shape" price: "$7,500, or two payments", or null for its "Not set" pill. */
  shapePrice: string | null;
}

/** Stripe's price under a key, from the cohort's facts; undefined when Stripe was not asked or has none there. */
export const stripePriceOf = (facts: CohortFacts | null | undefined, key: string | null): StripePrice | undefined =>
  key && facts?.stripe?.prices === 'ok' ? (facts.stripe.price[key] ?? undefined) : undefined;

export function enrollmentVM(db: Db, cohortId: string, facts: CohortFacts | null): EnrollmentVM {
  const s: CohortSelling = cohortSelling(db, cohortId);
  const co = db.cohorts.find((c) => c.id === cohortId);
  const full = stripePriceOf(facts, s.keys.full);
  const anyKey = !!(s.keys.full || s.keys.rollover || s.keys.twoPay);
  const price: EnrollValue = !s.keys.full
    ? { text: 'Not set', warn: true }
    : full
      ? { text: dollars(full.unitAmount), warn: false }
      : { text: facts?.stripe?.prices === 'ok' ? 'Not found in Stripe' : 'Not found yet', warn: true };
  const needed = cohortLinksNeeded(s);
  const entered = needed.filter((l) => !!l.url).length;
  return {
    open: enrollmentOpen(co),
    seats: `${facts?.teams ?? 0} of ${s.capacity} taken`,
    price,
    twoPay: s.twoPay && !s.keys.twoPay ? 'Offered. Set its price to see Stripe’s schedule.' : twoPayWords(s, stripePriceOf(facts, s.keys.twoPay)),
    founding: !s.founding ? 'No' : s.foundingClosesAt === null ? 'Yes. No close is set.' : `Yes, until ${foundingCloseLine(s.foundingClosesAt)}`,
    links: entered === 0 ? { text: 'Not set', warn: true } : { text: `${entered} of ${needed.length} entered`, warn: entered < needed.length },
    ghl: s.ghlValue,
    priceButton: anyKey ? 'Change the price' : 'Set the price',
    shapePrice: full ? `${dollars(full.unitAmount)}${s.twoPay ? ', or two payments' : ''}` : null,
  };
}

/** The price dialog's form: the three lookup keys and whether two payments are offered. */
export interface PriceForm {
  full: string;
  rollover: string;
  twoPay: string;
  offerTwoPay: boolean;
}

export function priceForm(db: Db, cohortId: string): PriceForm {
  const s = cohortSelling(db, cohortId);
  return { full: s.keys.full ?? '', rollover: s.keys.rollover ?? '', twoPay: s.keys.twoPay ?? '', offerTwoPay: s.twoPay };
}

/** What Stripe has under a key as the price dialog says it: its price, or why there is none to show. */
export function keyPriceLine(facts: CohortFacts | null | undefined, saved: string | null, typed: string): string {
  const key = typed.trim();
  if (!key) return 'Not set';
  if (key !== saved) return 'Save to look it up in Stripe.';
  if (facts?.stripe?.prices !== 'ok') return 'Stripe can’t be asked right now.';
  const p = facts.stripe.price[key];
  if (!p) return 'Not found in Stripe';
  return `Stripe: ${p.interval ? `${dollars(p.unitAmount)} a ${p.interval}${(p.intervalCount ?? 1) > 1 ? ` (every ${p.intervalCount})` : ''}` : `${dollars(p.unitAmount)} once`}`;
}

/** The Edit enrollment dialog's form: founding and its close (MT), the two links, the seats and GoHighLevel's value. */
export interface EnrollmentForm {
  founding: boolean;
  closesDate: string;
  closesTime: string;
  linkFull: string;
  linkTwoPay: string;
  capacity: string;
  ghl: string;
}

export function enrollmentForm(db: Db, cohortId: string): EnrollmentForm {
  const s = cohortSelling(db, cohortId);
  const co = db.cohorts.find((c) => c.id === cohortId);
  const at = foundingCloseInputs(s.foundingClosesAt, co?.timezone ?? MT);
  return {
    founding: s.founding,
    closesDate: at.date,
    closesTime: at.time,
    linkFull: s.links.full ?? '',
    linkTwoPay: s.links.twoPay ?? '',
    capacity: String(s.capacity),
    ghl: s.ghlValue,
  };
}

/** The Open enrollment dialog's sentence (the mockup's `useEnroll`): who is placed here, up to its cap, and from when. */
export function openEnrollmentBody(db: Db, cohortId: string): string {
  const co = db.cohorts.find((c) => c.id === cohortId)!;
  const s = cohortSelling(db, cohortId);
  const rows = runRows(db, cohortId);
  const setup = rows.some((w) => w.n === 0);
  const at = setup ? (co.previewOpensAt ?? null) : (rows.find((w) => w.n === 1)?.opensAt ?? null);
  const when = at !== null ? fmt.mtDay(at) : 'its first day';
  return `From now on, a team that buys a seat is placed in this cohort, up to ${s.capacity} seats. They get the welcome email and can start ${setup ? 'the setup week' : 'Week 1'} on ${when}.`;
}

// ================================================================================================
// The Dates and Release dialog's form
// ================================================================================================

export interface DatesWeekForm {
  moduleId: string;
  n: number;
  title: string;
  opens: string;
  due: string;
  /** Set above: the setup week opens with the preview. */
  setup: boolean;
}

export interface DatesForm {
  week1: string;
  openTime: string;
  previewDate: string;
  previewTime: string;
  welcomeDate: string;
  welcomeTime: string;
  included: string;
  weeks: DatesWeekForm[];
}

const dateOf = (t: number | null | undefined, tz: string): string =>
  t === null || t === undefined ? '' : zonedInputs(t, tz).date;
const timeOf = (t: number | null | undefined, tz: string): string =>
  t === null || t === undefined ? '' : zonedInputs(t, tz).time;

export function datesForm(db: Db, cohortId: string): DatesForm | null {
  const co = db.cohorts.find((c) => c.id === cohortId);
  if (!co) return null;
  const tz = co.timezone ?? MT;
  const rows = runRows(db, cohortId);
  return {
    week1: dateOf(rows.find((w) => w.n === 1)?.opensAt, tz),
    openTime: co.defaultOpenTime ?? '12:00',
    previewDate: dateOf(co.previewOpensAt, tz),
    previewTime: timeOf(co.previewOpensAt, tz) || '12:00',
    welcomeDate: dateOf(co.welcomeSendsAt, tz),
    welcomeTime: timeOf(co.welcomeSendsAt, tz) || '12:00',
    included: co.includedUntil ?? '',
    weeks: rows.map((w) => ({
      moduleId: w.moduleId,
      n: w.n,
      title: w.title,
      opens: dateOf(w.opensAt, tz),
      due: dateOf(w.dueAt, tz),
      setup: w.n === 0,
    })),
  };
}

const DAY_MS = 86_400_000;
const shiftDay = (date: string, days: number): string =>
  date ? new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10) : date;

/** Moving Week 1 moves every week after it by the same number of days (the mockup's note). */
export function moveWeek1(f: DatesForm, to: string): DatesForm {
  if (!f.week1 || !to) return { ...f, week1: to };
  const days = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${f.week1}T00:00:00Z`)) / DAY_MS);
  return {
    ...f,
    week1: to,
    weeks: f.weeks.map((w) => (w.n >= 1 ? { ...w, opens: shiftDay(w.opens, days), due: shiftDay(w.due, days) } : w)),
  };
}

/** What `saveCohortRun` takes from the form: each week's opening (at the open time) and due date. */
export function runArgs(cohortId: string, f: DatesForm, stored: ReturnType<typeof runRows>, tz = MT) {
  return {
    cohortId,
    weeks: f.weeks.map((w) => {
      const was = stored.find((x) => x.moduleId === w.moduleId);
      const time = (t: number | null | undefined, fallback: string) =>
        t === null || t === undefined ? fallback : zonedInputs(t, tz).time;
      return {
        moduleId: w.moduleId,
        opens:
          w.setup || !w.opens
            ? null
            : {
                date: w.opens,
                time:
                  was && was.opensAt !== null && dateOf(was.opensAt, tz) === w.opens
                    ? time(was.opensAt, f.openTime)
                    : f.openTime,
              },
        due: w.due ? { date: w.due, time: time(was?.dueAt, f.openTime) } : null,
      };
    }),
  };
}

/** Whether the run part of the form differs from what is stored. */
export function runChanged(f: DatesForm, initial: DatesForm): boolean {
  return f.weeks.some((w, i) => w.opens !== initial.weeks[i]?.opens || w.due !== initial.weeks[i]?.due);
}

// ================================================================================================
// New cohort's preview: the calendar a shape and a start day make, as the form changes
// ================================================================================================

export interface NewCohortForm {
  name: string | null;
  /** R-5 Phase 5 (D-262): the cohort it starts from (any cohort not archived), or '' for a blank cohort. */
  from: string;
  promise: string | null;
  setupWeek: boolean;
  picks: string[];
  slots: CohortSlot[];
  start: string;
  included: string | null;
  hosts: string;
}

export interface PlanWeekVM {
  id: string;
  n: number;
  title: string;
  opens: string;
  sessions: { label: string; tone: 'build' | 'alt' | 'warn' | 'off'; title?: string }[];
}

export interface NewCohortVM {
  name: string;
  autoName: string;
  promise: string;
  setupOpens: string | null;
  firstSession: string | null;
  lastSession: string | null;
  plan: PlanWeekVM[];
  sessions: number;
  clash: { n: number; words: string } | null;
  holidays: string[];
  drafts: number;
  problem: string | null;
  included: string;
  laid: LaidSession[];
}

const MON_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** `selfId`: the cohort whose shape this is, when it exists (the Shape dialog), so its own sessions are no clash. */
export function newCohortVM(
  db: Db,
  f: NewCohortForm,
  sourcePromise: string,
  selfId: string | null = null,
): NewCohortVM {
  const startMs = Date.parse(`${f.start}T12:00:00Z`);
  const autoName = Number.isNaN(startMs)
    ? 'New Cohort'
    : `${MON_FULL[new Date(startMs).getUTCMonth()]} ${new Date(startMs).getUTCFullYear()} Cohort`;
  const name = f.name === null ? autoName : f.name;
  const input = { start: f.start, setupWeek: f.setupWeek, picks: f.picks, slots: f.slots };
  const problem = layoutProblem(db, input);
  const layout = problem ? null : layOut(db, input);
  const warnings = layout ? layoutWarnings(db, selfId, layout.sessions) : [];
  const clashAt = new Set(warnings.filter((w) => w.kind === 'same_time').map((w) => w.start));
  const holidayAt = new Map(warnings.flatMap((w) => (w.kind === 'holiday' ? [[w.start, w.holiday] as const] : [])));
  const titleOf = (id: string) =>
    programWeeks(db).find((w) => w.id === id)?.title ?? db.modules.find((m) => m.id === id)?.course?.title ?? id;
  const plan: PlanWeekVM[] = layout
    ? layout.weeks.map((w) => {
        const mine = layout.sessions.filter((s) => s.moduleId === w.moduleId);
        const opens = w.opensAt ?? layout.setupOpensAt;
        return {
          id: w.moduleId,
          n: w.n,
          title: titleOf(w.moduleId),
          opens: opens !== null ? `Opens ${fmt.mtDay(opens)}` : 'Opens with the course',
          sessions: mine.map((s) => {
            const clash = clashAt.has(s.start);
            return {
              label: `${fmt.mtDay(s.start).replace(',', '')} · ${fmt.mtTime(s.start).replace(':00', '')} · ${LAYOUT_KIND_LABEL[s.kind]}`,
              tone: clash ? ('warn' as const) : s.kind === 'live_build' ? ('build' as const) : ('alt' as const),
              ...(clash
                ? { title: 'Same time as another cohort’s session' }
                : holidayAt.has(s.start)
                  ? { title: holidayAt.get(s.start)! }
                  : {}),
            };
          }),
        };
      })
    : [];
  const ses = layout?.sessions ?? [];
  const first = ses[0];
  const last = ses[ses.length - 1];
  const included = f.included ?? (layout ? (lastBuildPlus90(layout.sessions) ?? '') : '');
  const drafts = f.picks.filter((id) => db.modules.find((m) => m.id === id)?.status === 'draft').length;
  return {
    name,
    autoName,
    promise: f.promise === null ? (f.from ? sourcePromise : autoPromise(f.picks.length)) : f.promise,
    setupOpens: layout?.setupOpensAt != null ? fmt.mtDay(layout.setupOpensAt) : null,
    firstSession: first ? fmt.mtDay(first.start) : null,
    lastSession: last ? fmt.mtDay(last.start) : null,
    plan,
    sessions: ses.length,
    clash: clashAt.size
      ? { n: ses.filter((s) => clashAt.has(s.start)).length, words: clashWordsFor(db, warnings) }
      : null,
    holidays: [...holidayAt].map(([t, h]) => `${fmt.mtDay(t)} is ${h}`),
    drafts,
    problem,
    included,
    laid: ses,
  };
}

function lastBuildPlus90(sessions: readonly LaidSession[]): string | null {
  const builds = sessions.filter((s) => s.kind === 'live_build');
  if (!builds.length) return null;
  const day = zonedInputs(Math.max(...builds.map((s) => s.start)), MT).date;
  return new Date(Date.parse(`${day}T00:00:00Z`) + 90 * DAY_MS).toISOString().slice(0, 10);
}

function clashWordsFor(db: Db, warnings: ReturnType<typeof layoutWarnings>): string {
  const ids = [...new Set(warnings.flatMap((w) => (w.kind === 'same_time' ? [w.cohortId] : [])))];
  return ids
    .map((id) => db.cohorts.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => !!c)
    .map((c) => `${cohortShortName(c)}’s`)
    .join(' and ');
}

/** The same-time note's second sentence, from the other cohort's own rhythm: "Its Wednesday build and Thursday office hours are at 12:00 PM MT through Thu, Feb 4." */
export function otherRhythmLine(db: Db, warnings: ReturnType<typeof layoutWarnings>): string | null {
  const id = warnings.find((w) => w.kind === 'same_time') as { cohortId: string } | undefined;
  if (!id) return null;
  const shape = cohortShapeOf(db, id.cohortId);
  const ses = sessionsOf(db, id.cohortId);
  const last = ses[ses.length - 1];
  if (!shape || !shape.shape.slots.length || !last) return null;
  const times = [...new Set(shape.shape.slots.map((s) => s.time))];
  const kinds = shape.shape.slots
    .map((s) => `${DAY_NAME[s.day]} ${s.kind === 'live_build' ? 'build' : LAYOUT_KIND_LABEL[s.kind].toLowerCase()}`)
    .join(' and ');
  const at = times.length === 1 ? ` are at ${fmt.mtTime(Date.parse(`2027-01-05T${times[0]}:00-07:00`))}` : '';
  return `Its ${kinds}${at} through ${fmt.mtDay(last.start)}.`;
}
