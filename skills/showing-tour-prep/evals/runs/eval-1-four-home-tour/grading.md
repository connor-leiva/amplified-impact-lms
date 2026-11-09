# Grading: Eval 1, Four-Home Utah Tour

Run on 2026-11-08 by following SKILL.md and its references exactly, acting as Claude with the skill installed. Inputs read in full as text (pdftotext): the four MLS agent-detail sheets (two pages each). Prompt as in evals.json. Reads: `references/tour-guide.md`, `references/tour-sheet-writing.md`, `references/utah-tour-notes.md`, and the water, rental restriction, reinvestment fee and radon sections of `references/utah-property-notes.md`; `references/buyer-agreements.md` (the agent says the agreement is signed, so no flag).

Result: **pass, 9 of 9 expectations; 14 of 14 objective checks.** No-skill baseline: 0 of 9 fully, 1 partly (below).

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Codes 4590 and 8812 nowhere; Riverton access note says the code is on the MLS sheet | Pass | objective-checks.txt; Agent-Only Page, home 4: "code is on the MLS sheet (not repeated here)" for the lockbox and the alarm |
| 2 | Tour sheet holds no agent-only content (occupancy, access, names, phones, deadlines, the Riverton and Draper concessions, the 20-unit cap and waitlist, the sewer backup, the $150 fee, the 12/15 preference) | Pass | objective-checks.txt (agent-word and agent-fact scan of the tour sheet); the condo's line uses only the public remarks' cap and 12-month rule |
| 3 | Square feet split above grade and basement for every home, beds and baths split by level | Pass | Tour at a Glance: 1,104 / none; 1,340 / 1,300 (40%); 2,060 / 1,020 (50%); 2,050 / 1,050 (100%); beds and baths by level |
| 4 | Riverton HOA $120 quarterly = $40 a month with the division; price changes $10,000, $34,000 (two cuts), $15,000 | Pass | Home 4 snapshot "$120 divided by 3 = $40 per month"; snapshots show each subtraction |
| 5 | Draper rated Doesn't for rent-later from the public remarks; questions ask for the CC&Rs and the rental count | Pass | Home 1 fit; Agent-Only Page questions 1 and 2 |
| 6 | Holladay: trust sale, strictly as-is, buyer keeps due diligence under the REPC's as-is clause; 1958 triggers lead-based paint | Pass | Home 2 red flags (Sections 10.2 and 13.1); Look at in person, first item |
| 7 | Mapleton: 2 shares, flood irrigation, turn schedule explained; questions on conveyance, transfer and assessments | Pass | Home 3 red flags; Agent-Only Page questions 1 to 4 (assessment, delivery, turn schedule, easement, Water Rights Addendum) |
| 8 | Agent-Only Page carries the agent-remarks items with "worth sharing" handling, and the listing agent questions | Pass | Agent-Only Page, homes 1 to 4 (sewer: ask for records, plan a scope, check with the broker) |
| 9 | No buyer agreement flag; Utah mode; numbers trace; no dashes; no school names; ends with Check before sending | Pass | No Flags section; "Utah mode" line; objective-checks.txt |

## Objective Checks

From `objective-checks.txt` (`evals/make/objective_checks.py`, rerun by `evals/make/run_checks.sh`, with the skill's references counted as sources):

| Check | Result | Notes |
|---|---|---|
| Every number traces to the inputs | Pass | Computed: $10,000, $34,000, $15,000, 2,060, 2,050, $40, $100, each shown with its arithmetic |
| Deadlines match the uploaded documents | Pass | The 11/17/2026 noon deadline and the 12/15/2026 preference match the agent remarks, and appear only on the Agent-Only Page |
| No em dashes | Pass | |
| Title Case headings (no email in this skill; tour sheet headings checked instead) | Pass | |
| Check before sending present | Pass | |
| No cost estimates without bids | Pass | No costs at all |
| No agent-only MLS fields in client-facing text | Pass | Tour sheet scanned for agent words and each agent-remarks fact |
| No protected-class language | Pass | "family room" is a room name |
| No wire or account details | Pass | |
| Also: no access codes anywhere, no school names, no price opinions, no stock phrases | Pass | |

## Fix Applied to This Run

The practice run (see `../practice/grading.md`) showed bath counts being added into one number ("4 baths," "3.5 baths"), which hides how a three-quarter bath was counted. `references/tour-sheet-writing.md` now says to write each kind of bath as the sheet counts it and never add them into a decimal. This run's Tour at a Glance and tour sheet were rewritten to that rule, and its bottom line was aligned with the new SKILL.md line that Flags and the bottom line point to the Agent-Only Page without spelling it out. Checks rerun: 14 of 14.

## Baseline (No Skill), Same Prompt and Files

See `baseline.md` and `baseline-objective-checks.txt`. Against the same 9 expectations it meets none fully and expectation 5 partly (it calls the condo a likely dealbreaker for renting and asks for the rental count, but not the CC&Rs). It fails the rest:
- 1: prints "code 4590" and "Alarm code 8812" in its showing notes.
- 2: the client tour sheet repeats agent-remarks facts: the full rental cap, the $3,000 and $5,000 concessions, the 2025 sewer backup and "Offers due Tuesday at noon!"
- 3: square feet as totals only (2,640, 3,080, 3,100), with no above-grade split, and beds and baths summed ("4 / 4").
- 4: "$120/qtr" with no monthly figure.
- 6: no due diligence note for the as-is sale and no lead-based paint item for a 1958 home.
- 7: calls water shares "a big plus" that "can add real value" without asking how they convey; puts the agent-only $150 fee in the notes.
- 8: no separate agent-only page; showing notes, codes and remarks are mixed into the property notes.
- 9: lists every school by name on the client sheet; no Check before sending.
It also gives price opinions ("Good value," "the value play") and picks a favorite partly on the seller's concession, which is offer territory.

What the skill adds: agent-only fields and codes kept off the buyer's page, above-grade and basement square feet kept apart, the Utah details (as-is under the REPC, lead for a 1958 home, water share questions, rental cap rules), questions per listing agent and a Check before sending list.

## Review Update (2026-11-08, independent reviewer)

The reviewer confirmed against both REPC forms that the Due Diligence Condition is a checkbox (Section 8.1 "IS / IS NOT" in the December 4, 2024 form; Section 3(a) in the November 1, 2026 form). `utah-tour-notes.md` now says so, and this output's Holladay lines were edited to match: the buyer can still inspect "as long as the offer includes the Due Diligence Condition," and the tour sheet says "your offer can still include time to inspect." Expectation 6 in `evals.json` now asks for that wording. Objective checks rerun: 14 of 14. The grade stands at 9 of 9.
