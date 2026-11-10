# Grading: Eval 1, a Normal Single-Family Listing in Lehi

Run on 2026-11-10 by following SKILL.md exactly, with `writing-guide.md`, `fair-housing-review.md` and `utah-mls-and-advertising.md` read (Utah mode: the property is in Lehi). Inputs read in full: the two-page MLS input draft and the county parcel record (pdftotext), and the sellers' feature list (text). Prompt as in evals.json. Character counts were made with Python `len()` on the exact text.

Result: **pass, 10 of 10 expectations; 20 of 20 objective checks** (`objective-checks.txt`).

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Remarks 1,000 characters or fewer, with the count against the limit | Pass | "833 of 1,000 characters (counted with code, spaces included)"; the checker counts 833 |
| 2 | Every fact traces to the input draft, the feature list or the prompt; nothing invented | Pass | Facts I Used lists a source for every fact; the checker finds every number in the drafts in the inputs; no views, distances, commute times, schools or condition words |
| 3 | Basement conflict flagged with both values and sources; no finished square footage or "fully finished" in the drafts | Pass | Flag 1 gives 1,220 at 100% (input draft) and 900 finished (county record) and quotes the county's "may not reflect recent improvements"; the drafts say "finished basement" and list its rooms; the checker finds none of 900, 1,220, 3,750, 2,530, "fully finished" or "100%" in the drafts |
| 4 | "About 5 minutes to I-15" in no draft, flagged to confirm | Pass | Flag 2, "Not used until you confirm," with the fix (measure it and give a number) |
| 5 | No member-only content in the drafts | Pass | Checker: no vacant, Boise, relocation, 30-day, 11/23, ShowingTime, Supra, 5530, owner names or phone numbers |
| 6 | No school names, no school, safety or people language; no $702,300 | Pass | Checker: none of the three school names, no people words (room names excepted), no 702,300; Facts I Used says the market value and school names were left out on purpose |
| 7 | Supported features accurate: owned 7.2 kW solar, 3-car tandem garage, $45 HOA and what it covers, baths as counted | Pass | Remarks: "The 7.2 kW solar system is owned, with no lease"; "three-car tandem garage"; "HOA dues of $45 a month cover common area landscaping and a community park with a playground and pavilion"; "two full baths," "a half bath," "a three-quarter bath" |
| 8 | Two Title Case headlines under 60 with counts; caption 60 to 120 words ending with Morgan Exampleton, Sample Summit Realty; at most three hashtags, none about people | Pass | Headlines 57 and 56 characters; caption 92 words; #LehiUtah #LehiHomes #TwoStoryHome |
| 9 | Utah timing note: post once live on Friday, November 20 | Pass | Flag 3 and the caption's lead line, citing UtahRealEstate.com's Clear Cooperation and Public Marketing Rule |
| 10 | Fair Housing Review present and clear; Facts I Used; ends with Check before sending; no dashes | Pass | "Checked the sellers' feature list and my drafts against the review list: nothing flagged"; section order checked |

## Objective Checks

All 20 pass. The only numbers in the whole output not found verbatim in the inputs are the run's own counts (833, 57, 56, 92).

## Judgment Calls in This Run

- **Seller-supplied years.** The new upper-level carpet (2025) and the fence year (2019) come only from the sellers' feature list. Neither is contradicted or left open by the input draft (which shows carpet upstairs and a full vinyl fence, with no year), so under SKILL.md step 2 they are used and marked "sellers' feature list only: confirm" in Check before sending. The first draft of SKILL.md would have held them back; the rule was changed during this run to separate a seller's plain facts (usable, marked) from claims another input contradicts or leaves open, unmeasured distances and drive times, conflicting sizes, and plans (held back). The practice run's roof is the second kind.
- **"Huge" pantry.** Left out as a subjective size word; the drafts say "walk-in pantry."
- **The brokerage name in the caption.** The input draft marks the listing office member-only, which governs the MLS's public fields. The caption is a separate ad, and Utah Code 61-2f-401(12) asks for the brokerage name in it (or one click away), so the caption ends with the agent and brokerage from the prompt.
