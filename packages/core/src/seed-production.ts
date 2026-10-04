// The launch seed, phase 09 § 9.5.
//
// `seedForDatabase('live')` fills a database with the sales demo: fourteen invented learners, three
// teams, upgrade requests, an activity feed. Running it in production would hand a real cohort a
// roster of people who do not exist, and — because every demo learner has a plausible email — would
// put those addresses one `remindMembers` away from receiving mail.
//
// This is the opposite: the smallest database the product can actually run on. § 9.5 names exactly
// six things, and the test beside this file asserts nothing else arrives.
//
// WHAT IT KEEPS, and why each is content rather than data:
//   tiers        the price list. Two rows the Team Tier page reads; nothing learner-specific.
//   modules      the six AI Employees — prompts, checklists, outputs, skill-file metadata. This
//                is the curriculum, which is the product. Admins edit it in the Builder. Three
//                of its fields describe a RECORDING and are cleared; see `forLaunch`.
//   reminders    the five Automated Reminders toggles and their on/off defaults.
//   perms        the permission matrix. Without it, every staff role can do nothing, including the
//                Owner, and the console is unusable from the first login.
//   staff        ONE Owner account, so somebody can sign in and invite everyone else.
//   cohorts      the current cohort and its sessions, so there is something to join.
//
// WHAT IT DROPS: users, teams, progress, dismissals, requests, activity, resources and
// announcements. All of them are either demo fiction or things an admin creates — § 9.5's steps 2
// and 3 are "upload resources through the Vault" and "invite staff, then learners".
//
// The Owner's name and address are arguments, not constants. A hard-coded `casey@amplifiedimpact.com`
// would be a real person's seat in a real database, and whoever runs this is not Casey.

import { DB_V } from './constants';
import { seed } from './seed';
import { ZERO_BASE } from './types';
import type { AIEmployee, Cohort, Db, Session, Staff, StaffRole } from './types';

export interface ProductionSeedOptions {
  /** The first Owner. They sign in, then invite every other staff member and learner. */
  owner: { id?: string; name: string; email: string };
  /**
   * Which cohort to carry over from the curriculum seed, by id. Defaults to the one marked `live`,
   * or the earliest by start date if none is.
   */
  cohortId?: string;
  /**
   * Who teaches the six AI Employees. Defaults to the Owner, because they are the only person who
   * exists on day one.
   *
   * This is not cosmetic. The curriculum seed names `Jordan Hale`, an invented instructor, on all
   * six — and the Employee Detail screen and every session card render it as the person a learner
   * is about to meet. Shipping it would present a fabricated colleague as real staff.
   */
  instructor?: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * One AI Employee, ready for a cohort that has not met yet.
 *
 * Three fields of the curriculum seed describe a replay that exists only in the demo's timeline,
 * and all three are visible to a learner on day one:
 *
 *   instructor  an invented person's name, rendered as the colleague a learner is about to meet
 *   transcript  the captions of a session nobody has run. Its cues also carry `<v Jordan Hale>`
 *               speaker tags, so leaving it would reintroduce the same fabricated name the
 *               `instructor` replacement exists to remove.
 *   dur         the replay's length in seconds, which drives the player's scrub bar. A non-zero
 *               duration with no recording gives a 55-minute bar over nothing.
 *
 * Everything else — prompts, the six checklist steps, outputs, skill-file metadata, `runDemo` —
 * IS the product and is carried verbatim. `runDemo` in particular is the Run preview the Employee
 * Detail screen shows before a learner has run anything of their own.
 */
const forLaunch = (m: AIEmployee, instructor: string): AIEmployee => ({
  ...m,
  instructor,
  transcript: [],
  dur: 0,
});

/**
 * The content a new production database needs, and nothing else.
 *
 * Pure: it derives everything from `seed()`'s curriculum and takes the Owner from its argument, so
 * two calls with the same options are deep-equal and no clock or random source is read.
 */
export function seedProduction(opts: ProductionSeedOptions): Db {
  const name = opts.owner.name.trim();
  const email = opts.owner.email.trim().toLowerCase();
  // Fail loudly here rather than seeding a database whose only account cannot receive a sign-in
  // link. There is no second chance: the console has no other way in.
  if (!name) throw new Error('seedProduction: the owner needs a name');
  if (!EMAIL.test(email)) throw new Error(`seedProduction: ${JSON.stringify(opts.owner.email)} is not a usable email address`);

  const instructor = (opts.instructor ?? name).trim();
  if (!instructor) throw new Error('seedProduction: the instructor needs a name');

  const demo = seed('live');

  const cohort: Cohort | undefined = opts.cohortId
    ? demo.cohorts.find((c) => c.id === opts.cohortId)
    : (demo.cohorts.find((c) => c.status === 'live') ?? [...demo.cohorts].sort((a, b) => a.start - b.start)[0]);
  if (!cohort) throw new Error(`seedProduction: no cohort${opts.cohortId ? ` with id ${opts.cohortId}` : ''} in the curriculum seed`);

  // `enrolled` is derived from the user rows and not stored (§ 7.2, D-018). Zero is the truth for a
  // database with no learners in it, and carrying the demo's 148 over would make the admin Cohorts
  // screen claim a cohort that does not exist yet.
  const cohorts: Cohort[] = [{ ...cohort, enrolled: 0 }];

  // Every session of that cohort, with its attendance and replay state cleared: those describe
  // sessions that already happened in the demo's timeline, and in production none has run.
  const sessions: Session[] = demo.sessions
    .filter((s) => s.cohortId === cohort.id)
    .map((s) => {
      const fresh: Session = { ...s, live: false, attended: null, replay: null, views: 0 };
      // A moved session is demo narrative — the 'Session 3 moved to Wed Dec 9' announcement. A new
      // cohort's sessions have never moved, and leaving the field would show a "Moved" token.
      delete fresh.movedFrom;
      return fresh;
    })
    .sort((a, b) => a.n - b.n);

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

  return {
    v: DB_V,
    // No `phase`: that is the demo's time machine. Dashboard.vm.ts reads an absent phase as 'live',
    // which is what a real cohort moving through its own dates means (see codec.ts's header).
    cohorts,
    sessions,
    // The curriculum, with the two fields that describe a RECORDING cleared — see `forLaunch`.
    modules: demo.modules.map((m) => forLaunch(m, instructor)),
    users: [],
    teams: [],
    resources: [],
    announcements: [],
    dismissed: {},
    reminders: demo.reminders,
    tiers: demo.tiers,
    requests: [],
    staff,
    perms: demo.perms,
    base: structuredClone(ZERO_BASE),
    activity: [],
  };
}
