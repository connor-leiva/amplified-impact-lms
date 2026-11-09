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

## Independent Review (November 8, 2026)

A second reviewer ran the practice files from scratch before reading output.md or sample.md, with the practice prompt from page-notes.md: SKILL.md followed as written, the code extracted from references/analysis-code.md and run on both practice files. The analysis files matched files/ byte for byte. Output: review-output.md.

| # | Check | Review run | Evidence |
|---|---|---|---|
| 1 | Gross every month, confirmed against the export | Pass | Section 3: "Every month's commission income matches that month's gross GCI in the production file" |
| 2 | Pending and canceled deals left out | Pass | "Left out: 2 rows with a status of Pending and 1 Cancelled"; 77 closings |
| 3 | Brokerage step-down asked, not asserted | Pass | Section 3 and a question for the broker, including when the cap year resets |
| 4 | Video Editing App new recurring at 79.00 since June | Pass | Anomaly 2; bookkeeper question 2 |
| 5 | Google PPC August spike | Pass | Anomaly 3; bookkeeper question 3 |
| 6 | Pumpkinpatch Portal price change is the decision | Pass | Bottom line: "keep or cancel Pumpkinpatch Portal at 3,000.00 a month since July 2026 (it was 2,500.00)" |
| 7 | Uncategorized 486.20 in July | Pass | Anomaly 1; bookkeeper question 1 |
| 8 | Lanternfly Leads as pay at close | Pass | Lead sources: "46,882.21 / 75,196.65 = 0.62 per $1 of fees" with the explanation |
| 9 | Cost per closing with arithmetic | Pass | "304,883.76 / 77 = 3,959.53" and four more lines |
| 10 | No client name or address | Pass | Objective check: none |

Objective checks (`objective_checks.py evals/runs/practice --file review-output.md ...`): 537 numbers, none untraced; 0 dashes; Title Case subject; Check Before Sending present; no names, account details or benchmark language; bottom line 3 sentences.

### What the comparison found, and what changed

Both runs found all ten items. Three differences showed the skill was ambiguous, and each was fixed in the skill and in output.md (and so sample.md):
1. **The broker question had nowhere to go.** review-rules.md routes cap and fee questions to the broker, but SKILL.md's output listed only bookkeeper and CPA questions, so output.md asked the bookkeeper whether "the brokerage's charges changed" and the brief said "confirm whether we capped" with no one asked. SKILL.md step 5 and output item 9 now include Questions for the Broker when a cap, fee or referral question comes up; the flag table says what to ask the broker (cap, fee schedule, when the cap year resets) and the bookkeeper (only whether anything is missing). output.md now has a Questions for the Broker section.
2. **"About 2%".** output.md folded the run's 1.9% to 3.2% into "about 2%" (and said so in a note), against the rule to use the run's figures as printed. review-rules.md now says not to fold several months into one rounded figure; output.md gives "1.9% to 2.2% since" June and 3.2% in May.
3. **The decision's wording.** output.md offered "keep Pumpkinpatch Portal at 3,000.00 a month or take it back down," an option the files don't show exists; it now reads "keep or cancel," as the decision rule writes it. The bottom line's "looks like a cap" became a question for the broker, and the biggest-change line no longer credits lower brokerage fees alone (the run's month lines show referral fees going from 13,998.25 to 0.00 as well).

Objective checks on the updated output.md: 524 numbers, none untraced; every other check passes. sample.md is a copy of the updated output.md.
