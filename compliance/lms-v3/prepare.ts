// LMS v3's acceptance setup (D-225), on a DEVELOPMENT database only. Run from apps/api:
//
//   pnpm --filter @ai/api exec tsx ../../compliance/lms-v3/prepare.ts content   # once: Week 0 and the cohort as the mockup has them
//   pnpm --filter @ai/api exec tsx ../../compliance/lms-v3/prepare.ts reset     # before every state: the test learner (s1)
//
// `content` writes what the package's sample data (handoff/lms-v3/src/sample-data.js) has and the curriculum seed
// doesn't (handoff/lms-v3/PLAN.md, "Found while building"): step 6 at 30 minutes, the done-when lines' final periods,
// the operator's time, the check items behind "In progress" on step 3 and "Waiting on step 6" on step 5, and the
// cohort's pre-launch preview (Week 0 open, the rest locked with their dates). On a real deployment these are the
// builder's to enter, never this script's.
//
// `reset` puts the seeded test learner (SEED_TEST_MEMBER_EMAIL, `is_test`, D-200) where the tests start (`reset.sql`
// is the same, for psql): step 1 done, step 3 in progress, step 5 waiting on step 6, not deployed, only Week 0 open
// (no early access), the intake a draft holding the package's sample answers, sidebar expanded, light theme, the
// package's made-up people (Alex Morgan of Northline Realty). It refuses any database whose name doesn't say it is a
// local one, and any learner that isn't flagged as the test account.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSql } from '../../apps/api/src/db/client';

const HERE = dirname(fileURLToPath(import.meta.url));
const SAMPLES = resolve(HERE, '../../handoff/lms-v3/src/forms/week-0-intake.samples.json');
const MODULE = 'accelerator-week-0';
const COHORT = 'dec26';
/** The pre-launch preview opened before the tests' clock (Fri Nov 20, 2026, 3:18 PM CT). */
const PREVIEW_OPENS_AT = Date.parse('2026-11-16T18:00:00Z');
/** The draft's "Saved Thu 4:02 PM": Thu Nov 19, 2026, 4:02 PM CT. */
const DRAFT_SAVED_AT = Date.parse('2026-11-19T22:02:00Z');

/** The check items the statuses read (packages/core/src/checklist.ts › stepChecklistStatus, waitingOn). */
export const ITEMS = {
  step3: { type: 'check', id: 's3-time', title: 'Time each task per occurrence' },
  step5: { type: 'check', id: 's5c-drive', title: 'Connect your Google Drive to your AI Brain', dependsOn: ['step:6:s6-google'] },
  step6: { type: 'check', id: 's6-google', title: 'Connect Google' },
} as const;

const sql = getSql();

async function guard(): Promise<void> {
  const [{ db }] = await sql<{ db: string }[]>`select current_database() as db`;
  if (!/^ai_lms_(v3|dev)/.test(db)) throw new Error(`Refusing to touch ${db}: this script is for a local development database.`);
}

interface Step {
  id: string;
  text?: string;
  doneWhen?: string;
  mins?: number;
  timeLabel?: string;
  hint?: string;
  paths?: { claude?: { blocks: { id?: string }[] }; chatgpt?: { blocks: { id?: string }[] } };
}

const period = (s: string | undefined): string | undefined => (s && !/[.!?]$/.test(s) ? `${s}.` : s);
const withItem = (st: Step, item: { id: string }): Step => {
  const blocks = (st.paths?.claude?.blocks ?? []).filter((b) => b.id !== item.id);
  return { ...st, paths: { ...st.paths, claude: { blocks: [...blocks, item] } } };
};

async function content(): Promise<void> {
  const [row] = await sql<{ checklist: Step[]; course: { time?: { owner?: string; operator?: string } } }[]>`
    select checklist, course from modules where id = ${MODULE}`;
  if (!row) throw new Error(`No ${MODULE}: run db:curriculum first.`);
  const checklist = row.checklist.map((st, i) => {
    const n = i + 1;
    // The done-when line is the step's text too in the seed; both move together, or the step page shows the text twice.
    let s: Step = { ...st, doneWhen: period(st.doneWhen), text: st.text === st.doneWhen ? period(st.text) : st.text };
    if (n === 3) s = withItem(s, ITEMS.step3);
    if (n === 5) s = { ...s, paths: { claude: { blocks: [ITEMS.step5] } } };
    if (n === 6) s = withItem({ ...s, mins: 30, timeLabel: '30 min', hint: 'Operator. 30 min.' }, ITEMS.step6);
    return s;
  });
  const course = { ...row.course, time: { ...row.course.time, operator: 'About 2 hr 20 min.' } };
  await sql`update modules set checklist = ${JSON.stringify(checklist)}::jsonb, course = ${JSON.stringify(course)}::jsonb, build = 170 where id = ${MODULE}`;
  await sql`update cohorts set preview_opens_at = ${PREVIEW_OPENS_AT} where id = ${COHORT}`;
  console.log('Week 0 written as the mockup has it; the cohort’s pre-launch preview is open.');
}

async function reset(): Promise<void> {
  const email = process.env.SEED_TEST_MEMBER_EMAIL;
  if (!email) throw new Error('SEED_TEST_MEMBER_EMAIL is not set.');
  const [u] = await sql<{ id: string; is_test: boolean; team_id: string | null }[]>`
    select id, is_test, team_id from users where lower(email) = lower(${email})`;
  if (!u) throw new Error('No such learner.');
  if (!u.is_test) throw new Error('That learner is not the seeded test account; refusing.');
  const samples = JSON.parse(readFileSync(SAMPLES, 'utf8')) as { learner: { name: string; team: string }; draft: { answers: Record<string, unknown> } };
  await sql.begin(async (tx) => {
    // The sidebar and theme choices (D-185) are in `users.prefs`; with none, the shell is expanded and light.
    await tx`update users set name = ${samples.learner.name}, early_access = false,
             prefs = coalesce(prefs, '{}'::jsonb) - 'sidebar' - 'theme' where id = ${u.id}`;
    if (u.team_id) await tx`update teams set name = ${samples.learner.team} where id = ${u.team_id}`;
    await tx`delete from checklist_state where user_id = ${u.id}`;
    await tx`delete from video_progress where user_id = ${u.id}`;
    await tx`delete from learner_prefs where user_id = ${u.id}`;
    await tx`insert into progress (user_id, module_id, steps) values (${u.id}, ${MODULE}, '["c1"]'::jsonb)
             on conflict (user_id, module_id) do update set steps = excluded.steps, built_at = null, deployed_at = null`;
    await tx`insert into checklist_state (user_id, module_id, step_id, item_id, checked, checked_at, auto)
             values (${u.id}, ${MODULE}, 'c3', ${ITEMS.step3.id}, true, ${DRAFT_SAVED_AT}, false)`;
    if (u.team_id) {
      await tx`insert into team_intake (team_id, answers, updated_at, updated_by, submitted_at)
               values (${u.team_id}, ${JSON.stringify(samples.draft.answers)}::jsonb, ${DRAFT_SAVED_AT}, ${u.id}, null)
               on conflict (team_id) do update set answers = excluded.answers, updated_at = excluded.updated_at,
                 updated_by = excluded.updated_by, submitted_at = null`;
    }
  });
  console.log('Test learner reset: step 1 done, step 3 in progress, step 5 waiting, Week 0 open, the intake a draft.');
}

await guard();
const what = process.argv[2];
if (what === 'content') await content();
else if (what === 'reset') await reset();
else throw new Error('Usage: prepare.ts content | reset');
await sql.end();
