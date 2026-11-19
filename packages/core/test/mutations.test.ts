// Gate 2: the mutation catalog — docs/phases/02-core-domain.md §2.5, rows 1-37.
//
// Mutations are NOT in design-reference/lms-data.js (they were ported out of the prototype's
// screen logic classes), so there is no oracle to diff against. The spec's catalog table is the
// contract instead: every row gets at least one test, and every toast and error string below is
// copied from the spec verbatim, curly apostrophes and curly quotes included.
//
// `../src` (index.ts) re-exports MutationError and the mutation types but deliberately NOT the
// mutation functions — apps/web derives `MutationName = keyof typeof M` from the module, so it
// must contain nothing else. Hence the two imports.
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import * as core from '../src';
import * as M from '../src/mutations';
import type { Actor, Ctx, Outcome } from '../src/mutations';
import type { AIEmployee, Db, PermKey, StaffRole, Step } from '../src';

// ---------------------------------------------------------------------------
// Fixed world: one `now`, readable ids, a pinned viewer zone.
// ---------------------------------------------------------------------------

const NOW = Date.parse('2026-12-07T10:42:00-06:00');

/** A fresh Ctx with its own id counter, so ids are stable AND readable: `u_test_1`, `c_test_1`. */
const mkCtx = (): Ctx => {
  let n = 1;
  return { now: NOW, id: (p: string) => `${p}_test_${n++}` };
};

const learner = (userId: string): Actor => ({ kind: 'learner', userId });
const staff = (staffId: string): Actor => ({ kind: 'staff', staffId });

const JAMIE = learner('u_jamie'); // Agent tier, no team, Sales at 3 of 6
const ALEX = learner('u_alex'); // Team tier, Team Owner of Northline
const PRIYA = learner('u_priya'); // Team tier, Operations Lead
const SARAH = learner('u_sarah'); // Team tier, Sales Agent
const NATASHA = learner('u_natasha'); // Meetings deployed + paused
const DEVON = learner('u_devon'); // Sales deployed + needs_attention
const KENJI = learner('u_kenji'); // Agent tier, has an open upgrade request

const OWNER = staff('st1'); // Casey Lin, Owner — always passes
const INSTRUCTOR = staff('st2'); // Jordan Hale
const EDITOR = staff('st3'); // Maya Chen, Content Editor: curriculum 1, publish 0
const SUPPORT = staff('st4'); // Luis Romero, Support: curriculum 0, publish 0

let db: Db;
let c: Ctx;

beforeEach(() => {
  db = core.seed('live');
  c = mkCtx();
  // Several toasts run through `fmt.day`, which reads the viewer zone. Pin it so the strings are
  // the program's own Central Time wording regardless of the machine running the suite.
  core.setViewerZone('America/Chicago');
});

afterAll(() => {
  core.setViewerZone(null);
});

// ---------------------------------------------------------------------------
// Assertions used everywhere
// ---------------------------------------------------------------------------

/** Runs `fn` and proves the db handed in was not touched (§2.5: mutations are pure). */
function pure<T>(base: Db, fn: () => T): T {
  const before = structuredClone(base);
  const out = fn();
  expect(base, 'the db passed in must be unchanged').toEqual(before);
  return out;
}

function expectMutationError(
  fn: () => unknown,
  code: 'forbidden' | 'invalid' | 'not_found',
  msg?: string,
): core.MutationError {
  let err: unknown;
  try {
    fn();
  } catch (e) {
    err = e;
  }
  expect(err, 'expected a MutationError, nothing was thrown').toBeInstanceOf(core.MutationError);
  const me = err as core.MutationError;
  expect(me.code).toBe(code);
  if (msg !== undefined) expect(me.message).toBe(msg);
  return me;
}

/** The newest activity row, reduced to the three fields the catalog specifies. */
const ev0 = (d: Db) => {
  const e = d.activity[0]!;
  return { who: e.who, what: e.what, tone: e.tone };
};

const userIn = (d: Db, id: string) => d.users.find((u) => u.id === id)!;
const modIn = (d: Db, id: string) => d.modules.find((m) => m.id === id)!;
const sessIn = (d: Db, id: string) => d.sessions.find((s) => s.id === id)!;
const resIn = (d: Db, id: string) => d.resources.find((r) => r.id === id)!;

const PERM_DENIED = 'You don’t have permission to do that.';

// ---------------------------------------------------------------------------
// 1 · dismissAnnouncement
// ---------------------------------------------------------------------------

describe('1 · dismissAnnouncement @g2', () => {
  it('hides the banner for that learner only, with no toast @g2', () => {
    const out = pure(db, () => M.dismissAnnouncement(db, JAMIE, { id: 'a1' }, c));
    expect(out.db.dismissed).toEqual({ 'u_jamie:a1': 1 });
    expect(out.toast).toBeUndefined();
    expect(out.effects).toBeUndefined();
    // Nobody else is affected, and the announcement itself is untouched.
    expect(out.db.dismissed['u_alex:a1']).toBeUndefined();
    expect(out.db.announcements).toEqual(db.announcements);
  });

  it('is for learners only @g2', () => {
    expectMutationError(
      () => M.dismissAnnouncement(db, OWNER, { id: 'a1' }, c),
      'forbidden',
      'That action is for learners.',
    );
  });
});

// ---------------------------------------------------------------------------
// 2 · toggleStep
// ---------------------------------------------------------------------------

const SIX = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'] as const;

describe('2 · toggleStep @g2', () => {
  it('toggling all 6 Sales steps for u_jamie builds it, logs it and fires confetti @g2', () => {
    const before = structuredClone(db);
    // Jamie arrives at 3 of 6. Clear those three so this test really toggles all six on.
    let cur = db;
    for (const stepId of ['c1', 'c2', 'c3']) {
      cur = M.toggleStep(cur, JAMIE, { moduleId: 'sales', stepId }, c).db;
    }
    expect(core.progressOf(userIn(cur, 'u_jamie'), { id: 'sales' }).steps).toEqual([]);
    expect(userIn(cur, 'u_jamie').progress['sales']!.builtAt).toBeNull();

    let out!: Outcome;
    for (const stepId of SIX) {
      out = M.toggleStep(cur, JAMIE, { moduleId: 'sales', stepId }, c);
      cur = out.db;
    }

    // The required case, from the Gate 2 checklist. D-186 names the card instead of its place ("on the
    // right"): in the learner portal v2 the toast shows on the step player, which has no such card.
    expect(out.effects).toEqual([{ type: 'confetti' }]);
    expect(out.toast).toEqual({
      msg: 'Sales AI Employee is built. Deploy it from the Your Deployment card.',
      tone: 'success',
    });
    const p = userIn(cur, 'u_jamie').progress['sales']!;
    expect(p.steps).toEqual([...SIX]);
    expect(p.builtAt).toBe(NOW);
    expect(p.deployedAt).toBeNull();
    expect(cur.activity[0]!.what).toBe('built Sales AI Employee');
    expect(ev0(cur)).toEqual({ who: 'Jamie Ortiz', what: 'built Sales AI Employee', tone: 'success' });
    expect(userIn(cur, 'u_jamie').last).toBe(NOW);
    expect(core.buildOf(userIn(cur, 'u_jamie'), modIn(cur, 'sales'))).toEqual({
      state: 'verified',
      n: 6,
      total: 6,
    });
    // Nine mutations later, the db we started from is still the seed.
    expect(db).toEqual(before);
  });

  it('only the sixth step fires confetti; the others are silent @g2', () => {
    let cur = db;
    const outs: Outcome[] = [];
    for (const stepId of ['c4', 'c5', 'c6']) {
      const out = M.toggleStep(cur, JAMIE, { moduleId: 'sales', stepId }, c);
      outs.push(out);
      cur = out.db;
    }
    expect(outs.slice(0, 2).map((o) => [o.toast, o.effects])).toEqual([
      [undefined, undefined],
      [undefined, undefined],
    ]);
    expect(outs[2]!.effects).toEqual([{ type: 'confetti' }]);
    expect(cur.activity.filter((e) => e.what === 'built Sales AI Employee')).toHaveLength(1);
  });

  it('un-checking a step clears builtAt again @g2', () => {
    let cur = db;
    for (const stepId of ['c4', 'c5', 'c6']) cur = M.toggleStep(cur, JAMIE, { moduleId: 'sales', stepId }, c).db;
    expect(userIn(cur, 'u_jamie').progress['sales']!.builtAt).toBe(NOW);
    const out = pure(cur, () => M.toggleStep(cur, JAMIE, { moduleId: 'sales', stepId: 'c2' }, c));
    const p = userIn(out.db, 'u_jamie').progress['sales']!;
    expect(p.steps).toEqual(['c1', 'c3', 'c4', 'c5', 'c6']);
    expect(p.builtAt).toBeNull();
    expect(out.effects).toBeUndefined();
  });

  it('throws forbidden on a Team-tier employee as Jamie @g2', () => {
    // Meetings is `tier: 'team'`; Jamie is on the Agent tier.
    expect(modIn(db, 'meetings').tier).toBe('team');
    expectMutationError(
      () => M.toggleStep(db, JAMIE, { moduleId: 'meetings', stepId: 'c1' }, c),
      'forbidden',
      'Team tier required',
    );
  });

  it('refuses a scheduled employee that has not opened yet, with no write @g2', () => {
    // Operations is scheduled for Dec 14; Alex has the tier but not the calendar.
    const out = pure(db, () => M.toggleStep(db, ALEX, { moduleId: 'operations', stepId: 'c1' }, c));
    expect(out.toast).toEqual({ msg: 'Operations AI Employee opens Mon, Dec 14.', tone: 'info' });
    expect(out.db).toEqual(db);
  });

  it('locks the checklist once the employee is deployed @g2', () => {
    // Jamie's Marketing is built AND deployed, with all six steps checked.
    const out = pure(db, () => M.toggleStep(db, JAMIE, { moduleId: 'marketing', stepId: 'c1' }, c));
    expect(out.toast).toEqual({
      msg: 'This AI Employee is deployed, so its checklist is locked.',
      tone: 'info',
    });
    expect(out.db).toEqual(db);
  });

  it('creates a progress entry for an employee the learner has never opened @g2', () => {
    expect(userIn(db, 'u_jamie').progress['database']).toBeUndefined();
    const out = M.toggleStep(db, JAMIE, { moduleId: 'database', stepId: 'c1' }, c);
    expect(userIn(out.db, 'u_jamie').progress['database']).toEqual({
      steps: ['c1'],
      builtAt: null,
      deployedAt: null,
      runtime: null,
    });
  });

  it('reports an unknown employee as not_found @g2', () => {
    expectMutationError(
      () => M.toggleStep(db, JAMIE, { moduleId: 'nope', stepId: 'c1' }, c),
      'not_found',
      'No AI Employee nope',
    );
  });
});

