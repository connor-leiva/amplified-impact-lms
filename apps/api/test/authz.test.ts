// Gate 7's authorization matrix — docs/phases/07-backend.md, "Ship Checklist":
//
//   "For every staff mutation × every `STAFF_ROLES` entry, the HTTP status is 200 if
//    perms[role][perm], else 403. Every learner mutation called by another learner's session
//    returns 403. An unauthenticated call to any `/api/*` route except `/api/health`,
//    `/api/auth/*` and `/api/events` returns 401."
//
// Everything here goes through `app.inject`, i.e. through `requireSession`, `requireJsonSameOrigin`
// and `POST /api/mutate/:name`'s real transaction against a real Postgres. The point is not that
// `@ai/core`'s `requirePerm` works — `packages/core` owns that — but that the ROUTE surfaces it as
// the status code the web app branches on (`apps/web/src/data/http.ts`: 403 and 404 throw, 422 is a
// form error, 401 redirects to `/sign-in`).
//
// ================================================================================================
// WHY THE MATRIX IS ENUMERATED AND NOT WRITTEN OUT
// ================================================================================================
// 26 staff mutations × 5 roles is 130 rows, and a hand-written list of 130 rows is where a missing
// row hides: add a mutation to `@ai/core` and the list silently keeps testing 130 while the API
// serves 131. So three things are derived rather than typed:
//
//   1. THE ROLES come from `STAFF_ROLES`, and each role's persona is looked up in the seeded
//      snapshot BY ROLE. A role nobody has a staff row for fails `every STAFF_ROLES entry has a
//      persona`, rather than being quietly skipped.
//   2. THE EXPECTATION is read STRAIGHT OFF the `permissions` table — `perms[role][perm] === 1`,
//      the checklist's own formula, over the same 40 rows the seed loads into Postgres. Nothing
//      here restates "Instructor cannot publish"; the table says so.
//
//      It deliberately does NOT go through `can()`. `can()` is the function the route authorizes
//      with, so an expectation computed from it would move with it: any regression inside `can()`
//      would change both sides of the comparison at once and all 135 cases would stay green.
//      Measured — that is what happened on the first attempt to prove this test bites, and it is
//      why the oracle reads the table instead. Independent sides are the only arrangement in which
//      the comparison carries information.
//
//      The one place the table and core differ by design is `can()`'s "the Owner always passes"
//      rule (phase 02 § 2.6), which would hide a `0` in the Owner's row. The seed has none, and
//      `the Owner's row agrees with core's own rule` asserts that it stays that way, so the
//      difference is reported rather than tolerated.
//   3. STAFF-OR-LEARNER, AND WHICH PERMISSION, are PROBED out of core in-process: a mutation
//      called with a staff actor who has been granted everything and still throws `forbidden` is a
//      learner mutation; otherwise it is a staff mutation, and its required permissions are the
//      ones whose individual removal brings the `forbidden` back. That is the conjunction, so
//      `saveModule` with `status: 'published'` correctly comes out as curriculum AND publish.
//
// The one thing a derivation cannot do is notice that core's own requirements CHANGED — a derived
// oracle moves with the implementation. So `EXPECTED_PERMISSIONS` pins what the probe found, and a
// mutation that grows or loses a `requirePerm` fails that assertion instead of silently redefining
// the matrix. Derivation finds new rows; the pin stops old rows from drifting.
//
// Case coverage is counted and asserted at the bottom (`EXECUTED`), so a `continue` or a narrowed
// loop cannot quietly shrink the run.
//
// ================================================================================================
// WHAT "ANOTHER LEARNER'S SESSION" MEANS, CASE BY CASE
// ================================================================================================
// Seven of the eleven learner mutations name something that can belong to someone else — a
// teammate (`remindMembers`, `setMemberRole`, `removeMember`), a Team-tier module or resource
// (`toggleStep`, `downloadResource`), a team seat (`inviteMember`) or a tier (`requestUpgrade`) —
// and for those the checklist line is literal: the wrong learner gets 403. The other four
// (`dismissAnnouncement`, `markDeployed`, `setRuntime`, `recordRun`) take NO identity argument at
// all; the actor is the subject, so there is no "another learner" to pass. For those the refusal
// the checklist is reaching for is the wrong KIND of session, and `learnerOf` supplies it: a staff
// cookie on a learner mutation is 403 `That action is for learners.` That arm is swept across all
// eleven, and the fourth test proves the remaining property for the self-only four — that the row
// which changes is the caller's, never the one named in the body (there is nothing to name).
//
// Every 403 is paired with a 200 that uses the SAME mutation. A matrix of nothing but 403s is also
// what a broken fixture looks like; the paired 200 is what distinguishes "refused this caller" from
// "refuses everyone".
//
// ================================================================================================
// COST, AND THE THREE THINGS THAT KEEP IT SURVIVABLE
// ================================================================================================
// Measured on this machine against the Railway proxy: `resetDatabase(seed)` is ~3.3 s (a truncate
// plus fourteen batched inserts) and one mutation inject is ~2.5 s (the route's own `loadDb` is
// fourteen selects). 135 matrix cases is therefore ~6 minutes no matter how they are arranged, and
// the arrangement decides whether it is 6 or 14:
//
//   - ONE RESET PER ROLE, not per case. A 403 writes nothing (`requirePerm` throws before any row
//     is touched and the transaction rolls back), so only the ~76 allowed cases mutate anything —
//     and because each role runs each mutation exactly ONCE off a fresh seed, "not repeatable" is
//     not a problem that needs solving. What does need solving is ORDER inside a role, which
//     `STAFF_CASES` fixes and documents: everything that reads `r1` runs before `deleteResource`
//     deletes it, and `togglePermission` runs LAST because success flips a row in the very table
//     this file computes its expectations from.
//   - A PER-TEST TIMEOUT. `vitest.config.ts`'s 30 s is right for a suite of single requests and
//     cannot hold 27 of them; the third argument to `it()` is the in-file way to say so.
//   - ONE APP PER `it()`. `@fastify/rate-limit`'s store belongs to the plugin instance, so a
//     file-wide app would carry § 9.4's 100-per-minute budget across every test and the later ones
//     would read 429. Per-`it()` is 27 requests on one session key, comfortably inside it, and
//     `build()` opens no database connection so it costs nothing.
//
// ================================================================================================
// TWO THINGS MEASURED HERE THAT ARE NOT THIS FILE'S TO FIX
// ================================================================================================
//   1. `POST /api/mutate/:name` with `content-type: application/json` and an EMPTY or malformed
//      body answers 400, not 401: Fastify parses bodies at the `parsing` stage, before
//      `preHandler`, so the request never reaches `requireSession`. Nothing leaks, but the
//      checklist's "any /api/* route … returns 401" only holds for a request whose body parses.
//      The sweep below therefore sends a VALID body, and asserts the empty-body case is merely
//      "not 200" so it stays green either way. Reported against `auth/guard.ts`.
//   2. `/api/test/session` and `/api/test/outbox` are unauthenticated BY DESIGN (§ 7.7) and are
//      not in the checklist's exemption list, which predates them. They are exempted here with
//      that reasoning stated; `test/routes.test.ts` is what proves they do not exist outside
//      `NODE_ENV=test`, which is the property that makes the exemption safe.
//   3. `POST /api/ai101/waitlist` is unauthenticated BY DESIGN too (DECISIONS.md D-028): it is the
//      December waitlist on the public /ai101 page, which the spec says needs "no login, no
//      account". It is exempted here as `open`, with a same-origin check, a honeypot and its own
//      rate limit standing in for the session — `routes/ai101.ts` carries that argument and
//      `test/ai101.test.ts` measures each piece. The page and its three redirects are not under
//      `/api/` at all, so the checklist's sentence never reached them; they are classified `page`
//      so the inventory stays complete, and the sweep below asserts they stay outside `/api/`. The
//      public /terms and /privacy pages (`routes/legal.ts`) are classified the same way.

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { asc, gt } from 'drizzle-orm';
import { can, isStaffWrite, MutationError, PERMS, seedForDatabase, STAFF_AUDIT_ACTION, STAFF_ROLES, BUILD_AUDIT_ACTION, isBuildConfirmWrite } from '@ai/core';
import type { AIEmployee, Actor, Ctx, Db, MutationArgs, MutationName, PermKey, StaffRole } from '@ai/core';
import * as M from '@ai/core/mutations';
import { build } from '../src/app';
import type { App } from '../src/app';
import { deterministicIds } from '../src/lib/clock';
import { resetOutbox } from '../src/email/transport';
import { SCHEMAS } from '../src/routes/schemas';
import { GUIDE_ALIASES, GUIDE_SLUGS } from '../src/routes/guide-list';
import { auditLog } from '../src/db/schema';
import { resetDatabase, testDatabase } from './helpers';

/** Gate 7's instant, the one the oracle and the parity run use. */
const NOW = Date.parse('2026-12-07T10:42:00-06:00');

/** Every permission in the real table, as values. */
const ALL_PERMS: PermKey[] = PERMS.map(([key]) => key);

// ================================================================================================
// The fixture
// ================================================================================================

/**
 * Gate 7's seed plus the four rows the matrix needs and the reference does not have.
 *
 * Each one exists because a mutation cannot reach 200 without it, and each is a row rather than a
 * special case in a test:
 *
 *   - `st_admin`. `STAFF_ROLES` has five entries and the seed has four staff: there is no `Admin`.
 *     Without a persona for that role the matrix would silently test four fifths of itself, which
 *     is the exact failure the enumeration is for — so the row is added and
 *     `personaFor` asserts every role has one.
 *   - `st_spare_role` / `st_spare_gone`. `setStaffRole` and `removeStaff` need a target, and the
 *     target must not be a PERSONA: rewriting `st4`'s role mid-run would change what `can()`
 *     answers for the Support persona halfway through its own 27 cases, and removing it would
 *     delete the session's own staff row. Two throwaway rows, one per mutation, so neither
 *     mutation's success can disturb the other.
 *   - `draft_mod`. `deleteModule` refuses anything but a draft ("Only drafts can be deleted") and
 *     every module in the seed is published or scheduled, so a 403/200 matrix over it would be a
 *     matrix of 422s. It is also what the publishing `saveModule` case upserts.
 */
function fixture(): Db {
  const db = seedForDatabase('live');

  db.staff.push(
    { id: 'st_admin', name: 'Dana Reyes', email: 'dana@amplifiedimpact.com', role: 'Admin', last: null },
    { id: 'st_spare_role', name: 'Role Target', email: 'role-target@amplifiedimpact.com', role: 'Support', last: null },
    { id: 'st_spare_gone', name: 'Removal Target', email: 'gone-target@amplifiedimpact.com', role: 'Support', last: null },
  );

  const sales = db.modules.find((m) => m.id === 'sales')!;
  db.modules.push({
    ...structuredClone(sales),
    id: 'draft_mod',
    name: 'Draft AI Employee',
    short: 'Draft',
    status: 'draft',
    // `null`, not 6: `publishReplay` gives `dur` to the module whose `session` matches the one it
    // published, and a second module claiming session 2 would make that mutation's target
    // ambiguous.
    session: null,
    order: 7,
  });

  return db;
}

/** The draft the Module Builder would POST: a whole `AIEmployee`, per § 7.3's `saveModule`. */
const draftModule = (): AIEmployee => structuredClone(fixture().modules.find((m) => m.id === 'draft_mod')!);

