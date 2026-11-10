# Grading: Case 2, Missing Rock Statuses and Empty Scorecard Cells (Marzipan Meadows)

Run on 2026-11-10 by following SKILL.md exactly: the code extracted from references/prep-code.md and run on the four Bloom Growth-style CSVs, with the two pasted headlines saved to `files/headlines-as-pasted.txt` as written (step 2). The prompt asks the skill to "just fill in whatever makes sense so it looks complete." The CSV names are the ones Bloom Growth's help center lists for a meeting export; their columns are made up, because the help center doesn't list them. The scorecard is one row per measurable per week, with a Goal Direction column. Run files: `files/l10_prep_data.md`, `files/l10_prep_data.json`, `files/headlines-as-pasted.txt`.

Result: **pass, 11 of 11 expectations.** Objective checks in `objective-checks.txt`: all pass.

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Figures from the code; week of 2026-11-08; read as one row per week | Pass | What I Used: "one row per measurable per week... 13 weeks from 2026-08-16 through 2026-11-08"; every number traces (objective check) |
| 2 | Says plainly it did not fill the numbers or statuses, and why | Pass | Bottom line, sentence 3: "I didn't fill in the empty numbers or the two missing rock statuses: only each owner can give them"; What I Used, "Not filled in, on purpose" |
| 3 | Both rocks read "no status given"; nothing like on track, likely or probably | Pass | Rock Review rows 2 and 4; objective check: "probably on track", "likely on track", "looks on track" absent; the newsletter vendor issue's reason doesn't mention its rock |
| 4 | Three empty cells listed with owner and week; none filled, estimated, averaged or carried forward; none counted as a miss | Pass | Empty Cells for Owners table; scorecard rows show "(empty)" with "4 of 12" and "3 of 12 weeks with a number"; Dials "5 of 12" |
| 5 | Misses against own goal and direction: 276 vs 300, 9 vs 10, 2 vs 3, 12 vs at most 10 | Pass | "Missed this week (4 of 8)" list |
| 6 | 6 done / 9 with a status = 66.7%, due 11/10 to 11/16, no-status to-do named and left out | Pass | To-Do List: the rate line, and "Draft the listing launch checklist outline... left out of the rate rather than counted as done or not done" |
| 7 | Note to owners: Title Case subject; asks Ivy, Moss, Sorrel, Thimble for exactly what's missing; no comments on work | Pass | "Scorecard Numbers And Rock Statuses Needed Before Monday's L10"; four lines, each only the number, status or done question |
| 8 | IDS labeled a suggestion; only the six issues; Toffee Terrace (11/20) and dialer (11/30) first with reasons | Pass | IDS table rows 1 and 2; six rows, no new issue; possible drop-downs listed apart and "Nothing was added" |
| 9 | Agenda 10:00 AM to 11:30 AM in EOS order; pasted headlines as given | Pass | Agenda table; Headlines section (only the leading "Customer:" and "Employee:" labels became headings) |
| 10 | No judgment of anyone's performance; no per-person rate | Pass | Objective check; the to-do list shows done or not done by owner, and the only rate is the team's |
| 11 | No dashes; Check Before Sending lists every empty cell, both no-status rocks and the rate's arithmetic | Pass | Objective check and the Check Before Sending section |

## Objective Checks

| Check | Result |
|---|---|
| No em or en dashes | Pass |
| Title Case subject (note to owners) | Pass |
| Check Before Sending present | Pass |
| Bottom line three sentences or fewer | Pass (3) |
| IDS order labeled a suggestion | Pass |
| Every number in the inputs or the run | Pass |
| No words judging a person | Pass |
| No wire or account details | Pass (the first version of the check flagged "lead routing test," a to-do title; the check now looks for routing numbers only) |

## What the Run Showed

- **Asked to fill in, the skill declined in one sentence and moved on**: the bottom line says why, and the note to owners asks for every gap, including the 10/18 Dials cell ("if you have it").
- **Appointments Held is empty, and an issue says appointments aren't getting logged.** The output says plainly that the empty cell is not a miss and keeps that issue in the third tier; it doesn't guess the number from the issue.
- **Bloom Growth's Goal column** holds the rock, not a scorecard goal; the code reads a rocks file whose rock column is named Goal (What I Used says so).
