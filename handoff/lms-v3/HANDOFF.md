# LMS shell, week overview, locked weeks, Schedule, form drawer, Community and Turn in: handoff (v7) for Claude Code

> **v7 (Nov 21, 2026). One logo; the rail shows its "ai".** Connor: "collapse it to where the Academy gets cut off
> and we use the AI as the logo itself." The sidebar has one image, the "ai academy" lockup at 161×34. When the
> sidebar collapses, the link around it closes like a window from the right, on the column's own curve, until 26 px
> are left: the "ai", centred over the rail's icons. Opening, the window opens back over "academy". The favicon
> drawing, the cross-fade and the black bar's **Logo** buttons (the full-name lockup to compare) are gone; the
> "ai academy" lockup is the one. **260 checks** now (the three `nav-logo-full*` states left with the buttons).
> Where the v6 notes below say otherwise about the rail's logo, this note wins.
>
> **Correction, Nov 21, 2026: staff and the Community.** In `main` a staff member moderates inside the learner
> Community, in the v3 frame (D-231). Connor has since chosen an admin page for it: **Admin › Support › Community**
> (`handoff/admin-mockup/`; `IMPLEMENTATION-SPEC.md` R-3, B-45, D-235). The door in the learner frame stays until
> that page is live and Connor answers Q-20. Nothing in the mockup, the port or the checks changed for this.
>
> **v6 (Nov 20, 2026, evening).** Three changes Connor asked for after seeing v5:
> - **The academy logos.** The typed wordmark is gone. Open sidebar and phone header: the "ai academy" app lockup,
>   161×34. Collapsed rail: the favicon drawing, 28×28. The black bar's **Logo** buttons swap in the full "amplified
>   impact academy" lockup (205×20) to compare. The files are in `brand/logos/`, byte for byte, with checksums.
> - **The sidebar collapses and opens in motion** (the brand's tokens: 380 ms closing, 560 ms springing open; the
>   labels fade, the logos cross-fade in place, and the icons and week numbers glide between the two layouts). In the
>   rail the mark is centred.
> - **Week numbers in the sidebar are in Geist**, not Geist Mono.
>
> **v5 (Nov 20, 2026), after Connor's answers.** Approved in full; reproduced pixel by pixel; nothing varies
> (his words are at the top of `IMPLEMENTATION-SPEC.md`). What changed since v4:
> - **Waiting** now reads "Waiting on step 6" (a box in step 5 needs step 6's Google connection). "Coming soon" is gone.
> - **Add all to calendar** is one plain button. No Google or Outlook item there.
> - **Weeks 5 to 8** carry their real titles, outcomes and sessions.
> - **Turn in** left the week page. The drawer opens from the step's button; the team sees no staff status.
> - **New: a session starting, live and over.** The top bar says Starting soon, then Live now, with Join on Zoom; the
>   Schedule's hero, week row and session lines follow (Live now, Replay processing, Watch replay). The black bar's
>   **Clock** moves "now" so each can be seen.
> - **New: locked weeks.** A lock and a quieter row in the nav; a page for the locked week (`#week-1` … `#week-8`).
> - The two new designs are the only things Connor has not seen drawn. Everything else is his approved v4 plus his answers.
> - Not in this build, each a later pass: dark mode, the account dropdown, admin views. No Run / Pause / Resume at all.

> **`IMPLEMENTATION-SPEC.md` is the plan for building this in the repo.** It was written after auditing
> `connor-leiva/amplified-impact-lms` and it governs process, phases, gates and every repo-specific decision. This
> file describes the design. Where the two differ on how to build, the spec wins.

**Goal:** make the app shell (side nav and top bar), `learn.amplifiedimpact.io/learn/week/N`, `/learn/schedule` and
the form drawer look, read and move exactly like `mockup/index.html`.
v1 was the week overview alone. v2 added the shell and the Schedule. v3 adds the **form drawer**: forms that were
"download a PDF and fill it in" open in a drawer, save as you go, sync to the learner's profile and to GHL, and
download as a branded PDF (§1d, §9).
These are redesigns, not restyles. `UX-AUDIT.md` says what moved where and why.

**Source of truth, in this order:**
1. `mockup/index.html` (with `mockup/ai-motion.css`): looks and behaviour. `#week-0` is the week overview,
   `#schedule` is the Schedule. Both sit in the same shell.
2. `brand/ai-motion.css`, `brand/ai-motion.tsx`, `brand/motion-tokens.json` (Amplified Impact Motion v1): how things move.
   The mockup uses them unchanged.
3. `src/` (React): renders the mockup with **no different pixel** in 260 checks (`npm run diff`).
4. `src/pdf/form-pdf.js` and `pdf/week-0-intake.sample.pdf`: how the PDF looks.

This file describes. It never overrides 1 to 3.

## 0. How to work
- **Port, don't redraw.** Copy `src/WeekPage.jsx`, `src/SchedulePage.jsx`,
  `src/components/{AppShell,CalMenu,FormDrawer,Hero,StepList,Kit,Reference,Icons}.jsx`, `icons.generated.js`,
  `src/forms/`, `src/pdf/form-pdf.js`, `src/lms.css` and `src/lms.tokens.css`. Convert to TSX and nothing else: same class names, ids, DOM order and CSS values.
- **Don't ship** `MockBar.jsx`, `mock.generated.js` or `mock-bar.css` (the black MOCKUP bar).
- **Use the brand files as they are** (`src/motion/`, sha256 in §3). If the LMS already has them (the step page
  ships them), use those copies if the checksums match.
- **Never write CSS or motion from a description**, from memory, or from a screenshot. To change a value, change
  `mockup/index.html`, run `npm run build`, and re-run the test.
- **Done means the test passes against the deployed pages** (§6).

## 1a. The shell
| Part | What it is |
|---|---|
| Side nav, top | The academy app lockup, "ai academy", 161×34 (links home; named "Amplified Impact Academy, Home"), cohort in two lines. An image file, never typed or redrawn. |
| Main links | Home, Schedule, Skill library, Team Hub, Resource vault, **Weeks**. Icon + label. |
| Weeks | A nav row like the five above it, with its own icon, the count and a chevron; it folds. The nine weeks fall in under it, indented along a guide line that drops from the icon. The row turns forest when the current page is one of its weeks. Each week has its **number** (0 to 8) and its **full title**; a long title wraps to a second line instead of being cut off. A week shows a status only when it has one: a progress ring and "7 of 8", or a check when it's deployed. Nothing for a week that hasn't started. |
| Current page | One 2 px forest marker on the sidebar's edge, plus a tint and forest text. The marker springs from the old item to the new one. |
| Foot | Get help; Collapse sidebar (a 64 px rail: icons including Weeks, the lockup cut to its "ai" (the same image through a 26 px window), and the week numbers as white chips in a bone tray under the Weeks icon; no guide line there; the button then reads Expand sidebar). It travels as one move: the column narrows, the labels fade, the logo's window closes over "academy" until only "ai" is left, and the icons and numbers glide into the rail as the edge arrives; opening springs back. `IMPLEMENTATION-SPEC.md` B-43 has the timings. |
| Top bar | "Next live build", its title, its date and time, and **one** Add to calendar menu (Calendar file, Google Calendar, Outlook). The account menu's trigger (the learner's initials and a chevron) on the right. On the Schedule page this strip is hidden: the hero right under it is the same session. |
| ≤ 900 px | The nav folds behind a Menu button in the brand row; the cohort lines and Collapse are hidden. |

