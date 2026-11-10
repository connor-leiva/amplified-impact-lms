# Grading: Practice Set (Eval 1), 1487 Example Quail Lane, Faketown, Utah

Run on 2026-11-10 by following SKILL.md exactly: `file-exports.md`, `audit-rules.md`, `utah-repc-deadlines.md` and `deadline-code.md` read; the wire screen run first (nothing found); the file JSON written (`files/file.json`) and the code extracted from `deadline-code.md` and run (`files/tc_dates.md`, `files/tc_dates.json`). Inputs: the four practice files. Prompt as in evals.json.

Result: **pass, 10 of 10 expectations.** Objective checks in `objective-checks.txt`: all pass.

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Missing: earnest money receipt (Saturday, October 31, 2026, 10 days past) and Lead-Based Paint Disclosure (1974; Tuesday, November 3, 2026, 7 days past); settlement statement and CDA only as not yet due | Pass | Missing Items table, two rows; the "Not in the file yet, due after this week" line; Flag 1 |
| 2 | Incomplete: Addendum No. 2, "Buyers only" | Pass | Incomplete Items table, row 13 quoted |
| 3 | Due Diligence Deadline Thursday, November 12, 2026, 2 days, Addendum No. 1 cited with the November 9 date it replaced, flagged inside 3 days | Pass | Flag 2; calendar row (b) |
| 4 | Settlement stays Friday, December 4, 2026 (24); December 11 only as proposed, with signatures and who decides; never "extended" | Pass | Flag 3; "Proposed, not in effect per the documents shown"; objective check on never-say words |
| 5 | Days remaining computed in code and correct (-7, 2, 14, 24), with the arithmetic | Pass | `files/tc_dates.md`; Check Before Sending; objective check recomputes every row and every written-out difference |
| 6 | Due This Week: objection November 11, Due Diligence November 12, appraisal November 13, past-due items first | Pass | Due This Week |
| 7 | Agent message (Title Case subject; receipt, disclosure, sellers' signatures with dates); broker note asks for review only | Pass | "Missing Documents for 1487 Example Quail Lane"; "Compliance Review: 1487 Example Quail Lane (Testcase Purchase)"; "Please review the file" |
| 8 | No compliance or sufficiency claim; statuses quoted as the export's | Pass | Objective check; "export status: Pending Review," "Status: Not Uploaded" |
| 9 | What I Used: four files, as-of from the prompt, Utah mode and footer, Radon Test Results, page initials not shown | Pass | What I Used, eight lines |
| 10 | Check Before Sending with dates, sources, arithmetic, statuses, $5,000 and names; no dashes | Pass | Check Before Sending; objective checks |

## Objective Checks

All pass. The one number from a reference, not the inputs, is 21 (the REPC's Section 21, quoted for the 5:00 PM Mountain Time rule and "in writing by all parties").

## Fixed Before Grading

- The first bottom line said "due diligence ends in 2 days," a paraphrase that reads like a statement about the buyers' rights. It now says "the Due Diligence Deadline is in 2 days."
- The code first printed "1 days" and listed the open addendum under "Past Due"; the code now says "1 day" and lists items with no checklist date on their own line.
