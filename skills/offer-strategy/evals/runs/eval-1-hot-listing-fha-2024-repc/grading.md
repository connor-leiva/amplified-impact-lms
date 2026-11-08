# Grading: Eval 1, Hot Listing With an FHA Buyer (December 4, 2024 REPC)

Run on 2026-11-08 by following SKILL.md 1.0 exactly: `offer-terms.md`, `comp-method.md`, `utah-offer-terms.md`, `utah-repc.md`, `utah-forms-and-counters.md` and `utah-pricing-context.md` read where SKILL.md points. The MLS sheet and the preapproval letter were read as PDFs (one page each) and the CMA export as a CSV (9 listings); the comp math and date math were done in code.

Prompt: "Buyers are Morgan and Sky Testerly, FHA, letter attached. 734 N Make Believe Ave came on Thursday. The listing agent told me they have four offers and want highest and best by Monday, November 9 at 6:00 PM. ..."

Result: **pass, 8 of 8.**

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Competitive, with days on market against the median, list against the highest closed sale, and the highest-and-best deadline | Pass | "3 (listed 11/05/2026) against a median of 5 for this comp set's five rambler solds (4, 4, 5, 6, 12)"; "$1,900 above the highest closed sale ($499,900 minus $498,000)"; the comp table shows 812 N Make Believe Ave at $498,000, $6,000, $492,000; "highest and best by Monday, November 9 at 6:00 PM"; "Position: Competitive." |
| 2 | Comp table with concessions, two-story left out, above grade and basement separate, range, one price at or below $510,000 with the gap to $498,000 | Pass | Five ramblers with "Above grade" and "Basement (finished)" columns and price after concessions; "Left out: 1015 N Fake Fir Ln ($562,000), a two-story ... Different style and size."; "Supported range: $487,500 to $498,000"; "Recommended offer: $505,000"; "$7,000 above the highest closed sale". |
| 3 | FHA addendum Section 3 explained; no waiver; lender must confirm cash beyond what the letter verifies | Pass | Terms table: "the FHA/VA Loan Addendum Section 3 lets the buyers walk without losing earnest money if the price exceeds the FHA appraised value ... Checking IS NOT would not remove that right, so it isn't a real waiver." Gap commitment "Only if the lender confirms the cash in writing ... The letter verifies cash only for the 3.5% minimum down payment and closing costs." |
| 4 | Escalation numbers with a cap at or below $510,000, no state form, brokerage addendum and broker review, no clause drafted | Pass | "start $502,000, increase $1,000 over any competing offer, cap $510,000"; "Utah has no state-approved escalation form: the language must come from your brokerage's approved addendum, reviewed by your broker. Not drafted here." It also recommends against escalation in a highest-and-best round, with the reason. |
| 5 | 2024 section numbers only; earnest money at least $5,000; Settlement by December 18 with 2 days' possession; lender timing; dates labeled | Pass | Sections 2.1, 8.1, 24(b), 24(c), 24(d), 8.3(b)(i), 3.3; objective check found 0 of 4(c), 4(d), 4(e), 3(c)(i), "Section 2.2", 12.2, 12.3. "$5,000"; "Friday, December 18, 2026"; "2 Calendar Days after Recording"; 21-day Financing & Appraisal Deadline tied to "within 3 business days ... 10 to 14 days"; "For strategy; confirm dates with your transactions team." |
| 6 | Built 1971: federal 10-day lead window, Utah's Lead-Based Paint Addendum, buyers' choice to shorten or waive | Pass | Flags: "built 1971, so lead-based paint rules apply"; terms: "Risk Assessment Deadline 10 days (the addendum's default) ... The buyers may shorten or waive the evaluation in writing; that's their call, and it gives up the chance to test for lead-based paint hazards before they're bound." |
| 7 | Buyer email: Title Case subject, bolded bottom line, no promise, advises against a letter, no agent-only remarks | Pass | "Subject: Offer Plan For 734 N Make Believe Ave" (Title Case per check); bolded opening; "I can't promise it wins"; "Please don't include a personal letter or photos with the offer"; objective check found 0 of 3390, "conventional or cash", "under contract", "Multiple offers expected", "lockbox", "accepted an offer over list" in the email. |
| 8 | Numbers traced, Check before sending, no dashes, no loan or account numbers | Pass | See objective checks. |

