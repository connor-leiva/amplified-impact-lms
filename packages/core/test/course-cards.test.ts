// D-184: a week's seat card and playbook card go with the course to a learner, inside an open week of the
// gated answer and nowhere else: never in a locked week's stub, never in the snapshot.
import { describe, expect, it } from 'vitest';
import { courseFor, isLockedWeek } from '../src/course';
import { scopeSnapshot } from '../src/scope';
import type { Db } from '../src/types';
import { ACCELERATOR_MODULE_IDS } from '../src/accelerator';
import { planContentV2 } from '../seed/content-v2';
import { planCopyV1 } from '../seed/copy-v1';
import { seedProduction } from '../seed/curriculum';
import { WEEK_OPENS_V1, planReleaseV1 } from '../seed/release-plan-v1';

const deployed = (): Db => planContentV2(planCopyV1(planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db).db).db;
const course = (db: Db, n: number) => db.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[n])!.course!;

describe('the seat card and the playbook card in the course (D-184)', () => {
  it('@parity:K-15 an open week carries its seat card and playbook card, exactly as the builder saved them', () => {
    const db = deployed();
    const c = courseFor(db, WEEK_OPENS_V1[2]!, { open: true, preview: false })!;
    for (const n of [1, 2]) {
      const w = c.weeks[n]!;
      if (isLockedWeek(w)) throw new Error(`week ${n} locked`);
      expect(w.seatCard).toEqual(course(db, n).seatCard);
      expect(w.playbookCard).toEqual(course(db, n).playbookCard);
    }
    // A week without them has none: nothing is invented.
    const w0 = c.weeks[0]!;
    expect('seatCard' in w0 || 'playbookCard' in w0).toBe(false);
    // Staff (the builder's preview) see them on every week.
    const staff = courseFor(db, WEEK_OPENS_V1[1]!, 'staff')!;
    expect((staff.weeks[3] as { seatCard?: unknown }).seatCard).toEqual(course(db, 3).seatCard);
  });

  it('@parity:K-15 a locked week sends neither: its stub is the outline’s, and none of a card’s words are in the answer', () => {
    const db = deployed();
    // Week 1 is open, Weeks 2 and 3 (which have cards) are still locked.
    const c = courseFor(db, WEEK_OPENS_V1[1]!, { open: true, preview: false })!;
    const json = JSON.stringify(c);
    for (const n of [2, 3]) {
      const w = c.weeks[n]!;
      expect(isLockedWeek(w)).toBe(true);
      expect(Object.keys(w).filter((k) => k !== 'lockedCopy').sort()).toEqual(['locked', 'opensAt', 'outcome', 'question', 'title', 'week']);
      const { seatCard, playbookCard } = course(db, n);
      for (const said of [seatCard!.runs, seatCard!.cantDo, playbookCard!.play]) expect(json).not.toContain(said);
    }
    // In the pre-launch preview only Week 0 is open, and it has no cards.
    const pre = JSON.stringify(courseFor(db, WEEK_OPENS_V1[1]! - 1, { open: true, preview: true }));
    for (const n of [1, 2, 3]) expect(pre).not.toContain(course(db, n).seatCard!.runs);
  });

  it('@parity:K-15 a learner’s snapshot never carries them, open week or not, course or no course', () => {
    const db = deployed();
    db.users.push({ id: 'u1', name: 'A', email: 'a@x.test', tier: 'team', role: 'Team Owner', teamId: null, cohortId: 'dec26', joined: 0, last: null, status: 'active', progress: {} });
    const said = [1, 2, 3].flatMap((n) => [course(db, n).seatCard!.runs, course(db, n).playbookCard!.play]);
    for (const access of [{ accelerator: true, at: WEEK_OPENS_V1[3]! }, { accelerator: true }, { accelerator: false }]) {
      const json = JSON.stringify(scopeSnapshot(db, { kind: 'learner', userId: 'u1' }, access));
      for (const s of said) expect(json, JSON.stringify(access)).not.toContain(s);
    }
  });
});
