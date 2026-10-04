// Gate 7: the snapshot-scoping suite — docs/phases/07-backend.md §7.4.
//
// `GET /api/snapshot` returns exactly what `scopeSnapshot` produces. Anything it fails to strip is
// leaked to that viewer, so the adversarial cases at the bottom of this file matter more than the
// happy path: the input is never mutated, no learner ever carries another learner's progress, and
// two runs agree.
//
// Nothing here needs a server, a database or a session cookie, which is the whole point of
// specifying the boundary as a pure function in core.
import { describe, it, expect } from 'vitest';
import * as core from '../src';
import type { Actor, Announcement, Db, Learner, Resource } from '../src';

// ---------- Personas (seed('live')) ----------
const JAMIE = 'u_jamie'; //  Agent tier, Agent role, no team
const ALEX = 'u_alex'; //    Team tier, Team Owner of Northline
const PRIYA = 'u_priya'; //  Team tier, Operations Lead of Northline
const SARAH = 'u_sarah'; //  Team tier, Sales Agent of Northline
const NATASHA = 'u_natasha'; // Team Owner of Harbor & Pine — a DIFFERENT team
const KENJI = 'u_kenji'; //  Agent tier, the learner who filed upgrade request ur1

const OWNER = 'st1'; //      Casey Lin, staff Owner (every permission)
const SUPPORT = 'st4'; //    Luis Romero, staff Support

const NORTHLINE = [ALEX, PRIYA, SARAH, 'u_michael', 'u_devon', 'u_lena'];
const TEAM_ONLY_MODULES = ['meetings', 'finance', 'operations'];

const live = (): Db => core.seed('live');
const learner = (userId: string): Actor => ({ kind: 'learner', userId });
const staff = (staffId: string): Actor => ({ kind: 'staff', staffId });

const ids = (xs: { id: string }[]): string[] => xs.map((x) => x.id);
const userById = (db: Db, id: string): Learner => db.users.find((u) => u.id === id)!;
const scope = (db: Db, a: Actor): Db => core.scopeSnapshot(db, a);

/** Every learner in the seed, so the invariant suites can sweep all of them. */
const ALL_LEARNERS: string[] = ids(live().users);

// ---------- A storage key is a backend column (§7.2), never part of a snapshot ----------
type StoredResource = Resource & { storageKey?: string };

/** Live seed + a storage key on every resource + one `hidden` resource that must never ship. */
function withVault(): Db {
  const db = live();
  const stored: StoredResource[] = db.resources.map((r) => ({ ...r, storageKey: `vault/${r.id}.bin` }));
  stored.push({
    id: 'r_hidden',
    title: 'Unreleased Pricing Teardown',
    desc: 'Not published yet.',
    cat: core.CATEGORIES[0]!,
    type: 'PDF guide',
    tier: 'agent',
    size: '1 KB',
    dl: 0,
    updated: 0,
    exec: false,
    status: 'hidden',
    storageKey: 'vault/secret.bin',
  });
  db.resources = stored;
  return db;
}

/** Live seed + one sent announcement per audience + a scheduled `all`, to pin the audience filter. */
function withAnnouncements(): Db {
  const db = live();
  const ann = (id: string, audience: Announcement['audience'], status: Announcement['status']): Announcement => ({
    id,
    title: `${audience}/${status}`,
    body: '',
    severity: 'info',
    action: null,
    actionLabel: '',
    audience,
    channels: ['inapp'],
    status,
    at: core.DEMO_NOW,
    opens: null,
  });
  db.announcements = [
    ...db.announcements,
    ann('x_agent_sent', 'agent', 'sent'),
    ann('x_team_sent', 'team', 'sent'),
    ann('x_owners_sent', 'owners', 'sent'),
    ann('x_all_sched', 'all', 'scheduled'),
  ];
  return db;
}

