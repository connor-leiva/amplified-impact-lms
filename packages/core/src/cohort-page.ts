// R-5 Phase 3 (D-255): what the Cohort page reads about one cohort, in one place: its status word, its shape (stored,
// or derived for display for a cohort that has none stored, December's, Q-28), its words, its included time, the
// "A week opens" line (Q-27), and "Before it opens", which is also Open enrollment's refusal (PLAN.md § 10.3: one
// function answers both, so they cannot drift).
//
// Pure: no clock (`now` comes in), no random source. Facts the snapshot does not hold (the audit rows the test sends
// write, the cohort plans a cohort has sold) come in as `CohortFacts`, read by the API.

import { DEFAULT_COHORT_ID, isCourseWeek } from './accelerator';
import { LAYOUT_KIND_LABEL, cohortRun, layoutWarnings, meetsLine } from './cohort-run';
import { cohortSelling, enrollmentOpen, paymentLinksLine, stripePriceLine } from './cohort-selling';
import type { CohortStripeFacts } from './cohort-selling';
import { COURSE_TZ, zonedInputs, zonedInstant } from './course-actions';
import { fmt } from './time';
import type { Cohort, CohortShape, CohortSlot, CohortWords, Db, Session, SessionType } from './types';

const DAY = 86_400_000;
const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const NUMBER_WORD = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];

const tzOf = (co: Pick<Cohort, 'timezone'>): string => co.timezone ?? COURSE_TZ;
const cohortOf = (db: Pick<Db, 'cohorts'>, id: string): Cohort | undefined => db.cohorts.find((c) => c.id === id);
const sessionsOf = (db: Pick<Db, 'sessions'>, id: string): Session[] =>
  db.sessions.filter((s) => s.cohortId === id).sort((a, b) => a.start - b.start || a.id.localeCompare(b.id));

/** "December" from "December 2026 Cohort", or a cohort's name: the word the mockup says ("same time as December's"). */
export function cohortShortName(co: Pick<Cohort, 'name'>): string {
  const name = co.name.includes(' · ') ? co.name.slice(co.name.lastIndexOf(' · ') + 3) : co.name;
  return name.replace(/\s+cohort$/i, '').split(/\s+/)[0] ?? name;
}

// ================================================================================================
// Status words (PLAN.md 2.5, § 10.3): Draft, Scheduled, Active, Finished. Never written to `cohorts.status`.
// ================================================================================================

export type CohortStatusWord = 'Draft' | 'Scheduled' | 'Active' | 'Finished';

/** When the cohort first opens (its setup week's opening, which is its preview, else Week 1's), or null with none. */
export function cohortOpensFirst(db: Pick<Db, 'cohorts' | 'modules' | 'sessions'>, cohortId: string): number | null {
  const co = cohortOf(db, cohortId);
  if (!co) return null;
  const run = cohortRun(db, cohortId);
  const opens = run.map((w) => w.opensAt).filter((t): t is number => t !== null);
  const setup = run.some((w) => w.n === 0);
  const all = [...opens, ...(setup && co.previewOpensAt !== undefined ? [co.previewOpensAt] : [])];
  return all.length ? Math.min(...all) : null;
}

/** When the cohort's last session ends, or null with none. */
export function cohortLastEnd(db: Pick<Db, 'sessions'>, cohortId: string): number | null {
  const ends = sessionsOf(db, cohortId).map((s) => s.start + s.mins * 60_000);
  return ends.length ? Math.max(...ends) : null;
}

/**
 * The status word: Draft while `cohorts.status` is `draft`; Active from the cohort's first opening (its setup week, or
 * Week 1) to the end of its last session; Finished after that, until it is archived (Q-29); Scheduled before it opens.
 */
export function cohortStatusWord(db: Pick<Db, 'cohorts' | 'modules' | 'sessions'>, cohortId: string, now: number): CohortStatusWord {
  const co = cohortOf(db, cohortId);
  if (!co || co.status === 'draft') return 'Draft';
  const end = cohortLastEnd(db, cohortId) ?? co.end;
  if (now >= end) return 'Finished';
  const opens = cohortOpensFirst(db, cohortId) ?? co.start;
  return now >= opens ? 'Active' : 'Scheduled';
}

// ================================================================================================
// The shape: stored, or derived for display (Q-28, PLAN.md 2.4: December's is never stored)
// ================================================================================================

