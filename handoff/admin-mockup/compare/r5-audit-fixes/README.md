# R-5 audit fixes (D-267)

Chromium 1243 with the R2 renderer's flags and fonts (`design-reference/admin-redesign-r2/harness/fonts.conf`), device
scale 2, America/Denver. Every screen at **1440** and **390**; a page with a table at **1280** and **1024** too. A page is
its whole length; a dialog is the viewport with the dialog open. Taken from this branch (`claude/r5-audit-fixes`, on
`claude/r5-phase5-selling` @ 071a7c23), fixture build.

Three worlds, each named below:

- **launch**: the launch database (`compliance/lib/launch-db.ts`, § 9.5's seed and every one-time data step), at
  Fri, Nov 27, 2026, 12:00 PM MT (Week 0 open, Week 1 not yet) or Thu, Dec 10, 9:30 AM MT (Week 2 running). January is
  Connor's, made in it through the real actions (`compliance/lib/selling-world.ts`). December's facts, which the API
  answers in http mode (`GET /api/admin/cohorts/:id/facts`), are given to the fixture as the API would answer once teams
  are in it (`FIXTURE_FACTS_KEY`: 7 teams, 15 learners, readiness, and two second payments still to come, $3,750 each,
  the next Wed, Dec 30). So the Overview's facts say 7 teams while the People tab, which reads the fixture's own rows
  (none in the launch database), says 0.
- **parity**: the R2 parity fixture (the mockup's data, `?parity=r2`), at Thu, Dec 10, 9:30 AM MT, as `pnpm
  parity:admin-r2` opens it.
- **demo**: the fixture's own demo database (`seed('live')`: December, February and April), at Thu, Dec 10, 9:30 AM MT.

The fixture has no plans, so who counts in a cohort reads the learners' rows there, as before (D-267, decided overnight
14). The roster itself is the API's, proved in `apps/api/test/cohort-roster.test.ts`.

| File | World | What it shows |
|---|---|---|
| `overview-before-week1-{1440,390}.png` | launch, Nov 27 | The Overview's header from December's run: "December 2026 Cohort · Week 1 opens Sun, Nov 29 · 12:00 PM MT / 1:00 PM CT · 0 learners enrolled"; the tiles link December |
| `overview-week2-{1440,390}.png` | launch, Dec 10 | Once Week 1 has opened: "December 2026 Cohort · Week 2 of 8 · Updated live from learner activity" |
| `december-overview-before-week1-{1440,390}.png` | launch, Nov 27 | December's head, "Week 0 opened Mon, Nov 23 · Week 1 opens Sun, Nov 29", and its Opens fact, Week 1's "Sun, Nov 29 · 12:00 PM MT / 1:00 PM CT"; Needs You with the two new rows: "3 threads are waiting on you" (the fixture's Community) and "2 second payments are on the calendar · $3,750 each, on Wed, Dec 30." |
| `december-overview-week2-{1440,390}.png` | launch, Dec 10 | Running: the head says "Week 2 of 8", the first fact is "Week · 2 of 8", and The Run's Week 2 is "This week" |
| `january-overview-{1440,390}.png` | launch, Nov 27 | January, a draft: "Week 0 opens Sun, Dec 27 · Week 1 opens Sun, Jan 3", and its Opens fact "Sun, Jan 3 · 12:00 PM MT / 1:00 PM CT" |
| `december-schedule-{1440,1280,1024,390}.png` | parity | Cohort › Schedule: "On the calendar" opens every session (a link now, as rule 1 asks) |
| `december-people-{1440,1280,1024,390}.png` | parity | Cohort › People: the cohort's learners and teams (the roster; the fixture's rows) and its description naming the cohort once |
| `december-community-{1440,1280,1024,390}.png` | demo | Cohort › Community for December: its threads and its people |
| `february-community-{1440,1280,1024,390}.png` | demo | Cohort › Community for February: none of December's threads |
| `february-announcement-dialog-{1440,390}.png` | demo | A new announcement on February's tab, "Send at (MT)" |
| `february-announcements-{1440,1280,1024,390}.png` | demo | February's list with it, after Save draft |
| `december-announcements-{1440,1280,1024,390}.png` | demo | December's list without February's announcement |
| `people-utah-life-{1440,1280,1024,390}.png` | parity | People › Utah Life: the tab after Teams, counting 8; the group's description; Find; each agent's line over the address (the mockup's masked ones) and Last active or "Invite pending" |
| `people-teams-{1440,1280,1024,390}.png` | parity | People › Teams with the new Utah Life tab beside it |
| `program-curriculum-{1440,1280,1024,390}.png` | parity | Curriculum: each session "Wed, Dec 2 · 12:00 PM MT / 1:00 PM CT", and "Session times are MT, with CT after." |
| `audit-log-{1440,1280,1024,390}.png` | parity | The Audit Log: "Times are MT (America/Denver)." |
| `audit-detail-{1440,390}.png` | parity | An entry's Time: "Dec 9, 2026, 9:27 PM MT" |
| `email-log-{1440,1280,1024,390}.png` | parity | The Email Log: "Times are MT (America/Denver)."; the 24-hour reminder's subject in MT / CT |
| `email-detail-{1440,390}.png` | parity | An email's Sent, Delivered, opens and clicks in MT ("Dec 8, 12:00 PM MT") |
| `system-health-{1440,390}.png` | parity | System Health: "Times are MT (America/Denver)." |
| `incident-{1440,390}.png` | parity | INC-0007: "Opened Dec 9, 9:14 PM MT" |
| `team-hub-{1440,390}.png` | demo, as the owner | Team Hub: "Northline Realty Team · Team Tier · December 2026 Cohort", the cohort's own name read from the snapshot |

`shoot.spec.ts` takes them: `npx playwright test -c handoff/admin-mockup/compare/r5-audit-fixes/shoot.config.ts`
(it starts `pnpm --filter @ai/web preview:fixture` on :4173 when nothing serves it).

The same screens are in the R2 reference's port (`design-reference/admin-redesign-r2/ref/`), where `pnpm parity:admin-r2`
holds the app to them on the parity world: utah-life (new), announce, audit, curriculum, email, health, incident, user,
the January tabs and dialogs, cohort-schedule, and users, workspaces and masquerade (their new tab).
