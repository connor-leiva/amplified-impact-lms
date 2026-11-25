# R-5, Phase 0: the plan

The admin restructure (`ADMIN-RESTRUCTURE-SPEC.md`), planned against `main` @ `babceae` (PR #264), Nov 25, 2026. This is
Phase 0: recon, this plan and the December test. No product code changes in this pull request. **Nothing else starts
until you have read it.**

How to read it: section 1 is what I need from you. Section 2 is every place the spec, the mockup and the code disagree,
each with what I propose. Section 3 is the December test, which passes on `main` today. Sections 4 to 9 are the
mechanism, the file-by-file audit, the week builder and Course settings mapping, the references, and the phase list.

---

## 1. What I need from you

Your decisions, and the phase each one blocks. Q-20 to Q-25 are the spec's (section 8); Q-26 on are new from this
recon and are explained in section 2.

| # | Question | Blocks |
|---|---|---|
| Q-26 | The Dates and release dialog in the mockup has no field for **when the welcome email sends** and none for the free-text **cadence**, which learners read today. Where do they go? (2.1) | Phase 3 |
| Q-27 | The mockup says December's weeks open "Every Sunday"; its Weeks 2 to 8 open on Wednesdays. May the line be computed from the run? (2.2) | Phase 3 |
| Q-28 | December's shape: derive it for display and never store it (my recommendation), or name a second December data step? (2.4) | Phase 3 |
| Q-29 | What the status pill says after a cohort's last session and before it is archived. (2.5) | Phase 3 |
| Q-30 | The price dialog's sentence "Saving makes this cohort's own checkout in Stripe…" says the code makes a checkout, which the spec and you forbid. What should it say? (2.3) | Phase 5 |
| Q-31 | Nine fields or groups of fields in today's week builder and Course settings have no section in the mockup (bold in section 6). Is my placement right? | Phase 6 |
| Q-32 | `december-others.ts` is the one file a phase may add to while the December test stays unchanged. Is that the right reading of "passes unchanged"? (3.4) | Phase 3 |
| Q-33 | GoHighLevel's Cohort field (`GHL_FIELD_COHORT`) gets `dec26` for every Accelerator buyer. Is it free text, or a dropdown that needs a January option made in GHL by you? (2.14) | Phase 4 |
| Q-21, Q-22 | Stripe price and links for January; what a January seat includes after its last session, and when Insiders starts billing. | Phase 5 |
| Q-23, Q-24, Q-25, Q-20 | As the spec states them. | Phase 5 (Q-23), none (Q-24), Phase 8 (Q-25), Phase 9 (Q-20) |

Phases 1 and 2 can start once you have read this. Neither needs an answer above.

---

## 2. Where the spec, the mockup and the code disagree

The rule from the brief: where they disagree, stop and tell. These are all of them that I found. Each says what I
propose, so a "yes" is enough.

### 2.1 Spec vs mockup: what the Dates and release dialog holds (Q-26)

- **Spec** (Phase 3 and section 7): Dates and release "holds today's Release plan fields from `CourseSettings.tsx`
  (`saveCohortPlan`: name, preview opens, default open time, welcome email time)", and "its top four fields are today's
  Release plan fields; Each week is new".
- **Mockup** (`p3-cohort.jsx` lines 180 to 186): the dialog's fields are Week 1 opens, A week opens at (MT), Setup week
  opens (or Preview opens), its Time (MT), and Each week. Week 1 opens is not a Release plan field.
- **Today's Release plan card** (`CourseSettings.tsx` lines 109 to 125) has six fields: Cohort name, Cadence, Preview
  opens (MT) with its time, A week opens at (MT), Welcome email sends at (MT) with its time.

What has a home in the mockup and what does not:

| Today's field | Mockup |
|---|---|
| Cohort name | Words from this cohort › Edit words (Name). Not in Dates and release. Fine as drawn. |
| Preview opens + time | Dates and release › Setup week opens + Time (MT) |
| A week opens at (MT) | Dates and release › A week opens at (MT) |
| Welcome email sends at + time | **No field.** The card shows "Welcome email: Sun, Nov 29 · 12:00 PM MT" read-only. |
| Cadence | **No field anywhere.** Learners read it: it is the Schedule page's subtitle when the `schedule.subtitle` copy string is empty (`routes/learn/Schedule.vm.ts:534`). |

Proposal: add "Welcome email sends at (MT)" and its Time as a third row in the Dates and release dialog, in the mockup's
`g2` style. For cadence: a new cohort's is written from its shape when it is created ("Tue live build and Thu office
hours", as the mockup's "Meets" line says) and is then not edited anywhere, and December's stored cadence stays as it
is. Both are additions to the mockup, so I need your yes.

### 2.2 Mockup vs December's data: "A week opens · Every Sunday" (Q-27)

The Dates and release card draws "A week opens: Every Sunday · 12:00 PM MT · 1:00 PM CT for learners" for December.
December's stored weeks open at their live build: Week 1 on Sun, Nov 29 (D-249), Weeks 2 to 8 on Wednesdays at
12:00 PM MT (`seed/release-plan-v1.ts`, `WEEK_OPENS_V1`). The line would be wrong for December. The mockup's December
run ("Week 2 opens Sun, Dec 6") is sample data, so this is the one place the line's wording, not just its numbers, is
at stake.

Proposal: the line is computed from the run, over the weeks after Week 1 (Week 1 has its own line above it). When they
all open on the same weekday at the same time it says so: December reads "Every Wednesday · 12:00 PM MT · 1:00 PM CT
for learners", and your January reads "Every Sunday · 12:00 PM MT · 1:00 PM CT for learners". When they do not
(after "Each week" moves one), I need the words from you.

### 2.3 Mockup vs spec and your rule: the price dialog (Q-30)

`p3-cohort.jsx` line 178, under "Price for a seat": "Saving makes this cohort's own checkout in Stripe, so every buyer
and every dollar is filed under it." The spec's Phase 5 says the code never creates a Stripe price or a Payment Link,
and your brief says never create or change one. The sentence cannot be built as written. Phase 5 needs a replacement
sentence from you. Nothing before Phase 5 draws this dialog.

### 2.4 Spec gap: December's shape is a second December rewrite (Q-28)

The spec names one December rewrite: the data step that writes December's run (Phase 3). But Cohort › Settings › Shape
draws a shape for December (length, setup week, each meeting's weekday, time, kind and length, hosts), and the spec's
table in section 2 puts shape on the cohort. Writing December's shape would be a second rewrite the spec does not name.

December also does not fit one rhythm: Thursdays Dec 10 and Dec 17 are goal-planning sessions, with that week's office
hours on Friday Dec 11 and Dec 18 (`dec26-fri-oh2`, `dec26-fri-oh3`, D-176), and there are no sessions the weeks of
Dec 21 and Dec 28. `planOf` cannot reproduce that calendar.

Proposal: December's shape is **derived for display** from its run and its sessions (8 weeks of building after a setup
week, the most common slot per kind: Wednesday 12:00 PM MT live build 90 min, Thursday 12:00 PM MT office hours 60 min)
and is never stored. December's sessions are never laid out again by a shape change (2.6). Editing December's shape
in Settings is then allowed only for Hosts. The alternative is that you name a second data step.

### 2.5 Spec gap: status words after the last session (Q-29)

The spec says the status words are Draft, Scheduled, Active, that `cohorts.status` stays what the jobs read, and asks
how `live` and `completed` are set today. **They are not set.** December's row is `enrolling` from the seed
(`seed/accelerator-v1.ts:131`); the only write is `openEnrollment` (`mutations.ts:902`, draft to enrolling); `live` and
`completed` are written only by the demo seed's time machine (`seed.ts:458`, `:481`). The jobs treat `live` and
`enrolling` alike (`jobs/due.ts:220`, `underWay`). So R-5 keeps that: it never writes `live` or `completed` either.

The words are then derived: **Draft** when `draft`; **Active** from the cohort's first week opening (its setup week, or
Week 1) to the end of its last session; **Scheduled** before that. The mockup has no word for after the last session
and before archive (the mockup's Archive toast says archiving is "allowed after its last session"). Proposal: it stays
**Active** until archived. Your call.

### 2.6 Spec gap: "a session staff edited by hand" has no record today

Phase 2 says changing a shape lays out again only what has not happened, and leaves a session staff edited by hand
alone. Nothing records which sessions a layout made. Proposal: a session the layout makes carries its slot (a new
nullable column, `sessions.slot`); a session without one is hand-made and is never moved or deleted by a layout. Every
December session has none, so no shape or run change can move one of them.

### 2.7 Spec gap: three small stored facts the mockup needs

The mockup's "Before it opens" list needs two facts nothing stores: "Words learners see: opened once" (the mockup's
`COH.read`) and "the overlap acknowledged". Proposal: `cohorts.words_checked_at` and `cohorts.overlap_ok_at`, nullable,
by D-173's rule. The Settings price field (Phase 5) is `cohorts.price_cents`, what you expect Stripe to say, and never a
price written in code. All three are additions to the spec's `Cohort` interface; none touches December.

