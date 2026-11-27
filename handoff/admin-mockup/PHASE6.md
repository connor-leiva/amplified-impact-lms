# R-5 Phase 6: Program, on paper

Written before any code, as the spec asks of each phase ("Plan it on paper first"). The spec is
`ADMIN-RESTRUCTURE-SPEC.md`, "Phase 6. Program", with § 1 (December does not move), § 4 (rules for every screen) and
§ 6 (tests, references, done). PLAN.md § 10 governs: where it already decides something, this cites it and does not
decide it again. The decision entry is D-265.

## The rules this phase works under

- **December does not move** (spec § 1). `apps/api/test/december.test.ts`, `fixtures/december/golden.json`,
  `december-others.ts` and `others.json` stay byte-identical and pass. The December test runs every data step
  (`applyDataMigrations`), so it proves December's outputs with this phase's step applied.
- **Copied, not moved** (PLAN § 10.8): "December's shared fields are copied to the program record, not moved;
  `cohorts.course` stays on `dec26` as it is." Every data step has a rollback; `audit_log` is append-only.
- **Nothing cohort-specific is hard-coded** (§ 10.10). Each `scripts/cohort-hardcodes.allow.json` entry marked phase 6
  is moved and removed, or stays with its reason and a new phase (below).
- **One program, so no picker** (spec Phase 6; § 10 of the spec: "A second program. The model allows one; no screen
  picks between two").
- Migrations additive only. No Stripe, Payment Link or GoHighLevel write. No `/agreement` edit. No Railway variable.

## 1. The program record

| Piece | What it is |
|---|---|
| Table `programs` (migration `0049_program.sql`, journal idx 49, after the audit fixes' 0048) | `id` text primary key, `name` text, `course` jsonb (nullable). Additive: a new table, no row written by the migration |
| `Program` (core `types.ts`) | `{ id, name, course? }`; `Db.programs?` (absent reads as none, D-173) |
| The one program | `DEFAULT_PROGRAM_ID = 'accelerator'` (spec: "`id: 'accelerator'`, its name, the shared `course`") |
| Each cohort names its program | `Cohort.programId` (the column is Phase 2's). New cohort writes the source cohort's program. A cohort with none (December) runs the one program; no December row is written, and the learner's snapshot leaves `programId` out as it leaves out `run` (D-255), so December's snapshot is byte-identical |
| The one reader | `programCourse(db, cohortId?)` in `cohort-learner.ts`: the cohort's program's `course`; until the data step has run, a program with no copy reads December's row (spec: "Until that step runs, a cohort with no program copy reads December's") |

**The data step `2026-11-28-program`** (`packages/core/seed/program-v1.ts`, run by the deploy's curriculum ensure,
D-175): when no program record exists and December's row holds a course, it writes `programs('accelerator')` with
December's whole `course`, deep-copied, and the name from its course title. `cohorts.course` on `dec26` is not
touched. Before writing, the step checks for every cohort that the course words it reads (`cohortCourseCopy`) and the
staff preview's database (`previewDb`) are equal with and without the record; if one is not, it writes nothing and
names it. **Rollback:** `undoProgramV1` deletes the record while it still holds what the step wrote (a record staff
have saved since is left and named), and every read falls back to December's row, which still holds the same words.
In SQL: `delete from programs where id = 'accelerator'; delete from data_migrations where id = '2026-11-28-program';`.

Why the whole course and not only the shared fields: the program's `intro.sub`, `intro.how` and `intro.holiday` are
what a cohort with no words of its own reads today (D-261 item 1: "A cohort with none of its own reads the program's
three too"; § 10.3: "Auto-drafted words start as December's words"). Copying them keeps that answer identical.
Course Settings never edits them: it draws them as "From the cohort" blocks (spec).

**Proof.** Core: the step's equality test (every cohort's course words, the staff preview, `GET /api/course`'s
assembly) on the production seed with December's run stored, and a sabotage (a step that writes one changed word)
that the test catches, reverted. API: the step runs once through `applyDataMigrations` and writes one audit row;
`december.test.ts` and its golden unchanged.

## 2. Course Settings writes the program

`saveProgramCourse` (core `course-actions.ts`, beside `saveCohortCourse`): permission `curriculum` (spec § 4 rule 5:
"weeks and Course settings are `curriculum`"), the same checks as `saveCohortCourse` (community link, glossary, copy
rules), one audit row `program.course_save` with target `program`. With no program record yet (a database whose
step has not run), the save makes it from what was saved. `saveCohortCourse` stays for the API's other callers.

## 3. The builder's `dueAt` gap (#278's open item)

PR #278: "the week builder's save still accepts a `dueAt` ... A hand-made request could change a module's Due
without changing the cohort's run." It belongs here: the week page is this phase's. The module saves
(`saveModule`, `saveBuilderModule`) keep a course week's stored `opens` and `dueAt`, whatever the draft sends: a
course week's dates are its cohorts' (Cohort › Settings › Dates and Release, `saveCohortRun`). Not a refusal, so a
builder tab opened before a date moved saves without putting the old date back.

## 4. The screens

All four under Program (`/admin/program`, `/course`, `/vault`, a week at `/admin/program/weeks/:id`), from
`p3-areas.jsx` (`Curriculum3`, `WeekEdit`) and `ia-screens.jsx` (`CourseSet`). Headings in Title Case (§ 10.8).

- **Curriculum** (`Curriculum3`): the Weeks card, one row per week (module of kind `week`) in the curriculum's order (its week number,
  title and outcome; its steps and their time; where it runs, one link per cohort not archived that takes it, "December
  2026 · Week 1"; Published, or Publish while a draft), reorder, "Add a week" (opens what it opened, `weeks/new`, as
  Phase 1 left it), each row's menu (Open week, Preview as a learner, Duplicate, Publish or Unpublish). Below:
  Cohorts That Run It (each opens its cohort; New opens New cohort) and Shared by Every Week (each count opens the
  list it counts, § 4 rule 1). A week is Published or Draft here; a `scheduled` week reads Published ("scheduled" is
  something a cohort says about a week).
- **A week** (`WeekEdit`): today's week builder regrouped into sections down the left, one on screen at a time
  (`?section=`): Basics, Steps, Course Page, Live Sessions, Hire Cards, Kit, and on Week 0 a seventh, Forms (§ 10.1
  Q-31, § 10.6). No field is added or removed. PLAN § 6.1's placements stand (§ 10.1: "The other placements in 6.1
  and 6.2 stand as proposed"). Opens and Due show under Basics › Where It Runs, one line per cohort, each a link to
  that cohort's Settings › Dates and Release. Sessions are read-only rows linking to Schedule (§ 4 rule 4, D-255).
  `SubmissionsCard` and `SeatCardsCard` leave the week (§ 6.1: "Leave for Cohort › Submissions"): they are at
  `/admin/cohort/:id/submissions`, unchanged, one week at a time, and the week's Steps section links there. Its tab
  is drawn by Phase 7 with the mockup's four views (`CohortSubs`): the tab strip is on every Cohort ref, and Phase 7
  replaces the page.
- **Course Settings** (`CourseSet`): eight sections, one on screen at a time: Course Intro, Roles, Rules and Support,
  Before Week 1, After the Cohort, Joining and Community, Glossary, Words. Every field says where learners see it.
  The promise, how it works and the holiday note are "From the cohort" blocks that link to the cohort's Settings.
  PLAN § 6.2's placements stand (Paths beside After the cohort's paths; Estimate note last in Rules and Support; the
  glossary's Id and Long in the term's dialog). The release plan's read-only line becomes the mockup's "Looking for
  dates?" note (§ 10.3). It stops importing `ModuleBuilder.module.css`.
- **Resource Vault**: unchanged inside; its tab's count is the curriculum's weeks.

## 5. The hard-code allowlist's phase 6 entries

| Entry | Outcome |
|---|---|
| `curriculum-status.ts` (2) | Moved: the health check counts the program's weeks and the sessions their pages name, in any cohort. Production's answer is the same |
| `ModuleBuilder.tsx` glossary | Moved: the program's (`programCourse`) |
| `ModuleBuilder.vm.ts` (4): preview against December, its sessions, `DEFAULT_OPENS` | Moved: the admin's own cohort (the picker's, D-253); a new week gets no opening (its dates are its cohorts') |
| `WeekBuilder.vm.ts` preview date | Moved: the admin's own cohort's |
| `CourseSettings.vm.ts` | Moved: the program |
| `Curriculum.vm.ts` | Moved: every cohort's run |
| `cohort-learner.ts` `programCourse` | Stays, rewritten as the fallback until the data step has run; phase 9, as Phase 5's own fallback |
| `cohort-actions.ts` December's run mirrored onto its modules | Stays: the learner list (Phase 7), the dashboard (Phase 9), `build-audit.ts` and `curriculum-week.ts` still read a module's dates |
| `accelerator.ts` `courseOpensAt`, `offer.ts` `firstBuildAt` (proposed for 6) | Stay: the learner's snapshot before the preview has no sessions, so the instant is what December's learners read; moving it would change their output |

## 6. References, tests and screenshots

- **R2** (`design-reference/admin-redesign-r2/AdminRedesign.jsx`): `Curriculum3`, `WeekEdit` and `CourseSet` ported
  from the mockup's source with § 10.8's words, on this reference's program (`P3_WEEKS`). Refs: `curriculum`,
  `builder` (now a week) and `vault` (the tab's count) change; `course-settings` is new, with its parity cells. The
  other refs stay byte-identical (checked by rendering them).
- **Tests:** core (the program reader and fallback, the step and its rollback, `saveProgramCourse`, the save keeping
  a week's dates), API (the step through `applyDataMigrations`, the routes, the status check), web (each view-model,
  the sections, numbers that link), e2e for the three screens.
- **Screenshots:** every screen at 1440 and 390, and 1280 and 1024 for the pages with a table (Curriculum, Course
  Settings' Glossary and Words), in `handoff/admin-mockup/compare/r5-phase6/`.
