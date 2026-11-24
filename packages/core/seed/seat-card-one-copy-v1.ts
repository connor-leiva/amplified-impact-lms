// SEED, NOT RUNTIME (D-242). Connor, Nov 22, 2026, on the seat card's words: "Fix it". Weeks 1 and 2 keep each seat card
// in three places: the week's Seat Card card (`course.seatCard`, what the form asks and the week page shows) and step
// 6's "… Seat Card" table on each path (D-235 loaded both from `handoff/weeks-1-2/`). Two of the card's rows never got
// the approved words: Week 2's Took Over still held the repo seed's, and neither week had a First Run. This step, once:
//   - sets each card row to the approved words of step 6's table (`weeks-1-2-v1/week-N-steps.json`, the handoff's
//     `seat-card-fields.md`), only while the row is empty or still holds the seed's words. A row changed in the Week
//     Builder is left and named;
//   - marks step 6's Seat Card table on each path `seatCard`, so its rows are drawn from the card from then on and the
//     card's words live in one place, the builder's Seat Card card. Only while the table's rows are still the approved
//     ones: a table changed in the builder is left and named.
// Nothing else changes. Nothing is published or scheduled.

import type { AccordionBlock, PathBlock, SeatCard } from '../src/course-types';
import { isWeekModule } from '../src/course';
import { SEAT_CARD_LABEL } from '../src/seat-card';
import type { AIEmployee, Db, Step } from '../src/types';
import type { DataChange, DataSkip, DataStepOutcome } from './data-step';
import { weekModuleV2 } from './weeks-0-3-v2';
import { WEEKS_1_2_DATA } from './weeks-1-2-steps-v1';
import type { DataAccordion } from './weeks-1-2-steps-v1';

export const SEAT_CARD_ONE_COPY_V1 = '2026-11-22-seat-card-one-copy';

/** Compared by their words: case, curly apostrophes, punctuation and spacing aside. */
const words = (s: string): string => s.normalize('NFKC').replace(/[‘’]/g, "'").toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** A table row's label ("Can't Do") as the card's key (`cantDo`). */
function keyOf(label: string): keyof SeatCard | null {
  const want = words(label);
  const hit = (Object.keys(SEAT_CARD_LABEL) as (keyof SeatCard)[]).find((k) => words(SEAT_CARD_LABEL[k]) === want);
  return hit ?? null;
}

const STEP = 5; // step 6
const PATHS = [
  ['claude', 'Claude'],
  ['chatgpt', 'ChatGPT'],
] as const;
const isSeatCardTable = (b: PathBlock): b is AccordionBlock => b.type === 'accordion' && /seat card$/i.test(b.title.trim());

/** The plan: over Weeks 1 and 2, the card's rows, then step 6's two tables. */
export function planSeatCardOneCopyV1(db: Db): DataStepOutcome {
  const changes: DataChange[] = [];
  const skipped: DataSkip[] = [];
  let modules = db.modules;
  for (const week of [1, 2] as const) {
    const id = `accelerator-week-${week}`;
    const m = modules.find((x) => x.id === id);
    if (!m || !isWeekModule(m)) {
      skipped.push({ id, reason: `Week ${week} is not in this database` });
      continue;
    }
    const card = m.course?.seatCard;
    const table = WEEKS_1_2_DATA[week].steps[STEP]?.claude.find((b): b is DataAccordion => b.type === 'accordion' && /seat card$/i.test(b.title));
    if (!card || !table) {
      skipped.push({ id, reason: card ? 'the approved Seat Card table is missing' : 'the week has no seat card' });
      continue;
    }
    const seed = weekModuleV2(week).course?.seatCard;
    const had = changes.length;

    // 1. The card's rows: the approved words, where the row is empty or still the seed's.
    let nextCard: SeatCard = { ...card };
    for (const [label, approved] of table.rows) {
      const key = label ? keyOf(label) : null;
      if (!key || approved === undefined) {
        skipped.push({ id: `${id}.seatCard`, reason: `"${label}" is not a seat card row` });
        continue;
      }
      const stored = nextCard[key];
      if (stored !== undefined && words(stored) === words(approved)) continue;
      if (stored !== undefined && stored.trim() && stored !== seed?.[key]) {
        skipped.push({ id: `${id}.seatCard.${key}`, reason: `its ${label} was changed in the builder; left as it is` });
        continue;
      }
      nextCard = { ...nextCard, [key]: approved };
      changes.push({ target: { type: 'module', id, label: `${m.name}, Seat card, ${label}` }, before: stored ?? '', after: approved });
    }

    // 2. Step 6's Seat Card table on each path reads the card, where its rows are still the approved ones.
    const step = m.checklist[STEP];
    let nextStep: Step | undefined = step;
    for (const [path, name] of PATHS) {
      const blocks = nextStep?.paths?.[path]?.blocks;
      const at = `${id}.step-${STEP + 1}.${path}`;
      const i = blocks ? blocks.findIndex(isSeatCardTable) : -1;
      if (!blocks || !nextStep || i < 0) {
        skipped.push({ id: at, reason: 'no Seat Card table on this path' });
        continue;
      }
      const acc = blocks[i] as AccordionBlock;
      if (acc.seatCard) continue;
      const rows = acc.table?.rows ?? [];
      const same = rows.length === table.rows.length && rows.every((r, j) => words(r.join(' ')) === words(table.rows[j]!.join(' ')));
      if (!same) {
        skipped.push({ id: at, reason: 'its rows were changed in the builder; left as they are' });
        continue;
      }
      const head = acc.table?.head;
      const next: AccordionBlock = { ...acc, seatCard: true, table: { ...(head?.length ? { head } : {}), rows: [] } };
      nextStep = { ...nextStep, paths: { ...nextStep.paths, [path]: { ...nextStep.paths![path]!, blocks: blocks.map((b, j) => (j === i ? next : b)) } } };
      changes.push({ target: { type: 'module', id, label: `${m.name}, step ${STEP + 1}, ${name} path` }, before: { table: `${rows.length} rows of its own` }, after: { table: 'the Seat Card card' } });
    }

    if (changes.length === had) continue;
    let next: AIEmployee = { ...m, course: { ...m.course!, seatCard: nextCard } };
    if (nextStep && nextStep !== step) next = { ...next, checklist: next.checklist.map((s, j) => (j === STEP ? nextStep! : s)) };
    modules = modules.map((x) => (x.id === id ? next : x));
  }
  return { db: { ...db, modules }, changes, skipped };
}