export interface CohortShapeView {
  shape: CohortShape;
  /** False for a shape read off the cohort's run and sessions, which only its hosts can change. */
  stored: boolean;
}

/** HH:MM and weekday of an instant in a zone. */
function slotAt(t: number, tz: string): { day: CohortSlot['day']; time: string } {
  const { date, time } = zonedInputs(t, tz);
  return { day: new Date(`${date}T00:00:00Z`).getUTCDay() as CohortSlot['day'], time };
}

/** A cohort's hosts: its shape's, else its own, else the course's instructor (December's "Connor Leiva"). */
export function cohortHosts(co: Cohort): string {
  return co.shape?.hosts ?? co.hosts ?? co.course?.intro.instructor ?? '';
}

/**
 * The cohort's shape. Stored when it has one. Otherwise derived from its run and its sessions (PLAN.md 2.4): its weeks
 * of building and setup week from the run, and for each kind of meeting held in at least half of its building weeks,
 * the most common weekday, time and length (December: Wednesday 12:00 PM MT live build, 90 min; Thursday 12:00 PM MT
 * office hours, 60 min). Null for no such cohort.
 */
export function cohortShapeOf(db: Pick<Db, 'cohorts' | 'modules' | 'sessions'>, cohortId: string): CohortShapeView | null {
  const co = cohortOf(db, cohortId);
  if (!co) return null;
  if (co.shape) return { shape: co.shape, stored: true };
  const run = cohortRun(db, cohortId);
  const building = run.filter((w) => w.n > 0);
  const tz = tzOf(co);
  const byKind = new Map<SessionType, Map<string, { slot: CohortSlot; n: number; weeks: Set<string> }>>();
  const weeksOfKind = new Map<SessionType, Set<string>>();
  for (const s of sessionsOf(db, cohortId)) {
    if (!s.kind || !s.moduleId) continue;
    const at = slotAt(s.start, tz);
    const key = `${at.day}-${at.time}-${s.mins}`;
    const kinds = byKind.get(s.kind) ?? new Map();
    const slot = kinds.get(key) ?? { slot: { day: at.day, time: at.time, kind: s.kind, mins: s.mins }, n: 0, weeks: new Set() };
    slot.n += 1;
    kinds.set(key, slot);
    byKind.set(s.kind, kinds);
    const weeks = weeksOfKind.get(s.kind) ?? new Set();
    weeks.add(s.moduleId);
    weeksOfKind.set(s.kind, weeks);
  }
  const slots: CohortSlot[] = [];
  for (const [kind, kinds] of byKind) {
    if ((weeksOfKind.get(kind)?.size ?? 0) * 2 < building.length) continue;
    const best = [...kinds.values()].sort((a, b) => b.n - a.n || a.slot.day - b.slot.day || a.slot.time.localeCompare(b.slot.time))[0];
    if (best) slots.push(best.slot);
  }
  slots.sort((a, b) => a.day - b.day || a.time.localeCompare(b.time));
  return {
    shape: { buildWeeks: building.length, setupWeek: run.some((w) => w.n === 0), slots, hosts: cohortHosts(co) },
    stored: false,
  };
}

/** "Once a week", "Twice a week", "3 times a week": the mockup's `meetsOf`, as a fact. */
export function meetsHowOften(slots: readonly CohortSlot[]): string {
  if (!slots.length) return 'Self-paced';
  return slots.length === 1 ? 'once a week' : slots.length === 2 ? 'twice a week' : `${slots.length} times a week`;
}

/** "6 weeks of building · twice a week": the mockup's `shapeOf`. */
export const shapeLine = (s: Pick<CohortShape, 'buildWeeks' | 'slots'>): string =>
  `${s.buildWeeks} week${s.buildWeeks === 1 ? '' : 's'} of building · ${meetsHowOften(s.slots)}`;

/** "Tuesday · 12:00 PM MT / 1:00 PM CT · Live build · 1 hr 30 min": one meeting, as the Shape card lists it. */
export function slotLine(slot: CohortSlot, tz: string = COURSE_TZ, on = '2027-01-05'): string {
  const at = zonedInstant(on, slot.time, tz);
  const h = Math.floor(slot.mins / 60);
  const m = slot.mins % 60;
  const length = h ? `${h} hr${m ? ` ${m} min` : ''}` : `${m} min`;
  return `${WEEKDAY[slot.day]} · ${fmt.mtCt(at)} · ${LAYOUT_KIND_LABEL[slot.kind]} · ${length}`;
}

