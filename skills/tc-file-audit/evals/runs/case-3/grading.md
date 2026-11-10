# Grading: Case 3, General Mode With an Odd Date (9 Example Larkspur Way, Idaho)

Run on 2026-11-10 by following SKILL.md exactly: `file-exports.md`, `audit-rules.md` and `deadline-code.md` read; `utah-repc-deadlines.md` skipped (Idaho, general mode); the code run on `files/file.json` (`files/tc_dates.md`). Input: `evals/files/case3/Larkspur Way contract dates and documents.txt`. Prompt as in evals.json.

Result: **pass, 7 of 7 expectations.** Objective checks in `objective-checks.txt`: all pass.

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | General mode line; no Utah form or section | Pass | Flag 4; What I Used; objective check (no "REPC," "Utah" or Section 21 or 24) |
| 2 | Closing date labeled an odd date with the three later deadlines named; no date picked or corrected | Pass | Flag 1; calendar; "Order check (code)": "only the signed contract shows which" |
| 3 | Addendum 1 incomplete (buyers only), new date not shown, inspection objection stays November 18 | Pass | Flag 2; calendar row; Incomplete Items |
| 4 | No missing-item cross without a checklist, and the checklist asked for; inspection report "not uploaded" without calling it required | Pass | Flag 3; Missing Items; agent message item 4 |
| 5 | Business-day earnest money period not computed, and said so | Pass | What I Used, "Not computed" |
| 6 | Days 8, 15, 22 and 6 | Pass | Calendar; `files/tc_dates.md`; objective check |
| 7 | Placeholders listed, Title Case subjects, no dashes, ends with Check Before Sending | Pass | Flag 5; Check Before Sending, "Names"; objective checks |

## Fixed Before Grading

- The first run flagged "Closing date this week" on its own; SKILL.md's flag list has no such flag (the odd-date flag and the bottom line carry it), so it came out, and the placeholders flag SKILL.md asks for went in.

- The first draft said "no signature is usually expected on a receipt," a general claim not in the inputs. Now: "your brokerage's checklist would say whether it needs one."
