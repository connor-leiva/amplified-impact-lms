# Grading: Case 1 (No Connectors, Practice Files)

Run: `output.md` (two replies), `plan-page.html`, `summary.pdf`. Graded 2026-11-08 against `evals/evals.json` case 1.

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Intake first, says what it read, doesn't ask what the files hold | PASS | Reply 1 lists five questions (hours and zone, evenings, who can take work, end date, agreements with Pat) and opens with what it read: the Google Calendar export in Mountain time and 29 open ClickUp tasks, 2 overdue. It says it won't ask where their work lives. |
| 2 | Calendar read with a script; series, skips and moves applied; declined event out | PASS | "Every repeating meeting carried through Dec 18 ... Avery's 1:1 already skips Nov 26; the Nov 20 ops sync moved to 8:00." The happy hour (DECLINED in the .ics) isn't in the week. Parser output in the run: 70 dates, Avery's EXDATE and the RECURRENCE-ID override applied. |
| 3 | Sorted the skill's way | PASS | Fixed, own named blocks, placeholder ("Focus time ... the plan gives it a job", not deleted), and "No reply yet: Lunch & Learn (Nov 12) and Friendsgiving potluck (Nov 18). Are you going?" |
| 4 | CSV read correctly | PASS | "29 open tasks for you (2 overdue, 1 undated). Left out: 2 of Morgan's and 1 already complete. Parent tasks counted through their subtasks." The banner line above the header was skipped. The 2.5-hour check-in estimate is labeled "2.5 of mine." |
| 5 | Problems flagged, nothing moved | PASS | Flagged: the Nov 16 huddle and Kit coffee overlap ("your meeting with Kit, so you move it"), the Nov 26 block and Nov 27 sync, the after-hours appointment and open house ("client time and stay"). |
| 6 | Holds only for Quinn and Drew, no invites | PASS | "Quinn and Drew have no standing meeting with you under any name; Avery, Riley and Casey do." Both holds are marked "(no invites)." |
| 7 | Offered evenings unused, each slot shown off with a reason | PASS | "I used none of them." The plan page's Evenings and weekends section has 12 slots, each "Not needed: your daytime blocks cover every deliverable ...", plus tiles for 18 h offered, 0 used and 12 nights off. |
| 8 | Transactions routing and deadline label | PASS | "Send the two transaction tasks ... back to Tatum: they're the transactions team's work." "For planning only; confirm dates with your transactions team." |
| 9 | Summary privacy and Check before sending | PASS | "It leaves out your personal appointments, the gym, client details and any dollar figures." The step ends with "Check before sending" listing dates, hours, meetings, names and asks. The summary PDF text has no personal items (checked with pdftotext). |
| 10 | Nothing written; stops before step 8 with two ways forward | PASS | "Stopped here: there's no calendar connector in this chat, so nothing has been added." Offers to connect Google Calendar or make an .ics import file. "I didn't change anything in ClickUp." |

**10 of 10 expectations pass.**

## Objective Checks

| Check | Result | Evidence |
|---|---|---|
| Every number traces to the inputs | PASS | Task hours come from the CSV's Time Estimated column (subtasks over parents; one estimate labeled as Claude's). Meeting times and dates come from the .ics. Totals are computed: 50.25 = 47.75 (CSV) + 2.5 (labeled estimate); 113 focus hours and the weekly figures come from the expanded template (script). |
| Deadlines match the inputs | PASS | Every due date matches the CSV's Due Date column; contract deadlines (Nov 13, Nov 20) match the all-day events and are labeled for planning only. No contract was uploaded, so there's nothing else to match. |
| No em or en dashes | PASS | 0 in output.md and plan-page.html (scripted check). |
| Title Case subject lines | PASS | The summary title "Jordan's Perfect Week: Plan Through December 18" is Title Case. No email was drafted. |
| "Check before sending" section | PASS | Present in step 7. |
| No cost estimates without bids | PASS | No dollar figures anywhere. |
| No agent-only MLS fields in client-facing text | PASS | The open house's lockbox note in the .ics description never appears in the output, the plan page or the summary. |
| No protected-class language | PASS | None (scripted word check). |
| No wire or account details | PASS | None. |

## Fixes Made During Grading

- The first plan page listed "Gym" by name in "What stays exactly as it is." The skill says the plan page leaves out what the summary leaves out, so the page now says only "your personal appointments." To make this harder to miss, `references/plan-page.md` now says a private appointment that has to show on the board shows as "Personal." Reran: no personal items on the page.