/** Live seed with `operations` demoted to draft plus a brand-new agent-tier draft module. */
function withDrafts(): Db {
  const db = live();
  const ops = db.modules.find((m) => m.id === 'operations')!;
  ops.status = 'draft';
  ops.opens = null;
  db.modules.push(core.blankModule(7, core.DEMO_NOW));
  return db;
}

// ---------- The progress walker ----------
// `Progress` is the only shape in `Db` carrying all four of these keys.
const PROGRESS_KEYS = ['steps', 'builtAt', 'deployedAt', 'runtime'] as const;

const isProgressLike = (v: unknown): boolean =>
  !!v && typeof v === 'object' && !Array.isArray(v) && PROGRESS_KEYS.every((k) => k in (v as object));

/** Every path in `node` at which a Progress record is reachable. */
function progressPaths(node: unknown, path: string, out: string[] = []): string[] {
  if (isProgressLike(node)) out.push(path);
  if (Array.isArray(node)) node.forEach((x, i) => progressPaths(x, `${path}[${i}]`, out));
  else if (node && typeof node === 'object')
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) progressPaths(v, `${path}.${k}`, out);
  return out;
}

// =============================================================================
// Gate 7 checklist
// =============================================================================

describe('§7.4 Jamie, an Agent-tier learner @g7', () => {
  it('has no prompt, files, transcript or runDemo for meetings, finance or operations @g7', () => {
    const db = live();
    const out = scope(db, learner(JAMIE));

    for (const id of TEAM_ONLY_MODULES) {
      const m = out.modules.find((x) => x.id === id)!;
      expect(m, `${id} must still be listed`).toBeDefined();
      expect(m.prompt, `${id} prompt`).toBe('');
      expect(m.files, `${id} files`).toEqual([]);
      expect(m.transcript, `${id} transcript`).toEqual([]);
      expect('runDemo' in m, `${id} runDemo key`).toBe(false);
    }

    // Guard the guard: the unscoped seed really does ship a prompt and files for each of them.
    for (const id of TEAM_ONLY_MODULES) {
      const src = db.modules.find((x) => x.id === id)!;
      expect(src.prompt.length, `${id} seed prompt`).toBeGreaterThan(0);
      expect(src.files.length, `${id} seed files`).toBeGreaterThan(0);
    }
  });

  it('has no staff, no perms, no activity and a zeroed baseline @g7', () => {
    const db = live();
    const out = scope(db, learner(JAMIE));

    expect(out.staff).toEqual([]);
    expect(out.perms).toEqual({});
    expect(out.activity).toEqual([]);
    expect(out.base).toEqual(core.ZERO_BASE);

    // Guard the guard: the fixture snapshot is genuinely populated.
    expect(db.staff.length).toBeGreaterThan(0);
    expect(db.activity.length).toBeGreaterThan(0);
    expect(db.base.learners).toBeGreaterThan(0);
  });

  it('sees only herself — an Agent-tier learner with no team @g7', () => {
    const out = scope(live(), learner(JAMIE));

    expect(ids(out.users)).toEqual([JAMIE]);
    expect(out.teams).toEqual([]);
    expect(out.users[0]!.email).toBe('jamie@ortizhomes.com');
  });

  it('has no zoom URL on any session, and only her own cohort @g7', () => {
    const db = live();
    const out = scope(db, learner(JAMIE));

    expect(out.sessions).toHaveLength(6);
    for (const s of out.sessions) {
      expect(s.cohortId, `${s.id} cohort`).toBe('dec26');
      expect(s.zoom, `${s.id} zoom`).toBe('');
    }
    // Guard the guard: the seed ships real join URLs.
    expect(db.sessions.every((s) => s.zoom.startsWith('https://zoom.us/j/'))).toBe(true);
    expect(db.sessions).toHaveLength(18);
  });
});

