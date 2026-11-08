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
- The email said "I've asked for current proof" before any request was sent; changed to "I'll ask for current proof today." The same slip showed up in eval 2, so SKILL.md step 7 now forbids claiming a request already went out.

## Independent Review (2026-11-08)

The reviewer did not rerun this case; it ran eval 2 and the practice files from scratch instead. After the SKILL.md change about Closing (funding and Recording can come up to four calendar days after Settlement on both Utah forms), this output was stale on one point: it said D fits the January 2 move date "with 3 days to spare," but D's December 30 Settlement allows Closing as late as Sunday, January 3 (2024 form 3.2). The reviewer updated the "Fits the January 2 move date" row, one line in D's certainty factors and one Check before sending line, and added the Closing note to expectation 8 in `evals.json`. The other three offers' Closings (December 26, December 4 and December 25) still fall before January 2. With that edit, the skill run stays 10 of 10.

## Second Independent Review (2026-11-08)

A second reviewer ran this case from scratch, following SKILL.md 1.0, before reading `output.md`: `review-output.md`.

| # | Expectation (short) | Reviewer run | Note |
|---|---|---|---|
| 1 | Sections from each offer's own form | PASS | A and C cite 1, 2.1, 2.2, 2.3, 3(b), 3(c)(i), 4(a) to 4(f), 9.2, 30; B and D cite 2.1, 2.2, 3.2, 3.3, 4.3(e), 8.2, 8.3(a), 24(a) to 24(d), 25 |
| 2 | No net math; not-a-net figures; title net sheets suggested | PASS | Same four "not a net" figures as the builder's run |
| 3 | Escalation from the Net Price definition to $647,500 | PASS | Same nets and result; cap $2,000 above the letter; appraisal-gap cash not shown; proof is the broker's call |
| 4 | C's 2020 addendum and $15,000 twice, no ruling | PASS | |
| 5 | B's proof of funds short and old; no member or account number | PASS | 0 hits for 0072215 and 3390 |
| 6 | D's page 4 rows unknown; letter expiry; home not listed | PASS | |
| 7 | Buyer letter and photo set aside | PASS | 0 hits for baby, grandparent, immigra, church, nursery, garden, trailhead |
| 8 | Saturday Settlement to Monday; January 2 and Closing checks; strategy label | PASS | Also checked possession against the January 4 rental (below) |
| 9 | Top two A and B, $17,500 and $1,312.50, C's caps | PASS | |
| 10 | Email, Check before sending, no dashes, no loan numbers, no promises | PASS | 343-word email; 0 dashes; 0 loan numbers |

**Reviewer run: 10 of 10.** Same offer letters, figures, top two and differences as the builder's run.

What the reviewer's run had that the builder's didn't: the sellers move into their rental on January 4, and A and B both give possession at Recording, so taking either could put the sellers out of the house about two weeks (A, Settlement December 22) or about five weeks (B, Settlement November 30) before the rental starts. SKILL.md step 4 already said to check possession against the seller's must-have dates; the builder's run read "close by January 2" as the only date. SKILL.md step 4 (and the ChatGPT instructions) now say to check possession against the day the sellers can move into their next home and to note the later-possession or rent-back question, and `comparison-guide.md` has it in the possession row. Expectation 8 now includes it.

What the builder's run had that the reviewer's didn't: the result if D's pages can't be shared as proof ($641,500 from C's $640,000 Net Price). Not an expectation; a good addition.

The reviewer updated `output.md` for the new part of expectation 8: a "Possession against the January 4 rental" table row, a fourth question for B's agent, one paragraph in the seller email (now 375 words) and one Check before sending line. With that edit the builder's run is 10 of 10 again.
