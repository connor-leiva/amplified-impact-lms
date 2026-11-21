// LMS v3's acceptance setup (D-225), on a DEVELOPMENT database only. Run from apps/api:
//
//   pnpm --filter @ai/api exec tsx ../../compliance/lms-v3/prepare.ts content   # once: Week 0 and the cohort as the mockup has them
//   pnpm --filter @ai/api exec tsx ../../compliance/lms-v3/prepare.ts reset     # before every state: the test learner (s1)
//   pnpm --filter @ai/api exec tsx ../../compliance/lms-v3/prepare.ts community # before the cm-* and th-* states
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
//
// `content` also gives Week 1's steps 4 and 6 the Upload action (D-230). `turnin.sql` puts the test learner where a
// Turn in check starts (`--assume-turnin report | checkpoint | turned`): Week 1 open (early access), and nothing turned
// in, or the package's sample report turned in.
//
// `community` (D-231) writes the package's sample Community (handoff/lms-v3/src/data/community.samples.json) with its
// own ids, which the tests click (`[data-post="23"]`, thread 2): five threads and seven posts, by the test learner
// (Alex Morgan), a second made-up learner (Dana Whitlock of the Sample Team) and a made-up staff member (Connor Leiva,
// "Amplified Impact"), at the sample's times. With LMS_V3_STAFF_PASSWORD set, that staff member can sign in, for the
// staff checks (`--assume-as cl`): `SEED_TEST_MEMBER_EMAIL=v3-staff@example.test SEED_TEST_MEMBER_PASSWORD=… signin.mjs`.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSql } from '../../apps/api/src/db/client';
import { hashPassword } from '../../apps/api/src/auth/passwords';

const HERE = dirname(fileURLToPath(import.meta.url));
const SAMPLES = resolve(HERE, '../../handoff/lms-v3/src/forms/week-0-intake.samples.json');
const MODULE = 'accelerator-week-0';
const WEEK1 = 'accelerator-week-1';
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

/** The kit's files, in the mockup's order: id, title, step, the file's type (the Vault's column). */
const KIT: [string, string, string, string][] = [
  // `intake-form` is the intake's kit file in production (the step's download action names it): its row becomes the form's.
  ['intake-form', 'Week 0 Intake Form', 'c1', 'PDF'],
  ['w0-stack-card', 'Week 0 Stack Card', 'c1', 'PDF'],
  ['w0-time-baseline-xlsx', 'Time Baseline', 'c3', 'XLSX'],
  ['w0-time-baseline-csv', 'Time Baseline', 'c3', 'CSV'],
  ['w0-map-your-spend-zip', 'Map Your Spend', 'c4', 'ZIP'],
  ['w0-lead-source-review-zip', 'Lead Source Review', 'c4', 'ZIP'],
  ['w0-test-hire-sample-week', 'Test Hire Sample Week', 'c8', 'PDF'],
];

const sql = getSql();

async function guard(): Promise<void> {
  const [{ db }] = await sql<{ db: string }[]>`select current_database() as db`;
  if (!/^ai_lms_(v3|dev)/.test(db)) throw new Error(`Refusing to touch ${db}: this script is for a local development database.`);
}

interface Step {
  id: string;
  linkedSkill?: string;
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
    // The two supporting skills are step 4's (the kit says "Step 4 · Supporting").
    if (n === 4) s = { ...s, linkedSkill: '/map-your-spend, /lead-source-review' };
    return s;
  });
  const course = { ...row.course, time: { ...row.course.time, operator: 'About 2 hr 20 min.' } };
  await sql`update modules set checklist = ${JSON.stringify(checklist)}::jsonb, course = ${JSON.stringify(course)}::jsonb, build = 170 where id = ${MODULE}`;
  // The kit (B-13): the files the mockup lists, each on its step, and the two supporting skills' zips (a file titled as
  // its skill). Rows only: their downloads aren't part of the tests (no file is stored).
  for (const [i, [id, title, step, type]] of KIT.entries()) {
    await sql`insert into resources (id, title, "desc", cat, type, tier, size, dl, updated, exec, status, seq, module_id, kind, step_id, visibility)
              values (${id}, ${title}, '', 'Templates', ${type}, 'agent', '1 KB', 0, ${PREVIEW_OPENS_AT}, false, 'published', ${i}, ${MODULE}, 'file', ${step}, 'open_in_preview')
              on conflict (id) do update set title = excluded.title, type = excluded.type, step_id = excluded.step_id, seq = excluded.seq,
                status = 'published', visibility = 'open_in_preview', module_id = excluded.module_id`;
  }
  await sql`update cohorts set preview_opens_at = ${PREVIEW_OPENS_AT} where id = ${COHORT}`;
  // D-230: Week 1 asks for a report on step 4 and a checkpoint on step 6 (the package's `asks`), with the Week
  // Builder's Upload action, so the step's Turn in button opens the drawer.
  const [w1] = await sql<{ checklist: Step[] }[]>`select checklist from modules where id = ${WEEK1}`;
  if (w1) {
    const asks: Record<number, { id: string; kind: 'live_read' | 'checkpoint' }> = { 4: { id: 'w1-turn-in-report', kind: 'live_read' }, 6: { id: 'w1-turn-in-checkpoint', kind: 'checkpoint' } };
    const checklist = w1.checklist.map((st, i) => {
      const ask = asks[i + 1];
      return ask ? withItem(st, { type: 'check', id: ask.id, title: 'Turn it in', action: { type: 'upload', kind: ask.kind } } as { id: string }) : st;
    });
    await sql`update modules set checklist = ${JSON.stringify(checklist)}::jsonb where id = ${WEEK1}`;
  }
  console.log('Week 0 written as the mockup has it; the cohort’s pre-launch preview is open; Week 1 asks for its two files.');
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

