# Grading: Case 1, Normal Inputs (the Practice Set)

Run: SKILL.md followed as written, plan mode, by the builder in the build session (not an independent run). The handbook PDF was read with pdftotext and the checklist and roles list with openpyxl and python-docx. No setup was attached, so the setup was built first (the same file as case 4's, in files/onboarding-setup.md) and the plan built from it. The dates code ran for real on files/plan.json; its output is files/plan_dates.md. Output: output.md. This run is kept as sample.md.

Result: 12 of 12 expectations pass; every objective check passes (objective-checks.txt).

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Setup built, saved as onboarding-setup.md (1.0, not approved), not printed | Pass | The opening paragraph |
| 2 | Bottom line, three sentences, start, Day 30 and the three checkpoint dates | Pass | Bottom Line |
| 3 | Dates from the code; the three Sunday moves; closed days named | Pass | Week tables; Check Before Sending, "Moves" and "Closed days"; files/plan_dates.md |
| 4 | The moved Day 14 checkpoint against "by Day 14" and the lead rotation, left to the Team Leader | Pass | Needs Your Answer 1 |
| 5 | Day 19 shadow left out (section 5) and the listing walk-through left out, both in Check Before Sending | Pass | Check Before Sending, "Experience" and "Left out by role" |
| 6 | Every step, owner and standard traced; nothing added | Pass | Source columns; every step is a checklist row (7 to 30) or a handbook section 3 meeting |
| 7 | Thursday training owner and the Buyer Consultation Checklist flagged, not filled | Pass | Needs Your Answer 2 and 3; "[Owner: not in your documents]" |
| 8 | Nothing held; the Day 1 license step kept | Pass | Plan at a Glance; Check Before Sending, "License" |
| 9 | The call block's scrub and consent rules and the Sunday and holiday default | Pass | The paragraph under Week 4 |
| 10 | No split, fee, W-9 number or account detail | Pass | Only "the secure upload link" appears |
| 11 | Title Case subjects, team channels, no results talk, welcome under 250 words | Pass | 2 subjects; 218 words |
| 12 | Check Before Sending last, with its contents; no dashes | Pass | Objective checks |

## Objective Checks

All pass (objective-checks.txt). Numbers not found in the inputs, checked by hand: 1.0 (the setup's version) and 26 (checklist row 26, the left-out Day 19 shadow, a row number read from the workbook).

## Failures Found and Fixed

1. **The setup wasn't saved.** The first pass read the three documents straight into the plan, so the team would have had nothing to approve, test or reuse. SKILL.md (Pick the Mode) now says plan mode with no setup builds one first, saves it as a file, says so in one line, and doesn't print it in the plan. Rerun: the opening paragraph.
2. **A first-week gap was missed.** The handbook names a "signed Independent Contractor Agreement" (section 8), but no checklist step confirms it. The onboarding topics list it under Agreement and Pay Setup; the first pass skipped it. Rerun: Needs Your Answer 4, first line.
3. **A weekly meeting on a closed day.** While the dates code was being tested, the Thursday training on December 24 would have moved to the next open day like a one-time step. The code now has a recurring kind: weekly meetings stay on their own dates, and one on a closed day is marked to confirm with its owner. Rerun: Week 3, December 24.
