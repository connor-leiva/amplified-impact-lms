# Grading: Case 3, Lot Inside a Special District (Colorado, General Mode)

Run on 2026-11-08 following SKILL.md 1.0 exactly, reading both PDFs with the Read tool. Output: `output.md`; objective checks (with `--general`): `objective-checks.txt`.

**Result: 9 of 9 expectations passed. All objective checks pass.**

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Says "State rules were not checked; this follows the uploaded contract only." near the top | Pass | First bullet under Flags. |
| 2 | No Utah statute, REPC section, PID rule or Utah form anywhere | Pass | The checker's general-mode scan found no "Utah," "REPC," "PID," "57-1-49," "17D-4," "R162" or "61-2f." The comparison is titled "Next to the Standard Protections." |
| 3 | District figures reported with their page: 55.000 and 10.000 mills, 58.000 mills, $45,000,000, $28,400,000 to December 1, 2056, $1,500, $45 a month | Pass | "Imaginary Creek Metropolitan District No. 2, as the disclosure states it (Exhibit D p. 1)" with all seven items. |
| 4 | No tax computed for this home; the $2,320 example quoted as the district's illustration; routed to the treasurer or assessor, title and the district manager | Pass | "This review doesn't estimate Sam's tax; the home's assessed value isn't known yet," and the questions to the title company, Example County Treasurer or Assessor and Example District Management. |
| 5 | Money table: $12,000 in escrow, $15,000 to the builder nonrefundable except Seller default, $27,000 as computed | Pass | Money at Risk table with "$15,000 + $12,000 = $27,000." |
| 6 | Mediation then binding arbitration with a jury waiver, to an attorney, no enforceability conclusion | Pass | Key Terms row quotes Section 8; attorney item 1. |
| 7 | Credits what the contract gives: third-party pre-drywall and final inspections, financing and appraisal outs, a 24-month deadline with a refund | Pass | "What This Form Lacks" list marks inspections "present, but narrow," financing and appraisal "present," and completion "a 24-month outside date with a refund." |
| 8 | Email: Title Case subject, no em dashes, no advice to sign, attorney review | Pass | Subject "What The Imaginary Creek Builder Contract Says"; 305 words; "Whether to sign is your call"; Next Step 1. |
| 9 | Check before sending present; every number in the documents or shown as computed | Pass | $27,000 and 65.000 mills are the only figures not in the documents, each shown with its sum. |

## Objective Checks

| Check | Result |
|---|---|
| Every number in the output appears in the inputs | Pass ($27,000 and 65.000 computed; "March 20" in the checker report is a false match on "March 2027") |
| Deadlines match the uploaded contract | Pass. 3, 7 and 21 days after the Contract Date; 14 days after the occupancy notice; 5 days after each inspection and after the appraisal; 24 months. |
| No em dashes | Pass |
| Title Case subject lines | Pass |
| "Check before sending" section | Pass |
| No cost estimates without bids | Pass. The only tax figure is the district's own example, quoted and labeled. |
| No agent-only MLS fields | Not applicable; none present |
| No protected-class language | Pass |
| No wire or account details | Pass |
| General mode, no Utah references | Pass |

## Notes

- The federal ILSA note stayed in, correctly: it is a federal rule, and the skill says it applies in every state. It is framed as consistent with the contract's 24-month clause and left to the attorney.
- The attorney list asks about the state's own special district disclosure rules without stating them, which is what general mode requires.
