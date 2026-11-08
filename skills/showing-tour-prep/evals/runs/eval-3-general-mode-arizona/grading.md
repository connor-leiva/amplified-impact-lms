# Grading: Eval 3, General Mode (Arizona)

Run on 2026-11-08 by following SKILL.md and its references exactly, acting as Claude with the skill installed. Inputs read in full as text (pdftotext): two one-page agent detail reports from a different MLS layout (Private Remarks and Showing Instructions as labeled sections, occupancy in the main field list). Prompt as in evals.json; Tuesday is November 10, 2026. Reads: `references/tour-guide.md`, `references/tour-sheet-writing.md`, `references/buyer-agreements.md`; every utah-* file skipped.

Result: **pass, 8 of 8 expectations; 14 of 14 objective checks.** After the practice run, SKILL.md's Flags list gained "financing terms that leave out the buyer's loan type"; this output's Flags were brought in line (one line added) and the checks rerun.

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Says state rules were not checked and it follows the sheets only; no Utah law, REPC section, water share rule or Utah radon figure | Pass | Flags, first bullet; a search of the output for Utah, REPC, water share and "1 in 3" finds nothing. The as-is note sends the agent to "the purchase contract and the bank's addendum" |
| 2 | Mesa's Cash, Conventional terms flagged against the VA loan, lender to confirm | Pass | Flags ("VA: one sheet doesn't list VA in its financing terms"); bottom line; Home 1 red flags and fit ("Doesn't as listed"); tour sheet |
| 3 | Mesa bank-owned, as-is, no seller disclosures; 1974 triggers lead-based paint | Pass | Home 1 red flags; Look at in person, first item (with EPA's foreclosure-sale exemption as a question, not a conclusion) |
| 4 | Mesa price $485,000 to $459,000, down $26,000 on 10/27/2026 | Pass | Home 1 snapshot with the subtraction |
| 5 | Chandler leased solar flagged from public remarks with lease and transfer questions; $118 and qualify-to-assume only on the Agent-Only Page | Pass | Home 2 red flags; Agent-Only Page, home 2; objective check on the tour sheet |
| 6 | Pool: Mesa Meets (private); Chandler not rated Meets without qualification | Pass | Chandler "Can't tell. There's a community pool but no private pool" |
| 7 | Codes 7719, 3456 and 2201 nowhere | Pass | objective-checks.txt |
| 8 | Tour sheet free of private remarks and showing instructions; ends with Check before sending; no dashes | Pass | objective-checks.txt |

## Objective Checks

From `objective-checks.txt`:

| Check | Result | Notes |
|---|---|---|
| Every number traces to the inputs | Pass | $26,000 is shown arithmetic; $480,000 is the prompt's "$480k" written out |
| Deadlines match the uploaded documents | Pass | No deadlines on these sheets |
| No em dashes | Pass | |
| Title Case headings | Pass | |
| Check before sending present | Pass | |
| No cost estimates | Pass | The $118 lease payment is a sheet figure, kept on the Agent-Only Page |
| No agent-only MLS fields in client-facing text | Pass | "Owner / Occupant: Bank-owned; vacant" treated as an occupancy field; "vacant" stays off the tour sheet |
| No protected-class language | Pass | |
| No wire or account details | Pass | |

Note on the scan: the first pass of the checker flagged "green" on the tour sheet; it was "greenbelt," a public feature. The agent-only term is now "is green."

## Review Update (2026-11-08, independent reviewer)

40 CFR 745.101(a) exempts "sales of target housing at foreclosure." A bank selling a home it took back is not that sale, so `tour-guide.md` now says not to call a bank-owned resale exempt. This output's Mesa lead line was edited to match, and expectation 3 now checks it. "I'm asking for the lease terms" on the tour sheet became "I'll ask for the lease terms." Objective checks rerun: 14 of 14. The grade stands at 8 of 8.
