# Grading: Eval 2, Two Meeting Transcripts

Run: SKILL.md followed as written, with references/meeting-commitments.md (owners, speaker labels, dates, dedupe, sensitive items) and drafting.md (meeting recap) read at the steps that name them. Inputs: evals/files/eval-2-two-transcripts/ (the Zoom transcript and the Granola notes plus transcript, each read in full, and the roster). Output: output.md.

Objective checks: `python3 -I evals/make/objective_checks.py eval-2-two-transcripts evals/runs/eval-2-two-transcripts/output.md evals/files/eval-2-two-transcripts/*`

Result: 12 of 12 expectations pass after one fix to the output's bottom line count (below); 10 of 10 objective checks pass.

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Every team commitment listed with owner and resolved due date | Pass | Table rows 4 to 13: Raj Fri Oct 30, Sofia Wed Oct 28, Owen Wed Oct 28 and Fri Oct 30, Tess Thu Oct 29 and Wed Nov 4, Nadia Thu Oct 29, Luca Sun Nov 1, Paige Thu Oct 29, Greg Thu Oct 29 |
| 2 | Kendra's own commitments first, the no-date one labeled | Pass | "Yours (Kendra)" table before the team's; #3 "Wed, Nov 4 (rule: no date given)" |
| 3 | Mailer due Thursday, October 29, listed once citing both meetings | Pass | Row 8, timing words "next week," then "Actually, I can do it Thursday"; source "Leadership Meeting ... repeated in Agent Huddle" |
| 4 | Nadia owns the open house schedule; notes the AI notes named Luca | Pass | Row 10 and its note: "Granola's AI notes say 'Luca to send the open house schedule.' ... so it's Nadia's" |
| 5 | Paige's CMA and Greg's preapproval letter captured | Pass | Rows 12 and 13, with "Granola's AI notes left both of these out" |
| 6 | Unknown Speaker deck assigned to Tess, marked inferred, with the reason | Pass | Row 9 "Tess Markwell (inferred)"; note: "You answered 'Thanks, Tess'" |
| 7 | Pat's flyers under Waiting On Others, not a team task | Pass | Waiting On Others table, due Mon, Nov 2 |
| 8 | Raj's objection labeled to confirm dates with the transactions team; no deadline calendar | Pass | Note on #4: "That's for strategy; confirm dates with your transactions team (Raj owns the file). I haven't built a deadline calendar from it." |
| 9 | Split figures and the personal matter appear nowhere; Greg item worded neutrally | Pass | The script finds no "70/30," "divorce" or "grace this month." Private line: "meet with Greg (private, from the leadership meeting)" |
| 10 | One recap per meeting, private items left out | Pass | Drafts 1 and 2; Check Before Sending notes Luca has no line in Draft 1 because his items were private |
| 11 | Explains how Granola's Microphone and System audio speakers were identified | Pass | "How the Granola speakers were identified" paragraph |
| 12 | Check Before Sending, Title Case subjects, no em dashes | Pass | Script: 2 of 2 subjects Title Case, 0 dashes |

## Objective Checks

| Check | Result |
|---|---|
| No em or en dashes | Pass (0) |
| Every time appears in the inputs | Pass (12 of 12 transcript timestamps) |
| Every dollar amount appears in the inputs | Pass (none used) |
| Every other number appears in the inputs | Pass (80 of 80; "29" and "31" are calendar dates resolved from "Thursday" and "end of month," shown as resolved dates) |
| Title Case on subjects the skill wrote | Pass (2 of 2) |
| Check Before Sending section | Pass |
| Covered through line | Pass |
| No forbidden strings (private matters) | Pass |
| Required string ("confirm dates with") | Pass |
| No banned phrases | Pass |
| Deadlines match the uploaded contract | Not applicable (no contract; Raj's "Monday" deadline is quoted and labeled for the transactions team, not calendared) |
| No protected-class language | Pass (the schools question is noted as answered in the meeting, with no characterization) |
| No wire or account details | Pass (none in the inputs) |

## Failures Found and Fixed

- **Bottom line count (output only).** The first draft of the output said "14 commitments ... 3 by you," which left out Kendra's private meeting with Greg. Corrected in the run to "15 commitments: 10 owned by your team, 4 by you (one of them private), and 1 from Pat." No skill change needed: meeting-commitments.md already says sensitive items stay on the leader's own list, and the count now includes that list.
- **Objective check script.** The first version read VTT timestamps (00:00:56.300) as a time plus a stray number. Fixed in evals/make/objective_checks.py to treat hh:mm:ss as one token; reran eval 1 and eval 2.
- **Weekend dates.** Writing row 11 (a Sunday open house) showed that the house rule "never set a weekend date" doesn't fit an event that happens on a weekend. references/meeting-commitments.md now says: "Never set a weekend due date, unless the commitment is an event on that day (a Sunday open house)."
