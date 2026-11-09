# Grading: Eval 2, Kitchen-Sink List, Targeted Counter

Run on 2026-11-08 by following SKILL.md and its references exactly, acting as Claude with the skill installed. Inputs read in full as text (pdftotext): the buyer's 14-item Addendum No. 1, the 11-page inspection report, the condensed November 1, 2026 REPC and the electrician's bid. Prompt as in evals.json.

Result: **pass, 9 of 9 expectations; 9 of 9 objective checks**, after one fix to the skill (below).

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Opens with a bold 48-hour warning: 5:00 PM MT November 10, 2026 deadline; addendum lapses 5:00 PM November 9, 2026 | Pass | "Flags," first line, in bold |
| 2 | Names the November 1, 2026 REPC and uses its own section numbers (4(b), 12.1); no Response Period | Pass | Clock: footer quoted; Sections 4(b), 4(e), 12.1(b), 12.1(c), 22, 23, 25 |
| 3 | Agrees to the four Safety items; pushes back on roof and water heater (age only), driveway and windows (cosmetic), garage slab (beyond "no action needed") | Pass | Item table; "Net" package; response term 4 declines items 1, 5, 8 to 14 |
| 4 | Flags item 6's wrong page (4 cited, finding on 5) and item 10's missing finding (winterized, not tested) | Pass | Item table rows 6 and 10; Questions 1 and 2 |
| 5 | Net impact from the bid lines only ($285, $295, $60; $640); handrail and duct need bids, no estimate | Pass | "Bids and Net Impact" |
| 6 | If a credit comes up: existing $3,000 in Section 2.2, lender confirms the cap | Pass | "Bids and Net Impact," last paragraph |
| 7 | Strategy leads with Net | Pass | "Net (the sellers' stated priority), recommended" is first |
| 8 | Declined items named by number; Title Case subject; buyers never characterized; Check before sending | Pass | Term 4; subject lines; the email describes the request ("Fourteen items") and the house only |
| 9 | No em or en dashes | Pass | objective-checks.txt |

## Objective Checks

| Check | Result | Notes |
|---|---|---|
| Every number traces to the inputs | Pass | Dollar amounts are bid lines or their sum; "$7,000" is the Utah licensing threshold from `references/utah-repair-response.md` (Utah Code 58-55-305), cited as such; "48" is the skill's own 48-hour rule |
| Deadlines match the uploaded contract | Pass | November 10 (4(b)), December 8 (4(e)), November 9 (addendum), 5:00 PM (Section 25) |
| No em dashes | Pass | |
| Title Case subject lines | Pass | |
| Check before sending present | Pass | |
| No cost estimates without bids | Pass | Handrail, duct, HVAC service and warranty all say needs bid or needs quote |
| No agent-only MLS fields | Pass | No MLS inputs |
| No protected-class language | Pass | "family room" is a room name from the report |
| No wire or account details | Pass | |

## Failure Found and Fixed

The first draft of SKILL.md said "If the Due Diligence Deadline is within 48 hours." With only today's date known (Sunday, November 8) and a 5:00 PM Tuesday deadline, "within 48 hours" depends on the time of day, so the warning could reasonably be skipped. SKILL.md step 2 now says "today, tomorrow or the day after (about 48 hours or less), put that first, in bold, with the time the buyer's request lapses." Rerun: the warning leads the output (expectation 1).

A wording slip in the first pass was also corrected: a note said a licensed contractor for the handrail was "not a legal requirement," which is a legal conclusion the skill shouldn't draw. It now says to confirm with the broker or DOPL.
