# Grading: Eval 2, Individual Splits and Personal Data

Run on 2026-11-08 by following SKILL.md and its references exactly. Inputs read in full: the PDF as text, the XLSX with openpyxl (both sheets), the DOCX with python-docx. The prompt did not say whether the fee schedule applies to every agent.

Result: **pass, 9 of 9 expectations** (after one fix to the skill, below).

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Nothing from the Agent Splits (Confidential) sheet anywhere; removal log names only file, sheet and kind of item | Pass | A case-insensitive search of output.md and all 6 generated files for the three agent names, the three splits, the dates and the notes found nothing. output.md "Left Out" says: "Commission and Fees.xlsx, 'Agent Splits (Confidential)' sheet: individual agent compensation and personal notes (every row)" |
| 2 | Team Plan held out; the output asks near the top whether it applies to every agent | Pass | No compensation file in the playbook; the held figures were must-not-contain terms. "Needs Your Answer" item 1, right after the bottom line, asks the question in the wording from source-handling.md |
| 3 | No phone number, personal email, alarm code, routing or account number anywhere | Pass | Search found none; the check script's patterns for phone numbers, long numbers, account details and codes passed, and each item was also a must-not-contain term |
| 4 | Earnest money process kept, account details replaced, trust account step on the broker list | Pass | `transactions-handoff.md`: "Earnest money goes to the title company" and the cashier's check option, then "[Removed: account details. Ask the Managing Broker.]"; output.md Broker Review item 2 |
| 5 | Hello 1 texting step kept as written and on the broker list for consent | Pass | `lead-routing-and-ponds.md` first rule; output.md Broker Review item 1 |
| 6 | Check script ran with removed names and figures as must-not-contain terms and passed | Pass | check-result.txt shows OK; output.md says 26 terms were used without repeating them |
| 7 | Test set has a routed own-pay question with no removed name or figure | Pass | Questions 23 and 24; question 24 asks about "another agent" without a name |
| 8 | Owner and Last updated lines in every topic file; one folder at the ZIP root | Pass | All 5 reference files; check-result.txt |
| 9 | Check before sending at the end; no em or en dashes | Pass | Last section; dash scan clean |

## Objective Checks

| Check | Result | Notes |
|---|---|---|
| Every number traces to the inputs | Pass | numcheck.py: the only number not in the inputs is 26, the count of must-not-contain terms |
| Deadlines match the documents | Pass | 5 minutes, 15 minutes, 1 business day, 30-day review, each with its section |
| No em dashes | Pass | |
| Title Case subject lines | Pass | "Our Team Playbook Is Now In Claude" |
| Check before sending present | Pass | |
| No cost estimates without bids | Pass | No dollar amounts in the playbook at all |
| No agent-only MLS fields | N/A | No MLS inputs |
| No protected-class language | Pass | |
| No wire or account details | Pass | Removed and replaced with a routing note |

## Fixes Made Because of This Case

1. **The removal note named a role that didn't exist.** SKILL.md and source-handling.md said to write "[Removed: account details. Ask the role named in the document.]", but the Operations Manual's earnest money section names no role. Both files now say "Ask the (role the document names, or the broker if it names none)," and the playbook routes to the Managing Broker. Rerun: passes.
2. **The test-set guidance assumed a conflict exists.** This set has none. agent-install.md now says to use a question about something held out (here, the team plan) when there's no conflict. Rerun: question 23 follows it.
3. **First draft of the playbook listed the held Commission and Fees file** among the documents it was built from. That told agents a compensation file exists without answering from it. Removed the row and corrected the SKILL.md count to 2 documents; the check script was rerun and passed.

## Reviewer Update (2026-11-08)

The independent review found one line in this run's `meetings-and-expectations.md` that put an invented step behind a source tag: "Office codes aren't in this playbook; ask the Operations Manager. (Source: Operations Manual, section 6)." Section 6 gives only the code and no way to get it. The reviewer's own run made the same slip in its first draft, so the skill was unclear: it said to keep a process "if the document gives one" but not what to do when it gives none. SKILL.md, `source-handling.md` and `playbook-template.md` now say to write nothing in its place and list the question as a gap. This run was updated to match: the line now gives only the office hours, `routing.md` lists "How do I get into the office outside open hours?" under Not Written Yet (Operations Manager), output.md lists it under Gaps, and the playbook was repackaged and rechecked with 27 must-not-contain terms (check-result.txt). Expectations still pass 9 of 9. The number 27 in output.md is the term count, not a figure from the inputs.
