# Week overview: what was wrong, and what the redesign does

Source: seven screenshots of learn.amplifiedimpact.io/learn/week/0, 20 Nov 2026. "Now" is `mockup/index.html#week-0`.
The side nav and the Schedule (v2) are at the end.

| # | On the live page | Now |
|---|---|---|
| 1 | The eight steps are listed twice ("Start Here" and "Eight steps"), and the two lists disagree: one says steps 2 and 3 are in progress, the other shows nothing, the counter says 0 of 8, the sidebar says Not started. | One list. One status per step, from one source. |
| 2 | The only real action, Continue step 1, sits below the fold under a full list, and competes with a second primary button, Mark as Deployed, that can't be used yet. | A hero directly under the title holds the one next action. Mark as deployed appears there, and only there, once all eight steps are done. Until then deployment is the list's last row, "7 steps to go". |
| 3 | "Continue step 1" on a step that hasn't been started. | Start step N until it's started, Continue step N after. |
| 4 | Statuses are lowercase grey text; "not started" is printed five times; "waiting" doesn't say on what. | Done, Up next and In progress are chips with the step page's circle states. Not started shows nothing. "Waiting" turned out to mean the step isn't built yet, so it reads "Coming soon" and is never offered as the next step. |
| 5 | Owner and operator have different steps, but the page can't show one person's. "Who does what" and "Time this week" are separate cards far below. | A filter on the list: All 8, Owner 4, Operator 6, with that person's time beside it. |
| 6 | What "done" means for each step is in a Homework card at the bottom ("Implemented by week's end", eight bullets, one per step). | Each step row carries its own "done when" line. |
| 7 | The deadline is written two ways (1:00 PM CT, 12:00 PM MT) and the time three ways (170 Min Build, About 2 hrs 50 min, 1 hr 30 + 2 hr 15). | One deadline, in the viewer's time zone. One total; per-person times only in the filter and in Reference. |
| 8 | The kit is ten rows in alphabetical order, with each skill and its zip, and each file format, as separate rows, plus a separate "Build Kit" card. | Eight rows in three groups (Skills, Files, For your AI), in step order. A skill and its zip are one row; Excel and CSV are two buttons on one row. |
| 9 | Nine reference cards of equal weight in two ragged columns (How It Works, Why It Matters, Who Does What, Tools, Homework, Evidence Packet, Rubric, Readiness, Media), with repeats between them and the Instructor Notes. The left column ends early and leaves a tall blank. | One Reference section of seven closed accordions. Repeats are merged; nothing is lost except what's listed below. |
| 10 | Unfinished content shows to learners: "[VIDEO: orientation, to be recorded]" three times, and an internal path, /course/week-0. | Not shown. |
| 11 | The Instructor Notes are one 130-word paragraph that mostly restates the role lists and times. | Connor's two sentences on why the week matters, as a short note. |
| 12 | Hover, press and state changes are unstyled or abrupt. | Amplified Impact Motion v1 throughout (see HANDOFF.md §5). |