// ---------------------------------------------------------------------------
// 3 · markDeployed
// ---------------------------------------------------------------------------

describe('3 · markDeployed @g2', () => {
  it('sets deployedAt and runtime, and logs the deploy @g2', () => {
    let cur = db;
    for (const stepId of ['c4', 'c5', 'c6']) cur = M.toggleStep(cur, JAMIE, { moduleId: 'sales', stepId }, c).db;
    const out = pure(cur, () => M.markDeployed(cur, JAMIE, { moduleId: 'sales' }, c));
    const p = userIn(out.db, 'u_jamie').progress['sales']!;
    expect(p.deployedAt).toBe(NOW);
    expect(p.runtime).toBe('deployed');
    expect(out.toast).toEqual({ msg: 'Sales AI Employee deployed', tone: 'success' });
    expect(ev0(out.db)).toEqual({ who: 'Jamie Ortiz', what: 'deployed Sales AI Employee', tone: 'success' });
    expect(core.runtimeOf(userIn(out.db, 'u_jamie'), modIn(out.db, 'sales'))).toBe('deployed');
  });

  it('throws invalid before the employee is built @g2', () => {
    // Sales sits at 3 of 6 for Jamie: in_progress, not verified.
    expect(core.buildOf(userIn(db, 'u_jamie'), modIn(db, 'sales')).state).toBe('in_progress');
    expectMutationError(
      () => M.markDeployed(db, JAMIE, { moduleId: 'sales' }, c),
      'invalid',
      'Finish all 6 steps to deploy.',
    );
    // And with nothing started at all.
    expectMutationError(() => M.markDeployed(db, JAMIE, { moduleId: 'database' }, c), 'invalid');
  });
});

// ---------------------------------------------------------------------------
// 4 · setRuntime
// ---------------------------------------------------------------------------

describe('4 · setRuntime @g2', () => {
  it('pauses a deployed employee @g2', () => {
    const out = pure(db, () => M.setRuntime(db, JAMIE, { moduleId: 'marketing', runtime: 'paused' }, c));
    expect(out.toast).toEqual({ msg: 'Marketing AI Employee paused', tone: 'success' });
    expect(userIn(out.db, 'u_jamie').progress['marketing']!.runtime).toBe('paused');
    expect(userIn(out.db, 'u_jamie').last).toBe(NOW);
  });

  it('resumes a paused employee @g2', () => {
    // Natasha's Meetings is deployed with `runtime: 'paused'`.
    expect(core.runtimeOf(userIn(db, 'u_natasha'), modIn(db, 'meetings'))).toBe('paused');
    const out = pure(db, () => M.setRuntime(db, NATASHA, { moduleId: 'meetings', runtime: 'deployed' }, c));
    expect(out.toast).toEqual({ msg: 'Meetings AI Employee resumed', tone: 'success' });
    expect(userIn(out.db, 'u_natasha').progress['meetings']!.runtime).toBe('deployed');
  });

  it('reconnecting from needs_attention clears the stored issue @g2', () => {
    // Devon's Sales is deployed with `runtime: 'needs_attention'` and an issue string.
    expect(userIn(db, 'u_devon').progress['sales']!.issue).toBe('CRM webhook stopped responding');
    const out = pure(db, () => M.setRuntime(db, DEVON, { moduleId: 'sales', runtime: 'deployed' }, c));
    expect(out.toast).toEqual({ msg: 'Reconnected. Test run passed.', tone: 'success' });
    const p = userIn(out.db, 'u_devon').progress['sales']!;
    expect(p.runtime).toBe('deployed');
    expect(p.issue).toBeUndefined();
    expect('issue' in p).toBe(false);
  });

  it('throws invalid when the employee was never deployed @g2', () => {
    expectMutationError(
      () => M.setRuntime(db, JAMIE, { moduleId: 'sales', runtime: 'paused' }, c),
      'invalid',
      'Mark it deployed before changing its runtime.',
    );
  });
});

// ---------------------------------------------------------------------------
// 5 · recordRun
// ---------------------------------------------------------------------------

describe('5 · recordRun @g2', () => {
  it('stores the last run on the deployment card, with no toast @g2', () => {
    const args = {
      moduleId: 'marketing',
      title: 'Listing Launch Packet · 77 Birch Rd',
      preview: 'A corner lot with mature oaks…',
    };
    const out = pure(db, () => M.recordRun(db, JAMIE, args, c));
    expect(userIn(out.db, 'u_jamie').progress['marketing']!.lastRun).toEqual({
      at: NOW,
      title: args.title,
      preview: args.preview,
    });
    expect(out.toast).toBeUndefined();
    expect(userIn(out.db, 'u_jamie').last).toBe(NOW);
  });

  it('records a run on an employee with no progress entry yet @g2', () => {
    const out = M.recordRun(db, JAMIE, { moduleId: 'database', title: 'T', preview: 'P' }, c);
    expect(userIn(out.db, 'u_jamie').progress['database']).toEqual({
      steps: [],
      builtAt: null,
      deployedAt: null,
      runtime: null,
      lastRun: { at: NOW, title: 'T', preview: 'P' },
    });
  });
});

// ---------------------------------------------------------------------------
// 6 · requestUpgrade
// ---------------------------------------------------------------------------

describe('6 · requestUpgrade @g2', () => {
  it('files a new request and logs it as a warning @g2', () => {
    const out = pure(db, () => M.requestUpgrade(db, JAMIE, { source: 'Team tier page' }, c));
    expect(out.toast).toEqual({
      msg: 'Consultation requested. We’ll reach out within 1 business day.',
      tone: 'success',
    });
    expect(out.db.requests[0]).toEqual({
      id: 'ur_test_1',
      userId: 'u_jamie',
      name: 'Jamie Ortiz',
      email: 'jamie@ortizhomes.com',
      source: 'Team tier page',
      at: NOW,
      status: 'new',
    });
    expect(out.db.requests).toHaveLength(db.requests.length + 1);
    expect(ev0(out.db)).toEqual({
      who: 'Jamie Ortiz',
      what: 'requested a Team tier upgrade',
      tone: 'warn',
    });
  });

  it('is a no-op while an open request exists @g2', () => {
    // Kenji already has `ur1` at status 'new'.
    const out = pure(db, () => M.requestUpgrade(db, KENJI, { source: 'Executive Build Vault' }, c));
    expect(out.toast).toEqual({
      msg: 'Your consultation request is in. We’ll reach out within 1 business day.',
      tone: 'info',
    });
    expect(out.db).toEqual(db);
  });

  it('treats a contacted request as still open @g2', () => {
    const out = M.requestUpgrade(db, learner('u_rosa'), { source: 'Portal Upgrade' }, c);
    expect(out.toast!.tone).toBe('info');
    expect(out.db.requests).toHaveLength(db.requests.length);
  });

  it('throws forbidden for a Team-tier learner @g2', () => {
    expectMutationError(
      () => M.requestUpgrade(db, ALEX, { source: 'Portal Upgrade' }, c),
      'forbidden',
      'Team tier learners have nothing to upgrade.',
    );
  });
});

// ---------------------------------------------------------------------------
// 7 · downloadResource
// ---------------------------------------------------------------------------

describe('7 · downloadResource @g2', () => {
  it('counts the download @g2', () => {
    const before = resIn(db, 'r1').dl;
    const out = pure(db, () => M.downloadResource(db, JAMIE, { id: 'r1' }, c));
    expect(resIn(out.db, 'r1').dl).toBe(before + 1);
    expect(out.toast).toEqual({ msg: 'Downloaded Fair Housing Language Checker', tone: 'success' });
  });

  it('lets a Team-tier learner take a Team-only resource @g2', () => {
    const out = M.downloadResource(db, ALEX, { id: 'r9' }, c);
    expect(out.toast).toEqual({ msg: 'Downloaded Sisu Closed-Deal Export to Claude', tone: 'success' });
    expect(resIn(out.db, 'r9').dl).toBe(resIn(db, 'r9').dl + 1);
  });

  it('throws forbidden for an Agent-tier learner on a Team-only resource @g2', () => {
    expectMutationError(() => M.downloadResource(db, JAMIE, { id: 'r9' }, c), 'forbidden', 'Team tier required');
  });
});

// ---------------------------------------------------------------------------
// 8 · inviteMember — all four error strings plus the success path
// ---------------------------------------------------------------------------

