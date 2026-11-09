# Grading: Case 3, Well-Supported VA Appraisal, Idaho (General Mode)

Run 2026-11-08 by following SKILL.md (version 1.0, final) and its references on the three files in `evals/files/case-3-well-supported-idaho-va/`, with today taken as Sunday, November 8, 2026. The CSV was read with Python's csv module. Output: `output.md`.

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | General mode: names Idaho, says state rules weren't checked, skips Utah REPC terms, takes the Appraisal Contingency Deadline (November 18, 2026, 5:00 PM local time) from the purchase agreement | Pass | Flags, first bullet ("State rules not checked for Idaho"); the Clock cites only the purchase agreement and VA Addendum; no REPC section appears anywhere |
| 2 | Gap shown as $455,000 minus $441,000 = $14,000 | Pass | The Gap |
| 3 | Says the report is well supported: subject facts match the MLS, four comparables within 0.38 miles sold within about four months, the $439,500 to $445,000 range, small consistent adjustments | Pass | Bottom line; Fact Check table (every item matches MLS #98012345); Comparable Review table with net and gross percentages |
| 4 | Tidewater followed: 3290 Placeholder Pine Ct used as Comparable 4; 1177 Example Aspen Dr considered and not used, with the report's reason | Pass | Comparable Review, third bullet, quoting page 4 |
| 5 | No better sale in the CMA: 3375 Placeholder Pine Ct closed 11/03/2026, after the 10/28/2026 effective date; the pending, active and March 2026 sale excluded with reasons | Pass | Better Sales From the CMA: every CMA row accounted for |
| 6 | Grounds Weak; a reconsideration is unlikely to change the value; no request with invented grounds; what a request would need plus the VA process (written request after the NOV to the RLC or through the lender; review within 5 business days) | Pass | Flags, second bullet; "Grounds: Weak"; "What a Reconsideration Request Would Need" quotes Chapter 10, Topic 22, with [placeholders] for the Tidewater fields |
| 7 | If they proceed at $455,000, the $14,000 comes from their own cash, not borrowed; the VA escape clause and the appraisal contingency let them cancel without losing earnest money | Pass | The Gap, third bullet; the Clock (escape clause quoted); Options 2 and 3 |
| 8 | Buyer email says plainly the appraisal is well supported, no criticism of the appraiser, no promised outcome, Title Case subject | Pass | "I went through it carefully, and it's well supported"; "I know this isn't what you hoped to hear"; subject "Appraisal Results And Your Options For 3318 Placeholder Pine Ct" |
| 9 | No agent-only CSV field (lockbox code 1357); Check before sending; no em or en dashes | Pass | Objective checks below |

**9 of 9.**

## Objective Checks

From `objective-checks.txt`:

| Check | Result |
|---|---|
| Every number appears in the inputs or is listed arithmetic | Pass (computed: 14,000; 3.1; 7,000; 448,000; 5,500; 10 days) |
| Deadlines match the uploaded contract | Pass: November 18, 5:00 PM local time; November 25; December 4; NOV dated November 5, checked by hand against pages 1 and 2 |
| No em or en dashes | Pass |
| Title Case subject lines | Pass (2 subjects) |
| Check before sending section | Pass |
| No cost estimates without bids | Pass (none) |
| No agent-only fields in client-facing text | Pass: the private remark with code 1357 appears nowhere |
| No protected-class language | Pass |
| No wire or account details | Pass |
| No criticism of the appraiser, no promised value change | Pass, also by reading |

## What Changed in This Run

- The client email first said the comparables were "within about a third of a mile." The farthest is 0.38 miles, more than a third, so it now says "within 0.38 miles of your home." The Check before sending row was corrected to match.
- Added from the final skill: VA's rule that no duplicate appraisal may be ordered for the same Veteran and property while the NOV is valid, for buyers who ask about a new appraisal or lender, and a note that the agreement's no-extension rule for weekends doesn't come into play because November 18 is a Wednesday.
- The note to the listing agent shares only the NOV value and the deadline. It doesn't say what the buyers would accept.
