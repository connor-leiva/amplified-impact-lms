# Grading: Eval 2, Stale Listing, Below List With Concessions (November 1, 2026 REPC)

Run on 2026-11-08 by following SKILL.md 1.0 exactly, with `offer-terms.md`, `comp-method.md`, `utah-offer-terms.md`, `utah-repc.md`, `utah-forms-and-counters.md` and `utah-pricing-context.md` read where SKILL.md points. The MLS sheet (2 pages, with its Property Activity history) and the preapproval letter were read as PDFs and the comps export as a CSV (10 listings); the comp math and date math were done in code.

Prompt: "Writing an offer tomorrow for Avery and Quinn Mockwell on 5150 S Imaginary Elm Way. It's been sitting 60 days with two price cuts. We're on the November 1, 2026 REPC. ..."

Result: **pass, 8 of 8** (after one fix on the first draft, below).

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Buyer Leverage with 60 days against the 33-day median, two cuts totaling $30,000 with dates, the concessions remark and the $599,900 active | Pass | "60 (listed 09/09/2026) against a median of 33 for this comp set's solds (18, 26, 33, 38, 39)"; "$649,900 to $629,900 on 10/01/2026, then to $619,900 on 10/22/2026. $30,000 total"; "Seller will consider concessions."; "5266 S Sample Walnut Ln ... listed at $599,900"; "Position: Buyer Leverage." |
| 2 | Comp table with the three named sales, the original kitchen read, a range, one price below list and at or below $610,000 | Pass | Table rows for 5210 S Imaginary Elm Way ($600,000, $7,500, $592,500), 5077 S Sample Walnut Ln ($605,000, "Updated kitchen (2022)") and 5125 S Imaginary Elm Way ($610,000, "the oldest of these sales"); "The listing's 2010 roof and original kitchen put it below this one"; "Supported range: $592,000 to $600,000"; "Recommended offer: $598,000". |
| 3 | Concession in Section 2.2 (uses in 8.3(c)), at or below $14,500, price after concessions with math, lender confirms | Pass | "Seller's Contribution to Closing Costs | $14,500 | ... Have the lender confirm the amount the loan allows before the offer goes out. | 2.2, 8.3(c)"; "$598,000 minus $14,500 = $583,500". |
| 4 | Sale-of-home kept; 3(d) with the address and the addendum, or the condition doesn't apply; cost in competitiveness | Pass | Flags quote the letter's contingency; terms: "Box checked with '88 W Sample Ct,' and your brokerage's subject-to-sale addendum attached ... 'If no such addendum is attached, then this condition shall NOT apply.'"; risk ledger: "Keeping it protects them; it makes the offer weaker." |
| 5 | 2026 numbers only: 4(c) and 4(d) from the letter's 12 and 25 days, 4(e), 3(c)(i) in dollars, Section 3 boxes; no 2024 numbers | Pass | "Appraisal Deadline | 14 days ... The lender usually has the appraisal within 12 days"; "Financing Deadline | 26 days ... final approval at 25 days"; "50% of $5,000 = $2,500"; boxes for 3(a) to 3(d). Objective check found 0 of 24(a) to 24(d), 8.4, "Additional Earnest", 8.3(b)(i). |
| 6 | Dates from Wednesday, November 11 with correct weekdays (day 12 Monday, November 23; day 25 a Sunday), labeled; weekend rule where it applies | Pass | "Lender's usual appraisal timing: by Monday, November 23 (day 12)"; "Day 25 is a Sunday, and this form doesn't move the Financing Deadline for weekends, so use the Monday" (Monday, December 7); Earnest Money day 4 is "Sunday, November 15 ... moves to the next business day, Monday, November 16"; "For strategy; confirm dates with your transactions team." Weekdays checked in code. |
| 7 | Buyer email: Title Case subject, bolded bottom line, no promise, no agent-only remarks | Pass | "Subject: Offer Plan For 5150 S Imaginary Elm Way"; bolded opening; "I can't promise the seller says yes"; 0 hits in the email for 7714, "motivated", "relocated", "out of state", "bring all offers", "lockbox". "Vacant" comes from the public remarks. |
| 8 | Numbers traced, Check before sending, no dashes | Pass | See objective checks. |

## Objective Checks (`evals/make/objective_checks.py`)

