// The launch seed, phase 09 § 9.5, carrying the Amplified AI Accelerator (D-110).
//
// `seedForDatabase('live')` fills a database with the sales demo: fourteen invented learners, three
// teams, upgrade requests, an activity feed. Running it in production would hand a real cohort a
// roster of people who do not exist, and (because every demo learner has a plausible email) would
// put those addresses one `remindMembers` away from receiving mail.
//
// This is the opposite: the smallest database the product can actually run on.
//
// WHAT IT KEEPS, and why each is content rather than data:
//   modules      THE CURRICULUM, which is the product: the Amplified AI Accelerator's Week 0 and eight
//                weeks (`accelerator-content.ts`), never the prototype's six AI Employees. Admins edit
//                it in the Builder. The fields that describe a recording are empty until one exists.
//   cohorts      cohort one, `dec26`, and its sixteen sessions: eight Wednesday builds and eight
//                Thursday office hours (`accelerator.ts`). No Zoom URL is invented.
//   reminders    the five Automated Reminders toggles and their on/off defaults.
//   perms        the permission matrix. Without it, every staff role can do nothing, including the
//                Owner, and the console is unusable from the first login.
//   staff        ONE Owner account, so somebody can sign in and invite everyone else.
//
// WHAT IT DROPS: users, teams, progress, dismissals, requests, activity, resources, announcements,
// and the prototype's tier rows. The tiers carry the prototype's invented $995 and $4,995; the real
// prices live in Stripe behind lookup keys (D-074), and every buyer is Team tier, for whom the Team
// Tier page redirects away.
//
// TWO ENTRY POINTS, ONE CURRICULUM.
//   seedProduction(opts)   a new, empty database: the curriculum plus one Owner. `db:seed:prod`.
//   applyAccelerator(db)   a database that is already live, with buyers in it: the curriculum, upserted,
//                          and nothing else touched. `db:curriculum`. Run twice, it changes nothing the
//                          second time. Sales provision buyers into `users` the moment they pay, and
//                          the launch seed refuses a database with users, so this is the one that
//                          puts the course in front of them.
//
// The Owner's name and address are arguments, not constants. A hard-coded address would be a real
// person's seat in a real database, and whoever runs this is not that person.

import { ACCELERATOR_COHORT_ID, ACCELERATOR_INSTRUCTOR, acceleratorCohort, acceleratorSessions, isAcceleratorModule } from './accelerator';
import { acceleratorModules } from './accelerator-content';
import { DB_V } from './constants';
import { seed } from './seed';
import { ZERO_BASE } from './types';
import type { AIEmployee, Cohort, Db, Session, Staff, StaffRole } from './types';

