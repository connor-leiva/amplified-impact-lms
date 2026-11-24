// SEED, NOT RUNTIME (D-175). Connor's release plan of Nov 17, 2026, as a one-time data step: the deploy's
// curriculum ensure runs it once (`apps/api/src/db/data-migrations.ts`), and from then on the dates are
// the builder's, like every other word of the course. Runtime code may not import this file.
//
// What Connor decided (the Week 0 brief, points 1 and 4):
//   - Week 0 is due Mon, Nov 30, 2026 at 12:00 PM MT (no longer Wed, Dec 2).
//   - Each week opens at the start of its live build, 12:00 PM MT: Week 2 Dec 9; Week 3 Dec 16;
//     Week 4 Wed, Jan 6, 2027; Week 5 Jan 13; Week 6 Jan 20; Week 7 Jan 27; Week 8 Feb 3.
//   - Week 1 opens Sun, Nov 29, 2026 at 12:00 PM MT, three days before its live build (D-248, the Week 0
//     launch audit's H-3). Its live build stays Wed, Dec 2, and so does everything that waits for the
//     sessions to start (`COURSE_OPENS_AT`: Join, the Library's skills, the reminders).
//
// A DATABASE THIS STEP ALREADY RAN ON KEEPS WEEK 1 ON DEC 2. The step runs once (`data_migrations`), so
// changing the date here changes a new database only. Production's Week 1 moves in the Week Builder.
//
// ONLY OVER THE SEED'S OWN VALUES. A week still as the seed left it (Published, no Opens) becomes
// Scheduled at its date; Week 0's due date moves only if it is still the seed's (or unset). A row staff
// already changed in the builder is left exactly as it is and named in the step's summary for the PM.
//
// NOT HERE: when the pre-launch preview opens. The Week 0 brief leaves that to the PM ("the deploy date,
// or Connor picks one"), so it is set in Course settings (`cohorts.preview_opens_at`); until it is, the
// course has no preview and Week 0 opens with the course, as D-153 says.
//
// Pure: no clock, no random source.

import { acceleratorModuleId } from '../src/accelerator';
import type { AIEmployee, Db } from '../src/types';
import { WEEK0_DUE_AT } from './accelerator-v1';
import type { DataChange, DataSkip, DataStepOutcome } from './data-step';

/** The step's id, recorded in `data_migrations` once it has run. */
export const RELEASE_PLAN_V1 = '2026-11-17-release-plan';

/** Noon, Mountain Time, on a winter day (MST, UTC-7): every date below is between November and February. */
const noonMT = (day: string): number => Date.parse(`${day}T12:00:00-07:00`);

/** Week 0's due date: Mon, Nov 30, 2026, 12:00 PM MT. */
export const WEEK0_DUE_V1 = noonMT('2026-11-30');

/** Each week's opening, 12:00 PM MT: the start of its live build, but Week 1's, three days before it (D-248). */
export const WEEK_OPENS_V1: Readonly<Record<number, number>> = {
  1: noonMT('2026-11-29'),
  2: noonMT('2026-12-09'),
  3: noonMT('2026-12-16'),
  4: noonMT('2027-01-06'),
  5: noonMT('2027-01-13'),
  6: noonMT('2027-01-20'),
  7: noonMT('2027-01-27'),
  8: noonMT('2027-02-03'),
};

/** What a row was and became; only the fields this step sets. */
export interface ReleaseFields {
  status: AIEmployee['status'];
  opens: number | null;
  dueAt: number | null;
}

const fieldsOf = (m: AIEmployee): ReleaseFields => ({ status: m.status, opens: m.opens, dueAt: m.dueAt ?? null });
const change = (m: AIEmployee, after: AIEmployee): DataChange => ({ target: { type: 'module', id: m.id, label: m.name }, before: fieldsOf(m), after: fieldsOf(after) });

/** The release plan over a snapshot: what changes, what is left for the PM, and the new snapshot. */
export function planReleaseV1(db: Db): DataStepOutcome {
  const changes: DataChange[] = [];
  const skipped: DataSkip[] = [];
  const next = new Map<string, AIEmployee>();

  const week0 = db.modules.find((m) => m.id === acceleratorModuleId(0));
  if (!week0) skipped.push({ id: acceleratorModuleId(0), reason: 'not in this database' });
  else if (week0.dueAt === undefined || week0.dueAt === WEEK0_DUE_AT) {
    const after = { ...week0, dueAt: WEEK0_DUE_V1 };
    next.set(week0.id, after);
    changes.push(change(week0, after));
  } else if (week0.dueAt !== WEEK0_DUE_V1) skipped.push({ id: week0.id, reason: 'its due date was changed in the builder' });

  for (const [n, opens] of Object.entries(WEEK_OPENS_V1)) {
    const id = acceleratorModuleId(Number(n));
    const m = db.modules.find((x) => x.id === id);
    if (!m) skipped.push({ id, reason: 'not in this database' });
    else if (m.status === 'published' && m.opens === null) {
      const after: AIEmployee = { ...m, status: 'scheduled', opens };
      next.set(id, after);
      changes.push(change(m, after));
    } else if (!(m.status === 'scheduled' && m.opens === opens)) skipped.push({ id, reason: `its status or opening was changed in the builder (${m.status})` });
  }

  return { db: next.size ? { ...db, modules: db.modules.map((m) => next.get(m.id) ?? m) } : db, changes, skipped };
}
