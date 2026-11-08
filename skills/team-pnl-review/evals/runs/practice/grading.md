# Grading: Practice Files

Run: SKILL.md followed as written, with both practice files attached and the practice prompt from page-notes.md ("Here's our P&L and our closed deals. How are we doing, and what should I look at?"). The code was extracted from references/analysis-code.md and run on practice/PRACTICE Team P&L by Month Jan-Sep 2026.xlsx with --production "practice/PRACTICE Closed Deals Export Jan-Sep 2026.csv". Analysis files: files/. Output: output.md, kept as sample.md.

Result: 10 of 10 checks pass; every applicable objective check passes.

## Checks (what the practice files plant, from evals/make/planted/practice.json)

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Revenue read as gross every month, confirmed against the closings export | Pass | How Revenue Is Recorded; every month "matches gross GCI" in the run |
| 2 | Pending and canceled deals left out of the closings count | Pass | "Left out: 2 pending deals and 1 canceled deal"; 77 closings counted |
| 3 | The brokerage fee step-down is reported as a question (cap, fee change, or missing), not a fact | Pass | Bottom line, How Revenue Is Recorded, Anomaly 1, Question 4 |
| 4 | Video Editing App flagged as a new recurring charge since June at 79.00 | Pass | Anomaly 3 |
| 5 | Google PPC August spike (3,940.85 against a usual 1,264.12) flagged | Pass | Anomaly 4 |
| 6 | Pumpkinpatch Portal price change from 2,500.00 to 3,000.00 in July flagged, and it is the one decision (500.00 a month, above the 100.00 default) | Pass | Anomaly 5; bottom line; Owner Brief |
| 7 | Uncategorized Expense 486.20 in July flagged for the bookkeeper | Pass | Anomaly 2; Question 1 |
| 8 | Lanternfly Leads treated as pay at close, its referral fees as its cost | Pass | Lead sources table and note: 0.62 per $1 of fees |
| 9 | Cost per closing from the export, with arithmetic | Pass | Five lines, e.g. "304,883.76 / 77 = 3,959.53" |
| 10 | No client name or address from the export anywhere | Pass | Objective check: none |

## Objective Checks

| Check | Result |
|---|---|
| Every number in the output appears in the inputs or the run's analysis output | Pass: 498 numbers, none untraced |
| No em or en dashes | Pass: 0 |
| Title Case subject lines | Pass: 1 of 1 |
| Check Before Sending section | Pass |
| No cost estimates without bids | Pass |
| No protected-class language | Pass |
| No wire or account details | Pass |
| No client, agent or employee names | Pass |
| No benchmark language | Pass |
| Bottom line three sentences or fewer | Pass: 3 |
| Deadlines, MLS fields | Not applicable |

## Failures Found and Fixed

1. **Misleading "usual" brokerage share.** The first run printed "usual 3.2%" for brokerage fees, the median of all nine months, which hides a step from 6.0% to about 2%. Fix: the brokerage flag now compares each month to the months before it and fires once, at the step; the summary line lists the shares without a "usual." Rerun: "fell from about 6.0% of commission income (Jan 2026 to Apr 2026) to: May 2026 3.2%..."
2. **A conclusion where the skill should ask.** The first draft said lower split months were "expected, not a recording problem." Softened to say they "can run lower" and that the matching production file doesn't point to a recording problem.
3. **Unrealistic margin.** As in the other cases, the generator's expenses were raised so the practice P&L reads like a working team (12.1% for the period).

## Rerun on 2026-11-08

Rerun with the updated code (revenue share income, per-deal brokerage fees in Cost of Goods Sold, referral gifts, guaranteed payments, the owner draw question): the analysis files are identical, so output.md and sample.md stand. Objective checks rerun: all pass. The new account rules are covered by evals/make/classifier_check.py (25 account names plus a made-up end-to-end P&L): PASS.
