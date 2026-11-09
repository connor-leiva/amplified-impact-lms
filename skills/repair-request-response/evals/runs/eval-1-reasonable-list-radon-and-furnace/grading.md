# Grading: Eval 1, Reasonable List (Radon and Furnace)

Run on 2026-11-08 by following SKILL.md and its references exactly, acting as Claude with the skill installed. Inputs read in full as text (pdftotext): the buyer's Addendum No. 1, the 11-page inspection report, the condensed December 4, 2024 REPC and both bids. Prompt as in evals.json.

Result: **pass, 9 of 9 expectations; 9 of 9 objective checks.** No-skill baseline: 2 of 9 (below).

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Agrees to both items; both Safety and Reasonable; cites page 9 item 9.1 and page 7 item 7.2 | Pass | Item table rows 1 and 2 |
| 2 | Net impact from bids only, with arithmetic: $3,830 (A) and $6,410 (B) | Pass | "Bids and Net Impact": "$1,450.00 + $2,380.00 = $3,830.00" and "$1,450.00 + $4,960.00 = $6,410.00" |
| 3 | Names the December 4, 2024 REPC from its footer; no Response Period; 5:00 PM MT November 12, 2026 is both the resolution deadline and the end of the cancellation window; cites Section 8.1 and 24(b) | Pass | "The Clock": version row quotes the footer; "There is no Response Period"; Sections 8.1(b), 8.1(c), 24(b), 21 |
| 4 | Buyer's addendum lapses 5:00 PM MT November 10, 2026; accepting Addendum No. 1 as written is the simplest path | Pass | Clock table; "Response Terms": check ACCEPTANCE before 5:00 PM November 10 |
| 5 | HVAC lead times compared with the completion date (five days before December 4) | Pass | "Timing check": November 29, 2026; Option A "leaves little slack," Option B and radon "leave room" |
| 6 | Strategy leads with Certainty | Pass | "Certainty (the sellers' stated priority), recommended" is first |
| 7 | Disclosure note: radon and heat exchanger now known, at least one unrequested finding, next buyer's disclosures | Pass | Lists 9.1, 7.2 and four unrequested items (3.3, 2.3, 6.3, 8.3) |
| 8 | Title Case subject, seller email under 300 words, ends with Check before sending | Pass | Subject "The Buyer's Repair Request On 3340 S Example Crest Dr: My Recommendation"; 295 words; last section is Check Before Sending |
| 9 | No cost outside a bid; no em or en dashes | Pass | objective-checks.txt; $2,580 is shown as $4,960.00 minus $2,380.00 |

## Objective Checks

From `objective-checks.txt` (`evals/make/objective_checks.py`, with the skill's references counted as sources):

| Check | Result | Notes |
|---|---|---|
| Every number traces to the inputs | Pass | Every dollar amount is in a bid or is bid arithmetic shown in the output; section and statute numbers come from the references |
| Deadlines match the uploaded contract | Pass | November 12 (24(b)), December 4 (24(d)), November 10 (addendum), 5:00 PM (Section 21) |
| No em dashes | Pass | |
| Title Case subject lines | Pass | Both subjects |
| Check before sending present | Pass | |
| No cost estimates without bids | Pass | No "typical" costs; only bid amounts |
| No agent-only MLS fields in client-facing text | Pass | No MLS inputs |
| No protected-class language | Pass | "family room" is a room name from the report |
| No wire or account details | Pass | None in inputs or output |

## Baseline (No Skill), Same Prompt and Files

See `baseline.md` and `baseline-objective-checks.txt`. Against the same 9 expectations, the baseline meets 2 (expectations 2 and 4) and fails 7:
- 1: says both are safety issues but gives no category, read or page references.
- 3: gives "November 12" but never names the REPC version, never says there's no Response Period, and never explains that the cancellation window ends at the same moment.
- 5: lists the lead times but never checks them against the November 29 completion date.
- 6: no strategy by priority.
- 7: no disclosure note at all.
- 8: subject "Buyer's repair request - next steps" isn't Title Case, and there's no Check before sending.
- 9: "in line with what mitigation typically costs along the Wasatch Front ($1,000 to $2,500)" is a cost estimate from no bid, and the answer used em dashes (four).
It also uses "Don't hesitate to reach out," repeats an unsourced statistic ("roughly 1 in 3 homes test high") with no source, and signs "[Your Name]".

What the skill adds: the right deadline mechanics for the form actually uploaded, the bid math checked against the completion date, a disclosure note, a buyer's agent note, and a Check before sending list, with no invented costs.

## Reviewer Changes (2026-11-08)

The independent review reworded one line of the clock ("a quick yes protects the deal best" now reads "answering early leaves the most time to sign before then"), so the output doesn't predict the buyer's response. Objective checks rerun with the $2,580 difference listed as arithmetic: 9 of 9.
