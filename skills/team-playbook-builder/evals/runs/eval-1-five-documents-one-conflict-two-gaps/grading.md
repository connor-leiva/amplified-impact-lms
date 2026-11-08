# Grading: Eval 1, Five Documents, One Conflict, Two Gaps

Run on 2026-11-08 by following SKILL.md and its references exactly. Inputs read in full: the two DOCX files with python-docx (paragraphs and tables), the two PDFs as text, the transcript as text.

Result: **pass, 11 of 11 expectations.** Baseline comparison at the end.

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Names the skill bluebird-example-group-playbook; the ZIP passes the check script with the one folder at the root | Pass | output.md "Your Playbook Skill"; check-result.txt: "OK ... one folder 'bluebird-example-group-playbook/' at the root"; the repo-rules harness passed too (description 682 characters, body 42 lines) |
| 2 | Closing gift contradiction listed with both quotes, document, section and date, no winner | Pass | output.md "Conflicts" item 1 quotes the Agent Handbook (September 8, 2026) and the Marketing and Brand Rules (August 20, 2026); "Decision owner: Team Lead"; no recommendation |
| 3 | Playbook marks it CONFLICT, shows both, names the decision owner | Pass | `marketing-and-brand.md` "CONFLICT: Who Pays for Closing Gifts" with both quotes, sending agents to the Team Lead; SKILL.md step 6 |
| 4 | Gaps include pond rules and leaving the team, with no policy written for either | Pass | Pond rules are top gap 3 (quoting the handbook and the call at 9:22); leaving the team is in "The rest" (quoting "Coming soon."). The playbook's `lead-routing-and-ponds.md` says pond rules aren't written; `routing.md` lists both under "Not Written Yet" with the Team Lead |
| 5 | Lead Management SOP listed as referenced but not uploaded | Pass | output.md "Documents referenced but not uploaded," first item |
| 6 | Every topic file has Owner and Last updated lines | Pass | All 8 reference files; enforced by the check script |
| 7 | Test set: exactly 25, 20 with answers and sources, 5 routed to a role | Pass | 20 rows with source columns; 5 routed rows (contract clause, pond gap, closing gift conflict, own split, brokerage desk fee) |
| 8 | Generated SKILL.md answers only from references, cites the section, flags 12-month-old sections, routes legal to the Designated Broker | Pass | Generated SKILL.md "How to Answer" steps 1 to 6 and "Always Route These to a Person" |
| 9 | Every policy number, amount, time and date appears in the inputs | Pass | numcheck.py found one number not in the inputs: 682, the description length from the check result |
| 10 | Title Case subject and a closing Check before sending section | Pass | "Our Team Playbook Is Now In Claude"; "Check Before Sending" is the last section |
| 11 | No em or en dashes anywhere | Pass | Scanned output.md and all 9 generated files |

## Objective Checks

| Check | Result | Notes |
|---|---|---|
| Every number traces to the inputs | Pass | See expectation 9 |
| Deadlines match the uploaded documents | Pass | 10 minutes, 24 hours (twice), 3 business days, 2 business days, one business day, one week: each in "Check before sending" with its section |
| No em dashes | Pass | |
| Title Case subject lines | Pass | |
| Check before sending present | Pass | |
| No cost estimates without bids | Pass | Only $150 and $275, both quoted from documents |
| No agent-only MLS fields in client-facing text | N/A | No MLS inputs |
| No protected-class language | Pass | |
| No wire or account details | Pass | None in inputs or outputs |

## Baseline (No Skill), Same Prompt and Files

See baseline.md. Against the same 11 expectations, the baseline meets 2 (expectations 9 and 11) and fails 9. It writes no message to agents and no Check before sending (expectation 10), and it mentions the unfinished Lead Management SOP only as a to-do, not as a referenced document (expectation 5). The rest:
- It names the skill `bluebird-playbook` and never packages or checks it; its install steps point to "Settings, then Capabilities" for the upload, which isn't where Claude's Help Center puts it (Customize > Skills, checked 2026-11-08).
- It spots the closing gift conflict but picks the handbook as the winner and writes "$150 per side" into the knowledge file, so agents get one side as policy.
- It writes policy for both gaps: "leads that aren't worked are typically moved to a shared pond" and "Talk to your Team Lead about transitioning your clients and leads."
- No section citations, no owners or dates, no staleness rule, no routing of contract questions beyond the contacts list, no test set, no Check before sending.

What the skill adds: answers that cite their source, conflicts shown instead of decided, gaps routed instead of filled, a ZIP that passes Claude's upload rules, a 25-question test set, and install steps checked against the Help Center.