describe('§7.4 team roster emails @g7', () => {
  it('Alex, a Team Owner, DOES see the Northline members’ emails @g7', () => {
    const out = scope(live(), learner(ALEX));

    expect(ids(out.users).sort()).toEqual([...NORTHLINE].sort());
    expect(ids(out.teams)).toEqual(['northline']);
    for (const u of out.users) expect(u.email, `${u.id} email`).not.toBe('');
    expect(userById(out, SARAH).email).toBe('sarah@northlinerealty.com');
  });

  it('Priya, an Operations Lead, DOES see them too @g7', () => {
    const out = scope(live(), learner(PRIYA));

    for (const u of out.users) expect(u.email, `${u.id} email`).not.toBe('');
    expect(userById(out, ALEX).email).toBe('alex@northlinerealty.com');
  });

  it('Sarah, a Sales Agent, does NOT see her teammates’ emails — but keeps her own @g7', () => {
    const out = scope(live(), learner(SARAH));

    expect(ids(out.users).sort()).toEqual([...NORTHLINE].sort());
    expect(userById(out, SARAH).email).toBe('sarah@northlinerealty.com');
    for (const u of out.users) if (u.id !== SARAH) expect(u.email, `${u.id} email`).toBe('');
  });

  it('blanks an email to the empty string, never to null or undefined @g7', () => {
    const out = scope(live(), learner(SARAH));
    const peer = userById(out, ALEX);

    expect(peer.email).toBe('');
    expect(typeof peer.email).toBe('string');
  });

  it('never leaks another team’s roster @g7', () => {
    const alex = scope(live(), learner(ALEX));
    const natasha = scope(live(), learner(NATASHA));

    expect(ids(alex.users)).not.toContain(NATASHA);
    expect(ids(natasha.users)).not.toContain(ALEX);
    expect(ids(natasha.teams)).toEqual(['harbor']);
  });
});

describe('§7.4 staff @g7', () => {
  it('a staff actor without viewLearners gets users: [] @g7', () => {
    const db = live();
    db.perms.Support.viewLearners = 0;

    const out = scope(db, staff(SUPPORT));

    expect(out.users).toEqual([]);
    // …and therefore no learner progress anywhere in the snapshot.
    expect(progressPaths(out, '$')).toEqual([]);
    // Everything else staff-facing is still there.
    expect(ids(out.staff)).toEqual(ids(db.staff));
    expect(out.activity).toEqual(db.activity);
  });

  it('a staff actor WITH viewLearners gets the learners @g7', () => {
    const db = live();
    expect(db.perms.Support.viewLearners).toBe(1); // the seed grants it

    const out = scope(db, staff(SUPPORT));

    expect(ids(out.users)).toEqual(ids(db.users));
  });

  it('the Owner gets everything except that base is ZERO_BASE @g7', () => {
    const db = live();
    const out = scope(db, staff(OWNER));

    const { base: outBase, ...outRest } = out;
    const { base: dbBase, ...dbRest } = db;

    expect(outRest).toEqual(dbRest);
    expect(outBase).toEqual(core.ZERO_BASE);
    // Guard the guard: the demo aggregates really were non-zero on the way in.
    expect(dbBase).not.toEqual(core.ZERO_BASE);
    expect(dbBase.learners).toBe(134);
  });

  it('the Owner keeps viewLearners even if the perms table says otherwise @g7', () => {
    const db = live();
    db.perms.Owner.viewLearners = 0; // `can()` short-circuits for the Owner role

    expect(ids(scope(db, staff(OWNER)).users)).toEqual(ids(db.users));
  });

  it('an unknown staff id receives nothing @g7', () => {
    const out = scope(live(), staff('st_nope'));

    expect(out.users).toEqual([]);
    expect(out.staff).toEqual([]);
    expect(out.modules).toEqual([]);
    expect(out.sessions).toEqual([]);
    expect(out.resources).toEqual([]);
    expect(out.base).toEqual(core.ZERO_BASE);
  });

  it('an unknown learner id receives nothing @g7', () => {
    const out = scope(live(), learner('u_nope'));

    expect(out.users).toEqual([]);
    expect(out.modules).toEqual([]);
    expect(out.tiers).toEqual([]);
    expect(out.announcements).toEqual([]);
    expect(progressPaths(out, '$')).toEqual([]);
  });
});