describe('8 · inviteMember @g2', () => {
  it('adds a seat with status invited, a toast, an email effect and an activity row @g2', () => {
    const out = pure(db, () =>
      M.inviteMember(db, ALEX, { email: ' jo.hale@northlinerealty.com ', role: 'Sales Agent' }, c),
    );
    expect(out.error).toBeUndefined();
    const added = out.db.users[out.db.users.length - 1]!;
    expect(added).toEqual({
      id: 'u_test_1',
      name: 'Jo Hale', // derived from the local part: `jo.hale` → `Jo Hale`
      email: 'jo.hale@northlinerealty.com', // trimmed
      tier: 'team',
      role: 'Sales Agent',
      teamId: 'northline',
      cohortId: 'dec26',
      joined: NOW,
      last: null,
      status: 'invited',
      progress: {},
    });
    expect(out.toast).toEqual({ msg: 'Invite sent to jo.hale@northlinerealty.com', tone: 'success' });
    expect(out.effects).toEqual([
      {
        type: 'email',
        template: 'team-invite',
        to: ['jo.hale@northlinerealty.com'],
        data: { team: 'Northline Realty Team', inviter: 'Alex Morgan' },
      },
    ]);
    expect(ev0(out.db)).toEqual({
      who: 'Alex Morgan',
      what: 'invited Jo Hale to Northline Realty Team',
      tone: 'info',
    });
  });

  it('prefers an explicit name over the email-derived one @g2', () => {
    const out = M.inviteMember(
      db,
      ALEX,
      { email: 'jo.hale@northlinerealty.com', name: '  Josephine Hale  ', role: 'Sales Agent' },
      c,
    );
    expect(out.db.users[out.db.users.length - 1]!.name).toBe('Josephine Hale');
  });

  it('error 1/4 · rejects a malformed address @g2', () => {
    const out = pure(db, () => M.inviteMember(db, ALEX, { email: 'not-an-email', role: 'Sales Agent' }, c));
    expect(out.error).toBe('Enter a valid email address.');
    expect(out.db).toEqual(db);
    expect(out.toast).toBeUndefined();
  });

  it('error 2/4 · rejects someone already on the team, case-insensitively @g2', () => {
    const out = pure(db, () =>
      M.inviteMember(db, ALEX, { email: 'PRIYA@northlinerealty.com', role: 'Sales Agent' }, c),
    );
    expect(out.error).toBe('That person is already on your team.');
    expect(out.db).toEqual(db);
  });

  it('error 3/4 · rejects an invite once every seat is assigned @g2', () => {
    // Northline has 7 seats and 6 members. One more invite fills it.
    expect(db.users.filter((u) => u.teamId === 'northline')).toHaveLength(6);
    const filled = M.inviteMember(db, ALEX, { email: 'seat7@northlinerealty.com', role: 'Sales Agent' }, c).db;
    expect(filled.users.filter((u) => u.teamId === 'northline')).toHaveLength(7);
    const out = pure(filled, () =>
      M.inviteMember(filled, ALEX, { email: 'seat8@northlinerealty.com', role: 'Sales Agent' }, mkCtx()),
    );
    expect(out.error).toBe('All seats are assigned. Remove a seat or contact us to add more.');
    expect(out.db).toEqual(filled);
  });

  it('error 4/4 · rejects a role whose plan cap is already met @g2', () => {
    // Priya is the one Operations Lead the plan includes.
    const out = pure(db, () => M.inviteMember(db, ALEX, { email: 'ops2@northlinerealty.com', role: 'Operations Lead' }, c));
    expect(out.error).toBe('Your plan includes 1 Operations Lead.');
    expect(out.db).toEqual(db);
    // Alex is the one Team Owner.
    expect(M.inviteMember(db, ALEX, { email: 'owner2@northlinerealty.com', role: 'Team Owner' }, c).error).toBe(
      'Your plan includes 1 Team Owner.',
    );
  });

  it('error 4/4 · the Sales Agent cap is the plan’s seats, so the seat count is what stops a full team (D-120) @g2', () => {
    // Widened to nine seats with Priya as operations lead: 9 - owner - operations lead = 7 agents.
    const wide = core.seed('live');
    wide.teams.find((t) => t.id === 'northline')!.seats = 9;
    expect(core.seatCaps(wide, wide.teams.find((t) => t.id === 'northline')!)['Sales Agent']).toBe(7);
    let cur = wide;
    for (let i = 5; i <= 7; i += 1) {
      const out = M.inviteMember(cur, ALEX, { email: `agent${i}@northlinerealty.com`, role: 'Sales Agent' }, mkCtx());
      expect(out.error, `agent ${i}`).toBeUndefined();
      cur = out.db;
    }
    expect(cur.users.filter((u) => u.teamId === 'northline' && u.role === 'Sales Agent')).toHaveLength(7);
    expect(M.inviteMember(cur, ALEX, { email: 'agent8@northlinerealty.com', role: 'Sales Agent' }, mkCtx()).error).toBe(
      'All seats are assigned. Remove a seat or contact us to add more.',
    );
  });

  it('lets the operations lead invite too, but not a sales agent or a teamless learner @g2', () => {
    expect(
      M.inviteMember(db, PRIYA, { email: 'from.ops@northlinerealty.com', role: 'Sales Agent' }, c).error,
    ).toBeUndefined();
    expectMutationError(
      () => M.inviteMember(db, SARAH, { email: 'x@northlinerealty.com', role: 'Sales Agent' }, c),
      'forbidden',
      'Only the team owner or operations lead can invite.',
    );
    expectMutationError(
      () => M.inviteMember(db, JAMIE, { email: 'x@ortizhomes.com', role: 'Sales Agent' }, c),
      'forbidden',
      'Only the team owner or operations lead can invite.',
    );
  });
});

// ---------------------------------------------------------------------------
// 9 · remindMembers
// ---------------------------------------------------------------------------

describe('9 · remindMembers @g2', () => {
  it('stamps reminded on each member and pluralizes both strings @g2', () => {
    const out = pure(db, () => M.remindMembers(db, ALEX, { userIds: ['u_michael', 'u_lena'] }, c));
    expect(out.toast).toEqual({ msg: 'Reminder sent to 2 members by email and in-app', tone: 'success' });
    expect(ev0(out.db)).toEqual({
      who: 'Alex Morgan',
      what: 'sent build reminders to 2 team members',
      tone: 'info',
    });
    expect(userIn(out.db, 'u_michael').reminded).toBe(NOW);
    expect(userIn(out.db, 'u_lena').reminded).toBe(NOW);
    expect(userIn(out.db, 'u_sarah').reminded).toBeUndefined();
  });

  it('uses the singular for one member @g2', () => {
    const out = M.remindMembers(db, ALEX, { userIds: ['u_lena'] }, c);
    expect(out.toast).toEqual({ msg: 'Reminder sent to 1 member by email and in-app', tone: 'success' });
    expect(ev0(out.db).what).toBe('sent build reminders to 1 team member');
  });

  it('throws forbidden for a sales agent, and for a member of another team @g2', () => {
    expectMutationError(
      () => M.remindMembers(db, SARAH, { userIds: ['u_lena'] }, c),
      'forbidden',
      'Only the team owner or operations lead can remind.',
    );
    expectMutationError(
      () => M.remindMembers(db, ALEX, { userIds: ['u_claire'] }, c),
      'forbidden',
      'That person is not on your team.',
    );
  });
});

// ---------------------------------------------------------------------------
// 10 · setMemberRole
// ---------------------------------------------------------------------------

describe('10 · setMemberRole @g2', () => {
  it('changes a seat role @g2', () => {
    const out = pure(db, () => M.setMemberRole(db, ALEX, { userId: 'u_michael', role: 'Operations Lead' }, c));
    expect(out.toast).toEqual({ msg: 'Michael Grant is now Operations Lead', tone: 'success' });
    expect(userIn(out.db, 'u_michael').role).toBe('Operations Lead');
    expect(out.db.activity).toEqual(db.activity); // the catalog logs nothing for this row
  });

  it('refuses to change the team owner’s own role @g2', () => {
    expectMutationError(
      () => M.setMemberRole(db, ALEX, { userId: 'u_alex', role: 'Sales Agent' }, c),
      'forbidden',
      'The team owner’s role can’t be changed.',
    );
  });

  it('is the owner’s call, not the operations lead’s @g2', () => {
    expectMutationError(
      () => M.setMemberRole(db, PRIYA, { userId: 'u_michael', role: 'Sales Agent' }, c),
      'forbidden',
      'Only the team owner can change roles.',
    );
  });
});

// ---------------------------------------------------------------------------
// 11 · removeMember
// ---------------------------------------------------------------------------

describe('11 · removeMember @g2', () => {
  it('frees the seat and logs the removal @g2', () => {
    const out = pure(db, () => M.removeMember(db, ALEX, { userId: 'u_lena' }, c));
    expect(out.toast).toEqual({ msg: 'Lena Brooks removed. 1 seat freed.', tone: 'success' });
    expect(out.db.users.find((u) => u.id === 'u_lena')).toBeUndefined();
    expect(out.db.users).toHaveLength(db.users.length - 1);
    expect(ev0(out.db)).toEqual({
      who: 'Alex Morgan',
      what: 'removed Lena Brooks from Northline Realty Team',
      tone: 'info',
    });
  });

  it('refuses the owner’s own seat, and a sales agent asking @g2', () => {
    expectMutationError(
      () => M.removeMember(db, ALEX, { userId: 'u_alex' }, c),
      'forbidden',
      'You can’t remove your own seat.',
    );
    expectMutationError(
      () => M.removeMember(db, SARAH, { userId: 'u_lena' }, c),
      'forbidden',
      'Only the team owner can remove a member.',
    );
  });
});

// ---------------------------------------------------------------------------
// 12 · nudgeLearners
// ---------------------------------------------------------------------------

describe('12 · nudgeLearners @g2', () => {
  it('nudges one learner by name, with no activity row @g2', () => {
    const out = pure(db, () => M.nudgeLearners(db, OWNER, { userIds: ['u_omar'] }, c));
    expect(out.toast).toEqual({ msg: 'Nudge sent to Omar Haddad', tone: 'success' });
    expect(userIn(out.db, 'u_omar').nudged).toBe(NOW);
    expect(out.db.activity).toEqual(db.activity);
  });

  it('nudges a group by count, and logs it @g2', () => {
    const out = M.nudgeLearners(db, OWNER, { userIds: ['u_omar', 'u_lena', 'u_ben'] }, c);
    expect(out.toast).toEqual({ msg: 'Nudge sent to 3 learners', tone: 'success' });
    expect(ev0(out.db)).toEqual({ who: 'Casey Lin', what: 'nudged 3 inactive learners', tone: 'info' });
  });
});

// ---------------------------------------------------------------------------
// 13 · moveModule
// ---------------------------------------------------------------------------

describe('13 · moveModule @g2', () => {
  const orders = (d: Db) =>
    d.modules
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((m) => m.id);

  it('swaps with the next neighbour and renumbers order 1..n, with no toast @g2', () => {
    expect(orders(db)).toEqual(['marketing', 'sales', 'database', 'meetings', 'finance', 'operations']);
    const out = pure(db, () => M.moveModule(db, OWNER, { id: 'sales', dir: 1 }, c));
    expect(orders(out.db)).toEqual(['marketing', 'database', 'sales', 'meetings', 'finance', 'operations']);
    expect(
      out.db.modules
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((m) => m.order),
    ).toEqual([1, 2, 3, 4, 5, 6]);
    expect(out.toast).toBeUndefined();
  });

  it('swaps with the previous neighbour @g2', () => {
    const out = M.moveModule(db, OWNER, { id: 'database', dir: -1 }, c);
    expect(orders(out.db)).toEqual(['marketing', 'database', 'sales', 'meetings', 'finance', 'operations']);
  });

  it('does nothing at either end @g2', () => {
    expect(M.moveModule(db, OWNER, { id: 'marketing', dir: -1 }, c).db).toEqual(db);
    expect(M.moveModule(db, OWNER, { id: 'operations', dir: 1 }, c).db).toEqual(db);
  });
});

// ---------------------------------------------------------------------------
// 14 · setModuleTier
// ---------------------------------------------------------------------------