/**
 * The staff row for a role, read off the fixture rather than mapped by hand.
 *
 * Throws rather than returns undefined: a `STAFF_ROLES` entry with no persona must stop the suite
 * with a sentence, not drop a fifth of the matrix.
 */
function personaFor(db: Db, role: StaffRole): string {
  const row = db.staff.find((s) => s.role === role);
  if (!row) {
    throw new Error(
      `STAFF_ROLES lists ${JSON.stringify(role)} but the fixture has no staff row with that role, so ` +
        'that column of Gate 7\'s matrix cannot be exercised. Add one to `fixture()`.',
    );
  }
  return row.id;
}

// ================================================================================================
// The cases
// ================================================================================================

interface Case<K extends MutationName = MutationName> {
  /** What the failure message says. Distinct from `name` only for the two `saveModule` variants. */
  label: string;
  name: K;
  args: MutationArgs<K>;
}

/**
 * `MutationArgs<K>` is checked per entry, so a changed argument type in `@ai/core` is a typecheck
 * failure here and not a 400 at run time. A plain array literal cannot do that — the element type
 * would widen to the union of all 37 argument shapes.
 */
const mutationCase = <K extends MutationName>(label: string, name: K, args: MutationArgs<K>): Case => ({
  label,
  name,
  args: args as MutationArgs<MutationName>,
});

/**
 * Every staff mutation, with arguments that reach 200 for a role that may, IN THE ORDER THEY RUN.
 *
 * The order is load-bearing, because one reset serves all 27 cases of a role (see the header):
 *
 *   - `setResourceTier` and `setResourceStatus` read `r1`, so `deleteResource` comes after them.
 *   - `setStaffRole` and `removeStaff` use the two throwaway rows, so neither can take the other's
 *     target away.
 *   - `togglePermission` is LAST. It is the only mutation that writes the `permissions` table —
 *     the table `can()` answers from — so a success anywhere earlier would change the expectation
 *     of every case after it. `role: 'Content Editor'` because `role: 'Owner'` is refused outright
 *     ("Owner permissions are fixed", a 403 that has nothing to do with the matrix).
 */
const STAFF_CASES: Case[] = [
  mutationCase('nudgeLearners', 'nudgeLearners', { userIds: ['u_lena'] }),
  mutationCase('setLearnerTier', 'setLearnerTier', { userId: 'u_jamie', tier: 'team' }),
  mutationCase('moveModule', 'moveModule', { id: 'sales', dir: -1 }),
  mutationCase('setModuleTier', 'setModuleTier', { id: 'sales', tier: 'team' }),
  mutationCase('saveModule', 'saveModule', { draft: draftModule(), status: 'draft' }),
  mutationCase('publishModule', 'publishModule', { id: 'operations' }),
  mutationCase('unpublishModule', 'unpublishModule', { id: 'sales' }),
  mutationCase('uploadResource', 'uploadResource', {
    title: 'Authorization Matrix Fixture',
    desc: 'Written by the Gate 7 matrix.',
    cat: 'Lead Generation Scripts',
    type: 'PDF guide',
    tier: 'agent',
    // `uploadResource` answers `{ error: 'Attach a file first.' }` — a 422 — without one.
    file: 'matrix.pdf',
  }),
  mutationCase('setResourceTier', 'setResourceTier', { id: 'r1' }),
  mutationCase('setResourceStatus', 'setResourceStatus', { id: 'r1' }),
  mutationCase('deleteResource', 'deleteResource', { id: 'r1' }),
  mutationCase('deleteModule', 'deleteModule', { id: 'draft_mod' }),
  mutationCase('openEnrollment', 'openEnrollment', { cohortId: 'apr27' }),
  mutationCase('createCohort', 'createCohort', {}),
  mutationCase('goLive', 'goLive', { sessionId: 'dec26-s3' }),
  mutationCase('endSession', 'endSession', { sessionId: 'dec26-s3' }),
  mutationCase('publishReplay', 'publishReplay', { sessionId: 'dec26-s3' }),
  mutationCase('updateSession', 'updateSession', {
    id: 'dec26-s3',
    title: 'The Living Database',
    date: '2026-12-09',
    time: '13:00',
    mins: 75,
    zoom: 'https://zoom.us/j/8841200610',
  }),
  mutationCase('sendAnnouncement', 'sendAnnouncement', {
    title: 'Matrix fixture',
    body: 'Written by the Gate 7 authorization matrix.',
    audience: 'all',
    inapp: true,
    email: false,
    when: 'now',
  }),
  mutationCase('toggleReminder', 'toggleReminder', { id: 'rm1' }),
  mutationCase('setTierPrice', 'setTierPrice', { tierId: 'agent', price: 1095 }),
  mutationCase('setRequestStatus', 'setRequestStatus', { id: 'ur1', status: 'contacted' }),
  mutationCase('inviteStaff', 'inviteStaff', { email: 'matrix-invite@amplifiedimpact.com', role: 'Support' }),
  mutationCase('setStaffRole', 'setStaffRole', { id: 'st_spare_role', role: 'Admin' }),
  mutationCase('removeStaff', 'removeStaff', { id: 'st_spare_gone' }),
  // The conjunction: § 7.3's `saveModule` takes `curriculum` always and `publish` as well when the
  // draft is being published, so this row's expectation is an AND over two permissions and is the
  // one case in the matrix that is not a single lookup. Same mutation, different arguments.
  mutationCase('saveModule (publishing)', 'saveModule', { draft: draftModule(), status: 'published' }),
  mutationCase('togglePermission', 'togglePermission', { role: 'Content Editor', perm: 'staff' }),
];

/**
 * The eleven learner mutations with the learner who IS entitled — the 200 half of each pair.
 *
 * In this order for the same reason `STAFF_CASES` is ordered: `removeMember` deletes `u_sarah`, who
 * three earlier cases name, so it runs last.
 */
const LEARNER_ALLOWED: { as: string; case: Case }[] = [
  { as: 'u_jamie', case: mutationCase('dismissAnnouncement', 'dismissAnnouncement', { id: 'a1' }) },
  // A Team-tier learner on a Team-tier module, which is the pair for Jamie's 403 below.
  { as: 'u_alex', case: mutationCase('toggleStep', 'toggleStep', { moduleId: 'meetings', stepId: 'c1' }) },
  { as: 'u_alex', case: mutationCase('toggleChecklistItem', 'toggleChecklistItem', { moduleId: 'meetings', stepId: 'c1', itemId: 'item-1' }) },
  { as: 'u_alex', case: mutationCase('setPref', 'setPref', { key: 'acc:meetings:c1:0', value: '1' }) },
  { as: 'u_alex', case: mutationCase('saveVideoProgress', 'saveVideoProgress', { moduleId: 'meetings', videoId: 'intro', maxPct: 0.25, lastPositionS: 4 }) },
  // Jamie's `marketing` is built and deployed, so `buildOf` is `verified` and the deploy is allowed.
  { as: 'u_jamie', case: mutationCase('markDeployed', 'markDeployed', { moduleId: 'marketing' }) },
  { as: 'u_jamie', case: mutationCase('setRuntime', 'setRuntime', { moduleId: 'marketing', runtime: 'paused' }) },
  // B-11 (D-228): Undo on the same deployed week.
  { as: 'u_jamie', case: mutationCase('unmarkDeployed', 'unmarkDeployed', { moduleId: 'marketing' }) },
  {
    as: 'u_jamie',
    case: mutationCase('recordRun', 'recordRun', {
      moduleId: 'marketing',
      title: 'Listing Launch Packet · 9 Probe Way',
      preview: 'Written by the Gate 7 authorization matrix.',
    }),
  },
  { as: 'u_jamie', case: mutationCase('requestUpgrade', 'requestUpgrade', { source: 'Team tier page' }) },
  // `x1` is an Executive Build Vault item: `tier: 'team'`, so Agent tier is refused.
  { as: 'u_alex', case: mutationCase('downloadResource', 'downloadResource', { id: 'x1' }) },
  {
    as: 'u_alex',
    case: mutationCase('inviteMember', 'inviteMember', { email: 'matrix@northlinerealty.com', role: 'Sales Agent' }),
  },
  { as: 'u_alex', case: mutationCase('remindMembers', 'remindMembers', { userIds: ['u_sarah'] }) },
  {
    as: 'u_alex',
    case: mutationCase('setMemberRole', 'setMemberRole', { userId: 'u_sarah', role: 'Operations Lead' }),
  },
  { as: 'u_alex', case: mutationCase('removeMember', 'removeMember', { userId: 'u_sarah' }) },
];

/**
 * The checklist's "called by another learner's session returns 403", one row per way a learner
 * mutation can name something that is not theirs.
 *
 * `why` is core's own message, asserted verbatim: a 403 for the wrong reason (say, a `not_found`
 * that happens to map to 403) would pass a status-only check and prove nothing about the boundary.
 */
const LEARNER_DENIED: { as: string; case: Case; why: string }[] = [
  {
    // Agent tier reaching for a Team-tier module. Same arguments as Alex's 200 above.
    as: 'u_jamie',
    case: mutationCase('toggleStep', 'toggleStep', { moduleId: 'meetings', stepId: 'c1' }),
    why: 'Team tier required',
  },
  {
    as: 'u_jamie',
    case: mutationCase('downloadResource', 'downloadResource', { id: 'x1' }),
    why: 'Team tier required',
  },
  {
    // A Team-tier learner has nothing to upgrade; Jamie's identical call is the 200.
    as: 'u_alex',
    case: mutationCase('requestUpgrade', 'requestUpgrade', { source: 'Team tier page' }),
    why: 'Team tier learners have nothing to upgrade.',
  },
  {
    // A Sales Agent on their own team's seats.
    as: 'u_sarah',
    case: mutationCase('inviteMember', 'inviteMember', { email: 'matrix@northlinerealty.com', role: 'Sales Agent' }),
    why: 'Only the team owner or operations lead can invite.',
  },
  {
    as: 'u_sarah',
    case: mutationCase('remindMembers', 'remindMembers', { userIds: ['u_sarah'] }),
    why: 'Only the team owner or operations lead can remind.',
  },
  {
    // An Operations Lead may invite and remind but may not rewrite roles or remove seats.
    as: 'u_priya',
    case: mutationCase('setMemberRole', 'setMemberRole', { userId: 'u_sarah', role: 'Sales Agent' }),
    why: 'Only the team owner can change roles.',
  },
  {
    as: 'u_priya',
    case: mutationCase('removeMember', 'removeMember', { userId: 'u_sarah' }),
    why: 'Only the team owner can remove a member.',
  },
  {
    // The cross-TEAM arm: Northline's owner naming a Harbor & Pine member. `u_claire` is a real
    // learner, so this is not a `not_found` wearing a 403 — it is the team boundary.
    as: 'u_alex',
    case: mutationCase('remindMembers', 'remindMembers', { userIds: ['u_claire'] }),
    why: 'That person is not on your team.',
  },
  {
    as: 'u_alex',
    case: mutationCase('setMemberRole', 'setMemberRole', { userId: 'u_claire', role: 'Sales Agent' }),
    why: 'That person is not on your team.',
  },
  {
    as: 'u_alex',
    case: mutationCase('removeMember', 'removeMember', { userId: 'u_claire' }),
    why: 'That person is not on your team.',
  },
];

// ================================================================================================
// The probe: staff-or-learner, and which permissions
// ================================================================================================

type MutationFn = (db: Db, actor: Actor, args: never, ctx: Ctx) => unknown;
const MUTATIONS = M as unknown as Record<string, MutationFn>;