/** "Tue live build and Thu office hours": the rhythm in a line (Phase 2's `meetsLine`), for the Meets fact. */
export const rhythmLine = (slots: readonly CohortSlot[]): string => meetsLine(slots);

// ================================================================================================
// The weeks: the "A week opens" line (Q-27, PLAN.md 2.2) and Week 1's opening
// ================================================================================================

/**
 * "Every Wednesday · 12:00 PM MT / 1:00 PM CT", computed from the run over the weeks after Week 1 (Week 1 has its own
 * line). When they don't all open on the same weekday at the same time, "Each week has its own date" (Q-27 is open:
 * PLAN.md 2.2 asked Connor for these words). Null with no such week.
 */
export function weekOpensLine(db: Pick<Db, 'cohorts' | 'modules' | 'sessions'>, cohortId: string): string | null {
  const co = cohortOf(db, cohortId);
  if (!co) return null;
  const tz = tzOf(co);
  const later = cohortRun(db, cohortId).filter((w) => w.n >= 2 && w.opensAt !== null);
  if (!later.length) return null;
  const keys = new Set(later.map((w) => {
    const s = slotAt(w.opensAt!, tz);
    return `${s.day}-${s.time}`;
  }));
  if (keys.size > 1) return 'Each week has its own date';
  const first = later[0]!.opensAt!;
  return `Every ${WEEKDAY[slotAt(first, tz).day]} · ${fmt.mtCt(first)}`;
}

/** When Week 1 opens, or null. */
export function week1OpensAt(db: Pick<Db, 'cohorts' | 'modules' | 'sessions'>, cohortId: string): number | null {
  return cohortRun(db, cohortId).find((w) => w.n === 1)?.opensAt ?? null;
}

// ================================================================================================
// Included time (Q-22, PLAN.md § 10.3): a date; its instant is the start of that day in America/Chicago
// ================================================================================================

export const INCLUDED_TZ = 'America/Chicago';
/** A seat's included time ends this many days after the cohort's last live build (Connor, Q-22). */
export const INCLUDED_DAYS = 90;

/** The included time's default: the day of the cohort's last live build, in its zone, plus 90 days. Null with none. */
export function includedDefault(builds: readonly Pick<Session, 'start' | 'kind'>[], tz: string = COURSE_TZ): string | null {
  const last = builds.filter((s) => s.kind === 'live_build').reduce<number | null>((a, s) => (a === null || s.start > a ? s.start : a), null);
  if (last === null) return null;
  const day = zonedInputs(last, tz).date;
  return new Date(Date.parse(`${day}T00:00:00Z`) + INCLUDED_DAYS * DAY).toISOString().slice(0, 10);
}

/** The instant a date's included time ends: the start of that day in America/Chicago (as `INSIDERS_FIRST_CHARGE_AT`). */
export const includedUntilAt = (date: string): number => zonedInstant(date, '00:00', INCLUDED_TZ);

/** "Mon, May 10, 2027": an included-time date as the page shows it. */
export const includedLine = (date: string): string => fmt.mtDate(zonedInstant(date, '12:00', COURSE_TZ));

// ================================================================================================
// The words from this cohort (PLAN.md § 10.3): name, the promise, how it works, the holiday note
// ================================================================================================

export interface CohortWordsView extends CohortWords {
  name: string;
  /** Still carries "Read them once": drafted from another cohort's words and not yet saved. */
  unread: boolean;
}

/**
 * A cohort's words: its own (`Cohort.words`, a new cohort's), else its course's (`intro.sub`, `intro.how`,
 * `intro.holiday`, December's). Null for a cohort with neither.
 */
export function cohortWordsOf(db: Pick<Db, 'cohorts'>, cohortId: string): CohortWordsView | null {
  const co = cohortOf(db, cohortId);
  if (!co) return null;
  if (co.words) return { name: co.name, ...co.words, unread: co.wordsCheckedAt === undefined };
  if (co.course) {
    const { sub, how, holiday } = co.course.intro;
    return { name: co.name, promise: sub, how: [...how], holiday, unread: false };
  }
  return null;
}

