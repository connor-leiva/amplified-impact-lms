# Grading: Case 1, Normal (Fennimore Hollow Group, Tuesday, November 17, 2026)

Run on 2026-11-11 by following SKILL.md exactly, with references/brief-rules.md and references/inputs.md, on the three case 1 files (a weekly scorecard, a ClickUp Table view export in ClickUp's column layout with a "Done When" custom field, the roster) and the prompt, which pastes today's calendar. The run was done in a build session from the skill's own instructions, not inside claude.ai.

Result: **pass, 11 of 11 expectations.** Objective checks in `objective-checks.txt`: all pass.

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Today's Three exactly and in order, each with rule, fact, source | Pass | 86c2f201 (rule 1, past due Mon Nov 16), 86c2f202 (rule 1, today), 86c2f203 (rule 2, Thu Nov 19, 86c2f209 blocked on it) |
| 2 | The 3:00 PM Dialtone Example call used; no event created | Pass | Priority 2 and Decisions Needed 1 name the call; the header says nothing was booked |
| 3 | Larchmere Lane callback and the unowned follow-up named as also Rosalind's; hiring plan not named | Pass | "Also yours" line, with the reason the signage approval ranks above the [Ops] item (blocking first within rule 2) |
| 4 | Exactly three next owned actions with their done when | Pass | 86c2f207 (past due, not stated), 86c2f206 ("CMA PDF in Rosalind's inbox before 10:30 AM"), 86c2f208 |
| 5 | [Ops] flagged as a missing owner | Pass | Open, row 1: Assignee "[Ops]"; no person named |
| 6 | Listing launch checklist flagged as a missing date with "soon" | Pass | Open, row 2 quotes "Caspian said he'd get to it soon." |
| 7 | Scorecard quoted exactly; Database Touches not entered | Pass | Decisions Needed 2 to 4; "Not a miss and not a zero" |
| 8 | Dialer: contract end quoted, no cost, neutral | Pass | "Contract ends 11/30. Vendor call booked for today." and "The cost was not in the inputs." |
| 9 | Completed task not listed | Pass | What I Used: "Post the November market update" is complete and not listed |
| 10 | Note to Owners with a Title Case subject, a draft | Pass | "An Owner And A Date Needed For Two Items" |
| 11 | No dashes, short bottom line, no judgment, Check Before Sending | Pass | Objective checks |

## Counts Checked by Hand

13 tasks, 12 open; 6 measurables; 4 calendar entries; 3 next owned actions; 2 open items; 4 later tasks (86c2f204, 86c2f205, 86c2f209, 86c2f213; two Rosalind's), none of them already shown in the three, the table or Open.

## What the Run Showed

- ClickUp writes assignees in brackets. "[Ops]" is kept as written and read as a role, so the item goes to Open rather than to whoever does ops.
- The calendar is used only to place today's decisions (the 9:00 AM huddle for the scorecard misses, the 3:00 PM call for the dialer) and the CMA's 10:30 AM deadline beside the 11:00 AM appointment.
- Grading this run showed the later-task count was ambiguous about 86c2f203 (due after the window, but already in the three). SKILL.md and the rules file now count only tasks not already shown in the three, the table or Open.