export interface ProductionSeedOptions {
  /** The first Owner. They sign in, then invite every other staff member and learner. */
  owner: { id?: string; name: string; email: string };
  /**
   * The production cohort. Only cohort one, `dec26`, exists: the prototype's `feb27` and `apr27` are
   * demo schedules, not real ones. Kept as an option so the CLI's `--cohort` still parses, and so a
   * wrong id fails loudly instead of seeding the wrong thing.
   */
  cohortId?: string;
  /**
   * Who teaches the course. Defaults to Connor Leiva (the PM's brief). Never the prototype's invented
   * instructor, which the Employee Detail screen and every session card would render as the person a
   * learner is about to meet.
   */
  instructor?: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** The prototype's tier prices. A row still holding one is the prototype's, not a real price. */
const PROTOTYPE_PRICES: Readonly<Record<string, number>> = { agent: 995, team: 4995 };

/** The prototype's invented Zoom URLs, which the old launch seed copied into production sessions. */
const demoZooms = (): Set<string> => new Set(seed('live').sessions.map((s) => s.zoom));

/**
 * A course session, keeping what staff and the live sessions have written into an existing row of
 * the same id and start: the real Zoom link, the live flag, attendance and the replay. A row at a
 * different time is the prototype's session under a reused id, so it starts fresh, and an invented
 * demo Zoom URL is never carried over.
 */
function keepSessionState(next: Session, prev: Session | undefined, demo: Set<string>): Session {
  if (!prev || prev.start !== next.start) return next;
  const out: Session = {
    ...next,
    zoom: demo.has(prev.zoom) ? '' : prev.zoom,
    live: prev.live,
    attended: prev.attended,
    replay: prev.replay,
    views: prev.views,
  };
  return out;
}

/**
 * Equal in content, whatever the key order. A database hands JSON columns back with their keys
 * re-ordered (Postgres sorts JSONB keys), so a module rebuilt here and the same module loaded from a
 * live database differ only in order. The overlay keeps the loaded object when they are equal, which
 * is what makes a second run write nothing.
 */
const canon = (v: unknown): unknown =>
  Array.isArray(v)
    ? v.map(canon)
    : v && typeof v === 'object'
      ? Object.fromEntries(
          Object.keys(v as object)
            .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
            .sort()
            .map((k) => [k, canon((v as Record<string, unknown>)[k])]),
        )
      : v;
const sameData = (a: unknown, b: unknown): boolean => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
/** `next`, unless `prev` already says the same thing: then `prev`, untouched. */
const settle = <T>(next: T, prev: T | undefined): T => (prev !== undefined && sameData(next, prev) ? prev : next);

/** A course module, keeping a recording staff attached to the existing row (its transcript and length). */
function keepRecording(next: AIEmployee, prev: AIEmployee | undefined): AIEmployee {
  if (!prev) return next;
  return { ...next, dur: prev.dur, transcript: prev.transcript };
}

/**
 * The Amplified AI Accelerator, upserted into a database that may already be live (D-110).
 *
 * Writes only the curriculum:
 *   - cohort `dec26` becomes cohort one (its status is kept if staff already set it);
 *   - its sessions become the sixteen course sessions, keeping a real Zoom link and any live state
 *     on a session that has not moved, and dropping the prototype's invented links;
 *   - the nine course modules are upserted, keeping any recording attached since;
 *   - the prototype's six AI Employees become drafts with no session, so no learner sees them and no
 *     build is claimed by two modules (drafts keep their learners' progress rows);
 *   - tier rows still at the prototype's invented prices are removed.
 *
 * Never touches users, teams, progress, staff, resources, announcements, requests or anything else.
 * Pure, and idempotent: `applyAccelerator(applyAccelerator(db))` deep-equals `applyAccelerator(db)`.
 */
export function applyAccelerator(db: Db, opts: { instructor?: string } = {}): Db {
  const instructor = (opts.instructor ?? ACCELERATOR_INSTRUCTOR).trim();
  if (!instructor) throw new Error('applyAccelerator: the instructor needs a name');
  const out = structuredClone(db);
  const demo = demoZooms();

  const fresh = acceleratorCohort();
  const prevCohort = out.cohorts.find((c) => c.id === ACCELERATOR_COHORT_ID);
  const cohort: Cohort = prevCohort ? { ...fresh, status: prevCohort.status, enrolled: prevCohort.enrolled } : fresh;
  out.cohorts = [...out.cohorts.filter((c) => c.id !== ACCELERATOR_COHORT_ID), settle(cohort, prevCohort)];

  const prevSessions = new Map(out.sessions.filter((s) => s.cohortId === ACCELERATOR_COHORT_ID).map((s) => [s.id, s]));
  out.sessions = [
    ...out.sessions.filter((s) => s.cohortId !== ACCELERATOR_COHORT_ID),
    ...acceleratorSessions().map((s) => settle(keepSessionState(s, prevSessions.get(s.id), demo), prevSessions.get(s.id))),
  ];

  const prototype = new Set(seed('live').modules.map((m) => m.id));
  const prevModules = new Map(out.modules.map((m) => [m.id, m]));
  const course = acceleratorModules(instructor).map((m) => settle(keepRecording(m, prevModules.get(m.id)), prevModules.get(m.id)));
  out.modules = [
    ...out.modules
      .filter((m) => !isAcceleratorModule(m.id))
      .map((m): AIEmployee => (prototype.has(m.id) ? { ...m, status: 'draft', session: null, opens: null } : m)),
    ...course,
  ];

  out.tiers = out.tiers.filter((t) => PROTOTYPE_PRICES[t.id] !== t.price);
  return out;
}

/**
 * The content a new production database needs, and nothing else.
 *
 * Pure: two calls with the same options are deep-equal and no clock or random source is read.
 */
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
    // No `phase`: that is the demo's time machine. Dashboard.vm.ts reads an absent phase as 'live',
    // which is what a real cohort moving through its own dates means (see codec.ts's header).
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
  const db = applyAccelerator(empty, { instructor });
  // In order, because the session rail renders them in date order and nothing re-sorts the builds.
  db.sessions.sort((a, b) => a.start - b.start);
  return db;
}
