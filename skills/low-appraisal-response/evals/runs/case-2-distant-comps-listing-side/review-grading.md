# Reviewer Grading: Case 2, Distant Comparables (Listing Side, FHA, December 4, 2024 REPC)

Independent run by the reviewer on 2026-11-08, from SKILL.md and its references only, before reading `output.md`. Output: `review-output.md`. Today taken as Sunday, November 8, 2026 (the prompt gives no date).

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Gap: $689,000 minus $662,000 = $27,000 | Pass | The Gap |
| 2 | December 4, 2024 REPC, 8.2 IS, Financing & Appraisal Deadline 5:00 PM MT November 16, 2026 (24(c)); FHA/VA Loan Addendum Section 3 walk-away right notwithstanding the deadline | Pass | The Clock, quoting Section 3 |
| 3 | Comparables 2.14, 3.42 and 2.31 miles away, outside the subdivision, the report's search comment quoted, no "bad comps" | Pass | Comparable Review |
| 4 | 2314 N Sample Willow Way (#2289875), 2176 N Example Willow Ct (#2288290), 2402 N Sample Willow Way (#2290511), each with distance, close date, price and concessions; 2402's partly finished basement noted | Pass | Better Sales From the CMA |
| 5 | 2255 N Example Willow Ct out (closed 11/04/2026); short sale out; pending and active context only | Pass | Left out, and why |
| 6 | FHA process through the buyer's lender, underwriter decides; rescinded 2024 rules not presented as current | Pass | Options for Your Sellers, opening paragraph |
| 7 | Seller can't file; data package to the buyer's agent; never to the appraiser | Pass | Options and Data Package |
| 8 | Four seller options with tradeoffs; $8,000 contribution flagged for the lender, no cap stated | Pass | Options, The Gap |
| 9 | No $675,000 or 11/30 in the data package or the note; Title Case subject; Check before sending; no dashes | Pass | Agent-only figures appear only in the agent-only paragraph |

**9 of 9.**

## Objective Checks

`objective_checks.py` passed every check except "Title Case subject lines", which found no subjects because this run puts drafts in code blocks rather than `**Subject: ...**`. Both subjects ("Closed Sales For Your Buyers' Lender, 2290 N Sample Willow Way" and "Appraisal Results And Next Steps For 2290 N Sample Willow Way") are Title Case by hand. Every number is in the inputs or listed arithmetic (27,000; 3.9; 13,500; 675,500; 688,000; 700,000). The first pass flagged "3.4" (a rounded 3.42 miles in the seller email); the email now uses 2.14 to 3.42. Seller email: 280 words.

## Compared With the Builder's Output

Same findings, same three sales, same exclusions, same grounds call, same FHA path, same four options. Differences, none affecting a pass:
- The builder put the File No. in the data package and wrote a fuller "What Happens Next"; this run left the file number out and kept the data package's cover note as the note to the buyer's agent.
- The builder added the FHA second-appraisal rule unprompted; this run left it out because the agent didn't ask (SKILL.md step 6 says to give it when asked). Either reading fits the skill.
- Both runs used the sellers' agent-only bottom line only in agent-facing text.

The skill was not ambiguous on this case. One small gap found while running it: SKILL.md said to use today's date "if they give one" but not what to do otherwise. Step 2 now says "from the agent's message, or the current date."