## Left out on purpose
- The Media card: three "to be recorded" placeholders, and a Course Materials list that repeats the kit.
- "The full week, with the live build, office hours, homework, evidence packet and rubric, is at /course/week-0."
- The rest of the Instructor Notes paragraph (it repeats Owner and operator, and the times).
- "Start with Step 1." (the hero says what's next).

## Where every other piece went
| Old card | New place |
|---|---|
| Start Here: Week 0 | Header (title, question, goal), the step list's summary line |
| Up next · Steps done | Hero |
| Eight steps | Step list |
| Your Deployment | Step list's last row; hero when all eight are done |
| Week 0 kit, Build Kit | Kit |
| Instructor Notes, Why It Matters | Connor's note |
| How It Works | Reference › How the program works |
| Who Does What, Time This Week, role definitions | Role filter; Reference › Owner and operator |
| Homework › Implemented by Week's End | Each step's "done when" line |
| Homework › Acceptance Test, Adopted Means, Before the Next Session, Missed a week | Reference › What done looks like (the acceptance test is also the deployment row's line) |
| Evidence Packet, Rubric, Readiness, Tools | Reference, one accordion each |
| "Questions? Write to support@…" | Questions card |
| Next · Week 1 | Next week card |


# Side nav and top bar (v2)

Source: four screenshots of the sidebar and /learn/schedule, 20 Nov 2026. "Now" is the shell in `mockup/index.html`.

| # | On the live page | Now |
|---|---|---|
| 1 | Six of nine week titles are cut off ("Where the Money…", "Protect the Pipeli…", "Numbers on the …") because "Not started" takes the right third of every row. | Full titles; a long one wraps to a second line. |
| 2 | "Not started" is printed eight times. The one row with something to say ("7 of 8") is the same size and weight as the noise. | A week shows a status only when it has one: a ring and "7 of 8", or a check. |
| 3 | Each week has a pictogram; two pairs of weeks share one, and none says which week it is. | The week's number, 0 to 8. The order is the content. |
| 4 | The weeks sit under a separate heading ("AI employees 9") in a different style from the links above, so the nav reads as two unrelated lists. | "Weeks" is a nav row like the five above it, with its own icon; the weeks fall in under it along a guide line. |
| 4b | The current page is a tint on the row. | Tint, forest text, and one marker on the sidebar's edge that springs to the current item. |
| 5 | The cohort line breaks mid-phrase ("December / 2026 Cohort"). | Two lines, broken on purpose: the program, then the cohort and start date. |
| 6 | The top bar offers three calendar links in a row (Add to calendar, Google Calendar, Outlook). | One Add to calendar menu with the three choices. |
| 7 | On the Schedule the top bar announces the same session as the hero 150 px below it. | The strip is hidden on the Schedule page. |
| 8 | Hover and collapse are unstyled or abrupt. | Amplified Impact Motion v1 (HANDOFF.md §5). The collapsed rail keeps the numbers, grouped in a tray under the Weeks icon. |
| 9 | (Phone layout not shown.) | The nav folds behind a Menu button. |

# Schedule (v2)

| # | On the live page | Now |
|---|---|---|
| 1 | The next session is announced three times on one screen: top bar, hero, and a sub-row inside Week 1, each with its own buttons. | Once, in the hero. Week 1's row carries a "Next" pill on the right. |
| 2 | The hero has four actions of nearly equal weight: Add to calendar, Google Calendar, Outlook, See what you'll build. | One primary (Add to calendar, a menu; Join on Zoom once the window opens) and one secondary. |
| 3 | Week 1's row holds a Join button that can't be used for 11 days, labelled "Opens 15 Min Before". | Join appears in the hero when it works. Until then: "Join opens 15 minutes before." |
| 4 | The countdown runs to the minute eleven days out ("11 days 21 hrs 42 min"). | Two units, the ones that matter at that distance. |
| 5 | Every week has an "Open" chip (all of them are open) and "0 of 6 done" (none has started). | Removed. The right side of every row is its status: progress, Deployed, Next, or Upcoming. |
| 6 | Week 0's progress is the tail of a sentence ("… by Mon, Nov 30 · 7 of 8 done"). | A bar and the count, on the right, where every row's status is. |
| 7 | Sessions sit in a far-right column as bullets and break mid-date ("Thu, Dec / 10"). | Under the week's outcome, one per line: icon (live build or office hours), name, date. |
| 8 | Each row has two tiles: the date and a pictogram. | The date tile. |
| 9 | Week 0's tile says "Week 0" where the others give a date. | "Due 30": every tile is a date. |
| 10 | Rows don't say they're links. | The whole row is a link with a chevron that nudges on hover. |
| 11 | Operator time reads 2 hr 15 min. | 2 hr 20 min, the sum of the steps (decided 20 Nov). |

## Schedule: where each piece went
| Old piece | New place |
|---|---|
| Top bar: Next live build + three links | Top bar strip with one menu (hidden on the Schedule page) |
| Hero: Add to calendar, Google Calendar, Outlook | Hero › Add to calendar menu |
| Hero: "Join opens 15 minutes before" | Hero note; becomes Join on Zoom |
| Week 1 › Map Your Spend Live Build · 1:00 PM CT · Zoom · Join | Hero (time, Zoom, Join); the session line in Week 1 |
| "Open" chips, "0 of N done" | Left out; a status pill (Next, Upcoming) |
| Session bullets (right column) | Session lines under each week |
| Week pictograms | Left out (sessions carry the icons) |
| Weeks / Calendar, Add all to calendar | Header, unchanged in purpose; Add all is one plain button (the calendar file) |
| Holiday break | Same place, quieter |


# Forms (v3)

Source: Connor's description, 20 Nov 2026, and the repo (`/learn/week/0/intake`, a plain page of fields, and the
`intake-form` PDF a step can link to). "Now" is the drawer in `mockup/index.html`.

| # | Today | Now |
|---|---|---|
| 1 | A form is a PDF to download, fill in somewhere else and send back. | The form opens in a drawer on the page it belongs to. |
| 2 | Nothing is saved until the PDF comes back. | Every answer saves by itself; the head says "Saved 3:18 PM". Closing loses nothing. |
| 3 | The learner can't see how far along they are. | "9 of 22 answered" with a bar, in the drawer and on the kit row. |
| 4 | Answers live in a file, so nobody can use them. | They are on the learner's profile for the admin portal and synced to GHL (HANDOFF.md §9). |
| 5 | A missing answer is found by a person, later. | Submit names what's missing and takes the learner to it. |
| 6 | The PDF is the form. | The PDF is a record: a branded, editorial copy of the answers, available at any time. |


# Community and Turn in (v4, Turn in revised in v5)

Source: Connor, 20 Nov 2026, and the unmerged uploads-and-community patch of the same day (its rules are kept; its
screens are replaced by this mockup).

| # | Before | Now |
|---|---|---|
| 1 | The cohort has nowhere in the portal to talk; Home can link to an outside community. | A Community inside the shell: threads in spaces, a thread page, Start a thread in a drawer, staff tools in place. |
| 2 | A week asks for a report or a checkpoint and there is no way to send a file. | Turn in: the step that asks for the file has a button; it opens one upload drawer, in place. (v4 also put a card on the week's page. Connor took it out on Nov 20: "In the button in the step, not on the week card.") |
| 3 | (Patch) The upload sat inside one checklist item as a panel of its own, with its own look. | The same button the step page already uses for an action; the brand's drawer does the rest. |
| 4 | (Patch) After turning in, the team saw the file and nothing else. | The team sees what they sent, when, who sent it, and can send a new version. They never see what staff did with it (Connor, Nov 20: "No status should be displayed telling them what I've done"). |


# Live sessions and locked weeks (v5)

Both were in the product without a design in the mockup. Connor asked for them on Nov 20, 2026.

| # | Before | In the mockup |
|---|---|---|
| 1 | The top bar had one look. A session about to start, or already running, looked the same as one eleven days away, unless the old bar's separate "live" variant happened to be on screen. | Three modes in one strip, same place, same size. **Next**: label, title, when, Add to calendar. **Starting soon** (the join window is open): the time, and **Join on Zoom** as the strip's one bright button. **Live now**: the label becomes the pill the week's "Open" uses, "Started 1:00 PM CT", Join on Zoom. |
| 2 | A learner on any page but the Schedule had no way to join a session that had started. | The strip is on every page (the Schedule's hero already is that session), so Join is one click from anywhere. |
| 3 | During a session the Schedule's week list didn't say which line was live. After it, "Replay Ready", "Replay Processing", "Recording Posted" and "Watch Replay" arrived as badges and buttons of different weights. | The week's status pill says **Live now**; the session's own line says it too. Afterwards that line says **Replay processing**, then becomes a quiet **Watch replay** link. One place, one weight, in order. |
| 4 | Once a session ended, the hero kept pointing at it or went empty until the next build. | The hero and the strip move to the next session of any kind: "Next office hours", "Open Week 1". |
| 5 | Nothing pulses. | On purpose: the brand's motion has no looping indicator ("it never loops"). The mode change is carried by words, the pill and the button. |
| 6 | A locked week in the nav looked like any other week with "opens Dec 9" squeezed beside a cut-off title. | A lock, a quieter title and an outlined number. In the collapsed rail the outlined numbers still say which weeks are locked. |
| 7 | The locked week's page was a centred lock tile and a headline, in a different layout from every other week. | The same page shape as an open week: breadcrumb, "Week 1" with a **Locked** chip, title, the week's outcome; a hero with **Opens Wed, Dec 2 · 1:00 PM CT**, the week's question, one calendar button and the way back, beside **Opens in 11 days 21 hr**; then **Build it live**, a row per session. |
| 8 | "Add both to calendar" opened choices that could only ever download one file. | One plain button. Its words follow the count, as the LMS already does: Add to calendar, Add both to calendar, Add all to calendar. |

New words to read: "Waiting on step 6", "Starting soon", "Replay processing", "Watch replay", "Session ended", "Next office hours", "Open Week 1", "Back to Week 0", "Opens in".

# Brand, collapse and week numbers (v6)

| # | Before | In the mockup |
|---|---|---|
| 1 | The sidebar's logo was the words "amplified impact", typed in the text face. It named the company, not the product, and it was text standing in for a logo. | The brand's own academy drawings, as files. Open sidebar and phone: the "ai academy" app lockup at 161×34, the size the Brand Guide gives an LMS sidebar. Collapsed rail: the favicon drawing at 28×28, because the lockup is under its minimum size there. |
| 2 | Collapsing the sidebar swapped one layout for the other in a single frame: 184 px of the page jumped. | It travels, in the brand's own timings. Closing: the edge wipes across the labels while they fade, then the icons and week numbers glide into the rail. Opening: the column springs open, as the brand's panels do, and the labels fade in. Reduced motion: no travel. |
| 3 | The week numbers were in Geist Mono, the face the design keeps for labels and codes. Nine of them in a column read as data. | Geist, 12 px, tabular figures: they read as part of the navigation. The count beside "Weeks" follows. |

