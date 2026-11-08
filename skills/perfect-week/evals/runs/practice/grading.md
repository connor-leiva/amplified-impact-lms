# Grading: Practice Run

Run: `output.md` (also `sample.md`), `plan-page.html`, `summary.pdf`, from the practice prompt in page-notes.md with `practice/perfect-week-practice-calendar.ics` and `practice/perfect-week-practice-tasks.csv` attached and nothing connected. Graded 2026-11-08 against case 1's expectations that apply to a single-turn run, plus the house checks.

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Doesn't re-ask what the prompt and files answered | PASS | The prompt answered every intake question, so the reply says "Your intake answers covered everything I needed" and goes straight through, as asked. |
| 2 | Calendar read with a script; series, skips and moves applied | PASS | "carried every repeating meeting through Dec 18 in Mountain time ... and applied the skipped and moved dates": Avery's Nov 26 skip, the Nov 20 ops sync at 8:00, the declined happy hour left out. |
| 3 | Sorted the skill's way | PASS | Fixed, own named blocks, the placeholder (given a job, "I won't delete it unless you say so"), unanswered invites ("Are you going?"), contract deadlines labeled for planning. |
| 4 | CSV read correctly | PASS | 29 open tasks, 2 overdue, 1 undated; Morgan's 2 and the completed one left out; subtasks over parents ("5 hours through its subtasks, not its own 6-hour estimate"); "2.5 hours of mine" labeled. |
| 5 | Problems flagged, nothing moved | PASS | Five flags on the board (double-booking, days off, after-hours client time, placeholder, unanswered invites), each saying who acts. |
| 6 | Holds only where no meeting exists | PASS | Quinn and Drew only, no invites. |
| 7 | Week inside working hours, targets respected, hours totaled | PASS | Week A totals 43.5 hours (8:00 to 5:00, Thursday to 3:30); recruiting 5.5 against Pat's 5; about an hour a day of open time (5.5 hours). |
| 8 | Task check with the gap shown week by week | PASS | 50.25 needed against 113 focus hours; the before and after table by week; six moves. |
| 9 | Projects placed by earliest due date with growth room | PASS | Four projects, nothing late, 18 hours of room from Nov 30, an ordered moves-first list. |
| 10 | Hand-offs with loads against the cap | PASS | Morgan 1.25, 1.25, 1.75, 2.25, 0.25, 0.25 hours against the 4-hour cap; the transactions tasks go to Tatum; the list to raise with Pat. |
| 11 | Summary and Check before sending | PASS | Summary PDF and pasteable text; personal items left out; "Check before sending" lists dates, hours, meetings, names and asks. |
| 12 | Nothing written; stops before step 8 with two ways forward | PASS | "Not built ... nothing has been added to your calendar"; offers to connect Google Calendar or make an .ics import file; Before the calendar filled in. |

**12 of 12 expectations pass.**

## Objective Checks

| Check | Result | Evidence |
|---|---|---|
| Every number traces to the inputs | PASS | Every task's hours and due date in the table come from the CSV (Time Estimated and Due Date), except the one labeled "my estimate." Meeting times come from the .ics. Totals and weekly figures are computed by script from those. |
| Deadlines match the inputs | PASS | Due dates match the CSV. The contract deadlines match the .ics and are labeled for planning only, to confirm with the transactions team. |
| No em or en dashes | PASS | 0 in output.md, plan-page.html and the practice files. |
| Title Case subject lines | PASS | Summary title: "Jordan's Perfect Week: Plan Through December 18." |
| "Check before sending" section | PASS | Present. |
| No cost estimates without bids | PASS | No dollar figures. |
| No agent-only MLS fields | PASS | The lockbox note in the open house's .ics description appears nowhere in the output, the plan page or the summary. |
| No protected-class language | PASS | None. |
| No wire or account details | PASS | None. |
| Plan page works | PASS | Rendered in Chromium at 1200 px (light) and 390 px (dark). No sideways scroll (scrollWidth equals the viewport). The Week A and Week B toggle, block details panel, before and after toggle, and task filters with a count all work. No script errors. |
| Summary leaves out personal items | PASS | pdftotext of summary.pdf has no personal appointment, gym, lockbox or dollar figure. |

## Fixes Made During Grading

- The plan page's "What stays exactly as it is" listed the gym by name. It now says "your personal appointments," and `references/plan-page.md` says a private appointment that has to show on the board shows as "Personal."
- Two monthly meetings (broker office hours, the review with Pat) were first drawn on the weekly board and hid the blocks they replace once a month. They're now flagged on those blocks and listed in Team cadence and Dates instead.
