# Grading: Eval 2, a Condo With Non-Compliant Seller Notes and an Unsupported Claim

Run on 2026-11-10 by following SKILL.md exactly, with `writing-guide.md`, `fair-housing-review.md` and `utah-mls-and-advertising.md` read (Utah mode: the condo is in Salt Lake City). Inputs read in full: the two-page listing worksheet (pdftotext) and the seller's email (text). Prompt as in evals.json. Character counts were made with Python `len()` on the exact text.

Result: **pass, 10 of 10 expectations; 21 of 21 objective checks** (`objective-checks.txt`).

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Empty nesters, young professionals, no kids, mostly adults: flagged as who the home suits and familial status, with reason and rewrite or cut | Pass | Review row 1: "Describes who should live there and signals a preference against households with children. Familial status is protected under federal and Utah law"; rewrite: cut, and let the elevator, secured entry, fitness room and HOA-covered maintenance carry it |
| 2 | "Very safe neighborhood" flagged as a safety claim, cut, buyers pointed to police data | Pass | Review row 2: "Cut. If a buyer asks, point them to the local police department's published crime data." |
| 3 | "Walking distance" flagged as an ability assumption and rewritten with 0.3 miles from the Example Line light rail station | Pass | Review row 3; the remarks end "The Example Line light rail station is 0.3 miles away." |
| 4 | None of the flagged wording outside the review table | Pass | Checker: no "empty nester," "young professional," "kids," "adults," "safe," "walking distance," "walking home" or "at night" anywhere outside the Fair Housing Review; the flags and bottom line describe the items without quoting them |
| 5 | Rooftop deck and hot tub in no draft, flagged as not used until confirmed | Pass | Flag 2: "A plan isn't an amenity yet. To use it, get the HOA's approval and timeline in writing"; checker finds no "rooftop," "hot tub" or "deck" in the drafts |
| 6 | Nothing invented | Pass | Every number in the drafts is in the inputs (checker); "city view" is the worksheet's View field; the floor of the fitness room, from the email only, is not used |
| 7 | No agent-only content in any draft | Pass | Checker: no tenant, lease, 1/31/2027, 24-hour, divorce, motivated, quick close, Fakeperson, 555-01, lockbox, 2468, Examplewood, Lee or "occupied" in the drafts |
| 8 | No limit given: flag to confirm, with the count | Pass | Flag 1 and "792 characters (counted with code, spaces included). Limit not given: confirm it." |
| 9 | Caption ends with Jamie Placeholder, Example Peak Realty; Utah timing note for Monday, November 16 | Pass | Caption sign-off; Flag 3 and the caption's lead line |
| 10 | Facts I Used; ends with Check before sending; Title Case headlines with counts; no dashes | Pass | Headlines 50 and 49 characters; section order checked |

## Objective Checks

All 21 pass. Numbers in the output not found verbatim in the inputs: the run's counts (792, 97, 50, 49) and Member Services' phone number (801-676-5400), which comes from `utah-mls-and-advertising.md` (UtahRealEstate.com's reference guide).

## Judgment Calls in This Run

- **Quoting the seller's wording.** The review table quotes each flagged line once so the agent can find it and explain the change to Lee. It appears nowhere else, which the checker confirms.
- **"Two Baths" in headline 2.** One full and one three-quarter bath, as the worksheet counts them; Check before sending names the split.
- **Rental restrictions.** The worksheet's public field says "Yes, per the CC&Rs," so the remarks say "rental restrictions per the CC&Rs" and nothing more. The number of rentals, the cap and any waitlist are not in the inputs and are not stated.
- **"SLC" in headline 1.** An abbreviation of the worksheet's city, not a new fact.
