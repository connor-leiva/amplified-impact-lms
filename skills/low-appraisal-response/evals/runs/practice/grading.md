# Grading: Practice Files, 4127 W Practice Ridge Dr (Buyer Side, December 4, 2024 REPC)

Run 2026-11-08 by following SKILL.md (version 1.0, final) and its references on the three files in `practice/`, with the page's practice prompt:

> Pretend today is Sunday, November 8, 2026. I represent the buyers, Jordan and Casey Example, on 4127 W Practice Ridge Dr. The appraisal came back at $612,000 on our $640,000 contract, and their lender is Make-Believe Mortgage Co. Here's the appraisal, the REPC with its addendum, and my CMA export. What are our options, and is there anything worth sending to the lender?

Output: `output.md`, kept as `sample.md`. The practice set has no eval entry, so these checks were written for it the same way.

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Names the December 4, 2024 REPC from its footer, Section 8.2 IS checked, and the Financing & Appraisal Deadline of 5:00 PM MT Friday, November 13, 2026 (24(c)), five days out | Pass | Flags and the Clock |
| 2 | Gap shown as $640,000 minus $612,000 = $28,000 | Pass | The Gap |
| 3 | Finds that Comparables 2 and 3 have their basements inside GLA: grid 3,080 and 3,150 sq ft equal the MLS above-grade plus basement totals (1,560 + 1,520; 1,610 + 1,540), with the room counts also off | Pass | Fact Check table with both MLS numbers |
| 4 | Report's own rates ($50 GLA, $25 finished basement, $5,000 bath) applied to the corrected facts, labeled arithmetic, not a value, and kept out of the request | Pass | Rates table with the label; it says no rate was stated for rooms below grade, so that line isn't recomputed |
| 5 | Better sales 4089 W Practice Ridge Dr (#2290101), 4210 W Sample Crest Cir (#2290177), 3962 W Practice Ridge Dr (#2289954), each closed on or before 10/27/2026; 4155 W Example Knoll Ln (closed 11/03/2026), the REO, the two story, the pending and the active excluded with reasons | Pass | Better Sales table and "Left out, and why" |
| 6 | Quotes the appraisal gap term in Addendum No. 1 and applies it: $10,000 committed, $18,000 left, the Appraisal Condition remains because the gap is more than $10,000, and a revised value of $630,000 or more would leave the buyers covering the difference without the condition; reading sent to the broker | Pass | The Gap, the Options and the client email's "One Contract Detail To Know" |
| 7 | Says which cancellation returns all the earnest money: 8.2(a) returns $10,000; a financing cancellation under 8.3(b)(i) releases $1,000 to the sellers | Pass | The Clock, third bullet; Option 4 |
| 8 | Conventional reconsideration request from the buyers to Make-Believe Mortgage Co. with every required field, three sales (five or fewer) with MLS numbers, no target value, nothing to the appraiser | Pass | Reconsideration of Value Request |
| 9 | The $6,000 seller contribution flagged for the lender at the lower of price and value, with no cap stated; cash to cover the gap left to the lender | Pass | The Gap, money notes; Option 3 |
| 10 | No agent-only CSV fields (lockbox code 4417, "Sellers relocating, motivated," showing notes); Title Case subjects; Check before sending; no em or en dashes | Pass | Objective checks below |

**10 of 10.**

## Objective Checks

From `objective-checks.txt` (the script reads both PDFs, the CSV, the prompt and the skill's references):

| Check | Result |
|---|---|
| Every number appears in the inputs or is listed arithmetic | Pass (computed: 28,000; 4.4; 4,000; 750; 1,500; 659,750; 18,000; 14,000; 626,000; 622,000; 630,000) |
| Deadlines match the uploaded contract | Pass: November 13 (24(c)) and November 24 (24(d)), 5:00 PM MT (Section 21), checked by hand against REPC page 3 |
| No em or en dashes | Pass |
| Title Case subject lines | Pass (3 subjects) |
| Check before sending section | Pass |
| No cost estimates without bids | Pass (none) |
| No agent-only fields in client-facing text | Pass |
| No protected-class language | Pass |
| No wire or account details | Pass |
| No criticism of the appraiser, no promised value change | Pass, also by reading |

## What Changed in This Run

- The practice addendum now carries a made-up appraisal gap term (buyer covers up to $10,000), added to exercise the skill's new addendum check. The run caught the part that's easy to miss: a reconsideration that moves the value only part of the way could end the buyers' right to cancel.
- The client email states the comparables' distances from the report (1.62 to 2.91 miles) instead of rounding them.

## Reviewer Correction (2026-11-08)

The independent review found that this output said keeping the price means "at least $28,000 more cash" (The Gap, Option 3 and client email option 4). That overstated it: the lender figures the loan-to-value on $612,000, so the buyers bring more cash, borrow a larger share of the value, or both, and only the loan officer can give the figure. Those three lines in `output.md` and `sample.md` were corrected, along with the source of the error in SKILL.md and writing-the-drafts.md. Check 9 still passes on the corrected text. See `review-grading.md`.
The client email was also over the 300-word limit in writing-the-drafts.md (about 355 words before the correction). It was tightened to 296 words with the same facts and options; the Check before sending rows still cover every figure in it.
