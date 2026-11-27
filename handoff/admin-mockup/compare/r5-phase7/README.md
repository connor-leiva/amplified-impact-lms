# R-5 Phase 7, People, Utah Life and the cohort's roster (D-268)

Chromium 1243 with the R2 renderer's flags and fonts (`design-reference/admin-redesign-r2/harness/fonts.conf`), device
scale 2, America/Denver. Every screen at **1440**, **1280**, **1024** and **390** (each has a table). A page is its whole
length. Taken from this branch (`claude/r5-phase7-people`).

The fixture build in the parity world (`?parity=r2`): the R2 reference's own data, the mockup's eight people and seven
teams, Utah Life's eight agents (masked addresses, as the mockup has them), December with no weeks in its run (D-267).
`now` is Thu, Dec 10, 2026, 9:30 AM MT; the admin is the Owner. Every time prints "MT / CT".

| File | What it shows |
|---|---|
| `everyone-{1440,1280,1024,390}.png` | People › Everyone: the audience chips built from who is here (each person counted once), "Got in through" (the team's plan, else a skill bought, else the access group), Team ("On their own"), Seat, Last active in MT / CT, Status, Export, and the line that sends a cohort's roster to the cohort's People tab |
| `everyone-utah-life-{…}.png` | The same, with the Utah Life chip picked: its eight agents |
| `teams-{…}.png` | People › Teams: Team, Holds, Seats used, Paying, Status, Find and Product; Utah Life's agents are not teams, and the line under the table says how many |
| `utah-life-{…}.png` | People › Utah Life in full: its facts (the two counts open its Agents table), the Agents table with First sign-in and Skills opened, What They Can Open, Most Opened (last 30 days), Where They Are Counted, Export and the menu's two writes |
| `team-{…}.png`, `person-{…}.png` | People › a team and a person: unchanged in this phase (their way back is Teams and People since D-253) |
| `cohort-people-{…}.png` | Cohort › People, Teams first ("7 of 200"): People signed in of the seats, Paid, Intake, Last active; Export; the roster line. December here has no week in its run, so no week column |
| `cohort-people-learners-{…}.png` | Its Learners: team, seat, last active; a learner's menu still opens their details (the drawer) |
| `cohort-submissions-{…}.png` | Cohort › Submissions, "Intake, added up": the facts (each count opens the teams), the tallies and the question reader (the parity world holds no intake form, so its facts read none) |
| `cohort-submissions-teams-{…}.png` | "Intake, team by team": status, when, answered of the form's questions, GHL |
| `cohort-submissions-asks-{…}.png` | "Turned in, by step": each week's step that asks for a file, and how many teams turned one in (none asks in the parity world) |
| `cohort-submissions-files-{…}.png` | "Turned in, every file": D-265's cards, one week at a time, where the staff-only status is set (the fixture build has no API, so the card says what it says when its list cannot load) |

`shoot.spec.ts` takes them: `pnpm --filter @ai/web preview:fixture`, then
`npx playwright test -c handoff/admin-mockup/compare/r5-phase7/shoot.config.ts shoot`.

The same People screens and Cohort › People are in the R2 reference's port (`design-reference/admin-redesign-r2/ref/`:
`users`, `workspaces`, `utah-life`, `learners`), each an enforced parity cell at four widths.
