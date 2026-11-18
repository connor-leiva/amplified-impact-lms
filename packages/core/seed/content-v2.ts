// SEED, NOT RUNTIME (D-176). The new Weeks 0 to 3 (Connor's Nov 17 Build Spec, `weeks-0-3-v2.ts`) as a
// one-time data step: the deploy's curriculum ensure runs it once, after the release plan
// (`apps/api/src/db/data-migrations.ts`), and from then on the weeks are the builder's. Runtime code may
// not import this file.
//
// ONLY OVER THE SEED'S OWN WORDS. A week, a session title or the cohort's Before page is rewritten only
// while it is still exactly as `accelerator-v1.ts` seeded it. Anything staff already changed in the
// builder is left as it is and named in the step's summary, for the PM to finish in the builder. Each
// change is one audit row.
//
// What it writes:
//   - Weeks 0 to 3: every word and step (Week 0 has the spec's eight steps), the spec's promise,
//     flagship, tools, and Weeks 1 to 3's seat and playbook cards. Status, opens, due date, order and
//     the week's session are untouched (the release plan set the dates).
//   - The sessions: Weeks 1 to 3's build titles, Week 1's Thursday office hour title, and Week 2 and 3's
//     office hours on Fri, Dec 11 and Fri, Dec 18, 12:00 to 1:00 PM MT. The Thursday goal-planning
//     sessions (Dec 10 and Dec 17) stay as they are.
//   - The cohort's Before page stops offering the data pack and the practice set (the Week 0 brief: they
//     retire for the cohort). Its other parts stay. The files and Library downloads are not deleted.
//   - One copy string, `skill.coming` ("Coming With Week 1"): what the course page says, with no link,
//     for a skill whose Library page isn't built yet.
//
// Pure: no clock, no random source.

import { ACCELERATOR_COHORT_ID, acceleratorModuleId } from '../src/accelerator';
import type { CohortCourse } from '../src/course-types';
import type { AIEmployee, Cohort, CopyString, Db, Session } from '../src/types';
import { curriculumSeed } from './curriculum';
import type { DataChange, DataSkip, DataStepOutcome } from './data-step';
import { SESSION_TITLES_V2, fridayOfficeHours, weekModuleV2 } from './weeks-0-3-v2';

/** The step's id, recorded in `data_migrations` once it has run. */
export const CONTENT_V2 = '2026-11-17-weeks-0-3';

/** The copy string this step adds when it is missing. */
export const SKILL_COMING: CopyString = { key: 'skill.coming', value: 'Coming With Week 1', audience: 'learner' };

/** A week's words: what the step compares with the seed and replaces. Everything else on the row stays. */
export const WEEK_CONTENT_FIELDS = ['name', 'short', 'forWho', 'headline', 'outcome', 'outputs', 'platform', 'runLabel', 'icon', 'build', 'notes', 'prompt', 'checklist', 'course'] as const;
type WeekContent = Pick<AIEmployee, (typeof WEEK_CONTENT_FIELDS)[number]>;

/**
 * Whether two values say the same thing as JSON: the database's `jsonb` reorders an object's keys and
 * drops none, and an absent key reads the same as `undefined`.
 */
