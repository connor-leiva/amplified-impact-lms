# R-5 Phase 3, the Cohort page and New cohort, beside the mockup (D-255)

The app's fixture build on the left, `handoff/admin-mockup/dist/index.html` on the right, 32 px apart on the mockup's stage
grey. Both at **device scale 2**, 1280 and 390 wide, rendered alike: Chromium 1243 with the R2 renderer's flags and fonts
(`design-reference/admin-redesign-r2/harness/fonts.conf`). A page is its whole frame; a dialog is the viewport at the
page top with the dialog open. Taken from the branch rebased onto `main` at e3a25d6.

The app-only shots (`app-*`) run on the launch database (`compliance/lib/launch-db.ts`: December as production has it,
every data step applied, `now` Thu, Nov 26, 2026, 12:00 PM MT) without the parity snapshot. The others run on the R2
parity snapshot (`?as=admin&parity=r2&now=2026-12-10T16:30:00.000Z`): the R2 reference's own data
at its "now", with the mockup's program weeks and, on January's addresses, January created by New cohort's own action
(`apps/web/src/data/parity-r2-db.ts`). Pixel parity is enforced against the R2 reference's port of these screens
(`design-reference/admin-redesign-r2/ref/`, `pnpm parity:admin-r2`), where every cell below passes. The handoff mockup
draws the same screens with its own sample data, so the comparison here is of layout, words and behaviour.

| File | App | Mockup |
|---|---|---|
| `cohort-overview-{1280,390}.png` | Cohort › Overview, December (`/admin/cohort/dec26`) | Cohort › Overview |
| `cohort-schedule-{1280,390}.png` | Cohort › Schedule, December (`/admin/cohort/dec26/schedule`) | Cohort › Schedule |
| `cohort-settings-{1280,390}.png` | Cohort › Settings, December (`/admin/cohort/dec26/settings`) | Cohort › Settings |
| `new-cohort-{1280,390}.png` | New cohort (`/admin/cohort/new`), Connor's example filled in | New cohort: six weeks, twice a week |
| `january-overview-{1280,390}.png` | January, created: Overview (`/admin/cohort/jan27`) | Skip ahead: January, created |
| `january-schedule-{1280,390}.png` | January's Schedule | January's Schedule |
| `january-settings-{1280,390}.png` | January's Settings | January's Settings |
| `january-shape-{1280,390}.png` | January's Settings › Shape › Edit | the same |
| `january-weeks-{1280,390}.png` | January's Settings › Its weeks ("6 of the program’s 8") | the same |
| `january-dates-{1280,390}.png` | January's Settings › Dates and Release › Edit | the same |
| `january-words-{1280,390}.png` | January's Settings › Edit words | the same |
| `app-course-settings-release-{1280,390}.png` | Program › Course Settings (launch data): the Release plan is a read-only line linking to each cohort's Settings | none (the mockup's Course settings is today's page) |
| `app-week-where-it-runs-{1280,390}.png` | Program › Week 1 (launch data): the Sessions card read-only ("Sessions are edited in each cohort’s Schedule."), no Opens or Due editors, and "Where it runs" in Settings. The fixture build has no submissions API, so its Submissions card says it didn't load | none |
| `app-flags-test-send-{1280,390}.png` | Environment Flags (launch data): the test-send cohort is a picker of the cohorts not archived | none |

Expected differences, each in D-255:

- **Data.** The mockup's December has its own teams, seats (15), weeks and sessions; the app's is the R2 snapshot's
  (six Wednesday builds, 200 seats, no course weeks of its own on the parity snapshot). Counts, dates and names differ
  with it.
- **Phase 5's controls are not drawn**: Open enrollment in the head, the Price line's dialog, the enrollment dialogs, and
  the Price row of New cohort's last card, which is "Seats, Time and Hosts" here ("Seats and price" in the mockup).
- **Submissions** is not a Cohort tab yet (its phase); the tabs are Overview, Schedule, People, Community,
  Announcements and Settings.
- **Before It Opens** has the eleven lines of Open enrollment's refusal (PLAN.md § 10.2), where the mockup has seven.
- **Times** read "12:00 PM MT / 1:00 PM CT" (PLAN.md § 10.8, D-259), where the mockup prints Mountain alone
  ("Tue · 12:00 PM MT") or adds "1:00 PM CT for learners".
- **Headings** are Title Case ("Coming Up", "This Cohort’s Shape", "The Run", "Before It Opens") where the mockup has
  sentence case (§ 10.8).
- **Type on a phone** keeps the 16px floor (D-156, D-160 decision A): a date tile, a week's number and two Schedule key
  facts are 16px where the mockup sets 10 to 15px.
- **Dialogs** start with focus on Close, as the mockup's (no field focused).