// =============================================================================
// The rest of §7.4, rule by rule
// =============================================================================

describe('§7.4 modules @g7', () => {
  it('ships every published and scheduled module @g7', () => {
    const db = live();
    const out = scope(db, learner(JAMIE));

    expect(ids(out.modules)).toEqual(['marketing', 'sales', 'database', 'meetings', 'finance', 'operations']);
    expect(db.modules.find((m) => m.id === 'operations')!.status).toBe('scheduled');
  });

  it('never ships a draft module to a learner @g7', () => {
    const db = withDrafts();
    const fresh = core.blankModule(7, core.DEMO_NOW).id;

    for (const id of [JAMIE, ALEX, SARAH]) {
      const out = scope(db, learner(id));
      expect(ids(out.modules), `${id} modules`).not.toContain('operations');
      expect(ids(out.modules), `${id} modules`).not.toContain(fresh);
      expect(out.modules, `${id} modules`).toHaveLength(5);
      for (const m of out.modules) expect(m.status, `${id}/${m.id}`).not.toBe('draft');
    }

    // Guard the guard: the drafts are in the input, and staff still see them.
    expect(ids(db.modules)).toContain(fresh);
    expect(ids(scope(db, staff(OWNER)).modules)).toContain(fresh);
  });

  it('keeps the prompt, files, transcript and runDemo of every ACCESSIBLE module @g7', () => {
    const db = live();
    const src = new Map(db.modules.map((m) => [m.id, m]));

    for (const id of ALL_LEARNERS) {
      const me = userById(db, id);
      const out = scope(db, learner(id));
      let kept = 0;

      for (const m of out.modules) {
        const original = src.get(m.id)!;
        if (!core.canAccess(me, original)) continue;
        kept++;
        expect(m, `${id} keeps ${m.id} untouched`).toEqual(original);
      }

      // Every learner can reach the three agent-tier modules, so blanking is never total.
      expect(kept, `${id} accessible modules`).toBeGreaterThanOrEqual(3);
    }
  });

  it('blanks exactly four fields and nothing else @g7', () => {
    const db = live();
    const out = scope(db, learner(JAMIE));

    for (const id of TEAM_ONLY_MODULES) {
      const m = out.modules.find((x) => x.id === id)!;
      const original = db.modules.find((x) => x.id === id)!;
      const { prompt: _p, files: _f, transcript: _t, runDemo: _r, ...restOut } = m;
      const { prompt: _p2, files: _f2, transcript: _t2, runDemo: _r2, ...restSrc } = original;
      expect(restOut, `${id} non-blanked fields`).toEqual(restSrc);
    }
  });

  it('blanks a populated transcript and runDemo on an inaccessible module @g7', () => {
    // The live seed's three team-tier modules happen to ship `transcript: []` and no `runDemo`, so
    // a blanking bug on either field would hide behind the fixture. Populate both first.
    const db = live();
    const finance = db.modules.find((m) => m.id === 'finance')!;
    finance.transcript = [
      [0, 'Welcome back.'],
      [42, 'Open the P&L template.'],
    ];
    finance.runDemo = { input: 'Last month’s closed deals', sections: [['Summary', 'GCI is up 12%.']] };

    const out = scope(db, learner(JAMIE)).modules.find((m) => m.id === 'finance')!;

    expect(out.transcript).toEqual([]);
    expect(out.runDemo).toBeUndefined();
    // A dropped key, not `null`: the screens read `m.runDemo &&`, and `transcript` must stay an array.
    expect('runDemo' in out).toBe(false);
    expect(Array.isArray(out.transcript)).toBe(true);

    // An accessible module keeps both untouched.
    const marketing = scope(db, learner(JAMIE)).modules.find((m) => m.id === 'marketing')!;
    const srcMarketing = db.modules.find((m) => m.id === 'marketing')!;
    expect(marketing.runDemo).toEqual(srcMarketing.runDemo);
    expect(marketing.transcript).toEqual(srcMarketing.transcript);
    expect(srcMarketing.transcript.length).toBeGreaterThan(0);
  });
});

