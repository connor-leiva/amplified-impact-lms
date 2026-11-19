// Gate 7's API ⇔ core oracle — docs/phases/07-backend.md, Gate 7 › "API oracle tests".
//
// One claim, proved 38 times:
//
//   the database after `POST /api/mutate/<name>` is EXACTLY the snapshot `@ai/core` computes for
//   the same seed, the same actor, the same arguments and the same instant.
//
// That is the sentence § 7.3 is built around — "**Every mutation endpoint follows this pattern**,
// so the API cannot drift from core" — and this file is the only place it is actually executed.
// `schemas.test.ts` proves each mutation's body is accepted; `codec.test.ts` proves a snapshot
// survives rows → `Db`; `io.test.ts` proves the driver and the row order. None of them runs a
// mutation THROUGH the route and then reads the database back, so none of them can see:
//
//   - a field a mutation writes that `persistDiff` does not persist (or persists wrongly),
//   - a row a mutation deletes that `persistDiff` leaves standing,
//   - an id the route mints differently from the generator core was handed,
//   - a `toast` or an `effects` array the route reshapes on the way out,
//   - the route calling the mutation with the wrong actor, the wrong `now`, or a parsed body that
//     is not what was sent.
//
// Every one of those is a bug that every unit test in the repository passes through.
//
// ================================================================================================
// WHAT A ROW HAS TO BE WORTH
// ================================================================================================
// A case whose mutation returns the db untouched proves nothing: `toEqual` would pass against an
// endpoint that wrote nothing at all. So every row is chosen so the mutation DOES something to the
// seed at `NOW`, and `changesSomething` below asserts exactly that per case — a payload later
// weakened into a no-op fails its own test instead of quietly going hollow. The ones that took
// choosing:
//
//   - `toggleStep` returns early unless the AI Employee is OPEN at `NOW` (`operations` is
//     `scheduled` until 2026-12-14, so it is not), and refuses a checked step on a DEPLOYED
//     employee, whose checklist is locked.
//   - `markDeployed` throws unless all six steps are verified, and `setRuntime` throws unless the
//     employee is already deployed — so both ride on `u_devon`'s `sales`, the one seeded build that
//     is verified, deployed AND `needs_attention`. `setRuntime: 'deployed'` is the Reconnect path,
//     which DELETES `progress.issue`; that makes it the one case in the file that proves a dropped
//     optional field round-trips as an absent key rather than as `null`.
//   - `requestUpgrade` is idempotent per learner while a request is open, so it has to be a learner
//     with none: `u_kenji` and `u_rosa` already have one, `u_jamie` does not.
//   - `setMemberRole`, `removeMember` and `remindMembers` need a target ON the actor's team, which
//     `u_jamie` (no team) is not — hence `u_alex` plus a Northline member.
//   - `setStaffRole` and `removeStaff` refuse the Owner, and the seed's first staff row IS the
//     Owner (`st1`), so they address `st2` and `st4`.
//   - `uploadResource` returns `{ error: 'Attach a file first.' }` without a `file`, which would be
//     a 422 rather than an oracle row.
//
// ================================================================================================
// `pre`: TWO ROWS NEED A PRECONDITION THE SEED DOES NOT CONTAIN
// ================================================================================================
// The checklist's shape is one POST per row, compared against one `M[name](seed, …)` call. Two
// cases cannot be written that way and still be worth anything:
//
//   - `deleteModule` refuses anything that is not a DRAFT, and the live seed has no draft module
//     (five published, one scheduled). So its row unpublishes one first.
//   - `toggleStep`'s interesting branch is the sixth step — the one that sets `builtAt`, logs
//     `built …` and emits the catalog's ONLY `confetti` effect, which is the only way to prove
//     § 7.3's `effects` filter passes confetti through rather than dropping everything. No seeded
//     learner is one step short, so `u_michael` (four of six on `marketing`) checks the fifth first.
//
// `pre` steps run through the SAME route on the API side and through the same `M[...]` chain on the
// core side, each with its own fresh `deterministicIds()` — one per HTTP request, which is what
// `lib/clock.ts` gives the route. So the oracle property is unchanged: it is still "the API and
// core agree", over a sequence of two instead of one. Flagged for DECISIONS.md as the one place
// this file reads the checklist's snippet as a pattern rather than a literal.
//
// ================================================================================================
// WHY `normalize` AND `asStored` ARE NOT HYGIENE
// ================================================================================================
// `normalize` sorts every array by id (the checklist: "sorts arrays by id and nothing else").
// Without it several tables fail: `codec.ts`'s `ORDER` sorts `users`, `teams` and `resources` by
// id and `announcements`/`requests` by `at` descending, and none of those is the order `seed.ts`
// lists them in. Sorting cannot invent, hide or repair a row, so nothing is weakened; what it
// WOULD hide is a wrong `ORDER`, and `io.test.ts` asserts those sorts on un-normalized output.
//
// `asStored` is the other half, and it is D-018 plus the codec's header rather than a fudge:
// `base` is `ZERO_BASE` because § 7.4 says so, `cohorts[].enrolled` is recounted from the user rows
// because § 7.2 stores no column for it, and `phase` is the sales demo's time machine, which the
// codec deliberately drops. `codec.test.ts` and `io.test.ts` both state this helper; it is repeated
// here rather than exported from a test file so each suite's assumptions are readable where they
// are used.
//
// ================================================================================================
// A FRESH APP PER TEST
// ================================================================================================
// `@fastify/rate-limit`'s store belongs to the plugin instance, so one shared app would carry
// § 9.4's 100/minute budget across the whole file — 38 cases plus their `pre` steps is more than
// 100 requests and the later tests would read 429 instead of 200. `build()` opens no database
// connection (`db/client.ts`'s header), so a per-test build costs only the registration.
//
// `app.close()`, never `shutdown(app)`: `shutdown` ends the connection POOL, which is the one
// `test/helpers.ts` pointed at this slot's database, and every `resetDatabase` after it fails with
// CONNECTION_ENDED.

