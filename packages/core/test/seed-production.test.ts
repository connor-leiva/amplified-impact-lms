// § 9.5's launch seed, carrying the Amplified AI Accelerator (D-110). The test the phase file names is
// "it contains no `u_*` demo users", but that one string is a weak version of the real requirement, so
// this suite checks the general property instead: nothing invented reaches a production database, and
// the curriculum it carries is the Accelerator, never the prototype.
//
// The failure being guarded against is not abstract. Every demo learner has a plausible address at a
// plausible domain, and `remindMembers` and `nudgeLearners` send real email to whatever is in the
// users table.
import { describe, it, expect } from 'vitest';
import { PERMS, STAFF_ROLES, STEPS, ZERO_BASE, canAccess, moduleForSession, seed, seedForDatabase, seedProduction, applyAccelerator } from '../src/index';
import type { Db } from '../src/index';
import { ACCELERATOR_COHORT_ID, ACCELERATOR_INSTRUCTOR, ACCELERATOR_MODULE_IDS, isAcceleratorModule } from '../src/accelerator';

const OWNER = { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' };
const prod = (): Db => seedProduction({ owner: OWNER });

describe('§9.5 seedProduction @g9', () => {
  it('carries the curriculum, the cohort, the toggles, the permissions and one Owner, and nothing more @g9', () => {
    const db = prod();
    // Content: present.
    expect(db.modules.map((m) => m.id)).toEqual(ACCELERATOR_MODULE_IDS);
    expect(db.reminders.length).toBeGreaterThan(0);
    expect(Object.keys(db.perms).sort()).toEqual([...STAFF_ROLES].sort());
    expect(db.staff).toHaveLength(1);
    expect(db.cohorts.map((c) => c.id)).toEqual([ACCELERATOR_COHORT_ID]);
    expect(db.sessions).toHaveLength(16);

    // Data: absent. Each of these is either demo fiction or something an admin creates.
    expect(db.users).toEqual([]);
    expect(db.teams).toEqual([]);
    expect(db.resources).toEqual([]);
    expect(db.announcements).toEqual([]);
    expect(db.requests).toEqual([]);
    expect(db.activity).toEqual([]);
    expect(db.dismissed).toEqual({});
    expect(db.base).toEqual(ZERO_BASE);
    // The prototype's tier rows carry invented prices; the real ones are in Stripe (D-074).
    expect(db.tiers).toEqual([]);
  });

  it('contains no trace of any demo person, found by comparison rather than by pattern @g9', () => {
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
    // Jordan Hale, the prototype's invented instructor, is one of them (a demo staff member).
    expect(forbidden.has('Jordan Hale')).toBe(true);

    const json = JSON.stringify(prod());
    const leaked = [...forbidden].filter((v) => v.length > 2 && json.includes(v));
    expect(leaked).toEqual([]);
  });

  it('carries no invented price, Zoom link or prototype module @g9', () => {
    const json = JSON.stringify(prod());
    expect(json).not.toMatch(/\$?\b(995|4,?995)\b/);
    expect(json).not.toContain('zoom.us');
    for (const m of seed('live').modules) expect(json).not.toContain(`"${m.id}"`);
    for (const s of prod().sessions) expect(s.zoom).toBe('');
  });

  it('the one account can actually sign in @g9', () => {
    const db = prod();
    const owner = db.staff[0]!;
    expect(owner.role).toBe('Owner');
    expect(owner.email).toBe(OWNER.email);
    expect(owner.name).toBe(OWNER.name);
    expect(owner.last).toBeNull();
    for (const [perm] of PERMS) expect(db.perms.Owner[perm]).toBe(1);
  });

  it('refuses an owner it cannot mail, rather than seeding a database nobody can enter @g9', () => {
    expect(() => seedProduction({ owner: { name: '', email: 'a@b.co' } })).toThrow(/needs a name/);
    expect(() => seedProduction({ owner: { name: 'A', email: 'not-an-email' } })).toThrow(/usable email/);
    expect(() => seedProduction({ owner: { name: 'A', email: '' } })).toThrow(/usable email/);
    expect(seedProduction({ owner: { name: ' A B ', email: '  Mixed@Case.IO ' } }).staff[0]).toMatchObject({
      name: 'A B',
      email: 'mixed@case.io',
    });
  });

  it('knows only cohort one: the prototype\'s feb27 and apr27 are not real schedules @g9', () => {
    expect(seedProduction({ owner: OWNER, cohortId: 'dec26' }).cohorts[0]!.id).toBe('dec26');
    expect(() => seedProduction({ owner: OWNER, cohortId: 'feb27' })).toThrow(/no cohort with id feb27/);
    expect(() => seedProduction({ owner: OWNER, cohortId: 'apr27' })).toThrow(/no cohort with id apr27/);
  });

  it('starts the cohort empty and never-run @g9', () => {
    const db = prod();
    const cohort = db.cohorts[0]!;
    expect(cohort.enrolled).toBe(0);
    expect(db.sessions.every((s) => s.cohortId === cohort.id)).toBe(true);
    for (const s of db.sessions) {
      expect(s.live).toBe(false);
      expect(s.attended).toBeNull();
      expect(s.replay).toBeNull();
      expect(s.views).toBe(0);
      expect('movedFrom' in s).toBe(false);
    }
    // In date order, which is what the session rail and the calendar file read.
    expect(db.sessions.map((s) => s.start)).toEqual([...db.sessions.map((s) => s.start)].sort((a, b) => a - b));
  });

  it('is the Accelerator: every build has its week, and a Team-tier owner opens all nine @g9', () => {
    const db = prod();
    for (const m of db.modules) {
      expect(m.checklist).toHaveLength(STEPS);
      expect(m.status).toBe('published');
    }
    for (const s of db.sessions) expect(isAcceleratorModule(moduleForSession(db, s)!.id)).toBe(true);
    // Every buyer's account is Team tier (billing/provision.ts). Plan-level access is acceleratorOpen.
    const team = { tier: 'team' } as Parameters<typeof canAccess>[0];
    expect(db.modules.filter((m) => canAccess(team, m))).toHaveLength(9);
  });

  it('is pure, so two runs are deep-equal and neither shares state @g9', () => {
    const a = prod();
    const b = prod();
    expect(a).toEqual(b);
    a.modules[0]!.name = 'MUTATED';
    a.base.learners = 99;
    expect(prod().modules[0]!.name).not.toBe('MUTATED');
    expect(ZERO_BASE.learners).toBe(0);
  });

  it('leaves every field that describes a recording empty, and names the real instructor @g9', () => {
    const db = prod();
    for (const m of db.modules) {
      expect(m.instructor).toBe(ACCELERATOR_INSTRUCTOR);
      expect(m.transcript).toEqual([]);
      expect(m.dur).toBe(0);
    }
    for (const s of db.sessions) expect(s.replay).toBeNull();
    const taught = seedProduction({ owner: OWNER, instructor: 'Spring Bengtzen' });
    expect(new Set(taught.modules.map((m) => m.instructor))).toEqual(new Set(['Spring Bengtzen']));
  });

  it('names no phase, so the dashboard reads it as live @g9', () => {
    expect('phase' in prod()).toBe(false);
  });
});

describe('applyAccelerator: the curriculum on a database that is already live (D-110)', () => {
  // The demo database stands in for a live one: it has learners, teams, progress, staff, resources and
  // the prototype's six modules on the same `dec26` cohort, which is exactly what the old launch seed
  // left in production plus what sales have provisioned since.
  const live = (): Db => seed('live');

  it('leaves every learner, team, progress row, staff member and resource exactly as it was', () => {
    const before = live();
    const after = applyAccelerator(before);
    for (const k of ['users', 'teams', 'staff', 'resources', 'announcements', 'requests', 'activity', 'dismissed', 'reminders', 'perms'] as const) {
      expect(after[k], k).toEqual(before[k]);
    }
  });

  it('is idempotent: a second run changes nothing', () => {
    const once = applyAccelerator(live());
    expect(applyAccelerator(once)).toEqual(once);
  });

  it('never mutates its input', () => {
    const before = live();
    const copy = structuredClone(before);
    applyAccelerator(before);
    expect(before).toEqual(copy);
  });

  it('turns cohort dec26 into cohort one and leaves the other cohorts alone', () => {
    const before = live();
    const after = applyAccelerator(before);
    const co = after.cohorts.find((c) => c.id === 'dec26')!;
    expect(co).toMatchObject({ weeks: 8, capacity: 15, cadence: 'Wed builds and Thu office hours · 1:00 PM CT' });
    // Staff's status is kept.
    expect(co.status).toBe(before.cohorts.find((c) => c.id === 'dec26')!.status);
    expect(after.cohorts.filter((c) => c.id !== 'dec26')).toEqual(before.cohorts.filter((c) => c.id !== 'dec26'));
    expect(after.sessions.filter((s) => s.cohortId !== 'dec26')).toEqual(before.sessions.filter((s) => s.cohortId !== 'dec26'));
  });

  it('drafts the prototype modules and drops their invented Zoom links and prices', () => {
    const after = applyAccelerator(live());
    for (const m of after.modules.filter((x) => !isAcceleratorModule(x.id))) {
      expect(m.status).toBe('draft');
      expect(m.session).toBeNull();
    }
    for (const s of after.sessions.filter((x) => x.cohortId === 'dec26')) {
      expect(s.zoom).toBe('');
      // A reused id at a new time is a new session: none of the prototype's attendance carries over.
      expect(s.attended).toBeNull();
      expect(s.replay).toBeNull();
    }
    expect(after.tiers).toEqual([]);
  });

  it('keeps what staff set since: a real Zoom link, a recording, a tier price they changed', () => {
    const once = applyAccelerator(live());
    once.sessions.find((s) => s.id === 'dec26-s1')!.zoom = 'https://example.test/real-room';
    once.sessions.find((s) => s.id === 'dec26-s1')!.replay = 'ready';
    const wk1 = once.modules.find((m) => m.id === 'accelerator-week-1')!;
    wk1.dur = 5400;
    wk1.transcript = [[0, 'Welcome in.']];
    once.tiers = [{ id: 'team', name: 'Team', price: 1, seats: 2, blurb: '', features: [] }];
    const twice = applyAccelerator(once);
    expect(twice.sessions.find((s) => s.id === 'dec26-s1')).toMatchObject({ zoom: 'https://example.test/real-room', replay: 'ready' });
    expect(twice.modules.find((m) => m.id === 'accelerator-week-1')).toMatchObject({ dur: 5400, transcript: [[0, 'Welcome in.']] });
    expect(twice.tiers).toHaveLength(1);
  });

  it('restores the curriculum text if a course module drifted', () => {
    const once = applyAccelerator(live());
    once.modules.find((m) => m.id === 'accelerator-week-2')!.headline = 'edited';
    expect(applyAccelerator(once)).toEqual(applyAccelerator(live()));
  });
});
