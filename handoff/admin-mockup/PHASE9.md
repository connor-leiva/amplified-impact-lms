# R-5 Phase 9: Overview, and what is left, on paper

Written before any code, as the spec asks of each phase. The spec is `ADMIN-RESTRUCTURE-SPEC.md`, "Phase 9. Overview, and
what is left", with § 1 (December does not move), § 4 (rules for every screen; rule 1, every number is a link) and § 7
("Overview and Revenue figures: computed, never the mockup's numbers"). PLAN.md § 10 governs: where it already decides
something, this cites it and does not decide it again. The decision entry is D-270, the last of R-5. Built on R-5 Phase 8
(D-269, `7314781b`, #289), on `main` @ `00f57261` (Phases 1 to 7); rebased onto `main` @ `fae0330b` once #289 merged.

## What PLAN.md § 10 already decides for this phase

- **The allowlist** (§ 10.10: "the allowlist shrinks phase by phase"; the check fails on an entry that matches nothing).
  Every entry marked phase 9 in `scripts/cohort-hardcodes.allow.json` moves in this phase, or stays with its reason in
  D-270 and a line for Connor. The ones that wait on Connor's word that a data step ran in production (§ 10.10: "Phase
  5's data step reads the value production runs with at deploy time, which is not readable from here") stay: this phase
  cannot read production either.
- **The program's weeks are not cohort-specific** (§ 10.10, "Not cohort-specific, so not moved by R-5: ... the program's
  weeks (`ACCELERATOR_WEEKS`)"). The spec's Phase 9 asks to remove `ACCELERATOR_WEEKS` and its helpers; § 10.10 keeps
  them, and the code still reads them (below). Where the two disagree this phase keeps December and the code, removes
  only what a search proves unread, and records the rest for Connor.
- **Status words** (§ 10.3): Draft, Scheduled, Active, Finished (after the last session until archived). Archive is
  what ends "Finished": it sets `archivedAt` and never writes `cohorts.status` (§ 2.5: R-5 never writes `live` or
  `completed`).
- **audit_log is append-only** (§ 10.8): archive writes one row, in the same transaction as its write, as every admin
  action does (`POST /api/admin/actions/:name`).
- **Stripe is read, never written** (§ 10.5): the Overview's Revenue tile reads Phase 8's summary
  (`GET /api/console/billing/revenue`, the Console's cached read client); it makes no Stripe call of its own, per page,
  per cohort or per row, and says "Unavailable", never a zero, when Stripe can't be read.
- **Seats have one source, Enrollment** (§ 10.3): the Cohort tile's seat count opens the cohort's Enrollment.
- **Copy** (§ 10.8): the mockup's, Title Case headings ("Needs You", "Who Has a Sign-In", "Coming Up"), no em or en
  dashes, "AI Implementer"; every time "12:00 PM MT / 1:00 PM CT" through `fmt.mtCt`.
- **Nothing cohort-specific is hard-coded** (§ 10.10): every cohort on the Overview is read from its record; nothing
  names December.

## The Overview (the mockup's `Home`, `p3-areas.jsx`)

`/admin`, replacing today's five stats, chart, feed, funnel and attendance (and with them `overviewR2VM`, `overviewVM`
and "Active Learners" as they count it). Head: "Overview", the mockup's description, no buttons (the mockup's `Home`
has none: "Export report" and "New AI Employee" go; Learners keeps its export, Program its "Add a week").

| Part | What it reads | Opens |
|---|---|---|
| Program tile | the program's weeks (`programWeeks`): how many, published and in draft | Program |
| Cohort tile | the cohort the admin is on: its name, where it is in its run (`cohortProgress`), its Teams of its seats (the D-267 roster, through the cohort facts); a draft: "Draft · N left before it opens" (`beforeItOpens`) | that cohort's page |
| People tile | everyone with a sign-in, each counted once (Phase 7's `GET /api/console/users/audiences`, `gotInOf`); the cohort's learners (the roster); each access group, kept apart | People |
| Revenue tile | Phase 8's summary, all time: Cash collected, Still to collect, MRR; "Unavailable" when Stripe can't be read | Revenue |
| Needs You | one group per cohort not archived, in start order: a running cohort's Needs You rows (Cohort › Overview's, the same function), a draft's Before It Opens lines not done; then "Payments and system": failed payments (Phase 8's count), upgrade requests (`requests`, new), open incidents (the shell's count). A row with nothing to count is not drawn | each row's own place |
| Who Has a Sign-In | the audience bar: one segment per "Got in through" answer, each opening `/admin/people?gotIn=...` (People › Everyone reads the filter from the address) | People, filtered |
| Cohorts | every cohort not archived: its name, weeks, how often it meets, when it opens, its status word; "New cohort" | the cohort |
| Coming Up | each cohort's next two sessions, in time order, four at most, "Thu · 12:00 PM MT / 1:00 PM CT · December 2026" | the cohort's Schedule |

- **Who counts** (spec § 4 rule 2, D-267): every count is the D-267 roster's (`@ai/core` cohort-roster, through the
  cohort facts) or a Phase 7 or 8 predicate (`groupTeamOfOne`, `countedCohortSeat`), never `users.cohort_id`. A Utah Life
  agent (December's `cohort_id`, Agent tier, a team of one, no plan row) is in no cohort figure; they are counted once,
  under their group, in "Who Has a Sign-In". D-268's test ("Utah Life agents are never December's learners") is
  extended to the Overview.
- **One read for every cohort's facts, without Stripe**: `GET /api/admin/overview` (the `cohorts` permission, the facts
  route's) answers each cohort's facts (`cohortFactsOf`, no Stripe reader): intake, second payments, test sends,
  Teams and Learners. A draft's two Stripe lines say what is entered; what Stripe says is on its Settings.
- **Every number is a link** (§ 4 rule 1): each tile, row, segment and session is a link (`data-number`);
  `admin-numbers.spec.ts` already walks `/admin` and keeps doing so.

## Archive a cohort (Cohort › Settings › Clean-Up)

The mockup's second Clean-Up row: "Archive this cohort", "Hides it from the switcher when it is over. Its people, files
and payments are kept.", "Archive…". A core action, `archiveCohort` (`cohort-actions.ts`, in its style: permission,
refusal, audit):

