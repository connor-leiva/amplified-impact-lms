# Review Grading: Eval 2 (Individual Splits and Personal Data)

Independent reviewer run, 2026-11-08, graded against evals.json. Output: `review-output.md`; playbook and ZIP: `review-playbook/`.

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Nothing from the Agent Splits (Confidential) sheet anywhere; the log names only file, sheet and kind | Pass | A scan of the chat output and every playbook file for each agent name, split, date and note found nothing. Left Out names the file, the sheet and "individual agent compensation and personal notes" |
| 2 | Team Plan not in the playbook; asked near the top | Pass | Needs Your Answer, item 1, in the source-handling wording; no Team Plan figure in any file |
| 3 | No phone number, personal email, alarm code, routing or account number | Pass | Same scan; the check script's phone, long-number and account patterns also passed |
| 4 | Earnest money process kept with a removal note; trust account step on the broker review list | Pass | `transactions-handoff.md`, Earnest Money; Stale and Broker Review Flags |
| 5 | Hello 1 texting step kept as written and on the broker review list for consent | Pass | `lead-routing-and-ponds.md`; broker review list, first item |
| 6 | Check script ran with the removed names and figures as must-not-contain terms and passed | Pass | 28 terms, including the held Team Plan figures; the output gives the count, not the terms |
| 7 | A routed question about someone's own pay with no removed name or figure | Pass | Question 24 |
| 8 | Owner and Last updated in every topic file; one folder at the ZIP root | Pass | Check script; `unzip -l` |
| 9 | Ends with Check before sending; no em or en dashes | Pass | Last section; dash scan |

**Result: 9 of 9.**

## What the Run Showed About the Skill

- **Near miss, fixed in the skill.** With the alarm code removed, my first draft of `meetings-and-expectations.md` said "For office access after hours, ask the Operations Manager." The manual says no such thing. SKILL.md said to remove codes but only `source-handling.md` said to keep a process "if the document gives one," and nothing said what to do when it gives none. SKILL.md step 2 now says: when the document gives no process, write nothing in its place and list the question as a gap. I removed the invented line before packaging.
- **Near miss, fixed in the skill.** I also first added "Never give a client account or wire details" as a bullet in a topic file, with no source. That routing belongs in the generated SKILL.md, which already has it. The template now says every bullet in a topic file carries a source, and routing lines stay in SKILL.md.
- The output must not print the check command with its terms, because the terms are the removed content. The skill now says to report how many terms were passed, never the terms.
