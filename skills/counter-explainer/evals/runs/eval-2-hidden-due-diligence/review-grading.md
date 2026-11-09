# Reviewer Grading: Eval 2, Hidden Due Diligence Change on the Revised REPC

Independent run by the reviewer on 2026-11-08, written to `review-output.md` before reading the builder's `output.md` or `grading.md`. Followed SKILL.md and its references only: the footer sent the run to `utah-repc-2026.md`; `reading-the-chain.md`, `drafting-guide.md` and `utah-forms-and-counters.md` were read where SKILL.md says to.

Result: **pass, 12 of 12 expectations.**

| # | Expectation | Result | Evidence in review-output.md |
|---|---|---|---|
| 1 | Item 3 changes the Due Diligence Deadline (Section 4(b)) from November 20 to November 13, 2026 | Pass | Flags; What Changed row 1 |
| 2 | Not stated up front: the heading and the listing agent's description mention only the refrigerator and the warranty | Pass | Flags quote both |
| 3 | Bottom line names the Due Diligence change | Pass | Bottom line, sentence 1 |
| 4 | Reads the footer as the November 1, 2026 form, says `utah-repc.md` numbers don't apply, cites 4(b), 12.1, 2.3, 7.3 | Pass | Flags; table and deal sections |
| 5 | Waiver and $7,500 non-refundable except 12.2(a) and 12.3(a), by 5:00 PM Mountain Time on the deadline | Pass | Bottom line; earnest money at risk; What It Means |
| 6 | Thursday, November 12 inspection leaves one day | Pass | Bottom line; What It Means; email |
| 7 | Response deadline 5:00 PM Mountain Time November 10, 2026; buyers accept; changes an accepted contract | Pass | Flags; chain row 3; Response Deadline |
| 8 | Options include a counter keeping November 20 and a lapse that leaves the contract as is | Pass | Options 2 and 3 |
| 9 | $462,000 and 48 hours after Recording; price lines still total $455,000 | Pass | Deal as it would stand |
| 10 | Email: Title Case subject, leads with the Due Diligence change, under 300 words | Pass | 236 words by `objective_checks.py` |
| 11 | Check before sending present; dates labeled for strategy | Pass | Last section; timeline label |
| 12 | No clause text; no em or en dashes | Pass | Objective check: none |

Objective checks (`evals/make/objective_checks.py`, today 2026-11-08): numbers not in the inputs were $3,750, $461,350, $7,000, 0.14%, November 12 and November 14 at first; each is shown as computed or comes from the agent's message. One wording fix made after the check: "from November 14" became "once the November 13 deadline passes," because the window opens after 5:00 PM on the 13th. No dashes, Title Case subject, Check before sending present, no banned phrases, no account numbers.

## Compared With the Builder's Run

Same result on every expectation. Both runs caught the Section 4(b) change, the earnest money weekend date and the 4-day gap between the Seller Disclosure Deadline and the new Due Diligence Deadline. Differences, none of which mean the skill is ambiguous:
- The reviewer's run also noted that the financing cancellation in 12.3(a) opens "after the Due Diligence Deadline," so moving 4(b) earlier also starts the window in which a loan-terms cancellation costs $3,750. The builder's run did not say this. It is useful but not required by the spec, so the skill was not changed for it.
- The reviewer's run added a question about Section 2.3's WILL NOT box, which item 1 doesn't mention. The builder's run marked the warranty as WILL in its requested changes without flagging it. Both are reasonable readings.
- The builder's email used sentence-case section labels ("What changed"); the drafting guide shows Title Case labels. The house rule covers subject lines only, so this is not a failure.

The builder's `output.md` and `grading.md` are still accurate after the reviewer's fixes (the shared `utah-repc-2026.md` that now ships has the same section map the builder used).