- **Allowed only after its last session** has ended; refused before, with the mockup's "A cohort can be archived after
  its last session, Thu, Feb 4." (its own date), and refused for a cohort with no session.
- **Sets `archivedAt`** (the existing column; no migration). Nothing else: never `status`, no Stripe, no enrollment row,
  no seat, no plan, no user.
- **The pickers stop listing it**: the sidebar's switcher, the Cohort page's title, the test sends' cohort picker and the
  comp form already list only cohorts not archived (`cohortChoices`, `comp.ts`); so do the Overview and the palette.
- **Confirmed in a dialog**, one `audit_log` row (`cohort.archive`) in the same transaction.
- **Permission**: the `cohorts` permission (spec § 4 rule 5: shape, run and sessions are `cohorts`). No new capability.

## The palette

It finds cohorts (new group, the snapshot's cohorts not archived, each opening its page), weeks (as today), teams and
people (the API's groups, as today).

## Remove what nothing reads

Searched before removing, and removed only where unread and December stays byte-identical:

- `GROUP_HUBS` and the Build hub's screen: already gone (Phase 1, D-253). Its view-model `routes/console/build.vm.ts`
  is read by its own test and one other test only: removed. `/admin/build` keeps redirecting to Program.
- `ADMIN_COHORT`: already gone (D-253); a comment names it.
- `ACCELERATOR_WEEKS` and its helpers: still read by runtime code (`isCourseWeek` in scope, course, release, mutations,
  cohort-run and cohort-page; the curriculum's week numbers in cohort-learner; the LMS tour's module; three learner and
  calendar fallbacks for rows with no run) and by the seeds (history). PLAN § 10.10 keeps them. They stay; D-270 lists
  each reader.
- `ACCELERATOR_COHORT_ID`: survives only as the seeds' name (history, untouched); code reads `DEFAULT_COHORT_ID`, which
  spec § 2's rule still needs (a viewer with no cohort plan, and a checkout with no `ai_cohort`, are December's).
- The old Overview's view-model and its CSS go with the screen.

## The allowlist moves (PLAN § 10.10)

Each entry marked phase 9, and what happens to it, goes in D-270. In outline: the deploy's test member names its cohort
or none (`seed-test-member.ts`, three entries); the test sends' picker has no December fallback (`Flags.tsx`); the
announcement composer's default schedule is read from the clock (`Announcements.vm.ts`); `COHORT_ONE.lastBuildAt`,
unread, goes. The entries that wait on production (the data steps) or would change December's learners (the course's
opening before the preview; the run's mirror onto December's modules, which `curriculum-week.ts` and `build-audit.ts`
still read) stay, each with its reason, for Connor.

## References, tests and screenshots

- **R2**: the mockup's `Home` ported into `AdminRedesign.jsx` as the Overview, on this reference's own data (its now,
  Thu, Dec 10; December running its nine weeks as Program's pages draw it; January created as a draft; its people; its
  revenue), with the mockup's CSS (`.thr`, `.thl`, `.tlk`, `.ngl`, `.aub`, `.aul`, `.auk`); and the Clean-Up card's
  Archive row. The current overview refs are re-rendered first and must be byte-identical. Changed refs are copied, both
  manifests recomputed.
- **Tests**: core (`archiveCohort`), API (the archive action and the overview route: a Utah Life agent counts nowhere),
  web (the Overview's view-model, People's filter from the address, the palette's cohorts, the D-268 Utah Life test
  extended), e2e (the Overview, Settings' archive, the palette; `admin-numbers` and `admin-audit-fixes` follow the new
  Overview).
- **Screenshots**: `handoff/admin-mockup/compare/r5-phase9/` at 1440, 1280, 1024 and 390, the fixture build and the http
  build with a scratch database (a Utah Life agent and a test account present).
