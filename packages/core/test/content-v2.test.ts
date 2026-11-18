// D-176: the new Weeks 0 to 3 as a one-time data step, pure. It writes only over the seed's own words
// and names what it leaves for the PM. The deploy runs it once (apps/api/test/data-migrations.test.ts).
import { describe, expect, it } from 'vitest';
import { ACCELERATOR_MODULE_IDS, buildSessionId, officeHoursSessionId } from '../src/accelerator';
import { copyIssues, moduleCopyFields } from '../src/course-rules';
import { sessionKind, sessionWeek } from '../src/sessions';
import type { Db } from '../src/types';
import { CONTENT_V2, SKILL_COMING, planContentV2, sameJson } from '../seed/content-v2';
import { planCopyV1 } from '../seed/copy-v1';
import { seedProduction } from '../seed/curriculum';
import { WEEK0_DUE_V1, WEEK_OPENS_V1, planReleaseV1 } from '../seed/release-plan-v1';
import { PENDING_LIBRARY_ROUTES, WEEKS_0_3, WEEK0_STEPS, fridayOfficeHoursId, weekModuleV2 } from '../seed/weeks-0-3-v2';

/** A database as the deploy leaves it before this step: the seed, then the release plan and copy steps. */
const deployed = (): Db => planCopyV1(planReleaseV1(seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } })).db).db;
const week = (db: Db, n: number) => db.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[n])!;
const session = (db: Db, id: string) => db.sessions.find((s) => s.id === id);

