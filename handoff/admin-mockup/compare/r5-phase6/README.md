# R-5 Phase 6, Program (D-265)

Chromium 1243 with the R2 renderer's flags and fonts (`design-reference/admin-redesign-r2/harness/fonts.conf`), device
scale 2, America/Denver. Every screen at **1440**, **1280** and **390**; a page with a table (Curriculum's weeks, the
Resource Vault, Course Settings' Glossary and Words) at **1024** too. A page is its whole length. Taken from this
branch (`claude/r5-phase6-program`).

The fixture build on the launch database (`compliance/lib/launch-db.ts`): § 9.5's seed and every one-time data step the
deploy runs, this phase's `2026-11-28-program` among them, so the program record holds December's shared words, as
production will after the deploy. `now` is Fri, Nov 27, 2026, 12:00 PM MT; the admin is the Owner, on December.

| File | What it shows |
|---|---|
| `curriculum-{1440,1280,1024,390}.png` | Program › Curriculum: the nine weeks, each with its steps and their time, "December 2026 · Week N" (a link to the cohort) and Published (a `scheduled` week reads Published); Cohorts That Run It; Shared by Every Week, each count a link to what it counts |
| `vault-{1440,1280,1024,390}.png` | Program › Resource Vault, unchanged inside; the Curriculum tab counts the program's weeks |
| `week-steps-{1440,1280,390}.png` | A week (Week 1), its Steps section: the rail with each section's count, the head's previous and next week, Preview and Save changes |
| `week-basics-{1440,1280,390}.png` | Basics: Title and Outcome, Where It Runs (December's Week 1, its opening and due date, a link to its Dates and Release), the link to Cohort › Submissions, then the fields "Edit details" held |
| `week-page-{1440,1280,390}.png` | Course Page: the course page card, as before |
| `week-live-{1440,1280,390}.png` | Live Sessions: December's sessions for the week, read-only, each a link to Schedule, in MT / CT; then each run of show |
| `week-cards-{1440,1280,390}.png` | Hire Cards: the seat card, the playbook card and the sample output, as before |
| `week-kit-{1440,1280,390}.png` | Kit: the skills, the vault items and the module's files |
| `week0-forms-{1440,1280,390}.png` | Week 0's seventh section, Forms: its intake and stack card editors (Q-31) |
| `course-settings-{intro,roles,rules,before,after,join}-{1440,1280,390}.png` | Program › Course Settings, each of its first six sections: every field says where learners see it; the promise, how it works and the holiday note are "From the cohort" blocks linking to December's Settings |
| `course-settings-{glossary,words}-{1440,1280,1024,390}.png` | Course Settings' Glossary and Words: their tables, each row opening its dialog |
| `cohort-submissions-{1440,1280,390}.png` | Cohort › Submissions ("Admin / Cohort / Submissions"): the staff cards that left the week, here for Week 1 (the fixture build has no API, so the card says what it says when its list cannot load) |

`shoot.spec.ts` takes them: `pnpm --filter @ai/web preview:fixture`, then
`npx playwright test -c handoff/admin-mockup/compare/r5-phase6/shoot.config.ts shoot`.

The same screens are in the R2 reference's port (`design-reference/admin-redesign-r2/ref/`: curriculum, builder,
vault and the new course-settings), where `pnpm parity:admin-r2` holds the app to them on the R2 parity snapshot (the
mockup's program, December running all nine weeks).
