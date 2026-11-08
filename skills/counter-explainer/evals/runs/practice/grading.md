# Grading: Practice Run, 1428 Sample Ridge Lane

Run on the three practice files with the practice prompt from `practice/README.md` ("treat today as November 9, 2026"), following SKILL.md exactly. The REPC footer reads "EFFECTIVE DECEMBER 4, 2024," so `utah-repc.md` applied. Side: buyer's agent; signed [Agent Name].

What the practice files test: a REPC, an accepted seller counteroffer, and a pending addendum whose heading and cover description name only a home warranty and the washer and dryer, while item 4 moves the Settlement Deadline by section number only.

Result: **pass, 12 of 12 checks.** Objective checks in `objective-checks.txt`. This output is `sample.md`.

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Marked as a practice run, counting from November 9, 2026 | Pass | First flag |
| 2 | Catches item 4: Settlement Deadline (24(d)) December 11 to December 4, 2026, not stated up front | Pass | Second flag, bottom line, change table row 1 |
| 3 | Notes item 3 (walk-through scheduling) also isn't in the heading | Pass | Second flag; change table row 4 |
| 4 | Explains that Settlement would land on the Financing & Appraisal Deadline (December 4) and what that means | Pass | Bottom line; "The math"; "What It Means: Risk," citing Section 21 for extensions |
| 5 | Chain: REPC countered, Addendum No. 1 accepted October 31, Addendum No. 2 pending, post-acceptance | Pass | Chain table and the note under it |
| 6 | Carries forward the November 17 Due Diligence Deadline and the television exclusion from Addendum No. 1 | Pass | Consolidated deal; email ("Your inspection deadline doesn't change") |
| 7 | Flags price lines totaling $489,000 against the $495,000 price | Pass | "Price lines don't match ... a $6,000 difference" |
| 8 | Response deadline 5:00 PM MT Tuesday, November 10, 2026, within 48 hours | Pass | Flags, bottom line, timeline |
| 9 | Options accept, counter (keep December 11), lapse (contract unchanged) | Pass | Options 1 to 3 |
| 10 | Buyer email: Title Case subject, leads with the hidden change, under 300 words, no option chosen | Pass | 265 words; "[Your recommendation]" left for the agent |
| 11 | Requested changes with sections and placeholders, no clause text; Take to your broker present | Pass | |
| 12 | Check before sending present; dates labeled for strategy; no em or en dashes | Pass | |

## Objective Checks

| Check | Result | Notes |
|---|---|---|
| Every number traces to the inputs | Pass | Computed and shown: $6,000 (price minus line total), $4,000 (earnest money left to the buyers on a financing cancellation), November 27 (7 days before December 4) |
| Deadlines match the uploaded contract | Pass | 24(a) to 24(d) as printed; 24(b) from Addendum No. 1; 24(d) from Addendum No. 2 item 4 |
| No em dashes | Pass | |
| Title Case subject lines | Pass | |
| Check before sending present | Pass | |
| No cost estimates without bids | Pass | |
| No agent-only MLS fields in client-facing text | N/A | |
| No protected-class language | Pass | "To fit Seller's move" is quoted from the document, with no comment on the seller |
| No wire or account details | Pass | |

## Fixes Made During This Run

- The first draft's risk line said the buyers would be "past their appraisal and financing protections with the deadline already here," which blurred two rules. It now says what the REPC says: the loan has to be ready by the day those cancellation rights end, and more time needs a written extension signed by the seller (Section 21).
- "I'll check with your lender that December 4 works" committed the agent to an action. It's now in brackets for the agent to keep or cut.

## Reviewer Update (2026-11-08)

The independent reviewer's run (`review-output.md`, graded in `review-grading.md`) also passed all 12 checks. One change to this output and `sample.md`: the two deadlines already past on the practice date (Seller Disclosure and earnest money delivery, both November 4) were added to Flags, because SKILL.md's output order puts "a deadline past or within 48 hours" there. They were already in the timeline. Nothing else changed.
