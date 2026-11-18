// D-186: a course week's access follows course access (the plan, D-110), not the tier. The deployed seed
// makes every week Team tier, so before this an Agent tier learner who bought the course could not mark a
// week's step done ("Team tier required") and their snapshot blanked the weeks. A plan without the course
// stays shut out whatever its tier, and every module that is not a course week still follows the tier.
import { describe, expect, it } from 'vitest';
import { NOT_IN_PLAN, acceleratorModuleId } from '../src/accelerator';
import * as M from '../src/mutations';
import { MutationError } from '../src/mutations';
import type { Ctx } from '../src/mutations';
import { canOpenModule } from '../src/release';
import { scopeSnapshot } from '../src/scope';
import { seed } from '../src/seed';
import type { Db, Learner } from '../src/types';
import { planContentV2 } from '../seed/content-v2';
import { planCopyV1 } from '../seed/copy-v1';
import { seedProduction } from '../seed/curriculum';
import { planReleaseV1 } from '../seed/release-plan-v1';

const deployed = (): Db => planContentV2(planCopyV1(planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db).db).db;
const learner = (id: string, tier: Learner['tier']): Learner => ({ id, name: id, email: `${id}@example.com`, tier, role: tier === 'team' ? 'Team Owner' : 'Agent', teamId: null, cohortId: 'dec26', joined: 0, last: null, status: 'active', progress: {} });

/** Dec 5, 2026: Week 1 (its build Dec 2) is open. */
const AT = Date.parse('2026-12-05T19:00:00Z');
const WEEK1 = acceleratorModuleId(1);
const ctx = (course?: boolean): Ctx => ({ now: AT, id: (p) => `${p}1`, ...(course === undefined ? {} : { course }) });

function world(): Db {
  const db = deployed();
  db.users.push(learner('u-agent', 'agent'), learner('u-team', 'team'));
  // What a blanked module loses (`redactModule`): the Module Builder's prompt and files.
  const m = db.modules.find((x) => x.id === WEEK1)!;
  m.prompt = 'You map a team’s spend for {{TEAM_NAME}}.';
  m.files = [{ name: 'spend-map-config', type: 'JSON', size: '4 KB', desc: 'Settings.', steps: [] }];
  return db;
}

describe('canOpenModule (D-186)', () => {
  const week = { id: WEEK1, tier: 'team' as const };
  const teamOnly = { id: 'sales', tier: 'team' as const };
  const agent = { tier: 'agent' as const };
  const team = { tier: 'team' as const };

  it('a course week follows course access, whatever the tier @parity:E-16', () => {
    expect(canOpenModule(agent, week, true)).toBe(true);
    expect(canOpenModule(team, week, true)).toBe(true);
    expect(canOpenModule(agent, week, false)).toBe(false);
    expect(canOpenModule(team, week, false)).toBe(false);
  });

  it('where the caller does not know the plan (the fixture build), a course week the learner has is open', () => {
    expect(canOpenModule(agent, week)).toBe(true);
  });

  it('every other module follows the tier, as before, whatever the course says', () => {
    expect(canOpenModule(agent, teamOnly, true)).toBe(false);
    expect(canOpenModule(team, teamOnly, false)).toBe(true);
    expect(canOpenModule(agent, { id: 'marketing', tier: 'agent' })).toBe(true);
  });
});

describe('toggleStep on a course week (D-186)', () => {
  it('an Agent tier learner who bought the course marks a step done, and undoes it @parity:E-16', () => {
    const db = world();
    const m = db.modules.find((x) => x.id === WEEK1)!;
    expect(m.tier).toBe('team');
    const step = m.checklist[0]!.id;
    const done = M.toggleStep(db, { kind: 'learner', userId: 'u-agent' }, { moduleId: WEEK1, stepId: step }, ctx(true)).db;
    expect(done.users.find((u) => u.id === 'u-agent')!.progress[WEEK1]!.steps).toEqual([step]);
    const undone = M.toggleStep(done, { kind: 'learner', userId: 'u-agent' }, { moduleId: WEEK1, stepId: step }, ctx(true)).db;
    expect(undone.users.find((u) => u.id === 'u-agent')!.progress[WEEK1]!.steps).toEqual([]);
  });

  it('a plan without the course is refused, Agent or Team tier, and nothing changes', () => {
    const db = world();
    const step = db.modules.find((x) => x.id === WEEK1)!.checklist[0]!.id;
    for (const userId of ['u-agent', 'u-team']) {
      let err: unknown;
      try {
        M.toggleStep(db, { kind: 'learner', userId }, { moduleId: WEEK1, stepId: step }, ctx(false));
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(MutationError);
      expect((err as MutationError).code).toBe('forbidden');
      expect((err as MutationError).message).toBe(NOT_IN_PLAN);
    }
  });

  it('a Team tier AI Employee that is not a course week still needs the Team tier', () => {
    const db = seed('live');
    const jamie = db.users.find((u) => u.tier === 'agent')!;
    const teamOnly = db.modules.find((m) => m.tier === 'team')!;
    expect(() => M.toggleStep(db, { kind: 'learner', userId: jamie.id }, { moduleId: teamOnly.id, stepId: teamOnly.checklist[0]!.id }, ctx(true))).toThrow('Team tier required');
  });
});

describe('the snapshot of an Agent tier learner (D-186)', () => {
  it('with the course: each open week whole, not blanked @parity:E-16', () => {
    const snap = scopeSnapshot(world(), { kind: 'learner', userId: 'u-agent' }, { accelerator: true, at: AT, preview: false });
    const m = snap.modules.find((x) => x.id === WEEK1)!;
    const whole = world().modules.find((x) => x.id === WEEK1)!;
    expect(m.checklist.map((s) => s.text)).toEqual(whole.checklist.map((s) => s.text));
    expect(m.prompt).toBe(whole.prompt);
    expect(m.prompt).not.toBe('');
    expect(m.files.map((f) => f.name)).toEqual(['spend-map-config']);
  });

  it('without the course: no course week at all, as before', () => {
    const snap = scopeSnapshot(world(), { kind: 'learner', userId: 'u-agent' }, { accelerator: false, at: AT });
    expect(snap.modules.filter((x) => x.id.startsWith('accelerator-week-'))).toEqual([]);
  });
});
