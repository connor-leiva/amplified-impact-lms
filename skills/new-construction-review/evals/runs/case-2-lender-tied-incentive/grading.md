# Grading: Case 2, Incentive Tied to the Builder's Lender (Utah, Completed Home)

Run on 2026-11-08 following SKILL.md 1.0 exactly, reading the three PDFs with the Read tool and computing sums and dates in Python. Output: `output.md`; objective checks: `objective-checks.txt`. A no-skill baseline on the same prompt and files is in `baseline.md`.

**Result: 9 of 9 expectations passed. All objective checks pass. Baseline: 1 of 9.**

## Expectations

| # | Expectation | Skill run | Evidence | Baseline |
|---|---|---|---|---|
| 1 | $20,000 Flex Incentive and all four conditions with page references | Pass | "Incentive and Lender Conditions" lists (a) to (d) with "(Addendum 1)"; the bottom line repeats them with "(Flex Incentive Addendum 1 to 3)." | Fail: conditions listed, no page or section references anywhere. |
| 2 | $5,000 Standard Incentive, $15,000 difference as computed, both void past December 18, 2026 for a non-Seller reason | Pass | "$20,000 - $5,000 = $15,000 (computed)"; Addendum 3.2 quoted. | Pass: $5,000, $15,000 and the void clause are all there. |
| 3 | Never recommends a lender or says the incentive is worth it; lenders compare full cost; lender confirms the allowed amount; no cap stated | Pass | "The lender choice belongs to the Evalsons. This review describes the conditions; it doesn't say which loan is better." Email: "Your credit union and Sample Crest Mortgage can each show you the full cost..." No cap anywhere. | Fail: "the extra $15,000 will almost always come out ahead," "the bigger incentive wins," a rate "rule of thumb," and the unsourced claim that builder lenders "sometimes price their rates or fees a bit higher." |
| 4 | Disclosure present, dated November 2, 2026, unsigned, with 100% and 51% ownership and estimated charges | Pass | RESPA points, first bullet: date, ownership, all five charge lines, "The acknowledgment is unsigned." | Fail: ownership mentioned; no date, no unsigned acknowledgment, charges only as "0% to 1% origination." |
| 5 | PA title clause quoted next to "NOT required" and RESPA Section 9, sent to an attorney with no violation conclusion | Pass | RESPA points, third bullet quotes PA 9.1 and 2608(a): "Whether PA 9 is that kind of requirement is for an attorney"; attorney item 1. | Fail: PA 9 not mentioned; instead a legal conclusion: "Is It Legal for the Builder to Do This? Yes, generally." |
| 6 | Key dates table labeled for strategy with the Review Period, 3-day application, December 4 and December 18, 2026 | Pass | "For strategy; confirm dates with your transactions team," six rows including all four. | Fail: no table, no label; dates scattered in prose. |
| 7 | Homeowner Warranty Guide (Exhibit C) listed as not uploaded | Pass | Flags and Documents Reviewed. | Fail: only asks "What is the builder's warranty." |
| 8 | Email: Title Case subject, conditions in dollars without loan advice, no em dashes, no banned phrases, signed [Agent Name] | Pass | Subject "How The Sample Crest Incentive Works"; 318 words; signed "[Agent Name]." | Fail: subject not Title Case, four em dashes in the email including the subject (nine in the whole answer), "Great news," "don't hesitate to reach out," "the bigger incentive wins," signed "[Your Name]." |
| 9 | Check before sending present; every dollar amount in the documents or shown as computed | Pass | 23-row table; the only number not in the documents is $15,000, shown as "$20,000 - $5,000." | Fail: no Check before sending section. |

## Objective Checks (Skill Run)

| Check | Result |
|---|---|
| Every number in the output appears in the inputs | Pass. Not in the inputs: $15,000 (shown as computed). November 12, 13 and 15, 2026 are labeled as computed from an assumed November 10, 2026 Contract Date. November 1, 2026 and January 1, 2027 come from the REPC version note in the skill's references. |
| Deadlines match the uploaded contract | Pass. 2, 3 and 5 days after the Contract Date; December 4 and 18, 2026; 3 days for the seller's appraisal cure; weekdays checked in code. |
| No em dashes | Pass |
| Title Case subject lines | Pass |
| "Check before sending" section | Pass |
| No cost estimates without bids | Pass. Charges are quoted from the disclosure as ranges; nothing estimated. |
| No agent-only MLS fields in client-facing text | Not applicable; none present |
| No protected-class language | Pass |
| No wire or account details | Pass |
| Loan advice screen | The checker flagged one line: the CFPB quote "Even if a real estate agent or homebuilder has a preferred lender, still look for a better deal," in the agent-facing section. It is a sourced statement about shopping, not a recommendation of either lender; left in. |

## What the Skill Added Over the Baseline

The baseline read the incentive correctly but then advised on the loan, declared the arrangement legal, missed that the purchase agreement makes the buyers buy the lender's title policy from the builder's affiliate despite the disclosure, missed the unsigned disclosure and the missing warranty guide, and wrote a client email with em dashes, banned phrases and a recommendation. The skill kept every point neutral and sourced, turned the RESPA questions into attorney items, and labeled the dates for strategy.
