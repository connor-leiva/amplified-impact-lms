// The curriculum builder's audited writes (D-174), beside D-172's (`admin-actions.ts`), with their
// shape: `(db, actor, args, ctx)` in, a NEW db out through immer, `{ db, error }` for an inline refusal
// (no write, no row), a thrown `MutationError` for a forbidden or missing thing, and the ONE audit row
// the write owes (`audit`). The API runs them on `POST /api/admin/actions/:name` in one transaction with
// that row; the fixture build runs them in the browser.
//
// Who may run each is the existing `PermKey` rule: `cohorts` for sessions and the release plan,
// `curriculum` for the course's words and its copy strings (the Module Builder's own rule).
//
// Every learner-facing string a write changes passes the copy rules (`course-rules.ts`) first; a
// string it leaves alone is never what refuses it. Times are typed in the cohort's zone (Mountain,
// `America/Denver`, the seed's) and saved as that instant, daylight saving included.

import { produce } from 'immer';
import { requirePerm } from './can';
import type { CohortCourse } from './course-types';
import { glossaryIssues, normalizeGlossary } from './glossary';
import { changedFields, cohortCopyFields, copyIssues, copyStringField, diffSummary, issueLine } from './course-rules';
import type { CopyField } from './course-rules';
import { MutationError } from './mutations';
import type { Actor, Ctx } from './mutations';
import type { AdminOutcome } from './admin-actions';
import type { Cohort, CopyString, Db, ReplayVisibility, Session, SessionType } from './types';

/** The cohort's zone when it names none: Mountain Time, as the release plan starts it. */
export const COURSE_TZ = 'America/Denver';
/** The time of day a course date defaults to: noon, Mountain (the brief drops the old 9:00 AM). */
export const COURSE_DEFAULT_TIME = '12:00';

// --- time in the cohort's zone ---------------------------------------------------------------------

const partsAt = (t: number, tz: string) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date(t))
      .map((x) => [x.type, x.value]),
  ) as Record<string, string>;
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day), h: Number(p.hour) % 24, min: Number(p.minute) };
};

/** A date (`YYYY-MM-DD`) and a time (`HH:MM`) in a zone, as the instant they name. NaN when malformed. */
export function zonedInstant(date: string, time: string, tz: string = COURSE_TZ): number {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const tm = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!dm || !tm) return NaN;
  const wall = Date.UTC(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]), Number(tm[1]), Number(tm[2]));
  // The zone's offset at that wall time, found by asking what wall time the guess shows; twice, so a
  // date on either side of a daylight-saving change lands on the right offset.
  let t = wall;
  for (let i = 0; i < 2; i++) {
    const p = partsAt(t, tz);
    t = wall - (Date.UTC(p.y, p.m - 1, p.d, p.h, p.min) - t);
  }
  return t;
}

/** An instant as the date and time inputs show it, in a zone. */
export function zonedInputs(t: number, tz: string = COURSE_TZ): { date: string; time: string } {
  const p = partsAt(t, tz);
  const two = (n: number) => String(n).padStart(2, '0');
  return { date: `${p.y}-${two(p.m)}-${two(p.d)}`, time: `${two(p.h)}:${two(p.min)}` };
}

// --- shared --------------------------------------------------------------------------------------

const cohortOf = (db: Db, id: string): Cohort => {
  const co = db.cohorts.find((x) => x.id === id);
  if (!co) throw new MutationError('not_found', `No cohort ${id}`);
  return co;
};

/** The copy rules on what changed, as one inline error, or null. */
function refuseCopy(prev: readonly CopyField[], next: readonly CopyField[]): string | null {
  const issues = copyIssues(changedFields(prev, next));
  return issues.length ? issues.map(issueLine).join('\n') : null;
}

export const SESSION_TYPES: readonly SessionType[] = ['live_build', 'office_hours', 'goal_planning', 'setup', 'other'];
export const REPLAY_VISIBILITIES: readonly ReplayVisibility[] = ['hidden', 'after_open', 'published'];

// ================================================================================================
// Sessions per week: any number, any kind, in Mountain Time
// ================================================================================================

