# LMS v3: implementation spec for Claude Code

**What this is.** The phased plan for wiring the mockup (app shell, week overview, Schedule, form drawer, branded
PDF, profile and GHL sync, **the Community, and Turn in**) into `connor-leiva/amplified-impact-lms`, so that
production matches the mockup pixel for pixel. The mockup is at revision **v6**; the folder keeps the name `lms-v3`.

**Audited against:** `main` @ `0ebeb971` (PR #218, D-224, Nov 20, 2026, 3:05 PM CT). If `main` has moved, redo
Phase 1's recon before trusting any path in §3.

**Package:** commit this folder as `handoff/lms-v3/` (beside `handoff/step-page-v6/`), without `node_modules` and
without the two built files `harness/public/app.js` and `app.css` (`npm run build` makes them; the rest of
`harness/public/` is source and stays).

---

## Approval, on the record

**Connor Leiva, Fri Nov 20, 2026**, asked whether the mockup is the approved design and the single source of truth:

> "100%, yes absolutely approved. Make sure that is stated EXPLICITLY in the MD file. These need to be pixel by pixel
> reproduced. I don't want a single thing varying from this design."

So, explicitly:

1. **The mockup is approved, in full, as the design of the learner side.** `handoff/lms-v3/mockup/index.html`
   (revision v6, sha256 `0383d010513f2f7af819ed1a780b25075079b9d2e274a5405a22bfc77ad1562f`).
2. **It is reproduced pixel by pixel.** Not "close", not "equivalent", not "in the spirit of". The gate is **zero
   different pixels** in every check (§8).
3. **Not a single thing varies.** No size, colour, radius, gap, font, word, punctuation mark, icon, order, state or
   timing. Nothing is added, nothing is left out, nothing is "improved".
4. **If something can't be reproduced exactly, you stop and ask.** You never ship an approximation and you never
   decide which difference is small enough not to matter. No difference is.
5. **Decisions D-225 to D-231 (§5) are approved** ("Approved on all"). You write the entries; you don't need to ask
   again.

**What the approval covers, exactly.** Connor approved revision v4 and answered the open questions in the same
message. Revision v5 is v4 plus those answers (each one is in §5.1), plus the two designs he asked for in that message:
**the top bar and the Schedule while a session is live**, and **locked weeks** (§4.B, B-35 to B-40). He has not yet
seen those two drawn. They are in the mockup and the tests like everything else, and they are built to the same
zero-pixel rule, but **their phases don't merge until Connor has looked at v5 and said yes** (entry D-232).

**Revision v6 (same evening)** is v5 plus three things Connor asked for after seeing it: "switch all the branding in
the LMS to the academy logos", "can we animate the sidebar collapse with motion", and "I don't like the mono font for
the weeks in the sidebar" (§4.B, B-41 to B-44). Which of the two academy lockups sits in the open sidebar is his to
confirm (Q-16).

**Scope and order (Connor, same message).** "Priority is all the learner side deploy." Not in this build, each one a
later pass of its own (§6, "Later"): dark mode, the account dropdown, the admin view of a form, the admin portal.
Run, Pause and Resume are not needed at all.

---

## 0. The contract. Read this before anything else.

1. **`handoff/lms-v3/mockup/index.html` is the design.** It is not a brief, a direction or an example. Every size,
   colour, radius, gap, word, state, DOM order and timing in it is the specification.
2. **You never write UI from your own reading of the design.** You do not look at the mockup and then write CSS or
   markup that "does the same thing". You **copy**: the generated stylesheets as they are, and the React components
   in `src/` converted from JSX to TSX with the same class names, ids, DOM order and attributes.
3. **The only UI work you author is wiring:** props from the repo's view-models into those components, event
   handlers into the repo's mutations and routes, and the non-visual attributes this repo requires (§2.3).
4. **A value changes in exactly one way:** the mockup changes (Connor approves it), `npm run build` regenerates the
   CSS, the tests re-run. You never edit `lms.css`, `lms.tokens.css` or a brand motion file by hand, and you never
   add an override stylesheet to make something fit.
5. **A piece the mockup doesn't draw is not yours to design.** §4.C lists every such piece found in the audit. For
   each one the rule is written down: keep today's component untouched, or stop and ask. You never restyle it "to
   match" and never delete it.
6. **A piece the mockup draws that the repo can't feed is a build item,** not a reason to drop it. §4.B lists them.
   If you find one that isn't listed, add it to `handoff/lms-v3/PLAN.md` under "Found while building" and tell
   Connor. Do not leave it out and do not fake its data.
7. **Done is measured, not judged.** A phase is done when its pixel gate passes (§8): **no different pixel** and the
   same screenshot size, in every listed state, at 1440×900 and 390×844, against the deployed build. You do not
   loosen a threshold, pass `--max-px`, mask a region, drop a state or re-capture a reference to get there.
8. **When the mockup and the repo's rules disagree, stop.** §5 lists the disagreements already found and the
   DECISIONS.md entry each needs. Connor approves entries; you don't write "approved" on his behalf.

**Stop and ask Connor when:** a pass would need a change to the mockup, the brand files, a test or a threshold; a
state or piece isn't in the mockup and isn't in §4.C; data the mockup needs doesn't exist and isn't in §4.B; a rule
in the repo's `CLAUDE.md` or `DECISIONS.md` forbids something here that §5 doesn't already name; anything would
write to the live GHL location or touch a real learner.

---

## 1. Source of truth, in order

| # | Source | Governs |
|---|---|---|
| 1 | `handoff/lms-v3/mockup/index.html` (+ `mockup/ai-motion.css`, `mockup/fonts/`) | Looks and behaviour of the shell, the week overview (`#week-0`), the Schedule (`#schedule`), the form drawer (opened from the kit row), the Community (`#community`, `#thread-2`, Start a thread) and Turn in (black bar › Turn in: the card on the week's page and the upload drawer) |
| 2 | `handoff/lms-v3/brand/` (Amplified Impact Motion v1) | Motion. Already in the repo, byte-identical, at `apps/web/src/components/motion/` with a checksum test |
| 3 | `handoff/lms-v3/src/` | The React port. It renders source 1 with 0 different pixels in 264 checks |
| 4 | `handoff/lms-v3/src/pdf/form-pdf.js`, `pdf/week-0-intake.sample.pdf` | A **placeholder** PDF. Connor is having the real one designed (Phase 7); this one is not built |
| 5 | `handoff/lms-v3/HANDOFF.md`, `UX-AUDIT.md`, this file | Descriptions. They never override 1 to 4 |
| 6 | The repo's `CLAUDE.md`, `DECISIONS.md`, `docs/` | Everything outside these four surfaces, and process (gates, flags, copy rules) |

After the audit the package itself was corrected in three places, so the mockup already carries them: the intake's
questions are the repo's own 22 (not placeholders); the top-right control is the **account** button (it was
mislabelled as a time-zone picker); and the landmarks this repo requires are in the markup.

**There is earlier, unmerged work on uploads and a community** (a patch written the same day, described in §3). Its
server side is the starting point for Phases 9 and 10. Its learner-facing screens are **not** the design: the mockup
is.

For the surfaces in this package, source 1 outranks the repo's `design-reference/` and `docs/design/learner-v2`.
That is a change to the repo's own order of truth: entry **D-225** (§5), approved Nov 20, 2026.

---

## 2. What you may and may not touch

### 2.1 Copy verbatim, never edit
| From the package | To the repo |
|---|---|
| `src/lms.tokens.css`, `src/lms.css` | `apps/web/src/routes/learn/lms-v3/` as **global** stylesheets (not CSS modules), loaded after `ai-motion.css`. Same treatment as `step-page.css` (D-210). |
| `src/components/icons.generated.js` | Same folder. The mockup's own sprite; exempt from the `ICONS` rule on these surfaces as the step page is (D-210 item 4). |
| `brand/logos/*.svg` (and the copies the page loads, `mockup/logos/`) | The repo's brand folders, `design-reference/brand/` and `apps/web/src/assets/brand/`, byte for byte: checksums in `brand/logos/SHA256SUMS`, checked by the same script that checks the other brand files. Four are Connor's uploads of Nov 20, 2026 (the academy lockup and the academy app lockup, each with its reversed twin); `favicon.svg` is the repo's own file, unchanged. Never redraw, recolour, crop or re-export one. |
| `src/forms/week-0-intake.json` › `ui` | The drawer's words. `intake` in that file is a copy of the repo's seed (`packages/core/seed/intake-v1.ts`) plus `required`; the live questions come from the database. |

### 2.2 Convert JSX → TSX and nothing else
`AppShell`, `CalMenu`, `FormDrawer` (+ `useForm`), `SchedulePage`, `WeekPage`, `Hero`, `StepList`, `Kit`, `Reference`,
`Icons`, `Community` (`CommunityPage`, `ThreadPage`, `StartThreadDrawer`), `TurnIn` (`TurnInDrawer`), `LockedWeekPage`, `session.js` (as `session.ts`). Add types. Do not rename a class, reorder an element, split or merge a component's markup, or "tidy" a
style. A unit test must assert, for each component, that its rendered HTML for the package's sample props equals
the HTML the package's own component renders (import both, render both, compare strings). That test is what
makes "converted, not rewritten" checkable.

### 2.3 Non-visual additions you are allowed to make
Already in the mockup, so nothing to add: `aside[aria-label="Primary"]`, the visually hidden
`nav[aria-label="Breadcrumb"]` in the header, `main#main`, `data-brand-slot` on the wordmark link,
`data-drawer="open"` on the open form drawer's host. Add only: `body[data-app-ready="true"]` (the existing
`useAppReady()`), `data-*` test hooks that draw nothing, and ARIA attributes whose absence fails axe. Each one is
listed in the PR.

### 2.4 Never
- Write or edit CSS for these surfaces by hand, or add a `*.module.css` for them.
- Use `Learn.module.css`, `Schedule.module.css`, `LearnerShell.module.css` or `Intake.module.css` classes inside a
  v3 component, or v3 classes inside an old one.
- Re-create a mockup behaviour with a different mechanism "because the repo already has one" where the result
  differs by a pixel or a millisecond. Use the repo's mechanism only when the gate still passes.
- Ship `MockBar.jsx`, `mock.generated.js`, `mock-bar.css`, `sample-data.js`, `src/data/*.samples.json` or the sample
  answers. They go to test
  fixtures only.
- Regenerate `compliance/goldens/` to absorb a difference. Goldens for retired screens are removed by a DECISIONS
  entry, not edited.

---

## 3. Audit: what the repo has today (`main` @ `0ebeb971`)

