# Grading: Case 2, Distant Comparables, Listing Side, FHA (December 4, 2024 REPC)

Run 2026-11-08 by following SKILL.md (version 1.0, final) and its references on the three files in `evals/files/case-2-distant-comps-listing-side/`, with today taken as Sunday, November 8, 2026. Output: `output.md`.

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Gap shown as $689,000 minus $662,000 = $27,000 | Pass | The Gap: "$689,000 contract price minus $662,000 appraised value = $27,000, about 3.9%" |
| 2 | Clock names the December 4, 2024 REPC, Section 8.2 (IS checked) and the Financing & Appraisal Deadline of 5:00 PM MT November 16, 2026 (24(c)), and explains FHA/VA Loan Addendum Section 3 | Pass | The Clock table and bullets; Section 3 quoted, including "Notwithstanding the Financing & Appraisal Deadline" and "(excluding closing costs)" |
| 3 | Comparables 2.14, 3.42 and 2.31 miles away, outside the subdivision, the report's own search comment, no "bad comps" | Pass | Comparable Review table and the quoted page 4 comment ("sales within the subject's subdivision were limited..."); the review describes, never judges |
| 4 | 2314 N Sample Willow Way (#2289875), 2176 N Example Willow Ct (#2288290), 2402 N Sample Willow Way (#2290511) with distance, close date on or before 10/30/2026, price, concessions; 2402's partly finished basement noted as a difference | Pass | Better Sales table and the data package; 2402 noted as "a difference the appraiser would weigh" |
| 5 | 2255 N Example Willow Ct excluded (closed 11/04/2026); the 2288 short sale excluded; pending and active are context only | Pass | "Left out, and why" list |
| 6 | FHA process: a request through the buyer's lender that the FHA underwriter decides; the rescinded 2024 rules not presented as current | Pass | "How an FHA Reconsideration Works Now" quotes Handbook 4000.1 II.A.3.a.ix and names Mortgagee Letter 2025-08 |
| 7 | The seller can't file; the data package goes to the buyer's agent for the buyer and lender, never the appraiser | Pass | Flags, first bullet; data package says "We're not contacting the appraiser" |
| 8 | Seller options (support, reduce, meet in the middle, hold) each with a tradeoff; the $8,000 contribution flagged for the lender's review without a cap | Pass | Options 1 to 4; The Gap: "Don't quote a limit to anyone; Pretend Home Loans confirms it" |
| 9 | Neither the data package nor the note mentions the $675,000 bottom line or the 11/30 timing; Title Case subject; Check before sending; no dashes | Pass | Scripted scan of the data package found neither; the sellers' timing and bottom line appear only in the agent-only Options preface; the client email to the sellers names the contract's own November 30 Settlement Deadline |

**9 of 9.**

## Objective Checks

From `objective-checks.txt` (the script reads the three PDFs, the prompt and the skill's references):

| Check | Result |
|---|---|
| Every number appears in the inputs or is listed arithmetic | Pass (computed: 27,000; 3.9; 13,500; 675,500) |
| Deadlines match the uploaded contract | Pass: November 16 (24(c)) and November 30 (24(d)), 5:00 PM MT (Section 21), checked by hand against REPC page 3 |
| No em or en dashes | Pass |
| Title Case subject lines | Pass (2 subjects) |
| Check before sending section | Pass |
| No cost estimates without bids | Pass (none) |
| No agent-only fields in client-facing text | Pass: the CMA's "Agent notes (not for distribution)" stay out of both drafts |
| No protected-class language | Pass |
| No wire or account details | Pass |
| No criticism of the appraiser, no promised value change | Pass, also by reading |

## What Changed in This Run

- The client email first described the report's comparables as "two to three and a half miles away." Changed to the report's own figures, 2.14 to 3.42 miles, before grading, so every distance in a draft traces to a page.
- The FHA process notes were a separate top-level section, which isn't in SKILL.md's output order. They're now a subsection of Grounds. The data package heading now says it's also the note to the buyer's agent, and SKILL.md's output list says so for the listing side, so a listing agent doesn't get two near-identical messages.
- Added from the final skill: FHA's rule that a lender can't order a second appraisal "to achieve an increase in value" (Handbook 4000.1, II.A.1.a.iii(B)(9)), for when sellers ask about a new appraisal, and a line that Section 8.3(b)(i)'s $500 financing release isn't the buyers' route here.
