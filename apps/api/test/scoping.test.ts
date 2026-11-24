// Gate 7's snapshot-scoping assertions — docs/phases/07-backend.md, "Ship Checklist":
//
//   "Jamie's snapshot has no `prompt` for `meetings`, `finance` or `operations`; no `staff`; no
//    other teams' users; and no `zoom` URLs."
//   "Alex's snapshot includes the Northline members' emails. Sarah's (Sales Agent) snapshot does
//    not."
//
// All of it over the HTTP response from `GET /api/snapshot`, never over `scopeSnapshot` directly.
// `packages/core/src/scope.test.ts` has 40 unit tests on that function; what is unproven until
// here is that the ROUTE applies it — that § 7.4's boundary is reached by the thing the browser
// actually calls, with the rows `loadDb` actually returns, after the codec has had its turn.
//
// ================================================================================================
// A SWEEP, NOT A SPOT CHECK
// ================================================================================================
// "`modules.find('meetings').prompt === ''`" is a true statement about one field. It says nothing
// about `files`, `transcript`, `runDemo`, a draft module that should not be in the list at all, or
// a teammate's `lastRun`. A leak is by definition in the field nobody thought to name, so the
// checklist's four positive assertions are followed by `forbiddenFor()`, which derives — from the
// database, for each viewer — every string that viewer must not receive, and searches the whole
// serialized response for all of them at once. Adding a column to `Db` extends the sweep for free;
// adding one to a hand-written list does not.
//
// The strings are strong identifiers, and two kinds are deliberately NOT swept:
//
//   - STAFF NAMES. `modules[].instructor` is `'Jordan Hale'`, who is `st2`. The instructor's name
//     is module copy the reference puts on the learner's workspace page (SCREENS § 2.3), so a
//     sweep for staff names would fail on correct behaviour. Staff IDS and EMAIL ADDRESSES are
//     swept instead, and `staff: []` is asserted outright.
//   - THE PROGRAM'S OWN COPY. Only values planted or seeded as somebody's private data are
//     forbidden; shared content (announcement bodies, tier blurbs, resource titles) is what the
//     viewer is there to read.
//
// ================================================================================================
// EVERY FORBIDDEN VALUE IS PROVED TO EXIST FIRST
// ================================================================================================
// A sweep for a string that is not in the database passes no matter what the route does. So every
// sentinel is paired with a POSITIVE control showing the value is really there and really
// reachable:
//
//   - the draft module's prompt, the Zoom URLs and the learner emails are asserted PRESENT in
//     `st1`'s snapshot (staff with `viewLearners` receive everything except the auth tables), and
//     absent from the learners';
//   - the teammate's `lastRun` is asserted present in HER OWN snapshot and absent from her team
//     owner's;
//   - `resources.storage_key` never appears in any snapshot — § 7.3's codec drops the column
//     before `scopeSnapshot` is even called — so its control is a direct read of the column,
//     proving the row holds the key while no response does.
//
// ================================================================================================
// WHY ONE APP AND ONE RESET FOR THE WHOLE FILE
// ================================================================================================
// Nothing here mutates: every test reads `GET /api/snapshot`. So the fixture is loaded once and the
// five snapshots are fetched once, in `beforeAll`, and the tests assert over the captured bodies —
// which keeps the file at ~15 s instead of ~90 s and, more usefully, means all five viewers are
// looking at the SAME database state, so "Alex sees this and Sarah does not" is a comparison and
// not two separate observations. The usual "fresh app per test" rule is about
// `@fastify/rate-limit`'s per-instance store; five requests across five session keys is nowhere
// near § 9.4's 100-per-minute budget.

import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { scopeSnapshot, seedForDatabase, ZERO_BASE } from '@ai/core';
import type { Actor, Db, Learner } from '@ai/core';
import { build } from '../src/app';
import type { App } from '../src/app';
import { resources } from '../src/db/schema';
import { loadDb, resetDatabase, testDatabase } from './helpers';

const NOW = Date.parse('2026-12-07T10:42:00-06:00');

// --- sentinels ----------------------------------------------------------------------------------
// Distinctive enough that a substring search cannot match them by accident, and each one is
// asserted to exist somewhere before it is asserted to be absent somewhere else.

