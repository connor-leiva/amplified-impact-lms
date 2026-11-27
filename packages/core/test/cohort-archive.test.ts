// R-5 Phase 9 (D-270): Archive a cohort (Cohort › Settings › Clean-Up). Allowed only after its last session; it sets
// `archivedAt` and nothing else (never `status`, no enrollment, seat, plan or person); one audit row; the `cohorts`
// permission; refused while the cohort still sells, since an archived cohort sells nothing (`enrollmentOpen`).
import { describe, expect, it } from 'vitest';
import {
  ADMIN_ACTIONS,
  ARCHIVE_COPY,
  AUDIT_ACTIONS,
  archiveCohort,
  archiveRefusal,
  closeCohortEnrollment,
  createCohortFromShape,
  enrollmentOpen,
  fmt,
} from '../src';
import type { Actor, CohortSlot, Ctx, Db } from '../src';
import { ACCELERATOR_MODULE_IDS, DEFAULT_COHORT_ID } from '../src/accelerator';
import { seedProduction } from '../seed/curriculum';
import { planContentV2 } from '../seed/content-v2';
import { planDecemberRunV1 } from '../seed/december-run-v1';
import { planReleaseV1 } from '../seed/release-plan-v1';

const MT = (local: string): number => Date.parse(`${local}-07:00`);
const mkCtx = (now: number): Ctx => {
  let n = 1;
  return { now, id: (p: string) => `${p}_t${n++}` };
};
const OWNER: Actor = { kind: 'staff', staffId: 'st_owner' };
const EDITOR: Actor = { kind: 'staff', staffId: 'st_editor' };
const W = ACCELERATOR_MODULE_IDS;
const JAN_SLOTS: CohortSlot[] = [
  { day: 2, time: '12:00', kind: 'live_build', mins: 90 },
  { day: 4, time: '12:00', kind: 'office_hours', mins: 60 },
];

function prod(): Db {
  const db = planDecemberRunV1(planContentV2(planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db).db).db;
  db.staff.push({ id: 'st_editor', name: 'Erin Editor', email: 'erin@example.test', role: 'Content Editor', last: null });
  return db;
}
const lastOf = (db: Db, id: string) => {
  const ses = db.sessions.filter((s) => s.cohortId === id);
  return { start: Math.max(...ses.map((s) => s.start)), end: Math.max(...ses.map((s) => s.start + s.mins * 60_000)) };
};

describe('archiveCohort (D-270)', () => {
  it('is an audited admin action', () => {
    expect(ADMIN_ACTIONS.archiveCohort).toBe(archiveCohort);
    expect(AUDIT_ACTIONS).toContain('cohort.archive');
  });

  it('is refused before the last session ends, in the mockup’s words with that session’s day', () => {
    const db = prod();
    const last = lastOf(db, DEFAULT_COHORT_ID);
    const before = archiveCohort(db, OWNER, { cohortId: DEFAULT_COHORT_ID }, mkCtx(last.end - 60_000));
    expect(before.error).toBe(ARCHIVE_COPY.after(fmt.mtDay(last.start)));
    expect(before.error).toMatch(/^A cohort can be archived after its last session, \w{3}, \w{3} \d{1,2}\.$/);
    expect(before.db).toBe(db);
  });

  it('is refused for a cohort with no session (no last session yet)', () => {
    const db = prod();
    const out = createCohortFromShape(
      db,
      OWNER,
      { name: 'Empty', start: '2027-01-03', sourceCohortId: DEFAULT_COHORT_ID, picks: [W[1]!], shape: { setupWeek: false, slots: [], hosts: '' } },
      mkCtx(MT('2026-11-27T12:00:00')),
    );
    const id = out.cohort!.cohortId;
    expect(out.db.sessions.filter((s) => s.cohortId === id)).toEqual([]);
    expect(archiveRefusal(out.db, id, MT('2030-01-01T12:00:00'))).toBe('A cohort can be archived after its last session.');
  });

  it('is refused while the cohort still sells, so archive never closes enrollment', () => {
    const db = prod();
    const after = lastOf(db, DEFAULT_COHORT_ID).end + 60_000;
    expect(enrollmentOpen(db.cohorts.find((c) => c.id === DEFAULT_COHORT_ID))).toBe(true);
    expect(archiveCohort(db, OWNER, { cohortId: DEFAULT_COHORT_ID }, mkCtx(after)).error).toBe(ARCHIVE_COPY.selling);
  });

  it('after the last session, with enrollment closed: sets archivedAt and nothing else, with one audit row', () => {
    const db = prod();
    const after = lastOf(db, DEFAULT_COHORT_ID).end + 60_000;
    const closed = closeCohortEnrollment(db, OWNER, { cohortId: DEFAULT_COHORT_ID }, mkCtx(after - 1000)).db;
    const out = archiveCohort(closed, OWNER, { cohortId: DEFAULT_COHORT_ID }, mkCtx(after));
    expect(out.error).toBeUndefined();
    const co = out.db.cohorts.find((c) => c.id === DEFAULT_COHORT_ID)!;
    const was = closed.cohorts.find((c) => c.id === DEFAULT_COHORT_ID)!;
    expect(co).toEqual({ ...was, archivedAt: after });
    expect(co.status).toBe(was.status);
    // Nothing else in the database moved: no session, module, user, team or other cohort.
    expect({ ...out.db, cohorts: out.db.cohorts.filter((c) => c.id !== DEFAULT_COHORT_ID) }).toEqual({
      ...closed,
      cohorts: closed.cohorts.filter((c) => c.id !== DEFAULT_COHORT_ID),
    });
    expect(out.audit).toEqual({
      action: 'cohort.archive',
      target: { type: 'cohort', id: DEFAULT_COHORT_ID, label: was.name },
      before: { archivedAt: null },
      after: { archivedAt: after },
    });
    expect(enrollmentOpen(co)).toBe(false);
    // Once is enough.
    expect(archiveCohort(out.db, OWNER, { cohortId: DEFAULT_COHORT_ID }, mkCtx(after + 1)).error).toBe(ARCHIVE_COPY.archived);
  });

  it('a draft that never sold is archived once its last session is over', () => {
    const db = prod();
    const out = createCohortFromShape(
      db,
      OWNER,
      { name: 'January 2027 Cohort', start: '2027-01-03', sourceCohortId: DEFAULT_COHORT_ID, picks: [W[1]!, W[2]!], shape: { setupWeek: true, slots: JAN_SLOTS, hosts: 'Connor Leiva' } },
      mkCtx(MT('2026-11-27T12:00:00')),
    );
    const id = out.cohort!.cohortId;
    const after = lastOf(out.db, id).end + 1;
    const done = archiveCohort(out.db, OWNER, { cohortId: id }, mkCtx(after));
    expect(done.error).toBeUndefined();
    expect(done.db.cohorts.find((c) => c.id === id)).toMatchObject({ status: 'draft', archivedAt: after });
  });

  it('needs the cohorts permission', () => {
    const db = prod();
    const after = lastOf(db, DEFAULT_COHORT_ID).end + 60_000;
    expect(() => archiveCohort(db, EDITOR, { cohortId: DEFAULT_COHORT_ID }, mkCtx(after))).toThrow();
  });
});
