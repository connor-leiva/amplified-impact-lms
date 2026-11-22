# What the new LMS features do to the admin portal

Audit of `connor-leiva/amplified-impact-lms` at `main` @ `0ebeb97` (unchanged since the last audit; no Claude Code
branch has been pushed yet), Nov 20, 2026; the Community page added Nov 21. Mockup: "Admin portal: Community,
Forms & Submissions, intake responses, Turned in and GHL".

**Re-checked Nov 22 against `main` @ `e57c34d`:** the learner side, Phases 0 to 10, is merged (PRs #225 to #231).
Nothing below has been built in the admin yet. The two admin pieces now in the build are the Community page (R-3)
and the sidebar (R-4).

**This is a mockup to react to, not yet a build spec.** With one exception, nothing here is in
`IMPLEMENTATION-SPEC.md`'s phases. When you have approved a direction, it gets the same treatment the learner side
got: a spec, and a test against the mockup.

**The exception is the Community page.** It is in the spec now (B-45, R-3), because without it nobody at
Amplified Impact can read or answer what the cohort posts. You approved it on Nov 21 ("looks great").

## 1. How the admin portal is built today

- **One design, already signed off: "Admin redesign R2"** (D-160). Its source of truth is a single file,
  `design-reference/admin-redesign-r2/AdminRedesign.jsx`, with reference screenshots beside it and its own parity
  test (`compliance/admin-r2.config.ts`). The live screens are in `apps/web/src/routes/admin/` and
  `routes/console/`, drawn with the `components/r2/` kit (Card, Table, Tabs, Status, Button, Modal).
- **So the new mockup is that file, extended.** I did not draw an admin look of my own. The new screens use its
  components and its stylesheet; I added a few lines of CSS for layouts it didn't have (a question-and-answer
  list, a file list, a post in a thread). The source is in `admin-mockup/` (`new-screens.jsx` and
  `community-screens.jsx` are everything that is new).
- **The nav** has six groups: Health, Build, Support, Revenue, Operations, Access. The mockup adds **two rows under Support: Forms &
  Submissions** (Connor, Nov 20) **and Community** (Connor, Nov 21). Forms & Submissions holds the cohort added up;
  one team's answers and files stay on tabs in Learners & Teams and on the team's Workspace.
- **Logo.** The admin sidebar carries the academy lockup (Connor, Nov 20: "Keep it").
  **In the rail it is the same lockup cut to its "ai"** (Connor, Nov 21), not the green favicon tile. The learner
  sidebar does the same, in motion.
- **The cohort switcher shows the program's own logo** (Connor, Nov 21), not "AA" initials. It is the Accelerator's
  tile from the repo's `apps/web/src/home/program-logo.ts` (the four program logos you designed: Accelerator, Team
  Plan, Agent Plan, Insiders), at 32 px, the smallest a tile may be. The other three tiles are in `logos/` too, for
  when the switcher lists another program.

## 2. Where each feature lands