const COMMUNITY_SAMPLES = resolve(HERE, '../../handoff/lms-v3/src/data/community.samples.json');
/** The sample's other people: `dw`, a learner on another team, and `cl`, staff. `am` is the test learner. */
const DANA = { id: 'v3-dana', email: 'v3-dana@example.test', team: 'v3-sample-team' };
const STAFF = { id: 'v3-staff', email: 'v3-staff@example.test' };
/** Each sample post's time ("Thu, Nov 19 · 4:10 PM CT"), as an instant. */
const POSTED: Record<number, string> = {
  11: '2026-11-18T15:00:00Z',
  21: '2026-11-19T22:10:00Z',
  22: '2026-11-19T23:02:00Z',
  23: '2026-11-20T18:20:00Z',
  31: '2026-11-20T16:05:00Z',
  41: '2026-11-19T14:15:00Z',
  51: '2026-11-18T20:30:00Z',
};

async function community(): Promise<void> {
  const email = process.env.SEED_TEST_MEMBER_EMAIL;
  if (!email) throw new Error('SEED_TEST_MEMBER_EMAIL is not set.');
  const [u] = await sql<{ id: string; is_test: boolean }[]>`select id, is_test from users where lower(email) = lower(${email})`;
  if (!u?.is_test) throw new Error('No seeded test learner; refusing.');
  const samples = JSON.parse(readFileSync(COMMUNITY_SAMPLES, 'utf8')) as {
    people: Record<string, { name: string; team: string }>;
    threads: { id: number; space: string; title: string; pinned?: boolean; hidden?: boolean; posts: { id: number; by: string; body: string; hidden?: boolean }[] }[];
  };
  const who: Record<string, string> = { am: u.id, dw: DANA.id, cl: STAFF.id };
  const at = (id: number): number => Date.parse(POSTED[id]!);
  const staffHash = process.env.LMS_V3_STAFF_PASSWORD ? await hashPassword(process.env.LMS_V3_STAFF_PASSWORD) : null;
  await sql.begin(async (tx) => {
    const dw = samples.people.dw!, cl = samples.people.cl!;
    await tx`insert into teams (id, name, owner_id, seats, seq) values (${DANA.team}, ${dw.team}, ${DANA.id}, 5, 9000)
             on conflict (id) do update set name = excluded.name`;
    await tx`insert into users (id, email, name, kind, tier, role, team_id, cohort_id, joined, status, seq)
             values (${DANA.id}, ${DANA.email}, ${dw.name}, 'learner', 'team', 'Team Owner', ${DANA.team}, ${COHORT}, ${PREVIEW_OPENS_AT}, 'active', 9000)
             on conflict (id) do update set name = excluded.name, team_id = excluded.team_id`;
    await tx`insert into users (id, email, name, kind, staff_role, seq) values (${STAFF.id}, ${STAFF.email}, ${cl.name}, 'staff', 'Owner', 9001)
             on conflict (id) do update set name = excluded.name, staff_role = excluded.staff_role`;
    if (staffHash) {
      await tx`insert into user_passwords (user_id, hash, updated_at) values (${STAFF.id}, ${staffHash}, now())
               on conflict (user_id) do update set hash = excluded.hash, updated_at = excluded.updated_at`;
    }
    await tx`delete from community_posts`;
    await tx`delete from community_threads`;
    for (const t of samples.threads) {
      const first = t.posts[0]!;
      const last = Math.max(...t.posts.map((p) => at(p.id)));
      await tx`insert into community_threads (id, cohort_id, space, title, by_user_id, pinned, hidden, created_at, activity_at)
               values (${t.id}, ${COHORT}, ${t.space}, ${t.title}, ${who[first.by]!}, ${!!t.pinned}, ${!!t.hidden}, ${at(first.id)}, ${last})`;
      for (const p of t.posts) {
        await tx`insert into community_posts (id, thread_id, by_user_id, body, created_at, hidden)
                 values (${p.id}, ${t.id}, ${who[p.by]!}, ${p.body}, ${at(p.id)}, ${!!p.hidden})`;
      }
    }
    // New threads and posts start at 100, as the mockup's do.
    await tx`select setval('community_threads_id_seq', 100, false)`;
    await tx`select setval('community_posts_id_seq', 100, false)`;
  });
  console.log(`The sample Community written: ${samples.threads.length} threads, ${samples.threads.flatMap((t) => t.posts).length} posts.`);
}

await guard();
const what = process.argv[2];
if (what === 'content') await content();
else if (what === 'reset') await reset();
else if (what === 'community') await community();
else throw new Error('Usage: prepare.ts content | reset | community');
await sql.end();