export function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((x, i) => sameJson(x, b[i]));
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a).filter((k) => (a as Record<string, unknown>)[k] !== undefined);
    const kb = Object.keys(b).filter((k) => (b as Record<string, unknown>)[k] !== undefined);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => sameJson((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return false;
}

const contentOf = (m: AIEmployee): WeekContent => {
  const out = {} as Record<string, unknown>;
  for (const f of WEEK_CONTENT_FIELDS) out[f] = m[f];
  return out as WeekContent;
};

/** What an audit row says of a week: enough to see what changed, not the whole course. */
const weekSummary = (m: AIEmployee) => ({ name: m.name, steps: m.checklist.length, outputs: m.outputs, seatCard: !!m.course?.seatCard, playbookCard: !!m.course?.playbookCard });
const sessionSummary = (s: Session) => ({ title: s.title, start: s.start, mins: s.mins, kind: s.kind ?? null });

/** The new Weeks 0 to 3 over a snapshot: what changes, what is left for the PM, and the new snapshot. */
export function planContentV2(db: Db): DataStepOutcome {
  const seeded = curriculumSeed();
  const changes: DataChange[] = [];
  const skipped: DataSkip[] = [];

  // Weeks 0 to 3.
  const modules = new Map<string, AIEmployee>();
  for (const n of [0, 1, 2, 3] as const) {
    const id = acceleratorModuleId(n);
    const m = db.modules.find((x) => x.id === id);
    const v1 = seeded.modules.find((x) => x.id === id)!;
    if (!m) {
      skipped.push({ id, reason: 'not in this database' });
      continue;
    }
    const v2 = weekModuleV2(n, m.instructor);
    if (sameJson(contentOf(m), contentOf(v2))) continue; // already the new week
    if (!sameJson(contentOf(m), contentOf(v1))) {
      skipped.push({ id, reason: 'its words or steps were changed in the builder' });
      continue;
    }
    const after: AIEmployee = { ...m, ...contentOf(v2) };
    modules.set(id, after);
    changes.push({ target: { type: 'module', id, label: after.name }, before: weekSummary(m), after: weekSummary(after) });
  }

  // The sessions: new titles where the seed's still stand, and the two Friday office hours.
  const v1Sessions = new Map(seeded.sessions.map((s) => [s.id, s]));
  const sessions = new Map<string, Session>();
  for (const [id, title] of Object.entries(SESSION_TITLES_V2)) {
    const s = db.sessions.find((x) => x.id === id);
    if (!s) skipped.push({ id, reason: 'not in this database' });
    else if (s.title === title) continue;
    else if (s.title !== v1Sessions.get(id)?.title) skipped.push({ id, reason: 'its title was changed in the builder' });
    else {
      const after = { ...s, title };
      sessions.set(id, after);
      changes.push({ target: { type: 'session', id, label: `Session ${s.n} · ${title}` }, before: sessionSummary(s), after: sessionSummary(after) });
    }
  }
  const added: Session[] = [];
  const haveCohort = db.cohorts.some((c) => c.id === ACCELERATOR_COHORT_ID);
  for (const s of fridayOfficeHours()) {
    if (!haveCohort) skipped.push({ id: s.id, reason: 'the cohort is not in this database' });
    else if (db.sessions.some((x) => x.id === s.id)) continue;
    else {
      added.push(s);
      changes.push({ target: { type: 'session', id: s.id, label: `Session ${s.n} · ${s.title}` }, before: null, after: sessionSummary(s) });
    }
  }

  // The cohort's Before page: the data pack and the practice set retire, while they are the seed's.
  let cohort: Cohort | null = null;
  const co = db.cohorts.find((c) => c.id === ACCELERATOR_COHORT_ID);
  const seededBefore = seeded.cohort.course!.before;
  if (co?.course) {
    const b = co.course.before;
    const retired = !b.dataPack.length && b.practiceSetNote === '';
    if (!retired) {
      if (sameJson(b.dataPack, seededBefore.dataPack) && b.practiceSetNote === seededBefore.practiceSetNote) {
        const course: CohortCourse = { ...co.course, before: { ...b, dataPack: [], practiceSetNote: '' } };
        cohort = { ...co, course };
        changes.push({
          target: { type: 'cohort', id: co.id, label: co.name },
          before: { dataPack: b.dataPack.length, practiceSetNote: b.practiceSetNote.length },
          after: { dataPack: 0, practiceSetNote: 0 },
        });
      } else skipped.push({ id: `${co.id}.course.before`, reason: 'its data pack or practice set note was changed in the builder' });
    }
  } else skipped.push({ id: ACCELERATOR_COHORT_ID, reason: 'the cohort has no course pages in this database' });

  // The copy string.
  const copy = db.copy ?? [];
  const addCopy = copy.some((c) => c.key === SKILL_COMING.key) ? [] : [{ ...SKILL_COMING }];
  for (const c of addCopy) changes.push({ target: { type: 'copy', id: c.key, label: c.key }, before: null, after: { audience: c.audience, length: c.value.length } });

  if (!changes.length) return { db, changes, skipped };
  return {
    db: {
      ...db,
      modules: db.modules.map((m) => modules.get(m.id) ?? m),
      sessions: [...db.sessions.map((s) => sessions.get(s.id) ?? s), ...added],
      cohorts: cohort ? db.cohorts.map((c) => (c.id === cohort!.id ? cohort! : c)) : db.cohorts,
      copy: [...copy, ...addCopy],
    },
    changes,
    skipped,
  };
}
