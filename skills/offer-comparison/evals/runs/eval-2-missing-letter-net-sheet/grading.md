# Grading: Eval 2, Missing Letter With a Net Sheet

Run: `output.md`, following SKILL.md 1.0 on the six files in `evals/files/case-2-missing-letter-net-sheet/`. Graded 2026-11-08.

## Expectations

| # | Expectation (short) | Result | Evidence |
|---|---|---|---|
| 1 | B shown as [no letter uploaded], flagged, certainty lowered, letter requested; the skill keeps going | PASS | Flags line 2; offer set "**[no letter uploaded]**"; Certainty "middle to lower, until a letter arrives"; B question 1 asks for "a current letter covering $512,000 and a $460,800 conventional loan, valid through December 22"; the full comparison is produced |
| 2 | Net sheet's $189,800 used for A; B and C estimated by changing only the 3.0% listing line, the buyer-brokerage percentage and 2.2, math shown, labeled an estimate title confirms | PASS | "Estimated Net, From the Net Sheet" table: $15,360 ($512,000 x 3%), $15,240, $12,800 ($512,000 x 2.5%), $10,160, $6,000 and $0; results $190,890 and $195,650; "estimates from the Pretend Peak Title net sheet dated November 8, 2026; title confirms" |
| 3 | Flat lines and the proration held, with notes on the $505,000 premium and the December 18 date | PASS | Rows marked "(held)"; notes say the premium "is priced at a $505,000 sale price" and the proration "is figured to December 18. B settles December 22 and C December 21"; the payoff is held at the sheet's figure without repeating it |
| 4 | C's letter flagged (Sept 2, expires Dec 1 before Dec 21, $500,000 and $450,000 below $508,000 and $457,200); questions ask for a current letter at the offer's terms | PASS | Flags line 3, table Letter row ("$8,000 below the price", "$7,200 below the loan", "70 days"), C question 1 |
| 5 | Missing initials on page 3 of 7 of C listed for the broker, no ruling on validity | PASS | Flags line 4 and Gaps item 1; "I'm not ruling on whether any offer is valid as written" |
| 6 | B's 3(c)(i) with no box checked read as the 50% default ($4,000); A and C $2,500 | PASS | Walk-away row: "no box is checked in 3(c)(i), so the form's 50% default applies," $4,000; A and C $2,500; Gaps item 4 asks the broker to confirm the reading |
| 7 | Earnest money from Wed, Nov 11 lands Sun, Nov 15 and moves to Mon, Nov 16 under Section 25; Settlements Dec 18, 22, 21 before Christmas | PASS | Table row "Earnest money delivery"; "Before Christmas (Fri, Dec 25)" row; dates labeled for strategy in Flags |
| 8 | Ranking weighs C's higher net against its letter and B's missing letter; names a top two with the net difference; no promise | PASS | Bottom line and Ranking: C (conditional on a current letter) and A, $5,850 apart; B "$1,090 above A" but unverified; no promise of closing |
| 9 | Payoff loan number and lender loan numbers absent; payoff out of the seller email | PASS | Objective check: 0 hits for 77120034, SRL-662104, FFL-90233; 0 hits for "payoff" or "281,600" in the seller email |
| 10 | Seller email with Title Case subject, bold bottom line, offers by letter; Check before sending; no dashes | PASS | Subject "Your Three Offers On 3318 W Pretend Juniper Dr" (Title Case); bolded bottom line; 0 buyer surnames in the email; Check before sending table; 0 dashes |

**10 of 10.**

## Objective Checks

| Check | Result |
|---|---|
| Every number in the output appears in the inputs | PASS. 23 numbers aren't literal in the inputs; each is shown arithmetic: day counts (33, 37, 41, 70), percentages of price (15,360; 15,240; 12,800; 10,160; 4,000; 2,500), estimated nets (190,890; 195,650), differences (5,850; 1,090; 7,200), down payments (101,000; 51,200; 50,800), prices after concessions (502,000; 506,000) and prices less seller-paid amounts (491,900; 493,200; 497,840) |
| Deadlines match the uploaded contracts | PASS. Every 4(a) to 4(e) date and every Section 30 time matches its offer's page 1 and page 7 |
| No em or en dashes | PASS (0) |
| Title Case subject lines | PASS (1 of 1) |
| "Check before sending" section | PASS |
| No cost estimates without bids or a net sheet | PASS. Every cost line comes from the title net sheet or the offers; the held lines are labeled |
| No agent-only MLS fields in client-facing text | Not applicable (no MLS sheet) |
| No protected-class language | PASS |
| No wire or account details | PASS. No loan, account or payoff numbers; the payoff amount stays out of the seller email |

## What Changed After Grading

- The seller email first said "I've asked C's agent for an updated letter." Nothing had been sent; changed to "I'll ask ... today." The same slip was in eval 1's email, so it is a skill fix: SKILL.md step 7 now says the email makes "no claim that a request already went out ("I'll ask," not "I've asked")." The practice run and eval 3 were run after this change.
- A question to Offer A's agent offered "[possession terms] if Robin needs time after Recording." Robin never said she needs time; replaced with a question about the $3,000 contribution.
- The expectation on held lines named the $281,600 payoff; reworded to "the payoff estimate" because the skill keeps the seller's payoff figure on the net sheet rather than repeating it.



## Independent Review (2026-11-08)

The reviewer ran this case from scratch, following SKILL.md 1.0, before reading `output.md`: `review-output.md`. It matched the builder's run on every figure: $189,800 as written; $190,890 and $195,650 estimated by the same changed lines; the same held lines and notes; C's letter problems; the missing initials on page 3 of 7; B's 50% default ($4,000); Sunday, November 15 moving to Monday, November 16; the same top two (C if its letter is updated, then A) and the same $5,850 difference.

**Reviewer run: 10 of 10 on the original expectations, and 11 of 11 with the expectation added below.** Objective checks: 0 dashes; 0 hits for 77120034, SRL-662104, FFL-90233; payoff not in the email; 287-word email.

Changes after the review:
- Expectation 8 added: all three offers lapse on Tuesday, November 10, before the Wednesday, November 11 Acceptance the agent named. Both runs caught it (the builder's Flags: "A Wednesday, November 11 acceptance means getting extensions, or countering, before then"); SKILL.md now says to check every acceptance deadline against the expected Acceptance date, so the behavior no longer depends on luck. Builder's run: PASS.
- Expectation 7 now includes the Closing note: funding and Recording can follow Settlement by up to four calendar days (9.2), so B's and C's Closings could reach December 26 and 25 if Robin means funded and recorded by Christmas. The builder's output was updated by the reviewer in one table row, one email sentence and one Check before sending line to match the SKILL.md change. With that edit, the builder's run is 11 of 11.