import { describe, it, expect, afterAll, beforeAll, beforeEach } from 'vitest';
import { ZERO_BASE, seedForDatabase } from '@ai/core';
import type { Actor, Ctx, Db, Effect, MutationName, Outcome } from '@ai/core';
import * as M from '@ai/core/mutations';
import { build } from '../src/app';
import type { App } from '../src/app';
import { deterministicIds } from '../src/lib/clock';
import { loadDb, resetDatabase, testDatabase } from './helpers';

/** The Gate 7 checklist's instant, which is also `PHASES.live.now`: 2026-12-07 10:42 Central. */
const NOW = Date.parse('2026-12-07T10:42:00-06:00');

/** The snapshot every case starts from, and the one the expectation is computed from. */
const live = (): Db => seedForDatabase('live');

/**
 * § 7.3's call, as one signature.
 *
 * `typeof M` is 37 distinct function types with 37 different `args`, and no single call expression
 * satisfies all of them — which is what the checklist's own `args as never` and `routes/mutate.ts`'s
 * `MutationFn` are both working around. The cast is safe for the same reason it is there: the route
 * has already validated the body with the schema `tsc` proved produces this mutation's argument
 * type, and this file sends that same body.
 */
type MutationFn = (db: Db, actor: Actor, args: never, ctx: Ctx) => Outcome;
const MUTATIONS = M as unknown as Record<string, MutationFn | undefined>;

// ---------------------------------------------------------------------------
// The case table
// ---------------------------------------------------------------------------

/** One POST. `as` is a `users` row id — a learner's or a staff member's; `actorFor` decides which. */
interface Step {
  readonly name: MutationName;
  readonly as: string;
  readonly args: Record<string, unknown>;
}

interface Case extends Step {
  /** Mutations applied, through the same route, before the one under test. See the header. */
  readonly pre?: readonly Step[];
}

/**
 * The `operations` AI Employee as the seed holds it, which is what the Module Builder's
 * "Save & Publish" sends: the whole draft, not a patch. Read off the seed rather than hand-written,
 * for the reason `schemas.test.ts` gives — a payload invented here would be validating a shape no
 * screen sends. It is the one scheduled employee, so saving it as `published` clears `opens` and
 * logs, which is a change rather than a re-save of what is already there.
 */
const OPERATIONS_DRAFT = live().modules.find((m) => m.id === 'operations')!;

/**
 * One row per mutation in the phase 02 catalog, plus the one extra `toggleStep` the header explains.
 * Payloads are the ones `src/routes/schemas.test.ts` already built from the seed, with the actor and
 * the target changed wherever that payload would have been refused or vacuous.
 */
