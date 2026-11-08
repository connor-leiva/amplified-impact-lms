# Grading: Eval 3, Reserved Word in the Name, Stale Manual, Team Plan

Run on 2026-11-08 by following SKILL.md and its references exactly. Inputs read in full: the PDF as text and the Zoom VTT transcript as text.

Result: **pass, 8 of 8 expectations** (after two fixes to the skill, below).

## Expectations

| # | Expectation | Result | Evidence |
|---|---|---|---|
| 1 | Name has neither "claude" nor "anthropic"; one line says why it differs | Pass | `okafor-example-team-playbook`; output.md "About the name" explains that "Claudette" contains "claude." The check script and the repo-rules harness both passed the name. The reserved-word rule covers the name only (platform docs), so the description keeps the team's full name for triggering |
| 2 | Every section from the May 2024 manual flagged stale and its date carried into the playbook | Pass | output.md "Stale" lists sections 1 to 7; every manual-sourced rule in the playbook says "dated May 2024," `listings.md` has the file-level stale note, and SKILL.md step 4 adds the confirm line |
| 3 | MLS compensation and sign-before-offer steps not in the playbook, on the broker list, citing August 17, 2024 | Pass | Search of the playbook for both phrases finds nothing (they were also must-not-contain terms); output.md Broker Review item 1 quotes both and cites the NAR change |
| 4 | The call's rule (before the first showing, from October 1) in the playbook with its source; the disagreement listed as a conflict | Pass | `buyers-and-showings.md` first rule, "Source: Training Call, 00:00:15"; output.md "Conflicts" item 1 quotes both documents |
| 5 | 21-day pool rule flagged because the leader isn't sure it's staying | Pass | `meetings-and-expectations.md` "UNDER REVIEW: The Shared Pool" quotes the manual and the call at 00:02:09; output.md "Needs Your Answer" item 1 |
| 6 | Generated SKILL.md routes contract, addendum and custom clause questions to the managing broker and never drafts clause language | Pass | "Always Route These to a Person," first bullet: "Never draft clause or addendum language, even when asked"; test question 21 checks it |
| 7 | Sharing steps cover share, owner provisioning and publish, with Help Center click paths | Pass | output.md "Getting It to Your Agents (Team Plan)": Organization settings > Plugins & skills > Add > Upload a skill; Customize > Skills > three-dot menu > Share; Publish to org; the Policy tab note. All match the Help Center articles read 2026-11-08 |
| 8 | ZIP passes the check script; 20 answerable plus 5 routed; Check before sending; no dashes | Pass | check-result.txt OK; 20 plus 5 rows; last section is Check Before Sending; dash scan clean |

## Objective Checks

| Check | Result | Notes |
|---|---|---|
| Every number traces to the inputs | Pass after fix | First run had "7:30 PM" in test question 2, a made-up time. Rewritten as "this evening." Now the only number not in the inputs is 784, the description length |
| Deadlines match the documents | Pass | 10 minutes, 21 days, 2 business days, 24 hours, October 1, each with its source |
| No em dashes | Pass | |
| Title Case subject line | Pass | "Our Team Playbook Is Now In Claude" |
| Check before sending present | Pass | It also flags the "Claudette" sign-off as taken from the manual's owner line |
| No cost estimates without bids | Pass | Only $250, quoted from the manual |
| No agent-only MLS fields | N/A | No MLS inputs |
| No protected-class language | Pass | |
| No wire or account details | Pass | None in inputs or outputs |

## Fixes Made Because of This Case

1. **A conflict where one side is a held step.** source-handling.md said every conflict shows both versions in the playbook, which would have put the pre-August 2024 buyer step back in front of agents. It now says that when one side stays out of the playbook anyway, the playbook shows only the other side with its source, and the output still lists the conflict. It also now covers a policy owner saying on a call that a written rule may change (keep the rule, mark it under review, ask the leader). Rerun: passes.
2. **Made-up numbers in test questions.** agent-install.md now says not to put a number, time or date in a question unless it's in the documents. Rerun: passes.
3. **Thin documents.** Two documents hold about 15 rules. agent-install.md now says to cover each rule once and fill the rest with other phrasings of the most-used rules, and to say so above the table. The output does.