export interface SessionFields {
  /** Absent for a new session. */
  id?: string;
  cohortId: string;
  /** The week module it belongs to, or null for none. */
  moduleId: string | null;
  kind: SessionType;
  title: string;
  /** `YYYY-MM-DD` and `HH:MM`, in the cohort's zone. */
  date: string;
  time: string;
  mins: number | string;
  zoom: string;
  replayVisibility: ReplayVisibility | null;
}

const sessionSummary = (s: Session) => ({
  title: s.title,
  start: s.start,
  mins: s.mins,
  kind: s.kind ?? null,
  moduleId: s.moduleId ?? null,
  replayVisibility: s.replayVisibility ?? null,
  zoomLink: s.zoom !== '',
});

/**
 * Save a session, new or existing: its kind, the week it belongs to, its title, its start (typed in the
 * cohort's zone) and length, its Zoom link and who sees its replay. An existing session keeps what this
 * form doesn't hold (live state, attendance, replay status and views, a recorded replay link) and, when
 * its start moves, records where it was (`movedFrom`), as staff moves always have.
 */
export function saveSession(db: Db, a: Actor, args: SessionFields, c: Ctx): AdminOutcome {
  requirePerm(db, a, 'cohorts');
  const co = cohortOf(db, args.cohortId);
  const prev = args.id ? db.sessions.find((x) => x.id === args.id) : undefined;
  if (args.id && !prev) throw new MutationError('not_found', `No session ${args.id}`);
  if (prev && prev.cohortId !== co.id) throw new MutationError('invalid', 'A session stays in its cohort.');
  if (!SESSION_TYPES.includes(args.kind)) throw new MutationError('invalid', `Unknown session kind ${String(args.kind)}`);
  if (args.replayVisibility !== null && !REPLAY_VISIBILITIES.includes(args.replayVisibility))
    throw new MutationError('invalid', `Unknown replay visibility ${String(args.replayVisibility)}`);
  if (args.moduleId !== null && !db.modules.some((m) => m.id === args.moduleId)) throw new MutationError('not_found', `No AI Employee ${args.moduleId}`);

  const title = (args.title || '').trim();
  if (!title) return { db, error: 'Add a title.' };
  const start = zonedInstant(args.date, args.time, co.timezone ?? COURSE_TZ);
  if (Number.isNaN(start)) return { db, error: 'Pick a date and a start time.' };
  const mins = parseInt(String(args.mins), 10);
  if (!(mins > 0)) return { db, error: 'Enter the length in minutes.' };
  const copy = refuseCopy(prev ? [{ path: 'title', label: 'Title', text: prev.title }] : [], [{ path: 'title', label: 'Title', text: title }]);
  if (copy) return { db, error: copy };

  const zoom = (args.zoom || '').trim();
  const id = prev?.id ?? c.id('s');
  const n = prev?.n ?? Math.max(0, ...db.sessions.filter((x) => x.cohortId === co.id).map((x) => x.n)) + 1;
  const next = produce(db, (d) => {
    const fields = {
      title,
      start,
      mins,
      zoom,
      kind: args.kind,
      ...(args.moduleId === null ? {} : { moduleId: args.moduleId }),
      ...(args.replayVisibility === null ? {} : { replayVisibility: args.replayVisibility }),
    };
    if (prev) {
      const x = d.sessions.find((y) => y.id === prev.id)!;
      if (prev.start !== start && x.movedFrom === undefined) x.movedFrom = prev.start;
      Object.assign(x, fields);
      if (args.moduleId === null) delete x.moduleId;
      if (args.replayVisibility === null) delete x.replayVisibility;
    } else {
      d.sessions.push({ id, cohortId: co.id, n, live: false, attended: null, replay: null, views: 0, ...fields });
    }
  });
  const saved = next.sessions.find((x) => x.id === id)!;
  return {
    db: next,
    toast: { msg: prev ? `Session ${n} saved` : `Session ${n} added`, tone: 'success' },
    audit: {
      action: 'session.save',
      target: { type: 'session', id, label: `Session ${n} · ${title}` },
      before: prev ? sessionSummary(prev) : null,
      after: { ...sessionSummary(saved), ...diffSummary(prev ? sessionSummary(prev) : {}, sessionSummary(saved)) },
    },
  };
}