## Objective Checks (`evals/make/objective_checks.py`)

| Check | Result | Evidence |
|---|---|---|
| Every number in the output appears in the inputs | Pass | 105 numbers; 33 not literally in the files, each one of: section numbers from the REPC (2.1, 2.2, 3.3, 8.1 to 8.4, 10.1), sale-to-list ratios (99.7 to 101.7) and price per above-grade sq ft (390.00 to 410.43) computed from the export, prices after concessions (473,000, 482,500, 492,000), differences shown (1,900, 5,100, 7,000, 10,100, 12,000), date math (13, 21, 38), the lead-based paint cutoff (1978) and the addendum's 2020 effective date from the references, and the labeled recommendations (502,000, 505,000). |
| Deadlines match the uploaded contract | N/A | No contract uploaded; every date is counted from an assumed Acceptance, labeled, with the weekday. |
| No em or en dashes | Pass | 0 |
| Title Case subject lines | Pass | "Offer Plan For 734 N Make Believe Ave" |
| "Check before sending" section | Pass | Section 9 traces each figure to the MLS number, the letter or the agent's message. |
| No cost estimates without bids | Pass | The FHA repair amount and gap amount are placeholders. |
| No agent-only MLS fields in client-facing text | Pass | 0 hits in the buyer email (see 7). Agent-only remarks appear only in the agent's "Where the listing stands" table, labeled "never share." |
| No protected-class language | Pass | Property and terms only. |
| No wire or account details | Pass | None in the letter or the output. |

## Changes Made From This Run

- The checker matched "4(c)" inside "24(c)"; `objective_checks.py` now anchors section numbers so a 2024 number isn't counted as a 2026 one.
- The buyer email ran 357 words on the first pass; trimmed under 350.
- Added the $10,100 difference to Check before sending (it appeared in the risk ledger without a trace).

## Baseline (No Skill), Same Prompt and Files: `baseline.md`

| # | Baseline result |
|---|---|
| 1 | Partial. Calls it hot from 3 days and four offers, but gives no comp-set median and no comparison of the list price with the closed sales; it quotes the agent-only "seller prefers conventional or cash." |
| 2 | Fail. No comp table, no range, no gap figure; it multiplies price per square foot by total finished area to reach "$950,000 on paper," exactly the total-square-footage error the comp method rules out. |
| 3 | Fail. Recommends "waiving the appraisal contingency or adding an appraisal gap guarantee of $10,000" with no lender check, and never mentions that the FHA/VA Loan Addendum keeps the buyers' right to walk. |
| 4 | Fail. Drafts its own escalation clause text, with no mention that Utah has no state form or that the broker must approve the language. |
| 5 | Partial. $10,000 earnest money and December 18 are fine, but there are no section numbers, a 7-day inspection period justified with an unsourced claim ("Most Utah due diligence periods run 10 to 14 days"), and no "for strategy" label. |
| 6 | Fail. No lead-based paint note on a 1971 home. |
| 7 | Fail. Subject isn't Title Case, no bolded bottom line, it tells the buyers the seller "prefers conventional or cash" (agent-only), suggests a personal letter to the seller, says "I'm confident we'll be at the top of the pile," and ends with "don't hesitate to reach out." |
| 8 | Fail. Unsourced figures ("$950,000," "FHA allows up to 6%," "10 to 14 days," "about 2%") and no Check before sending. |

**Baseline: 0 of 8 pass (2 partial), against 8 of 8 with the skill.** What the skill adds: the FHA appraisal escape stated correctly so the buyers aren't told to "waive" a protection they can't actually waive, no appraisal waiver without lender-confirmed cash, no drafted escalation clause, the 2024 REPC's section numbers, the lead-based paint window on a pre-1978 home, agent-only remarks kept out of the buyer email, and advice against the buyer letter instead of for it.
