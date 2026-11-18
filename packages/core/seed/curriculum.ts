// SEED, NOT RUNTIME (D-173). Puts the curriculum's first copy into a database, and never overwrites it.
//
// THE BUILDER IS THE SOURCE OF TRUTH. Once a row is in the database, admins edit it in the curriculum
// builder and nothing here touches it again. The deploy runs `db:curriculum:ensure` on every release,
// so this must be safe to run against a live database full of staff edits, any number of times:
//
//   - a database that has never had the course (none of its nine week modules, in any status) gets
//     every seed row it lacks, by id, whole;
//   - a database that has it gets no new course rows: a week or session missing there was deleted on
//     purpose (a draft week deleted in the builder stays deleted), as on `main` since D-110;
//   - a row that exists keeps every value it has. The one thing ensure adds to an existing row is a
//     column D-173 introduced (a module's `course`, a session's `kind`) while it is still empty, which
//     is how a database from before the builder gets its words. A value already there, edited or not,
//     is never replaced;
//   - the copy strings go into an empty table only, so one staff changed or removed stays that way.
//
// There is no overwrite path. The old `applyAccelerator` upserted the nine modules and sixteen
// sessions from code, keeping only recordings and Zoom links, so a deploy could undo a builder edit;
// it is gone, and so is `db:curriculum`'s overlay. Changing the course means editing it in the builder.
//
// Two entry points, one seed:
//   ensureCurriculum(db)   a database that may be live, with buyers in it.     `db:curriculum:ensure`
//   seedProduction(opts)   a new, empty database: the curriculum and one Owner.  `db:seed:prod`
//
// Pure: no clock, no random source. Runtime code may not import this file.

import { ACCELERATOR_COHORT_ID, acceleratorModuleId, isAcceleratorModule } from '../src/accelerator';
import { DB_V } from '../src/constants';
import type { CohortCourse, ModuleCourse } from '../src/course-types';
import { seed } from '../src/seed';
import { sessionKind, sessionWeek } from '../src/sessions';
import { ZERO_BASE } from '../src/types';
import type { AIEmployee, Cohort, CopyString, Db, Session, SessionType, Staff, StaffRole } from '../src/types';
import {
  ACCELERATOR_INSTRUCTOR,
  ACCELERATOR_WEEKS_CONTENT,
  GOAL_PLANNING_WEEKS,
  WEEK0_DUE_AT,
  acceleratorCohort,
  acceleratorModules,
  acceleratorSessions,
  courseContent,
} from './accelerator-v1';

/** Which seed this is. Recorded in DECISIONS.md D-173; Weeks 0 to 3's new content is a later migration. */
export const CURRICULUM_SEED = 'accelerator-v1';

/** The cohort's release plan, as the builder starts it: Mountain time, opening at noon. */
export const SEED_TIMEZONE = 'America/Denver';
export const SEED_OPEN_TIME = '12:00';

/** The copy strings the builder starts with. Utah Life's lock line is exactly D-150's words. */
export const SEED_COPY: readonly CopyString[] = [{ key: 'locked.utah_life', value: 'Not included with Utah Life access', audience: 'learner' }];

/** What a seeded session is: a build, a goal-planning Thursday (Dec 10 and Dec 17) or plain office hours. */
export function seedSessionType(s: Pick<Session, 'id' | 'n'>): SessionType {
  if (sessionKind(s) === 'build') return 'live_build';
  return GOAL_PLANNING_WEEKS.includes(sessionWeek(s)) ? 'goal_planning' : 'office_hours';
}

export interface CurriculumSeed {
  cohort: Cohort;
  sessions: Session[];
  modules: AIEmployee[];
  copy: CopyString[];
}

/** The rows the seed holds: cohort one with what every week shares, its sixteen sessions, the nine weeks and the copy strings. */
export function curriculumSeed(opts: { instructor?: string } = {}): CurriculumSeed {
  const instructor = (opts.instructor ?? ACCELERATOR_INSTRUCTOR).trim();
  if (!instructor) throw new Error('curriculumSeed: the instructor needs a name');
  const legacy = courseContent();
  const shared: CohortCourse = { intro: legacy.intro, shared: legacy.shared, before: legacy.before, after: legacy.after };
  const cohort: Cohort = { ...acceleratorCohort(), timezone: SEED_TIMEZONE, defaultOpenTime: SEED_OPEN_TIME, course: shared };
  const sessions = acceleratorSessions().map(
    (s): Session => ({ ...s, kind: seedSessionType(s), moduleId: acceleratorModuleId(sessionWeek(s)) }),
  );
  const modules = acceleratorModules(instructor).map((m, i): AIEmployee => {
    const { module: _portal, ...words } = ACCELERATOR_WEEKS_CONTENT[i]!;
    const course: ModuleCourse = words;
    return { ...m, kind: 'week', ...(words.week === 0 ? { dueAt: WEEK0_DUE_AT } : {}), course };
  });
  // A deep copy, so nothing that leaves here shares an array with the seed's constants.
  return structuredClone({ cohort, sessions, modules, copy: [...SEED_COPY] });
}

// --- ensure: insert what is missing, fill only D-173's empty columns ------------------------------

/** The columns D-173 added. Ensure fills one of these on an existing row only while it is empty. */
const NEW_COHORT_FIELDS = ['previewOpensAt', 'timezone', 'defaultOpenTime', 'course'] as const;
const NEW_SESSION_FIELDS = ['kind', 'moduleId', 'replayVisibility'] as const;
const NEW_MODULE_FIELDS = ['kind', 'dueAt', 'tone', 'course'] as const;

