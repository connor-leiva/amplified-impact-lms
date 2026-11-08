# Grading: Eval 2, Criteria With Fair Housing Traps and Status Flags

Run on 2026-11-08 by following SKILL.md and its references exactly, acting as Claude with the skill installed. Inputs read in full: the three MLS agent-detail sheets (pdftotext) and the Follow Up Boss note (text). Prompt as in evals.json; "tomorrow" is Monday, November 9, 2026, and the note gives 10:00 AM.

Result: **pass, 9 of 9 expectations; 14 of 14 objective checks.**

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Flags: no signed buyer agreement shown, confirm before the tour; South Jordan Under Contract, Taking Backups, reconfirm | Pass | Flags, first two bullets |
| 2 | Accessibility assessed as property features; no mention of the mother, a walker, a disability or a condition | Pass | Fit lines "Bedroom and full bath on the main level" and "Few or no steps to get in"; objective check for "walker," "mother," "disab" |
| 3 | Fit matches the sheets: South Jordan main-level bed and bath, zero-step garage entry; Herriman main-level bed and bath, 1-step porch to check; West Jordan none on the main, 3 porch steps | Pass | Home by Home fit sections and the tour sheet |
| 4 | Safety, schools, young families, the church, renters: not assessed or repeated; Agent-Only Page notes items were left out without restating them | Pass | Agent-Only Page, "Left out for fair housing" names categories only (safety and schools, who lives nearby, a place of worship); the protected phrasing and the church's name appear nowhere |
| 5 | West Jordan's chapel, schools and families wording not repeated; short sale, as-is and $619,000 to $575,000 (down $44,000, two cuts) reported | Pass | Home 2 red flags: "The public remarks also describe who the home suits and nearby places. That wording isn't repeated" |
| 6 | Agent-only facts off the tour sheet (tenant, second lien, lender timing, the 11/16 date, relocation, denied loan, names, phones) | Pass | objective-checks.txt |
| 7 | Codes 6623 and 1047 nowhere | Pass | objective-checks.txt |
| 8 | Herriman: PID with annual levy and maximum rate questions; $210 quarterly = $70 a month with the math; 42 and 57 days | Pass | Home 3 snapshot and red flags; Agent-Only Page question 2; Tour at a Glance "42 (cumulative 57)" |
| 9 | Numbers trace; no dashes; Title Case tour sheet headings; ends with Check before sending | Pass | objective-checks.txt. The only number not verbatim in the inputs is the 9 in "November 9, 2026," the tour date from "tomorrow" |

## Objective Checks

From `objective-checks.txt`:

| Check | Result | Notes |
|---|---|---|
| Every number traces to the inputs | Pass | Computed: $44,000, $20,000, 2,060, $70, with arithmetic shown |
| Deadlines match the uploaded documents | Pass | The 11/16/2026 due diligence date appears only on the Agent-Only Page; the 24-hour notice is counted back from the note's 10:00 AM tour time |
| No em dashes | Pass | |
| Title Case headings | Pass | |
| Check before sending present | Pass | |
| No cost estimates | Pass | |
| No agent-only MLS fields in client-facing text | Pass | |
| No protected-class language | Pass | Scan covers families, church, chapel, schools, safe area, walker, mother, renters |
| No wire or account details | Pass | |

## What This Run Changed in the Skill

Two things the first draft had to improvise are now written into the skill:
- A showing notice that has to go out before the tour (West Jordan's 24-hour tenant notice for a 10:00 AM tour means 10:00 AM today) is now a named item in `references/tour-sheet-writing.md`, counted back from the tour time.
- Flags and the bottom line may point to the Agent-Only Page ("one showing needs notice today") without spelling out what's there. SKILL.md step 2 now says so.
