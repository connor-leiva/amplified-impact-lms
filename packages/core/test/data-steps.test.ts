// D-175: the one-time data steps, pure. Each changes only what is still as the seed left it, and names
// what it leaves for the PM. The deploy runs them once (apps/api/test/data-migrations.test.ts).
import { describe, expect, it } from 'vitest';
import { ACCELERATOR_MODULE_IDS } from '../src/accelerator';
import type { Db } from '../src/types';
import { WEEK0_DUE_AT } from '../seed/accelerator-v1';
import { COPY_V1_KEYS, planCopyV1 } from '../seed/copy-v1';
import { COPY_V2, TEAM_PLAN_COPY, planCopyV2 } from '../seed/copy-v2';
import { COPY_V3, SKILL_IN_STEP, planCopyV3 } from '../seed/copy-v3';
import { copyIssues } from '../src/course-rules';
import { SEED_COPY, seedProduction } from '../seed/curriculum';
import { WEEK0_DUE_V1, WEEK_OPENS_V1, planReleaseV1 } from '../seed/release-plan-v1';
import { PROMISE_V1, planPromiseV1 } from '../seed/promise-v1';
import { UNSHOWN_V1, planUnshownV1 } from '../seed/unshown-v1';
import { FIVE_WORDS_V1, planFiveWordsV1 } from '../seed/five-words-v1';
import { planGlossaryV1 } from '../seed/glossary-v1';
import type { PathBlock } from '../src/course-types';
import { courseWithoutRetired, hasRetired } from '../src/course-retired';
import { weekModuleV2 } from '../seed/weeks-0-3-v2';

const prod = (): Db => seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });
const MT = (iso: string): number => Date.parse(`${iso}T12:00:00-07:00`);

describe('the Nov 17 release plan (D-175)', () => {
  it('holds Connor’s dates: Week 0 due Mon, Nov 30, each week at its live build, 12:00 PM MT', () => {
    expect(WEEK0_DUE_V1).toBe(Date.parse('2026-11-30T19:00:00Z'));
    expect(WEEK_OPENS_V1).toEqual({
      1: MT('2026-12-02'),
      2: MT('2026-12-09'),
      3: MT('2026-12-16'),
      4: MT('2027-01-06'),
      5: MT('2027-01-13'),
      6: MT('2027-01-20'),
      7: MT('2027-01-27'),
      8: MT('2027-02-03'),
    });
  });

  it('schedules each week as the seed left it, moves Week 0’s due date, and touches nothing else', () => {
    const before = prod();
    const out = planReleaseV1(before);
    expect(out.skipped).toEqual([]);
    expect(out.changes.map((c) => c.target.id)).toEqual([...ACCELERATOR_MODULE_IDS]);
    const w0 = out.db.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[0])!;
    expect(w0).toMatchObject({ status: 'published', dueAt: WEEK0_DUE_V1 });
    for (const n of [1, 2, 3, 4, 5, 6, 7, 8]) {
      expect(out.db.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[n])).toMatchObject({ status: 'scheduled', opens: WEEK_OPENS_V1[n] });
    }
    // Only those fields moved.
    const strip = (db: Db) => db.modules.map(({ status: _s, opens: _o, dueAt: _d, ...m }) => m);
    expect(strip(out.db)).toEqual(strip(before));
    expect({ ...out.db, modules: [] }).toEqual({ ...before, modules: [] });
    expect(out.changes[1]).toEqual({ target: { type: 'module', id: ACCELERATOR_MODULE_IDS[1], label: before.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[1])!.name }, before: { status: 'published', opens: null, dueAt: null }, after: { status: 'scheduled', opens: WEEK_OPENS_V1[1], dueAt: null } });
  });

  it('leaves every row staff already changed, and names it for the PM', () => {
    const db = prod();
    db.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[0])!.dueAt = WEEK0_DUE_AT + 86_400_000; // moved by staff
    db.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[3])!.status = 'draft';
    const w5 = db.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[5])!;
    w5.status = 'scheduled';
    w5.opens = MT('2027-01-14');
    const out = planReleaseV1(db);
    expect(out.skipped.map((s) => s.id)).toEqual([ACCELERATOR_MODULE_IDS[0], ACCELERATOR_MODULE_IDS[3], ACCELERATOR_MODULE_IDS[5]]);
    expect(out.db.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[5])!.opens).toBe(MT('2027-01-14'));
    expect(out.changes).toHaveLength(6);
  });

  it('is a no-op the second time: everything already is the plan', () => {
    const once = planReleaseV1(prod()).db;
    const twice = planReleaseV1(once);
    expect(twice.changes).toEqual([]);
    expect(twice.skipped).toEqual([]);
    expect(twice.db).toBe(once);
  });
});

