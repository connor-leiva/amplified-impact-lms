// D-240: the seat card's words in one place. Over what production holds after D-235, the step sets the two card rows
// that never got the approved words (Week 2's Took Over, both weeks' First Run), marks step 6's Seat Card table on both
// paths to draw from the card, changes nothing on a second run, and leaves a row or a table changed in the builder.
import { describe, expect, it } from 'vitest';
import type { AccordionBlock, PathBlock } from '../src/course-types';
import { seatCardRows } from '../src/seat-card';
import type { AIEmployee, Db } from '../src/types';
import { seedProduction } from '../seed/curriculum';
import { planReleaseV1 } from '../seed/release-plan-v1';
import { planCopyV1 } from '../seed/copy-v1';
import { planContentV2 } from '../seed/content-v2';
import { planCopyV2 } from '../seed/copy-v2';
import { planCopyV3 } from '../seed/copy-v3';
import { planGlossaryV1 } from '../seed/glossary-v1';
import { planStartHereV1 } from '../seed/start-here-v1';
import { planIntakeV1 } from '../seed/intake-v1';
import { planStackV1 } from '../seed/stack-v1';
import { planPromiseV1 } from '../seed/promise-v1';
import { planUnshownV1 } from '../seed/unshown-v1';
import { planFiveWordsV1 } from '../seed/five-words-v1';
import { planIntakeRequiredV1 } from '../seed/required-v1';
import { WEEKS_1_2_DATA, planWeeks12V1 } from '../seed/weeks-1-2-steps-v1';
import { planSeatCardOneCopyV1 } from '../seed/seat-card-one-copy-v1';

/** What production holds before this step: the seed, then every earlier data step, in the deploy's order. */
function deployed(): Db {
  let db = seedProduction({ owner: { name: 'Connor Leiva', email: 'connor@amplifiedimpact.io' } });
  for (const plan of [planReleaseV1, planCopyV1, planContentV2, planCopyV2, planCopyV3, planGlossaryV1, planStartHereV1, planIntakeV1, planStackV1, planPromiseV1, planUnshownV1, planFiveWordsV1, planIntakeRequiredV1, planWeeks12V1]) db = plan(db).db;
  return db;
}
const week = (db: Db, n: 1 | 2): AIEmployee => db.modules.find((m) => m.id === `accelerator-week-${n}`)!;
const tables = (m: AIEmployee): AccordionBlock[] =>
  (['claude', 'chatgpt'] as const).flatMap((p) => (m.checklist[5]?.paths?.[p]?.blocks ?? []).filter((b: PathBlock): b is AccordionBlock => b.type === 'accordion' && /seat card$/i.test(b.title)));
/**
 * Rows compared by their words: the card's label says "Can’t Do", and two of Week 2's card rows end with a period the
 * old table left off (Reports To, Applies). The table now shows the card's words, period and all.
 */
const plain = (rows: readonly (readonly string[])[]): string[][] =>
  rows.map((r) => r.map((cell) => cell.normalize('NFKC').replace(/[‘’]/g, "'").replace(/[.\s]+$/, '')));
const approved = (n: 1 | 2): string[][] => {
  const t = WEEKS_1_2_DATA[n].steps[5]!.claude.find((b) => b.type === 'accordion' && /seat card$/i.test(b.title));
  return t && t.type === 'accordion' ? t.rows : [];
};

