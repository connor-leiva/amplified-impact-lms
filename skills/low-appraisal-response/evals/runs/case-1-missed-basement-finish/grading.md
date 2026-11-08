# Grading: Case 1, Missed Basement Finish (Buyer Side, November 1, 2026 REPC)

Run 2026-11-08 by following SKILL.md and its references on the three files in `evals/files/case-1-missed-basement-finish/`. Output: `output.md`. Baseline (same prompt and files, no skill): `baseline.md`.

## Expectations

| # | Expectation | Skill | Evidence | Baseline |
|---|---|---|---|---|
| 1 | Bold warning first: Appraisal Deadline 5:00 PM MT November 10, 2026, Section 4(c) and 12.2, November 1, 2026 REPC named from the footer | Pass | Flags, first bullet, in bold; Clock table cites the footer, 4(c), 12.2 and Section 25's weekend rule | Fail: mentions "November 10, 2026" with no time, section, version or warning |
| 2 | Gap as arithmetic: $575,000 minus $538,000 = $37,000 | Pass | The Gap: "$575,000 contract price minus $538,000 appraised value = $37,000, about 6.4%" | Pass |
| 3 | Finds the grid and Levels table say unfinished while the sketch, photos and MLS show 980 finished with a bedroom and bath | Pass | Fact Check table cites page 3 (grid), page 2 (Levels), page 5 (sketch), page 6 (photo labels) and MLS #2290455 | Partial: catches the grid versus MLS and mentions the sketch; no Levels table, photos or page references |
| 4 | Effect with the report's own rates ($30, $7,500), naming -$27,000, -$30,000, -$25,500 and -$7,500, labeled arithmetic not a value | Pass | "The Report's Own Rates" table with the label; each comparable moves $36,900; kept out of the request | Fail: says adjustments "would largely go away," no arithmetic |
| 5 | Grounds Strong, no promise, no criticism | Pass | "Grounds: Strong" with three reasons and "No reconsideration is guaranteed to change the value" | Fail: "I'm confident that once the basement is counted correctly, the value should come up significantly"; "the appraiser made an error" |
| 6 | Request to Example Lending Group with borrower names, address, effective date 11/04/2026, appraiser, date of request, deficient items with pages and sources; no target value; nothing to the appraiser | Pass | Reconsideration request has every field, page references, MLS number, no value, addressed to the loan officer | Fail: no effective date, appraiser, request date or pages; asks to "bring the value closer to the contract price of $575,000"; recommends agents "reach out to the appraiser directly" |
| 7 | Says the request likely can't finish before the deadline: extension signed before 5:00 PM November 10 or decide; cancellation needs written notice plus a complete copy of the appraisal | Pass | Clock and Options sections; "complete copy of the appraisal" quoted from 12.2(a) | Partial: suggests an extension; no time, no complete-copy requirement |
| 8 | Covering the gap: loan based on the lower of price and value, lender confirms, no loan amount computed | Pass | The Gap and Option 3 | Fail: "The buyers could bring an extra $37,000," which understates the cash |
| 9 | Title Case subject, no agent-only fields, Check before sending, no em or en dashes | Pass | Objective checks below; lockbox code 2468 and showing instructions appear nowhere | Fail: subject "Update on your appraisal," no Check before sending, 5 em dashes and 1 en dash, "don't hesitate to reach out" |

**Skill: 9 of 9. Baseline: 1 of 9 (2 partial).**

## Objective Checks

From `objective-checks.txt` (the script reads all three PDFs, the prompt and the skill's references):

| Check | Skill | Baseline |
|---|---|---|
| Every number appears in the inputs or is listed arithmetic | Pass (computed: 37,000; 6.4; 2,400; 600; 3,900; 578,050; 568,200; 573,200; 36,900; 29,400; 18,500; 556,500; 33,000; 37,500; 60) | Pass |
| Deadlines match the uploaded contract | Pass: November 10 (4(c)), November 17 (4(d)), November 24 (4(e)), 5:00 PM MT (Section 25) | Partial: date only |
| No em or en dashes | Pass | Fail |
| Title Case subject lines | Pass (3 subjects) | Fail |
| Check before sending section | Pass | Fail |
| No cost estimates without bids | Pass (none) | Pass |
| No agent-only MLS fields in client-facing text | Pass | Pass |
| No protected-class language | Pass | Pass |
| No wire or account details | Pass | Pass |
| No criticism of the appraiser, no promised value change | Pass | Fail (by reading: "appraiser made an error," "I'm confident ... the value should come up") |

## What Changed During This Run

- First draft of the bottom line said each comparable was adjusted down "$34,500." The grid shows $34,500, $37,500 and $33,000 (basement plus rooms). Corrected to "$33,000 to $37,500" before grading.
- The objective-check script's sentence capture returned only the matched word, so "No reconsideration is guaranteed" failed the promise check. Fixed the script to test the whole sentence; rerun passes.

## What the Skill Added Over the Baseline

The baseline found the main error but would have sent the buyers into a Tuesday deadline without the time, the section or the complete-copy rule; told the agent to contact the appraiser; asked the lender for a value near the contract price; promised the value would come up; and understated the cash needed to cover the gap. The skill caught the report contradicting itself (sketch and photos), showed the effect with the report's own rates, wrote a request with the fields conventional lenders require, and kept the money and deadline language accurate.
