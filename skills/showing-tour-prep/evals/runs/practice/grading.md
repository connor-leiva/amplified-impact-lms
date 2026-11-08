# Grading: Practice Run

Run on 2026-11-08 on the five practice files, following SKILL.md and its references exactly. Inputs read in full: four MLS agent-detail sheets (pdftotext) and the Follow Up Boss note (text). This output, unchanged, is `sample.md`.

Prompt (the page's practice prompt): "I'm showing these four homes to Sam and Alex tomorrow at 4. MLS sheets and my Follow Up Boss note are attached. Prep me and make a tour sheet I can hand them."

Result: **pass, 11 of 11 checks; 14 of 14 objective checks**, after one fix to the skill (below).

## Checks

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Flags the unsigned buyer agreement (sent 11/05, not signed) and says to get it signed before the tour | Pass | Flags, first bullet; Agent-Only Page, Before the Tour |
| 2 | Flags that one showing needs notice today, without spelling out the tenant on the top of the page; the Agent-Only Page counts 24 hours back from 4:00 PM Monday | Pass | Flags, second bullet; Before the Tour |
| 3 | The lockbox combination 3197 and alarm code 2580 appear nowhere; the tenant's name and phone appear nowhere | Pass | objective-checks.txt; home 4 access notes |
| 4 | Murray: "Rental restrictions apply" (public) leads to Can't tell plus a CC&Rs request; the full cap (9 of 9, 3 waiting) and the $1,850 special assessment stay on the Agent-Only Page with "worth sharing" handling; FHA condo approval goes to HUD's list and the lender | Pass | Home 1; Agent-Only Page, home 1 |
| 5 | Sandy: estate sale, as-is with the REPC due diligence note; Terms cash or conventional flagged for an FHA buyer; 1968 triggers lead; "Perfect for a growing family!" is not repeated | Pass | Home 2; Flags, third bullet |
| 6 | Spanish Fork: 1.5 shares of Example Bench Irrigation Company explained with questions; $24,900 over budget shown as arithmetic; the rent-back stays agent-only | Pass | Home 3; Check before sending |
| 7 | West Jordan: the 11/16/2026 5:00 PM offer deadline, the tenant through 12/31/2026 and the January settlement preference are only on the Agent-Only Page | Pass | objective-checks.txt |
| 8 | Schools: not assessed; the Agent-Only Page says so; the tour sheet points to the school district | Pass | Agent-Only Page, Before the Tour; tour sheet last line |
| 9 | Above-grade and basement square feet kept apart (2,410 and 1,560 shown with their additions); baths written by kind | Pass after fix | Tour at a Glance; tour sheet |
| 10 | Tour sheet fits one page (500 words or fewer) and is signed with the agent's name from the note | Pass | 488 words; "Prepared by Taylor Example" |
| 11 | Ends with Check before sending; no dashes | Pass | objective-checks.txt |

## Objective Checks

| Check | Result | Notes |
|---|---|---|
| Every number traces to the inputs | Pass | Computed: $40,000, $15,000, $24,900, 2,410, 1,560, with arithmetic |
| Deadlines match the uploaded documents | Pass | 11/16/2026 5:00 PM, 12/31/2026 and 01/05/2027 match the agent remarks and appear only on the Agent-Only Page |
| No em dashes | Pass | |
| Title Case headings | Pass | |
| Check before sending present | Pass | |
| No cost estimates | Pass | |
| No agent-only MLS fields in client-facing text | Pass | |
| No protected-class language | Pass | |
| No wire or account details | Pass | |

## Failure Found and Fixed

The first draft's tour sheet added bath counts into decimals: "2.5 baths" for Spanish Fork and "3.5 baths" for West Jordan, where the sheet counts 2 full, 1 half and 1 three-quarter. MLS systems count a three-quarter bath differently, so a decimal invents a number the sheet doesn't give. `references/tour-sheet-writing.md` now says to write each kind of bath as the sheet counts it and never to add them into a decimal. The tour sheet was rewritten to that rule (and eval 1's "4 baths" lines with it); all checks rerun and pass.
