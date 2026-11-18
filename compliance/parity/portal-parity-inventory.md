# Learner portal feature-parity inventory

**Built:** Wed Nov 18, 2026, about 9:40 AM CT. It's an independent read of the code, not of Claude Code's notes.

**What was compared:**
- **OLD** is `main` @ `e5f5dd2`, the learner portal in production today.
- **NEW** is the top of the stack:
  - **#172** `claude/learner-pr10-flip` @ `81db30d` ("the new learner portal for every learner, old screens retired", opened 8:33 AM CT today, draft). It contains #161 to #171 (#171 = `claude/learner-pr9-phone` @ `c9d2989`).
- I read the code read-only from a public clone on the box. I pushed nothing and commented nothing.

**Paths:**
- OLD paths are relative to the repo at `main`. NEW paths are at `pr10` (#172).
- Line numbers are from those commits.
- `web/` means `apps/web/src/`, `api/` means `apps/api/src/`, and `core/` means `packages/core/src/`.

**Status key:**
- **KEPT**: the new screens do the same job (the new file is cited).
- **MISSING**: today's portal does it and nothing in the new screens does.
- **CHANGED**: it still exists, but works differently in a way a learner would notice.
- **N/A**: prototype or demo only, or not reachable in production.
- **unverified**: I couldn't prove it from the code; the reason is given.

> **Important context.** #171 (PR 9) keeps the flag (`web/routes/learn/flag.ts`, `VITE_LEARNER_V2`, build-time, off by default) and still routes every old screen. **#172 removes the flag entirely**:
> - It deletes `flag.ts`.
> - It deletes the old Dashboard, EmployeeDetail and HlsEngine, Sessions, TeamTier, the old shell nav (`navModel.ts`) and Breadcrumbs.
> - It redirects every old learner URL to `/learn` (`web/routes/learn/redirects.tsx`).
>
> Merging #172 *is* the flip, and there's no variable to flip back. Every MISSING item below becomes live the moment #172 deploys.

---

## Top section: every MISSING / CHANGED item, ranked by learner impact

| # | Item (plain words) | Status | Who it hits | Inventory IDs |
|---|---|---|---|---|
| 1 | **Utah Life agents get a different portal.** <br>• Today they sign in to the standalone Skill Library page: a "Welcome, Utah Life" panel, an "Included with your Utah Life access" line, and per-skill Download and Setup Guide buttons on the list. <br>• After #172 they land in the new learner shell: a sidebar, a new Home at `/`, a new card-style library with search and filter chips, a new Account page, and no welcome panel or included line. <br>• This breaks the standing rule "Don't change what Utah Life agents see." | CHANGED | Utah Life (and every no-course learner: Agent Plan, Team Plan, Insiders) | U-1 to U-7 |
| 2 | **Replays can't be watched anywhere.** <br>• Gone: the player, captions, the searchable transcript, chapter rail, resume-where-you-left-off, speed control, and per-step "Watch at 12:30". <br>• The replay-ready email's "Watch Replay", the Sessions list's "Watch Replay" and the post-cohort "Rewatch Any Session" all land on pages with no video. | MISSING (known 1, wider than reported) | Accelerator | E-1 to E-8, S-4, D-6, M-3 |
| 3 | **Join opens late, and only in two places.** <br>• Today Join is live 15 minutes before start, on the Dashboard session card, the Sessions list and the week page. <br>• New: Join shows only after the start time, only in the top bar and Home hero. The Schedule and week pages have no Join. <br>• The 1-hour email's "Join Session" lands on a Schedule with no Join. | MISSING (known 2) | Accelerator | D-2, S-2, E-9, M-2 |
| 4 | **In-app announcements aren't shown.** Gone: the banner, its action button ("Update Calendar" / "Open Sessions") and Dismiss. Emailed announcements still go out. | MISSING (known 3) | Everyone with a portal | D-1, C-6 |
| 5 | **Console Go Live / End Session don't change learner screens.** "Live" now follows clock time only, so an early Go Live or an early End doesn't show. | MISSING (known 4) | Accelerator | C-1, C-2 |
| 6 | **Most of each week's written content is no longer shown to learners.** <br>• These fields are still in the data and still edited in the curriculum builder, but no learner screen renders them: <br>&nbsp;&nbsp;– live-build agenda, lesson, exercise, required outcome, advanced option, owner approval, "working at the end of class" <br>&nbsp;&nbsp;– office-hours format and outputs <br>&nbsp;&nbsp;– homework (by week's end, assignment, checkpoint/acceptance, "adopted means") <br>&nbsp;&nbsp;– why it matters, who does what (owner/operator), time this week <br>&nbsp;&nbsp;– materials, media, rubric, evidence packet, readiness, issue form <br>&nbsp;&nbsp;– How It Works, previous/next week <br>&nbsp;&nbsp;– the new seat card and playbook card <br>• The builder's live preview still renders the *old* course page (`CourseBody`), so Connor previews content learners will never see. | MISSING / CHANGED | Accelerator; Connor's builder | K-1 to K-12, C-9 |
| 7 | **The new screens never pick up Console changes until a full reload.** <br>• `/api/course` is fetched once with `staleTime: Infinity`, and the live event stream refreshes only the snapshot. <br>• So a session time change, a week unlocking on its date, a newly attached kit file or a Zoom change won't appear on an open tab. <br>• Today's portal refreshes on every server change. | CHANGED | Accelerator | C-3, C-4, C-5, A-14 |
| 8 | **The week's Build Kit has lost pieces:** <br>• the system prompt (view and copy) and its variables <br>• files uploaded to the module in the Module Builder (`/api/files/module/...`, no longer called) <br>• the instructor notes card <br>New week pages show only resource-type kit rows. | MISSING | Accelerator (unverified whether production week modules have prompt, files or notes filled in; see E-12) | E-10 to E-13, A-9 |
| 9 | **The week CSV downloads are gone:** the Week 1 worksheet, the practice set and the per-week templates. | MISSING | Accelerator | K-13 |
| 10 | **Add to calendar lost Google Calendar and Outlook.** Only the .ics download is left. | CHANGED | Everyone with sessions (hits Android and Google users most) | D-3 |
| 11 | **The session list no longer shows replay status** ("Replay Ready", "Replay Processing") or "Next Up". | MISSING | Accelerator | S-3, S-4 |
| 12 | **The pre-launch welcome panel** (D-153) is replaced by a bare countdown hero. | CHANGED | Buyers before the preview opens | K-14 |
| 13 | **Team Hub moved from the sidebar to the account menu** (behind the avatar). | CHANGED | Team-tier owners and members | T-1 |
| 14 | **The dark theme switch is gone.** | MISSING (needs sign-off) | Everyone | SH-5 |
| 15 | **The time-zone picker is gone.** Connor already chose "no time-zone picker", so this only needs listing as approved. | CHANGED (approved) | Everyone | SH-4 |
| 16 | **The "Collapse sidebar" toggle is gone.** The rail now appears automatically between 768 and 1199px. | CHANGED | Desktop/tablet | SH-6, MO-3 |
| 17 | **The "Your Deployment" card is gone:** runtime status, Mark as Deployed, Pause/Resume/Reconnect, last run, and the Run drawer. | MISSING (likely intentional; needs sign-off) | Accelerator | E-14, E-15 |
| 18 | **The Team-tier upsell is gone:** the Locked AI Employee preview modal, `/team-tier` and its "Request" button. | MISSING (likely intentional; needs sign-off) | Agent-tier learners with locked modules (none in production that I could find; unverified) | SH-8, P-1 |
| 19 | **The post-cohort Dashboard state is gone** ("Your cohort wrapped on…", "Add Office Hours to Calendar", "Rewatch Any Session"). | MISSING | Accelerator after the last session (Feb) | D-6 |
| 20 | **Small changes:** <br>• Breadcrumbs are now screen-reader-only. <br>• The sidebar cohort line moved to a Home card. <br>• The step button no longer says "undo" (it still toggles). <br>• Billing portal "return" lands on the new library. | CHANGED | Everyone | SH-7, SH-9, E-16, A-12 |

