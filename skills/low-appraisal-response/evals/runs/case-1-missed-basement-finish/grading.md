# Grading: Case 1, Missed Basement Finish (Buyer Side, November 1, 2026 REPC)

Run 2026-11-08 by following SKILL.md (version 1.0, final) and its references on the three files in `evals/files/case-1-missed-basement-finish/`, with today taken as Sunday, November 8, 2026. Output: `output.md`. Baseline (same prompt and files, no SKILL.md and no references): `baseline.md`.

## Expectations

| # | Expectation | Skill | Evidence | Baseline |
|---|---|---|---|---|
| 1 | Bold warning first: Appraisal Deadline 5:00 PM MT November 10, 2026, Section 4(c) and 12.2, November 1, 2026 REPC named from the footer | Pass | Flags, first bullet, in bold; the Clock table quotes the footer, 4(c), 12.2(a) and Section 25's weekend rule | Fail: "November 10, 2026" with no time, section, version or warning |
| 2 | Gap as arithmetic: $575,000 minus $538,000 = $37,000 | Pass | The Gap: "$575,000 contract price minus $538,000 appraised value = $37,000, about 6.4%" | Pass |
| 3 | Grid and Levels table say unfinished; sketch, photos and MLS show 980 finished with a bedroom and bath | Pass | Fact Check table cites page 3 (grid), page 2 (Levels), page 5 (sketch), page 6 (photo labels) and MLS #2290455 | Partial: grid versus MLS and the sketch; no Levels table, photos or page references |
| 4 | Effect with the report's own rates ($30, $7,500), naming -$27,000, -$30,000, -$25,500 and -$7,500, labeled arithmetic, not a value | Pass | "The Report's Own Rates" table with the required label; each comparable moves $36,900; kept out of the request | Fail: "would largely go away," no arithmetic |
| 5 | Grounds Strong, no promise, no criticism | Pass | "Grounds: Strong" with three reasons and "No reconsideration is guaranteed to change the value" | Fail: "I'm confident that once the basement is counted correctly, the value should come up significantly"; "the appraiser made an error" |
| 6 | Request to Example Lending Group with borrower names, address, effective date 11/04/2026, appraiser, date of request, items with pages and sources; no target value; nothing to the appraiser | Pass | Request has every field, page references and the MLS number, asks for review "as the appraiser sees fit," addressed to [Loan Officer Name], Example Lending Group | Fail: no effective date, appraiser, request date or pages; asks to "bring the value closer to the contract price of $575,000"; tells agents to "reach out to the appraiser directly" |
| 7 | The request likely can't finish before the deadline: extension signed before 5:00 PM November 10 or decide; cancellation needs written notice plus a complete copy of the appraisal | Pass | Flags, the Clock and Options; "along with a complete copy of the appraisal" quoted from 12.2(a) | Partial: suggests an extension; no time, no complete-copy requirement |
| 8 | Covering the gap: loan based on the lower of price and value, lender confirms, no loan amount computed | Pass | The Gap and Option 3; the $546,250 loan is quoted from the REPC, never recomputed | Fail: "The buyers could bring an extra $37,000," which understates the cash |
| 9 | Financing condition is not a free fallback: cancelling under 12.3(a) by November 17 releases 50% of $8,000 ($4,000) to the seller; a timely appraisal cancellation releases all of it | Pass | The Clock, third bullet; Option 4; client email option 5; Check before sending row | Fail: not mentioned |
| 10 | Title Case subject, no agent-only fields, Check before sending, no em or en dashes | Pass | Objective checks below; lockbox code 2468, "Seller prefers a 30 day close" and the showing phone number appear nowhere | Fail: subject "Update on your appraisal," no Check before sending, 5 em dashes and 1 en dash in the original, "don't hesitate to reach out" |

**Skill: 10 of 10. Baseline: 1 of 10 (2 partial).**

## Objective Checks

From `objective-checks.txt` and `baseline-objective-checks.txt` (the script reads the three PDFs, the prompt and, for the skill run, the skill's references):

| Check | Skill | Baseline |
|---|---|---|
| Every number appears in the inputs or is listed arithmetic | Pass (computed: 37,000; 6.4; 2,400; 600; 3,900; 578,050; 568,200; 573,200; 36,900; 29,400; 33,000; 34,500; 37,500; 18,500; 556,500; 4,000; 60) | Pass |
| Deadlines match the uploaded contract | Pass: November 10 (4(c)), November 17 (4(d)), November 24 (4(e)), 5:00 PM MT (Section 25), checked by hand against REPC page 1 | Partial: date only |
| No em or en dashes | Pass | Fail (in the original response) |
| Title Case subject lines | Pass (3 subjects) | Fail |
| Check before sending section | Pass | Fail |
| No cost estimates without bids | Pass (none) | Pass |
| No agent-only MLS fields in client-facing text | Pass | Pass |
| No protected-class language | Pass | Pass |
| No wire or account details | Pass | Pass |
| No criticism of the appraiser, no promised value change | Pass | Fail by reading ("the appraiser made an error," "the value should come up significantly"); the script's word list misses both |

## What Changed in This Run

- This rerun follows the final SKILL.md, which added two checks after the first build: read every addendum for an appraisal gap term, and show that the financing condition isn't a free fallback. The output now has "No addendum or appraisal gap term was uploaded" and the $4,000 financing-cancellation comparison. A new expectation (9) covers the second.
- The client email's opening no longer says the appraisal "missed" the basement. It now states what the report's grid shows, which keeps it a description of the document rather than a judgment of the appraiser.
- The first objective-check pass flagged $33,000 and $37,500 as not in the inputs. Both are sums of the grid's basement and room adjustments (-$25,500 - $7,500 and -$30,000 - $7,500), so they were added to the computed list; nothing in the output changed.

## What the Skill Added Over the Baseline

The baseline found the main error but would have sent the buyers into a Tuesday deadline without the time, the section or the complete-copy rule; told the agent to contact the appraiser; asked the lender for a value near the contract price; promised the value would come up; and understated the cash to cover the gap. The skill caught the report contradicting itself (sketch and photos), showed the effect with the report's own rates, wrote a request with the fields conventional lenders require, priced the risk of waiting ($4,000 of the earnest money), and kept the money and deadline language accurate.