## 1b. The Schedule
| Part | What it is |
|---|---|
| Header | "Schedule"; the rhythm in one line; Weeks / Calendar; **Add all to calendar** (one plain button that downloads the calendar file: no menu). |
| Hero | The next session, once: date tile, "Next · Week 1 · Live build", title, when · length · where. Until the join window opens: **Add to calendar** (menu) and "Join opens 15 minutes before." From 15 minutes before: **Join on Zoom**. After the start: "Live now", Join on Zoom, "Started N min ago". When it ends the hero moves to the next session, whatever its kind (office hours: "Next · Week 1 · Office hours", second action **Open Week 1**). Second action for a build: See what you'll build. Beside it the countdown in two units (11 days 21 hr → 3 hr 0 min → 9 min). In a week's row: the status on the right is **Live now** while one of its sessions is live; a session's line ends with its day, then **Live now**, then **Replay processing**, then a **Watch replay** link. |
| Nine weeks | Grouped by month ("Now", December 2026, January 2027, February 2027). One row per week, the whole row a link: date tile (week 0: "Due 30"), "Week N · Title", the week's outcome, then its sessions one per line (icon, name, date). Right side, the week's **status**: a bar and "1 of 8 done" (with an "In progress" chip by the title) for the week in progress; "Deployed" with a check when done; a forest **Next** pill on the week of the next session; a quiet **Upcoming** pill on the rest. No step counts. |
| Holiday break | A quiet row with a dashed tile, between the weeks it separates. |
| ≤ 640 px | The toggle and Add all stack under the title; the countdown drops under the hero; sessions stack name over date. |

