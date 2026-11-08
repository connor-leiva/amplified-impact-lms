# Grading: Case 1, Mixed Gross and Net Recording (and the No-Skill Baseline)

Run: SKILL.md followed as written. The code was extracted from references/analysis-code.md and run on evals/files/case1/gingersnap-pnl-by-month-jan-jun-2026.xlsx with --production evals/files/case1/sisu-transactions-download-jan-jun-2026.csv. Analysis files: files/pnl_report.md, files/pnl_report.json, files/pnl_accounts.csv. Output: output.md. Baseline: baseline.md, the same prompt and files answered without SKILL.md or the references.

Result: 11 of 11 expectations pass; every applicable objective check passes. The baseline passes 0 of 11.

## Expectations

| # | Expectation | Skill | Baseline | Evidence |
|---|---|---|---|---|
| 1 | Figures from the code; totals check passes for all six months | Pass | Fail | Skill: What I Used, "Totals check: passed." Baseline: computed in pandas but never checked the accounts against the report's totals |
| 2 | Before any ratio, April is named as recorded net; the other five months gross | Pass | Fail | Skill: How Revenue Is Recorded comes before Company Dollar and names April and the five gross months. Baseline: reads April as "commission splits were never recorded" |
| 3 | Production file shows April income = team's share 63,691.41, not GCI 147,457.50 | Pass | Fail | Skill: "April's P&L commission income of 63,691.41 matches the team's share in the production file, not April's GCI of 147,457.50," plus the April components from the run. Baseline: only a period-level gap ("about $76,566 lower than Sisu GCI") |
| 4 | Says what still compares and what doesn't; ratios on gross commission leave April out | Pass | Fail | Skill: "Still compares across all six months: company dollar, net income and margin on company dollar"; company dollar share of gross commission uses "gross months only." Baseline: gross margin 100.0% and net margin 28.8% for April, a 43.2% blended gross margin |
| 5 | Nothing treats April's lower commission income as a drop in business | Pass | Fail | Skill: "April's commission income is not a drop in business." Baseline: "Revenue dropped to $64,891, less than half of March" |
| 6 | Company dollar and margin by month and period, with arithmetic | Pass | Fail | Skill: seven arithmetic lines and the table. Baseline: no company dollar |
| 7 | Expense mix as a share of company dollar, with arithmetic | Pass | Fail | Skill: Expense Mix table, e.g. "150,028.50 / 306,184.84 = 49.0%." Baseline: none |
| 8 | Cost per closing from the 56 closings, with arithmetic | Pass | Fail | Skill: "Operating expenses per closing = 274,678.55 / 56 = 4,904.97" and four more lines. Baseline: $12,257 per closing, which counts agent splits as a cost of running the team |
| 9 | Bookkeeper asked about April and to restate it; decision is one recording method and restate April | Pass | Fail | Skill: Question 1 and the bottom line's decision. Baseline: asks the bookkeeper to "record April's missing commission splits," which would double-count them if April was recorded net |
| 10 | Owner brief and Title Case bookkeeper email; no client name anywhere | Pass | Fail | Skill: both drafted; subject "Questions On The January To June P&L"; objective check found no client name. Baseline: a partner summary, no email |
| 11 | Check Before Sending traces the drafts' numbers to the run | Pass | Fail | Skill: 13-row table with the run section for each. Baseline: none |

## Objective Checks (skill run)

Script: `python3 -I evals/make/objective_checks.py evals/runs/case-1 [both input files] --prompt "[prompt]"`

| Check | Result |
|---|---|
| Every number in the output appears in the inputs or the run's analysis output | Pass: 387 numbers, none untraced |
| Deadlines match the uploaded contract | Not applicable (no contract) |
| No em or en dashes | Pass: 0 |
| Title Case subject lines | Pass: 1 of 1 |
| Check Before Sending section | Pass |
| No cost estimates without bids | Pass: no estimates of any kind; every figure is from the run |
| No agent-only MLS fields in client-facing text | Not applicable (no MLS data) |
| No protected-class language | Pass: none |
| No wire or account details | Pass: none |
| No client, agent or employee names | Pass: none of the 63 names in the Sisu file |
| No benchmark language | Pass |
| Bottom line three sentences or fewer | Pass: 3 |

## Objective Checks (baseline)