function fillEmpty<T extends object>(prev: T, next: T, fields: readonly (keyof T)[]): T {
  let out = prev;
  for (const f of fields) {
    if (prev[f] === undefined && next[f] !== undefined) {
      if (out === prev) out = { ...prev };
      out[f] = structuredClone(next[f]);
    }
  }
  return out;
}

/** Existing rows gain D-173's empty columns; missing seed rows are added only when `insert` says so. */
function ensureById<T extends { id: string }>(rows: readonly T[], seeded: readonly T[], fields: readonly (keyof T)[], insert: boolean): T[] {
  const byId = new Map(seeded.map((s) => [s.id, s]));
  const present = new Set(rows.map((r) => r.id));
  const kept = rows.map((r) => (byId.has(r.id) ? fillEmpty(r, byId.get(r.id)!, fields) : r));
  return insert ? [...kept, ...seeded.filter((s) => !present.has(s.id))] : kept;
}

/**
 * Whether the course has ever been put in this database: any of its nine week modules, in any status
 * (`main`'s rule since D-110). Once it has, a missing week or session was deleted on purpose.
 */
export const hasCurriculum = (db: Pick<Db, 'modules'>): boolean => db.modules.some((m) => isAcceleratorModule(m.id));

/**
 * The curriculum, made sure of (D-173). A database that has never had the course gets every seed row
 * it lacks; one that has it gets no new course rows. Either way an existing row only gains D-173's new
 * columns where they are empty, and the copy strings go into an empty table only. Nothing that is
 * already there changes, and nothing staff deleted comes back: run twice, or after any number of
 * builder edits, the second run writes nothing.
 *
 * Never touches users, teams, progress, staff, resources, announcements, requests, tiers or anything
 * else. Pure: the result is a new `Db`; `ensureCurriculum(ensureCurriculum(db))` deep-equals
 * `ensureCurriculum(db)`.
 */
export function ensureCurriculum(db: Db, opts: { instructor?: string } = {}): Db {
  const seeded = curriculumSeed(opts);
  const first = !hasCurriculum(db);
  const out: Db = { ...db };
  out.cohorts = ensureById(db.cohorts, [seeded.cohort], NEW_COHORT_FIELDS, first);
  out.sessions = ensureById(db.sessions, seeded.sessions, NEW_SESSION_FIELDS, first);
  out.modules = ensureById(db.modules, seeded.modules, NEW_MODULE_FIELDS, first);
  if (!db.copy?.length) out.copy = [...seeded.copy];
  return out;
}

// --- the launch seed (moved here from src/seed-production.ts) -------------------------------------

// The launch seed, phase 09 § 9.5: the smallest database the product can run on. It keeps the
// curriculum (above), the five Automated Reminders toggles and their defaults, the permission matrix
// and ONE Owner. It drops users, teams, progress, dismissals, requests, activity, resources,
// announcements and the prototype's tier rows (their prices are the prototype's invented $995 and
// $4,995; the real prices live in Stripe, D-074). The Owner's name and address are arguments, never
// constants: a hard-coded address would be a real person's seat in a real database.

export interface ProductionSeedOptions {
  /** The first Owner. They sign in, then invite every other staff member and learner. */
  owner: { id?: string; name: string; email: string };
  /** The production cohort. Only cohort one, `dec26`, exists; a wrong id fails loudly. */
  cohortId?: string;
  /** Who teaches the course. Defaults to Connor Leiva. Never the prototype's invented instructor. */
  instructor?: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** The content a new production database needs, and nothing else. Pure. */
export function seedProduction(opts: ProductionSeedOptions): Db {
  const name = opts.owner.name.trim();
  const email = opts.owner.email.trim().toLowerCase();
  // Fail loudly here rather than seeding a database whose only account cannot receive a sign-in
  // link. There is no second chance: the console has no other way in.
  if (!name) throw new Error('seedProduction: the owner needs a name');
  if (!EMAIL.test(email)) throw new Error(`seedProduction: ${JSON.stringify(opts.owner.email)} is not a usable email address`);

  const instructor = (opts.instructor ?? ACCELERATOR_INSTRUCTOR).trim();
  if (!instructor) throw new Error('seedProduction: the instructor needs a name');

  const cohortId = opts.cohortId ?? ACCELERATOR_COHORT_ID;
  if (cohortId !== ACCELERATOR_COHORT_ID)
    throw new Error(`seedProduction: no cohort with id ${cohortId} in the production curriculum (only ${ACCELERATOR_COHORT_ID})`);

  const demo = seed('live');
  const staff: Staff[] = [
    {
      id: opts.owner.id ?? 'st_owner',
      name,
      email,
      role: 'Owner' satisfies StaffRole,
      // Never signed in. `fmt.ago` renders a null `last` as the dash the Staff screen expects.
      last: null,
    },
  ];

  const empty: Db = {
    v: DB_V,
    // No `phase`: that is the demo's time machine. Dashboard.vm.ts reads an absent phase as 'live'.
    cohorts: [],
    sessions: [],
    modules: [],
    users: [],
    teams: [],
    resources: [],
    announcements: [],
    dismissed: {},
    reminders: demo.reminders,
    tiers: [],
    requests: [],
    staff,
    perms: demo.perms,
    base: structuredClone(ZERO_BASE),
    activity: [],
  };
  const db = ensureCurriculum(empty, { instructor });
  // In order, because the session rail renders them in date order and nothing re-sorts the builds.
  db.sessions.sort((a, b) => a.start - b.start);
  return db;
}