describe('§7.4 sessions @g7', () => {
  it('ships only the viewer’s cohort, zoom blanked, for every learner @g7', () => {
    const db = live();

    for (const id of ALL_LEARNERS) {
      const me = userById(db, id);
      const out = scope(db, learner(id));
      expect(out.sessions.length, `${id} sessions`).toBeGreaterThan(0);
      for (const s of out.sessions) {
        expect(s.cohortId, `${id}/${s.id} cohort`).toBe(me.cohortId);
        expect(s.zoom, `${id}/${s.id} zoom`).toBe('');
      }
    }
  });

  it('leaves the rest of a session row alone @g7', () => {
    const db = live();
    const out = scope(db, learner(JAMIE));

    for (const s of out.sessions) {
      const original = db.sessions.find((x) => x.id === s.id)!;
      expect({ ...s, zoom: original.zoom }, `${s.id}`).toEqual(original);
    }
  });

  it('keeps the zoom URL for staff @g7', () => {
    const db = live();
    expect(scope(db, staff(OWNER)).sessions).toEqual(db.sessions);
  });
});

describe('§7.4 resources @g7', () => {
  it('ships published resources only, with no storage key @g7', () => {
    const db = withVault();
    const out = scope(db, learner(JAMIE));

    expect(ids(out.resources)).not.toContain('r_hidden');
    expect(out.resources).toHaveLength(19);
    for (const r of out.resources) {
      expect(r.status, `${r.id} status`).toBe('published');
      expect('storageKey' in r, `${r.id} storageKey key`).toBe(false);
      expect((r as StoredResource).storageKey, `${r.id} storageKey`).toBeUndefined();
    }

    // Guard the guard: the input really did carry storage keys.
    expect((db.resources as StoredResource[]).every((r) => !!r.storageKey)).toBe(true);
  });

  it('leaves every other resource field alone @g7', () => {
    const db = live();
    const out = scope(db, learner(ALEX));
    expect(out.resources).toEqual(db.resources);
  });
});

describe('§7.4 announcements @g7', () => {
  it('matches audience and requires status: sent @g7', () => {
    const db = withAnnouncements();

    // Agent tier, Agent role: `all` and `agent`, never `team`, `owners` or a scheduled one.
    expect(ids(scope(db, learner(JAMIE)).announcements)).toEqual(['a1', 'a2', 'x_agent_sent']);
    // Team tier, Team Owner: `all`, `team` and `owners`.
    expect(ids(scope(db, learner(ALEX)).announcements)).toEqual(['a1', 'a2', 'x_team_sent', 'x_owners_sent']);
    // Team tier, Sales Agent: `all` and `team`, but not `owners`.
    expect(ids(scope(db, learner(SARAH)).announcements)).toEqual(['a1', 'a2', 'x_team_sent']);
    // Team tier, Operations Lead: a lead is not an owner.
    expect(ids(scope(db, learner(PRIYA)).announcements)).toEqual(['a1', 'a2', 'x_team_sent']);

    for (const id of ALL_LEARNERS)
      for (const a of scope(db, learner(id)).announcements) expect(a.status, `${id}/${a.id}`).toBe('sent');
  });

  it('never ships the scheduled owners digest to a Team Owner @g7', () => {
    expect(ids(scope(live(), learner(ALEX)).announcements)).not.toContain('a3');
  });
});