/** The system prompt of a module nobody has published. A learner must never receive it. */
const DRAFT_PROMPT = 'SENTINEL-DRAFT-PROMPT: unreleased system prompt, staff only.';
/** `resources.storage_key`: § 8.2's object-store key, a backend column with no snapshot form. */
const STORAGE_KEY = 'vault/SENTINEL-STORAGE-KEY/compliance-pack.pdf';

/**
 * Every `lastRun` in the fixture is rewritten to one of these, and here is why that is necessary
 * rather than tidy.
 *
 * MEASURED: the seed gives `u_alex` a `sales` run whose `preview` is the SAME STRING as a line in
 * the `sales` module's `runDemo.sections` (`seed.ts:180` and `seed.ts:350`) — the reference reuses
 * its sample output as the demo copy. `runDemo` is module content every learner with access
 * receives, so a sweep for that string finds it in Priya's and Sarah's snapshots and calls it a
 * leak of Alex's run output when it is nothing of the kind. A sweep that cries wolf on correct
 * behaviour gets a tolerance added to it and then catches nothing, so the fix is to make every
 * learner's run output a string that exists NOWHERE else: `SENTINEL-RUN-… <userId> <moduleId>`
 * identifies whose it is, so a failure names the person whose data escaped.
 */
const runTitle = (userId: string, moduleId: string): string => `SENTINEL-RUN-TITLE ${userId} ${moduleId}`;
const runPreview = (userId: string, moduleId: string): string =>
  `SENTINEL-RUN-PREVIEW ${userId} ${moduleId}: produced from this learner’s own contacts.`;

// --- the fixture --------------------------------------------------------------------------------

/**
 * Gate 7's seed, plus the three things it has no instance of for the sweep to find.
 *
 * `storage_key` is not here: it is not part of `Db`, so `insertSnapshot` cannot write it (that is
 * the point of `io.ts`'s `COLUMNS_OWNED`). It is written with an `update` after the load.
 */
function fixture(): Db {
  const db = seedForDatabase('live');

  // A draft module. Every module in the seed is published or scheduled, so without this there is
  // no case for "a draft never reaches a learner" to be a case about. `session: null` so
  // `publishReplay`'s "the module for session n" lookup stays unambiguous.
  const sales = db.modules.find((m) => m.id === 'sales')!;
  db.modules.push({
    ...structuredClone(sales),
    id: 'draft_secret',
    name: 'Unreleased AI Employee',
    short: 'Unreleased',
    status: 'draft',
    session: null,
    order: 7,
    prompt: DRAFT_PROMPT,
  });

  // A teammate's run output. `scope.ts` keeps a teammate's build STATE (Team Hub is built on it)
  // and drops `lastRun`, and the seed gives Sarah none — so the distinction is untested until
  // there is one to drop.
  const sarah = db.users.find((u) => u.id === 'u_sarah')!;
  sarah.progress.marketing = { ...sarah.progress.marketing!, lastRun: { at: NOW - 3_600_000, title: '', preview: '' } };

  // Then every run output in the fixture, Sarah's included, gets a string that appears nowhere
  // else. See `runPreview`'s comment: one of the seed's own previews is a verbatim copy of a
  // module's demo output, which makes it useless as evidence either way.
  for (const user of db.users) {
    for (const [moduleId, progress] of Object.entries(user.progress)) {
      if (!progress.lastRun) continue;
      progress.lastRun = {
        at: progress.lastRun.at,
        title: runTitle(user.id, moduleId),
        preview: runPreview(user.id, moduleId),
      };
    }
  }

  // A dismissal belonging to somebody else: `dismissed` is keyed `${userId}:${announcementId}`, so
  // a route that returned the whole map would hand every viewer a list of who has read what.
  db.dismissed['u_rosa:a1'] = 1;

  // A HIDDEN resource. § 7.4 gives learners "published `resources`", and every row in the seed is
  // published — so "only published resources" was a statement about a set with nothing to exclude
  // from it, which is the kind of assertion that passes whatever the route does. Found by breaking
  // the suite on purpose: the assertion was the only one in the file that no bite could make fail.
  db.resources.push({
    id: 'r_hidden',
    title: 'SENTINEL-HIDDEN Unreleased Compliance Pack',
    desc: 'Staged in the admin console and not published.',
    cat: 'MLS & Fair Housing Compliance',
    type: 'PDF guide',
    tier: 'agent',
    size: '2.2 MB',
    dl: 0,
    updated: NOW,
    exec: false,
    status: 'hidden',
  });

  return db;
}

