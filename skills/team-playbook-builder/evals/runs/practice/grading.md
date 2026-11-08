# Grading: Practice Run (Lantern Lane Example Team)

Run on 2026-11-08 by following SKILL.md and its references exactly, with the five practice files read in full (PDFs as text, the DOCX and XLSX with python-docx and openpyxl, the VTT as text). The prompt confirmed the fee schedule applies to every agent.

Result: **pass, 12 of 12 checks.**

## What the Practice Set Is Built to Test

| Check | Result | Evidence |
|---|---|---|
| Finds the one contradiction (pond: 10 days versus 14 calendar days) | Pass | output.md "Conflicts" quotes Policy Manual 3.4 and the SOP's "The Pond" with dates; `lead-routing-and-ponds.md` has a CONFLICT block naming the Team Leader |
| Finds both obvious gaps (when agents get paid; time off and coverage) | Pass | Both are in "The three a new agent hits first," quoting the training call (00:02:53) and Policy Manual section 8; both are in `routing.md` "Not Written Yet" with no policy written |
| Leaves out the individual agent's split | Pass | Section 4 is absent from `compensation-and-fees.md`; the removal log names the document and section only; the check script passed with the name, the split, the agreement date and "retention agreement" as must-not-contain terms; a text search of output.md finds none of them |
| Includes the team-wide schedule only because the leader confirmed it | Pass | `compensation-and-fees.md` says the Team Leader confirmed it applies to every agent; sections 1 to 3 only |

## Skill Behavior

| Check | Result | Evidence |
|---|---|---|
| Generated skill passes the check script and the repo's SKILL.md rules | Pass | check-result.txt: "OK ... one folder 'lantern-lane-example-team-playbook/' at the root"; the repo-rules harness (frontmatter parsed with scripts/skills.mjs) passed: description 729 characters, body 42 lines, author is the team by design |
| Every topic file has an Owner line and a Last updated line | Pass | All 8 reference files; the script enforces it |
| Stale document flagged and its date carried into the playbook | Pass | Onboarding Checklist (June 3, 2024) flagged in output.md; `onboarding.md` tells Claude to add the stale note; test question 15 expects it |
| Pre-August 17, 2024 buyer steps held out and sent to the broker | Pass | Both Week 4 steps absent from `onboarding.md`, which says they're under review; output.md Broker Review item 1 cites the NAR change |
| Personal data removed: phone numbers, door code | Pass | No phone numbers or the code in any file (script blocks both patterns, and each was a must-not-contain term); routing by Slack channel and role instead |
| Referenced but missing documents listed | Pass | Open House Safety Policy and brand guide, each with the checklist row that names it |
| 25-question test set: 20 answerable with sources, 5 routed | Pass | Counted: 20 rows plus 5 rows; the routed five cover a contract question, a gap, the conflict, own pay (no removed name) and a brokerage-wide question |
| Message to agents and sharing steps | Pass | Title Case subject "Our Team Playbook Is Now In Claude"; install steps match the Help Center path checked 2026-11-08; both plan paths given because the leader didn't name a plan |

## Objective Checks

| Check | Result | Evidence |
|---|---|---|
| Every number in the output appears in the inputs | Pass | numcheck.py over output.md and the playbook: the only numbers not found in the extracted text are VTT timestamps written without milliseconds (00:00:16 for 00:00:16.000), the file-name prefixes 01 to 05, and the description length 729, which comes from the check, not the documents |
| Deadlines match the uploaded documents | Pass | Every time window in "Check before sending" traced to its section |
| No em or en dashes | Pass | Scanned output.md and every generated file |
| Title Case subject line | Pass | "Our Team Playbook Is Now In Claude" |
| "Check before sending" section present | Pass | Last section of output.md |
| No cost estimates without bids | Pass (applies loosely) | Only dollar amounts are the team's own fees, cap and closing gift limit, each quoted from a document |
| No agent-only MLS fields in client-facing text | N/A | No MLS sheets in the inputs; the agent message has none |
| No protected-class language | Pass | The playbook repeats only the manual's own fair housing rule |
| No wire or account details | Pass | None in the inputs; the playbook repeats only the warning to verify wires by phone |

## Fixes Made During This Run

- Rephrased the conflict note so it doesn't lean toward either number ("check which number the automation uses" instead of "the written rule should match it"), per source-handling.md "Don't recommend a winner."
- Template guidance: the description length aim went from 400 to 700 to 500 to 800 characters, because a description that names five or six topics plus the routing line naturally lands near 730.