| Feature | Today in the admin | In the mockup | Needs |
|---|---|---|---|
| **Intake: the cohort added up** | Nothing. | **Forms & Submissions › Intake** (new sidebar row). How many teams have submitted; **To sort out before Wed, Dec 2** (each flag, how many teams, which ones); tallies for AI, plan, operator, Google, Sisu and CRM; and **Read one question across the cohort**: pick any question, read every team's answer down the page. Export CSV. | A new read for staff: every team's intake for the cohort. The data is all in `team_intake` already. |
| **Intake: every team, one row each** | Nothing. | **Learners & Teams › Intake.** Status (Submitted, Draft, Not started) and when, how many of 22 answered, the operator, the AI and plan, what that team has to sort out, and whether GHL has it. Filter by status and by flag. | The same read. |
| **Intake: one team's answers** | Workspace page › an "Intake" card with a **View intake** button that prints raw JSON. | **Workspace › Intake** tab. Who submitted and when, then the answers under the form's own section headings, in the team's words. Missing required answers are flagged on a draft. **Download PDF.** Read-only. | The read exists (`api.teamIntake`). It needs the form's questions beside the answers, and the PDF route (spec Phase 7). |
| **GHL sync** | Operations › Integrations, API & Webhooks and Scheduled Jobs show the purchase sync and its failures. | **A GHL card beside a team's answers:** Synced, Pending or Failed; when; the owner's contact; the operator's contact and that it is related to the owner; the tag; **Sync again** or **Retry now**, with GHL's error in the existing wording. The cohort table has a GHL column. | Spec Phase 8, which already has the sync fields and the re-queue route. |
| **Turn in: the cohort added up** | Nothing. | **Forms & Submissions › Turned in.** A row per thing a week asks for: how many of the teams have turned it in, how many you haven't looked at, picked and reviewed, and who hasn't sent it yet. | The patch's staff routes, counted per ask. |
| **Turn in: everything teams send** | Nothing. (The unmerged patch puts a Submissions card on each week in the Week Builder.) | **Learners & Teams › Turned in.** A row per submission: team and who sent it, what and which step, the files, the note, when, and a status only staff see (Received, Picked for a live read, Reviewed). Filter by week, kind and status. Download files. | The patch's staff routes (`/api/admin/submissions`), plus a list across weeks. |
| **Turn in: one team's** | Nothing. | **Workspace › Turned in** tab: each submission with its files, minutes, note and the status. | Same. |
| **Community** | Nothing in the admin. In `main` since Nov 21 a staff member can open the learner Community in the new frame and moderate there (D-231). | **Support › Community** (new sidebar row). **The list:** how many threads, how many are **waiting on you** (the last word is a member's, not staff's), pinned, hidden, and the cohort's size; tabs for each; find a thread; filter by space; pin or hide from the row. **Start a thread** posts to the cohort as staff. **A thread:** every post, with hidden ones marked; **Reply as staff**; Pin to the top; Hide from the cohort; Hide or Delete any post (Delete asks first). The cohort sees your posts with the Staff tag. Nothing is emailed. | The Community API in `main` already answers a staff sign-in. Two small additions: which threads are waiting, and the member count. Spec B-45, R-3. |
| **Week Builder** | A Week 0 Intake card that edits questions. No uploads. | **"Week Builder: what changes"**: a **Required** switch per question (the four that drive personalization are locked on); a **Turn in** card showing which checklist boxes ask for a file; a **Submissions** card that opens the inbox. | Required: the builder side of spec item B-16, which the learner spec didn't draw. The other two: the patch. |

## 3. Affected, but not drawn

| Area | What changes | Why I didn't draw it |
|---|---|---|
| **Cohorts & Sessions** | Nothing new to do. But what you already do here now shows up on the learner side: a session's Zoom link and start time drive "Starting soon" and "Live now"; a session that has ended with no replay shows learners "Replay processing"; **Attach replay** turns that into "Watch replay". | The screen already exists and works. Worth knowing: until you attach a replay, every learner sees "Replay processing". |
| **Locked weeks** | A week opens when its live build starts. That comes from the session calendar you already manage. | No new control. |
| **Course settings** | The outside community link (D-187) is still there. Once the built-in Community is live you can clear it, or keep both. There is no on/off for the built-in Community: it is on for everyone whose course is open. | Nothing to draw unless you want a switch. |
| **Scheduled Jobs, Integrations** | A new row for the intake sync job; the GHL card's failure count includes it. | Existing tables gain a row. |
| **Audit Log** | New entries: an intake PDF downloaded by staff, a GHL sync re-queued, a submission's status changed, a community post hidden, pinned or deleted. | Existing table gains rows. |
| **Roles & Permissions** | **Decided (Connor, Nov 20): every admin** can read a team's answers and download their files. No new permission. The write actions (re-sync to GHL, change a submission's status) are gated the way the admin gates everything else. | Nothing to draw. |
| **Masquerade** | Writes are blocked while masquerading, so staff can't submit an intake or turn in a file as a learner. | Existing rule; it already covers the new actions if they go through the same guard. |

## 4. What Connor decided (Nov 20), and what is still open

- **A sidebar row, Forms & Submissions,** for the added-up views, *and* the tabs on Learners & Teams for one team at a
  time. Done in the mockup.
- **Flags.** Six now: no operator named, operator not invited, not on a paid plan yet, not on Google, **not on Sisu,
  not on FUB.**