describe('14 · setModuleTier @g2', () => {
  it('includes a Team-only employee in the Agent tier @g2', () => {
    const out = pure(db, () => M.setModuleTier(db, OWNER, { id: 'meetings', tier: 'agent' }, c));
    expect(out.toast).toEqual({ msg: 'Meetings AI Employee now included in Agent Tier', tone: 'success' });
    expect(modIn(out.db, 'meetings').tier).toBe('agent');
    expect(core.canAccess(userIn(out.db, 'u_jamie'), modIn(out.db, 'meetings'))).toBe(true);
  });

  it('gates an Agent employee to the Team tier @g2', () => {
    const out = M.setModuleTier(db, OWNER, { id: 'sales', tier: 'team' }, c);
    expect(out.toast).toEqual({ msg: 'Sales AI Employee is now Team Tier only', tone: 'success' });
    expect(modIn(out.db, 'sales').tier).toBe('team');
  });
});

// ---------------------------------------------------------------------------
// 15 · publishModule / 16 · unpublishModule
// ---------------------------------------------------------------------------

describe('15 · publishModule @g2', () => {
  it('publishes a scheduled employee, clears opens and logs it @g2', () => {
    expect(modIn(db, 'operations')).toMatchObject({ status: 'scheduled' });
    expect(modIn(db, 'operations').opens).not.toBeNull();
    const out = pure(db, () => M.publishModule(db, OWNER, { id: 'operations' }, c));
    expect(out.toast).toEqual({ msg: 'Operations AI Employee is live in the learner portal', tone: 'success' });
    expect(modIn(out.db, 'operations').status).toBe('published');
    expect(modIn(out.db, 'operations').opens).toBeNull();
    expect(ev0(out.db)).toEqual({ who: 'Casey Lin', what: 'published Operations AI Employee', tone: 'info' });
    expect(core.isOpen(modIn(out.db, 'operations'), NOW)).toBe(true);
  });

  it('throws forbidden for Support, which has no publish permission @g2', () => {
    expect(db.perms.Support.publish).toBe(0);
    expectMutationError(() => M.publishModule(db, SUPPORT, { id: 'operations' }, c), 'forbidden', PERM_DENIED);
  });
});

describe('16 · unpublishModule @g2', () => {
  it('sends an employee back to draft and leaves opens alone @g2', () => {
    const out = pure(db, () => M.unpublishModule(db, OWNER, { id: 'sales' }, c));
    expect(out.toast).toEqual({
      msg: 'Sales AI Employee unpublished. Learners no longer see it.',
      tone: 'success',
    });
    expect(modIn(out.db, 'sales').status).toBe('draft');
    expect(modIn(out.db, 'sales').opens).toBe(modIn(db, 'sales').opens);
    expect(core.visibleModules(out.db).map((m) => m.id)).not.toContain('sales');
  });
});

// ---------------------------------------------------------------------------
// 17 · saveModule
// ---------------------------------------------------------------------------

const draftOf = (over: Partial<AIEmployee> = {}): AIEmployee => ({
  ...core.blankModule(7, NOW),
  id: 'm_new',
  ...over,
});

const steps6 = (mins: number[]): Step[] =>
  core.blankModule(7, NOW).checklist.map((s, i) => ({ ...s, id: `zz${i + 1}`, mins: mins[i]! }));

const publishable = (): AIEmployee =>
  draftOf({
    id: 'm_concierge',
    name: 'Concierge AI Employee',
    short: '   ',
    outcome: 'Every inbound buyer gets a personal reply in under five minutes.',
    outputs: ['A first reply', 'Three qualifying questions', 'A CRM note'],
    prompt:
      '# Role\nYou are the Concierge AI Employee for {{TEAM_NAME}}.\n\n# Rules\n- Reply within five minutes.\n- Follow the Fair Housing Act in every output.\n',
    checklist: steps6([4, 6, 8, 10, 12, 14]),
  });

describe('17 · saveModule @g2', () => {
  it('saves a draft: renumbers steps c1..c6, sums build and defaults short @g2', () => {
    const draft = publishable();
    const snapshot = structuredClone(draft);
    const out = pure(db, () => M.saveModule(db, OWNER, { draft }, c));
    expect(out.error).toBeUndefined();
    expect(out.toast).toEqual({ msg: 'Concierge AI Employee saved', tone: 'success' });
    const saved = modIn(out.db, 'm_concierge');
    expect(saved.checklist.map((s) => s.id)).toEqual(['c1', 'c2', 'c3', 'c4', 'c5', 'c6']);
    expect(saved.build).toBe(54); // 4+6+8+10+12+14
    expect(saved.short).toBe('Concierge'); // name minus ' AI Employee'
    expect(saved.status).toBe('draft');
    expect(out.db.modules).toHaveLength(db.modules.length + 1);
    expect(out.db.activity).toEqual(db.activity); // saving a draft logs nothing
    // The builder's deep copy: the caller's object is never touched, and shares no references.
    expect(draft).toEqual(snapshot);
    expect(saved).not.toBe(draft);
    expect(saved.checklist).not.toBe(draft.checklist);
  });

  it('publishes a draft, clears opens and logs it @g2', () => {
    const out = M.saveModule(db, OWNER, { draft: publishable(), status: 'published' }, c);
    expect(out.toast).toEqual({
      msg: 'Concierge AI Employee is live in the learner portal',
      tone: 'success',
    });
    expect(modIn(out.db, 'm_concierge').status).toBe('published');
    expect(modIn(out.db, 'm_concierge').opens).toBeNull();
    expect(ev0(out.db)).toEqual({ who: 'Casey Lin', what: 'published Concierge AI Employee', tone: 'info' });
  });

  it('upserts an existing employee in place @g2', () => {
    const edited: AIEmployee = { ...structuredClone(modIn(db, 'sales')), name: 'Speed to Lead AI Employee' };
    const out = M.saveModule(db, OWNER, { draft: edited }, c);
    expect(out.db.modules).toHaveLength(db.modules.length);
    expect(out.db.modules.findIndex((m) => m.id === 'sales')).toBe(db.modules.findIndex((m) => m.id === 'sales'));
    expect(modIn(out.db, 'sales').name).toBe('Speed to Lead AI Employee');
    expect(out.toast).toEqual({ msg: 'Speed to Lead AI Employee saved', tone: 'success' });
  });

  it('requires a name even for a draft @g2', () => {
    const out = pure(db, () => M.saveModule(db, OWNER, { draft: draftOf({ name: '   ' }) }, c));
    expect(out.error).toBe('Give the AI Employee a name.');
    expect(out.db).toEqual(db);
  });

  it('reports every publish-time validation failure, newline-joined and in order @g2', () => {
    const bad = draftOf({
      name: '',
      outcome: '  ',
      outputs: ['', '', ''],
      prompt: 'too short to publish',
      checklist: steps6([1, 1, 1, 1, 1, 1]).map((s) => ({ ...s, text: '' })),
    });
    const out = pure(db, () => M.saveModule(db, OWNER, { draft: bad, status: 'published' }, c));
    expect(out.error).toBe(
      [
        'Give the AI Employee a name.',
        'Add the outcome line. Learners see it under the title.',
        'Add all three outputs.',
        'The system prompt is too short to publish.',
        'Give all six build steps a title.',
      ].join('\n'),
    );
    expect(out.db).toEqual(db);
  });

  it('does not run publish-time validation when saving a draft @g2', () => {
    // The blank module has no outcome and no outputs, yet saves fine as a draft.
    const out = M.saveModule(db, OWNER, { draft: draftOf() }, c);
    expect(out.error).toBeUndefined();
    expect(modIn(out.db, 'm_new').status).toBe('draft');
  });

  it('needs publish permission on top of curriculum to publish @g2', () => {
    expect(db.perms['Content Editor'].curriculum).toBe(1);
    expect(db.perms['Content Editor'].publish).toBe(0);
    // Curriculum alone is enough for a draft save…
    expect(M.saveModule(db, EDITOR, { draft: publishable() }, c).error).toBeUndefined();
    // …but not to publish.
    expectMutationError(
      () => M.saveModule(db, EDITOR, { draft: publishable(), status: 'published' }, c),
      'forbidden',
      PERM_DENIED,
    );
  });
});

// ---------------------------------------------------------------------------
// 18 · deleteModule
// ---------------------------------------------------------------------------

describe('18 · deleteModule @g2', () => {
  it('deletes a draft @g2', () => {
    const drafted = M.unpublishModule(db, OWNER, { id: 'finance' }, c).db;
    const out = pure(drafted, () => M.deleteModule(drafted, OWNER, { id: 'finance' }, mkCtx()));
    expect(out.toast).toEqual({ msg: 'Finance AI Employee deleted', tone: 'success' });
    expect(out.db.modules.map((m) => m.id)).not.toContain('finance');
    expect(out.db.modules).toHaveLength(db.modules.length - 1);
  });

  it('refuses anything that is not a draft @g2', () => {
    expectMutationError(
      () => M.deleteModule(db, OWNER, { id: 'sales' }, c),
      'invalid',
      'Only drafts can be deleted. Unpublish it first.',
    );
  });
});

// ---------------------------------------------------------------------------
// 19 · createCohort
// ---------------------------------------------------------------------------

describe('19 · createCohort @g2', () => {
  // April 2027 starts Tue Apr 6; + 63 days is Tue Jun 8, so the Tuesday search exits at once.
  const T0 = Date.parse('2027-06-08T13:00:00-06:00');
  const OFFSETS = [0, 2, 7, 9, 14, 16];
  const TITLES = [
    'The Autonomous Agent',
    'Speed to Lead',
    'The Living Database',
    'The Meeting That Runs Itself',
    'Numbers on Autopilot',
    'Contract to Close',
  ];

  it('creates a draft cohort plus its 6 sessions @g2', () => {
    const out = pure(db, () => M.createCohort(db, OWNER, {}, c));
    expect(out.toast).toEqual({ msg: 'Draft cohort created with 6 sessions', tone: 'success' });
    expect(out.db.cohorts).toHaveLength(4);
    expect(out.db.cohorts[3]).toEqual({
      id: 'c_test_1',
      name: 'June 2027',
      start: T0,
      end: T0 + 16 * 86400000 + 75 * 60000,
      status: 'draft',
      capacity: 200,
      enrolled: 0,
      cadence: 'Tue & Thu · 1:00 PM CT',
    });

    const made = out.db.sessions.filter((s) => s.cohortId === 'c_test_1');
    expect(made).toHaveLength(6);
    expect(made.map((s) => s.id)).toEqual([1, 2, 3, 4, 5, 6].map((n) => `c_test_1-s${n}`));
    expect(made.map((s) => s.title)).toEqual(TITLES);
    expect(made.map((s) => s.start)).toEqual(OFFSETS.map((o) => T0 + o * 86400000));
    expect(made.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6]);
    for (const s of made) {
      expect(s.mins).toBe(75);
      expect(s).toMatchObject({ live: false, attended: null, replay: null, views: 0 });
    }
    // The reference reads `d.cohorts.length` AFTER the push, so the new cohort counts: 4 × 97.
    expect(made.map((s) => s.zoom)).toEqual(
      [0, 1, 2, 3, 4, 5].map((i) => `https://zoom.us/j/${8841200610 + i * 1371 + 4 * 97}`),
    );
    // Every start keeps the same wall clock as the cohort it was scheduled from. That reads as
    // 2:00 PM CT, not 1:00 PM: the seed's `T` helper hardcodes the -06:00 standard-time offset, so
    // every cohort inside Daylight Saving sits an hour later than its `cadence` label claims. The
    // reference's own April 2027 cohort does exactly the same, so the port is faithful here.
    const from = core.fmt.timeOnly(db.cohorts.find((x) => x.id === 'apr27')!.start);
    expect(from).toBe('2:00 PM CT');
    expect(made.map((s) => core.fmt.timeOnly(s.start))).toEqual(Array(6).fill(from));
  });
});