describe('the copy strings D-175 adds', () => {
  it('seeds a new database with all three: Utah Life’s line, a locked week’s opening, the preview line', () => {
    expect(prod().copy).toEqual(SEED_COPY);
    expect(SEED_COPY.map((c) => c.key)).toEqual(['locked.utah_life', 'locked.opens', 'course.prelaunch']);
    expect(SEED_COPY.find((c) => c.key === 'locked.opens')!.value).toContain('{date}');
  });

  it('adds the missing ones to a database that already had its strings, and never changes one that is there', () => {
    const db = prod();
    db.copy = [
      { key: 'locked.utah_life', value: 'Not included with Utah Life access', audience: 'learner' },
      { key: 'locked.opens', value: 'Opening {date}', audience: 'learner' },
    ];
    const out = planCopyV1(db);
    expect(out.db.copy).toEqual([...db.copy, SEED_COPY.find((c) => c.key === 'course.prelaunch')]);
    expect(out.changes).toEqual([{ target: { type: 'copy', id: 'course.prelaunch', label: 'course.prelaunch' }, before: null, after: { audience: 'learner', length: SEED_COPY[2]!.value.length } }]);
    expect(planCopyV1(out.db).changes).toEqual([]);
    expect(COPY_V1_KEYS).toEqual(['locked.opens', 'course.prelaunch']);
  });
});

// D-187: the Team Plan window's words, as copy strings the builder edits.
describe('the Team Plan window’s copy strings (D-187)', () => {
  it('adds each missing key, keeps one staff changed, and runs once @parity:SH-8 @parity:P-1', () => {
    const db = prod();
    db.copy = [...(db.copy ?? []), { key: 'plan.team.ask', value: 'Ask Us', audience: 'learner' }];
    const out = planCopyV2(db);
    expect(out.db.copy!.find((c) => c.key === 'plan.team.ask')!.value).toBe('Ask Us');
    expect(out.changes.map((c) => c.target.id)).toEqual(['plan.team.title', 'plan.team.lead', 'plan.team.solo', 'plan.team.asked']);
    expect(planCopyV2(out.db).changes).toEqual([]);
    expect(planCopyV2(out.db).db).toBe(out.db);
    expect(COPY_V2).toBe('2026-11-18-team-plan-copy');
  });

  it('says what Connor asked for, every key a learner string under plan.team., and passes the copy rules', () => {
    const v = Object.fromEntries(TEAM_PLAN_COPY.map((c) => [c.key, c.value]));
    expect(v['plan.team.title']).toMatch(/comes with the Team Plan/);
    expect(v['plan.team.lead']).toMatch(/team lead can add/);
    expect(v['plan.team.solo']).toMatch(/Solo agent\? Ask us/);
    for (const c of TEAM_PLAN_COPY) {
      expect(c.key.startsWith('plan.team.')).toBe(true);
      expect(c.audience).toBe('learner');
      expect(copyIssues([{ path: c.key, label: c.key, text: c.value }])).toEqual([]);
    }
  });
});

// D-189: "In Step {n}", the Week kit's label for a skill a step links before its page exists.
describe('the In Step copy string (D-189)', () => {
  it('inserts skill.in_step when it is missing, and never overwrites a value staff already set', () => {
    const db = prod();
    expect(db.copy!.some((c) => c.key === 'skill.in_step')).toBe(false);
    const first = planCopyV3(db);
    expect(first.changes).toEqual([{ target: { type: 'copy', id: 'skill.in_step', label: 'skill.in_step' }, before: null, after: { audience: 'learner', length: SKILL_IN_STEP.value.length } }]);
    expect(first.db.copy!.find((c) => c.key === 'skill.in_step')).toEqual(SKILL_IN_STEP);
    expect(planCopyV3(first.db).changes).toEqual([]);
    expect(planCopyV3(first.db).db).toBe(first.db);
    // Staff edited the words. A later plan leaves them, and does not write a second row.
    const edited = structuredClone(first.db);
    edited.copy!.find((c) => c.key === 'skill.in_step')!.value = 'During step {n}';
    const kept = planCopyV3(edited);
    expect(kept.changes).toEqual([]);
    expect(kept.db).toBe(edited);
    expect(kept.db.copy!.find((c) => c.key === 'skill.in_step')!.value).toBe('During step {n}');
    expect(COPY_V3).toBe('2026-11-19-skill-in-step-copy');
  });

  it('is one learner string, and passes the copy rules', () => {
    expect(SKILL_IN_STEP).toMatchObject({ key: 'skill.in_step', value: 'In Step {n}', audience: 'learner' });
    expect(copyIssues([{ path: SKILL_IN_STEP.key, label: SKILL_IN_STEP.key, text: SKILL_IN_STEP.value }])).toEqual([]);
  });
});

