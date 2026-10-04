// Gate 2: the seed must reproduce the handoff fixtures byte for byte in value.
//
// §2.3 pins `seed(phase)` to handoff-starter/fixtures/seed-{week0,live,post}.json, copied into
// ./fixtures. The JSON is the contract, not the reference module, so this suite imports no oracle:
// if the port and the prototype drift together, these tests still catch it.
//
// It also pins the structural invariants the rest of the build leans on — six modules of six steps
// and three outputs, eighteen sessions, fourteen learners — so a later phase cannot quietly widen
// the shape its screens were designed around.
import { describe, it, expect } from 'vitest';
import * as core from '../src';
import type { Phase } from '../src';
import seedWeek0 from './fixtures/seed-week0.json';
import seedLive from './fixtures/seed-live.json';
import seedPost from './fixtures/seed-post.json';

const PHASES = ['week0', 'live', 'post'] as const satisfies readonly Phase[];

const FIXTURES: Record<Phase, unknown> = {
  week0: seedWeek0,
  live: seedLive,
  post: seedPost,
};

describe('seed fixtures @g2', () => {
  for (const p of PHASES)
    it(`seed(${p}) deep-equals fixtures/seed-${p}.json @g2`, () => {
      expect(core.seed(p)).toEqual(FIXTURES[p]);
    });
});

describe('seed invariants @g2', () => {
  for (const p of PHASES)
    it(`seed(${p}) holds the shape the build leans on @g2`, () => {
      const db = core.seed(p);

      // Schema version: the web app's stored-db migration and the API both branch on it.
      expect(db.v).toBe(3);
      expect(db.v).toBe(core.DB_V);

      // The phase travels with the snapshot, so a fixture can be identified after the fact.
      expect(db.phase).toBe(p);

      // Six AI Employees, each a six-step build producing exactly three outputs.
      expect(db.modules).toHaveLength(6);
      for (const m of db.modules) {
        expect(m.checklist, `${m.id} checklist`).toHaveLength(6);
        expect(m.checklist, `${m.id} checklist`).toHaveLength(core.STEPS);
        expect(m.outputs, `${m.id} outputs`).toHaveLength(3);
      }

      // Three cohorts of six sessions each.
      expect(db.sessions).toHaveLength(18);

      // The modeled learners; everyone else is folded into `base`.
      expect(db.users).toHaveLength(14);
    });
});

describe('seedForDatabase @g2', () => {
  for (const p of PHASES)
    it(`seedForDatabase(${p}) zeroes only the baseline @g2`, () => {
      const prod = core.seedForDatabase(p);
      const demo = core.seed(p);

      // The API never serves the demo aggregates.
      expect(prod.base).toEqual(core.ZERO_BASE);
      expect(prod.base).toEqual({ learners: 0, agent: 0, teamSeats: 0, teams: 0, mod: {}, daily: [0] });

      // Everything else is the same snapshot.
      const { base: prodBase, ...prodRest } = prod;
      const { base: demoBase, ...demoRest } = demo;
      expect(prodRest).toEqual(demoRest);

      // Guard the guard: the demo baseline is genuinely non-zero, so the check above has teeth.
      expect(prodBase).not.toEqual(demoBase);
      expect(demoBase.learners).toBeGreaterThan(0);
    });
});