// ---------------------------------------------------------------------------
// 20 · openEnrollment
// ---------------------------------------------------------------------------

describe('20 · openEnrollment @g2', () => {
  it('opens a draft cohort @g2', () => {
    const out = pure(db, () => M.openEnrollment(db, OWNER, { cohortId: 'apr27' }, c));
    expect(out.toast).toEqual({ msg: 'April 2027 is open for enrollment', tone: 'success' });
    expect(out.db.cohorts.find((x) => x.id === 'apr27')!.status).toBe('enrolling');
  });

  it('refuses a cohort that is not a draft @g2', () => {
    expectMutationError(
      () => M.openEnrollment(db, OWNER, { cohortId: 'dec26' }, c),
      'invalid',
      'Only a draft cohort can open for enrollment.',
    );
    expectMutationError(() => M.openEnrollment(db, OWNER, { cohortId: 'nope' }, c), 'not_found', 'No cohort nope');
  });
});

// ---------------------------------------------------------------------------
// 21 · goLive
// ---------------------------------------------------------------------------

describe('21 · goLive @g2', () => {
  it('turns the Join button on and logs the start @g2', () => {
    const out = pure(db, () => M.goLive(db, OWNER, { sessionId: 'dec26-s3' }, c));
    expect(out.toast).toEqual({ msg: 'Session 3 is live. Learners see “Join Now.”', tone: 'success' });
    expect(sessIn(out.db, 'dec26-s3').live).toBe(true);
    expect(ev0(out.db)).toEqual({
      who: 'Casey Lin',
      what: 'started Session 3 · The Living Database',
      tone: 'success',
    });
    expect(core.joinMode(sessIn(out.db, 'dec26-s3'), NOW)).toBe('live');
  });
});

// ---------------------------------------------------------------------------
// 22 · endSession
// ---------------------------------------------------------------------------

describe('22 · endSession @g2', () => {
  it('clamps the start, sets attendance at 78% and queues the replay @g2', () => {
    const s = sessIn(db, 'dec26-s3');
    const out = pure(db, () => M.endSession(db, OWNER, { sessionId: 'dec26-s3' }, c));
    const after = sessIn(out.db, 'dec26-s3');
    expect(out.toast).toEqual({ msg: 'Session 3 ended. Replay is processing.', tone: 'success' });
    expect(after.live).toBe(false);
    expect(after.replay).toBe('processing');
    // The session was scheduled for Dec 9, after `now`, so the start is clamped back.
    expect(after.start).toBe(NOW - s.mins * 60000);
    // 134 baseline + 14 modeled, none invited → round(148 × 0.78) = 115.
    expect(db.base.learners + db.users.filter((u) => u.status !== 'invited').length).toBe(148);
    expect(after.attended).toBe(115);
    expect(ev0(out.db)).toEqual({
      who: 'Casey Lin',
      what: 'ended Session 3 · The Living Database',
      tone: 'info',
    });
  });

  it('leaves an already-past start alone @g2', () => {
    const out = M.endSession(db, OWNER, { sessionId: 'dec26-s1' }, c);
    expect(sessIn(out.db, 'dec26-s1').start).toBe(sessIn(db, 'dec26-s1').start);
  });
});

// ---------------------------------------------------------------------------
// 23 · publishReplay
// ---------------------------------------------------------------------------

describe('23 · publishReplay @g2', () => {
  it('readies the replay and gives the linked employee a duration @g2', () => {
    expect(modIn(db, 'database').session).toBe(3);
    expect(modIn(db, 'database').dur).toBe(0);
    const out = pure(db, () => M.publishReplay(db, OWNER, { sessionId: 'dec26-s3' }, c));
    expect(out.toast).toEqual({ msg: 'Session 3 replay published to learners', tone: 'success' });
    expect(sessIn(out.db, 'dec26-s3')).toMatchObject({ replay: 'ready', views: 0 });
    expect(modIn(out.db, 'database').dur).toBe(75 * 60 - 300);
    expect(ev0(out.db)).toEqual({
      who: 'Casey Lin',
      what: 'published the Session 3 replay',
      tone: 'info',
    });
  });

  it('accepts an explicit duration, and never overwrites one @g2', () => {
    expect(M.publishReplay(db, OWNER, { sessionId: 'dec26-s3', durationSec: 3999 }, c).db.modules).toContainEqual(
      expect.objectContaining({ id: 'database', dur: 3999 }),
    );
    // Session 1's Marketing employee already has `dur: 3504`.
    const out = M.publishReplay(db, OWNER, { sessionId: 'dec26-s1', durationSec: 11 }, c);
    expect(modIn(out.db, 'marketing').dur).toBe(3504);
  });
});

// ---------------------------------------------------------------------------
// 24 · updateSession
// ---------------------------------------------------------------------------

describe('24 · updateSession @g2', () => {
  it('reads date and time as Central Time and logs the new title @g2', () => {
    const args = {
      id: 'dec26-s3',
      title: 'The Living Database, Deeper',
      date: '2026-12-10',
      time: '14:30',
      mins: 90,
      zoom: 'https://zoom.us/j/9998887776',
    };
    const out = pure(db, () => M.updateSession(db, OWNER, args, c));
    expect(out.toast).toEqual({ msg: 'Session 3 updated. Learners will be notified.', tone: 'success' });
    const after = sessIn(out.db, 'dec26-s3');
    expect(after.start).toBe(Date.parse('2026-12-10T14:30:00-06:00'));
    expect(after).toMatchObject({ title: args.title, mins: 90, zoom: args.zoom });
    expect(ev0(out.db)).toEqual({
      who: 'Casey Lin',
      what: 'updated Session 3 · The Living Database, Deeper',
      tone: 'info',
    });
  });

  it('keeps the old start and mins when the inputs are unusable @g2', () => {
    const s = sessIn(db, 'dec26-s3');
    const out = M.updateSession(
      db,
      OWNER,
      { id: 'dec26-s3', title: s.title, date: 'not-a-date', time: '', mins: 'abc', zoom: s.zoom },
      c,
    );
    expect(sessIn(out.db, 'dec26-s3').start).toBe(s.start);
    expect(sessIn(out.db, 'dec26-s3').mins).toBe(s.mins);
  });
});

// ---------------------------------------------------------------------------
// 25 · setLearnerTier
// ---------------------------------------------------------------------------

describe('25 · setLearnerTier @g2', () => {
  it('upgrades a learner and creates their team @g2', () => {
    const out = pure(db, () => M.setLearnerTier(db, OWNER, { userId: 'u_kenji', tier: 'team' }, c));
    expect(out.toast).toEqual({
      msg: 'Kenji Watanabe upgraded. Team modules unlocked in their portal.',
      tone: 'success',
    });
    expect(userIn(out.db, 'u_kenji')).toMatchObject({ tier: 'team', role: 'Team Owner', teamId: 't_u_kenji' });
    expect(out.db.teams.find((t) => t.id === 't_u_kenji')).toEqual({
      id: 't_u_kenji',
      name: 'Watanabe Team',
      ownerId: 'u_kenji',
      seats: 7,
    });
    expect(ev0(out.db)).toEqual({
      who: 'Casey Lin',
      what: 'upgraded Kenji Watanabe to Team Tier',
      tone: 'success',
    });
  });

  it('downgrades a learner and drops their team @g2', () => {
    const out = pure(db, () => M.setLearnerTier(db, OWNER, { userId: 'u_alex', tier: 'agent' }, c));
    expect(out.toast).toEqual({ msg: 'Alex Morgan moved to Agent Tier', tone: 'success' });
    expect(userIn(out.db, 'u_alex')).toMatchObject({ tier: 'agent', role: 'Agent', teamId: null });
    expect(ev0(out.db)).toEqual({ who: 'Casey Lin', what: 'moved Alex Morgan to Agent Tier', tone: 'info' });
  });
});

// ---------------------------------------------------------------------------
// 26 · uploadResource
// ---------------------------------------------------------------------------

describe('26 · uploadResource @g2', () => {
  const base = { cat: core.CATEGORIES[1]!, type: 'Prompt pack', tier: 'agent' as const, file: 'scripts.json' };

  it('unshifts the resource and logs it with curly quotes @g2', () => {
    const out = pure(db, () =>
      M.uploadResource(db, OWNER, { ...base, title: '  Open House Scripts  ', desc: ' Five touches. ' }, c),
    );
    expect(out.toast).toEqual({ msg: 'Open House Scripts published to the vault', tone: 'success' });
    expect(out.db.resources[0]).toEqual({
      id: 'r_test_1',
      title: 'Open House Scripts',
      desc: 'Five touches.',
      cat: core.CATEGORIES[1],
      type: 'Prompt pack',
      tier: 'agent',
      size: '12 KB',
      dl: 0,
      updated: NOW,
      exec: false,
      status: 'published',
    });
    expect(ev0(out.db)).toEqual({
      who: 'Casey Lin',
      what: 'added “Open House Scripts” to the Resource Vault',
      tone: 'info',
    });
  });

  it('forces Team access and the exec flag for an executive category @g2', () => {
    const out = M.uploadResource(
      db,
      OWNER,
      { ...base, cat: core.EXEC_CATEGORIES[0]!, tier: 'agent', title: 'Scorecard SOP' },
      c,
    );
    expect(out.db.resources[0]).toMatchObject({ tier: 'team', exec: true });
  });

  it('sizes a PDF guide differently, and defaults the description @g2', () => {
    const out = M.uploadResource(db, OWNER, { ...base, type: 'PDF guide', title: 'MLS Rules' }, c);
    expect(out.db.resources[0]).toMatchObject({ size: '1.1 MB', desc: 'New resource' });
  });

  it('returns its two inline errors @g2', () => {
    const noTitle = pure(db, () => M.uploadResource(db, OWNER, { ...base, title: '  ' }, c));
    expect(noTitle.error).toBe('Add a title.');
    expect(noTitle.db).toEqual(db);
    const noFile = pure(db, () => M.uploadResource(db, OWNER, { ...base, title: 'X', file: null }, c));
    expect(noFile.error).toBe('Attach a file first.');
    expect(noFile.db).toEqual(db);
  });
});