// D-220: the first content seed kept each week's spec promise as a second copy of its outcome, which no page
// drew and the builder never showed. The step clears it; the outcome learners read is untouched.
describe('the retired promise (D-220)', () => {
  it('today’s seed writes no promise: a week’s outcome is its one line', () => {
    for (const n of [0, 1, 2, 3] as const) {
      const m = weekModuleV2(n);
      expect(m.course!.promise).toBeUndefined();
      expect(m.outcome.trim()).not.toBe('');
    }
  });

  it('clears it from every week that still has it, keeps each outcome, and is a no-op the second time', () => {
    const db = prod();
    // As production stored the weeks before this step: Week 0's promise differed from its outcome.
    const stored = structuredClone(db);
    stored.modules.forEach((m, i) => {
      if (m.course && i < 4) m.course.promise = i === 0 ? 'Get to the same starting line as every team.' : m.outcome;
    });
    const withPromise = stored.modules.filter((m) => m.course?.promise !== undefined);
    expect(withPromise.length).toBeGreaterThan(0);
    const out = planPromiseV1(stored);
    expect(out.skipped).toEqual([]);
    expect(out.changes.map((c) => c.target.id)).toEqual(withPromise.map((m) => m.id));
    expect(out.changes[0]!.after).toEqual({ promise: null });
    for (const m of out.db.modules) {
      expect(m.course?.promise).toBeUndefined();
      expect(m.outcome).toBe(stored.modules.find((x) => x.id === m.id)!.outcome);
    }
    const again = planPromiseV1(out.db);
    expect(again.changes).toEqual([]);
    expect(again.db).toBe(out.db);
    expect(PROMISE_V1).toBe('2026-11-20-promise-retired');
  });
});

// D-221: the old setup order and a kit skill's use line, which no learner page draws, are cleared; nothing else.
describe('the unshown course fields (D-221)', () => {
  it('today’s seed writes neither, nor a promise: every week is free of retired fields', () => {
    for (const m of prod().modules) expect(hasRetired(m.course!), m.id).toBe(false);
    for (const n of [0, 1, 2, 3] as const) expect(hasRetired(weekModuleV2(n).course!)).toBe(false);
  });

  it('clears both from every week that still has them, keeps every other word, and is a no-op the second time', () => {
    const db = prod();
    // As production stored the weeks: each with a setup order and a use line on each kit skill, one with a promise.
    const stored = structuredClone(db);
    stored.modules.forEach((m, i) => {
      if (!m.course) return;
      m.course.setup = [{ text: `Open the week ${i} kit.`, route: '/map-your-spend' }];
      m.course.skills = m.course.skills.map((k) => ({ ...k, use: `What ${k.title} does.` }));
      if (i === 0) m.course.promise = 'A promise this step leaves to D-220.';
    });
    const out = planUnshownV1(stored);
    expect(out.skipped).toEqual([]);
    expect(out.changes.map((c) => c.target.id)).toEqual(stored.modules.filter((m) => m.course).map((m) => m.id));
    expect(out.changes[0]!.after).toEqual({ setup: null, skillUses: 0 });
    for (const m of out.db.modules) {
      const before = stored.modules.find((x) => x.id === m.id)!;
      expect(m.course!.setup).toBeUndefined();
      expect(m.course!.skills.every((k) => k.use === undefined)).toBe(true);
      // Everything else is as it was, the promise included (its own step clears it).
      const { setup: _s, ...rest } = before.course!;
      expect(m.course).toEqual({ ...rest, skills: rest.skills.map(({ use: _u, ...k }) => k) });
    }
    expect(out.db.modules[0]!.course!.promise).toBe('A promise this step leaves to D-220.');
    const again = planUnshownV1(out.db);
    expect(again.changes).toEqual([]);
    expect(again.db).toBe(out.db);
    expect(UNSHOWN_V1).toBe('2026-11-20-unshown-course-fields');
  });

  it('courseWithoutRetired drops the promise, the setup order and each use line, and returns a clean course as is', () => {
    const c = prod().modules[1]!.course!;
    expect(courseWithoutRetired(c)).toBe(c);
    const dirty = { ...c, promise: 'x', setup: [{ text: 'y' }], skills: c.skills.map((k) => ({ ...k, use: 'z' })) };
    expect(courseWithoutRetired(dirty)).toEqual(c);
  });
});