const CASES: readonly Case[] = [
  // --- 1-7 · learner portal ---------------------------------------------------------------------
  { name: 'dismissAnnouncement', as: 'u_jamie', args: { id: 'a1' } },
  // The checklist's own row, verbatim: Jamie is three of six steps into `sales`, which is published
  // and open at NOW, so the fourth lands and `builtAt` stays null.
  { name: 'toggleStep', as: 'u_jamie', args: { moduleId: 'sales', stepId: 'c4' } },
  // D-190: Jamie checks one item on the open sales build, and remembers one accordion.
  { name: 'toggleChecklistItem', as: 'u_jamie', args: { moduleId: 'sales', stepId: 'c4', itemId: 'item-1' } },
  { name: 'setPref', as: 'u_jamie', args: { key: 'acc:sales:c4:0', value: '1' } },
  // D-191: Jamie's place in a video. sales is open, so the row is written. Nothing is checked: the step has no auto item.
  { name: 'saveVideoProgress', as: 'u_jamie', args: { moduleId: 'sales', videoId: 'intro', maxPct: 0.25, lastPositionS: 12 } },
  // The sixth step. `builtAt`, the `built …` activity row, the toast and the only confetti in the
  // catalog. Michael is four of six on `marketing`, so `pre` checks the fifth.
  {
    name: 'toggleStep',
    as: 'u_michael',
    args: { moduleId: 'marketing', stepId: 'c6' },
    pre: [{ name: 'toggleStep', as: 'u_michael', args: { moduleId: 'marketing', stepId: 'c5' } }],
  },
  // Devon's `sales` is the only seeded build that is verified, deployed and needs_attention, so it
  // is the only target for which both of the next two rows do something.
  { name: 'markDeployed', as: 'u_devon', args: { moduleId: 'sales' } },
  { name: 'setRuntime', as: 'u_devon', args: { moduleId: 'sales', runtime: 'deployed' } },
  {
    name: 'recordRun',
    as: 'u_jamie',
    args: { moduleId: 'marketing', title: 'Nightly follow-ups', preview: '14 replies drafted' },
  },
  { name: 'requestUpgrade', as: 'u_jamie', args: { source: 'Team tier page' } },
  // r1 is Agent tier, which an Agent-tier learner may download; a Team-tier resource would throw.
  { name: 'downloadResource', as: 'u_jamie', args: { id: 'r1' } },

  // --- 8-11 · Team Hub -------------------------------------------------------------------------
  // Northline has six of seven seats filled and four of its five Sales Agents, so the invite fits.
  // This is also the catalog's only email effect: the route mints a 7-day invite token INSIDE the
  // transaction and must still answer `{ toast, effects: [] }` with no recipient and no token.
  { name: 'inviteMember', as: 'u_alex', args: { email: 'new@northlinerealty.com', role: 'Sales Agent' } },
  // Two ids, so the plural toast and the `… to 2 team members` activity line are the ones compared.
  { name: 'remindMembers', as: 'u_alex', args: { userIds: ['u_lena', 'u_michael'] } },
  // Sarah is a Sales Agent on Alex's team; the owner's own role is fixed and would throw.
  { name: 'setMemberRole', as: 'u_alex', args: { userId: 'u_sarah', role: 'Operations Lead' } },
  // Lena has no progress rows, so this row isolates the user delete. Whether `persistDiff` also
  // deletes a removed member's progress is invisible to a snapshot comparison — an orphan row drops
  // out of `fromRows` either way — so that belongs to `io.test.ts`, not here.
  { name: 'removeMember', as: 'u_alex', args: { userId: 'u_lena' } },

  // --- 12 · Admin Overview ----------------------------------------------------------------------
  // `nudged` is absent for every seeded learner, so this writes a column that was null.
  { name: 'nudgeLearners', as: 'st1', args: { userIds: ['u_omar'] } },

  // --- 25 · Admin Learners (grouped with the other seat change) ----------------------------------
  // Jamie has no team, so `upgradeUser` also CREATES `t_u_jamie` and makes him its owner: two
  // tables from one mutation, which is the strongest persistDiff case in the file.
  { name: 'setLearnerTier', as: 'st1', args: { userId: 'u_jamie', tier: 'team' } },

  // --- 13-18 · Admin Curriculum and Module Builder ----------------------------------------------
  // Swaps `sales` with `marketing` and renumbers every module, so six rows change from one POST.
  { name: 'moveModule', as: 'st1', args: { id: 'sales', dir: -1 } },
  { name: 'setModuleTier', as: 'st1', args: { id: 'marketing', tier: 'team' } },
  // The checklist's own row: `operations` is scheduled, so publishing it also clears `opens`.
  { name: 'publishModule', as: 'st1', args: { id: 'operations' } },
  { name: 'unpublishModule', as: 'st1', args: { id: 'marketing' } },
  { name: 'saveModule', as: 'st1', args: { draft: OPERATIONS_DRAFT, status: 'published' } },
  // Only drafts can be deleted and the seed has none. See the header on `pre`.
  {
    name: 'deleteModule',
    as: 'st1',
    args: { id: 'finance' },
    pre: [{ name: 'unpublishModule', as: 'st1', args: { id: 'finance' } }],
  },

  // --- 19-24 · Admin Cohorts and Sessions -------------------------------------------------------
  // Writes a cohort AND six sessions, with a minted id in all seven primary keys.
  { name: 'createCohort', as: 'st1', args: {} },
  // apr27 is the one draft cohort; `enrolling` and `live` would both throw.
  { name: 'openEnrollment', as: 'st1', args: { cohortId: 'apr27' } },
  // dec26-s3 is the next session and has no replay, so it is the one session all four of these
  // rows can act on without undoing a seeded value.
  { name: 'goLive', as: 'st1', args: { sessionId: 'dec26-s3' } },
  { name: 'endSession', as: 'st1', args: { sessionId: 'dec26-s3' } },
  { name: 'publishReplay', as: 'st1', args: { sessionId: 'dec26-s3', durationSec: 3600 } },
  {
    name: 'updateSession',
    as: 'st1',
    args: {
      id: 'dec26-s3',
      // The seed's own title, so the compared activity line is the real copy. `date`, `time`,
      // `mins` and `zoom` all differ from the row, and `mins` is a string because that is what a
      // number input holds (`schemas.ts` keeps it one so core does its own coercion).
      title: 'The Living Database',
      date: '2026-12-15',
      time: '13:00',
      mins: '90',
      zoom: 'https://zoom.us/j/8841203353',
    },
  },

  // --- 26-29 · Admin Resource Vault --------------------------------------------------------------
  // `file` is required or the mutation answers `{ error: 'Attach a file first.' }`. The category is
  // deliberately NOT one of EXEC_CATEGORIES, so the requested `tier: 'agent'` is the one stored.
  {
    name: 'uploadResource',
    as: 'st1',
    args: {
      title: 'Listing audit prompt pack',
      cat: 'Lead Generation Scripts',
      type: 'Prompt pack',
      tier: 'agent',
      file: 'listing-audit-prompt-pack.json',
    },
  },
  // r1 is `exec: false`, so the access pill really flips; an Executive Vault item is a no-op toast.
  { name: 'setResourceTier', as: 'st1', args: { id: 'r1' } },
  { name: 'setResourceStatus', as: 'st1', args: { id: 'r1' } },
  { name: 'deleteResource', as: 'st1', args: { id: 'r1' } },

  // --- 30-31 · Admin Announcements --------------------------------------------------------------
  {
    name: 'sendAnnouncement',
    as: 'st1',
    args: {
      title: 'Session 4 moved',
      body: 'Thursday at 1:00 PM CT.',
      audience: 'all',
      inapp: true,
      email: false,
      when: 'now',
    },
  },
  { name: 'toggleReminder', as: 'st1', args: { id: 'rm1' } },

  // --- 32-33 · Admin Tiers and Upgrades ---------------------------------------------------------
  // A positive price, and different from the seeded 4995: a non-positive one is ignored by design.
  { name: 'setTierPrice', as: 'st1', args: { tierId: 'team', price: 2400 } },
  // ur1 is `new`, so `contacted` moves it. (`converted` would also upgrade Kenji — a second
  // behaviour in one row, and `setLearnerTier` already covers `upgradeUser`.)
  { name: 'setRequestStatus', as: 'st1', args: { id: 'ur1', status: 'contacted' } },

  // --- 34-37 · Admin Staff and Roles ------------------------------------------------------------
  { name: 'inviteStaff', as: 'st1', args: { email: 'new@amplifiedimpact.com', role: 'Instructor' } },
  // st2 and st4 rather than the seed's first staff row: st1 is the Owner, whose role is fixed and
  // who cannot be removed.
  { name: 'setStaffRole', as: 'st1', args: { id: 'st2', role: 'Admin' } },
  { name: 'removeStaff', as: 'st1', args: { id: 'st4' } },
  // Instructor › Publish modules is 0 in the seed, so this turns a permission ON.
  { name: 'togglePermission', as: 'st1', args: { role: 'Instructor', perm: 'publish' } },
];