// ---------------------------------------------------------------------------
// 27 · setResourceTier
// ---------------------------------------------------------------------------

describe('27 · setResourceTier @g2', () => {
  it('toggles an Agent resource to Team only @g2', () => {
    const out = pure(db, () => M.setResourceTier(db, OWNER, { id: 'r1' }, c));
    expect(out.toast).toEqual({ msg: 'Fair Housing Language Checker: Team only', tone: 'success' });
    expect(resIn(out.db, 'r1').tier).toBe('team');
  });

  it('toggles a Team resource back to Agent + Team @g2', () => {
    const out = M.setResourceTier(db, OWNER, { id: 'r9' }, c);
    expect(out.toast).toEqual({ msg: 'Sisu Closed-Deal Export to Claude: Agent + Team', tone: 'success' });
    expect(resIn(out.db, 'r9').tier).toBe('agent');
  });

  it('will not change an Executive Vault item @g2', () => {
    const out = pure(db, () => M.setResourceTier(db, OWNER, { id: 'x1' }, c));
    expect(out.toast).toEqual({ msg: 'Executive Vault items are Team only', tone: 'info' });
    expect(out.db).toEqual(db);
  });
});

// ---------------------------------------------------------------------------
// 28 · setResourceStatus
// ---------------------------------------------------------------------------

describe('28 · setResourceStatus @g2', () => {
  it('hides, then re-publishes @g2', () => {
    const hidden = pure(db, () => M.setResourceStatus(db, OWNER, { id: 'r1' }, c));
    expect(hidden.toast).toEqual({ msg: 'Fair Housing Language Checker hidden from learners', tone: 'success' });
    expect(resIn(hidden.db, 'r1').status).toBe('hidden');
    const shown = M.setResourceStatus(hidden.db, OWNER, { id: 'r1' }, c);
    expect(shown.toast).toEqual({ msg: 'Fair Housing Language Checker published', tone: 'success' });
    expect(resIn(shown.db, 'r1').status).toBe('published');
  });
});

// ---------------------------------------------------------------------------
// 29 · deleteResource
// ---------------------------------------------------------------------------

describe('29 · deleteResource @g2', () => {
  it('removes the row @g2', () => {
    const out = pure(db, () => M.deleteResource(db, OWNER, { id: 'r1' }, c));
    expect(out.toast).toEqual({ msg: 'Fair Housing Language Checker deleted', tone: 'success' });
    expect(out.db.resources.map((r) => r.id)).not.toContain('r1');
    expect(out.db.resources).toHaveLength(db.resources.length - 1);
  });

  it('reports an unknown id @g2', () => {
    expectMutationError(() => M.deleteResource(db, OWNER, { id: 'nope' }, c), 'not_found', 'No resource nope');
  });
});

// ---------------------------------------------------------------------------
// 30 · sendAnnouncement
// ---------------------------------------------------------------------------

describe('30 · sendAnnouncement @g2', () => {
  const base = {
    title: 'Session 4 prep',
    body: 'Bring a recent listing and your CRM login.',
    audience: 'all' as const,
    inapp: true,
    email: true,
    when: 'now' as const,
  };

  it('sends now, counts the audience and logs it @g2', () => {
    const out = pure(db, () => M.sendAnnouncement(db, OWNER, base, c));
    expect(out.toast).toEqual({
      msg: 'Sent to 148 learners. The banner is live on their dashboards.',
      tone: 'success',
    });
    expect(out.db.announcements[0]).toEqual({
      id: 'a_test_1',
      title: 'Session 4 prep',
      body: 'Bring a recent listing and your CRM login.',
      audience: 'all',
      channels: ['inapp', 'email'],
      severity: 'info',
      action: null,
      actionLabel: '',
      status: 'sent',
      at: NOW,
      opens: 0,
    });
    expect(ev0(out.db)).toEqual({ who: 'Casey Lin', what: 'sent “Session 4 prep”', tone: 'info' });
  });

  it('drops the banner sentence when only email is checked @g2', () => {
    const out = M.sendAnnouncement(db, OWNER, { ...base, inapp: false }, c);
    expect(out.toast).toEqual({ msg: 'Sent to 148 learners', tone: 'success' });
    expect(out.db.announcements[0]!.channels).toEqual(['email']);
  });

  it('counts each audience from the baseline plus the modeled learners @g2', () => {
    expect(M.sendAnnouncement(db, OWNER, { ...base, audience: 'agent' }, c).toast!.msg).toBe(
      'Sent to 104 learners. The banner is live on their dashboards.',
    );
    expect(M.sendAnnouncement(db, OWNER, { ...base, audience: 'team' }, c).toast!.msg).toBe(
      'Sent to 44 learners. The banner is live on their dashboards.',
    );
    expect(M.sendAnnouncement(db, OWNER, { ...base, audience: 'owners' }, c).toast!.msg).toBe(
      'Sent to 7 team owners. The banner is live on their dashboards.',
    );
  });

  it('schedules for a Central Time instant @g2', () => {
    const out = M.sendAnnouncement(db, OWNER, { ...base, when: 'later', at: '2026-12-11T08:00' }, c);
    expect(out.toast).toEqual({ msg: 'Scheduled for Fri, Dec 11', tone: 'success' });
    expect(out.db.announcements[0]).toMatchObject({
      status: 'scheduled',
      at: Date.parse('2026-12-11T08:00:00-06:00'),
      opens: null,
    });
    expect(ev0(out.db).what).toBe('scheduled “Session 4 prep”');
  });

  it('carries severity and the action label @g2', () => {
    const out = M.sendAnnouncement(db, OWNER, { ...base, severity: 'warning', action: 'calendar' }, c);
    expect(out.db.announcements[0]).toMatchObject({
      severity: 'warning',
      action: 'calendar',
      actionLabel: 'Update Calendar',
    });
    const none = M.sendAnnouncement(db, OWNER, { ...base, action: '' }, c);
    expect(none.db.announcements[0]).toMatchObject({ action: null, actionLabel: '' });
  });

  it('returns its two inline errors @g2', () => {
    const blank = pure(db, () => M.sendAnnouncement(db, OWNER, { ...base, body: '  ' }, c));
    expect(blank.error).toBe('Add a title and a message.');
    expect(blank.db).toEqual(db);
    const noChannel = pure(db, () => M.sendAnnouncement(db, OWNER, { ...base, inapp: false, email: false }, c));
    expect(noChannel.error).toBe('Pick at least one channel.');
    expect(noChannel.db).toEqual(db);
  });
});

// ---------------------------------------------------------------------------
// 31 · toggleReminder
// ---------------------------------------------------------------------------

