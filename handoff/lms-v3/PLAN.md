# LMS v3: Phase 0 and Phase 1 (recon and plan)

Written for `IMPLEMENTATION-SPEC.md` Phases 0 and 1, against `main` @ `0ebeb971` (PR #218, the commit the spec was
audited on: no drift). Every number below was measured on this machine; nothing is copied from the package's own
results.

## Phase 0. Baseline

| Check | Result |
|---|---|
| `npm i && npm run build` | ✓. The build regenerates `src/lms.css`, `src/lms.tokens.css`, `src/components/icons.generated.js`, `mock.generated.js` and `mock-bar.css` byte for byte (compared with the delivered zip). |
| `mockup/index.html` sha256 | `0383d010513f2f7af819ed1a780b25075079b9d2e274a5405a22bfc77ad1562f`: the spec's. |
| Brand files in the repo | `apps/web/src/components/motion/ai-motion.css` `25f4fbfb…e054`, `ai-motion.tsx` `c1b8b25b…d6ea`: the package's, so the port imports the repo's copies (HANDOFF §3). |
| Chrome | Google Chrome for Testing 153.0.8010.12 (the package's runs: Chrome 153). |
| `npm run diff` (harness vs mockup, 264 checks) | ✓ **264 / 264 with no different pixel**, same sizes, run in six parts as HANDOFF §3 does: desktop 62 + phone 35 (week, form, top), desktop 54 + phone 32 (locked, Schedule), desktop 43 + phone 38 (Community, thread, Turn in). |
| `npm run pdf` | ✓ `pdf/week-0-intake.sample.pdf` reproduced: 3 pages, US Letter, `pdftotext -layout` identical to the delivered file. |
| Repo on `main` | ✓ `pnpm lint` (eslint and the six checks), ✓ `pnpm typecheck`, ✓ `pnpm test`: core 869, api 2,646 in 85 files (against a local Postgres, as CI's `api` job runs them), web 4,022 passed and 1 skipped. |

## Phase 1.1. §3 against `main` @ `0ebeb971`

Every row of §3 holds. Corrections and additions:

- **Shell.** `LearnerShell.tsx` is 530 lines as stated; the view-models are `navVM`, `sideVM`, `barVM` in
  `routes/learn/learn.vm.ts`. `sideVM.cohortLine` is one string ("December 2026 Cohort · Week 2 of 9"); the mockup's
  two lines are the program ("Amplified AI Accelerator") and the cohort and start ("December 2026 Cohort · Starts
  Dec 2"). §7.1 says to add the two parts to `sideVM` rather than split the string: done in Phase 3.
- **Bar.** `barVM` kind `next` only follows a **build** (`upcomingSessions(…, 'build')`). B-36's "next session of any
  kind" changes that rule for v3 only; today's shell keeps it.
- **Test learner.** The step page's rule is `v6On(me, flag) = flag || me?.test === true`. `v3On` is the same shape
  with `VITE_LMS_V3` (off unless `'true'`).
- **Locked week's calendar.** `LockedWeekVM.sessions.add` carries `ics: IcsEvent[]` (downloaded in the browser by
  `saveIcs`), not a URL. The mockup's plain button is an anchor (`calendarHref`), so Phase 5 builds a `blob:` URL from
  the same events (no new server route). The Schedule's Add all is the existing `/calendar/schedule.ics`.
- **Brand files.** Confirmed byte-identical (Phase 0). The academy logos (`brand/logos/`) are not in the repo yet
  except `favicon.svg`; the app lockups in the repo have older checksums (B-41).
- **The uploads and community patch** (§3's last row) is **not available to this build**: it is not on GitHub
  (no `feature/uploads-and-community` branch) and not among the uploaded files. Phases 9 and 10 take their server side
  from it. **Question for Connor:** upload `0001-uploads-and-community.patch` (or its bundle), or say to build that
  server side from scratch to this spec.

## Phase 1.2. Every prop, and where it comes from

`MISSING → B-xx` is a build item from §4.B; everything else is an expression over today's view-models.

### `AppShell` (§7.1)
| Prop | Expression |
|---|---|
| `shell.homeHref`, `helpHref` | `nav.home.href`, `nav.help.href` |
| `shell.logo` | `{ label: 'Amplified Impact Academy, Home', app, full, mark, use: 'app' }`; the three files inlined as `data:` URIs the way `BrandSlot` inlines today's. MISSING → B-41 (the academy app lockup files) |
| `shell.cohort[0]`, `[1]` | MISSING → `sideVM` gains `program` (the course's name) and `cohortStart` ("December 2026 Cohort · Starts Dec 2", or "· Week N of M" once it has started, by today's `cohortLine` rule) |
| `shell.nav[]` | `[home, schedule (nav.cohort), community (B-29, Phase 10), library, teamHub (side.teamHub), vault]` with the mockup's icons `home`, `cal`, `talk`, `grid`, `users`, `folder` |
| `shell.weeksLabel` | `'Weeks'` (D-227; `LABELS.employees` keeps "AI employees" for today's shell) |
| `shell.weeks[]` | `nav.employees.rows.filter(r => r.week !== null)`: `n: r.week`, `title: r.title` (the full title, not `label`), `href: r.href`, `id: 'week-' + r.week`, `status`: `r.status?.kind === 'ring' ? 'progress' : r.status?.kind === 'built' ? 'done' : 'idle'`, `done`/`total` from the week row (`WeekRow.done`, `.total`: the same numbers the ring's `text` prints), `locked: r.locked === true` for a locked week (B-38: `WeekRow.state === 'locked'`) |
| `shell.next` | `barVM` → MISSING → B-35/B-36: `label` by kind, `time`, `start` (ISO), `minutes`, `joinBefore` (15, D-183), `where` ("Zoom"), `joinHref` (`/api/sessions/:id/join` as `Join` uses today), `calendar[]` = .ics (`saveIcs`), Google, Outlook (MISSING → B-05: per-session Google and Outlook links, built from the session as `parts.tsx › CalLinks` builds them) |
| `shell.account` | `{ initials: fmt.initials(me.name), aria: LABELS.account, onClick: toggle today's Menu, open }` |
| `shell.here` | the hidden breadcrumb's current page, as `LearnerShell` computes it today |
| `defaultCollapsed`, `onCollapse` | `useLearnerPrefs().sidebar === 'rail'`, `setSidebar(on ? 'rail' : 'full')` |
| `current` | `nav` row with `active`: `'schedule'`, `'community'`, `'week-N'`; `undefined` elsewhere |
| `hideNext`, `now` | `pathname === learnSchedule()`; `() => useNow(15_000)`'s value |

### `SchedulePage` (§7.2)
| Prop | Expression |
|---|---|
| `sub`, `title` | `vm.lede`, `vm.weeks.heading` |
| `calendarHref` | the Calendar view's href (`?view=calendar`) |
| `calendarAllHref` | `/calendar/schedule.ics` (B-05: a plain anchor) |
| `next` | `vm.hero` → MISSING → B-07: `week`, `kind`, `title`, `day`/`date` (`tile`), `when`, `length`, `where`, `start` (ISO), `minutes`, `joinBefore`, `joinHref`, `weekHref` (`hero.see.href`), `cta`, `calendar[]` |
| `groups[].rows[]` | `vm.weeks.groups` → MISSING → B-08 (`status`, `done`, `total`, `next`, `live`, the Due tile) and B-37 (each session's `state`, `replayHref`) |

### `WeekPage` (§7.3) and `LockedWeekPage` (§7.7)
| Prop | Expression |
|---|---|
| `n`, `title`, `open` | `vm.week`, `vm.title`, `vm.pill.tone !== 'done'` |
| `question`, `purpose` | `weekContentVM(…).question`, `vm.lede` |
| `crumbs[]` | `crumbsVM(vm.title, vm.week)` |
| `tags[]` | pace (`Self-paced`, or the session line), `who` ("Owners and operators"), due (`fmt.*` of the module's `dueAt`) |
| `steps[]` | `row.steps.map(s => ({ n, title: stepTitle(s), href: learnStep(week, n), role: s.step.who, who: stepRoles(s.step.who) (MISSING → B-09), time: s.step.timeLabel ?? duration(s.step.mins), minutes: s.step.mins, doneWhen: s.step.doneWhen, status: stepChecklistStatus(…), waitsOn: waitingOn(…) (B-22) }))` |
| `roles[]` | MISSING → B-09/B-10: counts and summed minutes per role |
| `deployed`, `deployedWhen`, `platform` | the module's deployment row (`me.progress[moduleId].deployed`); `homework.acceptance` joined; `module.platform` |
| `kit[]` | MISSING → B-13 (`kitGroups`): Skills from `skillRow` (+ the build kit's zip), Files from `kitRow` (the intake as a form row, B-14), For your AI from `buildKitVM(…).prompt` |
| `note` | the instructor's initials, name and the two sentences of `why` |
| `supportEmail`, `libraryHref`, `next` | `helpVM(p, now).email.address`, `learnSkills()`, `weekContentVM(…).pager.next` |
| `reference[]` | `weekContentVM(…).sections` by id into the seven accordions (§7.3) |
| `onDeploy(on)` | `markDeployed` / MISSING → B-11 `unmarkDeployed` |
| Locked: `opens`, `opensAt`, `question`, `sessions[]`, `calendarHref`, `back` | `vm.pk` without its " · Week N" tail; the week's `opensAt` as ISO; `vm.headline`; `vm.sessions.rows`; a `blob:` URL of `vm.sessions.add.ics`; "Back to Week N" to the learner's current open week |

### `useForm` (§7.4)
`form.intake` = the open week's `intake` (MISSING → B-16 `required`); `form.ui` = the package's `ui` as constants;
`initial` from `GET /api/intake` (`status`, `answers`, `savedLabel`, `submittedShort` through `fmt`); `onSave` /
`onSubmit` = `PUT /api/intake`; `onDownloadPdf` = `GET /api/intake/pdf` (MISSING → B-18, waits on Q-14).

### Community, Turn in (§7.5, §7.6)
From the patch's API. Blocked until the patch is available (1.1).

## Phase 1.3. Tests and goldens that assert today's DOM

They keep passing in every phase: v3 draws only when `v3On` (the build flag, off by default, or the test learner),
and the fixture builds don't set the flag. Each phase adds its own tests beside them. They are retired with the old
screens in Phase 11, by a DECISIONS entry:
`LearnerShell.test.tsx`, `shell.vm.test.ts`, `Week*.test.*`, `WeekContent*.test.*`, `Schedule*.test.*`,
`Intake.test.tsx`, the 17 `compliance/tests/e2e/learn-v2*.spec.ts`, and `compliance/parity/learner-parity.json`
(178 entries). `WeekContent.sync.test.ts` gains the v3 page in Phase 5 (each stored word reaches it or is named).

## Phase 1.4. Week 0 in production, against C-06 to C-13

Read-only access to production's Week 0 needs a staff session or the builder's export, which this build doesn't
have. From the seed, the data steps and the pages Connor has shown: Week 0 has `why`, `media` (the three
"to be recorded" placeholders), a pager and no sample output, seat card, playbook card, `graduation` or `after`.
UX-AUDIT maps or leaves out each of those for Week 0, so Week 0 passes `v3WeekDraws` as the audit intends.
**To confirm:** Connor, or a staff export, that production's Week 0 has nothing else in C-12.

## Phase 1.5. DECISIONS entries

D-225 to D-231 are approved (§5.0) and are written in the phases that use them: D-225 in Phase 2, D-226 and D-227
in Phase 3, D-228 in Phase 5, D-229 in Phases 6 and 8, D-230 in Phase 9, D-231 in Phase 10. D-232 (live sessions
and locked weeks) and D-233 (the academy logos) wait for Connor (Q-13, Q-16). Nothing in §5.1 is contradicted by
the repo.

## Phase 1.6. The patch

Not available (1.1). Phases 9 and 10 wait for it.

## Found while building

- **Seed against the package's words** (every field of `sampleWeek`, `sampleSchedule`, `sampleShell` and the intake,
  diffed in code after the curriculum seed and all twelve data steps). The schedule, every week title, outcome,
  question and open date, the holiday row, the cadence, the intake's 22 questions and nearly all of Week 0 match.
  **Content that differs** (a data question, not code; production's Week 0 is the builder's and may differ again):
  step 6 is 25 min in the seed and 30 min in the mockup (so 2 hr 50 min in all and the operator's 2 hr 20 min are
  2 hr 45 min and 2 hr 15 min); the eight done-when lines have no final period in the seed; Map Your Spend and Lead
  Source Review aren't linked to step 4; the kit's files (Week 0 Intake Form, Week 0 Stack Card, Time Baseline as
  Excel and CSV, Test Hire Sample Week) and the two skill zips have no resource rows. `prepare.ts content` writes the
  mockup's values on a development database only.
- **"Waiting on step 6" has no content to read.** B-22 settles it from `s5c-drive` waiting on `step:6:s6-google`, but
  neither id is in the seed or a data step (only in test fixtures). The v6 page's own setup makes step 5 wait on step
  4. If production's Week 0 has the dependency, it was entered in the builder; if not, step 5 never shows waiting.
  **Question for Connor.**
- **The nav's check means deployed.** The mockup's week 0 row keeps the ring at "8 of 8" until Mark as deployed;
  §7.1 maps the repo's `built` (every step done) to the check. The mockup wins: `deployedAt` → check, a step done →
  ring.
- **The cohort's stored name carries the program** ("Amplified AI Accelerator · December 2026"), so `cohortLine`
  prints one long line. `sideVM` gains `program` and `cohortOnly` (the same rule without the program's lead), as §7.1
  says, rather than splitting in the component.
- **From the first build on, the cohort line changes.** On the mockup's live, ended and next-day clocks (Dec 2–3) the
  repo's rule says "December 2026 Cohort · Week 1 of 8"; the mockup keeps "Starts Dec 2". **Question for Connor**
  (it decides those states' sidebars).
- **The phone tap floor.** The app's global `styles/lms.css` gives every button and field 44 px (48 px primary) on a
  phone through `--tap` on `:root`, which raises the package's 32 px buttons. D-225 exempts these surfaces (the step
  page's precedent): the v3 frame sets `--tap` to nothing around the package's markup and hands it back to today's
  pages inside the shell. No stylesheet changes.
- **The seeded test learner has early access**, which opens every week, so locked weeks can't be drawn for it. The
  mockup's learner has only Week 0 open: the reset turns early access off and the dev cohort's preview on. In the
  pre-launch preview the nav's **Resource vault is locked** ("opens …"); the mockup draws a plain link. C-05 says stop
  on the vault's lock: **question for Connor**. The v3 shell draws the mockup's link for now.
- **The test learner's sidebar and theme** are in `users.prefs` (D-185), not `learner_prefs`: the reset clears both.
- **`--selector '[data-ai="shell"]'` can't gate the sidebar** on a desktop. The test measures the first visible
  shell element (the sidebar, 248 px) and gives the mockup's sidebar the rest of the width, so the two never line up.
  The shell is gated full page instead, on the week and Schedule routes, once their pages land; until then element
  comparisons of the sidebar and the top bar (0 different pixels at 1440 and 390, the phone menu open) stand in.
- **The phone tap floor is `min-width` and `min-height`**: the frame sets `--tap` to `auto` (their initial value),
  not 0, which would let the account button shrink in the phone header.
- **The time on a session's line.** In the sample only Week 1's live build line reads "Wed, Dec 2 · 1:00 PM CT"; the
  rest give the day. It is today's Join row for the next session, moved into the line (UX-AUDIT, Schedule): the hero's
  session carries its time. On the mockup's ended and next-day clocks the sample keeps that line as it is and gives
  the office hours none; with the rule, the office hours (then the hero's) get theirs. Part of the live-state
  questions (Q-13).
- **The Schedule keeps today's page** (C-13) while a row needs "attended live" (staff record it at End Session), a
  session other than a live build has its recording posted ("Recording Posted"), or a row's Join is for a session
  other than the hero's. After the first build, as soon as staff record attendance, that is every day: **question for
  Connor** whether "attended live" can be left out of v3 rows.
- **The app's global link rule** (`styles/global.css`: a link with no class is underlined on hover) reached the
  package's class-less links (a calendar menu's items, the breadcrumb). `lms-v3/frame.css` undoes that one rule
  inside the frame, at its own specificity, before `lms.css`. **For Connor to confirm** (D-226).
- **"Open" stays on a deployed week.** The sample's week is `open: true` in every state, deployed included; §7.3's
  `vm.pill.tone !== 'done'` would drop the chip once every step is done. The mockup wins: an open week says Open.
- **The kit's carriers** (B-13, B-13a). No zip or Excel file exists for Week 0. The rule built: a kit file titled as a
  skill is that skill's zip; files sharing a title are one row with a button per file, named by the file's type (the
  Vault's XLSX, CSV, ZIP). `prepare.ts` writes the mockup's files as rows on development. **Question for Connor:** is
  that how he wants to enter them in the builder, and is there an Excel Time Baseline to upload?
- **"Steps 3 and 5 can run alongside the others."** has no field of its own: it is the Start Here card's hint after
  its first sentence, and the all-roles summary reads it from there.
- **Weeks with live sessions keep today's page.** The mockup's only week is self-paced; its tags ("Self-paced",
  "Owners and operators", the due date) have no words for a week with a live build. Weeks 1 to 8 open from Dec 2:
  **question for Connor** (a tag for a live week needs a mockup).
- **Locks and session states follow the server's clock**, not the one the test pins in the browser. The
  `--assume-clock` states need data seeded for that moment, and the sidebar's cohort line (above) moves with the
  browser's clock.

- **The Community nav row is in every shell state.** `sampleShell` (and so every `nav-*` and `top-*` check) draws
  Community under Schedule, but Community is Phase 10. Phase 3's shell gate can't reach zero different pixels until
  the row exists. Plan: Phase 3 builds the row from the nav view-model (B-29's nav half) behind the same flag, linking
  to `/learn/community`, which renders nothing new until Phase 10.

- **Accessibility: one serious axe finding, in the mockup itself.** The step list's "Done" chip
  (`.wk-st[data-s="done"]`, #1f8a5c on white at 13 px) is 4.33:1 against axe's 4.5:1. The approved mockup has the same
  finding, so the port reproduces it. The Schedule, the locked week and the open form drawer have none. CLAUDE.md asks
  for zero serious findings; the mockup's colour can't change without a new mockup. **Question for Connor.**
- **Q-09** screenshots: `screens/q09/`.

## Questions for Connor
1. The uploads and community patch (1.1).
2. Q-13 to Q-17 (spec §5.2), unchanged.
3. Week 0's production content against C-12 (1.4), and the content differences above (step 6's time, the periods,
   the kit's files and zips).
4. Step 5's "Waiting on step 6": is the dependency in production's Week 0?
5. The cohort line on and after Dec 2 ("Week 1 of 8" by today's rule, "Starts Dec 2" in the mockup).
6. The Resource vault's pre-launch lock, which the mockup doesn't draw (C-05).
7. The "Done" chip's contrast (4.33:1, in the mockup too): keep the mockup's colour, or a new mockup with a darker green?