/**
 * Delete a session that hasn't run: never one that is live or has attendance or a replay (it is on
 * the record), and never one a week's live-build or office-hours page still names (point the page at
 * another session first). A seeded session deleted here stays deleted: ensure adds no course row to a
 * database that has the course (D-173).
 */
export function deleteSession(db: Db, a: Actor, args: { id: string }, _c: Ctx): AdminOutcome {
  requirePerm(db, a, 'cohorts');
  const s = db.sessions.find((x) => x.id === args.id);
  if (!s) throw new MutationError('not_found', `No session ${args.id}`);
  if (s.live || s.attended !== null || s.replay !== null) return { db, error: 'This session has run, so it stays on the record.' };
  const named = db.modules.find((m) => m.course?.liveBuild?.sessionId === s.id || m.course?.officeHours?.sessionId === s.id);
  if (named) return { db, error: `${named.name}’s page names this session. Point it at another session first.` };
  return {
    db: produce(db, (d) => {
      d.sessions = d.sessions.filter((x) => x.id !== s.id);
    }),
    toast: { msg: `Session ${s.n} deleted`, tone: 'success' },
    audit: { action: 'session.delete', target: { type: 'session', id: s.id, label: `Session ${s.n} · ${s.title}` }, before: sessionSummary(s), after: null },
  };
}

// ================================================================================================
// The cohort: its release plan, and what every week shares
// ================================================================================================

const planSummary = (co: Cohort) => ({
  name: co.name,
  cadence: co.cadence,
  previewOpensAt: co.previewOpensAt ?? null,
  timezone: co.timezone ?? null,
  defaultOpenTime: co.defaultOpenTime ?? null,
});

/**
 * The release plan: the cohort's name and cadence line, when the pre-launch preview opens (typed in
 * the cohort's zone, or none) and the time of day a week opens by default (`HH:MM`). The zone itself
 * stays Mountain: the brief leaves the time-zone picker out unless Connor asks.
 */
export function saveCohortPlan(
  db: Db,
  a: Actor,
  args: { cohortId: string; name: string; cadence: string; previewOpens: { date: string; time: string } | null; defaultOpenTime: string },
  _c: Ctx,
): AdminOutcome {
  requirePerm(db, a, 'cohorts');
  const co = cohortOf(db, args.cohortId);
  const name = (args.name || '').trim();
  if (!name) return { db, error: 'Give the cohort a name.' };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(args.defaultOpenTime)) return { db, error: 'Pick the time a week opens.' };
  const tz = co.timezone ?? COURSE_TZ;
  const previewOpensAt = args.previewOpens ? zonedInstant(args.previewOpens.date, args.previewOpens.time, tz) : null;
  if (previewOpensAt !== null && Number.isNaN(previewOpensAt)) return { db, error: 'Pick a date and a time for the preview.' };
  const cadence = (args.cadence || '').trim();
  const copy = refuseCopy(cohortCopyFields({ name: co.name, cadence: co.cadence }), cohortCopyFields({ name, cadence }));
  if (copy) return { db, error: copy };
  const next = produce(db, (d) => {
    const x = d.cohorts.find((y) => y.id === co.id)!;
    x.name = name;
    x.cadence = cadence;
    x.defaultOpenTime = args.defaultOpenTime;
    if (!x.timezone) x.timezone = tz;
    if (previewOpensAt === null) delete x.previewOpensAt;
    else x.previewOpensAt = previewOpensAt;
  });
  const saved = next.cohorts.find((x) => x.id === co.id)!;
  return {
    db: next,
    toast: { msg: 'Release plan saved', tone: 'success' },
    audit: {
      action: 'cohort.save',
      target: { type: 'cohort', id: co.id, label: name },
      before: planSummary(co),
      after: { ...planSummary(saved), ...diffSummary(planSummary(co), planSummary(saved)) },
    },
  };
}

/**
 * What every week shares (`Cohort.course`): the course intro, the shared rules and rubric, the before
 * and after pages. The whole document, as the builder holds it; the copy rules check what changed.
 */