### 2.8 Code vs spec: the file lists miss the literal `'dec26'` reads

The spec's three counts are exact at `babceae` (19, 29 and 27 files). But 17 more files (23 lines, plus three
fixtures) name December by its literal id, or Week 0 by its module id, which a search by constant name cannot find.
They are in section 5's last table. Two of them matter before Phase 4: `sessions.ts:73` (`accessibleSessions` falls
back to `'dec26'`) and `shell/AppShell.tsx:44` (`DEFAULT_COHORT = 'dec26'`).

### 2.9 Code vs spec: every learner receives every cohort's row

`scopeSnapshot` sends a learner `db.cohorts.map(cohortForLearner)` (`scope.ts:314`): every cohort, minus its course
words. With January in the database, a December learner's snapshot would carry January's row. The December test fails
on that (it compares each learner's snapshot), which is the point. Phase 2 scopes the snapshot to the viewer's own
cohort. For December alone that is the same output, so the test passes.

### 2.10 Code vs spec: the welcome and Week 0 emails read no cohort's weeks

`jobs/enrollments.ts:90` (`readWeeks`) reads every module with no cohort. The spec's Phase 4 says "check they read
January's weeks through the run". They do not today; Phase 4 makes `readWeeks` take the cohort and read its run.

### 2.11 Code vs spec: two creates

The prototype's `createCohort` (`mutations.ts:856`: mutation 19 of the phase 02 catalog, the reference's dashed "New
Cohort" card, differential-tested against `design-reference/lms-data.js`) makes a Tuesday-and-Thursday cohort with six
sessions. R-5's "create a cohort from a
shape" is a new course action in `course-actions.ts`'s style. The ported mutation stays as it is (its oracle and
differential tests pin it); no screen of R-5 calls it.