describe('§7.4 tiers, requests and dismissals @g7', () => {
  it('ships tiers in full @g7', () => {
    const db = live();
    expect(scope(db, learner(JAMIE)).tiers).toEqual(db.tiers);
    expect(scope(db, learner(JAMIE)).tiers).toHaveLength(2);
  });

  it('ships only the viewer’s own upgrade requests @g7', () => {
    const db = live();

    expect(ids(scope(db, learner(KENJI)).requests)).toEqual(['ur1']);
    expect(scope(db, learner(JAMIE)).requests).toEqual([]);

    // Nobody receives a request filed by someone else, including the unlinked `userId: null` row.
    for (const id of ALL_LEARNERS)
      for (const q of scope(db, learner(id)).requests) expect(q.userId, `${id}/${q.id}`).toBe(id);
    expect(db.requests.some((q) => q.userId === null)).toBe(true);
  });

  it('ships only the viewer’s own dismissed keys @g7', () => {
    const db = live();
    db.dismissed = { 'u_jamie:a1': 1, 'u_alex:a1': 1, 'u_alex:a2': 1, 'u_sarah:a2': 1 };

    expect(scope(db, learner(JAMIE)).dismissed).toEqual({ 'u_jamie:a1': 1 });
    expect(scope(db, learner(ALEX)).dismissed).toEqual({ 'u_alex:a1': 1, 'u_alex:a2': 1 });
    expect(scope(db, learner(NATASHA)).dismissed).toEqual({});
  });
});

// =============================================================================
// Adversarial invariants — the ones that matter
// =============================================================================

describe('scopeSnapshot is pure @g7', () => {
  const ACTORS: Actor[] = [
    ...ALL_LEARNERS.map(learner),
    ...['st1', 'st2', 'st3', 'st4'].map(staff),
    learner('u_nope'),
    staff('st_nope'),
  ];

  it('never mutates the input db @g7', () => {
    for (const actor of ACTORS) {
      const db = withVault();
      const before = structuredClone(db);
      core.scopeSnapshot(db, actor);
      expect(db, `after scoping for ${JSON.stringify(actor)}`).toEqual(before);
    }
  });

  it('never mutates the input db when the caller then edits the result @g7', () => {
    const db = live();
    const before = structuredClone(db);
    const out = scope(db, learner(ALEX));

    out.modules.length = 0;
    out.users.forEach((u) => (u.email = 'tampered@example.com'));
    out.sessions.forEach((s) => (s.zoom = 'https://evil.example/j/1'));
    out.base.learners = 999;
    out.reminders.forEach((r) => (r.on = false));

    expect(db).toEqual(before);
    expect(core.ZERO_BASE.learners).toBe(0); // the exported constant is never handed out by reference
  });

  it('shares no array or object with the input db @g7', () => {
    const db = live();
    const out = scope(db, learner(ALEX));

    expect(out.users).not.toBe(db.users);
    expect(out.reminders).not.toBe(db.reminders);
    expect(out.tiers).not.toBe(db.tiers);
    expect(out.base).not.toBe(db.base);
    expect(out.base).not.toBe(core.ZERO_BASE);
    expect(out.users[0]).not.toBe(db.users.find((u) => u.id === out.users[0]!.id));

    const staffOut = scope(db, staff(OWNER));
    expect(staffOut.users).not.toBe(db.users);
    expect(staffOut.modules[0]).not.toBe(db.modules[0]);
  });

  it('produces deep-equal output when run twice @g7', () => {
    const db = withVault();
    for (const actor of ACTORS) {
      const a = core.scopeSnapshot(db, actor);
      const b = core.scopeSnapshot(db, actor);
      expect(a, `${JSON.stringify(actor)} run twice`).toEqual(b);
      expect(a).not.toBe(b);
    }
  });

  it('is idempotent: scoping a scoped snapshot adds nothing @g7', () => {
    const db = live();
    for (const id of [JAMIE, ALEX, SARAH]) {
      const once = scope(db, learner(id));
      expect(scope(once, learner(id)), `${id} rescoped`).toEqual(once);
    }
  });
});