/** The words a new cohort starts with (§ 10.3): the source cohort's, flagged "Read them once" until saved. */
export function draftWords(db: Pick<Db, 'cohorts'>, sourceCohortId: string): CohortWords | null {
  const w = cohortWordsOf(db, sourceCohortId);
  return w ? { promise: w.promise, how: [...w.how], holiday: w.holiday } : null;
}

/** "Six weeks of building. One hire a week. Built live, on your own numbers.": the mockup's `autoPromise`. */
export const autoPromise = (n: number): string =>
  `${NUMBER_WORD[n] ?? n} weeks of building. One hire a week. Built live, on your own numbers.`;

// ================================================================================================
// Before it opens: Open enrollment's refusals, in order (PLAN.md § 10.3). One function, two readers.
// ================================================================================================

/** What the API reads for a cohort beyond the snapshot (`apps/api/src/lib/cohort-facts.ts`). */
export interface CohortFacts {
  /** The two test sends, each with an `ok` audit row for this cohort (`welcome.test_send`, `week0.test_send`). */
  testSends: { welcome: boolean; week0: boolean };
  /** Cohort plans placed in this cohort, any status, not a test account's: once there is one, its included time is frozen. */
  plans: number;
  /** Its Teams by the spec's rule 2 (a `cohort` plan for it that has not ended, no test account), and their Learners. */
  teams?: number;
  learners?: number;
  /** Of those teams: how many have not started their intake, and how many sent one that did not reach GoHighLevel. */
  intakeNotStarted?: number;
  intakeGhlFailed?: number;
  /** Readiness, out of its teams: a team with someone signed in, with its intake submitted, paid in full. */
  signedIn?: number;
  intakeSubmitted?: number;
  paidInFull?: number;
  /**
   * R-5 Phase 5 (D-262): what Stripe says about the cohort's lookup keys and Payment Links, read only (`PriceBook` and
   * Payment Links: Read). Absent: not asked (Before It Opens' two Stripe lines are then not done).
   */
  stripe?: CohortStripeFacts | null;
}

export const NO_FACTS: CohortFacts = { testSends: { welcome: false, week0: false }, plans: 0 };

export type BeforeKey =
  | 'shape'
  | 'weeks'
  | 'sessions'
  | 'zoom'
  | 'week0'
  | 'stripe'
  | 'links'
  | 'included'
  | 'words'
  | 'tests'
  | 'open';

export interface BeforeLine {
  key: BeforeKey;
  label: string;
  detail: string;
  done: boolean;
  /** A warning that does not hold the cohort back: no setup week. */
  warn?: boolean;
}

export interface BeforeItOpens {
  lines: BeforeLine[];
  /** How many of them are done. */
  done: number;
  /** Why Open enrollment is refused (the first line not done), or null when it may open. */
  refusal: string | null;
}

/** The same-time warnings of a cohort's own sessions against every other cohort that is not archived. */
export function cohortClashes(db: Pick<Db, 'cohorts' | 'sessions'>, cohortId: string) {
  const co = cohortOf(db, cohortId);
  const mine = sessionsOf(db, cohortId);
  return layoutWarnings(db, cohortId, mine, co ? tzOf(co) : COURSE_TZ).filter(
    (w): w is Extract<typeof w, { kind: 'same_time' }> => w.kind === 'same_time',
  );
}

/** "December's office hours" or "December's live build and office hours": what a cohort's sessions clash with. */
export function clashWords(db: Pick<Db, 'cohorts' | 'sessions'>, cohortId: string): string {
  const clashes = cohortClashes(db, cohortId);
  const others = [...new Set(clashes.map((c) => c.cohortId))];
  return others
    .map((id) => {
      const other = cohortOf(db, id)!;
      const kinds = [
        ...new Set(
          clashes
            .filter((c) => c.cohortId === id)
            .map((c) => db.sessions.find((s) => s.id === c.sessionId)?.kind)
            .filter((k): k is SessionType => k !== undefined)
            .map((k) => LAYOUT_KIND_LABEL[k].toLowerCase()),
        ),
      ];
      return `${cohortShortName(other)}’s ${kinds.length ? kinds.join(' and ') : 'sessions'}`;
    })
    .join(' and ');
}

/**
 * What is left before a cohort can open, each line done or not from the record, in the order Open enrollment checks
 * them; and Open enrollment's refusal, which is the first line not done. Shape; Its weeks (all published); Sessions (on
 * the calendar, none at the same time as another cohort's, or the overlap kept on purpose); Zoom links; Week 0 due date
 * (or, with no setup week, a warning); Stripe price found for each lookup key and Payment Links entered (Phase 5: not
 * done until a cohort records them); Included time ends; Words learners see (no word still "Read them once"); Test
 * emails sent; Open enrollment.
 */