---

## 1. Routes and pages (what URL shows what)

| ID | Today (OLD) | Evidence OLD | NEW | Evidence NEW | Status |
|---|---|---|---|---|---|
| R-1 | `/` Dashboard (learners with a course); no-course learners are sent to `/skill-library` (D-119) | `web/router.tsx:65`; `web/shell/navModel.ts:97-100`; `web/shell/AppShell.tsx:125-127,197-200` | `/` → `/learn` (Home) for **every** learner, the no-course ones included | `web/shell/AppShell.tsx` (pr10, `Frame` → `LearnerRedirect`); `web/routes/learn/redirects.tsx:44-52` | CHANGED (course learners: KEPT as Home; no-course learners: see U-2) |
| R-2 | `/sessions` | `web/router.tsx:66` | → `/learn/schedule` | `redirects.tsx:46` | KEPT (redirect); Join missing, see S-2 |
| R-3 | `/employees/:id` (AI Employee workspace) | `web/router.tsx:67` | → `/learn/week/N` for `accelerator-week-N`, else `/learn` | `redirects.tsx:32-35,49-50` | CHANGED (different page; see E-*) |
| R-4 | `/team` Team Hub (Team tier) | `web/router.tsx:68`; guard `AppShell.tsx:205-208` | → `/learn/team`, the same component, guarded by `hasTeamHub` | `redirects.tsx:47`; `learn/Team.tsx`; `learn/learn.vm.ts:234-235` | KEPT |
| R-5 | `/vault` Resource Vault | `web/router.tsx:69` | → `/learn/vault`, the same component | `redirects.tsx:48`; `learn/routes.tsx:50` | KEPT (nav item locked during pre-launch: `learn.vm.ts:256`) |
| R-6 | `/team-tier` upsell page | `web/router.tsx:70`; `web/routes/portal/TeamTier.tsx:30` | → `/learn`; page deleted | `redirects.tsx` header | MISSING (P-1) |
| R-7 | `/course`, `/course/:week` (course pages, outside the shell) | `web/router.tsx:56-57`; `web/routes/course/Course.tsx` | → `/learn`, `/learn/week/N` | `web/router.tsx:57-58` (pr10); `redirects.tsx:62-65` | CHANGED (content, see K-*) |
| R-8 | `/skill-library` (standalone library) | `web/router.tsx:52`; `web/routes/library/SkillLibrary.tsx` | → `/learn/skills` (new library inside the new shell) | `web/router.tsx:55` (pr10); `learn/Library.tsx` | CHANGED (U-*) |
| R-9 | `/skill-library/:slug` (guided setup) | `web/router.tsx:54`; `routes/library/SkillGuide.tsx` | → `/learn/skills/:slug` | `web/router.tsx:56` (pr10); `learn/Skill.tsx` | KEPT (function); CHANGED look |
| R-10 | `/sign-in`, `/login`, `/invite/:token`, `/forgot-password`, `/set-password` | `web/router.tsx:41-49` | unchanged | `web/router.tsx:42-50` (pr10) | KEPT |
| R-11 | `/account` (password set/change page) | `web/router.tsx:50`; `routes/auth/Account.tsx:48,82` | unchanged, plus the new `/learn/account`, whose "Change password" links to `/account` | `learn/Account.vm.ts:52,266` | KEPT |
| R-12 | Unknown learner paths → `/`; learner at `/admin*` → `/` | `web/router.tsx:119`; `AppShell.tsx:201-204` | → `/learn` (`LearnerRedirect`); `/learn/*` → `/learn` | `learn/routes.tsx:51`; `redirects.tsx:90-93` | KEPT |
| R-13 | Staff at a learner path → `/admin` | `AppShell.tsx:192-195` | Staff `Frame` → AdminShell; `*` → `/admin` | pr10 `AppShell.tsx`; `router.tsx` `*` | KEPT |
| R-14 | Query and fragment (`?as=`, `?preview=`, `?now=`) kept through routing | n/a | Redirects keep search and hash | `redirects.tsx:72-75` | KEPT |

## 2. Shell / chrome (sidebar, header, menus)