describe('31 · toggleReminder @g2', () => {
  it('turns an off reminder on @g2', () => {
    expect(db.reminders.find((r) => r.id === 'rm5')!.on).toBe(false);
    const out = pure(db, () => M.toggleReminder(db, OWNER, { id: 'rm5' }, c));
    expect(out.toast).toEqual({ msg: 'Weekly progress digest for team owners: on', tone: 'info' });
    expect(out.db.reminders.find((r) => r.id === 'rm5')!.on).toBe(true);
  });

  it('turns an on reminder off @g2', () => {
    const out = M.toggleReminder(db, OWNER, { id: 'rm1' }, c);
    expect(out.toast).toEqual({ msg: '24 hours before each live session: off', tone: 'info' });
    expect(out.db.reminders.find((r) => r.id === 'rm1')!.on).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 32 · setTierPrice
// ---------------------------------------------------------------------------

describe('32 · setTierPrice @g2', () => {
  it('sets a positive price, with no toast @g2', () => {
    const out = pure(db, () => M.setTierPrice(db, OWNER, { tierId: 'team', price: 5495 }, c));
    expect(out.db.tiers.find((t) => t.id === 'team')!.price).toBe(5495);
    expect(out.toast).toBeUndefined();
    expect(core.fmt.money(5495)).toBe('$5,495');
  });

  it('ignores a non-positive price @g2', () => {
    for (const price of [0, -1, NaN]) {
      const out = pure(db, () => M.setTierPrice(db, OWNER, { tierId: 'team', price }, c));
      expect(out.db).toEqual(db);
      expect(out.toast).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// 33 · setRequestStatus
// ---------------------------------------------------------------------------

describe('33 · setRequestStatus @g2', () => {
  it('converted upgrades Kenji to a Team Owner with a new team t_u_kenji @g2', () => {
    const out = pure(db, () => M.setRequestStatus(db, OWNER, { id: 'ur1', status: 'converted' }, c));
    expect(out.toast).toEqual({
      msg: 'Kenji Watanabe is on Team Tier. All six AI Employees are unlocked in their portal.',
      tone: 'success',
    });
    expect(out.db.requests.find((q) => q.id === 'ur1')!.status).toBe('converted');
    expect(userIn(out.db, 'u_kenji')).toMatchObject({
      tier: 'team',
      role: 'Team Owner',
      teamId: 't_u_kenji',
    });
    expect(out.db.teams.find((t) => t.id === 't_u_kenji')).toEqual({
      id: 't_u_kenji',
      name: 'Watanabe Team',
      ownerId: 'u_kenji',
      seats: 7,
    });
    expect(ev0(out.db)).toEqual({
      who: 'Casey Lin',
      what: 'upgraded Kenji Watanabe to Team Tier',
      tone: 'success',
    });
    // All six AI Employees are now reachable for him.
    for (const m of out.db.modules) expect(core.canAccess(userIn(out.db, 'u_kenji'), m)).toBe(true);
  });

  it('marks contacted, closes, and stays quiet for new @g2', () => {
    const contacted = pure(db, () => M.setRequestStatus(db, OWNER, { id: 'ur1', status: 'contacted' }, c));
    expect(contacted.toast).toEqual({ msg: 'Kenji Watanabe marked as contacted', tone: 'success' });
    expect(contacted.db.requests.find((q) => q.id === 'ur1')!.status).toBe('contacted');
    expect(contacted.db.activity).toEqual(db.activity);

    const closed = M.setRequestStatus(db, OWNER, { id: 'ur2', status: 'closed' }, c);
    expect(closed.toast).toEqual({ msg: 'Request closed', tone: 'info' });

    const reopened = M.setRequestStatus(db, OWNER, { id: 'ur2', status: 'new' }, c);
    expect(reopened.toast).toBeUndefined();
    expect(reopened.db.requests.find((q) => q.id === 'ur2')!.status).toBe('new');
  });

  it('refuses to convert a request with no learner account @g2', () => {
    expect(db.requests.find((q) => q.id === 'ur3')!.userId).toBeNull();
    expectMutationError(
      () => M.setRequestStatus(db, OWNER, { id: 'ur3', status: 'converted' }, c),
      'invalid',
      'This request has no learner account to upgrade.',
    );
  });
});

// ---------------------------------------------------------------------------
// 34 · inviteStaff
// ---------------------------------------------------------------------------

describe('34 · inviteStaff @g2', () => {
  it('adds a staff row with a name derived from the email @g2', () => {
    const out = pure(db, () => M.inviteStaff(db, OWNER, { email: ' dana_wu@amplifiedimpact.com ', role: 'Admin' }, c));
    expect(out.toast).toEqual({ msg: 'Invite sent to dana_wu@amplifiedimpact.com', tone: 'success' });
    expect(out.db.staff[out.db.staff.length - 1]).toEqual({
      id: 'st_test_1',
      name: 'Dana Wu',
      email: 'dana_wu@amplifiedimpact.com',
      role: 'Admin',
      last: null,
    });
    expect(core.can(out.db, staff('st_test_1'), 'billing')).toBe(true);
  });

  it('returns its two inline errors @g2', () => {
    const bad = pure(db, () => M.inviteStaff(db, OWNER, { email: 'dana@', role: 'Admin' }, c));
    expect(bad.error).toBe('Enter a valid email address.');
    expect(bad.db).toEqual(db);
    const dup = pure(db, () => M.inviteStaff(db, OWNER, { email: 'CASEY@amplifiedimpact.com', role: 'Admin' }, c));
    expect(dup.error).toBe('That person is already on staff.');
    expect(dup.db).toEqual(db);
  });
});

// ---------------------------------------------------------------------------
// 35 · setStaffRole
// ---------------------------------------------------------------------------

describe('35 · setStaffRole @g2', () => {
  it('changes a staff role @g2', () => {
    const out = pure(db, () => M.setStaffRole(db, OWNER, { id: 'st2', role: 'Admin' }, c));
    expect(out.toast).toEqual({ msg: 'Jordan Hale is now Admin', tone: 'success' });
    expect(out.db.staff.find((s) => s.id === 'st2')!.role).toBe('Admin');
  });

  it('leaves the Owner’s role fixed @g2', () => {
    expectMutationError(
      () => M.setStaffRole(db, OWNER, { id: 'st1', role: 'Support' }, c),
      'forbidden',
      'The owner’s role is fixed.',
    );
  });
});

// ---------------------------------------------------------------------------
// 36 · removeStaff
// ---------------------------------------------------------------------------

describe('36 · removeStaff @g2', () => {
  it('removes a staff member @g2', () => {
    const out = pure(db, () => M.removeStaff(db, OWNER, { id: 'st4' }, c));
    expect(out.toast).toEqual({ msg: 'Luis Romero removed', tone: 'success' });
    expect(out.db.staff.map((s) => s.id)).not.toContain('st4');
  });

  it('refuses the Owner with an info toast rather than a throw @g2', () => {
    const out = pure(db, () => M.removeStaff(db, OWNER, { id: 'st1' }, c));
    expect(out.toast).toEqual({ msg: 'The owner can’t be removed', tone: 'info' });
    expect(out.db).toEqual(db);
  });
});

// ---------------------------------------------------------------------------
// 37 · togglePermission
// ---------------------------------------------------------------------------

describe('37 · togglePermission @g2', () => {
  it('turns a permission on, using the PERMS label @g2', () => {
    expect(db.perms.Support.publish).toBe(0);
    const out = pure(db, () => M.togglePermission(db, OWNER, { role: 'Support', perm: 'publish' }, c));
    expect(out.toast).toEqual({ msg: 'Support: Publish modules on', tone: 'info' });
    expect(out.db.perms.Support.publish).toBe(1);
    expect(core.can(out.db, SUPPORT, 'publish')).toBe(true);
  });

  it('turns a permission off @g2', () => {
    const out = M.togglePermission(db, OWNER, { role: 'Support', perm: 'viewLearners' }, c);
    expect(out.toast).toEqual({ msg: 'Support: View learners off', tone: 'info' });
    expect(out.db.perms.Support.viewLearners).toBe(0);
    expect(core.can(out.db, SUPPORT, 'viewLearners')).toBe(false);
  });

  it('leaves the Owner column fixed @g2', () => {
    expectMutationError(
      () => M.togglePermission(db, OWNER, { role: 'Owner', perm: 'staff' }, c),
      'forbidden',
      'Owner permissions are fixed.',
    );
  });
});

// ---------------------------------------------------------------------------
// The staff permission matrix: STAFF_ROLES × every staff mutation
// ---------------------------------------------------------------------------

interface StaffCall {
  row: number;
  name: string;
  perm: PermKey;
  call: (d: Db, a: Actor, ctx: Ctx) => Outcome;
}

/** seed('live') has no Admin, and no draft module for deleteModule. Both are added here. */
function matrixDb(): Db {
  const d = core.seed('live');
  d.staff.push({ id: 'st_admin', name: 'Dana Admin', email: 'dana@amplifiedimpact.com', role: 'Admin', last: null });
  d.modules.push({ ...core.blankModule(7, NOW), id: 'm_draft', name: 'Draft AI Employee', status: 'draft' });
  return d;
}

const STAFF_BY_ROLE: Record<StaffRole, string> = {
  Owner: 'st1',
  Admin: 'st_admin',
  Instructor: 'st2',
  'Content Editor': 'st3',
  Support: 'st4',
};

const STAFF_CALLS: StaffCall[] = [
  { row: 12, name: 'nudgeLearners', perm: 'viewLearners', call: (d, a, x) => M.nudgeLearners(d, a, { userIds: ['u_omar'] }, x) },
  { row: 13, name: 'moveModule', perm: 'curriculum', call: (d, a, x) => M.moveModule(d, a, { id: 'sales', dir: 1 }, x) },
  { row: 14, name: 'setModuleTier', perm: 'curriculum', call: (d, a, x) => M.setModuleTier(d, a, { id: 'meetings', tier: 'agent' }, x) },
  { row: 15, name: 'publishModule', perm: 'publish', call: (d, a, x) => M.publishModule(d, a, { id: 'operations' }, x) },
  { row: 16, name: 'unpublishModule', perm: 'publish', call: (d, a, x) => M.unpublishModule(d, a, { id: 'sales' }, x) },
  { row: 17, name: 'saveModule', perm: 'curriculum', call: (d, a, x) => M.saveModule(d, a, { draft: publishable() }, x) },
  { row: 18, name: 'deleteModule', perm: 'curriculum', call: (d, a, x) => M.deleteModule(d, a, { id: 'm_draft' }, x) },
  { row: 19, name: 'createCohort', perm: 'cohorts', call: (d, a, x) => M.createCohort(d, a, {}, x) },
  { row: 20, name: 'openEnrollment', perm: 'cohorts', call: (d, a, x) => M.openEnrollment(d, a, { cohortId: 'apr27' }, x) },
  { row: 21, name: 'goLive', perm: 'cohorts', call: (d, a, x) => M.goLive(d, a, { sessionId: 'dec26-s3' }, x) },
  { row: 22, name: 'endSession', perm: 'cohorts', call: (d, a, x) => M.endSession(d, a, { sessionId: 'dec26-s3' }, x) },
  { row: 23, name: 'publishReplay', perm: 'cohorts', call: (d, a, x) => M.publishReplay(d, a, { sessionId: 'dec26-s3' }, x) },
  {
    row: 24,
    name: 'updateSession',
    perm: 'cohorts',
    call: (d, a, x) =>
      M.updateSession(d, a, { id: 'dec26-s3', title: 'T', date: '2026-12-10', time: '13:00', mins: 75, zoom: 'z' }, x),
  },
  { row: 25, name: 'setLearnerTier', perm: 'seats', call: (d, a, x) => M.setLearnerTier(d, a, { userId: 'u_kenji', tier: 'team' }, x) },
  {
    row: 26,
    name: 'uploadResource',
    perm: 'curriculum',
    call: (d, a, x) =>
      M.uploadResource(d, a, { title: 'Matrix Doc', cat: core.CATEGORIES[0]!, type: 'PDF guide', tier: 'agent', file: 'm.pdf' }, x),
  },
  { row: 27, name: 'setResourceTier', perm: 'curriculum', call: (d, a, x) => M.setResourceTier(d, a, { id: 'r1' }, x) },
  { row: 28, name: 'setResourceStatus', perm: 'curriculum', call: (d, a, x) => M.setResourceStatus(d, a, { id: 'r1' }, x) },
  { row: 29, name: 'deleteResource', perm: 'curriculum', call: (d, a, x) => M.deleteResource(d, a, { id: 'r1' }, x) },
  {
    row: 30,
    name: 'sendAnnouncement',
    perm: 'announce',
    call: (d, a, x) =>
      M.sendAnnouncement(d, a, { title: 'T', body: 'B', audience: 'all', inapp: true, email: false, when: 'now' }, x),
  },
  { row: 31, name: 'toggleReminder', perm: 'announce', call: (d, a, x) => M.toggleReminder(d, a, { id: 'rm1' }, x) },
  { row: 32, name: 'setTierPrice', perm: 'billing', call: (d, a, x) => M.setTierPrice(d, a, { tierId: 'team', price: 5495 }, x) },
  { row: 33, name: 'setRequestStatus', perm: 'billing', call: (d, a, x) => M.setRequestStatus(d, a, { id: 'ur2', status: 'contacted' }, x) },
  { row: 34, name: 'inviteStaff', perm: 'staff', call: (d, a, x) => M.inviteStaff(d, a, { email: 'new@amplifiedimpact.com', role: 'Support' }, x) },
  { row: 35, name: 'setStaffRole', perm: 'staff', call: (d, a, x) => M.setStaffRole(d, a, { id: 'st2', role: 'Admin' }, x) },
  { row: 36, name: 'removeStaff', perm: 'staff', call: (d, a, x) => M.removeStaff(d, a, { id: 'st4' }, x) },
  { row: 37, name: 'togglePermission', perm: 'staff', call: (d, a, x) => M.togglePermission(d, a, { role: 'Support', perm: 'publish' }, x) },
];

describe('staff permission matrix @g2', () => {
  it('covers every staff mutation in the catalog @g2', () => {
    expect(STAFF_CALLS).toHaveLength(26);
    expect(new Set(STAFF_CALLS.map((s) => s.name)).size).toBe(26);
    for (const s of STAFF_CALLS) expect(typeof (M as Record<string, unknown>)[s.name]).toBe('function');
  });

  for (const role of core.STAFF_ROLES) {
    for (const sc of STAFF_CALLS) {
      const allowed = role === 'Owner' || core.seed('live').perms[role][sc.perm] === 1;
      it(`${role} ${allowed ? 'may' : 'may not'} ${sc.name} (row ${sc.row}, ${sc.perm}) @g2`, () => {
        const d = matrixDb();
        const actor = staff(STAFF_BY_ROLE[role]!);
        expect(core.can(d, actor, sc.perm)).toBe(allowed);
        if (allowed) {
          const out = pure(d, () => sc.call(d, actor, mkCtx()));
          expect(out.error, `${sc.name} should not have returned an inline error`).toBeUndefined();
        } else {
          expectMutationError(() => sc.call(d, actor, mkCtx()), 'forbidden', PERM_DENIED);
        }
      });
    }
  }

  it('Support cannot publishModule but the Owner can @g2', () => {
    const d = matrixDb();
    expectMutationError(() => M.publishModule(d, SUPPORT, { id: 'operations' }, c), 'forbidden', PERM_DENIED);
    expect(M.publishModule(d, OWNER, { id: 'operations' }, c).toast!.tone).toBe('success');
  });

  it('the Owner passes every permission regardless of the perms matrix @g2', () => {
    // Even with the Owner row zeroed out, `can` short-circuits on the role.
    const zeroed = core.seed('live');
    for (const [perm] of core.PERMS) zeroed.perms.Owner[perm] = 0;
    for (const [perm] of core.PERMS) expect(core.can(zeroed, OWNER, perm)).toBe(true);
    expect(M.togglePermission(zeroed, OWNER, { role: 'Support', perm: 'staff' }, c).toast!.tone).toBe('info');
  });

  it('a learner actor never satisfies a staff permission @g2', () => {
    for (const p of core.PERMS) expect(core.can(db, JAMIE, p[0])).toBe(false);
    expectMutationError(() => M.publishModule(db, JAMIE, { id: 'operations' }, c), 'forbidden', PERM_DENIED);
  });

  it('an unknown staff id is forbidden, not not_found @g2', () => {
    expectMutationError(() => M.publishModule(db, staff('st_ghost'), { id: 'operations' }, c), 'forbidden', PERM_DENIED);
  });

  it('a staff actor cannot run a learner mutation, and vice versa @g2', () => {
    expectMutationError(() => M.toggleStep(db, OWNER, { moduleId: 'sales', stepId: 'c1' }, c), 'forbidden', 'That action is for learners.');
    expectMutationError(() => M.removeMember(db, OWNER, { userId: 'u_lena' }, c), 'forbidden', 'That action is for learners.');
    // The Instructor holds viewLearners and cohorts, but not seats or staff.
    expectMutationError(() => M.setLearnerTier(db, INSTRUCTOR, { userId: 'u_kenji', tier: 'team' }, c), 'forbidden', PERM_DENIED);
    expectMutationError(() => M.inviteStaff(db, INSTRUCTOR, { email: 'x@amplifiedimpact.com', role: 'Support' }, c), 'forbidden', PERM_DENIED);
    expect(M.nudgeLearners(db, INSTRUCTOR, { userIds: ['u_omar'] }, c).toast!.tone).toBe('success');
  });
});

// ---------------------------------------------------------------------------
// Determinism: same inputs + same Ctx → deep-equal output
// ---------------------------------------------------------------------------

describe('determinism @g2', () => {
  const twice = <T>(fn: (ctx: Ctx) => T): [T, T] => [fn(mkCtx()), fn(mkCtx())];

  it('ids, activity ids and timestamps are reproducible @g2', () => {
    const cases: [string, (ctx: Ctx) => Outcome][] = [
      ['inviteMember', (x) => M.inviteMember(core.seed('live'), ALEX, { email: 'jo@northlinerealty.com', role: 'Sales Agent' }, x)],
      ['requestUpgrade', (x) => M.requestUpgrade(core.seed('live'), JAMIE, { source: 'Team tier page' }, x)],
      ['createCohort', (x) => M.createCohort(core.seed('live'), OWNER, {}, x)],
      [
        'sendAnnouncement',
        (x) =>
          M.sendAnnouncement(
            core.seed('live'),
            OWNER,
            { title: 'T', body: 'B', audience: 'all', inapp: true, email: true, when: 'now' },
            x,
          ),
      ],
      ['uploadResource', (x) => M.uploadResource(core.seed('live'), OWNER, { title: 'U', cat: core.CATEGORIES[0]!, type: 'PDF guide', tier: 'agent', file: 'f.pdf' }, x)],
      ['inviteStaff', (x) => M.inviteStaff(core.seed('live'), OWNER, { email: 'dana@amplifiedimpact.com', role: 'Admin' }, x)],
      ['setLearnerTier', (x) => M.setLearnerTier(core.seed('live'), OWNER, { userId: 'u_kenji', tier: 'team' }, x)],
      ['goLive', (x) => M.goLive(core.seed('live'), OWNER, { sessionId: 'dec26-s3' }, x)],
      ['endSession', (x) => M.endSession(core.seed('live'), OWNER, { sessionId: 'dec26-s3' }, x)],
      ['setRequestStatus', (x) => M.setRequestStatus(core.seed('live'), OWNER, { id: 'ur1', status: 'converted' }, x)],
    ];
    for (const [name, fn] of cases) {
      const [a, b] = twice(fn);
      expect(b, `${name} is not deterministic`).toEqual(a);
    }
  });

  it('a whole build-and-deploy run replays identically @g2', () => {
    const run = (ctx: Ctx): Outcome => {
      let cur = core.seed('live');
      for (const stepId of ['c4', 'c5', 'c6']) cur = M.toggleStep(cur, JAMIE, { moduleId: 'sales', stepId }, ctx).db;
      return M.markDeployed(cur, JAMIE, { moduleId: 'sales' }, ctx);
    };
    const [a, b] = twice(run);
    expect(b).toEqual(a);
    expect(b.db.activity.map((e) => e.id)).toEqual(a.db.activity.map((e) => e.id));
    // No Math.random anywhere: the generated activity ids are a function of t, who and what.
    expect(a.db.activity[0]!.id).toMatch(/^ev\d+[0-9a-z]{1,4}$/);
  });

  it('the activity feed is newest-first and capped at 40 @g2', () => {
    let cur = db;
    for (let i = 0; i < 45; i++) {
      cur = M.goLive(cur, OWNER, { sessionId: `dec26-s${(i % 6) + 1}` }, { now: NOW + i, id: mkCtx().id }).db;
    }
    expect(cur.activity).toHaveLength(40);
    const ts = cur.activity.map((e) => e.t);
    expect(ts).toEqual([...ts].sort((x, y) => y - x));
    expect(cur.activity[0]!.t).toBe(NOW + 44);
  });
});

// ---------------------------------------------------------------------------
// Coverage guard: the catalog is 37 rows, so the module must export 37 mutations
// ---------------------------------------------------------------------------

/** §2.5's catalog, row 1 through row 37, in the order the table lists them. */
const ROWS: readonly string[] = [
  'dismissAnnouncement', // 1
  'toggleStep', // 2
  'toggleChecklistItem', // 2b
  'setPref', // 2c
  'saveVideoProgress', // 2d
  'markDeployed', // 3
  'setRuntime', // 4
  'recordRun', // 5
  'requestUpgrade', // 6
  'downloadResource', // 7
  'inviteMember', // 8
  'remindMembers', // 9
  'setMemberRole', // 10
  'removeMember', // 11
  'nudgeLearners', // 12
  'moveModule', // 13
  'setModuleTier', // 14
  'publishModule', // 15
  'unpublishModule', // 16
  'saveModule', // 17
  'deleteModule', // 18
  'createCohort', // 19
  'openEnrollment', // 20
  'goLive', // 21
  'endSession', // 22
  'publishReplay', // 23
  'updateSession', // 24
  'setLearnerTier', // 25
  'uploadResource', // 26
  'setResourceTier', // 27
  'setResourceStatus', // 28
  'deleteResource', // 29
  'sendAnnouncement', // 30
  'toggleReminder', // 31
  'setTierPrice', // 32
  'setRequestStatus', // 33
  'inviteStaff', // 34
  'setStaffRole', // 35
  'removeStaff', // 36
  'togglePermission', // 37
];

describe('catalog coverage @g2', () => {
  it('the 37-row catalog is fully exported and callable @g2', () => {
    expect(ROWS).toHaveLength(40);
    expect(new Set(ROWS).size).toBe(40);
    const mod = M as unknown as Record<string, unknown>;
    const missing = ROWS.filter((n) => typeof mod[n] !== 'function');
    expect(missing, 'mutations dropped by the port').toEqual([]);
    // Every mutation takes (db, actor, args, ctx).
    for (const n of ROWS) expect((mod[n] as (...a: unknown[]) => unknown).length, n).toBe(4);
  });

  it('exports at least 37 callable mutations and nothing stray @g2', () => {
    const mod = M as unknown as Record<string, unknown>;
    const callable = Object.keys(mod).filter((k) => typeof mod[k] === 'function' && k !== 'MutationError');
    expect(callable.length).toBeGreaterThanOrEqual(37);
    // Anything callable that is not a catalog row would be an un-tested public mutation.
    expect(callable.filter((k) => !ROWS.includes(k))).toEqual([]);
  });

  it('MutationError is re-exported from the package index @g2', () => {
    expect(core.MutationError).toBe(M.MutationError);
    const e = new core.MutationError('invalid', 'nope');
    expect(e).toBeInstanceOf(Error);
    expect([e.name, e.code, e.message]).toEqual(['MutationError', 'invalid', 'nope']);
  });
});