Stack: React 19 + Vite SPA (`apps/web`), Fastify + Postgres + drizzle (`apps/api`), pure domain code in
`packages/core` (`@ai/core`), pnpm workspace, Railway (`pnpm build` / `pnpm start`, no Dockerfile), GitHub Actions
(`quality`, `compliance`, `parity-learner`, `api`, among others). The learner portal v2 lives under `/learn` behind the build-time
flag `VITE_LEARNER_V2` (`routes/learn/flag.ts`, D-177), and a production build with that flag on fails unless CI's
`parity-learner` job passed on the commit (`apps/web/src/build/learner-parity-guard.ts`).

| Surface | Where it lives now | Notes that matter |
|---|---|---|
| Shell | `shell/learner/LearnerShell.tsx` (530 lines), `shell.vm.ts`, `useLearnerPrefs.ts`, `LearnerShell.module.css`; view-models `navVM`, `barVM`, `sideVM` in `routes/learn/learn.vm.ts` | Three sidebar forms by width (drawer < 768, automatic rail 768–1199, full or rail ≥ 1200 by preference, D-185). Phone nav is a modal dialog (D-181). Top bar: next build or live Join (`barVM`), `DemoControls` in fixture mode, the account `Menu` (Account, Team Hub, Theme light/dark, Sign out) whose trigger is the learner's initials, a staff "Previewing as" bar, the Team Plan window. With a v6 step route the shell draws no chrome (`v6StepAt`, D-210). |
| Week overview | `routes/learn/Week.tsx`, `Week.vm.ts`, `WeekContent.tsx`, `WeekContent.vm.ts`, `StartHere.tsx`, `Deploy.tsx`, `WeekDone.tsx`, `Live.tsx`, `parts.tsx` | Open and locked weeks. Start Here card (D-195), live strip (`WeekLive`), hero, step rows, Your Deployment card with Run dialog (D-186), kit rows, Build Kit with prompt modal, Downloads, content sections (`how`, `why`, `who`, tools, `homework`, `evidence`, `rubric`, `readiness`, `media`, sample output, seat card, playbook card, `graduation`, `after`), the one-time Week 0 done overlay (D-199). `WeekContent.sync.test.ts` requires every builder word to reach the page or be named (D-213). |
| Schedule | `routes/learn/Schedule.tsx`, `Schedule.vm.ts`, `Schedule.module.css` | Weeks view and Calendar view (`?view=calendar`, month grid + agenda). Hero with `JoinVM`. Week rows carry pill, session lines with past-session badges, a live Join strip, Watch Replay, locked state. "Add all" downloads `/calendar/schedule.ics`. |
| Intake | `routes/learn/Intake.tsx` (page at `/learn/week/0/intake`), `packages/core/src/intake.ts`, `apps/api/src/routes/intake.ts` (`GET`/`PUT /api/intake`), table `team_intake` (migration `0029`), builder card `routes/admin/IntakeCard.tsx`, seed `packages/core/seed/intake-v1.ts` (22 questions, 5 sections) | **One intake per team**, edited by Team Owner and Operations Lead. Autosave after 600 ms. Submit sets `submitted_at` and checks the step 1 item for every teammate. Kinds: `short`, `long`, `choice`, `multi`. No `required`. D-196: "Nothing is sent to GHL, Stripe or anywhere else." |
| Stack card | `routes/learn/Stack.tsx` (`/learn/week/0/stack`), `packages/core/src/stack.ts`, `apps/api/src/routes/stack.ts`, table `team_stack_card` (`0030`) | A different shape from the intake (rows of source, tool, who, green/yellow; an example dialog; Send Back). D-197. |
| How a form opens | `Step.vm.ts` lines 432–433: a checklist `form` action is a link to `learnIntake()` / `learnStack()`. A `download` action with kit file `intake-form` links to `/api/files/resource/intake-form` (the PDF). | Both paths exist in content. |
| Staff view | `routes/console/Workspace.tsx`: "View intake" prints `JSON.stringify(answers)` in a `<pre>`; API `GET /api/console/workspaces/:teamId/intake` (`readTeamIntake`, audited as `intake.read`) | No formatted view, no PDF, no sync status. |
| GHL | `apps/api/src/integrations/ghl.ts` (LeadConnector v2, private integration token, `upsertAndTag`, `setContactFields` with field ids from `GHL_FIELD_*`), jobs `ghl-sync.ts`, `ghl-extras.ts`, `ghl-logins.ts`, `ghl-orders.ts` (queue, backoff, `GHL_SYNC_ENABLED=false` pause) | Mature. Tags only accumulate; the upsert never carries tags; failures never block the row of record. The intake is not synced. |
| PDF | Nothing. No headless browser or PDF library in `apps/api/package.json`. | New. |
| Brand motion | `apps/web/src/components/motion/ai-motion.{css,tsx,d.ts}` + `ai-motion.test.ts` (sha256) | Identical to the package's. Use these; don't copy again. |
| Step page v6 | `routes/learn/step-page/`, `StepPage.tsx`, `handoff/step-page-v6/`, `compliance/step-page-v6/` | The precedent for everything here: global CSS verbatim, flag, gap rule, seeded test learner, reset hook. |
| Community | Nothing in the portal. Home shows an **outside** "Cohort Community" link when staff set one (`Home.vm.ts` `communityVM`, `intro.community`, D-187). | New. |
| Learner uploads | None. Staff upload to the bucket for the Vault and the Week Builder: `apps/api/src/storage.ts` (`presignPut`, `presignGet`, `checkUpload`, key helpers), `packages/core/src/uploads.ts` (`UPLOAD_POLICY`, 25 MB), `POST /api/files/upload-url`. A checklist action is `form`, `download`, `card` …; there is no `upload` (`course-types.ts` line 120). | New for learners. |
| **Unmerged patch: uploads and community** | Not on GitHub. It came to Connor as `claude-handoff-weeks-0-2/code/0001-uploads-and-community.patch` (+ a git bundle), branch `feature/uploads-and-community` off `b272b66f`. It adds: migrations `0032_submissions`, `0033_community_posts`; `packages/core/src/submissions.ts`, `community.ts` (+ tests); `apps/api/src/routes/submissions.ts` (`/api/submissions`, `/api/submissions/upload-url`, `/api/admin/submissions`), `routes/community.ts` (`/api/community`); the `upload` checklist action (`kind`: `live_read` or `checkpoint`) in the Week Builder; a panel inside the step's task (`step-page/Uploads.tsx`); `routes/learn/Community.tsx` + `Community.module.css`; `routes/admin/SubmissionsCard.tsx`; four artboards `docs/design/learner-v2/22`–`25`; DECISIONS entries it calls D-224 and D-225, both "Not yet approved". | **Checked against `0ebeb971`:** every file applies except `DECISIONS.md`. Its entry numbers collide (main's D-224 is PR #218; D-225 to D-229 are this spec's). Its migration numbers `0032` and `0033` are still free. |
| Tests that assert today's DOM | `LearnerShell.test.tsx`, `shell.vm.test.ts`, `Week*.test.*`, `WeekContent*.test.*`, `Schedule*.test.*`, `Intake.test.tsx`, `compliance/tests/e2e/learn-v2-*.spec.ts`, `compliance/parity/learner-parity.json` | They will fail by design once v3 draws. Each is updated or retired in the phase that replaces its screen, and listed in the PR. |

---

## 4. Gap register

### 4.A In the mockup and in the repo: swap the UI, keep the logic
| Piece | Keep (logic) | Replace (UI) |
|---|---|---|
| Nav links, hrefs, active state, cohort line | `navVM`, `sideVM` | `Sidebar` → `AppShell` |
| Sidebar collapse preference | `useLearnerPrefs` (`sidebar`) | the toggle → `#sh-collapse` |
| Next build in the top bar | `barVM` kind `next`, `saveIcs`, calendar link builders in `parts.tsx` (`CalLinks`) | `NextSession` + `BarCalLinks` → the strip with `CalMenu` |
| Week progress in the nav | `NavEmployeeVM.status` kinds `ring` and `built` | ring + "N of M", check |
| Schedule hero, groups, weeks, break | `scheduleVM`, `heroSession`, `joinVM` | `Hero`, `Weeks` → `SchedulePage` |
| Week header, hero, step rows, progress | `weekVM`, `weekRows`, `stepChecklistStatus` | `Head`, hero section, step links → `WeekPage` |
| Kit rows, system prompt, downloads | `kitRow`, `skillRow`, `buildKitVM`, `saveCsv` | `KitRows`, `BuildKit`, `Downloads` → `Kit` |
| Week content | `weekContentVM` sections | `WeekContent` → `Reference` accordions (mapping in §7.3) |
| Intake questions, answers, autosave, submit | `CourseIntake`, `cleanIntakeAnswers`, `mayEditIntake`, `/api/intake`, `team_intake` | `IntakePage` → `FormDrawer` |
| Mark deployed | `markDeployed` mutation | `DeployCard`'s button → hero and last row |
| Uploads to the bucket | `storage.ts` presigned PUT and GET, `uploads.ts` policy | (none today for learners) → `TurnInDrawer` |

### 4.B In the mockup, missing from the repo: BUILD THESE
Each is a tracked item. None may be dropped.