| ID | Today | Evidence OLD | NEW | Evidence NEW | Status |
|---|---|---|---|---|---|
| SH-1 | Sidebar: Dashboard, Sessions, Course, the AI Employees group (count badge, collapsible, per-module build token), Team Hub, Resource Vault | `navModel.ts:154-249` | Sidebar: Home, Schedule (course only), Skill library, Resource vault, the AI employees group (weeks, status ring, collapsible), Get help | `shell/learner/LearnerShell.tsx:87-162`; `learn.vm.ts:249-287` | KEPT (re-labelled) |
| SH-2 | No-course learner sidebar: Skill Library, Team Hub, Vault | `navModel.ts:232-240` | Home, Skill library, Vault, Get help (no Schedule) | `LearnerShell.tsx:92-97` | CHANGED (U-3) |
| SH-3 | Profile menu: name and email, Sign Out | `shell/ProfileMenu.tsx:85-151` | Account menu: Account page, Team Hub (team tier), Sign out | `LearnerShell.tsx:325-331` | KEPT |
| SH-4 | Time-zone picker (Auto plus zones; "Session Times Show as …") | `ProfileMenu.tsx:94-129`; `lib/prefs.ts` | none (Connor: "no time-zone picker") | grep: no `savePrefs`/`ZONES` in `routes/learn`, `shell/learner` | CHANGED (approved by Connor; list as signed off) |
| SH-5 | Light/Dark theme switch | `ProfileMenu.tsx:133-145` | none | as above | MISSING (needs sign-off) |
| SH-6 | Collapse/Expand Sidebar (rail) toggle, remembered | `AppShell.tsx:257-260,338-346` | rail is automatic at 768–1199px; no toggle | `LearnerShell.tsx` header comment | CHANGED |
| SH-7 | Visible breadcrumbs in the header | `AppShell.tsx:380`; `shell/Breadcrumbs.tsx` (deleted in #172) | breadcrumb `nav` is visually hidden (`srOnly`) | `LearnerShell.tsx:316-324` | CHANGED (low) |
| SH-8 | Locked AI Employee Preview modal (from nav, cards, guarded URLs) → CTA to `/team-tier` | `AppShell.tsx:131-160,213-226,415-430`; `components/LockedEmployeePreview.tsx` | none | not imported anywhere in `routes/learn`, `shell/learner` | MISSING (likely intentional; sign-off) |
| SH-9 | Cohort context line under the logo (`cohortLine`) | `AppShell.tsx:248-255,309` | cohort card on Home | `learn/Home.tsx:225-262` | CHANGED (low) |
| SH-10 | Staff "Preview as learner" banner with Exit Preview | `AppShell.tsx:384-393` | same banner | `LearnerShell.tsx:345-353` | KEPT |
| SH-11 | Masquerade layer, banner and write-blocking (wraps every route) | `web/router.tsx` `MasqueradeRoot`; `data/http.ts` masquerade refusals | unchanged wrapper; masquerade lands at `/` → `/learn` | `web/router.tsx` (pr10) last line; `core/landing.ts` (pr10) header | KEPT (unverified visually in the new shell) |
| SH-12 | Sign out (real, with a failure toast) | `AppShell.tsx:276-281` | same | `LearnerShell.tsx:282-286` | KEPT |
| SH-13 | Toasts and confetti (step 6 builds) | `AppShell.tsx:441-449`; `data/hooks.ts:32-42` | providers wrap the new shell | `LearnerShell.tsx:373-383` | KEPT |
| SH-14 | Stale-chunk recovery | `router.tsx` `withStaleChunkRecovery` | unchanged | pr10 `router.tsx` | KEPT |
| SH-15 | Escape closes drawer, menus and modals | `AppShell.tsx:229-238` | drawer modal via `useDialogA11y` | `LearnerShell.tsx:264` | KEPT |
| SH-16 | Demo controls (fixture build only) | `AppShell.tsx:381` | fixture only | `LearnerShell.tsx:315` | N/A (not in production) |

## 3. Dashboard / Home

| ID | Today | Evidence OLD | NEW | Evidence NEW | Status |
|---|---|---|---|---|---|
| D-1 | Announcement banner: severity, title, body, time, action button (Update Calendar → .ics / Open Sessions), Dismiss (`dismissAnnouncement`) | `routes/portal/Dashboard.tsx:103-118`; `core/mutations.ts:207` | none | no `announce` in `routes/learn` | MISSING (known 3) |
| D-2 | Session card: countdown, **Join (live 15 min early)** via `GET /api/sessions/:id/join` | `Dashboard.tsx:120-127`; `components/SessionCard.tsx`; `components/JoinButton.tsx:37-38` | Home hero shows Join only when `start <= now` (`liveSessionAt`); otherwise "Add to calendar" | `learn/Home.tsx:98-110`; `core/learner.ts:98-99` (pr10) | MISSING (known 2) |
| D-3 | Add to calendar: Google Calendar (new tab), Outlook (new tab), Apple/Other (.ics) | `SessionCard.tsx:26-30`; `Dashboard.tsx:128-133` | .ics download only | `learn/ics.ts`; `Home.tsx:111-115,215` | CHANGED |
| D-4 | Session card "Watch Replay" and "Open the Build Kit" | `SessionCard.tsx:166-175`; `Dashboard.tsx:134-139` | none | — | MISSING (replay); build kit → week page (KEPT partly) |
| D-5 | Progress: "N of M AI Employees Built", segmented bar, legend with build tokens, "Next Up" button, locked note | `Dashboard.tsx:167-220` | Hero "Continue step" with progress bar; employee cards with bars; nav rings | `Home.tsx:73-95,121-163` | KEPT |
| D-6 | Post-cohort block: "Your Cohort Wrapped on …", Add Office Hours to Calendar, Rewatch Any Session | `Dashboard.tsx:143-163` | none found | `Home.vm.ts` (no post state) | MISSING (low until Feb) |
| D-7 | "Your First Build Is Session 1 on …" plus "Watch the 5-Min Orientation" | `Dashboard.tsx:222-239`; `Dashboard.vm.ts:390` (toast placeholder) | countdown to the next build | `Home.tsx` hero `next` | N/A (orientation was a placeholder toast) / KEPT (date) |
| D-8 | "Your AI Employees" card grid (open, locked, soon, build state) | `Dashboard.tsx:242-252` | Employees section, one card per week, locked corner, live badge | `Home.tsx:120-163,184-202` | KEPT |
| D-9 | Quick Links: Technical Support (mailto support), Office Hours (next time) | `Dashboard.vm.ts:418-453` | Cohort card: office hours link to the Schedule, "Questions? Email support" mailto; nav "Get help" | `Home.tsx:243-260`; `LearnerShell.tsx:158` | KEPT |
| D-10 | Quick Link "Cohort Community" (148 members…) | `Dashboard.vm.ts:409-412` | none | — | N/A (prototype figures) |
| D-11 | Cohort Schedule side list plus "All Sessions" | `Dashboard.tsx:272-291` | "Coming up" (three sessions) plus Add all, link to the Schedule | `Home.tsx:206-222` | KEPT |
| D-12 | Two-pay paused state → Manage Billing | `routes/course/Course.tsx:450-458` | Home `paused` → Manage billing (`/api/billing/portal`) | `learn/Home.vm.ts:282` | KEPT |
| D-13 | Course "failed to load" state | `Course.tsx` | Home `failed` lede | `Home.vm.ts:283` | KEPT |

## 4. AI Employee workspace (`/employees/:id`) → week page and step player

| ID | Today | Evidence OLD | NEW | Evidence NEW | Status |
|---|---|---|---|---|---|
| E-1 | Session replay player (HLS via `playbackUrl`), poster, play/pause, big play | `routes/portal/EmployeeDetail.tsx:86,107-126,222-231`; `HlsEngine.ts` (deleted in #172) | none | no `replayUrl`/`playbackUrl` in `routes/learn` | MISSING (known 1) |
| E-2 | Seek bar, back 10s, time / total, current chapter | `EmployeeDetail.tsx:233-236`, around lines 390-433 | none | — | MISSING |
| E-3 | Playback speed cycle | `EmployeeDetail.tsx:238-241,438` | none | — | MISSING |
| E-4 | Captions toggle (CC) from VTT | `EmployeeDetail.tsx:443-449`; `core/vtt.ts` | none | — | MISSING |
| E-5 | Transcript panel: search box, match count, click a line to seek | `EmployeeDetail.tsx:450-530` | none | — | MISSING |
| E-6 | Chapter rail (one per build step, with check marks) | `EmployeeDetail.tsx` around lines 466-495 | none | — | MISSING |
| E-7 | Resume position saved per module (localStorage, on pagehide) | `EmployeeDetail.tsx:38-52,132-141` | none | — | MISSING |
| E-8 | "Replay processing" / no-replay states under the poster | `EmployeeDetail.tsx` around lines 350-380 (`v.none`, `v.noneNote`) | none | — | MISSING |
| E-9 | Join button on the week workspace poster (15-min window) plus Add to Calendar | `EmployeeDetail.tsx` around lines 357-375 (`JoinButton`, `v.showCal`) | Week page: open weeks show no session or Join; locked weeks list sessions plus .ics | `learn/Week.tsx:37-133,159-176`; `Week.vm.ts:167` | MISSING (Join); KEPT (.ics, locked only) |
| E-10 | Build Kit: system prompt card, View (code drawer, line numbers), Copy (2s "Copied"), prompt stats, variables | `EmployeeDetail.tsx:200-207,699-725,826-836` | none | no `m.prompt` in `routes/learn` | MISSING |
| E-11 | Build Kit: module files, Preview (drawer), Download (`/api/files/module/:id/:file`); Notion opens | `EmployeeDetail.tsx:740-760`; `EmployeeDetail.vm.ts:472-486,632-663`; `data/http.ts:105-108` | none (`moduleFile` is referenced only in `data/repository.ts:54`) | `learn/Week.tsx:21` uses `kind:'resource'` only | MISSING |
| E-12 | Build Kit: linked Vault resources with Download | `EmployeeDetail.tsx:770-785` | Week kit rows from course kit items (resources), via `repo.fileUrl({kind:'resource'})` | `learn/Week.tsx:21,120-131`; `core/course.ts:110` (pr10) | KEPT |
| E-13 | Instructor notes card (avatar, name, notes) | `EmployeeDetail.tsx:788-797` | none | — | MISSING (the notes are course content per `core/scope.ts:150` comment) |
| E-14 | "Your Deployment": runtime status token, platform, Open link, issue, last run, Mark as Deployed / Resume / Reconnect, Pause | `EmployeeDetail.tsx:252-258,622-695`; `core/mutations.ts:262` | none | no `setRuntime`/`markDeployed` callers in pr10 web | MISSING (likely intentional) |
| E-15 | Run drawer: input textarea, Run, Copy all, output, records the last run (`recordRun`) | `EmployeeDetail.tsx:260-268,812-862` | none | — | MISSING (simulated in the prototype; likely intentional) |
| E-16 | Build checklist: steps with number, text, hint, "About N min", per-step assets (copy or view prompt, file), Mark / undo (`toggleStep`), verified token | `EmployeeDetail.tsx:537-618` | Week step list (done/current/todo) plus a step player with Claude/ChatGPT tabs, copy blocks, Mark step done (toggles; `aria-pressed`), per-step kit | `learn/Week.tsx:96-118`; `learn/Step.tsx:42-56,121-130,136-144` | KEPT (CHANGED: no explicit "undo" label) |
| E-17 | Per-step "Watch at mm:ss" (seeks the replay) | `EmployeeDetail.tsx:570-580` | none | — | MISSING |
| E-18 | Header: name, runtime token, outcome, "From Session N" link to Sessions, Self-Paced, build minutes, for whom | `EmployeeDetail.tsx:272-310` | Week header: tile, title, lede, status pill, due line | `learn/Week.tsx:23-47` | CHANGED |
| E-19 | "Opens …" soon state for a scheduled module | `EmployeeDetail.tsx` around line 314 (`vm.soon`) | Locked week preview: headline, line, question, opens date, sessions | `learn/Week.tsx:136-176` | KEPT |
| E-20 | Next Up button to the next AI Employee | `EmployeeDetail.tsx:799` | Step player prev/next; week hero CTA | `learn/Step.tsx:109-120` | KEPT (within a week); CHANGED (no week→week link, see K-12) |
| E-21 | Preview tab: stored download says "Preview only" | `EmployeeDetail.tsx:82-84,167-170` | the server refuses staff stored files; no client message found | — | unverified |
| E-22 | Non-course AI Employee pages (any module not `accelerator-week-N`) | `EmployeeDetail.tsx` | redirect to `/learn` | `redirects.tsx:32-35,50` | N/A if production has no such published modules (unverified: can't read the production DB) |

## 5. Sessions → Schedule

| ID | Today | Evidence OLD | NEW | Evidence NEW | Status |
|---|---|---|---|---|---|
| S-1 | List of every cohort session, with status tokens | `routes/portal/Sessions.tsx`; `Sessions.vm.ts:140-202` | Schedule by week plus a month calendar (`?view=calendar`), agenda per session | `learn/Schedule.tsx`; `Schedule.vm.ts` | KEPT |
| S-2 | Join per session (live 15 min early) | `Sessions.tsx:123-131` | none | no `useJoin` in `learn/Schedule.tsx` | MISSING (known 2) |
| S-3 | Status tokens: Live Now, Next Up, Scheduled, Replay Processing, Replay Ready | `Sessions.vm.ts:169-187` | week rows with a "now" marker; no replay tokens | `Schedule.tsx:81` | MISSING (replay statuses) |
| S-4 | "Watch Replay" per past session | `Sessions.vm.ts:173` | none | — | MISSING |
| S-5 | Add to Calendar per session; "Add all" (.ics) | `Sessions.tsx:80`; `Sessions.vm.ts:150-156` | hero .ics; "Add all" `href=SCHEDULE_ICS_PATH download` | `Schedule.tsx:49,308`; `Schedule.vm.ts:458` | KEPT |
| S-6 | Office-hours calendar download | `Sessions.tsx:166` | included in the all-sessions .ics; office hours shown on Home and Schedule | `Schedule.vm.ts:458`; `Home.vm.ts:237,258` | KEPT |
| S-7 | Locked session "Preview" (opens the Locked preview) | `Sessions.vm.ts:167` | none | — | N/A (no team-tier-locked course sessions found; unverified) |
| S-8 | Holiday-break note | n/a | from `course.intro.holiday` | `Schedule.vm.ts:444` | New (fine) |

## 6. Course page content (`/course`, `/course/week-N`) → week page and step player

All of these are **editable in the curriculum builder** (`web/routes/admin/WeekBuilder.tsx:380-416,425-537`) and present in the v2 seed (`packages/core/seed/weeks-0-3-v2.ts`, e.g. `:390-441`). The new learner screens don't read them (grep of `web/routes/learn` for each field name: no hits except as noted).

| ID | Today (old course page shows) | Evidence OLD | NEW | Status |
|---|---|---|---|---|
| K-1 | Live Build: when, minutes, Join link (`intro.join`), agenda table, lesson and case, live exercise, required outcome, advanced option, owner approval, "working at the end of class" | `routes/course/Course.tsx:286-310`; `Course.vm.ts` `COPY.liveBuild…workingAtEnd` | agenda only on the Schedule (`Schedule.vm.ts`, `agenda`); the rest nowhere | MISSING |
| K-2 | Office Hours page: title, note, Join link, format, "You Leave With" (outputs) | `Course.tsx:313-327` | office hours as a Schedule/Home row only | MISSING (format, outputs) |
| K-3 | Homework: Implemented by Week's End, Before the Next Session (assignment), Acceptance Test (checkpoint), Adopted Means | `Course.tsx:335-340` | none (`homework` 0 hits) | MISSING |
| K-4 | Why It Matters; Who Does What (owner/operator); Time This Week (owner/operator) | `Course.vm.ts` `COPY.why/whoDoesWhat/time`; `Course.tsx:218` | `why` used only in the Library/Home lede, not per week; `time` only in Schedule | MISSING (per-week) |
| K-5 | This Week's Skills (role: flagship/supporting/optional/pilot), Setup Order with guided-setup links | `Course.tsx:230-280`; `Course.vm.ts` `SkillVM`, `StepVM` | steps → step player; skills → kit rows/skill links | KEPT (restructured into v2 steps) |
| K-6 | Course Materials list; Media list | `Course.tsx:367` (`COPY.materials`), `COPY.media` | none | MISSING |
| K-7 | Evidence packet, Rubric (and scale and rules), Readiness gates, Issue form | `Course.vm.ts` `COPY.evidence/rubric/readiness/issueForm`; `Course.tsx:329` | none | MISSING |
| K-8 | How It Works intro, roles, scope, support, instructor | `Course.vm.ts` `COPY.howItWorks`; `core/course-types.ts:192-202` | holiday note only | MISSING |
| K-9 | Before Week 1: intake, orientation, data pack (preferred / minimum), practice set, safe sharing, three ways to connect data | `Course.tsx:150-190` | replaced by Week 0's steps (v2) | CHANGED (unverified that every old item maps to a Week 0 step) |
| K-10 | After Week 8: Graduation, Agent Pilot Review | `Course.tsx:190` (`COPY.pilot`) | none | MISSING (low until Week 8 content exists) |
| K-11 | The weeks overview with each week's question, flagship and opens date; Calendar section | `Course.tsx:114-135` | Home employee cards plus Schedule | KEPT |
| K-12 | Previous / Next week links | `Course.tsx:375-386` | none between weeks (only step prev/next) | MISSING (low) |
| K-13 | Downloads made in the browser: Week 1 worksheet CSV, practice set CSV, per-week templates (`COURSE_TEMPLATES`) | `Course.vm.ts:304-305,407` (pr10 line numbers; same on main); `core/worksheet.ts` | none | MISSING |
| K-14 | Pre-launch welcome panel (`PreLaunch`) on `/course` and the library | `Course.tsx:471` (pr10); `SkillLibrary.tsx:389` | Home countdown hero ("opens") only | CHANGED |
| K-15 | New v2 fields Seat card and Playbook card (builder-editable) | `WeekBuilder.tsx:558-568` (pr10) | not rendered on any learner screen | MISSING (new content that never surfaces) |
| K-16 | Locked week shows title, question, outcome, opens date, its sessions (D-175) | `Course.vm.ts:429` | `learn/Week.tsx:136-176` | KEPT |

## 7. Skill Library and guided setup

| ID | Today | Evidence OLD | NEW | Evidence NEW | Status |
|---|---|---|---|---|---|
| L-1 | Skills grouped by set, each with title, Free badge, lead, summary | `SkillLibrary.tsx:260-275,423-432` | Start Here, grouped cards, "show more", filter chips, search | `learn/Library.tsx:36-150` | KEPT (CHANGED look; search and filters are new) |
| L-2 | Open skill: per-file Download buttons on the list (`/api/skills/:id/download/:kind`) plus Setup Guide | `SkillLibrary.tsx:283-297` | Downloads on the skill page | `learn/Skill.tsx:256` | KEPT (moved one click deeper) |
| L-3 | Locked skill: "Not included with {group} access" (no upsell for a group member) / locked; Preview link; See plans (non-group only) | `SkillLibrary.tsx:298-316`; `offersPlans` | group locked line from copy strings; `plans` false for group members | `learn/Library.vm.ts:160-176,361`; `Skill.tsx:153-157` | KEPT |
| L-4 | Upcoming skill: "Opens {date}" | `SkillLibrary.tsx:317-321` | locked/upcoming meta on cards | `Library.vm.ts` | KEPT (unverified that the exact date copy matches) |
| L-5 | **Access-group welcome panel** ("Welcome, Utah Life", N skills, "start with X and Y" links, Dismiss via `POST /api/skills/welcome/dismiss`, kept per account) | `SkillLibrary.tsx:205-258,393` | none (`welcome` 0 hits in `routes/learn`) | — | MISSING |
| L-6 | Header line "Included with your {group} access" | `SkillLibrary.tsx:371-376` | Account page "Included with your {group} team" | `learn/Account.vm.ts:216-218` | CHANGED (moved off the library) |
| L-7 | Header buttons: AI Accelerator (`/course`), Team Hub (`/team`, not for group-only), Manage Billing (not for group-only) | `SkillLibrary.tsx:354-368` | nav plus account menu plus Account page billing | `LearnerShell.tsx:87-162,325-331`; `learn/Account.tsx:149` | KEPT (moved) |
| L-8 | Paused (two-pay) note on the library | `SkillLibrary.tsx` around lines 378-386 | `vm.paused` banner | `learn/Library.tsx:154-158` | KEPT |
| L-9 | Signed-out: "opens when you sign in" plus Sign In | `SkillLibrary.tsx:411-416` | signed-out state plus Sign In | `learn/Library.tsx:199-214` | KEPT |
| L-10 | Guided setup: lanes (Claude / ChatGPT / Grok), step rail, prev/next/restart, copy chip, copy block, Copy & Open, step file download/link, prompts section | `SkillGuide.tsx:141-320` | same pieces | `learn/Skill.tsx:217-410` | KEPT |
| L-11 | Guide remembers your step per lane on this device | `SkillGuide.tsx:111-126` | same | `learn/Skill.tsx:200-212` | KEPT |
| L-12 | Signed-out guide → `/sign-in?next=/skill-library/<page>`, back after sign-in | `SkillGuide.tsx:400` | a 401 from the shell's snapshot → `signInFor(pathname)` adds `next` for `/learn/skills/<page>`; `safeNext` accepts both | `data/http.ts` (pr10) `signInFor`; `core/landing.ts` (pr10) `safeNext` | KEPT (unverified end-to-end: `Skill.tsx:460` also renders a plain `/sign-in` link) |

## 8. Team Hub, Vault, Account

| ID | Today | Evidence OLD | NEW | Evidence NEW | Status |
|---|---|---|---|---|---|
| T-1 | Team Hub in the sidebar for Team tier | `navModel.ts:226` | account menu item only | `LearnerShell.tsx:329` | CHANGED |
| T-2 | Team Hub actions: invite (four inline errors), remind/nudge ("Resend Invite"/"Send Reminder"), change role, remove, member drawer | `routes/portal/TeamHub.tsx:77-100`; `TeamHub.vm.ts:397` | same component | `learn/Team.tsx` → `portal/TeamHub` | KEPT |
| T-3 | Weekly digest email "Open Team Hub" → `/team` | `api/email/templates/weekly-digest.tsx:44` | → `/learn/team` | `redirects.tsx:47` | KEPT |
| V-1 | Vault: list, filters, download (`downloadResource`, `/api/files/resource/:id`), Team-only lock, "Request" upgrade (`requestUpgrade`), Executive Build Vault request | `routes/portal/Vault.tsx:72-93` | same component at `/learn/vault` | `learn/routes.tsx:50` | KEPT |
| V-2 | Vault reachable for every learner | `navModel.ts:227` | in nav for all; shown locked (not a link) during pre-launch | `learn.vm.ts:256`; `LearnerShell.tsx:102-118` | CHANGED (pre-launch only; matches the D-175 plan) |
| AC-1 | `/account`: set or change password | `routes/auth/Account.tsx` | unchanged; linked from the new Account page | `Account.vm.ts:52` | KEPT |
| AC-2 | (new) `/learn/account`: profile (read-only name/email/role), plan, seats, billing link, included items | — | — | `learn/Account.tsx` | New (Utah Life sees it: U-5) |
| AC-3 | Resend invite (Account) | — | hidden (`resend: null`) per Connor | `Account.vm.ts:241-244` | KEPT decision (dead toast code at `Account.tsx:45` is harmless) |

## 9. API endpoints the learner web app calls

From a grep of `fetch(` and `/api/` across `apps/web/src` (non-test), main vs pr10. Endpoints used only by Console/admin screens aren't listed.

| ID | Endpoint | Used today by | Used by new screens | Status |
|---|---|---|---|---|
| A-1 | `GET /api/me` | every screen (`useViewer`) | shell (`useViewer`) | KEPT |
| A-2 | `GET /api/snapshot` | every portal screen (`useDb`) | shell, Home, Week, Team, Vault | KEPT |
| A-3 | `GET /api/events` (SSE "changed" → refetch snapshot) | `data/http.ts:112-122` | still subscribed via `useDb`, but **course data isn't refreshed** | CHANGED (see A-14) |
| A-4 | `POST /api/mutate/toggleStep` | `EmployeeDetail.tsx:601,610` | `learn/Step.tsx:52` | KEPT |
| A-5 | `POST /api/mutate/dismissAnnouncement` | `Dashboard.tsx:115` | none | MISSING |
| A-6 | `POST /api/mutate/markDeployed`, `setRuntime`, `recordRun` | `EmployeeDetail.tsx:256-266,689` | none | MISSING (E-14/E-15) |
| A-7 | `POST /api/mutate/requestUpgrade` (Team tier page) | `TeamTier.tsx:30` | none (Vault's two calls KEPT) | MISSING (P-1) |
| A-8 | `GET /api/sessions/:id/join` | Dashboard, Sessions, EmployeeDetail (`data/join.ts`) | top bar, phone strip, Home hero — only while live | CHANGED (known 2) |
| A-9 | `GET /api/files/module/:moduleId/:file` | `EmployeeDetail.vm.ts:486,663` | none | MISSING (E-11) |
| A-10 | `GET /api/files/resource/:id` | Vault, EmployeeDetail resources | Vault, Week kit | KEPT |
| A-11 | `GET /api/course` | `Course.tsx:35` | `learn/data.ts:33` | KEPT |
| A-12 | `GET /api/billing/portal` (Stripe portal; returns to `/skill-library`) | library, course paused | Account, Home paused; return now lands on `/learn/skills` | KEPT (return page CHANGED; `api/routes/billing.ts:67`) |
| A-13 | `GET /api/skills`, `GET /api/skills/:id/download/:kind`, `GET /api/skill-guides/:slug` | SkillLibrary, SkillGuide | `learn/skills-data.ts:22`, `Skill.tsx:256`, `Library.vm.ts` | KEPT |
| A-14 | `POST /api/skills/welcome/dismiss` | `SkillLibrary.tsx:250` | none | MISSING (L-5) |
| A-15 | `GET /api/auth/password`, `POST /api/auth/password/change` | `/account` | `/account` plus `learn/accountData.ts:50` | KEPT |
| A-16 | `/api/auth/*` sign-in, request, verify, google, forgot, set, sign-out | auth screens | unchanged | KEPT |
| A-17 | Calendar .ics route (`SCHEDULE_ICS_PATH`, offer-calendar) | — | Schedule "Add all" | KEPT (fixed in #170) |

## 10. Emails, reminders and deep links into the portal

Templates are in `api/email/templates/*.tsx`; paths are in `api/email/templates/links.ts`. The schedulers are `api/jobs/due.ts` and `api/jobs/scheduler.ts`.

| ID | Email / CTA | Link today | Lands after #172 | Works there? | Status |
|---|---|---|---|---|---|
| M-1 | Session 24h "Open Sessions" | `/sessions` (`session-24h.tsx:19`, `session-reminder.tsx:36`) | `/learn/schedule` | yes | KEPT |
| M-2 | Session 1h "Join Session" | `/sessions` (`session-1h.tsx:18`) | `/learn/schedule` | **no Join on the Schedule** | MISSING (known 2) |
| M-3 | Replay ready "Watch Replay" | `/employees/:moduleId` (`replay-ready.tsx:33`) | `/learn/week/N` | **no player** | MISSING (known 1) |
| M-4 | Build reminder ("N of 6 steps") | `/employees/:moduleId` (`build-reminder.tsx:46`) | `/learn/week/N` | yes (steps) | KEPT |
| M-5 | Announcement email CTA | `/sessions` if it has an action, else `/` (`announcement.tsx:47`) | `/learn/schedule` or `/learn` | page loads; the announcement itself isn't shown in-app | CHANGED (known 3) |
| M-6 | Weekly digest "Open Team Hub" | `/team` (`weekly-digest.tsx:44`) | `/learn/team` | yes | KEPT |
| M-7 | Sign-in link (with optional `next=/skill-library/<page>`) | `links.ts` `signInPath` | landing `/` → `/learn`, or `/skill-library` → `/learn/skills`; `next` → `/learn/skills/<page>` | yes | KEPT (Utah Life lands somewhere new: U-1) |
| M-8 | Set password / Reset password | `/set-password?token=` | unchanged | yes | KEPT |
| M-9 | Team invite "Accept Invite" | `/invite/:token` | unchanged, then the landing page | yes | KEPT |
| M-10 | Checkout success → set password | `api/routes/offer.ts:381` | unchanged | yes | KEPT |
| M-11 | www links (`/course`, `/skill-library`, `/sessions`, `/team`) | `apps/web/*` www pages | redirected | yes | KEPT |
| M-12 | GHL workflow emails (Connor's GHL, not in this repo) | unknown | — | — | **unverified**: their links live in GHL, not the repo; check any that use `/course`, `/sessions`, `/employees/...` |
| M-13 | Staff invite "Open Admin Console" | `/invite/:token` | unchanged | yes | N/A (staff) |

## 11. Console actions that change what learners see

| ID | Console action | Today's learner effect | Effect in the new screens | Status |
|---|---|---|---|---|
| C-1 | Cohorts → **Go Live** (`goLive`, `core/mutations.ts:721`) | Join turns on for the cohort (before the start time if pressed early); live badges (`api/routes/join.ts:78-79` honors `live`) | new screens decide "live" by clock (`liveSessionAt`), so no badge or Join appears before start. The server would still hand out the link, but there's no button | MISSING (known 4) |
| C-2 | Cohorts → **End Session** (`endSession`, `:741`) | session reads as ended; Join off; replay pending | new screens show "live" until scheduled end + mins | MISSING (known 4) |
| C-3 | Cohorts → **Publish Replay / attach replay** (`publishReplay :763`, `attachReplay` admin action) | Replay Ready token, Watch Replay, player, replay email | email goes out; nothing to watch | MISSING (known 1) |
| C-4 | Cohorts → edit session (date, time, minutes, Zoom) (`updateSession :780`), add session | the snapshot updates live via SSE | `/api/course` reflects it only after a full reload (`learn/data.ts:52` `staleTime: Infinity`; `data/hooks.ts:17` invalidates only `DB_KEY`) | CHANGED |
| C-5 | Curriculum → publish/unpublish, schedule opens, week unlock dates (course builder) | the portal reflects it live | server-gated correctly (`api/routes/course.ts` D-175) but only after a reload | CHANGED |
| C-6 | Announcements → send / schedule / update / duplicate (`sendAnnouncement :930`, admin actions) | Dashboard banner for the audience plus optional email | email only | MISSING (known 3) |
| C-7 | Announcements → automated reminders on/off (`toggleReminder :998`) | controls the M-* emails | unchanged (emails) | KEPT |
| C-8 | Vault → upload, edit, access tier, publish/hide, delete | Vault plus EmployeeDetail kit | Vault plus week kit (resources) | KEPT (on reload for the week kit) |
| C-9 | Curriculum builder: edit week content (why, homework, agenda, lesson, materials, media, seat card, playbook card) plus **live preview** | old course page showed them | not rendered (K-*); **preview renders the retired old page** (`web/routes/admin/WeekBuilder.tsx:23,964-989` imports `CourseBody` from `routes/course/Course`) | CHANGED (builder ≠ what learners see) |
| C-10 | Module Builder: system prompt, files, notes, steps | EmployeeDetail kit, notes, checklist | steps KEPT (step player); prompt, files and notes not shown | MISSING (E-10, E-11, E-13) |
| C-11 | Learners → set tier (`setLearnerTier`) | Team Hub visibility, locked modules | Team Hub via `hasTeamHub` | KEPT |
| C-12 | Learners → nudge (`nudgeLearners :493`) | build-reminder email | lands on the week (M-4) | KEPT |
| C-13 | Tiers → request status (`setRequestStatus`) | Team tier upgrade flow | only Vault requests remain | CHANGED (P-1) |
| C-14 | Masquerade start, extend, end | lands as the learner (landing path), banner, writes blocked | lands at `/learn` or `/learn/skills` in the new shell; wrapper unchanged | KEPT (look CHANGED) |
| C-15 | Preview as learner (D-138) | banner plus read-only | same banner in the new shell | KEPT |
| C-16 | Console flags | none found that switch learner screens (`VITE_LEARNER_V2` was build-time only and #172 deletes it) | — | N/A |

## 12. Access groups: what each sees

| ID | Group | Today | After #172 | Status |
|---|---|---|---|---|
| U-1 | **Utah Life** (verified @liveutah.com; Agent Plan skills; `api/billing/access-groups.ts`) — sign-in landing | `/skill-library`: standalone page, no sidebar (`core/landing.ts`, `SkillLibrary.tsx`) | `/learn/skills` inside the new shell (`web/router.tsx:55` pr10) | **CHANGED — violates "don't change Utah Life"** |
| U-2 | Utah Life visiting `/` | redirected to the Skill Library (`navModel.ts:97-100`) | new Home: greeting plus "Open Your Skill Library" card (`learn/Home.vm.ts:266-274`) | CHANGED |
| U-3 | Utah Life nav | the library page has no sidebar; inside the old shell (`/vault`): Skill Library, Vault (`navModel.ts:232-240`) | Home, Skill library, Resource vault, Get help (`LearnerShell.tsx:87-162`) | CHANGED |
| U-4 | Utah Life welcome panel and "Included with your Utah Life access" line | `SkillLibrary.tsx:205-258,371-376` | gone / moved to Account | MISSING |
| U-5 | Utah Life Account page | only `/account` (password) | new `/learn/account` with "Included with your Utah Life team" | CHANGED (new surface) |
| U-6 | Utah Life locked skills say "Not included with Utah Life access", no upsell | `SkillLibrary.tsx:302`; `offersPlans` | `Library.vm.ts:160-176`; `plans` false | KEPT |
| U-7 | Utah Life downloads and guided setups | list buttons plus guide | skill page downloads plus guide | KEPT (one click deeper) |
| G-1 | **Accelerator** (course buyers and teammates) | Dashboard, Sessions, Course, AI Employees, Vault, Team Hub (team tier) | new Home, Week, Step, Schedule, Library, Vault, Account, Team | CHANGED (items 2 to 11 in the top section) |
| G-2 | **Team Plan** (no course, Team tier) | Skill Library page plus Team Hub plus Vault (D-119) | new shell: Home, Library, Vault; Team Hub in the account menu | CHANGED |
| G-3 | **Agent Plan** (no course) | Skill Library page plus Vault | new shell | CHANGED |
| G-4 | **Insiders** | Skill Library page plus Vault | new shell | CHANGED |
| G-5 | **Free / no plan** (signed-in, free skills) | Skill Library page (free open, rest locked with See plans) | new library (`plans` offered) | CHANGED (look); KEPT (rules) |
| G-6 | Two-pay paused | course paused panel plus billing; library paused note | Home paused plus billing; library paused banner | KEPT |
| G-7 | Bought, before the preview opens | PreLaunch panel | countdown hero | CHANGED (K-14) |

## 13. Mobile behaviors

| ID | Today | Evidence OLD | NEW | Evidence NEW | Status |
|---|---|---|---|---|---|
| MO-1 | Under 768px: sidebar becomes a drawer with scrim, Close button, menu button, wordmark in the top bar | `AppShell.tsx:86,291-307,371-378` | drawer is a true modal (focus trapped, page inert), wordmark bar | `LearnerShell.tsx:255-272,294-312,357-367` | KEPT (improved) |
| MO-2 | 16px text floor, 44px targets, no sideways scroll (CI `@lms-mobile`) | `compliance/tests/e2e/lms-mobile.spec.ts:211` (main) | same suite pointed at `/learn`, plus 390/768/1024 walks | `lms-mobile.spec.ts:216` (pr10); #171 e2e | KEPT |
| MO-3 | 768px and up: full sidebar or rail (user toggle) | `AppShell.tsx:86` | rail automatic at 768–1199px | `LearnerShell.tsx` header | CHANGED |
| MO-4 | Phone: next-session strip | — | phone strip (Live now + Join, or Next build → Schedule) | `LearnerShell.tsx:203-233` | New |
| MO-5 | Phone: replay player, transcript and checklist on the workspace | `EmployeeDetail.tsx` | none | — | MISSING (E-*) |

## 14. Misc / prototype-only

| ID | Item | Status |
|---|---|---|
| P-1 | `/team-tier` Team tier sales page plus "Request a consultation" (`TeamTier.tsx:30`) | MISSING (likely intentional; #172 says "no plan sells it". Needs Connor's sign-off) |
| P-2 | Demo controls, `/__states`, `/__tokens` | N/A (dev or fixture only) |

---

## Counts

These are the inventory rows above, one status per row. A row's status is the first status word in its last column, so "KEPT (…); CHANGED look" counts as KEPT and "MISSING (Join); KEPT (.ics)" counts as MISSING.

| Status | Count |
|---|---|
| KEPT | 77 |
| MISSING | 52 |
| CHANGED | 34 (1 of them, the time-zone picker, is already approved by Connor) |
| N/A | 8 |
| New (no old counterpart) | 3 |
| unverified | 2 (E-21, M-12) |
| **Total rows** | **176** |

Of the 86 MISSING or CHANGED rows, 12 trace to the four gaps Claude Code already reported (D-1, D-2, E-1, S-2, A-8, M-2, M-3, M-5, C-1, C-2, C-3, C-6). The other 74 are new in this inventory. The top section groups all 86 into 20 ranked items.

## Things I couldn't verify from code

1. **Production data.** I can't tell whether production week modules have a system prompt, uploaded module files or instructor notes (E-10, E-11, E-13), or whether any non-course, team-tier-locked modules are published (E-22, S-7, SH-8). This needs a read-only Console or DB look.
2. **GHL email links** (M-12) live in GHL, not in the repo.
3. **The signed-out skill page link:** whether it keeps `next` end to end (L-12).
4. **Masquerade's look inside the new shell** (SH-11). The wrapper is unchanged, but I didn't render it.
5. **Week 0 mapping:** whether Week 0's v2 steps cover every old "Before Week 1" item (K-9).
