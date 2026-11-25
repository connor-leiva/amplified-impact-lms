# The admin restructure: Program, Cohort, People, Revenue, and a cohort that owns its shape

Build spec for Claude Code. This is **R-5**, after R-1 to R-4 in `handoff/lms-v3/IMPLEMENTATION-SPEC.md` ("Still to
build"). Written against `main` @ `babceae` (PR #264, Nov 24, 2026). The latest decision there is D-252. **Take the
next free decision numbers yourself, one per phase.** This file names none, because the last two specs named
numbers the repo had already used.

**Approval.** Connor Leiva, Nov 25, 2026, about the mockup in this folder: "This is perfect, create a handoff for
Claude code for me." What that approves: the sidebar and pages in section 3, and the rule in section 2 that a cohort
owns its shape. His brief the same day, which is the test this work has to pass:

> "Say in 3 weeks Spring and I want to go set up a new cohort where the promise is 6 weeks of building, we meet twice
> a week and the new cohort begins in early January. How would that work in this admin portal?"

> "Right now it feels like this portal has been constructed to fit the current offering we have for our very first
> cohort - December. And NOT the other way around where the offering should fit nicely inside the architecture of the
> portal. Don't over complicate this and prioritize reducing redundancy. If there needs to be sub-tabs in the UI,
> lean into that where it's necessary"

"In 3 weeks" from Nov 25 is Wed, Dec 16, 2026. That is why the phases in section 5 are in the order they are in.

**The design is the mockup.** Open `handoff/admin-mockup/dist/index.html`. The black bar's **Screen** list has two
groups for this work: "NEW: the four pages" (20 screens) and "NEW: set up the January cohort" (the new-cohort page,
and January already created). "Today's pages, replaced" keeps seven of the live pages to compare. The widths
`1440`, `1280`, `1024` and `390` show the full sidebar, the rail and the phone.

- Source: `p3-model.jsx` (the cohort model and the new-cohort page), `p3-cohort.jsx` (the Cohort page's tabs),
  `p3-areas.jsx` (the four pages, Overview, Curriculum, a week, the crumbs), `ia-screens.jsx` (Course settings,
  People, Teams, Utah Life, Revenue), and from earlier rounds `new-screens.jsx` (intake and turned-in files) and
  `community-screens.jsx`. `AdminMock.jsx` is the built file.
- `build_admin.py` lists every edit made to the R2 reference, each as a before and after string. Its last block
  ("third pass") is this work. The mockup was built from the reference at `0ebeb97` (the copy is in the folder as
  `AdminRedesign.0ebeb97.jsx`). The repo's reference has moved since (D-239). **Port the screens into the repo's
  current reference. Do not replace the reference with `AdminMock.jsx`.**
- To rebuild the mockup: `python3 build_admin.py && node build.mjs`. `build.mjs` is the repo's own copy
  (`handoff/admin-mockup/build.mjs`, unchanged); it is not in the zip so the zip can go by email.
- Where this file and the mockup disagree about what a screen looks like or says, the mockup wins. Where they
  disagree about what is stored, counted or read, this file wins. Either way, stop and say so.
- **Every count, date and dollar figure in the mockup is sample data, prices included.** The copy is exact. The
  numbers are not. Names are the R2 reference's own fixture names plus Northline Realty and Sample Team.
- **Two changes were made to the mockup after Connor approved it, both on Nov 25.** (1) Cohort › Settings › Dates
  and release › Edit gained "Each week": an Opens and a Due date per week. Without it, a week's dates would have
  had no editor once they leave the week page, and December's holiday break is exactly that case. (2) The file
  list's class was renamed (section 6). Connor has been told about both. If he objects to (1), the dates still need
  a home on the cohort: ask him where.

---

## 1. The rule that outranks everything here: December does not move

The December 2026 Cohort is live. Week 1 opened Sun, Nov 29 (D-249). The first live build is Wed, Dec 2 · 1:00 PM
CT. Paying teams are in it while this is built.

**After every phase, every December output is the same as before it.** Prove it with a test:

1. Before changing anything, write a characterization test over the seeded December database. Capture, at a spread
   of instants (before the preview, on Nov 29, during the Dec 2 build, in the holiday gap, after the last session)
   and for each kind of viewer (a team owner, an AI Implementer, an Insiders buyer, a Team Plan agent, a Utah Life
   agent, a single-skill buyer (D-241), a test account with early access, staff):
   - `GET /api/course`, and the scoped snapshot a learner receives (`scopeSnapshot`);
   - which sessions they see, and what the join route answers for each;
   - who each scheduled email and reminder goes to, and when (`jobs/due.ts`, `jobs/welcome.ts`,
     `jobs/week0-open.ts`);
   - the offer page's seat numbers and cart states (`routes/offer.ts`), the calendar feed
     (`routes/offer-calendar.ts`), and what `billing/payment-links.ts` would do to the two December links;
   - what a completed December checkout provisions (`billing/provision.ts`).
2. That test passes unchanged at the end of every phase. A phase that needs it edited is a phase that moved
   December: stop and say so.
3. No phase rewrites a December row unless this file names the rewrite. Each named rewrite is a one-time data step
   (`apps/api/src/db/data-migrations.ts`, D-175: run once by id, audited, recorded in `data_migrations`) with its
   own before-and-after equality test.
4. Nothing in this work sends an email, changes a Stripe object, or writes to GoHighLevel for an account that
   exists today.

The repo's own rules stand as written: the gate for each phase, goldens never edited by hand, tolerance never
raised, copy exact, tokens only, `ICONS` only, business logic in `packages/core`, `fmt.*` for time, axe at zero
serious or critical.

---

## 2. The through line

**A program is what you teach. A cohort is one group you take through it. People are who has a sign-in. Revenue is
what they paid.** A cohort owns its shape: how many weeks, which ones, how often it meets, when it starts, its
seats, its price and its promise. What a week teaches belongs to the program and is built once.

| Thing | Owner | Today, at `babceae` | After |
|---|---|---|---|
| What a week teaches: title, steps, cards, kit, course page | Program | `modules` rows of kind `week` (`ModuleCourse`), ids `accelerator-week-0` to `-8` | The same rows and ids |
| Which weeks a cohort takes, each week's number in that cohort, when each opens and is due | Cohort | The constant list `ACCELERATOR_WEEKS`; each module's own `opens`, `due_at` and `status: 'scheduled'`; `course.week` | The cohort's **run**: an ordered list of `{ moduleId, n, opensAt, dueAt }` |
| Shape: weeks of building, a setup week or none, the rhythm (weekday, time, kind and length of each meeting), hosts | Cohort | `cohorts.weeks`, the free-text `cohorts.cadence`, `COHORT_ONE`, the seed | Fields on the cohort |
| Sessions | Cohort | `sessions` with `cohort_id`, `kind`, `module_id`. December's ids are `dec26-s{week}` and `dec26-oh{week}`, and `sessionKind` and `sessionWeek` read the id | The same table. A new session's id says nothing; its `kind` and `module_id` are the truth |
| Seats, enrollment open or closed, the price and the ways to pay | Cohort | `COHORT_SEATS`, `CARTS`, `LOOKUP_KEYS`, two Payment Link addresses in the environment | Fields on the cohort (Phase 5) |
| The words only this group reads: the promise, how it works, the holiday note | Cohort | `CohortCourse.intro.sub`, `.how`, `.holiday`, stored on the `dec26` row | Stay on the cohort |
| What every cohort shares: the rest of the course intro, the rules, the before and after pages, the glossary, the copy strings | Program | The rest of `cohorts.course` on the `dec26` row; `copy_strings` | One program-level copy, read through one function (Phase 6) |
| Who is in a cohort | The cohort plan | `users.cohort_id`. Every account is given `dec26`: `OWNER_COHORT` in `billing/provision.ts` and `createGroupMember` in `billing/access-groups.ts` | A `cohort` plan that has not ended, by its `plans.cohort_id`, through `accounts.team_id` |

**Why it feels built for December.** It is. Checked at `babceae`, leaving tests out: `ACCELERATOR_COHORT_ID` is read
in 19 files; the week list and its helpers (`ACCELERATOR_WEEKS`, `acceleratorModuleId`, `ACCELERATOR_MODULE_IDS`,
`isAcceleratorModule`) in 29; `COHORT_ONE`, `COHORT_SEATS`, `COURSE_OPENS_AT` and the two session-id builders in 27.
`packages/core/src/scope.ts` says it in a comment: "every paid buyer sits in cohort `dec26`, so cohort membership
cannot be the gate: the plan is."

What already takes a cohort and will help: `courseFromSnapshot`, `courseOutline`, `courseFor` and `courseSessions`
take a `cohortId` (it defaults to the constant); `saveSession`, `saveCohortPlan` and `saveCohortCourse` take one;
`cohort_enrollments`, the welcome job and the Week 0 job are keyed by cohort; `plans.cohort_id` exists; the learner
app reads `me.cohortId` first and falls back to the constant.

### The mechanism I recommend

Your Phase 0 plan may change the mechanism. It may not change the table above.

1. **`Cohort` gains optional fields**, as nullable columns with no default, by D-173's rule (a null reads back as an
   absent key, so every existing row and fixture reads exactly as before):
   ```ts
   interface CohortWeek  { moduleId: string; n: number; opensAt: number | null; dueAt: number | null }
   interface CohortSlot  { day: 0|1|2|3|4|5|6; time: string /* HH:MM, cohort zone */; kind: SessionType; mins: number }
   interface CohortShape { buildWeeks: number; setupWeek: boolean; slots: CohortSlot[]; hosts: string }
   // Cohort.run?: CohortWeek[]   Cohort.shape?: CohortShape   Cohort.programId?: string   Cohort.archivedAt?: number
   ```
2. **An absent `run` means "read the modules as today".** That is how December stays untouched until its run is
   written (Phase 3, one data step).
3. **One reader in `packages/core`**, `cohortRun(db, cohortId)`: the cohort's weeks as week modules *seen through
   the cohort*, each with its `opens`, `dueAt`, `status` and `course.week` as that cohort has them. `weekOpenFor`,
   `courseWeekOf`, `lockedWeekOf` and the rest keep their signatures and are handed the cohort's view. Every reader
   of the week list goes through it.
4. **`isAcceleratorModule` answers two questions today.** Split them: "is this a course week at all" (the plan
   gates it) and "is it in this viewer's cohort" (the run decides).
5. **Which cohort is a viewer in.** One function: the cohort of their team's newest `cohort` plan that has not
   ended. Anyone without one gets the default cohort, which is today's constant under an honest name
   (`DEFAULT_COHORT_ID`, still `dec26`). For them it is inert, as the comment in `scope.ts` says: their plan is the
   gate. `users.cohort_id` is kept in step for a cohort team (written when the plan is provisioned, for the owner
   and for anyone they add), because `scope.ts`, `jobs/due.ts` and four learner files read it. **No existing
   `users` row changes.**
6. **Sessions.** `sessionKind`, `sessionWeek` and `moduleForSession` prefer the stored `kind` and `module_id` and
   fall back to the id only for rows that have neither. D-248 (H-13) already goes this way.

---

## 3. What the admin becomes

| Sidebar | Tabs | Replaces (today's address) |
|---|---|---|
| Overview | none | Overview (`/admin`) |
| **Program** | Curriculum · Course settings · Resource Vault | Curriculum, Module Builder (`/admin/curriculum/new`), Course settings (`/admin/curriculum/course`, in no nav), Resource Vault, the Build hub (`/admin/build`) |
| **Cohort** | Overview · Schedule · People · Submissions · Community · Announcements · Settings | Cohorts & Sessions, Learners & Teams, Community, Announcements. Overview, Submissions and Settings are new |
| **People** | Everyone · Teams · Utah Life · Masquerade | Users, Workspaces, Masquerade. Utah Life is new |
| **Revenue** | Summary · Payments · Plans & upgrades · Usage | Billing (its Summary becomes Revenue's; its five lists become Payments), Tiers & Upgrades, Usage |
| Operations, Access | as today, under a hairline | System Health moves into Operations, first |

Thirteen of today's rows become four pages with tabs. The six-row sidebar of D-239 keeps how it works: the travel,
the rail, the fly-outs, the roll-ups. What changes is what is in it. Overview, Program, Cohort, People and Revenue
are single rows that open their page (the mockup's `SOLO`); in the rail each is one icon with no fly-out.
Operations and Access stay groups that open.

**Roll-ups on the single rows** (the mockup's `badge`): Program "6 draft"; Cohort "3 waiting" for the cohort you
are on, or "Draft" when that cohort is a draft; Revenue "3 failed", the count of the Failed list. Each hides at
zero. Upgrade requests are counted on the Plans & upgrades tab, not on the row. The failed count comes from what
Billing already has in memory (`BillingMemo`) and shows nothing while it is unknown: never a Stripe call per page
view.

**Inside a tab, a page shows its title once.** The area's head carries the title and the tabs. The page under a tab
keeps its description and its actions and drops its own `h1`; if it had tabs of its own they become a segmented
control (the mockup's `AreaCtx`, `.shd` and `.sgm.stb`). Revenue › Payments is the case to look at.

**Addresses.** New ones below. Every old address redirects to its new one, so a bookmark, an audit entry or an
email link still lands. If a redirect costs more than it is worth for a page, keep its address and say so in the
plan.

| Page | Address |
|---|---|
| Program | `/admin/program`, `/admin/program/course`, `/admin/program/vault`, a week at `/admin/program/weeks/:moduleId` |
| Cohort | `/admin/cohort/:cohortId` and `/:tab` (`schedule`, `people`, `submissions`, `community`, `community/:id`, `announcements`, `settings`); `/admin/cohort` goes to the current cohort; `/admin/cohort/new` |
| People | `/admin/people`, `/admin/people/:userId`, `/admin/people/teams`, `/admin/people/teams/:teamId`, `/admin/people/groups/:groupId`, `/admin/people/masquerade` (the learner view keeps its address) |
| Revenue | `/admin/revenue`, `/admin/revenue/payments` and `/:tab`, `/admin/revenue/plans`, `/admin/revenue/usage` |

**Which cohort.** The cohort is in the address, so a link names its cohort. The sidebar's switcher and the picker in
the Cohort page's title are the same choice: picking one keeps you on the same tab. Both list every cohort that is
not archived, a draft marked "· Draft", then "New cohort…". The last cohort a staff member looked at is remembered
for them (`users.prefs`). With nothing remembered: the cohort that is running, else the next to start, else the
newest. `ADMIN_COHORT` in `data/admin-shell.ts` goes.

---

## 4. Rules for every screen

1. **Every number opens the list it counts.** Fact strips, stat tiles, readiness bars, the audience bar, table
   counts, "Needs you" rows, "Coming up" rows. In the mockup every one is a button with a target; the target in the
   mockup is the target. A number with nowhere to go is a bug in this work.
2. **Counts say what they count.** A cohort's Teams are teams with a `cohort` plan for it that has not ended. Its
   Learners are the people on those teams. Test accounts are left out (D-202's filter). A Utah Life agent is in no
   cohort, no team count, no learner count and no revenue figure. `Cohort.enrolled` as `db/codec.ts` derives it
   today (every non-test user whose `cohort_id` is the cohort) is the "39 learners" Connor saw: stop showing it.
3. **Times.** The admin prints a cohort's times in the cohort's zone, written "MT" (`mountainWhen` and its family
   in `release.ts`, which D-250 already uses). On a row learners see, Central goes under it: "1:00 PM CT for
   learners". The line "All times are MST (America/Phoenix)" on Cohorts & Sessions goes; BUILD-SPEC § 7 set the
   admin's zone, so record the change in the phase's decision.
4. **Sessions are edited in one place**, Cohort › Schedule. A week shows its sessions and links to them. The week
   builder's `saveSession` and `deleteSession` controls move there.
5. **Writes keep their permissions.** A wrapped page keeps its capability from `R2_NAV`; a tab a role can't open is
   not drawn, and a page with no tab left is not in the sidebar. Shape, run and sessions are the `cohorts`
   permission; weeks and Course settings are `curriculum`. Opening or closing enrollment, seats and the price are
   Owner and Admin only: a new Console capability beside `billing.refund`. Every write is audited the way
   `saveCohortPlan` is.
6. **Copy is the mockup's**, sentence for sentence. No em dashes. A toast in the mockup that says a form "opens
   here" marks a form that exists today: use that form (section 7 lists them).

---

## 5. The phases

One pull request each, in this order, each behind its gate and section 1's test. Phases 1 and 2 touch different
code and can be built side by side. **January needs Phases 0 to 5.** Phases 6 to 9 remove the redundancy Connor
named and can follow in any order.

| Phase | What | January can |
|---|---|---|
| 0 | Recon and a written plan. No code | |
| 1 | The frame: the sidebar and the four pages, wrapping today's pages | |
| 2 | Core: a cohort's run and shape. No screen | |
| 3 | Cohort › Overview, Schedule and Settings, and New cohort | be created, laid out and read, as a draft |
| 4 | The learner side reads its own cohort | be opened by a test team end to end |
| 5 | Selling a seat in a cohort | take real teams |
| 6 | Program: Curriculum, a week, Course settings | |
| 7 | People, Utah Life, Cohort › People and Submissions | |
| 8 | Revenue › Summary | |
| 9 | Overview, the palette, archive, retiring what is left | |

### Phase 0. Recon and plan (no code)

Write `handoff/admin-mockup/PLAN.md` and stop for Connor to read it. It holds:

- Every read of `ACCELERATOR_COHORT_ID`, the week list and its helpers, `COHORT_ONE`, `COHORT_SEATS`,
  `COURSE_OPENS_AT`, `buildSessionId` and `officeHoursSessionId`, each with what it will read instead. The file
  lists are in section 9.
- The mechanism you will use, if it differs from section 2, and why.
- Section 1's test, written and passing on `main` before anything changes.
- Each card and field of today's `WeekBuilder.tsx` and `CourseSettings.tsx` mapped to its section in the mockup
  (Phase 6), and any with no clear home.
- Which references change in each phase.
- Anything in this file that the code contradicts.

### Phase 1. The frame

No data changes. The pages are today's, unchanged inside.

- `shell/admin/adminNav.ts`: the model in section 3. Single rows, the hairline before Operations, the roll-ups, the
  rail's direct buttons. `peek` and `roll` stay.
- A shared area component: head, tabs with counts, the page under it (the mockup's `Area`). Use `Tabs` from
  `components/r2/kit.tsx`.
- The routes and the redirects in section 3. The crumbs are "Admin / Cohort / Schedule" (the mockup's `Crumbs`);
  a detail page adds its name.
- A tab is drawn once its page exists. In this phase: Program has all three (Course settings is today's page, now
  reachable, which fixes the button on a week card as the only way in); Cohort has Schedule (today's Cohorts &
  Sessions), People (today's Learners & Teams), Community and Announcements; People has Everyone (Users), Teams
  (Workspaces) and Masquerade; Revenue has Summary (Billing's own, until Phase 8), Payments, Plans & upgrades and
  Usage.
- The Module Builder row goes. "Add a week" on Curriculum opens what it opened.
- The cohort picker in the sidebar and the title, listing the cohorts that exist. "New cohort…" arrives in Phase 3.
- The ⌘K palette lists the four pages and their tabs (`shell/admin/palette.vm.ts`).

Done when: every admin page is reachable in at most two clicks from the sidebar; every old address lands; nothing a
role could open before is closed to it, and nothing is newly open; the sidebar matches the mockup at 1440, 1280,
1024 and 390.

### Phase 2. A cohort owns its run and its shape (core and API)

- The fields and `cohortRun` from section 2, with the fallback. Unit tests in `packages/core`: December with no
  stored run gives exactly today's weeks; a cohort with a stored run gives its own numbers and dates.
- Move the readers (the 29 files) onto the run and the viewer's cohort. This is the phase section 1's test exists
  for.
- **Laying a shape out** is one pure function in core, the mockup's `planOf`: Week 1 opens on the chosen day at the
  cohort's default open time; each later week opens seven days after the one before; a setup week opens seven days
  before Week 1; the picked weeks keep the curriculum's order and are numbered 1 to N; each week gets one session
  per slot, on the first matching weekday on or after its opening day, titled "{week title} · {kind}", with the
  slot's length, no Zoom link and no reminder set.
- **Warnings, never errors**, computed in core and returned with the layout: a session that starts at the same
  instant as a session of another cohort that is not archived (the mockup's "same time as December's"); a session
  on a U.S. federal holiday, named. The holiday list is data in core, covering at least 2027.
- Core actions, in `course-actions.ts`'s style (permission, validation, audit): create a cohort from a shape, a
  start day and a source cohort; save a shape; save a run; add the sessions a rhythm is missing. Creating copies
  the source cohort's seats, zone and default open time, and nothing else. **It creates a `draft`.** `underWay` in
  `jobs/due.ts` already sends nothing for a cohort that is `draft`, and a cohort with no plans gets no welcome.
- **Changing a shape or a run later** lays out again only what has not happened: a week that has opened keeps its
  date, a session that has started keeps everything, and a session staff edited by hand is left alone and listed in
  the answer.

### Phase 3. The Cohort page, and New cohort

Screens: "Cohort › Overview", "Cohort › Schedule", "Cohort › Settings", "New cohort: six weeks, twice a week",
"Skip ahead: January, created".

- **New cohort** (`NewCohort`, `ShapeFields`, `WeekPick`, `PlanList`): one page. The right side lays the calendar
  out as the form changes, with both warnings. "Create cohort" makes the draft and opens its Overview. The price
  field can stay empty. The page says "Copied from December: its seats, its intake form, its emails and its
  community rules." What makes that true: the seats are copied onto the new cohort; the intake form, the emails
  and the community rules are the program's, so a new cohort has the same ones with no copy made.
- **Overview** (`CohortOverview`): the fact strip; "Needs you" for a cohort with people in it and "Before it opens"
  for a draft; the run; Readiness or Seats; Coming up; This cohort's shape.
  - "Before it opens" is seven lines, each done or not from the record and each opening the place to fix it
    (`todoOf`): Shape; Its weeks (all published); Sessions (on the calendar, none at the same time as another
    cohort's, or the overlap acknowledged); Zoom links; Price; Words learners see (opened once); Open enrollment.
  - "Needs you" rows are computed, each from a source that exists: teams that have not started their intake
    (`team_intake`), intake that did not reach GHL (`team_intake.ghl_sync_status` is `failed`), Community threads
    waiting (`waitingOn`), sessions with no Zoom link, second payments on the calendar. A row with a count of zero
    is not drawn.
- **Schedule** (`CohortSchedule`): today's session list and its actions (go live, end, publish and attach a replay
  keep working), in the mockup's table, with the fact strip, the filter, and "Add N sessions" when weeks have none.
  The session editor is today's form (`SessionFields`).
- **Settings** (`CohortSettings`): Shape, with Edit and the weeks dialog (`WeeksDlg`); Dates and release, which
  holds today's Release plan fields from `CourseSettings.tsx` (`saveCohortPlan`: name, preview opens, default open
  time, welcome email time) and, under "Each week", every week's Opens and Due for this cohort. Moving Week 1 moves
  every week and session after it by the same number of days. Moving one week moves that week's sessions that have
  not happened, and nothing else. The setup week's opening is the field above the list. Then Words from this
  cohort, with "Edit words" opening the four as fields (name, the promise, how it works, the holiday note); and
  Clean-up, which takes "Delete turned-in files" off the Schedule's main buttons (`CohortFiles.tsx`, D-237,
  unchanged otherwise). The Enrollment card is drawn read-only until Phase 5.
- **A new cohort's words** are drafted from its shape when it is created (`autoPromise`, `howOf` in
  `p3-model.jsx`) and are then ordinary stored text that staff edit. December's stored words are not rewritten.
- **The one December rewrite in this work:** a data step writes December's run from its modules' own `opens`,
  `due_at` and week numbers, so its dates can be edited on the cohort like any other. Its equality test is section
  1's test.
- **One editor at a time.** In the same pull request, today's week builder stops editing Opens, Due and sessions.
  In their place it shows the mockup's "Where it runs" lines and its read-only session rows, each linking to the
  cohort. The rest of the week builder waits for Phase 6.
- **Status words** are the mockup's: Draft, Scheduled, Active. `cohorts.status` stays the stored field the jobs
  read: `draft` until enrollment first opens, then `enrolling`. Say in the plan how `live` and `completed` are set
  today and keep that.
- "Preview" opens the existing staff preview of the course for that cohort (`courseFor(db, now, 'staff',
  cohortId)`).

Done when: on the seeded database, Connor's January (six weeks, Tuesday live build and Thursday office hours
at 12:00 PM MT, Week 1 opening Sun, Jan 3, 2027) is created in one sitting; the layout matches the mockup's (setup
week Sun, Dec 27; 12 sessions; first Tue, Jan 5; last Thu, Feb 11); the overlap with December's Thursday office
hours is reported; and section 1's test passes with both cohorts in the database.

### Phase 4. The learner side reads its own cohort

A team placed in January by hand (a seeded test team, D-202's kind) gets January, start to finish:

- The course, the outline and the week pages show January's weeks, numbered 1 to 6, on January's dates.
  `/course/week-3` is that cohort's third week (`coursePath`, `routes/learn/redirects.tsx`, `shell/navModel.ts`).
- Home, Schedule, Replay and Account read the viewer's cohort; the fallback to the constant goes.
- Sessions, join (`routes/join.ts`), files (`routes/files.ts`), the calendar feed, Community
  (`routes/community.ts` hands every viewer `ACCELERATOR_COHORT_ID` today), announcements and due reminders are
  all the viewer's cohort's. `integrations/ghl.ts` sends the plan's cohort, not the constant.
- The welcome and Week 0 emails already key on the cohort. Check they read January's weeks through the run.
- `GET /api/course` sends the same shape as today. `intro.sub`, `intro.how` and `intro.holiday` come from the
  viewer's cohort; the rest from the program's shared copy.
- **`{first live build}`** is the one token the mockup draws in shared words. It is filled from the viewer's cohort
  when the course is assembled. Add no other token without Connor.
- **A week's content can name a week number.** A week that is fifth in the curriculum may be third in January.
  This work does not rewrite lesson content; see section 8.

Done when: the test team sees only January, a December team sees only December, and neither can reach the other's
sessions, threads, files or replays by address.

### Phase 5. Selling a seat in a cohort

This is billing. Plan it on paper first, and do not start until Connor has answered Q-21 and Q-22 in section 8.

How a seat is sold today, so the design fits it: two Stripe Payment Links, whose addresses are in the environment
(`paymentLinkEnv` on each cart in `offer.ts`); the checkout's metadata names the cart (`cartForMetadata`: `ai_plan`,
`ai_option`); the webhook provisions the order (`billing/provision.ts`), which gives the plan `COHORT_ONE.id` and
dates from `initialPlanDates`; fifteen seats across both links (`COHORT_SEATS`), and `billing/payment-links.ts`
turns the links off at fifteen.

- **The code never creates a Stripe price or a Payment Link.** Someone makes them in Stripe, as December's were.
  The cohort then records what it sells through: its lookup keys, its link addresses, its seat count, whether two
  payments are offered, and the date its included time ends.
- **A checkout names its cohort** in metadata (`ai_cohort`). No `ai_cohort` means December, forever, so a December
  link already in someone's inbox still works.
- **Provisioning places the team:** the plan's `cohort_id`, `starts_at` and end dates come from that cohort's
  record, and the team's `users.cohort_id` follows. December's values are today's constants, moved onto its record
  by a data step with an equality test.
- **Seats are counted per cohort** (`cohortSeatsSold` by `plans.cohort_id`), and the sold-out rule and the link
  switch act on that cohort's links only.
- **"Open enrollment"** (the mockup's dialog) is refused, with the reason, until the cohort has a price, its links
  and its end date, and Stripe has a price under each lookup key. It moves `draft` to `enrolling`. **"Close
  enrollment"** stops new sales and touches no one already in.
- **The price on screen** is Stripe's amount for the cohort's lookup key (`PriceBook`). The mockup's "Price for a
  seat" field is what Connor expects it to be: if Stripe's amount differs, the Enrollment card says so and
  enrollment cannot open. No price is written in code.
- A team that buys a seat in a second cohort: see Q-23.

Done when: a test-mode checkout through a January link provisions a January team that Phase 4 serves; a test-mode
checkout through a December link provisions exactly what it does today; the seat after January's last behaves as
December's sixteenth does today.

### Phase 6. Program

Screens: "Program › Curriculum", "Program › a week", "Program › Course settings", "Program › Resource Vault".

- **Curriculum** (`Curriculum3`): one list of weeks, full width, each with its steps and time, where it runs (a
  cohort and its week number there), and Published or a Publish button. Cards below: Cohorts that run it; Shared by
  every week. Reordering and "Add a week" stay. A week is Published or Draft here; "scheduled" is something a
  cohort says about a week.
- **A week** (`WeekEdit`): today's Week Builder, regrouped into six sections down the left: Basics, Steps, Course
  page, Live sessions, Hire cards, Kit. No field is added or removed. Two things have left it by now, both in
  Phase 3: its Opens and Due dates (shown under "Where it runs", one line per cohort, each a link to that cohort's
  Dates and release, where they are edited) and editing sessions (rule 4). The staff cards that show what teams
  sent (`SubmissionsCard`, `SeatCardsCard`) move to Cohort › Submissions.
- **Course settings** (`CourseSet`): eight sections down the left, one on screen at a time: Course intro, Roles,
  Rules and support, Before Week 1, After the cohort, Joining and community, Glossary, Words. Every field says
  where learners see it. The three cohort words are drawn as "From the cohort" blocks that link to that cohort's
  Settings; they are not edited here. It stops importing `ModuleBuilder.module.css`.
- **The shared copy becomes the program's.** Today it is `cohorts.course` on the `dec26` row. Recommended: a program
  record (`id: 'accelerator'`, its name, the shared `course`), each cohort naming its program, and a data step that
  moves December's shared fields there, equality-tested. Until that step runs, a cohort with no program copy reads
  December's. One program, so the Program page has no picker.

### Phase 7. People, Utah Life, and the cohort's roster

Screens: "People › Everyone", "People › Teams", "People › Utah Life", "People › a team", "People › a person",
"Cohort › People", "Cohort › Submissions".

- **Everyone** (`PeoplePg`) is today's Users with one new column and filter, "Got in through": the Console's label
  for the primary plan of the person's team (`primaryPlan`, `CONSOLE_PLAN_LABELS`), else "Skill buyer" (a
  `skill_purchases` row and no plan), else the access group's name. **The chips are built from what exists.** The
  mockup's six are sample; today's plan kinds give more (Insiders for Agents, Skill Library). Each person is
  counted once, under the first of those that applies.
- **Teams** (`TeamsPg`) is today's Workspaces. A team of one made for an access-group member is left out.
- **Utah Life** (`Groups`) is the access group `utah-life` (D-148; `access_groups`, `access_group_members`,
  `email_verifications`): its facts, its agents, what they can open, what they open most, where they are counted.
  One tab per access group, named by the group. The two menu actions ("Add an address outside the domain…", "End
  access…") are Owner and Admin only, confirmed and audited.
- **Stop creating the miscount.** `createGroupMember` still makes each agent a team of one "in cohort one",
  because the learner app expects a team. Keep that, and leave access-group members out of every team, learner,
  cohort and revenue figure with one shared predicate, the way `countedCohortSeat` leaves out test accounts.
- **Cohort › People** (`CohortPeople`): Teams and Learners for this cohort by rule 2, with Paid, Intake, progress
  on the current week (Week 0 in the mockup) and Last active. It replaces Learners & Teams, whose drawer and
  export stay.
- **Cohort › Submissions** (`CohortSubs`): four views over data that exists (`team_intake`, `submissions`, the
  `ADMIN_SUBMISSIONS_PATH` routes, which are per week today): Intake added up, Intake team by team, Turned in by
  step, Turned in every file. The staff-only status and the files-deleted line keep their rules (D-237).
- **Two lists, two jobs**, said on the page as the mockup says it: People is the account (sign-in, plan, seat);
  Cohort › People is the roster (who is in and how far along).

### Phase 8. Revenue › Summary

Screen: "Revenue › Summary" (`Revenue`). Every figure comes from what Billing already reads (Stripe subscriptions,
invoices, charges and refunds; `orders`; `plans`). Say so before asking for a new Stripe scope.

| Figure | Definition | Opens |
|---|---|---|
| Cash collected | Paid invoices and one-time payments in the period, less refunds | Payments, paid |
| Still to collect | The remaining payments on two-payment orders whose plan has not ended, across cohorts (`acceleratorFigures`'s `scheduledCents`, per cohort) | Payments, scheduled |
| Total revenue | Cash collected + Still to collect. Renewals are not in it | By product |
| MRR | As today (`subscriptionMrr`, `MRR_STATUSES`) | Payments, subscriptions |
| Failed payments | As today's Failed list | Payments, failed |

- **Cash by month:** collected by month, and for months ahead what is already on the calendar (second payments and
  renewals Stripe has dated). The note under it says what a future month counts and that it is not a forecast.
- **By product:** one row per billing line (`BILLING_LINES`, `billingLineOf`) plus Skills (`skill_purchases`), with
  Collected, Still to collect, Total and MRR. A cohort's row names the cohort. Each row opens Payments filtered.
- **Coming in:** the next 60 days, payment by payment: renewals, retries, second payments.
- **A card per cohort** that is selling or running (seats sold, paid in full, on two payments, refunds), in place
  of today's single "AI Accelerator" card.
- Period: All time, This month.
- Test accounts and access-group members are in none of it. Label every figure as Stripe's; when Stripe can't be
  read, the tile says "Unavailable" as Billing does today, never a zero.

### Phase 9. Overview, and what is left

- **Overview** (`Home`): four tiles (Program, Cohort, People, Revenue), each opening its page; "Needs you" grouped
  by cohort, then "Payments and system"; Cohorts with "New cohort"; Coming up across cohorts; "Who has a sign-in",
  the audience bar from Phase 7's rule, each segment opening People filtered. It replaces today's five stats.
  "Active Learners" as `Overview.vm.ts` counts it goes.
- Archive a cohort (Settings › Clean-up): allowed after its last session; sets `archivedAt`; the pickers stop
  listing it; nothing else changes.
- The palette finds cohorts, weeks, teams and people.
- Remove what nothing reads: `ACCELERATOR_WEEKS` and its helpers, `ADMIN_COHORT`, `GROUP_HUBS`, the Build hub.
  `ACCELERATOR_COHORT_ID` survives only as `DEFAULT_COHORT_ID` if section 2's rule still needs it. Say which, and
  why.

---

## 6. Tests, references, and done

- **Section 1's test**, every phase.
- **Core:** the layout function (Connor's January, December's own shape, a Monday slot in the week of Jan 18, one
  and three meetings a week, no setup week); the run with and without a stored list; laying out again after
  sessions have happened; which cohort a viewer is in (no plan, an ended plan, two plans); each count in rule 2.
- **API:** a January learner and a December learner each refused the other's sessions, threads, files and replays;
  provisioning with and without `ai_cohort`; seats per cohort.
- **Web:** each page's view-model; each tab hidden from a role without its capability; every redirect; and a test
  that walks every screen of this work and fails on a number that is not a link.
- **References.** The admin's reference is `design-reference/admin-redesign-r2/AdminRedesign.jsx` and its `ref/`.
  Each phase adds its screens to the reference from the mockup's source, by that phase's decision entry, renders
  the refs again (`pnpm parity:admin-r2:refs`), and lists in the pull request which refs changed and why. Phase 1
  changes every ref, as D-239 did. Never edit a result. A fixture for the new screens goes beside
  `console-fixture-community.ts`, fixture only.
- **Known about the mockup:** `.arx button { font: inherit; color: inherit; margin: 0 }` outranks single-class rules
  such as `.gx` (D-239 found this); follow what the reference renders. The file list is now `.fls`, so it no longer
  recolours the sidebar's icons (D-239's second note is fixed in this package). The mockup was checked by eye and by
  script, not pixel-tested.
- **Each pull request shows**, beside the mockup's, a screenshot of every screen it builds at 1440 and 390, and one
  at 1280 and 1024 for any page with a table.
- **A decision entry per phase**, quoting Connor's approval from the top of this file, saying what changed for
  staff, what did not change for December, and anything you decided that he should check.

---

## 7. Drawn as a note in the mockup, built from what exists

| In the mockup | Build |
|---|---|
| Schedule › "Add session", "Edit session": "Session editor opens here" | Today's session form (`SessionFields`, `saveSession`) |
| Schedule › "Attach replay": "Replay picker opens here" | Today's Attach replay |
| Settings › Dates and release › Edit | Drawn in full. Its top four fields are today's Release plan fields; "Each week" is new |
| Settings › "Edit words" | Four fields in a dialog: name, the promise, how it works (a line each), the holiday note |
| Cohort › "Preview"; a week › "Preview" | The existing staff preview |
| Utah Life rows with masked addresses | Real addresses, for roles that can read Users today |
| Overview and Revenue figures | Computed. Never the mockup's numbers |

---

## 8. Open, and what each one blocks

Connor decides these. None blocks Phases 0 to 4.

- **Q-21 (blocks Phase 5).** Who makes January's Stripe price and its two Payment Links, and what is the price?
  Assumed: made by hand in Stripe, as December's were, then entered on the cohort. No price is in this file.
- **Q-22 (blocks Phase 5).** What does a January seat include after its last session, and when does Team Leader
  Insiders start billing for a January team? December's is May 4, 2027 (`COHORT_ONE_LIVE_UNTIL`). There is no
  default: the cohort needs that date before enrollment can open.
- **Q-23 (Phase 5).** Can a team that is in December buy January? Assumed: a team is in one cohort at a time, the
  newest live cohort plan decides which, the sale is logged for Connor, and its December progress and files stay
  (they are keyed by team and week).
- **Q-24.** January's Thursday office hours at the same hour as December's: run together, or move one? The portal
  warns and allows either.
- **Q-25.** Cash collected is net of refunds here. Say if it should be gross.
- **Q-20 (from R-3, still open).** Keep or remove the staff door into the learner Community now that the admin has
  its own page.

**For Connor and Spring before January opens, outside this build:** read Course settings and January's six weeks
once for words that name a December date, a weekday, "eight weeks" or another week's number. The portal fills in
the cohort's own words and `{first live build}`. It will not find a date typed into a lesson.

## 9. The files, as audited at `babceae`

Tests left out. Check the lists again in Phase 0; `main` moves.

**Reads `ACCELERATOR_COHORT_ID` (19):** `apps/api/src/integrations/ghl.ts`, `lib/course-access.ts`,
`routes/community.ts`, `routes/curriculum-status.ts`, `routes/offer-calendar.ts`; `apps/web/src/routes/admin/
ModuleBuilder.tsx`, `routes/learn/Account.vm.ts`, `Home.vm.ts`, `Replay.vm.ts`, `Schedule.tsx`;
`packages/core/seed/` (`accelerator-v1`, `ai-implementer-v1`, `content-v2`, `curriculum`, `five-words-v1`,
`glossary-v1`, `weeks-0-3-v2`); `packages/core/src/accelerator.ts`, `course.ts`.

**Reads the week list or its helpers (29):** `apps/api/src/jobs/due.ts`, `routes/curriculum-status.ts`,
`routes/files.ts`, `routes/join.ts`, `routes/offer-calendar.ts`, `apps/api/test/accelerator-course.ts`;
`apps/web/src/routes/admin/WeekBuilder.vm.ts`, `routes/learn/Hire.vm.ts`, `Step.tsx`, `Step.vm.ts`,
`TeamPlan.vm.ts`, `Week.vm.ts`, `lms-v3/V3Week.tsx`, `redirects.tsx`, `test/fixture.ts`, `shell/navModel.ts`;
`packages/core/seed/` (`accelerator-v1`, `ai-implementer-v1`, `content-v2`, `curriculum`, `release-plan-v1`,
`weeks-0-3-v2`); `packages/core/src/accelerator.ts`, `course.ts`, `learner.ts`, `lms-tour.ts`, `mutations.ts`,
`release.ts`, `scope.ts`.

**Reads `COHORT_ONE`, `COHORT_SEATS`, `COURSE_OPENS_AT` or a session-id builder (27):** `apps/api/src/billing/
access-groups.ts`, `payment-links.ts`, `provision.ts`, `console/billing.ts`, `db/seed-test-member.ts`,
`routes/join.ts`, `routes/offer-calendar.ts`, `routes/offer.ts`; `apps/web/src/data/console-fixture-billing.ts`,
`home/sections/plans.ts`, `home/v3/sections/offer.ts`, `kit/kit.css`, `kit/parts.ts`,
`routes/admin/WeekBuilder.tsx`, `routes/console/build.vm.ts`, `routes/learn/data.ts`, `learn.vm.ts`,
`test/account-fixture.ts`; `packages/core/seed/` (`accelerator-v1`, `release-plan-v1`, `weeks-0-3-v2`);
`packages/core/src/accelerator.ts`, `console-billing-actions.ts`, `console-billing.ts`, `console-health.ts`,
`founding.ts`, `offer.ts`. The seeds are history: leave them. The marketing site's files (`home/`, `kit/`) sell
December and are not part of this work.

**The admin today:** `apps/web/src/shell/admin/` (`adminNav.ts`, `Sidebar.tsx`, `AdminShell.tsx`, `palette.vm.ts`),
`data/admin-shell.ts`, `components/r2/` (`kit.tsx` has `PageHead`, `Tabs`, `Stat`, `Facts`, `KV`), `router.tsx`,
`routes/admin/` (`Overview`, `Curriculum`, `ModuleBuilder`, `WeekBuilder`, `CourseSettings`, `Cohorts`,
`CohortFiles`, `Learners`, `VaultManager`, `Announcements`, `Tiers`, and the cards `IntakeCard`, `StackCard`,
`SubmissionsCard`, `SeatCardsCard`), `routes/console/` (`Users`, `User`, `Workspaces`, `Workspace`, `Masquerade`,
`Community`, `CommunityThread`, `Billing`, `Usage`, `BuildHub`, `RecordTabs`).

**The data:** `apps/api/src/db/schema.ts` (`cohorts`, `sessions`, `modules`, `users`, `teams`, `accounts`, `plans`,
`orders`, `cohort_enrollments`, `submissions`, `team_intake`, `community_threads`, `access_groups`,
`access_group_members`, `skill_purchases`), `db/codec.ts`, `packages/core/src/types.ts` (`Cohort`, `Session`),
`course-types.ts` (`ModuleCourse`, `CohortCourse`, `CourseIntro`), `course-actions.ts`, `sessions.ts`,
`release.ts`, `scope.ts`, `welcome.ts`, `console-support.ts`, `console-billing.ts`, `offer.ts`.

## 10. Not in this work

- The marketing site and its offer page for January. This work makes a January seat sellable; the page that sells
  it is its own piece.
- A second program. The model allows one; no screen picks between two.
- Rewriting lesson content for a cohort that takes fewer weeks.
- GoHighLevel settings, Stripe products, prices and links, and anyone's role, tier or plan. The code reads them
  and records which ones a cohort uses.

## 11. What was checked, and what was not

- **Checked against the repo at `babceae`:** every existing file, table, column, constant and function named here
  is there, and the three file counts were taken by search that day. The names this file proposes (`cohortRun`,
  `CohortWeek`, `CohortSlot`, `CohortShape`, `DEFAULT_COHORT_ID`, `ai_cohort`, `archivedAt`, `PLAN.md`) are new.
  `accelerator.ts` was read in full. The schema, `offer.ts`, `course.ts`, `course-actions.ts`, `provision.ts`,
  `payment-links.ts` and `adminNav.ts` were read in the parts this work touches. Everything else was searched,
  not read.
- **Checked in the mockup, after both changes above:** every screen named here is in its Screen list. Every button
  on the 22 new screens was clicked by script: 768 clicks, no error. Seven could not be pressed by the script: the
  Resource Vault's Download buttons, which the signed-off reference shows only when a row is hovered. The January
  flow (create, price, open enrollment, both cohorts on Revenue) and the sidebar (rail, fly-outs, palette) were run
  again. The Dates and release dialog was looked at for December, for January and on a phone.
- **Not checked:** production data; how `cohorts.status` is set to `live` and `completed` today; whether Stripe's
  read scopes are enough for "Coming in"; any December lesson for words that name a date. The mechanism in section
  2 is a recommendation from reading the code, not from running it.