describe('the new Weeks 0 to 3 (D-176)', () => {
  it('has an id that never changes once shipped', () => {
    expect(CONTENT_V2).toBe('2026-11-17-weeks-0-3');
  });

  it('writes Weeks 0 to 3 as the spec has them, keeping each week’s dates, status and order', () => {
    const before = deployed();
    const out = planContentV2(before);
    expect(out.skipped).toEqual([]);
    const w0 = week(out.db, 0);
    expect(w0.name).toBe('Week 0 · Foundations');
    expect(w0.course!.title).toBe('Foundations');
    expect(w0.checklist.map((s) => s.id)).toEqual(['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8']);
    expect(w0.checklist.map((s) => s.ch)).toEqual(WEEK0_STEPS.map((s) => s.step));
    expect(w0.checklist[3]).toMatchObject({ who: 'Operator', timeLabel: '20 min', ch: 'Get Your AI Ready' });
    expect(w0.checklist[3]!.paths!.chatgpt!.blocks[0]).toEqual({ type: 'list', items: expect.arrayContaining(['A paid ChatGPT plan']) });
    expect(w0.build).toBe(10 + 30 + 20 + 20 + 30 + 25 + 10 + 20);
    expect(w0.course!.time).toEqual({ owner: 'About 1 hr 30 min.', operator: 'About 2 hr 15 min.' });
    expect(w0.course!.materials).not.toContain('The synthetic practice set');
    expect([1, 2, 3].map((n) => week(out.db, n).course!.title)).toEqual(['Where the Money Goes', 'Leads That Pay', 'Numbers on the 5th']);
    expect(week(out.db, 1).course!.seatCard!.seat).toBe('Finance Analyst, onboarding');
    expect(week(out.db, 2).course!.playbookCard!.name).toBe('The Lead Source Standard');
    expect(week(out.db, 3).checklist[3]!.paths!.claude!.blocks[0]).toMatchObject({ type: 'copy', text: expect.stringContaining('Never send.') });
    for (const n of [1, 2, 3]) expect(week(out.db, n).course!.liveBuild!.agenda.map((a) => a.activity)).toEqual(['The question', 'Live reads', 'Hire lab', 'Commit']);
    for (const n of [1, 2, 3]) expect(week(out.db, n).course!.homework.acceptance).toEqual(['The signed seat card.', 'A screenshot of the first run.', 'The minutes the hire took over.']);
    // Every week says Claude or ChatGPT.
    for (const n of [0, 1, 2, 3]) expect(week(out.db, n).platform).toBe('Claude or ChatGPT');
    // What the release plan set stays.
    expect(w0).toMatchObject({ status: 'published', dueAt: WEEK0_DUE_V1, order: 1 });
    for (const n of [1, 2, 3]) expect(week(out.db, n)).toMatchObject({ status: 'scheduled', opens: WEEK_OPENS_V1[n], session: n });
    // Weeks 4 to 8 keep their content.
    for (const n of [4, 5, 6, 7, 8]) expect(week(out.db, n)).toEqual(week(before, n));
    expect(out.changes.filter((c) => c.target.type === 'module').map((c) => c.target.id)).toEqual(ACCELERATOR_MODULE_IDS.slice(0, 4));
  });

  it('never links a Library page that isn’t built: the prompt pointer says it is coming', () => {
    const out = planContentV2(deployed());
    for (const n of [0, 1, 2, 3]) {
      const m = week(out.db, n);
      for (const r of PENDING_LIBRARY_ROUTES) expect(m.prompt, `week ${n}`).not.toContain(r);
    }
    expect(week(out.db, 1).prompt).toContain('- Map Your Spend: coming with Week 1, in the Library');
  });

  it('retitles Weeks 1 to 3’s sessions and adds Week 2 and 3’s office hours on Friday, keeping the goal-planning Thursdays', () => {
    const before = deployed();
    const out = planContentV2(before);
    expect(session(out.db, buildSessionId(1))!.title).toBe('Map Your Spend Live Build');
    expect(session(out.db, buildSessionId(2))!.title).toBe('Lead Source Review Live Build');
    expect(session(out.db, buildSessionId(3))!.title).toBe('Monthly Numbers Live Build');
    expect(session(out.db, officeHoursSessionId(1))!.title).toBe('Map Your Spend Office Hours');
    for (const w of [2, 3]) expect(session(out.db, officeHoursSessionId(w))).toEqual(session(before, officeHoursSessionId(w)));
    const fri2 = session(out.db, fridayOfficeHoursId(2))!;
    const fri3 = session(out.db, fridayOfficeHoursId(3))!;
    expect(fri2).toMatchObject({ title: 'Lead Source Review Office Hours', start: Date.parse('2026-12-11T19:00:00Z'), mins: 60, kind: 'office_hours', moduleId: ACCELERATOR_MODULE_IDS[2], zoom: '' });
    expect(fri3).toMatchObject({ title: 'Monthly Numbers Office Hours', start: Date.parse('2026-12-18T19:00:00Z'), mins: 60 });
    expect([sessionKind(fri2), sessionWeek(fri2), sessionWeek(fri3)]).toEqual(['office_hours', 2, 3]);
    expect(new Set(out.db.sessions.map((s) => s.n)).size).toBe(out.db.sessions.length);
    expect(week(out.db, 2).course!.officeHours!.sessionId).toBe(fri2.id);
    expect(out.db.sessions).toHaveLength(before.sessions.length + 2);
  });

  it('retires the data pack and the practice set from the cohort’s Before page, and adds the coming-soon line', () => {
    const before = deployed();
    const out = planContentV2(before);
    const co = out.db.cohorts[0]!;
    expect(co.course!.before.dataPack).toEqual([]);
    expect(co.course!.before.practiceSetNote).toBe('');
    expect(co.course!.before.intake).toEqual(before.cohorts[0]!.course!.before.intake);
    expect(out.db.copy!.filter((c) => c.key === 'skill.coming')).toEqual([SKILL_COMING]);
    expect(SKILL_COMING.value).toBe('Coming With Week 1');
  });

  it('leaves every row staff already changed, names it for the PM, and still writes the rest', () => {
    const db = deployed();
    week(db, 2).course!.question = 'Our own question';
    week(db, 0).checklist[0]!.hint = 'Edited';
    session(db, buildSessionId(3))!.title = 'Our Own Title';
    db.cohorts[0]!.course!.before.practiceSetNote = 'Edited note';
    db.copy = [...db.copy!, { key: 'skill.coming', value: 'Soon', audience: 'learner' }];
    const out = planContentV2(db);
    expect(out.skipped.map((s) => s.id)).toEqual([ACCELERATOR_MODULE_IDS[0], ACCELERATOR_MODULE_IDS[2], buildSessionId(3), 'dec26.course.before']);
    expect(week(out.db, 2).course!.question).toBe('Our own question');
    expect(week(out.db, 1).course!.title).toBe('Where the Money Goes');
    expect(session(out.db, buildSessionId(3))!.title).toBe('Our Own Title');
    expect(out.db.cohorts[0]!.course!.before.practiceSetNote).toBe('Edited note');
    expect(out.db.copy!.find((c) => c.key === 'skill.coming')!.value).toBe('Soon');
  });

  it('is a no-op the second time: everything already is the new content', () => {
    const once = planContentV2(deployed());
    const twice = planContentV2(once.db);
    expect(twice.changes).toEqual([]);
    expect(twice.skipped).toEqual([]);
    expect(twice.db).toBe(once.db);
  });

  it('every string it writes passes the builder’s copy rules (no em dash, no banned line, MT on times)', () => {
    const out = planContentV2(deployed());
    // The four weeks it writes. (The cohort's cadence line, "1:00 PM CT", is the seed's and isn't touched.)
    const fields = [0, 1, 2, 3].flatMap((n) => moduleCopyFields(week(out.db, n)));
    expect(fields.length).toBeGreaterThan(100);
    expect(copyIssues(fields)).toEqual([]);
  });

  it('compares as JSON does: key order and absent keys don’t count as edits', () => {
    expect(sameJson({ a: 1, b: [1, { c: 2 }] }, { b: [1, { c: 2 }], a: 1 })).toBe(true);
    expect(sameJson({ a: 1, b: undefined }, { a: 1 })).toBe(true);
    expect(sameJson({ a: 1 }, { a: 2 })).toBe(false);
    expect(sameJson([1, 2], [2, 1])).toBe(false);
    expect(weekModuleV2(0)).toEqual(weekModuleV2(0));
    expect(WEEKS_0_3.map((w) => w.week)).toEqual([0, 1, 2, 3]);
  });
});