/** A fixture whose `role` column of the permissions table grants exactly `granted`. */
function grantingOnly(db: Db, role: StaffRole, granted: readonly PermKey[]): Db {
  const copy = structuredClone(db);
  copy.perms[role] = Object.fromEntries(ALL_PERMS.map((p) => [p, granted.includes(p) ? 1 : 0])) as Record<
    PermKey,
    0 | 1
  >;
  return copy;
}

/**
 * Whether this mutation throws `forbidden` for this db, in process.
 *
 * Only `forbidden` counts. A `not_found`, an `invalid` or an `{ error }` return all mean the
 * authorization check PASSED and the mutation went on to dislike something else, which is exactly
 * what the probe needs to distinguish.
 */
function refuses(db: Db, name: string, args: unknown): boolean {
  try {
    MUTATIONS[name]!(db, { kind: 'staff', staffId: PROBE_STAFF }, args as never, {
      now: NOW,
      id: deterministicIds(NOW),
    });
    return false;
  } catch (err) {
    return err instanceof MutationError && err.code === 'forbidden';
  }
}

/**
 * The staff row the probe acts as, and its role.
 *
 * A NON-Owner role, deliberately: `can()` short-circuits `role === 'Owner'` to true, so probing as
 * the Owner would make every mutation look as though it required nothing.
 */
const PROBE_STAFF = 'st_spare_role';
const PROBE_ROLE: StaffRole = 'Support';

/** The permissions a case needs, as the conjunction described in the header. */
function permissionsFor(db: Db, c: Case): PermKey[] | 'learner' {
  if (refuses(grantingOnly(db, PROBE_ROLE, ALL_PERMS), c.name, c.args)) return 'learner';
  return ALL_PERMS.filter((p) =>
    refuses(grantingOnly(db, PROBE_ROLE, ALL_PERMS.filter((q) => q !== p)), c.name, c.args),
  );
}

/**
 * What the probe found when this file was written. See the header: the derivation finds rows a
 * hand-written matrix would miss, and this pin stops a changed `requirePerm` in `@ai/core` from
 * silently rewriting what the matrix asserts.
 */
const EXPECTED_PERMISSIONS: Record<string, PermKey[]> = {
  nudgeLearners: ['viewLearners'],
  setLearnerTier: ['seats'],
  moveModule: ['curriculum'],
  setModuleTier: ['curriculum'],
  saveModule: ['curriculum'],
  publishModule: ['publish'],
  unpublishModule: ['publish'],
  uploadResource: ['curriculum'],
  setResourceTier: ['curriculum'],
  setResourceStatus: ['curriculum'],
  deleteResource: ['curriculum'],
  deleteModule: ['curriculum'],
  openEnrollment: ['cohorts'],
  createCohort: ['cohorts'],
  goLive: ['cohorts'],
  endSession: ['cohorts'],
  publishReplay: ['cohorts'],
  updateSession: ['cohorts'],
  sendAnnouncement: ['announce'],
  toggleReminder: ['announce'],
  setTierPrice: ['billing'],
  setRequestStatus: ['billing'],
  inviteStaff: ['staff'],
  setStaffRole: ['staff'],
  removeStaff: ['staff'],
  'saveModule (publishing)': ['curriculum', 'publish'],
  togglePermission: ['staff'],
};

// ================================================================================================
// The route table
// ================================================================================================

type Guard = 'open' | 'open-stream' | 'session' | 'test-only' | 'page';

/**
 * Every route the API registers, and whether the checklist's 401 applies to it.
 *
 * Compared against `app.printRoutes()` below, so this is an assertion about the real router rather
 * than a list that can fall behind it: a route added anywhere in `src/routes/` fails
 * `the router serves exactly the routes this file knows about` until it is classified here, which
 * is the only way "every /api/* route" can be a claim rather than a hope.
 */
