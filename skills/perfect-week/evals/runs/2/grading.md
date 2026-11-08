# Grading: Case 2 (Evenings Off, Too Much Work)

Run: `output.md`, `plan-page.html`, `summary.pdf`. Baseline: `baseline.md` (same prompt and files, no skill). Graded 2026-11-08 against `evals/evals.json` case 2.

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Eastern times and the time zone note | PASS | "Your calendar is set to Central (America/Chicago) and you work in Eastern. Every time in this plan is Eastern." The team meeting shows as 10:00 Eastern (9:00 Central in the .ics). The reply also explains the after-hours listing appointment shows as 4:30 in the Central view. |
| 2 | Gap shown plainly with numbers | PASS | "76.5 hours by Nov 20 ... 44 hours of focus blocks, a 32.5-hour gap." The weekly table: Nov 9, 21.5 due against 20.5; Nov 16, 55 due against 23.5. |
| 3 | No evenings, Sundays or Saturday work outside showings; no Evenings section | PASS | "I haven't put any of it in your evenings, Saturdays or Sundays." "No evening or weekend slots, since you didn't opt in, so there's no Evenings and weekends section." The board runs 9:00 to 5:00, Monday to Friday. |
| 4 | Fixes are proposals; nothing changed in Todoist | PASS | "The moves that close it (you and Jamie decide; I haven't changed anything in Todoist)." Each one is a re-date, re-scope or close for them to decide. |
| 5 | No one to delegate: list for Jamie | PASS | Hand-offs: "You have no one to hand work to, so this is the list to take to Jamie," with six items, each saying what to change and the hours involved. |
| 6 | Deadline spreadsheet routed to the transactions team | PASS | "Close the deadline-tracking spreadsheet task (1 hour). Your transactions team posts and owns those dates." |
| 7 | Repeats expanded, others' tasks out, CE flagged | PASS | "prospecting calls every weekday (10 sessions) and seller updates every Friday (2)." "I left out Jamie's task ... and a note row." "CE, 6 hours, due Nov 30. It isn't in the count, but it will land in Thanksgiving week." |
| 8 | Remaining 1.75 hours stated with options; open time trade-off disclosed | PASS | Move 5 gives the 1.75 hours and three options inside working hours. "I left 3 hours of open time instead of the usual hour a day ... Say if you'd rather have it." |
| 9 | Summary privacy and Check before sending | PASS | The summary text for Jamie says only "I'm keeping evenings and Sundays off," with nothing about the coaching or family, and no client names. The step ends with "Check before sending." |

**9 of 9 expectations pass.**

## Objective Checks

| Check | Result | Evidence |
|---|---|---|
| Every number traces to the inputs | PASS | Task hours are the Todoist DURATION column in minutes (240, 120, 90 ...), with repeats expanded by their DATE rule. Meeting times are converted from the .ics TZID America/Chicago. 76.5 = the sum of Taylor's in-window tasks (script); 44 = the focus blocks after cuts (script); 40.5 = 76.5 less 35 re-dated and 1 closed. |
| Deadlines match the inputs | PASS | Due dates match the DATE column; contract deadlines (Nov 16, Nov 20) match the .ics and are labeled for planning only. |
| No em or en dashes | PASS | 0 (scripted check). |
| Title Case subject lines | PASS | Summary title: "Taylor's Two Weeks: What Fits and What Needs a New Date." |
| "Check before sending" section | PASS | Present. |
| No cost estimates without bids | PASS | No dollar figures. |
| No agent-only MLS fields in client-facing text | PASS | None in the inputs or the output. |
| No protected-class language | PASS | The reply never mentions Taylor's daughter or family (scripted word check on the reply; the prompt quote at the top is the user's own words). |
| No wire or account details | PASS | None. |

## Baseline Comparison (No Skill)

What the skill added on the same prompt and files:
- **Time zones:** the baseline lists every time as it sits in the .ics (Central) while calling the plan Eastern, so the team meeting shows as 9:00 instead of 10:00 Eastern and the listing appointment as 4:30 instead of 5:30. The skill converts everything and explains the mismatch.
- **The gap:** the baseline says "roughly 75 hours" against "40 hours" before meetings, with no week-by-week view. The skill gives 76.5 against 44 by week and finds the remaining 1.75-hour week-1 shortfall.
- **Weekends:** the baseline suggests Saturday afternoons for content work, which Taylor didn't offer. The skill keeps every hour outside 9 to 5 and the Saturday showing window empty.
- **Lanes:** the baseline puts "tracking the 41 Fiction Avenue deadlines" under "should do." The skill routes it to the transactions team.
- **Missed items:** the baseline misses the CE hours due Nov 30, the repeating tasks' real totals, and the overdue expense item's place in the schedule.
- **Output:** the baseline has no plan page, no summary built for Jamie, no "Check before sending," and its note to Jamie gives the 35-hour figure without the asks. It ends by offering an import file, but without the step 8 rules (scope, no guests, notifications off).

## Fixes Made During Grading

- The first draft counted 19 open tasks and 75.5 hours by leaving out the deadline-spreadsheet task before it had been closed. The task list has 18 open tasks due by Nov 20, and before fixes that task's hour counts: 76.5 hours and a 32.5-hour gap. Corrected in output.md and on the plan page. This was a run error, not a gap in the skill (step 4 says to count every task and then say what to close).

## Reviewer's Independent Run (2026-11-08)

The reviewer ran case 2 from SKILL.md and its references as written, before reading this run: `review-output.md`. Graded against the expectations as reworded in this review (2 and 8 no longer fix the plan-dependent 44, 32.5 and 1.75 hour figures, since any sound set of blocks gives its own focus hours).

| # | Result | Evidence |
|---|---|---|
| 1 | PASS | Every time in Eastern; the Central calendar note; the Nov 9 appointment flagged as 5:30 to 6:30 PM Eastern. |
| 2 | PASS | 76.5 hours on the list, 75.5 once the transactions hour goes back; 21.5 due the week of Nov 9 and 54 the week of Nov 16, against 19.5 and 23 focus hours (42.5 in all). |
| 3 | PASS | Nothing in evenings, Sundays or Saturday outside 10 to 2; no Evenings and weekends section. |
| 4 | PASS | Five re-scopes as proposals for Taylor and Jamie; "nothing changed in Todoist". |
| 5 | PASS | Hand-offs is the list for Jamie, each item with what changes and why. |
| 6 | PASS | The deadline-tracking task is closed back to Toni, 0 hours in Taylor's blocks. |
| 7 | PASS | 10 call sessions and 2 Friday updates; Jamie's task and the note row left out; CE due Nov 30 flagged, not counted. |
| 8 | PASS | 2 hours short the week of Nov 9 and 1 the week of Nov 16 after the fixes, with options inside working hours and the open-time trade-off named. |
| 9 | PASS | The summary leaves out the coaching, Sundays and client names; "Check before sending" closes the step. |

**9 of 9.** Both runs pass, with different but sound plans. What the reviewer's run showed about the skill: the two items it handled only by judgment (Todoist's "every weekday" dates and the CE task due after the end date) weren't written down anywhere, so `references/reading-exports.md` now says how to count a repeating date and to name a big task due soon after the end date. The client nicknames in the files ("Brightwater" and "Pinewood" buyers) were renamed to obviously made-up ones (Brightsample, Pinetest) here and in the files; this run's outputs were updated to match.

One nuance in this run, not a failure: its bottom line counts the transactions hour in the 32.5-hour gap ("before fixes"), then closes it as a fix. The reviewer's run takes it out first (75.5). Either reading meets step 4, which says to count the task on the list and keep it out of the blocks.
