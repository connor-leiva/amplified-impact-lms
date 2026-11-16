import { describe, expect, it } from 'vitest';
import { parityDb } from './parity-r2-db';
import { BUILDER_STEPS, MODS0 } from './parity-r2';

// D-160 R2-2: the parity snapshot is the mockup's Build data in the app's own shapes.

describe('the R2 parity snapshot (D-160 R2-2)', () => {
  const db = parityDb();

  it('has MODS0 as its curriculum, in order', () => {
    expect(db.modules.map((m) => m.name)).toEqual(MODS0.map((m) => m.n));
    expect(db.modules.map((m) => m.order)).toEqual(MODS0.map((_, i) => i + 1));
    expect(db.modules.filter((m) => m.status === 'draft')).toHaveLength(6);
    expect(db.modules.filter((m) => m.tier === 'agent').map((m) => m.id)).toEqual(['m1', 'm4', 'm6']);
    expect(db.modules.map((m) => m.checklist.length)).toEqual(MODS0.map((m) => m.steps));
    expect(db.modules.map((m) => m.files.length)).toEqual(MODS0.map((m) => m.files));
    expect(db.modules[0]!.checklist.map((s) => s.kind)).toEqual(BUILDER_STEPS.map((s) => s[0]));
  });

  it('has one cohort, started Wed, Dec 2 at 12:00 PM MST, with six Wednesday sessions', () => {
    expect(db.cohorts.map((c) => [c.name, c.enrolled, c.cadence])).toEqual([
      ['December 2026', 148, 'Wednesdays, weekly'],
    ]);
    expect(db.cohorts[0]!.start).toBe(Date.parse('2026-12-02T12:00:00-07:00'));
    expect(db.sessions.map((s) => new Date(s.start).toISOString())).toEqual([
      '2026-12-02T19:00:00.000Z',
      '2026-12-09T19:00:00.000Z',
      '2026-12-16T19:00:00.000Z',
      '2026-12-23T19:00:00.000Z',
      '2026-12-30T19:00:00.000Z',
      '2027-01-06T19:00:00.000Z',
    ]);
    expect(db.sessions.map((s) => s.replay)).toEqual(['ready', 'ready', null, null, null, null]);
  });

  it('models no learner one by one, so Deployed is the baseline', () => {
    expect(db.users).toEqual([]);
    expect(db.base.mod).toEqual({ m1: [66, 34, 0], m2: [91, 9, 0], m3: [74, 26, 0], m4: [35, 65, 0], m5: [38, 62, 0] });
  });

  it('is a fresh copy every time', () => {
    expect(parityDb()).not.toBe(db);
    expect(parityDb()).toEqual(db);
  });
});