| Check | Result | Evidence |
|---|---|---|
| Every number in the output appears in the inputs | Pass | 117 numbers; 34 not literally in the files: REPC section numbers and the form's 50% default, ratios and price per above-grade sq ft computed from the export, prices after concessions, differences shown in the text (2,000, 2,500, 9,000, 9,900, 19,900, 20,000, 21,900, 30,000), date math (16, 23, 35) and the labeled recommendation (598,000). |
| Deadlines match the uploaded contract | N/A | No contract uploaded; dates are counted from the agent's November 11 target and labeled. |
| No em or en dashes | Pass | 0 |
| Title Case subject lines | Pass | "Offer Plan For 5150 S Imaginary Elm Way" |
| "Check before sending" section | Pass | Section 9. |
| No cost estimates without bids | Pass | The concession is the lender's own estimate from the agent's message; no repair costs. |
| No agent-only MLS fields in client-facing text | Pass | See 7. The pending's "14 day DD" agent remark is used only in the agent-facing signals table, labeled "never share." |
| No protected-class language | Pass | None. |
| No wire or account details | Pass | None. |

## Changes Made From This Run

- First draft said the list price was "$9,900 above" the closest sale; $619,900 minus $600,000 is $19,900. Corrected, and the $9,900 now correctly compares the list price with the highest sale in the set ($610,000).
- First draft said "4 of 5 solds had cuts or concessions"; the export shows 3 of 5 with both. Corrected.
- First draft said the buyers "would risk a second mortgage" without the sale-of-home condition; that went past the inputs. Rewritten to what the letter supports: the loan depends on the townhome's sale.
- No skill change needed: each error was arithmetic or wording in this run, caught by the Check before sending pass that SKILL.md requires.

## Shared Reference Added After This Run

The shared `utah-repc-2026.md` was added to `skills/_shared/` during this build, after the run. SKILL.md now lists it for the November 1, 2026 form, and skill.json ships it. Every 2026 section number and quote in this output was checked against it and against the UAR clean copy: they match (Sections 1, 2.1 to 2.3, 3(a) to (d), 3(c)(i), 4(a) to (f), 5, 8.3(c), 9.3, 12.1 to 12.3, 25, 30). No rerun was needed.

## Reviewer's Independent Run (review-output.md)

Run on 2026-11-08 by the independent reviewer, from scratch, following SKILL.md 1.0 on the same three files and prompt, before reading `output.md`. Comp and date math done in code.

Result: **pass, 8 of 8.**

| # | Result | Evidence in review-output.md |
|---|---|---|
| 1 | Pass | "60 (cumulative 60) against a median of 33 for this comp set's 5 solds (18, 26, 33, 38, 39 days...)"; two cuts with dates, "Total $30,000, 4.6% off the original list ($30,000 / $649,900)"; "Seller will consider concessions."; active 5266 S Sample Walnut Ln at $599,900. |
| 2 | Pass | Rows for 5210 ($600,000, $7,500, $592,500), 5077 ($605,000, updated kitchen) and 5125 ($610,000, updated kitchen and 2025 roof, "oldest of the solds"); range $592,500 to $605,000; offer $600,000, under $619,900 and $610,000. |
| 3 | Pass | "$14,500 ... The lender confirms the amount the loan program allows" in 2.2 (uses in 8.3(c)); "$600,000 minus $14,500 = $585,500". |
| 4 | Pass | 3(d) checked with 88 W Sample Ct and the brokerage's addendum, "Without the addendum, the condition does not apply"; the cost in competitiveness is stated under the risk ledger. |
| 5 | Pass | 4(c) from the letter's 12 days, 4(d) at day 26 from its 25, 4(e) placeholder, 3(c)(i) "50% of $5,000 = $2,500" with the no-box default; no 2024 numbers (checker: 0 hits for 24(b), 24(c), 24(d), 8.4). |
| 6 | Pass | Day 12 Monday, November 23; day 25 Sunday, December 6; earnest money day 4 Sunday moved to Monday, November 16; "For strategy; confirm dates with your transactions team." |
| 7 | Pass | Title Case subject, bolded bottom line, "Nothing here guarantees the seller accepts"; 0 hits in the email for 7714, motivated, relocated, "bring all". (The checker's one "14 day" hit is the reviewer's own 14-day due diligence recommendation, not the agent-only remark.) |
| 8 | Pass | Objective checks: 0 dashes, Check before sending present, every number outside the inputs is a section number, arithmetic shown or a labeled recommendation. |

**Comparison with the builder's output.** Both runs call Buyer Leverage, recommend below list with the full $14,500 in Section 2.2, keep the sale-of-home condition, use 14-day Due Diligence and a day 26 Financing Deadline, and flag that the letter's 25 days assume 88 W Sample Ct has closed. Differences are judgment, not errors: $600,000 against $598,000, and a range top of $605,000 against $600,000. One real problem in the builder's output: the buyer email asked for answers "By Monday At 3:00 PM," an hour that appears nowhere in the inputs.

**Reviewer changes from this comparison.** SKILL.md now says decision times in the buyer email come from the offer deadline or the agent's message, otherwise [time], and Check before sending covers times. `output.md` was updated to "[time] Monday" (the agent writes the offer "tomorrow," Monday), with the placeholder flagged and traced. No other part of the builder's output changed, and its 8 of 8 stands.