describe('no learner ever receives another learner’s progress @g7', () => {
  it('walks every learner’s snapshot and finds progress only under their own record @g7', () => {
    const db = live();

    for (const id of ALL_LEARNERS) {
      const out = scope(db, learner(id));
      const self = out.users.findIndex((u) => u.id === id);
      expect(self, `${id} is in their own snapshot`).toBeGreaterThanOrEqual(0);

      // Their own progress is intact, run output and all.
      expect(out.users[self]!.progress).toEqual(userById(db, id).progress);

      // Everyone else reachable is a teammate. A learner from another team never appears at all —
      // that, not the roster's build state, is the boundary § 7.4 draws.
      const me = userById(db, id);
      for (const u of out.users) {
        if (u.id === id) continue;
        expect(me.teamId, `${id} has no team yet can see ${u.id}`).toBeTruthy();
        expect(u.teamId, `${id} can see ${u.id}, who is on another team`).toBe(me.teamId);
        // A teammate's build state is shared (Team Hub is built on it); their run output is not.
        for (const p of Object.values(u.progress)) expect(p.lastRun, `${id} sees ${u.id} run output`).toBeUndefined();
      }
    }
  });

  it('the walker has teeth: it finds the progress the unscoped db carries @g7', () => {
    const db = live();
    const found = progressPaths(db, '$');

    expect(found.length).toBeGreaterThan(20);
    expect(found).toContain('$.users[0].progress.marketing');
    expect(progressPaths(scope(db, learner(JAMIE)), '$').length).toBeLessThan(found.length);
  });

  it('does not leak a teammate’s lastRun output preview @g7', () => {
    // A sentinel, not the seed's own preview: the sales module's `runDemo` quotes that same string
    // verbatim, and the demo is content Sarah is entitled to. A substring search needs a value that
    // exists nowhere but in Alex's progress.
    const SENTINEL = 'sentinel-7f3a-alex-private-output';
    const db = live();
    userById(db, ALEX).progress['sales']!.lastRun!.preview = SENTINEL;

    // Sarah is on Alex's team, so she receives his user row — but not his build detail.
    expect(JSON.stringify(scope(db, learner(SARAH)))).not.toContain(SENTINEL);
    expect(JSON.stringify(scope(db, learner(PRIYA)))).not.toContain(SENTINEL);
    expect(JSON.stringify(scope(db, learner(NATASHA)))).not.toContain(SENTINEL);
    // Alex still sees his own, and so does staff with viewLearners.
    expect(JSON.stringify(scope(db, learner(ALEX)))).toContain(SENTINEL);
    expect(JSON.stringify(scope(db, staff(OWNER)))).toContain(SENTINEL);
  });
});

describe('scopeSnapshot is total @g7', () => {
  it('handles all three seed phases for every actor @g7', () => {
    for (const phase of ['week0', 'live', 'post'] as const) {
      const db = core.seed(phase);
      for (const id of ids(db.users)) {
        const out = scope(db, learner(id));
        expect(out.staff, `${phase}/${id}`).toEqual([]);
        expect(out.base, `${phase}/${id}`).toEqual(core.ZERO_BASE);
        expect(out.v, `${phase}/${id}`).toBe(db.v);
        expect(out.phase, `${phase}/${id}`).toBe(phase);
      }
      expect(scope(db, staff(OWNER)).base).toEqual(core.ZERO_BASE);
    }
  });

  it('survives an empty db @g7', () => {
    const empty: Db = {
      v: core.DB_V,
      cohorts: [],
      sessions: [],
      modules: [],
      users: [],
      teams: [],
      resources: [],
      announcements: [],
      dismissed: {},
      reminders: [],
      tiers: [],
      requests: [],
      staff: [],
      perms: {} as Db['perms'],
      base: core.ZERO_BASE,
      activity: [],
    };

    expect(scope(empty, learner(JAMIE)).users).toEqual([]);
    expect(scope(empty, staff(OWNER)).users).toEqual([]);
  });
});
