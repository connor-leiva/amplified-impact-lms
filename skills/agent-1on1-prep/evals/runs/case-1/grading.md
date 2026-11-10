# Grading: Case 1, the Full Practice Set (Marigold Fizzwhistle)

Run on 2026-11-10 by following SKILL.md exactly: goals.json written from the goals file (seven annual production goals and two planned rates, each with its line quoted; the take-home figure left out as pay), the code extracted from references/prep-code.md and run on the numbers CSV with `--agent "Marigold Fizzwhistle" --goals goals.json --goals-source "PRACTICE Marigold Fizzwhistle 2026 Goals.md" --as-of 2026-11-10 --last-1on1 2026-10-08` (the user said the numbers were pulled November 10, 2026; the last notes are dated October 8, 2026), then the prep built from the run in SKILL.md's output order. Inputs: the three practice files (a Sisu-style monthly CSV for January to November 9, 2026, her 2026 goals with a take-home figure and a personal "why", and the October 8 notes with three commitments), plus the leader's notes in the prompt. Run files: `files/goals.json`, `files/one_on_one_data.md`, `files/one_on_one_data.json`. The extracted code's output matches the dev copy's (evals/make/prep_1on1.py) byte for byte.

Result: **pass, 10 of 10 expectations.** Objective checks in `objective-checks.txt`: all 16 pass.

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Figures from the code; goals.json quotes found; as-of 11/10/2026 and its source; January to October window; November partial | Pass | one_on_one_data.md: "Quotes checked against: PRACTICE Marigold Fizzwhistle 2026 Goals.md", no goal left out. Flags: "As of 11/10/2026: you said the numbers were pulled November 10, 2026, and the file name carries 2026-11-10. The pace window is January through October 2026 ... November 2026 is a partial month: shown apart and left out of the pace math." Every number traces to the inputs or the run (objective check) |
| 2 | Pace with arithmetic: 24 x 10 / 12 = 20.0, 20 / 20.0 = 100.0%, 33 / 40.0 = 82.5%, 85 / 100.0 = 85.0%, $221,035 / $225,000 = 98.2%; prorated evenly | Pass | Numbers Against Goal table, one row per measure with the prorated goal, pace and difference written out; "against her 2026 goals prorated evenly: each annual goal x 10 / 12"; Flags: "prorated evenly by month (no seasonality)". 30 rates, 10 prorated goals and 12 differences recomputed right by the objective check |
| 3 | Met to signed 33 / 72 = 45.8% against her plan's 50%, with the caveat | Pass | Count ratios table: "33 / 72 = 45.8% / 50% ("Appointment met to signed: 50%"): under it", then "Each ratio divides one year-to-date count by another for the same months ... Sisu's own conversion figures stay the source of record." |
| 4 | Then and now from the run; October against her own average; open house labeled as from the notes | Pass | What Changed table: "Signed / 31 / 2 / 33 / 31 / 36.0 = 86.1% / 33 / 40.0 = 82.5%"; average table "80 / 9 = 8.9 a month / 5"; "She says the 10/18 open house at 41 Snickerdoodle Ct brought in 3 buyer leads. That's her report, from your notes; the export doesn't show leads." |
| 5 | Commitments word for word; 1 and 3 quote the leader; 2 "No status given" with the export's 5 as a fact | Pass | Commitments table quotes all three exactly as the notes wrote them. Status 1: "she texted me on 10/29 that she finished calling the Q3 buyers" (not rewritten as "Done"); status 3: "I haven't seen the listing presentation draft yet"; 2: "No status given." beside "The export shows 5 appointments set in October 2026." The objective check finds no missed, not done, partly, overdue, late or completed in the section |
| 6 | One to three focus options in the run's order, with numbers and a question, the leader's call | Pass | Possible Focus Areas (Your Call): Signed agreements, Appointments set, Appointments met (the run's candidates 1 to 3; volume and GCI at 98.2% not used), each with its arithmetic and "To open it"; "These are options from the numbers, not a verdict; pick one, or none." |
| 7 | Take-home figure and personal why nowhere; flagged | Pass | Objective check: "148,500", "kids", "cabin", "lake", "2028" absent. Flags: "Left out: 2 personal or pay details from her goals file. They don't appear anywhere below; whether and how to raise them is yours." |
| 8 | No label, prediction or comparison | Pass | Objective checks for judging words, prediction words (the one "forecast" is in "not a forecast") and other agents' names all pass; "To reach the annual goal" is labeled "what her goal needs ... not a forecast" |
| 9 | Agenda 10:00 AM to 10:30 AM labeled a suggestion; recap with Title Case subject, placeholders, not-a-review line | Pass | "A suggested order; change it to yours." with five rows from 10:00 AM to 10:30 AM. Recap: "Our One-On-One Recap And Next Steps", [Update From Today] three times, [Focus], [Commitment] by [Date], [Your Commitment], [Date and Time], signed "Cosmo" (the leader named in the notes), and "A coaching recap, not a performance review or a write-up." |
| 10 | No dashes; Flags before a 3-sentence bottom line; Check Before Sending with as-of, goal quotes, statuses and sources, placeholders | Pass | Objective checks; Check Before Sending lists all nine goal quotes, the commitment sources, the October row behind the 5, and every placeholder |

## Objective Checks

| Check | Result |
|---|---|
| No em or en dashes | Pass |
| Title Case subject lines | Pass ("Our One-On-One Recap And Next Steps") |
| Check Before Sending present | Pass |
| Flags first, then the Bottom Line | Pass |
| Bottom line three sentences or fewer | Pass (3) |
| Every n / d = x% right | Pass (30 checked) |
| Every prorated goal right | Pass (10 checked) |
| Every difference and per-month need right | Pass (12 checked) |
| Every monthly average right | Pass (11 checked) |
| Left-out details absent (take-home, why) | Pass |
| Must-appear strings | Pass |
| No words judging the agent | Pass |
| No predictions about the agent | Pass |
| No status word the inputs didn't give | Pass |
| No wire or account details | Pass |
| Every number in the inputs or the run | Pass |

## What the Run Showed

- **Status as given, strictly.** The leader wrote "she finished calling the Q3 buyers"; the prep quotes those words rather than turning them into "Done", and the numeric commitment (at least 8 appointments set in October) keeps "No status given" with the export's 5 beside it as a fact. That is the line between a prep and a verdict.
- **The goal quote check works both ways.** In a smoke test (scratchpad, not kept), a goals.json with closed units of 30 quoted as "Closed units: 24" and a monthly goal whose numbers weren't in its quote were both left out by the run and named. Here all nine goals were found.
- **Two code bugs found and fixed while building:** the column loop failed on the month column, and the JSON writer failed on monthly goals keyed by month. Both were fixed in evals/make/prep_1on1.py and re-embedded before this run.
- **Not tested here:** monthly goals with seasonality (the code supports them; the smoke test only checked that a mismatched quote is refused), a Sisu Agent Accountability download (its file type isn't confirmed), a PDF printout copied to CSV, and a no-skill baseline.
