# Grading: Eval 1, New Listing With a Finished Basement

Run on 2026-11-08 by following SKILL.md 1.1 exactly, with `comp-method.md`, `market-metrics.md`, `objections.md` and `utah-pricing-context.md` read where SKILL.md says to. The CMA report was read as a PDF (3 pages) and the MLS export as a CSV (13 listings); the comp math was done in code and matched the CMA's own figures (for example its $535,714 average sold price).

Prompt: "Listing appointment Thursday with Dana and Lee Pretendson at 1186 W Sample Orchard Ln. They want $640,000. Their reasoning: the house has 2,850 finished square feet and the neighbor's two-story on Fictional Fox Way sold for $585,000 with only 2,050. ..."

Result: **pass, 8 of 8.**

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Above grade and basement compared separately; price per above-grade sq ft; never priced on total | Pass | Comp table has "Above grade", "Basement (fin)" and "Per above-grade sq ft" columns ($383.33, $387.05, $329.47, $330.41, $285.37). No total-square-foot pricing anywhere; the CMA's $279.07 "Avg Price / Total Fin SqFt" is not used. |
| 2 | Square footage argument answered with the split and the $8,000 concessions | Pass | Objection 1: "the neighbor's home at 1311 W Fictional Fox Way has 2,050 square feet upstairs and no basement. Yours has 1,450 upstairs and 1,400 finished downstairs ... sold with $8,000 in seller concessions, so it netted $577,000." |
| 3 | No basement sale in the subdivision; Makebelieve sales labeled older and farther; no invented basement value | Pass | "no sale in Sample Orchard Estates has a basement ... treat that gap as direction, not a dollar value for the basement." Both rows say "**Older** (about 7 months / about 11 months)" and "**farther**". |
| 4 | One price inside a stated range, range above $497,500 and no higher than $564,900, confidence with reason | Pass | $549,900 in $545,000 to $560,000; "Confidence: medium. Strong evidence for the floor, but only two finished-basement sales, both older than six months and outside the subdivision." |
| 5 | $640,000 above every sale; Utah appraisal condition explained without a promise | Pass | Bottom line: "above every sale in this CMA (the highest is $612,000 ...)". Appraisal check: "the buyer can cancel by the Financing & Appraisal Deadline ... It's a right to cancel, not an automatic price cut ... No appraisal outcome is certain." |
| 6 | Metrics labeled this comp set, with math | Pass | Section heading "Market Read (This Comp Set)"; "5 ÷ 6 = 0.83 ... 2 actives ÷ 0.83 = 2.4 months"; sale-to-list median 99.5%, sale-to-original median 98.8%; first-price versus reduced; 2 of 3 actives cut; 4 of 7 solds with concessions; both expireds. Trend skipped with the reason. |
| 7 | Seller summary: Title Case title, bolded bottom line, no agent-only fields, not an appraisal | Pass | "Pricing Summary For 1186 W Sample Orchard Ln"; bolded first line; objective check found 0 of 2291, 6610, 4402, "Lockbox", "relocating", "Cash offer", "firm on price", "Go and show", "Appointment required"; "This is my price opinion based on a comparative market analysis, not an appraisal." |
| 8 | Numbers traced, Check before sending by MLS number, no dashes | Pass | See objective checks. |

## Objective Checks (`evals/make/objective_checks.py`)

| Check | Result | Evidence |
|---|---|---|
| Every number in the output appears in the inputs | Pass | 117 numbers; 23 not literally in the files, each arithmetic shown in the output: ratios (97.3, 97.7, 98.8, 99.5, 99.6), price per above-grade sq ft, prices after concessions (494,500, 546,000, 577,000), 600 (2,050 minus 1,450), 15,000 (each cut), 75,100 ($640,000 minus $564,900), 0.83 and 2.4 (months of supply), 13 (listings counted). The recommendation, the range and the $550,000 search line are labeled as the agent's call in Check before sending. |
| Deadlines match the uploaded contract | N/A | No contract uploaded; the appraisal deadline is described, not dated. |
| No em or en dashes | Pass | 0 |
| Title Case subject lines | Pass | No email was asked for; the summary title is Title Case. |
| "Check before sending" section | Pass | Section 8, by MLS number, plus data gaps. |
| No cost estimates without bids | Pass | No repair or upgrade costs; the kitchen and furnace get no dollar value. |
| No agent-only MLS fields in client-facing text | Pass | 0 hits for every code and remark in the export. |
| No protected-class language | Pass | Property features only. |
| No wire or account details | Pass | None. |

## Changes Made From This Run

- First draft wording "Older (7 months)" was imprecise; changed to "about 7 months" and "about 11 months".
- The first draft named "$555,000" as a hypothetical; removed so the only figures not in the files are arithmetic or the labeled recommendation.

## Baseline (No Skill), Same Prompt and Files: `baseline.md`

| # | Baseline result |
|---|---|
| 1 | Fail. It invented "basement space at about 50% to 60% of above-grade space," priced the basement at $166 a sq ft, reached $713,800, and listed the comps by total square footage ("2,820 sf total") with a $279 average per total square foot. |
| 2 | Partial. The script uses 2,050 versus 1,450 but misses the $8,000 concessions. |
| 3 | Fail. Invented dollar adjustments for the basement and for the kitchen and furnace ("$10,000 to $15,000"), plus "prices have generally risen this year"; the Makebelieve sales aren't labeled older or farther. |
| 4 | Fail. Range $559,900 to $569,900 runs above the $564,900 active that has sat 52 days, and the pick equals it. No confidence level. |
| 5 | Partial. Says no comp supports $640,000, but the appraisal note is generic and wrong for Utah ("the buyer may ask for a reduction or walk"), with an invented appraisal figure. |
| 6 | Fail. "Months of supply is very low" with no math and no label. |
| 7 | Fail. No seller summary. It suggests telling the sellers about the pending's cash buyer and a comp seller's relocation, both from agent-only remarks. |
| 8 | Fail. Invented numbers and no Check before sending. |

**Baseline: 0 of 8 pass (2 partial), against 8 of 8 with the skill.** The skill's biggest additions: no invented basement or upgrade values, the concessions read, a range that respects the stale active, Utah's appraisal condition stated correctly, and agent-only remarks kept out.

## Review Note (2026-11-08)

The reviewer ran case 2 and the practice set, not this case. One line here was changed after the review: the Zillow answer said online sites "don't have the closed prices I'm showing you," which couldn't be confirmed from a primary source. It now says they "may not have" them, as `references/objections.md` now requires. The appraisal check also no longer names the "Financing & Appraisal Deadline": two REPC versions are in use until January 1, 2027 and they name the deadline differently, so it now says "the contract's appraisal deadline." Expectation 5 still passes (it explains the condition as a right to cancel, not an automatic price cut). The grading above is otherwise unchanged.