| ID | What the mockup has | What's missing | Where it goes |
|---|---|---|---|
| B-01 | "Weeks" nav row with its own icon, weeks nested under it on a guide line, week **numbers** instead of icon tiles | Markup/CSS only (in the package). Label `LABELS.employees` "AI employees" → "Weeks". | Phase 3 |
| B-02 | One marker that springs to the current nav item | In the package (`AppShell`). | Phase 3 |
| B-03 | Collapsed rail: numbers as chips in a tray under the Weeks icon | In the package. | Phase 3 |
| B-04 | Phone nav folds in place behind a **Menu** button | Replaces the modal drawer (D-181). Needs D-226. | Phase 3 |
| B-05 | **Add to calendar**: one menu (Calendar file, Google Calendar, Outlook) in the top bar and in the Schedule hero. **Add all to calendar** on the Schedule, and the add button on a locked week, are **plain buttons that download the calendar file**: no menu, no Google, no Outlook (Connor, Nov 20: "Remove from menu") | `CalMenu` is in the package. Google and Outlook links are built per session (they don't exist today). The two plain buttons are anchors to feeds that exist: `/calendar/schedule.ics` and the locked week's `sessions.add.ics`. | Phase 3, 4, 5 |
| B-06 | Top-bar strip hidden on the Schedule page | `hideNext` prop. | Phase 4 |
| B-07 | Schedule hero: Add to calendar until the join window, then **Join on Zoom**, then **Live now** / "Started N min ago"; when the session ends the hero moves to the next one, whatever its kind (for office hours: kicker "Office hours", second button "Open Week N"); countdown in **two units** ("11 days 21 hr", "3 hr 0 min", "9 min") | `HeroVM` gains `start` (ISO), `minutes`, `joinBefore`, the kind and the second button's words (`cta`). The modes are `session.ts › sessionMode`. | Phase 4 |
| B-08 | Week rows end in a **status**: bar + "N of M done", Deployed, **Live now** (one of the week's sessions is live), **Next**, **Upcoming**; Week 0's tile says **Due** + day | `WeekItemVM` gains the status fields, `live`, and the Due tile. | Phase 4 |
| B-09 | Step list **role filter** (All / Owner / Operator) with counts and a summary line | Steps carry free text `who`. Add `stepRoles(who)` to `@ai/core` (`"Owner"` → owner; `"Operator"` → operator; `"Owner and operator"`, `"Each of you"` → both; anything else → both, and the Week Builder warns), unit-tested. Settled: read the text (§5.1). | Phase 5 |
| B-10 | Per-role time is the **sum of that role's steps' minutes** | Today `StartHere.totals.owner/operator` are stored strings. Compute from `step.mins`; a step with `timeLabel` and no `mins` is a data fix in the builder, listed, not guessed. Decided by Connor, Nov 20. | Phase 5 |
| B-11 | Hero states: **Start step N** / **Continue step N** for the first step that isn't done; all done → **Mark as deployed**; Deployed → **Go to Week N+1** and Undo | View-model fields; `unmarkDeployed` for Undo (the repo can mark, not unmark). | Phase 5 |
| B-12 | Deployment as the list's last row ("N steps to go" → Ready → Deployed) | View-model field; markup in the package. | Phase 5 |
| B-13 | Kit grouped **Skills / Files / For your AI**, in step order; a skill and its zip on one row; Excel and CSV as two buttons on one row; Copy rolls to Copied | Grouping and ordering rule in `Week.vm.ts` (`kitGroups`), unit-tested against the sample data. An **Excel** download: confirm one exists; today's `saveCsv` writes CSV only. If not, B-13a: add it or ask. | Phase 5 |
| B-14 | Kit row for a form: one button (**Fill in** / **Continue** / **View**) and "N questions" / "N of M answered" / "Submitted Nov 20" | The kit item that is the intake (`intake-form` resource, or the week having `course.intake`) becomes a form row. | Phase 6 |
| B-15 | **Form drawer** replaces the intake page | `FormDrawer` + `useForm` in the package. `/learn/week/:week/intake` redirects to `/learn/week/:week?form=intake`, which opens the drawer. A step's `form` action opens the same drawer **in place on the step page** (mount the drawer there and load `lms.tokens.css` + `lms.css` on that route: every rule is scoped or prefixed); the button itself is the step page's and doesn't change. | Phase 6 |
| B-16 | **Required** questions: Submit refuses, the fields shake, a message shows, the foot counts what's missing | `IntakeQuestion` gains `required?: boolean` (core type, zod schema in `apps/api/src/routes/schemas.ts`, `IntakeCard` checkbox "Required", `intakeCopy`, sync test). The API's submit validates again and answers 422 with the missing ids. The six required are settled (§5.1). | Phase 6 |
| B-17 | Progress "N of M answered" in the drawer and on the kit row; "Saved 3:18 PM"; "Submitted Nov 20, 3:18 PM" | Derived from the answers and `updatedAt` / `submittedAt`. Times through `fmt.*` (repo rule), which must produce exactly the mockup's strings for a Central-time viewer; if `fmt` can't, stop. | Phase 6 |
| B-18 | **Download PDF**, any time, draft or submitted | `GET /api/intake/pdf` (learner, own team) and `GET /api/console/workspaces/:teamId/intake/pdf` (staff, audited as `intake.pdf`). The look and the engine wait for Connor's template (Phase 7, Q-14). | Phase 7 |
| B-19 | Answers on the learner's profile in the admin portal | The data is already there (`readTeamIntake`). A formatted view, sync status and the PDF button are **not designed**: §4.C-14. Build the API; hold the UI. | Phase 8 |
| B-20 | Answers synced to GHL | New job `apps/api/src/jobs/ghl-intake.ts` on the existing queue and client, tracked by new columns on `team_intake`. Reverses D-196's "never leave the portal" (D-229, approved). Fields: Appendix A. The operator is their own contact, related to the owner. Tag: `ai-intake-submitted`. | Phase 8 |
| B-21 | Breakpoints at 900 px (nav folds) and 640 px | The repo's are 768 and 1200, with an automatic rail between. The mockup has no automatic rail. Needs D-226. | Phase 3 |
| B-22 | A step with status `waiting` reads **"Waiting on step N"** on a quiet chip, with a dashed number. It is an ordinary step otherwise: it opens, and it is "Up next" when it is the first step not done | **Settled from the code** (Q-01): `waiting` means one of the step's boxes depends on another step (Week 0, step 5: `s5c-drive` waits on `step:6:s6-google`). The step row gains `waitsOn` = the other step's number, from `waitingOn()`. The repo's word for it today is "waiting"; the mockup's "Waiting on step N" replaces it on v3 weeks. | Phase 5 |

**Live sessions and locked weeks (v5; they merge after Connor has seen v5, D-232)**

| ID | What the mockup has | What's missing | Where it goes |
|---|---|---|---|
| B-35 | The top bar's strip has **three modes**: next (label, title, when, Add to calendar), **starting soon** (the join window is open: "Starting soon", the time, **Join on Zoom**) and **live now** (a "Live now" pill, "Started 1:00 PM CT", **Join on Zoom**). On every page but the Schedule | Today's `barVM` kind `live` (state `ready` / `live`, `title`, `started`, join) feeds it: `ready` → starting soon, `live` → live now. `shell.next` gains `time`, `start`, `minutes`, `joinBefore`, `where`, `joinHref`. This closes C-03. | Phase 3 |
| B-36 | The strip and the hero follow the **next session of any kind**: "Next live build" or "Next office hours" | A label per session kind in the view-model (the two the mockup has; a third kind is a gap: ask). | Phase 3, 4 |
| B-37 | A session's line in its week's row ends with its day until it starts, then **Live now**, then **Replay processing**, then a **Watch replay** link (a session with no replay: **Session ended**) | From the Schedule's session line (`badge`, `watch`). The link goes where today's Watch Replay goes. This closes part of C-13. | Phase 4 |
| B-38 | **Locked weeks in the nav**: a lock, a quieter label, an outlined number (also in the collapsed tray); the row links to the locked week's page | `shell.weeks[].locked` from the week row's `locked`. | Phase 3 |
| B-39 | The **locked week page**: breadcrumb; "Week N" with a Locked chip, the title, the week's outcome; a hero with "Opens …", the week's question, one calendar button ("Add to calendar" / "Add both to calendar" / "Add all to calendar") and the way back to the open week, beside "Opens in" and the countdown; then **Build it live**, a row per session | `LockedWeekPage` in the package, fed by today's `lockedWeek()` view-model (§7.7). It replaces today's `Locked` component on v3. This closes C-06. | Phase 5 |
| B-40 | Week 0's **Next week** link and the deployed hero's **Go to Week N+1** go to that week (its locked page while it is locked) | Hrefs from the pager. | Phase 5 |

**Brand, collapse motion, week numbers (v6)**

| ID | What the mockup has | What's missing | Where it goes |
|---|---|---|---|
| B-41 | **The academy logos in the shell.** Open sidebar and the phone's header: the "ai academy" **app lockup at 161×34** (the Brand Guide's sidebar size, as D-031 records it). Collapsed rail: the **favicon drawing at 28×28**, the file the repo already has. The link's name is "Amplified Impact Academy, Home". One `img` shows at a time; the link keeps `data-brand-slot` | `shell.logo` (§7.1). The app lockup files are **new drawings**: they replace the repo's older `amplified-impact-academy-app*.svg` (different checksums). `[data-logo="full"]` shows the full "amplified impact academy" lockup at 205×20 instead; it is there so Connor can compare (Q-16), and only one of the two ships. | Phase 3 |
| B-42 | **"Switch all the branding in the LMS to the academy logos"** (Connor, Nov 20). Outside the mockup's own pages the logo is drawn by one component, `shell/BrandSlot.tsx` | A **file and size swap, not a redesign**: `BrandSlot`'s `lockup` and `head` kinds show the academy app lockup (light and reversed) at 161×34, the size those places had before D-156; `mark` stays the favicon. That reaches every caller: the old learner shell and the admin shell (`AppShell.tsx`), `AcceptInvite.tsx`, `SkillGuide.tsx`, `WeekDone.tsx`, `Course.tsx` (four places). Also `admin/Wordmark.tsx` and its sidebar, the share and og-image builders (`site/share.ts`, `site/og-image.ts`), the tab title in `index.html` ("Amplified Impact" → "Amplified Impact Academy"), and any email that carries a logo. Update `compliance/tests/e2e/brand.spec.ts` (its letter colours become the new files' `#15211d` / `#f4f2ec`), the byte-identity check, and the goldens of each screen that changes, by entry D-233. If the taller logo breaks a layout on a page that isn't in the mockup, stop and show Connor: don't re-lay the page out. The www site's own logo (`kit/logo.ts`, the legal pages' signature) is **not** the LMS: leave it (Q-17). | Phase 3, then its own PR |
| B-43 | **The sidebar collapses and opens in motion.** Closing is one overlapping move: the column narrows over 380 ms on the system's curve; for the first 160 ms the labels fade and the rail's mark fades in over the lockup; then the layout becomes the rail and the icons and week numbers glide to their places (240 ms), arriving with the edge. Opening: the layout opens behind the edge, the icons and numbers glide back out (380 ms, no overshoot), the labels and lockup fade in, and the column springs open (560 ms, the brand's spring). The marker on the hairline steps out while the edge moves and fades back in. A second click mid-travel turns it round. Reduced motion and phones: instant | All in the package: `lms.css` section 15 and `AppShell` (`data-narrow`, `data-collapsed`, `data-anim`, the FLIP). Every duration and curve is a brand token; none is a number in the component. `defaultCollapsed` and `onCollapse(on)` connect it to `useLearnerPrefs`. The main column re-flows as the sidebar's width changes: that is intended. | Phase 3 |
| B-44 | **Week numbers in the text face.** The number chips in the sidebar, and the count beside "Weeks", are Geist 12 px with tabular figures, not Geist Mono | In the CSS. | Phase 3 |



**Turn in (uploads)**

| ID | What the mockup has | What's missing | Where it goes |
|---|---|---|---|
| B-23 | **Withdrawn.** There is no Turn in card on the week page (Connor, Nov 20: "In the button in the step, not on the week card") | Nothing to build. Don't add one. | n/a |
| B-24 | The **upload drawer**: drop zone or Choose files, a row per file with its own progress and a check when done, remove, the type and size rules with their error messages, a note, and for a checkpoint the minutes; **Turn it in** → Turned in | `TurnInDrawer` in the package. `upload(file, onProgress)` is the patch's presigned PUT, with real progress (`XMLHttpRequest.upload.onprogress`; `fetch` has none). | Phase 9 |
| B-25 | After turning in: "Turned in." with when and who, "Goes to Connor’s team. Nothing is emailed.", the files as downloads, the note, **Turn in a new version**. **No status.** The team never sees what staff did with it (Connor, Nov 20: "No status should be displayed telling them what I've done") | The patch's learner route returns each submission's `status`. **Take it out of the learner response** (`GET /api/submissions`), with a test that the word never reaches a learner. Staff keep it (C-20). | Phase 9 |
| B-26 | A teammate who isn't the owner or operator can't turn in: **no button, no drawer** | `mayEditIntake(role)`, as the patch has it (the API already refuses). In the button's place the step shows the patch's line, "Your team’s owner or operator turns this in." (`ui.agent`), in a text style the step page **already has**. If it has none that fits without new CSS, stop and ask: the step page is not in this mockup. | Phase 9 |
| B-27 | The **only way in** is the button on the step that asks for the file. It opens the drawer in place, on the step page | The step page's `upload` action (from the patch) renders with the step page v6's **existing** action button, unchanged; its label is `ui.turnIn` ("Turn in"), or `ui.view` ("View") once the team has turned something in. It opens `TurnInDrawer`. Replaces the patch's in-task panel (C-19). | Phase 9 |
| B-28 | The server side of uploads | **From the patch, as it is:** `0032_submissions`, `core/submissions.ts`, `routes/submissions.ts`, the Week Builder's Upload action, the authz, schema and copy-guard test updates. Re-run its tests on current `main`. | Phase 9 |

**Community**

| ID | What the mockup has | What's missing | Where it goes |
|---|---|---|---|
| B-29 | **Community** in the nav under Schedule, for a learner whose plan has the course (the Schedule's rule) | `navVM` gains the row (the patch adds it to `learn.vm.ts` and `LearnerShell.tsx`: take the view-model, not the markup); routes `/learn/community`, `/learn/community/:id`. | Phase 10 |
| B-30 | The **list**: space chips (All, General, one per open week, Wins), Pinned, Threads by newest activity, each row with avatar, title, who · team · space, the first lines, "2 replies · 3 hr ago"; How this works; the empty state | `CommunityPage` is in the package. `communityProps(...)` in a `.vm.ts`. The activity time ("3 hr ago", "1 day ago", "just now") through `fmt`: add a formatter that produces exactly these, unit-tested, if `fmt` has none. | Phase 10 |
| B-31 | A **thread**: first post, replies, Reply; Edit and Delete on your own posts with an in-place confirm; "edited"; About this thread | `ThreadPage` is in the package. No browser `confirm()`. | Phase 10 |
| B-32 | **Start a thread** in the drawer: space, title, details, the three validation messages, "Posting as …", Post thread → Posted → the new thread opens | `StartThreadDrawer` is in the package; the messages are the patch's `cleanThread` errors. | Phase 10 |
| B-33 | **Staff** in the same pages: the Staff tag, Pin / Unpin and Hide / Show thread in a staff-only card, Hide / Show and Delete on any reply, hidden threads and replies visible to staff with a Hidden tag | The patch's rules and audit. | Phase 10 |
| B-34 | The server side of the community | **From the patch, as it is:** `0033_community_posts`, `core/community.ts`, `routes/community.ts`, the 30-posts-an-hour guard, the tests. Nothing is emailed or notified. | Phase 10 |

### 4.C In the repo, not in the mockup: HOLD. Do not delete, do not restyle.
"Keep" means: the existing component, its module CSS and its behaviour stay exactly as they are and are rendered
where the table says. If a kept piece can't be placed without a layout decision, that row says STOP.

| ID | Piece in the repo | Rule until Connor decides |
|---|---|---|
| C-01 | Account menu contents (Account, Team Hub, Theme, Sign out) | **Keep** the existing `Menu`, opened by the mockup's account button (`.sh-acct`, initials + chevron). Its panel is not in the mockup: leave its styles alone. Mockup needed. |
| C-02 | Dark theme (D-185) | **Decided (Connor, Nov 20): not in this build.** v3 surfaces draw light whatever the learner's Theme setting says. Dark mode is its own later pass, by Claude Code, **after all of this has shipped and Connor has spent a day with it** (§6, "Later"). Don't start it, and don't make v3 CSS "dark-ready". |
| C-03 | Top bar while a session is joinable (`barVM` kind `live`) | **Drawn in v5: B-35.** |
| C-04 | `DemoControls` (fixture mode), the staff "Previewing as … / Exit Preview" bar, the Team Plan window, masquerade | **Keep**, rendered where they are today relative to the header and `main`. They never appear for the seeded learner, so the gate is unaffected. If one needs a layout choice, STOP. |
| C-05 | Vault locked in the nav ("opens …"), learners with no cohort (no Schedule, no weeks), Team Hub absent, non-course AI Employees in the group (`hire:<id>`, with a lock), week nav statuses `open` and `opens` | The Vault's lock, a learner with no cohort and a missing Team Hub: not drawn, **STOP** and ask for each one you meet. **Locked weeks are drawn** (B-38). The group is **Weeks** and lists the course's weeks only (Connor, Nov 20): a non-course AI Employee has no row in the v3 nav. If a real learner has one, list it in PLAN.md and tell Connor before Phase 3 merges. |
| C-06 | Locked week page (`LockedWeekVM`) | **Drawn in v5: B-39.** Today's `Locked` stays for learners without v3. |
| C-07 | Start Here card (D-195) | **Decided (Connor, Nov 20: "Yes, replace").** The mockup's header, hero and step list replace it on v3 weeks. Its `StartHere` content feeds the role filter, the times and the hero; name every stored word that no longer shows in the sync test. |
| C-08 | `WeekLive` strip on the week page | The mockup's week page has no such strip: the top bar carries a live session on every page (B-35). Not rendered on v3 weeks. Say so in the Phase 5 PR so Connor sees it. |
| C-09 | Your Deployment card beyond "mark deployed": runtime status, platform, Open, **Run** dialog, Pause, Resume, Reconnect, attention state | **Decided (Connor, Nov 20: "no run/pause/resume needed at all").** Not rendered on v3 weeks, and it no longer keeps a week off v3. Don't delete the code in these phases; it goes with the old shell in the cleanup PR (Phase 11, step 6) if Connor confirms then. |
| C-10 | Week 0 done overlay (`WeekDone`, D-199) | **Decided (Connor, Nov 20: "Yes, replace").** Retired on v3 weeks: the deployed hero plays the brand's completion motion instead. |
| C-11 | Prompt modal behind "View" on the system prompt | **Keep** the existing `PromptModal`. Not drawn; don't restyle. |
| C-12 | Week content the Reference doesn't draw: `why` (the note carries two sentences of it), `media`, sample output, seat card, playbook card, `graduation`, `after`, the pager | Week 0: mapped or left out as `UX-AUDIT.md` lists, each named in the sync test. Any other week that has one of them falls under the gap rule. |
| C-13 | Schedule: Calendar view, "attended live", "Recording Posted", a Join strip inside a week row | The **Calendar** view stays today's page, behind the toggle. Replay processing, Watch replay and Live now are drawn (B-37). "attended live", "Recording Posted" and a Join strip inside a row are **not** drawn: a row that needs one keeps the whole Schedule on today's page (4.D). List each case you meet. |
| C-14 | Staff view of an intake (`Workspace.tsx`, raw JSON) and of a stack card | **Wait (Connor, Nov 20: "Wait on admin view. Wait on the admin portal.").** Keep as is. Phase 8 adds API only. |
| C-15 | Stack card form (`/learn/week/0/stack`) | **Leave for now (Connor, Nov 20), noted for later:** it stays its own page, opened from the kit row as today. Moving it into the drawer is a later job with its own mockup. |
| C-16 | Glossary underlines and the term drawer (D-193), rich text (D-209) in week content | Follow the step page's precedent (D-210 item 3): where the mockup draws plain text, it is plain text. List every place this drops formatting. |
| C-18 | The patch's learner Community screens (`routes/learn/Community.tsx`, `Community.module.css`) and its artboards (`docs/design/learner-v2/22`–`25`) | **Do not merge them.** The mockup replaces them. Keep `Community.vm.ts`'s logic where §7.5 uses it. |
| C-19 | The patch's upload panel inside the step's task (`step-page/Uploads.tsx`, its additions to `step-page.more.css` and `step-page.phone.css`, the "Turned in … by …" line and file list in the task) | **Do not merge them.** The drawer replaces them (B-27). The step page's stylesheets stay as they are on `main`. |
| C-20 | The patch's staff **Submissions** card on the Week Builder (list, download, status: Received / Picked for a live read / Reviewed) | **Keep, as the patch built it.** The admin console has its own design system and isn't in this mockup. This is where what teams turn in reaches Connor. A fuller staff inbox needs an admin mockup. |
| C-21 | The outside Community link on Home (D-187) | **Keep** until Connor clears it in Course settings. |
| C-22 | Community and Turn in states the mockup doesn't draw: loading, failed to load, not a member, the hourly limit (429), a thread that's gone, an upload that fails part-way, a submit that fails, a week that has closed | Words: the patch's (`COMMUNITY.loadFailed`, `saveFailed`, `missing`, `notMember`; the submissions route's errors). Place: **only** in a slot the mockup already has for messages: under the field (`.fm-msg`), in the drawer's foot (`.fm-note`), or the list's empty slot (`.cm-empty`); the button returns to idle with the brand's error shake. No new element, no toast, no dialog. List each in the PR. Mockup needed for anything that doesn't fit one of those slots. |
| C-23 | Community features nobody has asked for: reactions, mentions, attachments, search, notifications, email digests, direct messages | **Don't add.** |
| C-24 | The account dropdown (what opens from the initials) | **Wait (Connor, Nov 20).** Same as C-01: today's `Menu`, untouched. |
| C-17 | `fmt.*` time rule: viewer's zone first, program zone in parentheses | Logic stays. The mockup shows a Central-time viewer. A viewer elsewhere gets `fmt`'s output in the same elements; that is content, not a layout change. |

### 4.D The gap rule (the step page's precedent, D-210 item 3)
Add `lms-v3/v3.ts` beside `step-page/v6.ts`:
- `v3On(me, flag)`: the build flag, or the seeded test learner.
- `v3WeekDraws(vm)`: true only when the week needs nothing in C-12 (C-06 is drawn now; C-08 and C-09 are retired on v3). Unit-tested with one case
  per excluded piece.
- `v3ScheduleDraws(vm)`: true only when no row needs anything in C-13.
- The shell asks the same functions, so chrome and page always agree.
A surface that fails its rule draws **today's** page. It never draws a v3 page with pieces missing, and it never
draws a hybrid.

---

## 5. Decisions, and Connor's answers

### 5.0 Decisions: approved Nov 20, 2026 ("Approved on all"). Write the entries.

| Entry | Says | Supersedes |
|---|---|---|
| **D-225** | `handoff/lms-v3/mockup/index.html` is the source of truth for the learner shell, the week overview, the locked week, the Schedule, the form drawer, the Community and Turn in; it outranks `design-reference/` and `docs/design/learner-v2` for those. It is reproduced pixel by pixel; nothing varies (Connor's words are at the top of this file: quote them in the entry). Global CSS verbatim, the mockup's own icon sprite, phone text under 16 px and the mockup's button heights on these surfaces (the step page's exemptions, D-210 item 4, extended). | CLAUDE.md "Sources of truth", D-156, D-211's button sizes where they differ |
| **D-226** | Shell: one breakpoint at 900 px; under it the nav folds in place behind Menu (no modal drawer, no automatic rail); the collapse toggle exists from 901 px up. Light only until the dark pass. | D-181, D-185 (sidebar forms, and the theme on v3 surfaces) |
| **D-227** | Shell and Schedule: one Add to calendar menu per session; **Add all to calendar is one plain button**; the strip is hidden on the Schedule; **"Weeks" replaces "AI employees"**; week numbers replace tiles; no status text for a week that hasn't started. Schedule rows show status, not step counts. | D-180, D-183 where they differ |
| **D-228** | Week overview v3: the structure in `UX-AUDIT.md`; role filter read from each step's `who` text; per-role time summed; deployment as the last row; Undo; kit groups; Reference accordions; "Waiting on step N"; **Start Here card, Week 0 done overlay, the `WeekLive` strip and Run / Pause / Resume retired on v3 weeks**. | D-184, D-195, D-199, D-213 (sync list), D-217, D-218 where they differ |
| **D-229** | Intake in a drawer; six required questions; a PDF; **answers sync to GHL**, the operator as their own contact related to the owner. | D-196 ("Nothing is sent to GHL") |
| **D-230** | Turn in: the `upload` action on a step opens the upload drawer (this mockup); submissions; **no card on the week page and no staff status shown to the team**; the staff Submissions card as the patch built it. | The patch's own entry (it calls it D-224; that number is taken) |
| **D-231** | The cohort Community: threads in spaces, staff tools, names and teams visible to the cohort, nothing emailed; the screens are this mockup's. | The patch's own entry (it calls it D-225; that number is taken), and its artboards 22–25 |
| **D-233** | The LMS carries the **academy** logos (Connor, Nov 20, 2026: "switch all the branding in the LMS to the academy logos"): the academy app lockup where the Amplified Impact wordmark was, at the Brand Guide's 161×34; the new drawings replace the older app-lockup files. Write it once Q-16 is answered. | D-156 |
| **D-232** | **Not yet approved: Connor has to see v5 first.** The top bar and the Schedule while a session is starting, live and over; locked weeks in the nav and the locked week page (B-35 to B-40). | D-180, D-183, D-217 where they differ |

When the patch's server code lands, its two DECISIONS entries are rewritten under these numbers, and every `D-224` /
`D-225` in its comments that means uploads or the community is renumbered with them.

### 5.1 Connor's answers (Nov 20, 2026). These are settled; don't ask again.

| Was | Question | Answer | What it changes |
|---|---|---|---|
| Q-01 | What does `waiting` mean on step 5? | "I honestly cant remember" → **settled from the code**: a box in step 5 waits on step 6's Google connection. | B-22: "Waiting on step 6". No "Coming soon" anywhere. |
| Q-02 | Is "Weeks" the right name for the nav group? | "Yes, week is the right name" · "AI employees is getting replaced with Weeks" | The group is Weeks and lists the course's weeks. A non-course AI Employee has no row in the v3 nav; if a real learner has one, list it in PLAN.md and tell Connor before Phase 3 merges (C-05). |
| Q-03 | Role filter: read the step's `who` text, or add checkboxes to the builder? | "Read the text" | B-09 as written. No builder change. |
| D-228 | Replace the Start Here card and the Week 0 done overlay? | "Yes, replace" | C-07, C-10. |
| Q-04 | Which intake questions are required? | "Go with what you made required" | The six in `src/forms/week-0-intake.json`: name, team, operator, ai, plan, google. |
| Q-07 | Add all to calendar: Google and Outlook? | "Remove from menu" | B-05: one plain button. |
| Q-08 | Dark mode? | "Have Claude Code build the dark mode, but as a separate pass after ALL of this ships first and I can spend a day with it" | C-02, and "Later" in §6. |
| (data) | Real titles and sessions for weeks 5 to 8? | "Not needed, Claude can see in the repo" | The mockup and the samples now carry the repo's own (`packages/core/seed/accelerator-v1.ts`). In the LMS they come from data, as every week does. |
| C-15 | Stack card? | "Leave for now but make note" | C-15. |
| Q-06 | PDF engine? | "Whatever the simplest option is, but do know that I'm having Claude design an editorial/branded PDF version that I want to be filled in upon download. So the look will change" | Phase 7 waits for that template. `form-pdf.js` is a placeholder. |
| Q-05 | GHL: send answers? Does Spring need to approve? | "Yes to GHL, Spring doesn't need to approve." | Phase 8 is unblocked. |
| Q-05 | Who creates the custom fields? | "We'll need to have Claude in Chrome create them" | Appendix A is the list to create. Connor runs that; you don't write to GHL's settings. |
| Q-05 | Does the operator become a contact? | "Yes, own contact but added as relationship to Owner" | Phase 8, step 3. |
| Q-05 | Which tag on submit? | "Yes, you decide" | `ai-intake-submitted` (the repo's `ai-…` convention). |
| Q-10 | Where does Turn in live? | "In the button in the step, not on the week card" | B-23 withdrawn, B-27. |
| Q-10 | May a team see its submission's status? | "No status should be displayed telling them what I've done" | B-25. |
| Q-11 | Where does Connor read what teams turn in? | "In the admin portal" | C-20: the patch's Submissions card, as built. A wider inbox waits with the admin portal. |
| Q-12 | Names and teams visible to the cohort, Staff tag? | "Yes, that's fine" | B-30 to B-33 as drawn. |
| Q-12 | Email on a reply? | "No" | Nothing is emailed. |
| (scope) | What still needs drawing? | "Top Bar and Schedule while live, no run/pause/resume needed at all. Wait on dark mode Wait on account dropdown Design locked weeks Wait on admin view. Wait on the admin portal. Priority is all the learner side deploy" | B-35 to B-40 drawn in v5; C-02, C-09, C-14, C-24. |

### 5.2 Still open

| ID | Question | Blocks |
|---|---|---|
| **Q-13** | Connor looks at v5's two new designs (live sessions; locked weeks) and says yes or asks for changes. | Merging the parts of Phases 3, 4 and 5 that carry B-35 to B-40 |
| **Q-14** | The PDF template: when does it arrive, and in what form (a PDF with form fields, or HTML and CSS)? | Phase 7, and through it the release (Phase 6's Download PDF button is in the approved design) |
| **Q-15** | New words in v5 that Connor hasn't read: "Waiting on step 6", "Starting soon", "Replay processing", "Watch replay", "Session ended", "Next office hours", "Open Week 1", "Back to Week 0", "Opens in". | Nothing, unless he changes one: then the mockup changes first |
| **Q-16** | Which academy lockup sits in the open sidebar: the **"ai academy" app lockup** at 161×34 (the mockup's default, and the Brand Guide's rule for an LMS sidebar) or the **full "amplified impact academy" lockup** at 205×20? The black bar's Logo buttons show both. | B-41, B-42, D-233 |
| **Q-17** | "All the branding in the LMS": does that include the admin console (assumed yes: it is the same component), emails, and the www pages served from this repo (assumed no)? | B-42 |
| **Q-09** | Other pages inside the new shell (Home, Skill library, a skill, Account, Team, Vault, an AI Employee) keep their own layouts. A screenshot of each inside the v3 shell goes to Connor at the Phase 3 gate. | Phase 11 |

---

## 6. Phases

Every phase: its own branch off the previous, small commits, one PR, **not merged by you**. Every PR carries the
gate output, the list of tests updated or retired and why, every §2.3 addition, and every "Found while building"
item. Nothing reaches a learner until Phase 11.

### Phase 0. Baseline (no repo changes)
1. In `handoff/lms-v3/`: `npm i && npm run build && npm run diff`. **264 / 264 with no different pixel**
   (about 20 minutes; `HANDOFF.md` §3 shows how to run it in four parts). `npm run pdf` reproduces
   `pdf/week-0-intake.sample.pdf` (same text via `pdftotext`, same page count).
2. Record Chrome's version. If the baseline isn't 0 %, fix the environment, not the package.
3. Run the repo's own `pnpm lint && pnpm typecheck && pnpm test` on `main` and record the result, so later failures
   are attributable.

**Gate:** the three results in `PLAN.md`.

### Phase 1. Recon and plan (no code)
Write `handoff/lms-v3/PLAN.md`:
1. Confirm or correct every row of §3 against the current `main`.
2. For each prop in §7, the exact expression that produces it, or "MISSING → B-xx".
3. Every test and golden that asserts today's DOM for these screens, with its fate: updated in phase N, or retired.
4. For Week 0 in the **production** content (read-only, through the builder's export or a staff preview): which of
   C-06 to C-13 it actually uses. This decides whether Week 0 passes `v3WeekDraws` today.
5. The DECISIONS entries (§5.0) as drafts, and anything in §5.1 that the repo contradicts.
6. The patch (§3): apply it to a scratch branch off the current `main` (not the working branch), run its own tests,
   and record what passes. That tells Phases 9 and 10 what they can take as it is.

**Gate:** Connor answers the questions and approves D-225. **Stop here until he does.**

### Phase 2. Scaffolding, flag, package in the repo
1. Commit `handoff/lms-v3/` (no `node_modules`, no `harness/public/`).
2. `apps/web/src/routes/learn/lms-v3/`: the two stylesheets and the sprite (verbatim), `v3.ts` (§4.D) with
   `VITE_LMS_V3`: **off unless `'true'`**, and always on for the seeded test learner (`Learner.test`, D-200/D-202).
3. A checksum test: `lms.css`, `lms.tokens.css` and `icons.generated.js` in the repo hash to the package's.
   Scoped lint and type-floor exemptions for these global files, recorded in D-225. No edits to the files.
4. `compliance/lms-v3/`: `prepare.ts` (writes Week 0, the schedule and the intake exactly as the package's sample
   data has them, on a **development** database only), `reset.sql` (the test learner back to: step 1 done, step 3
   in progress, step 5 waiting, not deployed, intake = the package's draft sample, no submissions, the community
   holding exactly the package's five sample threads, sidebar expanded, light theme),
   reusing `compliance/step-page-v6/signin.mjs` and `reset-hook.mjs`. `reset.sql` refuses any account but the test
   learner. Fixture people and words are the package's: the made-up Northline Realty (Alex Morgan) and the skills'
   Sample Team. Never a real customer's name, team or file.

**Gate:** `pnpm lint && pnpm typecheck && pnpm test` green; with the flag off, `pnpm compliance`, `pnpm e2e`,
`pnpm e2e:learn` and `pnpm parity:learner` unchanged from Phase 0.

### Phase 3. Shell
1. `AppShell.tsx`, `CalMenu.tsx`, `Icons.tsx` (TSX conversions) + the HTML-equality test (§2.2).
2. `shellProps(nav, side, bar, me, prefs)` in a `.vm.ts` with unit tests: the mapping in §7.1.
3. `LearnerShell.tsx`: when `v3On`, render `AppShell` in place of `Sidebar`, the header and the phone drawer.
   Everything in C-04 stays mounted where it is. Collapse writes `useLearnerPrefs`. The account button opens the
   existing `Menu` (C-01). `main#main` wraps the `Outlet`. The v6 step route still draws chrome-free.
4. B-01 to B-06, B-21, B-41, B-43, B-44; then B-35, B-36, B-38 (they merge after Q-13). B-42 (the logo everywhere else)
   is its own PR after this one.
5. The brand files: copy `brand/logos/*.svg` to both brand folders, extend the byte-identity check, and have Vite
   inline them as `BrandSlot` does today (no request, CSP `img-src 'self' data:`).

**Gate:** pixel gate (§8) for the shell states: `nav-*`, `top-*` (35 states, 49 checks; the live ones need a target seeded for that moment, §8), target = the week route and the
Schedule route with **today's** page bodies replaced only if their phases have landed; until then run with
`--selector '[data-ai="shell"]'`. Plus a screenshot of every other `/learn` page inside the new shell, attached
for Connor (Q-09). axe: zero serious or critical.

The pixel gate checks where the collapse **lands** (closed, open again, turned round early and late in the travel,
with the Weeks group shut). It can't check the travel itself: a frame's timing isn't repeatable. So also capture it
slowed down, the way the package was checked: set the four `--aim-dur-*` tokens it uses to 8× on both pages, take a
frame at 40, 120, 180, 240, 320 and 420 ms of the collapse and at 40, 120, 240, 380, 500 and 640 ms of the expand,
and attach the two strips side by side to the PR. In the rail the mark is centred (x 17.5 to 45.5 of the 63 px rail).

### Phase 4. Schedule
1. `SchedulePage.tsx` + equality test. `scheduleProps(vm, now)` with unit tests: §7.2.
2. B-07, B-08, B-37 in `Schedule.vm.ts`. `v3ScheduleDraws`. Add all to calendar is an anchor (B-05).
3. `Schedule.tsx`: when `v3On` and `v3ScheduleDraws`, render `SchedulePage`; `?view=calendar` renders today's
   Calendar (C-13).

**Gate:** pixel gate, `sched-*` states (24 states, 35 checks), whole page, shell included. The clock is pinned by the test;
the countdown and the join state must come from the browser's clock.

### Phase 5. Week overview
1. `WeekPage.tsx`, `LockedWeekPage.tsx`, `Hero`, `StepList`, `Kit`, `Reference` + equality tests. `weekProps(...)` with unit tests: §7.3.
2. B-09 to B-13, B-22, B-40 in `@ai/core` and `Week.vm.ts`; `unmarkDeployed` end to end.
3. `Week.tsx`: when `v3On` and `v3WeekDraws`, render `WeekPage`; when `v3On` and the week is locked, render
   `LockedWeekPage` (B-39, §7.7; merges after Q-13). Otherwise today's page.
4. `WeekContent.sync.test.ts`: every builder word reaches the v3 page or is named with its reason (C-07 to C-10, C-12).

**Gate:** pixel gate, the week states (21 states, 31 checks) with `--assume s1`; then with seeded learners for
`s7`, `s8`, `deployed`; and the locked week, `lk-*` (17 states, 27 checks; `--target-locked` is locked Week 1, and the
seeded learner has only Week 0 open). Mark as deployed and Undo by hand on the test learner; record what happened and the audit
rows.

### Phase 6. Form drawer
1. `FormDrawer.tsx` (+ `useForm`) + equality test.
2. `required` end to end (B-16). `PUT /api/intake` unchanged for saves; submit validates.
3. Week page: the form row (B-14) and the drawer, mounted once per page. `onSave` and `onSubmit` call `/api/intake`.
   Staff preview and masquerade write nothing, as today.
4. Routes (B-15): the old intake address redirects; a step's `form` action opens the drawer in place on the step it
   belongs to. `Intake.tsx` is retired when the flag is on for everyone (Phase 11), not before.
5. Team behaviour: the intake is one per team. Two people editing at once: last save wins today; keep that, and
   say so in the PR.

**Gate:** pixel gate, `form-*` states (23 states, 41 checks). On a deployed target only open, scroll, hover, focus
and close run (9 states); 5 more need learners whose intake is empty or submitted (`--assume-form`); the 9 that
type, choose or submit run only against the local http build with the reset hook. By hand on
the test learner: type, see Saved, reload (answers are back), submit with one missing, submit complete, edit
after submit.

### Phase 7. PDF
**Waits for the template (Q-14).** Connor is having an editorial, branded PDF designed, to be **filled in with the
team's answers on download**. Its look replaces `pdf/week-0-intake.sample.pdf`. So:
1. **Don't build from `src/pdf/form-pdf.js`.** It and the sample PDF are placeholders that show what goes in (every
   question, every answer, who, when, draft or submitted). They are not the look.
2. When the template arrives, take **the simplest engine that fills it exactly** (Connor: "Whatever the simplest
   option is"). If it is a PDF with form fields, fill the fields on the server with a pure JavaScript library (no
   browser on the host, so nothing changes on Railway). If it arrives as HTML and CSS, it needs a headless browser on
   the host: that is a bigger change, so stop and tell Connor before adding one.
3. The two routes (B-18): `GET /api/intake/pdf` (the learner's own team) and the console's. File name
   "Week 0 Intake - <Team>.pdf". `onDownloadPdf` in the drawer.
4. The template is a design like any other: you fill it, you don't restyle it. Long answers must not be cut off; if
   the template has no rule for an answer that overflows its box, stop and ask.

**Gate:** your PDF for the sample answers (`src/forms/week-0-intake.samples.json`) against the designer's filled
example, both rendered to PNG at 110 dpi with `pdftoppm`: no different pixel per page, same page count.

**This is on the release's critical path.** The drawer's Download PDF button is part of the approved design, so the
form drawer can't reach learners with a button that does nothing. If everything else is ready first, ask Connor:
hold the release, or ship the placeholder look for now (which needs the headless browser of step 2).

### Phase 8. Profile and GHL
1. Migration (the next free number: `0034` if the patch's `0032` and `0033` land first): `team_intake` gains `ghl_sync_status` (`none`/`pending`/`synced`/`failed`), `ghl_synced_at`,
   `ghl_attempts`, `ghl_error`, `ghl_next_at`. Submit, and any save after submit, sets `pending`.
2. `jobs/ghl-intake.ts` on the existing scheduler: claim due rows, find the contact (the Team Owner's stored GHL
   contact, else upsert by email with no tags), `setContactFields` for the ids present in `GHL_FIELD_INTAKE_*`
   (Appendix A; a missing id is skipped and reported, as D-134 does), then the tag **`ai-intake-submitted`** through
   `upsertAndTag`'s union. One minute's quiet after the last edit before a row is due. Backoff and pause as
   `ghl-sync.ts`.
3. **The operator is their own contact, related to the owner** (Connor: "own contact but added as relationship to
   Owner"). Name and email come from the operator's LMS account when they have accepted their invite; otherwise from
   the intake's `operator-name` answer only if it holds a valid email (if not, skip and report, never guess). Upsert
   that contact with no tags, then relate the two contacts through HighLevel's Associations API: one
   contact-to-contact association defined once for the location (`POST /associations/`, for example key
   `team_owner_operator`, labels "Team owner" and "Operator"), then one relation per team
   (`POST /associations/relations`, scope `associations/relation.write`). **Read the current API reference before
   writing this; don't trust this paragraph for request shapes.** If the location's token can't hold that scope, or
   the API can't relate two contacts there, stop and tell Connor. When the intake's operator answer is "I am" (the
   owner is the operator), there is no second contact.
4. **Dry run first:** `GHL_INTAKE_DRY_RUN` (default on) logs the payload with values redacted to their lengths and
   writes nothing. Connor sees one real payload shape and turns it off. Never from a preview build, never from a
   test, never for the test learner.
5. Console API: the intake read gains the sync fields; `POST …/intake/sync` re-queues (permission as
   `workspaces.read` + a write role; audited). **No console UI** (C-14).
6. Privacy: an operator's name and email are another person's. They go to that operator's own contact and nowhere
   else: not into a field on the owner's contact, not into a log.

**Gate:** unit tests for payload building, due logic and failure paths with the GHL client mocked; a dry-run log
pasted in the PR; the profile row shows `synced` after a real run only once Connor has approved it.

### Phase 9. Turn in
1. Server: from the patch (B-28), on a branch off the current `main`. Take `0032_submissions`, `core/submissions.ts`
   and its test, `routes/submissions.ts` and its test, the Week Builder's Upload action (`WeekBuilder.tsx`,
   `WeekBuilder.vm.ts`, `course-types.ts`, `course-rules.ts`, `schemas.ts`, `Step.vm.ts`), `SubmissionsCard.tsx`
   (C-20), and the governance test updates. From `step-page/` take only what carries the `upload` action through
   the view-model and types (`StepPage.vm.ts`, `types.ts`, the route's wiring). **Leave out** `step-page/Uploads.tsx`,
   the panel's markup in `step-page/Checklist.tsx` and `Checklist.tsx`, and every change to `step-page.more.css` and
   `step-page.phone.css` (C-19).
2. **Take `status` out of what a learner is sent** (B-25): `GET /api/submissions` returns no status field, and a test
   proves it. The staff routes and the Submissions card keep it.
3. `TurnIn.tsx` (TSX conversion) + the HTML-equality test. `turnInProps` (§7.6).
4. Step page: the `upload` action's button opens the drawer in place (B-27); an agent has no button (B-26). **Nothing
   on the week page** (B-23).
5. `upload()` with real progress (B-24). One real upload to the preview's bucket: the patch never proved the
   browser's PUT against Railway (its local bucket had no CORS).

**Gate:** pixel gate, `ti-*` states (14 states, 27 checks). On a deployed target the drawer is compared on its own
(the step page around it is the step page's own design): `--target-turnin <the step's url> --turnin-button <the
button's selector> --assume-turnin report | checkpoint | turned`, each with a learner seeded for it; the 5 states that
only open, hover and view run there. The 9 that upload or turn in run only against the local http build, where
`upload` is the package's played upload (`window.__holdUploads` holds it at 42 % for the in-progress check). By hand
on the test learner: turn in a PDF and an HTML report, see them on the staff Submissions card, change the status as
staff and confirm **nothing changes for the team**, turn in a new version, try a `.zip` and a file over 25 MB, and
open the step as an agent.

### Phase 10. Community
1. Server: from the patch (B-34): `0033_community_posts`, `core/community.ts` and its test, `routes/community.ts`
   and its test, `Community.vm.ts` and its test, the route registrations and the nav view-model. **Leave out**
   `Community.tsx`, `Community.module.css` and `docs/design/learner-v2/22`–`25` (C-18).
2. `Community.tsx` (TSX conversion of the package's `Community.jsx`) + the HTML-equality test. `communityProps`
   and `threadProps` (§7.5).
3. Routes and the nav row (B-29). Staff see the same pages with the staff tools (B-33).
4. C-22's states, each in the slot named there.

**Gate:** pixel gate, `cm-*` and `th-*` states (29 states, 54 checks). On a deployed target: the list, the three
space filters, the compose drawer opened, and the sample thread (`--target-community`, `--target-thread`), with the
community seeded as `compliance/lms-v3/prepare.ts` writes it; staff checks with `--assume-as cl` and a staff session.
The checks that post, edit, delete, pin or hide run only against the local http build with the reset hook. By hand,
as the test learner and as staff: post, reply, edit, delete, pin, hide, and confirm no email or notification left
the system (the email log is empty for those minutes).

### Phase 11. Acceptance and rollout
1. Deployed **preview** with `VITE_LEARNER_V2=true`, `VITE_LMS_V3=true`, Week 0 and the schedule entered to match
   the mockup's words (`compliance/lms-v3/prepare.ts` is the reference): the full pixel gate, the 264 checks'
   deployed subset plus the local-only subset against the local http build. **No different pixel in any of them.**
2. `diff/piece-review.mjs` and `diff/motion-review.mjs` as `PROMPT.md` Phase 3 B and C describe (extended to the Community and Turn in pieces), both first proven
   on harness vs mockup (all 0) and proven to catch a 1 px and a 10 ms change.
3. `parity-learner` updated so the guard attests the v3 screens, by a DECISIONS entry, not by editing results.
4. Production: the flag stays off; the seeded test learner sees v3 in production. Run the deployed subset of the
   gate **against production as that learner** (read-only states only; no reset command ever runs against the
   production database, so put the learner in the starting state through the UI). Attach the report.
5. Connor turns the flag on. After the deploy, run step 4 again. That report is the proof that prod matches.
6. Only then: retire `Intake.tsx`, the old shell pieces, their module CSS, tests and goldens, in a separate PR.

### Later. Not in this build; each starts only when Connor says so.
- **Dark mode.** A separate pass by Claude Code, after everything above is live and Connor has used it for a day.
  It starts from a dark version of the mockup that Connor approves, then goes through the same zero-pixel gate. Until
  then v3 is light only (C-02).
- **The account dropdown** (C-24), **the admin view of a form and of what teams turn in** (C-14, C-20), **the admin
  portal.** Each waits for its own mockup.
- **The Stack card in the drawer** (C-15).

---

## 7. Mapping: the repo's view-models → the package's props

### 7.1 `AppShell` ← `navVM`, `sideVM`, `barVM`
| Prop | From |
|---|---|
| `shell.homeHref`, `helpHref` | `nav.home.href`, `nav.help.href` |
| `shell.logo` | `label` = "Amplified Impact Academy, Home"; `app`, `full`, `mark` = the three files' URLs (inlined `data:` URIs, as `BrandSlot` builds them); `use` = `'app'` (or `'full'`, by Q-16). Dark mode later adds the reversed files. |
| `shell.cohort[2]` | `side.cohortLine` split as the mockup splits it. If the stored line can't produce two lines by rule, add the two parts to `sideVM`; don't split by string surgery in the component. |
| `shell.nav[]` | Home, Schedule (when `nav.cohort`), Skill library, Team Hub (when `side.teamHub`), Resource vault, in that order; `id` for the active match |
| `shell.weeksLabel`, `weeks[]` | "Weeks"; `nav.employees.rows` with `week !== null`: `n` = week, `title` = `label`, `href`, `id`, `status` from `ring` → `progress` (+ `done`, `total`), `built` → `done`, else `idle`; `locked` from the row's `locked` (B-38) |
| `shell.next` | `bar.kind === 'next'`: `label` ("Next live build" / "Next office hours" by the session's kind), `title`, `when`, `calendar[]` = .ics (`saveIcs(bar.ics)`), Google, Outlook. `bar.kind === 'live'`: the same session with `mode` = `'join'` for state `ready`, `'live'` for state `live`; `time` = `fmt.time(start)`, `where`, `joinHref` = the existing `join(sessionId)`. Pass `mode` from the view-model, or pass `start`, `minutes`, `joinBefore` and let `session.ts › sessionMode` work it out from `now`: one or the other, the same in the shell and the Schedule. `null` for `none`. |
| `shell.account` | `initials` = `fmt.initials(name)`, `aria` = `LABELS.account`, `onClick` toggles the existing `Menu` |
| `shell.here` | the hidden breadcrumb's current page, as today |
| `defaultCollapsed`, `onCollapse(on)` | the stored choice from `useLearnerPrefs`; writing it back (B-43) |
| `current`, `hideNext`, `now` | the active nav id (a locked week's own id on its page); true on `/learn/schedule`; the shell's `useNow(15_000)` |

### 7.2 `SchedulePage` ← `scheduleVM`
| Prop | From |
|---|---|
| `sub`, `title` | `vm.lede`, `vm.weeks.heading` |
| `calendarHref`, `calendarAllHref` | `vm.views` (calendar item); `vm.addAll`'s .ics (a plain download, B-05) |
| `next.*` | `vm.hero`: `tile` → `day`/`date`; `eyebrow` parts → `week`, `kind`; `title`; `meta` parts → `when`, `length`, `where`; `start` (ISO) and `joinBefore` from the session and D-183's 15 minutes; `joinHref` → the existing `join(sessionId)`; `weekHref` = `hero.see.href`; `cta` = "See what you’ll build" for a build, "Open Week N" otherwise; `minutes` |
| `groups[]` | `vm.weeks.groups`: `label`, `note` = `meta`; week item → `week`, `title`, `href`, `tile`, `outcome` = `line` (the outcome sentence only), `sessions[]` from `lines` (`dot` → icon `radio` for build, `users` otherwise; name; date), `status`/`done`/`total` from the week row, `next` on the week of `heroSession`, `live` when one of its sessions is live; each session's `state` (`live` / `processing` / `replay` / `ended`, B-37) and `replayHref`; break item → `break`, `text` |

`now` is the shell's `useNow(15_000)`.

### 7.3 `WeekPage` ← `weekVM`, `weekContentVM`, `buildKitVM`
| Prop | From |
|---|---|
| `n`, `title`, `open`, `question`, `purpose`, `crumbs[]`, `tags[]` | `vm.week`, `vm.title`, `vm.pill`, `content.question`, `vm.lede`, `crumbsVM`, `content.meta` (pace, who, due through `fmt`) |
| `steps[]` | `r.steps`: `n`, `title` = `stepTitle`, `href` = `learnStep`, `role` = `step.who`, `who` = `stepRoles(step.who)` (B-09), `time` = `timeLabel` or `duration(mins)`, `minutes` = `mins`, `doneWhen` = `step.doneWhen`, `status` = `stepChecklistStatus` |
| `roles[]` | computed: counts and minutes per role (B-10); the three summary sentences are the mockup's templates |
| `deployed`, `deployedWhen`, `platform` | the module's deployment state; the acceptance line and platform words from the week's content |
| `kit[]` | B-13: Skills (`skillRow`, with zip from the build kit's files), Files (`kitRow`; the intake as a form row, B-14), For your AI (`buildKitVM.prompt`: View → `PromptModal`, Copy) |
| `steps[].waitsOn` | `waitingOn()`: the number of the step a waiting step depends on (B-22) |
| `note`, `supportEmail`, `libraryHref`, `next` | instructor's two sentences (from `why`), `helpVM`, the Library route, the pager's next week |
| `reference[]` | `content.sections` by id, into the mockup's seven accordions: **How the program works** ← `how`; **Owner and operator** ← `who` (roles, time); **What done looks like** ← `homework`; **Evidence packet** ← `evidence`; **Rubric** ← `rubric`; **Readiness** ← `readiness`; **Tools** ← tools. Parts map to `ul`, `dl`, `scale`, `fine` as `src/sample-data.js` shows for the same content. |
| `onDeploy(on)` | `markDeployed` / `unmarkDeployed` |

Accordion titles and every other label are the mockup's words. Where the builder's own title differs ("How It
Works"), the mockup's title is the label on the page and the builder's stays the stored value; name it in the sync
test.

### 7.4 `useForm` ← `/api/intake`
| Prop | From |
|---|---|
| `form.intake` | `course.payload…weeks[w].intake` (with `required`) |
| `form.ui` | the package's `ui` strings, as constants in the `.vm.ts` |
| `initial` | `GET /api/intake`: `status` = `submittedAt ? 'submitted' : answers has any ? 'draft' : 'new'`; `savedLabel`, `submittedShort` through `fmt` |
| `onSave` / `onSubmit` | `PUT /api/intake` with `{ answers, submit }`, answers through `cleanIntakeAnswers` |
| `onDownloadPdf` | `GET /api/intake/pdf` |

---

### 7.5 `CommunityPage`, `ThreadPage`, `StartThreadDrawer` ← `/api/community`
| Prop | From |
|---|---|
| `ui` | the package's words (`src/data/community.samples.json` › `ui`), as constants. They start from the patch's `COMMUNITY` words; where the two differ (the title hint, the third How this works line, `posted`), the mockup's win. |
| `spaces[]` | the patch's `spacesFor(open weeks)`: General, "Week N · Title" per open week, Wins |
| `people` | each post's author: `name`, `team` (staff: "Amplified Impact"), `initials` (`initialsOf`), `staff` |
| `threads[]` (list) | the API's list for the chosen space: `id`, `href`, `space`, `title`, `pinned`, `hidden`, `activity` (B-30), `replies` (what this viewer can see), `excerpt` (`excerptOf`), `by` |
| `thread` | one thread with the posts this viewer may see: `when` through `fmt`, `edited`, `hidden` |
| `me`, `staff` | the viewer's id; whether they are staff |
| `onReply`, `onEdit`, `onDelete`, `onHidePost`, `onPin`, `onHideThread`, `onPost` | the patch's routes. Each returns a promise; the page draws what the next read returns. |

### 7.6 `TurnInDrawer` ← the step's `upload` action and `/api/submissions`
| Prop | From |
|---|---|
| `ui` | the package's words (`src/data/turn-in.samples.json` › `ui`). Kind titles are the patch's `SUBMISSION_KIND_LABEL`. `ui.turnIn` and `ui.view` are the step button's two labels; `ui.agent` is the agent's line (B-26). |
| `asks[]` | one per kind the week collects: `id` = `kind`, `step` = the step whose checklist item carries the `upload` action, `kicker` = "Week N · Step M" |
| `subs` | the team's latest submission per kind: `files[]` (`name`, `size` formatted as the package's `bytes()`, `href` = the download route), `note`, `minutes`, `by`, `when` through `fmt`. **No status** (B-25). |
| `can` | `mayEditIntake(role)` |
| `askId`, `onClose` | which ask the step's button opened; closing |
| `upload(file, onProgress)` | `POST /api/submissions/upload-url`, then the PUT with progress |
| `onSubmit(askId, { files, note, minutes })` | `POST /api/submissions` |

### 7.7 `LockedWeekPage` ← `lockedWeek()` (`Week.vm.ts`)
| Prop | From |
|---|---|
| `n`, `title`, `outcome`, `crumbs[]` | the week's number, `vm.title`, `vm.lede`, `crumbsVM` |
| `opens`, `opensAt` | the date and time in `vm.pk` ("Opens Wed, Dec 9 · …", without the " · Week N" tail), through `fmt`; the same moment as ISO, for the countdown |
| `question` | `vm.headline` (the week's question unless the builder set a headline). The mockup has no slot for `vm.line` or for a second question: if a locked week has either, stop and ask. |
| `sessions[]` | `vm.sessions.rows`: `title`, `kind` ("Live build" / "Office hours"), `when`, `tile` = the day and date |
| `calendarHref` | `vm.sessions.add.ics`; the button's words come from the number of sessions (`session.ts › addLabel`, the repo's own rule) |
| `back` | "Back to Week N" and the href of the learner's current open week |

## 8. The pixel gate

`handoff/lms-v3/diff/pixel-diff.mjs`, unchanged. It opens the target and the mockup in the same Chrome, pins the
clock (Fri Nov 20, 2026, 3:18 PM CT), drives both to the same state, and compares with pixelmatch (threshold 0.1,
anti-aliasing ignored). Pass: **no different pixel in any check, and the same size**. (Zero is the bar because
anything else hides real misses: at 0.1 % a full page passed with every icon missing, and at 25 pixels a missing
status dot passed. `--max-px N` exists to measure how far off a page is, never to accept it.)

The states around a live session (`top-soon`, `top-live`, `sched-live`, `sched-ended`, `sched-nextday`, …) use four
fixed moments: Dec 2, 2026 at 12:51 PM CT (9 minutes before the first build), 1:12 PM (live), 3:00 PM (just ended),
and Dec 3 at 10:00 AM (the next day, replay ready). The mockup stands still at each. For the target the test pins the
browser's clock to the same moment and you pass `--assume-clock soon | live | ended | nextday` to say **the data is
seeded for that moment** (the week opened, the session marked live, the replay posted). Those run against the local
http build and the preview, with fixtures. Never against production.

```sh
# local http build, both flags on, served by the API on one origin (as compliance/step-page-v6/README.md does)
node compliance/step-page-v6/signin.mjs http://127.0.0.1:4300 auth.json
cd handoff/lms-v3
export V6_RESET_CMD="psql $DATABASE_URL -v email=$SEED_TEST_MEMBER_EMAIL -f ../../compliance/lms-v3/reset.sql"
node --import ../../compliance/step-page-v6/reset-hook.mjs diff/pixel-diff.mjs \
  --target http://127.0.0.1:4300/learn/week/0 --target-schedule http://127.0.0.1:4300/learn/schedule \
  --target-community http://127.0.0.1:4300/learn/community --target-thread http://127.0.0.1:4300/learn/community/<id of sample thread 2> \\
  --target-locked http://127.0.0.1:4300/learn/week/1 \\
  --storage-state ../../auth.json                      # in parts: --viewports phone-390 --match '^(cm|th|ti)-' --tag p2
```
- Seeded learner state: `compliance/lms-v3/reset.sql` (Phase 2). Other states: `--assume s7 | s8 | deployed`,
  `--assume-form new | submitted`, `--assume-clock soon | live | ended | nextday`, `--assume-logo full`, `--assume-as cl` (a staff
  session), each with its own seeded account or fixture. The Turn in drawer: `--target-turnin <step url>
  --turnin-button <selector> --assume-turnin report | checkpoint | turned` (only the drawer is compared).
- Staged rollout: `--selector '[data-ai="shell"]'`, `'[data-ai="schedule"]'`, `'[data-ai="week"]'`,
  `'[data-ai="community"]'`, `'[data-ai="thread"]'`, `'[data-ai="locked"]'`; a drawer alone: `'.aim-drawer__panel'`.
- On a failure: open `results/<state>-{target,reference,diff}.png`, find the cause in the **wiring or the data**,
  fix that. If the cause is the copied CSS or a converted component, your copy isn't a copy: diff it against the
  package.
- A difference that comes from live content (a word, a date, a session) is not a code bug. List it; fix the data in
  the builder or ask.
- The test never clicks Mark as deployed, a calendar item or Join on a deployed page, and never types into or
  submits a form, uploads a file, turns anything in, or posts, edits, deletes, pins or hides in the community there.

---

## 9. What "done" looks like, per PR

```
Phase N: <name>
Pixel gate: <checks> / <checks> with no different pixel, same sizes, Chrome <version>, target <url>
Repo gates: lint ✓ typecheck ✓ test ✓ compliance ✓ e2e ✓ e2e:learn ✓ parity:learner ✓ (or the exact failures)
Copied verbatim: <files + sha256>
Converted: <components> — HTML-equality tests ✓
Wiring added: <files>
§2.3 additions: <list, or none>
Tests updated / retired: <file — why>
4.B items closed: <ids>      4.C items touched: <ids — kept as is>
Found while building: <list, or none>
Questions for Connor: <list, or none>
```

---

## Appendix A. GHL custom fields for the intake (for Connor's Claude in Chrome session to create)

Connor: "We'll need to have Claude in Chrome create them." This is the list. Create them on **Contact**, in one
folder named "AI Accelerator Intake", in the live location, then give Claude Code each field's **id** to put in the
environment variable beside it. Nobody building this spec creates, renames or deletes a field in GHL.

The field name and key are suggestions (change them freely: only the id matters to the code). The type is not a
suggestion: a choice is stored as its words in a text field, so adding an option in the Week Builder later never
breaks the sync.

| Question id | Field name | Suggested key | Type | Env var for the field's id |
|---|---|---|---|---|
| `name` | AI Intake · Your name and email | `ai_intake_name` | Single line text | `GHL_FIELD_INTAKE_NAME` |
| `team` | AI Intake · Your team's name and brokerage | `ai_intake_team` | Single line text | `GHL_FIELD_INTAKE_TEAM` |
| `size` | AI Intake · Team size (how many agents and staff today) | `ai_intake_size` | Single line text | `GHL_FIELD_INTAKE_SIZE` |
| `lead-desk` | AI Intake · Who leads your lead desk? | `ai_intake_lead_desk` | Single line text | `GHL_FIELD_INTAKE_LEAD_DESK` |
| `cadence` | AI Intake · Your weekly meeting cadence (meetings, day and time, who runs each) | `ai_intake_cadence` | Multi-line text | `GHL_FIELD_INTAKE_CADENCE` |
| `one-on-ones` | AI Intake · Do you hold 1:1s with your agents? | `ai_intake_one_on_ones` | Multi-line text | `GHL_FIELD_INTAKE_ONE_ON_ONES` |
| `operator` | AI Intake · Who is your operator? | `ai_intake_operator` | Single line text (the chosen option’s words) | `GHL_FIELD_INTAKE_OPERATOR` |
| `operator-name` | AI Intake · Their name and email | `ai_intake_operator_name` | Single line text | `GHL_FIELD_INTAKE_OPERATOR_NAME` |
| `invited` | AI Intake · Have you invited them in the portal yet? | `ai_intake_invited` | Single line text (the chosen option’s words) | `GHL_FIELD_INTAKE_INVITED` |
| `ai` | AI Intake · Which AI will your team use for the course? | `ai_intake_ai` | Single line text (the chosen option’s words) | `GHL_FIELD_INTAKE_AI` |
| `plan` | AI Intake · Which plan are you on, or will you be on by Monday, November 30? | `ai_intake_plan` | Single line text (the chosen option’s words) | `GHL_FIELD_INTAKE_PLAN` |
| `account` | AI Intake · Whose AI account runs your hires? | `ai_intake_account` | Single line text (the chosen option’s words) | `GHL_FIELD_INTAKE_ACCOUNT` |
| `chatgpt-admin` | AI Intake · On ChatGPT only: does that person have admin access to your ChatGPT workspace? | `ai_intake_chatgpt_admin` | Single line text (the chosen option’s words) | `GHL_FIELD_INTAKE_CHATGPT_ADMIN` |
| `books` | AI Intake · Your accounting system | `ai_intake_books` | Single line text (the chosen option’s words) | `GHL_FIELD_INTAKE_BOOKS` |
| `books-close` | AI Intake · Who owns your accounting and reports, and what day do your books usually close each month? | `ai_intake_books_close` | Multi-line text | `GHL_FIELD_INTAKE_BOOKS_CLOSE` |
| `sisu` | AI Intake · Do you use Sisu? | `ai_intake_sisu` | Multi-line text | `GHL_FIELD_INTAKE_SISU` |
| `crm` | AI Intake · Your CRM | `ai_intake_crm` | Multi-line text | `GHL_FIELD_INTAKE_CRM` |
| `google` | AI Intake · Email, calendar and files: is your team on Google Workspace? | `ai_intake_google` | Single line text (the chosen option’s words) | `GHL_FIELD_INTAKE_GOOGLE` |
| `google-other` | AI Intake · If you are not on Google, what do you use? | `ai_intake_google_other` | Single line text | `GHL_FIELD_INTAKE_GOOGLE_OTHER` |
| `tasks` | AI Intake · Where your tasks live | `ai_intake_tasks` | Multi-line text | `GHL_FIELD_INTAKE_TASKS` |
| `problems` | AI Intake · Three recurring problems you'd like off your plate | `ai_intake_problems` | Multi-line text | `GHL_FIELD_INTAKE_PROBLEMS` |
| `access` | AI Intake · Known access restrictions | `ai_intake_access` | Multi-line text | `GHL_FIELD_INTAKE_ACCESS` |
| (set by the sync) | AI Intake · Submitted on | `ai_intake_submitted_on` | Date | `GHL_FIELD_INTAKE_SUBMITTED_ON` |

Also needed once, in the same session or by the code on first run (Phase 8, step 3): a contact-to-contact
association for "Team owner" ↔ "Operator". And the tag `ai-intake-submitted` (tags are created on first use).

Rules the sync follows: an answer longer than the field allows is cut at the limit with "…" and the full answer stays
in the LMS; an empty answer clears the field; a field whose id is not configured is skipped and reported by name.