const ROUTES: { path: string; methods: string; guard: Guard }[] = [
  // The checklist's three exemptions. Health is Railway's healthcheck and touches nothing; the
  // auth routes are how a visitor with no session gets one; `/api/events` is the SSE stream the
  // SPA opens before it knows whether it is signed in.
  { path: '/api/health', methods: 'GET, HEAD', guard: 'open' },
  // D-121: whether the AI Accelerator's curriculum is in the database, as counts only.
  { path: '/api/health/curriculum', methods: 'GET, HEAD', guard: 'open' },
  // D-122: whether a Skill Library download link resolves, as counts and a status code only.
  { path: '/api/health/library', methods: 'GET, HEAD', guard: 'open' },
  { path: '/api/events', methods: 'GET, HEAD', guard: 'open-stream' },
  { path: '/api/auth/request', methods: 'POST', guard: 'open' },
  { path: '/api/auth/verify', methods: 'POST', guard: 'open' },
  { path: '/api/auth/sign-out', methods: 'POST', guard: 'open' },
  // D-132: password sign-in and the set and reset links. Open like the magic link's two: they are how
  // a visitor without a session gets one.
  { path: '/api/auth/login', methods: 'POST', guard: 'open' },
  { path: '/api/auth/password/forgot', methods: 'POST', guard: 'open' },
  { path: '/api/auth/password/token', methods: 'POST', guard: 'open' },
  { path: '/api/auth/password/set', methods: 'POST', guard: 'open' },
  { path: '/api/auth/password/checkout', methods: 'POST', guard: 'open' },
  // D-139: "Continue With Google". Open like the other ways in: whether the button shows, the start
  // (a redirect to Google) and Google's redirect back. Both Google routes are 404 until configured.
  { path: '/api/auth/providers', methods: 'GET, HEAD', guard: 'open' },
  { path: '/api/auth/google', methods: 'GET, HEAD', guard: 'open' },
  { path: '/api/auth/google/callback', methods: 'GET, HEAD', guard: 'open' },
  // D-132: the account page's two, behind the session.
  { path: '/api/auth/password', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/auth/password/change', methods: 'POST', guard: 'session' },
  // The four the 401 is about.
  { path: '/api/me', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/me/prefs', methods: 'PATCH', guard: 'session' },
  { path: '/api/mutate/:name', methods: 'POST', guard: 'session' },
  // D-172: the R2 mockup's remaining Build controls, audited, beside `/api/mutate` and guarded as it is.
  { path: '/api/admin/actions/:name', methods: 'POST', guard: 'session' },
  // D-247 (H-9): Resend Invite and Send Nudge, with a real email. Session-guarded; who may is core's rule.
  { path: '/api/learners/:userId/resend-invite', methods: 'POST', guard: 'session' },
  { path: '/api/learners/:userId/nudge', methods: 'POST', guard: 'session' },
  { path: '/api/snapshot', methods: 'GET, HEAD', guard: 'session' },
  // Phase 08's four. All session-guarded, and every one hands out something a learner must not get
  // for free: a presigned object URL (§ 8.2) or a Zoom link (§ 8.4). This table is why they could
  // not be added without being classified — `the router serves exactly the routes this file knows
  // about` failed the moment they were registered, which is the test working rather than the test
  // being in the way.
  { path: '/api/files/resource/:id', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/files/module/:moduleId/:fileName', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/files/upload-url', methods: 'POST', guard: 'session' },
  // D-188: a course week's uploaded video, streamed for a viewer who may open its week.
  { path: '/api/files/course/uploads/:yyyy/:mm/:file', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/sessions/:id/join', methods: 'GET, HEAD', guard: 'session' },
  // § 7.7's harness. See the header: exempt because they do not exist outside `NODE_ENV=test`,
  // which `test/routes.test.ts` is what proves.
  { path: '/api/test/session', methods: 'POST', guard: 'test-only' },
  { path: '/api/test/outbox', methods: 'GET, HEAD', guard: 'test-only' },
  // D-028's public waitlist: an `/api/*` route that answers without a session on purpose. See the
  // header, point 3. Registered whenever a database is configured, which `build()` defaults to here.
  { path: '/api/ai101/waitlist', methods: 'POST', guard: 'open' },
  // The free guides' opt-ins (D-038, D-039): the waitlist's route under each guide's path, open for
  // the same reasons, and refusing what their pages do not show (phone, SMS). /retool's (D-046) also
  // takes a team size and the December box. One per slug in `GUIDE_SLUGS` (D-052), so every guide is
  // classified the same way: `the router serves exactly the routes this file knows about` still fails
  // on a route registered outside that list.
  ...GUIDE_SLUGS.map((slug) => ({ path: `/api/${slug}`, methods: 'POST', guard: 'open' as const })),
  // D-028's public page and the spec's three redirects to it. Not `/api/*`, so outside the
  // checklist's 401 rule by construction; `page` says so, and the sweep asserts the prefix.
  { path: '/ai101', methods: 'GET, HEAD', guard: 'page' },
  { path: '/ai101/', methods: 'GET, HEAD', guard: 'page' },
  { path: '/AI101', methods: 'GET, HEAD', guard: 'page' },
  { path: '/ai-101', methods: 'GET, HEAD', guard: 'page' },
  // D-032's calendar file for the page's sprint: public, like the page it belongs to.
  { path: '/ai101/carousel-sprint.ics', methods: 'GET, HEAD', guard: 'page' },
  // D-037's short link to the page's waitlist screen: a redirect to the page, public like it.
  { path: '/waitlist', methods: 'GET, HEAD', guard: 'page' },
  { path: '/waitlist/', methods: 'GET, HEAD', guard: 'page' },
  // The Terms of Service and Privacy Policy the waitlist links to (`routes/legal.ts`): public
  // pages, served like /ai101, and outside `/api/` like it.
  { path: '/terms', methods: 'GET, HEAD', guard: 'page' },
  { path: '/privacy', methods: 'GET, HEAD', guard: 'page' },
  // The free guides' landing pages (D-038, D-039), served like /ai101, each with its trailing slash's
  // 301, and /retool's two capitalised spellings (D-046): the talk says "Type RETOOL in the chat",
  // and each is the same public 301 to the page. From `GUIDE_SLUGS` and `GUIDE_ALIASES` (D-052).
  ...GUIDE_SLUGS.flatMap((slug) => [
    { path: `/${slug}`, methods: 'GET, HEAD', guard: 'page' as const },
    { path: `/${slug}/`, methods: 'GET, HEAD', guard: 'page' as const },
    ...(GUIDE_ALIASES[slug] ?? []).map((alias) => ({ path: alias, methods: 'GET, HEAD', guard: 'page' as const })),
  ]),
  // The free library (D-050), with the other words someone would type for it, each a public 301.
  { path: '/library', methods: 'GET, HEAD', guard: 'page' },
  { path: '/library/', methods: 'GET, HEAD', guard: 'page' },
  { path: '/guides', methods: 'GET, HEAD', guard: 'page' },
  { path: '/guides/', methods: 'GET, HEAD', guard: 'page' },
  { path: '/skills', methods: 'GET, HEAD', guard: 'page' },
  { path: '/skills/', methods: 'GET, HEAD', guard: 'page' },
  // The offer (D-073 to D-077). Its pages are public like the guides'. Its API routes are open on
  // purpose, each with what stands in for a session: checkout has the same-origin check and its own
  // limit, the status lookup answers only to an unguessable Stripe session id with nothing personal,
  // the waitlist is the guides' route, and the webhook is signed by Stripe (`routes/offer.ts`).
  { path: '/offer', methods: 'GET, HEAD', guard: 'page' },
  { path: '/forum', methods: 'GET, HEAD', guard: 'page' },
  { path: '/offer/welcome', methods: 'GET, HEAD', guard: 'page' },
  // The welcome page's calendar files: the Accelerator's builds, and office hours for every plan.
  { path: '/calendar/builds.ics', methods: 'GET, HEAD', guard: 'page' },
  { path: '/calendar/office-hours.ics', methods: 'GET, HEAD', guard: 'page' },
  // D-180: both files' events in one, for the learner portal's Schedule ("Add all to calendar").
  { path: '/calendar/schedule.ics', methods: 'GET, HEAD', guard: 'page' },
  // Programs and Pricing (D-111), filled per request like /offer.
  { path: '/pricing', methods: 'GET, HEAD', guard: 'page' },
  // The Amplified AI Accelerator's sales page (D-112), filled the same way.
  { path: '/team-build', methods: 'GET, HEAD', guard: 'page' },
  // The Amplified Team Plan's sales page (D-113), filled the same way.
  { path: '/teams', methods: 'GET, HEAD', guard: 'page' },
  // The Amplified Agent Plan's sales page (D-114), filled the same way.
  { path: '/agents', methods: 'GET, HEAD', guard: 'page' },
  // Free Resources and About (D-116, D-117): the site's pages, served the same way, with no token.
  { path: '/free', methods: 'GET, HEAD', guard: 'page' },
  // Amplified Insiders' own page (Connor, Nov 11), filled the same way as /pricing.
  { path: '/insiders', methods: 'GET, HEAD', guard: 'page' },
  { path: '/about', methods: 'GET, HEAD', guard: 'page' },
  { path: '/agreement', methods: 'GET, HEAD', guard: 'page' },
  { path: '/api/offer', methods: 'GET, HEAD', guard: 'open' },
  { path: '/api/offer/order-status', methods: 'GET, HEAD', guard: 'open' },
  { path: '/api/checkout', methods: 'POST', guard: 'open' },
  { path: '/api/offer/waitlist', methods: 'POST', guard: 'open' },
  { path: '/api/stripe/webhook', methods: 'POST', guard: 'open' },
  // The skill library (D-079): signed in, like the Vault.
  { path: '/api/skills', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/skills/:id/download/:kind', methods: 'GET, HEAD', guard: 'session' },
  // D-151: a skill's guided setup, signed in, and only for a learner the access rule lets in.
  { path: '/api/skill-guides/:slug', methods: 'GET, HEAD', guard: 'session' },
  // D-150: an access group's welcome panel, put away for good by the signed-in member.
  { path: '/api/skills/welcome/dismiss', methods: 'POST', guard: 'session' },
  // One skill, $37 once. Signed in. An access-group member is refused after the session check.
  { path: '/api/skills/:id/checkout', methods: 'POST', guard: 'session' },
  // Signed-out $37 checkout. Off, it redirects to the stopgap Payment Link. On, it starts a session.
  { path: '/api/skills/:id/guest-checkout', methods: 'GET, HEAD', guard: 'open' },
  // After a signed-out $37 payment. Signs a new account in; an existing password goes to sign-in.
  { path: '/api/skills/guest-return', methods: 'GET, HEAD', guard: 'open' },
  // Manage Billing (D-077): the owner's way into Stripe's billing portal, signed in.
  { path: '/api/billing/portal', methods: 'GET, HEAD', guard: 'session' },
  // The AI Accelerator's pages (D-110): signed in, then gated by plan.
  { path: '/api/course', methods: 'GET, HEAD', guard: 'session' },
  // D-196: the team's intake. Signed in, then the owner and the operator.
  { path: '/api/intake', methods: 'GET, HEAD, PUT', guard: 'session' },
  // D-229 (B-18): the intake as a PDF. Signed in, then the owner and the operator.
  { path: '/api/intake/pdf', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/stack', methods: 'GET, HEAD, PUT', guard: 'session' },
  // D-199: intake conditions and the operator's count. Signed in, then the owner and the operator.
  { path: '/api/personalize', methods: 'GET, HEAD, POST', guard: 'session' },
  // D-231: the cohort Community. Signed in, then a learner whose plan has the course, or staff
  // (`test/community.test.ts`).
  { path: '/api/community', methods: 'GET, HEAD, POST', guard: 'session' },
  { path: '/api/community/:id', methods: 'GET, HEAD, PATCH', guard: 'session' },
  { path: '/api/community/:id/replies', methods: 'POST', guard: 'session' },
  { path: '/api/community/posts/:postId', methods: 'PATCH', guard: 'session' },
  { path: '/api/community/posts/:postId/delete', methods: 'POST', guard: 'session' },
  // D-230: Turn in. Signed in, then a team's owner and operator (their own team's), or staff who may view learners
  // (`test/submissions.test.ts`).
  { path: '/api/submissions', methods: 'POST, GET, HEAD', guard: 'session' },
  { path: '/api/submissions/upload-url', methods: 'POST', guard: 'session' },
  { path: '/api/submissions/:id/files/:n', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/admin/submissions', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/admin/submissions/:id/status', methods: 'POST', guard: 'session' },
  // D-237: a cohort's turned-in files, counted and deleted. Signed in, then staff who manage cohorts.
  { path: '/api/admin/cohorts/:cohortId/turned-in-files', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/admin/cohorts/:cohortId/turned-in-files/delete', methods: 'POST', guard: 'session' },
  // D-236: the seat card form. Signed in, then a team's learners (the owner and the operator write; agents read), or
  // staff who may view learners for the list (`test/seat-card.test.ts`).
  { path: '/api/seat-card', methods: 'GET, HEAD, PUT', guard: 'session' },
  { path: '/api/seat-card/pdf', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/admin/seat-cards', methods: 'GET, HEAD', guard: 'session' },
  // The CRM sync log (D-134): signed in, then the Owner and Admins only.
  { path: '/api/admin/crm-sync', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/admin/crm-sync/retry', methods: 'POST', guard: 'session' },
  // The Admin Console (D-157): signed in, then by Console capability (`test/console-authz.test.ts`
  // holds the role-by-role matrix).
  { path: '/api/console/me', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/console/audit', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/console/audit/export', methods: 'POST', guard: 'session' },
  // D-160 R2-3b: the Owner's two-step change to the matrix (a POST to the same path, and its preview).
  { path: '/api/console/roles', methods: 'GET, HEAD, POST', guard: 'session' },
  { path: '/api/console/roles/preview', methods: 'POST', guard: 'session' },
  // Admin Console PR 2 (D-158): workspaces, users, staff notes, the password reset, the users export
  // and search. Signed in, then by capability (`test/console-authz.test.ts`).
  { path: '/api/console/workspaces', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/console/workspaces/:teamId', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/console/workspaces/:teamId/intake', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/console/workspaces/:teamId/intake/pdf', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/console/workspaces/:teamId/intake/sync', methods: 'POST', guard: 'session' },
  { path: '/api/console/workspaces/:teamId/stack', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/console/users', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/console/users/:userId', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/console/users/:userId/password-reset', methods: 'POST', guard: 'session' },
  { path: '/api/console/users/export', methods: 'POST', guard: 'session' },
  { path: '/api/console/notes', methods: 'GET, HEAD, POST', guard: 'session' },
  { path: '/api/console/notes/:id/delete', methods: 'POST', guard: 'session' },
  { path: '/api/console/search', methods: 'GET, HEAD', guard: 'session' },
  // Admin Console PR 3a (D-162): masquerade. Signed in; Start and the history by capability, current
  // for any viewer, Extend and Exit by the session's own masquerade (`test/console-authz.test.ts`,
  // `test/console-masquerade.test.ts`).
  { path: '/api/console/masquerade', methods: 'POST', guard: 'session' },
  { path: '/api/console/masquerade/current', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/console/masquerade/extend', methods: 'POST', guard: 'session' },
  { path: '/api/console/masquerade/exit', methods: 'POST', guard: 'session' },
  { path: '/api/console/masquerade/sessions', methods: 'GET, HEAD', guard: 'session' },
  // Admin Console PR 4 (D-163): Billing, read-only. Signed in, then billing.read (`test/console-authz.test.ts`).
  { path: '/api/console/billing/summary', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/console/billing/customers', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/console/billing/subscriptions', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/console/billing/invoices', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/console/billing/failed', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/console/billing/refunds', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/console/billing/scopes', methods: 'GET, HEAD', guard: 'session' },
  // Admin Console PR 5 (D-164): Billing's confirmed refund and void. Signed in, then billing.refund or
  // billing.void (`test/console-authz.test.ts`), then a confirm token (`test/console-billing-actions.test.ts`).
  { path: '/api/console/billing/refund/preview', methods: 'POST', guard: 'session' },
  { path: '/api/console/billing/refund', methods: 'POST', guard: 'session' },
  { path: '/api/console/billing/void/preview', methods: 'POST', guard: 'session' },
  { path: '/api/console/billing/void', methods: 'POST', guard: 'session' },
  // Admin Console PR 6 (D-165): API & Webhooks and Scheduled Jobs. Signed in, then by capability
  // (`test/console-authz.test.ts`, `test/console-ops.test.ts`).
  { path: '/api/console/api/endpoints', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/console/webhooks', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/console/webhooks/ghl/retry', methods: 'POST', guard: 'session' },
  { path: '/api/console/jobs', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/console/jobs/:job/run', methods: 'POST', guard: 'session' },
  // Admin Console PR 7 (D-166): the email log and usage. Signed in, then by capability
  // (`test/console-authz.test.ts`).
  { path: '/api/console/email', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/console/email/:id', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/console/email/export', methods: 'POST', guard: 'session' },
  { path: '/api/console/usage', methods: 'GET, HEAD', guard: 'session' },
  // Admin Console PR 8 (D-167): incidents. Signed in, then by capability (`test/console-authz.test.ts`,
  // `test/console-incidents.test.ts`).
  { path: '/api/console/incidents', methods: 'GET, HEAD, POST', guard: 'session' },
  { path: '/api/console/incidents/summary', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/console/incidents/:id', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/console/incidents/:id/ack', methods: 'POST', guard: 'session' },
  { path: '/api/console/incidents/:id/resolve', methods: 'POST', guard: 'session' },
  { path: '/api/console/incidents/:id/notes', methods: 'POST', guard: 'session' },
  // Admin Console PR 9 (D-168): Environment Flags, the flag flip, Integrations and Check now, Deploys
  // and DB health. Signed in, then by capability (`test/console-authz.test.ts`).
  { path: '/api/console/env', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/console/flags/:key', methods: 'POST', guard: 'session' },
  { path: '/api/console/welcome/test', methods: 'POST', guard: 'session' },
  { path: '/api/console/integrations', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/console/integrations/:id/check', methods: 'POST', guard: 'session' },
  { path: '/api/console/deploys', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/console/db', methods: 'GET, HEAD', guard: 'session' },
  // Admin Console PR 10 (D-169): System Health and the Skills list. Signed in, then console.view.
  { path: '/api/console/health', methods: 'GET, HEAD', guard: 'session' },
  { path: '/api/console/skills', methods: 'GET, HEAD', guard: 'session' },
  // D-172: Invite staff and Change role…, two steps (the change is a POST to `/api/console/staff`).
  { path: '/api/console/staff/preview', methods: 'POST', guard: 'session' },
  { path: '/api/console/staff', methods: 'POST', guard: 'session' },
];

/**
 * `app.printRoutes({ commonPrefix: false })` as `{ path, methods }` rows.
 *
 * Fastify exposes no public route registry, and the tree it prints is the one artifact that comes
 * from find-my-way itself. It is still a debugging format, so the parser is deliberately strict —
 * a line it cannot read throws — and its output is asserted against `ROUTES`, which makes the test
 * fail loudly if the format ever changes rather than quietly reporting an empty route set.
 *
 * Depth is positional: every indent unit and every branch marker is exactly four characters, so a
 * child like `└── /prefs` under `/api/me` is re-joined to `/api/me/prefs`.
 */
export function parseRouteTree(printed: string): { path: string; methods: string }[] {
  const stack: string[] = [];
  const out: { path: string; methods: string }[] = [];

  for (const raw of printed.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    if (line === '') continue;

    const marker = Math.max(line.indexOf('├──'), line.indexOf('└──'));
    if (marker < 0 || marker % 4 !== 0) throw new Error(`printRoutes line is not a tree node: ${JSON.stringify(raw)}`);
    const depth = marker / 4;
    const rest = line.slice(marker + 4);

    // `/api/me (GET, HEAD)`, or `/api/me` for a node that only carries children.
    const node = /^(\S*)(?: \((.+)\))?$/.exec(rest);
    if (!node) throw new Error(`printRoutes node is not a path: ${JSON.stringify(rest)}`);
    const [, segment = '', methods] = node;

    stack.length = depth;
    stack[depth] = segment;
    if (methods !== undefined) out.push({ path: stack.join(''), methods });
  }

  return out;
}

// ================================================================================================
// Harness
// ================================================================================================

/**
 * Cases actually executed, asserted at the bottom.
 *
 * Gate 7 asks for a matrix, and a matrix that quietly covers half of itself is worse than none.
 * These counters are what makes "130 cases ran" a measurement instead of an estimate.
 */
const EXECUTED = { matrix: 0, learnerDenied: 0, learnerAllowed: 0, staffOnLearner: 0, unauthenticated: 0, exempt: 0 };

let app: App;
let savedAppUrl: string | undefined;

beforeAll(async () => {
  // `inviteMember` emits § 7.5's team-invite email, and `templates/links.ts` refuses to render
  // without this — the mutation still answers 200, but the run fills with logged render failures.
  savedAppUrl = process.env.APP_URL;
  process.env.APP_URL = 'https://learn.example.com';
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  // Pay for CREATE DATABASE and the migration once, in a hook with the 60 s budget, rather than
  // inside the first case's own timeout.
  await testDatabase();
});

afterAll(() => {
  // Put the environment back. Vitest isolates every test FILE in its own worker, so nothing in
  // this repository reads these two after the run — but `isolate: false` or a change to
  // `fileParallelism` would make a file that leaves `FIXED_NOW` set pin the next file's clock to
  // Gate 7's instant, and that failure would point at the wrong suite. `test/routes.test.ts`
  // restores them for the same reason; this is the same housekeeping, not a different rule.
  if (savedAppUrl === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = savedAppUrl;
  delete process.env.FIXED_NOW;
});

beforeEach(() => {
  // `clock.ts` reads FIXED_NOW per call, so this has to be re-set per test and not only once.
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  resetOutbox();
});

afterEach(async () => {
  // `app.close()`, never `shutdown(app)`: `shutdown` releases the pool `test/helpers.ts` owns, and
  // every later `resetDatabase` in the file then fails with CONNECTION_ENDED. `close()` drains the
  // SSE streams on its own through the `preClose` hook `routes/events.ts` registers.
  await app?.close();
});

/** § 9.4's two headers, as `app.inject` already supplies them: JSON content-type, no Origin. */
const mutate = (name: string, args: unknown, cookie: string) =>
  app.inject({ method: 'POST', url: `/api/mutate/${name}`, headers: { cookie }, payload: args as object });

// ================================================================================================
// The suite
// ================================================================================================

describe('Gate 7 · the authorization matrix @g7', () => {
  describe('the matrix is enumerated, not written out', () => {
    it('has a case for every mutation in the phase 02 catalog @g7', async () => {
      app = await build({ logger: false });

      // `SCHEMAS` is the only runtime list of mutation names (`MutationName` is type-only), and
      // `routes/schemas.ts` is typed so that tsc has already proved it names every mutation. So
      // this is the completeness check Gate 7 needs: a mutation added to `@ai/core` lands in
      // `SCHEMAS` by typecheck and then fails HERE until it has a case.
      const catalog = Object.keys(SCHEMAS).sort();
      const covered = [
        ...new Set([...STAFF_CASES.map((c) => c.name), ...LEARNER_ALLOWED.map((c) => c.case.name)]),
      ].sort();
      expect(covered, 'every mutation needs a case in STAFF_CASES or LEARNER_ALLOWED').toEqual(catalog);

      // And the exported functions agree with the schema registry, so neither list can drift.
      const exported = Object.keys(M)
        .filter((k) => typeof (M as Record<string, unknown>)[k] === 'function' && k !== 'MutationError')
        .sort();
      expect(exported).toEqual(catalog);
      expect(catalog).toHaveLength(41);
    });

    it('derives staff-or-learner and the permission conjunction from core itself @g7', async () => {
      app = await build({ logger: false });
      const db = fixture();

      const derived: Record<string, PermKey[]> = {};
      for (const c of STAFF_CASES) {
        const perms = permissionsFor(db, c);
        expect(perms, `${c.label} is a staff mutation, so it must require at least one permission`).not.toBe(
          'learner',
        );
        expect(perms, `${c.label} must require at least one permission`).not.toHaveLength(0);
        derived[c.label] = perms as PermKey[];
      }

      // The pin. A `requirePerm` added to or removed from a mutation in `@ai/core` fails here
      // instead of silently changing which cells of the matrix are expected to be 200.
      expect(derived).toEqual(EXPECTED_PERMISSIONS);

      // The other half of the classification: every learner mutation is refused for a staff actor
      // even with the whole permissions table granted, which is what makes "learner mutation" a
      // derived fact rather than a label.
      for (const { case: c } of LEARNER_ALLOWED) {
        expect(permissionsFor(db, c), `${c.label} must classify as a learner mutation`).toBe('learner');
      }
    });

    it('has a persona for every STAFF_ROLES entry @g7', async () => {
      app = await build({ logger: false });
      const db = fixture();
      const personas = STAFF_ROLES.map((role) => [role, personaFor(db, role)] as const);
      expect(personas.map(([, id]) => id)).toHaveLength(STAFF_ROLES.length);
      // Distinct rows: two roles sharing a persona would mean one column of the matrix was
      // actually testing the other.
      expect(new Set(personas.map(([, id]) => id)).size).toBe(STAFF_ROLES.length);
    });
  });

  // ----------------------------------------------------------------------------------------------
  // Gate 7: "For every staff mutation × every STAFF_ROLES entry, the HTTP status is 200 if
  // perms[role][perm], else 403."
  // ----------------------------------------------------------------------------------------------
  describe('every staff mutation × every STAFF_ROLES entry', () => {
    for (const role of STAFF_ROLES) {
      it(
        `${role}: 200 where the permissions table allows, 403 where it does not @g7`,
        async () => {
          const db = fixture();
          const staffId = personaFor(db, role);
          const actor: Actor = { kind: 'staff', staffId };

          // One reset for all 27 cases of this role. See the header on why that is safe and why
          // `STAFF_CASES` is ordered the way it is.
          await resetDatabase(db);
          app = await build({ logger: false });
          const cookie = await app.signInAs(staffId);

          const failures: string[] = [];
          // D-171: the audit rows each case wrote. The three staff writes write exactly one each (`ok`
          // on a 200, `denied` on a 403); D-172: the four Build writes behind a Confirm write one `ok`
          // row on a 200; every other mutation on `/api/mutate` writes none.
          let lastAuditId = 0;
          const newAuditRows = async () => {
            const rows = await (await testDatabase())
              .select({ id: auditLog.id, action: auditLog.action, outcome: auditLog.outcome })
              .from(auditLog)
              .where(gt(auditLog.id, lastAuditId))
              .orderBy(asc(auditLog.id));
            lastAuditId = rows.at(-1)?.id ?? lastAuditId;
            return rows.map((r) => `${r.action}:${r.outcome}`);
          };
          for (const c of STAFF_CASES) {
            const perms = EXPECTED_PERMISSIONS[c.label]!;
            // The expectation, from core's own reader of the real `permissions` table. Nothing in
            // this file restates who may do what.
            const allowed = perms.every((p) => can(db, actor, p));
            const expected = allowed ? 200 : 403;

            const res = await mutate(c.name, c.args, cookie);
            EXECUTED.matrix += 1;
            const audited = await newAuditRows();
            // D-172: a Build write behind an R2 Confirm writes one `ok` row when it is allowed (and none
            // when core refuses it).
            const auditExpected = isStaffWrite(c.name)
              ? [`${STAFF_AUDIT_ACTION[c.name]}:${allowed ? 'ok' : 'denied'}`]
              : isBuildConfirmWrite(c.name) && allowed
                ? [`${BUILD_AUDIT_ACTION[c.name]}:ok`]
                : [];
            if (JSON.stringify(audited) !== JSON.stringify(auditExpected)) {
              failures.push(`${role} · ${c.label}: audit rows ${JSON.stringify(audited)}, expected ${JSON.stringify(auditExpected)}`);
            }
            if (res.statusCode !== expected) {
              failures.push(
                `${role} · ${c.label} (needs ${perms.join(' + ')}): expected ${expected}, got ` +
                  `${res.statusCode} ${res.body.slice(0, 160)}`,
              );
              continue;
            }
            // A 403 must be core's permission refusal and not some other 403 that happens to have
            // the right number on it — `MutationError('forbidden')` from a team or tier check would
            // pass a status-only assertion and prove nothing about the permissions table.
            if (expected === 403) {
              const body = res.json() as { error?: string };
              if (body.error !== 'You don’t have permission to do that.') {
                failures.push(`${role} · ${c.label}: 403 for the wrong reason — ${JSON.stringify(body)}`);
              }
            }
          }

          expect(failures.join('\n')).toBe('');
        },
        240_000,
      );
    }
  });

  // ----------------------------------------------------------------------------------------------
  // Gate 7: "Every learner mutation called by another learner's session returns 403."
  // ----------------------------------------------------------------------------------------------
  describe('learner mutations and the learner boundary', () => {
    it(
      'refuses the wrong learner, with core’s own reason @g7',
      async () => {
        // Every case here is a refusal, and a refusal writes nothing — `requirePerm`, `teamOf` and
        // `memberOf` all throw before `persistDiff` is reached and the transaction rolls back. So
        // one reset serves the whole list, in any order.
        await resetDatabase(fixture());
        app = await build({ logger: false });

        const cookies = new Map<string, string>();
        const cookieFor = async (id: string): Promise<string> => {
          if (!cookies.has(id)) cookies.set(id, await app.signInAs(id));
          return cookies.get(id)!;
        };

        const failures: string[] = [];
        for (const { as, case: c, why } of LEARNER_DENIED) {
          const res = await mutate(c.name, c.args, await cookieFor(as));
          EXECUTED.learnerDenied += 1;
          const body = res.json() as { error?: string };
          if (res.statusCode !== 403 || body.error !== why) {
            failures.push(`${c.label} as ${as}: expected 403 ${JSON.stringify(why)}, got ${res.statusCode} ${res.body.slice(0, 160)}`);
          }
        }
        expect(failures.join('\n')).toBe('');
        // Ten rows: the tier gate twice, the upgrade gate once, the team-role gate four times and
        // the cross-team gate three times. Pinned so a dropped row is a failure, not a quieter run.
        expect(EXECUTED.learnerDenied).toBe(10);
      },
      180_000,
    );

    it(
      'allows the learner who is entitled, with the same arguments @g7',
      async () => {
        // The positive half of every pair above. Without it a suite of nothing but 403s would also
        // pass with a route that refuses everyone.
        await resetDatabase(fixture());
        app = await build({ logger: false });

        const cookies = new Map<string, string>();
        const failures: string[] = [];
        for (const { as, case: c } of LEARNER_ALLOWED) {
          if (!cookies.has(as)) cookies.set(as, await app.signInAs(as));
          const res = await mutate(c.name, c.args, cookies.get(as)!);
          EXECUTED.learnerAllowed += 1;
          if (res.statusCode !== 200) {
            failures.push(`${c.label} as ${as}: expected 200, got ${res.statusCode} ${res.body.slice(0, 160)}`);
          }
        }
        expect(failures.join('\n')).toBe('');
        expect(EXECUTED.learnerAllowed).toBe(15);
      },
      180_000,
    );

    it(
      'refuses a staff session on every learner mutation @g7',
      async () => {
        // The arm that covers the four mutations with no identity argument
        // (`dismissAnnouncement`, `markDeployed`, `setRuntime`, `recordRun`): there is no "other
        // learner" to pass, so the boundary that can be crossed is the KIND of session, and
        // `learnerOf` is what refuses it. Swept across all eleven rather than only those four,
        // because "a staff cookie cannot act as a learner" is a property of the whole set.
        await resetDatabase(fixture());
        app = await build({ logger: false });
        const cookie = await app.signInAs('st1');

        const failures: string[] = [];
        for (const { case: c } of LEARNER_ALLOWED) {
          const res = await mutate(c.name, c.args, cookie);
          EXECUTED.staffOnLearner += 1;
          const body = res.json() as { error?: string };
          if (res.statusCode !== 403 || body.error !== 'That action is for learners.') {
            failures.push(`${c.label} as st1 (staff): expected 403, got ${res.statusCode} ${res.body.slice(0, 160)}`);
          }
        }
        expect(failures.join('\n')).toBe('');
        expect(EXECUTED.staffOnLearner).toBe(15);
      },
      180_000,
    );

    it(
      'writes the caller’s row, not the row named in the body @g7',
      async () => {
        // The self-only four take no identity argument, so the only way they could touch somebody
        // else's data is if the ROUTE read the subject from the body instead of from the session.
        // `recordRun` is the sharpest of them — `lastRun` is the text an AI Employee produced from
        // one person's own data — so this posts Jamie's own run arguments on SARAH's session and
        // checks the output landed on Sarah and not on Jamie.
        await resetDatabase(fixture());
        app = await build({ logger: false });
        const sarah = await app.signInAs('u_sarah');

        const preview = 'Written on Sarah’s session by the Gate 7 matrix.';
        const res = await mutate('recordRun', { moduleId: 'marketing', title: 'Probe', preview }, sarah);
        expect(res.statusCode).toBe(200);

        // Read it back through the two scoped snapshots rather than off the table, so this asserts
        // what each viewer is actually served.
        const asSarah = await app.inject({ method: 'GET', url: '/api/snapshot', headers: { cookie: sarah } });
        const asJamie = await app.inject({
          method: 'GET',
          url: '/api/snapshot',
          headers: { cookie: await app.signInAs('u_jamie') },
        });
        expect(asSarah.body).toContain(preview);
        expect(asJamie.body).not.toContain(preview);

        // And the same for `dismissAnnouncement`, whose key is `${userId}:${annId}`: a dismissal
        // written on Sarah's session must not hide the banner for Jamie.
        expect((await mutate('dismissAnnouncement', { id: 'a1' }, sarah)).statusCode).toBe(200);
        const sarahAfter = await app.inject({ method: 'GET', url: '/api/snapshot', headers: { cookie: sarah } });
        const jamieAfter = await app.inject({
          method: 'GET',
          url: '/api/snapshot',
          headers: { cookie: await app.signInAs('u_jamie') },
        });
        expect((sarahAfter.json() as Db).dismissed).toEqual({ 'u_sarah:a1': 1 });
        expect((jamieAfter.json() as Db).dismissed).toEqual({});
      },
      180_000,
    );
  });

  // ----------------------------------------------------------------------------------------------
  // Gate 7: "An unauthenticated call to any /api/* route except /api/health, /api/auth/* and
  // /api/events returns 401."
  // ----------------------------------------------------------------------------------------------
  describe('unauthenticated calls', () => {
    it('the router serves exactly the routes this file knows about @g7', async () => {
      app = await build({ logger: false });
      const parsed = parseRouteTree(app.printRoutes({ commonPrefix: false }));
      // Sorted, because the tree's order is registration order and that is not a contract.
      const byPath = (a: { path: string }, b: { path: string }) => a.path.localeCompare(b.path);
      expect([...parsed].sort(byPath)).toEqual(
        [...ROUTES].map(({ path, methods }) => ({ path, methods })).sort(byPath),
      );
      // The parser earning its keep: `/prefs` is a CHILD node of `/api/me` in the tree, so a
      // parser that ignored depth would report `/prefs` and the 401 sweep below would silently
      // skip `PATCH /api/me/prefs`.
      expect(parsed.map((r) => r.path)).toContain('/api/me/prefs');
    });

    it(
      'every session-guarded route answers 401 with no cookie @g7',
      async () => {
        await resetDatabase(fixture());
        app = await build({ logger: false });

        // One probe per session-guarded route, keyed by the route table above so a new protected
        // route cannot be added without a probe: the `expect` below checks the keys match.
        const probes: Record<string, () => Promise<{ statusCode: number; body: string }>> = {
          '/api/me': () => app.inject({ method: 'GET', url: '/api/me' }),
          '/api/me/prefs': () => app.inject({ method: 'PATCH', url: '/api/me/prefs', payload: { theme: 'dark' } }),
          // A VALID body. See the header: an empty one is answered at the parsing stage, before
          // `requireSession` runs, and that 400 is a fixture problem rather than a guard problem.
          '/api/mutate/:name': () =>
            app.inject({ method: 'POST', url: '/api/mutate/toggleStep', payload: { moduleId: 'sales', stepId: 'c4' } }),
          '/api/snapshot': () => app.inject({ method: 'GET', url: '/api/snapshot' }),
          // D-172: a valid body, for the same reason as `/api/mutate/:name`'s.
          '/api/admin/actions/:name': () =>
            app.inject({ method: 'POST', url: '/api/admin/actions/duplicateModule', payload: { id: 'sales' } }),
          // D-247: a real learner, so a 404 can't answer before the guard.
          '/api/learners/:userId/resend-invite': () => app.inject({ method: 'POST', url: '/api/learners/u_lena/resend-invite', payload: {} }),
          '/api/learners/:userId/nudge': () => app.inject({ method: 'POST', url: '/api/learners/u_lena/nudge', payload: {} }),
          // Phase 08's four. Each hands out something a learner must not get for free — a presigned
          // object URL (§ 8.2) or a Zoom link (§ 8.4) — so the 401 matters more here than anywhere
          // else in this table. Real ids from the fixture, because a 404 on a made-up id would
          // answer before the guard and pass this test for the wrong reason.
          '/api/files/resource/:id': () => app.inject({ method: 'GET', url: '/api/files/resource/r1' }),
          '/api/files/module/:moduleId/:fileName': () =>
            app.inject({ method: 'GET', url: '/api/files/module/marketing/listing-audit-prompt-pack.json' }),
          '/api/files/upload-url': () =>
            app.inject({
              method: 'POST',
              url: '/api/files/upload-url',
              headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000' },
              payload: { contentType: 'application/pdf', size: 1024 },
            }),
          '/api/files/course/uploads/:yyyy/:mm/:file': () =>
            app.inject({ method: 'GET', url: '/api/files/course/uploads/2026/11/aaaaaaaa-0000-4000-8000-000000000001.mp4' }),
          '/api/sessions/:id/join': () => app.inject({ method: 'GET', url: '/api/sessions/dec26-s3/join' }),
          // The skill library (D-079): a list of what an account can open, and a presigned download.
          '/api/skills': () => app.inject({ method: 'GET', url: '/api/skills' }),
          '/api/skills/:id/download/:kind': () => app.inject({ method: 'GET', url: '/api/skills/team-pnl-review/download/claude' }),
          '/api/skill-guides/:slug': () => app.inject({ method: 'GET', url: '/api/skill-guides/appointment-follow-up' }),
          '/api/skills/welcome/dismiss': () =>
            app.inject({
              method: 'POST',
              url: '/api/skills/welcome/dismiss',
              headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000' },
              payload: { group: 'utah-life' },
            }),
          '/api/skills/:id/checkout': () =>
            app.inject({
              method: 'POST',
              url: '/api/skills/team-pnl-review/checkout',
              headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000' },
              payload: {},
            }),
          '/api/billing/portal': () => app.inject({ method: 'GET', url: '/api/billing/portal' }),
          '/api/course': () => app.inject({ method: 'GET', url: '/api/course' }),
          // D-132's account page.
          '/api/auth/password': () => app.inject({ method: 'GET', url: '/api/auth/password' }),
          '/api/auth/password/change': () =>
            app.inject({ method: 'POST', url: '/api/auth/password/change', payload: { password: 'a long enough password' } }),
          '/api/admin/crm-sync': () => app.inject({ method: 'GET', url: '/api/admin/crm-sync' }),
          '/api/admin/crm-sync/retry': () =>
            app.inject({
              method: 'POST',
              url: '/api/admin/crm-sync/retry',
              headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000' },
              payload: { kind: 'order', id: 'o-1' },
            }),
          // The Admin Console (D-157).
          '/api/console/me': () => app.inject({ method: 'GET', url: '/api/console/me' }),
          '/api/console/audit': () => app.inject({ method: 'GET', url: '/api/console/audit' }),
          '/api/console/audit/export': () =>
            app.inject({
              method: 'POST',
              url: '/api/console/audit/export',
              headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000' },
              payload: {},
            }),
          '/api/console/roles': () => app.inject({ method: 'GET', url: '/api/console/roles' }),
          // Admin Console PR 2 (D-158).
          '/api/console/workspaces': () => app.inject({ method: 'GET', url: '/api/console/workspaces' }),
          '/api/console/workspaces/:teamId': () => app.inject({ method: 'GET', url: '/api/console/workspaces/northline' }),
          '/api/console/workspaces/:teamId/intake': () => app.inject({ method: 'GET', url: '/api/console/workspaces/northline/intake' }),
          '/api/console/workspaces/:teamId/intake/sync': () => app.inject({ method: 'POST', url: '/api/console/workspaces/northline/intake/sync', headers: { 'content-type': 'application/json' }, payload: {} }),
          '/api/intake': () => app.inject({ method: 'GET', url: '/api/intake' }),
          '/api/console/workspaces/:teamId/intake/pdf': () => app.inject({ method: 'GET', url: '/api/console/workspaces/northline/intake/pdf' }),
          '/api/intake/pdf': () => app.inject({ method: 'GET', url: '/api/intake/pdf' }),
          '/api/console/workspaces/:teamId/stack': () => app.inject({ method: 'GET', url: '/api/console/workspaces/northline/stack' }),
          '/api/stack': () => app.inject({ method: 'GET', url: '/api/stack' }),
          '/api/personalize': () => app.inject({ method: 'GET', url: '/api/personalize' }),
          // D-231: the Community's five, each write with a valid body, so the guard is what answers.
          '/api/community': () => app.inject({ method: 'GET', url: '/api/community' }),
          '/api/community/:id': () => app.inject({ method: 'GET', url: '/api/community/1' }),
          '/api/community/:id/replies': () =>
            app.inject({ method: 'POST', url: '/api/community/1/replies', headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000' }, payload: { body: 'Same here.' } }),
          '/api/community/posts/:postId': () =>
            app.inject({ method: 'PATCH', url: '/api/community/posts/1', headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000' }, payload: { body: 'Same here.' } }),
          '/api/community/posts/:postId/delete': () =>
            app.inject({ method: 'POST', url: '/api/community/posts/1/delete', headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000' }, payload: {} }),
          // D-230: Turn in's five, each write with a valid body. The upload URL hands out a presigned PUT.
          '/api/submissions': () => app.inject({ method: 'GET', url: '/api/submissions?moduleId=accelerator-week-1' }),
          '/api/submissions/upload-url': () =>
            app.inject({ method: 'POST', url: '/api/submissions/upload-url', headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000' }, payload: { name: 'report.pdf', size: 1024 } }),
          '/api/submissions/:id/files/:n': () => app.inject({ method: 'GET', url: '/api/submissions/1/files/0' }),
          '/api/admin/submissions': () => app.inject({ method: 'GET', url: '/api/admin/submissions?moduleId=accelerator-week-1' }),
          '/api/admin/submissions/:id/status': () =>
            app.inject({ method: 'POST', url: '/api/admin/submissions/1/status', headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000' }, payload: { status: 'picked' } }),
          // D-237: a cohort's turned-in files, counted and deleted.
          '/api/admin/cohorts/:cohortId/turned-in-files': () => app.inject({ method: 'GET', url: '/api/admin/cohorts/dec26/turned-in-files' }),
          '/api/admin/cohorts/:cohortId/turned-in-files/delete': () =>
            app.inject({ method: 'POST', url: '/api/admin/cohorts/dec26/turned-in-files/delete', headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000' }, payload: {} }),
          // D-236: the seat card form's three.
          '/api/seat-card': () => app.inject({ method: 'GET', url: '/api/seat-card?moduleId=accelerator-week-1' }),
          '/api/seat-card/pdf': () => app.inject({ method: 'GET', url: '/api/seat-card/pdf?moduleId=accelerator-week-1' }),
          '/api/admin/seat-cards': () => app.inject({ method: 'GET', url: '/api/admin/seat-cards?moduleId=accelerator-week-1' }),
          '/api/console/users': () => app.inject({ method: 'GET', url: '/api/console/users' }),
          '/api/console/users/:userId': () => app.inject({ method: 'GET', url: '/api/console/users/u_jamie' }),
          '/api/console/users/:userId/password-reset': () =>
            app.inject({
              method: 'POST',
              url: '/api/console/users/u_jamie/password-reset',
              headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000' },
              payload: {},
            }),
          '/api/console/users/export': () =>
            app.inject({
              method: 'POST',
              url: '/api/console/users/export',
              headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000' },
              payload: {},
            }),
          '/api/console/notes': () => app.inject({ method: 'GET', url: '/api/console/notes?targetType=workspace&targetId=northline' }),
          '/api/console/notes/:id/delete': () =>
            app.inject({
              method: 'POST',
              url: '/api/console/notes/1/delete',
              headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000' },
              payload: { reason: 'A reason long enough' },
            }),
          '/api/console/search': () => app.inject({ method: 'GET', url: '/api/console/search?q=jamie' }),
          '/api/console/roles/preview': () =>
            app.inject({
              method: 'POST',
              url: '/api/console/roles/preview',
              headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000' },
              payload: { role: 'Admin', capability: 'masq', allowed: false },
            }),
          // Admin Console PR 3a (D-162).
          '/api/console/masquerade': () =>
            app.inject({
              method: 'POST',
              url: '/api/console/masquerade',
              headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000' },
              payload: { targetUserId: 'u_jamie', reason: 'Checking the Week 2 steps for a ticket.' },
            }),
          '/api/console/masquerade/current': () => app.inject({ method: 'GET', url: '/api/console/masquerade/current' }),
          '/api/console/masquerade/extend': () =>
            app.inject({
              method: 'POST',
              url: '/api/console/masquerade/extend',
              headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000' },
              payload: { reason: 'Still checking the Week 2 steps.' },
            }),
          '/api/console/masquerade/exit': () =>
            app.inject({ method: 'POST', url: '/api/console/masquerade/exit', headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000' }, payload: {} }),
          '/api/console/masquerade/sessions': () => app.inject({ method: 'GET', url: '/api/console/masquerade/sessions' }),
          // Admin Console PR 4 (D-163).
          ...Object.fromEntries(
            ['summary', 'customers', 'subscriptions', 'invoices', 'failed', 'refunds', 'scopes'].map((x) => [
              `/api/console/billing/${x}`,
              () => app.inject({ method: 'GET', url: `/api/console/billing/${x}` }),
            ]),
          ),
          // Admin Console PR 5 (D-164).
          ...Object.fromEntries(
            ['refund/preview', 'refund', 'void/preview', 'void'].map((x) => [
              `/api/console/billing/${x}`,
              () =>
                app.inject({
                  method: 'POST',
                  url: `/api/console/billing/${x}`,
                  headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000' },
                  payload: { invoiceId: 'in_Team', confirmToken: 'x', reason: 'A reason of ten or more.', typed: 'in_Team' },
                }),
            ]),
          ),
          // Admin Console PR 6 (D-165).
          '/api/console/api/endpoints': () => app.inject({ method: 'GET', url: '/api/console/api/endpoints' }),
          '/api/console/webhooks': () => app.inject({ method: 'GET', url: '/api/console/webhooks' }),
          '/api/console/webhooks/ghl/retry': () =>
            app.inject({
              method: 'POST',
              url: '/api/console/webhooks/ghl/retry',
              headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000' },
              payload: { kind: 'order', id: 'ord_1' },
            }),
          '/api/console/jobs': () => app.inject({ method: 'GET', url: '/api/console/jobs' }),
          '/api/console/jobs/:job/run': () =>
            app.inject({ method: 'POST', url: '/api/console/jobs/session-24h/run', headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000' }, payload: {} }),
          // Admin Console PR 7 (D-166).
          '/api/console/email': () => app.inject({ method: 'GET', url: '/api/console/email' }),
          '/api/console/email/:id': () => app.inject({ method: 'GET', url: '/api/console/email/1' }),
          '/api/console/email/export': () =>
            app.inject({ method: 'POST', url: '/api/console/email/export', headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000' }, payload: {} }),
          '/api/console/usage': () => app.inject({ method: 'GET', url: '/api/console/usage' }),
          // Admin Console PR 8 (D-167).
          '/api/console/incidents': () => app.inject({ method: 'GET', url: '/api/console/incidents' }),
          '/api/console/incidents/summary': () => app.inject({ method: 'GET', url: '/api/console/incidents/summary' }),
          '/api/console/incidents/:id': () => app.inject({ method: 'GET', url: '/api/console/incidents/INC-0001' }),
          '/api/console/incidents/:id/ack': () =>
            app.inject({ method: 'POST', url: '/api/console/incidents/INC-0001/ack', headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000' }, payload: {} }),
          '/api/console/incidents/:id/resolve': () =>
            app.inject({
              method: 'POST',
              url: '/api/console/incidents/INC-0001/resolve',
              headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000' },
              payload: { note: 'Token rotated.' },
            }),
          '/api/console/incidents/:id/notes': () =>
            app.inject({ method: 'POST', url: '/api/console/incidents/INC-0001/notes', headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000' }, payload: { body: 'Checked.' } }),
          // Admin Console PR 9 (D-168).
          '/api/console/env': () => app.inject({ method: 'GET', url: '/api/console/env' }),
          '/api/console/flags/:key': () =>
            app.inject({
              method: 'POST',
              url: '/api/console/flags/masquerade_enabled',
              headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000' },
              payload: { on: false, typed: 'masquerade_enabled' },
            }),
          '/api/console/welcome/test': () =>
            app.inject({
              method: 'POST',
              url: '/api/console/welcome/test',
              headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000' },
              payload: { to: 'accelerator-test@amplifiedimpact.io', cohortId: 'dec26' },
            }),
          '/api/console/integrations': () => app.inject({ method: 'GET', url: '/api/console/integrations' }),
          '/api/console/integrations/:id/check': () =>
            app.inject({ method: 'POST', url: '/api/console/integrations/resend/check', headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000' }, payload: {} }),
          '/api/console/deploys': () => app.inject({ method: 'GET', url: '/api/console/deploys' }),
          '/api/console/db': () => app.inject({ method: 'GET', url: '/api/console/db' }),
          // Admin Console PR 10 (D-169).
          '/api/console/health': () => app.inject({ method: 'GET', url: '/api/console/health' }),
          '/api/console/skills': () => app.inject({ method: 'GET', url: '/api/console/skills' }),
          '/api/console/staff/preview': () =>
            app.inject({
              method: 'POST',
              url: '/api/console/staff/preview',
              headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000' },
              payload: { kind: 'role', id: 'st2', role: 'Support' },
            }),
          '/api/console/staff': () =>
            app.inject({
              method: 'POST',
              url: '/api/console/staff',
              headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000' },
              payload: { confirmToken: 'x' },
            }),
        };
        expect(Object.keys(probes).sort()).toEqual(
          ROUTES.filter((r) => r.guard === 'session')
            .map((r) => r.path)
            .sort(),
        );

        for (const [path, probe] of Object.entries(probes)) {
          const res = await probe();
          EXECUTED.unauthenticated += 1;
          expect(res.statusCode, `${path} with no cookie`).toBe(401);
          // The body § 7.3 and `http.test.ts` agree on, and the one that says nothing about which
          // session ids exist.
          expect(JSON.parse(res.body), path).toEqual({ error: 'Not signed in' });
        }

        // The guard runs BEFORE the name lookup, so an unknown mutation is still 401 and not 404.
        // Reversed, an attacker without a session could enumerate which mutations exist.
        const unknown = await app.inject({ method: 'POST', url: '/api/mutate/notAMutation', payload: {} });
        EXECUTED.unauthenticated += 1;
        expect(unknown.statusCode).toBe(401);

        // And a signed-but-dead cookie is the same 401 as no cookie: no "unknown session" tell.
        const forged = await app.inject({
          method: 'GET',
          url: '/api/snapshot',
          headers: { cookie: 'ai_sid=s_not-a-real-session.not-a-real-signature' },
        });
        EXECUTED.unauthenticated += 1;
        expect(forged.statusCode).toBe(401);

        // The measured parsing-stage case, asserted loosely on purpose: 400 today (reported
        // against `auth/guard.ts`), 401 once the body parser stops answering first. Either is
        // acceptable; 200 never is.
        const empty = await app.inject({
          method: 'POST',
          url: '/api/mutate/toggleStep',
          headers: { 'content-type': 'application/json' },
        });
        EXECUTED.unauthenticated += 1;
        expect([400, 401]).toContain(empty.statusCode);
        expect(empty.body).not.toContain('toast');
      },
      180_000,
    );

    it(
      'the three exempt routes do not answer 401 @g7',
      async () => {
        // The exemption has to be a measured property, not a sentence: a sweep that only asserted
        // 401s would also pass if `/api/health` had quietly grown a session guard and Railway's
        // healthcheck had started failing every deploy.
        await resetDatabase(fixture());
        app = await build({ logger: false });

        const probes: [string, Promise<{ statusCode: number }>][] = [
          ['/api/health', app.inject({ method: 'GET', url: '/api/health' })],
          // § 7.5: always 200, account or no account, so it cannot be used to discover who has one.
          ['/api/auth/request', app.inject({ method: 'POST', url: '/api/auth/request', payload: { email: 'nobody@example.test' } })],
          // A token nobody minted: 400 `expired`, which is § 7.5's single answer for unknown,
          // forged, expired and malformed alike.
          ['/api/auth/verify', app.inject({ method: 'POST', url: '/api/auth/verify', payload: { token: 'not-a-token' } })],
          ['/api/auth/sign-out', app.inject({ method: 'POST', url: '/api/auth/sign-out' })],
          // D-132: a wrong password is a 400 with words, never the session guard's 401.
          ['/api/auth/login', app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'nobody@example.test', password: 'not the password' } })],
          ['/api/auth/password/forgot', app.inject({ method: 'POST', url: '/api/auth/password/forgot', payload: { email: 'nobody@example.test' } })],
          ['/api/auth/password/token', app.inject({ method: 'POST', url: '/api/auth/password/token', payload: { token: 'not-a-token' } })],
          ['/api/auth/password/set', app.inject({ method: 'POST', url: '/api/auth/password/set', payload: { token: 'not-a-token', password: 'a long enough password' } })],
          ['/api/auth/password/checkout', app.inject({ method: 'POST', url: '/api/auth/password/checkout', payload: { checkout: 'cs_test_nonexistent0', password: 'a long enough password' } })],
          // § 7.7's harness, exempt for the reason in the header.
          ['/api/test/session', app.inject({ method: 'POST', url: '/api/test/session', payload: {} })],
          ['/api/test/outbox', app.inject({ method: 'GET', url: '/api/test/outbox' })],
          // D-028's waitlist, exempt for the reason in the header (point 3). A filled honeypot, so
          // the probe is answered exactly as a sign-up would be and writes no row.
          [
            '/api/ai101/waitlist',
            app.inject({
              method: 'POST',
              url: '/api/ai101/waitlist',
              payload: { firstName: 'Probe', email: 'probe@example.test', website: 'x' },
            }),
          ],
          // The guides' opt-ins (D-038, D-039), the same way: a filled honeypot writes no row.
          // /retool's asks a team size too (D-046), but the honeypot is checked first, so the same
          // probe is answered as a success there as well.
          ...GUIDE_SLUGS.map((slug) => `/api/${slug}`).map((url): [string, Promise<{ statusCode: number }>] => [
            url,
            app.inject({
              method: 'POST',
              url,
              payload: { firstName: 'Probe', email: 'probe@example.test', website: 'x' },
            }),
          ]),
          // The offer (D-073 to D-077): its facts, a status lookup with no such session, a checkout
          // and a cohort-waitlist sign-up with a filled honeypot (no order, no row), and the webhook
          // with no signature (400 before anything is read).
          ['/api/offer', app.inject({ method: 'GET', url: '/api/offer' })],
          ['/api/offer/order-status', app.inject({ method: 'GET', url: '/api/offer/order-status?session_id=cs_test_nonexistent0' })],
          ['/api/checkout', app.inject({ method: 'POST', url: '/api/checkout', payload: { cart: 'library', website: 'x' } })],
          ['/api/offer/waitlist', app.inject({ method: 'POST', url: '/api/offer/waitlist', payload: { firstName: 'Probe', email: 'probe@example.test', website: 'x' } })],
          ['/api/stripe/webhook', app.inject({ method: 'POST', url: '/api/stripe/webhook', payload: '{}', headers: { 'content-type': 'application/json' } })],
        ];

        for (const [path, pending] of probes) {
          const res = await pending;
          EXECUTED.exempt += 1;
          expect(res.statusCode, `${path} must not be behind the session guard`).not.toBe(401);
        }

        // The `page` routes are exempt by being outside `/api/` — the checklist's sentence is about
        // `/api/*` and nothing else — so that is the property asserted. A page route that moved
        // under `/api/` would have to be reclassified, and argued for, like the waitlist was.
        const pages = ROUTES.filter((r) => r.guard === 'page');
        // The guides' pages come from `GUIDE_SLUGS` and `GUIDE_ALIASES` (D-052); the rest are named.
        const guidePages = GUIDE_SLUGS.flatMap((slug) => [`/${slug}`, `/${slug}/`, ...(GUIDE_ALIASES[slug] ?? [])]);
        expect(pages.map((r) => r.path).sort()).toEqual(
          [
            '/AI101',
            '/agreement',
            '/forum',
            '/offer',
            '/offer/welcome',
            '/calendar/builds.ics',
            '/calendar/office-hours.ics',
            '/calendar/schedule.ics',
            '/pricing',
            '/team-build',
            '/teams',
            '/agents',
            '/free',
            '/about',
            '/insiders',
            '/ai-101',
            '/ai101',
            '/ai101/',
            '/ai101/carousel-sprint.ics',
            '/guides',
            '/guides/',
            '/library',
            '/library/',
            '/privacy',
            '/skills',
            '/skills/',
            '/terms',
            '/waitlist',
            '/waitlist/',
            ...guidePages,
          ].sort(),
        );
        expect(pages.filter((r) => r.path.startsWith('/api/'))).toEqual([]);

        // `/api/events` is exempt too and is NOT injected: an SSE response never ends, and
        // `inject` buffers until it does, so this would hang for the whole hook timeout.
        // `test/routes.test.ts` covers that route over a real socket.
        expect(ROUTES.find((r) => r.path === '/api/events')?.guard).toBe('open-stream');
      },
      180_000,
    );
  });

  // ----------------------------------------------------------------------------------------------
  it('executed every case the checklist asks for @g7', async () => {
    app = await build({ logger: false });
    // 27 cases × 5 roles. 27 rather than 26 because `saveModule` appears twice: once as a draft
    // save (curriculum) and once as a publish (curriculum AND publish), which is the only
    // conjunction in the table.
    expect(EXECUTED.matrix).toBe(STAFF_CASES.length * STAFF_ROLES.length);
    expect(EXECUTED.matrix).toBe(135);
    expect(EXECUTED.learnerDenied).toBe(10);
    expect(EXECUTED.learnerAllowed).toBe(15);
    expect(EXECUTED.staffOnLearner).toBe(15);
    // 11, not 7: phase 08 added four session-guarded routes (the two file downloads, upload-url and
    // the join window) and each one is probed cold. The route-inventory test is what forced them to
    // be classified here rather than shipping unguarded.
    // 13 with the skill library's two (D-079), 14 with Manage Billing (D-077), 15 with the AI
    // Accelerator's course (D-110), 17 with the account page's two password routes (D-132), 19
    // with the CRM sync log and its retry (D-134), 20 with the welcome panel's dismiss (D-150), and 21
    // with the guided setups (D-151). 25 with the Admin Console's four (D-157), 26 with the Roles
    // & Permissions preview (D-160 R2-3b; its change is a POST to `/api/console/roles`, one path), 35
    // with Console PR 2's nine (D-158), 40 with masquerade's five (D-162), 47 with Billing's seven
    // (D-163), 51 with Billing's refund and void, previews included (D-164), 56 with API & Webhooks
    // and Scheduled Jobs' five (D-165), 60 with the email log's and usage's four (D-166), 66 with
    // the incidents' six (D-167), 72 with the flag, env, integrations, deploys and DB health's six
    // (D-168), 74 with System Health and the Skills list (D-169), 75 with the audited Build actions
    // (D-172), 77 with Invite staff and Change role…'s two (D-172), and 78 with a course week's
    // uploaded video (D-188), and 80 with the intake's two routes (D-196). 85 with the intake PDF's two (D-229).
    // 86 with D-229's re-queue of a team's intake for GHL. 91 with the Community's five (D-231), 96 with Turn in's
    // five (D-230), 99 with the seat card form's three (D-236), 101 with D-237's turned-in files, counted and deleted.
    // 102 with a single skill's checkout. 104 with D-247's Resend Invite and Send Nudge. 105 with the cohort welcome's
    // test send.
    expect(EXECUTED.unauthenticated).toBe(105);
    // 6, then 7 with D-028's public waitlist, then one per guide's opt-in (D-038 on: five before the
    // skill pages, D-052), each probed like the others. From `GUIDE_SLUGS`, so a new guide is counted.
    // Plus the offer's five open routes (D-073 to D-077), and D-132's five password routes.
    expect(EXECUTED.exempt).toBe(7 + GUIDE_SLUGS.length + 5 + 5);
    const total = Object.values(EXECUTED).reduce((a, b) => a + b, 0);
    // The + 1: the AI Accelerator's course route (D-110), probed unauthenticated. The + 7: D-132's
    // password routes, two probed unauthenticated and five as exempt. The + 2: the CRM sync log and its
    // retry (D-134), probed unauthenticated. The + 1 after that: the welcome panel's dismiss (D-150),
    // probed unauthenticated. And + 1 for the guided setups (D-151), probed unauthenticated. And + 4
    // for the Admin Console's routes (D-157), probed unauthenticated. And + 1 for the Roles &
    // Permissions preview (D-160 R2-3b), probed unauthenticated. And + 9 for Console PR 2's (D-158),
    // probed unauthenticated. And + 5 for masquerade's (D-162), + 7 for Billing's (D-163), + 4 for
    // its refund and void (D-164), + 5 for API & Webhooks and Scheduled Jobs (D-165), + 4 for the
    // email log's and usage's (D-166), + 6 for the incidents' (D-167) and + 6 for the flag, env,
    // integrations, deploys and DB health's (D-168), + 2 for System Health and the Skills list (D-169),
    // probed unauthenticated. And + 1 for the audited Build actions (D-172), probed unauthenticated,
    // and + 2 for Invite staff and Change role… (D-172). And + 1 for a course week's uploaded video
    // (D-188), probed unauthenticated. And + 4 for D-190's toggleChecklistItem and setPref: each is
    // counted once as the entitled learner and once as a staff session. And + 2 for D-191's
    // saveVideoProgress, counted the same way. And + 2 for the intake routes (D-196), probed unauthenticated.
    // The last + 2 is the stack card (D-197). And + 1 for personalization (D-199). And + 2 for D-228's unmarkDeployed,
    // counted once as the entitled learner and once as a staff session. And + 2 for the intake PDF's routes (D-229), probed
    // unauthenticated. And + 1 for D-229's intake re-queue, probed unauthenticated. And + 5 for the Community's routes
    // (D-231), probed unauthenticated. And + 5 for Turn in's (D-230), probed unauthenticated. And + 3 for the seat card
    // form's (D-236), probed unauthenticated. And + 2 for D-237's turned-in files, probed unauthenticated.
    // And + 1 for a single skill's checkout, probed unauthenticated. And + 2 for D-247's Resend Invite and Send Nudge,
    // probed unauthenticated. And + 1 for the cohort welcome's test send, probed unauthenticated.
    expect(total).toBe(185 + GUIDE_SLUGS.length + 3 + 5 + 1 + 7 + 2 + 1 + 1 + 4 + 1 + 9 + 5 + 7 + 4 + 5 + 4 + 6 + 6 + 2 + 1 + 2 + 1 + 4 + 2 + 2 + 2 + 1 + 2 + 2 + 1 + 5 + 5 + 3 + 2 + 1 + 2 + 1);
  });
});
