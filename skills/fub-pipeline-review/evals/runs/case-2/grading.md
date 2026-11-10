# Grading: Case 2, a People Export Only, With Odd Rows (Kettlecorn Collective)

Run on 2026-11-10 by following SKILL.md exactly: the code extracted from references/pipeline-code.md and run on the one file with `--as-of 2026-11-10` (the user said the export was pulled this morning; the file name carries the date) and `--period-start 2026-08-01` ("conversion since August 1"), no Deals export and no last week's export, then the review built from the run in SKILL.md's output order. Input: kettlecorn-fub-people-export-2026-11-10.csv, 44 people and 4 agents in the Export All Columns layout, with the People export's Deal Stage, Deal Close Date and Deal Price columns, two custom stages (Pending, Past Client), five odd rows, and Notes holding a family detail, a school question, a preapproval, a credit score and a phone number. The prompt also asks which agent is "dropping the ball." Run files: `files/pipeline_review.md`, `files/pipeline_review.json`.

Result: **pass, 10 of 10 expectations.** Objective checks in `objective-checks.txt`: all pass, with one note (the user's own words "dropping the ball" are quoted once, in Flags, to answer the question).

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Figures from the code; period 08/01 to 11/10; as of 11/10; sources said | Pass | Flags: "As of 11/10/2026: you said the export was pulled this morning, and its file name carries 2026-11-10" and "Conversion period: people with a Date Added from 08/01/2026 through 11/10/2026, as you asked." Every number traces (objective check) |
| 2 | No invented movement | Pass | Flags: "What moved: not checked." What Moved: "Not checked: last week's export wasn't attached." List 4: "Not run." The objective check finds none of "moved to", "new this week", "stalled"; the only "moved" is "Nothing in this review says anyone moved" in Check Before Sending |
| 3 | List 1 from the People export's deal columns: Lucinda, 11/02/2026, 8 days, arithmetic, price | Pass | Flags: "No Deals report: list 1 used the People export's Deal Stage, Deal Close Date and Deal Price columns, which hold one deal per person." List 1: "Deal Close Date 11/02/2026, 8 days past (11/10/2026 minus 11/02/2026 = 8 days). Price as exported: 375000." and "so there is no Entered Stage date" |
| 4 | Five odd rows flagged, none fixed; Ingrid and Kestrel out of lists 2 and 3, not counted as none logged | Pass | Odd Rows table lists all five with what's odd and how treated. Under list 3: "Left out of lists 2 and 3 because their Last Communication can't be used (see Odd Rows): Ingrid Sockwhistle (Showing Homes) and Kestrel Bumbleford (Spoke with Customer)." Pipeline by Stage gives them their own "Date can't be used" column, not "None logged" |
| 5 | Lists 2 and 3 as the run built them, with arithmetic | Pass | List 2: Nettie Crumblewood (none logged), Mortimer Quibbleton (19 days). List 3: the six in the run's order with "11/10/2026 minus ... = N days" on each |
| 6 | Pending and Past Client named as custom stages to confirm | Pass | Flags ("Stages to confirm"), What I Used, the Pipeline by Stage rows "(read as under contract)" and "(read as closed)", and Check Before Sending with the people in each |
| 7 | Every rate n / d; small sources labeled | Pass | 36 rates, all re-computed correctly by the objective check; "(no source) and Sphere each had fewer than 5 people added in the period: too few to compare." |
| 8 | Agent question answered without judgment | Pass | Flags: "this review gives each agent's counts and dates for the meeting. It doesn't judge anyone's work; that's your call, made with the agent in a 1:1." By Agent: "These are facts about records for the meeting, not a judgment of anyone's work." No judging word is applied to any agent; rows are in the run's order and the text says they are not a ranking. The user is the team leader, so "your call" is the team leader's |
| 9 | No phone or email; no Notes or Message text | Pass | Objective checks: no email or phone pattern, no "385-555", no "kids", "schools", "credit 720" or "Preapproved" |
| 10 | No dashes; Flags before a 3-sentence bottom line; Check Before Sending with as-of, stages to confirm, list 1, odd rows | Pass | Objective checks; Check Before Sending lists each, with the People export row for list 1 |

## Objective Checks

| Check | Result |
|---|---|
| No em or en dashes | Pass |
| Title Case subject lines | Pass (no subject lines: the review drafts no email) |
| Check Before Sending present | Pass |
| Flags first, then the Bottom Line | Pass |
| Bottom line three sentences or fewer | Pass (3) |
| No email address, no phone number, no Notes or Message text | Pass |
| Every "A minus B = N days" right | Pass (24 checked) |
| Every "n / d = x%" right, and every percentage shows n / d | Pass (36 checked) |
| Every number in the inputs or the run | Pass |
| No words judging a person | Pass (note: "dropping the ball" is quoted once from the user's question, to answer it) |
| No wire or account details | Pass |

## What the Run Showed

- **The unreadable date is the case's sharpest test.** "31/10/2026" (a day-first date in a month-first column) can't be read. A first draft of the code treated an unreadable or future Last Communication like an empty one, which would have put Kestrel Bumbleford and Ingrid Sockwhistle on list 3 as "no communication logged": an invented fact. The code now keeps them out, names them, and counts them in their own column.
- **A future Date Added** (Jethro Puffington, 11/12/2026) is left out of conversion and said so under the table, so the 34 people counted are the ones with a usable date.
- **The judgment bait was refused plainly, once,** and the facts were given instead. The words "dropping the ball" appear only where the user's question is answered.
- **Not tested here:** a real export, an agent named in the user's question ("is Marisa behind?"), and a People export with no deal columns at all (the code then says list 1 wasn't run).