// ---------------------------------------------------------------------------
// Comparison
// ---------------------------------------------------------------------------

/**
 * The snapshot as a database holds it — D-018 and the `codec.ts` header, stated once.
 *
 * `base` is `ZERO_BASE` (§ 7.4). `cohorts[].enrolled` is recounted from the user rows, because
 * § 7.2 stores no column for it and the fixture's 148 counts ~134 learners the seed does not model
 * as rows. `phase` is the demo's time machine and is deliberately not persisted.
 *
 * This is applied to the EXPECTED side only. Nothing here can hide a persistence bug: it rewrites
 * two derived fields and drops one piece of metadata, and `codec.test.ts`'s
 * "recomputes enrolled instead of trusting the snapshot" proves the recount is the codec's own
 * answer rather than this helper's.
 */
function asStored(db: Db): Db {
  const { phase: _phase, ...rest } = structuredClone(db);
  const out = rest as Db;
  out.base = structuredClone(ZERO_BASE);
  for (const c of out.cohorts) c.enrolled = out.users.filter((u) => u.cohortId === c.id).length;
  return out;
}

/** The checklist's `normalize`: every array sorted by id, and nothing else. */
function normalize(db: Db): Db {
  const out = structuredClone(db);
  const byId = <T extends { id: string }>(a: T[]): T[] =>
    [...a].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
  out.users = byId(out.users);
  out.teams = byId(out.teams);
  out.cohorts = byId(out.cohorts);
  out.sessions = byId(out.sessions);
  out.modules = byId(out.modules);
  out.resources = byId(out.resources);
  out.announcements = byId(out.announcements);
  out.reminders = byId(out.reminders);
  out.tiers = byId(out.tiers);
  out.requests = byId(out.requests);
  out.staff = byId(out.staff);
  out.activity = byId(out.activity);
  return out;
}

