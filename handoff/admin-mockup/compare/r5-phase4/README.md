# R-5 Phase 4, the learner side reads its own cohort (D-261)

The learner portal as **January's test team** and as **a December team**, side by side, from a real API on a seeded
database. The fixture build has no course API, so these are the http build: Chromium at device scale 2, America/Denver,
each page its whole length, at **1280** and **390**.

| File | Page | What it shows |
|---|---|---|
| `january-home-{1280,390}.png` | `/learn` | January's seven weeks (Week 0 and Weeks 1 to 6), "Your cohort · January 2027", the next live build Tue, Jan 5, and the cohort line "January 2027 Cohort · Starts Jan 3" |
| `december-home-{1280,390}.png` | `/learn` | December as before: nine weeks, Week 1 and later locked in the preview, the first live build Wed, Dec 2 |
| `january-week-3-{1280,390}.png` | `/course/week-3`, which goes to `/learn/week/3` | January's third week, its live build Tue, Jan 19 and office hours Thu, Jan 21 |
| `december-week-3-{1280,390}.png` | the same address | December's third week, locked in the preview, opening Wed, Dec 16 |
| `january-schedule-{1280,390}.png` | `/learn/schedule` | "Tue live build and Thu office hours", seven weeks from Tue, Jan 5 to Thu, Feb 11; "Add all to calendar" is January's own file (`/calendar/schedule.ics?cohort=…`) |
| `december-schedule-{1280,390}.png` | `/learn/schedule` | December's schedule and holiday break, and the welcome page's calendar file, as before |
| `january-community-{1280,390}.png` | `/learn/community` | January's spaces (General, Weeks 0 to 6, Wins) and January's one thread only |
| `december-community-{1280,390}.png` | `/learn/community` | December's spaces open in the preview and December's one thread only |

## How they were made

1. A database of production's shape: § 9.5's launch seed (`seedProduction`), every one-time data step the deploy runs
   (`applyDataMigrations`), and December's preview opening Mon, Nov 23 at 9:00 AM MT (the December test's own choice).
2. A December team, bought in full on Nov 14 and provisioned by the webhook's own function (`provisionOrder`).
3. Connor's January, made on Nov 25 through the real admin action (`POST /api/admin/actions/createCohortFromShape`:
   six weeks, Tuesday live build and Thursday office hours at 12:00 PM MT, Week 1 opening Sun, Jan 3). It stores no
   words of its own yet, so it reads the program's (December's row), as PLAN.md § 10.3 drafts a new cohort's words.
4. The test team, placed in January by hand: the deploy's own step, `seedTestMember`, with
   `SEED_TEST_MEMBER_KIND=accelerator` and `SEED_TEST_MEMBER_COHORT=<January's id>`. A test account with early access
   (D-202), so every January week is open to it; it is no seat, and nothing is sent to it or to GoHighLevel.
5. One Community thread from each team, on Nov 26.
6. The web app built in http mode with the learner portal on (`VITE_DATA_SOURCE=http VITE_LEARNER_V2=true
   VITE_LMS_V3=true vite build --mode parity`), served by the API (`NODE_ENV=test`, so `/api/test/session` signs a
   test in) on the real clock (Thu, Nov 26, 2026).
7. `node handoff/admin-mockup/compare/r5-phase4/shoot.mjs <base> <December owner's id> <test team's id>`.

`VITE_LMS_V3=true` puts both teams in the same frame: the test team, a test account, gets the v3 pages whatever the flag
says (D-226), and the Community is a v3 page. With the flag off, a December team gets today's v2 pages, which read their
cohort the same way.

## What to look at

- Every date on January's pages is January's: Jan 3, Jan 5, Jan 19, Feb 11. Nothing of December's sessions, threads or
  replays appears on them, and the reverse.
- Words that are lesson content still name December where the lesson does: Week 0's outcome "Every team at the same
  starting line by Mon, Nov 30", and Week 1's step "Save the live build" (Wed, Dec 2). The spec leaves lesson content
  to Connor and Spring's read before January opens (§ 8); D-261 lists both.
- January's promise, how it works and holiday note are December's until January stores its own (Phase 3's Edit words).