// D-223: Week 0 step 2's five words open inside the task (the Card action), not in a table under the checklist.
describe('the five words in the task (D-223)', () => {
  /** Week 0 step 2 as production holds it: the item, then "Know These 5" and its table, then the Reference rows. */
  const asBuilt = (): PathBlock[] => [
    { type: 'check', id: 's2-watch', title: 'Watch the video' },
    { type: 'check', id: 's2-words', title: 'Know these five words', role: 'each', detail: 'Skill, AI hire, seat card, guardrails and the AI Office. They’re in the table below.' },
    { type: 'check', id: 's2-rhythm', title: 'Save the first live build', role: 'each' },
    { type: 'text', text: 'Know These 5' },
    { type: 'table', head: ['Word', 'What it means'], rows: [['Skill', 'A playbook.'], ['AI hire', 'A skill on a schedule.'], ['Seat card', 'A job description.'], ['Guardrails', 'Read and draft only.'], ['AI Office', 'A folder.']] },
    { type: 'accordion', title: 'About This Step', body: ['One.'] },
    { type: 'accordion', title: 'How a Week Runs', body: ['Two.'] },
  ];
  const withStep2 = (blocks: () => PathBlock[]) => {
    const db = planGlossaryV1(prod()).db;
    const w0 = db.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[0])!;
    w0.checklist[1]!.paths = { claude: { blocks: blocks() }, chatgpt: { blocks: blocks() } };
    return db;
  };

  it('gives the item the Card action with the five glossary terms, trims its detail, and drops the table and its line', () => {
    const before = withStep2(asBuilt);
    const out = planFiveWordsV1(before);
    expect(out.skipped).toEqual([]);
    expect(out.changes).toHaveLength(1);
    const step = out.db.modules.find((m) => m.id === ACCELERATOR_MODULE_IDS[0])!.checklist[1]!;
    for (const path of [step.paths!.claude!, step.paths!.chatgpt!]) {
      expect(path.blocks.map((b) => b.type)).toEqual(['check', 'check', 'check', 'accordion', 'accordion']);
      expect(path.blocks[1]).toEqual({
        type: 'check', id: 's2-words', title: 'Know these five words', role: 'each',
        detail: 'Skill, AI hire, seat card, guardrails and the AI Office.',
        action: { type: 'card', terms: ['skill', 'ai-hire', 'seat-card', 'guardrails', 'ai-office'] },
      });
      // Everything else is as staff built it.
      expect(path.blocks[0]).toEqual(asBuilt()[0]);
      expect(path.blocks.slice(3)).toEqual(asBuilt().slice(5));
    }
    // The other steps and weeks are untouched.
    const others = (db: typeof before) => db.modules.map((m) => (m.id === ACCELERATOR_MODULE_IDS[0] ? m.checklist.filter((_, i) => i !== 1) : m));
    expect(others(out.db)).toEqual(others(before));
    // Done once: run again, it finds nothing to do and says so.
    const again = planFiveWordsV1(out.db);
    expect(again.changes).toEqual([]);
    expect(again.db).toBe(out.db);
    expect(again.skipped[0]!.reason).toMatch(/already changed in the builder/);
    expect(FIVE_WORDS_V1).toBe('2026-11-20-five-words-card');
  });

  it('leaves an item staff already gave an action, and a week without the glossary', () => {
    const acted = withStep2(() => asBuilt().map((b) => (b.type === 'check' && b.id === 's2-words' ? { ...b, action: { type: 'link', label: 'Ask us', href: 'mailto:x@y.z' } } : b)));
    expect(planFiveWordsV1(acted).changes).toEqual([]);
    const bare = structuredClone(withStep2(asBuilt));
    bare.cohorts.forEach((c) => { if (c.course) delete c.course.glossary; });
    const out = planFiveWordsV1(bare);
    expect(out.changes).toEqual([]);
    expect(out.skipped[0]!.reason).toMatch(/glossary/);
  });
});

