# The v6 step page's acceptance runs (D-210)

The three tests live in the handoff, unchanged: `handoff/step-page-v6/diff/pixel-diff.mjs` (A),
`diff/video-parity.mjs` (B) and `diff/piece-review.mjs` (C). This folder holds what the LMS needs around them:
the test learner's starting point, its session, and a hook that resets it before every shot.

| File | What it does |
|---|---|
| `prepare.ts content` | On a **development** database: writes Week 0 steps 2, 4 and 5 as the mockup draws them (`apps/web/src/routes/learn/step-page/test/mockup-step2.ts`), the week's system prompt, and the video's poster, transcript and file into the bucket. |
| `prepare.ts reset` / `reset.sql` | The test learner (`SEED_TEST_MEMBER_EMAIL`, flagged `is_test`, D-200) back to the tests' start: step 1 done, step 5 waiting, nothing checked, no video progress, Reference closed. Refuses any other account. |
| `signin.mjs` | A password sign-in through `/api/auth/login`, saved as the browser's storage state. |
| `reset-hook.mjs` | Loaded with `node --import` for tests A and B. Before every shot that uses the saved session it runs `V6_RESET_CMD`, spaces the shots under the API's 100-requests-a-minute limit (`V6_SHOT_GAP_MS`, 30 s), and waits for the app to draw after `load`. It changes nothing in the tests. |

## Local run (what the PR's numbers come from)

```sh
# Postgres, a bucket (any S3-compatible server; s3rver works), and the variables:
export DATABASE_URL=postgres://…/ai_lms_v6 S3_ENDPOINT=http://127.0.0.1:4569 S3_BUCKET=… S3_ACCESS_KEY_ID=… S3_SECRET_ACCESS_KEY=… S3_URL_STYLE=path
export SEED_TEST_MEMBER_EMAIL=… SEED_TEST_MEMBER_PASSWORD=… SEED_TEST_MEMBER_KIND=accelerator
export V6_VIDEO=<an mp4 of the orientation's length>   # the real file is not in the handoff (HANDOFF §8.9)
pnpm --filter @ai/api db:migrate && pnpm --filter @ai/api exec tsx src/db/seed.ts --curriculum
pnpm --filter @ai/api exec tsx ../../compliance/step-page-v6/prepare.ts content
# The app with both flags on, served by the API (one origin, as Railway serves it):
(cd apps/web && VITE_LEARNER_V2=true VITE_STEP_PAGE_V6=true VITE_DATA_SOURCE=http npx vite build --mode parity --outDir dist)
(cd apps/api && PORT=4300 APP_URL=http://127.0.0.1:4300 SESSION_SECRET=… pnpm exec tsx src/server.ts) &
node compliance/step-page-v6/signin.mjs http://127.0.0.1:4300 auth.json
# The tests, from the handoff folder:
cd handoff/step-page-v6
export V6_RESET_CMD="psql $DATABASE_URL -v email=$SEED_TEST_MEMBER_EMAIL -f ../../compliance/step-page-v6/reset.sql"
URL=http://127.0.0.1:4300/learn/week/0/step/2
node --import ../../compliance/step-page-v6/reset-hook.mjs diff/pixel-diff.mjs --target $URL --storage-state ../../auth.json
node --import ../../compliance/step-page-v6/reset-hook.mjs diff/video-parity.mjs --target $URL --storage-state ../../auth.json
node diff/piece-review.mjs --target $URL --storage-state ../../auth.json --reset "$V6_RESET_CMD"
```

`--mode parity` only skips the learner-v2 build guard (`src/build/learner-parity-guard.ts`), which asks GitHub for
CI's `parity-learner` result on the commit; nothing else reads the mode.

## Deployed preview

The same three commands with `URL` set to the preview's step page and `auth.json` from `signin.mjs` against the
preview's origin. The preview needs `VITE_STEP_PAGE_V6=true` and `VITE_LEARNER_V2=true` at build time, the D-202
test learner's variables, and Week 0 step 2 entered in the Week Builder exactly as `test/mockup-step2.ts` has it.
`V6_RESET_CMD` must reach the preview's database (for example `railway run psql … -f reset.sql`). Never point any
of this at production or at a real buyer.