- **Every admin may read answers and download files.**
- **The academy logo stays** in the admin.
- **Community (Nov 21): a page inside the admin portal** ("Option 1 please."). An earlier version of this note said
  staff moderate inside the learner portal, and I then said a staff sign-in can't open it. Checked against the repo on
  Nov 22: Claude Code built exactly that door (a staff member opens the learner Community in the new frame, D-231),
  so it works today. The admin page is still what you chose; the door stays until the page is live (spec Q-20).
  **The page is approved** ("looks great"). Anyone on staff who can work on an account may post and moderate; every
  admin may read ("you assumed correctly").

**One thing to know about the two new flags.** Operator, plan and Google are choices in the form, so those flags are
exact. "Do you use Sisu?" and "Your CRM." are written answers, so the mockup reads them by rule: an answer that
starts with "No" is not on Sisu; an answer that doesn't name Follow Up Boss or FUB is not on FUB. A team that writes
"We're moving off it next month" would be read as on Sisu. To make both flags exact, change those two questions to
choices in the Week Builder (Sisu: Yes / No; CRM: Follow Up Boss / Something else, with a line for which). That is a
change to the form's questions, so it is yours to make; the learner drawer already draws choices.

Still open:
1. **Turned in statuses.** Received, Picked for a live read, Reviewed, seen by staff only. Enough, or do you want a
   place for your own notes on a submission?
2. **Export CSV** of all intakes: wanted, or is the PDF per team plus GHL enough?


## 5. The sidebar: six rows, one open (proposed Nov 21, approved Nov 22)

Connor: the live sidebar is "really overwhelming … everything listed out like that." Today it shows 26 pages under
six headings, every page with its own icon at the same weight, and it scrolls. The black bar's **Sidebar: today / proposed** switch shows both.

**Proposed: six rows, one open.**
- **A group is a row** with its own icon (Health, Build, Support, Revenue, Operations, Access). Closed, the whole
  nav is six rows and never scrolls.
- **One group is open at a time: the one you are in.** Click another group to look inside it; the first one closes.
  Go to a page and its group is the open one.
- **Pages inside a group are plain words** on a guide line under the group's icon, the way the learner sidebar draws
  its Weeks. No icon per page: that takes about 20 icons off the screen.
- **A closed group still says when it needs you:** Build "6 draft", Support "3 waiting" (Community threads waiting
  on staff; this count is new), Revenue "2 requests", Operations "1 incident" in red. Nothing to do, nothing shown.
- **You always know where you are.** Open, the current page is tinted. If you close the group you are in, its row
  takes the tint.
- **Unchanged:** the six groups and what is in them, the rail (it already shows one icon per group with a fly-out),
  the phone menu (same pattern), and Search or jump (⌘K) for going straight to any page.

**The collapse travels (Connor, Nov 22), the same move as the learner sidebar, on the brand's own timings.**
Closing: the column narrows over 380 ms and the logo's window closes to "ai" with it; the words fade in the first
160 ms; then the program tile, the six group icons, the collapse button and your avatar glide to their places in the
rail and arrive with the edge. Opening: they glide back out, the words fade in, and the column springs open
(560 ms). Only a click on the button travels: a window resize, the phone menu and reduced motion switch at once. A
second click part-way turns it round. In today's nav the two layouts share no icon, so there the rail's icons fade
in instead of gliding.

**Against the idea of closing everything, always:** it works for the eye but costs a click on every move, and with
the group you are in shut too, the sidebar stops telling you where you are. Keeping your own group open fixes both.

**Not drawn, worth a later look:** Health holds only two pages. Overview could be a row of its own at the top and
System Health could move into Operations, which would leave five groups. That changes the signed-off R2 grouping
(D-160), so it is your call.

**Approved (Connor, Nov 22: "Much much better!").** The build spec is `ADMIN-SIDEBAR-SPEC.md` in this folder; it is
R-4 in `IMPLEMENTATION-SPEC.md`, decision D-236.

## 6. Files

- The mockup (an artifact): open it and use the **Screen** list in the black bar; the new screens are first.
- `admin-mockup.zip`: the source. `new-screens.jsx` and `community-screens.jsx` are the new code; `build_admin.py` shows every edit made to the
  repo's `AdminRedesign.jsx` (which itself is untouched in the repo).
