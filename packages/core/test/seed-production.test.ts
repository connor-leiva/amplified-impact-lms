// § 9.5's launch seed. The test the phase file actually names is "test that it contains no `u_*`
// demo users" — but that one string is a weak version of the real requirement, so this suite
// checks the general property instead: nothing invented reaches a production database.
//
// The failure being guarded against is not abstract. Every demo learner has a plausible address at
// a plausible domain, and `remindMembers` and `nudgeLearners` send real email to whatever is in
// the users table. A production database seeded with the demo roster is one admin click away from
// mailing fourteen strangers.
import { describe, it, expect } from 'vitest';
import { PERMS, STAFF_ROLES, ZERO_BASE, canAccess, seed, seedForDatabase, seedProduction } from '../src/index';
import type { Db } from '../src/index';

const OWNER = { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' };
const prod = (): Db => seedProduction({ owner: OWNER });

describe('§9.5 seedProduction @g9', () => {
  it('carries the six things the phase file names, and nothing more @g9', () => {
    const db = prod();
    // Content: present.
    expect(db.tiers).toHaveLength(seed('live').tiers.length);
    expect(db.modules).toHaveLength(6);
    expect(db.reminders.length).toBeGreaterThan(0);
    expect(Object.keys(db.perms).sort()).toEqual([...STAFF_ROLES].sort());
    expect(db.staff).toHaveLength(1);
    expect(db.cohorts).toHaveLength(1);
    expect(db.sessions.length).toBeGreaterThan(0);

    // Data: absent. Each of these is either demo fiction or something an admin creates (§ 9.5
    // steps 2 and 3), and an empty array is the only correct starting value.
    expect(db.users).toEqual([]);
    expect(db.teams).toEqual([]);
    expect(db.resources).toEqual([]);
    expect(db.announcements).toEqual([]);
    expect(db.requests).toEqual([]);
    expect(db.activity).toEqual([]);
    expect(db.dismissed).toEqual({});
    expect(db.base).toEqual(ZERO_BASE);
  });

  it('contains no trace of any demo person, found by comparison rather than by pattern @g9', () => {
    // The phase file says "no `u_*` users". That would pass if a demo learner were renamed, so the
    // check here is against the demo seed itself: every id, name and email it invents must be
    // absent from the whole production snapshot, however it is nested.
    const demo = seedForDatabase('live');
    const forbidden = new Set<string>();
    for (const u of demo.users) {
      forbidden.add(u.id);
      forbidden.add(u.name);
      forbidden.add(u.email);
    }
    for (const t of demo.teams) {
      forbidden.add(t.id);
      forbidden.add(t.name);
    }
    for (const s of demo.staff) {
      forbidden.add(s.id);
      forbidden.add(s.name);
      forbidden.add(s.email);
    }
    for (const q of demo.requests) forbidden.add(q.email);
    expect(forbidden.size).toBeGreaterThan(30);

    // One sweep of the serialised snapshot: a leak nested inside progress, an activity entry or a
    // team roster is caught the same way a top-level one is.
    const json = JSON.stringify(prod());
    const leaked = [...forbidden].filter((v) => v.length > 2 && json.includes(v));
    expect(leaked).toEqual([]);
  });

  it('the one account can actually sign in @g9', () => {
    const db = prod();
    const owner = db.staff[0]!;
    expect(owner.role).toBe('Owner');
    expect(owner.email).toBe(OWNER.email);
    expect(owner.name).toBe(OWNER.name);
    // Never signed in; the Staff screen renders a null `last` as a dash.
    expect(owner.last).toBeNull();
    // And the Owner's permissions are all granted, or the console is unusable from the first
    // login and there is no second way in.
    for (const [perm] of PERMS) expect(db.perms.Owner[perm]).toBe(1);
  });

  it('refuses an owner it cannot mail, rather than seeding a database nobody can enter @g9', () => {
    expect(() => seedProduction({ owner: { name: '', email: 'a@b.co' } })).toThrow(/needs a name/);
    expect(() => seedProduction({ owner: { name: 'A', email: 'not-an-email' } })).toThrow(/usable email/);
    expect(() => seedProduction({ owner: { name: 'A', email: '' } })).toThrow(/usable email/);
    // Normalised, because an address that differs only in case must not become a second account.
    expect(seedProduction({ owner: { name: ' A B ', email: '  Mixed@Case.IO ' } }).staff[0]).toMatchObject({
      name: 'A B',
      email: 'mixed@case.io',
    });
  });

  it('starts the cohort empty and never-run @g9', () => {
    const db = prod();
    const cohort = db.cohorts[0]!;
    // Derived from the user rows, which are empty (§ 7.2, D-018). Carrying the demo's 148 over
    // would have the admin Cohorts screen claim a cohort that does not exist yet.
    expect(cohort.enrolled).toBe(0);
    expect(db.sessions.every((s) => s.cohortId === cohort.id)).toBe(true);

    for (const s of db.sessions) {
      expect(s.live).toBe(false);
      expect(s.attended).toBeNull();
      expect(s.replay).toBeNull();
      expect(s.views).toBe(0);
      // A moved session is demo narrative. Leaving the field would render a "Moved" token on a
      // session that has never been scheduled, let alone rescheduled.
      expect('movedFrom' in s).toBe(false);
    }
    // In order, because the session rail renders them in `n` and nothing re-sorts it.
    expect(db.sessions.map((s) => s.n)).toEqual([...db.sessions.map((s) => s.n)].sort((a, b) => a - b));
  });

  it('keeps the curriculum intact, because that is the product @g9', () => {
    const db = prod();
    const demo = seed('live');
    // Everything EXCEPT the three fields that describe a recording: prompts, the six checklist
    // steps, outputs, skill-file metadata, runDemo. This is what admins edit in the Builder, not
    // something they re-enter, so it is compared field by field rather than spot-checked.
    const curriculum = (m: (typeof demo.modules)[number]) => {
      const { instructor: _i, transcript: _t, dur: _d, ...rest } = m;
      return rest;
    };
    expect(db.modules.map(curriculum)).toEqual(demo.modules.map(curriculum));
    for (const m of db.modules) expect(m.checklist).toHaveLength(6);
    // And a learner on each tier can still reach what their tier allows, which is the one
    // behavioural thing the curriculum has to satisfy on day one.
    const agent = { tier: 'agent' } as Parameters<typeof canAccess>[0];
    const team = { tier: 'team' } as Parameters<typeof canAccess>[0];
    expect(db.modules.filter((m) => canAccess(agent, m)).length).toBeGreaterThan(0);
    expect(db.modules.filter((m) => canAccess(team, m)).length).toBeGreaterThan(
      db.modules.filter((m) => canAccess(agent, m)).length,
    );
  });

  it('is pure, so two runs are deep-equal and neither shares state @g9', () => {
    const a = prod();
    const b = prod();
    expect(a).toEqual(b);
    // Not the same objects: a caller mutating one snapshot must not reach into the module's own
    // data, which `seed()` rebuilds per call and this must not undo by handing out a reference.
    a.modules[0]!.name = 'MUTATED';
    a.base.learners = 99;
    expect(prod().modules[0]!.name).not.toBe('MUTATED');
    expect(ZERO_BASE.learners).toBe(0);
  });

  it('clears the three module fields that describe a recording @g9', () => {
    // A cohort that has not met has no replay. Leaving these would give a learner captions for a
    // session nobody ran, a 55-minute scrub bar over nothing, and an invented instructor's name
    // on all six AI Employees — the `<v Jordan Hale>` speaker tags inside the transcripts carry
    // the same fabricated person the instructor replacement exists to remove.
    const db = prod();
    for (const m of db.modules) {
      expect(m.instructor).toBe(OWNER.name);
      expect(m.transcript).toEqual([]);
      expect(m.dur).toBe(0);
    }
    // And the instructor is overridable, because the Owner usually is not the one teaching.
    const taught = seedProduction({ owner: OWNER, instructor: 'Dana Whitfield' });
    expect(new Set(taught.modules.map((m) => m.instructor))).toEqual(new Set(['Dana Whitfield']));
  });

  it('names no phase, so the dashboard reads it as live @g9', () => {
    // `phase` is the demo's time machine. Dashboard.vm.ts defaults an absent phase to 'live',
    // which is what a real cohort moving through its own dates means.
    expect('phase' in prod()).toBe(false);
  });
});
