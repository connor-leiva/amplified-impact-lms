# Grading: Practice Run

Run on 2026-11-08 by following SKILL.md 1.0 exactly, on the three practice files: `01 MLS Agent Full Report - 2286 E Pretend Poppy Ln.pdf` (2 pages, with the Property Activity history), `02 CMA Export - 2286 E Pretend Poppy Ln.csv` (12 listings) and `03 Preapproval Letter - Riley and Jordan Exampleton.pdf` (1 page). Prompt, the practice prompt on the page: "My buyers, Riley and Jordan Exampleton, want to write on 2286 E Pretend Poppy Ln. We're on the new November 2026 REPC. Their top number is $565,000. The listing agent says there are no offers yet and they're reviewing as they come in. Our team usually puts down $5,000 earnest money. If we get acceptance Tuesday, November 10, what should we offer? The MLS sheet, CMA export and their preapproval letter are attached."

Result: **pass, 12 of 12** (after one fix, below). This output is `sample.md`.

## What the Practice Set Tests

| Check | Result | Evidence |
|---|---|---|
| Reads the price history from the MLS sheet | Pass | "One cut: $579,900 to $569,900 on 10/30/2026 ($10,000)." |
| Leaves out the short sale and labels the older sale | Pass | 2129 E Example Aster Way ($499,000) "a short sale sold as-is"; 2277 E Make Believe Ct ($538,000) "sold in March, more than six months ago (labeled older)." |
| Uses the same-floor-plan sale correctly | Pass | 2402 E Pretend Poppy Ln: "Same floor plan with an original kitchen ... The listing's 2021 kitchen and 2023 roof put it above this one." |
| Concessions shown on the solds and on the offer | Pass | $4,000, $5,000 and $6,000 with prices after concessions; offer $562,500 with $5,000 = $557,500. |
| Position call with evidence | Pass | Balanced: 23 days against a 15-day median, one cut, seller already offering money, no other offers. |
| One price inside a stated range, under the buyers' limit | Pass | $562,500 in $560,000 to $567,500; $2,500 under $565,000. |
| 2026 form used throughout | Pass | Sections 1, 2.2, 3(a) to 3(d), 3(c)(i), 4(a) to 4(f), 9.3, 30; 0 hits for 24(a) to 24(d) and 8.4. |
| Lender timing drives the deadlines | Pass | Appraisal 20 days against the letter's 14; Financing 24 days against its 21; Settlement inside the letter's December 27 expiration. |
| 2026 weekend rule applied correctly | Pass | Earnest Money day 4 (Saturday, November 14) moves to Monday, November 16; Due Diligence, Appraisal and Financing deadlines are set on weekdays because the rule doesn't move them. |
| Agent-only remarks used for strategy only | Pass | Settlement after December 1 and 3 days' possession appear in the agent's table labeled "don't share"; the buyer email says only that the agent is confirming move-out timing. 0 hits in the email for "relocating," "after December 1," lockbox codes, "Fakerson." |
| Buyer email shape | Pass | "Subject: Offer Plan For 2286 E Pretend Poppy Ln" (Title Case), bolded bottom line, no promise, 292 words, advises against a personal letter. |
| Check before sending traces everything | Pass | Section 9, by MLS number, letter and message. |

## Objective Checks

| Check | Result | Evidence |
|---|---|---|
| Every number in the output appears in the inputs | Pass | 112 numbers; 31 not literally in the files: REPC section numbers, the form's 50% default and $300 holdover figure, computed ratios and price per sq ft, prices after concessions, differences shown (2,400, 2,500, 2,600, 7,400, 10,000), date math and the labeled recommendation (562,500). |
| No em or en dashes | Pass | 0 |
| Title Case subject, Check before sending | Pass | Yes. |
| No cost estimates, no protected-class language, no wire or account details | Pass | None. |

## Changes Made From This Run

- First draft compared the list price with "the highest recent sale" at $571,000; the highest is 1988 E Sample Sage Dr at $572,500. Corrected in the signals table and the appraisal check.

## Shared Reference Added After This Run

The shared `utah-repc-2026.md` was added to `skills/_shared/` during this build, after the run. SKILL.md now lists it for the November 1, 2026 form, and skill.json ships it. Every 2026 section number and quote in this output was checked against it and against the UAR clean copy: they match (Sections 1, 2.1 to 2.3, 3(a) to (d), 3(c)(i), 4(a) to (f), 5, 8.3(c), 9.3, 12.1 to 12.3, 25, 30). No rerun was needed.

## Reviewer's Independent Run (review-output.md)

Run on 2026-11-08 by the independent reviewer, from scratch, following SKILL.md 1.0 on the three practice files with the page's practice prompt, before reading `output.md`.

Result: **pass, 12 of 12** on the practice checks above, plus the objective checks (0 dashes, Title Case subject, Check before sending present, 0 hits in the email for lockbox codes, "relocating," "prefers," the listing agent's phone, or other listings' agent remarks).

**Comparison with the builder's output (sample.md).** Both call Balanced, leave out the short sale, label the March sale older, place the listing above the same-floor-plan sale for its 2021 kitchen and 2023 roof, ask for the seller's offered $5,000 in Section 2.2, stay under the buyers' $565,000, set Settlement after December 1 with 3 days' possession, and keep the agent-only remarks out of the email. Differences are judgment: $562,000 against $562,500; due diligence 14 days against 10; the reviewer used the lender's exact 14 and 21 days while the builder added margin (20 and 24). One real problem in the builder's output: the email asked for answers "By Monday At 6:00 PM," an hour the inputs don't support.

**Reviewer changes.** `output.md` and `sample.md` now ask for answers "by [time]," with the placeholder flagged and traced in Check before sending. SKILL.md now tells the skill to tie decision times to the offer deadline or the agent's message, otherwise [time]. Its 12 of 12 stands.
