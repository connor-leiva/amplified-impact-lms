# Reviewer Grading: Practice Run, 1428 Sample Ridge Lane

Independent run by the reviewer on 2026-11-08, written to `review-output.md` before reading the builder's `output.md`, `grading.md` or `sample.md`. Prompt: the practice prompt in `practice/README.md` ("treat today as November 9, 2026"). Followed SKILL.md and its references only; the footer sent the run to `utah-repc.md`.

Result: **pass, 12 of 12 of the builder's practice checks** (the checks in `grading.md`, applied to `review-output.md`).

| # | Check | Result | Evidence in review-output.md |
|---|---|---|---|
| 1 | Marked as a practice run, counting from November 9, 2026 | Pass | First flag |
| 2 | Item 4: Settlement Deadline (24(d)) December 11 to December 4, 2026, not stated up front | Pass | Flags; bottom line; What Changed row 1 |
| 3 | Item 3 (walk-through scheduling) also not in the heading | Pass | Flags; What Changed row 4 |
| 4 | Settlement would land on the Financing & Appraisal Deadline, and what that means | Pass | Bottom line, quoting 8.3(b)(ii) and (iii); What It Means |
| 5 | Chain: REPC countered, Addendum No. 1 accepted October 31, Addendum No. 2 pending, post-acceptance | Pass | Chain table |
| 6 | Carries forward November 17 Due Diligence Deadline and the television exclusion | Pass | Carried forward line; deal; requested change 6 |
| 7 | Price lines total $489,000 against the $495,000 price | Pass | Deal as it would stand |
| 8 | Response deadline 5:00 PM Mountain Time Tuesday, November 10, 2026, within 48 hours | Pass | Flags; Response Deadline |
| 9 | Options: accept, counter (keep December 11), lapse (contract unchanged) | Pass | Options 1 to 3 |
| 10 | Email: Title Case subject, leads with the hidden change, under 300 words, no option chosen | Pass | 264 words; [Your recommendation] left |
| 11 | Requested changes with sections and placeholders, no clause text; Take to your broker present | Pass | Requested Changes |
| 12 | Check before sending; dates labeled for strategy; no em or en dashes | Pass | Last section; objective check |

Objective checks (`evals/make/objective_checks.py`, today 2026-11-09): numbers not in the inputs were $4,000, $494,400, $6,000, 0.12% and November 27, each shown as computed. No dashes, Title Case subject, Check before sending present, no banned phrases, no account numbers.

## Compared With the Builder's Run (sample.md)

Same catches: the Settlement change by section number only, the collision with the Financing & Appraisal Deadline, the $6,000 price-line gap, the November 27 walk-through window and the carried-forward Addendum No. 1 terms. Differences:
- The reviewer's run put the two past deadlines (Seller Disclosure and earnest money, both November 4) in Flags, as SKILL.md's output order asks ("a deadline past or within 48 hours"). The builder's run listed them only under the timeline. `sample.md` and `output.md` were updated to add that flag; nothing else in them changed.
- The reviewer's email names the earnest money consequence (Section 8.3(b)(ii) and (iii)); the builder's says "no cushion if anything with the loan runs late." Both are supported by the contract.
- The reviewer's email commits the agent to calling the lender, and its Check before sending lists that commitment for the agent to keep or remove. The builder's run bracketed the same commitment. Both handle it.

No expectation was missed, so the skill was not changed because of this run.