export function beforeItOpens(
  db: Pick<Db, 'cohorts' | 'modules' | 'sessions'>,
  cohortId: string,
  facts: CohortFacts = NO_FACTS,
): BeforeItOpens {
  const co = cohortOf(db, cohortId);
  if (!co) return { lines: [], done: 0, refusal: 'No such cohort.' };
  const shape = cohortShapeOf(db, cohortId);
  const run = cohortRun(db, cohortId);
  const building = run.filter((w) => w.n > 0);
  const published = building.filter((w) => w.module.status !== 'draft');
  const sessions = sessionsOf(db, cohortId);
  const clashes = cohortClashes(db, cohortId);
  const clashing = new Set(clashes.map((c) => c.start)).size;
  const kept = co.overlapOkAt !== undefined;
  const zoom = sessions.filter((s) => s.zoom.trim() !== '').length;
  const setup = run.find((w) => w.n === 0);
  const words = cohortWordsOf(db, cohortId);
  const open = enrollmentOpen(co);

  const lines: BeforeLine[] = [];
  lines.push({
    key: 'shape',
    label: 'Shape',
    detail: shape ? shapeLine(shape.shape) + (shape.shape.setupWeek ? ', after a setup week' : '') : 'Not set',
    done: !!shape && shape.shape.buildWeeks > 0,
  });
  lines.push({
    key: 'weeks',
    label: 'Its weeks',
    detail:
      `${published.length} of ${building.length} are published` +
      (building.length - published.length ? '. The rest are still drafts in the curriculum.' : ''),
    done: building.length > 0 && published.length === building.length,
  });
  lines.push({
    key: 'sessions',
    label: 'Sessions',
    detail:
      `${sessions.length} on the calendar` +
      (clashing
        ? kept
          ? `. ${clashing} at the same time as ${clashWords(db, cohortId)}, kept on purpose.`
          : `. ${clashing} are at the same time as ${clashWords(db, cohortId)}.`
        : ''),
    done: sessions.length > 0 && (!clashing || kept),
  });
  lines.push({
    key: 'zoom',
    label: 'Zoom links',
    detail: `${zoom} of ${sessions.length} sessions have one`,
    done: sessions.length > 0 && zoom === sessions.length,
  });
  lines.push(
    setup
      ? {
          key: 'week0',
          label: 'Week 0 due date',
          detail: setup.dueAt !== null ? `${fmt.mtDay(setup.dueAt)} · ${fmt.mtCt(setup.dueAt)}` : 'Not set',
          done: setup.dueAt !== null,
        }
      : {
          key: 'week0',
          label: 'Week 0 due date',
          detail: 'No setup week: no LMS Tour, no welcome email, no intake.',
          done: true,
          warn: true,
        },
  );
  // R-5 Phase 5 (D-262): the cohort's lookup keys found in Stripe (`PriceBook`), and its Payment Links entered and naming
  // this cohort in Stripe (`ai_cohort`), read only. Not done while Stripe can't be asked.
  const selling = cohortSelling(db, cohortId);
  const price = stripePriceLine(selling, facts.stripe);
  const links = paymentLinksLine(selling, facts.stripe);
  lines.push({ key: 'stripe', label: 'Stripe price found for each lookup key', detail: price.detail, done: price.done });
  lines.push({ key: 'links', label: 'Payment Links entered', detail: links.detail, done: links.done });
  lines.push({
    key: 'included',
    label: 'Included time ends',
    detail: co.includedUntil ? includedLine(co.includedUntil) : 'Not set',
    done: co.includedUntil !== undefined,
  });
  lines.push({
    key: 'words',
    label: 'Words learners see',
    detail: !words
      ? 'Not written yet'
      : words.unread
        ? 'Copied from December: the promise, how it works and the holiday note. Read them once.'
        : 'The promise, how it works and the holiday note',
    done: !!words && !words.unread,
  });
  const sent = [facts.testSends.welcome ? null : 'the welcome', facts.testSends.week0 ? null : 'Week 0 Is Open'].filter(
    (x): x is string => x !== null,
  );
  lines.push({
    key: 'tests',
    label: 'Test emails sent',
    detail: sent.length ? `Not yet: ${sent.join(' and ')}` : 'The welcome and Week 0 Is Open, each sent as a test',
    done: !sent.length,
  });
  lines.push({
    key: 'open',
    label: 'Open enrollment',
    detail: open ? 'A team that buys a seat is placed here' : 'Off. Turn it on when the rest is done.',
    done: open,
  });
  const first = lines.find((l) => !l.done && l.key !== 'open');
  return {
    lines,
    done: lines.filter((l) => l.done).length,
    refusal: first ? `${first.label}: ${first.detail}` : null,
  };
}