// --- the viewers --------------------------------------------------------------------------------

const VIEWERS = {
  /** Agent tier, no team: the narrowest learner snapshot there is. */
  jamie: { id: 'u_jamie', actor: { kind: 'learner', userId: 'u_jamie' } as Actor },
  /** Northline's Team Owner: the widest learner snapshot, and § 7.4's email-visible role. */
  alex: { id: 'u_alex', actor: { kind: 'learner', userId: 'u_alex' } as Actor },
  /** Northline's Operations Lead: § 7.4's other email-visible role. */
  priya: { id: 'u_priya', actor: { kind: 'learner', userId: 'u_priya' } as Actor },
  /** Northline Sales Agent: on the team, and not entitled to the roster's addresses. */
  sarah: { id: 'u_sarah', actor: { kind: 'learner', userId: 'u_sarah' } as Actor },
  /** Staff with `viewLearners`: the control that proves every sentinel is really in the database. */
  casey: { id: 'st1', actor: { kind: 'staff', staffId: 'st1' } as Actor },
} as const;

type ViewerName = keyof typeof VIEWERS;

/** The captured responses: parsed body and raw text, per viewer. */
const seen = {} as Record<ViewerName, { db: Db; raw: string; status: number }>;

/** The unscoped database, for the "the route did scope it" comparison. */
let whole: Db;

let app: App;
let savedAppUrl: string | undefined;

beforeAll(async () => {
  savedAppUrl = process.env.APP_URL;
  process.env.APP_URL = 'https://learn.example.com';
  process.env.FIXED_NOW = new Date(NOW).toISOString();

  const db = await testDatabase();
  await resetDatabase(fixture());

  // § 8.2's object-store key, written straight to the column. Two resources, one Agent-tier
  // (`r1`) and one Executive Vault (`x1`), so the sweep covers a resource each learner can see and
  // one only a Team-tier learner can.
  await db.update(resources).set({ storageKey: STORAGE_KEY }).where(sql`${resources.id} in ('r1', 'x1')`);

  app = await build({ logger: false });
  for (const [name, viewer] of Object.entries(VIEWERS)) {
    const cookie = await app.signInAs(viewer.id);
    const res = await app.inject({ method: 'GET', url: '/api/snapshot', headers: { cookie } });
    seen[name as ViewerName] = { db: res.json() as Db, raw: res.body, status: res.statusCode };
  }
  whole = await loadDb();
});