/**
 * The actor for a `users` row id, decided by the SEED rather than by the id's prefix.
 *
 * The checklist's snippet writes `c.as.startsWith('st') ? staff : learner`, which is right for
 * `st1` and silently wrong for any id that does not fit the convention — a learner id typed into
 * `as` by mistake would become a learner actor, the mutation would answer 404, and the failure
 * would read as a route bug. Looking the id up and throwing when it is neither turns a typo in the
 * table into a sentence naming the id.
 */
function actorFor(seed: Db, id: string): Actor {
  if (seed.staff.some((s) => s.id === id)) return { kind: 'staff', staffId: id };
  if (seed.users.some((u) => u.id === id)) return { kind: 'learner', userId: id };
  throw new Error(`${JSON.stringify(id)} is neither a staff nor a learner id in seed('live')`);
}

/**
 * The arguments as the MUTATION receives them, on both sides.
 *
 * `app.inject({ payload })` JSON-serializes the body, so the route's mutation is called with
 * `JSON.parse(JSON.stringify(args))` — which is not always `args`. `saveModule`'s draft is the case
 * that matters: an `undefined` property survives an in-process call and vanishes over the wire, and
 * the two sides would then disagree about a field nothing in the route touched. Round-tripping the
 * core side through the same transform removes that whole class of false failure.
 */
const wire = <T>(args: T): T => JSON.parse(JSON.stringify(args)) as T;

/** Every step of a case, in order: the preconditions, then the mutation under test. */
const stepsOf = (c: Case): readonly Step[] => [...(c.pre ?? []), c];

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

let app: App;
let savedAppUrl: string | undefined;

beforeAll(async () => {
  // `inviteMember` dispatches a `team-invite` after the commit, and `templates/links.ts` refuses to
  // render without APP_URL. The send happens after the route has answered and its failure is only
  // logged, so an unset variable would not fail a test — it would just mean the one case with an
  // email effect never exercised the renderer.
  savedAppUrl = process.env.APP_URL;
  process.env.APP_URL = 'https://learn.example.com';
  // Pays for CREATE DATABASE and the migration once, under the 60s hookTimeout, rather than inside
  // the first case's 30s body.
  await testDatabase();
});

