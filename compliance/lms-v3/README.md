# LMS v3's acceptance runs (D-225)

The test lives in the handoff, unchanged: `handoff/lms-v3/diff/pixel-diff.mjs` (264 checks against the mockup,
no different pixel). This folder holds what the LMS needs around it: the content the mockup's words come from, the
test learner's starting point, and a reset before every shot. The session and the hook are the step page's
(`compliance/step-page-v6/signin.mjs`, `reset-hook.mjs`).

| File | What it does |
|---|---|
| `prepare.ts content` | On a **development** database: writes what the package's sample data has and the curriculum seed doesn't (step 6 at 30 minutes, the done-when lines' periods, the operator's time, the check items behind step 3's "In progress" and step 5's "Waiting on step 6"), and opens the cohort's pre-launch preview (Week 0 open, the rest locked with their dates). |
| `prepare.ts reset` / `reset.sql` | The test learner (`SEED_TEST_MEMBER_EMAIL`, flagged `is_test`, D-200) back to the tests' start: step 1 done, step 3 in progress, step 5 waiting, not deployed, only Week 0 open (no early access), the intake a draft of the package's sample answers saved Thu Nov 19, 4:02 PM CT, sidebar expanded and light theme, Alex Morgan of Northline Realty. Refuses any other account. |

## Local run

```sh
# Postgres and the variables (a development database whose name starts ai_lms_v3 or ai_lms_dev):
export DATABASE_URL=postgres://…/ai_lms_v3 SESSION_SECRET=… TZ=America/Chicago
export SEED_TEST_MEMBER_EMAIL=… SEED_TEST_MEMBER_PASSWORD=… SEED_TEST_MEMBER_KIND=accelerator SEED_TEST_MEMBER_NAME='Alex Morgan'
pnpm --filter @ai/api db:migrate && pnpm --filter @ai/api db:curriculum
pnpm --filter @ai/api exec tsx ../../compliance/lms-v3/prepare.ts content
# The app served by the API (one origin, as Railway serves it). The test learner sees v3 without VITE_LMS_V3.
(cd apps/web && VITE_LEARNER_V2=true VITE_STEP_PAGE_V6=true VITE_DATA_SOURCE=http npx vite build --mode parity --outDir dist)
(cd apps/api && PORT=4300 APP_URL=http://127.0.0.1:4300 pnpm exec tsx src/server.ts) &
node compliance/step-page-v6/signin.mjs http://127.0.0.1:4300 auth.json
cd handoff/lms-v3
export V6_RESET_CMD="psql $DATABASE_URL -v email=$SEED_TEST_MEMBER_EMAIL -f ../../compliance/lms-v3/reset.sql"
export V6_READY='body[data-app-ready="true"] #sh-app'   # what says the app has drawn (the hook's default is the step page)
node --import ../../compliance/step-page-v6/reset-hook.mjs diff/pixel-diff.mjs \
  --target http://127.0.0.1:4300/learn/week/0 --target-schedule http://127.0.0.1:4300/learn/schedule \
  --target-locked http://127.0.0.1:4300/learn/week/1 --storage-state ../../auth.json   # in parts, as HANDOFF §3
```

`TZ=America/Chicago` because the mockup shows a Central-time viewer: `fmt` prints the viewer's zone first, and the
program's (Central) only in parentheses when they differ. Never point any of this at production or a real buyer.