describe('the seat card in one place (D-240)', () => {
  it('sets the rows that never got the approved words, and step 6 then shows exactly the approved table', () => {
    const before = deployed();
    // What was wrong: Week 2's Took Over still held the repo seed's words, and neither week had a First Run.
    expect(week(before, 2).course?.seatCard?.tookOver).toMatch(/who worked which new leads/);
    expect(week(before, 1).course?.seatCard?.firstRun).toBeUndefined();
    expect(week(before, 2).course?.seatCard?.firstRun).toBeUndefined();

    const out = planSeatCardOneCopyV1(before);
    const rows = out.changes.filter((c) => /, Seat card, /.test(c.target.label)).map((c) => `${c.target.id}: ${c.target.label.split(', Seat card, ')[1]}`);
    expect(rows.sort()).toEqual(['accelerator-week-1: First Run', 'accelerator-week-2: First Run', 'accelerator-week-2: Took Over']);
    for (const n of [1, 2] as const) {
      const card = week(out.db, n).course!.seatCard!;
      expect(plain(seatCardRows(card))).toEqual(plain(approved(n)));
    }
  });

  it('marks step 6’s Seat Card table on both paths to draw from the card, keeping its headings', () => {
    const out = planSeatCardOneCopyV1(deployed());
    expect(out.changes.filter((c) => /step 6, (Claude|ChatGPT) path$/.test(c.target.label))).toHaveLength(4);
    for (const n of [1, 2] as const) {
      const t = tables(week(out.db, n));
      expect(t).toHaveLength(2);
      for (const acc of t) expect(acc).toMatchObject({ seatCard: true, table: { head: ['Field', 'What It Says'], rows: [] } });
    }
  });

  it('changes nothing else, and nothing on a second run', () => {
    const before = deployed();
    const once = planSeatCardOneCopyV1(before);
    for (const n of [1, 2] as const) {
      const was = week(before, n);
      const now = week(once.db, n);
      expect(now.checklist.slice(0, 5)).toEqual(was.checklist.slice(0, 5));
      expect(now.checklist.slice(6)).toEqual(was.checklist.slice(6));
      expect([now.status, now.opens, now.dueAt, now.course?.playbookCard, now.course?.intake]).toEqual([was.status, was.opens, was.dueAt, was.course?.playbookCard, was.course?.intake]);
    }
    expect(once.db.modules.filter((m) => !/^accelerator-week-[12]$/.test(m.id))).toEqual(before.modules.filter((m) => !/^accelerator-week-[12]$/.test(m.id)));
    const twice = planSeatCardOneCopyV1(once.db);
    expect(twice.changes).toEqual([]);
  });

  it('leaves a card row and a table someone changed in the builder, and names each', () => {
    const before = deployed();
    const edited: Db = {
      ...before,
      modules: before.modules.map((m) => {
        if (m.id !== 'accelerator-week-2') return m;
        const step = m.checklist[5]!;
        const blocks = step.paths!.claude!.blocks.map((b) => (b.type === 'accordion' && /seat card$/i.test(b.title) ? { ...b, table: { ...b.table!, rows: [...b.table!.rows, ['Notes', 'Our own row']] } } : b));
        return {
          ...m,
          course: { ...m.course!, seatCard: { ...m.course!.seatCard!, tookOver: 'Our own Took Over' } },
          checklist: m.checklist.map((s, i) => (i === 5 ? { ...s, paths: { ...s.paths, claude: { blocks } } } : s)),
        };
      }),
    };
    const out = planSeatCardOneCopyV1(edited);
    const w2 = week(out.db, 2);
    expect(w2.course?.seatCard?.tookOver).toBe('Our own Took Over');
    expect(out.skipped.map((s) => s.id)).toEqual(expect.arrayContaining(['accelerator-week-2.seatCard.tookOver', 'accelerator-week-2.step-6.claude']));
    const [claude, chatgpt] = tables(w2);
    expect(claude?.seatCard).toBeUndefined();
    expect(claude?.table?.rows.at(-1)).toEqual(['Notes', 'Our own row']);
    expect(chatgpt?.seatCard).toBe(true);
  });
});

describe('seatCardRows (D-240)', () => {
  it('is the seat, then each row in the card’s order, leaving out a row with no words', () => {
    expect(seatCardRows({ seat: 'Finance Analyst', reportsTo: 'Owner', runs: 'Monthly', pulls: 'Books', applies: 'The chart', produces: 'A report', tookOver: '', cantDo: 'Change the books', firstRun: 'Date and screenshot' })).toEqual([
      ['Seat', 'Finance Analyst'],
      ['Reports To', 'Owner'],
      ['Runs', 'Monthly'],
      ['Pulls', 'Books'],
      ['Applies', 'The chart'],
      ['Produces', 'A report'],
      ['Can’t Do', 'Change the books'],
      ['First Run', 'Date and screenshot'],
    ]);
  });
});
