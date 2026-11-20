// The v6 step page's acceptance setup (D-210), on a DEVELOPMENT database only. Run from apps/api:
//
//   pnpm --filter @ai/api exec tsx ../../compliance/step-page-v6/prepare.ts content   # once: Week 0 step 2 as the mockup draws it
//   pnpm --filter @ai/api exec tsx ../../compliance/step-page-v6/prepare.ts reset     # before every state: the test learner
//
// `content` writes Week 0's steps 2, 4 and 5 (test/mockup-step2.ts: the blocks a staff member would enter in the
// Week Builder), the week's system prompt, and the video's three files into the bucket (S3_*). `reset` puts the
// seeded test learner (SEED_TEST_MEMBER_EMAIL, D-200) back where the tests start: step 1 done, step 5 waiting,
// nothing checked, no video progress, every Reference row closed. It refuses any database whose name does not
// say it is a local one, and any learner that is not flagged as the test account.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSql } from '../../apps/api/src/db/client';
import { putObject } from '../../apps/api/src/storage';
import { MOCKUP_PROMPT, MOCKUP_STEP4_BLOCKS, MOCKUP_STEP5_BLOCKS, mockupStep2Blocks } from '../../apps/web/src/routes/learn/step-page/test/mockup-step2';

const HERE = dirname(fileURLToPath(import.meta.url));
const HANDOFF = resolve(HERE, '../../handoff/step-page-v6');
const MODULE = 'accelerator-week-0';
export const MEDIA = {
  video: 'uploads/2026/11/v6-orientation-01.mp4',
  poster: 'uploads/2026/11/v6-orientation-01.jpg',
  transcript: 'uploads/2026/11/v6-orientation-01.vtt',
};

const sql = getSql();

async function guard(): Promise<void> {
  const [{ db }] = await sql<{ db: string }[]>`select current_database() as db`;
  if (!/^ai_lms_(v6|dev)/.test(db)) throw new Error(`Refusing to touch ${db}: this script is for a local development database.`);
}

async function content(): Promise<void> {
  const [session] = await sql<{ id: string }[]>`select id from sessions where kind = 'live_build' order by start limit 1`;
  if (!session) throw new Error('No live build session: run db:curriculum first.');
  const [row] = await sql<{ checklist: { id: string; paths?: unknown }[] }[]>`select checklist from modules where id = ${MODULE}`;
  if (!row) throw new Error(`No ${MODULE}: run db:curriculum first.`);
  const checklist = row.checklist.map((st, i) => {
    if (i === 1) return { ...st, paths: { claude: { blocks: mockupStep2Blocks(MEDIA, session.id) } } };
    if (i === 3) return { ...st, paths: { claude: { blocks: MOCKUP_STEP4_BLOCKS } } };
    if (i === 4) return { ...st, paths: { claude: { blocks: MOCKUP_STEP5_BLOCKS } } };
    return st;
  });
  await sql`update modules set checklist = ${JSON.stringify(checklist)}::jsonb, prompt = ${MOCKUP_PROMPT}, files = '[]'::jsonb where id = ${MODULE}`;
  const files: [string, string, string][] = [
    [MEDIA.poster, resolve(HANDOFF, 'mockup/media/w0-02-orientation-narrated-v5-poster.jpg'), 'image/jpeg'],
    [MEDIA.transcript, resolve(HANDOFF, 'mockup/media/w0-02-orientation-narrated-v5.vtt'), 'text/vtt'],
    // The orientation's mp4 is not in the handoff (HANDOFF §8.9): V6_VIDEO is a stand-in of the same length.
    [MEDIA.video, process.env.V6_VIDEO ?? '', 'video/mp4'],
  ];
  for (const [key, path, type] of files) await putObject(key, readFileSync(path), type);
  console.log(`Week 0 steps 2, 4 and 5 written; the first live build is ${session.id}; 3 files in ${process.env.S3_BUCKET}.`);
}

async function reset(): Promise<void> {
  const email = process.env.SEED_TEST_MEMBER_EMAIL;
  if (!email) throw new Error('SEED_TEST_MEMBER_EMAIL is not set.');
  const [u] = await sql<{ id: string; is_test: boolean }[]>`select id, is_test from users where lower(email) = lower(${email})`;
  if (!u) throw new Error('No such learner.');
  if (!u.is_test) throw new Error('That learner is not the seeded test account; refusing.');
  await sql.begin(async (tx) => {
    await tx`delete from checklist_state where user_id = ${u.id} and module_id = ${MODULE}`;
    await tx`delete from video_progress where user_id = ${u.id}`;
    await tx`delete from learner_prefs where user_id = ${u.id}`;
    await tx`insert into progress (user_id, module_id, steps) values (${u.id}, ${MODULE}, '["c1"]'::jsonb)
             on conflict (user_id, module_id) do update set steps = excluded.steps, built_at = null, deployed_at = null`;
  });
  console.log('Test learner reset: step 1 done, nothing checked, no video progress, Reference closed.');
}

await guard();
const what = process.argv[2];
if (what === 'content') await content();
else if (what === 'reset') await reset();
else throw new Error('Usage: prepare.ts content | reset');
await sql.end();
