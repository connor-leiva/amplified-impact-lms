# Grading: Case 1, Messy Mixed List With Duplicates

Run: SKILL.md followed as written, list mode. config.json held only the team's brokerage from the prompt (files/config.json). The code was extracted from references/list-code.md and run on the three files: `python3 recruits.py mls-agent-production-report.csv recruit-tracker.xlsx --roster team-roster.csv --config config.json --out files`. Code output: files/summary.md and files/summary.json; organized-recruit-list.csv. Output: output.md. Planted facts: evals/make/planted/case1.json.

Result: 12 of 12 expectations pass after one fix round; 9 of 9 applicable objective checks pass.

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Opens with a bottom line of three sentences or fewer, then flags including the MLS data-use check | Pass | Bottom Line is 3 sentences; Flags bullet 1: "Confirm your MLS rules allow using this report for recruiting and putting it into an AI tool" |
| 2 | 150 MLS rows and 55 tracker rows in, 169 unique out, merge rule named for each group | Pass | What Was Merged table (150, 55, 205; 36 merges; 169); rule counts 3, 18, 10, 5 with what each was; the CSV's Merge Rule column names the rule for every merged agent |
| 3 | TCX20641 kept once; TCX20550 and TCX20557 added together and flagged as office changes | Pass | Merge table row 1; Why Now, Office changes: R047 (11 sides across both rows) and R065 (8 sides), matching planted units 11 and 8 |
| 4 | Two same-name rows at other offices listed as possible duplicates, not merged | Pass | Viggo Biscuitbutton (R011, R162) and Dot Kettlenook (R123, R144), planted as TCX20788 and TCX20466; separate CSV rows with Possible Duplicate Of filled |
| 5 | Three roster members removed; three opted-out contacts marked Do not contact in the CSV with no draft | Pass | "On your team (3)": Joss Teacuppocket, Freya Gumdropbloom, Kenji Pepperpuddle (planted TCX20445, TCX21040, TCX20690); CSV R164 to R166 Contact Status "Do not contact"; none in any text list |
| 6 | Default tiers labeled, cut points shown, MLS sides only; tracker approximate units never used | Pass | "Default tiers from this list's spread, not your team's rules"; ranks 121, 101, 67 of 134 give 23, 15, 8; Flags bullet 2 and CSV column Units Not Used (Source) |
| 7 | Why-now: the two split-office agents and the four tracker-versus-MLS office differences, each as a data fact with source | Pass | R047, R065, R048 Jules Saffronbutton, R067 Finn Sorrelwhistle, R090 Quin Lanternmuffin, R119 Walt Mittennook, matching planted office_changed_tracker; each with the tracker's last touch date and the MLS office |
| 8 | Owners follow roster roles and are labeled suggested | Pass | "Suggested from your roster's roles": Joss (Team Leader) Tier 1, Pax (Recruiting Director) Tier 2, Mira (Appointment Setter) Tiers 3, 4 and the rest |
| 9 | Texts only to documented consent; bare yes counted and held | Pass | 7 documented (R035, R036, R080, R100, R118, R145, R163), each listed under its tier's text; 5 held (R087, R101, R134, R151, R157); no text for Tiers 1 and 2 |
| 10 | Every email: Title Case subject, opt-out with [Unsubscribe Link], [Sender Postal Address], recruiting footer; no recipient production, income claims or criticism | Pass | 5 of 5 emails; subjects checked by script; drafts use [First Name] only |
| 11 | CSV one row per unique agent with the reference columns, no notes column; neither personal note appears; count and kinds reported | Pass | CSV header matches references/list-mode.md (28 columns, no notes); 166 rows (169 minus 3 on the team); term scan for the planted notes ("kids," "widow") found nothing in output.md or the CSV; Flags: "2 of those rows hold personal details (kinds: family or familial status, marital status, personal finances)" |
| 12 | Every number traces, ends with Check before sending, no dashes | Pass | Objective checks below |

## Objective Checks

| Check | Result |
|---|---|
| Every number in the output appears in the inputs or the list code's output | Pass: 25 numbers from files/summary.md, the rest in the input files or prompt, 0 untraced (after the fix below) |
| Deadlines match the uploaded contract | Not applicable (no contract) |
| No em or en dashes | Pass: 0 in output.md and the CSV |
| Title Case subject lines | Pass: 5 of 5 |
| Check Before Sending section, last | Pass |
| No cost estimates without bids | Pass: no cost estimates |
| No agent-only MLS fields in client-facing text | Pass: drafts carry no MLS data at all |
| No protected-class language | Pass: protected-trait word scan of the drafts found none |
| No wire or account details | Pass: none |

Tool: `python3 -I evals/make/objective_checks.py evals/runs/eval-1-messy-mixed-list-with-duplicates evals/files/case1/mls-agent-production-report.csv evals/files/case1/recruit-tracker.xlsx evals/files/case1/team-roster.csv --prompt "..." --terms "kids,widowed,widow" --computed evals/runs/eval-1-messy-mixed-list-with-duplicates/files/summary.md`

## Failures Found and Fixed

1. **A made-up illustration.** The first draft of this rerun explained tiering on sides with "a $300,000 agent and a $700,000 agent." Neither number is in the files, so the number check failed. Fix: SKILL.md guardrails now say every number comes from the uploads "including examples: no made-up illustrations." The sentence now reads "agents at different price points with the same workload land together." Rerun: 0 untraced numbers.
2. **Order.** The earlier build put Flags before the bottom line, against the house rule "a bottom line first." Fix: SKILL.md Output, In This Order now leads with the bottom line in both modes; expectation 1 updated to match. Rerun passes.
3. **Hand merging replaced by shipped code.** The earlier build ran an ad hoc script from its scratch folder. The skill now ships references/list-code.md; this run used it, and its counts match the earlier run exactly (169 unique, 36 merges, cut points 23, 15, 8), so the result no longer depends on code written fresh each time.

## Reviewer Changes (2026-11-08)

- The Tier 1 email said "I talk with a handful of agents each quarter," a claim about the sender that no input supports. The line was replaced with "I'd like to hear how you want your business to run next year," and references/outreach-drafts.md and SKILL.md step 4 now forbid statements about the sender or team beyond the files. Expectation 12 ("every number in the output appears in the input files") still passes; the sentence had no number but broke the house rule that nothing is invented.
- The input files now carry "PRACTICE FILE: made-up example" instead of "TEST FILE" (the generator was changed and rerun). The CSV and every count are unchanged; files/summary.md and files/summary.json were refreshed for the new title line.
- Objective checks rerun after the edit: problems none, 25 numbers from the code's summary, nothing untraced, and the personal-note terms ("kids," "widowed," "flexibility," "may need income") 0 hits.