| Check | Result |
|---|---|
| Every number traces to the inputs | Fail: 31 figures don't appear in the inputs as written. Most are whole-dollar roundings or totals computed off the page with no arithmetic shown (total income $725,098, gross profit $313,385); one is an assumption, a "55% to 60%" split rate used to call April's profit overstated |
| Check Before Sending section | Fail: missing |
| No benchmark language | Fail: "industry norms for real estate teams" (the check now looks for this phrase) |
| No em or en dashes, no names, no account details | Pass |

## What the Skill Adds Over the Baseline

The baseline found the odd month but read it backwards: it decided April's splits were missing, told the owner April's profit was "overstated by tens of thousands of dollars" (an estimate from an assumed split rate), and told the bookkeeper to add splits that the production file shows were already netted out. It reported April as the best month by margin (28.8% net, 100% gross), blended net and gross months into a 43.2% gross margin, counted agent splits in cost per closing ($12,257), compared the team to "industry norms" it never named, and suggested the owner look at whether staffing is "right-sized," a decision about people. It had no email, no Check Before Sending and no arithmetic a bookkeeper could follow. The skill caught the net month, proved it with the production file, kept every ratio on company dollar so April compares, and asked the right person the right question.

## Failures Found and Fixed

None on this case's expectations. Two fixes made while building it apply here:
- The first fixture had made-up margins above 50% of company dollar, unlike real team P&Ls; payroll, lead spend and rent were raised in the generator so the run reads like a working team (12.6% for the period).
- A client surname in the generator ("Gingersnap") matched the team's name and tripped the names check; the generator now uses another made-up surname. The analysis code was unchanged.

## Rerun on 2026-11-08

The code was changed after this case was graded (revenue share income, per-deal brokerage fees in Cost of Goods Sold, referral gifts, guaranteed payments, the owner draw question). Rerun on the same files: pnl_report.md, pnl_report.json and pnl_accounts.csv are identical, so output.md stands, and the objective checks pass again.

## Independent Review (November 8, 2026)

A second reviewer ran this case from scratch before reading output.md: SKILL.md followed as written, the code extracted from references/analysis-code.md and run on the same two files. The analysis files matched files/ byte for byte. Output: review-output.md.

| # | Expectation | Review run | Evidence |
|---|---|---|---|
| 1 | Figures from the code; totals check passes | Pass | What I Used: "every month's accounts add up to the report's own section totals and Net Income" |
| 2 | April named as net before any ratio; five months gross | Pass | Section 3 comes before Company Dollar and Margin and names April and the five gross months |
| 3 | April income = team's share 63,691.41, not GCI 147,457.50 | Pass | "April's commission income of 63,691.41 matches the team's share, not April's GCI of 147,457.50" |
| 4 | What compares and what doesn't; ratios on gross commission leave April out | Pass | "What still compares" and "What doesn't"; 242,493.43 / 654,206.25 = 37.1% on the gross months only |
| 5 | April not treated as a drop in business | Pass | "April was not a slow month: it had 10 closings" |
| 6 | Company dollar and margin with arithmetic | Pass | Seven arithmetic lines and the table |
| 7 | Expense mix on company dollar with arithmetic | Pass | Expense Mix table |
| 8 | Cost per closing from 56 closings | Pass | "274,678.55 / 56 = 4,904.97" and four more lines |
| 9 | Bookkeeper asked about April and to restate; decision is one method and restate April | Pass | Bookkeeper question 1; bottom line and The Decision |
| 10 | Owner brief, Title Case email, no client names | Pass | "Questions On The January To June 2026 P&L"; objective check: no names |
| 11 | Check Before Sending traces the drafts | Pass | 11-row table with the run section for each item |

Objective checks (`objective_checks.py evals/runs/case-1 --file review-output.md ...`): 410 numbers, none untraced; 0 dashes; Title Case subject; Check Before Sending present; no names, account details, protected-class words or benchmark language; bottom line 3 sentences.

Compared with output.md: the two runs agree on every finding, figure and question. Differences are wording only (the review run asks the bookkeeper what the extra 2,500.00 a month in Online Lead Programs covers; output.md also asks for a sub-account per lead vendor). No expectation was missed, so nothing in this case needed a fix. The skill changes made during the review (broker questions in the output, no folding several months into one rounded share, lead spend that can't be tied to a source, months read in calendar order) don't change this case's analysis files or any expectation, so output.md stands.