/** Open enrollment's answer: why not, or null. The same lines the checklist draws (`beforeItOpens`). */
export const openEnrollmentRefusal = (
  db: Pick<Db, 'cohorts' | 'modules' | 'sessions'>,
  cohortId: string,
  facts: CohortFacts,
): string | null => beforeItOpens(db, cohortId, facts).refusal;

// ================================================================================================
// Odds and ends the pages share
// ================================================================================================

/** The run's weeks with their sessions, for the Overview's run and the Settings' Each week. */
export interface RunRow {
  moduleId: string;
  n: number;
  title: string;
  published: boolean;
  opensAt: number | null;
  dueAt: number | null;
  sessions: Session[];
}

export function runRows(db: Pick<Db, 'cohorts' | 'modules' | 'sessions'>, cohortId: string): RunRow[] {
  const sessions = sessionsOf(db, cohortId);
  return cohortRun(db, cohortId).map((w) => ({
    moduleId: w.module.id,
    n: w.n,
    title: w.module.course?.title || w.module.name,
    published: w.module.status !== 'draft',
    opensAt: w.opensAt,
    dueAt: w.dueAt,
    sessions: sessions.filter((s) => s.moduleId === w.module.id),
  }));
}

/** Every course week of the program a cohort can pick from (the curriculum's building weeks, in order). */
export function programWeeks(db: Pick<Db, 'modules'>): { id: string; week: number; title: string; outcome: string; published: boolean; steps: number }[] {
  return db.modules
    .filter((m) => m.kind === 'week' && m.course !== undefined && isCourseWeek(m.id) && m.course.week > 0)
    .sort((a, b) => a.course!.week - b.course!.week)
    .map((m) => ({
      id: m.id,
      week: m.course!.week,
      title: m.course!.title || m.name,
      outcome: m.outcome,
      published: m.status !== 'draft',
      steps: m.checklist.length,
    }));
}

/**
 * R-5 Phase 5 (D-262, PLAN § 10.10): New cohort's "Start from": every cohort that is not archived, the newest first,
 * not December by id. It starts on the newest that is past its draft (the one running now), else the newest.
 */
export function newCohortSources(db: Pick<Db, 'cohorts'>): Cohort[] {
  return db.cohorts.filter((c) => c.archivedAt === undefined).sort((a, b) => b.start - a.start || a.id.localeCompare(b.id));
}

/** The cohort New cohort starts from: the newest past its draft, else the newest, else none. */
export function defaultSourceId(db: Pick<Db, 'cohorts'>): string | null {
  const all = newCohortSources(db);
  return (all.find((c) => c.status !== 'draft') ?? all[0])?.id ?? null;
}


// ================================================================================================
// Preview (spec Phase 3: "Preview" opens the existing staff preview of the course for that cohort)
// ================================================================================================

/**
 * The database as the staff preview of one cohort's course reads it: that cohort's own course words when it holds them
 * (December), else the default cohort's with this cohort's own words in their places (`intro.sub`, `intro.how`,
 * `intro.holiday`), which is what the spec's Phase 4 assembles for its learners. Staff only: `courseFor(previewDb(db,
 * id), now, 'staff', id)`. The database is not written.
 */
export function previewDb<T extends Pick<Db, 'cohorts'>>(db: T, cohortId: string): T {
  const co = cohortOf(db, cohortId);
  const base = cohortOf(db, DEFAULT_COHORT_ID)?.course;
  if (!co || co.course || !base) return db;
  const course = structuredClone(base);
  if (co.words) {
    course.intro.sub = co.words.promise;
    course.intro.how = [...co.words.how];
    course.intro.holiday = co.words.holiday;
  }
  return { ...db, cohorts: db.cohorts.map((c) => (c.id === co.id ? { ...c, course } : c)) };
}