### 2.12 Not a disagreement, recorded: the admin's zone moves from MST to MT

BUILD-SPEC § 7 set the admin's zone to MST (America/Phoenix); `Cohorts.tsx:153` says so and `curriculum-week.ts` buckets
days in MST. The spec's rule 3 moves the admin to MT (America/Denver). Between November and March the two are the same
hour, so December reads the same; from mid-March MT is an hour later. Recorded in Phase 3's decision entry, as the spec
asks.

### 2.13 Not a disagreement, recorded: the words dialog

The mockup's Edit words toast says "The portal fills them in from the shape until you change one". The spec says the
words are drafted when the cohort is created and are then ordinary stored text. The spec wins on what is stored, and
the toast is a placeholder for the dialog, so nothing on screen says otherwise.

### 2.14 Spec gap: GoHighLevel's Cohort field (Q-33)

`integrations/ghl.ts:589` writes `dec26` into the contact's Cohort custom field for every Accelerator order. The spec's
Phase 4 has it send the plan's cohort instead. If that field is a dropdown in GoHighLevel, a January value needs a new
option, which only you can add (the code never changes GoHighLevel). If it is free text, nothing is needed. December's
buyers keep getting `dec26` either way.

---

## 3. The December test (section 1 of the spec)

**`apps/api/test/december.test.ts`**, its golden **`apps/api/test/fixtures/december/golden.json`**, and the hook
**`apps/api/test/december-others.ts`**. It passes on `main` @ `babceae`, and so does the whole API suite with it in
(109 files, 2,937 tests). It runs in CI's `api` job with the rest of the suite, and locally in `pnpm test`.

### 3.1 The database

Production's shape, made the way production made it: § 9.5's launch seed (`seedProduction`), then every one-time data
step the deploy runs (`applyDataMigrations`, all sixteen), then December's buyers through the real paths:

