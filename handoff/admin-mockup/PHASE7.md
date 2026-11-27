# R-5 Phase 7: People, Utah Life and the cohort's roster, on paper

Written before any code, as the spec asks of each phase. The spec is `ADMIN-RESTRUCTURE-SPEC.md`, "Phase 7. People,
Utah Life, and the cohort's roster", with § 1 (December does not move), § 4 (rules for every screen; rule 2 is the
roster rule) and § 6 (tests, references, done). PLAN.md § 10 governs: where it already decides something, this cites it
and does not decide it again. The decision entry is D-268. Built on R-5 Phase 6 (D-265, `452c1ba8`), which is on the
R-5 audit fix-up (D-267, #286).

## The rules this phase works under

- **December does not move** (spec § 1). `apps/api/test/december.test.ts`, `fixtures/december/golden.json`,
  `december-others.ts` and `others.json` stay byte-identical and pass. Nothing here writes a December row: this phase
  has no data step.
- **One rule for who counts** (spec § 4 rule 2; D-267's `@ai/core/cohort-roster`). A cohort's Teams are teams with a
  live `cohort` plan for it; its Learners are the people on them; test accounts are out; an access group's member is in
  no cohort, team, learner or revenue figure. This phase adds no second rule: Cohort › People reads the roster, and the
  one new predicate (below) only says which team is an access group's team of one.
- **Every number opens the list it counts** (rule 1): each new count is `data-number` inside a link or button, and
  `compliance/tests/e2e/admin-numbers.spec.ts` walks the new screens.
- **Times** (PLAN § 10.8, and the fix-up's last review change): every time on a screen this phase builds, an event's
  or a table's stamp included, prints "12:00 PM MT / 1:00 PM CT" through `fmt.mtCt`. No "MT only" stamp and no
  "Times are MT" line on these screens.
- **Writes keep their permissions** (rule 5). The two Utah Life actions are Owner and Admin only (PLAN § 10.7:
  "limited to the staff capabilities that manage access groups (named in Phase 7's pull request)"): a new Console
  capability `access_group.write` (Owner and Admin, beside `billing.comp`), each write confirmed and one `audit_log` row
  (`access_group.address_add`, `access_group.end`). Neither writes to GoHighLevel, Stripe or anyone's plan.
- Copy is the mockup's (`handoff/admin-mockup/ia-screens.jsx`, `p3-cohort.jsx`), Title Case headings, no em or en
  dashes, "AI Implementer" (PLAN § 10.8). Every new string is listed in D-268.
- Nothing cohort-specific is hard-coded (PLAN § 10.10). Migrations additive only. No Stripe, Payment Link or
  GoHighLevel write. No `/agreement` edit. No Railway variable.

## 1. People › Everyone (`PeoplePg`)

Today's Users with one new column and filter, "Got in through" (spec): the Console label of the primary plan of the
person's team (`primaryPlan`'s ranking, `PLAN_PRIORITY`, `CONSOLE_PLAN_LABELS`), else "Skill buyer" (a `skill_purchases`
row of theirs and no plan), else the name of the access group their address is in. One pure function in core,
`gotInOf`, decides it; the API's SQL picks the same plan by the same rule (as `listWorkspaces` already does), and a
test holds the two equal.

- **The chips are built from what exists**: one per answer that some learner has (each a plan's label, "Skill buyers",
  each group's name), with its count, after "Everyone". Each person is counted once, under the first that applies.
  `GET /api/console/users/audiences` answers the counts (one statement).
- A person with none of the three (no plan on their team ever, no skill, no group): "No plan" (decided overnight).
- The table is the mockup's: Person, Got in through, Team ("On their own" for a team of one with no other member and
  no plan), Seat (their role), Last active, Status. A Utah Life row opens Utah Life, as the mockup's does. Export is
  today's users export (Owner and Admin, `export`, audited), over the filter on screen. The line under the table is the
  mockup's ("Showing {n} of {m}. This list is for the account: sign-in, plan and seat. To see how a cohort is doing,
  open the cohort's People tab.").
- People's tab strip counts Everyone and Teams (the mockup's `PeopleArea` counts), from the audiences answer.

## 2. People › Teams (`TeamsPg`)

Today's Workspaces, in the mockup's columns (Team, Holds, Seats used, Paying, Status) with Find and Product. **A team
of one made for an access-group member is left out** (spec), by one shared predicate in core, `groupTeamOfOne`: a team
whose accounts hold no plan row, with exactly one member, whose address is in an access group (D-148's address rule,
`inGroup`). The list's SQL applies the same rule. The line under the table says how many were left out ("{n} Utah
Life agents are not listed here.", the mockup's sentence without the people-on-their-own half: those are teams here).

## 3. People › Utah Life (`Groups`)

D-267 drew it read-only. This phase draws the rest of the mockup's page, from the group's record and what exists:

| Mockup | From |
|---|---|
| Agents signed in | the group's people with a sign-in (`users.last` set) |
| Active, last 30 days | of them, `users.last` in the last 30 days |
| Gets | the group's plan's skills, free (its record's `plan`) |
| Who qualifies | "A verified @{domain} address" (its record's `email_domain`), or its list |
| Since / Ends | `access_groups.created_at` / `expires_at`, else "No end date" |
| Agents table: First sign-in, Last active, Skills opened | `users.joined`; `users.last`; their `usage_daily` `guide_view` count |
| What they can open | the plan's sets, and the line a locked skill shows (the copy string `locked.utah_life`, linked to Words) |
| Most opened, last 30 days | **new**: per-skill opens, `skill_opens_daily` (migration `0050_skill_opens.sql`, additive: a new table). Nothing records which skill was opened today, so the card fills from the day this ships |
| Where they are counted | the mockup's four lines, true by D-267's rule |
| Export | the group's agents as CSV (Owner and Admin, `export`, audited as `user.export`) |
| Add an address outside the domain… / End access… | `access_group_members` insert; `access_groups.expires_at = now` (PLAN § 10.7) |

## 4. Cohort › People (`CohortPeople`)

Replaces Learners & Teams (the drawer and the export stay). Teams first ("Teams {n} of {cap}") and Learners, both the
cohort's roster (D-267): Team (name, owner), People ("{in} of {seats} signed in"), Paid ("Paid" or "{n} of 2
payments"; a comp "Comped"), Intake (Submitted, Draft, Not started), the current week's progress ("{done} of {steps}",
the week the cohort is on, read from its run: Week 0 before Week 1 opens), Last active. Paid and Intake come from the
cohort facts (`GET /api/admin/cohorts/:id/facts` gains one row per roster team). The learner list now reads the run,
so the allowlist entry that names it (`cohort-actions.ts`' December mirror) is re-worded: the dashboard (Phase 9),
`build-audit.ts` and `curriculum-week.ts` still read a module's dates.

## 5. Cohort › Submissions (`CohortSubs`)

The tab is drawn (D-265 item 10 left it here), with the mockup's four views over what exists: Intake, added up (each
question's answers counted, from `team_intake` of the roster's teams); Intake, team by team (status, when, answered of
the form's questions, GHL sync); Turned in, by step (each week's step that asks for a turn-in, how many teams turned
in); Turned in, every file (`ADMIN_SUBMISSIONS_PATH`, every week of the run). D-237's staff-only status and the
files-deleted line keep their rules: the status is set where it is set today (`SubmissionsCard`), and a deleted file
reads as D-237 wrote it. The one-week page of Phase 6 stays as the "every file" view's per-week detail.

## 6. People › a team, a person

The mockup changes their way back only (Teams, People), which the reference and the app already have (D-253). Nothing
else changes in this phase; the mockup's earlier-round Intake and Turned in tabs on a team are listed for Connor.

## 7. References, tests and screenshots

- **R2** (`design-reference/admin-redesign-r2/AdminRedesign.jsx`): `PeoplePg`, `TeamsPg`, the rest of `Groups`,
  `CohortPeople` and `CohortSubs`, ported from the mockup's source on this reference's own data (`USERS`, `WS`,
  `ULA_R2`), with PLAN § 10.8's words. Refs: `users`, `workspaces`, `utah-life`, `learners` replaced (PLAN § 7);
  `submissions` new; People's tab counts (`masquerade`); the Cohort tab strip's Submissions tab (every Cohort ref).
- **Tests:** core (`gotInOf`, `groupTeamOfOne`, the cohort roster's rows, the submissions view), API (the audiences,
  the list filter, the Teams exclusion, Utah Life's facts, both actions refused for Support and audited for Admin, the
  facts' team rows, the skill-open count), web (each view-model), e2e (the screens with axe at 1280 and 390, both
  actions, and the number walk).
- **Screenshots:** every screen at 1440, 1280 and 390, and 1024 for each page with a table, in
  `handoff/admin-mockup/compare/r5-phase7/`.
