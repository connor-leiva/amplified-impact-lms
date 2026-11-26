# Phase 11 Step 1: the Full Pixel Gate, Local Run (Nov 25, 2026)

`handoff/lms-v3/diff/pixel-diff.mjs`, **unchanged**, with no `--max-px`, no mask and no re-captured reference. The pass bar is no different pixel and the same size in every check.

## The Build and the Data

- **Build.** `apps/web` with `VITE_LEARNER_V2=true VITE_LMS_V3=true VITE_DATA_SOURCE=http` (`--mode parity`, so the build guard stands aside, as `compliance/lms-v3/README.md` does), plus the web build's second step (`vite.ai101.config.ts`). It was served by the API on one origin at `http://127.0.0.1:4300`.
- **Branch.** This PR's branch, which carries PR B (connor-leiva/amplified-impact-lms#273) with Connor's answers: the build that ships when the flag is turned on.
- **Database.** A local development database (`ai_lms_v3`), never production:
  - `db:migrate`, `db:curriculum` and `skills`;
  - `compliance/lms-v3/prepare.ts content` and `prepare.ts community`;
  - the seeded test learner (`SEED_TEST_MEMBER_KIND=accelerator`), reset before every shot by `reset.sql` through `reset-hook.mjs`.
- **Browser.** Chrome for Testing 153 (chromium-1243), `TZ=America/Chicago`, as the README says.

## Results

**Rerun on the final build, with D-259** (Connor, Nov 25: every learner-portal time on one line, "12:00 PM MT / 1:00 PM CT"). That build is this PR's head before it was restacked on connor-leiva/amplified-impact-lms#270, which changes only the admin side. The mockup carries D-257's darker green and phone grid rows, and D-259's phone meter wrap: sha256 `1b150f32…`, where v7 was `ab62643b…`. The harness and the mockup moved together, so the harness is still at zero.

| Part | How it ran | Checks | At 0 px |
|---|---|---|---|
| The package's own harness against the mockup (every state, the local-only ones included) | `node diff/pixel-diff.mjs` | 260 | **260** |
| Learner s1 (week, Schedule, locked week, Community, thread) | `--assume s1` | 86 | 2 |
| Learner s7, s8, deployed | `--assume s7 \| s8 \| deployed` | 7 + 5 + 5 | 0 |
| The form drawer, intake new and submitted | `--assume-form new \| submitted --match '^form-'` | 4 + 6 | 0 |
| Staff in the Community (phone whole page; desktop the page alone, as the README says) | `--assume-as cl` | 2 + 1 + 1 | 1 |
| Turn in: report, checkpoint, turned (the drawer alone) | `--assume-turnin …` | 3 + 2 + 4 | 7 |
| **The app, all parts** | | **126** | **10** |

**Before D-259 the app was at 30 / 126** (the run before this one). **The 20 checks that moved are all D-259's line**, longer than the mockup's "1:00 PM CT":
- **The top bar's next session** on the Community and thread pages, "Wed, Dec 2 · 12:00 PM MT / 1:00 PM CT" (`cm-*` at 1440 and 390, and the staff list at 390). Crop: `cause-times-top-bar-1440.png`.
- **The thread at 390** (`th-open`, `th-staff`) is 71 px taller, because the longer line wraps.
- **The thread at 1440** (`th-hover-act`, `th-staff`).
- **The Schedule hero's meta at 390** (`sched-cal-open`): the length and "Zoom" go to a second line. Crop: `cause-times-schedule-hero-390.png`.
- **Turn in's stamp** (`ti-view-sent` at 1440 and 390), "Thu, Nov 19 · 3:02 PM MT / 4:02 PM CT" where the mockup has "Thu, Nov 19 · 4:02 PM".

**Still at 0 px (10):**
- Turn in's report and checkpoint drawers, and its new-version state;
- the staff Community list at 1440 (the page alone, without the top bar);
- the phone's compose sheet (`cm-compose-open`, `cm-compose-space-kept`), which covers the top bar.

**The rest differ as in the run before**, for the content decisions that came after the v7 mockup was drawn. The mockup was never updated for them:

- **D-243 (Nov 24), "operator" is "AI Implementer"**, in 40 code strings and the course data. The role filter reads "AI Implementer" (142 px wide, where the mockup's "Operator" is 100 px). The tags read "Owners and AI Implementers". Step titles and role tags change ("Name Your AI Implementer", "AI Implementer"), as do the Reference's "Owner and AI Implementer" and the Schedule's "AI Implementer about 2 hr 20 min".
  - The longer words wrap, so the phone week page is 58 px taller than the mockup's.
  - Crops: `cause-week-ai-implementer-1440.png`, `cause-week-ai-implementer-2-1440.png` and `cause-schedule-1440.png` show the target above and the mockup below.
- **D-249 (Nov 24), Week 1 opens Sun, Nov 29.** The locked Week 1 reads "Opens Sun, Nov 29 · 1:00 PM CT", with 8 days 21 hr to go at the test's clock. The mockup reads Wed, Dec 2 and 11 days 21 hr. Crop: `cause-locked-week-1-dates-1440.png`.
- The form drawer's kicker is "Week 0 · Step 1 · Owner and AI Implementer" (D-243). So every `form-*` check differs in its first line, and the drawer's 22 questions are the repo's own.

**So the gate cannot reach zero against the v7 mockup on today's `main`, by design.** No code fix can close it. It needs either:
- the mockup updated to carry D-243's words and D-249's dates, as a v8 that Connor approves, with the package rebuilt; or
- Connor's call to accept these listed content differences.

I did not touch the reference, a threshold or a mask.

## Not Run

- **The live-session moments** (`--assume-clock soon | live | ended | nextday`: `top-soon`, `top-live`, `sched-live`, `sched-ended`, `sched-nextday` and the rest). They need the data seeded for each moment: the week open, the session marked live, the replay posted, under the API's own clock. `compliance/lms-v3` has no seed for them, so I didn't run them. They draw the same AI Implementer words and dates, so they would differ for the same reasons.
- **A deployed preview.** `.railway/railway.ts` defines a `staging` environment (`staging.amplifiedimpact.io`). From this session that host did not answer: the session's network proxy refused the connection, so I can't tell whether anything is deployed there. I did not create an environment. **Connor decides whether this local run stands in for the deployed preview.**

## Reports

- `handoff/lms-v3/results/report.rollout-*.json`: every check's pixels and sizes, one file per part.
- The images are local only (`results/*.png` is ignored).
