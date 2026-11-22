# LMS v3's acceptance runs (D-225)

The test lives in the handoff, unchanged: `handoff/lms-v3/diff/pixel-diff.mjs` (264 checks against the mockup,
no different pixel). This folder holds what the LMS needs around it: the content the mockup's words come from, the
test learner's starting point, and a reset before every shot. The session and the hook are the step page's
(`compliance/step-page-v6/signin.mjs`, `reset-hook.mjs`).

| File | What it does |
|---|---|
| `prepare.ts content` | On a **development** database: writes what the package's sample data has and the curriculum seed doesn't (step 6 at 30 minutes, the done-when lines' periods, the operator's time, the check items behind step 3's "In progress" and step 5's "Waiting on step 6"), and opens the cohort's pre-launch preview (Week 0 open, the rest locked with their dates). |
| `prepare.ts community` | The package's sample Community (`handoff/lms-v3/src/data/community.samples.json`) with its own ids (thread 2, `[data-post="23"]`): five threads and seven posts by the test learner, a made-up learner (Dana Whitlock, Sample Team) and a made-up staff member (Connor Leiva), at the sample's times. With `LMS_V3_STAFF_PASSWORD` set, that staff member (`v3-staff@example.test`) can sign in, for the staff checks. Run it again after anything posts. |
| `turnin.sql` | After `reset.sql`, the test learner where a Turn in check starts (`-v turnin=report\|checkpoint\|turned`): Week 1 open (early access; `prepare.ts content` gives its steps 4 and 6 the Upload action), and nothing turned in, or the package's sample report turned in (Thu Nov 19, 4:02 PM CT). |
| `prepare.ts reset` / `reset.sql` | The test learner (`SEED_TEST_MEMBER_EMAIL`, flagged `is_test`, D-200) back to the tests' start: step 1 done, step 3 in progress, step 5 waiting, not deployed, only Week 0 open (no early access), the intake a draft of the package's sample answers saved Thu Nov 19, 4:02 PM CT, sidebar expanded and light theme, Alex Morgan of Northline Realty. Refuses any other account. `reset.sql -v state=s7|s8|deployed` is the same learner in the pixel test's `--assume` states (every step but 5, all eight, deployed). |

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

The Community (D-231), after `prepare.ts community`: add `--target-community http://127.0.0.1:4300/learn/community
--target-thread http://127.0.0.1:4300/learn/community/2` with `--match '^(cm-|th-)'`. The staff checks: a staff session
(`SEED_TEST_MEMBER_EMAIL=v3-staff@example.test SEED_TEST_MEMBER_PASSWORD=$LMS_V3_STAFF_PASSWORD node
compliance/step-page-v6/signin.mjs http://127.0.0.1:4300 staff.json`), `--storage-state staff.json --assume-as cl`; at
1440 compare the page alone, `--selector '[data-ai="community"]'` with `--target …/learn/community`, and
`--selector '[data-ai="thread"]'` with `--target …/learn/community/2` (a staff member's sidebar is their own).

Turn in (D-230): for each of `report` (step 4), `checkpoint` (step 6) and `turned` (step 4), run with
`V6_RESET_CMD="psql … -f reset.sql && psql … -v turnin=<state> -f turnin.sql"`, `V6_READY='[data-step-page] .page'`,
`--target <step url> --target-turnin <step url> --assume-turnin <state> --match '^ti-'`. The drawer is compared on its own;
the step's button is the harness's default selector, `[data-act="turnin"]`.

The piece and motion reviews (IMPLEMENTATION-SPEC Phase 11 step 2, PROMPT.md Phase 3 B to D): the same hook and
session, one run at a time (they share the learner's session and the API's 100-a-minute limit). Each script's header
says what it compares. Their reports go to `handoff/lms-v3/results/` as `piece-review.<tag>.md` and
`motion-review.<tag>.md` (with `.json`); their images to `results/pieces/` and `results/motion/` (not committed).

```sh
cd handoff/lms-v3
O=http://127.0.0.1:4300
export V6_RESET_CMD="psql $DATABASE_URL -q -v email=$SEED_TEST_MEMBER_EMAIL -f ../../compliance/lms-v3/reset.sql"
export V6_READY='body[data-app-ready="true"] #sh-app'
PAGES="--target $O/learn/week/0 --target-schedule $O/learn/schedule --target-community $O/learn/community --target-thread $O/learn/community/2"
node --import ../../compliance/step-page-v6/reset-hook.mjs diff/piece-review.mjs $PAGES --storage-state ../../auth.json \
  --views week,week-collapsed,week-calendar,week-form,schedule,community,community-start,thread --tag local
node --import ../../compliance/step-page-v6/reset-hook.mjs diff/motion-review.mjs $PAGES --storage-state ../../auth.json --tag local
# Turn in: the learner at Week 1 step 4 (turnin.sql, `report`), whose own button opens the drawer.
export V6_RESET_CMD="$V6_RESET_CMD && psql $DATABASE_URL -q -v email=$SEED_TEST_MEMBER_EMAIL -v turnin=report -f ../../compliance/lms-v3/turnin.sql"
export V6_READY='[data-step-page] .page'
node --import ../../compliance/step-page-v6/reset-hook.mjs diff/piece-review.mjs --target $O/learn/week/1/step/4 \
  --target-turnin $O/learn/week/1/step/4 --storage-state ../../auth.json --views week-turnin --tag local-turnin
node --import ../../compliance/step-page-v6/reset-hook.mjs diff/motion-review.mjs --target $O/learn/week/1/step/4 \
  --target-turnin $O/learn/week/1/step/4 --storage-state ../../auth.json --views turnin --tag local-turnin
```

Both are proven first on the package's own harness against the mockup (`node diff/piece-review.mjs`, `node
diff/motion-review.mjs`: all 0), and then with a 1 px and a 10 ms change on the harness alone (`--inject-target`).
The Community views need `prepare.ts community` first; on a deployed preview the Community and the drawers are
only opened, never posted to.

`TZ=America/Chicago` because the mockup shows a Central-time viewer: `fmt` prints the viewer's zone first, and the
program's (Central) only in parentheses when they differ. Never point any of this at production or a real buyer.
