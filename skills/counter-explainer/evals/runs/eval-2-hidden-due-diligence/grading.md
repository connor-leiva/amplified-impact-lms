# Grading: Eval 2, Hidden Due Diligence Change on the Revised REPC

Run on 2026-11-08 (a Sunday) by following SKILL.md exactly. The REPC footer reads "EFFECTIVE NOVEMBER 1, 2026," so Step 2 sent the run to `utah-repc-2026.md`; `reading-the-chain.md`, `drafting-guide.md` and `utah-forms-and-counters.md` were read where SKILL.md says to. Inputs: the three PDFs, read in full. Side: buyer's agent ("my buyers"); the agent didn't say which agent they are, so the email is signed [Agent Name].

Result: **pass, 12 of 12 expectations.** Objective checks in `objective-checks.txt`.

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Item 3 changes the Due Diligence Deadline (Section 4(b)) from November 20 to November 13, 2026 | Pass | First flag; "What Changed" row 1, quoting item 3 |
| 2 | Says the change isn't stated up front (heading and the listing agent's description) | Pass | First flag quotes the heading "Home warranty and refrigerator."; table column "Stated up front? No" |
| 3 | Bottom line names the Due Diligence change | Pass | "Addendum No. 2 does three things, not two ... item 3 moves the Due Diligence Deadline" |
| 4 | Reads the footer as the November 1, 2026 form, says `utah-repc.md` numbers don't apply, cites 4(b), 12.1, 2.3, 7.3 | Pass | Second flag; the note under the table explains 4(b) here versus 24(b) on the December 4, 2024 form |
| 5 | Waiver and $7,500 non-refundable except 12.2(a) and 12.3(a), by 5:00 PM MT on the deadline | Pass | "What It Means: Risk," citing 12.1(c); consolidated deal; email |
| 6 | Connects the Thursday, November 12 inspection to one day before the deadline | Pass | Bottom line, "The math," "What It Means: Time," email |
| 7 | Response deadline 5:00 PM MT November 10, 2026, buyers must accept; changes an accepted contract | Pass | Flags, bottom line, chain row 3, "A contract already exists" |
| 8 | Options include a counter keeping November 20, and a lapse that leaves the contract as is | Pass | Options 2 and 3 |
| 9 | Consolidated deal shows $462,000 and 48 hours after Recording; flags lines totaling $455,000 | Pass | "The Deal If the Buyers Sign"; "Price lines don't match ... $455,000 ... $7,000 difference" |
| 10 | Email: Title Case subject, leads with the change, under 300 words | Pass | "Addendum No. 2 On 77 Example Court: Your Inspection Deadline Would Move Up"; bolded opening names the deadline move; 280 words |
| 11 | Check before sending present; dates labeled for strategy | Pass | Final section; label above the timeline |
| 12 | No clause text, no em or en dashes | Pass | Requested changes name terms and values only; objective check: none |

## Objective Checks

| Check | Result | Notes |
|---|---|---|
| Every number traces to the inputs | Pass | Not in the inputs, each shown as computed: $3,750 (50% of $7,500), $7,000 ($462,000 minus $455,000), November 12 (the Thursday in the agent's message). "December 4, 2024" is the other form's version, named from the reference |
| Deadlines match the uploaded contract | Pass | 4(a) to 4(e) as printed; the new 4(b) from item 3; weekdays checked |
| No em dashes | Pass | |
| Title Case subject lines | Pass | |
| Check before sending present | Pass | |
| No cost estimates without bids | Pass | |
| No agent-only MLS fields in client-facing text | N/A | |
| No protected-class language | Pass | |
| No wire or account details | Pass | |

## Notes From the Run

- Two catches beyond the expectations, both from the date checks: the earnest money date (4 calendar days after a November 4 Acceptance) lands on Sunday, November 8, which the revised form's Section 25 moves to Monday; and the Seller Disclosure Deadline (November 9) would leave only 4 days to review disclosures before a November 13 deadline.
- A fixture problem was found and fixed before this run: the first version of the REPC was dated October 29, before its own form's November 1, 2026 effective date. `reading-the-chain.md` now tells the skill to flag a document signed before its footer's effective date.

## Baseline (No Skill), Same Prompt and Files

See `baseline.md` and `baseline-objective-checks.txt`. Against the same 12 expectations the baseline meets 5 (1, 2, 6, 7 and 8) and fails 7 (3, 4, 5, 9, 10, 11 and 12). It has no bottom line, so expectation 3 fails even though the change is in its list:
- It catches the Section 4(b) change and the one-day squeeze after the Thursday inspection, which is the core of the case.
- It says nothing about the form version (expectation 4) and never mentions what happens to the $7,500 earnest money if the deadline passes (expectation 5). Its email says the buyers would have one day to "submit any repair requests," but under Section 12.1(b) a written resolution has to be signed by the deadline, not just sent.
- It never builds the deal as it stands, so it misses the $462,000 price and the price lines that still total $455,000 (expectation 9).
- The email's subject isn't Title Case and has an em dash, it uses "don't hesitate to reach out," and it recommends an option on the agent's behalf ("My recommendation is that we counter"). There is no Check before sending, and no date list labeled for strategy (expectations 10 to 12).
- It doesn't distinguish signing the addendum from a counter on the form, and gives no requested changes for the agent to enter.

What the skill adds: the form check, the earnest money consequence in the contract's own terms, the consolidated deal with its price-line gap, the earnest money weekend date, an email that leaves the decision to the agent, and a Check before sending list.
