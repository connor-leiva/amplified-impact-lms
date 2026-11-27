# R-5 Phase 9, the Overview, Archive and the palette (D-270)

Chromium 1243 with the R2 renderer's flags and fonts (`design-reference/admin-redesign-r2/harness/fonts.conf`), device
scale 2, at **1440**, **1280**, **1024** and **390** (the Overview and People have lists that become tables on a
phone), and the two dialogs at **1280** and **390**. A page is its whole length; a dialog is the viewport. Taken from this
branch (`claude/r5-phase9-overview`), with the browser's clock at Thu, Dec 10, 2026, 9:30 AM MT unless a row says
otherwise.

## The fixture build, on the R2 reference's data

The parity world (`?parity=r2`): the Overview's world is the program as Program's pages draw it (nine course weeks, three
published), December running its weeks with its first four weeks' sessions, January created as a draft, the reference's
people (`P7_PEOPLE`), Revenue's figures (`REVENUE_R2`) and a roster with December's one AI Accelerator team. These are
the screens `pnpm parity:admin-r2` holds to the reference (`overview` and `cohort-settings` cells).

| File | What it shows |
|---|---|
| `overview-{w}.png` | The four tiles (Program "9 weeks · 3 published, 6 in draft"; Cohort "Week 2 of 2 · 1 of 200 seats", December's run counting its published weeks; People "16 with a sign-in", "1 in the cohort · 8 Utah Life, kept apart"; Revenue "$82,694 collected", "$7,500 still to collect · $12,429 a month"). Needs You, 12: December's "5 sessions have no Zoom link"; January's Before It Opens lines not done (its Sessions line names the Thursday its office hours meet at December's); "Payments and system": 3 payments failed (Stripe retrying one), 2 teams asked to move up a plan, 1 incident. Who Has a Sign-In, its bar and five keys. Cohorts with New cohort. Coming Up across both cohorts |
| `cohort-settings-{w}.png` | December's Settings: the Clean-Up card's two rows, Delete turned-in files and Archive this cohort. On a phone the words card keeps the 16px floor (`lms-mobile.spec.ts`) |
| `people-filtered-{w}.png` | People › Everyone opened from the Overview's "AI Accelerator" key: `?gotIn=plan%3Acohort`, the chip pressed |
| `palette-cohorts-{1280,390}.png` | The palette with "cohort" typed: the pages and their tabs, then its Cohorts group (December "Active", January "Draft"), each opening its page |
| `archive-dialog-{1280,390}.png` | The plain fixture (the demo seed's December, February and April) on Mon, Feb 1, 2027, after December's last session: enrollment closed first (Archive is refused while a cohort sells), then Archive…'s dialog |

## The http build, against the real API and a fake Stripe in test mode

`serve-http.sh`: a fresh database made the deploy's way (`db:migrate`, then § 9.5's launch seed and every data step:
production's shape, December's nine weeks, its sessions and its record), then `serve-http.ts`, which builds the real API
(`build()`: every route, the Overview's read, Revenue's route) with the Console's Stripe read client replaced by the test
suite's fake (`apps/api/test/fake-console-stripe.ts`), adds Phase 8's eight teams with their orders, plans and Stripe
objects, a skill buyer, a test account's team (QA Test Team) and a Utah Life agent (December's `cohort_id`, Agent tier,
a team of one, no plan row), makes Connor's January with the real admin action, and serves the http web build
(`apps/web/dist`) on :4391, signed in as the Owner. No Stripe call is made and nothing is written anywhere but that
scratch database.

| File | What it shows |
|---|---|
| `http-overview-{w}.png` | Program "9 weeks · 9 published, 0 in draft"; Cohort "2 of 15 seats" (the roster: Copper Basin and Lantern Street; the test account's team and the Utah Life agent are not in it); People "34 with a sign-in", "5 in the cohort · 1 Utah Life, kept apart"; Revenue "$19,856 collected", "$3,750 still to collect · $2,476 a month" (Phase 8's figures). Needs You: December's intake, sessions without a Zoom link and the second payment; January's Before It Opens lines not done, its Sessions line naming the five Thursdays its office hours meet at December's (Q-24); one failed payment Stripe is retrying. The audience bar by how each person got in (the Utah Life agent bought a skill, so Phase 7's rule counts them once, as a skill buyer). Coming Up across December and January |

Every count on it is the D-267 roster's or a Phase 7 or 8 predicate's, never `users.cohort_id`: the Utah Life agent and
the test account carry December's `cohort_id` and are in no cohort figure.

## How they were taken

```
pnpm --filter @ai/web build && bash handoff/admin-mockup/compare/r5-phase9/serve-http.sh   # leave it running
pnpm --filter @ai/web preview:fixture                                                    # on :4173
npx playwright test -c handoff/admin-mockup/compare/r5-phase9/shoot.config.ts shoot
```