export function saveCohortCourse(db: Db, a: Actor, args: { cohortId: string; course: CohortCourse }, _c: Ctx): AdminOutcome {
  requirePerm(db, a, 'curriculum');
  const co = cohortOf(db, args.cohortId);
  // D-187: the community link, trimmed, an http or https address, or left out when empty.
  const community = (args.course.intro.community ?? '').trim();
  if (community && !communityUrl(community)) return { db, error: 'A community link is a web address that starts with https://.' };
  const course = structuredClone(args.course);
  if (community) course.intro.community = community;
  else delete course.intro.community;
  // D-193: a missing glossary keeps the one already stored, so a save from before this field existed
  // cannot wipe it. An empty list clears it. Staff edits are checked, then stored trimmed.
  if (args.course.glossary === undefined) {
    if (co.course?.glossary) course.glossary = structuredClone(co.course.glossary);
    else delete course.glossary;
  } else {
    const cleaned = normalizeGlossary(args.course.glossary);
    const problems = glossaryIssues(cleaned);
    if (problems.length) return { db, error: problems.join('\n') };
    if (cleaned.length) course.glossary = cleaned;
    else delete course.glossary;
  }
  const copy = refuseCopy(cohortCopyFields({ name: co.name, cadence: co.cadence, ...(co.course ? { course: co.course } : {}) }), cohortCopyFields({ name: co.name, cadence: co.cadence, course }));
  if (copy) return { db, error: copy };
  const next = produce(db, (d) => {
    d.cohorts.find((y) => y.id === co.id)!.course = course;
  });
  return {
    db: next,
    toast: { msg: 'Course pages saved', tone: 'success' },
    audit: { action: 'cohort.course_save', target: { type: 'cohort', id: co.id, label: co.name }, after: diffSummary(co.course ?? {}, course) },
  };
}

/**
 * D-187: a cohort community link as the learner portal may open it: an absolute http or https address,
 * normalised, or null for anything else (an empty value, a relative path, a `javascript:` or `mailto:`).
 */
export function communityUrl(raw: string | undefined): string | null {
  const v = (raw ?? '').trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch {
    return null;
  }
}

// ================================================================================================
// Copy strings: the learner-facing lines the builder edits by key
// ================================================================================================

/** A copy string's key: dotted lower-case words, `locked.utah_life`. */
export const COPY_KEY = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/;
export const COPY_AUDIENCES = ['learner', 'staff'] as const;

/**
 * Save a copy string by key: a new one, or a new value for one that exists. The value passes the copy
 * rules when it changes. Utah Life's lock line (`locked.utah_life`) is one of these: what the Library
 * shows reads it from here once it reads copy from data (brief PR 7).
 */
export function saveCopyString(db: Db, a: Actor, args: CopyString, _c: Ctx): AdminOutcome {
  requirePerm(db, a, 'curriculum');
  const key = (args.key || '').trim();
  if (!COPY_KEY.test(key)) return { db, error: 'A key is dotted lower-case words, like locked.utah_life.' };
  if (!(COPY_AUDIENCES as readonly string[]).includes(args.audience)) throw new MutationError('invalid', `Unknown audience ${String(args.audience)}`);
  const value = (args.value || '').trim();
  if (!value) return { db, error: 'Write the text.' };
  const prev = (db.copy ?? []).find((x) => x.key === key);
  const row: CopyString = { key, value, audience: args.audience };
  const copy = refuseCopy(prev ? [copyStringField(prev)] : [], [copyStringField(row)]);
  if (copy) return { db, error: copy };
  return {
    db: produce(db, (d) => {
      const list = d.copy ?? (d.copy = []);
      const i = list.findIndex((x) => x.key === key);
      if (i >= 0) list[i] = row;
      else list.push(row);
    }),
    toast: { msg: 'Saved', tone: 'success' },
    audit: {
      action: 'copy.save',
      target: { type: 'copy', id: key, label: key },
      before: prev ? { audience: prev.audience, length: prev.value.length } : null,
      after: { audience: row.audience, length: row.value.length, ...diffSummary(prev ?? {}, row) },
    },
  };
}