| Viewer | Made by |
|---|---|
| A team owner, in full | an order + `provisionOrder` (the webhook's function) |
| A team owner, in two payments | the same |
| An AI Implementer | invited onto the first owner's team (role Operations Lead, D-243) |
| An Insiders buyer | an order for `membership` / `year_upfront` + `provisionOrder` |
| A Team Plan owner, and an agent on that team | an order for `agents` / `upto15` + `provisionOrder`, then an invite |
| A Utah Life agent | `provisionGroupMember` + `recordVerified` (D-148) |
| A single-skill buyer (D-241) | `provisionSkillBuyer` + a `skill_purchases` row |
| A test account with early access (D-202) | `seedTestMember` with `SEED_TEST_MEMBER_KIND=accelerator`, the deploy's own step |
| Staff | the launch seed's Owner |
| A buyer who enrolls after launch | bought Thu, Dec 10, inside the email sweep |
| Seats 4 to 16 | bought in the seat-cap section, the last to run |

Two fixture choices are the test's, not production's: the preview opens Mon, Nov 23 at 9:00 AM MT, and every December
session has a made-up Zoom address so the join route has something to hand out.

### 3.2 What it captures

Twelve instants: Nov 20 (before the preview), Nov 24 (in it), Nov 29 (Week 1 opens), Dec 2 at 11:50 AM MT (the join
window) and 12:30 PM MT (during the build), Dec 3 (office hours), Dec 16, Dec 27 (the holiday gap), Jan 6, Feb 4 (the
last office hours), Feb 10 (after the last session) and May 5 (after the included time ends).

| Section | What |
|---|---|
| `stored` | December's cohort row (its fields as of today), its 18 sessions whole, its 9 weeks (status, opens, due, session, week, and a hash of the course words) |
| `provision` | Every row a December checkout wrote, for every viewer: users, teams, accounts, plans, orders, group members |
| `course` | `GET /api/course` for 10 viewers at 12 instants: status, open or locked per week with its date and kit count, the sessions, and a hash of the whole body |
| `snapshot` | `GET /api/snapshot` for the 9 learners at 12 instants: cohorts, weeks, sessions, the people they can see, and a hash |
| `join` | `GET /api/sessions/:id/join` for 10 viewers × 18 sessions × 12 instants |
| `reminders` | `dueWork`, hour by hour from Nov 20 to Feb 20, with the scheduler's own roster: every send's hour, job, key, recipient and a hash of its data (176 sends) |
| `emails` | The billing loop's jobs in its order (held invites, cohort welcome, Week 0 Is Open), every three hours from Nov 13 to Dec 20, both switches on from Nov 25: every email's tick, template, recipient, subject and a hash of its data, and the enrollment rows after |
| `offer` | `GET /api/offer` at each instant, and `cartStates` at 0, 14, 15 and 16 seats |
| `calendar` | The three calendar feeds, whole |
| `seat-cap` | Real checkouts to the 14th, 15th and 16th seat: what provisioning logs, what the billing loop's `reconcileAcceleratorSeats` does to December's two Payment Links (a fake Stripe), and the offer's seats and carts; then two refunds, with founding closed (held off) and open (turned back on) |

### 3.3 How to read a failure

A failure names its section ("December moved: course"). Each row keeps a readable summary beside its hash, so the
diff says which viewer, which instant and what changed. Ids drawn at random are labels (`<owner>`,
`<plan:owner:cohort>`) and one-time tokens are `<token>`. Key order is ignored. A key that is new and null is ignored
(D-173: a new column is nullable and reads back absent); a new key with a value is a change.

I checked that it fails when December moves: a locked week's date off by a minute fails `course`; reminders sent only
to `live` cohorts fail `reminders`. Both reverted.

### 3.4 What a phase may change (Q-32)

Nothing in `december.test.ts` or its golden. The spec's Phase 3 is done when the test passes "with both cohorts in the
database", and that needs January in it. So the test calls `addOtherCohorts()` from **`december-others.ts`**, which
adds nothing today. Phase 3 creates January there through the new course action; Phase 4 puts a test team in it; Phase
5 a test-mode January buyer. December's outputs are filtered to December's people and sessions (a January learner's
own reminders are not December's), so January's own sends do not fail the test, and a December reminder that reaches a
January learner, or January's row in a December learner's snapshot, does.

`DECEMBER_CAPTURE=1` writes the golden. It refuses to run in CI. It ran on `main`, twice, with byte-identical results.

### 3.5 What it does not prove

- Production's own rows (its real dates, links and words as staff have edited them). The test proves the code
  treats a December-shaped database the same; the data steps of Phases 3, 5 and 6 each get their own before-and-after
  test against a copy of production's shape, as the spec asks.
- GoHighLevel and Stripe calls. Nothing reaches either; `integrations/ghl.ts` sends the plan's cohort (Phase 4) and has
  its own tests.
- The Stripe webhook route itself. The test calls `provisionOrder`, which is what the webhook calls.
- Community, files and replay routes. Phase 4 adds the spec's API tests for them (a January learner and a December
  learner each refused the other's).

---

## 4. The mechanism

Section 2 of the spec, with these specifics. The table in the spec's section 2 does not change.

1. **Fields.** `cohorts` gains nullable columns, no defaults (D-173): `run` (jsonb, `CohortWeek[]`), `shape` (jsonb,
   `CohortShape`), `program_id`, `archived_at`, and the three in 2.7. `sessions` gains `slot` (2.6). A null reads back
   as an absent key, so every December row, fixture and snapshot reads as before.
2. **`cohortRun(db, cohortId)`** in `packages/core`. With no stored run it is exactly `courseWeekModules(db)` today:
   the non-draft week modules in week order with their own `opens`, `dueAt` and `status`. With a run, each entry is
   its module seen through the cohort: `opens`, `dueAt`, `status` (`scheduled` when dated, else the module's) and
   `course.week = n`. `courseFor`, `courseOutline`, `courseSessions`, `weekOpenFor`, `lockedWeekOf` and `scopeSnapshot`
   keep their signatures and are handed the cohort's view.
3. **Two questions, two functions.** `isAcceleratorModule` splits into `isCourseWeek(id)` (is this a course week at
   all: an `accelerator-week-N` id; the plan gates it) and `inRun(run, moduleId)` (does this viewer's cohort take it).
   For December both answer as `isAcceleratorModule` does today. Phase 6's "Add a week" gives a new week the next
   `accelerator-week-N` id, so the first question keeps working on an id alone, as `kitVisible` and `canOpenModule`
   need.
4. **The viewer's cohort.** API: `viewerCohortId(db, userId)`: the cohort of the newest `cohort` plan of their team's
   account that has not ended, else `DEFAULT_COHORT_ID` (`'dec26'`, today's constant under an honest name). Client:
   `me.cohortId`, which the API keeps in step (written at provisioning for the owner and for anyone they add). No
   existing `users` row is written.
5. **The course's opening, per cohort.** `COURSE_OPENS_AT` (Dec 2, 1:00 PM CT, `COHORT_ONE.firstBuildAt`) becomes
   `cohortOpensAt(db, cohortId)`: the start of the cohort's first live build. For December that is `dec26-s1`'s start,
   the same instant; the test pins it. `acceleratorOpen`, `courseRoster`, `acceleratorUpcoming` and `acceleratorPaused`
   already take `opensAt` as an argument and keep doing so.
6. **Sessions.** `sessionKind`, `sessionWeek` and `moduleForSession` read the stored `kind` and `module_id` first, and
   the id only for a row with neither (D-248 already does this for `moduleForSession`). Every December row has both.
7. **The snapshot** carries the viewer's own cohort only (2.9).
8. **Layout** (`planOf`) is one pure function in core, as the spec describes, returning the weeks, the sessions and the
   warnings (an instant shared with another cohort that is not archived; a U.S. federal holiday, named, from a holiday
   list in core covering 2027 and 2028).
9. **Status words** are derived (2.5); `cohorts.status` keeps meaning what the jobs read.

---

## 5. Every read, and what it reads instead

Re-audited at `babceae`. Tests are left out, as in the spec, except the two test helpers the spec counts. **The seeds
(`packages/core/seed/`) are history and are not changed**: `accelerator-v1`, `ai-implementer-v1`, `content-v2`,
`curriculum`, `five-words-v1`, `glossary-v1`, `release-plan-v1`, `weeks-0-3-v2`. **The marketing site** (`home/`,
`kit/`) sells December and is not part of this work: `home/sections/plans.ts:65`, `home/v3/sections/offer.ts:50`,
`kit/parts.ts:100`, `kit/kit.css:934`.

### 5.1 `ACCELERATOR_COHORT_ID` (19 files)

| Read | Today | Reads instead | Phase |
|---|---|---|---|
| `api/integrations/ghl.ts:589` | a cohort plan's GHL field is `dec26` | the plan's `cohort_id` | 4 |
| `api/lib/course-access.ts:101` | `releaseOf`: December's `preview_opens_at` | the viewer's cohort's | 2 |
| `api/routes/community.ts:109` | every viewer is in `dec26` | `viewerCohortId` | 4 |
| `api/routes/curriculum-status.ts:53,55` | December's weeks and sessions | each cohort that runs the week (Curriculum's "where it runs") | 6 |
| `api/routes/offer-calendar.ts:135,164,225` | the public feeds are December's | `DEFAULT_COHORT_ID`: the feeds sell December (the spec's section 10) | 2 (rename) |
| `web/routes/admin/ModuleBuilder.tsx:764` | the glossary from December's row | the program's copy | 6 |
| `web/routes/learn/Account.vm.ts:202`, `Home.vm.ts:500`, `Replay.vm.ts:85,96,138`, `Schedule.tsx:421` | `me.cohortId ?? dec26` | `me.cohortId`; the fallback goes | 4 |
| `core/accelerator.ts:19,36,37` | the constant and the two id builders | `DEFAULT_COHORT_ID`; the builders only read December's rows | 2, 9 |
| `core/course.ts:51,109,120,156` | `cohortId` defaults to December | the caller passes it; `DEFAULT_COHORT_ID` only where the spec's section 2, item 5, says | 2 |

### 5.2 The week list and its helpers (29 files)

| Read | Today | Reads instead | Phase |
|---|---|---|---|
| `core/course.ts:25,165` | the course's weeks are the nine ids | `cohortRun` | 2 |
| `core/scope.ts:239,257,260,286,305` | lock and filter by the nine ids and each module's own `opens` | `isCourseWeek`, and the viewer's run for dates | 2 |
| `core/release.ts:89,98` | `canOpenModule`, `kitVisible` | `isCourseWeek` | 2 |
| `core/mutations.ts:225,247,300,348,382` | early access and Not in plan | `isCourseWeek`; a week outside the viewer's run is refused | 2 |
| `core/learner.ts:42,49,163` | week number to module id; `progressOn` | through the viewer's run (`n` to module) | 4 |
| `core/lms-tour.ts:25` | the tour is pinned to `accelerator-week-0` | stays: Week 0 is the program's | none |
| `api/jobs/due.ts:255` | a session's week is a course week | `isCourseWeek`; the roster is asked for the session's cohort | 2 |
| `api/routes/curriculum-status.ts:60` | the nine ids | `isCourseWeek` | 6 |
| `api/routes/files.ts:476,533,592` | course files gate | `isCourseWeek` + the viewer's run | 4 |
| `api/routes/join.ts:167` | a build's module is a course week | `isCourseWeek`; the plan of the session's cohort | 4 |
| `api/routes/offer-calendar.ts:247` | instructor by module | stays (December's rows have `module_id`) | none |
| `api/test/accelerator-course.ts:22` | test helper | stays | none |
| `web/routes/learn/Step.tsx:360`, `Step.vm.ts:385,400,629`, `Week.vm.ts:143`, `lms-v3/V3Week.tsx:103` | `/course/week-3` is `accelerator-week-3` | the viewer's run: the third week of their cohort | 4 |
| `web/routes/learn/redirects.tsx:38` | module id to week number | the viewer's run | 4 |
| `web/routes/learn/Hire.vm.ts:209`, `TeamPlan.vm.ts:92`, `shell/navModel.ts:207` | "is a course week" | `isCourseWeek` (same answer) | 2 |
| `web/routes/admin/WeekBuilder.vm.ts:311` | a week's module id from its number | the draft's own id | 6 |
| `web/routes/learn/test/fixture.ts:42` | test helper | stays | none |

### 5.3 `COHORT_ONE`, `COHORT_SEATS`, `COURSE_OPENS_AT`, the session-id builders (27 files)

| Read | Today | Reads instead | Phase |
|---|---|---|---|
| `core/accelerator.ts:34` | `COURSE_OPENS_AT = COHORT_ONE.firstBuildAt` | `cohortOpensAt(db, cohortId)` (4.5) | 2 |
| `core/offer.ts:186-202` | `COHORT_ONE`, `COHORT_SEATS` | December's record, moved by a data step | 5 |
| `core/offer.ts:500,504` | `initialPlanDates`: December's start, end and cohort | the checkout's cohort record (`ai_cohort`; none is December) | 5 |
| `core/console-billing.ts:216,268,329`, `console-billing-actions.ts:186` | 15 seats in Billing and the refund preview | the plan's cohort's seats | 5, 8 |
| `core/console-health.ts:302` | the health seat cap | each selling cohort's | 9 |
| `core/founding.ts:40,44` | the offer page's seat numbers | stays December's (the marketing page sells December) | none |
| `api/billing/provision.ts:52,187-190` | every buyer to `dec26`; the 15th and 16th seat logs | the checkout's cohort; its seats | 5 |
| `api/billing/payment-links.ts:84,108,126` | December's two links at 15 | each cohort's own links at its own seats | 5 |
| `api/billing/access-groups.ts:139` | a group member gets `dec26` | `DEFAULT_COHORT_ID` (inert; the plan is the gate) | 2 (rename) |
| `api/db/seed-test-member.ts:122,200` | a test member gets `dec26` | `DEFAULT_COHORT_ID`; a January test team is placed by hand (Phase 4) | 2 (rename) |
| `api/console/billing.ts:169` | the AI Accelerator card opens at Dec 2 | a card per cohort | 8 |
| `api/routes/offer.ts:125,401` | the offer's seats | December's record | 5 |
| `api/routes/offer-calendar.ts:156` | an office-hours UID ends `-dec26` | stays: a changed UID duplicates the event in every subscribed calendar | none |
| `api/routes/join.ts` | comments only | none | none |
| `web/routes/admin/WeekBuilder.tsx:1691` | the preview opens at Dec 2 | the previewed cohort's opening | 6 |
| `web/routes/learn/data.ts:96`, `learn.vm.ts:278` | the pre-launch line's date | the viewer's cohort's opening, sent with the course | 4 |
| `web/routes/console/build.vm.ts:136` | the Build hub's seat line | removed with the Build hub | 9 |
| `web/data/console-fixture-billing.ts:118`, `web/test/account-fixture.ts` | fixtures | stay | none |

### 5.4 Not in the spec's lists: December by its literal id

| Read | Today | Reads instead | Phase |
|---|---|---|---|
| `core/sessions.ts:73` | `accessibleSessions` falls back to `'dec26'` | `DEFAULT_COHORT_ID` | 2 |
| `core/cards.ts:90` | a card's session falls back to `'dec26'` | `DEFAULT_COHORT_ID` | 2 |
| `web/shell/AppShell.tsx:44` | `DEFAULT_COHORT = 'dec26'` | `me.cohortId` | 4 |
| `web/data/admin-shell.ts:20,55` | `ADMIN_COHORT` | the cohort in the address | 1 |
| `web/routes/admin/Cohorts.tsx:37,67` | `ADMIN_COHORT` | the cohort in the address | 1 |
| `web/routes/admin/Learners.tsx:150`, `Learners.vm.ts:364` | December's name and row | the cohort in the address | 1, 7 |
| `web/routes/admin/CourseSettings.vm.ts:10` | `courseCohort` defaults to `'dec26'` | the cohort (release plan, Phase 3); the program (copy, Phase 6) | 3, 6 |
| `web/routes/admin/Curriculum.vm.ts:41` | December | each cohort that runs the week | 6 |
| `web/routes/admin/ModuleBuilder.vm.ts:301,399,471,502` | the builder previews against December | the cohort chosen for the preview | 6 |
| `web/routes/admin/WeekBuilder.vm.ts:332` | December's preview date | the previewed cohort's | 6 |
| `web/routes/admin/Overview.vm.ts:133` | December | Overview by cohort | 9 |
| `web/routes/admin/Tiers.vm.ts:311` | December's name in the revenue line | Revenue › Summary | 8 |
| `web/routes/console/Flags.tsx:112` | the test send's cohort is `'dec26'` | the cohort being looked at | 4 |
| `web/routes/portal/TeamHub.vm.ts:199` | the prototype portal's team hub | stays (fixture portal) | none |
| `api/routes/intake.ts:36,162`, `routes/stack.ts:27,85`, `jobs/ghl-intake.ts:223` | Week 0's intake and stack card by id | stay: the program's, and every cohort's (the mockup: "Copied from December: its intake form") | none |
| `web/data/console-fixture-records.ts:131,337`, `parity-r2-db.ts:63`, `routes/__states.tsx:182` | fixtures | stay | none |

---

## 6. The week builder and Course settings, mapped to the mockup (Phase 6)

Today a week is edited on the Module Builder page (`ModuleBuilder.tsx`), with the week's cards from `WeekBuilder.tsx`
(`WeekCards`). The mockup's `WeekEdit` has six sections: Basics, Steps, Course page, Live sessions, Hire cards, Kit. No
field is added or removed (spec). **Bold** marks a field with no clear home (Q-31) and where I would put it.

### 6.1 A week

| Today (card › field) | Mockup section |
|---|---|
| Head: title, status, Preview, Save | Head: back to Curriculum, status pill, Previous and Next week, Preview, Save changes |
| Settings › Status menu (Draft, Scheduled, Published) | Curriculum's Published or Publish button. **Unpublishing (back to Draft) has no control in the mockup**: the week's menu on Curriculum |
| Edit details › Sidebar label, Outcome headline | Basics › Title, Outcome |
| Edit details › **For, the three outputs, run label, Icon** | **Basics, under Outcome** |
| Edit details › Opens, Due; Settings › Opens, Due | Leave in Phase 3. Basics › Where it runs (a line per cohort, each a link to that cohort's Dates and release) |
| Edit details › Live session (which build is the week's) | Live sessions, read-only (the cohort's session for the week) |
| Settings › **Tier access** | **Basics**. A course week follows the plan, not the tier (D-186), so it changes nothing for one; it stays because no field is removed |
| Settings › Skill guide (Linked or not) | Kit |
| Steps table, and each step's Who, Time, Done when, Goal, Linked skill, Claude path, ChatGPT path | Steps (a step opens its words, who does it, its time and both paths) |
| **Files** (the module's own files) | **Kit**, below the vault items |
| Course page › Week title, Question, Outcome, Why, Owner line, AI Implementer line, both times, Flagship, Tools, By week's end, Assignment, Checkpoint, Use evidence, Materials, Media, Start Here (title, subtitle, line, hint, both totals) | Course page |
| Week 0 Intake (`IntakeCard`), Week 0 Stack Card (`StackCard`) | **Course page, on Week 0 only** (the mockup's Week 0 has no hire, so not Hire cards) |
| Submissions (`SubmissionsCard`), Seat cards (`SeatCardsCard`) | Leave for Cohort › Submissions (Phase 7) |
| Live build › Run of show; Live build page (Lesson, Exercise, Required outcome, Advanced option, Owner approval, Working at the end) | Live sessions › Run of show, then the live build page's fields |
| Office hours › Run of show; Office hours page (Title, Note, What you leave with) | Live sessions |
| Hire cards › Seat card, Playbook card, Sample output | Hire cards |
| Hire cards › **Locked copy (Headline, Line, Opens) and Status labels** | **Basics**: they say what the week shows before it opens |
| Sessions (add, edit, delete) | Leave in Phase 3 for Cohort › Schedule; Live sessions shows them read-only, each linking there |
| Kit skills (Skill title, Library route, Role) | Kit |
| Kit (vault items: What it is, Who sees it and when, Platform) | Kit |
| Preview | Head › Preview |

### 6.2 Course settings

The mockup's `CourseSet` has eight sections: Course intro, Roles, Rules and support, Before Week 1, After the cohort,
Joining and community, Glossary, Words.

| Today (`CourseSettings.tsx`) | Mockup |
|---|---|
| Release plan (the whole card) | Leaves for Cohort › Settings › Dates and release (Phase 3; 2.1) |
| Shared pages › Course title, Instructor | Course intro |
| Shared pages › Subtitle, How it works | Course intro, as "From the cohort" blocks (the promise, how it works) linking to the cohort's Settings |
| Shared pages › The owner's role, The AI Implementer's role | Roles |
| Shared pages › Scope, Support, Office hours rules, Evidence, Missed a week | Rules and support |
| Shared pages › Holiday note | Rules and support, as a "From the cohort" block |
| Shared pages › **Paths** (`shared.paths`) | **After the cohort**, as a second list beside "After the cohort: paths". The mockup draws one Paths list there |
| Shared pages › **Estimate note** | **Rules and support**, last |
| Shared pages › Before Week 1: intake, Practice set note, Safe sharing | Before Week 1 |
| Shared pages › After the cohort: graduation, Graduation note, After the cohort: paths, No paywall | After the cohort |
| Shared pages › Join label, Join note, Community link | Joining and community |
| Glossary › Term, Short, Aliases, First step | Glossary (Term, Short definition, Also matches, First used) |
| Glossary › **Id, Long** | **The term's dialog, after Short definition** (the mockup's dialog has three fields) |
| Copy strings (Key, Text, audience) | Words (Key, What it says, Who reads it) |

---

## 7. Which references change in each phase

The admin's reference is `design-reference/admin-redesign-r2/AdminRedesign.jsx` and its `ref/` (126 files). Each phase
adds its screens to that reference from the mockup's source (never by replacing it with `AdminMock.jsx`), under that
phase's decision entry, renders the refs again (`pnpm parity:admin-r2:refs`, in Docker) and lists in its pull request
which refs changed and why. A fixture for new screens goes beside `console-fixture-community.ts`, fixture only.

| Phase | Reference change | Refs that change |
|---|---|---|
| 1 | The sidebar model (single rows, the hairline, roll-ups, the rail's direct buttons), the area head with tabs (`Area`, `AreaCtx`, `.shd`, `.sgm.stb`), the crumbs, the cohort picker | Every ref (the sidebar is on all of them), as D-239 |
| 2 | None (no screen) | None |
| 3 | Cohort › Overview, Schedule, Settings (with the Shape, Weeks, Dates and release and Edit words dialogs), New cohort, January created | New refs for those screens; Cohorts & Sessions' refs retire |
| 4 | None in the admin. The learner portal's refs and `compliance/goldens` do not change (they are December's) | None |
| 5 | Settings › Enrollment card live, Open enrollment and Close enrollment dialogs, the price dialog | Settings refs |
| 6 | Program › Curriculum, a week (six sections), Course settings (eight sections), Resource Vault under Program | Curriculum, Module Builder and Vault refs replaced |
| 7 | People › Everyone, Teams, Utah Life, a team, a person; Cohort › People, Submissions | Users, Workspaces, Learners refs replaced |
| 8 | Revenue › Summary | Billing's Summary ref replaced |
| 9 | Overview (four tiles), the palette's cohorts, weeks, teams and people | Overview and palette refs |

---

## 8. The phases: decision numbers, gates, order

- **Decision numbers.** The latest at `babceae` is D-252. Each phase takes the next free number when its pull request
  opens (D-253 if nothing lands first), one per phase. None is reserved here, because other work lands on `main` between
  phases. `DECISIONS.md` grows only with your approval, so each entry goes in its phase's pull request for you to read.
- **The gate for each phase:** `pnpm gate 9` (`.phase` is 9), `pnpm parity:admin-r2`, and the December test, which runs
  inside `pnpm test` and CI's `api` job. Screenshots as the spec's section 6 says: every screen built at 1440 and 390,
  and 1280 and 1024 for a page with a table.
- **Order:** 1 and 2 side by side, then 3, 4, 5 (after Q-21 and Q-22), then 6 to 9 in any order. One pull request each.
- **Never in any phase:** a Stripe price, Payment Link or product created or changed; anything changed in GoHighLevel
  (its fields, tags or pipelines), and nothing written there for an account that exists today; an email to an account
  that exists today; a December row rewritten except by a data step the spec names (December's run in
  Phase 3; December's seats and dates onto its record in Phase 5; the shared copy onto the program in Phase 6), each
  with its own before-and-after test.

### Phase notes beyond the spec

- **Phase 1** adds no data to December. The cohort picker lists the cohorts that are not archived (today, December
  alone) and remembers a staff member's last one in `users.prefs`, as the spec says. Every old address redirects; if
  one costs more than it is worth, Phase 1's pull request says which and why. The Module Builder row goes; Curriculum's add button (today "New AI Employee", the mockup's "Add a week") still
  opens `/admin/curriculum/new`, which becomes `/admin/program/weeks/new`, and the old address redirects there.
- **Phase 2** is where the December test does its work: the 29 week-list readers, the 19 cohort readers and the
  literal reads in 5.4 move to the run and the viewer's cohort with every December output unchanged.
- **Phase 3** writes December's run with a data step (`D-xxx-december-run`), built from its modules' `opens`, `due_at`
  and week numbers. Its equality test is the December test. December's modules keep their own `opens`, `due_at` and
  `scheduled` status: clearing them would be a rewrite the spec does not name, and they stay the fallback.
- **Phase 4**'s test team is a seeded test account (D-202) placed in January by hand; it never counts as a seat.
- **Phase 5** starts only after Q-21 and Q-22, with a written plan of its own first, as the spec asks.

---

## 9. What was checked, and what was not

- **Checked:** the spec end to end; both "NEW" groups of the mockup's Screen list, all 22 screens, at 1440, by
  screenshot and by their text; the mockup's model (`p3-model.jsx`), the Cohort page (`p3-cohort.jsx`), the four pages
  (`p3-areas.jsx`) and Course settings (`ia-screens.jsx`). In the repo: `accelerator.ts`, `course.ts`, `release.ts`,
  `curriculum-week.ts`, `sessions.ts` (lookup and week math), the jobs (`due.ts`, `welcome.ts`, `week0-open.ts`,
  `billing.ts`), `payment-links.ts`, `provision.ts` (signatures and the seat logs), `access-groups.ts`,
  `seed-test-member.ts`, the release plan data step, the curriculum seed, and every line in section 5's tables.
- **Not checked:** production's data (its real preview date, links and edited words); how many staff edits production
  holds on December's weeks (Phase 3's data step reads them as they are); whether Stripe's read scopes cover Revenue's
  "Coming in" (Phase 8).
