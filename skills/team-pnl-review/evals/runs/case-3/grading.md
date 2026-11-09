# Grading: Case 3, No Production File (QuickBooks Desktop Style PDF)

Run: SKILL.md followed as written. The code was extracted from references/analysis-code.md and run on evals/files/case3/butterscotch-profit-and-loss-jan-oct-2026.pdf (pdfplumber). Analysis files: files/pnl_report.md, files/pnl_report.json, files/pnl_accounts.csv. Output: output.md.

Result: 11 of 11 expectations pass after the fixes below; every applicable objective check passes. Rerun on 2026-11-08 after fix 5 (the code's owner draw question changed; every other figure in the run is identical).

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | All ten months read from the PDF; totals check passes | Pass | What I Used: "Jan 2026 to Oct 2026 (10 months)... Totals check: passed" |
| 2 | Cost per closing can't be computed without a production export; the export and its source named; no figure given | Pass | "Not available. This P&L has no count of closings..." with Sisu, back office and spreadsheet; Owner Brief gap line |
| 3 | No closings estimate from Transaction Coordinator Fees or any other line | Pass | "The Transaction Coordinator Fees line moves with closings, but... isn't used"; no closings count anywhere |
| 4 | Period margin with arithmetic (56,804.08 / 283,424.24 = 20.0%) and company dollar arithmetic | Pass | Company Dollar and Margin, Period line |
| 5 | Owner's Draw (60,000.00) flagged as an expense; net income before it (116,804.08); owner pay question to the CPA | Pass | Anomaly 1, the "Before the owner's draw line" arithmetic, Questions for the CPA |
| 6 | The bookkeeper question and email on Owner's Draw ask only what the line holds, with no suggestion of where owner pay belongs; that goes only to the CPA | Pass (after fix 5) | Question 1: "Does it hold only owner pay, with no other payments mixed in? I'm asking the CPA how owner pay should be recorded"; email item 1 asks the same and says to leave it as is; the only recording question is under Questions for the CPA |
| 7 | September Print & Signs spike (5,340.75 against a usual 590.45) flagged | Pass | Anomaly 2 |
| 8 | Year to date January to October; no prior-year comparison | Pass | What Changed, Year to date |
| 9 | One-page owner brief with the cost-per-closing gap line | Pass | 235 words; "Cost per Closing: Not available. Add a closed-deal export..." |
| 10 | No benchmark, industry average or typical-team figure | Pass | Objective check: no benchmark language |
| 11 | Check Before Sending present | Pass | 10-row table |

## Objective Checks

| Check | Result |
|---|---|
| Every number in the output appears in the inputs or the run's analysis output | Pass: 388 numbers, none untraced (after fix 3) |
| Deadlines match the uploaded contract | Not applicable |
| No em or en dashes | Pass: 0 |
| Title Case subject lines | Pass: 1 of 1 |
| Check Before Sending section | Pass |
| No cost estimates without bids | Pass |
| No agent-only MLS fields in client-facing text | Not applicable |
| No protected-class language | Pass |
| No wire or account details | Pass |
| No client, agent or employee names | Pass (the PDF has none) |
| No benchmark language | Pass |
| Bottom line three sentences or fewer | Pass: 3 |

## Failures Found and Fixed

1. **The PDF title read as the column header.** "January through October 2026" has two month words, so the first run took it for the header and read only two columns (January and October, with February's numbers under October). Fix: a header line must be at least three quarters month or Total tokens. Rerun: ten months.
2. **The page footer read as an account.** "Page 1 of 1" became an account worth 1.00 under April, and the totals check caught it (April off by 1.00). Fix: parsing stops at Net Income and skips page footers. Rerun: totals tie.
3. **Stale numbers in the first draft.** The first output.md quoted "18 accounts" and 133.05 of interest income from the run before fix 2; the objective check flagged both as untraced. Corrected to the rerun's 17 and 132.05.
4. **A trivial "decision."** Under the first decision rule, the one decision would have been a 25.75 a month software price change. Fix in review-rules.md: owner draws recorded as expenses now come before price changes, and a recurring charge or price increase must be 100.00 a month or more to be the owner's decision. Rerun: the decision is how owner pay is recorded.
5. **A recording suggestion in a bookkeeper draft.** The first output asked the bookkeeper "Should it sit in an equity account instead?" about Owner's Draw. That proposes how owner pay should be recorded, which is the CPA's call, so it failed the new expectation 6. Fix: the code's question now asks only whether the line holds owner pay and nothing else; review-rules.md (flag table) and pnl-terms.md (Owner Pay) say the bookkeeper gets only that question and the drafts never suggest where the line belongs; SKILL.md's guardrail says no draft proposes a recording method or tax treatment. Rerun: Question 1 and email item 1 ask what the line holds; the CPA question is unchanged.
