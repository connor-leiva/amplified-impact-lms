# Grading: Eval 1, Four Offers on Mixed Forms

Run: `output.md`, following SKILL.md 1.0 on the nine files in `evals/files/case-1-four-offers-mixed-forms/`. Baseline: `baseline.md`, same prompt and files, no SKILL.md or references. Graded 2026-11-08.

## Expectations

| # | Expectation (short) | Skill run | Evidence | Baseline |
|---|---|---|---|---|
| 1 | Each offer's sections from its own form | PASS | A and C cite 2.1, 2.2, 2.3, 3(c)(i), 4(a) to 4(f) and Section 25; B and D cite 2.1, 2.2, 3.3, 4.3(e), 8.2, 8.3(a), 8.3(b)(i), 24(a) to 24(d). No crossover found on a line-by-line read of the table and gaps | FAIL: no form versions or section numbers at all |
| 2 | No commission, title, escrow, payoff or proration math without a net sheet | PASS | Flags say a net needs a net sheet; table shows price after concessions and "price less seller-paid amounts written in the offer (not a net...)"; email ends "None of these figures is your net... I'll get net sheets from title." The words "listing commission" and "escrow" appear only in that label | FAIL: invents a 3% listing commission and "roughly 1%" closing costs and gives "Est. net before payoff" figures |
| 3 | Escalation from the Net Price definition: $630,000, $640,000 (or $625,000), $646,000, so $647,500; cap above letter; buyer-paid shortfall; proof is the broker's call | PASS | Escalation Math lists all three nets, picks D's $646,000, adds $1,500 for $647,500, notes the $662,000 cap is $2,000 above the $660,000 letter maximum, that the letter verifies assets only for down payment and closing costs, and that sharing pages is the broker's call; adds the $641,500 result if D can't be used | FAIL: escalates over C's gross $655,000 to $656,500, ignoring the Net Price definition (overstates A by $9,000) |
| 4 | C's 2020 addendum on a 2026 REPC, $15,000 twice, no ruling | PASS | Flags and Gaps item 1: footer "EFFECTIVE NOVEMBER 18, 2020," Section 3's "Financing & Appraisal Deadline," Section 6 $15,000 and REPC 2.2 $15,000; shows $640,000 and $625,000, $619,650 and $604,650; leaves it to the broker | FAIL: not noticed |
| 5 | B's proof of funds below price and stale; question; member and account numbers absent | PASS | "$598,200 as of September 30, 2026, $31,800 short ... 40 days old"; question asks for current proof covering price plus closing costs; objective check: 0072215 and 3390 found 0 times | PARTIAL: notices the shortfall, not the age |
| 6 | D's missing page 4 flagged, its rows unknown; letter expiry and not-yet-listed home flagged | PASS | Offer set shows "5 of 6 (page 4 missing)"; appraisal, financing, 8.3(b)(i), addenda list and home warranty shown as unknown; letter "expires Dec 19, 2026 (11 days before Settlement)"; sale of home "not yet listed" | FAIL: lists D as having appraisal and financing contingencies it can't see; no expiry flag |
| 7 | Buyer letter and photo set aside, nothing from them appears; email by letter | PASS | Flags: "Set aside, unread for this comparison"; objective check found 0 of baby, grandparent, immigra, church, nursery, trailhead, family; email uses A to D only (0 buyer surnames) | FAIL: summarizes the letter ("starting a family and wanting to be near their church") and suggests it "may resonate" |
| 8 | C's Saturday Dec 19 Settlement moves to Monday Dec 21; Jan 2 check; dates labeled for strategy | PASS | Table: "Sat, Dec 19 (day 40), 4(e): under Section 25 performance moves to Mon, Dec 21"; "Fits the January 2 move date" row; Flags: "Dates are for strategy; confirm dates with your transactions team" | PARTIAL: checks Jan 2, misses the weekend rule, no strategy label |
| 9 | Top two A and B with the dollar difference and the trade; C's repair caps shown | PASS | Bottom line and Ranking: A and B; $17,500 on price after concessions, $1,312.50 on price less seller-paid amounts; trade explained; C's $5,000 and $1,000 caps in the table | PARTIAL: picks Mockridge and Fakeman, but on invented nets and an overstated escalation |
| 10 | Seller email (Title Case, bold bottom line), Check before sending, no dashes, no loan numbers, no promises | PASS | Subject "Your Four Offers On 7720 S Notreal Birch Cir, Side By Side" (Title Case); bolded bottom line; Check before sending traces each number to a file and page; 0 dashes; 0 of SVM-30071552, PLG-118842, MPM-5520193 | FAIL: no email, no Check before sending |

**Skill run: 10 of 10. Baseline: 0 of 10 (3 partial).**

## Objective Checks (skill run)

| Check | Result |
|---|---|
| Every number in the output appears in the inputs | PASS. 27 numbers aren't literal in the inputs; each is shown arithmetic: day counts (35, 39, 43, 51), percentages of price (16,000; 16,187.50; 16,300; 19,650), down payments (64,000; 22,925; 130,400; 3.5%), sums and differences (646,000; 647,500; 641,500; 625,000; 30,000; 619,650; 604,650; 629,700; 631,312.50; 17,500; 1,312.50; 31,800; 7,500; 2,000), and the 90% loan at the escalated price (582,750) |
| Deadlines match the uploaded contracts | PASS. Every date in the table matches 4(a) to 4(e) or 24(a) to 24(d) on its offer; weekdays computed in code |
| No em or en dashes | PASS (0) |
| Title Case subject lines | PASS (1 of 1) |
| "Check before sending" section | PASS |
| No cost estimates without bids or a net sheet | PASS. No commission, title, escrow, payoff or repair cost is estimated; repair amounts are the offer's own caps |
| No agent-only MLS fields in client-facing text | Not applicable (no MLS sheet uploaded) |
| No protected-class language | PASS. Nothing from the buyer letter or about any buyer as a person |
| No wire or account details | PASS. B's earnest money form ("wire to Buyer's Brokerage") is named only as written; no instructions, account, member or routing numbers |

## What Changed After Grading

First draft fixes, before this grade:
- The seller email asked for "a call before noon Monday." Noon isn't in any file; changed to "before Monday at 3:00 PM, when A expires."
- The email said D "is missing pages"; changed to "one page of their contract is missing."

No skill change was needed for this case.