afterAll(async () => {
  await app?.close();
  if (savedAppUrl === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = savedAppUrl;
  delete process.env.FIXED_NOW;
});

// --- the sweep ----------------------------------------------------------------------------------

const learnerById = (id: string): Learner => whole.users.find((u) => u.id === id)!;

/**
 * Every string this viewer must not receive, derived from the loaded database.
 *
 * Derived rather than listed, so a row added to the seed or a column added to `Db` widens the
 * sweep without anybody remembering to. The categories are the four the checklist names, plus the
 * three the same reasoning reaches:
 *
 *   1. another team's learners — their id, email and name;
 *   2. an unpublished module — its id and its system prompt;
 *   3. `resources.storage_key`;
 *   4. another learner's `lastRun` — its title and its preview text;
 *   5. every `zoom` URL (§ 7.4 withholds them from learners; phase 08 serves them through a route
 *      that checks the join window);
 *   6. staff ids and staff email addresses (`staff: []`, so none of it belongs here);
 *   7. somebody else's dismissal key and somebody else's upgrade request.
 */
function forbiddenFor(viewer: Actor): { value: string; why: string }[] {
  const out: { value: string; why: string }[] = [];
  const add = (value: string, why: string): void => {
    if (value !== '') out.push({ value, why });
  };

  if (viewer.kind === 'learner') {
    const me = learnerById(viewer.userId);
    const teammates = new Set(
      whole.users.filter((u) => u.id === me.id || (me.teamId !== null && u.teamId === me.teamId)).map((u) => u.id),
    );

    for (const u of whole.users) {
      if (teammates.has(u.id)) {
        // On the team but not the viewer: build state is shared (Team Hub is built on it), run
        // output is not.
        if (u.id !== me.id) {
          for (const p of Object.values(u.progress)) {
            if (p.lastRun) {
              add(p.lastRun.title, `${u.id}'s lastRun title`);
              add(p.lastRun.preview, `${u.id}'s lastRun preview`);
            }
          }
        }
        continue;
      }
      add(u.id, 'another team’s learner id');
      add(u.email, 'another team’s learner email');
      add(u.name, 'another team’s learner name');
    }

    for (const m of whole.modules) {
      if (m.status !== 'draft') continue;
      add(m.id, 'an unpublished module’s id');
      add(m.prompt, 'an unpublished module’s system prompt');
    }

    for (const s of whole.sessions) add(s.zoom, 'a session join URL');

    for (const s of whole.staff) {
      add(s.id, 'a staff id');
      add(s.email, 'a staff email');
    }

    for (const key of Object.keys(whole.dismissed)) {
      if (!key.startsWith(`${me.id}:`)) add(key, 'somebody else’s dismissal');
    }

    for (const q of whole.requests) {
      if (q.userId !== me.id) {
        add(q.id, 'somebody else’s upgrade request');
        add(q.email, 'somebody else’s upgrade request email');
      }
    }

    // Not role-gated for a Team Owner or an Operations Lead; blank for everyone else on the team.
    if (!(me.role === 'Team Owner' || me.role === 'Operations Lead')) {
      for (const u of whole.users) {
        if (u.id !== me.id && teammates.has(u.id)) add(u.email, 'a teammate’s email, which this role may not see');
      }
    }
  }

  // Every viewer, learner or staff. The codec never puts it in a snapshot, so this is the one
  // forbidden value that is absent by construction rather than by scoping.
  add(STORAGE_KEY, 'an object-store key');

  return out;
}

/** Every forbidden string that DID appear, as readable lines. */
const leaks = (name: ViewerName, viewer: Actor): string[] =>
  forbiddenFor(viewer)
    .filter(({ value }) => seen[name].raw.includes(value))
    .map(({ value, why }) => `${name} received ${why}: ${JSON.stringify(value)}`);

// ================================================================================================

describe('Gate 7 · GET /api/snapshot applies § 7.4 @g7', () => {
  it('answers 200 for every viewer, and is scopeSnapshot and nothing else @g7', async () => {
    for (const name of Object.keys(VIEWERS) as ViewerName[]) {
      expect(seen[name].status, name).toBe(200);
      // The route's whole body against the pure function, per viewer. A route that re-filtered,
      // added a field or forgot to scope fails this, and so does one whose `loadDb` and
      // `scopeSnapshot` disagree about a shape. D-243: the route's `withOutside` adds nothing here,
      // where nobody is outside the course (course-members.test.ts holds the case where someone is).
      expect(seen[name].db, name).toEqual(scopeSnapshot(whole, VIEWERS[name].actor));
    }
    // And the other half: that scoping HAPPENED. `toEqual(scopeSnapshot(...))` would also pass if
    // `scopeSnapshot` were the identity function, so every learner's body must differ from the
    // unscoped database.
    for (const name of ['jamie', 'alex', 'priya', 'sarah'] as const) {
      expect(seen[name].db, `${name} must not be the unscoped database`).not.toEqual(whole);
    }
    // MEASURED, and correct: for staff with `viewLearners` the scoped snapshot IS the whole
    // database. § 7.4's staff row is "everything except auth tables", `Db` does not model those,
    // and `base` is already `ZERO_BASE` because the API never serves the demo aggregates
    // (`seedForDatabase` zeroes it; D-018). Asserted as equality rather than left out, because a
    // staff snapshot that had quietly LOST a table is a bug no learner test could ever see.
    expect(seen.casey.db).toEqual(whole);
  });

  // ----------------------------------------------------------------------------------------------
  // The four assertions the checklist makes about Jamie, verbatim.
  // ----------------------------------------------------------------------------------------------
  describe('Jamie’s snapshot', () => {
    it('has no prompt for meetings, finance or operations @g7', () => {
      // Jamie is Agent tier, and those three are the Team-tier AI Employees. `redactModule` blanks
      // the buildable half and keeps the marketing copy, because the portal still renders the card
      // and its upgrade CTA (SCREENS § 2.2).
      for (const id of ['meetings', 'finance', 'operations']) {
        const m = seen.jamie.db.modules.find((x) => x.id === id);
        expect(m, `${id} must still be listed`).toBeDefined();
        expect(m!.prompt, `${id}.prompt`).toBe('');
        // Everything else `redactModule` strips, which the checklist's one named field implies.
        expect(m!.files, `${id}.files`).toEqual([]);
        expect(m!.transcript, `${id}.transcript`).toEqual([]);
        expect(m!.runDemo, `${id}.runDemo`).toBeUndefined();
        expect(m!.name, `${id}.name is marketing copy and stays`).not.toBe('');
      }

      // The control: blanking is not universal. The three Agent-tier modules Jamie CAN build keep
      // their prompts, so `''` above is a decision rather than an empty column.
      for (const id of ['marketing', 'sales', 'database']) {
        const m = seen.jamie.db.modules.find((x) => x.id === id)!;
        expect(m.prompt.length, `${id}.prompt`).toBeGreaterThan(40);
        expect(m.files.length, `${id}.files`).toBeGreaterThan(0);
      }
    });

    it('has no staff @g7', () => {
      expect(seen.jamie.db.staff).toEqual([]);
      // § 7.4 lists `perms: {}` in the same breath, and the two go together: a permissions table
      // with no staff to apply it to is a leak of the admin console's shape for no purpose.
      expect(seen.jamie.db.perms).toEqual({});
      expect(seen.jamie.db.activity).toEqual([]);
      expect(seen.jamie.db.base).toEqual(ZERO_BASE);
      // The control: there IS staff in the database, and `st1` receives it.
      expect(seen.casey.db.staff.length).toBeGreaterThan(0);
      expect(Object.keys(seen.casey.db.perms).length).toBeGreaterThan(0);
    });

    it('has no other teams’ users @g7', () => {
      // Agent tier with `teamId: null`, so the roster is exactly one row: herself.
      expect(seen.jamie.db.users.map((u) => u.id)).toEqual(['u_jamie']);
      expect(seen.jamie.db.teams).toEqual([]);
      // Her own address is present — the Account screen renders it — so "no emails" is not what
      // this is.
      expect(seen.jamie.db.users[0]!.email).toBe('jamie@ortizhomes.com');
      // The control: the other fourteen learners exist and `st1` receives them.
      expect(seen.casey.db.users.length).toBeGreaterThan(seen.jamie.db.users.length);
      expect(seen.casey.db.users.map((u) => u.id)).toContain('u_natasha');
    });

    it('has no zoom URLs @g7', () => {
      // Her own cohort's sessions are present and blanked; nobody else's cohort is present at all.
      expect(seen.jamie.db.sessions.length).toBeGreaterThan(0);
      for (const s of seen.jamie.db.sessions) {
        expect(s.zoom, `session ${s.id}`).toBe('');
        expect(s.cohortId).toBe('dec26');
      }
      // The whole response, not just the field: a join URL reaching any other string is the same
      // leak. `zoom.us` is the host every seeded session uses.
      expect(seen.jamie.raw).not.toContain('zoom.us');
      // The control: the URLs are in the database and `st1` receives them.
      expect(seen.casey.raw).toContain('zoom.us');
    });
  });

  // ----------------------------------------------------------------------------------------------
  // Gate 7: "Alex's snapshot includes the Northline members' emails. Sarah's (Sales Agent) snapshot
  // does not."
  // ----------------------------------------------------------------------------------------------
  describe('team roster emails are role-gated', () => {
    /** Northline's other five seats, from the database rather than from a list. */
    const northline = (): Learner[] => whole.users.filter((u) => u.teamId === 'northline');

    it('Alex (Team Owner) receives the Northline members’ emails @g7', () => {
      const roster = northline();
      expect(roster.length).toBeGreaterThan(1);
      for (const member of roster) {
        const got = seen.alex.db.users.find((u) => u.id === member.id);
        expect(got, `${member.id} must be on Alex’s roster`).toBeDefined();
        expect(got!.email, `${member.id}.email`).toBe(member.email);
      }
    });

    it('Priya (Operations Lead) receives them too @g7', () => {
      // § 7.4: "other members' `email` visible only to Team Owner and Operations Lead". The
      // checklist names Alex and Sarah; this is the third row of the same rule, and the one that
      // would be missed by testing only the two it names.
      for (const member of northline()) {
        expect(seen.priya.db.users.find((u) => u.id === member.id)!.email, `${member.id}.email`).toBe(member.email);
      }
    });

    it('Sarah (Sales Agent) does not @g7', () => {
      const roster = northline();
      for (const member of roster) {
        const got = seen.sarah.db.users.find((u) => u.id === member.id);
        expect(got, `${member.id} must still be on Sarah’s roster`).toBeDefined();
        if (member.id === 'u_sarah') {
          // Her own address stays: the Account screen renders it.
          expect(got!.email).toBe(member.email);
        } else {
          expect(got!.email, `${member.id}.email`).toBe('');
          // Blanked to `''`, the empty value of the declared type — not `null` and not absent, so
          // every screen that renders `u.email` keeps rendering.
          expect(typeof got!.email).toBe('string');
          // And the rest of the row is still there: Team Hub needs the roster.
          expect(got!.name).toBe(member.name);
        }
      }
      // The whole response, so an address cannot survive somewhere other than `users[].email`.
      for (const member of roster) {
        if (member.id === 'u_sarah') continue;
        expect(seen.sarah.raw, `${member.id}.email anywhere in the body`).not.toContain(member.email);
      }
    });
  });

  // ----------------------------------------------------------------------------------------------
  // The sweep: nothing belonging to anybody else, anywhere in the response.
  // ----------------------------------------------------------------------------------------------
  describe('nothing belonging to somebody else appears anywhere', () => {
    for (const name of ['jamie', 'alex', 'priya', 'sarah'] as const) {
      it(`${name}’s response contains none of the strings scoping must withhold @g7`, () => {
        const forbidden = forbiddenFor(VIEWERS[name].actor);
        // The sweep has to be looking for something. Fewer than a few dozen strings means the
        // derivation broke, and an empty list would make this test pass unconditionally.
        expect(forbidden.length, 'the sweep must have values to look for').toBeGreaterThan(20);
        expect(leaks(name, VIEWERS[name].actor).join('\n')).toBe('');
      });
    }

    it('the draft module is not in any learner’s module list at all @g7', () => {
      for (const name of ['jamie', 'alex', 'priya', 'sarah'] as const) {
        expect(seen[name].db.modules.map((m) => m.id), name).not.toContain('draft_secret');
      }
      // The control: the draft and its prompt are in the database, and `st1` receives both.
      expect(seen.casey.db.modules.map((m) => m.id)).toContain('draft_secret');
      expect(seen.casey.raw).toContain(DRAFT_PROMPT);
    });

    it('a teammate’s lastRun stays with her, while her build state is shared @g7', () => {
      // Sarah's own run output reaches Sarah.
      expect(seen.sarah.db.users.find((u) => u.id === 'u_sarah')!.progress.marketing!.lastRun!.preview).toBe(
        runPreview('u_sarah', 'marketing'),
      );
      // And not her team owner, nor the Operations Lead, nor anybody else.
      for (const name of ['alex', 'priya', 'jamie'] as const) {
        expect(seen[name].raw, name).not.toContain(runPreview('u_sarah', 'marketing'));
        expect(seen[name].raw, name).not.toContain(runTitle('u_sarah', 'marketing'));
      }
      // What Alex DOES get is her build state, because Team Hub is built on it (SCREENS § 3.4) and
      // Gate 7 re-runs those parity scenarios in http mode against the same goldens. Dropping
      // `progress` with `lastRun` would be a scoping bug that looks like a rendering bug.
      const sarahOnAlexsRoster = seen.alex.db.users.find((u) => u.id === 'u_sarah')!;
      expect(sarahOnAlexsRoster.progress.marketing!.steps.length).toBe(6);
      expect(sarahOnAlexsRoster.progress.marketing!.builtAt).toBeGreaterThan(0);
      expect(sarahOnAlexsRoster.progress.marketing!.lastRun).toBeUndefined();
      // Alex's own run output is still his.
      expect(seen.alex.db.users.find((u) => u.id === 'u_alex')!.progress.marketing!.lastRun).toBeDefined();

      // MEASURED, and pinned rather than asserted as correct: `progress.issue` — free text about
      // why a teammate's AI Employee stopped working, `'CRM webhook stopped responding'` in the
      // seed — IS shared across a team. `redactTeammate` drops `lastRun` and keeps everything
      // else, while its own comment lists the fields Team Hub reads as `steps`, `builtAt`,
      // `deployedAt` and `runtime`, which does not include `issue`. The seeded value is
      // operational rather than personal, so this is a question for DECISIONS.md and not a bug to
      // fix from a test file; the pin is here so the next reader knows the field crosses the
      // boundary and does not learn it from a screenshot. Flagged in the handover.
      const devonOnAlexsRoster = seen.alex.db.users.find((u) => u.id === 'u_devon')!;
      expect(devonOnAlexsRoster.progress.sales!.issue).toBe('CRM webhook stopped responding');
    });

    it('no resource storageKey reaches any snapshot, learner or staff @g7', async () => {
      // The control is a direct read of the column, because § 7.3's codec drops `storage_key` on
      // the way out of the database — it is not part of `Db`, so no snapshot has a place to put it
      // and `scope.ts`'s `redactResource` is a second line of defence rather than the only one.
      // That makes a value-in-the-database check the only honest control here.
      const db = await testDatabase();
      const rows = (await db.execute(
        sql`select id, storage_key from resources where storage_key is not null order by id`,
      )) as unknown as { id: string; storage_key: string }[];
      expect(rows.map((r) => r.id)).toEqual(['r1', 'x1']);
      expect(rows[0]!.storage_key).toBe(STORAGE_KEY);

      // And it is in none of the five responses, nor is the column name.
      for (const name of Object.keys(VIEWERS) as ViewerName[]) {
        expect(seen[name].raw, name).not.toContain(STORAGE_KEY);
        expect(seen[name].raw, name).not.toContain('storageKey');
        expect(seen[name].raw, name).not.toContain('storage_key');
      }
      // The resources themselves are still served — `''` would also contain no key.
      expect(seen.jamie.db.resources.find((r) => r.id === 'r1')).toBeDefined();
      expect(seen.casey.db.resources.find((r) => r.id === 'r1')).toBeDefined();
    });

    it('a learner receives only their own requests and dismissals @g7', () => {
      // `requests` is the upgrade pipeline: who has asked for a sales call. One learner's row is
      // another learner's business, and `dismissed` is keyed by user id, so an unscoped map is a
      // list of who has read what.
      expect(seen.jamie.db.requests.map((q) => q.userId)).toEqual([]);
      expect(seen.jamie.db.dismissed).toEqual({});
      // Planted on `u_rosa`, who is on no team with anybody here.
      for (const name of ['jamie', 'alex', 'priya', 'sarah'] as const) {
        expect(Object.keys(seen[name].db.dismissed).every((k) => k.startsWith(`${VIEWERS[name].id}:`)), name).toBe(
          true,
        );
      }
      // The control: both rows exist, and `st1` receives them.
      expect(seen.casey.db.requests.length).toBeGreaterThan(0);
      expect(seen.casey.db.dismissed).toEqual({ 'u_rosa:a1': 1 });
    });

    it('a learner receives only published resources, with no hidden ones @g7', () => {
      // § 7.4: "published `resources` (storage keys removed)". A hidden row is the admin console's
      // staging area — a vault item somebody is still writing — so it is not a learner's to see.
      for (const name of ['jamie', 'alex', 'priya', 'sarah'] as const) {
        for (const r of seen[name].db.resources) expect(r.status, `${name} · ${r.id}`).toBe('published');
        // By id and by title, because `status` is only the field that happens to say so: a route
        // that served the row with its status rewritten would pass the loop above.
        expect(seen[name].db.resources.map((r) => r.id), name).not.toContain('r_hidden');
        expect(seen[name].raw, name).not.toContain('SENTINEL-HIDDEN');
      }
      expect(seen.jamie.db.resources.length).toBeGreaterThan(0);
      // The control: the hidden row is in the database and the admin console receives it.
      expect(seen.casey.db.resources.map((r) => r.id)).toContain('r_hidden');
      expect(seen.casey.raw).toContain('SENTINEL-HIDDEN');
    });
  });
});