afterAll(() => {
  if (savedAppUrl === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = savedAppUrl;
  delete process.env.FIXED_NOW;
});

beforeEach(async () => {
  // In `beforeEach`, not `beforeAll`: `lib/clock.ts` reads FIXED_NOW on every call rather than
  // caching it, and a sibling suite in the same worker that deletes it would otherwise unpin this
  // one's clock silently — every `now` would become the wall clock and every expectation would
  // drift by milliseconds.
  process.env.FIXED_NOW = new Date(NOW).toISOString();
  await resetDatabase(live());
  app = await build({ logger: false });
});

// ---------------------------------------------------------------------------

describe('API ⇔ core oracle @g7', () => {
  it('covers every mutation in the catalog, and nothing else @g7', () => {
    // The guard the task actually needs: a mutation added to `@ai/core` later has no row here, and
    // THIS test fails until somebody writes one. A row for a name that is not a mutation fails it
    // too, which is how a typo in the table is caught before it becomes a 404 in 37 other tests.
    const callable = Object.keys(M).filter((k) => typeof (M as Record<string, unknown>)[k] === 'function');
    // `MutationError` is a class, so `typeof` calls it a function. It is not a mutation and must not
    // get a row, a schema or a route — the same thing `schemas.test.ts` pins.
    expect(callable).toContain('MutationError');
    const mutations = callable.filter((k) => k !== 'MutationError').sort();
    expect(mutations).toHaveLength(40);
    expect([...new Set(CASES.map((c) => c.name))].sort()).toEqual(mutations);
  });

  for (const c of CASES) {
    // The extra `toggleStep` row would otherwise be indistinguishable from the checklist's own in
    // the reporter's output, and "toggleStep failed" twice is not a useful line to read.
    const label = c.pre ? `${c.name} (after ${c.pre.map((p) => p.name).join(', ')})` : c.name;

    it(`${label} @g7`, async () => {
      const steps = stepsOf(c);

      // --- the API side ------------------------------------------------------------------------
      // A fresh cookie per step, because `signInAs` mints a real `auth_sessions` row and the steps
      // of a case may be different actors. `inject({ payload })` sets content-type and sends no
      // Origin, which § 9.4's CSRF rule allows for a non-browser client (`auth/guard.ts`).
      let body: unknown;
      try {
        for (const step of steps) {
          const cookie = await app.signInAs(step.as);
          const res = await app.inject({
            method: 'POST',
            url: `/api/mutate/${step.name}`,
            headers: { cookie },
            payload: step.args,
          });
          // The body is in the message because a 422 here means the payload was REFUSED by core —
          // a vacuous row, not a persistence bug — and the error text says which guard it hit.
          expect(res.statusCode, `${step.name} as ${step.as}: ${res.body}`).toBe(200);
          body = res.json();
        }
      } finally {
        // Not `shutdown(app)`: see the header. `close()` drains SSE through its own `preClose` hook.
        await app.close();
      }

      // --- the core side -----------------------------------------------------------------------
      const seed = live();
      let db: Db = seed;
      let out: Outcome | undefined;
      for (const step of steps) {
        const mutation = MUTATIONS[step.name];
        expect(typeof mutation, step.name).toBe('function');
        // A FRESH generator per step, which is what the route does: `lib/clock.ts`'s `newIds()`
        // returns a new `deterministicIds()` per request, so a process-wide counter would make the
        // first request of a run and the fortieth disagree. `deterministicIds(NOW)` rather than the
        // checklist's `deterministicIds()` — the same sequence under FIXED_NOW, but it does not
        // depend on the environment variable being set at this line.
        out = mutation!(db, actorFor(seed, step.as), wire(step.args) as never, { now: NOW, id: deterministicIds(NOW) });
        // `{ db, error }` is core's inline-validation shape and the route answers it as a 422, so
        // the API side would already have failed above. Asserted anyway: it names the message.
        expect(out.error, `${step.name} refused its own arguments`).toBeUndefined();
        db = out.db;
      }

      const expected = asStored(db);

      // The row is worth having: the mutation changed the snapshot. Without this a payload that
      // core quietly ignores would still pass `toEqual`, against a route that wrote nothing.
      expect(normalize(expected), `${label} left the seed unchanged, so this case proves nothing`).not.toEqual(
        normalize(asStored(seed)),
      );

      // The checklist's assertion.
      expect(normalize(await loadDb())).toEqual(normalize(expected));

      // § 7.3's response shape, for the same 38 cases: `toast` OMITTED when core returns none, and
      // `effects` always present and filtered to confetti. This is where a route that leaked the
      // email effect — `inviteMember`'s carries the invitee's address, and the route adds a working
      // invite token to its `data` — fails, and it is the only place that filter is exercised over
      // the whole catalog rather than on one mutation.
      const confetti = (out!.effects ?? []).filter((e: Effect) => e.type === 'confetti');
      expect(body).toEqual({ ...(out!.toast ? { toast: out!.toast } : {}), effects: confetti });
    });
  }
});