## 1c. The week overview, top to bottom
| Part | What it is |
|---|---|
| Header | Breadcrumb; "Week 0" + Open chip; title; the week's question; the goal line; three tags (pace, who, due in the viewer's time zone). |
| Hero | The one primary action. Steps left: "Up next · Step N of 8", title, time and role, "Done when …", **Start step N** (or **Continue step N** once it's in progress), for the first step that isn't done. All done: **Mark as deployed**. Deployed: the brand mark, "Your office is ready for its first hire.", **Go to Week 1**, Undo. Beside it: steps done (count, eight segments, time left). |
| Step list | One list. Filter: All / Owner / Operator, each with its count and a one-line summary. Each row: number circle, title, role chip, the step's "done when" line, status chip, time, chevron. The last row is deployment: "N steps to go", then Ready, then Deployed. |
| Kit (rail) | Skills, Files, For your AI, in step order. Link rows open; extra actions are buttons (Zip, Excel, CSV, View, Copy). "Open your Skill Library". |
| Note, Questions (rail) | The instructor's two sentences; the support address. |
| Reference | Seven accordions, closed. Then the Next week card. |

Step states (the step page's vocabulary): **done** = energy circle with a check, title at 60 %, "Done". **Up next** = the
first step that isn't done: forest circle, forest marker and tint, "Up next" chip. **In progress** = white circle with an
energy ring, mint chip. **Waiting on step N** (status `waiting`: one of the step's boxes needs another step first) = dashed circle, bone chip. It is still a step you can open, and it is "Up next" when it is the first one not done.
**Not started** = bone circle, no chip.

Widths: the rail drops under the steps at 1100 px; the hero stacks at 820 px; phone padding and stacked rows at 640 px.


## 1d. The form drawer
Opened from the kit row "Week 0 Intake Form" (one button: **Fill in**, then **Continue**, then **View**; the row's
line says "22 questions", "9 of 22 answered" or "Submitted Nov 20"). The questions are the LMS's own Week 0
intake (`packages/core/seed/intake-v1.ts`: 22 questions in 5 sections), in the LMS's own `CourseIntake` shape.

| Part | What it is |
|---|---|
| Drawer | The brand's Drawer (05): slides in from the right over a scrim, 560 px wide (full width at 640 px and under). Escape, the scrim and Close close it; focus stays inside and returns to the button. |
| Head | Kicker ("Week 0 · Step 1 · Owner and operator"), title, one line of help, Close. Under it: a bar and "9 of 22 answered", and the save status on the right ("Saving", then "Saved 3:18 PM"; "Submitted Nov 20, 3:18 PM" once submitted). |
| Body | The intake's opening paragraph, then numbered sections (01 You and Your Team …). Fields by the LMS's kinds: `short` (one line), `long` (text area), `choice` (one-of chips), `multi` (several-of chips: a plus that turns into a check; the intake has none today, so this kind has no pixel state). Optional questions say "Optional"; `required` ones don't. |
| Saving | Every change saves by itself: 700 ms after the last keystroke, at once for a chip, and on close. There is no Save button. |
| Submit | **Submit intake** checks the required answers. Missing ones shake, get a one-line message, the first is focused, and the foot says "2 answers still needed". Otherwise the button shows the sweep, then the mark and "Submitted"; a banner arrives at the top; the button becomes **Done**. Answers can still be changed afterwards and save the same way. |
| Download PDF | Always available (a draft downloads as a draft). The button shows the sweep, then "Downloaded". |

## 1e. The Community (`#community`, `#thread-N`)
One community per cohort, inside the shell, under Schedule in the nav. Made-up people only in the mockup: Alex Morgan
of Northline Realty (the viewer), Dana Whitlock of the skills' Sample Team, and Connor as staff. The black bar's
**View as** switches between a member and staff. Staff are moving to a Community page in the admin (see the correction at the top).

| Part | What it is |
|---|---|
| List | Title, one line of purpose, **Start a thread**. Space chips: All, General, one per week that's open to the viewer, Wins. Pinned threads, then threads by newest activity. A row: avatar (staff are forest), title, "who · team · space", the first lines, "2 replies · 3 hr ago". How this works in the rail, ending "Nothing here is emailed." |
| Thread | Back to Community and the space; the title; the first post; replies; Reply. Your own posts have Edit and Delete; Delete asks in place ("Delete this reply?"). An edited post says "edited". About this thread in the rail. |
| Start a thread | The brand's drawer: Space (chips), Title, Details, the reminder that the whole cohort reads it, "Posting as …", **Post thread** → the mark and "Posted" → the new thread opens. Missing answers shake and say what's needed. |
| Staff | The same pages. A Staff tag on their posts. A staff-only card on a thread: Pin / Unpin, Hide / Show thread. Hide / Show and Delete on any reply. Hidden threads and replies stay visible to staff, dimmed, with a Hidden tag. **In `main` a staff member reaches these in the v3 frame (D-231); the admin's Community page (R-3) is where Connor wants staff to work.** |
| Not here | No reactions, mentions, attachments, search, notifications or email. |

## 1f. Turn in (black bar › Open turn in)
How a team sends Connor what a step asks for. Two kinds today: a **report for a live read** and a **checkpoint**.
The drawer opens from the step's button. The step page isn't in this mockup, so the black bar opens it: Report and
Checkpoint are Week 1's two asks (step 4 and step 6); Turned in shows what the team sees afterwards.

| Part | What it is |
|---|---|
| Where it opens | **Only from the button on the step that asks for the file** (Connor, Nov 20). There is no card on the week page. The step page isn't in this mockup, so the black bar's "Open turn in" opens the drawer here. The step's button is the step page's own action button, labelled **Turn in**, or **View** once something is turned in. A teammate who isn't the owner or operator has no button: the step shows "Your team's owner or operator turns this in." |
| Drawer | The brand's drawer with the brand's upload (16). Drop files or Choose files; each file gets a row with its own progress hairline, then a check and "Uploaded"; remove with the ×. PDF, HTML report, PNG, JPG, Excel or CSV; 25 MB each; 5 files. A live read carries a line that the whole cohort will see it. A note; for a checkpoint, the minutes the hire took over. **Turn it in** is dimmed until every file is up. |
| Turned in | "Turned in." with when and who; "Goes to Connor's team. Nothing is emailed."; the files; the note; **Turn in a new version**. **No status**: the team never sees what staff did with it. |
| On the step page | Nothing else changes. |
| For Connor | What teams turn in is read on the staff side (`IMPLEMENTATION-SPEC.md` C-20). The admin console isn't in this mockup. |

## 2. Props
Shapes and sample values are in `src/sample-data.js` (`sampleShell`, `sampleSchedule`, `sampleWeek`).

### `AppShell({ shell, current, hideNext, children })`
| Prop | Meaning |
|---|---|
| `shell.homeHref`, `helpHref`, `cohort[2]` | Brand block and Get help. |
| `shell.nav[]` | `icon`, `label`, `href`, `id`. |
| `shell.weeksLabel`, `shell.weeks[]` | `n`, `title` (full, never pre-cut), `href`, `id`, `status` (`idle` / `progress` / `done`), `done`, `total`, `locked` (a lock, a quieter row; `href` is the locked week's page). |
| `shell.next` | The next session, or `null`: `label` ("Next live build"), `title`, `when`, `time`, `where`, `start` (ISO), `minutes`, `joinBefore`, `joinHref`, `calendar[]`. The strip's mode (`wait` / `join` / `live`) comes from `start` and `now`, or pass `mode`. |
| `shell.account` | `initials`, `aria`, `onClick`, `open`: the account menu's trigger (the learner's initials, "CT" in the mockup). The menu itself is the LMS's own and isn't in the mockup. |
| `shell.here` | The current page's name, for the header's visually hidden breadcrumb. |
| `current` | The `id` of the page being shown; sets `aria-current="page"` and the marker. |
| `hideNext` | True on the Schedule page. |
| `now` | `() => ms`. Defaults to `Date.now`. |

### `SchedulePage({ schedule, now })`
| Prop | Meaning |
|---|---|
| `schedule.sub`, `title`, `calendarHref`, `calendarAllHref` | Header. `calendarHref` is the existing Calendar view; `calendarAllHref` downloads every session as one calendar file. |
| `schedule.next` | `week`, `kind`, `title`, `day`, `date`, `when`, `length`, `where`, `start` (ISO, UTC), `minutes`, `joinBefore` (minutes), `joinHref`, `weekHref`, `cta` (the second button's words), `calendar[]`. |
| `schedule.groups[]` | `label`, `note`, `rows[]`. A week row: `week`, `title`, `href`, `tile[2]`, `outcome`, `sessions[]` (`icon`, `title`, `when`, and for a session with a clock time `state`: `live` / `processing` / `replay` / `ended`, with `replayHref`), `live` (one of its sessions is live), `status` (`idle` / `progress` / `done`), `done` and `total` (for the bar), `next` (true on the one week that holds `schedule.next`). A break row: `break`, `text`. |
| `now` | `() => ms`. Defaults to `Date.now`. The hero's mode and countdown come from `now()` and `next.start`; it re-reads every 15 s. |

A week's `status`, `done` and `total` must come from the same source in the nav, the Schedule row and the week
overview. Don't keep three copies.

### `useForm({ form, initial, onSave, onSubmit, onDownloadPdf })` and `FormDrawer({ f, open, onClose })`
| Prop | Meaning |
|---|---|
| `form` | `{ id, ui, intake }`. `intake` is the LMS's `CourseIntake`: `intro`, `sections[]` of `title`, `intro`, `questions[]`; a question: `id`, `label`, `help`, `kind` (`short` / `long` / `choice` / `multi`), `options[]`, plus **`required`** (new). `ui`: the drawer's own words (`title`, `kicker`, `sub`, `submitLabel`, `submittedTitle`, `submittedText`, `optional`, `needText`, `needChoice`). |
| `initial` | `status` (`new` / `draft` / `submitted`), `answers` (`{ fieldId: string or string[] }`), `savedLabel`, `submittedShort`. From the API when the page loads. |
| `onSave(answers)` | Returns a promise. The whole answers object, every time. |
| `onSubmit(answers)` | Returns a promise. The server validates again. |
| `onDownloadPdf()` | Returns a promise that resolves when the download has started. |
| `f.row` | `{ meta, label }` for the kit row (`withForm()` in `sample-data.js` shows how it is put on the row). |

### `CommunityPage`, `ThreadPage`, `StartThreadDrawer` (`src/components/Community.jsx`)
Props are listed at the top of the file and mapped to the API in `IMPLEMENTATION-SPEC.md` §7.5. Sample data:
`src/data/community.samples.json`. The harness (`harness/main.jsx`) shows the wiring, with a stand-in for the API.

### `TurnInDrawer` (`src/components/TurnIn.jsx`)
Props at the top of the file; mapping in `IMPLEMENTATION-SPEC.md` §7.6. Sample data:
`src/data/turn-in.samples.json`. Open it by setting `askId` from the step's button.

### `LockedWeekPage({ week, now })` (`src/LockedWeekPage.jsx`)
What a locked week shows. Props at the top of the file; mapping in `IMPLEMENTATION-SPEC.md` §7.7. Sample data:
`sample-data.js › sampleLockedWeek(n)`.

### Session timing (`src/components/session.js`)
`sessionMode`, `sessionState`, `countdown`, `addLabel`: pure functions of a session and "now", shared by the top bar,
the Schedule and the locked week. The LMS can call them or pass the answers in (`next.mode`, `session.state`).

### `WeekPage({ week, labels, onDeploy })`
`WeekPage({ week, labels, onDeploy })`. Shapes are in `src/sample-data.js`.

| Prop | Meaning |
|---|---|
| `week.n`, `title`, `open`, `question`, `purpose`, `crumbs[]`, `tags[]` | Header. `tags[].label` for the deadline is already formatted in the viewer's time zone. |
| `week.steps[]` | `n`, `title`, `href`, `role` (chip words), `who` (`'owner'`, `'operator'` or both: drives the filter), `time` (words), `minutes` (number, for "time left"), `doneWhen`, `status` (`done` / `progress` / `waiting` / `idle`). `waiting` means the step isn't built yet; learners see "Coming soon". |
| `week.roles[]` | The filter: `id`, `label`, `count`, `summary`. |
| `week.deployed`, `deployedWhen`, `platform` | The finish line. |
| `week.kit[]` | Groups of rows: `icon`, `title`, `meta`, `href` (link rows), `tags[]`, `acts[]` (`icon`, `label`, `onClick` or `copyText`). |
| `week.note`, `supportEmail`, `libraryHref`, `next` | Rail and footer. |
| `week.reference[]` | `title` + `blocks[]` of type `ul`, `dl`, `scale`, `fine`. If the LMS stores this as rich text, render it into the same classes (`wk-ul`, `wk-dl`, `wk-scale`, `wk-fine`). |
| `onDeploy(on)` | Persist Mark as deployed (true) and Undo (false). The UI updates first. If the API can't undo, remove the Undo button and tell Connor. |

"Up next" is computed: the first step whose status isn't `done` or `waiting`. Steps done, time left and the deployment row's state
are computed from `steps` too. Don't pass a second copy of any of them.

## 3. Files
| File | What it is |
|---|---|
| `mockup/index.html`, `mockup/ai-motion.css`, `mockup/fonts/` | The pages. The black bar's Preview buttons switch the learner between 1 of 8, 7 of 8 (step 5 left), 8 of 8 and Deployed; the nav and the Schedule follow. **Clock** moves "now" around the first live build (9 min before, live, just ended, next day). **Open turn in** opens the upload drawer. |
| `brand/` | Amplified Impact Motion v1 as delivered. |
| `src/components/AppShell.jsx`, `CalMenu.jsx` | The shell; the calendar menu (brand `Popover`). |
| `src/SchedulePage.jsx`, `src/WeekPage.jsx`, `src/components/{Hero,StepList,Kit,Reference,Icons}.jsx` | The two pages. |
| `src/motion/ai-motion.css`, `ai-motion.tsx` | The brand files, byte-identical. Load the CSS before `lms.css`. |
| `src/lms.tokens.css`, `src/lms.css` | Generated from the mockup (`npm run css`). Tokens are the step page's `--sp-*` names and values. Classes: `sh-*` shell, `wk-*` week overview and shared pieces (buttons, chips, hero, segmented control), `sc-*` Schedule. |
| `src/components/FormDrawer.jsx` | `useForm()` and `<FormDrawer>`. |
| `src/components/Community.jsx`, `TurnIn.jsx`, `src/data/*.samples.json` | The Community (list, thread, Start a thread) and Turn in (card, upload drawer), with their made-up sample data. |
| `src/forms/week-0-intake.json`, `.samples.json` | The drawer's words and a copy of the LMS's intake (22 questions) with six marked `required`; three sample states (new, draft, submitted) with made-up answers. |
| `src/pdf/form-pdf.js`, `tools/make-pdf.mjs`, `pdf/` | The PDF: a function that returns print-ready HTML, the script that prints it with headless Chrome (`npm run pdf`), and the sample output. |
| `src/sample-data.js` | Props, word for word from the mockup, in four learner states. |
| `harness/` | `/harness/` = the mockup's full page in React (`#week-0`, `#schedule`). `/harness/?lms` = no MOCKUP bar; `?lms&state=s7`, `s8` or `deployed` picks the learner state. |
| `diff/pixel-diff.mjs` | The test. |
| `UX-AUDIT.md` | What was wrong, what changed, where each old piece went, what was left out. |
| `results/` | My runs. |

Brand checksums (sha256): `ai-motion.css` `25f4fbfb9ff4eda379af32c8135ecb22999186abf4c993edd2e1b6439ba3e054`,
`ai-motion.tsx` `c1b8b25b5504c1bf78ebaa301962e3ad7b6575ec6e4e1dee2a90f3160a13d6ea`.

```
npm i
npm run build     # regenerates the CSS and icons from the mockup, then bundles the harness
npm run serve     # http://localhost:4178/harness/  and  /mockup/index.html
npm run diff      # harness vs mockup, 260 checks, about 30 minutes. In six parts:
                  #   -- --viewports desktop-1440 --match '^(?!cm-|th-|ti-|top-|lk-|sched-)' --tag d1   (and phone-390 … --tag p1)
                  #   -- --viewports desktop-1440 --match '^(top-|lk-|sched-)' --tag d1b                (and phone-390 … --tag p1b)
                  #   -- --viewports desktop-1440 --match '^(cm-|th-|ti-)' --tag d2                     (and phone-390 … --tag p2)
npm run pdf       # pdf/week-0-intake.sample.pdf from the sample answers (a placeholder look: Connor's own PDF design replaces it)
```

## 4. Into the repo (apps/web/src)
1. **Shell.** Find the layout that renders the sidebar and the top bar. Replace its markup with `<AppShell>`; keep its
   loaders, routing and the time-zone picker. Every root carries `data-ai` (`shell`, `week`, `schedule`); tokens and
   element resets are scoped to `[data-ai]`, so pages that aren't in this handoff (Home, Skill library, Team Hub,
   Resource vault, the step page) keep their own styles inside the new shell. Open each of them once and look.
2. **Schedule.** Replace the body of `/learn/schedule` with `<SchedulePage>`. Map its view-model onto §2
   (`UX-AUDIT.md`, "Schedule: where each piece went"). Keep the existing calendar endpoints (.ics, Google, Outlook)
   and the Zoom join link; they become `calendar[]`, `calendarAll[]` and `joinHref`.
3. **Week overview.** As in v1: replace the body of `/learn/week/:n` with `<WeekPage>`; the per-step `doneWhen` lines
   are today's Homework › "Implemented by Week's End" bullets, one per step, in order.
4. **Forms.** Render `<FormDrawer>` once per page that has a form (inside a `data-ai` root; it brings its own). Load
   the learner's response with the page, pass it as `initial`, and wire `onSave`, `onSubmit` and `onDownloadPdf` to
   the API in §9. The kit row that used to link to the PDF gets `form: '<form id>'` and one button.
5. Stylesheets, global, in this order: `ai-motion.css`, `lms.tokens.css`, `lms.css`.
6. The logo is the brand's file, as an `img` inside `.sh-logo` (`shell.logo.app`). Don't swap in a wordmark
   component and don't add a second image for the rail: the rail is the same image, clipped by `.sh-logo`'s width.
7. Don't render the Media card's "to be recorded" placeholders or any `/course/...` path (UX-AUDIT.md, "Left out").

## 5. Motion (Amplified Impact Motion v1)
| Element | Motion | Brand source |
|---|---|---|
| Page arrival | Blocks rise 14 px in order, 45 ms apart, on the spring | `.aim-rise` |
| Buttons | Label rolls on hover; accent fill warms; a secondary's outline firms to ink; press squeezes to .96 in 90 ms and springs back | 01, 02 |
| Nav links | Colour change on hover and the label moves 3 px forward on the spring. Nothing lifts. | 10 |
| Nav marker | One marker; it springs to the current item (and to its new place when the group folds or the rail collapses) | 10 |
| Nav ring, Schedule bar | Fill over 720 ms on the system curve | 12 |
| Sidebar collapse | Instant (a layout change); the marker springs to its new place | 10 |
| Calendar menus | Unfold from the button on the spring; leave in 200 ms on the exit curve; the chevron turns | 14, `Popover` |
| Weeks / Calendar, role filter | The thumb springs to the choice | 10 |
| Step rows, kit rows, week rows, Next week | Colour change on hover, the arrow nudges 3 px on the spring | tokens |
| Progress | Segments fill over 720 ms; the figure counts with them | 12, `useCountUp` |
| Mark as deployed → Deployed | Module completion: the dot lands, the ring draws, one ring travels out; the words rise in | 13, `ModuleComplete` |
| Reference | Opens in 380 ms on the system curve, closes in 200 ms on the exit curve | tokens |
| Copy | The label rolls to Copied for 1.4 s | 01 |
| Form drawer | Slides in from the right on the spring, drawn 40 px wider than it shows so the overshoot never opens a gap; the scrim fades in 380 ms; head, sections and foot follow in order; it leaves in 200 ms | 05, `Drawer` |
| Form fields | On focus the ring tightens in from 7 px to 2 px and the border firms to ink; an error shakes | 07 |
| Submit, Download PDF | Idle → the hairline sweep → the mark lands beside the done label; a failed submit shakes | 03 |
| Chips | Colour on hover; press squeezes to .96 | 02 |
| Saving | The hairline sweep beside "Saving" | sweep |
| Submitted banner | Rises in; the mark's dot lands and its ring draws | `.aim-rise`, mark |
| Reduced motion | OS setting or `.aim-reduced`: everything lands on its final frame | reduced |

## 6. Acceptance test
```
node diff/pixel-diff.mjs --target https://learn.amplifiedimpact.io/learn/week/0 \
     --target-schedule https://learn.amplifiedimpact.io/learn/schedule --storage-state <auth.json>
```
- Compares the **whole page, shell included**, with the mockup's MOCKUP bar hidden. 1440×900 and 390×844; pixelmatch
  threshold 0.1, antialiasing ignored; every check must have **no different pixel and the same size**.
- The browser's clock is pinned to **Fri 20 Nov 2026, 3:18 PM CT** ("Starts in 11 days 21 hr"). The states around a
  live session use the black bar's Clock: 9 minutes before, live, just ended, the next day (`IMPLEMENTATION-SPEC.md` §8). If the server renders the countdown or the
  join state, it must hydrate from the client's clock, or those checks can't pass.
- A learner is in one state. The default run needs the seeded test learner at: **step 1 done, step 3 in progress,
  step 5 waiting on step 6, the rest not started, not deployed, only Week 0 open** (nav: "1 of 8", weeks 1 to 8 locked), **with the intake saved as the "draft"
  sample** (`src/forms/week-0-intake.samples.json`: 9 of 22 answered, saved label "Saved Thu 4:02 PM").
- Only step 5 left: add `--assume s7`. All eight done: `--assume s8`. A deployed week: `--assume deployed`.
- Shipping in stages: `--selector '[data-ai="schedule"]'` (or `"week"`) compares that piece only and sizes the
  mockup's sidebar to match the live shell.
- For a learner whose intake is empty or submitted: `--assume-form new` or `--assume-form submitted`.
- The test never clicks Mark as deployed on a deployed page and never follows a calendar or Zoom link. On a deployed
  page it opens, scrolls, hovers and closes the form drawer and **never types in it, submits it or downloads from
  it**: those would write to a profile and to GHL. Check them by hand on the test learner with GHL in dry-run (§9).
- Test learner only (#190), never a real buyer.
- A difference caused by live content (other words, dates, sessions, kit items) isn't a code bug: list it and ask.

## 7. Decide before shipping
Decided by Connor, 20 Nov 2026:
- **"Waiting" means one of the step's boxes needs another step first.** The row says "Waiting on step N". The step still opens and can be "up next".
  **Re-opened by the repo audit:** in the code `waiting` means "waits on another step" (D-195). See
  `IMPLEMENTATION-SPEC.md` Q-01 before building this.
- **Operator time is the sum of the operator's steps:** about 2 hr 20 min (the live pages say 2 hr 15 min, on the
  Schedule's week 0 row too).
- **The week overview's new copy is approved**, and **Undo after deploying stays.**
- **The sidebar group is called "Weeks"** (was "AI employees"), is a nav row with its own icon, and its weeks nest
  under it.
- **Schedule rows show a status, not a step count:** Next on the week of the next session, Upcoming on the others.

Open (v2):
1. **Weeks 5 to 8 on the Schedule.** The screenshots stop at week 5's title. The mockup shows those four rows with
   dates that follow the weekly rhythm (Jan 13, 20, 27, Feb 3) and no outcome or sessions. Real rows come from data.
2. **Weeks 5 to 8** now carry the repo's own titles, outcomes and sessions (`packages/core/seed/accelerator-v1.ts`).
   In the LMS every week's words come from data, as before.
3. **The Calendar view** wasn't in the screenshots and isn't redesigned. The toggle links to it.
4. **New copy:** "Join on Zoom", "Join opens 15 minutes before.", "Live now", "Started N min ago", "Calendar file
   (.ics)", "Add all to calendar", "Upcoming", "Due" on week 0's tile, "Expand sidebar", "Menu".
5. **Removed from the Schedule:** the "Open" chip on every week, "0 of 6 done" on weeks that haven't started, the
   disabled Join button inside week 1's row, the two extra calendar links. See UX-AUDIT.md.
6. **The top-bar strip is hidden on the Schedule page** (the hero is the same session).
7. **The countdown shows two units**, not three ("11 days 21 hr", not "11 days 21 hrs 42 min").
8. **Week numbers replace the per-week icons** in the nav (two pairs of weeks shared an icon).
9. **Other routes inside the new shell** (Home, Skill library, Team Hub, Resource vault, the step page) aren't in the
   mockup and aren't covered by the test.
10. From v1, still open: the step page's mockup shows MT where these show CT;
    dark theme isn't styled.

Open (v3, forms):
11. **Which intake questions are required.** The questions are now the LMS's own 22. The package marks six as
    required (name, team, operator, ai, plan, google); the LMS has no `required` today.
12. **Which other forms move into the drawer** (the Stack Card?). Each needs only a definition file.
13. **GHL:** which custom fields receive the answers (§9 suggests keys), whether drafts sync or only submitted
    forms (the spec says submitted), and whether the operator becomes a contact of their own.
14. **Does submitting the intake tick anything on Step 1?** The mockup leaves the step's status alone.
15. **The admin portal's view of a response** isn't mocked: I haven't seen the admin portal. §9 says what it needs.
16. **New copy:** everything in the drawer, the three button labels on the kit row, and the PDF's furniture
    ("From", "Submitted", "Answers", the closing line).
17. **The PDF is made with headless Chrome on the server.** If the host can't run Chrome, say so before choosing
    another engine: the layout uses CSS page-margin boxes for the footer.

## 8. Results (my runs, Chrome 153, 21 Nov 2026)
- Harness vs mockup: **260 / 260 checks with no different pixel** (157 at 1440, 103 at 390; 160 states): week 21
  states, shell 32 (11 of them a session starting, live or over; 7 where the collapse lands), Schedule 24, locked weeks 17, form drawer 23, Community 13, thread 16, Turn in 14.
- The pass rule is **no different pixel** (same size). With a percentage alone, a full-page check passed with every
  icon on the page missing; at 25 pixels a missing 6 px status dot passed (15 pixels). Zero is the only rule that held.
- LMS-shaped harness (`?lms`, whole page, MOCKUP bar hidden on the mockup): 59 / 59 with no different pixel; `?lms&clock=live`
  with `--assume-clock live`: 3 / 3. A mutation (one new rule removed) fails the run.
- A deliberate 1 px change fails: nav links' padding 0.17 %, week rows' padding 2.05 %, form inputs' height 1.22 %.
- The PDF: 3 pages for the 22-question intake, US Letter, Geist embedded; rendered and looked at.

## 9. Forms: saving, the profile, GHL and the PDF
> Written before the repo audit. The repo already has the intake's storage and API (`team_intake`, `GET`/`PUT
> /api/intake`, one intake **per team**) and a GHL client and queue. `IMPLEMENTATION-SPEC.md` §4.B (B-14 to B-20)
> and Phases 6 to 8 say what to build on top of them; where this section differs, the spec wins.

The drawer only knows three calls. Everything else is the server's job. This section is a specification, not code
that exists: build it on the LMS's own data layer and its existing GHL integration, if it has one.

**Storage (the profile is the source of truth).** One row per learner per form:
`form_id`, `form_version`, `learner_id`, `status` (`draft` / `submitted`), `answers` (JSON, keyed by field id),
`answered_count`, `created_at`, `updated_at`, `submitted_at`, `ghl_sync_status` (`none` / `pending` / `synced` /
`failed`), `ghl_synced_at`, `ghl_error`. Keep the form definition's version with the answers so an old response
still renders after the questions change.

| Call | Does |
|---|---|
| `GET /api/forms/:formId/response` | The learner's response, or an empty draft. Feeds `initial`. |
| `PUT /api/forms/:formId/response` | Autosave. Takes the whole answers object, is idempotent, returns `updated_at`. This is `onSave`. |
| `POST /api/forms/:formId/submit` | Validates the required answers again, sets `submitted`, queues the GHL sync. This is `onSubmit`. |
| `GET /api/forms/:formId/pdf` | `formPdfHtml()` printed by headless Chrome (`tools/make-pdf.mjs` is the recipe), sent as an attachment named "Week 0 Intake - <Team>.pdf". This is `onDownloadPdf`. An admin can call it for any learner. |

**Admin portal.** On the learner's profile, a Forms block: the form's title, status, submitted date, the answers in
the form's own section order, the GHL sync status with its time, **Download PDF** and **Sync to GHL again**. A
failed sync must be visible here. (Not mocked; see §7.15.)

**GHL.** Server side only, after the profile write has committed, from a queue with retries. It never blocks or
fails the learner's save. Find the contact by the GHL contact id the LMS already stores, else by the learner's
email. Write each answer to a custom field; a several-of answer is written as a comma-separated list. Suggested
field keys: `week0_intake_<field id>` (`week0_intake_team_name`, `week0_intake_crm`, …); Connor creates or confirms
them in GHL first. On submit, add the tag `week-0-intake-submitted`. Sync when the form is submitted and after any
later edit (wait a minute after the last edit so a burst of saves is one write). Record the outcome on the row.
Use the repo's existing GHL client and credentials; if there is none, read GHL's current API documentation rather
than writing calls from memory, and ask before adding a new integration.

**Safety while building.** Never write to the live GHL location from a development or preview build, and never from
the pixel test. Use a dry-run switch that logs the payload, or a sandbox location, until Connor has seen one real
payload and said yes. The operator's name and email are another person's details: they go to the profile and to
the fields above and nowhere else.

**PDF.** `formPdfHtml({ form, answers, meta, fonts })` returns the document; Chrome prints it
(`preferCSSPageSize`, `printBackground`). US Letter. A Forest opening band edge to edge (wordmark, cohort, kicker,
title, team, who it's from, status and date, answers count), then each section as a label column beside its
questions and answers; long answers are set larger with an Energy rule; several-of answers are Bone pills; a
running foot with the wordmark, the form and team, and the page number. Colours and type are the LMS tokens.
Compare your output with `pdf/week-0-intake.sample.pdf` (render both to PNG at the same resolution and diff them).
