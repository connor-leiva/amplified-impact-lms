import { describe, expect, it } from 'vitest';
import { phaseNow, seed, sortedModules } from '@ai/core';
import { AREA_COPY, areaCounts } from './area.vm';

// D-253: the four pages' heads (the mockup's words) and their tabs' counts, each one a number today's page shows.

const COUNTS = { drafts: 6, requests: 2, incidents: 1, waiting: 3 };

describe('the four pages (D-253)', () => {
  it('say what the mockup says', () => {
    expect(AREA_COPY.program).toEqual({
      title: 'Amplified AI Accelerator',
      meta: 'Program',
      description: 'What you teach. A week is built once here, and every cohort that runs it gets the same week on its own dates.',
    });
    expect(AREA_COPY.people.description).toBe('Everyone with a sign-in, across every product. Each person is counted once, under how they got in.');
    expect(AREA_COPY.revenue.description).toBe(
      'What has come in, what is still owed on a payment plan, and what repeats every month. Every figure is from Stripe and opens the payments behind it.',
    );
    for (const c of [AREA_COPY.program.description, AREA_COPY.people.description, AREA_COPY.revenue.description]) expect(c).not.toMatch(/—/);
  });

  it('count what today’s pages count: Curriculum’s AI Employees, the cohort’s sessions and teams, waiting threads, requests', () => {
    const db = seed('live');
    void phaseNow('live');
    expect(areaCounts(db, 'program', 'dec26', COUNTS)).toEqual({ curriculum: sortedModules(db).length });
    expect(areaCounts(db, 'cohort', 'dec26', COUNTS)).toEqual({
      schedule: db.sessions.filter((s) => s.cohortId === 'dec26').length,
      people: db.base.teams + db.teams.length,
      community: 3,
    });
    // Each count of what waits hides at zero.
    expect(areaCounts(db, 'cohort', 'dec26', { ...COUNTS, waiting: 0 })).not.toHaveProperty('community');
    expect(areaCounts(db, 'revenue', 'dec26', COUNTS)).toEqual({ plans: 2 });
    expect(areaCounts(db, 'revenue', 'dec26', { ...COUNTS, requests: 0 })).toEqual({});
    // People's are Phase 7's: none yet.
    expect(areaCounts(db, 'people', 'dec26', COUNTS)).toEqual({});
    // Another cohort's sessions are its own.
    expect(areaCounts(db, 'cohort', 'nope', COUNTS).schedule).toBe(0);
  });
});
