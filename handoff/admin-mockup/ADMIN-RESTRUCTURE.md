# Admin portal: one through line. Program, Cohort, People, Revenue

Audit and proposal, Nov 25, 2026. Audited against `main` @ `babceae` (PR #264, Nov 24). The design is in the admin
mockup ("Admin portal" artifact). Its source is `admin-mockup/` (`p3-*.jsx` and `ia-screens.jsx` are this round).

**Approved.** Connor, Nov 25, 2026: "This is perfect, create a handoff for Claude code for me." The build spec is
`ADMIN-RESTRUCTURE-SPEC.md` in this folder. Build from that file. This one is the reasoning behind it.

This version replaces the one that was in the mockup earlier today. That one made "offerings" the top of everything
and spread the pages across 31 sidebar rows. This one has five rows and puts the detail in tabs.

---

## 1. The through line

**A program is what you teach. A cohort is one group you take through it. People are who has a sign-in. Revenue is
what they paid.** The sidebar is those four words, in that order, under Overview.

The part that makes a new offer fit: **a cohort owns its shape.** How many weeks, which ones, how often you meet,
when it starts, its seats, its price and its promise are all fields on the cohort. What a week teaches belongs to
the program and is built once. So a six-week cohort is a form you fill in, not a change to the portal.

| Sidebar | Its tabs | Replaces |
|---|---|---|
| Overview | (none) | Overview |
| **Program** | Curriculum · Course settings · Resource Vault | Curriculum, Module Builder, Course settings (hidden), Resource Vault |
| **Cohort** | Overview · Schedule · People · Submissions · Community · Announcements · Settings | Cohorts & Sessions, Learners & Teams, Community, Announcements |
| **People** | Everyone · Teams · Utah Life · Masquerade | Users, Workspaces, Masquerade |
| **Revenue** | Summary · Payments · Plans & upgrades · Usage | Billing, Tiers & Upgrades, Usage |
| Operations, Access | unchanged, under a hairline (System Health moves into Operations) | |

Thirteen of today's sidebar rows become four pages with tabs. The cohort you are looking at is picked in the
sidebar's switcher or in the Cohort page's title. Both are the same choice.

---

## 2. January, step by step

Connor's example: in three weeks, he and Spring set up a new cohort. Six weeks of building, meeting twice a week,
starting in early January.

1. **New cohort** (the switcher, the Cohort page's menu, or Overview). One page. It starts as a copy of December.
2. **Its shape.** Weeks of building: 6. You meet: twice a week. Pick the two days, the time and what each one is
   (live build, office hours).
3. **When it starts.** Pick the day Week 1 opens. The right side lays out the calendar as you type: the setup week,
   each week's opening date and all 12 sessions.
4. **What it covers.** The program has eight building weeks. Six are ticked. Swap any of them. Each shows whether it
   is published, a draft, or not built yet.
5. **What the portal catches.** With Thursday office hours at 12:00 PM MT, five sessions land on the same hour as
   December's, which runs until Thu, Feb 4. It says so. Pick a Monday and it tells you Jan 18 is a holiday.
6. **Create.** It is a draft. No one is enrolled, nothing is for sale and no one is emailed.
7. **Before it opens.** The cohort's Overview lists what is left: publish its weeks, add Zoom links, set the price,
   read the words learners will see, open enrollment. Each line opens the place to fix it.
8. **Open enrollment.** From then on a team that buys a seat is placed in that cohort.
9. Both cohorts run side by side. The switcher moves between them, and Overview lists what each one needs.

**Why the words stay right.** December's course intro says "Nine weeks" and "We build its hire together on
Wednesday." For January those would be wrong. So anything that names a number of weeks, a weekday or a date is
written from the cohort's shape (Cohort › Settings › Words from this cohort), and Course settings keeps only what is
true for every cohort.

---

## 3. What you raised, and where it went

| You said | Today, in the repo | In the mockup |
|---|---|---|
| Course settings looks dated and is reached from a button on a week card | `/admin/curriculum/course`. The code says it is "not a row of the nav". One long form of four stacked cards, borrowing the Module Builder's stylesheet. It mixes one cohort's dates with the course's shared pages | **Program › Course settings**, a tab. Eight sections down the left, one on screen at a time. Every field says where learners see it. The dates moved to the cohort |
| Modules and the curriculum builder overlap | Curriculum lists the modules. Module Builder (a sidebar row) opens a blank new one and has its own copy of the same list. A week's builder also edits its sessions, and so does Cohorts & Sessions | **Program › Curriculum**: one list of weeks. Open a week to build it, six sections down the left. No Module Builder row. Sessions are edited in one place, Cohort › Schedule |
| A better way to manage each group | One page with one cohort's facts and sessions. The code notes that picking another cohort, New Cohort and Open Enrollment "are not drawn" | **Cohort**, one page with seven tabs for one group: what needs you, its run, its schedule, its people, what they sent, its threads, its announcements, its settings |
| Users or Learners & Teams? | Three lists of the same people: Learners & Teams (progress), Users (the account), Workspaces (the plan). Nothing says which to use | Two. **People** is the directory: a person, a team. **Cohort › People** is the roster: who is in this cohort and how far along they are |
| Utah Life agents show as teams and inflate the count | An access group (D-148): a verified `@liveutah.com` address gets the Agent Plan's skills free. First sign-in makes each agent "the owner of a team of one". So each is a team, and each is a learner in every count | **People › Utah Life**, their own tab. Not in Teams, not in a cohort, not in revenue. Overview shows them apart |
| Revenue shows MRR but not cash collected or total revenue | Billing › Summary: MRR, Subscriptions, Failed payments, Refunds. Collected and second payments exist only inside the Accelerator card | **Revenue › Summary**: Cash collected, Still to collect, Total revenue, MRR, Failed payments. Cash by month with what is already on the calendar. By product. Coming in, payment by payment |
| "39 learners" isn't a link and isn't right | Enrolled counts every non-test account whose `cohort_id` is this cohort. Every learner account carries that id, so it counts everyone with a sign-in | Teams (seats) and Learners, counted from who bought a seat. Both open the roster |
| The cohort should be a dropdown | No picker. It was left out of the redesign | In the sidebar and in the Cohort page's title |
| Things that should be links aren't | Facts, MRR, Subscriptions and plan rows don't open anything | **Every number opens the list it counts.** Facts, tiles, readiness bars and rows are all links |

Also found: "Delete turned-in files" sits beside "Add session" as a main button. It moved to Cohort › Settings ›
Clean-up. And the admin prints times as "MST (America/Phoenix)" while the cadence line says "1:00 PM CT". The mockup
shows Mountain, with Central under it wherever learners see the time.

---

## 4. Why it feels built for December (it is)

In `main` today:
- The cohort is a constant, `'dec26'`, used in 19 files.
- The course is a fixed list of nine week ids, read in 29 files. A session's id is built from the cohort constant
  and the week number, one build and one office hours a week.
- The seat cap (15), the first live build's date and the two ways to pay are constants.
- The `cohorts` table already has a name, dates, a status and a capacity. The Accelerator's code doesn't read them.

So a second cohort with a different length is a code change today, start to finish. The mockup is where that should
land. The list in section 6 is what it would take.

---

## 5. Decisions I made that you should check

1. **Shape belongs to the cohort, not to the program.** A cohort can be six weeks while December is eight. If you
   would rather fix the length per program, the form moves up a level and little else changes.
2. **A week is shared.** Fix a typo in "Where the Money Goes" and both cohorts get it. If January needs its own
   version of a week, you duplicate the week.
3. **One program for now.** The Program page has no picker. A second course would add one, as Cohort has.
4. **Utah Life agents leave Teams and every learner count.** They are under People and on their own tab.
5. **Total revenue = cash collected + what is still owed on a payment plan.** It does not include future renewals.
   Those are in MRR and in Coming in.
6. **Sessions are edited in one place** (Cohort › Schedule). A week shows its sessions but doesn't change them.
7. **Office hours at the same hour as another cohort's is a warning, not an error.** You may mean to run them
   together.
8. **The sidebar changes again.** The six-row sidebar you approved on Nov 22 is live. This keeps how it works and
   changes what is in it: the first four groups become single rows.

## 6. What a build needs (specified in `ADMIN-RESTRUCTURE-SPEC.md`, section 5)

For January to run at all, in this order:
1. The cohort's shape, start date and seats read from the cohort's own record, not from constants.
2. Each cohort's list of weeks and when each opens. Release reads that, not week numbers 0 to 8.
3. Sessions made from the cohort's rhythm, with ids that don't assume one cohort.
4. A purchase places a team in the cohort that is open, and each cohort has its own price in Stripe.
5. The welcome email and the reminders read the cohort's dates and words.
6. The learner portal shows a learner their own cohort's weeks, schedule and community.

Then the admin pages in this mockup. They also need:
- Enrolled, counted from who bought a seat (`cohort_enrollments` and the cohort's plans), not `users.cohort_id`.
- How each person got in, worked out from their plan or access group.
- Revenue totals across products from Stripe: paid invoices, and the remaining payments on two-payment orders.

## 7. Not checked, not done

- **Every dollar figure and count is made-up sample data.** They are consistent with each other, not with
  production, and no price in the mockup is your price.
- Checked by eye at 1440, 1280, 1024 and 390. Every button on the new pages was clicked by script: 768 clicks, no
  error. Seven could not be pressed by the script: the Resource Vault's Download buttons, which show on row hover
  in the signed-off reference. The January flow was run end to end. Not pixel-tested.
- After the approval, two changes: Cohort › Settings › Dates and release gained "Each week" (an Opens and a Due
  date per week, so a holiday break has an editor), and the file list's class became `.fls` so it no longer
  recolours the sidebar's icons.
- Seven of today's pages are still in the mockup's Screen list under "Today's pages, replaced", to compare.
- The mockup uses the admin's own signed-off design, not the website design system, because it is product UI.
- The repo's reference file has taken the sidebar since Nov 22 (D-239). The mockup is built from the earlier copy
  with the same sidebar, so the two match in look but not line for line.
